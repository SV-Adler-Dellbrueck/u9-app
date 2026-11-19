/* v506 – Auftragspaket „Einheit importieren": eine fertige Einheit als JSON in einem Rutsch
   in die App – Übungen anlegen, Phasen setzen, Plan für das Datum speichern.
   v872: Das Fenster dazu ist entfernt (Charles 18.11.: „Raus, Prüfung bleibt“) – es hatte seit
   v538 keinen Knopf. Was von diesem Lauf bleibt, gilt nicht dem Fenster, sondern dem, was es
   mit eingeführt hat und was weiter lebt:
   (1) Ladearchitektur des Moduls md-einheit-import.js (PRECACHE, WELLE2, MODUL_WACHE, nicht
       im Eltern-Ladeplan) und kein Knopf „Einheit importieren“ im Trainingsplan,
   (2) die Kategorie-Regel _eiKatPasst als Spiegel von tpFilteredOpts (Abgleich und Vorlagen
       prüfen damit),
   (3) der Kopf der Einheit (`kopf` in `trainingsplan`, #tp-kopf über der Zeitleiste): er wird
       aus dem gespeicherten Plan gelesen, ist aufklappbar und überlebt einen Seitenwechsel,
   (4) die Index-Falle aus Abschnitt 2 des Pakets – beim LESEN gilt der Name (`formName`),
       ein falscher gespeicherter Index darf die Übung nicht vertauschen (seit v586). */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");
  const datum = h.tagePlus(3);
  const plaene = {};
  const s = await h.starten({ supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), termine: [], nominierungen: [], anwesenheit: [],
    trainingsformen: [],
    trainingsplan: (u, req) => {
      if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); plaene[b.datum] = b; return { status: 201, body: "[]" }; }
      const d = (u.searchParams.get("datum") || "").replace(/^eq\./, "");
      return plaene[d] ? [plaene[d]] : [];
    }
  }), hoehe: 1800 });
  await h.sichtbarMachen(s.page, "#train-sub-planung");

  // ── 1) Ladearchitektur ────────────────────────────────────────────────────
  const bau = await s.page.evaluate(() => ({
    abgleich: typeof bibliothekAbgleich === "function",
    fensterWeg: typeof einheitImportOpen === "undefined" && typeof einheitImportUebernehmen === "undefined",
    knopf: [...document.querySelectorAll("#train-sub-planung button")].some(b => /Einheit importieren/.test(b.textContent)),
    kopfBox: !!document.getElementById("tp-kopf")
  }));
  const sw = fs.readFileSync(path.join(h.REPO, "sw.js"), "utf8");
  const tr = fs.readFileSync(path.join(h.REPO, "trainer/index.html"), "utf8");
  const el = fs.readFileSync(path.join(h.REPO, "eltern/index.html"), "utf8");
  if (!bau.abgleich) probleme.push("bibliothekAbgleich ist nach dem Laden keine Funktion – das Modul lief nicht durch");
  if (!bau.fensterWeg) probleme.push("Das Fenster „Einheit importieren“ ist wieder im Modul (v872: entfallen)");
  if (bau.knopf) probleme.push("Der Knopf „Einheit importieren“ steht wieder im Trainingsplan (v538: entfallen)");
  if (!bau.kopfBox) probleme.push("Der Platz für den Kopf der Einheit (#tp-kopf) fehlt");
  if (!/md-einheit-import\.js/.test(sw)) probleme.push("md-einheit-import.js steht nicht im PRECACHE");
  if (!/"md-einheit-import\.js":"[A-Za-z_$][\w$]*"/.test(tr)) probleme.push("md-einheit-import.js fehlt in der MODUL_WACHE");
  /* Geladen wird das Modul nur beim Trainer. In der MODUL_WACHE steht es in BEIDEN
     Einstiegen – die Wache ist eine Nachschlagetabelle und prueft nur, was auch geladen
     wurde; liefen die beiden Tabellen auseinander, schlaege die Ladearchitektur-Pruefung an. */
  const welle2 = (tr.match(/const WELLE2=\[([\s\S]*?)\];/) || [])[1] || "";
  const alleE = (el.match(/const ALLE=\[([\s\S]*?)\];/) || [])[1] || "";
  if (!/md-einheit-import\.js/.test(welle2)) probleme.push("md-einheit-import.js fehlt in WELLE2 des Trainer-Loaders");
  if (/md-einheit-import\.js/.test(alleE)) probleme.push("md-einheit-import.js steht im Eltern-Ladeplan – es ist ein Trainerwerkzeug");
  if (!/"md-einheit-import\.js":"[A-Za-z_$][\w$]*"/.test(el)) probleme.push("md-einheit-import.js fehlt in der MODUL_WACHE des Eltern-Einstiegs (beide Tabellen müssen gleich sein)");

  // ── 2) Kategorie-Regel = Spiegel von tpFilteredOpts ───────────────────────
  const spiegel = await s.page.evaluate(() => {
    const af = tpAllForms(), aus = [];
    ["warmup", "main", "tw", "individual"].forEach(typ => {
      const echt = new Set(tpFilteredOpts(typ).map(x => x.i));
      af.forEach((f, i) => { if (echt.has(i) !== _eiKatPasst(typ, f.kat)) aus.push(`${typ}/${f.kat}`); });
    });
    return [...new Set(aus)];
  });
  if (spiegel.length) probleme.push(`Kategorie-Regel weicht von tpFilteredOpts ab: ${spiegel.join(", ")}`);

  // ── 3) + 4) Gespeicherter Plan mit Kopf: lesen, anzeigen, Name vor Index ──
  const formen = await s.page.evaluate(() => {
    const af = tpAllForms();
    const iW = af.findIndex(f => f.kat === "aufwaermen");
    const iM = af.findIndex(f => !["aufwaermen", "torwart", "individual"].includes(f.kat));
    return { iW, iM, nW: af[iW].name, nM: af[iM].name };
  });
  plaene[datum] = {
    datum,
    slots: [
      { label: "Ankommen & Aufwärmen", dauer: 10, farbe: "#059669", typ: "warmup" },
      { label: "Hauptteil 1", dauer: 20, farbe: "#1a56db", typ: "main" }
    ],
    plan: [
      { formIdx: formen.iW, formName: formen.nW, trainer: "Alle", slotLabel: "Ankommen & Aufwärmen", key: `${formen.iW}-Alle` },
      // absichtlich falscher Index: gelesen werden muss über den Namen
      { formIdx: formen.iW, formName: formen.nM, trainer: "Alle", slotLabel: "Hauptteil 1", key: `${formen.iW}-Alle` }
    ],
    kopf: { schwerpunkt: "Ball nach vorne bringen, ohne den Korridor zu verlassen.", material: "12 Hütchen, 4 Minitore", beobachtung: "Wer besetzt nach Ballgewinn die Aufpasser-Position?", notiz_folge: "" },
    updated_at: new Date().toISOString()
  };
  const nach = await s.page.evaluate(async ({ datum, nM }) => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const sel = document.getElementById("tp-date");
    if (sel && ![...sel.options].some(o => o.value === datum)) sel.add(new Option(datum, datum), 0);
    if (sel) sel.value = datum;
    if (typeof go === "function") go("planung");
    if (typeof tpPlanRestore === "function") await tpPlanRestore(datum);
    // Auf die gesetzten Übungen warten statt fest 400 ms (unter Last zu knapp); höchstens 3 s
    const af = tpAllForms();
    for (let i = 0; i < 60 && ![...document.querySelectorAll(".tp-form-sel")].some(x => x.value && af[parseInt(x.value)] && af[parseInt(x.value)].name === nM); i++) await warte(50);
    return {
      slots: (typeof tpSlots !== "undefined") ? tpSlots.length : 0,
      sel: [...document.querySelectorAll(".tp-form-sel")].filter(x => x.value).map(x => af[parseInt(x.value)] && af[parseInt(x.value)].name),
      kopf: document.getElementById("tp-kopf") ? document.getElementById("tp-kopf").textContent.replace(/\s+/g, " ").trim() : ""
    };
  }, { datum, nM: formen.nM });
  if (nach.slots !== 2) probleme.push(`Die Zeitleiste zeigt ${nach.slots} Phasen statt 2`);
  if (!nach.sel.includes(formen.nM)) probleme.push(`Der Hauptteil steht nicht über den Namen in der Zeitleiste (falscher Index gewann): ${nach.sel.join(" | ")}`);
  if (!/Schwerpunkt/.test(nach.kopf)) probleme.push(`Der Kopf der Einheit erscheint nicht über der Zeitleiste: „${nach.kopf.slice(0, 60)}“`);
  const wieder = await s.page.evaluate(async () => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    go("anwesenheit"); await warte(200); go("planung"); await warte(600);
    const b = document.getElementById("tp-kopf");
    const d = b && b.querySelector("details");
    return { text: b ? b.textContent.replace(/\s+/g, " ").trim() : "", klappbar: !!d };
  });
  if (!/Schwerpunkt/.test(wieder.text)) probleme.push(`Nach einem Seitenwechsel ist der Kopf weg: „${wieder.text.slice(0, 60)}“`);
  if (!wieder.klappbar) probleme.push("Der Kopf ist keine aufklappbare Karte");

  const fehler = s.fehler(); await s.schliessen();
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Ladearchitektur: Abgleich ${bau.abgleich}, Fenster entfernt ${bau.fensterWeg}, Knopf ${bau.knopf}, Kopf-Platz ${bau.kopfBox}, PRECACHE und MODUL_WACHE gesetzt, Eltern-Loader frei`);
  zeilen.push(`Kategorie-Regel deckt sich mit tpFilteredOpts (${spiegel.length} Abweichungen)`);
  zeilen.push(`Gespeicherter Plan: ${nach.slots} Phasen, Übungen ${nach.sel.join(" | ")} (Name vor Index) · Kopf sichtbar ${/Schwerpunkt/.test(nach.kopf)}, überlebt Seitenwechsel ${/Schwerpunkt/.test(wieder.text)}, aufklappbar ${wieder.klappbar}`);
  return h.ergebnis("Einheit (v506): Modul geladen, Kategorie-Regel, Kopf der Einheit aus dem gespeicherten Plan", !probleme.length, zeilen.concat(probleme));
};
