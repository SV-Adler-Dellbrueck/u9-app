/* v760 · Push für neues Sprachlob (Eltern)
   Charles 04./05.10.: „Die Eltern sollen darüber eine Info erhalten“ – der Push war „später“, jetzt gebaut.
   Der Versand läuft im vorhandenen 5-Minuten-Lauf rufe-push; die Datenbank entscheidet (lob_push_faellig).
   a) rufe-push ruft lob_push_faellig auf, nimmt es in die Empfängerliste und vergibt je Kind eine eigene Kennung
   b) Die Migration legt das Protokoll lob_push_log ohne Zugriff für anon und authenticated an, vermerkt den Altbestand
      als gemeldet und gibt die Funktion nur dem Serverschlüssel
   c) Das Protokoll steht in der Sicherung (Pflicht 3) */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const lies = f => fs.readFileSync(path.join(h.REPO, f), "utf8");
  const fn = lies("supabase/functions/rufe-push/index.ts");
  if (!/rpc\("lob_push_faellig"\)/.test(fn) || !/\(lp \|\| \[\]\)[^\n]*tag: "lob-" \+ f\.titel/.test(fn) || !/lob: \(lp \|\| \[\]\)\.length/.test(fn)) probleme.push("a) rufe-push bindet lob_push_faellig nicht ein");
  zeilen.push("a) rufe-push: lob_push_faellig im Lauf, Kennung je Kind");
  const m = lies("supabase/migrations/20261005_v760_lob_push.sql");
  if (!/revoke all on public\.lob_push_log from anon, authenticated/.test(m) || !/enable row level security/.test(m) || !/insert into public\.lob_push_log[\s\S]*on conflict do nothing/.test(m)
    || !/revoke all on function public\.lob_push_faellig\(timestamptz\) from public, anon, authenticated/.test(m) || !/grant execute on function public\.lob_push_faellig\(timestamptz\) to service_role/.test(m)
    || !/not public\.push_ruht\(/.test(m) || !/interval '2 days'/.test(m)) probleme.push("b) Migration unvollständig (Zugriff, Altbestand, Ruhezeit oder Frist)");
  zeilen.push("b) Migration: Protokoll ohne Clientzugriff, Altbestand gemeldet, Funktion nur für service_role, Ruhezeit, zwei Tage");
  if (!/"lob_push_log"/.test(lies("views.js"))) probleme.push("c) lob_push_log fehlt in der Sicherung");
  zeilen.push("c) Sicherung enthält lob_push_log");
  return h.ergebnis("v760 Sprachlob-Push: Lauf, Migration, Sicherung", !probleme.length, probleme.length ? probleme : zeilen);
};
