/* v651 · Charles, 28.09.2026: doppelte Wissensfragen bereinigen – „durch neue Fragen ersetzen“.
   Zehn Paare fragten dasselbe mit derselben richtigen Antwort (z. B. Pelés Land in „Leicht“ und
   „Schwer“). Ersetzt durch neue, belegte Fragen gleicher Kategorie und Stufe.

   a) Keine zwei Wissensfragen mit gleichem Wortlaut (ohne Satzzeichen und Emojis).
   b) Keine zwei Fragen derselben Kategorie mit gleicher richtiger Antwort UND gleichem Thema
      (mindestens vier gemeinsame Kernwörter) – das waren die übrigen Dubletten.
   c) Jede Frage hat eine eindeutige id; jede Stufe in WQ_TIER zeigt auf eine vorhandene Frage,
      jede Frage außer „adler“ hat eine Stufe; Legenden, Wappen und Wörter bleiben 10/10/10.
   d) Die neun alten ids sind weg, die neun neuen da. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [];
  const src = fs.readFileSync(path.join(h.REPO, "quiz.js"), "utf8");
  const a = src.indexOf("const WQ_QUESTIONS="), b = src.indexOf("];", a);
  const WQ = eval(src.slice(a + "const WQ_QUESTIONS=".length, b + 1));
  const t0 = src.indexOf("const WQ_TIER=");
  const TIER = eval("(" + src.slice(t0 + "const WQ_TIER=".length, src.indexOf("};", t0) + 1) + ")");
  const norm = s => String(s).toLowerCase().replace(/[^a-zäöüß0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  // a)
  const wort = {};
  WQ.forEach(q => { const k = norm(q.q); (wort[k] = wort[k] || []).push(q.id); });
  Object.values(wort).filter(v => v.length > 1).forEach(v => probleme.push("a) gleicher Wortlaut: " + v.join(", ")));
  // b)
  const STOP = new Set(["welche", "welcher", "welches", "welchem", "wie", "was", "wer", "wo", "aus", "kommt", "land", "spielt", "heißt", "nennt", "man", "der", "die", "das", "den", "dem", "ein", "eine", "einen", "bei", "profis", "mit", "von", "für", "war", "wurde", "besonders", "berühmt", "legende", "ball", "spiel"]);
  const kern = s => new Set(norm(s).split(" ").filter(w => w.length > 2 && !STOP.has(w)));
  for (let i = 0; i < WQ.length; i++) for (let j = i + 1; j < WQ.length; j++) {
    const x = WQ[i], y = WQ[j];
    if (norm(x.opts[x.correct]) !== norm(y.opts[y.correct])) continue;
    const A = kern(x.q), B = kern(y.q), gemein = [...A].filter(w => B.has(w));
    if (gemein.length >= 4) probleme.push(`b) gleiches Thema und gleiche Antwort: ${x.id} / ${y.id} (${gemein.join(", ")})`);
  }
  // c)
  const ids = WQ.map(q => q.id), set = new Set(ids);
  if (set.size !== ids.length) probleme.push("c) doppelte id");
  Object.keys(TIER).filter(id => !set.has(id)).forEach(id => probleme.push("c) Stufe ohne Frage: " + id));
  WQ.filter(q => q.cat !== "adler" && !TIER[q.id]).forEach(q => probleme.push("c) Frage ohne Stufe: " + q.id));
  const zaehl = {};
  WQ.forEach(q => { if (TIER[q.id]) { const k = q.cat + TIER[q.id]; zaehl[k] = (zaehl[k] || 0) + 1; } });
  for (const c of ["legenden", "wappen", "woerter"]) for (const t of [1, 2, 3]) if (zaehl[c + t] !== 10) probleme.push(`c) ${c} Stufe ${t}: ${zaehl[c + t]} statt 10`);
  // d)
  const alt = ["wap_bayernfarbe", "leg_t3_pele_land", "leg_t3_maradona_land", "leg_t3_beckham_freistoss", "leg_t3_cruyff_land", "wo_einwurf", "wo_eckball", "wap_koeln", "ad_gewinnen", "wo_abstoss"];
  const neu = ["wap_1860loewe", "leg_t3_pele_name", "leg_t3_maradona_neapel", "leg_t3_beckham_united", "leg_t3_cruyff_14", "wo_anstoss", "wo_ballannahme", "wap_koelnfarben", "ad_nachspiel", "wo_jonglieren"];
  alt.filter(id => set.has(id)).forEach(id => probleme.push("d) alte Dublette noch da: " + id));
  neu.filter(id => !set.has(id)).forEach(id => probleme.push("d) neue Frage fehlt: " + id));
  return h.ergebnis("v651 Wissensquiz ohne Dubletten", !probleme.length, probleme.concat([`${WQ.length} Fragen, ${Object.keys(TIER).length} mit Stufe`]));
};
