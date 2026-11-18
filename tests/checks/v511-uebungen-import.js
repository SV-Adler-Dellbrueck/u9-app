/* v511 – Auftragspaket „Übungs-Import ohne Datum + Skizzen-Übernahme".
   Zwei Dinge, dieselbe Datei:
   (1) `_eiUebungAnlegen()` setzte `skizze` fest auf `null` – eine mitgelieferte Zeichnung
       ging verloren und die Übung zeigte danach gar kein Bild. Jetzt wird sie übernommen,
       wenn es ein Objekt ist; kaputte Listen fängt die Prüfung ab, bevor etwas geschrieben
       wird (`(o.z||[]).forEach` wirft sonst beim Zeichnen und risse die Übung mit).
   (2) Übungen kamen nur als NEBENWIRKUNG eines Einheiten-Imports in die App – danach stand
       zwingend ein Trainingsplan für ein Datum da. Das neue Schema `adler-uebungen/1`
       schreibt in `trainingsformen` und in NICHTS sonst.
   v872: Die Import-Fenster sind entfernt (Charles 18.11.: „Raus, Prüfung bleibt“). Geprüft
   wird jetzt der Weg, der bleibt: `_euPruefung()` + `_euAnlegen()`, dieselben Funktionen, die
   `bibliothekAbgleich()` für uebungen/bibliothek.json benutzt. Der Teil zum Einheiten-Import
   entfällt mit dem Fenster.
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
    if (typeof _euAnlegen !== "function" || typeof _euPruefung !== "function") return { fehlt: "_euPruefung/_euAnlegen" };
    const bau = {
      fensterWeg: typeof uebungImportOpen === "undefined" && typeof uebungImportUebernehmen === "undefined",
      knopf: [...document.querySelectorAll("#train-sub-formen button")].some(b => /Übungen importieren/.test(b.textContent)),
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

    // ── Prüfen: fehlerhafte Eingaben werden abgewiesen ──
    const schlecht = [
      ["kein JSON", "{nope"],
      ["falsches Schema", JSON.stringify({ schema: "adler-einheit/1", uebungen: [{ name: "A" }] })],
      ["keine Übungen", JSON.stringify({ schema: "adler-uebungen/1", uebungen: [] })],
      ["Name fehlt", JSON.stringify({ schema: "adler-uebungen/1", uebungen: [{ kat: "technik" }] })],
      ["Kategorie erfunden", JSON.stringify({ schema: "adler-uebungen/1", uebungen: [{ name: "A", kat: "quatsch" }] })],
      ["Skizze kaputt", JSON.stringify({ schema: "adler-uebungen/1", uebungen: [{ name: "A", skizze: { s: "nein" } }] })],
      ["zweimal derselbe Name", JSON.stringify({ schema: "adler-uebungen/1", uebungen: [{ name: "Doppel" }, { name: " doppel " }] })]
    ];
    const meldungen = schlecht.map(([lbl, txt]) => ({ lbl, rot: _euPruefung(txt).fehler.length > 0 }));
    return { bau, abw, editorKats, kats: EI_KATS, meldungen };
  });
  const fehler1 = s.fehler();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt – Prüfung und Anlegen sind nicht geladen`); await s.schliessen(); return h.ergebnis("Übungen anlegen (Abgleichsweg)", false, probleme); }
  const beimPruefen = custom.length;

  // Derselbe Weg wie bibliothekAbgleich(): prüfen, neu markieren, anlegen.
  const r2 = await s.page.evaluate(async ({ SKIZZE }) => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const gut = JSON.stringify({
      schema: "adler-uebungen/1",
      uebungen: [
        { name: "Doppelpass-Dreieck", kat: "passspiel", ablauf: "A passt auf B", dauer: 12, spieler: "6-10", skizze: SKIZZE },
        { name: "Fangspiel Hai", kat: "aufwaermen", ablauf: "Alle dribbeln" },
        { name: "Abwurf-Duell", kat: "torwart" }
      ]
    });
    window.__gut = gut;
    const { fehler, daten } = _euPruefung(gut);
    const liste = daten.uebungen.map(u => ({ ...u, kat: u.kat == null ? "technik" : String(u.kat), neu: _eiFormIndex(u.name) < 0 }));
    const erg = await _euAnlegen(liste); await warte(200);
    const nachher = {
      pruefFehler: fehler.length,
      erg,
      formen: tpAllForms().filter(f => /Doppelpass-Dreieck|Fangspiel Hai|Abwurf-Duell/.test(f.name)).map(f => ({ name: f.name, kat: f.kat, svg: (f.svg || "").length })),
      // Auswahl im Trainingsplan, nach Phase gefiltert
      imWarmup: tpFilteredOpts("warmup").some(x => x.f.name === "Fangspiel Hai"),
      imTw: tpFilteredOpts("tw").some(x => x.f.name === "Abwurf-Duell"),
      imMain: tpFilteredOpts("main").some(x => x.f.name === "Doppelpass-Dreieck"),
      warmupFalsch: tpFilteredOpts("warmup").some(x => x.f.name === "Doppelpass-Dreieck")
    };
    return { nachher };
  }, { SKIZZE });

  const r3 = await s.page.evaluate(async () => {
    // ── Zweiter Lauf derselben Datei: nichts doppelt ──
    const { daten } = _euPruefung(window.__gut);
    const liste = daten.uebungen.map(u => ({ ...u, neu: _eiFormIndex(u.name) < 0 }));
    const erg = await _euAnlegen(liste);
    return { zweiter: { vorhanden: liste.filter(u => !u.neu).length, angelegt: erg.angelegt, uebersprungen: erg.uebersprungen } };
  });
  Object.assign(r, r2, r3);
  const fehler = fehler1.concat(s.fehler()); await s.schliessen();

  // Ladearchitektur
  const tr = fs.readFileSync(path.join(h.REPO, "trainer/index.html"), "utf8");
  const el = fs.readFileSync(path.join(h.REPO, "eltern/index.html"), "utf8");
  if (!r.bau.fensterWeg) probleme.push("Das Fenster „Übungen importieren“ ist wieder im Modul (v872: entfallen)");
  /* v539: Der Knopf ist WEG – bewusst. Eingespielt wird über uebungen/bibliothek.json und
     uebungen/vorlagen.json im Repo, die beim Öffnen automatisch abgeglichen werden; der
     Abgleich benutzt dieselbe Prüfung, die dieser Lauf durchspielt. */
  if (r.bau.knopf) probleme.push("Der Knopf „Übungen importieren“ steht wieder im Übungen-Bereich (v539: entfallen)");
  if (r.bau.alterKnopf) probleme.push("Der Knopf „Einheit importieren“ steht wieder im Trainingsplan (v538: entfallen)");
  /* Der Wachname folgt der LETZTEN Funktion der Datei – seit v512 ist das bibliothekAbgleich.
     Geprüft wird hier nur, dass das Modul überhaupt bewacht ist und in beiden Einstiegen
     gleich; welcher Name das ist, hält die Ladearchitektur-Prüfung fest. */
  [["trainer", tr], ["eltern", el]].forEach(([wo, q]) => {
    if (!/"md-einheit-import\.js":"[A-Za-z_$][\w$]*"/.test(q)) probleme.push(`Die MODUL_WACHE (${wo}) bewacht md-einheit-import.js nicht`);
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

  // Anlegen
  if (r.nachher.pruefFehler) probleme.push(`Die gute Datei meldet ${r.nachher.pruefFehler} Fehler`);
  if (custom.length !== 3) probleme.push(`In trainingsformen stehen ${custom.length} neue Zeilen (erwartet 3)`);
  if (Object.keys(plaene).length) probleme.push(`Das Anlegen von Übungen hat einen Trainingsplan geschrieben: ${Object.keys(plaene).join(", ")}`);
  if (r.nachher.formen.length !== 3) probleme.push(`Nach dem Anlegen kennt tpAllForms ${r.nachher.formen.length} der drei Übungen`);
  if (!r.nachher.imWarmup || !r.nachher.imTw || !r.nachher.imMain)
    probleme.push(`Die Auswahl im Trainingsplan filtert falsch: Aufwärmen ${r.nachher.imWarmup}, Torwart ${r.nachher.imTw}, Hauptteil ${r.nachher.imMain}`);
  if (r.nachher.warmupFalsch) probleme.push("Eine Passspiel-Übung steht in der Aufwärm-Auswahl");

  // Skizze
  const mitSkizze = custom.find(f => f.name === "Doppelpass-Dreieck");
  if (!mitSkizze || !mitSkizze.skizze || typeof mitSkizze.skizze !== "object") probleme.push("Die mitgelieferte Zeichnung wurde nicht mitgeschrieben");
  const ohneSkizze = custom.find(f => f.name === "Fangspiel Hai");
  if (ohneSkizze && ohneSkizze.skizze !== null) probleme.push("Eine Übung ohne Zeichnung bekommt jetzt etwas anderes als null");
  const gezeichnet = r.nachher.formen.find(f => f.name === "Doppelpass-Dreieck");
  if (!gezeichnet || gezeichnet.svg < 100) probleme.push("Die angelegte Übung zeigt keine Zeichnung (svg leer)");

  // Zweiter Lauf
  if (r.zweiter.vorhanden !== 3) probleme.push(`Beim zweiten Lauf gelten ${r.zweiter.vorhanden} statt 3 Übungen als vorhanden`);
  if (r.zweiter.angelegt || custom.length !== 3) probleme.push(`Beim zweiten Lauf wurden ${r.zweiter.angelegt} Übungen doppelt angelegt`);
  if (fehler.length) probleme.push(...fehler.slice(0, 3));

  zeilen.push(`Ladearchitektur: Fenster entfernt ${r.bau.fensterWeg} · Knöpfe ${r.bau.knopf}/${r.bau.alterKnopf} · EI_KATS deckt sich mit dem Editor (${r.kats.length} Kategorien) · EI_KAT_PHASE ↔ tpFilteredOpts ${r.abw.length} Abweichungen`);
  zeilen.push(`${r.meldungen.length} fehlerhafte Eingaben → ${r.meldungen.filter(m => m.rot).length} abgewiesen, ${beimPruefen} Schreibzugriffe`);
  zeilen.push(`Angelegt über _euAnlegen: ${custom.length} Zeilen in trainingsformen, ${Object.keys(plaene).length} Pläne · Zeichnung ${gezeichnet ? gezeichnet.svg : 0} Zeichen SVG · Auswahl: Aufwärmen ${r.nachher.imWarmup}, Torwart ${r.nachher.imTw}, Hauptteil ${r.nachher.imMain}`);
  zeilen.push(`Zweiter Lauf: ${r.zweiter.vorhanden} vorhanden, ${r.zweiter.angelegt} angelegt`);
  return h.ergebnis("Übungen anlegen (Abgleichsweg) – ohne Datum, mit Zeichnung", !probleme.length, zeilen.concat(probleme));
};
