/* v644 · Supabase-Sicherheitsprüfung: 31 SECURITY-DEFINER-Funktionen waren ohne Anmeldung
   aufrufbar, obwohl sie nur angemeldete Eltern, Kinder oder Trainer brauchen. Die Migration
   20260927_v644_rpc_ohne_anon.sql entzieht der Rolle anon das Ausführungsrecht.

   Die Gefahr dabei ist nicht der Entzug, sondern eine öffentliche Seite, die eine davon doch
   ohne Anmeldung aufruft – sie bekäme dann still einen Fehler statt Daten. Deshalb:
   a) Keine entzogene Funktion wird im Code mit dem nackten anon-Schlüssel aufgerufen
      („Bearer '+SB_KEY“ statt sbAuthHeaders()).
   b) Die Funktionen der öffentlichen Seiten (Liveticker, Turnier, Kind-Link, Stadionheft)
      und die Hilfsfunktionen der RLS-Regeln stehen nicht in der Entzugsliste.
   c) Jede Funktion der Liste gibt es im Code oder sie wird nirgends gerufen – kein Tippfehler,
      der eine öffentliche Funktion trifft, die gar nicht gemeint war. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], R = h.REPO;
  const mig = fs.readFileSync(path.join(R, "supabase/migrations/20260927_v644_rpc_ohne_anon.sql"), "utf8");
  const block = (name) => ((mig.match(new RegExp(name + "\\s+text\\[\\]\\s*:=\\s*array\\[([\\s\\S]*?)\\];")) || [])[1] || "");
  const namen = (b) => (b.match(/'([a-z_]+)\(/g) || []).map(x => x.slice(1, -1));
  const entzogen = namen(block("nur_angemeldet")), trigger = namen(block("nur_trigger"));
  if (entzogen.length < 20) probleme.push("Entzugsliste nicht gelesen: " + entzogen.length);

  const js = fs.readdirSync(R).filter(f => f.endsWith(".js")).map(f => [f, fs.readFileSync(path.join(R, f), "utf8")]);
  // a) Aufrufe mit dem nackten anon-Schlüssel
  entzogen.forEach(fn => {
    js.forEach(([f, t]) => {
      t.split("\n").forEach((z, i) => {
        if (z.includes("rpc/" + fn + "`") || z.includes("rpc/" + fn + "\"") || z.includes("rpc/" + fn + "'")) {
          const umfeld = z + (t.split("\n")[i + 1] || "");
          if (/Bearer\s*'\s*\+\s*SB_KEY|Bearer \$\{SB_KEY\}/.test(umfeld)) probleme.push(`a) ${f}:${i + 1} ruft ${fn} ohne Anmeldung`);
        }
      });
    });
  });
  // b) öffentliche Funktionen und RLS-Helfer bleiben offen
  const offen = ["einsatzzeiten_public", "matchday_by_token", "ticker_clap", "ticker_kader", "ticker_post",
    "heimturnier_ergebnis", "kind_termine", "rsvp_by_token", "reporter_public",
    "is_trainer", "is_kind_selbst", "ist_anonym", "ist_eigener_quizname", "kind_zeit_uebrig", "sitzung_gueltig"];
  offen.forEach(fn => { if (entzogen.includes(fn) || trigger.includes(fn)) probleme.push("b) " + fn + " darf anonym nicht gesperrt werden"); });
  // c) Trigger-Funktionen werden nie per RPC gerufen
  trigger.forEach(fn => js.forEach(([f, t]) => { if (t.includes("rpc/" + fn)) probleme.push(`c) ${f} ruft Trigger-Funktion ${fn}`); }));
  if (!/set_updated_at\(\)\s+set\s+search_path/.test(mig)) probleme.push("set_updated_at ohne festen Suchpfad");

  return h.ergebnis("v644 Datenbankfunktionen nur für Angemeldete", !probleme.length,
    probleme.concat([`${entzogen.length} Funktionen nur angemeldet, ${trigger.length} Trigger gesperrt, ${offen.length} bewusst offen`]));
};
