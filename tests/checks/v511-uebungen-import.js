/* v511 – Auftragspaket „Übungs-Import ohne Datum + Skizzen-Übernahme".
   Zwei Dinge, dieselbe Datei:
   (1) `_eiUebungAnlegen()` setzte `skizze` fest auf `null` – eine mitgelieferte Zeichnung
       ging verloren und die Übung zeigte danach gar kein Bild. Jetzt wird sie übernommen,
       wenn es ein Objekt ist; kaputte Listen fängt die Prüfung ab, bevor etwas geschrieben
       wird (`(o.z||[]).forEach` wirft sonst beim Zeichnen und risse die Übung mit).
   (2) Übungen kamen nur als NEBENWIRKUNG eines Einheiten-Imports in die App – danach stand
       zwingend ein Trainingsplan für ein Datum da. Das neue Schema `adler-uebungen/1`
       schreibt in `trainingsformen` und in NICHTS sonst.
   Dazu die Falle aus v506, die hier weiterläuft: die Kategorie-Spiegelung EI_KAT_PHASE muss
   zu tpFilteredOpts() passen, und die neue Liste EI_KATS zu den Kategorien, die der
   Übungs-Editor tatsächlich anbietet. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");
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

  const SKIZZE = { s: [[70, 90, "g", "A"], [170, 50, "g", "B"]], b: [[80, 95]], p: [[80, 86, 162, 55, "p"]], tx: [[140, 165, "Doppelpass"]] };
  /* Bewusst in mehreren Schritten gemessen: ein einziges evaluate() über den ganzen Ablauf
     bricht ab, sobald eine Aktion darin die Seite umbaut („Execution context destroyed"). */
  const r = await s.page.evaluate(async () => {
    if (typeof uebungImportUebernehmen !== "function") return { fehlt: "uebungImportUebernehmen" };
    const bau = {
      open: typeof uebungImportOpen === "function",
      knopf: [...document.querySelectorAll("#train-sub-planung button")].some(b => /Übungen importieren/.test(b.textContent)),
      alterKnopf: [...document.querySelectorAll("#train-sub-planung button")].some(b => /Einheit importieren/.test(b.textContent))
    };
    /* Die Kategorie-Regeln als Spiegelung: EI_KAT_PHASE gegen tpFilteredOpts (v506) und
       EI_KATS gegen die Kategorien, die der Übungs-Editor wirklich anbietet. */
    const abw = [];
    ["warmup", "tw", "individual", "main"].forEach(typ => {
      tpAllForms().forEach(f => {
        const echt = tpFilteredOpts(typ).some(x => x.f === f);
        if (echt !== _eiKatPasst(typ, f.kat)) abw.push(`${typ}/${f.kat}`);
      });
    });
    const editorKats = [...document.querySelectorAll("#tf-kat option")].map(o => o.value);

    // ── Prüfen: fehlerhafte Eingaben, dabei darf nichts geschrieben werden ──
    const warte = ms => new Promise(r => setTimeout(r, ms));
    uebungImportOpen(); await warte(60);
    const setze = t => { document.getElementById("eu-json").value = t; };
    const pruefe = t => { setze(t); uebungImportPruefen(); return (document.getElementById("eu-melde").textContent || ""); };
    const schlecht = [
      ["kein JSON", "{nope"],
      ["falsches Schema", JSON.stringify({ schema: "adler-einheit/1", uebungen: [{ name: "A" }] })],
      ["keine Übungen", JSON.stringify({ schema: "adler-uebungen/1", uebungen: [] })],
      ["Name fehlt", JSON.stringify({ schema: "adler-uebungen/1", uebungen: [{ kat: "technik" }] })],
      ["Kategorie erfunden", JSON.stringify({ schema: "adler-uebungen/1", uebungen: [{ name: "A", kat: "quatsch" }] })],
      ["Skizze kaputt", JSON.stringify({ schema: "adler-uebungen/1", uebungen: [{ name: "A", skizze: { s: "nein" } }] })],
      ["zweimal derselbe Name", JSON.stringify({ schema: "adler-uebungen/1", uebungen: [{ name: "Doppel" }, { name: " doppel " }] })]
    ];
    const meldungen = schlecht.map(([lbl, txt]) => ({ lbl, rot: /Bitte noch korrigieren/.test(pruefe(txt)) }));
    uebungImportClose();
    return { bau, abw, editorKats, kats: EI_KATS, meldungen };
  });
  const fehler1 = s.fehler();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt – der Übungs-Import ist nicht geladen`); await s.schliessen(); return h.ergebnis("Übungen importieren", false, probleme); }
  const beimPruefen = custom.length;

  const r2 = await s.page.evaluate(async ({ SKIZZE }) => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const setze = t => { document.getElementById("eu-json").value = t; };
    uebungImportOpen(); await warte(60);
    // ── Gute Datei: drei Übungen, eine mit Zeichnung ──
    const gut = JSON.stringify({
      schema: "adler-uebungen/1",
      uebungen: [
        { name: "Doppelpass-Dreieck", kat: "passspiel", ablauf: "A passt auf B", dauer: 12, spieler: "6-10", skizze: SKIZZE },
        { name: "Fangspiel Hai", kat: "aufwaermen", ablauf: "Alle dribbeln" },
        { name: "Abwurf-Duell", kat: "torwart" }
      ]
    });
    setze(gut); uebungImportPruefen(); await warte(60);
    window.__gut = gut;
    const vor = document.getElementById("eu-vorschau");
    const vorschau = {
      text: (vor.textContent || "").replace(/\s+/g, " ").trim().slice(0, 140),
      neu: (vor.textContent.match(/neu/g) || []).length,
      skizzeGezeichnet: !!vor.querySelector("svg"),
      hauptText: (document.getElementById("eu-haupt").textContent || "").trim()
    };
    await uebungImportUebernehmen(); await warte(200);
    const nachher = {
      offen: !!document.getElementById("eu-modal"),
      formen: tpAllForms().filter(f => /Doppelpass-Dreieck|Fangspiel Hai|Abwurf-Duell/.test(f.name)).map(f => ({ name: f.name, kat: f.kat, svg: (f.svg || "").length })),
      // Auswahl im Trainingsplan, nach Phase gefiltert
      imWarmup: tpFilteredOpts("warmup").some(x => x.f.name === "Fangspiel Hai"),
      imTw: tpFilteredOpts("tw").some(x => x.f.name === "Abwurf-Duell"),
      imMain: tpFilteredOpts("main").some(x => x.f.name === "Doppelpass-Dreieck"),
      warmupFalsch: tpFilteredOpts("warmup").some(x => x.f.name === "Doppelpass-Dreieck")
    };
    return { vorschau, nachher };
  }, { SKIZZE });

  const r3 = await s.page.evaluate(async () => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const setze = t => { document.getElementById("eu-json").value = t; };
    // ── Zweiter Lauf derselben Datei: nichts doppelt ──
    uebungImportOpen(); await warte(60);
    setze(window.__gut); uebungImportPruefen(); await warte(60);
    const zweiter = {
      // Schilder zählen, nicht Wörter: in der Kopfzeile steht „vorhanden" noch einmal
      neu: [...document.querySelectorAll("#eu-vorschau span")].filter(x => x.textContent.trim() === "vorhanden").length,
      haupt: (document.getElementById("eu-haupt").textContent || "").trim(),
      gesperrt: !!document.getElementById("eu-haupt").disabled
    };
    uebungImportClose();
    return { zweiter };
  });

  const r4 = await s.page.evaluate(async ({ SKIZZE }) => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    // ── Einheiten-Import trägt jetzt Skizzen ──
    const heute = new Date(Date.now() + 4 * 864e5).toISOString().slice(0, 10);
    einheitImportOpen(); await warte(60);
    document.getElementById("ei-json").value = JSON.stringify({
      schema: "adler-einheit/1", datum: heute, dauer_min: 20,
      bloecke: [{ label: "Ankommen", typ: "warmup", dauer: 20, uebung: { name: "Kegel-Fangen", kat: "aufwaermen", skizze: SKIZZE } }]
    });
    await einheitImportPruefen(); await warte(120);
    await einheitImportUebernehmen(); await warte(250);
    const einheit = { form: tpAllForms().find(f => f.name === "Kegel-Fangen") || null };
    return { einheitSkizze: !!(einheit.form && einheit.form.skizze), einheitSvg: (einheit.form && einheit.form.svg || "").length };
  }, { SKIZZE });
  Object.assign(r, r2, r3, r4);
  const fehler = s.fehler(); await s.schliessen();

  // Ladearchitektur
  const tr = fs.readFileSync(path.join(h.REPO, "trainer/index.html"), "utf8");
  const el = fs.readFileSync(path.join(h.REPO, "eltern/index.html"), "utf8");
  if (!r.bau.open) probleme.push("uebungImportOpen fehlt");
  if (!r.bau.knopf) probleme.push("Im Trainingsplan fehlt der Knopf „Übungen importieren“");
  if (!r.bau.alterKnopf) probleme.push("Der Knopf „Einheit importieren“ ist verschwunden");
  [["trainer", tr], ["eltern", el]].forEach(([wo, q]) => {
    if (!/"md-einheit-import\.js":"uebungImportUebernehmen"/.test(q)) probleme.push(`Die MODUL_WACHE (${wo}) bewacht nicht die letzte Funktion der Datei`);
  });

  // Kategorien
  if (r.abw.length) probleme.push(`EI_KAT_PHASE und tpFilteredOpts laufen auseinander: ${r.abw.slice(0, 4).join(", ")}`);
  const fehltImCode = r.editorKats.filter(k => !r.kats.includes(k));
  const zuvielImCode = r.kats.filter(k => !r.editorKats.includes(k));
  if (fehltImCode.length || zuvielImCode.length)
    probleme.push(`EI_KATS passt nicht zum Übungs-Editor: fehlt ${fehltImCode.join(",") || "–"}, zu viel ${zuvielImCode.join(",") || "–"}`);

  // Prüfung weist ab, ohne zu schreiben
  const durchgerutscht = r.meldungen.filter(m => !m.rot).map(m => m.lbl);
  if (durchgerutscht.length) probleme.push(`Diese Eingaben wurden nicht abgewiesen: ${durchgerutscht.join(" · ")}`);
  if (beimPruefen) probleme.push(`Beim Prüfen wurden schon ${beimPruefen} Zeilen geschrieben`);

  // Übernehmen
  if (r.nachher.offen) probleme.push("Das Fenster bleibt nach dem Übernehmen offen");
  if (custom.length !== 4) probleme.push(`In trainingsformen stehen ${custom.length} neue Zeilen (erwartet 4: 3 aus dem Übungs-Import, 1 aus dem Einheiten-Import)`);
  if (Object.keys(plaene).length !== 1) probleme.push(`Der Übungs-Import hat einen Trainingsplan geschrieben: ${Object.keys(plaene).join(", ")} (erwartet ist nur der eine aus dem Einheiten-Import)`);
  if (r.nachher.formen.length !== 3) probleme.push(`Nach dem Import kennt tpAllForms ${r.nachher.formen.length} der drei Übungen`);
  if (!r.nachher.imWarmup || !r.nachher.imTw || !r.nachher.imMain)
    probleme.push(`Die Auswahl im Trainingsplan filtert falsch: Aufwärmen ${r.nachher.imWarmup}, Torwart ${r.nachher.imTw}, Hauptteil ${r.nachher.imMain}`);
  if (r.nachher.warmupFalsch) probleme.push("Eine Passspiel-Übung steht in der Aufwärm-Auswahl");

  // Skizze
  const mitSkizze = custom.find(f => f.name === "Doppelpass-Dreieck");
  if (!mitSkizze || !mitSkizze.skizze || typeof mitSkizze.skizze !== "object") probleme.push("Die mitgelieferte Zeichnung wurde nicht mitgeschrieben");
  const ohneSkizze = custom.find(f => f.name === "Fangspiel Hai");
  if (ohneSkizze && ohneSkizze.skizze !== null) probleme.push("Eine Übung ohne Zeichnung bekommt jetzt etwas anderes als null");
  const gezeichnet = r.nachher.formen.find(f => f.name === "Doppelpass-Dreieck");
  if (!gezeichnet || gezeichnet.svg < 100) probleme.push("Die importierte Übung zeigt keine Zeichnung (svg leer)");
  if (!r.vorschau.skizzeGezeichnet) probleme.push("Die Vorschau zeigt die mitgelieferte Zeichnung nicht");
  if (!r.einheitSkizze || r.einheitSvg < 100) probleme.push("Der Einheiten-Import transportiert die Zeichnung nicht");

  // Zweiter Lauf
  if (r.zweiter.neu !== 3) probleme.push(`Beim zweiten Lauf sind ${r.zweiter.neu} statt 3 Übungen als „vorhanden“ markiert`);
  if (!r.zweiter.gesperrt) probleme.push("Beim zweiten Lauf lässt sich trotzdem „anlegen“ drücken");
  if (fehler.length) probleme.push(...fehler.slice(0, 3));

  zeilen.push(`Ladearchitektur: Knöpfe ${r.bau.knopf}/${r.bau.alterKnopf} · MODUL_WACHE auf uebungImportUebernehmen · EI_KATS deckt sich mit dem Editor (${r.kats.length} Kategorien) · EI_KAT_PHASE ↔ tpFilteredOpts ${r.abw.length} Abweichungen`);
  zeilen.push(`${r.meldungen.length} fehlerhafte Eingaben → ${r.meldungen.filter(m => m.rot).length} Meldungen · Vorschau: „${r.vorschau.hauptText}“, Zeichnung ${r.vorschau.skizzeGezeichnet}`);
  zeilen.push(`Angelegt: ${custom.length} Zeilen in trainingsformen, ${Object.keys(plaene).length} Plan (nur aus dem Einheiten-Import) · Auswahl: Aufwärmen ${r.nachher.imWarmup}, Torwart ${r.nachher.imTw}, Hauptteil ${r.nachher.imMain}`);
  zeilen.push(`Zweiter Lauf: „${r.zweiter.haupt}“, gesperrt ${r.zweiter.gesperrt} · Skizze im Einheiten-Import ${r.einheitSkizze}`);
  return h.ergebnis("Übungen importieren – ohne Datum, mit Zeichnung", !probleme.length, zeilen.concat(probleme));
};
