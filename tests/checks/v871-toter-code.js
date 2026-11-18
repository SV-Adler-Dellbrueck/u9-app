/* v871 · Toter Code entfernt (Bestandsaufnahme November 2026, 4.7; Charles 18.11.).
   a) Die alte Seite „Aufstellung“ (md-aufstellung.js, seit v858 ohne Einstieg) ist weg: die Datei fehlt, und
      kein Loader, keine MODUL_WACHE und kein PRECACHE nennt sie mehr; renderKombi und die Seite #view-kombi auch nicht.
   b) Die entfernten, nirgends aufgerufenen Funktionen sind in keiner .js-Datei mehr definiert.
   c) Was das Taktikboard weiter braucht, bleibt: calcBestCombos, verfuegbareSpieler, scoreAufstellung, roleScore, socialScore. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v871 Toter Code: alte Aufstellung und ungenutzte Funktionen entfernt, Taktikboard-Rechner bleibt";
  const probleme = [], zeilen = [];
  const wurzel = process.env.REPO || path.join(__dirname, "..", "..");
  const lies = f => { try { return fs.readFileSync(path.join(wurzel, f), "utf8"); } catch (e) { return ""; } };
  const js = fs.readdirSync(wurzel).filter(f => f.endsWith(".js"));
  const alleJs = js.map(f => ({ f, src: lies(f) }));
  // a)
  const nennen = ["trainer/index.html", "eltern/index.html", "kinder/index.html", "sw.js"].filter(f => lies(f).includes("md-aufstellung"));
  if (fs.existsSync(path.join(wurzel, "md-aufstellung.js"))) probleme.push("a) md-aufstellung.js gibt es noch");
  else if (nennen.length) probleme.push("a) md-aufstellung.js steht noch in: " + nennen.join(", "));
  else if (/view-kombi/.test(lies("shell.html")) || alleJs.some(x => /\brenderKombi\b|view-kombi/.test(x.src))) probleme.push("a) renderKombi oder #view-kombi steht noch im Code");
  else zeilen.push("a) md-aufstellung.js fehlt und wird nirgends geladen, gewacht oder vorgehalten; #view-kombi und renderKombi sind weg");
  // b)
  const weg = ["renderKombi", "_renderKombiInner", "trainerIstFeldtrainer", "toggleTF", "evalStar", "tpPickSyncAll", "_tlMeinName", "_tgKey",
    "segSet", "tn3", "mn5", "lat_foot", "generateInsights", "tdPulsLoad", "tdMitbringGoto", "elternPlatzAmpelBanner", "atUndo", "atTorVergessen",
    "tqShareQuiz", "teamUeberzaehlig", "kombiShareLineup", "kombiVorschlagRechnen", "renderLineupEditor"];
  const def = n => new RegExp("(^|\\n)\\s*(async\\s+)?function\\s+" + n + "\\s*\\(|(^|\\n)\\s*(const|let|var)\\s+" + n + "\\s*=");
  const noch = [];
  for (const n of weg) for (const x of alleJs) if (def(n).test(x.src)) noch.push(n + " (" + x.f + ")");
  if (noch.length) probleme.push("b) noch definiert: " + noch.join(", ")); else zeilen.push(`b) ${weg.length} entfernte Namen sind in keiner .js-Datei mehr definiert`);
  // c)
  const bleiben = ["calcBestCombos", "verfuegbareSpieler", "scoreAufstellung", "roleScore", "socialScore"];
  const engine = lies("engine.js");
  const fehlt = bleiben.filter(n => !def(n).test(engine));
  if (fehlt.length) probleme.push("c) fehlt in engine.js: " + fehlt.join(", "));
  else if (!/calcBestCombos\(/.test(lies("md-taktikboard.js"))) probleme.push("c) md-taktikboard.js ruft calcBestCombos nicht mehr");
  else zeilen.push("c) calcBestCombos und seine Helfer stehen weiter in engine.js; das Taktikboard nutzt sie");
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
