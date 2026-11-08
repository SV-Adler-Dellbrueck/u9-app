/* v817 · Tagebuch Paket 3, Feinschliff (Charles 08.11.2026: „Bau alle weiteren Stufen und merge“).
   a) Einführung einmal je Gerät: drei Sätze zur neuen Liste, „Verstanden“ blendet sie aus, nach Neuzeichnen bleibt sie weg
   b) Leere Zustände mit passender Aktion: „Offen“ ohne Punkte → „Nichts offen.“ + „Notieren“; Suche ohne Treffer → „Alles zeigen“ setzt Suche und Filter zurück
   c) Farben über Variablen: Etiketten „Gedanke“/„Zu prüfen“ ohne feste Farbwerte, im dunklen Modus Kontrast ≥ 4.5:1 */
"use strict";
module.exports = async function (h) {
  const probleme = [];
  const E = [{ id: 3, autor: "Charles", datum: h.tagePlus(0), status: "keim", ki_vorschlag: false, beobachtung: "Ein Gedanke zur Pause.", schlagworte: [] },
             { id: 4, autor: "Charles", datum: h.tagePlus(-1), status: "keim", ki_vorschlag: true, bestaetigt_am: null, beobachtung: "Vorschlag", schlagworte: [] }];
  const s = await h.starten({ warten: 3500, hoehe: 1400, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [], profiles: [{ name: "Charles", rolle: "trainer" }],
    tagebuch_eintrag: E, tagebuch_punkt: [], tagebuch_kind: [], nachbereitung_verzicht: [] }) });
  const ev = fn => s.page.evaluate(fn);
  await ev(() => { document.getElementById("pin-gate")?.remove(); window.sbToken = () => "t"; window.trainerMe = async () => "Charles"; try { localStorage.removeItem("adler_tb_neu_v817"); } catch (e) {} });
  await h.sichtbarMachen(s.page, "#train-sub-tagebuch");
  const r = await ev(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    await tagebuchListe(); await w(100);
    const out = { neu: !!document.getElementById("tb-neu"), neuText: (document.getElementById("tb-neu") || {}).textContent || "" };
    document.querySelector("#tb-neu button").click(); await w(30); tbListeRender(); await w(30);
    out.neuWeg = !document.getElementById("tb-neu");
    tbSicht("wiedervorlage"); await w(30);
    const box = document.getElementById("tb-liste");
    out.offen = box.textContent.replace(/\s+/g, " "); out.offenKnopf = [...box.querySelectorAll("button")].some(b => /Notieren/.test(b.textContent));
    tbSicht("eintraege"); await w(30);
    tbSuchen("gibtesnicht"); await w(30);
    const alles = [...document.querySelectorAll("#tb-treffer button")].find(b => /Alles zeigen/.test(b.textContent));
    out.leerKnopf = !!alles; alles && alles.click(); await w(50);
    out.nachAlles = document.querySelectorAll("#tb-liste .tb-zeile").length;
    // c) Kontrast der Etiketten im dunklen Modus
    const farbe = el => getComputedStyle(el).color, grund = el => getComputedStyle(el).backgroundColor;
    const etik = [...document.querySelectorAll("#tb-liste .tb-zeile span")].filter(x => /^(Gedanke|Zu prüfen)$/.test(x.textContent));
    out.styles = etik.map(x => x.getAttribute("style"));
    document.documentElement.setAttribute("data-theme", "dark"); document.body.classList.add("dark"); await w(50);
    const lum = c => { const m = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
    out.kontrast = etik.map(x => { const a = lum(farbe(x)), b = lum(grund(x)); return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100; });
    return out;
  });
  const fe = s.fehler(); await s.schliessen();
  if (!r.neu || !/Notieren/.test(r.neuText) || !/Offen/.test(r.neuText) || !r.neuWeg) probleme.push("a) Einführung: " + JSON.stringify({ neu: r.neu, weg: r.neuWeg }));
  if (!/Nichts offen\./.test(r.offen) || !r.offenKnopf) probleme.push("b) Offen leer: " + r.offen.slice(0, 160));
  if (!r.leerKnopf || r.nachAlles !== 2) probleme.push("b) Alles zeigen: " + JSON.stringify({ knopf: r.leerKnopf, karten: r.nachAlles }));
  if (r.styles.length !== 2 || r.styles.some(x => /#[0-9a-f]{3,6}/i.test(x))) probleme.push("c) feste Farben: " + JSON.stringify(r.styles));
  if (r.kontrast.some(k => k < 4.5)) probleme.push("c) Kontrast dunkel: " + r.kontrast.join(", "));
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v817 Tagebuch-Feinschliff: Einführung, leere Zustände, Farben", !probleme.length, probleme.length ? probleme : ["Einführung einmal, Verstanden blendet aus · Nichts offen + Notieren · Alles zeigen · Etiketten über Variablen, dunkel " + r.kontrast.join(" / ") + ":1"]);
};
