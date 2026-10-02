/* v726 · Anfahrt ab Dellbrück auf der Karte „Nächster Termin“.
   PO 02.10.: „… für die Anfahrt die Entfernung … zumindest mal die Entfernung von dem Platz in Delbrück
   zum jeweiligen Zielort?“ Entschieden (Kachel): „Strecke + Abfahrt + Knopf“.
   a) Trainer: anfahrtNachziehen rechnet für einen Auswärtstermin ohne Strecke einmal über den
      Routendienst (Start Thurner Kamp) und schreibt anfahrt_km/_min/_ort per PATCH; Heimspiele und
      Termine, deren Adresse schon gerechnet ist, bleiben unberührt
   b) Eltern: „🚗 ca. 22 km · 26 Min. ab Platz Dellbrück (ohne Verkehr) · Abfahrt spätestens 8:55 Uhr“
      (Treffen 9:30 − 26 − 5, auf 5 Minuten abgerundet), Quellenzeile, Knopf „Route starten“ ≥ 44 px
      mit Google-Maps-Route zum Ort
   c) Eltern: Heimspiel ohne Anfahrt und ohne Route-Knopf; Auswärts mit geänderter Adresse (anfahrt_ort
      passt nicht) zeigt keine alte Strecke, aber den Knopf
   d) Das Elterngerät fragt keinen Routendienst */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  // a) Trainer
  const patches = [], routing = [];
  const t = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(),
    termine: (u, req) => { if (req.method() === "PATCH") { patches.push({ q: u.search, b: JSON.parse(req.postData() || "{}") }); return { status: 204, body: "" }; } return []; } }) });
  await t.page.route("**/routing.openstreetmap.de/**", r => { routing.push(r.request().url()); return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ code: "Ok", routes: [{ distance: 21853.7, duration: 1584.4 }] }) }); });
  const ra = await t.page.evaluate(async () => {
    for (let i = 0; i < 40 && typeof anfahrtNachziehen !== "function"; i++) await new Promise(x => setTimeout(x, 100));
    if (typeof anfahrtNachziehen !== "function") return { fehlt: true };
    window.geocodePlace = async () => ({ lat: 51.0302, lon: 6.9168 });
    await anfahrtNachziehen([
      { id: 1, typ: "turnier", heim: false, ort: "Teststraße 1, 50000 Köln" },
      { id: 2, typ: "spiel", heim: true, ort: "Thurner Kamp 97, 51069 Köln" },
      { id: 3, typ: "spiel", heim: false, ort: "Weg 2, 50000 Köln", anfahrt_ort: "Weg 2, 50000 Köln", anfahrt_km: 5, anfahrt_min: 9 }]);
    return {};
  });
  const ft = t.fehler(); await t.schliessen();
  if (ra.fehlt) probleme.push("a) anfahrtNachziehen fehlt");
  else if (patches.length !== 1 || !/id=eq\.1\b/.test(patches[0].q) || patches[0].b.anfahrt_km !== 21.9 || patches[0].b.anfahrt_min !== 26 || patches[0].b.anfahrt_ort !== "Teststraße 1, 50000 Köln")
    probleme.push("a) PATCH: " + JSON.stringify(patches));
  else if (routing.length !== 1 || !/driving\/7\.0809,50\.9692;6\.9168,51\.0302/.test(routing[0])) probleme.push("a) Routendienst: " + JSON.stringify(routing));
  else zeilen.push("a) Trainer: einmal gerechnet ab Thurner Kamp, PATCH 21,9 km / 26 Min.; Heimspiel und Gerechnetes unberührt");

  // b–d) Eltern
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const fall = async (termin) => {
    const fremd = [];
    const basis = h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
      termine: [termin], rueckmeldungen: [], team_config: [{ spenden_link: "" }],
      rpc: { eltern_news: {}, training_rueckblick: [], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false } });
    const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 390, hoehe: 844, supabase: basis });
    await s.page.route("**/routing.openstreetmap.de/**", r => { fremd.push(r.request().url()); return r.fulfill({ status: 200, body: "{}" }); });
    await s.page.evaluate(tk => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: tk, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
    await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(4000);
    const r = await s.page.evaluate(() => {
      const k = document.getElementById("termin-card"); if (!k) return null;
      const a = [...k.querySelectorAll("a")].find(x => /Route starten/.test(x.textContent));
      return { text: k.textContent.replace(/\s+/g, " "), href: a ? a.href : null, hoehe: a ? Math.round(a.getBoundingClientRect().height) : 0 };
    });
    const f = s.fehler(); await s.schliessen();
    return { r, f, fremd };
  };
  const ort = "Merianstraße 17a, 50769 Köln";
  const b = await fall({ id: 91, datum: h.tagePlus(1), typ: "turnier", titel: "Testturnier", uhrzeit: "10:15:00", treffzeit: "09:30", heim: false, ort, anfahrt_km: "21.9", anfahrt_min: 26, anfahrt_ort: ort });
  const c1 = await fall({ id: 92, datum: h.tagePlus(1), typ: "spiel", titel: "Heimspiel", uhrzeit: "11:00:00", treffzeit: "10:15", heim: true, ort: "Thurner Kamp 97, 51069 Köln" });
  const c2 = await fall({ id: 93, datum: h.tagePlus(1), typ: "spiel", titel: "Auswärts", uhrzeit: "11:00:00", heim: false, ort: "Neue Straße 1, 50000 Köln", anfahrt_km: 12, anfahrt_min: 20, anfahrt_ort: "Alte Straße 1, 50000 Köln" });
  const f = [].concat(ft, b.f, c1.f, c2.f); if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  const br = b.r || {};
  if (!/🚗 ca\. 22 km · 26 Min\. ab Platz Dellbrück \(ohne Verkehr\) · Abfahrt spätestens 8:55 Uhr/.test(br.text || "")) probleme.push("b) " + (br.text || "keine Karte").slice(0, 260));
  else if (!/OpenStreetMap/.test(br.text) || !/google\.com\/maps\/dir\/.*destination=Merianstra/.test(br.href || "") || br.hoehe < 44) probleme.push(`b) Quelle/Knopf: ${br.href} ${br.hoehe}px`);
  else zeilen.push(`b) „ca. 22 km · 26 Min. … Abfahrt spätestens 8:55 Uhr“, Quelle genannt, „Route starten“ ${br.hoehe} px`);
  const t1 = (c1.r || {}).text || "", t2 = (c2.r || {}).text || "";
  if (/🚗|Route starten/.test(t1)) probleme.push("c) Heimspiel zeigt Anfahrt: " + t1.slice(0, 200));
  else if (/🚗/.test(t2) || !(c2.r || {}).href) probleme.push("c) geänderte Adresse: " + t2.slice(0, 200));
  else zeilen.push("c) Heimspiel ohne Anfahrt; geänderte Adresse ohne alte Strecke, mit Route-Knopf");
  const fremd = [].concat(b.fremd, c1.fremd, c2.fremd);
  if (fremd.length) probleme.push("d) Elterngerät fragt den Routendienst: " + fremd[0]);
  else zeilen.push("d) Elterngerät fragt keinen Routendienst");
  return h.ergebnis("v726 Anfahrt ab Dellbrück: Strecke, Abfahrt, Route starten", !probleme.length, zeilen.concat(probleme));
};
