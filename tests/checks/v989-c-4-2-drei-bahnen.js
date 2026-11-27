/* v989 · C-Lizenz 4.2, Abgabe des Teams: „Lehrgang – Drei Bahnen, klare Zuständigkeit“ (Charles 27.11.2026).
   Text der Abgabe und Übungstext in der App sind derselbe Text. Neu: coaching und varianten ganz, in ablauf_lang die
   Abschnitte ESKALATIONSSTUFEN und WORAUF ACHTEN (Trainerrollen, Altersanpassung U9/U13/U17). Wortlaut der
   DFB-Leitlinien laut Handout C-Lizenz (gegnerorientiert, näher dem Gegner), nicht die BDFL-Fassung 2015.
   Die Übung stand noch nicht in der Datenbank – der Abgleich legt sie mit diesem Text an (Datenweg, kein Code).
   a) coaching, varianten und die zwei Abschnitte wörtlich (Prüfsumme), die anderen zehn Überschriften und ihre Texte
      unverändert, ebenso kurz, feld und spieler (ablauf und Skizze: v989-drei-bahnen-scheiben.js)
   b) keine Fundstelle „mannorientiert“ oder „am Mann“ in den vier Übungen aus C-4.2
   c) nachtrag-4.json und bibliothek.json gleich; Stand hochgesetzt */
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");
module.exports = async function (h) {
  const titel = "v989 C-4.2 Drei Bahnen: Coaching, Variationen, Trainerrollen und Altersanpassung wörtlich";
  const probleme = [], zeilen = [];
  const NAME = "Lehrgang – Drei Bahnen, klare Zuständigkeit";
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const nt = JSON.parse(fs.readFileSync(path.join(h.REPO, "doku/auftrag-lehrgang-c-4-2/nachtrag-4.json"), "utf8")).uebungen[0];
  const u = bib.uebungen.find(x => x.name === NAME);
  if (!u) return h.ergebnis(titel, false, ["Übung fehlt in der Bibliothek"]);
  const sum = s => crypto.createHash("sha256").update(String(s || "")).digest("hex").slice(0, 16);
  const abschnitt = (txt, kopf) => { const t = String(txt || "").split("\n"); const i = t.indexOf(kopf); if (i < 0) return null;
    const rest = t.slice(i + 1); const j = rest.findIndex(l => /^[A-ZÄÖÜ][A-ZÄÖÜ \-]+$/.test(l)); return (j < 0 ? rest : rest.slice(0, j)).join("\n").trim(); };
  // a)
  const soll = { coaching: "3c5edd28c2973d14", varianten: "2b1da01ab0fbee87", esk: "8f8bbcbbc71440fe", worauf: "a64c1072b298ac31" };
  if (sum(u.coaching) !== soll.coaching) probleme.push(`a) coaching nicht wörtlich (${String(u.coaching || "").length} Zeichen)`);
  if (sum(u.varianten) !== soll.varianten) probleme.push(`a) varianten nicht wörtlich (${String(u.varianten || "").length} Zeichen)`);
  if (sum(abschnitt(u.ablauf_lang, "ESKALATIONSSTUFEN")) !== soll.esk) probleme.push("a) ESKALATIONSSTUFEN nicht wörtlich");
  if (sum(abschnitt(u.ablauf_lang, "WORAUF ACHTEN")) !== soll.worauf) probleme.push("a) WORAUF ACHTEN nicht wörtlich");
  const KOEPFE = ["ZIEL", "KURZBESCHREIBUNG", "AUFBAU", "ABLAUF", "REGELN", "COACHING-ASPEKTE", "ESKALATIONSSTUFEN", "ZUSATZREGELN", "VORTEILE", "NACHTEILE", "TYPISCHE FEHLERBILDER", "WORAUF ACHTEN"];
  const koepfe = String(u.ablauf_lang || "").split("\n").filter(l => /^[A-ZÄÖÜ][A-ZÄÖÜ \-]+$/.test(l));
  if (koepfe.join("|") !== KOEPFE.join("|")) probleme.push("a) Überschriften verändert: " + koepfe.join(", "));
  /* ablauf und Skizze ändert der Scheiben-Auftrag (Hütchen im Feld → Teller); geprüft in v989-drei-bahnen-scheiben.js */
  const UNVERAENDERT = {"kurz": "c1576e2272904aaa", "feld": "4a38e4d8b5ccd6d6", "spieler": "6b51d431df5d7f14"};
  Object.keys(UNVERAENDERT).forEach(k => { const v = u[k];
    if (sum(v) !== UNVERAENDERT[k]) probleme.push(`a) ${k} verändert`); });
  // b)
  bib.uebungen.filter(x => /^Lehrgang – (Zwei-Seiten-Spiel verteidigen|Fünf-Sekunden-Jagd|Erster attackiert, Zweiter sichert|Drei Bahnen, klare Zuständigkeit)$/.test(x.name)).forEach(x => {
    const txt = JSON.stringify(x); if (/mannorientiert|am Mann/i.test(txt)) probleme.push(`b) „${x.name}“ enthält „mannorientiert“ oder „am Mann“`); });
  // c)
  const norm = x => JSON.stringify(x, Object.keys(x).sort());
  if (norm(u) !== norm(nt)) probleme.push("c) nachtrag-4.json und bibliothek.json weichen voneinander ab");
  if (String(bib.stand) < "2026-11-27-3") probleme.push(`c) Stand „${bib.stand}“ nicht hochgesetzt`);
  const kn = h.KINDER.filter(n => JSON.stringify(u).includes(n)); if (kn.length) probleme.push("Kindername: " + kn.join(", "));
  zeilen.push(`coaching ${u.coaching.length} · varianten ${u.varianten.length} · ablauf_lang ${u.ablauf_lang.length} Zeichen · 12 Überschriften · kurz, feld, spieler unverändert`);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
