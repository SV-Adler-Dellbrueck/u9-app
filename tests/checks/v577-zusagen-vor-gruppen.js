/* v577 – Erst wissen, wer zugesagt hat, dann Gruppen bilden.

   Gefunden im Prüflauf zu v576: `v548` meldete einmal sechs statt vier Hauptteil-Feldern,
   drei Wiederholungen waren grün. Kein Zufall, sondern ein Wettlauf seit v570:
   `tpTrainerRsvpLaden` setzt `TP_KIND_RSVP` zuerst auf null und holt die Zusagen danach.
   In dieser Lücke fällt `_tgPool()` auf den ganzen Kader zurück, und `tgBedarf` bildet aus
   fünfzehn Kindern drei Gruppen statt aus zehn Zusagen zwei.

   Am Platz heißt das: Wer eine Vorlage gleich nach dem Terminwechsel übernimmt, bekommt eine
   andere Feldzahl als zwei Sekunden später – und merkt es nicht.

   Fälle:
   a) Der Wettlauf, nachgestellt: das Laden starten, ohne es abzuwarten, und sofort eine
      Vorlage übernehmen. Die Gruppen folgen den ZEHN Zusagen, nicht den fünfzehn im Kader.
   b) `tpRsvpBereit` wartet auf den laufenden Lauf – und nur auf den zum eigenen Datum; für
      ein anderes Datum gibt es nichts zu warten, sonst hinge das Fenster am alten Termin.
   c) Ohne laufendes Laden kehrt es sofort zurück.
   d) Ein Fehler beim Laden lässt niemanden hängen.
   e) Gebildete Gruppen überleben einen zweiten Abgleich. `tgSync` war nicht reentrant:
      Zwei gleichzeitige Läufe lasen beide den noch leeren Serverstand, und der später
      zurückkommende überschrieb die inzwischen gebildete Einteilung – „Gruppen gebildet,
      Gruppen weg“. Zwei Riegel: ein geteilter Lauf je Termin, und ein leerer Serverstand
      löscht nie eine frische Einteilung im Speicher. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const datum = h.tagePlus(2), anderes = h.tagePlus(9);
  const zusagen = h.KINDER.slice(0, 10);          // zehn von fünfzehn sagen zu
  let planStand = null, gruppenStand = null, lesezugriffe = 0;

  const BLOECKE = [
    { typ: "warmup", label: "Warm up", dauer: 10, uebung_name: "Warm up Adler" },
    { typ: "main", label: "Hauptteil 1", dauer: 20, uebung_name: "4gg2 Ballbesitz" }
  ];
  const s = await h.starten({
    hoehe: 2400,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(),
      termine: [{ id: 88, datum, typ: "training", trainer_status: { Charles: "ja", Finn: "ja" } }],
      trainingsformen: [{ id: 9001, name: "Warm up Adler", kat: "aufwaermen", kurz: "x", dauer: "15", custom: true },
                        { id: 9002, name: "4gg2 Ballbesitz", kat: "passspiel", kurz: "x", dauer: "11", custom: true }],
      /* Zehn Zusagen – die Spieler-IDs sind die Reihenfolge des Prüfkaders. */
      rueckmeldungen: (u) => zusagen.map((n, i) => ({ spieler_id: i + 1, status: "zugesagt" })),
      trainingsvorlagen: [],
      /* Die Attrappe merkt sich, was die App schreibt – sonst holt `tpPlanRestore` einen
         leeren Plan zurück und der eben übernommene wäre wieder weg. */
      trainingsgruppen: (u, req) => {
        if (req.method() === "POST") { try { gruppenStand = JSON.parse(req.postData() || "null"); } catch (e) {} return { status: 201, body: "[]" }; }
        lesezugriffe++;
        return gruppenStand ? [gruppenStand] : [];
      },
      trainingsplan: (u, req) => {
        if (req.method() === "POST") { try { planStand = JSON.parse(req.postData() || "null"); } catch (e) {} return { status: 201, body: "[]" }; }
        if (!planStand) return [];
        if (/select=slots/.test(u.search) && !/plan/.test(u.search)) return [{ datum: planStand.datum, slots: planStand.slots || [] }];
        if (/select=plan/.test(u.search) && !/slots/.test(u.search)) return [{ datum: planStand.datum, plan: planStand.plan || [] }];
        return [planStand];
      }
    })
  });
  await h.sichtbarMachen(s.page, "#tp-timeline");

  const r = await s.page.evaluate(async ({ datum, anderes, BLOECKE }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = { fehlt: [] };
    for (const n of ["tpRsvpBereit", "tpTrainerRsvpLaden", "vorlageUebernehmenSetzen"]) if (typeof window[n] !== "function") out.fehlt.push(n);
    if (out.fehlt.length) return out;
    await loadKader(); await loadCustomForms();
    window.trainerMe = async () => "Charles";
    const feld = document.getElementById("tp-date");
    [datum, anderes].forEach(d => { if (feld && ![...feld.options].some(o => o.value === d)) feld.add(new Option(d, d)); });
    if (feld) feld.value = datum;
    out.kader = KADER.filter(k => k.aktiv !== false).length;

    // c) ohne laufendes Laden: sofort zurück
    const t0 = Date.now();
    await tpRsvpBereit(datum);
    out.sofort = Date.now() - t0 < 50;

    /* a) Der Wettlauf: laden starten, NICHT abwarten, sofort übernehmen. */
    VORLAGEN.length = 0;
    VORLAGEN.push({ id: 41, name: "Probe", leitfrage: "", tags: [], skalierung: {}, bloecke: BLOECKE });
    _vuAuswahl = 41;
    _tgCache = { datum: "", tg: null, geladen: false };
    const lauf = tpTrainerRsvpLaden(datum);     // bewusst ohne await
    out.rsvpWaehrend = TP_KIND_RSVP;            // in der Lücke: noch null
    await vorlageUebernehmenSetzen();
    await lauf;
    await warte(200);
    out.direkt = ((tgFor() || {}).gruppen || []).map(g => g.kinder.length);
    out.trainer = (typeof tpGetCheckedTrainers === "function") ? tpGetCheckedTrainers().length : -1;
    out.bedarf = (typeof tgBedarf === "function") ? tgBedarf(undefined, 0) : -1;
    out.poolQuelle = _tgPool().quelle;
    out.poolGroesse = _tgPool().namen.length;
    out.gruppen = ((tgFor() || {}).gruppen || []).map(g => g.kinder.length);

    // b) anderes Datum: nichts zu warten
    const t1 = Date.now();
    await tpRsvpBereit(anderes);
    out.anderesSofort = Date.now() - t1 < 50;

    // d) ein Fehler beim Laden lässt niemanden hängen
    const echt = window.fetch;
    window.fetch = () => Promise.reject(new Error("kein Netz"));
    const t2 = Date.now();
    try { await tpTrainerRsvpLaden(datum); } catch (e) { out.wirftDurch = true; }
    await tpRsvpBereit(datum);
    out.fehlerDauer = Date.now() - t2;
    window.fetch = echt;
    return out;
  }, { datum, anderes, BLOECKE });

  /* e) Der zweite Riegel. Der Server vergisst die Einteilung (so, wie er sie beim ersten
     Lauf noch nicht kannte), dann laufen zwei Abgleiche gleichzeitig los. Danach müssen die
     Gruppen unverändert stehen – und gelesen worden sein darf höchstens einmal. */
  gruppenStand = null;
  const vorher = lesezugriffe;
  const e = await s.page.evaluate(async () => {
    _tgCache.geladen = false;
    await Promise.all([tgSync(), tgSync()]);
    return { gruppen: ((tgFor() || {}).gruppen || []).map(g => g.kinder.length) };
  });
  const gelesen = lesezugriffe - vorher;

  const fehler = s.fehler();
  await s.schliessen();
  if (r.fehlt.length) return h.ergebnis("Erst die Zusagen, dann die Gruppen", false, [r.fehlt.join(", ") + " fehlt"]);

  if (r.kader !== 15) probleme.push(`${r.kader} aktive Kinder im Kader statt 15`);
  if (r.rsvpWaehrend !== null) probleme.push("Der Wettlauf tritt gar nicht ein – TP_KIND_RSVP war schon gesetzt");
  // a)
  if (r.poolQuelle !== "zusagen") probleme.push(`Der Pool kommt aus „${r.poolQuelle}“ statt aus den Zusagen`);
  if (r.poolGroesse !== 10) probleme.push(`${r.poolGroesse} Kinder im Pool statt der zehn Zusagen`);
  if (r.gruppen.length !== 2) probleme.push(`${r.gruppen.length} Gruppen (${r.gruppen.join("/")}) statt zwei – gerechnet wurde mit dem Kader, nicht mit den Zusagen`);
  if (r.gruppen.reduce((a, b) => a + b, 0) !== 10) probleme.push(`${r.gruppen.reduce((a, b) => a + b, 0)} Kinder eingeteilt statt zehn`);
  // b) + c) + d)
  if (!r.sofort) probleme.push("Ohne laufendes Laden wartet tpRsvpBereit trotzdem");
  if (!r.anderesSofort) probleme.push("tpRsvpBereit wartet auf einen Lauf für ein anderes Datum");
  if (r.fehlerDauer > 2000) probleme.push(`Nach einem Ladefehler dauert das Warten ${r.fehlerDauer} ms – es darf niemanden hängen lassen`);
  // e)
  if (String(e.gruppen) !== String(r.gruppen)) probleme.push(`Nach zwei gleichzeitigen Abgleichen steht ${e.gruppen.join("/") || "keine Gruppe"} statt ${r.gruppen.join("/")} – ein leerer Serverstand hat die Einteilung überschrieben`);
  if (gelesen > 1) probleme.push(`Zwei gleichzeitige tgSync-Aufrufe haben ${gelesen}× gelesen – sie müssen sich einen Lauf teilen`);
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);

  if (!probleme.length) {
    zeilen.push(`Wettlauf nachgestellt: übernommen, während die Zusagen noch luden → Pool „${r.poolQuelle}“ mit ${r.poolGroesse} Kindern, Gruppen ${r.gruppen.join("/")}`);
    zeilen.push(`Beim Übernehmen gebildet: ${JSON.stringify(r.direkt)} · Trainer ${r.trainer}, Bedarf ${r.bedarf}`);
    zeilen.push(`tpRsvpBereit: ohne Lauf sofort, für ein anderes Datum sofort, nach einem Ladefehler ${r.fehlerDauer} ms`);
    zeilen.push(`Zwei Abgleiche gleichzeitig gegen einen leeren Serverstand: Gruppen ${e.gruppen.join("/")} bleiben, ${gelesen}× gelesen`);
  }
  return h.ergebnis("Erst die Zusagen, dann die Gruppen", !probleme.length, zeilen.concat(probleme));
};
