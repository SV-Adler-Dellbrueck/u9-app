/* v872 · Import-Fenster entfernt (Bestandsaufnahme November 2026, 4.7; Charles 18.11.: „Raus, Prüfung bleibt“).
   a) Die drei Fenster (Einheit-, Übungs-, Vorlagen-Import) und alles, was nur aus ihnen erreicht wurde, sind in
      keiner .js-Datei mehr definiert.
   b) Was der Abgleich (uebungen/bibliothek.json, uebungen/vorlagen.json) und „Vorlage übernehmen“ brauchen,
      steht weiter in md-einheit-import.js.
   c) bibliothekAbgleich ist weiterhin der Wachname in trainer/index.html und die letzte Funktion der Datei. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v872 Import-Fenster entfernt – Prüfung und Abgleich bleiben";
  const probleme = [], zeilen = [];
  const wurzel = process.env.REPO || path.join(__dirname, "..", "..");
  const lies = f => { try { return fs.readFileSync(path.join(wurzel, f), "utf8"); } catch (e) { return ""; } };
  const alleJs = fs.readdirSync(wurzel).filter(f => f.endsWith(".js")).map(f => ({ f, src: lies(f) }));
  const def = n => new RegExp("(^|\\n)\\s*(async\\s+)?function\\s+" + n + "\\s*\\(|(^|\\n)\\s*(const|let|var)\\s+" + n + "\\s*=");
  // a)
  const weg = ["einheitImportOpen", "einheitImportClose", "einheitImportPruefen", "einheitImportUebernehmen", "_eiPruefung", "_eiMelde",
    "_eiVorschauHtml", "_eiDatumSetzen", "_eiGeprueft", "EI_SCHEMA",
    "uebungImportOpen", "uebungImportClose", "uebungImportPruefen", "uebungImportUebernehmen", "_euMelde", "_euVorschauHtml", "_euGeprueft", "EI_KAT_LABEL",
    "vorlagenImportOpen", "vorlagenImportClose", "vorlagenImportPruefen", "vorlagenImportUebernehmen", "_evMelde", "_evZeileHtml", "_evVorschauHtml", "_evGeprueft"];
  const noch = [];
  for (const n of weg) for (const x of alleJs) if (def(n).test(x.src)) noch.push(n + " (" + x.f + ")");
  if (noch.length) probleme.push("a) noch definiert: " + noch.join(", "));
  else zeilen.push(`a) ${weg.length} entfernte Namen sind in keiner .js-Datei mehr definiert`);
  // b)
  const modul = lies("md-einheit-import.js");
  const bleiben = ["_euPruefung", "_euAnlegen", "_euNachziehen", "_euForm", "_eiUebungAnlegen", "_evPruefung", "_evAufbereiten", "_evAnlegen",
    "_evVorlageAnlegen", "_evSkalierungNachziehen", "_evNettoHinweis", "_eiKatPasst", "_eiFormIndex", "_eiFarbe", "EI_FARBEN", "EI_UEB_SCHEMA",
    "EI_VOR_SCHEMA", "EI_TYPEN", "EI_KATS", "vuPlanAusVorlage", "vuAbschlussturnierSichern", "vorlageUebernehmenOpen", "vorlageUebernehmenSetzen",
    "bibliothekAbgleich"];
  const fehlt = bleiben.filter(n => !def(n).test(modul));
  if (fehlt.length) probleme.push("b) fehlt in md-einheit-import.js: " + fehlt.join(", "));
  else zeilen.push(`b) ${bleiben.length} Namen für Abgleich und „Vorlage übernehmen“ stehen weiter im Modul`);
  // c)
  const wache = /"md-einheit-import\.js":"bibliothekAbgleich"/.test(lies("trainer/index.html"));
  const fns = [...modul.matchAll(/(^|\n)(async\s+)?function\s+([\w$]+)\s*\(/g)].map(m => m[3]);
  const letzte = fns[fns.length - 1];
  if (!wache) probleme.push("c) trainer/index.html bewacht md-einheit-import.js nicht mehr mit bibliothekAbgleich");
  else if (letzte !== "bibliothekAbgleich") probleme.push(`c) letzte Funktion der Datei ist ${letzte}, nicht bibliothekAbgleich`);
  else zeilen.push("c) bibliothekAbgleich ist Wachname und letzte Funktion der Datei");
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
