/* v775 · Charles 02.11.: „Bei der Anwesenheit sollten wir differenzieren. Aktive Zusage durch die Eltern ist wirklich zugesagt. Durch Eltern
   abgesagt ist wirklich abgesagt. Wenn für das Kind noch gar nicht reagiert wurde, sollte das sichtbar sein. Und dann per Push die
   entsprechenden Eltern informieren.“
   a) Jede Kachel trägt ihren Stand aus den Rückmeldungen: „zugesagt“, „abgesagt“, „unsicher“ oder „keine Antwort“; die Zeile darüber zählt sie
   b) „keine Antwort“ ist sichtbar (Wort, gestrichelter Rand) und bleibt wie bisher vorbelegt als dabei; Absage bleibt aus
   c) Knopf „N ohne Antwort per Push erinnern“ (≥ 44 px) ruft push-send mit art rsvp_offen und dem Termin
   d) Ist für den Tag schon Anwesenheit gespeichert, steht kein Rückmelde-Stand mehr an den Kacheln; liegt der Termin in der Vergangenheit, fehlt der Knopf
   e) Ohne Zusage-Liste (alter Aufruf) bleibt es bei der bisherigen Anzeige */
"use strict";
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const datum = h.tagePlus(3), alt = h.tagePlus(-3);
  const pushes = [];
  const s = await h.starten({ hoehe: 2400, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  await s.page.route(/\/functions\/v1\/push-send/, route => { pushes.push(JSON.parse(route.request().postData() || "{}")); return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ familien: 2, sent: 2 }) }); });
  await h.sichtbarMachen(s.page, "#tp-timeline");
  const r = await s.page.evaluate(async ({ K, datum, alt }) => {
    const out = {};
    await loadKader();
    let sel = document.getElementById("aw-date");
    if (!sel) { sel = document.createElement("select"); sel.id = "aw-date"; document.body.appendChild(sel); }
    for (const d of [datum, alt]) if (![...sel.options].some(o => o.value === d)) sel.add(new Option(d, d));
    let liste = document.getElementById("aw-list");
    if (!liste) { liste = document.createElement("div"); liste.id = "aw-list"; document.body.appendChild(liste); }
    const kacheln = () => [...liste.querySelectorAll(".aw-tile")];
    const tile = n => kacheln().find(b => b.dataset.player === n);
    const lies = n => { const b = tile(n); return b ? { stand: b.dataset.stand, an: b.classList.contains("on"), offen: b.classList.contains("aw-offen"), text: b.textContent.replace(/\s+/g, " ").trim(), rand: getComputedStyle(b).borderStyle } : null; };
    // a) + b)
    sel.value = datum; delete AW_DATA[datum]; delete AW_DATA[alt]; window._awVorab = {};
    _awVorab[datum] = { absage: new Set([K[4]]), zusage: new Set(K.slice(0, 3)), unsicher: new Set([K[3]]), terminId: 4711, datum };
    awRenderList();
    out.a = { zu: lies(K[0]), ab: lies(K[4]), un: lies(K[3]), off: lies(K[7]), zeile: document.getElementById("aw-vorab-hinweis").textContent.replace(/\s+/g, " ").trim() };
    out.a.offenAnzahl = kacheln().filter(b => b.dataset.stand === "keine Antwort").length;
    // c) Knopf
    const k = document.getElementById("aw-offen-push");
    out.c = { da: !!k, hoehe: k ? parseInt(getComputedStyle(k).minHeight, 10) || 0 : 0, text: k ? k.textContent.replace(/\s+/g, " ").trim() : "" };
    if (k) { k.click(); await new Promise(x => setTimeout(x, 600)); }
    // d) gespeichert / Vergangenheit
    AW_DATA[datum] = { _trainers: [] }; AW_DATA[datum][K[0]] = { da: true, qual: 0 };
    awRenderList();
    out.d1 = { staende: kacheln().filter(b => b.dataset.stand).length, knopf: !!document.getElementById("aw-offen-push") };
    sel.value = alt; delete AW_DATA[alt];
    _awVorab[alt] = { absage: new Set(), zusage: new Set(K.slice(0, 3)), unsicher: new Set(), terminId: 4712, datum: alt };
    awRenderList();
    out.d2 = { knopf: !!document.getElementById("aw-offen-push"), offen: kacheln().filter(b => b.dataset.stand === "keine Antwort").length };
    // e) alter Aufruf
    sel.value = datum; delete AW_DATA[datum]; _awVorab[datum] = { absage: new Set([K[4]]) };
    awRenderList();
    out.e = { staende: kacheln().filter(b => b.dataset.stand).length, knopf: !!document.getElementById("aw-offen-push"), ab: /abgesagt/.test((tile(K[4]) || {}).textContent || ""), an: kacheln().filter(b => b.classList.contains("on")).length };
    return out;
  }, { K, datum, alt });
  const fe = s.fehler(); await s.schliessen();
  const a = r.a;
  if (!a.zu || a.zu.stand !== "zugesagt" || !a.zu.an || !/zugesagt/.test(a.zu.text)) probleme.push("a) zugesagt: " + JSON.stringify(a.zu));
  if (!a.ab || a.ab.stand !== "abgesagt" || a.ab.an || !/abgesagt/.test(a.ab.text)) probleme.push("a) abgesagt: " + JSON.stringify(a.ab));
  if (!a.un || a.un.stand !== "unsicher" || !/unsicher/.test(a.un.text)) probleme.push("a) unsicher: " + JSON.stringify(a.un));
  if (!a.off || a.off.stand !== "keine Antwort" || !/keine Antwort/.test(a.off.text) || !a.off.an || !a.off.offen || a.off.rand !== "dashed") probleme.push("b) keine Antwort: " + JSON.stringify(a.off));
  if (!/3 zugesagt/.test(a.zeile) || !/1 abgesagt/.test(a.zeile) || !/1 unsicher/.test(a.zeile) || !/10 ohne Antwort/.test(a.zeile)) probleme.push("a) Zeile: " + a.zeile);
  zeilen.push(`a) Kacheln: zugesagt, abgesagt (aus), unsicher, keine Antwort (an, gestrichelt) · Zeile „${a.zeile.slice(0, 110)}…“`);
  if (!r.c.da || r.c.hoehe < 44 || !/10 ohne Antwort per Push erinnern/.test(r.c.text) || pushes.length !== 1 || pushes[0].art !== "rsvp_offen" || pushes[0].termin_id !== 4711) probleme.push("c) " + JSON.stringify({ c: r.c, pushes }));
  zeilen.push(`c) Knopf „${r.c.text}“ (${r.c.hoehe} px) → push-send ${JSON.stringify(pushes[0] || {})}`);
  if (r.d1.staende !== 0 || r.d1.knopf || r.d2.knopf) probleme.push("d) " + JSON.stringify({ d1: r.d1, d2: r.d2 }));
  zeilen.push("d) gespeicherte Anwesenheit: keine Rückmelde-Stände; Termin in der Vergangenheit: kein Push-Knopf");
  if (r.e.staende !== 1 || r.e.knopf || !r.e.ab || r.e.an !== 14) probleme.push("e) " + JSON.stringify(r.e));
  zeilen.push("e) alter Aufruf ohne Zusage-Liste: wie bisher, nur „abgesagt“");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v775 Anwesenheit: Zusage, Absage und „keine Antwort“ unterscheidbar, Push an die Offenen", !probleme.length, probleme.length ? probleme : zeilen);
};
