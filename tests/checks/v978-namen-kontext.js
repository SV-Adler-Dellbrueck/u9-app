/* v978 · Unbekannte Kindernamen im Zusammenhang („Eltern von X“, „Xs Eltern“) meldet der Export als namens_verdacht.
   Die Rechnung selbst prüft tests/sql/v978-namen-kontext.sql gegen ein echtes Postgres (Probelauf am Bestand 26.11.2026:
   genau ein Treffer, kein Fehlalarm). Hier: Die Migration hat beide Muster, gibt nur Zahlen weiter, behält den alten Teil
   (ähnliche Kader-Vornamen) und enthält keine Namen außer Trainern und erfundenen Beispielen. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const p = path.join(h.REPO, "supabase/migrations/20261126_v978_namen_kontext.sql");
  if (!fs.existsSync(p)) return h.ergebnis("v978 Namen im Zusammenhang", false, ["Migration fehlt"]);
  const m = fs.readFileSync(p, "utf8");
  const pruef = (bed, ok, nein) => bed ? zeilen.push(ok) : probleme.push(nein);
  pruef(/Eltern\|Mutter\|Vater\|Mama\|Papa\|Oma\|Opa\|Familie\|Bruder\|Schwester\|Freund\|Freundin\)\\s\+von\\s\+/.test(m), "a) Muster „Eltern/Mutter/… von X“", "a) Muster „… von X“ fehlt");
  pruef(/\(\?:’s\|''s\|’\|''\)\?\\s\+\(\?:Eltern/.test(m), "b) Muster Genitiv „Xs/X’ Eltern“", "b) Genitiv-Muster fehlt");
  pruef(/create or replace view export\.namen_verdacht/.test(m) && /aehnlich as/.test(m) && /export\.koelner\(w\.tok\)/.test(m), "c) alter Teil (ähnliche Kader-Vornamen) bleibt in der Ansicht", "c) alter Teil der Ansicht fehlt");
  pruef(/returns int/.test(m) && !/returns (text|setof text|table)/.test(m.split("kontext_verdacht")[1] || ""), "d) kontext_verdacht gibt nur eine Zahl zurück", "d) kontext_verdacht gibt mehr als eine Zahl zurück");
  pruef(/grant execute on function export\.kontext_verdacht\(text\) to adler_export_lese/.test(m) && /revoke all on function export\.kontext_verdacht\(text\) from public, anon, authenticated/.test(m), "e) Rechte: nur die Leserolle", "e) Rechte fehlen");
  const s = fs.readFileSync(path.join(h.REPO, "tests/sql/v978-namen-kontext.sql"), "utf8");
  pruef(/Nur erfundene Namen/.test(s) && /erwartet_3/.test(s), "f) SQL-Prüffall mit erfundenen Namen", "f) SQL-Prüffall fehlt");
  return h.ergebnis("v978 Unbekannte Kindernamen im Zusammenhang → namens_verdacht", !probleme.length, zeilen.concat(probleme));
};
