/* v988 · C-Lizenz 3.1, Nachtrag 4 (Charles 27.11.2026): „Lehrgang – Zwei-Seiten-Spiel“ mit 5-m-Korridor,
   Aus-Regel mit „Wechsel!“, Startordnung Raute, Spielerzahl 7–9, Trainer am Korridorende.
   Die Kurzfassung hat das Projekt gekürzt (998 Zeichen), die Fassung aus Nachtrag 4 bleibt als ablauf_lang.
   In den Bestand kommt das über den Weg aus v833 (Zeile sichern, Felder in der Datenbank ersetzen) –
   der Abgleich überschreibt nie; hier wird geprüft, was im Repo steht.
   a) kurz, feld, spieler wie beschlossen; Kurzfassung ≤ 1.000 Zeichen, lange Fassung länger und unverändert
      (beginnt mit AUFBAU, nennt Korridor, „Wechsel!“, Raute, Joker, MATERIAL mit 8 Hütchen)
   b) Kurzfassung trägt die Regeln: Korridor, Raute, „Wechsel!“, Aus, Joker, Durchgänge
   c) Skizze: Korridor als zweite Zone mittig (5 m von 24 m), keine Mittellinie mehr, Trainer links hinter der
      Grundlinie in Höhe des Korridors, Spielerkreise mindestens 24 auseinander
   d) nachtrag.json und bibliothek.json tragen dieselbe Fassung; Stand hochgesetzt */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v988 C-3.1 Nachtrag 4: Korridor, Kurzfassung ≤ 1.000, lange Fassung, Trainer am Korridorende";
  const probleme = [], zeilen = [];
  const NAME = "Lehrgang – Zwei-Seiten-Spiel";
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const nt = JSON.parse(fs.readFileSync(path.join(h.REPO, "doku/auftrag-lehrgang-c-3-1/nachtrag.json"), "utf8")).uebungen[0];
  const u = bib.uebungen.find(x => x.name === NAME);
  if (!u) return h.ergebnis(titel, false, ["Übung fehlt in der Bibliothek"]);
  // a)
  if (u.kurz !== "4 gegen 4, vier Minitore: Torschuss erst nach Seitenwechsel über den Korridor.") probleme.push("a) kurz: " + u.kurz);
  if (u.feld !== "36 × 24 m, Korridor 5 m längs") probleme.push("a) feld: " + u.feld);
  if (u.spieler !== "7–9") probleme.push("a) spieler: " + u.spieler);
  const ab = String(u.ablauf || ""), lang = String(u.ablauf_lang || "");
  if (ab.length > 1000) probleme.push(`a) Kurzfassung hat ${ab.length} Zeichen (höchstens 1.000)`);
  if (!(lang.length > ab.length) || !/^AUFBAU: /.test(lang) || !/Korridor/.test(lang) || !/„Wechsel!“/.test(lang) || !/Raute/.test(lang) || !/Joker/.test(lang) || !/MATERIAL: 4 Minitore, 4 Hütchen, 8 Markierungsscheiben/.test(lang))   /* v991: Nachtrag 5 – Scheiben am Korridor, Hütchen nur an den Ecken */
    probleme.push(`a) lange Fassung fehlt oder ist nicht die aus Nachtrag 4 (${lang.length} Zeichen)`);
  // b)
  [[/^AUFBAU: Feld 36 × 24 m\./, "Aufbau mit Feldmaß"], [/5 m breiter Korridor/, "Korridor"], [/Raute/, "Startordnung Raute"], [/„Wechsel!“/, "Ruf „Wechsel!“"],
   [/Aus: /, "Aus-Regel"], [/Joker/, "Joker bei 9"], [/4 Durchgänge à 3 Min\./, "Durchgänge"], [/SPIELERZAHL: /, "Abschnitt Spielerzahl"]]
    .forEach(([re, was]) => { if (!re.test(ab)) probleme.push("b) Kurzfassung ohne " + was); });
  if (/Mittellinie/.test(ab + lang + u.kurz + u.feld)) probleme.push("b) es steht noch „Mittellinie“ im Text");
  // c)
  const sk = u.skizze || {}, z = (sk.z || [])[0], kor = (sk.z || [])[1];
  if (!z || !kor) probleme.push("c) Korridor-Zone fehlt");
  else {
    const mitte = kor[1] + kor[3] / 2, feldMitte = z[1] + z[3] / 2, breiteM = kor[3] / z[3] * 24;
    if (kor[0] !== z[0] || kor[2] !== z[2]) probleme.push("c) Korridor nicht über die ganze Feldlänge");
    if (Math.abs(mitte - feldMitte) > 0.5) probleme.push(`c) Korridor nicht mittig (${mitte} statt ${feldMitte})`);
    if (Math.abs(breiteM - 5) > 0.6) probleme.push(`c) Korridor ${breiteM.toFixed(1)} m statt 5 m`);
    const tr = (sk.ger || []).filter(g => g[2] === "trainer");
    if (tr.length !== 1 || !(tr[0][0] < z[0]) || !(tr[0][1] >= kor[1] && tr[0][1] <= kor[1] + kor[3])) probleme.push("c) Trainer nicht links hinter der Grundlinie am Korridorende: " + JSON.stringify(tr));
    zeilen.push(`c) Korridor ${breiteM.toFixed(1)} m mittig · Trainer bei x ${tr[0] ? tr[0][0] : "?"} (Grundlinie ${z[0]})`);
  }
  if ((sk.li || []).length) probleme.push("c) die alte Mittellinie steht noch in der Skizze");
  if ((sk.h || []).length !== 4) probleme.push(`c) ${(sk.h || []).length} Hütchen statt 4`);   // v991: nur die Ecken, der Korridor hat 8 Teller (v991-Prüffall)
  const eng = [];
  (sk.s || []).forEach((a, i) => sk.s.forEach((b, j) => { if (j > i && Math.hypot(a[0] - b[0], a[1] - b[1]) < 24) eng.push(i + "↔" + j); }));
  if (eng.length) probleme.push("c) Spieler zu eng: " + eng.join(", "));
  // d)
  const norm = x => JSON.stringify(x, Object.keys(x).sort());
  if (norm(u) !== norm(nt)) probleme.push("d) nachtrag.json und bibliothek.json weichen voneinander ab");
  if (String(bib.stand) < "2026-11-27-2") probleme.push(`d) Stand „${bib.stand}“ nicht hochgesetzt`);
  zeilen.push(`Kurzfassung ${ab.length} Zeichen · lange Fassung ${lang.length} · ${u.spieler} Spieler · ${u.feld}`);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
