/* v642 · PO: „Schriften selbst ausliefern“ (offener Punkt aus dem Datenschutz-Audit).
   Bis v641 luden alle drei Einstiege Inter von fonts.googleapis.com / fonts.gstatic.com und die
   Tabler-Icons von cdn.jsdelivr.net; Chart.js kam ebenfalls von jsDelivr, der QR-Code im
   Turnierplan von api.qrserver.com. Jeder Aufruf gab damit die IP-Adresse von Eltern und Kindern
   an Dritte weiter – ohne dass die App es gebraucht hätte.

   a) Trainer, Eltern, Kinder und ?quiz laden beim Öffnen nichts von Google, jsDelivr oder qrserver.
   b) Inter und die Icon-Schrift sind wirklich geladen (document.fonts), nicht nur eingetragen.
   c) Chart.js kommt aus vendor/ (ensureChart) und steht danach bereit.
   d) Statisch: kein src/href/Aufruf im App-Code nennt diese Hosts mehr; alles aus vendor/ steht im
      PRECACHE und existiert. */
"use strict";
const fs = require("fs"), path = require("path");
const FREMD = /fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|api\.qrserver\.com|unpkg\.com|cdnjs\./i;
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const seiten = ["/trainer/index.html", "/eltern/index.html", "/kinder/index.html", "/trainer/index.html?quiz"];
  for (const start of seiten) {
    const s = await h.starten({ start, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
    const r = await s.page.evaluate(async () => {
      await document.fonts.ready;
      // Schriften lädt der Browser erst, wenn ein Zeichen sie braucht – hinter dem PIN-Tor steht
      // womöglich noch kein Icon. Deshalb ausdrücklich anfordern: gelingt es, liegt die Datei da.
      try { await document.fonts.load('16px "tabler-icons"', "\uea00"); await document.fonts.load("700 16px Inter"); } catch (e) {}
      await new Promise(x => setTimeout(x, 300));
      const geladen = [...document.fonts].filter(f => f.status === "loaded").map(f => f.family.replace(/"/g, ""));
      let chart = null;
      if (typeof ensureChart === "function") { try { await ensureChart(); chart = typeof Chart === "function"; } catch (e) { chart = "fehler: " + e.message; } }
      const res = performance.getEntriesByType("resource").map(e => e.name);
      return { res, inter: geladen.includes("Inter"), icons: geladen.includes("tabler-icons"),
        chartQuelle: res.find(u => /chart\.umd/.test(u)) || null, chart };
    });
    const fe = s.fehler(); await s.schliessen();
    const fremd = r.res.filter(u => FREMD.test(u));
    if (fremd.length) probleme.push(`a) ${start} lädt von fremden Servern: ${fremd.slice(0, 3).join(", ")}`);
    if (!r.inter) probleme.push(`b) ${start}: Inter nicht geladen`);
    if (!r.icons) probleme.push(`b) ${start}: Icon-Schrift nicht geladen`);
    if (r.chart !== null && (r.chart !== true || !/\/vendor\/chart\.umd\.js$/.test(r.chartQuelle || ""))) probleme.push(`c) ${start}: Chart.js ${r.chart} aus ${r.chartQuelle}`);
    if (fe.length) probleme.push(`${start} Konsole: ${fe.slice(0, 2).join(" | ")}`);
    zeilen.push(`${start}: ${r.res.length} Abrufe, fremd ${fremd.length} · Inter ${r.inter} · Icons ${r.icons}${r.chart !== null ? " · Chart " + r.chart : ""}`);
  }
  // d) statisch
  const R = h.REPO;
  const dateien = fs.readdirSync(R).filter(f => /\.(js|html|css)$/.test(f)).concat(["trainer/index.html", "eltern/index.html", "kinder/index.html"]);
  dateien.forEach(f => {
    // Kommentare zählen nicht – dort steht, woher die Dateien früher kamen.
    const code = fs.readFileSync(path.join(R, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--[\s\S]*?-->/g, "").split("\n")
      .filter(z => !/^\s*\/\//.test(z)).map(z => z.replace(/\s\/\/\s.*$/, ""));   // Zeilenende-Kommentar („ // …“), nicht https://
    code.forEach((z, i) => { if (FREMD.test(z)) probleme.push(`d) ${f}: ${z.trim().slice(0, 100)}`); });
  });
  const sw = fs.readFileSync(path.join(R, "sw.js"), "utf8");
  const vendor = [];
  (function lauf(d) { fs.readdirSync(path.join(R, d)).forEach(n => { const p = d + "/" + n; if (fs.statSync(path.join(R, p)).isDirectory()) { if (n !== "lizenzen") lauf(p); } else vendor.push(p); }); })("vendor");
  vendor.forEach(v => { if (!sw.includes('"./' + v + '"')) probleme.push(`d) ${v} fehlt im PRECACHE`); });
  if (!fs.existsSync(path.join(R, "vendor/lizenzen/inter-OFL.txt")) || !fs.existsSync(path.join(R, "vendor/lizenzen/tabler-icons-MIT.txt"))) probleme.push("d) Lizenztexte fehlen");
  zeilen.push(`vendor: ${vendor.length} Dateien, alle im PRECACHE`);
  return h.ergebnis("v642 Keine fremden Server beim Öffnen: Schrift, Icons, Chart.js, QR selbst ausgeliefert", !probleme.length, probleme.concat(zeilen));
};
