/* v990 · C-Lizenz 4.2, „Lehrgang – Drei Bahnen, klare Zuständigkeit“ (Charles 27.11.2026): Altersanpassung mit den Werten aus dem
   Projekt-Chat (Teamabstimmung steht aus), U17 neutraler Spieler ab Stufe 3, altersgerechte Sprache – U9 ohne „aufpassen“
   (kollidiert mit der gesetzten Rolle Aufpasser), U13 mit festem Rufpaar, U17 mit Lehrgangsbegriffen, „Gegner“ statt „Mann“.
   a) coaching: „… der Übernehmende bestätigt mit „meiner““
   b) WORAUF ACHTEN: Trainerrollen unverändert vorn, danach der Teil „Altersanpassung“ wörtlich (Prüfsumme), danach die Schlusssätze
   c) in der ganzen Übung kein „aufpassen“/„passt auf“, kein „ab Stufe 2 plus 1 Neutraler“, kein „Mann“
   d) nachtrag-4.json und bibliothek.json gleich; Stand hochgesetzt */
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");
module.exports = async function (h) {
  const titel = "v990 Drei Bahnen: Altersanpassung vollständig, Rufpaar „deiner“ – „meiner“, U17 Neutraler ab Stufe 3";
  const probleme = [], zeilen = [];
  const NAME = "Lehrgang – Drei Bahnen, klare Zuständigkeit";
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const nt = JSON.parse(fs.readFileSync(path.join(h.REPO, "doku/auftrag-lehrgang-c-4-2/nachtrag-4.json"), "utf8")).uebungen[0];
  const u = bib.uebungen.find(x => x.name === NAME);
  if (!u) return h.ergebnis(titel, false, ["Übung fehlt in der Bibliothek"]);
  const sum = s => crypto.createHash("sha256").update(String(s || "")).digest("hex").slice(0, 16);
  // a)
  if (!u.coaching.includes("Stummes Übergeben – laut „deiner“ rufen, der Übernehmende bestätigt mit „meiner“ (wir coachen uns gegenseitig)")) probleme.push("a) Rufpaar im Coaching fehlt");
  // b)
  const w = String(u.ablauf_lang || "").split("\nWORAUF ACHTEN\n")[1] || "";
  const a = w.indexOf("Altersanpassung: "), e = w.indexOf(" Bahnregel für Rot konsequent pfeifen", a);
  if (!/^Trainerrollen: Haupttrainer an der linken Grundlinie hinter Grün/.test(w)) probleme.push("b) Trainerrollen nicht mehr vorn");
  if (a < 0 || e < 0 || sum(w.slice(a, e)) !== "e65e47cdc0ea376a") probleme.push("b) Teil „Altersanpassung“ nicht wörtlich");
  if (!/Bahnregel für Rot konsequent pfeifen, laute Kommunikation einfordern, Rollen fair tauschen\.\s*$/.test(w)) probleme.push("b) Schlusssätze fehlen");
  // c)
  const txt = JSON.stringify(u);
  if (/aufpass|pass\w* auf/i.test(txt)) probleme.push("c) „aufpassen“ steht noch in der Übung");
  if (/ab Stufe 2 plus 1 Neutraler/.test(txt)) probleme.push("c) „ab Stufe 2 plus 1 Neutraler“ steht noch in der Übung");
  if (/\bMann\b/.test(txt)) probleme.push("c) „Mann“ steht noch in der Übung");
  // d)
  const norm = x => JSON.stringify(x, Object.keys(x).sort());
  if (norm(u) !== norm(nt)) probleme.push("d) nachtrag-4.json und bibliothek.json weichen voneinander ab");
  if (String(bib.stand) < "2026-11-27-5") probleme.push(`d) Stand „${bib.stand}“ nicht hochgesetzt`);
  const kn = h.KINDER.filter(n => txt.includes(n)); if (kn.length) probleme.push("Kindername: " + kn.join(", "));
  zeilen.push(`coaching ${u.coaching.length} · ablauf_lang ${u.ablauf_lang.length} Zeichen · Altersanpassung ${e - a} Zeichen`);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
