/* v805 · Leitfaden vor dem Einsprechen der Nachbereitung (Charles 08.11.2026).
   a) Vollansicht „Sprachnotiz“: aufgeklappte Karte mit vier Punkten, je Training und Spieltag eigene, dazu der Satz mit den zwei Minuten
   b) die Karte schiebt das Textfeld nicht weg: Textfeld bleibt am Handy (390 × 700) mindestens 150 px hoch, Kopfzeile der Karte ≥ 44 px
   c) steht schon Text da (Weiter aufnehmen), ist die Karte zugeklappt
   d) Vorgabe bleibt wie sie war: Termine nur mit eigener Zusage (Karte „Wie war's?“) und eigene Übungen im Bogen (Quelltext-Prüfung der beiden Filter) */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ hoehe: 700, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [] }) });
  await h.sichtbarMachen(s.page, "#train-sub-spieltag");
  const r = await s.page.evaluate(async () => {
    const out = {};
    if (typeof nbGross !== "function") return { fehlt: true };
    const messen = art => {
      nbGross(art, false);
      const d = document.getElementById("nb-leitfaden"), ta = document.getElementById("nb-gross-text");
      const o = { offen: d.open, punkte: [...d.querySelectorAll("li")].map(x => x.textContent), text: d.textContent, kopf: d.querySelector("summary").getBoundingClientRect().height, feld: ta.getBoundingClientRect().height, quer: document.documentElement.scrollWidth > innerWidth };
      return o;
    };
    _nbText = "";
    out.training = messen("training"); out.spiel = messen("spiel");
    _nbText = "schon etwas gesagt";
    nbGross("training", false);
    out.zu = !document.getElementById("nb-leitfaden").open;
    document.getElementById("nb-gross-ov")?.remove();
    return out;
  });
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) probleme.push("nbGross fehlt");
  else {
    for (const art of ["training", "spiel"]) {
      const x = r[art];
      if (!x.offen || x.punkte.length !== 4 || !/Zwei Minuten reichen/.test(x.text) || !/nichts Besonderes/.test(x.text)) probleme.push(`a) ${art}: ` + JSON.stringify({ o: x.offen, n: x.punkte.length }));
      if (x.kopf < 44 || x.feld < 150 || x.quer) probleme.push(`b) ${art}: Kopf ${x.kopf} px, Textfeld ${x.feld} px, Quer-Scroll ${x.quer}`);
    }
    if (r.training.punkte.join() === r.spiel.punkte.join() || !/Übungen/.test(r.training.punkte[1]) || /Übungen/.test(r.spiel.punkte.join())) probleme.push("a) Training und Spieltag haben nicht ihre eigenen Punkte");
    if (!r.zu) probleme.push("c) Karte bleibt offen, obwohl schon Text da ist");
  }
  zeilen.push("Leitfaden: vier Punkte je Training und Spieltag, aufgeklappt bei leerem Feld, zu bei vorhandenem Text, Textfeld bleibt ≥ 150 px hoch am Handy");
  const v = fs.readFileSync(path.join(h.REPO, "md-tagebuch.js"), "utf8"), w = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  if (!/\(t\.trainer_status\|\|\{\}\)\[ich\]==="ja"/.test(v)) probleme.push("d) „Wie war's?“ filtert nicht mehr auf die eigene Zusage");
  if (!/p\.trainer===me/.test(w)) probleme.push("d) Bogen filtert nicht mehr auf die eigenen Übungen");
  zeilen.push("Unverändert: Karte „Wie war's?“ nur bei eigener Zusage, Bogen nur mit eigenen Übungen und „Alle“");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v805 Leitfaden vor der Nachbereitung", !probleme.length, probleme.length ? probleme : zeilen);
};
