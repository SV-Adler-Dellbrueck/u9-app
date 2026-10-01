/* v706 · Eltern sehen die Nominierung aus Schritt ① „Wer kommt?“, nicht die Team-Zeile
   PO 01.10.: „Wo kann ich jetzt die Teams in die Nominierung in die Eltern-App übertragen, damit die Eltern
   sehen, ob ihr Kind nominiert ist?“ Befund: kind_nominierungsstatus las die erste Zeile des Tages – bei
   mehreren Teams die von Adler 1 (teamsZeilenSchreiben: „<datum>“, „__t2“, „__t3“). Für den 03.10. sahen
   9 von 13 nominierten Familien „diesmal pausiert“; nach dem Einspielen (01.10.) 13 von 13 „nominiert“.
   Die Funktion lebt in der Datenbank – geprüft wird die Migration, die sie festlegt:
   a) die neueste Fassung von kind_nominierungsstatus liest zuerst „<datum>__nom“
   b) die Ersatzsuche (ältere Spieltage ohne „__nom“) schließt die Team-Zeilen „__t…“ und „__teams“ aus
   c) die Berechtigung bleibt: nur Trainer oder Eltern des Kindes
   d) die Eltern-App fragt weiter genau diese Funktion (tdNomLoad) und zeigt kein Team */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [];
  const migDir = path.join(h.REPO, "supabase/migrations");
  const datei = fs.readdirSync(migDir).sort().filter(d => fs.readFileSync(path.join(migDir, d), "utf8").includes("function public.kind_nominierungsstatus")).pop();
  const sql = datei ? fs.readFileSync(path.join(migDir, datei), "utf8") : "";
  const f = sql.slice(sql.indexOf("function public.kind_nominierungsstatus"));
  if (!/n\.datum = p_datum \|\| '__nom'/.test(f)) probleme.push("a) liest die Nominierung „__nom“ nicht zuerst (" + datei + ")");
  const ersatz = f.slice(f.indexOf("if v_status is null"));
  if (!/not like '%\\_\\_t%'/.test(ersatz) || !/not like '%\\_\\_teams'/.test(ersatz)) probleme.push("b) Ersatzsuche nimmt Team-Zeilen mit");
  if (!/is_trainer\(\) or is_parent_of\(p_spieler\)/.test(f)) probleme.push("c) Berechtigung fehlt");
  const portal = fs.readFileSync(path.join(h.REPO, "md-eltern-portal.js"), "utf8");
  const td = portal.slice(portal.indexOf("async function tdNomLoad"), portal.indexOf("async function tdNomLoad") + 2500);
  if (!/rpc\/kind_nominierungsstatus/.test(td)) probleme.push("d) Eltern-App fragt die Funktion nicht mehr");
  if (/Adler \$\{|__t\d|__teams/.test(td)) probleme.push("d) Eltern-App zeigt ein Team");
  return h.ergebnis("v706 Eltern sehen die Nominierung aus „Wer kommt?“, auch bei mehreren Teams", !probleme.length,
    probleme.length ? probleme : ["Funktion aus " + datei + ": zuerst „__nom“, Ersatz ohne Team-Zeilen, Berechtigung unverändert"]);
};
