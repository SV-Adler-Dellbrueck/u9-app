/* v548 – Der Plan ist die Wahrheit: Wiederherstellen leert erst, und nichts rutscht
   in eine fremde Phase.

   Befund vom 14.09. (PO, Bildschirmfoto): Vorlage L4-1 übernommen, danach stand in
   „Stufe 1 – frei" beim zweiten Feld nichts, und im Straßenfußball-Fenster stand eine
   Übung, die die Vorlage dort nie nennt.

   Zwei Ursachen, beide hier festgehalten:

   1. `tpRenderTimeline()` merkt sich gewählte Übungen absichtlich über ein Neuzeichnen
      hinweg – beim Ändern einer Dauer ist das richtig. Beim Wiederherstellen war es
      falsch: das Feld trug noch den alten Wert, der Eintrag fand in SEINER Phase kein
      freies Feld mehr und wich aus.
   2. Der Ausweg selbst: „kein freies Feld in der Phase → nimm irgendein freies" setzte
      die Übung in einen Block, für den sie nie gedacht war, und nahm dem Eintrag, der
      dort hingehört, sein Feld weg.

   Fälle:
   a) Vorlage ohne Stationen: JEDES Feld jedes Hauptteils bekommt die Übung (v535).
   b) Zweites Öffnen ändert nichts – kein Wert wandert, keiner verschwindet.
   c) Ein Eintrag, dessen Phase es nicht gibt, wird fallengelassen statt irgendwo gesetzt.
   d) Was im Plan nicht steht, ist nach dem Wiederherstellen leer – auch wenn vorher
      etwas im Feld stand.
   e) Das Leeren allein löst keinen Schreibvorgang aus: sonst schriebe das
      Wiederherstellen den leeren Zwischenstand zurück. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const datum = h.tagePlus(2);

  const BLOECKE = [
    { typ: "warmup", label: "Straßenfußball-Fenster", dauer: 10 },
    { typ: "warmup", label: "Warm up Adler, kurz", dauer: 8, uebung_name: "Warm up Adler" },
    { typ: "main", label: "Stufe 1 – frei", dauer: 11, uebung_name: "4gg2 Ballbesitz" },
    { typ: "main", label: "Stufe 2 – eng", dauer: 11, uebung_name: "4gg2 Ballbesitz" },
    { typ: "abschluss", label: "Abschlussturnier", dauer: 18 }
  ];

  let gespeichert = null, schreibvorgaenge = 0;
  const s = await h.starten({
    hoehe: 3000, supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(),
      /* Zehn Zusagen, damit zwei Felder entstehen und der Fall bei seinem Gegenstand bleibt.
         Bis v576 hatte der Termin keine Rückmeldung: `tgBedarf` rechnete dann mit dem ganzen
         Kader (fünfzehn Kinder → drei Gruppen), und dass hier trotzdem zwei Felder standen,
         lag allein daran, dass ein zweiter `tgSync`-Lauf die dritte Gruppe wieder wegwarf.
         Seit v577 bleibt sie stehen (siehe v577-zusagen-vor-gruppen) – also muss die
         Kinderzahl hier gesagt werden statt geraten. */
      rueckmeldungen: () => h.KINDER.slice(0, 10).map((n, i) => ({ spieler_id: i + 1, status: "zugesagt" })),
      termine: [{ id: 88, datum, typ: "training", uhrzeit: "16:45", uhrzeit_ende: "18:00",
                  trainer_status: { Charles: "ja", Finn: "ja" } }],
      trainingsvorlagen: [],
      /* Beide Übungen kommen sonst aus der Bibliothek; ohne sie bricht das Übernehmen
         mit „Übung gibt es nicht mehr" ab. */
      trainingsformen: [{ id: 9001, name: "Warm up Adler", kat: "aufwaermen", kurz: "x", dauer: "15", custom: true },
                        { id: 9002, name: "4gg2 Ballbesitz", kat: "passspiel", kurz: "x", dauer: "11", custom: true }],
      trainingsplan: (u, req) => {
        if (req.method() === "POST") {
          schreibvorgaenge++;
          try { gespeichert = JSON.parse(req.postData() || "null"); } catch (e) {}
          return { status: 201, body: "[]" };
        }
        if (!gespeichert) return [];
        if (/select=slots/.test(u.search)) return [{ slots: gespeichert.slots || [] }];
        if (/select=plan/.test(u.search)) return [{ plan: gespeichert.plan || [] }];
        if (/select=updated_at/.test(u.search)) return [];
        return [gespeichert];
      }
    })
  });
  await h.sichtbarMachen(s.page, "#tp-timeline");

  const r = await s.page.evaluate(async ({ datum, BLOECKE }) => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const stand = () => [...document.querySelectorAll(".tp-form-sel")].map(x => x.id + "=" + x.value).join(" ");
    await loadKader(); await loadCustomForms();
    window.trainerMe = async () => "Charles";
    VORLAGEN.length = 0;
    VORLAGEN.push({ id: 41, name: "L4-1", leitfrage: "", tags: [], skalierung: {}, bloecke: BLOECKE });
    _vuAuswahl = 41;
    const feld = document.getElementById("tp-date");
    if (feld && ![...feld.options].some(o => o.value === datum)) feld.add(new Option(datum, datum));
    if (feld) feld.value = datum;
    await tpTrainerRsvpLaden(datum);
    const out = { trainer: tpGetCheckedTrainers().slice() };

    // a) Übernehmen
    await vorlageUebernehmenSetzen();
    await warte(600);
    out.nachUebernahme = stand();
    await warte(2200);                       // die Automatik schreibt den DOM-Stand zurück

    // b) Zweites Öffnen
    await tpPlanRestore(datum);
    await warte(700);
    out.nachZweitem = stand();

    // d) Ein Feld von Hand füllen, das der Plan nicht kennt, dann wiederherstellen
    const s0 = document.getElementById("tp-form-0-0");
    if (s0) { s0.value = String(tpAllForms().findIndex(f => f.name === "Warm up Adler")); }
    await tpPlanRestore(datum);
    await warte(700);
    out.nachHandwert = stand();

    return out;
  }, { datum, BLOECKE });

  const felder = t => Object.fromEntries(String(t).split(" ").filter(Boolean).map(x => x.split("=")));
  const a = felder(r.nachUebernahme), b = felder(r.nachZweitem), c = felder(r.nachHandwert);

  if (r.trainer.length !== 2) probleme.push(`${r.trainer.length} Feldtrainer statt 2 – der Fall braucht zwei Felder`);

  // a) Beide Felder je Hauptteil
  const hauptfelder = o => Object.keys(o).filter(k => /^tp-form-(2|3)-/.test(k));
  const leerA = hauptfelder(a).filter(k => !a[k]);
  if (hauptfelder(a).length !== 4) probleme.push(`Nach dem Übernehmen gibt es ${hauptfelder(a).length} Hauptteil-Felder statt 4`);
  else if (leerA.length) probleme.push(`Nach dem Übernehmen leer: ${leerA.join(", ")} – eine Vorlage ohne Stationen gehört auf JEDES Feld`);
  else zeilen.push(`Übernehmen: alle 4 Hauptteil-Felder gesetzt (${r.trainer.join(", ")})`);

  // b) Zweites Öffnen ändert nichts
  if (r.nachZweitem !== r.nachUebernahme) {
    const gewandert = Object.keys(b).filter(k => (a[k] || "") !== (b[k] || ""));
    probleme.push(`Zweites Öffnen verändert den Plan: ${gewandert.map(k => `${k} ${a[k] || "leer"}→${b[k] || "leer"}`).join(", ")}`);
  } else zeilen.push("Zweites Öffnen: Feld für Feld unverändert");

  // d) Der Handwert verschwindet wieder – der Plan kennt ihn nicht
  if (c["tp-form-0-0"]) probleme.push(`Ein Wert, den der Plan nicht enthält, überlebt das Wiederherstellen: tp-form-0-0=${c["tp-form-0-0"]}`);
  else if (String(r.nachHandwert) !== String(r.nachZweitem)) probleme.push("Nach dem Wiederherstellen weicht der Stand ab");
  else zeilen.push("Wiederherstellen leert zuerst: was nicht im Plan steht, steht auch nicht im Feld");

  /* c) + e) Ein Eintrag ohne Phase, und kein Schreibvorgang durchs Leeren.
     Vorher auslaufen lassen: die Füllungen oben rufen tpOnSelectChange und stoßen damit
     die Automatik an (1,2 s). Diese Schreibvorgänge gehören nicht in die Messung –
     gemessen wird, ob das LEEREN schreibt. */
  await s.page.waitForTimeout(1800);
  const vorher = schreibvorgaenge;
  const r2 = await s.page.evaluate(async ({ datum }) => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    /* Ein Plan, dessen erster Eintrag eine Phase nennt, die es nicht gibt. Früher landete
       er auf dem ersten freien Feld – also im Straßenfußball-Fenster. */
    const idx = tpAllForms().findIndex(f => f.name === "Warm up Adler");
    window.tpPlanLoad = async () => ([
      { formIdx: idx, formName: "Warm up Adler", trainer: "Alle", slotLabel: "Gibt es nicht", key: "x" }
    ]);
    await tpPlanRestore(datum);
    await warte(2200);
    return { stand: [...document.querySelectorAll(".tp-form-sel")].map(x => x.id + "=" + x.value).join(" ") };
  }, { datum });

  const d = felder(r2.stand);
  const gesetzt = Object.keys(d).filter(k => d[k]);
  if (gesetzt.length) probleme.push(`Ein Eintrag ohne passende Phase wurde trotzdem gesetzt: ${gesetzt.join(", ")}`);
  else zeilen.push("Eintrag ohne passende Phase: fällt weg, statt in eine fremde zu rutschen");

  if (schreibvorgaenge !== vorher) probleme.push(`Das Wiederherstellen hat ${schreibvorgaenge - vorher}× geschrieben – der leere Zwischenstand darf nie in die Datenbank`);
  else zeilen.push("Wiederherstellen schreibt nicht");

  const f = s.fehler();
  if (f.length) probleme.push("Konsole: " + f[0]);
  await s.schliessen();

  return h.ergebnis("Trainingsplan: Wiederherstellen leert erst, nichts rutscht in eine fremde Phase", !probleme.length, zeilen.concat(probleme));
};
