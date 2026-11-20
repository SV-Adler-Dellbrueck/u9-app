/* v919 · Die ganze Übungsbeschreibung (ablauf_lang, v917) geht in den nächtlichen Export (lesender Datenweg v804).
   a) Whitelist im Skript nennt ablauf_lang bei trainingsformen, uebungen.md zeigt sie als „Ganze Beschreibung“.
   b) Die Migration erweitert export.trainingsformen um ablauf_lang – durch export.ohne_namen, am Ende angehängt. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v919 Export: ganze Übungsbeschreibung für den Projekt-Chat";
  const probleme = [];
  const skript = fs.readFileSync(path.join(h.REPO, "tools/export-tagebuch.mjs"), "utf8");
  if (!/trainingsformen: \[[^\]]*"ablauf_lang"\]/.test(skript)) probleme.push("a) ablauf_lang fehlt in der Whitelist");
  if (!/Ganze Beschreibung:\*\* \$\{text\(f\.ablauf_lang\)\}/.test(skript)) probleme.push("a) uebungen.md zeigt die ganze Beschreibung nicht");
  const mig = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20261120_v919_export_ablauf_lang.sql"), "utf8");
  if (!/f\.created_at,\s*export\.ohne_namen\(f\.ablauf_lang\) as ablauf_lang\s*from public\.trainingsformen f/.test(mig)) probleme.push("b) Migration hängt ablauf_lang nicht maskiert am Ende an");
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme : ["a) Whitelist und uebungen.md · b) export.trainingsformen.ablauf_lang über ohne_namen"]);
};
