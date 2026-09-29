/* v681 · Spieltag in drei Phasen, Zurück-Kopf statt Reiterzeile
   PO 29.09. (Rückmeldung der Trainerkollegen): „Die Unterseiten sind immer noch teilweise zu
   klein, die Kacheln sind verschoben … Alleine im Spieltagsreiter … man findet auch gar nicht
   direkt, wo muss ich eigentlich anklicken, vor dem Spiel, während dem Spiel, nach dem Spiel.“
   a) Übersicht Spieltag: drei nummerierte Einstiege Vor / Während / Nach, je mindestens 72 px
   b) Jeder Einstieg öffnet den Match mit genau dieser Phase: Vor = Teams + Aufstellung,
      Während = Uhr, Nach = Ergebnis + Quests; die passende Kachel ist gedrückt (aria-pressed)
   c) Immer nur eine Phase offen – auch wenn ein Sprung von außen einen Block per .open öffnet
   d) Ohne Wahl: keine Phase offen, drei Kacheln je mindestens 96 px, keine Klappzeilen sichtbar
   e) Detailseiten: Zurück-Kopf (mind. 44 px) führt zur Übersicht des Bereichs, keine Reiter,
      nichts ragt über den Rand; Übersichtsseiten ohne Kopf
   f) Abschnitts-Überschriften (.sl) mindestens 13 px, nicht in Versalien */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const termine = [{ id: 2, datum: h.tagePlus(2), uhrzeit: "10:00", uhrzeit_ende: "12:00", typ: "spiel", gegner: "Gegner A", trainer_status: {} }];
  const s = await h.starten({ breite: 390, hoehe: 844, warten: 1200,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, nominierungen: [], anwesenheit: [], matchday: [] }) });
  await h.sichtbarMachen(s.page, "#main-app");
  const r = await s.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    await loadKader();
    const offen = () => [...document.querySelectorAll("#train-sub-spieltag details.el-sect")].filter(d => d.open).map(d => d.id).sort().join(",");
    const gedrueckt = () => [...document.querySelectorAll("#mt-phasen .phase-kachel")].filter(b => b.getAttribute("aria-pressed") === "true").map(b => b.dataset.phase).join(",");
    const out = {};
    go("ue-spieltag"); await warte(400);
    out.zeilen = [...document.querySelectorAll("#view-ue-spieltag .phase-zeile")].map(b => ({ t: b.textContent.replace(/\s+/g, " ").trim(), h: Math.round(b.getBoundingClientRect().height), on: b.getAttribute("onclick") }));
    out.kopfAufUebersicht = document.getElementById("tab-subbar").style.display !== "none";
    out.phasen = {};
    for (const p of ["vor", "live", "nach"]) { spieltagPhase(p); await warte(500); out.phasen[p] = { offen: offen(), gedrueckt: gedrueckt() }; }
    // c) Sprung von außen: Match-Uhr-artig nur Live öffnen, dann Nach per .open
    spieltagPhaseZeigen("vor"); await warte(50);
    document.getElementById("mt-phase-nach").open = true; await warte(100);
    out.sprung = { offen: offen(), gedrueckt: gedrueckt() };
    // d) ohne Wahl
    go("home"); await warte(200); go("spieltag"); await warte(500);
    out.ohne = { offen: offen(), gedrueckt: gedrueckt(),
      kacheln: [...document.querySelectorAll("#mt-phasen .phase-kachel")].map(b => Math.round(b.getBoundingClientRect().height)),
      summaries: [...document.querySelectorAll("#train-sub-spieltag details.el-sect>summary")].filter(x => x.getBoundingClientRect().height > 0).length };
    // e) Zurück-Kopf
    out.kopf = {};
    for (const [k, ue] of [["spieltag", "ue-spieltag"], ["kader", "ue-team"], ["planung", "ue-training"], ["termine", "ue-orga"], ["quizresults", "ue-elki"]]) {
      go(k); await warte(300);
      const bar = document.getElementById("tab-subbar"), btn = bar.querySelector(".zurueck-kopf");
      out.kopf[k] = { btn: btn ? Math.round(btn.getBoundingClientRect().height) : 0, ziel: btn ? btn.getAttribute("onclick") : "", reiter: bar.querySelectorAll(".sub-tab").length,
        breit: bar.scrollWidth > bar.clientWidth + 1, titel: (bar.querySelector(".seiten-titel") || {}).textContent || "" };
      if (btn) { btn.click(); await warte(300); out.kopf[k].danach = document.querySelector(".view.active")?.id || ""; }
    }
    // f)
    go("kader"); await warte(300);
    const sl = [...document.querySelectorAll("#view-kader .sl")].find(e => e.getBoundingClientRect().height > 0);
    out.sl = sl ? { px: parseFloat(getComputedStyle(sl).fontSize), tt: getComputedStyle(sl).textTransform } : null;
    return out;
  });
  const f = s.fehler(); await s.schliessen();
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  // a)
  if (r.zeilen.length !== 3) probleme.push(`a) ${r.zeilen.length} Phasen-Einstiege statt drei`);
  ["Vor dem Spiel", "Während des Spiels", "Nach dem Spiel"].forEach((t, i) => { const z = r.zeilen[i]; if (!z || !z.t.includes(t)) probleme.push(`a) Einstieg ${i + 1} ist nicht „${t}“`); else if (z.h < 72) probleme.push(`a) „${t}“ nur ${z.h} px`); });
  if (r.kopfAufUebersicht) probleme.push("e) Die Übersichtsseite trägt einen Zurück-Kopf");
  // b)
  const soll = { vor: "mt-phase-nom,mt-phase-vor", live: "mt-phase-live", nach: "mt-phase-nach,mt-phase-quests" };
  for (const p in soll) { const x = r.phasen[p]; if (x.offen !== soll[p]) probleme.push(`b) ${p}: offen ${x.offen} – erwartet ${soll[p]}`); if (x.gedrueckt !== p) probleme.push(`b) ${p}: gedrückt ist „${x.gedrueckt}“`); }
  // c)
  if (r.sprung.offen !== soll.nach || r.sprung.gedrueckt !== "nach") probleme.push(`c) Sprung per .open: offen ${r.sprung.offen}, gedrückt ${r.sprung.gedrueckt}`);
  // d)
  if (r.ohne.offen || r.ohne.gedrueckt) probleme.push(`d) Ohne Wahl offen: ${r.ohne.offen} / ${r.ohne.gedrueckt}`);
  if (r.ohne.kacheln.length !== 3 || r.ohne.kacheln.some(x => x < 96)) probleme.push(`d) Phasen-Kacheln ${JSON.stringify(r.ohne.kacheln)} – erwartet drei à 96 px`);
  if (r.ohne.summaries) probleme.push(`d) ${r.ohne.summaries} Klappzeilen sichtbar`);
  // e)
  for (const k in r.kopf) {
    const x = r.kopf[k], ue = { spieltag: "ue-spieltag", kader: "ue-team", planung: "ue-training", termine: "ue-orga", quizresults: "ue-elki" }[k];
    if (x.btn < 44) probleme.push(`e) ${k}: Zurück-Knopf ${x.btn} px`);
    if (!x.ziel.includes(ue)) probleme.push(`e) ${k}: Zurück führt nach ${x.ziel}`);
    if (x.danach !== "view-" + ue) probleme.push(`e) ${k}: nach dem Tipp sichtbar ${x.danach}`);
    if (x.reiter) probleme.push(`e) ${k}: noch ${x.reiter} Reiter`);
    if (x.breit) probleme.push(`e) ${k}: Kopf ragt über den Rand`);
  }
  // f)
  if (!r.sl) probleme.push("f) keine .sl-Überschrift im Kader gefunden");
  else if (r.sl.px < 13 || r.sl.tt === "uppercase") probleme.push(`f) .sl ${r.sl.px}px, ${r.sl.tt}`);
  zeilen.push(`Einstiege: ${r.zeilen.map(z => z.h + "px").join(" / ")} · Phasen ${JSON.stringify(r.phasen)}`);
  zeilen.push(`Kopf: ${Object.entries(r.kopf).map(([k, x]) => `${k} ${x.btn}px→${x.danach}`).join(" · ")}`);
  return h.ergebnis("Spieltag in drei Phasen, Zurück-Kopf statt Reiterzeile", !probleme.length, zeilen.concat(probleme));
};
