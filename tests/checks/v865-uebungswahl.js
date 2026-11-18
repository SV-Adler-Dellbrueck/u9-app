/* v865 · Übungswahl (Bestandsaufnahme 1.7, Charles 18.11.: „Fokus zuerst, dazu Dauer und Betreuung“).
   a) Der Tagesfokus „Verbesserung von“ wird zur Kategorie (Torabschluss → technik, Umschalten → pressing).
   b) „Training füllen“ gibt der Übungswahl den Fokus als erstes Thema mit.
   c) Ist der Block 10 Minuten lang, kommt keine Übung, deren Richtwert erst bei 20 Minuten beginnt (solange es passende gibt).
   d) An einem Feld ohne Trainer kommt eine Übung, die allein läuft (solange es passende gibt). */
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
    if (typeof tpFokusKats !== "function") return { alt: true };
    await loadKader();
    const feld = document.getElementById("tp-date");
    if (![...feld.options].some(o => o.value === d1)) feld.add(new Option(d1, d1));
    feld.value = d1; await tpTrainerRsvpLaden(d1); await tpPlanRestore(d1); await warte(200);
    const out = {};
    _tpFokus = { keys: ["abschluss", "umschalten"], text: "", datum: d1, offen: false };
    out.a = tpFokusKats(d1); out.aFremd = tpFokusKats("2000-01-01");
    // b)
    const echt = tpStationWahl; let erstes = null;
    tpStationWahl = function (g, th) { if (erstes == null) erstes = (th.kats || [])[0] || ""; return echt.apply(this, arguments); };
    tpSlots = [...TP_PHASEN]; tpRenderTimeline(); await warte(100);
    await tpGenerate(); await warte(400);
    tpStationWahl = echt; out.b = erstes;
    // c) d)
    const alle = tpAllForms(), null0 = () => 0, th = { quelle: "", kats: ["technik", "passspiel"], bevorzugt: new Set() };
    const kurz = tpStationWahl(6, th, new Set(), d1, null0, { dauer: 10, betreut: true });
    const lang = tpStationWahl(6, th, new Set(), d1, null0, { dauer: 30, betreut: true });
    out.c = { kurz: kurz && { n: alle[kurz.i].name, d: tpDauerMin(alle[kurz.i]) }, lang: lang && alle[lang.i].name,
      gibtKurze: tpFilteredOpts("main").some(x => x.f && tpDauerMin(x.f) && tpDauerMin(x.f) <= 12) };
    const ohne = tpStationWahl(6, th, new Set(), d1, null0, { dauer: 12, betreut: false });
    const bw = ohne && tpBetreuungWert(alle[ohne.i]);
    out.d = { n: ohne && alle[ohne.i].name, betreuung: bw ? bw.wert : "unbekannt",
      gibtAllein: tpFilteredOpts("main").some(x => x.f && (tpBetreuungWert(x.f) || {}).wert === "allein") };
    return out;
  }, { d3, d2, d1 }).catch(err => ({ fehler: String(err) }));
  const fe = s.fehler(); await s.schliessen();
  const titel = "v865 Übungswahl: Fokus zuerst, Blockdauer und Betreuung zählen mit";
  if (r.alt) return h.ergebnis(titel, false, ["tpFokusKats fehlt (Stand vor v865)"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  if (String(r.a) !== "technik,pressing" || r.aFremd.length) probleme.push("a) " + JSON.stringify({ a: r.a, fremd: r.aFremd }));
  else zeilen.push("a) Fokus Torabschluss + Umschalten → technik, pressing (nur am eigenen Tag)");
  if (r.b !== "technik") probleme.push("b) erstes Thema bei „Training füllen“: " + r.b); else zeilen.push("b) „Training füllen“ sucht zuerst im Fokus (technik)");
  if (!r.c.kurz || (r.c.gibtKurze && r.c.kurz.d > 12)) probleme.push("c) 10-Minuten-Block: " + JSON.stringify(r.c));
  else zeilen.push(`c) 10-Minuten-Block: „${r.c.kurz.n}“ (Richtwert ab ${r.c.kurz.d || "?"} Min)`);
  if (!r.d.n || (r.d.gibtAllein && r.d.betreuung !== "allein" && r.d.betreuung !== "unbekannt")) probleme.push("d) Feld ohne Trainer: " + JSON.stringify(r.d));
  else zeilen.push(`d) Feld ohne Trainer: „${r.d.n}“ (${r.d.betreuung})`);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
