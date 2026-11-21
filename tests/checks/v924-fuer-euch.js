/* v924 · Charles 21.11. (Bild der Eltern-Startseite): „Ich sehe keine Info für die neue Abfrage … Würde oben vielleicht
   eine Art Karussell machen mit wichtigen To-dos wie Mitbringliste für die Weihnachtsfeier. Daneben könnte man die neue
   Abfrage oder auch zukünftige Themen platzieren … Wenn man sich eingetragen hat, sollte man es ausblenden können. Die
   Liste sollte aber im Termin immer aufrufbar sein.“ – Bild freigegeben.
   a) „📌 Für euch“ steht ganz oben vor der Terminkarte: Weihnachtsfeier und Steckbrief als Karten einer Bahn,
      „1 von 2“ und zwei Punkte; die nächste Karte schaut hervor (Karte schmaler als die Bahn); kein Querscrollen der Seite.
   b) „✕“ an der Feier: Karte weg, Meldung mit „Rückgängig“, gemerkt am Gerät; „Rückgängig“ holt sie zurück.
      Danach eine Karte: kein Zähler, volle Breite.
   c) Im Termin „Weihnachtsfeier“ steht die Mitbringliste weiter (td-feier), auch wenn die Karte ausgeblendet ist.
   d) Nichts zu tun → „Für euch“ unsichtbar. */
"use strict";
module.exports = async function (h) {
  const titel = "v924 „Für euch“: Karussell oben mit Feier und Steckbrief, ✕ mit Rückgängig, Mitbringliste bleibt im Termin";
  const probleme = [], zeilen = [];
  const datum = h.tagePlus(9);
  const feier = { id: 112, datum, uhrzeit: "18:15", uhrzeit_ende: "20:00", typ: "event", titel: "Weihnachtsfeier", ort: "Vereinsheim", mitbringen: false, eltern_turnier: false, trainer_status: {}, platz_status: null };
  const TOKEN = "x." + Buffer.from(JSON.stringify({ sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600, email: "eltern@example.org" })).toString("base64url") + ".y";
  const st = { voll: false };
  const e = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1000, breite: 390, hoehe: 1000,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7 } }],
      termine: (u) => /titel=eq\./.test(u.search) || /id=eq\.112/.test(u.search) ? [feier] : [feier],
      rueckmeldungen: (u) => /termin_id=eq\.112/.test(u.search) ? [{ spieler_id: 1, status: "zugesagt", termin_id: 112 }] : [],
      feier_eintraege: [],
      kind_fanfacts: () => st.voll ? [{ spieler_id: 1, lieblingsposition: "jaeger", lieblingsspieler: "a", lieblingsverein: "b", schoenster_moment: "c", torjubel: "d", saisonziel: "e", hobby: "f", kann_gut: "g", lieblingsessen: "h", lieblingstier: "i", gross_werden: "j", stolz_auf: "k" }] : [{ spieler_id: 1, hobby: "Lego" }],
      kind_foto: () => st.voll ? [{ spieler_id: 1, zweck: "aktion" }, { spieler_id: 1, zweck: "sport" }, { spieler_id: 1, zweck: "alltag" }] : [] }) });
  await e.page.exposeFunction("__voll", () => { st.voll = true; });
  await e.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await e.page.reload({ waitUntil: "networkidle" });
  const r = await e.page.evaluate(async (datum) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 40 && typeof feierObenLoad !== "function"; i++) await w(100);
    FEIER_KONFIG[0].datum = datum;
    await feierObenLoad(window._elternKids);
    for (let i = 0; i < 40 && !document.querySelector("#steckbrief-slot .sb-karte"); i++) await w(100);
    await w(300);
    const sek = document.getElementById("fuer-euch"), bahn = document.getElementById("fe-bahn");
    const karten = () => [...document.querySelectorAll("#fe-bahn > div > *")];
    const out = { sichtbar: !!sek && !sek.hidden, zahl: (document.getElementById("fe-zahl") || {}).textContent, punkte: document.querySelectorAll("#fe-punkte i").length,
      karten: karten().map(k => k.className.split(" ")[0]) };
    const top = el => el ? el.getBoundingClientRect().top : 1e9;
    const termin = [...document.querySelectorAll("div,section")].find(d => /Nächster Termin/.test(d.textContent || "") && d.children.length && d.getBoundingClientRect().height > 60 && !d.contains(sek));
    out.vorTermin = !!sek && (!termin || top(sek) < top(termin));
    out.erste = karten()[0] ? Math.round(karten()[0].getBoundingClientRect().width) : 0; out.bahnBreite = bahn ? Math.round(bahn.getBoundingClientRect().width) : 0;
    out.querScroll = document.documentElement.scrollWidth > window.innerWidth + 1;
    const x = document.querySelector("#feier-slot .fe-x");
    out.xHoch = x ? Math.round(x.getBoundingClientRect().height) : 0; out.xName = x ? x.getAttribute("aria-label") : "";
    const knopf = document.querySelector("#feier-slot .feier-karte-knopf"); out.knopfHoch = knopf ? Math.round(knopf.getBoundingClientRect().height) : 0;
    if (x) x.click(); await w(400);
    out.nachX = { feier: !!document.querySelector("#feier-slot .feier-karte"), gemerkt: localStorage.getItem("adler_feier_weg_weihnachten-2026"), toast: (document.getElementById("undo-toast") || {}).textContent || "",
      zahl: document.getElementById("fe-zahl").textContent, einzeln: sek.classList.contains("fe-einzeln"), breite: karten()[0] ? Math.round(karten()[0].getBoundingClientRect().width) : 0 };
    await feierObenLoad(window._elternKids); await w(200);
    out.nachNeuLaden = !!document.querySelector("#feier-slot .feier-karte");
    const undo = document.querySelector("#undo-toast button"); if (undo) undo.click();
    for (let i = 0; i < 20 && !document.querySelector("#feier-slot .feier-karte"); i++) await w(100);
    out.nachUndo = { feier: !!document.querySelector("#feier-slot .feier-karte"), gemerkt: localStorage.getItem("adler_feier_weg_weihnachten-2026"), zahl: document.getElementById("fe-zahl").textContent };
    /* c) Termin: ausgeblendet, trotzdem Mitbringliste */
    localStorage.setItem("adler_feier_weg_weihnachten-2026", "1"); await feierObenLoad(window._elternKids);
    if (typeof terminDetailOpen === "function") { await terminDetailOpen(112); for (let i = 0; i < 30 && !document.getElementById("td-feier"); i++) await w(100); }
    out.imTermin = !!document.getElementById("td-feier");
    document.querySelectorAll('[role="dialog"]').forEach(d => d.remove());
    /* d) nichts mehr offen */
    await window.__voll(); await steckbriefKarte(window._elternKids); await w(300);
    out.leer = sek.hidden;
    return out;
  }, datum);
  const fe = e.fehler().filter(f => !/Failed to load resource|net::ERR/.test(f));
  await e.schliessen();
  if (!r.sichtbar || r.zahl !== "1 von 2" || r.punkte !== 2 || r.karten.join(",") !== "feier-karte,sb-karte") probleme.push(`a) Karussell: sichtbar ${r.sichtbar}, „${r.zahl}“, ${r.punkte} Punkte, Karten ${r.karten.join(",")}`);
  if (!r.vorTermin) probleme.push("a) „Für euch“ steht nicht vor der Terminkarte");
  if (!(r.erste < r.bahnBreite - 20) || r.querScroll) probleme.push(`a) nächste Karte schaut nicht hervor (${r.erste}/${r.bahnBreite} px) oder Seite scrollt quer (${r.querScroll})`);
  if (r.xHoch < 44 || !/Termin/.test(r.xName) || r.knopfHoch < 56) probleme.push(`b) ✕ ${r.xHoch} px „${r.xName}“, Hauptknopf ${r.knopfHoch} px`);
  const n = r.nachX;
  if (n.feier || n.gemerkt !== "1" || !/Mitbringliste steht im Termin/.test(n.toast) || !/Rückgängig/.test(n.toast) || n.zahl !== "" || !n.einzeln || n.breite !== r.bahnBreite) probleme.push(`b) nach ✕: ${JSON.stringify(n)}`);
  if (r.nachNeuLaden) probleme.push("b) ausgeblendete Karte kommt beim Neuladen wieder");
  if (!r.nachUndo.feier || r.nachUndo.gemerkt || r.nachUndo.zahl !== "1 von 2") probleme.push(`b) Rückgängig: ${JSON.stringify(r.nachUndo)}`);
  if (!r.imTermin) probleme.push("c) Mitbringliste fehlt im Termin");
  if (!r.leer) probleme.push("d) „Für euch“ bleibt sichtbar, obwohl nichts offen ist");
  zeilen.push(`a) „Für euch“ vor der Terminkarte, „${r.zahl}“, Karte ${r.erste} von ${r.bahnBreite} px · b) ✕ ${r.xHoch} px → weg, gemerkt, „Rückgängig“ holt zurück · c) Mitbringliste im Termin · d) nichts offen → unsichtbar`);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
