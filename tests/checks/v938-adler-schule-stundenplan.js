/* v938 · Adler-Schule: Stundenplan statt Zeugnis, Lehrer mit Sprechblase, Stundenbeginn (Charles 22.11.2026, Entwurf freigegeben).
   Löst die Prüfung v936 („Stunden und Zeugnis“) ab: „Kein Zeugnis, sondern Stundenplan … Zeugnis gibt es immer am Ende der
   Hin- und Rückrunde. Und das Beste: Du musst nur zum Unterricht gehen, wenn du willst.“

   a) Kabine: eine Kachel „Adler-Schule“, keine Kacheln Taktik-Quiz und Fußball-Wissen (seit v936).
   b) Schule: Lehrer mit Sprechblase und „Vorlesen“, der Satz „Das Beste …“, „Mein Stundenplan“; Reihenfolge 1. Stunde Training
      verstehen, 2. Stunde Taktik, 3. Stunde Fußball-Wissen, dann 4.–6. Stunde (Mathe, Deutsch, Chemie) als „fällt aus“/„gähn“.
   c) Kein Zeugnis mehr auf der Seite – nur der Hinweis, dass es am Ende der Hin- und der Rückrunde eins gibt. Keine Prozente.
   d) Stundenbeginn: Lehrer sagt die Leitfrage; zwei nummerierte Kacheln „Erst anschauen“ und „Dann spielen“ (≥ 100 px, gleich
      breit), der eigene Stand, Rückweg; ohne Video kein Video-Platz.
   e) Video-Platz: nur Pfade unter video/ werden angenommen; mit Video erscheint die Kachel und öffnet einen Spieler.
   f) Vorlesen ruft die Aufnahme des Sprechtexts (ohne Namen des Kindes); die Liste des Werkzeugs nennt sieben Lehrer-Texte.
   g) 360 px, hell und dunkel: nichts läuft über, Schrift ≥ 13 px, Text mindestens 4,5:1. */
module.exports = async function (h) {
  const fs = require("fs"), path = require("path"), cp = require("child_process");
  const probleme = [], zeilen = [];
  const kab = fs.readFileSync(path.join(h.REPO, "md-kabine.js"), "utf8");
  if (/kabineQuiz\('taktik'\)|kabineQuiz\('wissen'\)/.test(kab) || !/tile\("kabineQuiz\('schule'\)","🎓","Adler-Schule"/.test(kab)) probleme.push("a) Kabine: Kacheln stimmen nicht");
  let liste = [];
  try { liste = JSON.parse(cp.execFileSync("node", [path.join(h.REPO, "tools", "quiz-audio-namen.js"), "--json"], { encoding: "utf8", maxBuffer: 1 << 24 })).filter(e => /^Lehrer: /.test(e.quelle)); } catch (e) { probleme.push("f) Werkzeug: " + e.message.slice(0, 80)); }
  if (liste.length !== 7 || liste.some(e => /Kind [A-O]\b/.test(e.text))) probleme.push(`f) Lehrer-Texte in der Liste: ${liste.length}`);
  for (const scheme of ["light", "dark"]) {
    const s = await h.starten({ start: "/kinder/index.html?quiz", breite: 360, hoehe: 740, scheme, warten: 2500, bibliothek: true, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
    const r = await s.page.evaluate(async (kontrast) => {
      eval(kontrast);
      const w = ms => new Promise(x => setTimeout(x, ms));
      const txt = e => e ? e.textContent.replace(/\s+/g, " ").trim() : "";
      document.querySelectorAll("[role=dialog]").forEach(d => d.remove());
      localStorage.setItem("adler_quiz_tutorial_done", "1");
      tqPlayer = "Kind A";
      const p = {}; p["Kind A"] = { 0: { score: 9, total: 10 }, [KF_BLOCK_BASIS + 1]: { score: 8, total: 10 } };
      localStorage.setItem(TQ_PROGRESS_KEY, JSON.stringify(p));
      tqStart(); await w(120);
      const panel = document.getElementById("tq-panel"), t = txt(panel);
      const pos = x => t.indexOf(x);
      const mass = () => { const el = [...panel.querySelectorAll("*")].filter(e => !e.closest("svg") && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && e.getClientRects().length);
        return { minSchrift: Math.min(...el.map(e => parseFloat(getComputedStyle(e).fontSize))), kontrast: Math.min(...[...panel.querySelectorAll(".sl-blase div, .sp-aus b, .sp-aus span, #schule-zeugnis-hinweis span, #schule-beste, #kf-stand")].map(e => window.__kontrastVon(e)).filter(x => typeof x === "number")),
          ueber: document.documentElement.scrollWidth - innerWidth }; };
      const out = { b: { lehrer: !!panel.querySelector(".sl-lehrer .sl-figur"), blase: txt(panel.querySelector(".sl-blase")), beste: txt(document.getElementById("schule-beste")),
          reihe: [pos("1. Stunde"), pos("2. Stunde"), pos("3. Stunde"), pos("Mathe"), pos("Deutsch"), pos("Chemie"), pos("Dein Zeugnis")], ausfall: [...panel.querySelectorAll(".sp-aus")].map(txt) },
        c: { altesZeugnis: !!document.getElementById("schule-zeugnis") || /Mein Adler-Zeugnis|Lieblingsfach/.test(t), hinweis: txt(document.getElementById("schule-zeugnis-hinweis")), prozent: /%/.test(txt(document.getElementById("schule-ausfall")) + txt(document.getElementById("schule-zeugnis-hinweis"))) },
        g1: mass() };
      // f) Vorlesen
      const rufe = []; const alt = window.kfVorlesen; window.kfVorlesen = (st) => { rufe.push(st); };
      panel.querySelector(".sl-vorlesen").click(); window.kfVorlesen = alt;
      out.f = { text: (rufe[0] || [])[0] || "", datei: typeof kfAudioUrl === "function" ? kfAudioUrl((rufe[0] || [])[0] || "") : "" };
      await kfStart(); await w(120); kfBlock(1); await w(120);
      const wege = [...panel.querySelectorAll(".sl-weg")];
      out.d = { blase: txt(panel.querySelector(".sl-blase")), wege: wege.map(b => txt(b)), h: wege.map(b => Math.round(b.getBoundingClientRect().height)), b: wege.map(b => Math.round(b.getBoundingClientRect().width)),
        haupt: panel.querySelectorAll(".btn-p").length, stand: txt(document.getElementById("kf-stand")), zurueck: [...panel.querySelectorAll("button")].some(b => /Andere Themen/.test(b.textContent)), video: !!document.getElementById("kf-video") };
      out.g2 = mass();
      // e) Video-Platz
      out.e = { pruef: kfDatenPruefen({ schema: "adler-kinderfragen/1", fragen: KF_DATEN.fragen, merkkarten: [], videos: { 1: "video/ball-behalten.mp4", 2: "https://fremd.example/x.mp4", 3: "../geheim.mp4", 9: "video/x.mp4" } }).videos };
      KF_DATEN.videos = { 1: "video/ball-behalten.mp4" }; kfBlock(1); await w(80);
      out.e.kachel = !!document.getElementById("kf-video"); document.getElementById("kf-video").click(); await w(80);
      out.e.spieler = (document.getElementById("kf-video-spieler") || {}).getAttribute?.("src") || "";
      return out;
    }, h.kontrastHelfer).catch(e => ({ fehler: String(e) }));
    const f = s.fehler().filter(x => !/ball-behalten\.mp4|Failed to load resource/.test(x)); await s.schliessen();
    if (r.fehler) { probleme.push(`${scheme}: ${r.fehler}`); continue; }
    const P = x => probleme.push(`${scheme}: ${x}`);
    if (!r.b.lehrer || !/Hallo Kind A! Heute stehen drei Stunden Sport/.test(r.b.blase) || !/Vorlesen/.test(r.b.blase)) P(`b) Lehrer: „${r.b.blase}“`);
    if (!/Das Beste: Du musst nur zum Unterricht, wenn du willst\./.test(r.b.beste)) P(`b) „${r.b.beste}“`);
    if (r.b.reihe.some(x => x < 0) || r.b.reihe.some((x, i) => i && x < r.b.reihe[i - 1])) P(`b) Reihenfolge: ${r.b.reihe.join(",")}`);
    if (r.b.ausfall.length !== 3 || !/4\.\s*Std\..*Mathe.*fällt aus/.test(r.b.ausfall[0]) || !/6\.\s*Std\..*Chemie.*gähn/.test(r.b.ausfall[2])) P(`b) Ausfall: ${JSON.stringify(r.b.ausfall)}`);
    if (r.c.altesZeugnis || !/am Ende der Hinrunde und am Ende der Rückrunde/.test(r.c.hinweis) || r.c.prozent) P(`c) ${JSON.stringify(r.c)}`);
    if (!/Heute lernen wir: Wie behalte ich den Ball, wenn einer kommt\? Erst schauen wir uns Bilder an\. Dann bist du dran!/.test(r.d.blase)) P(`d) Lehrer: „${r.d.blase}“`);
    if (r.d.wege.length !== 2 || !/^1 .*Erst anschauen\s*4 Bilder/.test(r.d.wege[0]) || !/^2 .*Dann spielen\s*10 Fragen/.test(r.d.wege[1]) || r.d.h.some(x => x < 100) || Math.abs(r.d.b[0] - r.d.b[1]) > 1 || r.d.haupt !== 1) P(`d) Kacheln: ${JSON.stringify([r.d.wege, r.d.h, r.d.b, r.d.haupt])}`);
    if (!/So weit bist du: 8 von 10 richtig/.test(r.d.stand) || !r.d.zurueck || r.d.video) P(`d) Stand „${r.d.stand}“, Rückweg ${r.d.zurueck}, Video ohne Clip ${r.d.video}`);
    if (JSON.stringify(r.e.pruef) !== '{"1":"video/ball-behalten.mp4"}' || !r.e.kachel || !/video\/ball-behalten\.mp4$/.test(r.e.spieler)) P(`e) Video: ${JSON.stringify(r.e)}`);
    if (/Kind A/.test(r.f.text) || !/^Hallo! Heute stehen drei Stunden Sport/.test(r.f.text) || !liste.some(e => r.f.datei.endsWith("/audio/schule/" + e.datei))) P(`f) Vorlesen: „${r.f.text}“ → ${r.f.datei}`);
    for (const [n, g] of [["Stundenplan", r.g1], ["Stundenbeginn", r.g2]]) { if (g.ueber > 0) P(`g) ${n} läuft ${g.ueber} px über`); if (g.minSchrift < 13) P(`g) ${n}: Schrift ${g.minSchrift} px`); if (!(g.kontrast >= 4.5)) P(`g) ${n}: Kontrast ${g.kontrast}`); }
    if (f.length) P("Konsole: " + f.slice(0, 2).join(" | "));
    if (scheme === "light") zeilen.push(`b) „${r.b.blase.slice(0, 60)}…“ · ${r.b.ausfall.length} Stunden fallen aus · d) ${r.d.wege.join(" | ")} (${r.d.h.join("/")} px)`, `e) Video nur aus video/: ${JSON.stringify(r.e.pruef)} · f) ${liste.length} Lehrer-Texte, Vorlesen ohne Namen`);
    zeilen.push(`g) ${scheme}: Schrift ≥ ${Math.min(r.g1.minSchrift, r.g2.minSchrift)} px · Kontrast ≥ ${Math.min(r.g1.kontrast, r.g2.kontrast)}`);
  }
  return h.ergebnis("v938 Adler-Schule: Stundenplan, Lehrer mit Sprechblase, Stundenbeginn, Video-Platz", !probleme.length, zeilen.concat(probleme));
};
