/* v707 · Prüfung 01.10.2026 („Such Fehler in der App und dem Aufbau und der Struktur“), Kachel „Alles in einem Paket“
   a) Zählungen (Anwesenheitsquote, Saison-Cockpit, Entwicklungsbericht, Adler-Karte) lesen nur „<datum>__nom“
      bis heute – nicht die Team-Zeilen („<datum>“, „__t2“, „__t3“), in denen jedes Kind erneut steht
   b) Datum in Ortszeit: isoLokal, nächstes Training (Mo/Fr) ist nicht der Vortag, Wochen-Spanne Mo–So,
      kein `new Date().toISOString().slice(0,10)` mehr in der App
   c) Hilfe: „Heimspiel & Festival“ öffnet htOpen() (vorher Absatz im Knopf → SyntaxError), „Kader“ führt
      zum Kader (vorher „Einheit bewerten“); keine „drei Phasen“ mehr, Saisonstart sieben Schritte
   d) Datenbank (Migration): Adler-Karte und Rückblick zählen Spiele aus „__nom“, Rückblick ohne Kapitänsbinde,
      Ticker-Helfer liest „__nom“, Einsatzzeiten für alle Teams des Tages, Turnierergebnisse für Eltern,
      Heimturnier-Schreibcode nur für Trainer (Spalte entzogen, heimturnier_code), Quiz nur eigene Kinder + Summe
   e) Client dazu: Live-Kachel liest matchday öffentlich, Heimturnier ohne „select=*“ + Code per RPC,
      Quiz-Barometer aus quiz_team_summe, Rückblick nur mit Ballaktionen, Eltern-Kalender mit Wellen-Schutz
   f) CLAUDE.md: Vornamen öffentlich erlaubt (Beschluss 01.10.); tote Funktionen entfernt */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const lies = p => fs.readFileSync(path.join(h.REPO, p), "utf8");
  const views = lies("views.js"), core = lies("core.js");
  // a)
  if (/rest\/v1\/nominierungen\?select=data/.test(views)) probleme.push("a) views.js zählt noch über alle nominierungen-Zeilen");
  if ((views.match(/nomZeilenPfad\(/g) || []).length < 4) probleme.push("a) nicht alle vier Zählungen lesen nomZeilenPfad");
  if (!/datum=like\.\*__nom/.test(core)) probleme.push("a) nomZeilenPfad filtert nicht auf __nom");
  const teams = lies("md-teams.js");
  if (!/replace\(\/__nom\$\/,""\)/.test(teams)) probleme.push("a) Pausen-Vorschlag zählt __nom-Spieltage nicht");
  // b) Datum in Ortszeit – mit echter Zeitzone gerechnet
  const altTZ = process.env.TZ; process.env.TZ = "Europe/Berlin";
  try {
    const ctx = { console };
    vm.createContext(ctx);
    const fn = (src, name) => { const i = src.search(new RegExp("^function " + name + "\\(", "m")); let d = 0, k = src.indexOf("{", i); for (; k < src.length; k++) { if (src[k] === "{") d++; else if (src[k] === "}" && --d === 0) break; } return src.slice(i, k + 1); };
    vm.runInContext(fn(core, "isoLokal") + "\n" + fn(lies("md-kalender.js"), "tmNextTrainingDate") + "\n" + fn(lies("boot.js"), "tpWocheSpanne"), ctx);
    const w = vm.runInContext('tpWocheSpanne("2026-10-03")', ctx);
    if (!w || w.von !== "2026-09-28" || w.bis !== "2026-10-04") probleme.push("b) Woche zum 03.10. falsch: " + JSON.stringify(w));
    if (vm.runInContext('isoLokal(new Date(2026,9,2))', ctx) !== "2026-10-02") probleme.push("b) isoLokal liefert nicht den Ortstag");
    const t = vm.runInContext("tmNextTrainingDate()", ctx), wd = new Date(t + "T12:00:00").getDay();
    if (wd !== 1 && wd !== 5) probleme.push("b) nächstes Training kein Montag/Freitag: " + t);
    zeilen.push(`b) Woche 03.10. ${w && w.von}–${w && w.bis} · nächstes Training ${t}`);
  } finally { if (altTZ === undefined) delete process.env.TZ; else process.env.TZ = altTZ; }
  const reste = fs.readdirSync(h.REPO).filter(f => f.endsWith(".js") && f !== "sw.js")
    .filter(f => /new Date\(\)\.toISOString\(\)\.slice\(0,\s*10\)/.test(lies(f)));
  if (reste.length) probleme.push("b) UTC-„heute“ noch in " + reste.join(", "));
  // c)
  const heim = views.slice(views.indexOf('{t:"Heimspiel & Festival planen"'));
  if (!/run:"htOpen\(\)"\}/.test(heim.slice(0, heim.indexOf("\n")))) probleme.push("c) Hilfe „Heimspiel & Festival“ startet nicht htOpen()");
  const kad = views.slice(views.indexOf('{t:"Kader"'));
  if (!/go:"kader"\}/.test(kad.slice(0, kad.indexOf("\n")))) probleme.push("c) Hilfe „Kader“ führt nicht zum Kader");
  if (/Spieltag in drei Phasen|Sechs Schritte für den Übergang|nie zwischen 21 und 7 Uhr/.test(views)) probleme.push("c) veraltete Hilfetexte");
  // d)
  const mig = lies("supabase/migrations/20261001_v707_zaehlungen_rechte.sql");
  const muss = [[/my_child_card\(bigint\)[\s\S]*?__nom/, "Adler-Karte"], [/my_child_card_kind\(bigint\)[\s\S]*?__nom/, "Adler-Karte (Kind)"],
    [/ticker_kader[\s\S]*?v_basis \|\| '__nom'/, "Ticker-Helfer"], [/get_child_wrapped[\s\S]*?aktion in \('pass'/, "Rückblick ohne Kapitänsbinde"],
    [/einsatzzeiten_public[\s\S]*?left\(e\.datum,10\) = left\(p_datum,10\)/, "Einsatzzeiten alle Teams"],
    [/create policy turnier_spiele_mitglied_lesen/, "Turnierergebnisse für Eltern"],
    [/revoke select on public\.heimturnier from authenticated;\s*grant select \(id, slug, name, datum, ort, config, teams, plan, aktiv, created_at, updated_at\)/, "Heimturnier-Code entzogen"],
    [/function public\.heimturnier_code[\s\S]*?is_trainer\(\)/, "heimturnier_code nur Trainer"],
    [/"quiz select auth"[\s\S]*?ist_eigener_quizname\(player\)/, "Quiz nur eigene"], [/function public\.quiz_team_summe/, "Quiz-Summe"]];
  muss.forEach(([re, t]) => { if (!re.test(mig)) probleme.push("d) Migration: " + t + " fehlt"); });
  if (/edit_code/.test(mig.replace(/--.*$/gm, "").split("grant select (")[1]?.split(")")[0] || "")) probleme.push("d) edit_code wieder freigegeben");
  // e)
  const kasse = lies("md-kasse.js"), tp = lies("md-turnierplan.js"), quiz = lies("quiz.js"), portal = lies("md-eltern-portal.js");
  const live = kasse.slice(kasse.indexOf("matchday?datum=in."), kasse.indexOf("matchday?datum=in.") + 200);
  if (!/'Bearer '\+SB_KEY/.test(live)) probleme.push("e) Live-Kachel liest matchday nicht öffentlich");
  if (/heimturnier\?id=eq\.\$\{id\}&select=\*/.test(tp) || !/rpc\/heimturnier_code/.test(tp)) probleme.push("e) Heimturnier lädt noch select=* oder ohne Code-RPC");
  if (!/rpc\/quiz_team_summe/.test(quiz) || !/_tqTeamSumme/.test(quiz)) probleme.push("e) Quiz-Barometer ohne Summe vom Server");
  if (!/total=Object\.keys\(GRUSS_AKT\)/.test(kasse)) probleme.push("e) Rückblick zählt Kapitänsbinde mit");
  if (!/typeof icsLocalStart!=="function"/.test(portal)) probleme.push("e) Eltern-Kalender ohne Wellen-Schutz");
  // f)
  if (!/stehen Kinder nur mit Vornamen/.test(lies("CLAUDE.md"))) probleme.push("f) CLAUDE.md nicht nachgezogen");
  ["elternInviteTeilen", "elternInviteTextZeigen", "rotInit", "fairplayOpen", "tmTurnierModusOpen"].forEach(n => {
    if (new RegExp("function " + n + "\\(").test(fs.readdirSync(h.REPO).filter(f => f.endsWith(".js")).map(lies).join("\n"))) probleme.push("f) tote Funktion noch da: " + n);
  });
  zeilen.push("a) Zählungen über __nom · d) Migration mit " + muss.length + " Teilen · e) Client nachgezogen");
  return h.ergebnis("v707 Prüfung 01.10.: Zählungen, Rechte, Datum, Hilfe", !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
