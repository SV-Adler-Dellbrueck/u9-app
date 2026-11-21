/* v925 · Charles 21.11.: „Steckbrief im Projekt-Chat freigegeben“ und „Rückennummern wurden zugewiesen und nicht von den
   Spielern gewählt“.
   a) Migration: View export.steckbrief – Kind als Alias, jeder Freitext durch export.ohne_namen, nur Leserechte für
      adler_export_lese; nicht dabei: Spitzname, Rückennummer-Grund, Verein der weiteren Sportart, Schuhgröße, Foto-Pfad,
      Freigaben.
   b) Skript: Whitelist ohne diese Felder, steckbrief.md mit Position in Worten, Gruppen und Foto-Kacheln, ohne leere Zeilen.
   c) Die Frage „Warum genau diese Rückennummer?“ steht nicht mehr im Bogen und geht nicht mehr in den Porträt-Entwurf. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v925 Steckbrief im Export für den Projekt-Chat, Rückennummer-Frage entfällt";
  const probleme = [], zeilen = [];
  const mig = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20261121_v925_export_steckbrief.sql"), "utf8");
  const view = mig.slice(mig.indexOf("create or replace view export.steckbrief"), mig.indexOf("revoke all"));
  if (!/export\.kind_alias\(f\.spieler_id\) as kind/.test(view)) probleme.push("a) Kind nicht als Alias");
  for (const verboten of ["spitzname", "nummer_grund", "weiterer_sport_team", "schuh_groesse", "foto_path", "gallery_optin", "pfad"])
    if (new RegExp("\\b" + verboten + "\\b").test(view)) probleme.push(`a) ${verboten} steht in der View`);
  const roh = (view.match(/\bf\.([a-z_]+)\b(?! as kind)/g) || []).map(x => x.slice(2)).filter(c => !["spieler_id", "lieblingsposition", "starker_fuss"].includes(c));
  const maskiert = new Set((view.match(/export\.ohne_namen\(f\.([a-z_]+)\)/g) || []).map(x => x.match(/f\.([a-z_]+)/)[1]));
  const offen = [...new Set(roh)].filter(c => !maskiert.has(c));
  if (offen.length) probleme.push("a) Freitext ohne ohne_namen: " + offen.join(", "));
  if (!/grant select on export\.steckbrief to adler_export_lese/.test(mig) || !/revoke all on export\.steckbrief from public, anon, authenticated/.test(mig)) probleme.push("a) Rechte nicht wie bei den anderen Export-Views");
  const { WHITELIST, renderSteckbrief, spaltenAuswahl } = await import(path.join(h.REPO, "tools/export-tagebuch.mjs"));
  const wl = WHITELIST.steckbrief || [];
  if (!wl.length || ["spitzname", "nummer_grund", "weiterer_sport_team", "schuh_groesse", "foto_path"].some(x => wl.includes(x))) probleme.push("b) Whitelist: " + wl.join(","));
  if (!/from export\."steckbrief" order by kind/.test(spaltenAuswahl("steckbrief"))) probleme.push("b) Abfrage: " + spaltenAuswahl("steckbrief"));
  const md = renderSteckbrief({ steckbrief: [{ kind: "Kind C", lieblingsposition: "alle_ausser_tw", starker_fuss: "links", hobby: "Lego", superkraft: "fliegen", foto_zwecke: ["aktion", "gemalt"] }] }, "2026-11-21");
  if (!/### Kind C/.test(md) || !/Lieblingsposition:\*\* alle außer Torwart/.test(md) || !/Hobby: Lego/.test(md) || !/Superkraft: fliegen/.test(md) || !/Fotos in der App:\*\* Beim Fußball, Selbst gemalt/.test(md)) probleme.push("b) steckbrief.md: " + md.slice(0, 300));
  if (/Freundebuch/.test(md) || /Lieblingsfarbe/.test(md)) probleme.push("b) leere Gruppe oder Zeile ausgegeben");
  if (!/Social Media/.test(md)) probleme.push("b) Hinweis „nur fürs Trainerteam“ fehlt");
  const skript = fs.readFileSync(path.join(h.REPO, "tools/export-tagebuch.mjs"), "utf8");
  if (!/"steckbrief\.md": renderSteckbrief\(d, stand\)/.test(skript)) probleme.push("b) steckbrief.md wird nicht geschrieben");
  const ff = fs.readFileSync(path.join(h.REPO, "md-fanfakten.js"), "utf8"), views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  if (/\["nummer_grund",/.test(ff) || /k==="nummer_grund"/.test(ff)) probleme.push("c) Rückennummer-Frage steht noch im Bogen");
  const heft = (views.match(/const HEFT_PORTRAET_FELDER=\[[^\]]*\]/) || [""])[0];
  if (!heft || /nummer_grund/.test(heft)) probleme.push("c) Rückennummer geht noch in den Porträt-Entwurf");
  zeilen.push(`a) View mit Alias, ${maskiert.size} Freitexte über ohne_namen, nur Leserechte · b) ${wl.length} Spalten, steckbrief.md mit Position, Gruppen, Foto-Kacheln · c) Rückennummer-Frage entfernt`);
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
