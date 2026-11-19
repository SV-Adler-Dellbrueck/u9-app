/* v870 · Skalierungszeilen für 6, 10 und 14 Kinder (Bestandsaufnahme 5.7, Charles 18.11.).
   a) 20 Konzept-Einheiten tragen Zeilen für 6, 10 und 14 Kinder (L5-2 keine für 6; L4-2, L4-5 bewusst ohne).
   b) Zehn Kinder spielen nie mehr auf einem Feld mit Wechslern, wo die Form ein 3 gegen 3 ist (v864: zwei Felder).
   c) Die Sechser-Zeilen haben kleinere Felder als die Achter-Zeilen derselben Vorlage (Maß um etwa 15 % kleiner). */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v870 Vorlagen: Zeilen für 6, 10 und 14 Kinder";
  const probleme = [], zeilen = [];
  const wurzel = process.env.REPO || path.join(__dirname, "..", "..");
  const d = JSON.parse(fs.readFileSync(path.join(wurzel, "uebungen", "vorlagen.json"), "utf8"));
  const mit = d.vorlagen.filter(v => v.skalierung && v.skalierung["14"] && Number(v.folge_nr) > 0 && /^L[1-6]-[1-4] |^L5-8 /.test(v.name));
  if (mit.length < 20) probleme.push("a) nur " + mit.length + " Vorlagen mit 14er-Zeile");
  const l52 = d.vorlagen.find(v => /^L5-2 /.test(v.name));
  if (!l52 || l52.skalierung["6"]) probleme.push("a) L5-2 hat eine 6er-Zeile");
  if (!probleme.length) zeilen.push(`a) ${mit.length} Vorlagen mit 6/10/14, L5-2 ohne 6`);
  const einFeldWechsler = mit.filter(v => /3 gegen 3/.test(v.skalierung["10"] || "") && /^1 /.test(v.skalierung["10"]) && /Wechsler|wechseln/.test(v.skalierung["10"]));
  if (einFeldWechsler.length) probleme.push("b) 10 Kinder auf einem Feld mit Wechslern: " + einFeldWechsler.map(v => v.name.slice(0, 4)).join(", "));
  else zeilen.push("b) 10 Kinder im 3 gegen 3: zwei Felder");
  const mass = t => { const m = String(t || "").match(/(\d+) x (\d+) m/); return m ? (+m[1]) * (+m[2]) : 0; };
  // L1-3: sechs Kinder spielen 4 gegen 2 in EINEM Viereck, acht Kinder 3 gegen 1 in zweien – dort bleibt das Maß der 4-gegen-2-Zeile (12 x 12 m).
  /* v882 (Charles 19.11.: weniger Wartende, mehr kleinere Felder): Hat die Achter-Zeile mehr Felder als die Sechser-Zeile
     (L1-1, L6-1, L4-1: zwei Felder für acht, eines für sechs), darf das Feld so groß bleiben wie für sechs – dieselbe Lage wie bei L1-3. */
  const felder = t => { const m = String(t || "").match(/^(\d+) (?:Feld|Felder|Viereck|Vierecke)\b/); return m ? +m[1] : 1; };
  const groesser = mit.filter(v => !/^L1-3 /.test(v.name) && !(felder(v.skalierung["8"]) > felder(v.skalierung["6"])) && mass(v.skalierung["6"]) && mass(v.skalierung["8"]) && mass(v.skalierung["6"]) >= mass(v.skalierung["8"]));
  if (groesser.length) probleme.push("c) 6er-Feld nicht kleiner: " + groesser.map(v => v.name.slice(0, 4)).join(", "));
  else zeilen.push("c) 6er-Felder kleiner als die 8er-Felder");
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
