/* v864 · Planungslogik (Bestandsaufnahme 1.8, 1.11, Charles 18.11.).
   a) Ein Trainer, zwölf Kinder, leerer Plan: zwei Gruppen, zwei Felder, in jeder Stufe beide Felder dieselbe Übung.
   b) tgBedarf: ein Trainer ab zehn Kindern 2, darunter 1 (unter acht ohnehin 1); zwei Trainer bleiben bei 2 (v656).
   c) L3-1 übernehmen: der Torwart-Block läuft parallel zu Stufe 3 (letzter Hauptteil davor), nicht zu Stufe 1.
   d) Torwart-Verteilung tauscht auf gleicher Position der Stärke-Reihe. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");
  const vor = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8"));
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const inaktiv = h.KINDER.slice(12);   // zwölf aktive Kinder
  const d3 = h.tagePlus(2), d2 = h.tagePlus(4), d1 = h.tagePlus(6);
  const custom = (bib.uebungen || []).map((u, i) => ({ ...u, id: 6000 + i, custom: true }));
  const rows = (vor.vorlagen || []).map((v, i) => ({ ...v, id: 500 + i }));
  const plaene = {};
  const termine = [
    { id: 91, datum: d3, typ: "training", trainer_status: { Charles: "ja", Finn: "ja", Kenneth: "ja" } },
    { id: 92, datum: d2, typ: "training", trainer_status: { Charles: "ja", Finn: "ja" } },
    { id: 93, datum: d1, typ: "training", trainer_status: { Charles: "ja" } }];
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

  const r = await s.page.evaluate(async ({ d3, d2, d1 }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    await loadKader();
    const feld = document.getElementById("tp-date");
    const datumSetzen = async d => {
      if (![...feld.options].some(o => o.value === d)) feld.add(new Option(d, d));
      feld.value = d; await tpTrainerRsvpLaden(d); await tpPlanRestore(d); await warte(200);
    };
    const alle = tpAllForms();
    const bild = () => tpSlots.map((sl, si) => ({ typ: sl.typ, label: sl.label, dauer: Number(sl.dauer), parallelZu: sl.parallelZu,
      felder: [...document.querySelectorAll(`.tp-form-sel[id^="tp-form-${si}-"]`)].map(x => x.value === "" ? null : alle[+x.value].name) }));
    const out = {};
    // a)
    await datumSetzen(d1); tpSlots = [...TP_PHASEN]; tpRenderTimeline(); await warte(100);
    out.trainerA = tpGetCheckedTrainers().length; out.kinderA = _tgPool().namen.length;
    await tpGenerate(); await warte(500);
    out.a = bild(); const tg = tgFor(); out.gruppenA = tg && tg.gruppen ? tg.gruppen.map(g => g.kinder.length) : [];
    // b)
    const echt = tpGetCheckedTrainers;
    tpGetCheckedTrainers = () => ["T1"]; out.b1 = [tgBedarf(12), tgBedarf(10), tgBedarf(9), tgBedarf(7)];
    tpGetCheckedTrainers = () => ["T1", "T2"]; out.b2 = [tgBedarf(12), tgBedarf(14)];
    tpGetCheckedTrainers = echt;
    // c)
    await datumSetzen(d2); await vorlagenLaden();
    _vuAuswahl = String(VORLAGEN.find(v => String(v.name).startsWith("L3-1 ")).id);
    await vorlageUebernehmenSetzen(); await warte(700);
    out.c = bild();
    // d)
    const kader = KADER; const namen = h => h;
    const altK = KADER;
    KADER = [{ name: "A", tw: true }, { name: "B", tw: true }, { name: "C" }, { name: "D" }, { name: "E" }, { name: "F" }];
    const gr = tgTorwartVerteilen([{ kinder: ["C", "A", "B"] }, { kinder: ["D", "E", "F"] }]);
    KADER = altK;
    out.d = gr.map(g => g.kinder.join(""));
    return out;
  }, { d3, d2, d1 }).catch(err => ({ fehler: String(err) }));
  const fe = s.fehler(); await s.schliessen();
  const titel = "v864 Planung: ein Trainer ab 10 Kindern zwei Felder, Torwart-Block an Stufe 3, Torwart-Tausch auf gleicher Position";
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  const H = b => b.filter(x => /^Stufe /.test(x.label || ""));
  const hA = H(r.a);
  if (r.trainerA !== 1 || r.kinderA !== 12) probleme.push(`a) Voraussetzung: ${r.trainerA} Trainer, ${r.kinderA} Kinder`);
  else if (r.gruppenA.length !== 2 || hA.length !== 3 || !hA.every(x => x.felder.length === 2 && x.felder[0] && x.felder[0] === x.felder[1])) probleme.push("a) " + JSON.stringify({ gruppen: r.gruppenA, stufen: hA.map(x => x.felder) }));
  else zeilen.push(`a) ein Trainer, 12 Kinder: Gruppen ${r.gruppenA.join("/")}, beide Felder je Stufe „${hA[0].felder[0]}“`);
  if (String(r.b1) !== "2,2,1,1" || String(r.b2) !== "2,2") probleme.push("b) tgBedarf " + JSON.stringify({ einer: r.b1, zwei: r.b2 }));
  else zeilen.push("b) tgBedarf: ein Trainer 12/10/9/7 → 2/2/1/1, zwei Trainer → 2");
  const tw = r.c.find(x => x.typ === "tw"), ziel = tw && r.c[tw.parallelZu];
  if (!tw || !ziel || !/^Stufe 3/.test(ziel.label || "")) probleme.push("c) L3-1 Torwart parallel zu: " + JSON.stringify(ziel && ziel.label));
  else zeilen.push(`c) L3-1: Torwart-Block parallel zu „${ziel.label}“, ${tw.dauer} Min`);
  // Gruppe 1 hat zwei Torwart-Kinder (A auf Position 2, B auf 3): A tauscht mit dem Kind auf Position 2 der anderen Gruppe (E), nicht mit dem ersten (D).
  if (r.d[0] !== "CEB" || r.d[1] !== "DAF") probleme.push("d) Tausch: " + JSON.stringify(r.d) + " statt CEB / DAF");
  else zeilen.push("d) Torwart-Tausch auf gleicher Position: " + r.d.join(" / "));
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
