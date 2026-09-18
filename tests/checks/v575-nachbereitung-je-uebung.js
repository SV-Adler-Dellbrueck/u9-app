/* v575 – Eine Karte je Übung, nicht je Durchgang.

   PO am 18.09., mit Bildschirmfoto der Nachbereitung: „Eine Übung wird 2× aufgeführt.
   Wahrscheinlich 1× als Hauptteil bzw. Übersicht über alle Einheiten. Macht aber im Tagebuch
   wenig Sinn.“ Keine der Karten war eine Übersicht: „Einheit bewerten“ listete jeden
   PLAN-EINTRAG, und eine Einheit wie L4-8 setzt dieselben drei Übungen in allen drei
   Hauptteilen ein – neun Karten für drei Übungen.

   Falsch war es obendrein: Gespeichert wurden drei Bewertungen derselben Übung (Ø-Sterne und
   Trainer-Statistik zählten dreifach, der Kommentar erschien dreimal im Plan), und beim
   erneuten Öffnen zog die Wiederherstellung für alle drei Karten denselben ersten Treffer.

   Fälle:
   a) Die Rechnung: neun Plan-Einträge aus drei Übungen × drei Blöcken werden drei; die Blöcke
      stehen gesammelt daneben; zwei Trainer an derselben Übung bleiben getrennt.
   b) Die Blocknamen werden auf das gekürzt, was sie unterscheidet („Hauptteil 1 – drei
      Stationen, 3 Min frei, dann eng: …“ → „Hauptteil 1“).
   c) Am DOM: drei Karten statt neun, mit „Hauptteil 1 · Hauptteil 2 · Hauptteil 3“ und dem
      Zusatz „3× im Plan“.
   d) Gespeichert werden drei Bewertungen, nicht neun. */
const A = "2 gegen 1 plus Torwart – der Flitzer macht es breit";
const B = "FUNiño 3 gegen 1 – der Mittlere hat den Ball";
const C = "FUNiño 3 gegen 2 mit Wandspieler – links, Mitte, rechts";
const L1 = "Hauptteil 1 – drei Stationen, 3 Min frei, dann eng: Feld 1 am Jugendtor: 2 gegen 1 plus Torwart | Feld 2 an den Minitoren: 3 gegen 1 | Feld 3 an vier Hütchentoren: 3 gegen 2 mit Wandspieler";
const L2 = "Hauptteil 2 – Gruppen rücken ein Feld weiter, Regeln wie in Hauptteil 1";
const L3 = "Hauptteil 3 – Gruppen rücken noch ein Feld weiter";

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const gestern = h.tagePlus(-1);
  /* Neun Einträge wie bei L4-8: drei Übungen, dreimal gespielt. */
  const plan = [];
  [L1, L2, L3].forEach((label, b) => {
    [A, B, C].forEach((name, f) => {
      plan.push({ formIdx: 100 + f, formName: name, trainer: "Alle", slotLabel: label, station: f, key: `${100 + f}-${f}` });
    });
  });

  const s = await h.starten({
    hoehe: 2400,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(),
      profiles: [{ name: "Charles", rolle: "trainer" }],
      anwesenheit: [],
      einheit_bewertung: [],
      trainingsplan: [{ datum: gestern, plan, kopf: { schwerpunkt: "Ball zum Freien" } }],
      termine: [{ id: 7, datum: gestern, typ: "training", zeit: "17:00" }],
      trainings_eval: []
    })
  });

  const r = await s.page.evaluate(async ({ gestern, A, B, C, L1, L2, L3 }) => {
    window.trainerMe = async () => "Charles";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    const out = { fehlt: [] };
    for (const n of ["einheitPlanBuendeln", "einheitBlockNamen", "einheitDetailOpen"]) if (typeof window[n] !== "function") out.fehlt.push(n);
    if (out.fehlt.length) return out;
    await loadKader();

    // a) die Rechnung
    const roh = [];
    [L1, L2, L3].forEach(label => { [A, B, C].forEach((name, f) => { roh.push({ formIdx: 100 + f, formName: name, trainer: "Alle", slotLabel: label }); }); });
    const geb = einheitPlanBuendeln(roh);
    out.anzahl = geb.length;
    out.namen = geb.map(p => p.formName);
    out.labels = geb[0] ? geb[0]._labels.length : 0;
    /* Zwei Trainer an derselben Übung bleiben getrennt – jeder urteilt über seinen Durchgang. */
    const zwei = einheitPlanBuendeln([
      { formIdx: 1, formName: A, trainer: "Charles", slotLabel: L1 },
      { formIdx: 1, formName: A, trainer: "Finn", slotLabel: L1 },
      { formIdx: 1, formName: A, trainer: "Charles", slotLabel: L2 }
    ]);
    out.zweiTrainer = zwei.length;
    out.zweiLabels = zwei.map(p => p._labels.length);

    // b) Blocknamen
    out.kurz = einheitBlockNamen(geb[0]);
    out.kurzOhneStrich = einheitBlockNamen({ slotLabel: "Abschlussturnier", _labels: ["Abschlussturnier"] });

    // c) am DOM
    await einheitBewertenOpen();
    await einheitDetailOpen(gestern);
    for (let i = 0; i < 40 && !document.getElementById("eb-ue-0"); i++) await new Promise(r => setTimeout(r, 50));
    const karten = [...document.querySelectorAll('[id^="eb-ue-"]')].filter(x => /^eb-ue-\d+$/.test(x.id));
    out.karten = karten.length;
    out.kartenText = karten.map(x => x.textContent.replace(/\s+/g, " ").trim().slice(0, 120));

    // d) speichern
    out.gespeichert = null;
    karten.forEach((x, i) => { const el = document.getElementById(`eb-ue-notiz-${i}`); if (el) el.value = "Notiz " + i; });
    await einheitSave();
    out.gespeichert = ((typeof EVAL_DATA !== "undefined" && EVAL_DATA[gestern]) || []).map(e => ({ name: e.name, notiz: e.notiz }));
    return out;
  }, { gestern, A, B, C, L1, L2, L3 });

  const fehler = s.fehler();
  await s.schliessen();
  if (r.fehlt.length) return h.ergebnis("Nachbereitung: eine Karte je Übung", false, [r.fehlt.join(", ") + " fehlt"]);

  // a)
  if (r.anzahl !== 3) probleme.push(`Neun Plan-Einträge werden zu ${r.anzahl} Karten statt zu dreien`);
  if (new Set(r.namen).size !== 3) probleme.push(`Die gebündelten Karten nennen ${new Set(r.namen).size} verschiedene Übungen statt drei`);
  if (r.labels !== 3) probleme.push(`Die erste Karte sammelt ${r.labels} Blöcke statt drei`);
  if (r.zweiTrainer !== 2) probleme.push(`Zwei Trainer an derselben Übung ergeben ${r.zweiTrainer} Karten statt zwei – jeder urteilt über seinen Durchgang`);
  if (String(r.zweiLabels.slice().sort()) !== "1,2") probleme.push(`Die Blöcke der beiden Trainer verteilen sich als ${JSON.stringify(r.zweiLabels)} statt [2,1]`);
  // b)
  if (String(r.kurz) !== "Hauptteil 1,Hauptteil 2,Hauptteil 3") probleme.push(`Blocknamen kommen als ${JSON.stringify(r.kurz)} statt „Hauptteil 1/2/3“`);
  if (String(r.kurzOhneStrich) !== "Abschlussturnier") probleme.push(`Ein Label ohne Gedankenstrich wird verstümmelt: ${JSON.stringify(r.kurzOhneStrich)}`);
  // c)
  if (r.karten !== 3) probleme.push(`Die Nachbereitung zeigt ${r.karten} Karten statt drei`);
  else {
    if (!/Hauptteil 1 · Hauptteil 2 · Hauptteil 3/.test(r.kartenText[0] || "")) probleme.push(`Die Karte nennt die Blöcke nicht: „${(r.kartenText[0] || "").slice(0, 90)}“`);
    if (!/3× im Plan/.test(r.kartenText[0] || "")) probleme.push(`Die Karte sagt nicht, wie oft die Übung lief: „${(r.kartenText[0] || "").slice(0, 90)}“`);
  }
  // d)
  if (!r.gespeichert || r.gespeichert.length !== 3) probleme.push(`Gespeichert werden ${r.gespeichert ? r.gespeichert.length : 0} Bewertungen statt drei`);
  else if (new Set(r.gespeichert.map(e => e.name)).size !== 3) probleme.push(`Es landen mehrere Bewertungen derselben Übung in der Auswertung: ${JSON.stringify(r.gespeichert.map(e => e.name))}`);
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);

  if (!probleme.length) {
    zeilen.push(`Neun Plan-Einträge → drei Karten, je drei Blöcke gesammelt · zwei Trainer an einer Übung bleiben getrennt (${r.zweiLabels.join("+")})`);
    zeilen.push(`Blocknamen: ${r.kurz.join(" · ")} · ein Label ohne Gedankenstrich bleibt ganz`);
    zeilen.push(`Am Bildschirm ${r.karten} Karten · gespeichert ${r.gespeichert.length} Bewertungen, jede Übung einmal`);
  }
  return h.ergebnis("Nachbereitung: eine Karte je Übung", !probleme.length, zeilen.concat(probleme));
};
