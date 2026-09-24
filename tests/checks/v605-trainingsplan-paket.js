/* v605 · Trainingsplan: Anwesenheit, Zählung, Aufwärm-Plus, Verschieben, Durchgänge

   PO am 24.09., mit Bildschirmfotos vom Plan für Fr 25.09.:
   „Die Anwesenheit wird nicht in die Trainingsgruppen übernommen – ein Kind ist abgewählt,
   steht aber in den Gruppen. Und ‚Kinder erwartet' ist wenig zielführend, wichtiger wäre,
   wie viele zugesagt haben bzw. in der Anwesenheit stehen." Dazu: ein Plus im Aufwärmen,
   Phasen per Drag and Drop an die richtige Stelle, und Stationen, durch die die Gruppen
   rotieren, ohne für jeden Wechsel einen neuen Hauptteil anzulegen.

   a) Eine VORAB gespeicherte Anwesenheit gilt für die Gruppen: wer abgewählt ist, fliegt
      raus – bis v604 zählte sie erst am Tag selbst. Eine spätere Absage schlägt die Liste.
   b) Der Chip zeigt „N dabei · M fehlen“ aus derselben Quelle wie die Gruppen, ohne Schätzung.
   c) „＋ Übung im Aufwärmen“ legt ein zweites Feld an, das mit dem Plan gespeichert wird.
   d) Verschieben (Pfeiltaste und Ziehen am Griff): die gewählten Übungen, die Trainer je
      Feld und ein paralleler Block wandern mit ihrem Block.
   e) Löschen eines Blocks lässt die Übungen der Blöcke dahinter, wo sie waren.
   f) Durchgänge: EIN Block, die Gruppen wechseln innerhalb; der Trainingsstart bekommt je
      Durchgang eine Station mit der weitergerückten Einteilung; der nächste Hauptteil rückt
      um die Zahl der Durchgänge weiter. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const K = h.KINDER;
  const kuenftig = h.tagePlus(2);

  const s = await h.starten({ hoehe: 2400, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  await h.sichtbarMachen(s.page, "#tp-timeline");

  const r = await s.page.evaluate(async ({ K, kuenftig }) => {
    const out = { fehlt: [] };
    for (const n of ["tpSlotsNeuOrdnen", "tpSlotVerschieben", "tpWarmPlus", "tpDurchgaengeSetzen", "tpZiehStart"]) if (typeof window[n] !== "function") out.fehlt.push(n);
    await loadKader();
    const T = TRAINER.slice(0, 2);
    let box = document.getElementById("tp-trainer-checks"); if (!box) { box = document.createElement("div"); box.id = "tp-trainer-checks"; document.body.appendChild(box); }
    TP_RSVP = {}; T.forEach(t => TP_RSVP[t] = "ja"); TP_TRAINER_MANUELL = {}; tpTrainerChipsRender();
    const feld = document.getElementById("tp-date");
    if (feld && ![...feld.options].some(o => o.value === kuenftig)) feld.add(new Option(kuenftig, kuenftig));
    if (feld) feld.value = kuenftig;
    const aktiv = KADER.filter(k => k.aktiv !== false).map(k => k.name);
    const bau = () => ({ gruppen: [
      { emo: "🔵", name: "Blaue Haie", farbe: "#2563eb", trainer: T[0], kinder: aktiv.filter((_, i) => i % 2 === 0) },
      { emo: "🔴", name: "Rote Füchse", farbe: "#dc2626", trainer: T[1], kinder: aktiv.filter((_, i) => i % 2 === 1) }
    ], ausAnwesenheit: false, quelle: "kader" });

    // ── a) vorab gespeicherte Anwesenheit ────────────────────────────────────
    const weg = aktiv[2], spaeter = aktiv[3];
    const tag = { _trainers: [] }; aktiv.forEach(n => { tag[n] = { da: n !== weg, qual: 0 }; });
    window.AW_DATA = {}; AW_DATA[kuenftig] = tag;
    TP_KIND_RSVP = null; TP_KIND_ABSAGE = [];
    _tgCache = { datum: kuenftig, geladen: true, tg: bau() };
    out.a = { quelle: _tgPool().quelle, n: _tgPool().namen.length, aktiv: aktiv.length };
    tgAnwesenheitAbgleich();
    out.a.wegDrin = tgFor().gruppen.some(g => g.kinder.includes(weg));
    TP_KIND_ABSAGE = [spaeter];
    tgAnwesenheitAbgleich();
    out.a.spaeterDrin = tgFor().gruppen.some(g => g.kinder.includes(spaeter));
    out.a.summe = tgFor().gruppen.reduce((x, g) => x + g.kinder.length, 0);

    // ── b) Chip ──────────────────────────────────────────────────────────────
    tpSlots.length = 0; tpCoaches = {};
    tpSlots.push({ label: "Ankommen & Aufwärmen", dauer: 10, farbe: "#059669", typ: "warmup" });
    tpSlots.push({ label: "Hauptteil 1", dauer: 20, farbe: "#1a56db", typ: "main" });
    tpSlots.push({ label: "Hauptteil 2", dauer: 20, farbe: "#7c3aed", typ: "main" });
    tpSlots.push({ label: "Abschlussspiel", dauer: 20, farbe: "#c2410c", typ: "abschluss" });
    tpRenderTimeline();
    await tpPrognoseLoad();
    out.b = (document.getElementById("tp-prognose")?.textContent || "").replace(/\s+/g, " ").trim();

    // ── c) Aufwärm-Plus ──────────────────────────────────────────────────────
    if (out.fehlt.length) return out;
    const plus = [...document.querySelectorAll("#tp-timeline .tp-plus")].find(b => /Aufwärmen/.test(b.textContent));
    out.c = { plus: !!plus, plusHoehe: plus ? plus.getBoundingClientRect().height : 0 };
    if (plus) plus.click();
    const w1 = document.getElementById("tp-form-0-1");
    out.c.zweitesFeld = !!w1;
    if (w1) { w1.value = w1.options[2].value; tpOnSelectChange(w1); }
    out.c.wert = w1 ? w1.value : null;
    tpRenderTimeline();
    out.c.nachNeuzeichnen = document.getElementById("tp-form-0-1")?.value || null;
    out.c.gespeichert = (tpSlotsMitZuordnung()[0] || {}).folge;
    out.c.eintraege = tpPlanEntries().filter(e => e.slotLabel === "Ankommen & Aufwärmen").length;

    // ── d) Verschieben ───────────────────────────────────────────────────────
    const setze = (id, i) => { const el = document.getElementById(id); if (el) { el.value = el.options[i].value; tpOnSelectChange(el); } return el ? el.value : null; };
    const x = setze("tp-form-1-0", 3), y = setze("tp-form-2-0", 4);
    tpCoaches["tp-form-2-0"] = T[1];
    tpSlots.push({ label: "Individual", dauer: 20, farbe: "#0e7490", typ: "individual", parallelZu: 2 });
    tpRenderTimeline();
    // Pfeiltaste: Hauptteil 2 eins nach oben
    const griffH2 = document.querySelector('.tp-slot[data-si="2"] .tp-griff');
    out.d = { griff: !!griffH2, griffGroesse: griffH2 ? Math.round(Math.min(griffH2.getBoundingClientRect().width, griffH2.getBoundingClientRect().height)) : 0 };
    if (griffH2) griffH2.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    out.d.reihe = tpSlots.map(s => s.label);
    out.d.h2Wert = document.getElementById("tp-form-1-0")?.value;
    out.d.h1Wert = document.getElementById(`tp-form-${tpSlots.findIndex(s => s.label === "Hauptteil 1")}-0`)?.value;   // der parallele Block steht jetzt hinter Hauptteil 2
    out.d.x = x; out.d.y = y;
    out.d.coach = tpCoaches["tp-form-1-0"];
    out.d.parallel = tpSlots[tpSlots.findIndex(s => s.typ === "individual")].parallelZu;
    out.d.h2Index = tpSlots.findIndex(s => s.label === "Hauptteil 2");
    out.d.warmNoch = document.getElementById("tp-form-0-1")?.value || null;
    return out;
  }, { K, kuenftig });

  const alt = r.fehlt.length > 0;
  if (alt) probleme.push(r.fehlt.join(", ") + " fehlt – c), d) und f) nicht prüfbar");

  // a)
  if (r.a.quelle !== "anwesenheit") probleme.push(`a) vorab gespeicherte Anwesenheit wird nicht benutzt (Quelle „${r.a.quelle}“)`);
  if (r.a.wegDrin) probleme.push("a) das abgewählte Kind steht weiter in einer Gruppe");
  if (r.a.spaeterDrin) probleme.push("a) eine spätere Absage schlägt die gespeicherte Liste nicht");
  if (r.a.summe !== r.a.aktiv - 2) probleme.push(`a) ${r.a.summe} Kinder in den Gruppen statt ${r.a.aktiv - 2}`);
  zeilen.push(`a) Anwesenheit für einen künftigen Termin: Quelle ${r.a.quelle}, abgewähltes Kind raus, spätere Absage raus → ${r.a.summe} von ${r.a.aktiv}`);
  // b)
  const soll = `${r.a.aktiv - 2} dabei · 2 fehlen`;
  if (!r.b.includes(soll)) probleme.push(`b) Chip „${r.b}“ – erwartet „${soll}“`);
  if (/erwartet|Trainingsquote|~/.test(r.b)) probleme.push(`b) der Chip schätzt noch: „${r.b}“`);
  zeilen.push(`b) Chip: „${r.b}“`);
  if (!alt) {
  // c)
  if (!r.c.plus) probleme.push("c) kein „＋ Übung im Aufwärmen“");
  if (r.c.plus && r.c.plusHoehe < 44) probleme.push(`c) Plus-Knopf nur ${r.c.plusHoehe}px hoch`);
  if (!r.c.zweitesFeld) probleme.push("c) das Plus legt kein zweites Übungsfeld an");
  if (r.c.nachNeuzeichnen !== r.c.wert) probleme.push("c) die zweite Aufwärm-Übung geht beim Neuzeichnen verloren");
  if (r.c.gespeichert !== 2) probleme.push(`c) die Zahl der Aufwärm-Übungen wird nicht mitgespeichert (${r.c.gespeichert})`);
  if (r.c.eintraege !== 1) probleme.push(`c) ${r.c.eintraege} Plan-Einträge im Aufwärmen statt 1 (nur das zweite Feld ist belegt)`);
  zeilen.push(`c) Aufwärmen: Plus → zweites Feld, Auswahl bleibt, gespeichert folge=${r.c.gespeichert}`);
  // d)
  if (!r.d.griff) probleme.push("d) kein Griff zum Verschieben am Hauptteil");
  if (r.d.griff && r.d.griffGroesse < 44) probleme.push(`d) Griff nur ${r.d.griffGroesse}px`);
  if (r.d.reihe[1] !== "Hauptteil 2") probleme.push("d) Pfeiltaste verschiebt nicht: " + r.d.reihe.join(" | "));
  if (r.d.h2Wert !== r.d.y || r.d.h1Wert !== r.d.x) probleme.push(`d) die Übungen wandern nicht mit ihrem Block (H2 ${r.d.h2Wert}≠${r.d.y} oder H1 ${r.d.h1Wert}≠${r.d.x})`);
  if (!r.d.coach) probleme.push("d) der Trainer am Feld bleibt am alten Index stehen");
  if (r.d.parallel !== r.d.h2Index) probleme.push(`d) der parallele Block hängt an ${r.d.parallel} statt an Hauptteil 2 (${r.d.h2Index})`);
  if (r.d.warmNoch !== r.c.wert) probleme.push("d) die Aufwärm-Übung ging beim Verschieben verloren");
  zeilen.push(`d) Pfeiltaste: ${r.d.reihe.join(" → ")} · Übungen, Trainer und paralleler Block wandern mit`);

  // d2) echtes Ziehen mit dem Zeiger: Abschlussspiel ganz nach oben
  {
    await s.page.evaluate(() => document.querySelector('.tp-slot[data-si="0"]').scrollIntoView({ block: "start" }));
    const ziel = await s.page.evaluate(() => { const g = [...document.querySelectorAll('#tp-timeline .tp-slot[data-kette="1"]')]; const ab = g.find(x => /Abschluss/.test(x.textContent)); const gr = ab.querySelector(".tp-griff").getBoundingClientRect(); const erst = g[0].getBoundingClientRect(); return { gx: gr.x + gr.width / 2, gy: gr.y + gr.height / 2, zy: erst.y + 5 }; });
    await s.page.mouse.move(ziel.gx, ziel.gy);
    await s.page.mouse.down();
    for (let i = 1; i <= 12; i++) await s.page.mouse.move(ziel.gx, ziel.gy + (ziel.zy - ziel.gy) * i / 12);
    await s.page.mouse.up();
    await s.page.waitForTimeout(150);
    const reihe = await s.page.evaluate(() => tpSlots.map(x => x.label));
    if (reihe[0] !== "Abschlussspiel") probleme.push("d) Ziehen am Griff verschiebt nicht: " + reihe.join(" | "));
    zeilen.push(`d) Ziehen am Griff: ${reihe.join(" → ")}`);
  }
  }

  // e) + f)
  const r2 = await s.page.evaluate(() => {
    const out = {};
    tpSlots.length = 0; tpCoaches = {};
    tpSlots.push({ label: "Hauptteil 1", dauer: 20, farbe: "#1a56db", typ: "main" });
    tpSlots.push({ label: "Hauptteil 2", dauer: 20, farbe: "#7c3aed", typ: "main" });
    tpSlots.push({ label: "Hauptteil 3", dauer: 20, farbe: "#7c3aed", typ: "main" });
    tpRenderTimeline();
    const a = document.getElementById("tp-form-2-0"); a.value = a.options[5].value; tpOnSelectChange(a);
    out.vorher = a.value;
    tpRemoveSlot(0);
    out.nachher = document.getElementById("tp-form-1-0")?.value;
    out.labels = tpSlots.map(s => s.label);
    if (typeof tpDurchgaengeSetzen !== "function") return out;
    // f) Durchgänge
    tpSlots.length = 0; tpCoaches = {};
    tpSlots.push({ label: "Stationen", dauer: 30, farbe: "#1a56db", typ: "main" });
    tpSlots.push({ label: "Hauptteil danach", dauer: 20, farbe: "#7c3aed", typ: "main" });
    tpRenderTimeline();
    const s0 = document.getElementById("tp-form-0-0"), s1 = document.getElementById("tp-form-0-1");
    s0.value = s0.options[3].value; s1.value = s1.options[4].value;
    tpDurchgaengeSetzen(0, 2);
    const box = document.querySelector("#tp-timeline .tp-durchgaenge");
    out.tabelle = box ? box.textContent.replace(/\s+/g, " ").trim() : "";
    out.zeilen = box ? box.querySelectorAll("b").length : 0;
    out.station = document.querySelector('.tp-slot[data-si="0"] .tp-station-titel')?.textContent.replace(/\s+/g, " ").trim();
    const snap = _tlSnapshot();
    out.snap = snap.map(st => ({ label: st.label, dauer: st.dauer, feld1: st.gruppen[0] && st.gruppen[0].gruppe, uebung1: st.gruppen[0] && st.gruppen[0].uebung }));
    out.versatzDanach = tpVersatz(1);
    out.gesamt = document.querySelector("#tp-timeline").textContent.match(/Gesamt: (\d+)/)?.[1];
    return out;
  });
  if (r2.nachher !== r2.vorher) probleme.push(`e) nach dem Löschen von Hauptteil 1 trägt Hauptteil 3 nicht mehr seine Übung (${r2.nachher} statt ${r2.vorher})`);
  zeilen.push(`e) Löschen: ${r2.labels.join(" → ")} · Hauptteil 3 behält seine Übung`);
  if (!alt) {
  if (r2.zeilen !== 2) probleme.push(`f) ${r2.zeilen} Durchgänge in der Tabelle statt 2: „${r2.tabelle}“`);
  const [d1, d2] = r2.snap;
  if (!d1 || !d2 || !/Durchgang 1\/2/.test(d1.label) || !/Durchgang 2\/2/.test(d2.label)) probleme.push("f) der Trainingsstart kennt die Durchgänge nicht: " + JSON.stringify(r2.snap.map(x => x.label)));
  else {
    if (d1.dauer + d2.dauer !== 30) probleme.push(`f) Durchgänge dauern ${d1.dauer}+${d2.dauer} statt zusammen 30`);
    if (d1.feld1 === d2.feld1) probleme.push(`f) an Station 1 steht in beiden Durchgängen dieselbe Gruppe (${d1.feld1})`);
    if (d1.uebung1 !== d2.uebung1) probleme.push("f) die Übung an Station 1 wechselt – sie soll am Feld bleiben");
  }
  if (r2.versatzDanach !== 2) probleme.push(`f) der Hauptteil danach rückt um ${r2.versatzDanach} statt um 2 weiter`);
  if (r2.gesamt !== "50") probleme.push(`f) Gesamtzeit ${r2.gesamt} statt 50 – Durchgänge dürfen die Zeit nicht vervielfachen`);
  if (!/→/.test(r2.station || "")) probleme.push(`f) die Station nennt die Reihenfolge der Gruppen nicht: „${r2.station}“`);
  }
  if (!alt) zeilen.push(`f) Durchgänge: ${r2.snap.slice(0, 2).map(x => `${x.label} ${x.dauer}′ ${x.feld1}`).join(" | ")} · Station: „${r2.station}“ · danach Versatz ${r2.versatzDanach}`);

  const f = s.fehler(); if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  await s.schliessen();
  return h.ergebnis("v605 Trainingsplan: Anwesenheit, Zählung, Aufwärm-Plus, Verschieben, Durchgänge", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
