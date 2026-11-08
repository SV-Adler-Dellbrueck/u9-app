/* v814 · Dauerhafte Konsequenz abhaken (Charles 08.11.2026: „wie hake ich die ab?“ – „Erledigt“ gab es nur in der Wiedervorlage,
   dort stehen nur Punkte mit Frist).
   a) Im Eintrag steht bei einer dauerhaften, offenen Konsequenz „Gilt nicht mehr – abhaken“ (≥ 44 px), bei einer mit Frist nicht
   b) Der Knopf setzt erledigt_am am Punkt; sind alle Konsequenzen erledigt, bekommt der Eintrag konsequenz_erledigt_am
   c) Danach steht „✓ erledigt am …“ und der Knopf ist weg; der Text bleibt */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [], patches = [];
  const heute = h.tagePlus(0);
  const s = await h.starten({ warten: 800, hoehe: 1600, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), termine: [], profiles: [{ name: "Charles", rolle: "trainer" }], tagebuch_kind: [],
    tagebuch_eintrag: (u, req) => { if (req.method() === "PATCH") { patches.push(["eintrag", u.search, req.postData()]); return { status: 204, body: "" }; } return []; },
    tagebuch_punkt: (u, req) => { if (req.method() === "PATCH") { patches.push(["punkt", u.search, req.postData()]); return { status: 204, body: "" }; } return []; }
  }) });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    document.getElementById("pin-gate")?.remove();
    if (typeof tbKonsGiltNicht !== "function" || typeof tbOeffnen !== "function") return { fehlt: true };
    window.trainerMe = async () => "Charles"; _TB_ICH = "Charles";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    _TB_PUNKTE = [{ id: 15, eintrag_id: 16, art: "konsequenz", text: "Grundsatz eins", bis: null, dauerhaft: true, erledigt_am: null },
                  { id: 16, eintrag_id: 16, art: "konsequenz", text: "Grundsatz zwei", bis: null, dauerhaft: true, erledigt_am: null }];
    tbOeffnen({ id: 16, datum: "2026-11-06", beobachtung: "b", kons: _TB_PUNKTE.map(p => ({ id: p.id, text: p.text, bis: "", erledigt_am: null, dauerhaft: true })) });
    await w(50);
    const knoepfe = () => [...document.querySelectorAll("#tb-modal button")].filter(b => /Gilt nicht mehr/.test(b.textContent));
    const out = { vorher: knoepfe().length, hoehe: knoepfe()[0] ? Math.round(knoepfe()[0].getBoundingClientRect().height) : 0 };
    await tbKonsGiltNicht(0); await w(50);
    out.nachEins = knoepfe().length; out.erledigtText = /✓ erledigt am/.test(document.getElementById("tb-modal").textContent);
    await tbKonsGiltNicht(1); await w(50);
    out.nachZwei = knoepfe().length;
    out.textDa = document.getElementById("tb-konsequenz").value;
    return out;
  });
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) probleme.push("Funktionen fehlen");
  else {
    if (r.vorher !== 2 || r.hoehe < 44) probleme.push("a) " + JSON.stringify(r));
    const p = patches.filter(x => x[0] === "punkt"), e = patches.filter(x => x[0] === "eintrag");
    if (p.length !== 2 || !p.every(x => x[2].includes(`"erledigt_am":"${heute}"`)) || e.length !== 1 || !e[0][2].includes("konsequenz_erledigt_am") || !/id=eq.16/.test(e[0][1]))
      probleme.push("b) " + JSON.stringify(patches));
    if (r.nachEins !== 1 || !r.erledigtText || r.nachZwei !== 0 || r.textDa !== "Grundsatz eins") probleme.push("c) " + JSON.stringify(r));
  }
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push("a) Knopf nur bei dauerhaften offenen Konsequenzen · b) erledigt_am am Punkt, am Eintrag erst wenn alle erledigt · c) ✓ erledigt, Text bleibt");
  return h.ergebnis("v814 Dauerhafte Konsequenz im Eintrag abhaken", !probleme.length, probleme.length ? probleme : zeilen);
};
