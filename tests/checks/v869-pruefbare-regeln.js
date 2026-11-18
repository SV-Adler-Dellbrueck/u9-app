/* v869 · Bestandsaufnahme 5.5 (Charles 18.11.): Regeln, die Kinder selbst prüfen können.
   a) L4-1 Stufe 2 zählt Pässe laut statt Kontakte; Stufe 3 nimmt die Zählregel weg.
   b) L4-4 Stufe 2: ein Gegner in der Mitte, Ballberührung = Tausch mit dem Passgeber.
   c) Keine Vorlage verlangt mehr eine Kontaktbegrenzung („höchstens … Kontakte“, „Kontakte frei“). */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v869 Vorlagen: prüfbare Regeln statt Kontaktbegrenzung (L4-1, L4-4)";
  const probleme = [], zeilen = [];
  const wurzel = process.env.REPO || path.join(__dirname, "..", "..");
  const d = JSON.parse(fs.readFileSync(path.join(wurzel, "uebungen", "vorlagen.json"), "utf8"));
  const lab = (k, n) => { const v = d.vorlagen.find(x => x.name.startsWith(k + " ")); const b = v && v.bloecke.find(x => new RegExp("^Stufe " + n).test(x.label || "")); return b ? b.label : ""; };
  if (!/fünf Pässe in Folge = ein Punkt/.test(lab("L4-1", 2)) || !/Zählregel weg/.test(lab("L4-1", 3))) probleme.push("a) L4-1: " + lab("L4-1", 2) + " / " + lab("L4-1", 3));
  else zeilen.push("a) L4-1: " + lab("L4-1", 2));
  if (!/berührt er den Ball, tauscht er mit dem Passgeber/.test(lab("L4-4", 2))) probleme.push("b) L4-4: " + lab("L4-4", 2)); else zeilen.push("b) L4-4: " + lab("L4-4", 2));
  const rest = [];
  d.vorlagen.forEach(v => v.bloecke.forEach(b => { if (/höchstens \S+ Kontakt|Kontakte frei/i.test(b.label || "")) rest.push(v.name.slice(0, 4) + ": " + b.label); }));
  if (rest.length) probleme.push("c) " + rest.join(" | ")); else zeilen.push("c) keine Kontaktbegrenzung mehr in den Vorlagen");
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
