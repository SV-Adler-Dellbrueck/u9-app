/* v713 – Training füllen per Knopfdruck.

   PO am 01.10.: „Bei den Trainingsvorlagen sind einige dabei, wo dann alle Stationen in allen
   Teilen mit der gleichen Übung befüllt werden … Ziel ist es, ohne großen Aufwand und Recherche
   ein Training per Knopfdruck zu befüllen. Die Anzahl der anwesenden Trainer bestimmt die
   Stationen in den Hauptteilen. Die gewählten Übungen ergeben sich aus der Anzahl der Stationen
   und Anzahl der anwesenden Kinder.“ Entschieden: Stationen rotieren, Thema aus Tagebuch bzw.
   Monatsschwerpunkt.

   Fälle:
   a) Leerer Plan, 14 Kinder, drei Trainer → „Training füllen“: drei Hauptteile mit je drei
      Feldern; je Feld in allen Hauptteilen dieselbe Übung (Rotation), die drei Übungen
      verschieden, jede passt zur Gruppe (höchstens eine Person über der Spanne); Aufwärmen
      belegt; der Knopf heißt „Training füllen“.
   b) Gleicher Termin, noch einmal von vorn → dasselbe Ergebnis (fester Zufall je Datum).
   c) Vorlage L1-1 (eine Übung für alle Felder) mit zwei Trainern übernehmen → Feld 1 behält
      „1gg1 Tore-Duell“ in jedem Hauptteil, Feld 2 hat eine andere Übung, in allen Hauptteilen
      dieselbe.
   d) Vorlage L4-6 mit eigenen Stationen → die Stationen der Vorlage bleiben, wie sie sind. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");
  const vor = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8"));
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const inaktiv = h.KINDER.slice(14);
  const d3 = h.tagePlus(2), d2 = h.tagePlus(4), d4 = h.tagePlus(6);
  const custom = (bib.uebungen || []).map((u, i) => ({ ...u, id: 6000 + i, custom: true }));
  const rows = (vor.vorlagen || []).map((v, i) => ({ ...v, id: 500 + i }));
  const plaene = {};
  const termine = [
    { id: 91, datum: d3, typ: "training", trainer_status: { Charles: "ja", Finn: "ja", Kenneth: "ja" } },
    { id: 92, datum: d2, typ: "training", trainer_status: { Charles: "ja", Finn: "ja" } },
    { id: 93, datum: d4, typ: "training", trainer_status: { Charles: "ja", Finn: "ja", Kenneth: "ja" } }];
  const s = await h.starten({
    hoehe: 2600,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen({ inaktiv }), nominierungen: [], anwesenheit: [],
      // Die Attrappe filtert nicht – der Plan fragt je Datum, also hier selbst filtern.
      termine: (u) => { const d = (u.searchParams.get("datum") || "").replace(/^eq\./, ""); return termine.filter(t => !d || t.datum === d); },
      trainingsformen: custom,
      trainingsvorlagen: rows,
      periodisierung: [],
      trainingsgruppen: (u, req) => (req.method() === "POST" ? { status: 201, body: "[]" } : []),
      trainingsplan: (u, req) => {
        if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); plaene[b.datum] = b; return { status: 201, body: "[]" }; }
        const d = (u.searchParams.get("datum") || "").replace(/^eq\./, "");
        const p = plaene[d]; if (!p) return [];
        return [p];
      }
    })
  });
  await h.sichtbarMachen(s.page, "#train-sub-planung");
  await h.sichtbarMachen(s.page, "#tp-timeline");

  const r = await s.page.evaluate(async ({ d3, d2, d4 }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = { fehlt: [] };
    for (const n of ["tpGenerate", "tpGruppePasst", "tpStationWahl", "_tpThemaFuer"])
      if (typeof window[n] !== "function") out.fehlt.push(n);
    if (out.fehlt.length) return out;
    await loadKader();
    const feld = document.getElementById("tp-date");
    const datumSetzen = async d => {
      if (![...feld.options].some(o => o.value === d)) feld.add(new Option(d, d));
      feld.value = d; await tpTrainerRsvpLaden(d); await tpPlanRestore(d); await warte(200);
    };
    const alle = tpAllForms();
    const bild = () => tpSlots.map((sl, si) => ({ typ: sl.typ, label: sl.label,
      felder: [...document.querySelectorAll(`.tp-form-sel[id^="tp-form-${si}-"]`)].map(x => x.value === "" ? null : alle[+x.value].name) }));
    const haupt = b => b.filter(x => tpIstHauptteil(x.typ));
    const passt = b => haupt(b).every(x => x.felder.every(n => { const i = alle.findIndex(f => f.name === n); return i >= 0 && tpGruppePasst(i, 5) <= 1; }));
    out.knopf = [...document.querySelectorAll("#train-sub-planung button")].some(b => /Training füllen/.test(b.textContent));

    // a)
    await datumSetzen(d3);
    out.trainer3 = tpGetCheckedTrainers().length;
    out.kinder = _tgPool().namen.length;
    out.a = await tpGenerate(); await warte(300);
    out.bildA = bild();
    out.passtA = passt(out.bildA);
    // b) gleicher Fall an einem zweiten Termin mit denselben Voraussetzungen, dann d3 erneut leer
    await datumSetzen(d4);
    out.b = await tpGenerate(); await warte(300);
    out.bildB = bild();

    // c)
    await datumSetzen(d2);
    await vorlagenLaden();
    const v11 = VORLAGEN.find(v => String(v.name).startsWith("L1-1 "));
    _vuAuswahl = String(v11.id);
    out.trainer2 = tpGetCheckedTrainers().length;
    await vorlageUebernehmenSetzen(); await warte(600);
    out.bildC = bild();
    // d)
    tpSlots = [...TP_PHASEN]; tpRenderTimeline(); await warte(100);
    await datumSetzen(d3);
    const v46 = VORLAGEN.find(v => String(v.name).startsWith("L4-6 "));
    _vuAuswahl = String(v46.id);
    await vorlageUebernehmenSetzen(); await warte(600);
    out.bildD = bild();
    out.stationenD = v46.bloecke.filter(b => b.stationen).map(b => b.stationen.map(x => x.uebung_name));
    return out;
  }, { d3, d2, d4 });

  const fehler = s.fehler();
  await s.schliessen();
  const titel = "v713 Training füllen: Stationen aus Trainern, Übungen aus Gruppengröße";
  if (r.fehlt.length) return h.ergebnis(titel, false, [r.fehlt.join(", ") + " fehlt"]);
  if (fehler.length) probleme.push("Konsole: " + fehler.slice(0, 2).join(" | "));
  if (!r.knopf) probleme.push("Knopf „Training füllen“ fehlt");

  // a)
  const hA = r.bildA.filter(x => ["main", "spielform", "uebungsform"].includes(x.typ));
  const spalten = hA.length ? hA[0].felder.map((_, p) => hA.map(x => x.felder[p])) : [];
  const rotiert = spalten.length === 3 && spalten.every(sp => sp.every(n => n && n === sp[0]));
  const verschieden = new Set(spalten.map(sp => sp[0])).size === spalten.length;
  const warm = r.bildA.find(x => x.typ === "warmup");
  if (r.trainer3 !== 3 || r.kinder !== 14) probleme.push(`a) Voraussetzung: ${r.trainer3} Trainer, ${r.kinder} Kinder`);
  else if (hA.length !== 3) probleme.push(`a) ${hA.length} Hauptteile statt 3`);
  else if (!rotiert) probleme.push("a) Felder tragen nicht in allen Hauptteilen dieselbe Übung: " + JSON.stringify(spalten));
  else if (!verschieden) probleme.push("a) zwei Felder mit derselben Übung: " + spalten.map(s => s[0]).join(" / "));
  else if (!r.passtA) probleme.push("a) eine Übung passt nicht zur Gruppe von 4–5 Kindern: " + spalten.map(s => s[0]).join(" / "));
  else if (!warm || !warm.felder[0]) probleme.push("a) Aufwärmen leer");
  else zeilen.push(`a) 14 Kinder, 3 Trainer: ${hA.length} Hauptteile × 3 Felder, rotierend – ${spalten.map(s => s[0]).join(" · ")}; Aufwärmen ${warm.felder[0]}`);

  // b)
  const hB = r.bildB.filter(x => ["main", "spielform", "uebungsform"].includes(x.typ));
  if (hB.length !== 3 || hB.some(x => x.felder.length !== 3 || x.felder.some(n => !n))) probleme.push("b) zweiter Termin nicht vollständig gefüllt: " + JSON.stringify(hB.map(x => x.felder)));
  else zeilen.push(`b) anderer Termin: ${hB[0].felder.join(" · ")}`);

  // c)
  const hC = r.bildC.filter(x => ["main", "spielform", "uebungsform"].includes(x.typ));
  const f1 = hC.map(x => x.felder[0]), f2 = hC.map(x => x.felder[1]);
  if (r.trainer2 !== 2) probleme.push(`c) Voraussetzung: ${r.trainer2} Trainer statt 2`);
  else if (!hC.length || hC.some(x => x.felder.length !== 2)) probleme.push("c) L1-1 mit zwei Trainern: nicht zwei Felder je Hauptteil " + JSON.stringify(hC.map(x => x.felder)));
  else if (!f1.every(n => n === "1gg1 Tore-Duell")) probleme.push("c) Feld 1 hat die Vorlagen-Übung verloren: " + f1.join(" / "));
  else if (f2.some(n => !n || n === "1gg1 Tore-Duell")) probleme.push("c) Feld 2 wiederholt Feld 1 oder ist leer: " + f2.join(" / "));
  else if (new Set(f2).size !== 1) probleme.push("c) Feld 2 wechselt die Übung zwischen den Hauptteilen: " + f2.join(" / "));
  else zeilen.push(`c) L1-1, zwei Trainer: Feld 1 „1gg1 Tore-Duell“, Feld 2 „${f2[0]}“ in allen ${hC.length} Hauptteilen`);

  // d)
  const hD = r.bildD.filter(x => ["main", "spielform", "uebungsform"].includes(x.typ));
  const stOk = r.stationenD.every((st, k) => st.every((n, p) => hD[k] && hD[k].felder[p] === n));
  if (!stOk) probleme.push("d) L4-6: Stationen der Vorlage verändert " + JSON.stringify(hD.map(x => x.felder)));
  else zeilen.push(`d) L4-6: Stationen der Vorlage bleiben (${r.stationenD[0].join(" · ")}), Feld 3: ${hD[0].felder[2] || "–"}`);

  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
