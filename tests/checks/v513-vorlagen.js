/* v513 – Auftragspaket „Fertige Trainingspläne als Vorlagen".
   `adler-einheit/1` verknüpft Zusammenstellung und Datum fest. Eine VORLAGE ist die Ebene
   dazwischen: eine Zusammenstellung ohne Datum und ohne Kinder, aus der der Trainingsplan
   erzeugt wird. Geprüft wird, was der Auftrag unter „Abnahme" nennt:
     · Eine Vorlage aus uebungen/vorlagen.json erscheint nach dem Öffnen zur Auswahl.
     · Die Übernahme setzt Phasen und Übungen für das Datum und schreibt KEINE
       Kinderzuteilung (kein `kinder`, kein `tw`, kein `kopf`).
     · Eine Vorlage mit unbekanntem Übungsnamen wird nicht angelegt und benennt die Übung.
     · Ein zweiter Lauf legt nichts doppelt an.
     · Eine vorhandene Planung wird nur nach Rückfrage ersetzt (Hauptaktion „Plan ersetzen").
     · Die Tabelle taucht in der Sicherung auf.
   Dazu die Regel aus dem Konzept (§2): netto_spielform_min wird gegen die Summe der
   Spielform-Blöcke gerechnet und erscheint als HINWEIS, nie als Fehler – der Trainer
   entscheidet. Und die Falle aus v512: der Abgleich zieht die Vorlagen mit, aber IMMER
   nach den Übungen – sonst fände keine Vorlage ihre Übung. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");
  const datum = h.tagePlus(5);

  // ── Die Dateien im Repo sind selbst Prüfgegenstand ────────────────────────
  let vor = null;
  try { vor = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen", "vorlagen.json"), "utf8")); }
  catch (e) { probleme.push(`uebungen/vorlagen.json fehlt oder ist kein gültiges JSON: ${e.message}`); }
  if (!vor) return h.ergebnis("Vorlagen", false, probleme);
  if (vor.schema !== "adler-vorlagen/1") probleme.push(`Die Vorlagen-Datei hat das Schema „${vor.schema}“ statt „adler-vorlagen/1“`);
  if (!String(vor.stand || "").trim()) probleme.push("Der Vorlagen-Datei fehlt das Feld „stand“");
  const vNamen = (vor.vorlagen || []).map(v => v.name);
  const leitfragen = [...new Set((vor.vorlagen || []).map(v => v.leitfrage))];

  if (!fs.existsSync(path.join(h.REPO, "doku", "ausbildungskonzept-u9-v3.md")))
    probleme.push("doku/ausbildungskonzept-u9-v3.md fehlt – die fachliche Grundlage gehört ins Repo");
  const sw = fs.readFileSync(path.join(h.REPO, "sw.js"), "utf8");
  const swRegeln = [...sw.matchAll(/if\s*\(\s*\/(.+?)\/([gimsuy]*)\s*\.test\(url\)\s*\)\s*return/g)].map(m => new RegExp(m[1], m[2]));
  if (!swRegeln.some(re => re.test("https://app.test/uebungen/vorlagen.json")))
    probleme.push("sw.js nimmt uebungen/vorlagen.json nicht vom Cache aus");
  if (sw.slice(0, sw.indexOf("addEventListener")).includes("vorlagen.json"))
    probleme.push("uebungen/vorlagen.json steht im PRECACHE – genau das darf sie nicht");
  const bak = fs.readFileSync(path.join(h.REPO, "md-live-vollbild.js"), "utf8");
  const bakBlock = bak.slice(bak.indexOf("const tabellen=["), bak.indexOf("const tabellen=[") + 400);
  if (!/trainingsvorlagen/.test(bakBlock)) probleme.push("trainingsvorlagen fehlt in der Backup-Funktion");

  // ── Attrappe: Übungen, Vorlagen, Plan ─────────────────────────────────────
  const custom = [], vorlagen = [], plaene = {};
  const tabellen = {
    kader: h.kaderZeilen(), termine: [], nominierungen: [], anwesenheit: [],
    trainingsformen: (u, req) => {
      if (req.method() === "POST") { custom.push(JSON.parse(req.postData() || "{}")); return { status: 201, body: "[]" }; }
      return custom;
    },
    trainingsvorlagen: (u, req) => {
      if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); vorlagen.push({ ...b, id: vorlagen.length + 1 }); return { status: 201, body: "[]" }; }
      return vorlagen;
    },
    trainingsplan: (u, req) => {
      if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); plaene[b.datum] = b; return { status: 201, body: "[]" }; }
      const d = (u.searchParams.get("datum") || "").replace(/^eq\./, "");
      return plaene[d] ? [plaene[d]] : [];
    }
  };
  const s = await h.starten({ supabase: h.supabaseAttrappe(tabellen), bibliothek: true, hoehe: 1800 });
  await h.sichtbarMachen(s.page, "#train-sub-planung");
  await h.terminSetzen(s.page, datum);

  /* ── 1) Abgleich beim Öffnen ──────────────────────────────────────────────
     Gemessen wird der AUTOMATISCHE Lauf – „ohne Zutun des Trainers" steht so in der
     Abnahme. Ihn selbst noch einmal anzustoßen war ein Wettlauf: läuft der erste noch,
     gibt der zweite sofort null zurück (_bibLaeuft), und die Prüfung maß nichts. */
  const eins = await s.page.evaluate(async ({ soll }) => {
    if (typeof vorlageUebernehmenOpen !== "function") return { fehlt: "vorlageUebernehmenOpen" };
    if (typeof _evPruefung !== "function") return { fehlt: "_evPruefung" };
    const warte = ms => new Promise(r => setTimeout(r, ms));
    for (let i = 0; i < 60; i++) {                       // bis 6 s: der Anstoß pollt im halben Sekundentakt
      if (!_bibLaeuft && VORLAGEN.length >= soll) break;
      await warte(100);
    }
    let stand = null, ustand = null;
    try { stand = localStorage.getItem("adler-vorlagen-stand"); ustand = localStorage.getItem("adler-bibliothek-stand"); } catch (x) {}
    return { stand, ustand, geladen: VORLAGEN.map(v => v.name) };
  }, { soll: vNamen.length });
  if (eins.fehlt) { probleme.push(`${eins.fehlt} fehlt`); await s.schliessen(); return h.ergebnis("Vorlagen", false, probleme); }

  // ── 2) Zweiter Lauf: nichts doppelt ───────────────────────────────────────
  const vorZweitem = vorlagen.length;
  const zwei = await s.page.evaluate(async () => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    while (_bibLaeuft) await warte(50);                  // erst warten, dann anstoßen
    return await bibliothekAbgleich();
  });
  const nachZweitem = vorlagen.length;
  /* JETZT festhalten, nicht am Ende: die Übernahme unten schreibt absichtlich einen Plan.
     Gemeint ist hier, dass der ABGLEICH keinen schreibt. */
  const plaeneNachAbgleich = Object.keys(plaene).length;

  // ── 3) Prüfung: unbekannte Übung, Netto-Hinweis, Tags, Abschluss ──────────
  const pruef = await s.page.evaluate(({ echteUebung }) => {
    const f = t => _evPruefung(JSON.stringify(t)).fehler;
    const basis = (extra, bl) => ({
      schema: "adler-vorlagen/1",
      vorlagen: [Object.assign({
        name: "Probe", leitfrage: "Wie mache ich ein Tor?",
        bloecke: bl || [{ typ: "main", label: "Stufe 1", dauer: 12, uebung_name: echteUebung }]
      }, extra || {})]
    });
    return {
      gut: f(basis()),
      unbekannt: f(basis({}, [{ typ: "main", label: "Stufe 1", dauer: 12, uebung_name: "Gibt-Es-Nicht-Übung" }])),
      ohneLeitfrage: f({ schema: "adler-vorlagen/1", vorlagen: [{ name: "X", bloecke: [{ typ: "main", label: "A", dauer: 5 }] }] }),
      falscherTag: f(basis({ tags: ["quatsch"] })),
      abschlussMitUebung: f(basis({}, [{ typ: "abschluss", label: "Turnier", dauer: 18, uebung_name: echteUebung }])),
      ohneBloecke: f({ schema: "adler-vorlagen/1", vorlagen: [{ name: "X", leitfrage: "Y", bloecke: [] }] }),
      doppelt: f({ schema: "adler-vorlagen/1", vorlagen: [{ name: "Doppel", leitfrage: "Y", bloecke: [{ typ: "main", label: "A", dauer: 5 }] }, { name: " doppel ", leitfrage: "Y", bloecke: [{ typ: "main", label: "A", dauer: 5 }] }] }),
      falschesSchema: f({ schema: "adler-uebungen/1", vorlagen: [] }),
      // Netto-Regel: Hinweis, nie Fehler
      nettoOk: _evNettoHinweis({ netto_spielform_min: 38, bloecke: [{ typ: "main", dauer: 33 }, { typ: "abschluss", dauer: 18 }] }),
      nettoZuHoch: _evNettoHinweis({ netto_spielform_min: 80, bloecke: [{ typ: "main", dauer: 33 }, { typ: "abschluss", dauer: 18 }] }),
      nettoZuTief: _evNettoHinweis({ netto_spielform_min: 10, bloecke: [{ typ: "main", dauer: 33 }, { typ: "abschluss", dauer: 18 }] }),
      // Warm-up zählt nicht als Spielform
      summeOhneWarmup: _evSpielformSumme([{ typ: "warmup", dauer: 10 }, { typ: "main", dauer: 11 }, { typ: "tw", dauer: 10 }, { typ: "abschluss", dauer: 18 }]),
      nettoFehlerfrei: _evPruefung(JSON.stringify(basis({ netto_spielform_min: 999 }))).fehler.length
    };
  }, { echteUebung: (vor.vorlagen[0].bloecke.find(b => b.uebung_name && b.typ === "main") || {}).uebung_name });

  // ── 4) Übernahme auf ein Datum ────────────────────────────────────────────
  const uebernahme = await s.page.evaluate(async ({ datum }) => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    await vorlageUebernehmenOpen(); await warte(200);
    const box = document.getElementById("vu-inhalt");
    const karten = [...box.querySelectorAll("button")].filter(b => /Blöcke/.test(b.textContent));
    const fragen = [...box.querySelectorAll("button")].filter(b => /^Wie |^Wo /.test(b.textContent.trim()));
    // Filter: erste Leitfrage anklicken
    const vorFilter = karten.length;
    fragen[0]?.click(); await warte(80);
    const nachFilter = [...document.querySelectorAll("#vu-inhalt button")].filter(b => /Blöcke/.test(b.textContent)).length;
    fragen[0]?.click(); await warte(80);   // Filter wieder aufheben
    // Auswahl + Übernahme
    const karte = [...document.querySelectorAll("#vu-inhalt button")].find(b => /Blöcke/.test(b.textContent));
    const nameGewaehlt = karte ? karte.textContent.trim().split("\n")[0] : "";
    const hauptVorher = document.getElementById("vu-haupt");
    const gesperrtOhneAuswahl = !!hauptVorher && hauptVorher.disabled;
    karte?.click(); await warte(120);
    const haupt = document.getElementById("vu-haupt");
    const hauptText = (haupt?.textContent || "").trim();
    const hauptHoehe = haupt ? Math.round(haupt.getBoundingClientRect().height) : 0;
    const vorschauText = (document.getElementById("vu-inhalt")?.textContent || "").replace(/\s+/g, " ");
    haupt?.click(); await warte(400);
    return {
      vorFilter, nachFilter, nameGewaehlt, gesperrtOhneAuswahl, hauptText, hauptHoehe,
      keineKinder: /Kinder und Torhüter werden nicht zugeteilt/.test(vorschauText),
      skalierung: /8 Kinder:/.test(vorschauText),
      beobachtung: /👀/.test(vorschauText),
      offen: !!document.getElementById("vu-modal")
    };
  }, { datum });

  // ── 5) Zweite Übernahme auf dasselbe Datum: Rückfrage ─────────────────────
  const zweite = await s.page.evaluate(async () => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    await vorlageUebernehmenOpen(); await warte(250);
    const karte = [...document.querySelectorAll("#vu-inhalt button")].find(b => /Blöcke/.test(b.textContent));
    karte?.click(); await warte(120);
    const txt = (document.getElementById("vu-inhalt")?.textContent || "").replace(/\s+/g, " ");
    const haupt = document.getElementById("vu-haupt");
    const r = { hauptText: (haupt?.textContent || "").trim(), warnung: /wird vollständig ersetzt/.test(txt) };
    vorlageUebernehmenClose();
    return r;
  });
  const fehler = s.fehler(); await s.schliessen();

  // ── Auswertung ────────────────────────────────────────────────────────────
  if (vorlagen.length !== vNamen.length) probleme.push(`Der Abgleich beim Öffnen hat ${vorlagen.length} von ${vNamen.length} Vorlagen angelegt`);
  const fehlend = vNamen.filter(n => !vorlagen.some(z => z.name === n));
  if (fehlend.length) probleme.push(`Diese Vorlagen fehlen nach dem Abgleich: ${fehlend.join(", ")}`);
  if (!eins.ustand) probleme.push("Der Übungs-Stand wurde nicht gemerkt – die Vorlagen liefen vor den Übungen");
  if (custom.length !== 6) zeilen.push(`(Übungen aus der Bibliothek: ${custom.length})`);
  if (eins.stand !== String(vor.stand)) probleme.push(`Der Vorlagen-Stand wurde als „${eins.stand}“ gemerkt statt als „${vor.stand}“`);
  if ((eins.geladen || []).length !== vNamen.length) probleme.push(`Nach dem Öffnen stehen ${(eins.geladen || []).length} Vorlagen zur Auswahl`);
  if (plaeneNachAbgleich) probleme.push(`Der Abgleich hat einen Trainingsplan geschrieben: ${Object.keys(plaene).join(", ")}`);
  const kinderInDb = vorlagen.some(z => JSON.stringify(z).includes("kind") || (z.bloecke || []).some(b => b.kinder || b.tw));
  if (kinderInDb) probleme.push("In der Vorlagen-Tabelle steht eine Kinderzuteilung");

  if (nachZweitem !== vorZweitem) probleme.push(`Der zweite Lauf hat ${nachZweitem - vorZweitem} Vorlagen doppelt angelegt`);
  if (zwei && zwei.vorlagen && zwei.vorlagen.angelegt) probleme.push("Der zweite Lauf legt trotz gleichem Stand an");
  if (zwei !== null && !(zwei && zwei.vorlagen)) probleme.push("Der zweite Lauf hat gearbeitet, obwohl sich nichts geändert hat");

  if (pruef.gut.length) probleme.push(`Eine gültige Vorlage wird abgewiesen: ${pruef.gut.join(" · ")}`);
  if (!pruef.unbekannt.some(t => /Gibt-Es-Nicht-Übung/.test(t))) probleme.push("Eine unbekannte Übung wird nicht benannt");
  ["ohneLeitfrage", "falscherTag", "abschlussMitUebung", "ohneBloecke", "doppelt", "falschesSchema"].forEach(k => {
    if (!pruef[k].length) probleme.push(`Nicht abgewiesen: ${k}`);
  });
  if (pruef.nettoOk) probleme.push(`Ein stimmiger Netto-Wert erzeugt einen Hinweis: ${pruef.nettoOk}`);
  if (!pruef.nettoZuHoch) probleme.push("netto größer als brutto erzeugt keinen Hinweis");
  if (!pruef.nettoZuTief) probleme.push("ein viel zu kleiner Netto-Wert erzeugt keinen Hinweis");
  if (pruef.nettoFehlerfrei) probleme.push("Ein unstimmiger Netto-Wert ist ein Fehler geworden – er soll nur ein Hinweis sein");
  if (pruef.summeOhneWarmup !== 29) probleme.push(`Spielform-Summe ${pruef.summeOhneWarmup} statt 29 – Warm-up und Torwart dürfen nicht mitzählen`);

  if (uebernahme.nachFilter >= uebernahme.vorFilter) probleme.push(`Der Leitfragen-Filter wirkt nicht (${uebernahme.vorFilter} → ${uebernahme.nachFilter})`);
  if (!uebernahme.gesperrtOhneAuswahl) probleme.push("Die Hauptaktion ist ohne gewählte Vorlage nicht gesperrt");
  if (uebernahme.hauptHoehe < 56) probleme.push(`Die Hauptaktion ist ${uebernahme.hauptHoehe} px hoch (cockpit-ui verlangt 56)`);
  if (!uebernahme.keineKinder) probleme.push("Die Vorschau sagt nicht, dass Kinder und Torhüter nicht zugeteilt werden");
  if (!uebernahme.skalierung) probleme.push("Die Vorschau zeigt die Skalierung für 8/12/16 Kinder nicht");
  if (!uebernahme.beobachtung) probleme.push("Die Vorschau zeigt die Beobachtungsfrage nicht");
  if (uebernahme.offen) probleme.push("Das Fenster bleibt nach der Übernahme offen");

  const p = plaene[datum];
  if (!p) probleme.push(`Für ${datum} wurde kein Plan geschrieben`);
  else {
    const quelle = (vor.vorlagen.find(x => uebernahme.nameGewaehlt.includes(x.name)) || vor.vorlagen[0]);
    if ((p.slots || []).length !== quelle.bloecke.length) probleme.push(`${(p.slots || []).length} Phasen geschrieben statt ${quelle.bloecke.length}`);
    const mitUebung = quelle.bloecke.filter(b => b.uebung_name).length;
    if ((p.plan || []).length !== mitUebung) probleme.push(`${(p.plan || []).length} Übungszuordnungen statt ${mitUebung}`);
    (p.plan || []).forEach(e => { if (e.formIdx == null || e.formIdx < 0) probleme.push(`Plan-Eintrag ohne Übungs-Index: ${JSON.stringify(e)}`); });
    if (p.kopf) probleme.push("Die Übernahme schreibt einen Einheiten-Kopf – eine Vorlage hat keinen Schwerpunkt für diesen einen Tag");
    const kinder = JSON.stringify(p).match(/"(kinder|tw|kind)"\s*:/g);
    if (kinder) probleme.push(`Die Übernahme schreibt eine Kinderzuteilung: ${kinder.join(", ")}`);
    const labels = (p.slots || []).map(x => x.label);
    if (new Set(labels).size !== labels.length) probleme.push(`Zwei Phasen tragen dasselbe Label – die Zuordnung beim Wiederherstellen wird dann beliebig: ${labels.join(" · ")}`);
  }
  if (!/ersetzen/i.test(zweite.hauptText)) probleme.push(`Bei bestehendem Plan heißt die Hauptaktion „${zweite.hauptText}“ statt „Plan ersetzen“`);
  if (!zweite.warnung) probleme.push("Bei bestehendem Plan fehlt die Warnung in der Vorschau");
  if (fehler.length) probleme.push(...fehler.slice(0, 3));

  zeilen.push(`Datei: ${vNamen.length} Vorlagen, ${leitfragen.length} Leitfragen, Stand „${vor.stand}“ · beim Öffnen von selbst angelegt: ${vorlagen.length}, zur Auswahl: ${(eins.geladen || []).length}, Stand gemerkt „${eins.stand}“`);
  zeilen.push(`Prüfung: unbekannte Übung wird benannt, ${["ohneLeitfrage", "falscherTag", "abschlussMitUebung", "ohneBloecke", "doppelt", "falschesSchema"].length} weitere Fälle abgewiesen · Netto ist Hinweis, nicht Fehler (${pruef.nettoZuHoch ? "greift" : "greift nicht"})`);
  zeilen.push(`Übernahme „${uebernahme.nameGewaehlt}“ auf ${datum}: ${(plaene[datum] || {}).slots?.length} Phasen, ${(plaene[datum] || {}).plan?.length} Übungen, kein kopf, keine Kinder · Filter ${uebernahme.vorFilter}→${uebernahme.nachFilter} · Hauptaktion ${uebernahme.hauptHoehe} px`);
  zeilen.push(`Zweite Übernahme auf dasselbe Datum: „${zweite.hauptText}“, Warnung ${zweite.warnung} · Backup enthält trainingsvorlagen`);
  return h.ergebnis("Vorlagen – ohne Datum angelegt, auf den Termin gesetzt", !probleme.length, zeilen.concat(probleme));
};
