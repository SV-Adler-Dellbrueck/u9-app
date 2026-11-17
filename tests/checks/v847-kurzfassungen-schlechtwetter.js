/* v847 · Bestandsaufnahme November 2026, 4.3 und 5.3.
   a) Die 14 längsten Hilfe-Einträge tragen eine eigene Kurzfassung: höchstens 330 Zeichen,
      ohne Versionsnummer, ohne gerades Anführungszeichen.
   b) Die Schlechtwetter-Vorlagen L1-4, L2-3 und L4-4 zählten Parcours, Mitnahme und Dreieck
      als Spielzeit (Typ „main“, 32 Minuten). Stufe 1 und 2 sind Übungsform, Stufe 3 Spielform,
      und die eingetragenen Spielform-Minuten passen zu Stufe 3 plus Abschluss. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v847 Hilfe: Kurzfassung für die längsten Einträge · Schlechtwetter-Vorlagen zählen Übungen nicht als Spielzeit";
  const probleme = [], zeilen = [];
  const wurzel = process.env.REPO || path.join(__dirname, "..", "..");
  const views = fs.readFileSync(path.join(wurzel, "views.js"), "utf8");
  const soll = ["Startseite", "Kader", "Übungen", "Trainingsblock", "Spieltag", "Spieler bewerten", "Heimspiel & Festival planen",
    "Benachrichtigungen einschalten", "Rückmelde-Verhalten", "Nest-Ausgaben", "Termine", "Tagebuch", "Trainermeeting", "Teamkasse"];
  let ok = 0;
  for (const t of soll) {
    const m = views.match(new RegExp('\\{t:"' + t.replace(/[&()]/g, "\\$&") + '", kurz:"([^"]+)", d:"'));
    if (!m) { probleme.push("a) Kurzfassung fehlt: " + t); continue; }
    if (m[1].length > 330) probleme.push(`a) „${t}“ ist ${m[1].length} Zeichen lang`);
    else if (/\bv\d{3}\b|Seit v|Neu in/.test(m[1])) probleme.push(`a) „${t}“ nennt eine Version`);
    else ok++;
  }
  if (ok === soll.length) zeilen.push(`a) ${ok} Kurzfassungen, alle höchstens 330 Zeichen und ohne Versionsnummer`);
  const d = JSON.parse(fs.readFileSync(path.join(wurzel, "uebungen", "vorlagen.json"), "utf8"));
  const drei = d.vorlagen.filter(v => /^(L1-4|L2-3|L4-4) /.test(v.name));
  if (drei.length !== 3) probleme.push("b) erwartet drei Vorlagen, gefunden " + drei.length);
  for (const v of drei) {
    const st = n => v.bloecke.find(b => new RegExp("^Stufe " + n).test(b.label)) || {};
    const typen = [st(1).typ, st(2).typ, st(3).typ].join("/");
    const spiel = v.bloecke.reduce((a, b) => a + (["main", "spielform", "abschluss"].includes(b.typ) ? b.dauer : 0), 0);
    const anteil = v.netto_spielform_min / spiel;
    if (typen !== "uebungsform/uebungsform/spielform") probleme.push(`b) ${v.name.slice(0, 4)}: Stufen ${typen}`);
    else if (!(anteil >= 0.6 && anteil <= 1)) probleme.push(`b) ${v.name.slice(0, 4)}: ${v.netto_spielform_min} Min. Spielform bei ${spiel} Min. Spielblöcken`);
  }
  if (!probleme.some(p => p.startsWith("b)"))) zeilen.push("b) L1-4, L2-3, L4-4: Übungsform/Übungsform/Spielform, " + drei.map(v => v.netto_spielform_min).join("/") + " Min. Spielform");
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
