/* v815 · Tagebuch-Einträge zeigen ihre Nummer (Charles 08.11.2026: „Wo und wie seh ich die Nummerierungen?“) – dieselbe wie im
   Export („Eintrag-Nr.“): in der Liste vor dem Datum, im geöffneten Eintrag und auf der Prüfkarte. Ein neuer Eintrag hat noch keine. */
"use strict";
module.exports = async function (h) {
  const probleme = [];
  const e = { id: 16, autor: "Charles", datum: "2026-11-06", quelle: "frei", anlass: "lehrgang", status: "fertig", ki_vorschlag: false, bestaetigt_am: null, ausloeser: "Präsenztag", beobachtung: "b", schlagworte: [] };
  const v = { ...e, id: 21, ki_vorschlag: true, status: "keim", ausloeser: "Vorschlag" };
  const s = await h.starten({ warten: 3500, hoehe: 1400, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), termine: [], profiles: [{ name: "Charles", rolle: "trainer" }], tagebuch_kind: [], tagebuch_punkt: [], nachbereitung_verzicht: [],
    tagebuch_eintrag: (u) => { const id = (u.searchParams.get("id") || "").replace("eq.", ""); return id ? [e, v].filter(x => String(x.id) === id) : [e, v]; } }) });
  const ev = fn => s.page.evaluate(fn);
  const vor = await ev(() => { document.getElementById("pin-gate")?.remove(); window.trainerMe = async () => "Charles"; if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t"; return typeof tbNr === "function"; });
  const r = { fehlt: !vor };
  if (vor) {
    r.zeile = await ev(() => tbZeile({ id: 16, autor: "Charles", datum: "2026-11-06", status: "fertig", schlagworte: [], ausloeser: "x" }));
    r.dialog = await ev(async () => { tbOeffnen({ id: 16, datum: "2026-11-06", status: "fertig", beobachtung: "b" }); await new Promise(x => setTimeout(x, 50)); const t = (document.getElementById("tb-modal") || {}).textContent || ""; tagebuchSchliessen(); return t; });
    r.neu = await ev(async () => { tbOeffnen({ datum: "2026-11-06", quelle: "frei" }); await new Promise(x => setTimeout(x, 50)); const t = (document.getElementById("tb-modal") || {}).textContent || ""; tagebuchSchliessen(); return t; });
    r.pruef = await ev(async () => { await tbPruefenOpen(21); await new Promise(x => setTimeout(x, 100)); return (document.getElementById("tb-pruefen") || {}).textContent || ""; });
  }
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) probleme.push("tbNr fehlt");
  else {
    if (!/Nr\. 16 · \S+ 06\.11\./.test(r.zeile)) probleme.push("Liste: " + r.zeile.slice(0, 200));
    if (!/Nr\. 16 · Eintrag bearbeiten/.test(r.dialog)) probleme.push("Eintrag: " + r.dialog.slice(0, 120));
    if (/Nr\. /.test(r.neu)) probleme.push("neuer Eintrag zeigt eine Nummer");
    if (!/Nr\. 21 · /.test(r.pruef)) probleme.push("Prüfkarte: " + r.pruef.slice(0, 120));
  }
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v815 Tagebuch zeigt die Eintragsnummer", !probleme.length, probleme.length ? probleme : ["„Nr. 16 · 06.11.2026“ in der Liste, „Nr. 16 · Eintrag bearbeiten“, „Nr. 21 · …“ auf der Prüfkarte, neuer Eintrag ohne Nummer"]);
};
