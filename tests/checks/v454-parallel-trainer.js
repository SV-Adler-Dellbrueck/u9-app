/* v454 – „wenn Finn Torwart-Training macht, kann er kein Übungsfeld übernehmen":
   vier Trainer, einer am parallelen Block → drei Felder statt vier, der Trainer taucht in
   keinem Feld-Dropdown des Hauptteils mehr auf. Parallele Bloecke dauern so lange wie ihr
   Hauptteil. Und: das Neuzeichnen darf gewaehlte Uebungen nicht mehr verlieren. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }), hoehe: 2000 });
  await h.sichtbarMachen(s.page, "#tp-timeline");
  const r = await s.page.evaluate(async () => {
    await loadKader();
    const T = TRAINER.slice(0, 4);
    let box = document.getElementById("tp-trainer-checks"); if (!box) { box = document.createElement("div"); box.id = "tp-trainer-checks"; document.body.appendChild(box); }
    TP_RSVP = {}; T.forEach(t => TP_RSVP[t] = "ja"); TP_TRAINER_MANUELL = {}; tpTrainerChipsRender();
    tpCoaches = {};
    tpSlots.length = 0;
    tpSlots.push({ label: "Ankommen & Aufwärmen", dauer: 10, farbe: "#059669", typ: "warmup" },
                 { label: "Hauptteil 1", dauer: 20, farbe: "#1a56db", typ: "main" },
                 { label: "Hauptteil 2", dauer: 20, farbe: "#7c3aed", typ: "main" },
                 { label: "Abschlussspiel", dauer: 20, farbe: "#c2410c", typ: "abschluss" });
    tpRenderTimeline();
    const felder = si => [...document.querySelectorAll(`.tp-form-sel[id^="tp-form-${si}-"]`)].length;
    const coaches = si => [...document.querySelectorAll(`.tp-coach-sel[data-station^="tp-form-${si}-"]`)].map(c => ({ wert: c.value, optionen: [...c.options].map(o => o.value).filter(Boolean) }));
    const out = { vorher: felder(1), T };
    // Uebung in Feld 1 des Hauptteils 1 waehlen
    const sel = document.getElementById("tp-form-1-0"); const opt = [...sel.options].find(o => o.value); sel.value = opt.value; tpOnSelectChange(sel); out.gewaehlt = opt.value;
    // Torwart-Block dazu (TP_ADD_OPTS[1]), an Hauptteil 1 haengen, Trainer 2 dorthin
    tpDoAddSlot("tw");
    const twIdx = tpSlots.findIndex(x => x.typ === "tw");
    out.twDauerBeimAnlegen = tpSlots[twIdx].dauer;          // wurde an den LETZTEN Hauptteil gehaengt (20)
    tpSlots[twIdx].parallelZu = 1; tpRenderTimeline();
    tpSetCoach(`tp-form-${twIdx}-0`, T[1]);                   // rendert neu
    out.nachher = felder(1); out.nachher2 = felder(2);
    out.coaches1 = coaches(1); out.coaches2 = coaches(2);
    out.hinweis = (document.querySelector(".tp-parallel-hinweis") || {}).textContent || "";
    out.gewaehltDanach = document.getElementById("tp-form-1-0")?.value;
    out.twCoach = tpCoaches[`tp-form-${twIdx}-0`];
    // Dauer: Hauptteil 1 auf 30 → Torwart-Block folgt
    tpSetDauer(1, 30);
    out.twDauer = tpSlots[twIdx].dauer;
    out.twZeit = [...document.querySelectorAll(".tp-slot-head")].map(k => k.textContent.replace(/\s+/g, " ")).find(t => /Torwart/.test(t)) || "";
    // Dialog-Text
    tpAddSlot(); const dlg = [...document.querySelectorAll('div[style*="fixed"]')].pop(); out.dialog = dlg ? dlg.textContent.replace(/\s+/g, " ") : ""; dlg?.remove();
    return out;
  });
  const fehler = s.fehler(); await s.schliessen();
  const T = r.T;
  if (r.vorher !== 4) probleme.push(`vorher ${r.vorher} Felder statt 4`);
  if (r.nachher !== 3) probleme.push(`mit Torwart-Block ${r.nachher} Felder statt 3`);
  if (r.nachher2 !== 4) probleme.push(`Hauptteil 2 (ohne Block) hat ${r.nachher2} Felder statt 4`);
  if (r.twCoach !== T[1]) probleme.push("Trainer am Torwart-Block nicht gesetzt");
  if (r.coaches1.some(c => c.wert === T[1])) probleme.push("gebundener Trainer ist noch einem Feld zugewiesen");
  if (r.coaches1.some(c => c.optionen.includes(T[1]))) probleme.push("gebundener Trainer steht noch im Feld-Dropdown des Hauptteils 1");
  if (!r.coaches2.every(c => c.optionen.includes(T[1]))) probleme.push("in Hauptteil 2 fehlt der Trainer im Dropdown (dort ist er frei)");
  if (!new RegExp(T[1] + ".*3 Felder statt 4").test(r.hinweis)) probleme.push("Hinweis fehlt oder falsch: „" + r.hinweis + "“");
  if (r.gewaehltDanach !== r.gewaehlt) probleme.push(`gewaehlte Uebung ging beim Neuzeichnen verloren (${r.gewaehlt} → ${r.gewaehltDanach})`);
  if (r.twDauerBeimAnlegen !== 20 || r.twDauer !== 30 || !/10' – 40'/.test(r.twZeit)) probleme.push(`Dauer: beim Anlegen ${r.twDauerBeimAnlegen}, nach Hauptteil=30 → ${r.twDauer}, Kopf „${r.twZeit}“`);
  if (!/parallel zum Hauptteil/.test(r.dialog)) probleme.push("Dialog verspricht noch „15 Min.“");
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Felder ${r.vorher} → ${r.nachher} (Hauptteil 2: ${r.nachher2}) · Hinweis „${r.hinweis.trim()}“ · Uebung bleibt ${r.gewaehltDanach === r.gewaehlt} · Torwart-Dauer ${r.twDauerBeimAnlegen}→${r.twDauer}`);
  return h.ergebnis("Trainingsplan: Trainer am Torwart-/Einzelblock faellt fuer die Felder weg, Dauer folgt dem Hauptteil", !probleme.length, zeilen.concat(probleme));
};
