/* v655 · Die App holt sich Updates selbst (Befund 28.09.2026).
   Ein Trainer stand noch auf v514 (Stand 10.09.) und sah Knöpfe nicht, die es seit v544
   gibt. Ein Browser fragt nur beim Laden einer Seite nach einem neuen Service Worker; eine
   App im Hintergrund oder ein wochenlang offener Tab lädt nie. Kam ein Update doch an,
   lud die App nur in der ersten Minute neu, danach gab es einen leicht übersehenen Toast.

   Geprüft mit einem echten Service Worker, dessen Version der Server hochzählt:
   a) Erster Besuch: der Worker übernimmt, die Seite lädt NICHT neu.
   b) Nach mehr als einer Minute, Rückkehr in die App: die App sieht selbst nach, das
      Update kommt an. Solange Text in Arbeit ist, wird nicht neu geladen, sondern
      „Neu laden“ angeboten.
   c) Ohne Text, beim Wechsel weg von der App: unbemerkt neu geladen, neue Version aktiv.
   d) Fehlt eine einzelne Nebendatei beim Update, kommt das Update trotzdem an
      (früher: addAll, alles oder nichts – das Gerät blieb still auf der alten Version).
   e) Fehlt eine Kerndatei, bleibt die alte Version, und kein halber Cache täuscht eine
      neue Versionsnummer vor. */
"use strict";
const fs = require("fs"), path = require("path");

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  let version = "v9000", kaputt = null;
  /* Ein echter Webserver auf localhost: einen Service Worker nimmt Chromium nur von einer
     echten, sicheren Adresse an – über die nachgebildete app.test scheitert schon das Laden. */
  const http = require("http");
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, "http://localhost");
    const nicht = () => { res.writeHead(404); res.end(); };
    if (/\/uebungen\/[^/]+\.json$/.test(u.pathname)) return nicht();
    if (kaputt && u.pathname === kaputt) return nicht();
    const p = u.pathname.endsWith("/") ? u.pathname + "index.html" : u.pathname;
    const f = path.join(h.REPO, p);
    if (!f.startsWith(h.REPO) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return nicht();
    const typ = f.endsWith(".js") ? "application/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".html") ? "text/html"
      : f.endsWith(".json") ? "application/json" : f.endsWith(".woff2") ? "font/woff2" : f.endsWith(".png") ? "image/png"
      : f.endsWith(".mp3") ? "audio/mpeg" : "application/octet-stream";
    let body = fs.readFileSync(f);
    if (p === "/sw.js") body = body.toString("utf8").replace(/u9i-adler-v\d+/, "u9i-adler-" + version);
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
      sessionStorage.setItem("ladungen", String(Number(sessionStorage.getItem("ladungen") || 0) + 1));
      ["adler_tour", "adler_trainer_tour", "adler_eltern_tour"].forEach(k => localStorage.setItem(k, "1"));
    } catch (e) {}
  });
  const page = await ctx.newPage();
  await page.clock.install();
  const w = ms => page.waitForTimeout(ms);
  const ladungen = () => page.evaluate(() => Number(sessionStorage.getItem("ladungen") || 0)).catch(() => -1);
  const caches_ = () => page.evaluate(() => caches.keys()).catch(() => []);
  const warteBis = async (f, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await f()) return true; } catch (e) {} await w(250); } return false; };
  const sichtbarkeit = versteckt => page.evaluate(v => {
    Object.defineProperty(document, "hidden", { get: () => v, configurable: true });
    Object.defineProperty(document, "visibilityState", { get: () => v ? "hidden" : "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  }, versteckt);

  try {
    await page.goto(BASIS + "/trainer/index.html", { waitUntil: "load" });
    // a) Erster Besuch
    const kontrolliert = await warteBis(() => page.evaluate(() => !!navigator.serviceWorker.controller));
    await w(2500);
    const l1 = await ladungen();
    zeilen.push(`a) Worker übernimmt: ${kontrolliert}, Ladungen: ${l1}, Caches: ${(await caches_()).join(", ")}`);
    if (!kontrolliert) probleme.push("a) Service Worker übernimmt nicht");
    if (l1 !== 1) probleme.push("a) Erster Besuch lädt neu (" + l1 + ")");

    // b) Zwei Minuten später, Text in Arbeit, neue Version auf dem Server, Rückkehr in die App
    await page.clock.fastForward("06:00");
    await page.evaluate(() => { const t = document.createElement("textarea"); t.id = "probe-text"; t.value = "halb geschrieben"; document.body.appendChild(t); });
    version = "v9001";
    await sichtbarkeit(false);
    const hinweis = await warteBis(() => page.evaluate(() => !!document.getElementById("app-update")));
    const cb = await caches_();
    const l2 = await ladungen();
    zeilen.push(`b) Hinweis „Neu laden“: ${hinweis}, Ladungen: ${l2}, Caches: ${cb.join(", ")}`);
    if (!cb.includes("u9i-adler-v9001")) probleme.push("b) Update kommt bei Rückkehr in die App nicht an");
    if (!hinweis) probleme.push("b) kein Knopf „Neu laden“");
    if (l2 !== 1) probleme.push("b) neu geladen, obwohl Text in Arbeit war");
    const knopfHoehe = await page.evaluate(() => { const b = document.querySelector("#app-update button"); return b ? b.getBoundingClientRect().height : 0; });
    if (hinweis && knopfHoehe < 44) probleme.push("b) Knopf „Neu laden“ kleiner als 44 px (" + knopfHoehe + ")");

    // Wechsel weg von der App, Text noch da: nichts passiert
    await sichtbarkeit(true); await w(1200);
    if (await ladungen() !== 1) probleme.push("b) beim Wechsel weg trotz Text neu geladen");
    await sichtbarkeit(false);

    // c) Text weg, Wechsel weg von der App: neu laden
    await page.evaluate(() => document.getElementById("probe-text").remove());
    await sichtbarkeit(true);
    const neu = await warteBis(async () => (await ladungen()) === 2);
    await warteBis(() => page.evaluate(() => typeof appVersion === "function"));
    const vc = await page.evaluate(() => typeof appVersion === "function" ? appVersion() : "").catch(() => "");
    zeilen.push(`c) neu geladen: ${neu}, Version danach: ${vc}`);
    if (!neu) probleme.push("c) beim Wechsel weg von der App nicht neu geladen");
    if (vc !== "v9001") probleme.push("c) Version nach dem Neuladen " + vc + " statt v9001");

    // d) Eine Nebendatei fehlt: Update kommt trotzdem an (frische Seite lädt sofort neu)
    kaputt = "/vendor/chart.umd.js"; version = "v9002";
    await page.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update())).catch(() => {});
    const dOk = await warteBis(async () => { const k = await caches_(); return k.includes("u9i-adler-v9002") && !k.includes("u9i-adler-v9001"); });
    zeilen.push(`d) ohne ${kaputt}: Caches ${(await caches_()).join(", ")}, Ladungen ${await ladungen()}`);
    if (!dOk) probleme.push("d) eine fehlende Nebendatei blockiert das Update");

    // e) Eine Kerndatei fehlt: alte Version bleibt, kein halber Cache
    await warteBis(async () => (await ladungen()) >= 3, 8000);
    await w(1500);
    kaputt = "/core.js"; version = "v9003";
    const lvor = await ladungen();
    await page.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update())).catch(() => {});
    await w(4000);
    const ke = await caches_();
    zeilen.push(`e) ohne core.js: Caches ${ke.join(", ")}`);
    if (ke.includes("u9i-adler-v9003")) probleme.push("e) halber Cache v9003 bleibt liegen und täuscht eine neue Version vor");
    if (!ke.includes("u9i-adler-v9002")) probleme.push("e) die laufende Version v9002 ist weg");
    if (await ladungen() !== lvor) probleme.push("e) trotz gescheitertem Update neu geladen");
  } finally {
    await browser.close();
    server.close();
  }
  return h.ergebnis("v655 App holt Updates selbst und lädt im passenden Moment neu", !probleme.length, probleme.concat(zeilen));
};
