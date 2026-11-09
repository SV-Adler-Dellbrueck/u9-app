/* v818 · Icon-Schrift auf das zuschneiden, was die App wirklich zeigt.

   Tabler Icons bringt 5.718 Zeichen mit; die App nutzt rund 150. Bis v817 lud jedes Gerät
   bei jeder Version die volle Schrift (865 KB) und die volle Klassenliste (238 KB) neu.
   Dieses Werkzeug liest die Vollfassung aus tools/quelle/ und schreibt nach vendor/ nur,
   was im Code vorkommt.

   Was als „genutzt“ zählt:
   a) jedes ti-NAME, das irgendwo im App-Code steht (JS, HTML, CSS, uebungen/*.json,
      Edge Functions) und ein echter Tabler-Name ist;
   b) Namen, die erst zur Laufzeit zusammengesetzt werden ("ti ti-" + (an ? "a" : "b")):
      alle Zeichenketten derselben Zeile, die echte Tabler-Namen sind. Steht dort keine,
      lässt sich die Stelle nicht auflösen – der Prüflauf (tests/checks/v818-icons-zuschnitt.js)
      wird dann rot. Also: die möglichen Namen in dieselbe Zeile schreiben.
   In der Datenbank stehen keine Icon-Klassen (geprüft zu v818 über alle Textspalten).

   Neues Icon im Code?  →  node tools/icons-zuschneiden.js --schreiben
   Voraussetzung: Python mit fontTools und brotli (pip install fonttools brotli).
   Aufruf: node tools/icons-zuschneiden.js [--schreiben]   (ohne Schalter: nur berichten) */
"use strict";
const fs = require("fs"), path = require("path"), { spawnSync } = require("child_process");

const VOLL_CSS = "tools/quelle/tabler-icons-voll.min.css";
const VOLL_FONT = "tools/quelle/tabler-icons-voll.woff2";
const ZIEL_CSS = "vendor/tabler-icons.min.css";
const ZIEL_FONT = "vendor/fonts/tabler-icons.woff2";
const AUSGELASSEN = new Set(["node_modules", ".git", ".wissen", "vendor", "tests", "tools", "doku", "audio"]);
const ENDUNGEN = /\.(js|mjs|ts|html|css|json)$/;
const REGEL = /\.ti-([a-z0-9-]+):before\{content:"\\([0-9a-f]+)"\}/g;

/* Name → Codepunkt (hex) aus einer Tabler-CSS */
function regeln(css) {
  const m = new Map();
  let t; REGEL.lastIndex = 0;
  while ((t = REGEL.exec(css))) m.set(t[1], t[2]);
  return m;
}

function dateien(root, dir, liste) {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (e.name.startsWith(".") && e.name !== ".") { if (AUSGELASSEN.has(e.name) || e.isDirectory()) continue; }
    if (AUSGELASSEN.has(e.name)) continue;
    const rel = dir ? dir + "/" + e.name : e.name;
    if (e.isDirectory()) dateien(root, rel, liste);
    else if (ENDUNGEN.test(e.name) && e.name !== "package-lock.json") liste.push(rel);
  }
  return liste;
}

/* Liefert { genutzt: Set<Name>, ungeloest: ["datei:zeile"], voll: Map } */
function sammeln(root) {
  const voll = regeln(fs.readFileSync(path.join(root, VOLL_CSS), "utf8"));
  const genutzt = new Set(), ungeloest = [];
  const MIT_PRAEFIX = /(?<![a-z0-9-])ti-([a-z0-9]+(?:-[a-z0-9]+)*)/g;
  const DYNAMISCH = /ti-(?:\$\{|["'`]\s*(?:\+|\.concat))/;
  const LITERAL = /["'`]([a-z0-9]+(?:-[a-z0-9]+)*)["'`]/g;
  for (const rel of dateien(root, "", [])) {
    const zeilen = fs.readFileSync(path.join(root, rel), "utf8").split("\n");
    zeilen.forEach((z, i) => {
      let t; MIT_PRAEFIX.lastIndex = 0;
      while ((t = MIT_PRAEFIX.exec(z))) if (voll.has(t[1])) genutzt.add(t[1]);
      if (DYNAMISCH.test(z)) {
        let n = 0; LITERAL.lastIndex = 0;
        while ((t = LITERAL.exec(z))) if (voll.has(t[1])) { genutzt.add(t[1]); n++; }
        if (!n) ungeloest.push(rel + ":" + (i + 1));
      }
    });
  }
  return { genutzt, ungeloest, voll };
}

function kopf() {
  return '/* Tabler Icons 3.19.0 (MIT, vendor/lizenzen/tabler-icons-MIT.txt) – seit v642 selbst ausgeliefert, vorher cdn.jsdelivr.net.\n' +
    '   Seit v818 ein ZUSCHNITT: nur die Icons, die im Code vorkommen. Nicht von Hand bearbeiten –\n' +
    '   neues Icon?  node tools/icons-zuschneiden.js --schreiben  (Vollfassung: tools/quelle/). */\n' +
    '/*!\n * Tabler Icons 3.19.0 by tabler - https://tabler.io\n * License - https://github.com/tabler/tabler-icons/blob/master/LICENSE\n */';
}

function cssBauen(vollCss, voll, genutzt) {
  const von = vollCss.indexOf("@font-face"), bis = vollCss.indexOf(".ti-");
  if (von < 0 || bis < 0) throw new Error("Vollfassung der CSS hat nicht die erwartete Form.");
  const namen = [...genutzt].sort();
  return kopf() + vollCss.slice(von, bis) + namen.map(n => '.ti-' + n + ':before{content:"\\' + voll.get(n) + '"}').join("") + "\n";
}

/* Zuschnitt über fontTools. Die Ligaturtabelle (GSUB: „Name → Zeichen“) wird VOR dem Zuschneiden
   entfernt: die App setzt Icons nur über die CSS-Klasse, und fontTools kann die Tabelle dieser
   Schrift nicht lesen – pyftsubset bricht daran ab, auch mit --drop-tables. Deshalb der eigene Aufruf. */
const PY = [
  "import sys",
  "from fontTools.ttLib import TTFont",
  "from fontTools.subset import Subsetter, Options",
  "quelle, ziel, codes = sys.argv[1], sys.argv[2], sys.argv[3]",
  "f = TTFont(quelle)",
  "for t in ('GSUB', 'GPOS', 'GDEF'):",
  "    if t in f: del f[t]",
  "o = Options()",
  "o.flavor = 'woff2'",
  "o.notdef_outline = True",
  "s = Subsetter(o)",
  "s.populate(unicodes=[int(c, 16) for c in codes.split(',')])",
  "s.subset(f)",
  "f.flavor = 'woff2'",
  "f.save(ziel)",
].join("\n");

function schriftBauen(root, voll, genutzt) {
  const codes = [...genutzt].map(n => voll.get(n)).join(",");
  const args = ["-c", PY, path.join(root, VOLL_FONT), path.join(root, ZIEL_FONT), codes];
  let letzter = "";
  for (const py of ["python3", "python3.13", "python"]) {
    const r = spawnSync(py, args, { encoding: "utf8" });
    if (!r.error && r.status === 0) return;
    letzter = (r.stderr || "") + (r.error || "");
  }
  throw new Error("Zuschnitt der Schrift fehlgeschlagen (pip install fonttools brotli?):\n" + letzter);
}

module.exports = { sammeln, regeln, VOLL_CSS, VOLL_FONT, ZIEL_CSS, ZIEL_FONT };

if (require.main === module) {
  const ROOT = path.resolve(__dirname, "..");
  const { genutzt, ungeloest, voll } = sammeln(ROOT);
  console.log("Tabler-Icons gesamt: " + voll.size + " · im Code genutzt: " + genutzt.size);
  if (ungeloest.length) {
    console.error("Nicht auflösbar (Name wird zusammengesetzt, aber keine Tabler-Namen in der Zeile):\n  " + ungeloest.join("\n  "));
    process.exit(1);
  }
  const istCss = fs.existsSync(path.join(ROOT, ZIEL_CSS)) ? fs.readFileSync(path.join(ROOT, ZIEL_CSS), "utf8") : "";
  const ist = new Set(regeln(istCss).keys());
  const neu = [...genutzt].filter(n => !ist.has(n)).sort(), weg = [...ist].filter(n => !genutzt.has(n)).sort();
  if (neu.length) console.log("Fehlt im Zuschnitt: " + neu.join(", "));
  if (weg.length) console.log("Nicht mehr gebraucht: " + weg.join(", "));
  if (!neu.length && !weg.length) console.log("Zuschnitt ist aktuell.");
  if (process.argv.includes("--schreiben")) {
    schriftBauen(ROOT, voll, genutzt);
    fs.writeFileSync(path.join(ROOT, ZIEL_CSS), cssBauen(fs.readFileSync(path.join(ROOT, VOLL_CSS), "utf8"), voll, genutzt));
    const kb = f => (fs.statSync(path.join(ROOT, f)).size / 1024).toFixed(1) + " KB";
    console.log("Geschrieben: " + ZIEL_FONT + " (" + kb(ZIEL_FONT) + "), " + ZIEL_CSS + " (" + kb(ZIEL_CSS) + ")");
    // Der feste Cache trägt die Prüfsumme seiner Dateien im Namen – sonst behielten Geräte die alte Schrift.
    const fest = require("./fest-cache.js");
    console.log(fest.schreiben(ROOT) ? "sw.js: FEST_CACHE auf " + fest.erwarteterName(ROOT) + " gesetzt." : "sw.js: FEST_CACHE unverändert.");
  } else if (neu.length || weg.length) {
    console.log("Zum Übernehmen: node tools/icons-zuschneiden.js --schreiben");
  }
}
