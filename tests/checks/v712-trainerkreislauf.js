/* v712 · Trainerkreislauf: Beobachtung → Konsequenz → nächstes Training → Wirkung
   a) Trainingsplan: offene Konsequenzen aus dem Tagebuch stehen über dem Inhalt, mit
      Übungsvorschlägen aus der Bibliothek (nur bei Treffern); am selben Tag Vorgenommenes
      gilt fürs NÄCHSTE Training, abgelaufene Fristen fallen weg, „gilt dauerhaft“ bleibt
   b) „Wie war's?“: drei Antworten; „geklappt“ hakt ab (nicht bei „dauerhaft“), PATCH mit
      wirkung + wirkung_am
   c) Tagebuch-Export (Lehrgang): die Wirkung steht hinter der Konsequenz */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const D = "2026-10-05";
  const punkte = [
    { id: 1, eintrag_id: 10, datum: "2026-10-02", text: "Beim Dribbling mehr Ballkontakte mit der Sohle", bis: null, dauerhaft: false, erledigt_am: null, wirkung: null },
    { id: 2, eintrag_id: 10, datum: "2026-10-05", text: "Heute notiert – erst fürs nächste Mal", bis: null, dauerhaft: false, erledigt_am: null, wirkung: null },
    { id: 3, eintrag_id: 11, datum: "2026-09-20", text: "Frist abgelaufen", bis: "2026-09-30", dauerhaft: false, erledigt_am: null, wirkung: null },
    { id: 4, eintrag_id: 11, datum: "2026-09-20", text: "Vor jeder Übung kurz die Regel zeigen", bis: "2026-09-30", dauerhaft: true, erledigt_am: null, wirkung: null }];
  const s = await h.starten({ warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), tagebuch_punkt: (u, req) => req.method() === "PATCH" ? { status: 204, body: "" } : punkte }) });
  const r = await s.page.evaluate(async (D) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const o = {};
    const a = document.createElement("div"); a.id = "t-plan"; document.body.appendChild(a);
    const b = document.createElement("div"); b.id = "t-wirk"; document.body.appendChild(b);
    await tbFokusInto("t-plan", D, "plan");
    o.plan = a.textContent.replace(/\s+/g, " ");
    o.vorschlag = a.querySelectorAll('button[onclick^="tpShowExercise("]').length;
    await tbFokusInto("t-wirk", D, "wirkung");
    o.knoepfe = b.querySelectorAll('button[onclick^="tbWirkungSetzen("]').length;
    const alt = window.fetch; const patches = [];
    window.fetch = (url, opt) => { if (opt && opt.method === "PATCH") { patches.push({ url, body: JSON.parse(opt.body) }); return Promise.resolve(new Response("", { status: 204 })); } return alt(url, opt); };
    window.tbAutor = async () => "Trainer A";
    await tbWirkungSetzen(1, "geklappt", D, "t-wirk"); await tbWirkungSetzen(4, "geklappt", D, "t-wirk"); await w(100);
    window.fetch = alt;
    o.patches = patches;
    _TB_PUNKTE = [Object.assign({}, { id: 1, eintrag_id: 10, art: "konsequenz", text: "Beim Dribbling mehr Ballkontakte mit der Sohle", wirkung: "teilweise", wirkung_am: D })];
    o.md = tbMarkdown({ id: 10, datum: "2026-10-02", baustein: "", ausloeser: "x", beobachtung: "y", aha: "z" }, "lehrgang");
    return o;
  }, D);
  const f = s.fehler(); await s.schliessen();
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  if (!/Ballkontakte/.test(r.plan) || !/Regel zeigen/.test(r.plan)) probleme.push("a) Offene/dauerhafte Konsequenz fehlt im Plan: " + r.plan.slice(0, 160));
  if (/Heute notiert/.test(r.plan)) probleme.push("a) am selben Tag Vorgenommenes steht schon im Plan");
  if (/Frist abgelaufen/.test(r.plan)) probleme.push("a) abgelaufene Konsequenz steht im Plan");
  if (r.knoepfe !== 6) probleme.push(`b) ${r.knoepfe} Wirkungs-Knöpfe statt 6 (2 Punkte × 3)`);
  const p1 = (r.patches.find(p => /id=eq\.1\b/.test(p.url)) || {}).body || {}, p4 = (r.patches.find(p => /id=eq\.4\b/.test(p.url)) || {}).body || {};
  if (p1.wirkung !== "geklappt" || p1.wirkung_am !== D || p1.erledigt_am !== D) probleme.push("b) „geklappt“ hakt nicht ab: " + JSON.stringify(p1));
  if (p4.wirkung !== "geklappt" || p4.erledigt_am) probleme.push("b) „dauerhaft“ wird abgehakt: " + JSON.stringify(p4));
  if (!/Wirkung am 05\.10\.2026: teilweise/.test(r.md)) probleme.push("c) Export ohne Wirkung: " + (r.md.match(/Konsequenz:[^\n]*/) || [""])[0]);
  zeilen.push(`a) ${r.vorschlag} Übungsvorschläge · b) ${r.knoepfe} Knöpfe, PATCH ${JSON.stringify(p1)} · c) ${(r.md.match(/Konsequenz:[^\n]*/) || [""])[0]}`);
  return h.ergebnis("v712 Trainerkreislauf: Konsequenz im Plan, Wirkung nach dem Training, im Export", !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
