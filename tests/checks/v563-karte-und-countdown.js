/* v563 – Zwei Stellen, an denen die App etwas versprach und dann nein sagte.

   1. „Meine Karte" im Eltern-Bereich antwortete mit einer roten Meldung: „Für dein Kind
      gibt es noch keine Bewertung." Sachlich stimmte das — der Saisonstart räumt die
      Bewertungen ins Archiv, `spielerprofile` ist danach leer. Aber damit traf es nach
      jedem Saisonwechsel JEDES Kind, und die Kachel versprach etwas, das sie nicht hielt.
      Die Bewertung braucht die Karte nur für die drei Stärken; Name, Nummer, Foto und die
      Zähler hängen an nichts, was erst jemand eintragen müsste.

      Geraten wird trotzdem nichts: ohne Bewertung stünden alle Werte auf 0, und die
      Sortierung machte daraus drei „stärkste" Merkmale — eine Aussage über ein Kind, die
      niemand getroffen hat. Also keine Merkmale, ein eigenes Thema („NEUE SAISON") und an
      ihrer Stelle der Satz, dass sie noch kommen.

   2. Der Countdown in der Kabine zählte zum nächsten Spiel im Kalender, ohne zu fragen, ob
      das Kind überhaupt dabei ist. Wer abgesagt hat, las „Noch 4× schlafen bis zum Spiel"
      — Vorfreude auf einen Tag zu Hause. Dasselbe bei der Packliste.

   Fälle:
   a) Ohne Bewertung: keine Merkmale, Thema „NEUE SAISON", und die Karte zeichnet sich
      ohne Fehler.
   b) Mit Bewertung: drei Merkmale und das Thema der stärksten Dimension, wie bisher.
   c) Der Countdown überspringt einen Termin, für den abgesagt wurde.
   d) Eine offene Rückmeldung ist keine Absage — dieser Termin bleibt stehen.
   e) Haben alle Kinder alles abgesagt, steht kein Countdown da statt eines falschen. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];

  const TERMINE = [
    { id: 70, datum: h.tagePlus(4), typ: "turnier", gegner: "Gegner A", titel: "Kinderfestival A" },
    { id: 71, datum: h.tagePlus(11), typ: "turnier", gegner: "Gegner B", titel: "Kinderfestival B" },
    { id: 72, datum: h.tagePlus(18), typ: "turnier", gegner: "Gegner C", titel: "Kinderfestival C" }
  ];

  const s = await h.starten({ hoehe: 1400, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    termine: TERMINE,
    rueckmeldungen: [{ termin_id: 70, spieler_id: 2, status: "abgesagt" }]
  }) });

  // ── a) + b) Die Karte ─────────────────────────────────────────────────────
  const karte = await s.page.evaluate(() => {
    for (const n of ["adlerCardDataFromChild", "adlerCardDraw"])
      if (typeof window[n] !== "function") return { fehlt: n };
    const kind = { name: "Kind A", nr: 7, tw: false, geb: "2017-05-01", radios: {}, stats: { tore: 2, trainings: 11 } };
    const ohne = adlerCardDataFromChild(kind);
    const mitWerten = Object.fromEntries(Object.keys(CARD_BADGES).map((k, i) => [k, i === 0 ? 5 : 1]));
    const mit = adlerCardDataFromChild({ ...kind, radios: mitWerten });

    /* Zeichnen muss in beiden Fällen durchlaufen – eine Karte, die beim Malen abbricht,
       wäre schlimmer als die alte Fehlermeldung. */
    let gemalt = "";
    try {
      const c = document.createElement("canvas"); c.width = 500; c.height = 780;
      adlerCardDraw(c.getContext("2d"), 500, 780, ohne, null);
      adlerCardDraw(c.getContext("2d"), 500, 780, mit, null);
    } catch (e) { gemalt = String(e && e.message || e); }

    return {
      ohneBadges: (ohne.badges || []).length,
      ohneThema: ohne.theme && ohne.theme.name,
      ohneZaehler: ohne.counts && ohne.counts.trainings,
      ohneName: ohne.name,
      mitBadges: (mit.badges || []).length,
      mitThema: mit.theme && mit.theme.name,
      gemalt
    };
  });

  if (karte.fehlt) probleme.push(karte.fehlt + " fehlt");
  else {
    if (karte.ohneBadges !== 0) probleme.push(`Ohne Bewertung stehen ${karte.ohneBadges} Stärken auf der Karte – geraten wird nichts`);
    if (karte.ohneThema !== "NEUE SAISON") probleme.push(`Ohne Bewertung trägt die Karte das Thema „${karte.ohneThema}“ – das wäre eine Behauptung`);
    if (karte.ohneZaehler !== 11 || karte.ohneName !== "Kind A") probleme.push("Ohne Bewertung fehlen Name oder Zähler – die hängen an keiner Einschätzung");
    if (karte.mitBadges !== 3) probleme.push(`Mit Bewertung stehen ${karte.mitBadges} Stärken statt drei`);
    if (karte.mitThema === "NEUE SAISON") probleme.push("Mit Bewertung trägt die Karte weiterhin das Saisonstart-Thema");
    if (karte.gemalt) probleme.push("Die Karte bricht beim Zeichnen ab: " + karte.gemalt);
    if (!probleme.length) zeilen.push(`Karte: ohne Bewertung 0 Stärken und „${karte.ohneThema}“, mit Bewertung 3 und „${karte.mitThema}“, beide gezeichnet`);
  }

  // ── c) bis e) Der Countdown ───────────────────────────────────────────────
  const ct = await s.page.evaluate(async ({ TERMINE }) => {
    if (typeof _kabNaechsterTermin !== "function") return { fehlt: "_kabNaechsterTermin" };
    const aus = {};
    window._elternKids = [{ spieler_id: 2, kader: { name: "Kind A" } }];
    aus.beiAbsage = (await _kabNaechsterTermin() || {}).id;      // 70 abgesagt → erwartet 71

    /* d) Ein zweites Kind, das noch nichts gesagt hat, hält den Termin: offen ist keine
       Absage, und die Kabine gehört beiden Kindern. */
    window._elternKids = [{ spieler_id: 2 }, { spieler_id: 3 }];
    aus.zweitesKind = (await _kabNaechsterTermin() || {}).id;    // erwartet 70

    aus.alleTermine = TERMINE.length;
    return aus;
  }, { TERMINE });

  if (ct.fehlt) probleme.push(ct.fehlt + " fehlt");
  else {
    if (ct.beiAbsage !== 71) probleme.push(`Der Countdown zählt zu Termin ${ct.beiAbsage} statt zu 71 – für 70 wurde abgesagt`);
    if (ct.zweitesKind !== 70) probleme.push(`Mit einem zweiten, offenen Kind wird Termin ${ct.zweitesKind} gewählt statt 70 – offen ist keine Absage`);
    if (!probleme.length) zeilen.push("Countdown: abgesagter Termin übersprungen, offene Rückmeldung zählt als möglich");
  }

  // ── e) Alles abgesagt: lieber nichts als etwas Falsches ───────────────────
  const leer = await s.page.evaluate(async ({ TERMINE }) => {
    const alle = TERMINE.map(t => ({ termin_id: t.id, spieler_id: 2, status: "abgesagt" }));
    const echt = window.fetch;
    window.fetch = (u, o) => /rueckmeldungen/.test(String(u))
      ? Promise.resolve({ ok: true, status: 200, json: async () => alle })
      : echt(u, o);
    window._elternKids = [{ spieler_id: 2 }];
    const t = await _kabNaechsterTermin();
    window.fetch = echt;
    return { t: t ? t.id : null };
  }, { TERMINE });
  if (leer.t !== null) probleme.push(`Obwohl für alle Termine abgesagt wurde, zählt der Countdown zu ${leer.t}`);
  else if (!probleme.length) zeilen.push("Alles abgesagt: kein Countdown statt eines falschen");

  const fehler = s.fehler();
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);
  await s.schliessen();

  return h.ergebnis("Karte ohne Bewertung, Countdown ohne Absage", !probleme.length, zeilen.concat(probleme));
};
