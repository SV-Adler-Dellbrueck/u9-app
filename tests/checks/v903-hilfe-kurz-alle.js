/* v903 · Bestandsaufnahme November 2026, 4.3 abgeschlossen: JEDER Hilfe-Eintrag, dessen Text länger ist als
   HILFE_KURZ_AB (bis dahin zeigte die Hilfe einen abgeschnittenen Anriss), trägt eine eigene Kurzfassung –
   höchstens 330 Zeichen, ohne Versionsnummer, ohne gerades Anführungszeichen. Ein neuer langer Eintrag ohne
   Kurzfassung macht diese Prüfung rot. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v903 Hilfe: jeder lange Eintrag hat eine eigene Kurzfassung";
  const probleme = [];
  const views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  const ab = Number((views.match(/const HILFE_KURZ_AB=(\d+);/) || [])[1]);
  if (!ab) return h.ergebnis(titel, false, ["HILFE_KURZ_AB nicht gefunden"]);
  const re = /\{t:"([^"]+)",\s*(?:kurz:"((?:[^"\\]|\\.)*)",\s*)?d:"((?:[^"\\]|\\.)*)"/g;
  let m, n = 0, lang = 0, mitKurz = 0;
  while ((m = re.exec(views))) {
    n++;
    const text = m[3].replace(/<[^>]+>/g, "");
    if (m[2] != null) {
      mitKurz++;
      if (m[2].length > 330) probleme.push(`„${m[1]}“: Kurzfassung ${m[2].length} Zeichen`);
      if (/\bv\d{3}\b|Seit v|Neu in/.test(m[2])) probleme.push(`„${m[1]}“: Kurzfassung nennt eine Version`);
      if (/\\"/.test(m[2])) probleme.push(`„${m[1]}“: gerades Anführungszeichen in der Kurzfassung`);
    }
    if (text.length > ab) { lang++; if (m[2] == null) probleme.push(`„${m[1]}“: ${text.length} Zeichen ohne Kurzfassung`); }
  }
  if (n < 70) probleme.push(`nur ${n} Einträge gefunden – Muster veraltet?`);
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.slice(0, 10) : [`${n} Einträge, ${lang} länger als ${ab} Zeichen – alle mit Kurzfassung (${mitKurz} insgesamt)`]);
};
