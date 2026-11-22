/* v950 · Charles 22.11. (Bildschirmfoto Eltern-Startseite): „In der Kachel-Karussellansicht sollen die weiteren Termine auch mit
   allen Details in der Kachel angezeigt werden wie die vom aktuellen Termin. Kann auch eingeklappt sein, muss sich dann aber
   direkt aufklappen und keine neue Kachel laden.“ Dazu: „Es gibt immer nur eine Klugscheißer-Info des Tages.“
   a) Weitere Termine: „Alle Details ▾“ (aria-expanded) klappt in der Karte auf – kein Fenster (td-modal) –, mit Wetter, Adresse,
      Platz, „Was muss mit?“, Betreuung und „Wer hilft mit?“; nochmal tippen klappt zu.
   b) Nur eine Karte ist offen: eine zweite schließt die erste; das Termin-Fenster schließt eine offene Karte.
   c) Das Termin-Fenster zeigt dieselben Teile wie vorher (gemeinsame Bausteine tdDetailOben/-Unten).
   d) Klugscheißer-Karte ohne „Noch eins“. */
"use strict";
module.exports = async function (h) {
  const titel = "v950 Termin-Karussell: weitere Termine klappen in der Karte auf; eine Klugscheißer-Info am Tag";
  const probleme = [], zeilen = [];
  const T = (id, tp, typ, titel) => ({ id, datum: h.tagePlus(tp), typ, titel, gegner: titel, uhrzeit: "16:45:00", uhrzeit_ende: "18:00:00", heim: true, ort: "Thurner Kamp 97, 51069 Köln", platz: "vorne links", trainer_status: {} });
  const termine = [T(1, 1, "training", "Training"), T(2, 5, "training", "Training"), T(3, 8, "training", "Training")];
  const TOKEN = "x." + Buffer.from(JSON.stringify({ sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600, email: "eltern@example.org" })).toString("base64url") + ".y";
  const e = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1500, breite: 390, hoehe: 900, bibliothek: true,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 6 } }], termine: () => termine,
      rueckmeldungen: [], rpc: { betreuung_board: [{ name: "Erwachsener B" }] }, kind_fanfacts: [], kind_foto: [] }) });
  await e.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await e.page.reload({ waitUntil: "networkidle" });
  const r = await e.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)), txt = el => el ? el.textContent.replace(/\s+/g, " ").trim() : "";
    for (let i = 0; i < 60 && !document.getElementById("tk-bahn"); i++) await w(100);
    for (let i = 0; i < 40 && !document.querySelector("#klug-slot .ks-karte"); i++) await w(100);
    wetterFetch = async () => ({ emoji: "☀️", text: "Sonnig", temp: 9, rain: 10, hour: true });
    const out = {}, karten = [...document.querySelectorAll("#tk-bahn .tk-karte-klein")];
    out.anzahl = karten.length;
    const k1 = karten[0], knopf = k1.querySelector(".tk-details-knopf");
    out.knopf = { text: txt(knopf), exp: knopf.getAttribute("aria-expanded"), h: Math.round(knopf.getBoundingClientRect().height) };
    knopf.click(); await w(700);
    const box = k1.querySelector(".tk-details");
    out.auf = { offen: !box.hidden, modal: !!document.getElementById("td-modal"), exp: knopf.getAttribute("aria-expanded"), text: txt(box) };
    const k2 = karten[1]; k2.querySelector(".tk-details-knopf").click(); await w(500);
    out.zweite = { ersteZu: box.hidden && box.innerHTML === "", zweiteAuf: !k2.querySelector(".tk-details").hidden };
    k2.querySelector(".tk-details-knopf").click(); await w(200); out.zu = k2.querySelector(".tk-details").hidden;
    k1.querySelector(".tk-details-knopf").click(); await w(400);
    await terminDetailOpen(Number(k1.dataset.termin)); await w(600);
    out.fenster = { karteZu: k1.querySelector(".tk-details").hidden, text: txt(document.querySelector("#td-modal")) };
    document.getElementById("td-modal")?.remove();
    out.ks = { karte: !!document.querySelector("#klug-slot .ks-karte"), weiter: !!document.querySelector("#klug-slot .ks-weiter") };
    out.quer = document.documentElement.scrollWidth > window.innerWidth + 1;
    return out;
  }).catch(x => ({ fehler: String(x) }));
  const fe = e.fehler(); await e.schliessen();
  if (r.fehler) probleme.push(r.fehler);
  else {
    if (r.anzahl < 2) probleme.push("weniger als zwei weitere Termine im Karussell: " + r.anzahl);
    if (!/Alle Details/.test(r.knopf.text) || r.knopf.exp !== "false" || r.knopf.h < 44) probleme.push("a) Knopf " + JSON.stringify(r.knopf));
    const soll = [/Sonnig/, /Adresse/, /vorne links/, /Was muss mit\?/, /Betreuung beim Training/, /Wer hilft mit\?/];
    const fehlt = soll.filter(x => !x.test(r.auf.text)).map(String);
    if (!r.auf.offen || r.auf.modal || r.auf.exp !== "true" || fehlt.length) probleme.push(`a) aufgeklappt ${r.auf.offen}, Fenster ${r.auf.modal}, fehlt ${fehlt.join(" ")}`);
    if (!r.zweite.ersteZu || !r.zweite.zweiteAuf || !r.zu) probleme.push("b) " + JSON.stringify([r.zweite, r.zu]));
    if (!r.fenster.karteZu || !/Was muss mit\?/.test(r.fenster.text) || !/Rückmeldung/.test(r.fenster.text) || !/Betreuung beim Training/.test(r.fenster.text)) probleme.push("c) Fenster " + JSON.stringify({ zu: r.fenster.karteZu, t: r.fenster.text.slice(0, 120) }));
    if (!r.ks.karte || r.ks.weiter) probleme.push("d) Klugscheißer " + JSON.stringify(r.ks));
    if (r.quer) probleme.push("Querscrollen");
  }
  const fehler = fe.filter(x => !/Failed to load resource/.test(x)); if (fehler.length) probleme.push("Konsole: " + fehler.slice(0, 2).join(" | "));
  zeilen.push(`a) „${(r.knopf || {}).text}“ ${(r.knopf || {}).h} px → in der Karte: Wetter, Adresse, Platz, Mitbringen, Betreuung, Helfer · kein Fenster`);
  zeilen.push(`b) eine Karte offen, Fenster schließt sie · c) Fenster wie vorher · d) kein „Noch eins“`);
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
