/* v815 · Abhaken lässt sich zurücknehmen (Charles 08.11.2026: vier Konsequenzen mit Frist in der Zukunft standen nach schnellem
   Abhaken in der Liste „Offen“ auf erledigt). Nach „Erledigt“ steht einige Sekunden „↶ Rückgängig“: der Punkt ist wieder offen, und
   hatte das Abhaken den Eintrag auf „alle Konsequenzen erledigt“ gesetzt, wird auch das zurückgenommen. */
"use strict";
module.exports = async function (h) {
  const probleme = [], patches = [];
  const s = await h.starten({ warten: 3500, hoehe: 1200, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), termine: [], profiles: [{ name: "Charles", rolle: "trainer" }], tagebuch_kind: [], nachbereitung_verzicht: [],
    tagebuch_eintrag: (u, req) => { if (req.method() === "PATCH") { patches.push(["eintrag", u.search, req.postData()]); return { status: 204, body: "" }; } return []; },
    tagebuch_punkt: (u, req) => { if (req.method() === "PATCH") { patches.push(["punkt", u.search, req.postData()]); return { status: 204, body: "" }; } return []; } }) });
  const ev = fn => s.page.evaluate(fn);
  const r = await ev(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    document.getElementById("pin-gate")?.remove(); window.sbToken = () => "t"; _TB_ICH = "Charles";
    if (typeof tbPunktWiederOffen !== "function") return { fehlt: true };
    _TB_PUNKTE = [{ id: 17, eintrag_id: 17, art: "konsequenz", text: "a", bis: "2026-11-30", dauerhaft: false, erledigt_am: null }];
    await tbPunktErledigt(17); await w(50);
    const knopf = [...document.querySelectorAll("#undo-toast button")].find(b => /Rückgängig/.test(b.textContent));
    const out = { knopf: !!knopf, erledigt: _TB_PUNKTE[0].erledigt_am };
    knopf && knopf.click(); await w(150);
    out.danach = _TB_PUNKTE[0].erledigt_am;
    return out;
  });
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) probleme.push("tbPunktWiederOffen fehlt");
  else {
    const p = patches.filter(x => x[0] === "punkt"), e = patches.filter(x => x[0] === "eintrag");
    if (!r.knopf || !r.erledigt || r.danach !== null) probleme.push("Ablauf: " + JSON.stringify(r));
    if (p.length !== 2 || !/"erledigt_am":null/.test(p[1][2]) || e.length !== 2 || !/"konsequenz_erledigt_am":null/.test(e[1][2])) probleme.push("Schreibvorgänge: " + JSON.stringify(patches));
  }
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v815 Abhaken lässt sich zurücknehmen", !probleme.length, probleme.length ? probleme : ["„Erledigt“ → „↶ Rückgängig“ → Punkt und Eintrag wieder offen"]);
};
