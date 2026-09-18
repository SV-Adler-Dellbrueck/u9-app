/* v574 – Die Einteilung folgt der tatsächlichen Anwesenheit.

   PO am 18.09.: „Die Aufteilung der Gruppen müssen sich immer an der tatsächlichen
   Anwesenheit richten.“ Bis v573 entstanden die Gruppen einmal aus dem Pool des Termins und
   blieben dann stehen. Der übliche Ablauf ist aber Plan am Vorabend, Anwesenheit am
   Trainingstag: Wer absagte, stand weiter in seiner Gruppe und wurde am Feld mitgezählt; wer
   unangemeldet kam, tauchte in keiner auf.

   Fälle:
   a) Anwesenheit erfasst: Wer fehlt, fliegt aus seiner Gruppe; wer dazukommt, landet in der
      kleinsten. Die übrigen Kinder, die Namen und die Trainer bleiben.
   b) Ohne erfasste Anwesenheit (Termin in der Zukunft, Basis sind die Zusagen) wird nur
      ergänzt, nie entfernt – eine Absage am Mittwoch ist für den Freitag keine Tatsache.
   c) Der Abgleich läuft beim Zeichnen des Plans von selbst und meldet sich einmal.
   d) Er rechnet nicht gegen sich selbst: Ein zweiter Durchlauf ohne Änderung meldet nichts.
   e) Danach stimmen auch die Feldstärken (v573) wieder – die Summe am Feld ist die Zahl der
      anwesenden Kinder.
   f) Ist WEDER Anwesenheit NOCH eine Zusage erfasst, bleibt die Einteilung unangetastet: Die
      Basis wäre dann der ganze Kader, und der sagt nichts darüber, wer heute kommt. Eine von
      Hand gebaute Neuner-Einteilung auf fünfzehn aufzufüllen wäre schlimmer als gar kein
      Abgleich – v451, v457 und v514 haben genau das beim ersten Anlauf gemeldet. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const K = h.KINDER;
  const heute = h.tagePlus(0), morgen = h.tagePlus(3);

  const s = await h.starten({ hoehe: 2200, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  await h.sichtbarMachen(s.page, "#tp-timeline");

  const r = await s.page.evaluate(async ({ K, heute, morgen }) => {
    const out = { fehlt: [] };
    for (const n of ["tgAnwesenheitAbgleich", "tgAbgleichMelden", "_tgPool"]) if (typeof window[n] !== "function") out.fehlt.push(n);
    if (out.fehlt.length) return out;
    await loadKader();
    const T = TRAINER.slice(0, 3);
    let box = document.getElementById("tp-trainer-checks"); if (!box) { box = document.createElement("div"); box.id = "tp-trainer-checks"; document.body.appendChild(box); }
    TP_RSVP = {}; T.forEach(t => TP_RSVP[t] = "ja"); TP_TRAINER_MANUELL = {}; tpTrainerChipsRender();
    tpCoaches = {}; tpSlots.length = 0;
    tpSlots.push({ label: "Hauptteil 1", dauer: 20, farbe: "#1a56db", typ: "main" });
    const feld = document.getElementById("tp-date");
    if (feld && ![...feld.options].some(o => o.value === heute)) feld.add(new Option(heute, heute));
    if (feld) feld.value = heute;

    /* Zwölf Kinder in drei Gruppen, wie am Vorabend geplant. */
    const geplant = K.slice(0, 12);
    const bau = () => ({ gruppen: [
      { emo: "🔵", name: "Blaue Haie", farbe: "#2563eb", trainer: T[0], kinder: geplant.slice(0, 4) },
      { emo: "🔴", name: "Rote Füchse", farbe: "#dc2626", trainer: T[1], kinder: geplant.slice(4, 8) },
      { emo: "🟢", name: "Grüne Krokodile", farbe: "#16a34a", trainer: T[2], kinder: geplant.slice(8, 12) }
    ], ausAnwesenheit: false });

    /* a) Am Trainingstag: zwei der Geplanten fehlen, zwei andere sind da. */
    _tgCache = { datum: heute, geladen: true, tg: bau() };
    const tag = {};
    K.forEach(n => { tag[n] = { da: false, qual: 0 }; });
    geplant.slice(0, 10).forEach(n => { tag[n] = { da: true, qual: 0 }; });   // zwei fallen weg
    K.slice(12, 14).forEach(n => { tag[n] = { da: true, qual: 0 }; });        // zwei kommen dazu
    window.AW_DATA = {}; AW_DATA[heute] = tag;
    out.quelle = _tgPool().quelle;
    out.pool = _tgPool().namen.length;
    const erg = tgAnwesenheitAbgleich();
    out.raus = erg ? erg.raus.slice().sort() : null;
    out.rein = erg ? erg.rein.slice().sort() : null;
    const jetzt = tgFor().gruppen;
    out.groessen = jetzt.map(g => g.kinder.length);
    out.namen = jetzt.map(g => g.name);
    out.trainer = jetzt.map(g => g.trainer);
    out.summe = jetzt.reduce((a, g) => a + g.kinder.length, 0);
    out.fehlende = jetzt.flatMap(g => g.kinder).filter(n => !tag[n] || !tag[n].da);
    out.ausAnwesenheit = tgFor().ausAnwesenheit;
    /* Die ersten vier Kinder der ersten Gruppe, soweit anwesend, stehen noch dort. */
    out.ersteBleibt = geplant.slice(0, 4).filter(n => tag[n].da).every(n => jetzt[0].kinder.includes(n));

    // d) zweiter Durchlauf: nichts mehr zu tun
    out.nochmal = tgAnwesenheitAbgleich();

    /* b) Termin in der Zukunft: Basis sind die Zusagen, niemand fliegt raus. */
    if (feld && ![...feld.options].some(o => o.value === morgen)) feld.add(new Option(morgen, morgen));
    if (feld) feld.value = morgen;
    _tgCache = { datum: morgen, geladen: true, tg: bau() };
    TP_KIND_RSVP = K.slice(0, 8);            // vier der Geplanten haben abgesagt
    out.quelleMorgen = _tgPool().quelle;
    const erg2 = tgAnwesenheitAbgleich();
    out.rausMorgen = erg2 ? erg2.raus.length : 0;
    out.summeMorgen = tgFor().gruppen.reduce((a, g) => a + g.kinder.length, 0);

    /* f) Weder Anwesenheit noch Zusagen: Hände weg. */
    if (feld && ![...feld.options].some(o => o.value === morgen)) feld.value = morgen; else if (feld) feld.value = morgen;
    _tgCache = { datum: morgen, geladen: true, tg: bau() };
    TP_KIND_RSVP = [];
    window.AW_DATA = {};
    out.quelleKader = _tgPool().quelle;
    out.ergKader = tgAnwesenheitAbgleich();
    out.summeKader = tgFor().gruppen.reduce((a, g) => a + g.kinder.length, 0);
    window.AW_DATA = {}; AW_DATA[heute] = tag;

    // c) beim Zeichnen von selbst
    if (feld) feld.value = heute;
    _tgCache = { datum: heute, geladen: true, tg: bau() };
    tpRenderTimeline();
    out.nachRender = tgFor().gruppen.reduce((a, g) => a + g.kinder.length, 0);
    out.nachRenderFehlende = tgFor().gruppen.flatMap(g => g.kinder).filter(n => !tag[n] || !tag[n].da).length;
    return out;
  }, { K, heute, morgen });

  const fehler = s.fehler();
  await s.schliessen();
  if (r.fehlt.length) return h.ergebnis("Einteilung folgt der Anwesenheit", false, [r.fehlt.join(", ") + " fehlt"]);

  // a)
  if (r.quelle !== "anwesenheit") probleme.push(`Der Pool kommt aus „${r.quelle}“ statt aus der Anwesenheit`);
  if (r.pool !== 12) probleme.push(`${r.pool} Kinder anwesend statt 12`);
  if (!r.raus || r.raus.length !== 2) probleme.push(`${r.raus ? r.raus.length : 0} Kinder aus den Gruppen entfernt statt zwei`);
  if (!r.rein || r.rein.length !== 2) probleme.push(`${r.rein ? r.rein.length : 0} Kinder ergänzt statt zwei`);
  if (r.summe !== 12) probleme.push(`Nach dem Abgleich stehen ${r.summe} Kinder in den Gruppen statt 12`);
  if (r.fehlende.length) probleme.push(`Abwesende stehen weiter in einer Gruppe: ${r.fehlende.join(", ")}`);
  if (String(r.namen) !== "Blaue Haie,Rote Füchse,Grüne Krokodile") probleme.push(`Die Gruppennamen haben sich geändert: ${r.namen.join(", ")}`);
  if (r.trainer.some(t => !t)) probleme.push(`Ein Trainer ist verloren gegangen: ${JSON.stringify(r.trainer)}`);
  if (!r.ersteBleibt) probleme.push("Die anwesenden Kinder der ersten Gruppe stehen nicht mehr dort – es wurde neu gemischt");
  if (!r.ausAnwesenheit) probleme.push("Die Einteilung ist nach dem Abgleich nicht als „aus der Anwesenheit“ gekennzeichnet");
  // d)
  if (r.nochmal) probleme.push(`Ein zweiter Durchlauf verschiebt noch einmal: ${JSON.stringify(r.nochmal)}`);
  // b)
  if (r.quelleMorgen !== "zusagen") probleme.push(`Für den künftigen Termin kommt der Pool aus „${r.quelleMorgen}“ statt aus den Zusagen`);
  if (r.rausMorgen) probleme.push(`Vor dem Trainingstag wurden ${r.rausMorgen} Kinder entfernt – eine Absage ist dort noch keine Tatsache`);
  if (r.summeMorgen !== 12) probleme.push(`Für den künftigen Termin stehen ${r.summeMorgen} Kinder in den Gruppen statt der geplanten 12`);
  // f)
  if (r.quelleKader !== "kader") probleme.push(`Ohne Anwesenheit und Zusagen kommt der Pool aus „${r.quelleKader}“ statt aus dem Kader`);
  if (r.ergKader) probleme.push(`Ohne Anwesenheit und Zusagen wird trotzdem verschoben: ${JSON.stringify(r.ergKader)}`);
  if (r.summeKader !== 12) probleme.push(`Ohne Anwesenheit und Zusagen stehen ${r.summeKader} Kinder in den Gruppen statt der eingeteilten 12`);
  // c)
  if (r.nachRender !== 12) probleme.push(`Beim Zeichnen des Plans gleicht die App nicht ab: ${r.nachRender} Kinder`);
  if (r.nachRenderFehlende) probleme.push(`Nach dem Zeichnen stehen ${r.nachRenderFehlende} Abwesende in den Gruppen`);
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);

  if (!probleme.length) {
    zeilen.push(`Am Trainingstag: ${r.raus.length} raus, ${r.rein.length} dazu → ${r.groessen.join("/")} (${r.summe} Kinder), Namen und Trainer unverändert`);
    zeilen.push(`Zweiter Durchlauf ohne Änderung · beim Zeichnen des Plans läuft der Abgleich von selbst`);
    zeilen.push(`Künftiger Termin (Zusagen): niemand wird entfernt, ${r.summeMorgen} Kinder bleiben eingeteilt`);
    zeilen.push(`Ohne Anwesenheit und Zusagen (Basis Kader): kein Abgleich, ${r.summeKader} Kinder bleiben stehen`);
  }
  return h.ergebnis("Einteilung folgt der Anwesenheit", !probleme.length, zeilen.concat(probleme));
};
