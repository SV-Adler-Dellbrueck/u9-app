/* v535 – Paket A aus doku/auftrag-stationen: Übernehmen füllt ALLE Felder.

   Am 13.09. wurde L4-1 auf den Termin am 18.09. übernommen. Die Übung der Vorlage landete
   in jeder Stufe nur bei der ERSTEN Gruppe; die übrigen Felder blieben auf
   „— Übung wählen —". Eine Vorlage beschreibt den Block, nicht die Station: wie viele
   Felder es gibt, entscheidet sich erst am Termin aus der Zahl der Feldtrainer.

   Geprüft werden die drei Abnahmekriterien des Pakets:
   1) Zwei Felder → beide tragen in jeder Stufe dieselbe Übung.
   2) Drei Felder → alle drei.
   3) Ein von Hand geändertes Feld bleibt geändert (die Marke wird beim Speichern
      verbraucht, ab dann gilt die Hand des Trainers).

   Dazu die Falle, die beim Bauen auffiel:
   4) Zwei Blöcke mit demselben Label dürfen sich nicht überlaufen – die Übung des einen
      darf nicht in den anderen rutschen. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const datum = h.tagePlus(5);

  async function lauf(trainerZahl, gleicheLabel) {
    // Der Plan, den „Vorlage übernehmen" geschrieben hätte: ein Eintrag je Block.
    const bloecke = gleicheLabel
      ? [{ label: "Hauptteil", typ: "spielform", dauer: 11 }, { label: "Hauptteil", typ: "spielform", dauer: 11 }]
      : [{ label: "Stufe 1 – weit", typ: "spielform", dauer: 11 }, { label: "Stufe 2 – eng", typ: "spielform", dauer: 11 }];
    const s = await h.starten({ hoehe: 2400, supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(),
      trainingsplan: (u) => {
        if (/select=slots/.test(u.search)) return [{ slots: bloecke.map(b => ({ label: b.label, dauer: b.dauer, farbe: "#1a56db", typ: b.typ })) }];
        if (/select=plan/.test(u.search)) return [{ plan: bloecke.map((b, i) => ({
          formIdx: i === 0 ? 0 : 1, formName: "x", trainer: "Alle", slotLabel: b.label, alleFelder: true, key: "k" + i
        })) }];
        return [];
      }
    }) });
    await h.sichtbarMachen(s.page, "#tp-timeline");
    const r = await s.page.evaluate(async ({ datum, trainerZahl }) => {
      await loadKader();
      let box = document.getElementById("tp-trainer-checks");
      if (!box) { box = document.createElement("div"); box.id = "tp-trainer-checks"; document.body.appendChild(box); }
      TP_RSVP = {}; TRAINER.slice(0, trainerZahl).forEach(t => TP_RSVP[t] = "ja"); TP_TRAINER_MANUELL = {};
      tpTrainerChipsRender();
      const feld = document.getElementById("tp-date");
      if (feld && ![...feld.options].some(o => o.value === datum)) feld.add(new Option(datum, datum));
      if (feld) feld.value = datum;
      await tpPlanRestore(datum);
      const out = { felderJeBlock: [], werteJeBlock: [] };
      tpSlots.forEach((sl, si) => {
        const sels = [...document.querySelectorAll(`.tp-form-sel[id^="tp-form-${si}-"]`)];
        out.felderJeBlock.push(sels.length);
        out.werteJeBlock.push(sels.map(x => x.value));
      });
      // 3) Ein Feld von Hand ändern und speichern lassen
      const zweites = document.getElementById("tp-form-0-1");
      if (zweites) {
        const andere = [...zweites.options].find(o => o.value && o.value !== zweites.value);
        if (andere) { zweites.value = andere.value; tpOnSelectChange(zweites); out.handWert = andere.value; }
      }
      return out;
    }, { datum, trainerZahl });
    await s.page.waitForTimeout(1500);          // debounce von tpPlanSave abwarten
    const gespeichert = s.gesendet.filter(g => /trainingsplan/.test(g.pfad || "") && g.methode === "POST");
    const fehler = s.fehler();
    await s.schliessen();
    return { ...r, gespeichert, fehler };
  }

  const zwei = await lauf(2, false);
  const drei = await lauf(3, false);
  const doppelt = await lauf(2, true);

  // 1) zwei Felder, beide Stufen
  if (String(zwei.felderJeBlock) !== "2,2") probleme.push(`bei zwei Trainern entstehen Felder [${zwei.felderJeBlock}] (erwartet 2,2)`);
  zwei.werteJeBlock.forEach((w, i) => {
    if (w.some(x => !x)) probleme.push(`Stufe ${i + 1} hat ein leeres Feld: [${w}] – genau der Fehler vom 13.09.`);
    if (new Set(w).size !== 1) probleme.push(`Stufe ${i + 1} trägt verschiedene Übungen [${w}] – die Vorlage nennt eine`);
  });

  // 2) drei Felder
  if (String(drei.felderJeBlock) !== "3,3") probleme.push(`bei drei Trainern entstehen Felder [${drei.felderJeBlock}] (erwartet 3,3)`);
  drei.werteJeBlock.forEach((w, i) => {
    if (w.some(x => !x)) probleme.push(`bei drei Feldern bleibt in Stufe ${i + 1} eines leer: [${w}]`);
  });

  // 3) Handänderung bleibt: der neu gespeicherte Plan trägt die Marke nicht mehr
  const letzter = (zwei.gespeichert || []).slice(-1)[0];
  const eintraege = letzter && letzter.body && letzter.body.plan;
  if (!eintraege) probleme.push("nach der Handänderung wurde kein Plan gespeichert");
  else {
    if (eintraege.some(e => e.alleFelder)) probleme.push("der gespeicherte Plan trägt weiter „alleFelder“ – die Handänderung würde beim nächsten Laden überschrieben");
    if (eintraege.length < 4) probleme.push(`der gespeicherte Plan hat ${eintraege.length} Einträge (erwartet 4 = zwei Blöcke × zwei Felder, Station für Station)`);
  }

  // 4) gleich benannte Blöcke laufen nicht über
  doppelt.werteJeBlock.forEach((w, i) => {
    if (w.some(x => !x)) probleme.push(`bei zwei gleich benannten Blöcken bleibt in Block ${i + 1} ein Feld leer: [${w}]`);
  });
  if (doppelt.werteJeBlock.length === 2 && doppelt.werteJeBlock[0][0] === doppelt.werteJeBlock[1][0])
    probleme.push("zwei gleich benannte Blöcke tragen dieselbe Übung – der erste ist in den zweiten übergelaufen");

  [zwei, drei, doppelt].forEach(x => { if (x.fehler.length) probleme.push(...x.fehler.slice(0, 1)); });

  zeilen.push(`zwei Trainer: Felder [${zwei.felderJeBlock}] · Stufe 1 [${zwei.werteJeBlock[0]}] · Stufe 2 [${zwei.werteJeBlock[1]}]`);
  zeilen.push(`drei Trainer: Felder [${drei.felderJeBlock}] · Stufe 1 [${drei.werteJeBlock[0]}]`);
  zeilen.push(`gleiche Labels: Block 1 [${doppelt.werteJeBlock[0]}] · Block 2 [${doppelt.werteJeBlock[1]}]`);
  zeilen.push(`nach Handänderung gespeichert: ${eintraege ? eintraege.length : 0} Einträge, Marke weg ${eintraege ? !eintraege.some(e => e.alleFelder) : false}`);

  return h.ergebnis("Vorlage übernehmen füllt alle Felder eines Blocks", !probleme.length, zeilen.concat(probleme));
};
