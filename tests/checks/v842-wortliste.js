/* v842 · Ein Wort je Sache (Bestandsaufnahme November 2026, 4.2; Auswahl von Charles am 17.11.).
   In sichtbaren Texten der App-Dateien stehen nicht mehr: „Match-Uhr“, „Live-Match“, „In Match übernehmen“,
   „Antwort offen“, „ohne Antwort“, „Antworten der Eltern“, „Kinder-Modus“, „Nachbewertung“.
   Geprüft wird der Quelltext ohne Kommentare – Bezeichner (tmMatchdaySync) und die öffentliche Route ?match bleiben. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v842 Wortliste: Spieltag, Spieluhr, Rückmeldung, Die Kabine, Nachbereitung – keine Altbegriffe in sichtbaren Texten";
  const probleme = [];
  const dateien = fs.readdirSync(h.REPO).filter(f => /\.js$/.test(f)).concat(["shell.html"]);
  const ALT = /Match-Uhr|Live-Match|In Match übernehmen|Antwort offen|[oO]hne Antwort|Antworten der Eltern|Kinder-Modus|Nachbewertung/g;
  let gelesen = 0;
  for (const f of dateien) {
    let s = fs.readFileSync(path.join(h.REPO, f), "utf8"); gelesen++;
    s = s.replace(/\/\*[\s\S]*?\*\//g, m => "\n".repeat((m.match(/\n/g) || []).length)).replace(/<!--[\s\S]*?-->/g, m => "\n".repeat((m.match(/\n/g) || []).length));
    s.split("\n").forEach((z, i) => { const c = z.replace(/(^|[\s;{}])\/\/.*$/, ""); const m = c.match(ALT); if (m) probleme.push(`${f}:${i + 1} „${m[0]}“`); });
  }
  const neu = fs.readFileSync(path.join(h.REPO, "shell.html"), "utf8").includes("Spieluhr");
  if (!neu) probleme.push("shell.html nennt die Spieluhr nicht");
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.slice(0, 12) : [`${gelesen} Dateien ohne Altbegriffe; die Uhr am Spieltag heißt „Spieluhr“`]);
};
