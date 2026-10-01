/* v694 · Eltern-App: Benachrichtigungen einschalten – oben auf der Startseite
   PO 30.09.: „Ja, bau das“ – der Schalter lag nur unter „Trainerteam kontaktieren“.
   a) Gerät kann Push, Erlaubnis offen, kein Abo → Karte „Nichts verpassen“ mit Knopf (≥ 48 px) und × (44 px)
   b) Ein Tipp auf den Knopf meldet an (pushSubscribe „parent“) und die Karte verschwindet
   c) × blendet sie aus und merkt sich das (nach neuem Aufbau bleibt sie weg)
   d) Keine Karte, wenn schon angemeldet (Erlaubnis + Abo); gesperrt zeigt sie seit v698 den Weg zur Freigabe */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const termine = [{ id: 5, datum: h.tagePlus(2), typ: "training", uhrzeit: "16:45", uhrzeit_ende: "18:00", ort: "Sportplatz" }];
  const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 390, hoehe: 844,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), push_subscriptions: [{ id: 1 }] /* v705: Konto steht für dieses Handy drin */, profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }], termine, rueckmeldungen: [] }) });
  await s.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(4000);
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 40 && typeof elternPushHinweis !== "function"; i++) await w(100);
    let erlaubnis = "default", abo = null, angemeldet = 0;
    try { Object.defineProperty(Notification, "permission", { configurable: true, get: () => erlaubnis }); } catch (e) {}
    window.pushSupported = () => true;
    window.pushCurrentSub = async () => abo;
    window.pushSubscribe = async rolle => { angemeldet++; window._rolle = rolle; erlaubnis = "granted"; abo = { endpoint: "x" }; return true; };
    window.pushRenderInto = () => {};
    try { localStorage.removeItem("adler_push_hinweis_weg"); } catch (e) {}
    const karte = () => document.getElementById("push-hinweis");
    const out = {};
    await elternPushHinweis(); await w(50);
    const k = karte();
    out.a = k ? { text: k.textContent.replace(/\s+/g, " ").trim(), knopf: Math.round(document.getElementById("push-hinweis-an").getBoundingClientRect().height),
      zu: Math.round(k.querySelector('[aria-label="Hinweis ausblenden"]').getBoundingClientRect().height) } : null;
    document.getElementById("push-hinweis-an")?.click(); await w(100);
    out.b = { weg: !karte(), angemeldet, rolle: window._rolle };
    // c) wegklicken
    erlaubnis = "default"; abo = null;
    await elternPushHinweis(); await w(50);
    karte()?.querySelector('[aria-label="Hinweis ausblenden"]').click(); await w(50);
    const sofortWeg = !karte();
    await elternPushHinweis(); await w(50);
    out.c = { sofortWeg, bleibtWeg: !karte() };
    // d) angemeldet / gesperrt
    try { localStorage.removeItem("adler_push_hinweis_weg"); } catch (e) {}
    erlaubnis = "granted"; abo = { endpoint: "y" }; await elternPushHinweis(); await w(50);
    const beiAbo = !!karte();
    erlaubnis = "denied"; abo = null; await elternPushHinweis(); await w(50);
    out.d = { beiAbo, beiSperre: !!karte() };
    return out;
  });
  const f = s.fehler(); await s.schliessen();
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  if (!r.a || !/Keine Nachricht vom Team verpassen/.test(r.a.text) || r.a.knopf < 48 || r.a.zu < 44) probleme.push(`a) Karte: ${JSON.stringify(r.a)}`);
  if (!r.b.weg || r.b.angemeldet !== 1 || r.b.rolle !== "parent") probleme.push(`b) Einschalten: ${JSON.stringify(r.b)}`);
  if (!r.c.sofortWeg || !r.c.bleibtWeg) probleme.push(`c) Wegklicken: ${JSON.stringify(r.c)}`);
  // v698: Bei gesperrter Erlaubnis steht die Karte bewusst da – mit dem Weg zur Freigabe (Prüfung in v698)
  if (r.d.beiAbo) probleme.push("d) Karte trotz Abo");
  zeilen.push(`Karte: Knopf ${r.a && r.a.knopf} px, × ${r.a && r.a.zu} px · Tipp meldet an (${r.b.rolle}) · × merkt sich · bei Abo keine Karte`);
  return h.ergebnis("Eltern-App: Benachrichtigungen oben einschalten, solange sie aus sind", !probleme.length, zeilen.concat(probleme));
};
