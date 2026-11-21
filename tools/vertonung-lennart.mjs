/* v930 · Vertonung mit der Maskottchen-Stimme „Lennart – Energetic“ (ElevenLabs) – läuft in der GitHub-Action
   „Vertonung Lennart“ (.github/workflows/vertonung-lennart.yml), Beschluss 21.11.2026.

   Quelle der Texte ist tools/quiz-audio-namen.js --json: dieselben Sprechtexte und Dateinamen wie in
   doku/vertonung-lennart/sprechtexte.md. Der Text geht 1:1 an ElevenLabs, ohne Tags.
   MODUS=fehlend  nur Dateien, die unter audio/quiz bzw. audio/schule noch fehlen
   MODUS=alle     alle neu (ersetzt die alten Aufnahmen) und löscht Dateien, die zu keinem Text mehr gehören

   Der Schlüssel kommt nur aus der Umgebung (Secret ELEVENLABS_API_KEY). Er wird nie ausgegeben, nie geschrieben und
   steht in keiner Fehlermeldung. Vor dem ersten Aufruf: Zeichensumme ausgeben, über 60.000 abbrechen; prüfen, ob das
   Modell und die Stimme verfügbar sind, sonst abbrechen. */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const WURZEL = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const STIMME = "HxvFDONerAuYFCkD1hBR";   // „Lennart – Energetic“
const MODELL = "eleven_v4";
const GRENZE = 60000;
const API = "https://api.elevenlabs.io/v1";
const modus = (process.env.MODUS || "fehlend").trim();
const schluessel = process.env.ELEVENLABS_API_KEY || "";
const nurZaehlen = process.argv.includes("--zaehlen");   // ohne Schlüssel: nur Auswahl und Zeichensumme

function abbruch(text) { console.error("ABBRUCH: " + text); summary(`### Vertonung Lennart – abgebrochen\n\n${text}\n`); process.exit(1); }
function summary(md) { if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md); }
if (!["fehlend", "alle"].includes(modus)) abbruch(`Unbekannter Modus „${modus}“ – erlaubt sind fehlend und alle.`);

const r = spawnSync(process.execPath, [path.join(WURZEL, "tools", "quiz-audio-namen.js"), "--json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
if (r.status !== 0) abbruch("tools/quiz-audio-namen.js --json ist fehlgeschlagen.");
const alle = JSON.parse(r.stdout);
const ziel = e => path.join(WURZEL, e.ordner, e.datei);
const auswahl = modus === "alle" ? alle : alle.filter(e => !fs.existsSync(ziel(e)));
const zeichen = auswahl.reduce((a, e) => a + e.text.length, 0);
console.log(`Modus ${modus}: ${auswahl.length} von ${alle.length} Sprechtexten, ${zeichen} Zeichen.`);
summary(`### Vertonung Lennart (${modus})\n\n${auswahl.length} von ${alle.length} Sprechtexten · **${zeichen} Zeichen** · Stimme ${STIMME} · Modell ${MODELL}\n\n`);
if (zeichen > GRENZE) abbruch(`${zeichen} Zeichen – mehr als die Grenze von ${GRENZE}. Nichts erzeugt.`);
if (nurZaehlen) process.exit(0);
if (!auswahl.length) { console.log("Nichts zu tun."); process.exit(0); }
if (!schluessel) abbruch("Secret fehlt – erwartet ADLERAPPELEVENLABS oder ELEVENLABS_API_KEY (https://github.com/SV-Adler-Dellbrueck/u9-app/settings/secrets/actions).");

const kopf = () => ({ "xi-api-key": schluessel, "Accept": "application/json" });
async function holen(url, opt = {}) {
  for (let versuch = 1; ; versuch++) {
    let res;
    try { res = await fetch(url, opt); } catch (e) { res = null; }
    if (res && res.status !== 429 && res.status < 500) return res;
    if (versuch >= 4) return res;
    await new Promise(x => setTimeout(x, 2000 * versuch * versuch));
  }
}
const kurz = async res => { if (!res) return "keine Verbindung"; let t = ""; try { t = await res.text(); } catch (e) {} return `HTTP ${res.status} ${t.replace(/\s+/g, " ").slice(0, 200)}`; };

// Modell und Stimme prüfen
const m = await holen(`${API}/models`, { headers: kopf() });
if (!m || !m.ok) abbruch(`Modelle nicht abrufbar (${await kurz(m)}).`);
const modelle = await m.json();
const mod = (Array.isArray(modelle) ? modelle : modelle.models || []).find(x => x.model_id === MODELL);
if (!mod) abbruch(`Modell ${MODELL} ist für diesen Schlüssel nicht verfügbar. Verfügbar: ${(Array.isArray(modelle) ? modelle : []).map(x => x.model_id).join(", ")}`);
if (mod.can_do_text_to_speech === false) abbruch(`Modell ${MODELL} kann kein Text-zu-Sprache.`);
const v = await holen(`${API}/voices/${STIMME}`, { headers: kopf() });
if (!v || !v.ok) abbruch(`Stimme ${STIMME} nicht abrufbar (${await kurz(v)}).`);
console.log(`Modell ${MODELL} verfügbar, Stimme „${(await v.json()).name || STIMME}“ gefunden.`);

// Erzeugen – zwei gleichzeitig
let fertig = 0; const fehler = [];
async function eins(e) {
  const res = await holen(`${API}/text-to-speech/${STIMME}?output_format=mp3_44100_128`, {
    method: "POST", headers: { ...kopf(), "Content-Type": "application/json", "Accept": "audio/mpeg" },
    body: JSON.stringify({ text: e.text, model_id: MODELL })
  });
  if (!res || !res.ok) { fehler.push(`${e.ordner}/${e.datei} (${e.quelle}): ${await kurz(res)}`); return; }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) { fehler.push(`${e.ordner}/${e.datei}: nur ${buf.length} Bytes`); return; }
  fs.mkdirSync(path.dirname(ziel(e)), { recursive: true });
  fs.writeFileSync(ziel(e), buf);
  fertig++; if (fertig % 20 === 0) console.log(`… ${fertig}/${auswahl.length}`);
}
const warte = [...auswahl];
await Promise.all([0, 1].map(async () => { while (warte.length) await eins(warte.shift()); }));

// Bei „alle“: Dateien ohne Text entfernen
let geloescht = [];
if (modus === "alle" && !fehler.length) {
  const soll = new Set(alle.map(e => e.ordner + "/" + e.datei));
  for (const ordner of ["audio/quiz", "audio/schule"]) {
    const d = path.join(WURZEL, ordner); if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) if (f.endsWith(".mp3") && !soll.has(ordner + "/" + f)) { fs.unlinkSync(path.join(d, f)); geloescht.push(ordner + "/" + f); }
  }
}
console.log(`Fertig: ${fertig} erzeugt, ${fehler.length} Fehler, ${geloescht.length} verwaiste gelöscht.`);
summary(`${fertig} Dateien erzeugt · ${fehler.length} Fehler · ${geloescht.length} verwaiste gelöscht\n\n${fehler.length ? "Fehler:\n\n" + fehler.map(x => "- " + x).join("\n") + "\n" : ""}`);
fs.writeFileSync(path.join(WURZEL, ".vertonung-ergebnis.json"), JSON.stringify({ modus, erzeugt: fertig, zeichen, fehler, geloescht }, null, 1));
if (fehler.length) process.exit(1);
