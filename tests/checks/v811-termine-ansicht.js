/* v811 · Termine bei den Eltern als Kacheln, Liste oder beides (Charles 08.11.2026: „Ist das nicht doppelt? … einen Button als Liste
   oder beides anbieten wie … bei Ordnern in Windows“; „dann muss das Karussell weiter laufen nach rechts … die App merkt sich die Auswahl“).
   a) Standard Kacheln: Wochenstreifen ohne Liste „Danach“, drei Wochen bei Terminen bis Tag 20, „Alle Termine der Saison“ steht da
   b) Pfeil „Nächste Woche“ blättert weiter (Woche 2 von 3), „Woche zurück“ ist erst dann bedienbar; Umschalter und Pfeile ≥ 44 px
   c) „Liste“: Streifen weg, „Danach“ da; die Wahl steht in localStorage und gilt nach dem Neuladen
   d) „Beides“: Streifen und Liste; kein waagerechtes Scrollen der Seite bei 390 px */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u-eltern", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const termine = [1, 3, 5, 12, 20].map((tage, i) => ({ id: 100 + i, datum: h.tagePlus(tage), typ: "training", titel: "", uhrzeit: "16:45", uhrzeit_ende: "18:00", ort: "Sportplatz", trainer_status: {} }));
  const rueckmeldungen = termine.map(t => ({ termin_id: t.id, spieler_id: 3, status: "zugesagt" }));
  const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 3500, breite: 390, hoehe: 1400, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
    eltern_kinder: [{ spieler_id: 3, label: "", kader: { id: 3, name: "Kind C", nr: 9, foto_stadionheft_ok: true } }],
    termine, rueckmeldungen, team_config: [{ spenden_link: "" }],
    rpc: { eltern_news: {}, training_rueckblick: [], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false } }) });
  await s.page.waitForLoadState("networkidle"); await s.page.waitForTimeout(1500);
  await s.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); localStorage.removeItem("adler_termin_ansicht"); }, TOKEN);
  await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(3500);
  const ev = (fn, arg) => s.page.evaluate(fn, arg);
  const stand = () => ev(() => {
    const danach = [...document.querySelectorAll("#eltern-termine div")].some(d => /^📅 Danach$/.test(d.textContent.trim()));
    const knoepfe = [...document.querySelectorAll("#eltern-termine-ansicht button")].map(b => [b.textContent.trim(), b.getAttribute("aria-pressed"), Math.round(b.getBoundingClientRect().height)]);
    const band = document.getElementById("eltern-woche-band");
    return { woche: !!document.getElementById("eltern-woche"), wochen: band ? band.children.length : 0, danach, alle: !!document.getElementById("danach-alle"), knoepfe,
      quer: document.documentElement.scrollWidth <= window.innerWidth + 1, gespeichert: localStorage.getItem("adler_termin_ansicht") };
  });
  const r = {};
  r.a = await stand();
  r.b = await ev(async () => {
    const z = document.getElementById("eltern-woche-zurueck"), w = document.getElementById("eltern-woche-weiter");
    const vorher = { zurueck: z && z.disabled, pos: (document.getElementById("eltern-woche-pos") || {}).textContent, h: w ? Math.round(w.getBoundingClientRect().height) : 0 };
    w.click(); await new Promise(x => setTimeout(x, 700));
    return { vorher, pos: document.getElementById("eltern-woche-pos").textContent, zurueck: z.disabled, links: document.getElementById("eltern-woche-band").scrollLeft };
  });
  await ev(() => elternTerminAnsichtSetzen("liste")); await s.page.waitForTimeout(300);
  r.c = await stand();
  await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(3500);
  r.c2 = await stand();
  await ev(() => elternTerminAnsichtSetzen("beides")); await s.page.waitForTimeout(300);
  r.d = await stand();
  const fe = s.fehler(); await s.schliessen();
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  const gedrueckt = x => (x.knoepfe.find(k => k[1] === "true") || [""])[0];
  if (!r.a.woche || r.a.wochen !== 3 || r.a.danach || !r.a.alle || !/Kacheln/.test(gedrueckt(r.a)) || r.a.knoepfe.length !== 3 || r.a.knoepfe.some(k => k[2] < 44)) probleme.push("a) " + JSON.stringify(r.a));
  if (!r.b.vorher.zurueck || !/Woche 1 von 3/.test(r.b.vorher.pos) || r.b.vorher.h < 44 || !/Woche 2 von 3/.test(r.b.pos) || r.b.zurueck || r.b.links <= 0) probleme.push("b) " + JSON.stringify(r.b));
  if (r.c.woche || !r.c.danach || !r.c.alle || r.c.gespeichert !== "liste" || !/Liste/.test(gedrueckt(r.c))) probleme.push("c) " + JSON.stringify(r.c));
  if (r.c2.woche || !r.c2.danach || !/Liste/.test(gedrueckt(r.c2))) probleme.push("c) nach Neuladen: " + JSON.stringify(r.c2));
  if (!r.d.woche || !r.d.danach || !r.d.alle || !r.d.quer || r.d.gespeichert !== "beides") probleme.push("d) " + JSON.stringify(r.d));
  zeilen.push(`a) Standard Kacheln: ${r.a.wochen} Wochen, keine Liste, „Alle Termine“ da · b) ${r.b.pos}`);
  zeilen.push("c) Liste gemerkt, auch nach Neuladen · d) Beides ohne waagerechtes Scrollen");
  return h.ergebnis("v811 Eltern: Termine als Kacheln, Liste oder beides", !probleme.length, probleme.length ? probleme : zeilen);
};
