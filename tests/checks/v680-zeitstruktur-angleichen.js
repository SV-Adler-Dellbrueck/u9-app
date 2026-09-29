/* v680 · Zeitstruktur 18/12/12/28 in den Vorlagen, Wort „Spielform-Minuten“ statt „Nettospielzeit“
   Beschluss 28.09. (entscheidungen.md): Straßenfußball 10 + Warm-up Adler 8 / Stufen 12-12-10 /
   Abschlussturnier 18. PO 29.09. auf „angleichen oder lassen?“: „Alles machen“.
   a) Jede Vorlage mit drei Stufen folgt 10+8 / 12-12-10 / 18 – ausgenommen sind nur
      L4-2 und L4-5 (die Lehrgangsformen 15:30:15:30, eigene Struktur) und L4-8 (drei Felder
      im Umlauf: jede Gruppe braucht an jedem Feld gleich lange, deshalb 12-12-12 / 16).
   b) Kein „Warm up Adler, voll“ mehr in den angeglichenen Vorlagen; ein paralleler Torwart-Block
      (L3-1) bleibt stehen.
   c) Alle übrigen Vorlagen dauern weiter 75 Minuten laut dauer_min; die Blöcke ergeben höchstens 75.
   d) Sichtbare Texte sagen „Spielform-Minuten“, nicht „Nettospielzeit“ oder „Min. netto“. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const d = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8"));
  const AUSNAHMEN = ["L4-2", "L4-5", "L4-8"];
  let angeglichen = 0;
  for (const v of d.vorlagen) {
    const kurz = v.name.split(" ")[0];
    const b = v.bloecke, stufen = b.filter(x => x.typ === "main" || x.typ === "spielform");
    const summe = b.filter(x => x.typ !== "tw").reduce((a, x) => a + x.dauer, 0);
    if (AUSNAHMEN.includes(kurz)) continue;   // die Lehrgangsformen dauern 90 Minuten
    if (summe > 75 || v.dauer_min !== 75) probleme.push(`c) ${kurz}: ${summe} Min. in Blöcken, dauer_min ${v.dauer_min}`);
    const warm = b.filter(x => x.typ === "warmup").map(x => x.dauer).join("+");
    const ab = (b.find(x => x.typ === "abschluss") || {}).dauer;
    if (warm !== "10+8" || stufen.map(x => x.dauer).join("-") !== "12-12-10" || ab !== 18) probleme.push(`a) ${kurz}: ${warm} / ${stufen.map(x => x.dauer).join("-")} / ${ab}`);
    else angeglichen++;
    if (b.some(x => /voll/.test(x.label || ""))) probleme.push(`b) ${kurz}: noch „voll“ im Warm-up`);
  }
  const l31 = d.vorlagen.find(v => v.name.startsWith("L3-1 "));
  if (!l31 || !l31.bloecke.some(x => x.typ === "tw")) probleme.push("b) L3-1 hat keinen Torwart-Block mehr");
  const code = ["boot.js", "md-einheit-import.js", "md-block.js", "views.js"].map(f => fs.readFileSync(path.join(h.REPO, f), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "").replace(/<!--[\s\S]*?-->/g, "")).join("\n");
  const alt = code.match(/Nettospielzeit|Netto-Spielzeit|Min\. netto/g);
  if (alt) probleme.push(`d) sichtbar noch: ${[...new Set(alt)].join(", ")}`);
  zeilen.push(`${angeglichen} Vorlagen auf 10+8 / 12-12-10 / 18 · Ausnahmen ${AUSNAHMEN.join(", ")} · Texte „Spielform-Minuten“`);
  return h.ergebnis("v680 Zeitstruktur 18/12/12/28 in den Vorlagen, „Spielform-Minuten“", !probleme.length, probleme.length ? probleme : zeilen);
};
