/* Attrappe für die öffentliche Turnierseite (Prüffälle v897–v899): „Adler-Herbstcup U9“, Format
   gruppen (2 × 3), 2 Felder, 10 Min. Spielzeit, 2 Min. Pause, 10 Min. Puffer vor den Platzierungsspielen.
   Plan mit dem echten _htGen erzeugt. Uhr in den Prüffällen: 10:28 – Runden 10:00 und 10:12 fertig, um
   10:24 läuft Adler gegen Rheinaue mit Zwischenstand 1:0, das zweite Spiel ohne Eintrag.
   Fiktive Vereine, keine Kinder. Wappen: unser logo.png und https-Adressen auf app.test (dort liefert der
   Harness das Logo aus); ein Verein ohne Wappen, wahlweise ein kaputtes Bild. */
"use strict";
const JETZT = "2026-11-21T10:28:00";
const TEAMS = ["SV Adler Dellbrück", "SC Rheinaue", "TuS Lindenhof", "FC Viktoria Mühlenbach", "DJK Grün-Weiß Auenfeld", "SpVg Kastanienhain"];
function zeile(opt = {}) {
  const plan = [
    { a: 1, b: 2, phase: "Gruppe A", zeit: "10:00", feld: 1, ta: 2, tb: 1 },
    { a: 4, b: 5, phase: "Gruppe B", zeit: "10:00", feld: 2, ta: 0, tb: 0 },
    { a: 0, b: 2, phase: "Gruppe A", zeit: "10:12", feld: 1, ta: 1, tb: 3 },
    { a: 3, b: 5, phase: "Gruppe B", zeit: "10:12", feld: 2, ta: 2, tb: 2 },
    { a: 0, b: 1, phase: "Gruppe A", zeit: "10:24", feld: 1, ta: 1, tb: 0 },
    { a: 3, b: 4, phase: "Gruppe B", zeit: "10:24", feld: 2, ta: null, tb: null },
    { a: "A3", b: "B3", phase: "Spiel um Platz 5", zeit: "10:46", feld: 1, ta: null, tb: null },
    { a: "A2", b: "B2", phase: "Spiel um Platz 3", zeit: "10:46", feld: 2, ta: null, tb: null },
    { a: "A1", b: "B1", phase: "Finale", zeit: "10:58", feld: 1, ta: null, tb: null }
  ];
  const wappen = { "SV Adler Dellbrück": "logo.png", "SC Rheinaue": opt.kaputt ? "https://app.test/kaputt-wappen.png" : "https://app.test/logo.png",
    "TuS Lindenhof": "https://app.test/logo.png", "FC Viktoria Mühlenbach": "https://app.test/logo.png", "DJK Grün-Weiß Auenfeld": "https://app.test/logo.png" };
  const row = { id: 1, slug: "herbstcup-21-11", name: "Adler-Herbstcup U9", datum: "2026-11-21", ort: "Sportplatz Dellbrück, Köln", aktiv: true, teams: TEAMS.slice(), plan,
    config: { format: "gruppen", gruppen: 2, felder: 2, spieldauer: 10, pause: 2, puffer: 10, start: "10:00", spielform: "f4", wappen,
      regeln: "4+1 (Vorlage)\n• 4 Feldspieler + Torwart, fliegender Wechsel\n• Kein Abseits\n• Eindribbeln statt Einwurf\n• Fair-Play-Liga: ohne Schiedsrichter\n• Zuschauerzone mit Abstand\n• Rückpass ohne Hände\n• Tore nur aus der gegnerischen Hälfte",
      infos: "⏰ Bitte 30 Minuten vor dem ersten Spiel da sein\n⚽ Eigene Bälle zum Aufwärmen mitbringen\n☕ Kaffee und Kuchen im Vereinsheim",
      durchsage: "Die Siegerehrung findet für alle Teams gemeinsam am Vereinsheim statt.", durchsage_um: "10:20" } };
  if (opt.ende) {      // Turnierende: alle Ergebnisse, Finalrunde gefüllt (wie htFinalsFill), Fair-Play-Pokal
    row.plan[5].ta = 2; row.plan[5].tb = 1;
    [[2, 5, 1, 0], [1, 4, 2, 2], [0, 3, 3, 1]].forEach(([a, b, ta, tb], k) => Object.assign(row.plan[6 + k], { a, b, ta, tb }));
    row.config.fairplay = 4;
  }
  return row;
}
module.exports = { JETZT, TEAMS, zeile };
