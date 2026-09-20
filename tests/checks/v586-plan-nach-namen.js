/* v586 – Der Name ist die Wahrheit, der Index nur ein Hinweis.

   Charles am 20.09., nach v585: „Jetzt die Dubletten bereinigen und die Pläne auf formName
   migrieren." Bis v585 merkten sich Trainingsplan (`trainingsplan.plan`) und Nachbereitung
   (`trainings_eval.data`) eine Übung als POSITION in tpAllForms(). Zwei Dinge hingen daran:

   · Keine Zeile durfte aus `trainingsformen` verschwinden – deshalb blieben in v585 die
     24 Dubletten des Abgleichs stehen und wurden nur ausgeblendet.
   · Die Antwortreihenfolge von PostgREST musste an jedem Gerät gleich sein. Ohne `order`
     ist sie das nicht: sie folgt der physischen Lage der Zeilen, und die ändert sich mit
     jedem UPDATE – den der Abgleich seit v585 macht.

   Seit v586 entscheidet der Name (tfIndexVon in boot.js). Gespeichert wird weiter beides;
   der Index gilt nur, solange er auf eine sichtbare Übung mit genau diesem Namen zeigt.
   Die 24 Dubletten sind am 20.09. gelöscht, ein Unique-Index verhindert neue.

   Geprüft wird:
   a) CUSTOM_FORMS kommt nach id sortiert an – auch wenn die Datenbank durcheinander liefert –,
      und die Abfrage sagt das ausdrücklich (`order=id.asc`).
   b) tfIndexVon: falscher Index + Name → Name gewinnt; Index auf versteckter Dublette →
      sichtbare Kopie; unbekannter Name → -1 (statt der Übung, auf die der Index zeigt);
      Eintrag ohne Namen (vor v447) → Index; eingebaute Übung mit verschobenem Index → Name.
   c) Am DOM: tpPlanRestore setzt die Felder nach Namen; ein Eintrag, dessen Übung es nicht
      gibt, lässt sein Feld leer statt eine fremde Übung zu zeigen.
   d) Nachbereitung: zwei Einträge derselben Übung mit verschiedenen Indizes sind EINE Karte;
      ein Kommentar findet seine Übung über den Namen, nicht über den alten Index.
   e) Einsatz-Historie aus den gespeicherten Plänen, nach Namen, nur Termine bis heute –
      und ohne den Speicher `adler_exercise_log`, den seit v474 niemand mehr schrieb.
   f) 409 beim Anlegen (Unique-Index, andere Sitzung war schneller) ist kein Fehler.
   g) Charles: „Wo finde ich die neue Übung? In welcher Kategorie ist die?" – eine
      Bibliotheks-Übung liegt in der Übungsdatenbank in ihrer Kategorie-Kachel (wie im
      Trainingsplan), nicht pauschal unter „Eigene & KI"; eigene Übungen bleiben dort. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const datum = h.tagePlus(3), gestern = h.tagePlus(-1), vor10 = h.tagePlus(-10), morgen = h.tagePlus(1);
  const WARMUP = "Warm up Adler", PASSTOR = "Passtor im Quadrat", ZEBRA = "Zebra-Dribbling", ADLER2 = "Adler 2 – Dribbelstaffel";
  const SLOTS = [
    { label: "Ankommen", dauer: 10, farbe: "#059669", typ: "warmup" },
    { label: "Hauptteil 1", dauer: 20, farbe: "#1a56db", typ: "spielform" },
    { label: "Hauptteil 2", dauer: 20, farbe: "#7c3aed", typ: "spielform" }
  ];
  // Absichtlich NICHT nach id sortiert – so kommt es aus einer Tabelle ohne ORDER BY nach einem UPDATE.
  const FORMEN = [
    { id: 9003, name: ZEBRA, kat: "technik", kurz: "x", dauer: "10", custom: true, tags: "Eigene Übung" },
    { id: 9001, name: WARMUP, kat: "aufwaermen", kurz: "x", dauer: "15", custom: true, tags: "Import" },
    { id: 9005, name: PASSTOR, kat: "passspiel", kurz: "x", dauer: "12", custom: true, tags: "Import" },   // jüngste Kopie: sichtbar
    { id: 9002, name: PASSTOR, kat: "passspiel", kurz: "x", dauer: "12", custom: true, tags: "Import" },   // ältere Kopie: versteckt
    { id: 9004, name: ADLER2, kat: "technik", kurz: "x", dauer: "10", custom: true, tags: "Import" }
  ];
  let plan = null;   // wird im Lauf gesetzt, sobald die Indizes bekannt sind
  const s = await h.starten({
    hoehe: 2400, angemeldet: true,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(),
      profiles: [{ name: "Charles", rolle: "trainer" }],
      trainingsformen: (u, req) => {
        if (req.method() === "POST") return { status: 409, body: JSON.stringify({ code: "23505", message: "duplicate key value violates unique constraint" }) };
        return FORMEN;
      },
      trainingsplan: (u) => {
        if (/select=datum,plan/.test(u.search)) return [     // Einsatz-Historie (v586)
          { datum: gestern, plan: [{ formIdx: 999, formName: WARMUP, trainer: "Alle" }] },
          { datum: vor10, plan: [{ formIdx: 3, formName: ZEBRA, trainer: "Alle" }] },
          { datum: morgen, plan: [{ formIdx: 4, formName: ADLER2, trainer: "Alle" }] }   // Zukunft: zählt nicht
        ];
        if (/select=slots/.test(u.search)) return [{ slots: SLOTS }];
        if (/select=plan/.test(u.search)) return plan ? [{ plan }] : [];
        return [];
      }
    })
  });
  await h.sichtbarMachen(s.page, "#tp-timeline");

  const r = await s.page.evaluate(async ({ datum, gestern, vor10, WARMUP, PASSTOR, ZEBRA, ADLER2 }) => {
    const out = { fehlt: [] };
    for (const n of ["tfIndexVon", "tfGleicheUebung", "tpEinsatzLaden", "tpGetExerciseHistory", "tpLastUsedDays", "einheitPlanBuendeln", "tpUebungKommentare", "tpPlanRestore"])
      if (typeof window[n] !== "function") out.fehlt.push(n);
    if (out.fehlt.length) return out;
    const warte = ms => new Promise(r => setTimeout(r, ms));
    await loadKader();

    // a) Sortierung und Abfrage
    const echt = window.fetch; let url = "";
    window.fetch = (u, o) => { if (String(u).includes("/trainingsformen")) url = String(u); return echt(u, o); };
    await loadCustomForms();
    window.fetch = echt;
    out.url = url;
    out.ids = CUSTOM_FORMS.map(f => f.id);
    out.exerciseLogDa = typeof window.tpExerciseLog !== "undefined" || localStorage.getItem("adler_exercise_log") !== null;

    const alle = tpAllForms();
    const idx = (name, id) => alle.findIndex(f => f.name === name && (id == null || f.id === id));
    const iWarm = idx(WARMUP), iZebra = idx(ZEBRA), iAdler2 = idx(ADLER2);
    const iPassAlt = idx(PASSTOR, 9002), iPassNeu = idx(PASSTOR, 9005);
    const i4gg2 = alle.findIndex(f => f.name === "4gg2 Ballbesitz");
    out.idx = { iWarm, iZebra, iAdler2, iPassAlt, iPassNeu, i4gg2, passAltVersteckt: tfDublette(iPassAlt), passNeuVersteckt: tfDublette(iPassNeu) };

    // b) tfIndexVon
    out.b = {
      falscherIndex: tfIndexVon({ formIdx: iZebra, formName: WARMUP }),
      indexWeitWeg: tfIndexVon({ formIdx: 9999, formName: WARMUP }),
      versteckteKopie: tfIndexVon({ formIdx: iPassAlt, formName: PASSTOR }),
      unbekannt: tfIndexVon({ formIdx: iZebra, formName: "Gibt es nicht" }),
      ohneNamen: tfIndexVon({ formIdx: iZebra }),
      eingebautPasst: tfIndexVon({ formIdx: i4gg2, formName: "4gg2 Ballbesitz" }),
      eingebautVerschoben: tfIndexVon({ formIdx: 3, formName: "4gg2 Ballbesitz" }),
      leer: tfIndexVon({})
    };

    // c) Wiederherstellen am DOM – ein Feldtrainer reicht
    let box = document.getElementById("tp-trainer-checks");
    if (!box) { box = document.createElement("div"); box.id = "tp-trainer-checks"; document.body.appendChild(box); }
    TP_RSVP = {}; TRAINER.slice(0, 1).forEach(t => TP_RSVP[t] = "ja"); TP_TRAINER_MANUELL = {};
    tpTrainerChipsRender();
    const feld = document.getElementById("tp-date");
    if (feld && ![...feld.options].some(o => o.value === datum)) feld.add(new Option(datum, datum));
    if (feld) feld.value = datum;
    window.__plan = [
      { formIdx: iZebra, formName: WARMUP, trainer: "Alle", slotLabel: "Ankommen" },              // Index zeigt auf Zebra – der Name sagt Warm up
      { formIdx: iPassAlt, formName: PASSTOR, trainer: "Charles", slotLabel: "Hauptteil 1" },    // Index auf der versteckten Kopie
      { formIdx: iZebra, formName: "Gibt es nicht", trainer: "Charles", slotLabel: "Hauptteil 2" } // Übung weg – Feld bleibt leer
    ];
    window.tpPlanLoad = async () => window.__plan;
    await tpPlanRestore(datum);
    await warte(700);
    out.c = Object.fromEntries([...document.querySelectorAll(".tp-form-sel")].map(x => [x.id, x.value]));

    // d) Nachbereitung
    out.d = {
      karten: einheitPlanBuendeln([
        { formIdx: 5, formName: WARMUP, trainer: "Alle", slotLabel: "A" },
        { formIdx: 77, formName: WARMUP, trainer: "Alle", slotLabel: "B" }
      ]).length,
      gleich: tfGleicheUebung({ formIdx: 5, formName: WARMUP }, { formIdx: 77, name: WARMUP }),
      ungleich: tfGleicheUebung({ formIdx: 5, formName: WARMUP }, { formIdx: 5, name: ZEBRA }),
      ohneNamenGleich: tfGleicheUebung({ formIdx: 5 }, { formIdx: 5, name: ZEBRA })
    };
    Object.keys(EVAL_DATA).forEach(k => delete EVAL_DATA[k]);
    EVAL_DATA[gestern] = [{ formIdx: 999, name: WARMUP, trainer: "Charles", notiz: "Lief gut, mehr Tempo" }];
    out.d.kommWarm = tpUebungKommentare(iWarm).length;
    out.d.kommZebra = tpUebungKommentare(iZebra).length;

    // e) Einsatz-Historie
    _tpEinsatz = null; _tpEinsatzLauf = null;
    await tpEinsatzLaden();
    out.e = {
      warm: tpGetExerciseHistory(iWarm), zebra: tpGetExerciseHistory(iZebra), adler2: tpGetExerciseHistory(iAdler2),
      tageWarm: tpLastUsedDays(iWarm), tageZebra: tpLastUsedDays(iZebra), tageAdler2: tpLastUsedDays(iAdler2),
      html: typeof tpExerciseHistoryHtml === "function" ? tpExerciseHistoryHtml(iWarm).replace(/<[^>]+>/g, "") : ""
    };

    // f) 409 beim Anlegen
    out.f = { einzeln: null, gesamt: null };
    if (typeof _eiUebungAnlegen === "function") out.f.einzeln = await _eiUebungAnlegen({ name: "Neu von anderswo", kat: "technik", ablauf: "x" });
    if (typeof _euAnlegen === "function") out.f.gesamt = await _euAnlegen([{ name: "Neu von anderswo", kat: "technik", ablauf: "x", neu: true }]);
    // g) Kachel in der Übungsdatenbank
    out.g = typeof _tfGruppeVon === "function"
      ? { warm: _tfGruppeVon(alle[iWarm], iWarm), passtor: _tfGruppeVon(alle[iPassNeu], iPassNeu), zebra: _tfGruppeVon(alle[iZebra], iZebra), eingebaut: _tfGruppeVon(alle[i4gg2], i4gg2) }
      : null;
    return out;
  }, { datum, gestern, vor10, WARMUP, PASSTOR, ZEBRA, ADLER2 });

  const fehler = s.fehler();
  await s.schliessen();
  if (r.fehlt.length) return h.ergebnis("Übungen nach Namen", false, [r.fehlt.join(", ") + " fehlt"]);
  const { iWarm, iZebra, iPassAlt, iPassNeu, i4gg2 } = r.idx;

  // a)
  if (!/order=id\.asc/.test(r.url)) probleme.push(`Die Abfrage der Übungen nennt keine Reihenfolge: ${r.url}`);
  if (r.ids.join() !== "9001,9002,9003,9004,9005") probleme.push(`CUSTOM_FORMS nicht nach id sortiert: ${r.ids.join(",")}`);
  if (r.exerciseLogDa) probleme.push("Der alte Speicher adler_exercise_log lebt noch");
  if (!r.idx.passAltVersteckt || r.idx.passNeuVersteckt) probleme.push(`Dubletten-Wache: alt versteckt ${r.idx.passAltVersteckt}, neu versteckt ${r.idx.passNeuVersteckt}`);
  if (!probleme.length) zeilen.push(`a) order=id.asc, CUSTOM_FORMS ${r.ids.join(",")} – sortiert, obwohl die Datenbank 9003,9001,9005,9002,9004 lieferte`);

  // b)
  const b = r.b, soll = { falscherIndex: iWarm, indexWeitWeg: iWarm, versteckteKopie: iPassNeu, unbekannt: -1, ohneNamen: iZebra, eingebautPasst: i4gg2, eingebautVerschoben: i4gg2, leer: -1 };
  Object.keys(soll).forEach(k => { if (b[k] !== soll[k]) probleme.push(`tfIndexVon ${k}: ${b[k]} statt ${soll[k]}`); });
  if (Object.keys(soll).every(k => b[k] === soll[k])) zeilen.push(`b) tfIndexVon: falscher Index → Name (${iWarm}), versteckte Kopie → sichtbare (${iPassAlt}→${iPassNeu}), unbekannt → -1, ohne Namen → Index, eingebaut verschoben → Name`);

  // c)
  const c = r.c;
  if (String(c["tp-form-0-0"]) !== String(iWarm)) probleme.push(`Feld Ankommen: ${c["tp-form-0-0"]} statt ${iWarm} (${WARMUP}) – der Index zeigte auf „${ZEBRA}“`);
  if (String(c["tp-form-1-0"]) !== String(iPassNeu)) probleme.push(`Feld Hauptteil 1: ${c["tp-form-1-0"]} statt ${iPassNeu} (sichtbare Kopie von „${PASSTOR}“)`);
  if (c["tp-form-2-0"]) probleme.push(`Feld Hauptteil 2 zeigt ${c["tp-form-2-0"]} – die Übung „Gibt es nicht“ gibt es nicht, das Feld muss leer bleiben`);
  if (!("tp-form-2-0" in c)) probleme.push("Hauptteil 2 hat kein Auswahlfeld – der Aufbau der Prüfung stimmt nicht");
  if (!probleme.some(p => /Feld|Auswahlfeld/.test(p))) zeilen.push(`c) Wiederherstellen: Ankommen=${c["tp-form-0-0"]} · Hauptteil 1=${c["tp-form-1-0"]} · Hauptteil 2 leer`);

  // d)
  if (r.d.karten !== 1) probleme.push(`Nachbereitung bündelt ${r.d.karten} Karten statt 1 – derselbe Name mit zwei Indizes ist EINE Übung`);
  if (!r.d.gleich || r.d.ungleich || !r.d.ohneNamenGleich) probleme.push(`tfGleicheUebung: gleich ${r.d.gleich}, ungleich ${r.d.ungleich}, ohne Namen ${r.d.ohneNamenGleich}`);
  if (r.d.kommWarm !== 1) probleme.push(`Kommentar mit altem Index 999 zu „${WARMUP}“ nicht gefunden (${r.d.kommWarm})`);
  if (r.d.kommZebra !== 0) probleme.push(`Kommentar landet bei „${ZEBRA}“ (${r.d.kommZebra})`);
  if (r.d.karten === 1 && r.d.kommWarm === 1 && r.d.kommZebra === 0) zeilen.push("d) Nachbereitung: eine Karte je Name, Kommentar über den Namen gefunden");

  // e)
  if (r.e.warm.join() !== gestern) probleme.push(`Historie „${WARMUP}“: ${JSON.stringify(r.e.warm)} statt [${gestern}]`);
  if (r.e.zebra.join() !== vor10) probleme.push(`Historie „${ZEBRA}“: ${JSON.stringify(r.e.zebra)} statt [${vor10}]`);
  if (r.e.adler2.length) probleme.push(`Historie „${ADLER2}“ zählt einen Plan in der Zukunft: ${JSON.stringify(r.e.adler2)}`);
  if (r.e.tageWarm !== 1 || r.e.tageZebra !== 10 || r.e.tageAdler2 !== null) probleme.push(`tpLastUsedDays: ${r.e.tageWarm}/${r.e.tageZebra}/${r.e.tageAdler2} statt 1/10/null`);
  if (!/1× verwendet/.test(r.e.html)) probleme.push(`Historien-Zeile: „${r.e.html}“`);
  if (!probleme.some(p => /Historie|tpLastUsedDays/.test(p))) zeilen.push(`e) Historie aus den Plänen: ${WARMUP} vor 1 T., ${ZEBRA} vor 10 T., Plan von morgen zählt nicht – „${r.e.html}“`);

  // f)
  if (r.f.einzeln !== "da") probleme.push(`409 beim Anlegen: _eiUebungAnlegen liefert ${JSON.stringify(r.f.einzeln)} statt „da“`);
  const g = r.f.gesamt || {};
  if (g.fehler || g.angelegt !== 0 || g.offen !== 0 || g.uebersprungen !== 1) probleme.push(`409 beim Anlegen: _euAnlegen meldet ${JSON.stringify(g)} – erwartet fehler null, angelegt 0, offen 0, uebersprungen 1`);
  if (r.f.einzeln === "da" && !g.fehler && g.uebersprungen === 1) zeilen.push("f) 409 vom Unique-Index: „steht schon“, kein Fehler, der Stand darf gemerkt werden");

  // g)
  const gr = r.g || {};
  if (gr.warm !== "aufwaermen") probleme.push(`Bibliotheks-Übung „${WARMUP}“ (aufwaermen) liegt in Kachel „${gr.warm}“ statt „aufwaermen“`);
  if (gr.passtor !== "passen") probleme.push(`Bibliotheks-Übung „${PASSTOR}“ (passspiel) liegt in Kachel „${gr.passtor}“ statt „passen“`);
  if (gr.zebra !== "custom") probleme.push(`Eigene Übung „${ZEBRA}“ liegt in Kachel „${gr.zebra}“ statt „custom“ (Eigene & KI)`);
  if (gr.eingebaut !== "passen") probleme.push(`Eingebaute „4gg2 Ballbesitz“ liegt in Kachel „${gr.eingebaut}“ statt „passen“`);
  if (gr.warm === "aufwaermen" && gr.passtor === "passen" && gr.zebra === "custom") zeilen.push("g) Übungsdatenbank: Bibliotheks-Übungen in ihrer Kategorie-Kachel, eigene unter „Eigene & KI“");

  if (fehler.length) probleme.push("Konsole: " + fehler[0]);
  return h.ergebnis("Übungen nach Namen: Plan, Nachbereitung, Historie", !probleme.length, zeilen.concat(probleme));
};
