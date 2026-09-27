/* v643 · PO: „Schlüssel erneuern“ (Datenschutz-Audit: VAPID- und Cron-Schlüssel standen als
   Konstanten im Code der Edge Functions push-send, push-cron und backup-cron).

   Neu erzeugt und im Supabase Vault abgelegt; die Funktionen lesen sie über die RPC
   adler_geheimnis (nur service_role), die Cron-Jobs lesen den Cron-Schlüssel selbst aus dem Vault.
   Im Betrieb am 27.09. geprüft: Sicherung mit Vault-Schlüssel 200, falscher Schlüssel 403.

   a) Statisch: keine Funktion im Repo trägt einen Schlüssel als Konstante; die drei lesen den Vault.
   b) core.js trägt den neuen öffentlichen Schlüssel (87 Zeichen base64url).
   c) Ein Abo mit altem Schlüssel wird beim Öffnen still erneuert: löschen, abmelden, neu anmelden
      mit dem neuen Schlüssel, Rolle nach Einstieg.
   d) Ein Abo mit dem aktuellen Schlüssel bleibt unberührt; ohne Erlaubnis passiert nichts. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const R = h.REPO;
  // a) statisch
  const fn = path.join(R, "supabase/functions");
  fs.readdirSync(fn).forEach(d => {
    const f = path.join(fn, d, "index.ts"); if (!fs.existsSync(f)) return;
    const t = fs.readFileSync(f, "utf8");
    if (/(VAPID_PRIVATE|CRON_SECRET)\s*=\s*["'`]/.test(t)) probleme.push(`a) ${d}: Schlüssel als Konstante`);
    if (/x-cron-secret["']?\)\s*!==\s*["'`]/.test(t)) probleme.push(`a) ${d}: Cron-Vergleich gegen festen Text`);
  });
  ["push-send", "push-cron", "backup-cron"].forEach(d => {
    const t = fs.readFileSync(path.join(fn, d, "index.ts"), "utf8");
    if (!/adler_geheimnis/.test(t)) probleme.push(`a) ${d} liest den Vault nicht`);
  });
  const core = fs.readFileSync(path.join(R, "core.js"), "utf8");
  const pub = (core.match(/const VAPID_PUBLIC="([^"]+)"/) || [])[1] || "";
  if (!/^[A-Za-z0-9_-]{87}$/.test(pub)) probleme.push("b) VAPID_PUBLIC hat kein gültiges Format: " + pub.length);
  if (pub.startsWith("BEC5hAYJ")) probleme.push("b) core.js trägt noch den alten öffentlichen Schlüssel");

  // c/d) Abgleich im Browser mit nachgebautem PushManager
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), push_subscriptions: [] }) });
  const r = await s.page.evaluate(async () => {
    const out = {};
    const lauf = async (schluessel, erlaubnis) => {
      const log = [];
      const abo = { endpoint: "https://push.example/alt", options: { applicationServerKey: schluessel },
        unsubscribe: async () => { log.push("abmelden"); return true; } };
      const reg = { pushManager: {
        getSubscription: async () => abo,
        subscribe: async o => { log.push("anmelden:" + (o.applicationServerKey.length)); neuerSchluessel = o.applicationServerKey;
          return { endpoint: "https://push.example/neu", toJSON: () => ({ keys: { p256dh: "p", auth: "a" } }) }; } } };
      let neuerSchluessel = null;
      Object.defineProperty(navigator, "serviceWorker", { value: { ready: Promise.resolve(reg) }, configurable: true });
      Object.defineProperty(Notification, "permission", { get: () => erlaubnis, configurable: true });
      const echt = window.fetch;
      window.fetch = (u, o) => { log.push((o && o.method || "GET") + " " + String(u).split("/rest/v1/")[1] + (o && o.body ? " " + o.body : "")); return Promise.resolve(new Response("[]", { status: 201 })); };
      const erg = await pushSchluesselAbgleich();
      window.fetch = echt;
      const gleich = neuerSchluessel ? [...neuerSchluessel].join(",") === [..._urlB64ToU8(VAPID_PUBLIC)].join(",") : null;
      return { erg, log, gleich };
    };
    const alt = new Uint8Array(65).fill(7).buffer;
    const aktuell = _urlB64ToU8(VAPID_PUBLIC).buffer;
    out.alt = await lauf(alt, "granted");
    out.aktuell = await lauf(aktuell, "granted");
    out.ohne = await lauf(alt, "default");
    return out;
  });
  const fe = s.fehler(); await s.schliessen();

  const a = r.alt;
  if (a.erg !== "erneuert" || !a.log.some(x => /^DELETE push_subscriptions\?endpoint=eq\.https%3A%2F%2Fpush\.example%2Falt/.test(x))
      || !a.log.includes("abmelden") || !a.log.some(x => /^anmelden:65/.test(x)) || !a.gleich
      || !a.log.some(x => /^POST push_subscriptions\?on_conflict=endpoint .*"rolle":"trainer"/.test(x)))
    probleme.push("c) Abo mit altem Schlüssel nicht erneuert: " + JSON.stringify(a));
  if (r.aktuell.erg !== "aktuell" || r.aktuell.log.length) probleme.push("d) aktuelles Abo angefasst: " + JSON.stringify(r.aktuell));
  if (r.ohne.erg !== "aus" || r.ohne.log.length) probleme.push("d) ohne Erlaubnis etwas getan: " + JSON.stringify(r.ohne));
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`alter Schlüssel → ${a.erg}: ${a.log.map(x => x.split(" ")[0]).join(", ")} · aktueller → ${r.aktuell.erg} · ohne Erlaubnis → ${r.ohne.erg}`);
  return h.ergebnis("v643 Schlüssel im Vault, Push-Abos erneuern sich beim Öffnen", !probleme.length, probleme.concat(zeilen));
};
