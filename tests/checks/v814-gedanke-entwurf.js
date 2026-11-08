/* v814 · Gedanke geht nicht mehr verloren (Charles 08.11.2026: drei Gedanken kamen nie beim Server an – kein Speicherversuch in den Protokollen).
   a) Tippen merkt den Text auf dem Gerät; ein Tipp neben das Fenster schließt es nicht, solange Text drinsteht
   b) Schließen über × und erneut öffnen: der Text ist wieder da, mit Hinweis und „Verwerfen“
   c) „Verwerfen“ leert Feld und Entwurf
   d) „Gedanke erfassen“ speichert (POST) und löscht erst dann den Entwurf; scheitert das Speichern, bleibt er
   e) leeres Fenster schließt der Tipp daneben wie bisher */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  let fehlschlag = true; const posts = [];
  const s = await h.starten({ warten: 800, hoehe: 1200, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), termine: [], profiles: [{ name: "Charles", rolle: "trainer" }], tagebuch_punkt: [],
    tagebuch_eintrag: (u, req) => {
      if (req.method() === "POST") { if (fehlschlag) return { status: 500, body: "{}" }; posts.push(req.postData()); return { status: 201, body: "" }; }
      return [];
    } }) });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    document.getElementById("pin-gate")?.remove();
    if (typeof tagebuchGedanke !== "function" || typeof tbGedankeEntwurf !== "function") return { fehlt: true };
    window.trainerMe = async () => "Charles";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    try { localStorage.removeItem("adler_tb_gedanke_entwurf"); } catch (e) {}
    const out = {};
    const tippe = t => { const ta = document.getElementById("tb-gedanke-text"); ta.value = t; ta.dispatchEvent(new Event("input")); };
    tagebuchGedanke(); await w(40);
    tippe("Nachtrag zum Eintrag: Pausen sind Lernzeit.");
    out.a = { gemerkt: tbGedankeEntwurf() };
    document.getElementById("tb-gedanke").click(); await w(20);
    out.a.offen = !!document.getElementById("tb-gedanke");
    document.querySelector('#tb-gedanke button[aria-label="Schließen"]').click(); await w(20);
    tagebuchGedanke(); await w(40);
    out.b = { text: document.getElementById("tb-gedanke-text").value, hinweis: document.getElementById("tb-gedanke-meldung").textContent };
    tbGedankeVerwerfen();
    out.c = { text: document.getElementById("tb-gedanke-text").value, entwurf: tbGedankeEntwurf() };
    tippe("Zweiter Gedanke für den Server.");
    await tagebuchGedankeSpeichern(); await w(50);
    out.d = { offenNachFehler: !!document.getElementById("tb-gedanke"), entwurfNachFehler: tbGedankeEntwurf() };
    return out;
  });
  if (!r.fehlt) {
    fehlschlag = false;
    r.d2 = await s.page.evaluate(async () => {
      const w = ms => new Promise(x => setTimeout(x, ms));
      await tagebuchGedankeSpeichern(); await w(80);
      const o = { zu: !document.getElementById("tb-gedanke"), entwurf: tbGedankeEntwurf() };
      tagebuchGedanke(); await w(40);
      document.getElementById("tb-gedanke").click(); await w(20);
      o.leerZu = !document.getElementById("tb-gedanke");
      return o;
    });
  }
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) probleme.push("Funktionen fehlen");
  else {
    if (!/Pausen sind Lernzeit/.test(r.a.gemerkt) || !r.a.offen) probleme.push("a) " + JSON.stringify(r.a));
    if (!/Pausen sind Lernzeit/.test(r.b.text) || !/von vorhin ist wieder da/.test(r.b.hinweis) || !/Verwerfen/.test(r.b.hinweis)) probleme.push("b) " + JSON.stringify(r.b));
    if (r.c.text !== "" || r.c.entwurf !== "") probleme.push("c) " + JSON.stringify(r.c));
    if (!r.d.offenNachFehler || !/Zweiter Gedanke/.test(r.d.entwurfNachFehler)) probleme.push("d) bei Fehler: " + JSON.stringify(r.d));
    if (!r.d2.zu || r.d2.entwurf !== "" || posts.length !== 1 || !/Zweiter Gedanke/.test(posts[0] || "")) probleme.push("d) gespeichert: " + JSON.stringify(r.d2) + " · " + posts.length);
    if (!r.d2.leerZu) probleme.push("e) leeres Fenster schließt nicht");
  }
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push("a) Entwurf gemerkt, Tipp daneben schließt nicht · b) nach × wieder da mit Hinweis · c) Verwerfen leert");
  zeilen.push("d) bei Fehler bleibt der Entwurf, nach dem Speichern ist er weg · e) leeres Fenster schließt wie bisher");
  return h.ergebnis("v814 Gedanke: Entwurf auf dem Gerät, kein Verlust durch Tipp daneben", !probleme.length, probleme.length ? probleme : zeilen);
};
