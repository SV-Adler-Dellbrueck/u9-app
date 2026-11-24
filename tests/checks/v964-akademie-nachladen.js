/* v964 · Charles 24.11.: „Wenn das Kind eine Aufgabe erledigt hat, sollte sie bei den Eltern automatisch auf der Startseite
   erscheinen. Aktuell muss ich die App schließen und neu öffnen oder?“
   Eltern-Startseite offen, keine Meldung. Das Kind meldet „Geschafft“ → die Karte erscheint
   a) wenn die App wieder sichtbar wird (visibilitychange) und b) beim Herunterziehen (appRefresh) – ohne Neustart.
   c) Unveränderter Stand zeichnet nicht neu (dieselbe Karte bleibt dasselbe Element). */
"use strict";
module.exports = async function (h) {
  const titel = "v964 „Geschafft!“ der Kinder erscheint bei den Eltern ohne Neustart";
  const probleme = [];
  const T = (id, tp) => ({ id, datum: h.tagePlus(tp), typ: "training", titel: "Training", gegner: "Training", uhrzeit: "16:45:00", uhrzeit_ende: null, heim: true, ort: "Sportplatz", trainer_status: {} });
  const TOKEN = "x." + Buffer.from(JSON.stringify({ sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600, email: "eltern@example.org" })).toString("base64url") + ".y";
  let meld = [];
  const zeile = id => ({ id, spieler_id: 1, abzeichen: "ab_jonglier", quelle: "abzeichen", created_at: new Date().toISOString() });
  const e = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1500, breite: 390, hoehe: 844,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 6 } }], termine: () => [T(1, 2)], rueckmeldungen: [], kind_fanfacts: [], kind_foto: [],
      abzeichen_meldung: () => meld, rpc: { xp_events_for: [] } }) });
  await e.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await e.page.reload({ waitUntil: "networkidle" }); await e.page.waitForTimeout(2200);
  const zahl = () => e.page.evaluate(() => document.querySelectorAll("#akademie-melde-slot .ak-melde").length);
  const vorher = await zahl();
  const alt = await e.page.evaluate(() => typeof elternAkademieNachladen !== "function");
  if (alt) { await e.schliessen(); return h.ergebnis(titel, false, ["kein Nachladen (Stand vor v964)"]); }
  meld = [zeile(5)];
  await e.page.evaluate(() => document.dispatchEvent(new Event("visibilitychange"))); await e.page.waitForTimeout(700);
  const nachSicht = await zahl();
  await e.page.evaluate(() => { window._akEl = document.querySelector("#akademie-melde-slot .ak-melde"); document.dispatchEvent(new Event("visibilitychange")); });
  await e.page.waitForTimeout(700);
  const gleich = await e.page.evaluate(() => document.querySelector("#akademie-melde-slot .ak-melde") === window._akEl);
  meld = [zeile(5), { ...zeile(6), abzeichen: "ab_slalom" }];
  await e.page.evaluate(async () => { await appRefresh(); }); await e.page.waitForTimeout(700);
  const nachZiehen = await zahl();
  await e.schliessen();
  if (vorher !== 0) probleme.push("vorher schon " + vorher + " Karten");
  if (nachSicht !== 1) probleme.push("a) nach dem Zurückkehren " + nachSicht + " Karten statt 1");
  if (!gleich) probleme.push("c) gleicher Stand wurde neu gezeichnet");
  if (nachZiehen !== 2) probleme.push("b) nach dem Herunterziehen " + nachZiehen + " Karten statt 2");
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme : [`a) zurück in die App → ${nachSicht} Karte · c) gleicher Stand bleibt stehen · b) Herunterziehen → ${nachZiehen} Karten`]);
};
