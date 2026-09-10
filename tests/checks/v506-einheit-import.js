/* v506 – Auftragspaket „Einheit importieren": eine fertige Einheit als JSON in einem Rutsch
   in die App – Übungen anlegen, Phasen setzen, Plan für das Datum speichern.
   Geprueft nach Abschnitt 8 des Pakets: (1) Ladearchitektur, (2) die Pruefung schlaegt an und
   schreibt dabei nichts, (3) bekannte Uebungen werden nicht doppelt angelegt, (4) die
   INDEX-AUFLOESUNG – der geschriebene plan-Eintrag traegt denselben formIdx, unter dem
   tpAllForms() die Uebung nach dem Nachladen fuehrt (das ist die Falle aus Abschnitt 2 des
   Pakets: formIdx ist ein Index in TRAININGSFORMEN+CUSTOM_FORMS, kein Wert aus dem JSON),
   und (5) ein bestehender Plan wird nie stillschweigend ueberschrieben. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");
  const datum = h.tagePlus(3);
  const custom = [], plaene = {};
  const s = await h.starten({ supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), termine: [], nominierungen: [], anwesenheit: [],
    trainingsformen: (u, req) => {
      if (req.method() === "POST") { custom.push(JSON.parse(req.postData() || "{}")); return { status: 201, body: "[]" }; }
      return custom;
    },
    trainingsplan: (u, req) => {
      if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); plaene[b.datum] = b; return { status: 201, body: "[]" }; }
      const d = (u.searchParams.get("datum") || "").replace(/^eq\./, "");
      return plaene[d] ? [plaene[d]] : [];
    }
  }), hoehe: 1800 });
  await h.sichtbarMachen(s.page, "#train-sub-planung");

  // ── 1) Ladearchitektur ────────────────────────────────────────────────────
  const bau = await s.page.evaluate(() => ({
    fn: typeof einheitImportUebernehmen === "function",
    open: typeof einheitImportOpen === "function",
    knopf: [...document.querySelectorAll("#train-sub-planung button")].some(b => /Einheit importieren/.test(b.textContent)),
    kopfBox: !!document.getElementById("tp-kopf")
  }));
  const sw = fs.readFileSync(path.join(h.REPO, "sw.js"), "utf8");
  const tr = fs.readFileSync(path.join(h.REPO, "trainer/index.html"), "utf8");
  const el = fs.readFileSync(path.join(h.REPO, "eltern/index.html"), "utf8");
  if (!bau.fn) probleme.push("einheitImportUebernehmen ist nach dem Laden keine Funktion");
  if (!bau.open) probleme.push("einheitImportOpen fehlt");
  if (!bau.knopf) probleme.push("Im Trainingsplan fehlt der Knopf „Einheit importieren“");
  if (!bau.kopfBox) probleme.push("Der Platz für den Kopf der Einheit (#tp-kopf) fehlt");
  if (!/md-einheit-import\.js/.test(sw)) probleme.push("md-einheit-import.js steht nicht im PRECACHE");
  if (!/"md-einheit-import\.js":"einheitImportUebernehmen"/.test(tr)) probleme.push("md-einheit-import.js fehlt in der MODUL_WACHE");
  /* Geladen wird das Modul nur beim Trainer. In der MODUL_WACHE steht es in BEIDEN
     Einstiegen – die Wache ist eine Nachschlagetabelle und prueft nur, was auch geladen
     wurde; liefen die beiden Tabellen auseinander, schlaege die Ladearchitektur-Pruefung an. */
  const welle2 = (tr.match(/const WELLE2=\[([\s\S]*?)\];/) || [])[1] || "";
  const alleE = (el.match(/const ALLE=\[([\s\S]*?)\];/) || [])[1] || "";
  if (!/md-einheit-import\.js/.test(welle2)) probleme.push("md-einheit-import.js fehlt in WELLE2 des Trainer-Loaders");
  if (/md-einheit-import\.js/.test(alleE)) probleme.push("md-einheit-import.js steht im Eltern-Ladeplan – es ist ein Trainerwerkzeug");
  if (!/"md-einheit-import\.js":"einheitImportUebernehmen"/.test(el)) probleme.push("md-einheit-import.js fehlt in der MODUL_WACHE des Eltern-Einstiegs (beide Tabellen müssen gleich sein)");

  // ── 2) Die Prüfung schlägt an, und dabei wird nichts geschrieben ───────────
  const vorher = s.gesendet.length;
  const schlecht = await s.page.evaluate(async ({ datum }) => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    einheitImportOpen(); await warte(60);
    const lauf = async txt => {
      document.getElementById("ei-json").value = txt;
      await einheitImportPruefen(); await warte(60);
      return { melde: document.getElementById("ei-melde").textContent.replace(/\s+/g, " ").trim(),
               vorschau: document.getElementById("ei-vorschau").textContent.trim(),
               haupt: document.getElementById("ei-haupt").textContent.trim() };
    };
    const block = (extra) => JSON.stringify({ schema: "adler-einheit/1", datum, bloecke: [Object.assign({ label: "Aufwärmen", typ: "warmup", dauer: 10 }, extra)] });
    return {
      kaputt: await lauf("{ das ist kein json"),
      ohneSchema: await lauf(JSON.stringify({ datum, bloecke: [{ label: "A", typ: "warmup", dauer: 10 }] })),
      falscherTyp: await lauf(block({ typ: "ausklang" })),
      dauerNull: await lauf(block({ dauer: 0 })),
      ohneDatum: await lauf(JSON.stringify({ schema: "adler-einheit/1", datum: "15.09.2026", bloecke: [{ label: "A", typ: "warmup", dauer: 10 }] })),
      /* Der Abschluss ist freies Spiel – im Trainingsplan gibt es dort kein Übungsfeld.
         Ein Eintrag dafür rutschte beim Wiederherstellen in eine fremde Phase. */
      /* Die Auswahl ist je Phase gefiltert – eine Hauptteil-Übung im Aufwärmen liesse sich
         gar nicht setzen und landete beim Wiederherstellen in einer fremden Phase. */
      falscheKategorie: await lauf(JSON.stringify({ schema: "adler-einheit/1", datum, bloecke: [{ label: "Aufwärmen", typ: "warmup", dauer: 10, uebung: { name: "Neue Spielform XY", kat: "spielformen" } }] })),
      abschlussMitUebung: await lauf(JSON.stringify({ schema: "adler-einheit/1", datum, bloecke: [{ label: "Ausklang", typ: "abschluss", dauer: 10, uebung: { name: "Irgendwas" } }] })),
      // gültig: ein Block ohne Übung ist erlaubt und wird später im Trainingsplan befüllt
      ohneUebung: await lauf(block({}))
    };
  }, { datum });
  const schreib = s.gesendet.length - vorher;
  const ohneUebung = schlecht.ohneUebung; delete schlecht.ohneUebung;
  if (!/Abschluss ist freies Spiel/.test(schlecht.abschlussMitUebung.melde)) probleme.push("Eine Übung am Abschluss wird nicht abgewiesen – sie landete im Trainingsplan in einer fremden Phase");
  if (!/passt nicht in eine Phase/.test(schlecht.falscheKategorie.melde)) probleme.push("Eine Übung mit unpassender Kategorie wird nicht abgewiesen");
  if (/Bitte noch korrigieren/.test(ohneUebung.melde)) probleme.push("Ein Block ohne Übung wird abgewiesen – er ist aber erlaubt");
  if (!/noch keine Übung/.test(ohneUebung.vorschau)) probleme.push("Die Vorschau sagt bei einem Block ohne Übung nicht, dass sie im Trainingsplan gewählt wird");
  Object.entries(schlecht).forEach(([fall, r]) => {
    if (!/Bitte noch korrigieren/.test(r.melde)) probleme.push(`Fall „${fall}“: keine Fehlermeldung (${r.melde.slice(0, 60)})`);
    if (r.vorschau) probleme.push(`Fall „${fall}“: es wird trotz Fehler eine Vorschau gezeigt`);
    if (r.haupt !== "Prüfen") probleme.push(`Fall „${fall}“: Hauptaktion heißt „${r.haupt}“ statt „Prüfen“`);
  });
  if (!/erlaubt sind/.test(schlecht.falscherTyp.melde)) probleme.push("Der unbekannte Typ wird nicht benannt");
  if (schreib) probleme.push(`${schreib} Schreibzugriff(e) trotz fehlerhafter Eingabe`);

  /* Die Kategorie-Regel im Import ist eine Spiegelung von tpFilteredOpts(). Hier wird sie
     dagegen gehalten: für jeden Phasentyp muss die Vorhersage mit der echten Auswahl
     übereinstimmen – sonst läuft die Spiegelung eines Tages unbemerkt auseinander. */
  const spiegel = await s.page.evaluate(() => {
    const af = tpAllForms(), aus = [];
    ["warmup", "main", "tw", "individual"].forEach(typ => {
      const echt = new Set(tpFilteredOpts(typ).map(x => x.i));
      af.forEach((f, i) => { if (echt.has(i) !== _eiKatPasst(typ, f.kat)) aus.push(`${typ}/${f.kat}`); });
    });
    return [...new Set(aus)];
  });
  if (spiegel.length) probleme.push(`Kategorie-Regel weicht von tpFilteredOpts ab: ${spiegel.join(", ")}`);

  // ── 3) neu gegen vorhanden ────────────────────────────────────────────────
  const gutJson = await s.page.evaluate(({ datum }) => {
    const bekannt = TRAININGSFORMEN.find(f => !["aufwaermen", "torwart", "individual"].includes(f.kat)).name;   // eine für den Hauptteil
    const bekanntTw = TRAININGSFORMEN.find(f => f.kat === "torwart").name;                                       // eine für den Torwart-Block
    return JSON.stringify({
      schema: "adler-einheit/1", datum, team: "U9 I", dauer_min: 60,
      schwerpunkt: "Ball nach vorne bringen, ohne den Korridor zu verlassen.",
      material: "12 Hütchen, 4 Minitore, 8 Bälle",
      beobachtung: "Wer besetzt nach Ballgewinn selbständig die Aufpasser-Position?",
      notiz_folge: "Bei zwei Feldern bleiben.",
      bloecke: [
        { label: "Ankommen & Aufwärmen", typ: "warmup", dauer: 10, uebung: { name: "Hütchen-Fangen mit Ball", kat: "aufwaermen", kurz: "Alle mit Ball, zwei Fänger.", spieler: "8–14", feld: "20×15m", dauer: "10", diff: 1, spass: 5 } },
        { label: "Hauptteil 1", typ: "main", dauer: 20, uebung: { name: bekannt } },
        { label: "Hauptteil 2", typ: "main", dauer: 20, uebung: { name: "Korridor-Duell 2 gegen 2", kat: "spielformen", ablauf: "Zwei Korridore, Tore an den Enden." } },
        { label: "Torwart-Block", typ: "tw", dauer: 10, uebung: { name: bekanntTw } }
      ]
    });
  }, { datum });
  const vorschau = await s.page.evaluate(async ({ txt }) => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    document.getElementById("ei-json").value = txt;
    await einheitImportPruefen(); await warte(80);
    const v = document.getElementById("ei-vorschau");
    return { text: v.textContent.replace(/\s+/g, " ").trim(),
             neu: [...v.querySelectorAll("span")].filter(x => x.textContent.trim() === "neu").length,
             vorhanden: [...v.querySelectorAll("span")].filter(x => x.textContent.trim() === "vorhanden").length,
             haupt: document.getElementById("ei-haupt").textContent.trim() };
  }, { txt: gutJson });
  if (vorschau.neu !== 2) probleme.push(`Vorschau markiert ${vorschau.neu} Übungen als neu – erwartet 2`);
  if (vorschau.vorhanden !== 2) probleme.push(`Vorschau markiert ${vorschau.vorhanden} Übungen als vorhanden – erwartet 2`);
  if (vorschau.haupt !== "Übernehmen") probleme.push(`Hauptaktion heißt „${vorschau.haupt}“ statt „Übernehmen“`);
  if (!/60 Min\./.test(vorschau.text)) probleme.push(`Vorschau ohne Gesamtdauer: ${vorschau.text.slice(0, 90)}`);

  // ── 4) Übernehmen: Schreiben und Index-Auflösung ──────────────────────────
  const nach = await s.page.evaluate(async () => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    await einheitImportUebernehmen(); await warte(400);
    const geschrieben = (typeof tpAllForms === "function") ? tpAllForms() : [];
    return {
      offen: !!document.getElementById("ei-modal"),
      slots: (typeof tpSlots !== "undefined") ? tpSlots.map(x => ({ label: x.label, dauer: x.dauer, typ: x.typ, farbe: x.farbe })) : [],
      sel: [...document.querySelectorAll(".tp-form-sel")].filter(x => x.value).map(x => geschrieben[parseInt(x.value)] && geschrieben[parseInt(x.value)].name),
      kopf: document.getElementById("tp-kopf") ? document.getElementById("tp-kopf").textContent.replace(/\s+/g, " ").trim() : "",
      namen: geschrieben.map(f => f && f.name)
    };
  });
  const zeile = plaene[datum];
  const neueFormen = s.gesendet.filter(x => x.pfad.includes("trainingsformen") && x.methode === "POST").length;
  if (nach.offen) probleme.push("Das Import-Fenster bleibt nach dem Übernehmen offen");
  if (neueFormen !== 2) probleme.push(`${neueFormen} neue Übungen angelegt – erwartet 2`);
  if (!zeile) probleme.push("Es wurde kein Plan geschrieben");
  else {
    if ((zeile.slots || []).length !== 4) probleme.push(`${(zeile.slots || []).length} slots statt 4`);
    if ((zeile.plan || []).length !== 4) probleme.push(`${(zeile.plan || []).length} plan-Einträge statt 4`);
    if (!zeile.kopf || !/Korridor/.test(zeile.kopf.schwerpunkt || "")) probleme.push("Der Kopf der Einheit wurde nicht mitgeschrieben");
    const farben = (zeile.slots || []).map(x => x.farbe).join(",");
    if (farben !== "#059669,#1a56db,#7c3aed,#854d0e") probleme.push(`Farben aus dem Typ: ${farben}`);
    // Der wichtigste Punkt: der Index zeigt auf genau die Übung, die im Eintrag steht.
    (zeile.plan || []).forEach(e => {
      const name = nach.namen[e.formIdx];
      if (name !== e.formName) probleme.push(`formIdx ${e.formIdx} zeigt auf „${name}“ statt auf „${e.formName}“`);
      if (e.trainer !== "Alle" || e.key !== `${e.formIdx}-Alle`) probleme.push(`Eintrag „${e.formName}“ hat trainer/key ${e.trainer}/${e.key}`);
    });
  }
  if (nach.slots.length !== 4) probleme.push(`Die Zeitleiste zeigt ${nach.slots.length} Phasen statt 4`);
  if (nach.sel.length !== 4) probleme.push(`In der Zeitleiste stehen ${nach.sel.length} Übungen statt 4`);
  if (!/Korridor-Duell/.test(nach.sel.join("|"))) probleme.push(`Die neue Übung steht nicht in der Zeitleiste: ${nach.sel.join(" | ")}`);
  if (!/Schwerpunkt/.test(nach.kopf)) probleme.push(`Der Kopf der Einheit erscheint nicht über der Zeitleiste: „${nach.kopf.slice(0, 60)}“`);
  // Abnahme: der Kopf überlebt einen Seitenwechsel
  const wieder = await s.page.evaluate(async () => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    go("anwesenheit"); await warte(200); go("planung"); await warte(600);
    const b = document.getElementById("tp-kopf");
    const d = b && b.querySelector("details");
    return { text: b ? b.textContent.replace(/\s+/g, " ").trim() : "", klappbar: !!d };
  });
  if (!/Schwerpunkt/.test(wieder.text)) probleme.push(`Nach einem Seitenwechsel ist der Kopf weg: „${wieder.text.slice(0, 60)}“`);
  if (!wieder.klappbar) probleme.push("Der Kopf ist keine aufklappbare Karte");

  // ── 5) Zweiter Lauf: keine Dubletten, Kollision wird angesagt ─────────────
  const vorZweit = s.gesendet.length;
  const zweit = await s.page.evaluate(async ({ txt }) => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    einheitImportOpen(); await warte(60);
    document.getElementById("ei-json").value = txt;
    await einheitImportPruefen(); await warte(120);
    const v = document.getElementById("ei-vorschau");
    return { neu: [...v.querySelectorAll("span")].filter(x => x.textContent.trim() === "neu").length,
             haupt: document.getElementById("ei-haupt").textContent.trim(),
             warnung: /überschrieben/.test(v.textContent) };
  }, { txt: gutJson });
  const schreibZweit = s.gesendet.length - vorZweit;
  if (zweit.neu !== 0) probleme.push(`Beim zweiten Lauf gelten ${zweit.neu} Übungen wieder als neu – es entstünden Dubletten`);
  if (zweit.haupt !== "Plan ersetzen") probleme.push(`Bei bestehendem Plan heißt die Hauptaktion „${zweit.haupt}“ statt „Plan ersetzen“`);
  if (!zweit.warnung) probleme.push("Die Vorschau sagt nicht, dass der bestehende Plan überschrieben wird");
  if (schreibZweit) probleme.push(`${schreibZweit} Schreibzugriff(e) allein durch das Prüfen bei bestehendem Plan`);

  const fehler = s.fehler(); await s.schliessen();
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Kategorie-Regel deckt sich mit tpFilteredOpts (${spiegel.length} Abweichungen) · Ladearchitektur: Funktion ${bau.fn}, Knopf ${bau.knopf}, Kopf-Platz ${bau.kopfBox}, PRECACHE und MODUL_WACHE gesetzt, Eltern-Loader frei`);
  zeilen.push(`${Object.keys(schlecht).length} fehlerhafte Eingaben → ebenso viele Meldungen, ${schreib} Schreibzugriffe · Vorschau: ${vorschau.neu} neu, ${vorschau.vorhanden} vorhanden · Kopf überlebt Seitenwechsel ${/Schwerpunkt/.test(wieder.text)}`);
  zeilen.push(`Import: ${neueFormen} Übungen angelegt, ${(zeile && zeile.slots || []).length} slots, ${(zeile && zeile.plan || []).length} plan-Einträge, Index zeigt auf die richtige Übung`);
  zeilen.push(`Zweiter Lauf: ${zweit.neu} neue Übungen, Hauptaktion „${zweit.haupt}“, ${schreibZweit} Schreibzugriffe`);
  return h.ergebnis("Einheit importieren – Übungen, Phasen und Plan in einem Schritt", !probleme.length, zeilen.concat(probleme));
};
