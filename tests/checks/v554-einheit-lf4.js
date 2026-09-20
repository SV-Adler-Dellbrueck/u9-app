/* v554 – Einheit „Ball zum Freien“ (Leitfrage 4): zwei Übungen, eine Vorlage, Skizzen
   aus der App.

   Nachtrag für die Lehrgangsabgabe 2.2 im DFB-Basis-Coach, zugleich die reale Einheit
   der U9 I am 18.09.2026. Kein neuer Code: die beiden Übungen kommen über den Abgleich
   beim Öffnen an, die Vorlage über den Vorlagen-Abgleich, die Skizzen zeichnet _skz.

   Was hier wirklich zählt:
   · Der Abgleich läuft bei JEDEM Öffnen der Trainer-App. Legte er eine der zwölf
     bestehenden Übungen noch einmal an, stünde die Datenbank nach wenigen Starts voller
     Dubletten, ohne dass jemand eine Fehlermeldung bekäme.
   · Die Vorlage verweist auf zwei BESTEHENDE Übungen („Warm up Adler“, „3 gegen 3 auf
     vier Minitore mit Schusszone“). Sie dürfen weder dupliziert noch verändert werden.
   · Eine erfundene Liste oder Farbe in einer Skizze würde stillschweigend nicht
     gezeichnet – die Abgabe hätte dann ein Loch, das erst der Prüfer sieht.

   Fälle:
   a) bibliothek.json: Stand 2026-09-14-2, beide Übungen direkt hinter den zwölf ursprünglichen
      (seit v568 hängen weitere dahinter – die Datei wächst nur am Ende), keine doppelten Namen.
   b) Abgleich gegen eine Attrappe mit den zwölf vorhandenen: 2 angelegt, 12 übersprungen,
      Skizze bei beiden dabei. Zweiter Lauf: 0 neu, 14 übersprungen.
   c) Spec-Schlüssel gegen EI_SKZ_LISTEN, Spielerfarben gegen den Farbsatz, Pfeiltypen
      gegen SKZ_PFEIL, viewBox 0 0 280 180, kein Spielerkreis näher als 24 px am nächsten.
   d) vorlagen.json: Stand hochgesetzt, die Vorlage kommt ohne Fehler durch _evPruefung,
      ohne Netto-Hinweis, mit Skalierung 8/12/16 und Beobachtung mit Rollenbezug.
   e) Übernahme auf einen Termin: die fünf Blöcke landen im Plan, Block 2 und 5 zeigen auf
      die bestehenden Übungen, keine gleichnamige Kopie entsteht.
   f) Die Exportdateien liegen in doku/auftrag-einheit-lf4/ und die SVG enthält dieselbe
      Zeichnung wie _skz. */
const NEU = ["3 gegen 3 auf vier Minitore – Pass zählt doppelt", "Dreieckspassen mit Abschluss"];
const BESTEHEND = ["Warm up Adler", "3 gegen 3 auf vier Minitore mit Schusszone"];
const VORLAGE = "L4-5 Passen – Ball zum Freien, Tor nach Pass zählt doppelt";
const EXPORT = ["uebung-1-3-gegen-3-pass-zaehlt-doppelt", "uebung-2-dreieckspassen-mit-abschluss"];

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");
  const datum = "2026-09-18";

  // ── a) Die Übungsdatei ──────────────────────────────────────────────────────
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const namen = (bib.uebungen || []).map(u => u.name);
  /* v557 hat den Stand weitergedreht, als die Schritte dazukamen. Geprüft wird deshalb,
     dass er seit diesem Paket nicht zurückgefallen ist – nicht mehr die eine Zahl. */
  /* v587: Der Stand wird als Zeichenkette verglichen (gleiches Format JJJJ-MM-TT-N) – das
     Muster davor endete am 19.09. und schlug beim ersten Stand vom 20.09. an. */
  if (String(bib.stand) < "2026-09-14-2") probleme.push(`bibliothek.json: Stand „${bib.stand}“ liegt vor „2026-09-14-2“ – ohne neuen Stand holt _bibHolen die Datei nicht`);
  const fehlend = NEU.filter(n => !namen.includes(n));
  if (fehlend.length) probleme.push("In der Bibliothek fehlen: " + fehlend.join(", "));
  /* v568: Die Datei wächst nur am Ende – hinter den beiden stehen seither die dreizehn
     Übungen für 3+1 und FUNiño. Geprüft wird deshalb die Stelle, nicht das Ende. */
  const erstePos = namen.indexOf(NEU[0]);
  if (erstePos < 0 || String(namen.slice(erstePos, erstePos + 2)) !== String(NEU)) probleme.push("Die beiden neuen stehen nicht zusammen: " + namen.slice(erstePos, erstePos + 2).join(" | "));
  const davor = erstePos < 0 ? [] : (bib.uebungen || []).slice(0, erstePos);
  if (davor.length !== 12) probleme.push(`${davor.length} statt 12 Übungen vor den beiden neuen in der Datei`);
  const doppelt = namen.filter((n, i) => namen.indexOf(n) !== i);
  if (doppelt.length) probleme.push("Doppelte Namen in der Datei: " + doppelt.join(", "));
  const ziel = (bib.uebungen || []).filter(u => NEU.includes(u.name));
  const vorhanden = (bib.uebungen || []).filter(u => !NEU.includes(u.name));
  if (vorhanden.length < 12) probleme.push(`${vorhanden.length} statt mindestens 12 bestehende Übungen in der Datei`);

  // ── d) Die Vorlagendatei, ohne Browser ──────────────────────────────────────
  const vor = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8"));
  const v = (vor.vorlagen || []).find(x => x.name === VORLAGE);
  if (!v) probleme.push(`Vorlage „${VORLAGE}“ fehlt in vorlagen.json`);
  if (!/^2026-09-14-[4-9]$|^2026-09-1[5-9]/.test(String(vor.stand))) probleme.push(`vorlagen.json: Stand „${vor.stand}“ nicht hochgesetzt`);
  if (v) {
    const un = v.bloecke.map(b => b.uebung_name).filter(Boolean);
    if (String(un) !== String([BESTEHEND[0], NEU[0], NEU[1], BESTEHEND[1]])) probleme.push("Blockfolge der Vorlage: " + un.join(" | "));
    if (v.bloecke.length !== 5) probleme.push(`${v.bloecke.length} statt 5 Blöcke`);
    if (!["8", "12", "16"].every(k => String((v.skalierung || {})[k] || "").trim())) probleme.push("Skalierung 8/12/16 unvollständig");
    if (!/Aufpasser|Flitzer|Jäger/.test(String(v.beobachtung || ""))) probleme.push("Beobachtungsfrage ohne Rollenbezug");
    if (v.netto_spielform_min !== 39) probleme.push(`netto_spielform_min ${v.netto_spielform_min} statt 39 (Paket)`);
    const schluessel = Object.keys(vor.vorlagen[0]).sort().join(",");
    if (Object.keys(v).sort().join(",") !== schluessel) probleme.push("Die Vorlage erweitert das Schema: " + Object.keys(v).sort().join(","));
  }

  // ── b) Der echte Abgleich – die zwölf gelten als vorhanden ──────────────────
  const custom = vorhanden.map((u, i) => ({ id: 5000 + i, name: u.name, kat: u.kat, kurz: u.kurz, custom: true, skizze: u.skizze || null }));
  const vorlagenDb = (vor.vorlagen || []).filter(x => x.name !== VORLAGE).map((x, i) => ({ id: 900 + i, name: x.name, leitfrage: x.leitfrage, bloecke: x.bloecke }));
  const angelegteVorlagen = [], plaene = {};
  const s = await h.starten({
    bibliothek: true, hoehe: 1800,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(), termine: [], nominierungen: [], anwesenheit: [],
      trainingsformen: (u, req) => {
        if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); custom.push({ ...b, id: 6000 + custom.length, custom: true }); return { status: 201, body: "[]" }; }
        return custom;
      },
      trainingsvorlagen: (u, req) => {
        if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); angelegteVorlagen.push(b); return { status: 201, body: "[]" }; }
        return vorlagenDb.concat(angelegteVorlagen.map((z, i) => ({ ...z, id: 1000 + i })));
      },
      trainingsplan: (u, req) => {
        if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); plaene[b.datum] = b; return { status: 201, body: "[]" }; }
        const d = (u.searchParams.get("datum") || "").replace(/^eq\./, "");
        return plaene[d] ? [plaene[d]] : [];
      }
    })
  });
  await h.sichtbarMachen(s.page, "#train-sub-planung");
  await h.terminSetzen(s.page, datum);

  const r = await s.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 80; i++) { if (!_bibLaeuft && VORLAGEN.length) break; await warte(100); }
    while (_bibLaeuft) await warte(50);
    /* Der automatische Lauf beim Öffnen hat schon gearbeitet – hier wird er noch einmal
       sauber angestoßen, damit Zähler und Sendungen eindeutig zu einem Lauf gehören. */
    try { localStorage.removeItem("adler-bibliothek-stand"); localStorage.removeItem("adler-vorlagen-stand"); } catch (e) {}
    await loadCustomForms();
    return { listen: typeof EI_SKZ_LISTEN !== "undefined" ? EI_SKZ_LISTEN : [], pfeile: Object.keys(SKZ_PFEIL) };
  });
  const uebPosts = () => s.gesendet.filter(g => /trainingsformen/.test(g.pfad || "") && g.methode === "POST").map(p => p.body || {});
  const erste = uebPosts();
  const ersteNamen = erste.map(p => p.name);
  if (ersteNamen.length !== 2) probleme.push(`Der Abgleich beim Öffnen hat ${ersteNamen.length} Übungen angelegt statt 2: ${ersteNamen.join(", ")}`);
  else if (String(ersteNamen.slice().sort()) !== String(NEU.slice().sort())) probleme.push("Angelegt wurden: " + ersteNamen.join(", "));
  else if (!erste.every(p => p.skizze && typeof p.skizze === "object")) probleme.push("Mindestens eine Übung kommt ohne Skizze an");
  else zeilen.push(`Abgleich: 2 neu, ${vorhanden.length} übersprungen, Skizze bei beiden dabei`);
  const mitBestehend = ersteNamen.filter(n => vorhanden.some(u => u.name === n));
  if (mitBestehend.length) probleme.push("Eine bestehende Übung wurde noch einmal angelegt: " + mitBestehend.join(", "));

  // Zweiter Lauf desselben Abgleichs: alles vorhanden, nichts neu
  const zwei = await s.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    while (_bibLaeuft) await warte(50);
    try { localStorage.removeItem("adler-bibliothek-stand"); } catch (e) {}
    await loadCustomForms();
    const e = await bibliothekAbgleich();
    return e && e.uebungen ? e.uebungen : e;
  });
  const zweiteNamen = uebPosts().map(p => p.name).slice(ersteNamen.length);
  if (zweiteNamen.length) probleme.push(`Der zweite Lauf hat ${zweiteNamen.length} Übungen angelegt: ${zweiteNamen.join(", ")}`);
  else zeilen.push(`Zweiter Lauf: 0 neu, ${custom.length} übersprungen`);

  // ── c) Die Skizzen im Browser ───────────────────────────────────────────────
  const skz = await s.page.evaluate(({ specs, listen, pfeile }) => {
    const farben = ["g", "r", "b", "y", "w"];
    return specs.map(spec => {
      const unbekannt = Object.keys(spec).filter(k => !listen.includes(k));
      const svg = _skz(spec);
      const halter = document.createElement("div"); halter.innerHTML = svg;
      const el = halter.querySelector("svg");
      const kreise = [...el.querySelectorAll("circle")].filter(c => c.getAttribute("r") === "8");
      const pos = kreise.map(k => ({ x: +k.getAttribute("cx"), y: +k.getAttribute("cy") }));
      let engste = 999, engstePos = "";
      for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) {
        const d = Math.hypot(pos[i].x - pos[j].x, pos[i].y - pos[j].y);
        if (d < engste) { engste = d; engstePos = `${pos[i].x},${pos[i].y} ↔ ${pos[j].x},${pos[j].y}`; }
      }
      return {
        unbekannt,
        fremdeFarben: (spec.s || []).map(x => x[2]).concat((spec.h || []).map(x => x[2])).filter(f => f && !farben.includes(f)),
        fremdePfeile: (spec.p || []).map(x => x[4]).filter(t => t && !pfeile.includes(t)),
        spieler: kreise.length, engste: Math.round(engste), engstePos,
        viewBox: el.getAttribute("viewBox"), inhalt: el.innerHTML
      };
    });
  }, { specs: ziel.map(u => u.skizze), listen: r.listen, pfeile: r.pfeile });
  skz.forEach((x, i) => {
    const n = ziel[i] ? ziel[i].name : "?";
    if (x.unbekannt.length) probleme.push(`${n}: unbekannte Listen ${x.unbekannt.join(", ")} – der Renderer zeichnet sie nicht`);
    if (x.fremdeFarben.length) probleme.push(`${n}: Farben außerhalb des Farbsatzes: ${x.fremdeFarben.join(", ")}`);
    if (x.fremdePfeile.length) probleme.push(`${n}: Pfeiltypen außerhalb von SKZ_PFEIL: ${x.fremdePfeile.join(", ")}`);
    if (x.viewBox !== "0 0 280 180") probleme.push(`${n}: viewBox ${x.viewBox} – der Bild-Export sucht genau „0 0 280 180“`);
    /* Paket: kein Spielerkreis näher als 24 px an einem anderen – gemeldet wird die
       Position, der Renderer bleibt, wie er ist. */
    if (x.engste < 24) probleme.push(`${n}: zwei Spieler stehen nur ${x.engste} px auseinander (${x.engstePos})`);
    // f) Export: die SVG im Ordner enthält genau diese Zeichnung
    const p = path.join(h.REPO, "doku/auftrag-einheit-lf4", EXPORT[i] + ".svg");
    if (!fs.existsSync(p)) probleme.push(`Export fehlt: ${EXPORT[i]}.svg`);
    else if (!fs.readFileSync(p, "utf8").includes(x.inhalt)) probleme.push(`${EXPORT[i]}.svg enthält nicht die Zeichnung aus _skz – Export neu laufen lassen`);
    if (!fs.existsSync(path.join(h.REPO, "doku/auftrag-einheit-lf4", EXPORT[i] + ".png"))) probleme.push(`Export fehlt: ${EXPORT[i]}.png`);
  });
  if (!probleme.length) zeilen.push(`Skizzen: ${skz.map((x, i) => `Übung ${i + 1} ${x.spieler} Spieler, engster Abstand ${x.engste} px`).join(" · ")} · Export SVG+PNG deckungsgleich`);

  // ── d) Die Vorlage durch Prüfung und Netto-Rechnung, dann e) Übernahme ──────
  const ue = await s.page.evaluate(async ({ datei, name, datum }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const pr = _evPruefung(JSON.stringify(datei));
    const v = (datei.vorlagen || []).find(x => x.name === name);
    const hinweis = v ? _evNettoHinweis(v) : "kein Eintrag";
    await vorlagenLaden();
    const db = VORLAGEN.find(x => x.name === name);
    if (!db) return { fehler: pr.fehler, hinweis, inDb: false };
    _vuAuswahl = db.id;
    const vorher = (typeof tpAllForms === "function" ? tpAllForms() : []).length;
    await vorlageUebernehmenSetzen(); await warte(300);
    const nachher = (typeof tpAllForms === "function" ? tpAllForms() : []).length;
    return { fehler: pr.fehler, hinweis, inDb: true, vorher, nachher };
  }, { datei: vor, name: VORLAGE, datum });
  if (ue.fehler.length) probleme.push("vorlagen.json kommt nicht durch die Prüfung: " + ue.fehler.slice(0, 3).join(" | "));
  if (ue.hinweis) probleme.push("Netto-Hinweis: " + ue.hinweis);
  if (!ue.inDb) probleme.push("Der Vorlagen-Abgleich hat die neue Vorlage nicht angelegt");
  const angelegt = angelegteVorlagen.map(z => z.name);
  if (angelegt.length !== 1 || angelegt[0] !== VORLAGE) probleme.push(`Der Vorlagen-Abgleich hat angelegt: ${angelegt.join(", ") || "nichts"} – erwartet genau die neue`);
  const plan = plaene[datum];
  if (!plan) probleme.push("Die Übernahme hat keinen Plan geschrieben");
  else {
    const formen = (plan.plan || []).map(e => e.formName);
    if ((plan.slots || []).length !== 5) probleme.push(`${(plan.slots || []).length} statt 5 Phasen im Plan`);
    if (formen[0] !== BESTEHEND[0] || formen[3] !== BESTEHEND[1]) probleme.push("Block 2 und 5 zeigen nicht auf die bestehenden Übungen: " + formen.join(" | "));
    if (formen[1] !== NEU[0] || formen[2] !== NEU[1]) probleme.push("Block 3 und 4 zeigen nicht auf die neuen Übungen: " + formen.join(" | "));
    const nachUebernahme = uebPosts().map(p => p.name).slice(ersteNamen.length);
    if (nachUebernahme.length) probleme.push("Die Übernahme hat Übungen angelegt: " + nachUebernahme.join(", "));
    const kopien = custom.map(c => c.name).filter((n, i, a) => a.indexOf(n) !== i);
    if (kopien.length) probleme.push("Gleichnamige Kopien in der Übungstabelle: " + kopien.join(", "));
    if (ue.vorher !== ue.nachher) probleme.push(`Die Übernahme hat die Übungsliste von ${ue.vorher} auf ${ue.nachher} verändert`);
    if (!probleme.length) zeilen.push(`Vorlage: Prüfung sauber, kein Netto-Hinweis, Übernahme auf ${datum} legt 5 Phasen an – ${formen.length} Übungen zugeordnet, keine Kopie`);
  }

  const f = s.fehler();
  if (f.length) probleme.push("Konsole: " + f[0]);
  await s.schliessen();
  return h.ergebnis("Einheit LF4: zwei Übungen, eine Vorlage, Skizzen aus der App", !probleme.length, zeilen.concat(probleme));
};
