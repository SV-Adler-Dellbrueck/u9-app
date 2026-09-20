/* Schritt 1 des Auftragspakets Kinder-App: Minimal-Loader messen, nicht raten.
   Laedt eltern/index.html im Pruefstand-Browser, liefert jede JS-Datei, die NICHT in der
   Liste steht, leer aus, oeffnet die Kabine mit einer vorgetaeuschten Eltern-Sitzung und
   klickt jede Kachel samt erster Unterebene an. Jeder ReferenceError oder TypeError ist
   eine Datei, die in der Liste fehlt.

   Aufruf aus dem Repo-Wurzelverzeichnis:
     node doku/auftrag-kinder-app/messung-minimal-loader.js kabine data.js,core.js,...
     node doku/auftrag-kinder-app/messung-minimal-loader.js quiz   data.js,core.js,...
   Braucht das Pruefwerkzeug (npm install) – dieselbe Attrappe, dieselben „Kind A“ bis „Kind O“. */
"use strict";
const fs = require("fs"), path = require("path");
const REPO = path.resolve(__dirname, "..", "..");
const h = require(path.join(REPO, "tests", "harness.js"));
function playwright() {
  try { return require("playwright"); } catch (e) {}
  const root = require("child_process").execSync("npm root -g", { encoding: "utf8" }).trim();
  return require(path.join(root, "playwright"));
}
const modus = process.argv[2] || "kabine";
const NUR = new Set((process.argv[3] || "").split(",").filter(Boolean));
if (!NUR.size) { console.error("Dateiliste fehlt."); process.exit(2); }

(async () => {
  const { chromium } = playwright();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 1400 } });
  const kader = h.kaderZeilen();
  const antwort = h.supabaseAttrappe({
    kader, termine: [{ id: 1, datum: h.tagePlus(3), typ: "turnier", gegner: "Gast", titel: "Festival", uhrzeit: "10:00" }],
    team_config: [{ id: 1 }], kabine_config: [{ id: 1, code_hash: "x" }],
    rpc: { kader_namen: kader.map(k => ({ id: k.id, name: k.name, nr: k.nr })), team_gallery: [], team_federn_total: 0,
           team_meilensteine: [], kind_rolle_heute: { ok: true, rolle: null }, meine_rollen: { games: 0 }, meine_ziele: [],
           wahl_ergebnis: [], xp_events_for: [] }
  });
  const geleert = new Set();
  await ctx.route("**/*", async r => {
    const req = r.request(), u = new URL(req.url());
    if (u.hostname.includes("supabase.co")) { const a = antwort(u, req) || { status: 200, body: "[]" }; return r.fulfill({ status: a.status, contentType: "application/json", body: a.body }); }
    if (u.hostname !== "app.test") return r.fulfill({ status: 200, contentType: "text/plain", body: "" });
    if (/\/uebungen\/[^/]+\.json$/.test(u.pathname)) return r.fulfill({ status: 404, body: "" });
    const f = path.join(REPO, u.pathname);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: "" });
    const name = path.basename(u.pathname);
    if (f.endsWith(".js") && !NUR.has(name)) { geleert.add(name); return r.fulfill({ status: 200, contentType: "application/javascript", body: "/* leer */" }); }
    const typ = f.endsWith(".js") ? "application/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".html") ? "text/html" : "text/plain";
    return r.fulfill({ status: 200, contentType: typ, body: fs.readFileSync(f, "utf8") });
  });
  await ctx.addInitScript(() => { try { ["adler_tour", "adler_trainer_tour", "adler_eltern_tour"].forEach(k => localStorage.setItem(k, "1")); } catch (e) {} });
  const page = await ctx.newPage();
  const fehler = []; let phase = "start";
  page.on("pageerror", e => fehler.push(phase + ": " + e.message));
  page.on("console", m => { if (m.type() === "error" && /ReferenceError|TypeError/.test(m.text())) fehler.push(phase + ": " + m.text()); });

  const start = modus === "quiz" ? "/eltern/index.html?quiz&from=kabine&mode=taktik" : "/eltern/index.html";
  await page.goto("https://app.test" + start, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    window.sbToken = () => "attrappe"; window.sbAuthHeaders = x => ({ ...(x || {}), "Content-Type": "application/json" });
    window.sbEmail = () => "eltern@example.test";
    window._elternKids = [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 1 } }];
  });
  const klick = async code => { try { await page.evaluate(async c => { try { await (0, eval)(c); } catch (e) { console.error(String(e && e.stack || e)); } }, code); } catch (e) { fehler.push(phase + ": " + e.message); } };
  const ergebnis = { modus, geleert: geleert.size };

  if (modus === "kabine") {
    phase = "kabineOpen";
    ergebnis.da = await page.evaluate(async () => { if (typeof kabineOpen !== "function") return "kabineOpen fehlt"; kabineOpen(); for (let i = 0; i < 60 && !document.getElementById("kabine-body"); i++) await new Promise(r => setTimeout(r, 50)); return document.getElementById("kabine-body") ? "ok" : "kein kabine-body"; });
    await page.waitForTimeout(1200);
    const kacheln = await page.evaluate(() => [...document.querySelectorAll("#kabine-body button[onclick]")].map(b => b.getAttribute("onclick")).filter(o => !/kabineQuiz|kabineExit/.test(o)));
    ergebnis.kacheln = kacheln.length; ergebnis.je = {};
    for (const oc of kacheln) {
      phase = oc.slice(0, 40); const vorher = fehler.length;
      await klick(oc); await page.waitForTimeout(700);
      const unter = await page.evaluate(() => [...document.querySelectorAll("#kabine-body button[onclick], #kabine button[onclick]")].map(b => b.getAttribute("onclick")).filter(o => !/kabineHome|kabineQuiz|kabineExit|kabineOpen/.test(o)).slice(0, 6));
      for (const u2 of unter) { phase = oc.slice(0, 28) + " > " + u2.slice(0, 40); await klick(u2); await page.waitForTimeout(400); }
      ergebnis.je[oc.slice(0, 40)] = fehler.length - vorher;
      await page.evaluate(() => { document.querySelectorAll("[role=dialog]").forEach(d => { if (d.id !== "kabine") d.remove(); }); if (typeof kabineHome === "function") kabineHome(); });
      await page.waitForTimeout(300);
    }
  } else {
    phase = "quiz";
    Object.assign(ergebnis, await page.evaluate(async () => {
      const out = {};
      if (typeof kidsIntroClose === "function") { try { kidsIntroClose(); } catch (e) { console.error(String(e)); } }
      await new Promise(r => setTimeout(r, 500));
      out.text = (document.body.innerText || "").replace(/\s+/g, " ").slice(0, 240);
      return out;
    }));
  }
  const bekannt = /favicon|manifest|404|Failed to load resource|setting 'className'|unknown error occurred when fetching/i;
  ergebnis.fehler = [...new Set(fehler.filter(t => !bekannt.test(t)).map(t => t.replace(/\s+at .*$/s, "").slice(0, 200)))];
  console.log(JSON.stringify(ergebnis, null, 1));
  await browser.close();
  process.exit(ergebnis.fehler.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
