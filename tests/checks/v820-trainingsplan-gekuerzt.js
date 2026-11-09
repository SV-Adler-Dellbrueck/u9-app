/* v820 · Trainingsplan gekürzt (Durchsicht 09.11.2026).
   Am Handy (390 px) war der leere Plan rund 3.680 px lang, gut vier Bildschirme: elf Fokus-Chips
   standen offen vor dem ersten Block, die Teamlisten des Abschlussspiels offen dahinter, und der
   schwebende Knopf „Trainingsstart“ lag an jedem Tag über dem Inhalt.

   a) Fokus: zugeklappt eine Zeile mit dem gewählten Fokus; offen Chips mit mind. 44 px; ein Tipp
      auf einen Chip klappt nicht wieder zu, und die Zeile nennt die Auswahl.
   b) Teams: zugeklappt eine Zeile mit Namen und Zahl je Team; die Spielform bleibt sichtbar; ein
      Tipp auf ein Kind klappt nicht wieder zu; fehlen in einem Team Kinder, steht die Klappe von
      selbst offen (die Warnung darf nicht verschwinden).
   c) Der schwebende Startknopf erscheint nur am Trainingstag.
   d) Der leere Plan ist spürbar kürzer als vorher. */
"use strict";
module.exports = async function (h) {
  const titel = "v820 Trainingsplan gekürzt: Fokus und Teams zugeklappt, Startknopf nur am Trainingstag";
  const probleme = [], zeilen = [];
  const termine = [
    { id: 1, datum: h.heute(), uhrzeit: "17:00", uhrzeit_ende: "18:15", typ: "training", titel: "Training", trainer_status: {} },
    { id: 2, datum: h.tagePlus(2), uhrzeit: "17:00", uhrzeit_ende: "18:15", typ: "training", titel: "Training", trainer_status: {} }];
  const s = await h.starten({ breite: 390, hoehe: 844, warten: 2000,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, nominierungen: [], anwesenheit: [], periodisierung: [], trainingsbloecke: [] }) });
  await h.sichtbarMachen(s.page, "#main-app");
  const r = await s.page.evaluate(async ({ heute, spaeter }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const hoehe = el => el ? Math.round(el.getBoundingClientRect().height) : 0;
    await loadKader(); go("planung"); await w(2000);
    if (!document.getElementById("tp-fokus-d")) return { alt: true };
    const out = {};
    for (let i = 0; i < 30 && !document.querySelector(".tp-abschluss-teams button"); i++) await w(100);
    window.scrollTo(0, 0);
    out.seite = document.documentElement.scrollHeight;
    // a) Fokus
    const fd = () => document.getElementById("tp-fokus-d");
    const zeile = () => document.getElementById("tp-fokus-gewaehlt").textContent.trim();
    out.fokusZu = { offen: fd().open, hoehe: hoehe(document.getElementById("tp-fokus")), text: zeile() };
    fd().querySelector("summary").click(); await w(150);
    const chips = () => [...document.querySelectorAll("#tp-fokus-d [aria-pressed]")];
    out.fokusAuf = { offen: fd().open, chips: chips().length, min: Math.min(...chips().map(hoehe)) };
    chips()[1].click(); await w(200);
    out.fokusNachTipp = { offen: fd().open, text: zeile(), an: chips().filter(c => c.getAttribute("aria-pressed") === "true").length };
    fd().querySelector("summary").click(); await w(150);
    out.fokusWiederZu = { offen: fd().open, hoehe: hoehe(document.getElementById("tp-fokus")) };
    // b) Teams
    const td = () => document.querySelector(".tp-teams-d");
    const box = () => document.querySelector(".tp-abschluss-teams");
    if (!td()) out.teams = null; else {
      const spielform = () => [...box().querySelectorAll("button[onclick^=\"abschlussSpielform\"]")].filter(b => hoehe(b) >= 44).length;
      out.teams = { offen: td().open, zeile: td().querySelector("summary").textContent.replace(/\s+/g, " ").trim(), spielform: spielform(), hoehe: hoehe(td()) };
      td().querySelector("summary").click(); await w(150);
      const kind = td().querySelector("button[onclick^=\"blzCycle\"]");
      out.teamsAuf = { offen: td().open, kindHoehe: hoehe(kind) };
      kind.click(); await w(300);
      out.teamsNachTipp = { offen: td() && td().open, zeile: td().querySelector("summary").textContent.replace(/\s+/g, " ").trim() };
      // zu wenige Kinder in einem Team: Klappe steht von selbst offen
      _abschlussTeamsAuf = false; const t0 = BLZ.teams.find(t => !t.eltern); const alt = t0.spieler.slice(); t0.spieler = t0.spieler.slice(0, 1);
      blzRender(); await w(150);
      out.teamsWarn = { offen: td().open, warnung: /braucht \d+ Kinder je Team/.test(td().textContent) };
      t0.spieler = alt; blzRender(); await w(100);
      out.teamsDanach = { offen: td().open };
    }
    // c) Startleiste
    const leiste = document.getElementById("tp-start-leiste");
    const stellen = async d => { const sel = document.getElementById("tp-date"); if (![...sel.options].some(o => o.value === d)) sel.insertAdjacentHTML("beforeend", `<option value="${d}">${d}</option>`); sel.value = d; window.scrollTo(0, 0); await w(200); tpStartLeisteAktualisieren(); await w(100); };
    await stellen(spaeter); out.leisteSpaeter = !leiste.hidden;
    await stellen(heute); out.leisteHeute = !leiste.hidden;
    out.slots = document.querySelectorAll("#tp-timeline .tp-slot").length;
    return out;
  }, { heute: h.heute(), spaeter: h.tagePlus(2) });
  const f = s.fehler(); await s.schliessen();
  if (r.alt) return h.ergebnis(titel, false, ["Fokus ohne Klappe (Stand vor v820)"]);
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));

  if (r.fokusZu.offen || r.fokusZu.hoehe > 90 || !/noch keiner/.test(r.fokusZu.text)) probleme.push("a) Fokus am Anfang: " + JSON.stringify(r.fokusZu));
  if (!r.fokusAuf.offen || r.fokusAuf.chips < 8 || r.fokusAuf.min < 44) probleme.push("a) Fokus offen: " + JSON.stringify(r.fokusAuf));
  if (!r.fokusNachTipp.offen || r.fokusNachTipp.an !== 1 || /noch keiner/.test(r.fokusNachTipp.text)) probleme.push("a) nach Tipp auf einen Chip: " + JSON.stringify(r.fokusNachTipp));
  if (r.fokusWiederZu.offen || r.fokusWiederZu.hoehe > 90) probleme.push("a) Fokus lässt sich nicht zuklappen: " + JSON.stringify(r.fokusWiederZu));
  if (!r.teams) probleme.push("b) keine Team-Klappe im Abschlussblock");
  else {
    if (r.teams.offen || r.teams.hoehe > 90 || !/\(\d+\)/.test(r.teams.zeile)) probleme.push("b) Teams am Anfang: " + JSON.stringify(r.teams));
    if (r.teams.spielform < 3) probleme.push("b) Spielform-Wahl nicht sichtbar: " + r.teams.spielform + " Knöpfe");
    if (!r.teamsAuf.offen || r.teamsAuf.kindHoehe < 44) probleme.push("b) Teams offen: " + JSON.stringify(r.teamsAuf));
    if (!r.teamsNachTipp.offen) probleme.push("b) ein Tipp auf ein Kind klappt die Teams zu");
    if (!r.teamsWarn.offen || !r.teamsWarn.warnung) probleme.push("b) zu kleines Team: Klappe/Warnung " + JSON.stringify(r.teamsWarn));
  }
  if (!r.slots) probleme.push("c) Plan ohne Blöcke – die Leiste lässt sich nicht prüfen");
  if (r.leisteSpaeter) probleme.push("c) schwebender Startknopf an einem anderen Tag sichtbar");
  if (!r.leisteHeute) probleme.push("c) schwebender Startknopf fehlt am Trainingstag");
  if (r.seite > 3100) probleme.push(`d) leerer Plan ${r.seite} px lang (vor v820 rund 3.680)`);

  zeilen.push(`Fokus zu ${r.fokusZu.hoehe} px → „${r.fokusNachTipp.text}“ · ${r.teams ? r.teams.zeile : "–"} · Startknopf heute ${r.leisteHeute}, später ${r.leisteSpaeter} · Seite ${r.seite} px`);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
