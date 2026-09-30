/* v697 · Tipp auf eine Meldung springt in der offenen App direkt ins Gespräch
   PO 30.09.: „Am besten wäre, wenn man nach dem Tipp direkt auf die Seite mit der Nachricht käme.“
   Seit v696 wird das richtige Fenster umgeleitet – dafür lädt die App neu. Jetzt fragt der
   Service Worker die offene App zuerst, ob sie das Ziel selbst öffnen kann.
   a) Offene App sagt „ja“ → nur Fokus, kein Neuladen, kein neues Fenster
   b) Offene App antwortet nicht (alte Fassung) → wie v696 umleiten
   c) Die App sagt „ja“ zu ?rufe=<Raum> im eigenen Einstieg und merkt sich den Raum,
      „nein“ zu anderen Zielen (?portal, andere App)
   d) Ist das Gespräch schon offen, wechselt sie nur den Raum; ohne Anmeldung wartet die Absicht */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const REPO = h.REPO || path.join(__dirname, "..", "..");
  const sw = fs.readFileSync(path.join(REPO, "sw.js"), "utf8");
  const L = {}, scope = "https://beispiel.test/u9-app/";
  const ctx = { URL, console, MessageChannel, setTimeout, clearTimeout, Promise,
    self: { addEventListener: (t, f) => { L[t] = f; }, registration: { scope }, skipWaiting() {} },
    caches: { open: async () => ({ addAll: async () => {} }), keys: async () => [], match: async () => null }, fetch: async () => ({}) };
  let fenster = [], geoeffnet = [];
  ctx.clients = { matchAll: async () => fenster, openWindow: async u => { geoeffnet.push(u); }, claim: async () => {} };
  vm.createContext(ctx);
  try { vm.runInContext(sw, ctx); } catch (e) { probleme.push("sw.js: " + e.message); }
  const fw = (url, antwort) => ({ url, navigiert: null, gefragt: null, navigate(u) { this.navigiert = u; return Promise.resolve(this); },
    focus() { return Promise.resolve(this); },
    postMessage(d, ports) { this.gefragt = d; if (antwort !== undefined) setTimeout(() => ports[0].postMessage({ ok: antwort }), 20); } });
  async function klick(url, f) {
    fenster = [f]; geoeffnet = [];
    let warte = Promise.resolve();
    L.notificationclick({ notification: { close() {}, data: { url } }, waitUntil: p => { warte = p; } });
    const t0 = Date.now(); await warte;
    for (const p of [f.port1, f.port2]) try { p && p.close(); } catch (_) {}
    return { navigiert: f.navigiert, gefragt: f.gefragt, geoeffnet: geoeffnet.slice(), ms: Date.now() - t0 };
  }
  if (!L.notificationclick) probleme.push("kein notificationclick-Handler");
  else {
    const a = await klick("./eltern/?rufe=3", fw(scope + "eltern/", true));
    if (a.navigiert || a.geoeffnet.length || !a.gefragt || a.gefragt.url !== scope + "eltern/?rufe=3") probleme.push(`a) ${JSON.stringify(a)}`);
    const b = await klick("./eltern/?rufe=3", fw(scope + "eltern/"));
    if (b.navigiert !== scope + "eltern/?rufe=3" || b.geoeffnet.length) probleme.push(`b) ${JSON.stringify(b)}`);
    const b2 = await klick("./eltern/?portal", fw(scope + "eltern/", false));
    if (b2.navigiert !== scope + "eltern/?portal") probleme.push(`b) Antwort nein: ${JSON.stringify(b2)}`);
    zeilen.push(`Offen und bereit → kein Neuladen (${a.ms} ms) · alte Fassung → Umleitung nach ${b.ms} ms`);
  }
  // c) + d) im echten Trainer-Einstieg
  const s = await h.starten({ breite: 390, hoehe: 844, warten: 1500 });
  const r = await s.page.evaluate(async () => {
    const out = {};
    const frage = url => { let a = null; pushZielEmpfangen({ data: { art: "push-ziel", url }, ports: [{ postMessage: v => { a = v; } }] }); return a && a.ok; };
    const hier = location.origin + location.pathname;
    const alt = { sbToken: window.sbToken, wechsel: window.rufeRaumWechseln, open: window.rufeOpen };
    let gewechselt = null, geoeffnet = null;
    window.sbToken = () => ""; window.rufeRaumWechseln = id => { gewechselt = id; }; window.rufeOpen = id => { geoeffnet = id; };
    try { sessionStorage.removeItem("adler_rufe_intent"); } catch (e) {}
    out.rufe = frage(hier + "?rufe=7");
    out.absicht = sessionStorage.getItem("adler_rufe_intent");
    out.leer = frage(hier);
    out.portal = frage(hier + "?portal");
    out.fremd = frage(location.origin + location.pathname.replace(/trainer\/.*$/, "eltern/") + "?rufe=7");
    // d) angemeldet, Gespräch offen → nur Raum wechseln
    window.sbToken = () => "t";
    document.getElementById("pin-gate")?.classList.add("hidden");
    const m = document.createElement("div"); m.id = "rufe-modal"; document.body.appendChild(m);
    sessionStorage.setItem("adler_rufe_intent", "5"); rufeAbsichtJetzt();
    out.wechsel = gewechselt; out.danach = sessionStorage.getItem("adler_rufe_intent");
    m.remove(); sessionStorage.setItem("adler_rufe_intent", "6"); rufeAbsichtJetzt(); out.open = geoeffnet;
    window.sbToken = () => ""; sessionStorage.setItem("adler_rufe_intent", "8"); rufeAbsichtJetzt(); out.wartet = sessionStorage.getItem("adler_rufe_intent");
    sessionStorage.removeItem("adler_rufe_intent");
    Object.assign(window, { sbToken: alt.sbToken, rufeRaumWechseln: alt.wechsel, rufeOpen: alt.open });
    return out;
  }).catch(e => ({ fehler: e.message }));
  const f = s.fehler(); await s.schliessen();
  if (r.fehler) probleme.push("Seite: " + r.fehler);
  else {
    if (r.rufe !== true || r.absicht !== "7") probleme.push(`c) ?rufe=7: ok ${r.rufe}, Absicht ${r.absicht}`);
    if (r.leer !== true) probleme.push("c) eigener Einstieg ohne Ziel: nicht ok");
    if (r.portal !== false || r.fremd !== false) probleme.push(`c) fremde Ziele: portal ${r.portal}, andere App ${r.fremd}`);
    if (r.wechsel !== 5 || r.danach) probleme.push(`d) offenes Gespräch: gewechselt ${r.wechsel}, Absicht ${r.danach}`);
    if (r.open !== 6) probleme.push(`d) geschlossenes Gespräch: geöffnet ${r.open}`);
    if (r.wartet !== "8") probleme.push("d) ohne Anmeldung ging die Absicht verloren");
    zeilen.push(`App: ?rufe=7 → ja (Raum ${r.absicht}) · ?portal → ${r.portal ? "ja" : "nein"} · offenes Gespräch → Raum ${r.wechsel}`);
  }
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  return h.ergebnis("Tipp auf die Meldung: direkt ins Gespräch, ohne Neuladen", !probleme.length, zeilen.concat(probleme));
};
