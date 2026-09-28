/* v658 · Geführte Tour mit Zeiger – Trainer, Eltern, Kinder.

   PO am 28.09.: „… den Hilfebutton in der Trainer- und vor allen Dingen in der Eltern-App
   überarbeiten, sodass eine geführte Tour durch die verschiedenen Bereiche der App abläuft …
   auch nochmal für die Kids-App … in kinderverständlicher Sprache“. Kacheln: „Geführt mit
   Zeiger“, „Alle drei in einem Paket“.

   Je App, am Handy (390 px):
   a) Die Tour läuft von Anfang bis Ende durch, ohne Fehler; die Blase steht jedes Mal ganz im
      Bild, die Knöpfe sind mindestens 44 px hoch (Kinder 56 px).
   b) Sie zeigt wirklich auf Dinge: in der Mehrzahl der Schritte ist ein Element hervorgehoben
      (die übrigen – leere Bereiche – stehen als Karte in der Mitte).
   c) Sie öffnet die Bereiche selbst: der Trainingsplan-Schritt steht im Trainingsplan.
   d) Am Ende ist das Overlay weg und der Schlüssel gesetzt, damit sie nicht wiederkommt.
   e) Kinder: kurze Sätze (höchstens 20 Wörter je Schritt), keine Erwachsenenwörter. */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const DURCHLAUF = `async (opt) => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const out = { schritte: [], ende: null };
  eval(opt.start);
  for (let i = 0; i < 40; i++) {
    let ov = null;
    for (let k = 0; k < 40 && !(ov = document.getElementById("fg-ov")); k++) await w(100);
    await w(250);
    if (!ov) break;
    const blase = ov.querySelector(".fg-blase"), r = blase.getBoundingClientRect();
    const knoepfe = [...blase.querySelectorAll("button")].map(b => Math.round(b.getBoundingClientRect().height));
    out.schritte.push({ t: (ov.querySelector("#fg-t") || {}).textContent || "", ziel: !!ov.querySelector(".fg-loch"),
      imBild: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1, knopf: Math.min(...knoepfe),
      d: blase.textContent, sichtbar: opt.sichtbar ? [...document.querySelectorAll(opt.sichtbar)].some(e => e.getClientRects().length) : null });
    const weiter = document.getElementById("fg-weiter"); if (!weiter) break;
    const letzte = /Fertig|Los geht/.test(weiter.textContent);
    weiter.click();
    if (letzte) { await w(300); break; }
  }
  out.ende = { ov: !!document.getElementById("fg-ov"), key: localStorage.getItem(opt.key) };
  return out;
}`;
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const pruef = (name, r, n, minZiel, kind) => {
    if (!r || !r.schritte.length) { probleme.push(`${name}: Tour startet nicht`); return; }
    if (r.schritte.length !== n) probleme.push(`${name}: ${r.schritte.length} von ${n} Schritten gezeigt`);
    const raus = r.schritte.filter(s => !s.imBild).map(s => s.t);
    if (raus.length) probleme.push(`${name}: Blase ragt aus dem Bild bei ${raus.join(", ")}`);
    const klein = r.schritte.filter(s => s.knopf < (kind ? 56 : 44)).map(s => s.t);
    if (klein.length) probleme.push(`${name}: Knöpfe zu klein bei ${klein.join(", ")}`);
    const z = r.schritte.filter(s => s.ziel).length;
    if (z < minZiel) probleme.push(`${name}: nur ${z} von ${r.schritte.length} Schritten zeigen auf ein Element (mindestens ${minZiel})`);
    if (r.ende.ov) probleme.push(`${name}: Overlay bleibt nach dem Ende stehen`);
    if (r.ende.key !== "1") probleme.push(`${name}: Schlüssel nicht gesetzt – die Tour käme wieder`);
    zeilen.push(`${name}: ${r.schritte.length} Schritte, ${z} mit Zeiger, alle im Bild`);
  };

  // Trainer
  const datum = h.tagePlus(1);
  const st = await h.starten({ breite: 390, hoehe: 800, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(),
    termine: [{ id: 5, datum, typ: "training", uhrzeit: "16:45", trainer_status: { Charles: "ja" } }] }) });
  await st.page.waitForTimeout(3500);   // der Einstieg lädt beim Anmelden des Service Workers einmal neu (s. v557)
  /* Unter Last kommt dieser Neustart später – erst weiter, wenn Welle 1 wieder steht. */
  await st.page.waitForLoadState("load");
  await st.page.waitForFunction(() => typeof tourStart === "function" && typeof fuehrungStart === "function", null, { timeout: 20000 });
  /* Ohne Anmeldung liegt die Oberfläche hinter dem PIN-Tor – so, wie nach der Anmeldung. */
  await h.sichtbarMachen(st.page, "#main-app");
  await st.page.evaluate(() => { const g = document.getElementById("pin-gate"); if (g) g.style.display = "none"; if (typeof renderHome === "function") try { renderHome(); } catch (e) {} });
  await st.page.waitForTimeout(800);
  await st.page.waitForFunction(() => typeof tourStart === "function", null, { timeout: 20000 });
  const rt = await st.page.evaluate(eval(DURCHLAUF), { start: "localStorage.removeItem('adler_trainer_tour'); tourStart();", key: "adler_trainer_tour" });
  const planSchritt = await st.page.evaluate(() => (TOUR.findIndex(s => /Trainingsplan/.test(s.t))));
  const ft = st.fehler(); await st.schliessen();
  pruef("Trainer", rt, 17, 9, false);
  const ps = rt.schritte[planSchritt] || {};
  if (!ps.ziel) probleme.push("Trainer: der Trainingsplan-Schritt zeigt nicht auf die Terminkacheln – der Bereich wurde nicht geöffnet");
  if (ft.length) probleme.push("Trainer, Konsole: " + ft[0]);

  // Eltern
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const se = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 390, hoehe: 800,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
      termine: [{ id: 5, datum: h.tagePlus(2), typ: "training", uhrzeit: "16:45", uhrzeit_ende: "18:00", ort: "Sportplatz" },
                { id: 6, datum: h.tagePlus(4), typ: "spiel", uhrzeit: "10:00", gegner: "Gegner FC", ort: "Auswärts" }], rueckmeldungen: [] }) });
  await se.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await se.page.reload({ waitUntil: "networkidle" }); await se.page.waitForTimeout(4500);
  const re = await se.page.evaluate(eval(DURCHLAUF), { start: "localStorage.removeItem('adler_eltern_tour'); elternTourStart();", key: "adler_eltern_tour" });
  const fe = se.fehler(); await se.schliessen();
  pruef("Eltern", re, 12, 7, false);
  if (fe.length) probleme.push("Eltern, Konsole: " + fe[0]);

  // Kinder (Kabinen-Startseite)
  const sk = await h.starten({ breite: 390, hoehe: 800, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  await sk.page.waitForTimeout(3500);
  const rk = await sk.page.evaluate(eval(DURCHLAUF), { start: `localStorage.removeItem('adler_kinder_tour');
    const k=document.createElement('div'); k.id='kabine'; k.style.cssText='position:fixed;inset:0;z-index:9000;background:#1e3a8a;display:flex;flex-direction:column;overflow:auto';
    const b=document.createElement('div'); b.id='kabine-body'; b.style.cssText='display:flex;flex-direction:column;min-height:100%'; k.appendChild(b); document.body.appendChild(k);
    window._kabTourGeprueft=true; kabineHome(); kabineTourStart();`, key: "adler_kinder_tour" });
  const kinderText = await sk.page.evaluate(() => KABINE_TOUR.map(s => s.t + " " + s.d));
  const fk = sk.fehler().filter(x => !/Failed to load resource/.test(x)); await sk.schliessen();
  pruef("Kinder", rk, 11, 8, true);
  const lang = kinderText.filter(t => t.split(/\s+/).length > 26);
  if (lang.length) probleme.push("Kinder: zu lange Schritte: " + lang.map(t => t.slice(0, 30)).join(" | "));
  const erwachsen = kinderText.filter(t => /Modul|App-Zeit|Datenschutz|Einwilligung|Bewertung|Trainingsplan|KI\b/i.test(t));
  if (erwachsen.length) probleme.push("Kinder: Erwachsenenwörter in: " + erwachsen.map(t => t.slice(0, 30)).join(" | "));
  if (fk.length) probleme.push("Kinder, Konsole: " + fk[0]);

  return h.ergebnis("v658 Geführte Touren mit Zeiger (Trainer, Eltern, Kinder)", !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
