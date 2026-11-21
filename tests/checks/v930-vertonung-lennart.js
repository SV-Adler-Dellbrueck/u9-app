/* v930 · Vertonung mit Lennart vorbereitet (Beschlüsse 21.11.2026, Projektgedächtnis).
   a) tools/quiz-audio-namen.js --json und doku/vertonung-lennart/sprechtexte.md stimmen überein (jede Datei der
      JSON-Liste steht in der Datei), höchstens 60.000 Zeichen, 120 Szenarien.
   b) Die Adler-Schule spielt audio/schule/: Frage als ein Stück, bei Szenen danach die drei Antworten in der
      angezeigten Reihenfolge, Merksatz auf der Karte – jede gespielte Datei steht in der Liste. Fehlt eine Datei,
      liest ab dort die Gerätestimme. Zweiter Tipp hält an.
   c) Action „Vertonung Lennart“: nur workflow_dispatch mit modus fehlend|alle, Schlüssel nur aus dem Secret, kein
      Schlüssel im Repo, das Skript gibt ihn nie aus; Grenze 60.000 Zeichen, Modell eleven_v4 wird vorher geprüft. */
module.exports = async function (h) {
  const fs = require("fs"), path = require("path"), { spawnSync } = require("child_process");
  const probleme = [], zeilen = [];
  // a)
  const j = spawnSync(process.execPath, [path.join(h.REPO, "tools", "quiz-audio-namen.js"), "--json"], { encoding: "utf8", maxBuffer: 64 << 20 });
  const liste = JSON.parse(j.stdout || "[]");
  const md = fs.readFileSync(path.join(h.REPO, "doku", "vertonung-lennart", "sprechtexte.md"), "utf8");
  const fehltInMd = liste.filter(e => !md.includes("| " + e.datei + " |"));
  if (fehltInMd.length) probleme.push(`a) ${fehltInMd.length} Dateien der JSON-Liste fehlen in sprechtexte.md – Liste neu erzeugen (z. B. ${fehltInMd[0].datei}, ${fehltInMd[0].quelle})`);
  const zeichen = liste.reduce((a, e) => a + e.text.length, 0);
  if (zeichen > 60000) probleme.push(`a) ${zeichen} Zeichen – mehr als die Grenze der Action`);
  if (liste.filter(e => e.ordner === "audio/quiz").length !== 120) probleme.push("a) nicht 120 Taktik-Szenarien in der Liste");
  if (!md.includes("Vertonung offen – Texte von Charles freigeben lassen")) probleme.push("a) Hinweis „Vertonung offen …“ fehlt unter der Liste");
  const namen = new Set(liste.filter(e => e.ordner === "audio/schule").map(e => e.datei));

  // b)
  const s = await h.starten({ start: "/kinder/index.html?quiz", breite: 360, hoehe: 740, warten: 2500, bibliothek: true, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    if (typeof kfSpeak !== "function" || typeof kfAudioUrl !== "function") return { fehlt: "kfSpeak/kfAudioUrl" };
    document.querySelectorAll("[role=dialog]").forEach(d => d.remove());
    tqPlayer = "Kind A"; await kfStart(); await w(50);
    const gespielt = []; let kaputtAb = 99;
    class Attrappe { constructor(src) { this.src = src; this.n = gespielt.length; gespielt.push(src); }
      play() { const n = this.n; setTimeout(() => { if (n >= kaputtAb) this.onerror && this.onerror(); else this.onended && this.onended(); }, 10); return Promise.resolve(); } pause() { this.pausiert = true; } }
    window.Audio = Attrappe;
    const gesprochen = [];
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speaking: false, pending: false, cancel() {}, getVoices: () => [], speak: u => gesprochen.push(u.text) } });
    const zeige = id => { const f = KF_DATEN.fragen.find(x => x.id === id); kfLf = f.leitfrage; kfFragen = [f]; kfIdx = 0; kfFrage(); return f; };
    const out = {};
    const f = zeige("lf6-04"); await w(30);
    const btn = document.createElement("button");
    kfSpeak(btn); await w(150);
    out.szene = gespielt.map(u => u.split("/").slice(-2).join("/"));
    out.ordnung = kfOptOrdnung.slice();
    out.erwartet = [f.frage, ...kfOptOrdnung.map(i => f.optionen[i])].map(t => "schule/" + kfAudioUrl(t).split("/").pop());
    out.knopf = btn.textContent;
    // A oder B: ein Stück mit „Bild A oder Bild B?“
    gespielt.length = 0; const f2 = zeige("lf6-01"); await w(20); kfSpeak(null); await w(60);
    out.ab = gespielt.map(u => u.split("/").pop()); out.abSoll = kfAudioUrl(f2.frage + " Bild A oder Bild B?").split("/").pop();
    // Rückfall: zweite Datei fehlt → Gerätestimme ab Antwort 1
    gespielt.length = 0; kaputtAb = 1; zeige("lf6-04"); await w(20); kfSpeak(null); await w(100);
    out.rueckfall = { dateien: gespielt.length, gesprochen: gesprochen.join(" ") };
    kaputtAb = 99;
    // Stopp
    gespielt.length = 0; const b2 = document.createElement("button");
    window.Audio = class extends Attrappe { play() { return Promise.resolve(); } };
    kfSpeak(b2); const laeuft = b2.textContent; kfSpeak(b2); out.stopp = { laeuft, danach: b2.textContent, offen: !!_kfAudio };
    window.Audio = Attrappe;
    // Merksatz
    gespielt.length = 0; kfKarten(6, "mk6-1"); await w(100);
    const mk = document.querySelector('#kf-karten .kf-karte[data-id="mk6-1"] button[aria-label="Merksatz vorlesen"]');
    out.mkKnopf = !!mk; if (mk) { mk.click(); await w(60); }
    out.mk = gespielt.map(u => u.split("/").pop());
    out.mkUrl = gespielt[0] || "";
    document.getElementById("kf-karten")?.remove();
    return out;
  });
  const fe = s.fehler();
  await s.schliessen();
  if (r.fehlt) probleme.push("b) " + r.fehlt + " fehlt");
  else {
    if (String(r.szene) !== String(r.erwartet)) probleme.push(`b) Szene spielt ${JSON.stringify(r.szene)} statt ${JSON.stringify(r.erwartet)}`);
    if (r.szene.some(x => !namen.has(x.split("/").pop()))) probleme.push("b) eine gespielte Datei steht nicht in der Sprechtext-Liste – App und Werkzeug bilden die Namen verschieden");
    if (r.ab.length !== 1 || r.ab[0] !== r.abSoll || !namen.has(r.ab[0])) probleme.push(`b) A oder B spielt ${JSON.stringify(r.ab)}`);
    if (!(r.rueckfall.dateien === 2 && /Antwort 1/.test(r.rueckfall.gesprochen))) probleme.push(`b) Rückfall: ${r.rueckfall.dateien} Dateien, Gerätestimme „${r.rueckfall.gesprochen.slice(0, 60)}“`);
    if (!(r.stopp.laeuft === "⏹️" && r.stopp.danach === "🔊" && !r.stopp.offen)) probleme.push(`b) Zweiter Tipp hält nicht an (${JSON.stringify(r.stopp)})`);
    if (!r.mkKnopf || r.mk.length !== 1 || !namen.has(r.mk[0]) || !/audio\/schule\//.test(r.mkUrl)) probleme.push(`b) Merksatz: Knopf ${r.mkKnopf}, gespielt ${JSON.stringify(r.mk)}`);
  }
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));

  // c)
  const wf = fs.readFileSync(path.join(h.REPO, ".github", "workflows", "vertonung-lennart.yml"), "utf8");
  const sk = fs.readFileSync(path.join(h.REPO, "tools", "vertonung-lennart.mjs"), "utf8");
  const on = (wf.match(/\non:\n([\s\S]*?)\n\S/) || [])[1] || "";
  if (!/workflow_dispatch/.test(on) || /\b(push|pull_request|schedule|workflow_run):/.test(on)) probleme.push("c) Action startet nicht nur von Hand");
  if (!/options: \[fehlend, alle\]/.test(wf)) probleme.push("c) Eingabe modus fehlend|alle fehlt");
  if (!/ELEVENLABS_API_KEY: \$\{\{ secrets\.ELEVENLABS_API_KEY \|\| secrets\.ADLERAPPELEVENLABS \}\}/.test(wf)) probleme.push("c) Schlüssel kommt nicht aus dem Secret");
  if (/console\.(log|error)\([^)]*schluessel|summary\([^)]*schluessel|writeFileSync\([^)]*schluessel/.test(sk)) probleme.push("c) das Skript gibt den Schlüssel aus");
  if (!/GRENZE = 60000/.test(sk) || !/MODELL = "eleven_v4"/.test(sk) || !/STIMME = "HxvFDONerAuYFCkD1hBR"/.test(sk) || !/\/models/.test(sk)) probleme.push("c) Grenze, Modell, Stimme oder Modellprüfung fehlen im Skript");
  // kein Schlüssel im Repo (ElevenLabs-Schlüssel beginnen mit sk_)
  const verdacht = [];
  const lauf = d => { for (const n of fs.readdirSync(d)) { if ([".git", "node_modules", "audio", "vendor", ".wissen"].includes(n)) continue; const p = path.join(d, n), st = fs.lstatSync(p);
    if (st.isDirectory()) lauf(p); else if (st.size < 2e6 && /\.(js|mjs|json|ya?ml|md|html|css|ts|sh)$/.test(n) && /\bsk_[a-f0-9]{40,}\b/.test(fs.readFileSync(p, "utf8"))) verdacht.push(path.relative(h.REPO, p)); } };
  lauf(h.REPO);
  if (verdacht.length) probleme.push("c) möglicher ElevenLabs-Schlüssel im Repo: " + verdacht.join(", "));

  if (!probleme.length) zeilen.push(`${liste.length} Sprechtexte (${zeichen} Zeichen) = Liste · Szene spielt Frage + 3 Antworten in Anzeige-Reihenfolge, A/B ein Stück, Merksatz per Knopf · Rückfall Gerätestimme ab fehlender Datei · Stopp geht · Action nur von Hand, Secret, Grenze 60.000, eleven_v4 geprüft`);
  return h.ergebnis("v930 Vertonung Lennart: Liste, Abspielen in der Adler-Schule, Action ohne Schlüssel im Repo", !probleme.length, zeilen.concat(probleme));
};
