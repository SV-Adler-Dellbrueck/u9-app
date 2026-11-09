/* v818 · Leistung: Schriften, Bibliotheken und Bilder überleben den Versionssprung.
   Bis v817 lagen alle 82 Dateien im Versionscache; jede neue Version hat auch die 27 Dateien neu
   geladen, die sich fast nie ändern (rund 1 MB je Gerät und Sprung). Seit v818 liegen sie in einem
   eigenen Cache (sw.js: FEST_CACHE), dessen Name die Prüfsumme dieser Dateien trägt.

   Was dabei schiefgehen kann – und hier geprüft wird, am echten Service Worker:
   a) Statik: Der Name passt zum Inhalt (sonst behalten Geräte eine geänderte Datei für immer in
      der alten Fassung) und sieht nicht aus wie ein Versionscache (die Versionsanzeige liest
      die Cache-Namen).
   b) Erster Besuch: alle festen Dateien liegen im festen Cache, keine im Versionscache.
   c) Versionssprung: der Server sieht KEINE Anfrage nach einer festen Datei, der feste Cache
      bleibt, die neue Version läuft und die Icon-Schrift ist da.
   d) Feste Datei geändert (anderer Name): neuer fester Cache wird gefüllt, der alte verschwindet.
   e) Reparaturweg (löscht alle Caches): die Schrift kommt trotzdem und der feste Cache füllt
      sich von selbst wieder.
   f) Eine feste Datei fehlt auf dem Server: das Update kommt trotzdem an.
   Abhilfe bei Rot in a): node tools/fest-cache.js --schreiben */
"use strict";
const fs = require("fs"), path = require("path"), http = require("http");

module.exports = async function (h) {
  const titel = "v818 Fester Cache: Schriften und Bilder überleben den Versionssprung";
  const probleme = [], zeilen = [];
  const werkzeug = path.join(h.REPO, "tools/fest-cache.js");
  const swText = fs.readFileSync(path.join(h.REPO, "sw.js"), "utf8");
  if (!fs.existsSync(werkzeug) || !/const FEST_CACHE="/.test(swText)) return h.ergebnis(titel, false, ["kein fester Cache in sw.js (Stand vor v818)"]);
  const w = require(werkzeug);

  // a) Statik
  const liste = w.festListe(h.REPO), ist = w.istName(h.REPO), soll = w.erwarteterName(h.REPO);
  const festPfade = liste.map(f => "/" + f);
  if (ist !== soll) probleme.push(`a) FEST_CACHE ist ${ist}, aus dem Inhalt folgt ${soll} → node tools/fest-cache.js --schreiben`);
  if (/^u9i-adler/.test(ist)) probleme.push("a) Name des festen Caches beginnt wie ein Versionscache");
  if (liste.length < 20) probleme.push(`a) nur ${liste.length} feste Dateien – die Auswahl greift nicht mehr`);
  for (const f of liste) if (!fs.existsSync(path.join(h.REPO, f))) probleme.push("a) feste Datei fehlt: " + f);
  if (swText.indexOf('const CACHE="u9i-adler-v') !== swText.search(/u9i-adler-v\d+/) - 'const CACHE="'.length) probleme.push("a) der Versionscache ist nicht mehr die erste Fundstelle seines Namens in sw.js");
  if (probleme.length) return h.ergebnis(titel, false, probleme);

  let version = "v9000", festName = ist, kaputt = null;
  const zaehler = {};
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, "http://localhost");
    const nicht = () => { res.writeHead(404); res.end(); };
    zaehler[u.pathname] = (zaehler[u.pathname] || 0) + 1;
    if (/\/uebungen\/[^/]+\.json$/.test(u.pathname)) return nicht();
    if (kaputt && u.pathname === kaputt) return nicht();
    const p = u.pathname.endsWith("/") ? u.pathname + "index.html" : u.pathname;
    const f = path.join(h.REPO, p);
    if (!f.startsWith(h.REPO) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return nicht();
    const typ = f.endsWith(".js") ? "application/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".html") ? "text/html"
      : f.endsWith(".json") ? "application/json" : f.endsWith(".woff2") ? "font/woff2" : f.endsWith(".png") ? "image/png"
      : f.endsWith(".mp3") ? "audio/mpeg" : "application/octet-stream";
    let body = fs.readFileSync(f);
    if (p === "/sw.js") body = body.toString("utf8").replace(/u9i-adler-v\d+/, "u9i-adler-" + version).replace(/const FEST_CACHE="[^"]*"/, 'const FEST_CACHE="' + festName + '"');
    res.writeHead(200, { "Content-Type": typ, "Cache-Control": "max-age=600" });   // wie GitHub Pages
    res.end(body);
  });
  await new Promise(x => server.listen(0, "127.0.0.1", x));
  const BASIS = "http://localhost:" + server.address().port;
  const browser = await h.chromium().launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
  await ctx.route(/supabase\.co|open-meteo|openholidays|openstreetmap/, r => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("adler-intro", "1");
      ["adler_tour", "adler_trainer_tour", "adler_eltern_tour", "adler_kinder_tour"].forEach(k => localStorage.setItem(k, "1"));
    } catch (e) {}
  });
  const page = await ctx.newPage();
  const w_ = ms => page.waitForTimeout(ms);
  const warteBis = async (f, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await f()) return true; } catch (e) {} await w_(250); } return false; };
  const namen = () => page.evaluate(() => caches.keys()).catch(() => []);
  const inhalt = name => page.evaluate(async n => (await caches.has(n)) ? (await (await caches.open(n)).keys()).map(r => new URL(r.url).pathname) : null, name).catch(() => null);
  const update = () => page.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update())).catch(() => {});
  const festAnfragen = () => festPfade.reduce((s, p) => s + (zaehler[p] || 0), 0);
  const leeren = () => Object.keys(zaehler).forEach(k => delete zaehler[k]);
  const neuLaden = async () => { try { await page.goto(BASIS + "/trainer/index.html", { waitUntil: "load" }); } catch (e) { await page.waitForLoadState("load").catch(() => {}); } };
  const schriftDa = () => page.evaluate(async () => {
    await document.fonts.ready;
    try { await document.fonts.load('20px "tabler-icons"', ""); } catch (e) {}
    return [...document.fonts].some(f => f.status === "loaded" && f.family.replace(/"/g, "") === "tabler-icons");
  }).catch(() => false);

  try {
    // b) Erster Besuch
    await page.goto(BASIS + "/trainer/index.html", { waitUntil: "load" });
    await warteBis(() => page.evaluate(() => !!navigator.serviceWorker.controller));
    const voll = await warteBis(async () => { const i = await inhalt(ist); return i && festPfade.every(p => i.includes(p)); });
    const fb = (await inhalt(ist)) || [], vb = (await inhalt("u9i-adler-v9000")) || [];
    zeilen.push(`b) fester Cache ${fb.length} von ${festPfade.length}, Versionscache ${vb.length} Einträge`);
    if (!voll) probleme.push("b) fester Cache unvollständig: es fehlt " + festPfade.filter(p => !fb.includes(p)).slice(0, 4).join(", "));
    const doppelt = vb.filter(p => festPfade.includes(p));
    if (doppelt.length) probleme.push("b) feste Dateien liegen auch im Versionscache: " + doppelt.slice(0, 4).join(", "));
    if (vb.length < 40) probleme.push("b) Versionscache hat nur " + vb.length + " Einträge");

    // c) Versionssprung
    await w_(800); leeren(); version = "v9001";
    await update();
    const cOk = await warteBis(async () => { const k = await namen(); return k.includes("u9i-adler-v9001") && !k.includes("u9i-adler-v9000"); });
    await w_(1500); await neuLaden();
    await warteBis(() => page.evaluate(() => typeof appVersion === "function"));
    const vc = await page.evaluate(() => appVersion()).catch(() => "");
    const sc = await schriftDa();
    const anfragenC = festAnfragen(), gesamtC = Object.values(zaehler).reduce((a, b) => a + b, 0);
    const kc = await namen(), fc = (await inhalt(ist)) || [];
    zeilen.push(`c) Sprung auf v9001: ${gesamtC} Anfragen an den Server, davon ${anfragenC} nach festen Dateien · Version ${vc} · Caches ${kc.join(", ")}`);
    if (!cOk) probleme.push("c) Versionssprung kommt nicht an");
    if (anfragenC) probleme.push("c) beim Versionssprung wurden feste Dateien neu geholt: " + festPfade.filter(p => zaehler[p]).slice(0, 5).join(", "));
    if (!kc.includes(ist) || !festPfade.every(p => fc.includes(p))) probleme.push("c) fester Cache hat den Versionssprung nicht überlebt");
    if (vc !== "v9001") probleme.push("c) Version nach dem Sprung " + vc + " statt v9001");
    if (!sc) probleme.push("c) Icon-Schrift nach dem Sprung nicht geladen");
    if (gesamtC < 40) probleme.push("c) nur " + gesamtC + " Anfragen gezählt – der Zähler misst nicht");

    // d) Feste Datei geändert: anderer Name
    leeren(); festName = "adler-fest-probe001"; version = "v9002";
    await update();
    const dOk = await warteBis(async () => { const k = await namen(); const i = await inhalt(festName); return k.includes("u9i-adler-v9002") && !k.includes(ist) && i && festPfade.every(p => i.includes(p)); });
    zeilen.push(`d) neuer Name: Caches ${(await namen()).join(", ")}, ${festAnfragen()} Anfragen nach festen Dateien`);
    if (!dOk) probleme.push("d) neuer fester Cache nicht vollständig gefüllt oder alter nicht gelöscht");
    if (festAnfragen() < festPfade.length) probleme.push("d) bei neuem Namen wurden nicht alle festen Dateien geholt");

    // e) Reparaturweg: alle Caches weg, Seite neu
    await w_(1500); await neuLaden();
    await page.evaluate(async () => { for (const k of await caches.keys()) await caches.delete(k); });
    await neuLaden();
    const se = await schriftDa();
    const eOk = await warteBis(async () => { const i = await inhalt(festName); return i && i.includes("/vendor/fonts/tabler-icons.woff2") && i.includes("/vendor/tabler-icons.min.css"); }, 8000);
    zeilen.push(`e) nach dem Löschen aller Caches: Schrift geladen ${se}, fester Cache wieder ${((await inhalt(festName)) || []).length} Einträge`);
    if (!se) probleme.push("e) Icon-Schrift fehlt nach dem Reparaturweg");
    if (!eOk) probleme.push("e) fester Cache füllt sich nach dem Reparaturweg nicht wieder");

    // f) Eine feste Datei fehlt auf dem Server
    kaputt = "/vendor/chart.umd.js"; festName = "adler-fest-probe002"; version = "v9003";
    await update();
    const fOk = await warteBis(async () => { const k = await namen(); return k.includes("u9i-adler-v9003") && !k.includes("u9i-adler-v9002"); });
    const ff = (await inhalt(festName)) || [];
    zeilen.push(`f) ohne ${kaputt}: Caches ${(await namen()).join(", ")}, fester Cache ${ff.length} Einträge`);
    if (!fOk) probleme.push("f) eine fehlende feste Datei blockiert das Update");
    if (ff.includes(kaputt)) probleme.push("f) die fehlende Datei steht trotzdem im festen Cache");
  } finally {
    await browser.close();
    server.close();
  }
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
