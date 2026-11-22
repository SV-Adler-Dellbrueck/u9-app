#!/usr/bin/env node
/* Weihnachtsvideo U9 I – Render-Skript (Auftrag doku/auftrag-weihnachtsvideo/auftrag.md).
 *
 * Eingabe (lokal, nie einchecken – der Ordner steht in .gitignore):
 *   weihnachtsvideo/kinder.json        je Kind: kuerzel, anzeige_name, rolle, formation, foto, text, reihenfolge, einverstanden
 *   weihnachtsvideo/fotos/<foto>       die Fotos aus der Eltern-Galerie (Charles legt sie hierher)
 *   weihnachtsvideo/audio/             audio_intro.mp3, audio_<kuerzel>.mp3, audio_ausblick.mp3, audio_dank.mp3
 * Ausgabe:
 *   weihnachtsvideo/ausgabe/szenen/*.mp4   eine Datei je Szene (Neurendern einer Szene lässt die anderen unberührt)
 *   weihnachtsvideo/ausgabe/teil1.mp4, teil2.mp4, gesamt.mp4
 *
 * Aufruf:
 *   node tools/weihnachtsvideo/render.mjs              alles rendern
 *   node tools/weihnachtsvideo/render.mjs --nur A      nur die Karte von Kind A neu (danach Teile und Gesamtvideo neu zusammengesetzt)
 *   node tools/weihnachtsvideo/render.mjs --teil 2     nur die Szenen von Teil 2 neu
 *   node tools/weihnachtsvideo/render.mjs --probe      Probelauf mit Platzhaltern (Kind A–C, Testton statt Stimme, kein Foto)
 *   node tools/weihnachtsvideo/render.mjs --pruefen    nur prüfen und berichten, nichts rendern
 *
 * In Ausgaben und Meldungen stehen nur Kürzel, nie Namen (der Name erscheint nur im Bild des Videos).
 */
import { createRequire } from "node:module";
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HIER = path.dirname(fileURLToPath(import.meta.url));
/* Playwright wie im Prüfwerkzeug über require: so findet es auch eine global installierte Fassung. */
const { chromium } = createRequire(import.meta.url)("playwright");
const WURZEL = path.resolve(HIER, "..", "..");
const args = process.argv.slice(2);
const wert = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const PROBE = args.includes("--probe"), NUR_PRUEFEN = args.includes("--pruefen");
const NUR = wert("--nur"), TEIL = wert("--teil");
const ORDNER = path.resolve(wert("--ordner") || path.join(WURZEL, "weihnachtsvideo"));
const AUSGABE = path.join(ORDNER, PROBE ? "probe-ausgabe" : "ausgabe"), SZENEN = path.join(AUSGABE, "szenen"), TMP = path.join(AUSGABE, ".arbeit");
const FPS = 25, VOR = 1.5, NACH = 1.5, PAUSE_DAUER = 10;
const WOERTER = [60, 75], KARTE_SEK = [25, 30];
const M = p => pathToFileURL(path.join(WURZEL, "Maskottchen", "varianten", `adler_${p}_weihnachtsmuetze`, `adler_${p}_weihnachtsmuetze_gross.png`)).href;
const RAHMEN = {
  intro:    { art: "intro", adler: M("fliegt"), ueber: "Rückblick", titel: "Unsere Hinrunde", unter: "Euer Adler fliegt einmal über den Platz" },
  pause:    { art: "pause", adler: M("winkt"), ueber: "Kurze Pause", titel: "Gleich geht’s weiter", unter: "" },
  ausblick: { art: "ausblick", adler: M("staunt"), ueber: "Ausblick", titel: "Auf in die Rückrunde", unter: "Halle Wesseling · Hallenturnier Bachem" },
  dank:     { art: "dank", adler: M("jubelt-ball"), ueber: "Zum Schluss", titel: "Danke, liebe Eltern!", unter: "Frohe Weihnachten wünscht euer Adler" }
};

const meldungen = [], warnungen = [];
const sag = x => { console.log(x); meldungen.push(x); };
const warn = x => { console.log("⚠ " + x); warnungen.push(x); };
const ff = (a, opt = {}) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...a], { stdio: ["ignore", "pipe", "inherit"], maxBuffer: 1 << 28, ...opt });
const dauer = f => parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" }));

/* ── Eingabe lesen und prüfen ─────────────────────────────────────────────── */
function kinderLesen() {
  const datei = PROBE ? path.join(HIER, "beispiel", "kinder.beispiel.json") : path.join(ORDNER, "kinder.json");
  if (!fs.existsSync(datei)) { console.error(`Eingabe fehlt: ${path.relative(WURZEL, datei)} (Vorlage: tools/weihnachtsvideo/beispiel/kinder.beispiel.json)`); process.exit(2); }
  const roh = JSON.parse(fs.readFileSync(datei, "utf8"));
  const liste = Array.isArray(roh) ? roh : roh.kinder || [];
  const ok = [];
  for (const k of liste) {
    if (!/^[A-O]$/.test(k.kuerzel || "")) { warn(`Eintrag ohne gültiges Kürzel (A–O) übersprungen`); continue; }
    if (k.einverstanden !== true) { sag(`Kind ${k.kuerzel}: kein Einverständnis – wird nicht gerendert`); continue; }
    if (!k.anzeige_name) { warn(`Kind ${k.kuerzel}: anzeige_name fehlt – übersprungen`); continue; }
    const w = String(k.text || "").trim().split(/\s+/).filter(Boolean).length;
    if (w < WOERTER[0] || w > WOERTER[1]) warn(`Kind ${k.kuerzel}: Text hat ${w} Wörter (vorgesehen ${WOERTER[0]}–${WOERTER[1]})`);
    ok.push(k);
  }
  ok.sort((a, b) => (a.reihenfolge ?? 99) - (b.reihenfolge ?? 99));
  return ok;
}

/* Testton für den Probelauf: rosa Rauschen, in Silben moduliert – klingt nach nichts, hat aber den Rhythmus einer Stimme. */
function probeTon(ziel, sek) {
  ff(["-f", "lavfi", "-i", `anoisesrc=d=${sek}:c=pink:a=0.25`, "-af", "volume='0.15+0.85*abs(sin(2*PI*2.6*t))*(0.55+0.45*sin(2*PI*0.37*t))':eval=frame,lowpass=f=2500", "-ar", "48000", ziel]);
}

function szenenListe(kinder) {
  const haelfte = Math.ceil(kinder.length / 2);
  const kSzene = (k, i) => ({ id: "kind_" + k.kuerzel, teil: i < haelfte ? 1 : 2, kind: k, audio: `audio_${k.kuerzel}.mp3` });
  return [
    { id: "intro", teil: 1, rahmen: RAHMEN.intro, audio: "audio_intro.mp3" },
    ...kinder.map(kSzene),
    { id: "pause", teil: 1, rahmen: RAHMEN.pause, audio: null },
    { id: "ausblick", teil: 2, rahmen: RAHMEN.ausblick, audio: "audio_ausblick.mp3" },
    { id: "dank", teil: 2, rahmen: RAHMEN.dank, audio: "audio_dank.mp3" }
  ];
}

/* ── Ton vorbereiten: Lautheit angleichen, 1,5 s Ruhe davor und danach; Lautstärke je Bild für das Wippen ── */
function tonVorbereiten(sz, audioOrdner) {
  const aus = path.join(TMP, sz.id + ".wav");
  if (!sz.audio) { ff(["-f", "lavfi", "-i", `anullsrc=r=48000:cl=stereo`, "-t", String(PAUSE_DAUER), aus]); return { wav: aus, sek: PAUSE_DAUER, amp: [] }; }
  const quelle = path.join(audioOrdner, sz.audio);
  ff(["-i", quelle, "-af", `loudnorm=I=-16:TP=-1.5:LRA=11,adelay=${VOR * 1000}:all=1,apad=pad_dur=${NACH}`, "-ar", "48000", "-ac", "2", aus]);
  const sek = dauer(aus);
  const pcm = ff(["-i", aus, "-ac", "1", "-ar", "8000", "-f", "s16le", "-"]);
  const je = 8000 / FPS, n = Math.ceil(pcm.length / 2 / je), roh = [];
  for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let j = i * je; j < Math.min((i + 1) * je, pcm.length / 2); j++) { const v = pcm.readInt16LE(j * 2) / 32768; s += v * v; c++; } roh.push(Math.sqrt(s / Math.max(1, c))); }
  const sortiert = roh.filter(x => x > 0.002).sort((a, b) => a - b), oben = sortiert[Math.floor(sortiert.length * 0.95)] || 1;
  let g = 0; const amp = roh.map(x => (g = g * 0.6 + Math.min(1, x / oben) * 0.4));
  return { wav: aus, sek, amp };
}

async function szeneRendern(browser, sz, ton) {
  const ziel = path.join(SZENEN, sz.id + ".mp4");
  const k = sz.kind;
  let foto = null;
  if (k && k.foto) { const f = path.join(ORDNER, "fotos", k.foto); if (fs.existsSync(f)) foto = pathToFileURL(f).href; else warn(`Kind ${k.kuerzel}: Foto fehlt – die Karte zeigt den winkenden Adler`); }
  else if (k) sag(`Kind ${k.kuerzel}: kein Foto angegeben – die Karte zeigt den winkenden Adler`);
  const szene = k ? { art: "kind", name: k.anzeige_name, rolle: k.rolle || "", formation: k.formation || "", foto, ersatz: M("winkt"), adler: M("praesentiert") } : { ...sz.rahmen };
  szene.amp = ton.amp; szene.fps = FPS;
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.addInitScript(s => { window.SZENE = s; }, szene);
  await page.goto(pathToFileURL(path.join(HIER, "vorlage.html")).href);
  await page.evaluate(() => einrichten());
  const bilder = Math.round(ton.sek * FPS);
  const enc = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", "-i", ton.wav,
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-r", String(FPS), "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
    "-t", ton.sek.toFixed(3), "-movflags", "+faststart", ziel], { stdio: ["pipe", "inherit", "inherit"] });
  const fertig = new Promise((res, rej) => enc.on("close", c => c === 0 ? res() : rej(new Error("ffmpeg " + c))));
  for (let i = 0; i < bilder; i++) {
    await page.evaluate(t => zeigeZeit(t), i / FPS);
    const b = await page.screenshot({ type: "jpeg", quality: 92 });
    if (!enc.stdin.write(b)) await new Promise(r => enc.stdin.once("drain", r));
  }
  enc.stdin.end(); await fertig; await page.close();
  const sek = dauer(ziel);
  if (k && (sek < KARTE_SEK[0] || sek > KARTE_SEK[1])) warn(`Kind ${k.kuerzel}: Karte dauert ${sek.toFixed(1)} s (vorgesehen ${KARTE_SEK[0]}–${KARTE_SEK[1]} s)`);
  sag(`${sz.id}: ${sek.toFixed(1)} s`);
}

function zusammensetzen(szenen) {
  const verbinden = (liste, ziel) => {
    const fehlt = liste.filter(s => !fs.existsSync(path.join(SZENEN, s.id + ".mp4")));
    if (fehlt.length) { warn(`${path.basename(ziel)}: Szene fehlt (${fehlt.map(s => s.id).join(", ")}) – erst alles rendern`); return; }
    const txt = path.join(TMP, path.basename(ziel) + ".txt");
    fs.writeFileSync(txt, liste.map(s => `file '${path.join(SZENEN, s.id + ".mp4").replace(/'/g, "'\\''")}'`).join("\n"));
    ff(["-f", "concat", "-safe", "0", "-i", txt, "-c", "copy", "-movflags", "+faststart", ziel]);
    sag(`${path.basename(ziel)}: ${dauer(ziel).toFixed(1)} s`);
  };
  const t1 = szenen.filter(s => s.teil === 1), t2 = szenen.filter(s => s.teil === 2);
  verbinden(t1, path.join(AUSGABE, "teil1.mp4"));
  verbinden(t2, path.join(AUSGABE, "teil2.mp4"));
  verbinden([...t1, ...t2], path.join(AUSGABE, "gesamt.mp4"));
}

/* ── Ablauf ───────────────────────────────────────────────────────────────── */
const kinder = kinderLesen();
const szenen = szenenListe(kinder);
fs.mkdirSync(SZENEN, { recursive: true }); fs.mkdirSync(TMP, { recursive: true });
let audioOrdner = path.join(ORDNER, "audio");
if (PROBE) {
  audioOrdner = path.join(TMP, "probe-ton"); fs.mkdirSync(audioOrdner, { recursive: true });
  for (const s of szenen) if (s.audio) probeTon(path.join(audioOrdner, s.audio), s.kind ? 25 : 8);
  /* Ein Platzhalter-„Foto“ (Farbverlauf) für Kind A, damit die Probe auch die Karte mit Foto zeigt. */
  fs.mkdirSync(path.join(ORDNER, "fotos"), { recursive: true });
  ff(["-f", "lavfi", "-i", "color=c=0x6b8fc7:s=800x1000:d=1", "-vf", "geq=r='90+X/8':g='120+Y/10':b='200-Y/12'", "-frames:v", "1", path.join(ORDNER, "fotos", "probe-a.jpg")]);
}
const fehlend = szenen.filter(s => s.audio && !fs.existsSync(path.join(audioOrdner, s.audio))).map(s => s.audio);
if (fehlend.length) { console.error("Audio fehlt in " + path.relative(WURZEL, audioOrdner) + ": " + fehlend.join(", ")); if (!NUR_PRUEFEN) process.exit(3); }
sag(`${kinder.length} Kinder mit Einverständnis · Teil 1: ${szenen.filter(s => s.teil === 1).map(s => s.id).join(", ")} · Teil 2: ${szenen.filter(s => s.teil === 2).map(s => s.id).join(", ")}`);
if (NUR_PRUEFEN) process.exit(warnungen.length ? 1 : 0);

const zuRendern = szenen.filter(s => NUR ? s.id === "kind_" + NUR.toUpperCase() : TEIL ? String(s.teil) === String(TEIL) : true);
if (NUR && !zuRendern.length) { console.error(`Kind ${NUR} steht nicht in der Liste (oder ohne Einverständnis)`); process.exit(4); }
const browser = await chromium.launch();
try { for (const s of zuRendern) await szeneRendern(browser, s, tonVorbereiten(s, audioOrdner)); }
finally { await browser.close(); }
zusammensetzen(szenen);
fs.writeFileSync(path.join(AUSGABE, "bericht.txt"), [...meldungen, ...warnungen.map(w => "⚠ " + w), "", "Nicht automatisch geprüft: ob Text und Aufnahme Wort für Wort übereinstimmen – bitte beim Probelauf anhören."].join("\n") + "\n");
console.log(warnungen.length ? `Fertig mit ${warnungen.length} Hinweis(en) – siehe ${path.relative(WURZEL, path.join(AUSGABE, "bericht.txt"))}` : "Fertig ohne Hinweise.");
