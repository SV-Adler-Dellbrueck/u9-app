/* v811 · Termine bei den Eltern als Kacheln, Liste oder beides (Charles 08.11.2026) – seit v926 abgelöst.
   Charles 21.11.2026 (Entwurf der Startseite freigegeben): statt Wochenstreifen, Liste „Danach“ und Umschalter stehen die nächsten
   Termine als Karussell oben („📅 Nächste Termine“), die ganze Saison unter „Fürs Team → Alle Termine“. Geprüft wird der neue Stand:
   a) kein Umschalter „Kacheln / Liste / Beides“, kein Wochenstreifen und keine Liste „Danach“ auf der Startseite – auch nicht mit
      einer alten Wahl im Gerät (localStorage „liste“)
   b) das Karussell zeigt fünf Termine bis Tag 20 (erste Karte voll, vier weitere), Zähler „1 von 5“; Wischen → „2 von 5“
   c) die Kachel „Alle Termine“ öffnet die Saisonliste; kein waagerechtes Scrollen der Seite bei 390 px */
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
  await s.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); localStorage.setItem("adler_termin_ansicht", "liste"); }, TOKEN);
  await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(3500);
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 40 && !document.getElementById("tk-bahn"); i++) await w(100);
    const out = { umschalter: !!document.getElementById("eltern-termine-ansicht"), streifen: !!document.getElementById("eltern-woche"), liste: !!document.getElementById("eltern-termine"),
      karten: document.querySelectorAll("#tk-bahn > *").length, zahl: (document.getElementById("tk-zahl") || {}).textContent || "" };
    const b = document.getElementById("tk-bahn"); if (b && b.children[1]) { b.scrollLeft = b.children[1].offsetLeft - b.children[0].offsetLeft; await w(400); }
    out.nach = (document.getElementById("tk-zahl") || {}).textContent || "";
    document.getElementById("alle-termine-kachel")?.click(); await w(600);
    out.saison = !!document.getElementById("et-modal"); document.getElementById("et-modal")?.remove();
    out.quer = document.documentElement.scrollWidth > window.innerWidth + 1;
    return out;
  });
  const fe = s.fehler(); await s.schliessen();
  if (r.umschalter || r.streifen || r.liste) probleme.push(`a) Startseite: Umschalter ${r.umschalter}, Streifen ${r.streifen}, Liste ${r.liste}`);
  if (r.karten !== 5 || r.zahl !== "1 von 5" || r.nach !== "2 von 5") probleme.push(`b) Karussell: ${r.karten} Karten, „${r.zahl}“ → „${r.nach}“`);
  if (!r.saison || r.quer) probleme.push(`c) Saisonliste ${r.saison}, quer ${r.quer}`);
  zeilen.push(`a) kein Umschalter, kein Streifen, keine Liste · b) ${r.karten} Karten, „${r.zahl}“ → „${r.nach}“ · c) „Alle Termine“ öffnet die Saison`);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v811 Termine: seit v926 Karussell statt Kacheln/Liste/Beides", !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
