/* Gemeinsame Grundlage aller Pruefungen.
   - laedt die ECHTEN App-Dateien ueber eine Route (kein Server noetig)
   - ersetzt Supabase durch eine Attrappe je Pruefung
   - kennt keine Kindernamen: das Repo ist oeffentlich */
"use strict";
const fs = require("fs"), path = require("path");

const REPO = process.env.REPO || path.resolve(__dirname, "..");

function playwright() {
  try { return require("playwright"); } catch (e) {}
  // In der Cloud-Sitzung liegt Playwright global; lokal reicht `npm install`.
  try {
    const root = require("child_process").execSync("npm root -g", { encoding: "utf8" }).trim();
    return require(path.join(root, "playwright"));
  } catch (e) {
    throw new Error("Playwright fehlt. Einmalig: npm install");
  }
}

/* Neutrale Kinder - „Kind A" bis „Kind O". Fuenfzehn, wie ein echter U9-Kader. */
const KINDER = Array.from({ length: 15 }, (_, i) => "Kind " + String.fromCharCode(65 + i));
function kaderZeilen(opt = {}) {
  const inaktiv = new Set(opt.inaktiv || []);
  return KINDER.map((n, i) => ({
    id: i + 1, name: n, nr: i + 1, tw: i === 0, tw_prio: i === 0 ? 1 : 0,
    aktiv: !inaktiv.has(n), sort_order: inaktiv.has(n) ? 900 + i : i + 1
  }));
}
const heute = () => new Date().toISOString().slice(0, 10);
const tagePlus = d => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

/* Attrappe: {tabelle: zeilen | (url, request) => zeilen} - alles andere antwortet []. */
/* tabellen: { <tabelle>: Zeilen|Funktion, rpc: { <name>: Antwort|Funktion } }
   RPCs liegen unter /rest/v1/rpc/<name> – der Tabellen-Regex traf sie nicht, sie kamen
   deshalb immer als [] zurueck. Ohne Eintrag bleibt es dabei (wie bisher). */
function supabaseAttrappe(tabellen = {}) {
  return (u, req) => {
    const r = u.pathname.match(/\/rest\/v1\/rpc\/([a-z_]+)$/);
    if (r) {
      const f = (tabellen.rpc || {})[r[1]];
      if (f == null) return { status: 200, body: "[]" };
      const w = (typeof f === "function") ? f(u, req) : f;
      return (w && w.status) ? w : { status: 200, body: JSON.stringify(w == null ? null : w) };
    }
    const m = u.pathname.match(/\/rest\/v1\/([a-z_]+)$/);
    if (!m) return { status: 200, body: "[]" };
    const t = tabellen[m[1]];
    if (t == null) return { status: 200, body: "[]" };
    if (typeof t === "function") { const r = t(u, req); return r && r.status ? r : { status: 200, body: JSON.stringify(r || []) }; }
    if (req.method() === "POST" || req.method() === "PATCH") return { status: 201, body: "[]" };
    return { status: 200, body: JSON.stringify(t) };
  };
}

/* opt: start, supabase, breite, hoehe, scheme ("light"|"dark"), warten (ms), browser,
        angemeldet=false (kein Token), ohnePinGate=false, speicherBehalten (adler_blitz bleibt) */
async function starten(opt = {}) {
  const { chromium } = playwright();
  const start = opt.start || "/trainer/index.html";
  const browser = opt.browser || await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: opt.breite || 390, height: opt.hoehe || 1400 },
    colorScheme: opt.scheme || "light"
  });
  const antwort = opt.supabase || supabaseAttrappe({});
  const gesendet = [];                                   // was die App an "Supabase" schickt
  await ctx.route("**/*", async r => {
    const req = r.request(), u = new URL(req.url());
    if (u.hostname.includes("supabase.co")) {
      if (req.method() !== "GET") gesendet.push({ pfad: u.pathname, methode: req.method(), body: (() => { try { return JSON.parse(req.postData() || "null"); } catch (e) { return req.postData(); } })() });
      const a = antwort(u, req) || { status: 200, body: "[]" };
      return r.fulfill({ status: a.status, contentType: "application/json", body: a.body });
    }
    if (u.hostname !== "app.test") return r.fulfill({ status: 200, contentType: "text/plain", body: "" });
    const f = path.join(REPO, u.pathname === "/" ? start : u.pathname);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: "" });
    const typ = f.endsWith(".js") ? "application/javascript" : f.endsWith(".css") ? "text/css" : f.endsWith(".html") ? "text/html" : "text/plain";
    return r.fulfill({ status: 200, contentType: typ, body: fs.readFileSync(f, "utf8") });
  });
  await ctx.addInitScript(behalten => {
    try {
      ["adler_tour", "adler_trainer_tour", "adler_eltern_tour"].forEach(k => localStorage.setItem(k, "1"));
      if (!behalten) localStorage.removeItem("adler_blitz");   // bei jedem Aufruf, auch nach reload()
    } catch (e) {}
  }, !!opt.speicherBehalten);
  const page = await ctx.newPage();
  const fehler = [];
  page.on("pageerror", e => fehler.push("PAGEERROR: " + e.message));
  page.on("console", m => { if (m.type() === "error") fehler.push("CONSOLE: " + m.text()); });
  await page.goto("https://app.test" + start, { waitUntil: "networkidle" });
  await page.waitForTimeout(opt.warten || 800);
  if (opt.angemeldet !== false) await page.evaluate(() => {
    window.sbToken = () => "attrappe";
    window.sbAuthHeaders = x => ({ ...(x || {}), "Content-Type": "application/json" });
  });
  if (opt.ohnePinGate !== false) await page.evaluate(() => {
    document.querySelectorAll("[id]").forEach(e => { if (/pin/i.test(e.id) && /gate|overlay|wrap|screen/i.test(e.id)) e.style.display = "none"; });
  });
  /* Rauschen der Attrappe, gegen die vorige Fassung als identisch belegt: kein Konto,
     kein Kader vom Server, kein Icon-Font. */
  const bekannt = /favicon|manifest|404|Failed to load resource|setting .className.|unknown error occurred when fetching the script/i;
  return {
    browser, ctx, page, gesendet,
    fehler: () => fehler.filter(t => !bekannt.test(t)),
    schliessen: async () => { await ctx.close(); if (!opt.browser) await browser.close(); }
  };
}

/* Ein Element aus display:none-Vorfahren befreien (Trainer-Oberflaeche hinter dem PIN-Gate).
   Erst display:"" (zurueck auf den Stylesheet-Wert), block nur als Notnagel. */
const sichtbarMachen = (page, selektor) => page.evaluate(sel => {
  let el = document.querySelector(sel);
  if (!el) { el = document.createElement("div"); el.id = sel.replace(/^#/, ""); document.body.appendChild(el); }
  for (let e = el; e && e !== document.documentElement; e = e.parentElement)
    if (getComputedStyle(e).display === "none") { e.style.display = ""; if (getComputedStyle(e).display === "none") e.style.display = "block"; }
}, selektor);

/* Terminauswahl des Trainingsplans / der Anwesenheit auf ein Datum stellen. */
const terminSetzen = (page, datum, id = "tp-date") => page.evaluate(({ datum, id }) => {
  let d = document.getElementById(id);
  if (!d) { d = document.createElement("select"); d.id = id; document.body.appendChild(d); }
  d.innerHTML = `<option value="${datum}" selected>${datum}</option>`; d.value = datum;
}, { datum, id });

/* Kontrast nach WCAG, ueber die ganze Vorfahrenkette gerechnet (Alpha, Verlaeufe). */
const kontrastHelfer = `
  const lum=c=>{const v=c.slice(0,3).map(x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)});return .2126*v[0]+.7152*v[1]+.0722*v[2];};
  const parse=s=>{const m=String(s).match(/(\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?/);return m?[+m[1],+m[2],+m[3],m[4]===undefined?1:+m[4]]:null;};
  const drauf=(v,h)=>{const a=v[3];return [0,1,2].map(i=>Math.round(v[i]*a+h[i]*(1-a))).concat(1);};
  const grund=el=>{const l=[];for(let e=el;e;e=e.parentElement)l.push(getComputedStyle(e).backgroundColor);let u=[255,255,255,1];for(let i=l.length-1;i>=0;i--){const s=parse(l[i]);if(!s)continue;u=drauf(s,u);}return u;};
  const kontrast=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return +(((x+.05)/(y+.05)).toFixed(2));};
  window.__kontrastVon=el=>kontrast(drauf(parse(getComputedStyle(el).color)||[0,0,0,1],grund(el)),grund(el));`;

function ergebnis(name, ok, zeilen = []) { return { name, ok: !!ok, zeilen: [].concat(zeilen) }; }

const chromium = () => playwright().chromium;

module.exports = { REPO, KINDER, kaderZeilen, heute, tagePlus, supabaseAttrappe, starten, sichtbarMachen, terminSetzen, kontrastHelfer, ergebnis, chromium };
