#!/usr/bin/env node
/* Ein Befehl vor jedem Versionsschritt:  node tests/run.js  [Filter]
   1. Jede JS-Datei parsen – ein SyntaxError loest script.onerror NICHT aus, der Loader
      meldet „fertig", waehrend die Datei nie lief. So blieb ein Modul zehn Versionen tot.
   2. Statik: MODUL_WACHE in beiden Einstiegen identisch und vollstaendig, jeder Wach-
      name in seiner Datei definiert, jede geladene Datei vorhanden und im PRECACHE,
      kein globaler Name in Welle 1 UND Welle 2.
   3. Die Pruefungen aus tests/checks/ am echten DOM (Playwright, Supabase-Attrappe). */
"use strict";
const fs = require("fs"), path = require("path"), { spawnSync } = require("child_process");
const h = require("./harness");
const REPO = h.REPO;                       // App-Dateien (REPO=/pfad/zur/alten/fassung fuer Gegenproben)
const HIER = __dirname;                     // das Pruefwerkzeug selbst bleibt immer das aktuelle
const filter = (process.argv[2] || "").toLowerCase();
const rot = t => `\x1b[31m${t}\x1b[0m`, gruen = t => `\x1b[32m${t}\x1b[0m`, grau = t => `\x1b[2m${t}\x1b[0m`;
const befunde = [];
const melde = (name, ok, zeilen = []) => {
  console.log(`${ok ? gruen("✓") : rot("✗")} ${name}`);
  zeilen.forEach(z => console.log(grau("    " + z)));
  if (!ok) befunde.push(name);
};
const lies = f => fs.readFileSync(path.join(REPO, f), "utf8");

/* 1 – Parsen */
const jsDateien = fs.readdirSync(REPO).filter(f => f.endsWith(".js")).sort();
const parseFehler = [];
const werkzeug = ["harness.js", "run.js"].concat(fs.readdirSync(path.join(HIER, "checks")).map(c => "checks/" + c)).map(f => path.join(HIER, f));
for (const f of jsDateien.map(f => path.join(REPO, f)).concat(werkzeug)) {
  const r = spawnSync(process.execPath, ["--check", f], { encoding: "utf8" });
  if (r.status !== 0) parseFehler.push(path.basename(f) + ": " + (r.stderr.split("\n").find(l => /Error/.test(l)) || "SyntaxError"));
}
melde(`Parsen: ${jsDateien.length} App-Dateien + Pruefwerkzeug`, !parseFehler.length, parseFehler);

/* 2 – Statik der Ladearchitektur */
(function statik() {
  const liste = (quelle, re) => { const m = quelle.match(re); return m ? m[1].split(",").map(s => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean) : null; };
  const trainer = lies("trainer/index.html"), eltern = lies("eltern/index.html"), sw = lies("sw.js");
  /* v592: Seit der Kinder-App gibt es DREI Einstiege. Ein Loader, den niemand prueft, ist
     genau die Luecke, aus der die Modul-Wache einmal entstanden ist. */
  const kinder = lies("kinder/index.html");
  const wacheT = (trainer.match(/const MODUL_WACHE=(\{[^}]*\})/) || [])[1], wacheE = (eltern.match(/const MODUL_WACHE=(\{[^}]*\})/) || [])[1];
  const wacheK = (kinder.match(/const MODUL_WACHE=(\{[^}]*\})/) || [])[1];
  const p = [];
  if (!wacheT || !wacheE) p.push("MODUL_WACHE in einem Einstieg nicht gefunden");
  else if (wacheT !== wacheE) p.push("MODUL_WACHE unterscheidet sich zwischen trainer/ und eltern/");
  if (!wacheK) p.push("MODUL_WACHE in kinder/ nicht gefunden");
  else if (wacheT && wacheK !== wacheT) p.push("MODUL_WACHE unterscheidet sich zwischen trainer/ und kinder/");
  const wache = wacheT ? JSON.parse(wacheT) : {};
  const welle1 = liste(trainer, /await lade\(\[([^\]]*)\]\)/) || [];
  const welle2 = liste(trainer, /const WELLE2=\[([^\]]*)\]/) || [];
  const alleE = liste(eltern, /const ALLE=\[([^\]]*)\]/) || [];
  const alleK = liste(kinder, /const ALLE=\[([^\]]*)\]/) || [];
  if (!alleK.length) p.push("kinder/index.html: keine Dateiliste (const ALLE=[…]) gefunden");
  /* Zeilenweise lesen statt an Kommas trennen: mehrere PRECACHE-Zeilen tragen einen
     Kommentar hinter dem Eintrag, und der frisst beim Trennen die naechste Zeile mit
     (gefunden v592, als die Einstiegsseiten selbst geprueft wurden). */
  const precacheDateien = new Set(
    ((sw.match(/const PRECACHE=\[([\s\S]*?)\n\];/) || ["", ""])[1])
      .split("\n").map(l => (l.match(/["']([^"']+)["']/) || [])[1]).filter(Boolean)
      .map(x => x.replace(/^\.\//, "")));
  /* v617: Vorlauf – Dateien, die als festes <script src> vor dem Loader im <body> stehen
     (intro.js). Sie laufen, bevor irgendeine Welle startet, gehören in ALLE drei Einstiege
     und in den PRECACHE. Keine Modul-Wache: ein Fehler dort kostet nur die Animation. */
  const vorlauf = [...trainer.matchAll(/<script src="([^"]+\.js)"><\/script>/g)].map(m => m[1]);
  for (const f of vorlauf) {
    if (!eltern.includes(`<script src="${f}">`)) p.push(`Vorlauf ${f} fehlt in eltern/index.html`);
    if (!kinder.includes(`<script src="${f}">`)) p.push(`Vorlauf ${f} fehlt in kinder/index.html`);
    if (!precacheDateien.has(f)) p.push(`${f} fehlt im PRECACHE (sw.js)`);
  }
  const module = jsDateien.filter(f => f !== "sw.js" && !welle1.includes(f) && !vorlauf.includes(f));
  // a) jedes Modul hat einen Wachnamen, der GANZ UNTEN in der Datei definiert ist
  for (const f of module) {
    const name = wache[f];
    if (!name) { p.push(`${f}: kein Eintrag in MODUL_WACHE`); continue; }
    const q = lies(f);
    const def = new RegExp(`(^|\\n)\\s*(async\\s+)?function\\s+${name}\\s*\\(|(^|\\n)\\s*(const|let|var)\\s+${name}\\s*=|window\\.${name}\\s*=`);
    const m = q.match(def);
    if (!m) { p.push(`${f}: Wachname ${name} ist dort nicht definiert`); continue; }
    // Stirbt die Datei mittendrin, fehlt genau die LETZTE Definition – nur die taugt als Wache.
    // Die Wache prueft typeof === "function", also zaehlt die letzte FUNKTION der Datei.
    const defs = [...q.matchAll(/(^|\n)(async\s+)?function\s+([A-Za-z_$][\w$]*)/g)];
    const letzte = defs.length ? defs[defs.length - 1][3] : null;
    if (letzte && letzte !== name) p.push(`${f}: Wachname ${name} ist nicht die letzte Funktion (das ist ${letzte}) – ein Abbruch darunter bliebe unbemerkt`);
  }
  Object.keys(wache).forEach(f => { if (!fs.existsSync(path.join(REPO, f))) p.push(`MODUL_WACHE nennt ${f}, Datei fehlt`); });
  // b) jede geladene Datei existiert und liegt im PRECACHE
  for (const f of new Set(welle1.concat(welle2, alleE, alleK))) {
    if (!fs.existsSync(path.join(REPO, f))) p.push(`Loader laedt ${f}, Datei fehlt`);
    if (!precacheDateien.has(f)) p.push(`${f} fehlt im PRECACHE (sw.js)`);
  }
  for (const f of jsDateien) if (f !== "sw.js" && !welle1.includes(f) && !welle2.includes(f) && !vorlauf.includes(f)) p.push(`${f} liegt im Repo, wird aber im Trainer-Loader nicht geladen`);
  // c) kein globaler Name in Welle 1 UND Welle 2
  const namen = f => { const s = new Set(); (lies(f).match(/(^|\n)(async\s+)?function\s+([A-Za-z_$][\w$]*)|(^|\n)(const|let|var)\s+([A-Za-z_$][\w$]*)/g) || []).forEach(x => { const m = x.match(/function\s+([\w$]+)|(?:const|let|var)\s+([\w$]+)/); s.add(m[1] || m[2]); }); return s; };
  const w1 = new Map(); welle1.forEach(f => namen(f).forEach(n => w1.set(n, f)));
  const doppelt = [];
  welle2.forEach(f => namen(f).forEach(n => { if (w1.has(n)) doppelt.push(`${n} (${w1.get(n)} und ${f})`); }));
  if (doppelt.length) p.push(...doppelt.map(d => "globaler Name in beiden Wellen: " + d));
  const bump = (sw.match(/const CACHE="u9i-adler-v(\d+)"/) || [])[1];
  /* v543: Die Funktionsübersicht stand auf v529, während die App bei v537 lag – acht
     Versionen, die niemandem aufgefallen sind, weil nichts sie gemeldet hat. Ein Dokument,
     dem man nicht glauben kann, ist schlechter als keines. Deshalb hängt es ab jetzt an
     derselben Zahl wie der Service Worker: weicht sie ab, ist dieser Lauf rot, und laut
     CLAUDE.md wird erst nach grünem Lauf hochgezählt.

     Bei einer reinen Fehlerbehebung kostet das einen Halbsatz in der Übersicht. Das ist
     der Preis dafür, dass man ihr trauen kann. */
  const uebDatei = "doku/Uebersicht_Funktionen-Adler-App_v1.md";
  let stand = null;
  try {
    stand = (lies(uebDatei).match(/\*\*Stand:\*\*\s*App-Version v(\d+)/) || [])[1] || null;
    if (!stand) p.push(`${uebDatei}: keine Zeile „**Stand:** App-Version vNNN" gefunden`);
    else if (stand !== bump) p.push(`${uebDatei} steht auf v${stand}, sw.js auf v${bump} – die Übersicht ist nachzuziehen`);
  } catch (e) { p.push(`${uebDatei} fehlt – die Funktionsübersicht gehört ins Repo`); }
  // Die Kopfzeile nennt den GELESENEN Stand, nicht den erwarteten – sonst verschwiege sie den Befund.
  // Die drei Einstiegsseiten selbst muessen im PRECACHE stehen, sonst ist die App offline tot.
  ["./", "./index.html", "./trainer/", "./eltern/", "./kinder/", "./manifest-kinder.json", "./icon-kinder.png", "./icon-kinder-maskable.png"]
    .forEach(e => { if (!precacheDateien.has(e.replace(/^\.\//, ""))) p.push(`${e} fehlt im PRECACHE (sw.js)`); });
  melde(`Ladearchitektur: ${Object.keys(wache).length} Module bewacht, ${welle1.length}+${welle2.length} Dateien im Trainer-Loader, ${alleK.length} in kinder/, Vorlauf ${vorlauf.join("+") || "–"}, PRECACHE ${precacheDateien.size} Eintraege, sw.js v${bump}, Übersicht v${stand || "?"}`, !p.length, p);
})();

/* 3 – Pruefungen am DOM */
(async () => {
  const dateien = fs.readdirSync(path.join(HIER, "checks")).filter(f => f.endsWith(".js") && f.toLowerCase().includes(filter)).sort();
  if (!dateien.length) { console.log(grau("keine Pruefung passt zu „" + filter + "“")); }
  let browser = null;
  try { browser = await h.chromium().launch(); }
  catch (e) { melde("Playwright/Chromium starten", false, [String(e.message || e)]); }
  if (browser) {
    const hb = { ...h, starten: o => h.starten({ ...(o || {}), browser }) };
    for (const f of dateien) {
      const t0 = Date.now();
      try {
        const r = await require(path.join(HIER, "checks", f))(hb);
        melde(`${r.name}  ${grau(f + " · " + ((Date.now() - t0) / 1000).toFixed(1) + " s")}`, r.ok, r.zeilen);
      } catch (e) { melde(`${f} abgebrochen`, false, [String(e.stack || e).split("\n").slice(0, 4).join(" | ")]); }
    }
    await browser.close();
  }
  console.log("");
  if (befunde.length) { console.log(rot(`${befunde.length} Befund(e):`)); befunde.forEach(b => console.log(rot("  - " + b))); process.exit(1); }
  console.log(gruen("Alles gruen – sw.js darf hochgezaehlt werden."));
})();
