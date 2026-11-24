/* v963 · Charles 24.11.: „Ich kann in der Eltern-App … bei der Abstimmung klicken, aber ich sehe kein Ergebnis.“ v829 hatte in
   rufe_umfrage_stand den Teil „archiviert_am is null or …“ verloren – Eltern sahen seitdem bei jeder Abstimmung 0.
   Geprüft wird die jüngste Migration, die rufe_umfrage_stand definiert: Sie muss nicht archivierte Rufe für alle zeigen,
   die den Raum sehen, und archivierte nur Archiv-Berechtigten. (Gegen die echte Datenbank am 24.11. mit Eltern-Konto geprüft.) */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v963 Abstimmungen: Eltern sehen das Ergebnis (rufe_umfrage_stand ohne Archiv-Sperre für laufende Rufe)";
  const dir = path.join(h.REPO, "supabase", "migrations");
  const mit = fs.readdirSync(dir).filter(f => f.endsWith(".sql")).sort()
    .filter(f => /function public\.rufe_umfrage_stand\s*\(/i.test(fs.readFileSync(path.join(dir, f), "utf8")));
  const letzte = mit[mit.length - 1] || "";
  const sql = letzte ? fs.readFileSync(path.join(dir, letzte), "utf8") : "";
  const teil = sql.slice(sql.search(/function public\.rufe_umfrage_stand\s*\(/i));
  const ok = /\(\s*n\.archiviert_am is null or public\.rufe_darf_archiv\(n\.raum_id\)\s*\)/.test(teil) && /rufe_raum_sichtbar\(n\.raum_id\)/.test(teil);
  return h.ergebnis(titel, ok, [ok ? `jüngste Fassung in ${letzte}: laufende Rufe für alle mit Raumzugriff, archivierte nur Archiv-Berechtigten` : `${letzte}: Bedingung fehlt – Eltern sähen 0`]);
};
