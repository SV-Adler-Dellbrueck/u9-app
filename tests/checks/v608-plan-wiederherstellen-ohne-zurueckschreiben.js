/* v608 · Einen Plan öffnen heißt lesen, nicht schreiben.

   Befund der App-Prüfung vom 24.09.:
   1. `tpPlanRestore` setzt die Übungen über `tpOnSelectChange` ein, und das stieß 1,2 s nach
      JEDEM Öffnen eine automatische Speicherung an. `tpPlanEntries` schrieb dabei weder die
      Stationsmarken der Vorlage mit noch Block und Feld – der Plan auf dem Server wurde bei
      jedem Öffnen stiller vereinfacht.
   2. Die Zuordnung lief nur über den Blocknamen ins jeweils erste freie Feld: Blieb ein Feld
      leer, rutschten die folgenden Übungen eine Gruppe weiter; hießen zwei Blöcke gleich,
      liefen Übungen in den anderen Block.
   3. Wer schnell den Termin wechselte, bekam die Struktur des ersten Termins unter dem
      Datum des zweiten.

   Gemessen:
   a) Öffnen löst keinen Schreibvorgang aus.
   b) Ein späteres Speichern nimmt Block, Feld und Stationsmarke mit.
   c) Zwei gleichnamige Blöcke und ein leeres erstes Feld: jede Übung steht genau dort,
      wo sie gespeichert wurde.
   d) Termin A lädt langsam, der Trainer wechselt auf B: am Ende steht die Struktur von B.
   e) Ändert der Trainer ein Feld von Hand, verliert es die Stationsmarke der Vorlage. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const A = h.tagePlus(2), B = h.tagePlus(4);
  const SLOTS_B = [
    { typ: "spielform", label: "Spielform", dauer: 15, farbe: "#1a56db" },
    { typ: "spielform", label: "Spielform", dauer: 15, farbe: "#1a56db" }
  ];
  const PLAN_B = [
    { formIdx: 0, formName: "Übung Eins", slotLabel: "Spielform", trainer: "Charles", block: 0, feld: 0, station: 1 },
    { formIdx: 0, formName: "Übung Zwei", slotLabel: "Spielform", trainer: "Finn", block: 1, feld: 1 }
  ];
  const SLOTS_A = [{ typ: "warmup", label: "Nur bei A", dauer: 10, farbe: "#059669" }];
  let posts = 0;
  const s = await h.starten({
    hoehe: 2600, supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(),
      rueckmeldungen: () => h.KINDER.slice(0, 10).map((n, i) => ({ spieler_id: i + 1, status: "zugesagt" })),
      termine: [
        { id: 1, datum: A, typ: "training", uhrzeit: "16:45", uhrzeit_ende: "18:00", trainer_status: { Charles: "ja", Finn: "ja" } },
        { id: 2, datum: B, typ: "training", uhrzeit: "16:45", uhrzeit_ende: "18:00", trainer_status: { Charles: "ja", Finn: "ja" } }],
      trainingsformen: [{ id: 9101, name: "Übung Eins", kat: "passspiel", kurz: "x", dauer: "10", custom: true },
                        { id: 9102, name: "Übung Zwei", kat: "passspiel", kurz: "x", dauer: "10", custom: true }],
      trainingsplan: (u, req) => {
        if (req.method() === "POST") { posts++; return { status: 201, body: "[]" }; }
        const d = (u.search.match(/datum=eq\.([0-9-]+)/) || [])[1];
        if (d !== B) return [];
        if (/select=slots/.test(u.search)) return [{ slots: SLOTS_B }];
        if (/select=plan/.test(u.search)) return [{ plan: PLAN_B }];
        if (/select=updated_at/.test(u.search)) return [];
        return [{ datum: B, plan: PLAN_B, slots: SLOTS_B }];
      }
    })
  });
  await h.sichtbarMachen(s.page, "#tp-timeline");
  const r = await s.page.evaluate(async ({ A, B }) => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    await loadKader(); if (typeof loadCustomForms === "function") await loadCustomForms();
    const d = document.getElementById("tp-date");
    [A, B].forEach(x => { if (![...d.options].some(o => o.value === x)) d.add(new Option(x, x)); });
    const idx = n => tpAllForms().findIndex(f => f.name === n);
    const out = { i1: idx("Übung Eins"), i2: idx("Übung Zwei") };

    // a) + c) Termin B öffnen
    d.value = B; await tpTrainerRsvpLaden(B); await tpPlanRestore(B);
    await warte(2200);
    const wert = id => document.getElementById(id)?.value || "";
    out.labels = tpSlots.map(x => x.label);
    out.f00 = wert("tp-form-0-0"); out.f01 = wert("tp-form-0-1");
    out.f10 = wert("tp-form-1-0"); out.f11 = wert("tp-form-1-1");
    return out;
  }, { A, B });
  const postsNachOeffnen = posts;
  const r2 = await s.page.evaluate(async ({ A, B, out }) => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const d = document.getElementById("tp-date");

    // b) was ein Speichern jetzt schreiben würde
    out.eintraege = tpPlanEntries().map(e => ({ n: e.formName, b: e.block, f: e.feld, st: e.station }));

    // e) Hand ändert Feld 0-0
    const f = document.getElementById("tp-form-0-0");
    if (f) { f.value = String(out.i2); tpOnSelectChange(f); }
    out.nachHand = (tpPlanEntries().find(e => e.block === 0 && e.feld === 0) || {}).station;

    // d) Wettlauf: A lädt langsam, dann Wechsel auf B
    const orig = window.tpSlotsLoad;
    window.tpSlotsLoad = async x => { if (x === A) { await warte(700); return [{ typ: "warmup", label: "Nur bei A", dauer: 10, farbe: "#059669" }]; } return orig(x); };
    d.value = A; const pa = tpPlanRestore(A);
    await warte(50);
    d.value = B; const pb = tpPlanRestore(B);
    await Promise.all([pa, pb]); await warte(200);
    window.tpSlotsLoad = orig;
    out.nachWettlauf = tpSlots.map(x => x.label);
    return out;
  }, { A, B, out: r });
  Object.assign(r, r2);
  await s.page.waitForTimeout(1600);
  const f = s.fehler();
  await s.schliessen();

  const i1 = String(r.i1), i2 = String(r.i2);
  // a) – die Hand-Änderung in e) darf und soll speichern; gezählt wird nur bis zum Ende von a)
  if (r.i1 < 0 || r.i2 < 0) probleme.push("Voraussetzung: Übungen nicht geladen");
  if (postsNachOeffnen) probleme.push(`a) Öffnen des Plans löste ${postsNachOeffnen} Schreibvorgang/-vorgänge aus`);
  // c)
  if (r.f00 !== i1) probleme.push(`c) Block 1, Feld 1 trägt ${r.f00} statt „Übung Eins“`);
  if (r.f11 !== i2) probleme.push(`c) Block 2, Feld 2 trägt ${r.f11} statt „Übung Zwei“`);
  if (r.f10) probleme.push("c) im zweiten Block rutschte eine Übung ins leere erste Feld");
  /* Der erste Block trägt eine Stationsmarke (Station 1) und hat zwei Felder: das freie zweite
     Feld wiederholt die Station – so seit v568 gewollt. Genau das muss nach dem Öffnen weiter
     funktionieren; es ging verloren, solange das Öffnen die Marken wegspeicherte. */
  if (r.f01 !== i1) probleme.push(`c) das freie zweite Feld im Stationsblock wiederholt Station 1 nicht (${r.f01})`);
  // b)
  const e1 = r.eintraege.find(e => e.n === "Übung Eins"), e2 = r.eintraege.find(e => e.n === "Übung Zwei");
  if (!e1 || e1.b !== 0 || e1.f !== 0 || e1.st !== 1) probleme.push("b) Speichern verliert Block/Feld/Station von „Übung Eins“: " + JSON.stringify(e1));
  if (!e2 || e2.b !== 1 || e2.f !== 1) probleme.push("b) Speichern verliert Block/Feld von „Übung Zwei“: " + JSON.stringify(e2));
  // e)
  if (r.nachHand != null) probleme.push("e) nach der Hand-Änderung trägt das Feld noch die Stationsmarke " + r.nachHand);
  // d)
  if (r.nachWettlauf.join() !== "Spielform,Spielform") probleme.push("d) nach schnellem Wechsel A→B steht die Struktur: " + r.nachWettlauf.join(" | "));
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  zeilen.push(`a) Schreibvorgänge nach dem Öffnen: ${postsNachOeffnen}`);
  zeilen.push(`c) zwei Blöcke „Spielform“: Übung Eins → Block 1/Feld 1, Übung Zwei → Block 2/Feld 2, leere Felder bleiben leer`);
  zeilen.push(`b) Speichern schreibt ${JSON.stringify(r.eintraege)}`);
  zeilen.push(`d) nach A→B: ${r.nachWettlauf.join(" | ")} · e) Stationsmarke nach Hand-Änderung: ${r.nachHand == null ? "weg" : r.nachHand}`);
  return h.ergebnis("v608 Plan öffnen schreibt nichts zurück, Übungen bleiben an Block und Feld", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
