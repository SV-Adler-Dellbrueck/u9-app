/* Benennung der Vorlese-Aufnahmen des Taktik-Quiz (v567).

   Die App spielt zu jedem Szenario die Datei `audio/quiz/<hash>.mp3`; der Hash kommt aus dem
   Sprechtext (desc + task, wie `ttsSprechtext` in quiz.js ihn bildet). Dieses Skript druckt
   für alle Szenarien Sprechtext und Dateiname – die Vorlage für eine Neuaufnahme, wenn ein
   Text geändert wurde (dann fehlt die Datei, und `tests/checks/v567-quiz-audio.js` wird rot).

   Aufruf im Repo-Wurzelverzeichnis:  node tools/quiz-audio-namen.js            (alle)
                                      node tools/quiz-audio-namen.js --fehlend  (nur ohne Datei)
                                      node tools/quiz-audio-namen.js --liste [--schreiben]

   v928 · `--liste` druckt die Vorlage für die Gesamtvertonung mit der Maskottchen-Stimme „Lennart – Energetic“
   (ElevenLabs, eleven_v4; Beschluss 21.11.2026): alle Taktik-Szenarien, die Fragen der Adler-Schule
   (uebungen/kinderfragen.json, je Szene auch die drei Antworten einzeln – die App mischt ihre Reihenfolge) und die
   Merksätze der Merkkarten, je mit Ziel-Dateinamen. `--schreiben` legt sie als
   doku/vertonung-lennart/sprechtexte.md ab. Die Namen der Adler-Schule folgen derselben Regel wie im Quiz
   (Hash des Sprechtexts unter audio/schule/): ändert sich ein Text, passt der Name nicht mehr.

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

if (process.argv.includes("--liste")) { liste(); process.exit(0); }
function liste() {
  let K = { fragen: [], merkkarten: [] };
  try { K = JSON.parse(fs.readFileSync(path.join(WURZEL, "uebungen", "kinderfragen.json"), "utf8")); } catch (e) {}
  const zelle = t => String(t).replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
  const z = [];
  z.push("# Sprechtexte für die Vertonung mit „Lennart – Energetic“", "");
  z.push(`Erzeugt mit \`node tools/quiz-audio-namen.js --liste --schreiben\` aus \`data.js\` und \`uebungen/kinderfragen.json\` (Stand ${K.stand || "?"}).`);
  z.push("Stimme: Maskottchen-Stimme „Lennart – Energetic“ (ElevenLabs, eleven_v4), Beschluss 21.11.2026. Ziel-Dateinamen = Hash des Sprechtexts; ändert sich ein Text, ändert sich der Name.", "");
  z.push(`## 1 Taktik-Quiz – ${S.length} Szenarien (Ziel: \`audio/quiz/\`)`, "", "| Nr | Titel | Datei | Sprechtext |", "|---|---|---|---|");
  S.forEach((sc, i) => { const t = sprechtext(sc.desc + " " + sc.task); z.push(`| ${i + 1} | ${zelle(sc.title)} | ${hash(t)}.mp3 | ${zelle(t)} |`); });
  const F = K.fragen || [], M = K.merkkarten || [];
  z.push("", `## 2 Adler-Schule – ${F.length} Fragen (Ziel: \`audio/schule/\`)`, "", "Bei A-oder-B-Fragen gehört „Bild A oder Bild B?“ zum Sprechtext. Bei Szenen wird die Frage und jede der drei Antworten einzeln vertont, weil die App die Reihenfolge der Antworten mischt.", "", "| ID | Teil | Datei | Sprechtext |", "|---|---|---|---|");
  F.forEach(f => {
    const t = sprechtext(f.frage + (f.typ === "ab" ? " Bild A oder Bild B?" : ""));
    z.push(`| ${f.id} | Frage | ${hash(t)}.mp3 | ${zelle(t)} |`);
    if (f.typ === "szene") (f.optionen || []).forEach((o, i) => { const u = sprechtext(o); z.push(`| ${f.id} | Antwort ${i + 1} | ${hash(u)}.mp3 | ${zelle(u)} |`); });
  });
  z.push("", `## 3 Merksätze – ${M.length} Merkkarten (Ziel: \`audio/schule/\`)`, "", "| ID | Datei | Sprechtext |", "|---|---|---|");
  M.forEach(m => { const t = sprechtext(m.merksatz); z.push(`| ${m.id} | ${hash(t)}.mp3 | ${zelle(t)} |`); });
  z.push("", "---", "", "**Vertonung offen – Texte von Charles freigeben lassen, dann im Projekt-Chat mit ElevenLabs/Lennart erzeugen.**", "");
  const md = z.join("\n");
  if (process.argv.includes("--schreiben")) {
    const ziel = path.join(WURZEL, "doku", "vertonung-lennart", "sprechtexte.md");
    fs.mkdirSync(path.dirname(ziel), { recursive: true }); fs.writeFileSync(ziel, md);
    console.log(`Geschrieben: doku/vertonung-lennart/sprechtexte.md (${S.length} Szenarien, ${F.length} Fragen, ${M.length} Merksätze)`);
  } else console.log(md);
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
