/* v457 – „bei den Hauptteilen soll eine Gruppenuebung auch geloescht werden koennen, z. B.
   bei der Auswahl der Trainer, dass man nur noch 2 statt 3 Uebungen plant". Im Trainer-
   Dropdown eines Feldes steht „✕ Feld weglassen": die Gruppe spielt bei den anderen mit,
   Trainer der Felder dahinter ruecken nach, der Trainingsstart nimmt dieselbe Aufteilung,
   und „↩ Feld wieder aufnehmen" holt es zurueck. Nur in diesem Hauptteil. */
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }), hoehe: 2200 });
  await h.sichtbarMachen(s.page, "#tp-timeline");
  const r = await s.page.evaluate(async ({ K }) => {
    await loadKader();
    const T = TRAINER.slice(0, 3);
    let box = document.getElementById("tp-trainer-checks"); if (!box) { box = document.createElement("div"); box.id = "tp-trainer-checks"; document.body.appendChild(box); }
    TP_RSVP = {}; T.forEach(t => TP_RSVP[t] = "ja"); TP_TRAINER_MANUELL = {}; tpTrainerChipsRender();
    tpCoaches = {}; tpSlots.length = 0;
    tpSlots.push({ label: "Hauptteil 1", dauer: 20, farbe: "#1a56db", typ: "main" }, { label: "Hauptteil 2", dauer: 20, farbe: "#7c3aed", typ: "main" });
    _tgCache = { datum: _tgDatum(), geladen: true, tg: { gruppen: [
      { emo: "🔵", name: "Blaue Haie", farbe: "#2563eb", trainer: T[0], kinder: K.slice(0, 5) },
      { emo: "🔴", name: "Rote Füchse", farbe: "#dc2626", trainer: T[1], kinder: K.slice(5, 10) },
      { emo: "🟢", name: "Grüne Krokodile", farbe: "#16a34a", trainer: T[2], kinder: K.slice(10, 14) }], ausAnwesenheit: false } };
    tpRenderTimeline();
    const felder = si => [...document.querySelectorAll(`.tp-form-sel[id^="tp-form-${si}-"]`)].length;
    const titel = si => [...document.querySelectorAll(".tp-slot")].filter(x => x.querySelector(`.tp-form-sel[id^="tp-form-${si}-"]`))[0]?.querySelectorAll(".tp-station-titel") || [];
    const out = { vorher: felder(1), option: !!document.querySelector('.tp-coach-sel[data-station="tp-form-1-1"] option[value="__weg"]') };
    // Feld 2 (Rote Fuechse) im Hauptteil 2 weglassen – ueber das Dropdown, wie der Trainer es tut
    const sel = document.querySelector('.tp-coach-sel[data-station="tp-form-1-1"]'); sel.value = "__weg"; sel.dispatchEvent(new Event("change"));
    out.nachher = felder(1); out.h1 = felder(0);
    out.titel = [...titel(1)].map(x => x.textContent.trim());
    out.coaches = [tpCoaches["tp-form-1-0"], tpCoaches["tp-form-1-1"]];
    out.hinweis = (document.querySelectorAll(".tp-parallel-hinweis")[0] || {}).textContent || "";
    const snap = _tlSnapshot(); out.start = snap.find(st => st.label === "Hauptteil 2").gruppen.map(g => (g.kinder || []).length);
    out.gespeichert = tpSlotsMitZuordnung()[1].weg;
    document.querySelector(".tp-feld-zurueck").click();
    out.zurueck = felder(1);
    return out;
  }, { K });
  const fehler = s.fehler(); await s.schliessen();
  if (r.vorher !== 3 || !r.option) probleme.push(`vorher ${r.vorher} Felder, Option vorhanden: ${r.option}`);
  if (r.nachher !== 2) probleme.push(`nach dem Weglassen ${r.nachher} Felder statt 2`);
  if (r.h1 !== 3) probleme.push(`Hauptteil 1 muesste unveraendert 3 Felder haben: ${r.h1}`);
  if (!r.titel.some(t => /Rote Füchse/.test(t) && /\+/.test(t))) probleme.push("Rote Fuechse spielen nicht sichtbar mit: " + JSON.stringify(r.titel));
  if (!r.titel.some(t => /^🔵|Blaue Haie \(5\)/.test(t))) probleme.push("Blaue Haie muessten unveraendert bleiben: " + JSON.stringify(r.titel));
  if (!/1 Feld weggelassen/.test(r.hinweis) || !/wieder aufnehmen/.test(r.hinweis)) probleme.push("Hinweis: „" + r.hinweis + "“");
  /* v573: [9,5], nicht [5,9] – der Trainingsstart nimmt jetzt AUCH den Versatz, wie die
     Zeitleiste ihn zeigt („Grüne Krokodile + Rote Füchse (9)" steht dort an Feld 1). Bis v572
     rechnete _tlSnapshot ohne ihn: auf den Handys am Platz stand im zweiten Hauptteil eine
     andere Gruppe am Feld als in der Planung. Diese Prüfung hat den Unterschied bis dahin
     festgeschrieben, statt ihn zu melden. */
  if (JSON.stringify(r.start) !== JSON.stringify([9, 5])) probleme.push("Trainingsstart Hauptteil 2: " + JSON.stringify(r.start) + " (erwartet [9,5] – dieselbe Zuordnung wie die Zeitleiste)");
  if (JSON.stringify(r.gespeichert) !== "[1]") probleme.push("weg wird nicht gespeichert: " + JSON.stringify(r.gespeichert));
  if (r.zurueck !== 3) probleme.push(`nach „wieder aufnehmen“ ${r.zurueck} Felder statt 3`);
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Felder ${r.vorher} → ${r.nachher} → ${r.zurueck} · ${JSON.stringify(r.titel)} · Start ${JSON.stringify(r.start)} · gespeichert weg=${JSON.stringify(r.gespeichert)}`);
  return h.ergebnis("Trainingsplan: Feld im Hauptteil weglassen und wieder aufnehmen", !probleme.length, zeilen.concat(probleme));
};
