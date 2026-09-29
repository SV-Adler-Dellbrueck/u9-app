/* v650 · PO: „Aus der Eltern-App den Kinderzugang anlegen … bekomme ich einen Code angezeigt,
   aber die URL ist nicht dabei. Über einen WhatsApp-Link direkt schicken oder kopieren?“
   Kachel: NUR der Link – der Code bleibt auf dem Bildschirm der Eltern.

   a) Nach „Code erzeugen“ steht unter dem Code der Weg zur Kinder-App: QR-Code (SVG),
      die Adresse …/kinder/, ein WhatsApp-Link und „Link kopieren“, beide ≥ 44 px.
   b) Weder im WhatsApp-Link noch in der kopierten Nachricht steht der Code oder ein
      Kindername.
   c) „Link kopieren“ legt die Nachricht mit der Adresse in die Zwischenablage. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const KIND = { spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 1 } };
  const s = await h.starten({ start: "/eltern/index.html", warten: 900,
    supabase: h.supabaseAttrappe({ kind_konto: [], kind_sitzung: [], kader: h.kaderZeilen() }) });
  await s.page.evaluate(k => {
    window.sbToken = () => "a.eyJzdWIiOiJlbHRlcm4tdWlkIiwiZW1haWwiOiJlQGUuZGUifQ.b";
    window.sbAuthHeaders = x => ({ ...(x || {}), "Content-Type": "application/json" });
    window._elternKids = [k];
    window._kopiert = null;
    try { Object.defineProperty(navigator, "clipboard", { value: { writeText: t => { window._kopiert = t; return Promise.resolve(); } }, configurable: true }); } catch (e) {}
  }, KIND);
  const r = await s.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    if (typeof kinderAppOpen !== "function") return { fehlt: "kinderAppOpen" };
    kinderAppOpen();
    for (let i = 0; i < 60 && !document.getElementById("ka-body"); i++) await warte(50);
    for (let i = 0; i < 40 && /Lädt/.test(document.getElementById("ka-body")?.textContent || ""); i++) await warte(50);
    await kinderAppCode(1);
    await warte(300);
    const b = document.getElementById("ka-body");
    const out = {};
    out.code = ([...b.querySelectorAll("div")].map(d => d.textContent.trim()).find(t => /^\d{6}$/.test(t))) || "";
    const qr = document.getElementById("ka-qr-1");
    out.qr = !!(qr && qr.querySelector("svg"));
    out.url = (document.getElementById("ka-link-1") || {}).textContent || "";
    const wa = [...b.querySelectorAll("a")].find(a => /wa\.me/.test(a.href));
    out.wa = wa ? decodeURIComponent(wa.href) : "";
    out.waH = wa ? Math.round(wa.getBoundingClientRect().height) : 0;
    const kopie = [...b.querySelectorAll("button")].find(x => /Link kopieren/.test(x.textContent));
    out.kopieH = kopie ? Math.round(kopie.getBoundingClientRect().height) : 0;
    if (kopie) kopie.click();
    await warte(100);
    out.kopiert = window._kopiert || "";
    return out;
  });
  const fe = s.fehler();
  await s.schliessen();
  if (r.fehlt) return h.ergebnis("v650 Kinder-App: Link teilen", false, [r.fehlt + " fehlt"]);
  if (!/^\d{6}$/.test(r.code)) probleme.push("a) kein Code auf dem Bildschirm");
  if (!r.qr) probleme.push("a) kein QR-Code");
  if (!/\/kinder\/$/.test(r.url)) probleme.push(`a) Adresse „${r.url}“ endet nicht auf /kinder/`);
  if (!r.wa || !r.wa.includes(r.url)) probleme.push(`a) WhatsApp-Link fehlt oder ohne Adresse: ${r.wa.slice(0, 120)}`);
  if (r.waH < 44 || r.kopieH < 44) probleme.push(`a) Knöpfe zu klein: WhatsApp ${r.waH} px, Kopieren ${r.kopieH} px`);
  for (const [was, t] of [["WhatsApp", r.wa], ["Kopie", r.kopiert]]) {
    if (r.code && t.includes(r.code)) probleme.push(`b) ${was} enthält den Code`);
    if (/Kind A/.test(t)) probleme.push(`b) ${was} enthält den Kindernamen`);
  }
  if (!r.kopiert.includes(r.url)) probleme.push(`c) kopiert wurde „${r.kopiert.slice(0, 100)}“`);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`QR ${r.qr ? "ja" : "nein"} · ${r.url} · WhatsApp ${r.waH} px · Kopieren ${r.kopieH} px · Code nicht in der Nachricht`);
  return h.ergebnis("v650 Kinder-App: Link per QR, WhatsApp und Kopieren – ohne Code", !probleme.length, probleme.concat(zeilen));
};
