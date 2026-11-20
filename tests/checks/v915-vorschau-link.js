/* v915 · WhatsApp merkt sich die Vorschau je Adresse (Charles 20.11., Bild: altes Vorschaubild trotz v911).
   a) Jeder Spielplan-Link aus _htUrl trägt „&v=<Stand>“, der Stand passt zum Dateinamen og-vorschau-<Stand>.jpg
      in index.html und eltern/index.html.
   b) Die öffentliche Seite nimmt den Link mit Zusatz an: der Slug bleibt derselbe (params.get("turnier")). */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v915 Spielplan-Link trägt den Stand des Vorschaubildes";
  const probleme = [], zeilen = [];
  const lies = f => fs.readFileSync(path.join(h.REPO, f), "utf8");
  const tp = lies("md-turnierplan.js"), idx = lies("index.html"), el = lies("eltern/index.html");
  const stand = (/const HT_VORSCHAU="(\d+)"/.exec(tp) || [])[1];
  if (!stand) probleme.push("a) HT_VORSCHAU fehlt");
  else {
    if (!/function _htUrl\(slug\)\{[^}]*"&v="\+HT_VORSCHAU/.test(tp)) probleme.push("a) _htUrl hängt den Stand nicht an");
    [["index.html", idx], ["eltern/index.html", el]].forEach(([n, t]) => { if (!t.includes(`og-vorschau-${stand}.jpg`)) probleme.push(`a) ${n}: Bild passt nicht zu Stand ${stand}`); });
    zeilen.push(`a) Stand ${stand}, Bild og-vorschau-${stand}.jpg in beiden Einstiegen`);
  }
  const u = new URL("https://x.test/u9-app/?turnier=kinderfestival-21-11&v=" + (stand || "2"));
  if (u.searchParams.get("turnier") !== "kinderfestival-21-11") probleme.push("b) Slug ändert sich durch den Zusatz");
  else zeilen.push("b) Slug unverändert mit Zusatz");
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
