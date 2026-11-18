/* v868 · Zeitpuffer und Ziel-Dauer im Trainingsplan (Bestandsaufnahme 5.11).
   a) Die freien Minuten heißen Puffer für Trinken und Umbau (3–8 Min.), darunter warnt die Zeile, ab 9 sind sie frei.
   b) Die Ziel-Dauer folgt dem Termin: 16:45–18:15 → 90 Minuten (vorher immer 75).
   c) Ein 70-Minuten-Plan an einem 90-Minuten-Termin sagt „noch 20 Min. frei“. */
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
    { id: 93, datum: d1, typ: "training", uhrzeit: "16:45:00", uhrzeit_ende: "18:15:00", trainer_status: { Charles: "ja" } }];
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
    if (typeof tpPufferText !== "function") return { alt: true };
    await loadKader();
    const txt = n => tpPufferText(n).replace(/<[^>]+>/g, "");
    const out = { a: [txt(5), txt(1), txt(0), txt(12)], min: tpTerminMinuten({ uhrzeit: "16:45:00", uhrzeit_ende: "18:15:00" }) };
    const feld = document.getElementById("tp-date");
    if (![...feld.options].some(o => o.value === d1)) feld.add(new Option(d1, d1));
    feld.value = d1; await tpTrainerRsvpLaden(d1); await tpPlanRestore(d1); await warte(200);
    tpSlots = [...TP_PHASEN]; tpRenderTimeline(); await warte(100);
    await tpGenerate(); await warte(400);
    const sel = document.getElementById("tp-dauer");
    out.b = sel ? sel.value : null;
    out.c = sel ? sel.parentElement.textContent.replace(/\s+/g, " ").trim().slice(-80) : "";
    return out;
  }, { d3, d2, d1 }).catch(err => ({ fehler: String(err) }));
  const fe = s.fehler(); await s.schliessen();
  const titel = "v868 Trainingsplan: Puffer für Trinken und Umbau, Ziel-Dauer aus dem Termin";
  if (r.alt) return h.ergebnis(titel, false, ["tpPufferText fehlt (Stand vor v868)"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  const [p5, p1, p0, p12] = r.a;
  if (!/5 Min\. Puffer für Trinken und Umbau/.test(p5) || !/nur 1 Min\. Puffer/.test(p1) || !/kein Puffer/.test(p0) || !/noch 12 Min\. frei/.test(p12)) probleme.push("a) " + JSON.stringify(r.a));
  else zeilen.push("a) 5 → Puffer · 1 → nur 1 Min. · 0 → kein Puffer · 12 → frei");
  if (r.min !== 90 || r.b !== "90") probleme.push("b) Termin-Minuten " + r.min + ", Auswahl " + r.b); else zeilen.push("b) Termin 16:45–18:15 → Ziel-Dauer 90");
  if (!/noch 20 Min\. frei/.test(r.c)) probleme.push("c) " + r.c); else zeilen.push("c) " + r.c);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
