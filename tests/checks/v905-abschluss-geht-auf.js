/* v905 · L4-8 bei 12 Kindern (Charles 20.11.): Das Abschlussturnier nannte 3+1 gegen 3+1 (8 Kinder) und FUNiño 3 gegen 3
   (6 Kinder) – 14 bei 12 Kindern. Jetzt: acht Kinder 3+1 gegen 3+1, vier Kinder FUNiño 2 gegen 2, nach der Hälfte tauschen.

   a) L4-8, Zeile 12: genau diese Aufteilung.
   b) In jeder Skalierungszeile jeder Vorlage, die das Abschlussturnier mit Kinderzahlen („acht Kinder …, vier Kinder …“)
      aufteilt, ergeben die Zahlen genau die Kinderzahl der Zeile.
   c) Der Stand der Vorlagen ist neu (sonst zöge der Abgleich die Zeile nicht nach). */
"use strict";
const fs = require("fs"), path = require("path");
const ZAHL = { zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12, dreizehn: 13, vierzehn: 14, fünfzehn: 15, sechzehn: 16 };
module.exports = async function (h) {
  const titel = "v905 Abschlussturnier geht mit der Kinderzahl auf (L4-8 bei 12)";
  const probleme = [], zeilen = [];
  const vor = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8"));
  const l48 = vor.vorlagen.find(v => /^L4-8 /.test(v.name));
  const z12 = (l48 && l48.skalierung && l48.skalierung["12"]) || "";
  if (!/acht Kinder 3\+1 gegen 3\+1/.test(z12) || !/vier Kinder FUNiño 2 gegen 2/.test(z12) || !/nach der Hälfte Felder tauschen/.test(z12)) probleme.push(`a) L4-8, Zeile 12: „${z12.slice(-160)}“`);
  let geprueft = 0;
  vor.vorlagen.forEach(v => Object.entries(v.skalierung || {}).forEach(([n, t]) => {
    const ab = String(t).split(/Abschlussturnier/)[1]; if (!ab) return;
    const teile = [...ab.matchAll(/\b(zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|dreizehn|vierzehn|fünfzehn|sechzehn|\d+) Kinder\b/g)].map(m => ZAHL[m[1]] || Number(m[1]));
    if (teile.length < 2) return;
    geprueft++;
    const summe = teile.reduce((a, b) => a + b, 0);
    if (summe !== Number(n)) probleme.push(`b) ${v.name.split(" ")[0]}, Zeile ${n}: Abschluss ${teile.join(" + ")} = ${summe}`);
  }));
  if (!/^2026-11-20-[2-9]$|^2026-11-2[1-9]-\d+$|^2026-1[12]-\d\d-\d+$|^202[7-9]-/.test(String(vor.stand))) probleme.push(`c) Stand ${vor.stand} – nicht hochgezählt`);
  zeilen.push(`a) L4-8 Zeile 12: acht + vier Kinder · b) ${geprueft} Zeilen mit aufgeteiltem Abschluss geprüft · c) Stand ${vor.stand}`);
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme : zeilen);
};
