/* v696 · Ein Tipp auf die Benachrichtigung öffnet die richtige App
   PO 30.09.: „Wenn ich oben drauf klicke, öffnet sich die Trainer-App – obwohl ich die
   Benachrichtigung in der Eltern-App angefordert habe.“ Der Klick-Handler im Service Worker nahm
   das erste offene Fenster, egal welcher App; die Test-Meldung trug nur „./“ als Ziel.
   Geprüft am echten sw.js (in einer Sandbox mit nachgebildeten Fenstern):
   a) Eltern-Ziel, Trainer- und Eltern-Fenster offen → das Eltern-Fenster wird fokussiert, nicht das Trainer-Fenster
   b) Eltern-Ziel, nur Trainer-Fenster offen → neues Fenster mit dem Eltern-Ziel
   c) Weiche mit ?portal → Eltern; „./“ → Trainer; ?kinder → Kabine (wie index.html)
   d) Die Eltern-Routen im Service Worker sind dieselben wie in index.html
   e) Die Test-Meldung nennt als Ziel die App, aus der sie kam */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const REPO = h.REPO || path.join(__dirname, "..", "..");
  const sw = fs.readFileSync(path.join(REPO, "sw.js"), "utf8");
  const L = {};
  const scope = "https://beispiel.test/u9-app/";
  const ctx = { URL, console, self: { addEventListener: (t, f) => { L[t] = f; }, registration: { scope }, skipWaiting() {} },
    caches: { open: async () => ({ addAll: async () => {} }), keys: async () => [], match: async () => null }, fetch: async () => ({}), setTimeout, clearTimeout };
  let fenster = [], geoeffnet = [], fokus = [];
  ctx.clients = { matchAll: async () => fenster, openWindow: async u => { geoeffnet.push(u); }, claim: async () => {} };
  vm.createContext(ctx);
  try { vm.runInContext(sw, ctx); } catch (e) { probleme.push("sw.js lässt sich nicht ausführen: " + e.message); }
  const fw = (url) => ({ url, navigiert: null, navigate(u) { this.navigiert = u; }, focus() { fokus.push(this.url); return Promise.resolve(); } });
  async function klick(url, offen) {
    fenster = offen.map(fw); geoeffnet = []; fokus = [];
    let warte = Promise.resolve();
    L.notificationclick({ notification: { close() {}, data: { url } }, waitUntil: p => { warte = p; } });
    await warte;
    return { fokus: fokus.slice(), geoeffnet: geoeffnet.slice(), navigiert: fenster.filter(f => f.navigiert).map(f => f.url) };
  }
  const T = scope + "trainer/", E = scope + "eltern/?portal";
  if (!L.notificationclick) probleme.push("kein notificationclick-Handler");
  else {
    const a = await klick("./eltern/?rufe=3", [T, E]);
    if (JSON.stringify(a.fokus) !== JSON.stringify([E]) || a.geoeffnet.length) probleme.push(`a) ${JSON.stringify(a)}`);
    const b = await klick("./eltern/?rufe=3", [T]);
    if (b.fokus.length || JSON.stringify(b.geoeffnet) !== JSON.stringify([scope + "eltern/?rufe=3"])) probleme.push(`b) ${JSON.stringify(b)}`);
    const c1 = await klick("./?portal", [T]);
    const c2 = await klick("./", [T, E]);
    const c3 = await klick("./?kinder", [T, E]);
    if (c1.geoeffnet[0] !== scope + "?portal") probleme.push(`c) ?portal: ${JSON.stringify(c1)}`);
    if (JSON.stringify(c2.fokus) !== JSON.stringify([T])) probleme.push(`c) ./: ${JSON.stringify(c2)}`);
    if (c3.geoeffnet[0] !== scope + "?kinder" || c3.fokus.length) probleme.push(`c) ?kinder: ${JSON.stringify(c3)}`);
    zeilen.push(`Eltern-Ziel bei offenem Trainer+Eltern → Fokus ${a.fokus.map(u => u.replace(scope, "")).join(",")} · nur Trainer offen → neu ${b.geoeffnet.map(u => u.replace(scope, "")).join(",")}`);
  }
  // d) Routen wie index.html
  const idx = fs.readFileSync(path.join(REPO, "index.html"), "utf8");
  const ausIdx = (idx.match(/var elternRouten=(\[[^\]]*\])/) || [])[1];
  const ausSw = (sw.match(/const ELTERN_ROUTEN=(\[[^\]]*\])/) || [])[1];
  if (!ausIdx || !ausSw || JSON.stringify(JSON.parse(ausIdx)) !== JSON.stringify(JSON.parse(ausSw))) probleme.push(`d) Routen weichen ab: index ${ausIdx} · sw ${ausSw}`);
  // e) Ziel der Test-Meldung
  const core = fs.readFileSync(path.join(REPO, "core.js"), "utf8");
  const fn = (core.match(/function pushTestZiel\(\)\{[^\n]*\}/) || [])[0];
  if (!fn) probleme.push("e) pushTestZiel fehlt");
  else {
    const ziel = p => vm.runInNewContext(fn + ";pushTestZiel()", { location: { pathname: p } });
    const e1 = ziel("/u9-app/eltern/"), e2 = ziel("/u9-app/trainer/"), e3 = ziel("/u9-app/kinder/index.html");
    if (e1 !== "./eltern/" || e2 !== "./trainer/" || e3 !== "./kinder/") probleme.push(`e) ${e1} ${e2} ${e3}`);
    else zeilen.push(`Test-Meldung: Ziel ${e1} aus der Eltern-App`);
  }
  return h.ergebnis("Benachrichtigung öffnet die App, zu der sie gehört", !probleme.length, zeilen.concat(probleme));
};
