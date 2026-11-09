/* v818 · Name des festen Caches aus dem Inhalt der festen Dateien.

   Schriften, Bibliotheken und Bilder ändern sich fast nie. Bis v817 lagen sie im Versionscache
   und wurden mit jeder Version neu geladen (rund 1 MB je Gerät und Sprung). Seit v818 liegen sie
   in einem eigenen Cache, den ein Versionssprung nicht anfasst (sw.js: FEST_CACHE, istFest).

   Die Gefahr dabei: Wer eine feste Datei ändert (neues Icon, neues Logo), ohne dass der Cache
   einen neuen Namen bekommt, lässt alle Geräte für immer auf der alten Datei sitzen. Deshalb
   trägt der Name keine Zählnummer, die man vergessen kann, sondern die Prüfsumme der Dateien –
   und der Prüflauf (tests/checks/v818-fester-cache.js) wird rot, wenn sie nicht stimmt.

   Aufruf: node tools/fest-cache.js [--schreiben]   (ohne Schalter: nur berichten) */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm"), crypto = require("crypto");

/* sw.js ausführen (ohne Browser) und die drei Angaben herauslesen */
function ausSw(root) {
  const quelle = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const ctx = vm.createContext({ URL, console, self: { addEventListener() {}, registration: { scope: "https://app.test/" }, skipWaiting() {} } });
  vm.runInContext(quelle, ctx);
  return vm.runInContext("({PRECACHE:PRECACHE,FEST_CACHE:FEST_CACHE,istFest:istFest})", ctx);
}

/* Die festen Einträge des PRECACHE, sortiert, als Pfade ab Repo-Wurzel */
function festListe(root) {
  const { PRECACHE, istFest } = ausSw(root);
  return PRECACHE.filter(u => istFest(u)).map(u => u.replace(/^\.\//, "")).sort();
}

function erwarteterName(root) {
  const h = crypto.createHash("sha256");
  for (const f of festListe(root)) { h.update(f + "\0"); h.update(fs.readFileSync(path.join(root, f))); h.update("\0"); }
  return "adler-fest-" + h.digest("hex").slice(0, 8);
}

function istName(root) { return ausSw(root).FEST_CACHE; }

/* Setzt den Namen in sw.js; liefert true, wenn sich etwas geändert hat */
function schreiben(root) {
  const soll = erwarteterName(root), datei = path.join(root, "sw.js");
  const alt = fs.readFileSync(datei, "utf8");
  const neu = alt.replace(/const FEST_CACHE="[^"]*";/, 'const FEST_CACHE="' + soll + '";');
  if (neu === alt) return false;
  fs.writeFileSync(datei, neu);
  return true;
}

module.exports = { festListe, erwarteterName, istName, schreiben };

if (require.main === module) {
  const ROOT = path.resolve(__dirname, "..");
  const liste = festListe(ROOT), soll = erwarteterName(ROOT), ist = istName(ROOT);
  const kb = liste.reduce((s, f) => s + fs.statSync(path.join(ROOT, f)).size, 0) / 1024;
  console.log("Feste Dateien: " + liste.length + " (" + kb.toFixed(0) + " KB) · Name in sw.js: " + ist + " · aus dem Inhalt: " + soll);
  if (ist === soll) console.log("Fester Cache ist aktuell.");
  else if (process.argv.includes("--schreiben")) { schreiben(ROOT); console.log("sw.js: FEST_CACHE auf " + soll + " gesetzt."); }
  else { console.log("Zum Übernehmen: node tools/fest-cache.js --schreiben"); process.exit(1); }
}
