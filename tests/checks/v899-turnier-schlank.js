/* v899 · Schlankes Laden der öffentlichen Turnierseite. Gastvereine öffnen ?turnier=… zum ersten Mal,
   oft im Mobilnetz am Platz – v898 lud dafür alle 41 Module samt shell.html (rund 1,4 MB gezippt).

   a) Geladen werden nur eltern/index.html, intro.js, core.js, engine.js, md-turnierplan.js, die
      Stylesheets und das Logo: kein shell.html, kein boot.js/views.js/data.js; höchstens 12 Dateien
      und höchstens 800 KB ungezippt.
   b) Die Seite ist trotzdem vollständig: Kopf mit Wappenreihe, „Mein Verein“, Spielplan,
      Tabellen, Gut zu wissen, Teilen/Monitor/Drucken; die Modul-Wache meldet nichts, die Konsole ist leer.
   c) Was die Seite aus anderen Dateien braucht, ist da: toast, sbAuthHeaders, esc; der Monitor öffnet
      und schließt ohne views.js (Wachhalten über navigator.wakeLock).
   d) Ein Link ohne Turnier (?portal) lädt weiter alles wie bisher. */
"use strict";
const fs = require("fs"), path = require("path");
const T = require("../turnier-attrappe.js");

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const row = T.zeile();
  const s = await h.starten({ start: "/eltern/index.html?turnier=herbstcup-21-11", angemeldet: false, warten: 2500,   // ohne feste Uhr: page.clock leert die Resource-Timing-Liste
    supabase: h.supabaseAttrappe({ heimturnier: () => [row] }) });
  const r = await s.page.evaluate(async () => {
    const dateien = performance.getEntriesByType("resource").map(e => new URL(e.name)).filter(u => u.hostname === "app.test").map(u => u.pathname);
    const w = document.getElementById("ht-public"), t = w ? w.textContent : "";
    const c = { toast: typeof toast, sb: typeof sbAuthHeaders, esc: typeof esc };
    let mon = null;
    try { htPubMonitor(); await new Promise(x => setTimeout(x, 300)); const ov = document.getElementById("htpub-monitor"); mon = { auf: !!ov, tabs: ov ? ov.querySelectorAll("table").length : 0 }; htPubMonitorStop(); mon.zu = !document.getElementById("htpub-monitor"); } catch (e) { mon = { fehler: e.message }; }
    return { dateien, h1: !!(w && w.querySelector("h1")), medaillen: w ? w.querySelectorAll(".htp-medaille").length : 0, chips: w ? w.querySelectorAll(".htp-chip").length : 0,
      plan: /Spielplan/.test(t), tabs: w ? w.querySelectorAll("table").length : 0, infos: w ? w.querySelectorAll("details").length : 0,
      aktionen: w ? w.querySelectorAll(".htp-aktionen button").length : 0, wache: [...document.querySelectorAll('[role="alert"]')].map(a => a.textContent.slice(0, 80)), c, mon };
  });
  const fe = s.fehler();
  await s.schliessen();
  const roh = r.dateien.reduce((a, f) => { try { return a + fs.statSync(path.join(h.REPO, f)).size; } catch (e) { return a; } }, 0);
  const verboten = r.dateien.filter(f => /shell\.html|boot\.js|views\.js|data\.js|quiz\.js|md-(?!turnierplan)/.test(f));
  if (verboten.length) probleme.push("a) lädt, was die Turnierseite nicht braucht: " + verboten.slice(0, 6).join(", ") + (verboten.length > 6 ? " …" : ""));
  if (r.dateien.length > 12) probleme.push(`a) ${r.dateien.length} Dateien (Soll ≤ 12)`);
  if (roh > 800 * 1024) probleme.push(`a) ${Math.round(roh / 1024)} KB ungezippt (Soll ≤ 800 KB)`);
  if (!r.dateien.includes("/md-turnierplan.js")) probleme.push("a) md-turnierplan.js wurde nicht geladen");
  zeilen.push(`a) ${r.dateien.length} Dateien, ${Math.round(roh / 1024)} KB: ${r.dateien.join(" ")}`);
  if (!r.h1 || r.medaillen !== 6 || r.chips !== 7 || !r.plan || r.tabs !== 2 || r.infos < 2 || r.aktionen !== 3)
    probleme.push(`b) Seite unvollständig: Kopf ${r.h1}, Medaillen ${r.medaillen}, Chips ${r.chips}, Plan ${r.plan}, Tabellen ${r.tabs}, Infos ${r.infos}, Aktionen ${r.aktionen}`);
  if (r.wache.length) probleme.push("b) Meldung auf der Seite: " + r.wache.join(" | "));
  if (fe.length) probleme.push("b) Konsole: " + fe.slice(0, 2).join(" | "));
  if (r.c.toast !== "function" || r.c.sb !== "function" || r.c.esc !== "function") probleme.push("c) Helfer fehlen: " + JSON.stringify(r.c));
  if (!r.mon || !r.mon.auf || r.mon.tabs !== 2 || !r.mon.zu) probleme.push("c) Monitor ohne views.js: " + JSON.stringify(r.mon));
  zeilen.push(`b) Kopf, ${r.medaillen} Medaillen, ${r.chips} Chips, ${r.tabs} Tabellen, ${r.infos} Infos · c) Monitor auf/zu ${JSON.stringify(r.mon)}`);

  // d) andere Einstiege unverändert
  const s2 = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 2500 });
  const d = await s2.page.evaluate(() => performance.getEntriesByType("resource").map(e => new URL(e.name).pathname).filter(p => /\.js$|shell\.html$/.test(p)));
  await s2.schliessen();
  if (!d.includes("/shell.html") || !d.includes("/boot.js") || !d.includes("/views.js")) probleme.push("d) ?portal lädt nicht mehr alles: " + d.slice(0, 8).join(", "));
  zeilen.push(`d) ?portal: ${d.length} Dateien wie bisher`);
  return h.ergebnis("v899 Turnierseite lädt schlank: nur core, engine, md-turnierplan – und ist vollständig", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
