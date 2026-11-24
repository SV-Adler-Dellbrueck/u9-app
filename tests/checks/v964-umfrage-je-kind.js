/* v964 · Hotfix 24.11.: Abstimmungen zählen je Kind einmal.
   Charles: „Beide Eltern … haben abgestimmt. Dann zählt es doppelt … Beide Eltern können zwar abstimmen, aber sollte nur
   einmal gezählt werden pro Kind.“
   Die neueste Migration, die rufe_umfrage_stand definiert, zählt „anzahl“ und „teilnehmer“ über Einheiten (Kind über
   eltern_kinder, sonst das Konto) – nicht über count(*) oder count(distinct user_id). Namen bleiben vollständig. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v964 Abstimmung zählt je Kind einmal (beide Elternteile dürfen abstimmen)";
  const migDir = path.join(h.REPO, "supabase/migrations");
  const name = fs.readdirSync(migDir).sort().filter(d => /function public\.rufe_umfrage_stand\(/.test(fs.readFileSync(path.join(migDir, d), "utf8"))).pop();
  const sql = name ? fs.readFileSync(path.join(migDir, name), "utf8") : "";
  const ab = sql.indexOf("function public.rufe_umfrage_stand("), f = sql.slice(ab, sql.indexOf("$$;", ab));
  const probleme = [];
  if (!/eltern_kinder/.test(f) || !/coalesce\('k'\|\|e\.spieler_id, 'u'\|\|s\.user_id\)/.test(f)) probleme.push("keine Zähleinheit je Kind (" + name + ")");
  if ((f.match(/count\(distinct x\.einheit\)/g) || []).length < 2) probleme.push("anzahl oder teilnehmer zählt nicht über die Einheit");
  if (/count\(distinct s2\.user_id\)/.test(f) || /else count\(\*\)/.test(f) || /\bcount\(\*\)::int,\s*\n\s*case when f\.anonym/.test(f)) probleme.push("zählt noch Konten");
  if (!/array_agg\(coalesce\(s\.name/.test(f)) probleme.push("Namen fehlen");
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme : [`${name}: anzahl und teilnehmer je Kind, Namen vollständig`]);
};
