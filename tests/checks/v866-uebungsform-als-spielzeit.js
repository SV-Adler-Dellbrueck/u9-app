/* v866 · Bestandsaufnahme 5.3, Rest (Charles 18.11.).
   a) L3-1: der Torschuss-Wettbewerb in Stufe 1 und 2 ist Übungsform, Stufe 3 Spielform; die Spielform-Minuten
      passen zu Stufe 3 plus Abschluss (wie L1-4, L2-3, L4-4 seit v847).
   b) „Igel-Pressing-Kreis“ ist laut Ablauf ein Funiño 3 gegen 3 – Einordnung „spiel“, nicht „uebung“.
   c) Keine Vorlage zählt mehr einen Spielblock (Typ „main“) als Spielzeit, dessen Übung als Übungsform eingeordnet ist
      (Ausnahme: die Sondereinheit Technik-Parcours, die ausdrücklich Übungsform ist). */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v866 Vorlagen: keine Übungsform mehr als Spielzeit (L3-1, Igel-Pressing-Kreis)";
  const probleme = [], zeilen = [];
  const wurzel = process.env.REPO || path.join(__dirname, "..", "..");
  const d = JSON.parse(fs.readFileSync(path.join(wurzel, "uebungen", "vorlagen.json"), "utf8"));
  const src = fs.readFileSync(path.join(wurzel, "data.js"), "utf8");
  const m = src.match(/const UEBUNG_ART_VORSCHLAG=(\{[\s\S]*?\n\});/);
  const ART = m ? eval("(" + m[1] + ")") : {};
  // a)
  const v = d.vorlagen.find(x => /^L3-1 /.test(x.name));
  const st = n => (v ? v.bloecke.find(b => new RegExp("^Stufe " + n).test(b.label)) : null) || {};
  const typen = [st(1).typ, st(2).typ, st(3).typ].join("/");
  const spiel = v ? v.bloecke.reduce((a, b) => a + (["main", "spielform", "abschluss"].includes(b.typ) ? b.dauer : 0), 0) : 0;
  const anteil = v ? v.netto_spielform_min / spiel : 0;
  if (!v || typen !== "uebungsform/uebungsform/spielform") probleme.push("a) L3-1 Stufen: " + typen);
  else if (!(anteil >= 0.6 && anteil <= 1)) probleme.push(`a) L3-1: ${v.netto_spielform_min} Min. Spielform bei ${spiel} Min. Spielblöcken`);
  else zeilen.push(`a) L3-1: Übungsform/Übungsform/Spielform, ${v.netto_spielform_min} Min. Spielform`);
  // b)
  if (ART["Igel-Pressing-Kreis"] !== "spiel") probleme.push("b) Igel-Pressing-Kreis: " + ART["Igel-Pressing-Kreis"]); else zeilen.push("b) Igel-Pressing-Kreis: Spielform");
  // c)
  const falsch = [];
  for (const x of d.vorlagen) {
    if (/^Sonder/.test(x.name)) continue;
    for (const b of x.bloecke) {
      if (b.typ !== "main") continue;   // „spielform“ ist eine ausdrückliche Einordnung der Vorlage (offene Stufe 3 seit v847)
      const namen = b.stationen ? b.stationen.map(s => s.uebung_name) : [b.uebung_name];
      if (namen.length && namen.every(n => ART[n] === "uebung")) falsch.push(x.name.slice(0, 4) + " „" + String(b.label).slice(0, 30) + "“");
    }
  }
  if (falsch.length) probleme.push("c) Übungsform als Spielzeit: " + falsch.join(", ")); else zeilen.push("c) keine Vorlage zählt eine Übungsform als Spielzeit");
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
