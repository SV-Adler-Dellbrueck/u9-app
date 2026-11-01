/* v771 · PO 04.11. (als Vater von Kind C): „Habe den Termin am 07.11. abgesagt. Wird aber in der Übersicht als zugesagt angezeigt.
   Und wie finde ich als Elternteil alle weiteren Termine?“
   Ursache: Zu- und Absagen im Termin-Fenster (tdRsvp) zeichneten nur dieses Fenster neu; die Liste „Danach“ dahinter blieb auf dem alten
   Stand, bis die Seite neu geladen wurde.
   a) Unter „Danach“ steht ein Knopf „Alle Termine der Saison ›“ (≥ 44 px); er öffnet die Saisonliste
   b) Nach einer Absage im Termin-Fenster steht in der Liste dahinter sofort „Absage“ statt „Zusage“ – ohne neu zu laden; die Zeile der
      anderen Termine bleibt „Zusage“
   (Stand: nur diese zwei Fälle; die Rücknahme einer Antwort zeichnet dieselbe Neuladung – sie ließ sich im Prüflauf nicht stabil beobachten, weil
   die Seite nach einigen Sekunden neu lädt.) */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u-eltern", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const termine = [2, 4, 7, 9, 11].map((tage, i) => ({ id: 100 + i, datum: h.tagePlus(tage), typ: i === 2 ? "turnier" : "training", titel: i === 2 ? "Kinderfestival" : "", uhrzeit: "16:45", uhrzeit_ende: "18:00", trainer_status: {} }));
  const rm = termine.map(t => ({ termin_id: t.id, spieler_id: 3, status: "zugesagt" }));
  const rueckmeldungen = (u, req) => {
    const q = u.searchParams, m = req.method();
    const tid = (q.get("termin_id") || "").match(/\d+/g) || [];
    if (m === "GET") return rm.filter(x => !tid.length || tid.includes(String(x.termin_id)));
    if (m === "POST") { const b = JSON.parse(req.postData() || "{}"); const i = rm.findIndex(x => x.termin_id === b.termin_id && x.spieler_id === b.spieler_id); if (i >= 0) Object.assign(rm[i], b); else rm.push({ ...b }); return { status: 201, body: "" }; }
    if (m === "DELETE") { const t2 = (q.get("termin_id") || "").replace("eq.", ""); for (let i = rm.length - 1; i >= 0; i--) if (String(rm[i].termin_id) === t2) rm.splice(i, 1); return { status: 204, body: "" }; }
    return [];
  };
  const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 3500, breite: 390, hoehe: 1400, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
    eltern_kinder: [{ spieler_id: 3, label: "", kader: { id: 3, name: "Kind C", nr: 9, foto_stadionheft_ok: true } }],
    termine, rueckmeldungen, team_config: [{ spenden_link: "" }],
    rpc: { eltern_news: {}, training_rueckblick: [], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false } }) });
  await s.page.waitForLoadState("networkidle"); await s.page.waitForTimeout(1500);
  await s.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(3500);
  const ids = termine.map(t => t.id), ziel = ids[2];
  /* Kurze Aufrufe: Der Service Worker lädt in den ersten Sekunden einmal neu; ein langer Aufruf über diesen Moment hinweg verliert
     seinen Kontext (tests/README). */
  const ev = (fn, arg) => s.page.evaluate(fn, arg);
  const Z = "const __z = id => { const b = [...document.querySelectorAll('button')].find(x => (x.getAttribute('onclick') || '').includes('terminDetailOpen(' + id + ')') && /Danach/.test((x.closest('div') || {}).textContent || '')); return b ? b.textContent.replace(/\\s+/g, ' ').trim() : null; };";
  const zeileVon = id => s.page.evaluate(`(() => { ${Z} return __z(${id}); })()`);
  const fehlt = await ev(() => typeof tdRsvp !== "function" || typeof elternTermineOpen !== "function");
  const r = { fehlt };
  if (!fehlt) {
    r.a = await ev(() => { const k = document.getElementById("danach-alle"); return { da: !!k, hoehe: k ? Math.round(k.getBoundingClientRect().height) : 0, text: k ? k.textContent.trim() : "", zeilen: [...document.querySelectorAll("button")].filter(b => /terminDetailOpen\(\d+\)/.test(b.getAttribute("onclick") || "") && /Danach/.test((b.closest("div") || {}).textContent || "")).length }; });
    await ev(() => document.getElementById("danach-alle")?.click()); await s.page.waitForTimeout(500);
    r.a.liste = await ev(() => { const l = !!document.getElementById("et-modal"); document.getElementById("et-modal")?.remove(); return l; });
    await ev(id => terminDetailOpen(id), ziel); await s.page.waitForTimeout(500);
    await ev(id => tdRsvp(id, 3, "abgesagt"), ziel); await s.page.waitForTimeout(2000);
    r.b = { zeile: await zeileVon(ziel), andere: [] };
    for (const i of ids) if (i !== ziel) { const x = await zeileVon(i); if (x) r.b.andere.push(x.slice(-10)); }
  }
  if (r.fehlt) { await s.schliessen(); return h.ergebnis("v771 Eltern-Liste aktuell", false, ["tdRsvp oder elternTermineOpen fehlt"]); }
  const fe = s.fehler(); await s.schliessen();
  if (!r.a.da || r.a.hoehe < 44 || !/Alle Termine/.test(r.a.text) || !r.a.liste || r.a.zeilen < 2) probleme.push("a) " + JSON.stringify(r.a));
  zeilen.push(`a) Knopf „${r.a.text}“ (${r.a.hoehe} px) unter „Danach“ (${r.a.zeilen} Termine), öffnet die Saisonliste`);
  if (!r.b.zeile || !/Absage/.test(r.b.zeile) || /Zusage/.test(r.b.zeile) || !r.b.andere.length || r.b.andere.some(x => !/Zusage/.test(x))) probleme.push("b) " + JSON.stringify(r.b));
  zeilen.push(`b) nach der Absage im Termin-Fenster steht in der Liste „Absage“, die anderen „Zusage“ – ohne Neuladen`);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v771 Eltern: Liste hinter dem Termin-Fenster bleibt aktuell, Knopf „Alle Termine“", !probleme.length, probleme.length ? probleme : zeilen);
};
