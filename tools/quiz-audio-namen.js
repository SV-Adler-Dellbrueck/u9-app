/* Benennung der Vorlese-Aufnahmen des Taktik-Quiz (v567).

   Die App spielt zu jedem Szenario die Datei `audio/quiz/<hash>.mp3`; der Hash kommt aus dem
   Sprechtext (desc + task, wie `ttsSprechtext` in quiz.js ihn bildet). Dieses Skript druckt
   für alle Szenarien Sprechtext und Dateiname – die Vorlage für eine Neuaufnahme, wenn ein
   Text geändert wurde (dann fehlt die Datei, und `tests/checks/v567-quiz-audio.js` wird rot).

   Aufruf im Repo-Wurzelverzeichnis:  node tools/quiz-audio-namen.js            (alle)
                                      node tools/quiz-audio-namen.js --fehlend  (nur ohne Datei)

   Die Aufnahmen entstanden am 15.09.2026 mit ElevenLabs (Modell eleven_multilingual_v2,
   Stimme „Ava – youthful and expressive German“) und wurden von Hand hierher gelegt; das
   Skript selbst ruft keinen Dienst auf und braucht keinen Schlüssel. */
const vm = require("vm"), fs = require("fs"), path = require("path");
const WURZEL = path.join(__dirname, "..");
const ctx = { window: {}, document: {}, navigator: {}, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(WURZEL, "data.js"), "utf8"), ctx);
const S = vm.runInContext("TQ_SCENARIOS", ctx);

// Wortgleich mit quiz.js – wer eine Seite ändert, ändert die andere mit.
function sprechtext(text) {
  return String(text || "")
    .replace(/\bTW\b/g, "Torwart").replace(/\bGeg\. TW\b/g, "gegnerischer Torwart")
    .replace(/\b(\d)\s*gg\s*(\d)\b/gi, "$1 gegen $2")
    .replace(/\bFlitzer L\b/g, "Flitzer links").replace(/\bFlitzer R\b/g, "Flitzer rechts")
    .replace(/\b(\d+):(\d+)\b/g, "$1 zu $2")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
    .replace(/\s+/g, " ").trim();
}
function hash(text) {
  let h = 0x811c9dc5;
  for (const ch of String(text || "")) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}

const nurFehlend = process.argv.includes("--fehlend");
let fehlend = 0;
S.forEach((sc, i) => {
  const text = sprechtext(sc.desc + " " + sc.task);
  const datei = hash(text) + ".mp3";
  const da = fs.existsSync(path.join(WURZEL, "audio", "quiz", datei));
  if (!da) fehlend++;
  if (nurFehlend && da) return;
  console.log(`${String(i + 1).padStart(3)}  ${da ? "✓" : "✗"}  ${datei}  ${text}`);
});
console.log(`\n${S.length} Szenarien, ${fehlend} ohne Aufnahme.`);
