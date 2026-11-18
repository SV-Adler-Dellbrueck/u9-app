/* v862 · Eltern-App: erster Besuch eins nach dem anderen (3.9) und Reihenfolge der Kacheln (3.15), Charles 18.11.
   a) Die Eltern-Tour hat 6 Schritte; der letzte zeigt auf ⋯.
   b) Ohne erledigte Tour erscheint keine Push-Karte; nach „Fertig“ ist die Tour gemerkt.
   c) Startseite: „Fürs Team“ (Trainerteam zuerst) → „Für die Kinder“ → „Mehr“.
   d) „Mehr vom Team“ ist in Lesen, Fotos, Untereinander gegliedert. */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64url");
module.exports = async function (h) {
  const titel = "v862 Eltern: erster Besuch nacheinander, Tour 6 Schritte, Kacheln Fürs Team → Kinder → Mehr";
  const probleme = [], zeilen = [];
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u-eltern", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const termine = [{ id: 100, datum: h.tagePlus(1), typ: "training", titel: "", uhrzeit: "16:45", ort: "Sportplatz", trainer_status: {} }];
  const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1500, breite: 390, hoehe: 844,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: [{ spieler_id: 3, label: "", kader: { id: 3, name: "Kind C", nr: 9 } }], termine, rueckmeldungen: [],
      team_config: [{ spenden_link: "" }], rpc: { eltern_news: {}, training_rueckblick: [], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false } }) });
  await s.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(3500);
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)), out = {};
    if (typeof ELTERN_TOUR === "undefined") return { fehlt: true };
    out.schritte = ELTERN_TOUR.length; out.letzte = [].concat(ELTERN_TOUR[ELTERN_TOUR.length - 1].sel || []).join();
    out.zuruecknehmen = ELTERN_TOUR.some(x => /nochmal auf die gewählte Antwort tippen/i.test(x.d));
    // c) Reihenfolge
    const body = document.getElementById("ep-dash-body");
    const txt = body ? body.innerText : "";
    out.pos = ["Fürs Team", "Trainerteam kontaktieren", "Für die Kinder", "Die Kabine", "Mehr vom Team"].map(t => txt.indexOf(t));
    // d) Gruppen in „Mehr vom Team“
    const m = document.getElementById("cat-mehr"); const mt = m ? m.textContent : "";
    out.gruppen = ["Lesen", "Nachlesen", "Fotos", "Spieltagsgalerie", "Untereinander", "Adler-Börse"].map(t => mt.indexOf(t));
    // b) erster Besuch
    localStorage.removeItem("adler_eltern_tour"); localStorage.removeItem("adler_push_hinweis_weg");
    document.getElementById("push-hinweis-slot") && (document.getElementById("push-hinweis-slot").innerHTML = "");
    await elternPushHinweis(); await w(200);
    out.pushVorTour = !!document.getElementById("push-hinweis");
    await elternTourStart(); await w(500);
    out.tourAuf = !!document.getElementById("fg-ov");
    out.zaehler = (document.getElementById("fg-ov")?.textContent.match(/\d+ von \d+/) || [""])[0];
    for (let i = 0; i < 5; i++) { fuehrungWeiter(); await w(450); }
    out.zaehlerEnde = (document.getElementById("fg-ov")?.textContent.match(/\d+ von \d+/) || [""])[0];
    out.extra = document.getElementById("fg-extra")?.textContent || "";
    fuehrungWeiter(); await w(400);
    out.gemerkt = localStorage.getItem("adler_eltern_tour") === "1"; out.zu = !document.getElementById("fg-ov");
    return out;
  }).catch(err => ({ fehler: String(err) }));
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) return h.ergebnis(titel, false, ["ELTERN_TOUR fehlt"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  if (r.schritte !== 6 || !/#ep-menue-knopf/.test(r.letzte) || !r.zuruecknehmen) probleme.push("a) Tour: " + JSON.stringify({ schritte: r.schritte, letzte: r.letzte, zuruecknehmen: r.zuruecknehmen }));
  else zeilen.push("a) Tour mit 6 Schritten, letzter auf ⋯");
  if (r.pushVorTour || !r.tourAuf || r.zaehler !== "1 von 6" || r.zaehlerEnde !== "6 von 6" || !r.gemerkt || !r.zu) probleme.push("b) erster Besuch: " + JSON.stringify(r));
  else zeilen.push("b) keine Push-Karte vor der Tour · 1 von 6 → 6 von 6 → gemerkt" + (r.extra ? " · Zusatzknopf „" + r.extra + "“" : " · (Push hier nicht verfügbar, kein Zusatzknopf)"));
  const steigt = a => a.every(x => x >= 0) && a.every((x, i) => i === 0 || x > a[i - 1]);
  if (!steigt(r.pos)) probleme.push("c) Reihenfolge: " + JSON.stringify(r.pos)); else zeilen.push("c) Fürs Team → Für die Kinder → Mehr");
  if (!steigt(r.gruppen)) probleme.push("d) Gruppen: " + JSON.stringify(r.gruppen)); else zeilen.push("d) Mehr vom Team: Lesen · Fotos · Untereinander");
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
