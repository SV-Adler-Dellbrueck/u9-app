/* v916/v917: Die Auftragsdateien (doku/auftrag-*) bleiben der Maßstab für die Bibliothek. Seit v916 sind Feld
   („25 × 20 m“) und Spielerzahl („6–10“) einheitlich geschrieben, seit v917 steht der ursprüngliche lange Ablauf
   in ablauf_lang und in ablauf die kurze Fassung. Für den Vergleich mit dem Auftrag werden beide Seiten auf dieselbe
   Form gebracht: Schreibweise wie v916, ablauf = die lange Fassung, falls es eine gibt. */
"use strict";
const feld = s => String(s).replace(/(\d+(?:,\d+)?)\s*[x×]\s*(\d+(?:,\d+)?)\s*m\b/g, "$1 × $2 m").replace(/(^|[^\d,])(\d+(?:,\d+)?)m\b/g, "$1$2 m");
const sp = s => String(s).replace(/(\d)\s*-\s*(\d)/g, "$1–$2");
function bn(u) {
  if (!u || typeof u !== "object" || Array.isArray(u)) return u;
  const o = {};
  for (const k of Object.keys(u)) {
    if (k === "ablauf_lang") continue;
    let v = u[k];
    if (k === "ablauf" && u.ablauf_lang) v = u.ablauf_lang;
    if (k === "feld" && typeof v === "string") v = feld(v);
    if (k === "spieler" && typeof v === "string") v = sp(v);
    o[k] = v;
  }
  return o;
}
module.exports = { bn };
