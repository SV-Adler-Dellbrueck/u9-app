/* v992 · C-Lizenz 3.1, Nachtrag 6 (27.11.2026): „Lehrgang – Zwei-Seiten-Spiel“ bekommt am Ende von ablauf_lang den Abschnitt
   ALTERSANPASSUNG (U9, U13, U17 mit Format, Feld, Mitte, Tore, Seitenwechsel, Wertung, Durchgänge, Sprache, Schwerpunkt,
   Coachingfrage, dazu der Hinweis zur U9). Nur ablauf_lang ändert sich; Weg wie v991 (Zeile gesichert, Datenbank ersetzt).
   Eine eigene Tabellendarstellung für Altersanpassungen kennt die App nicht – auch „Drei Bahnen“ (4.2) zeigt sie als Text in der
   ganzen Beschreibung; 3.1 erscheint deshalb genauso.
   a) ablauf_lang wie nachtrag.json, der Abschnitt ALTERSANPASSUNG wörtlich (Prüfsumme) mit U9, U13 und U17
   b) ablauf ≤ 1.000 Zeichen (v917), alle anderen Felder wie nachtrag.json; Stand hochgesetzt */
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");
module.exports = async function (h) {
  const titel = "v992 C-3.1 Nachtrag 6: Altersanpassung U9/U13/U17 im Langtext des Zwei-Seiten-Spiels";
  const probleme = [], zeilen = [];
  const NAME = "Lehrgang – Zwei-Seiten-Spiel";
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const nt = JSON.parse(fs.readFileSync(path.join(h.REPO, "doku/auftrag-lehrgang-c-3-1/nachtrag.json"), "utf8")).uebungen[0];
  const u = bib.uebungen.find(x => x.name === NAME);
  if (!u) return h.ergebnis(titel, false, ["Übung fehlt in der Bibliothek"]);
  const lang = String(u.ablauf_lang || ""), i = lang.indexOf("ALTERSANPASSUNG:");
  const teil = i < 0 ? "" : lang.slice(i);
  if (i < 0) probleme.push("a) ALTERSANPASSUNG fehlt in ablauf_lang");
  else {
    if (crypto.createHash("sha256").update(teil).digest("hex").slice(0, 16) !== "5bcd16a35b4245d8") probleme.push("a) Abschnitt ALTERSANPASSUNG nicht wörtlich");
    ["U9 – ", "U13 – ", "U17 – "].forEach(k => { if (!teil.includes(k)) probleme.push(`a) ${k.trim()} fehlt in der Altersanpassung`); });
  }
  if (lang !== nt.ablauf_lang) probleme.push("a) ablauf_lang nicht wie nachtrag.json");
  if (String(u.ablauf || "").length > 1000) probleme.push(`b) ablauf ${u.ablauf.length} Zeichen`);
  const norm = x => JSON.stringify(x, Object.keys(x).sort());
  if (norm(u) !== norm(nt)) probleme.push("b) Bibliothek und nachtrag.json weichen voneinander ab");
  if (String(bib.stand) < "2026-11-27-7") probleme.push(`b) Stand „${bib.stand}“ nicht hochgesetzt`);
  const kn = h.KINDER.filter(n => JSON.stringify(u).includes(n)); if (kn.length) probleme.push("Kindername: " + kn.join(", "));
  zeilen.push(`ablauf ${u.ablauf.length} · ablauf_lang ${lang.length} Zeichen · Altersanpassung ${teil.length} Zeichen mit U9, U13, U17`);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
