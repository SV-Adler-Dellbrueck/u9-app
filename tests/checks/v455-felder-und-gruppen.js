/* v455 – Nachtrag zu v454, mit Screenshot gemeldet: drei Trainer, drei ausgeloste Gruppen,
   Finn am Torwart-Block – und trotzdem „3 Felder statt 3". Die Untergrenze „nie weniger
   Felder als Gruppen" hatte den Sieg davongetragen. Jetzt: Felder = freie Trainer, die
   ueberzaehlige Gruppe spielt bei einem anderen Feld mit (nur in diesem Hauptteil), und
   der Trainingsstart nimmt dieselbe Zusammenlegung. Dazu: ausgetragene Torhueter tauchen
   im Torwart-Block nicht mehr auf. */
module.exports = async function (h) {
  const K = h.KINDER, RAUS = K[2], probleme = [], zeilen = [];
  const rows = h.kaderZeilen({ inaktiv: [RAUS] }); rows[1].tw = true; rows[2].tw = true;   // K[0], K[1], K[2] sind Torhueter, K[2] ausgetragen
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: rows }), hoehe: 2200 });
  await h.sichtbarMachen(s.page, "#tp-timeline");
  const r = await s.page.evaluate(async ({ K }) => {
    await loadKader();
    const T = TRAINER.slice(0, 3);
    let box = document.getElementById("tp-trainer-checks"); if (!box) { box = document.createElement("div"); box.id = "tp-trainer-checks"; document.body.appendChild(box); }
    TP_RSVP = {}; T.forEach(t => TP_RSVP[t] = "ja"); TP_TRAINER_MANUELL = {}; tpTrainerChipsRender();
    tpCoaches = {};
    tpSlots.length = 0;
    tpSlots.push({ label: "Ankommen & Aufwärmen", dauer: 10, farbe: "#059669", typ: "warmup" },
                 { label: "Hauptteil 1", dauer: 20, farbe: "#1a56db", typ: "main" },
                 { label: "Hauptteil 2", dauer: 20, farbe: "#7c3aed", typ: "main" });
    // drei ausgeloste Gruppen zu je 5 Kindern (ohne das ausgetragene Kind)
    const aktiv = K.filter(n => n !== K[2]);
    _tgCache = { datum: _tgDatum(), geladen: true, tg: { gruppen: [
      { emo: "🔵", name: "Blaue Haie", farbe: "#2563eb", trainer: T[0], kinder: aktiv.slice(0, 5) },
      { emo: "🔴", name: "Rote Füchse", farbe: "#dc2626", trainer: T[1], kinder: aktiv.slice(5, 10) },
      { emo: "🟢", name: "Grüne Krokodile", farbe: "#16a34a", trainer: T[2], kinder: aktiv.slice(10, 14) }], ausAnwesenheit: false } };
    tpRenderTimeline();
    const felder = si => [...document.querySelectorAll(`.tp-form-sel[id^="tp-form-${si}-"]`)].length;
    const titel = si => [...document.querySelectorAll(`.tp-slot`)].filter(x => x.querySelector(`.tp-form-sel[id^="tp-form-${si}-"]`))[0]?.querySelectorAll(".tp-station-titel") || [];
    const out = { vorher: felder(1) };
    tpDoAddSlot("tw"); const twIdx = tpSlots.findIndex(x => x.typ === "tw"); tpSlots[twIdx].parallelZu = 1; tpRenderTimeline();
    tpSetCoach(`tp-form-${twIdx}-0`, T[2]);
    out.nachher = felder(1); out.nachher2 = felder(2);
    out.titel1 = [...titel(1)].map(x => x.textContent.trim()); out.titel2 = [...titel(2)].map(x => x.textContent.trim());
    out.hinweis = (document.querySelector(".tp-parallel-hinweis") || {}).textContent || "";
    out.twChips = [...document.querySelectorAll(".tp-tw-player")].map(c => c.value);
    out.indOpts = [...(document.querySelector('select[id^="tp-ind-player-"]') || { options: [] }).options].map(o => o.value).filter(Boolean);
    // Trainingsstart nimmt dieselbe Zusammenlegung
    const snap = _tlSnapshot(); const h1 = snap.find(st => st.label === "Hauptteil 1"), h2 = snap.find(st => st.label === "Hauptteil 2");
    out.startH1 = h1.gruppen.filter(g => !g.einzel).map(g => (g.kinder || []).length); out.startH2 = h2.gruppen.map(g => (g.kinder || []).length);
    out.startAlleKinder = h1.gruppen.filter(g => !g.einzel).flatMap(g => g.kinder || []).length;
    return out;
  }, { K });
  const fehler = s.fehler(); await s.schliessen();
  if (r.vorher !== 3) probleme.push(`vorher ${r.vorher} Felder statt 3`);
  if (r.nachher !== 2) probleme.push(`mit Torwart-Block ${r.nachher} Felder statt 2`);
  if (r.nachher2 !== 3) probleme.push(`Hauptteil 2 ohne Block: ${r.nachher2} Felder statt 3`);
  if (!r.titel1.some(t => /Krokodile/.test(t) && /\+/.test(t) && /\(9\)/.test(t))) probleme.push("Gruene Krokodile spielen nicht sichtbar bei einem anderen Feld mit: " + JSON.stringify(r.titel1));
  if (r.titel2.length !== 3 || r.titel2.some(t => /\+/.test(t))) probleme.push("Hauptteil 2 muesste die drei Gruppen unveraendert zeigen: " + JSON.stringify(r.titel2));
  if (!/2 Felder statt 3/.test(r.hinweis) || !/Krokodile spielt bei/.test(r.hinweis)) probleme.push("Hinweis: „" + r.hinweis + "“");
  if (r.twChips.includes(RAUS) || r.twChips.length !== 2) probleme.push("Torwart-Haken: " + JSON.stringify(r.twChips) + " (ausgetragenes Kind darf nicht dabei sein)");
  if (r.startH1.length !== 2 || r.startAlleKinder !== 14 - 2) probleme.push(`Trainingsstart Hauptteil 1: ${r.startH1.length} Felder, ${r.startAlleKinder} Kinder (erwartet 2 Felder, 12 Kinder ohne die zwei Torhueter)`);
  if (r.startH2.length !== 3) probleme.push(`Trainingsstart Hauptteil 2: ${r.startH2.length} Felder statt 3`);
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Felder ${r.vorher} → ${r.nachher} (Hauptteil 2: ${r.nachher2}) · ${JSON.stringify(r.titel1)} · Torwart-Haken ${r.twChips.length} · Start: ${JSON.stringify(r.startH1)} / ${JSON.stringify(r.startH2)}`);
  return h.ergebnis("Trainingsplan: Felder folgen den freien Trainern, ueberzaehlige Gruppe spielt mit, ausgetragene Torhueter raus", !probleme.length, zeilen.concat(probleme));
};
