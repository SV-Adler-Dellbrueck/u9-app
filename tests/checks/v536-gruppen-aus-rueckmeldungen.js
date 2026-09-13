/* v536 – Paket C aus doku/auftrag-stationen: Gruppen aus den Rückmeldungen,
   vierter Chip-Zustand für die Rolle Organisation.

   Am 13.09. standen beim Übernehmen von L4-1 zwei Kadergruppen zu je sieben Kindern plus
   eine dritte — obwohl elf Kinder erwartet waren. Und die dritte Gruppe stand bei Markus,
   der Organisation und Elternkommunikation verantwortet, nicht Felder.

   Geprüft werden die Abnahmekriterien 7 bis 10:
   7)  Elf zugesagte Kinder, zwei Feldtrainer → zwei Gruppen zu sechs und fünf.
   8)  Elf zugesagte, drei Feldtrainer → vier, vier, drei, mit Hinweis auf die Zielgröße.
   9)  Rolle Organisation: „dabei" → oranger Chip mit eigenem Zeichen und Text, kein Feld.
       Abgesagt → rot. Tipp → grün, ein Feld mehr. Zweiter Tipp → zurück. Neuer Termin →
       wieder orange.
   10) Die Gruppen kommen aus den Zusagen des TERMINS, nicht aus dem Kader. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const datum = h.tagePlus(4);
  const K = h.KINDER;                       // „Kind A" … „Kind O"
  const zugesagt = K.slice(0, 11);          // elf Kinder sagen zu

  const s = await h.starten({ hoehe: 2400, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    termine: [{ id: 77, datum, typ: "training", trainer_status: { Charles: "ja", Peter: "ja", Markus: "ja", Kenneth: "nein" } }],
    rueckmeldungen: h.kaderZeilen().map((k, i) => ({ spieler_id: k.id, status: i < 11 ? "zugesagt" : "abgesagt" })),
    trainingsgruppen: []
  }) });
  await h.sichtbarMachen(s.page, "#tp-timeline");

  const r = await s.page.evaluate(async ({ datum, zugesagt }) => {
    await loadKader();
    const out = {};
    const feld = document.getElementById("tp-date");
    if (feld && ![...feld.options].some(o => o.value === datum)) feld.add(new Option(datum, datum));
    if (feld) feld.value = datum;
    await tpTrainerRsvpLaden(datum);

    // 10) Pool kommt aus den Zusagen, nicht aus dem Kader
    out.rsvpGeladen = Array.isArray(TP_KIND_RSVP) ? TP_KIND_RSVP.length : null;
    out.pool = _tgPool();

    // 9) Chip-Zustände
    const chip = name => {
      const inp = [...document.querySelectorAll("#tp-trainer-checks input")].find(x => x.value === name);
      const sp = inp && inp.parentElement.querySelector("span");
      return inp ? { an: inp.checked, text: (sp.textContent || "").replace(/\s+/g, " ").trim(), stil: sp.getAttribute("style") || "", titel: sp.getAttribute("title") || "" } : null;
    };
    out.markusDabei = chip("Markus");
    out.charles = chip("Charles");
    const unsicher = TP_RSVP_MARKE.unsicher.ico;
    out.verwechselbar = !!(out.markusDabei && out.markusDabei.text.includes(unsicher));

    // 7) zwei Feldtrainer (Charles, Peter) → zwei Gruppen
    out.feldtrainerVorher = tpGetCheckedTrainers().slice();
    let tg = tgBilden();
    out.zwei = tg.gruppen.map(g => g.kinder.length);
    out.quelle = tg.quelle;
    out.hinweisZwei = tgGroessenHinweis(tg);

    // 9) Tipp auf Markus → grün, ein Feld mehr
    tpTrainerManuell("Markus", true);
    out.markusNachTipp = chip("Markus");
    out.feldtrainerNachTipp = tpGetCheckedTrainers().slice();
    // 8) drei Feldtrainer → 4/4/3 mit Hinweis
    tg = tgBilden();
    out.drei = tg.gruppen.map(g => g.kinder.length);
    out.hinweisDrei = tgGroessenHinweis(tg);
    out.kachel = tgKachelHtml();

    // 9) zweiter Tipp → zurück auf orange
    tpTrainerManuell("Markus", false);
    out.markusZurueck = chip("Markus");

    // 9) Markus sagt ab → rot
    TP_RSVP.Markus = "nein"; TP_TRAINER_MANUELL = {}; tpTrainerChipsRender();
    out.markusAbgesagt = chip("Markus");

    // 9) neuer Termin → wieder orange (TP_TRAINER_MANUELL wird geleert)
    TP_RSVP.Markus = "ja"; TP_TRAINER_MANUELL = { Markus: true };
    await tpTrainerRsvpLaden(datum);
    out.markusNeuerTermin = chip("Markus");
    return out;
  }, { datum, zugesagt });

  const fehler = s.fehler();
  await s.schliessen();

  // 10) Quelle
  if (r.rsvpGeladen !== 11) probleme.push(`aus den Rückmeldungen kamen ${r.rsvpGeladen} Kinder (erwartet 11)`);
  if (!r.pool || r.pool.quelle !== "zusagen") probleme.push(`die Gruppen kommen aus „${r.pool && r.pool.quelle}“ statt aus den Zusagen`);
  if (r.pool && r.pool.namen.length !== 11) probleme.push(`der Pool hat ${r.pool.namen.length} Kinder (erwartet 11, nicht den ganzen Kader)`);

  // 7) zwei Feldtrainer
  if (String(r.feldtrainerVorher) !== "Charles,Peter") probleme.push(`Feldtrainer [${r.feldtrainerVorher}] – Markus darf nicht dabei sein, Kenneth hat abgesagt`);
  /* Verglichen werden die GRÖSSEN, nicht ihre Reihenfolge: die Kinder werden in
     Schlangenlinie nach Stärke verteilt, welche Gruppe die größere ist, ist Zufall
     und ohne Bedeutung. Das Paket nennt „sechs und fünf", nicht „erst sechs". */
  const groessen = a => (a || []).slice().sort((x, y) => y - x).join(",");
  if (groessen(r.zwei) !== "6,5") probleme.push(`zwei Feldtrainer ergeben Gruppen [${r.zwei}] (erwartet 6 und 5)`);
  if (r.hinweisZwei) probleme.push(`bei 6 und 5 erscheint ein Hinweis, obwohl beide in der Zielgröße liegen: „${r.hinweisZwei}“`);

  // 8) drei Feldtrainer
  if (String(r.feldtrainerNachTipp) !== "Charles,Peter,Markus") probleme.push(`nach dem Tipp sind es [${r.feldtrainerNachTipp}]`);
  if (groessen(r.drei) !== "4,4,3") probleme.push(`drei Feldtrainer ergeben Gruppen [${r.drei}] (erwartet 4, 4 und 3)`);
  if (!/unter der Zielgröße/.test(r.hinweisDrei || "")) probleme.push(`bei einer Dreiergruppe fehlt der Hinweis: „${r.hinweisDrei}“`);
  if (!/unter der Zielgröße/.test(r.kachel || "")) probleme.push("der Hinweis steht nicht in der Gruppen-Kachel");

  // 9) Chip-Zustände
  const m = r.markusDabei || {};
  if (m.an) probleme.push("Markus ist bei „dabei“ angehakt – er bekommt kein Feld");
  if (!/ohne Feld/.test(m.text || "")) probleme.push(`der orange Chip trägt keinen Text: „${m.text}“`);
  if (!/🧭/.test(m.text || "")) probleme.push(`der orange Chip trägt kein eigenes Zeichen: „${m.text}“`);
  if (!/orange/.test(m.stil || "")) probleme.push(`der Chip ist nicht orange: „${m.stil}“`);
  if (r.verwechselbar) probleme.push("der orange Chip trägt dasselbe Zeichen wie „unsicher“ – nicht unterscheidbar");
  if ((r.charles || {}).an !== true) probleme.push("ein normaler Feldtrainer mit Zusage ist nicht angehakt");

  if (!(r.markusNachTipp || {}).an) probleme.push("der Tipp macht Markus nicht zum Feldtrainer");
  if (/ohne Feld/.test((r.markusNachTipp || {}).text || "")) probleme.push("nach dem Tipp steht weiter „ohne Feld“ am Chip");
  if ((r.markusZurueck || {}).an) probleme.push("der zweite Tipp nimmt das Feld nicht wieder weg");
  if (!/ohne Feld/.test((r.markusZurueck || {}).text || "")) probleme.push("nach dem zweiten Tipp fehlt der orange Zustand");

  const ab = r.markusAbgesagt || {};
  if (ab.an) probleme.push("ein abgesagter Organisations-Trainer ist angehakt");
  if (/ohne Feld/.test(ab.text || "")) probleme.push(`abgesagt zeigt „ohne Feld“ statt ✕: „${ab.text}“`);
  if (!/✕/.test(ab.text || "")) probleme.push(`abgesagt trägt kein ✕: „${ab.text}“`);

  const nt = r.markusNeuerTermin || {};
  if (nt.an) probleme.push("beim neuen Termin gilt die Ausnahme weiter – sie soll nur für einen Termin gelten");
  if (!/ohne Feld/.test(nt.text || "")) probleme.push("beim neuen Termin steht der Chip nicht wieder auf orange");

  if (fehler.length) probleme.push(...fehler.slice(0, 2));

  zeilen.push(`Pool: ${r.pool && r.pool.namen.length} Kinder ${r.pool && r.pool.quelle} · Feldtrainer [${r.feldtrainerVorher}]`);
  zeilen.push(`zwei Feldtrainer → [${r.zwei}] ohne Hinweis · drei → [${r.drei}] „${r.hinweisDrei}“`);
  zeilen.push(`Markus dabei: „${m.text}“ (angehakt ${m.an}) · nach Tipp angehakt ${(r.markusNachTipp || {}).an} · abgesagt „${ab.text}“`);
  zeilen.push(`neuer Termin: „${nt.text}“ (angehakt ${nt.an})`);

  return h.ergebnis("Gruppen aus den Zusagen, Organisation ohne Feld", !probleme.length, zeilen.concat(probleme));
};
