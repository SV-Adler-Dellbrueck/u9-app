/* v698 · „Keine Nachricht vom Team verpassen“ – ganz oben, je Gerät, mit Anleitung
   PO 30.09.: „Für alle, die die Benachrichtigung noch nicht aktiviert haben, direkt oben auf der
   Startseite … und eine Anleitung hinter der Kachel.“ Dazu: die Kasse pflegt den Spendenlink.
   a) Eltern-Startseite: die Karte steht ganz oben – nur eine laufende Live-Kachel davor, direkt danach Adler-Rufe und Terminkarte
   b) Handy kann es: Text „Wenn du künftig …“, Knopf ≥ 48 px, „So geht’s“ ≥ 44 px; Einschalten
      meldet an und schickt sofort eine Test-Meldung
   c) iPhone im Browser: Karte trotz fehlender Push-Technik, Knopf führt zur Anleitung, iPhone zuerst
   d) Gesperrt: Karte mit „So hebst du die Sperre auf“; Anleitung nennt den Weg über die Einstellungen
   e) Anleitung ist ein Dialog (role, aria-modal), „Verstanden“ ≥ 48 px schließt
   f) Trainer-Startseite: dieselbe Karte ganz oben, Text für Trainer
   g) Spendenlink speichert über kasse_spenden_link_setzen (darf auch die Kasse) */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const STUBS = () => {
  window._z = { erlaubnis: "default", abo: null, an: 0, test: 0, ua: null, installiert: false };
  try { Object.defineProperty(Notification, "permission", { configurable: true, get: () => window._z.erlaubnis }); } catch (e) {}
  const echtUA = navigator.userAgent;
  try { Object.defineProperty(navigator, "userAgent", { configurable: true, get: () => window._z.ua || echtUA }); } catch (e) {}
  try { Object.defineProperty(navigator, "standalone", { configurable: true, get: () => window._z.installiert }); } catch (e) {}
  window.pushSupported = () => !window._z.ua;              // iPhone im Browser: keine Push-Technik
  window.pushCurrentSub = async () => window._z.abo;
  window.pushSubscribe = async rolle => { window._z.an++; window._z.rolle = rolle; window._z.erlaubnis = "granted"; window._z.abo = { endpoint: "x" }; return true; };
  window.pushRenderInto = () => {};
  window.pushTest = () => { window._z.test++; };
  try { localStorage.removeItem("adler_push_hinweis_weg"); } catch (e) {}
};
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const termine = [{ id: 5, datum: h.tagePlus(2), typ: "training", uhrzeit: "16:45", uhrzeit_ende: "18:00", ort: "Sportplatz" }];
  const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 390, hoehe: 844,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), push_subscriptions: [{ id: 1 }] /* v705: Konto steht für dieses Handy drin */, profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }], termine, rueckmeldungen: [] }) });
  await s.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(4000);
  const r = await s.page.evaluate(async stubs => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 40 && typeof elternPushHinweis !== "function"; i++) await w(100);
    eval("(" + stubs + ")()");
    const out = {};
    const slot = document.getElementById("push-hinweis-slot");
    const nach = id => { const x = document.getElementById(id); return !!(slot && x && (slot.compareDocumentPosition(x) & Node.DOCUMENT_POSITION_FOLLOWING)); };
    out.a = { slot: !!slot, vorRufe: nach("rufe-hinweis"), direktDavor: slot && slot.nextElementSibling && slot.nextElementSibling.id, davor: slot && slot.previousElementSibling ? slot.previousElementSibling.id || "?" : "" };
    const karte = () => document.getElementById("push-hinweis");
    const h = id => { const e = document.getElementById(id); return e ? Math.round(e.getBoundingClientRect().height) : 0; };
    const txt = e => e ? e.textContent.replace(/\s+/g, " ").trim() : "";
    // b) kann es
    await elternPushHinweis(); await w(50);
    out.b = { fall: karte()?.dataset.fall, text: txt(karte()), knopf: h("push-hinweis-an"), sogehts: h("push-hinweis-anleitung") };
    document.getElementById("push-hinweis-an")?.click(); await w(700);
    Object.assign(out.b, { weg: !karte(), an: _z.an, rolle: _z.rolle, test: _z.test });
    // c) iPhone im Browser
    _z.erlaubnis = "default"; _z.abo = null; _z.ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1";
    await elternPushHinweis(); await w(50);
    out.c = { fall: karte()?.dataset.fall, text: txt(karte()), knopf: txt(document.getElementById("push-hinweis-an")) };
    document.getElementById("push-hinweis-an")?.click(); await w(100);
    const dlg = document.getElementById("push-anleitung");
    out.c.dialog = dlg ? { role: dlg.getAttribute("role"), modal: dlg.getAttribute("aria-modal"), erste: txt(dlg.querySelector("section h3")), text: txt(dlg) } : null;
    const verst = dlg && [...dlg.querySelectorAll("button")].find(b => /Verstanden/.test(b.textContent));
    out.e = { verstanden: verst ? Math.round(verst.getBoundingClientRect().height) : 0 };
    verst?.click(); await w(50); out.e.zu = !document.getElementById("push-anleitung");
    // d) gesperrt (Android)
    _z.ua = null; _z.erlaubnis = "denied";
    await elternPushHinweis(); await w(50);
    out.d = { fall: karte()?.dataset.fall, knopf: txt(document.getElementById("push-hinweis-an")) };
    document.getElementById("push-hinweis-an")?.click(); await w(100);
    out.d.anleitung = txt(document.getElementById("push-anleitung"));
    document.getElementById("push-anleitung")?.remove();
    // g) Spendenlink
    const urls = []; const f0 = window.fetch;
    window.fetch = async (u, o) => { urls.push(String(u)); return new Response('"https://paypal.me/x"', { status: 200, headers: { "Content-Type": "application/json" } }); };
    const inp = document.createElement("input"); inp.id = "ak-link"; inp.value = "https://paypal.me/x"; document.body.appendChild(inp);
    if (typeof adlerkasseSave === "function") await adlerkasseSave();
    window.fetch = f0; inp.remove();
    out.g = urls;
    return out;
  }, STUBS.toString());
  const f = s.fehler(); await s.schliessen();
  // f) Trainer-Startseite
  const t = await h.starten({ breite: 390, hoehe: 844, warten: 1500 });
  await h.sichtbarMachen(t.page, "#main-app");
  const rt = await t.page.evaluate(async stubs => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    eval("(" + stubs + ")()");
    window.sbToken = () => "t";
    await renderHome(); await w(300);
    const box = document.getElementById("home-content");
    const k = document.getElementById("push-hinweis");
    return { erstes: box && box.firstElementChild && box.firstElementChild.id, karte: !!k && box.firstElementChild.contains(k), text: k ? k.textContent.replace(/\s+/g, " ").trim() : "" };
  }, STUBS.toString());
  const ft = t.fehler(); await t.schliessen();
  if (f.length) probleme.push("Konsole Eltern: " + f.slice(0, 2).join(" | "));
  if (ft.length) probleme.push("Konsole Trainer: " + ft.slice(0, 2).join(" | "));
  if (!r.a.slot || !r.a.vorRufe || r.a.direktDavor !== "rufe-hinweis" || !/^(eltern-live-slot|)$/.test(r.a.davor)) probleme.push(`a) Reihenfolge: ${JSON.stringify(r.a)}`);
  if (r.b.fall !== "aus" || !/Keine Nachricht vom Team verpassen/.test(r.b.text) || !/Wenn du künftig alle neuen Nachrichten/.test(r.b.text) || r.b.knopf < 48 || r.b.sogehts < 44) probleme.push(`b) Karte: ${JSON.stringify(r.b)}`);
  if (!r.b.weg || r.b.an !== 1 || r.b.rolle !== "parent" || r.b.test !== 1) probleme.push(`b) Einschalten: ${JSON.stringify(r.b)}`);
  if (r.c.fall !== "ios" || !/Home-Bildschirm/.test(r.c.text) || !/So geht/.test(r.c.knopf)) probleme.push(`c) iPhone-Karte: ${JSON.stringify(r.c)}`);
  if (!r.c.dialog || r.c.dialog.role !== "dialog" || r.c.dialog.modal !== "true" || r.c.dialog.erste !== "iPhone" || !/Zum Home-Bildschirm/.test(r.c.dialog.text) || !/16\.4/.test(r.c.dialog.text)) probleme.push(`c/e) Anleitung: ${JSON.stringify(r.c.dialog)}`);
  if (r.e.verstanden < 48 || !r.e.zu) probleme.push(`e) Verstanden: ${JSON.stringify(r.e)}`);
  if (r.d.fall !== "gesperrt" || !/Sperre/.test(r.d.knopf) || !/App-Info/.test(r.d.anleitung) || !/Zulassen/.test(r.d.anleitung)) probleme.push(`d) Gesperrt: ${JSON.stringify(r.d).slice(0, 200)}`);
  if (rt.erstes !== "push-hinweis-slot-trainer" || !rt.karte || !/Adler-Rufe/.test(rt.text)) probleme.push(`f) Trainer: ${JSON.stringify(rt).slice(0, 200)}`);
  if (!r.g.some(u => /rpc\/kasse_spenden_link_setzen/.test(u)) || r.g.some(u => /rest\/v1\/team_config/.test(u))) probleme.push(`g) Spendenlink: ${JSON.stringify(r.g)}`);
  zeilen.push(`Eltern: Karte ganz oben (davor ${r.a.davor || "nichts"}) · Knopf ${r.b.knopf} px · Einschalten → Test-Meldung ${r.b.test}×`);
  zeilen.push(`iPhone: „${r.c.knopf}“ → Anleitung, zuerst ${r.c.dialog && r.c.dialog.erste} · gesperrt: „${r.d.knopf}“`);
  zeilen.push(`Trainer: Karte ganz oben · Spendenlink über ${(r.g[0] || "").replace(/^.*\/rest\/v1\//, "")}`);
  return h.ergebnis("Benachrichtigungen: Karte ganz oben, je Gerät, mit Anleitung", !probleme.length, zeilen.concat(probleme));
};
