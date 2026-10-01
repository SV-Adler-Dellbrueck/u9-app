/* v695 · Test-Benachrichtigung an mich
   PO 30.09.: „Ja, bau den Test-Knopf.“ (Anlass: eigene Nachricht kam nicht an – sie war vor dem
   5-Minuten-Takt schon gelesen, Gelesenes meldet die App nie.)
   a) Sind Benachrichtigungen an, steht unter dem Schalter „📨 Test-Benachrichtigung an mich“ (≥ 44 px);
      sind sie aus, steht er nicht da
   b) Ein Tipp ruft push-send mit art „test“ und dem Endpunkt DIESES Geräts – kein Text, keine Zielgruppe
   c) Erfolg und Fehler werden gemeldet; der Knopf ist danach wieder bedienbar */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ breite: 390, hoehe: 844, warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), push_subscriptions: [{ id: 1 }] /* v705: Konto steht für dieses Handy drin */, termine: [] }) });
  await h.sichtbarMachen(s.page, "#main-app");
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    let erlaubnis = "granted", abo = { endpoint: "https://push.example/geraet-1" };
    try { Object.defineProperty(Notification, "permission", { configurable: true, get: () => erlaubnis }); } catch (e) {}
    window.pushSupported = () => true;
    window.pushCurrentSub = async () => abo;
    window.sbToken = () => "tok";
    const gesendet = []; let antwort = { status: 200, body: { ok: true, sent: 1 } };
    const altFetch = window.fetch;
    window.fetch = async (url, opt) => { if (String(url).includes("/functions/v1/push-send")) { gesendet.push(JSON.parse(opt.body)); return new Response(JSON.stringify(antwort.body), { status: antwort.status }); } return altFetch(url, opt); };
    const meldungen = []; const altToast = window.toast; window.toast = (t, art) => { meldungen.push({ t, art: art || "" }); };
    const slot = document.createElement("div"); slot.id = "push-test-slot"; document.body.appendChild(slot);
    await pushRenderInto("push-test-slot", "trainer"); await w(50);
    const knopf = slot.querySelector(".push-test-knopf");
    const out = { da: !!knopf, h: knopf ? Math.round(knopf.getBoundingClientRect().height) : 0, text: knopf ? knopf.textContent.trim() : "" };
    knopf.click(); await w(300);
    out.b = gesendet[0] || null;
    out.ok = meldungen.slice(-1)[0] || null;
    antwort = { status: 404, body: { error: "Auf diesem Gerät sind keine Benachrichtigungen angemeldet." } };
    slot.querySelector(".push-test-knopf").click(); await w(300);
    out.fehler = meldungen.slice(-1)[0] || null;
    out.wiederBereit = !slot.querySelector(".push-test-knopf").disabled;
    erlaubnis = "default"; abo = null;
    await pushRenderInto("push-test-slot", "trainer"); await w(50);
    out.ausOhneKnopf = !slot.querySelector(".push-test-knopf");
    window.fetch = altFetch; window.toast = altToast;
    return out;
  });
  const f = s.fehler(); await s.schliessen();
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  if (!r.da || r.h < 44 || !/Test-Benachrichtigung an mich/.test(r.text)) probleme.push(`a) Knopf: ${JSON.stringify({ da: r.da, h: r.h, text: r.text })}`);
  if (!r.ausOhneKnopf) probleme.push("a) Knopf steht da, obwohl Benachrichtigungen aus sind");
  if (!r.b || r.b.art !== "test" || r.b.endpoint !== "https://push.example/geraet-1" || "body" in r.b || "audience" in r.b) probleme.push(`b) Anfrage: ${JSON.stringify(r.b)}`);
  if (!r.ok || r.ok.art === "err" || !/Test gesendet/.test(r.ok.t)) probleme.push(`c) Erfolg: ${JSON.stringify(r.ok)}`);
  if (!r.fehler || r.fehler.art !== "err") probleme.push(`c) Fehler: ${JSON.stringify(r.fehler)}`);
  if (!r.wiederBereit) probleme.push("c) Knopf bleibt nach dem Senden gesperrt");
  zeilen.push(`Knopf ${r.h} px · Anfrage ${JSON.stringify(r.b)} · „${r.ok && r.ok.t}“`);
  return h.ergebnis("Test-Benachrichtigung an das eigene Gerät", !probleme.length, zeilen.concat(probleme));
};
