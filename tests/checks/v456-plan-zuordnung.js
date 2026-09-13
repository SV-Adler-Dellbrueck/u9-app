/* v456 – „Die Speichern-Funktion funktioniert nicht": der Server bekam den Plan (200),
   aber ohne die Zuordnung. Feld-Trainer, Trainer am Torwart-Block, Torwart-Haken und
   Einzeltrainings-Kind lebten nur im DOM – nach dem Neuladen war Finn nicht mehr am
   Block und der Hauptteil hatte wieder vier Felder. Geprueft: Geraet A speichert, Geraet B
   findet alles wieder; der Knopf meldet sich; Kinder gehen als kader.id ueber die Leitung. */
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const DB = {}, TERMIN = h.tagePlus(2);
  const rows = h.kaderZeilen(); rows[1].tw = true; rows[2].tw = true;
  const supabase = h.supabaseAttrappe({ kader: rows, trainingsplan: (u, req) => {
    if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); DB[b.datum] = { plan: b.plan, slots: b.slots }; return { status: 201, body: "" }; }
    const eq = (u.searchParams.get("datum") || "").replace("eq.", ""), sel = u.searchParams.get("select") || "plan";
    return DB[eq] ? [sel === "slots" ? { slots: DB[eq].slots } : { plan: DB[eq].plan }] : [];
  } });
  const geraet = async () => {
    const s = await h.starten({ supabase, hoehe: 2200 }); await h.sichtbarMachen(s.page, "#tp-timeline"); await h.terminSetzen(s.page, TERMIN);
    await s.page.evaluate(async () => { await loadKader(); const T = TRAINER.slice(0, 4); let box = document.getElementById("tp-trainer-checks"); if (!box) { box = document.createElement("div"); box.id = "tp-trainer-checks"; document.body.appendChild(box); }
      TP_RSVP = {}; T.forEach(t => TP_RSVP[t] = "ja"); TP_TRAINER_MANUELL = {}; tpTrainerChipsRender(); tpCoaches = {}; });
    return s;
  };
  // Geraet A plant
  const a = await geraet();
  const planA = await a.page.evaluate(async K => {
    const T = TRAINER.slice(0, 4);
    tpSlots.length = 0;
    tpSlots.push({ label: "Ankommen & Aufwärmen", dauer: 10, farbe: "#059669", typ: "warmup" }, { label: "Hauptteil 1", dauer: 20, farbe: "#1a56db", typ: "main" }, { label: "Hauptteil 2", dauer: 20, farbe: "#7c3aed", typ: "main" });
    tpRenderTimeline();
    tpDoAddSlot("tw"); const tw = tpSlots.findIndex(x => x.typ === "tw"); tpSlots[tw].parallelZu = 1; tpRenderTimeline();
    tpSetCoach(`tp-form-${tw}-0`, T[3]);                                   // Finn an den Torwart-Block
    tpDoAddSlot("individual"); const ind = tpSlots.findIndex(x => x.typ === "individual"); tpSlots[ind].parallelZu = 2; tpRenderTimeline();
    document.querySelector(`.tp-tw-player[data-slot="${tw}"][value="${K[2]}"]`).checked = false;   // ein Torhueter bleibt im Feld
    const sel = document.getElementById(`tp-ind-player-${ind}`); sel.value = K[5]; tpIndPlayerChange(ind);
    tpSetCoach("tp-form-1-1", T[2]);                                       // Feld 2 von Hand an Trainer 3
    let toastText = ""; const alt = window.toast; window.toast = (t, art) => { toastText = t + "|" + (art || ""); }; await tpPlanSave(true); window.toast = alt;
    return { felder1: document.querySelectorAll('.tp-form-sel[id^="tp-form-1-"]').length, toastText, twIdx: tw, indIdx: ind };
  }, K);
  await a.schliessen();
  const post = DB[TERMIN];
  const twSlot = post && post.slots.find(x => x.typ === "tw"), indSlot = post && post.slots.find(x => x.typ === "individual"), h1 = post && post.slots[1];
  if (!post) probleme.push("nichts gespeichert");
  else {
    if (!twSlot || twSlot.trainer !== "T3") { /* Name kommt aus TRAINER, unten geprueft */ }
    if (!twSlot || !Array.isArray(twSlot.tw) || !twSlot.tw.every(x => typeof x === "number") || twSlot.tw.length !== 2) probleme.push("Torwart-Haken nicht als IDs gespeichert: " + JSON.stringify(twSlot && twSlot.tw));
    if (!indSlot || typeof indSlot.kind !== "number" || indSlot.kind !== 6) probleme.push("Einzeltrainings-Kind nicht als ID gespeichert: " + JSON.stringify(indSlot && indSlot.kind));
    if (!h1 || !Array.isArray(h1.coaches) || !h1.coaches[1]) probleme.push("Feld-Trainer nicht gespeichert: " + JSON.stringify(h1 && h1.coaches));
    if (JSON.stringify(post).includes("Kind ")) probleme.push("ein Kindername steht in der Sicherung");
  }
  if (planA.felder1 !== 3) probleme.push(`Geraet A: ${planA.felder1} Felder statt 3`);
  if (!/gespeichert ✓/.test(planA.toastText)) probleme.push("Knopf meldet sich nicht: „" + planA.toastText + "“");
  // Geraet B laedt
  const b = await geraet();
  const planB = await b.page.evaluate(async ({ K, twIdx, indIdx }) => {
    await tpPlanRestore();
    const T = TRAINER.slice(0, 4);
    return { felder1: document.querySelectorAll('.tp-form-sel[id^="tp-form-1-"]').length,
      twTrainer: tpCoaches[`tp-form-${twIdx}-0`] === T[3], feld2: tpCoaches["tp-form-1-1"] === T[2],
      twHaken: [...document.querySelectorAll(`.tp-tw-player[data-slot="${twIdx}"]`)].map(c => c.value + ":" + c.checked),
      kind: document.getElementById(`tp-ind-player-${indIdx}`)?.value, hinweis: (document.querySelector(".tp-parallel-hinweis") || {}).textContent || "" };
  }, { K, twIdx: planA.twIdx, indIdx: planA.indIdx });
  const fehler = b.fehler(); await b.schliessen();
  if (planB.felder1 !== 3) probleme.push(`Geraet B: ${planB.felder1} Felder statt 3 – Zuordnung nicht zurueck`);
  if (!planB.twTrainer) probleme.push("Trainer am Torwart-Block nicht wiederhergestellt");
  if (!planB.feld2) probleme.push("Feld-Trainer nicht wiederhergestellt");
  if (JSON.stringify(planB.twHaken) !== JSON.stringify([`${K[0]}:true`, `${K[1]}:true`, `${K[2]}:false`])) probleme.push("Torwart-Haken: " + JSON.stringify(planB.twHaken));
  if (planB.kind !== K[5]) probleme.push("Einzeltrainings-Kind: " + planB.kind);
  if (!/3 Felder statt 4/.test(planB.hinweis)) probleme.push("Hinweis nach dem Laden: „" + planB.hinweis + "“");
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`A: ${planA.felder1} Felder, „${planA.toastText.split("|")[0]}“ · gespeichert tw=${JSON.stringify(twSlot && twSlot.tw)} kind=${indSlot && indSlot.kind} coaches=${JSON.stringify(h1 && h1.coaches)} · B: ${planB.felder1} Felder, Haken ${planB.twHaken.filter(x => /true/.test(x)).length}/3, Kind ${planB.kind}`);
  return h.ergebnis("Trainingsplan: Zuordnung (Feld-Trainer, Block-Trainer, Torwart-Haken, Einzel-Kind) kommt auf dem anderen Geraet an", !probleme.length, zeilen.concat(probleme));
};
