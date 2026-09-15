/* v565 – Das Größen-Menü in der Ausstattung ging nicht auf.

   Die Größe stand in einem Textfeld mit Vorschlagsliste (`<input list=…>`, `datalist`).
   Auf dem Handy ist das kein Menü: Chrome filtert die Vorschläge nach dem, was schon im
   Feld steht. Bei einem gesetzten Wert – „140" – bleibt genau ein Treffer übrig, den es
   gar nicht erst anzeigt. Der Pfeil war zu sehen, es passierte nichts.

   Wo die Größen feststehen (128, 140, 152), gehört dorthin ein echtes Auswahlmenü: ein
   Tipp, eine Liste, auf jedem Gerät. Freitext bleibt für Gegenstände ohne Größenliste —
   dort gibt es nichts auszuwählen.

   Fälle:
   a) Bei einem Gegenstand mit Größenliste steht je Kind ein `select` mit allen Größen und
      einem leeren Eintrag; keine `datalist` mehr.
   b) Die gespeicherte Größe ist vorausgewählt.
   c) Ein Wert, der nicht in der Liste steht (Sondergröße, Altbestand), wird als eigener
      Eintrag mitgeführt — sonst verschwände er beim ersten Öffnen des Menüs.
   d) Eine Auswahl schreibt sofort, ohne Tippbremse: ausgewählt ist entschieden.
   e) Ohne Größenliste bleibt das Freitextfeld.
   f) Das Menü ist 48 px hoch. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];

  const ARTIKEL = [
    { id: 1, name: "Spieltagsjacke", mit_groesse: true, mit_nummer: false, groessen: "128,140,152", sort: 10, aktiv: true },
    { id: 2, name: "Hosen ohne Liste", mit_groesse: true, mit_nummer: false, groessen: null, sort: 20, aktiv: true }
  ];

  const s = await h.starten({ hoehe: 1600, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    ausstattung_artikel: ARTIKEL,
    ausstattung_ausgabe: []
  }) });

  await h.sichtbarMachen(s.page, "#view-kader");
  const r = await s.page.evaluate(async ({ ARTIKEL, K }) => {
    if (typeof ausstattungOpen !== "function") return { fehlt: "ausstattungOpen" };
    await ausstattungOpen();
    AUS_ARTIKEL = ARTIKEL;
    _ausAktiv = 1;
    _ausOffeneZuerst = false;
    /* Zwei gespeicherte Größen: eine aus der Liste, eine Sondergröße von früher. */
    AUS_AUSGABE[ausKey(1, 1)] = { spieler_id: 1, artikel_id: 1, groesse: "140" };
    AUS_AUSGABE[ausKey(2, 1)] = { spieler_id: 2, artikel_id: 1, groesse: "164" };
    ausstattungRender();

    const menues = [...document.querySelectorAll("#aus-body select.aus-groesse")];
    const erstes = menues[0];
    const werte = erstes ? [...erstes.options].map(o => o.value) : [];
    const hoehen = menues.map(m => Math.round(m.getBoundingClientRect().height));

    /* Abgelesen wird JETZT, nicht erst im Rückgabe-Objekt: weiter unten wird auf den
       zweiten Gegenstand umgeschaltet, und dann steht hier kein Menü mehr. */
    const vorgewaehlt = erstes ? erstes.value : null;
    const sonder = menues[1] ? [...menues[1].options].map(o => o.value) : [];
    const sonderGewaehlt = menues[1] ? menues[1].value : null;
    const datalist = document.querySelectorAll("#aus-body datalist").length;

    /* d) Auswählen schreibt sofort – gemessen an dem, was in AUS_AUSGABE steht. */
    if (typeof ausGroesseWahl === "function") ausGroesseWahl(3, "152");
    const nachWahl = (AUS_AUSGABE[ausKey(3, 1)] || {}).groesse;

    /* e) Gegenstand ohne Größenliste: Freitext. */
    _ausAktiv = 2; ausstattungRender();
    const ohneListe = {
      menues: document.querySelectorAll("#aus-body select.aus-groesse").length,
      felder: document.querySelectorAll("#aus-body input.aus-groesse").length
    };

    return {
      anzahl: menues.length,
      werte, datalist, vorgewaehlt, sonder, sonderGewaehlt, nachWahl,
      minHoehe: hoehen.length ? Math.min(...hoehen) : 0,
      ohneListe
    };
  }, { ARTIKEL, K: h.KINDER });

  if (r.fehlt) probleme.push(r.fehlt + " fehlt");
  else {
    if (!r.anzahl) probleme.push("Kein Auswahlmenü für die Größe – das Textfeld mit Vorschlagsliste geht am Handy nicht auf");
    if (r.datalist) probleme.push(`${r.datalist} datalist übrig – genau die ging am Handy nicht auf`);
    if (r.werte.join(",") !== ",128,140,152") probleme.push(`Das Menü bietet „${r.werte.join(", ")}“ – erwartet ein leerer Eintrag und die drei Größen`);
    if (r.vorgewaehlt !== "140") probleme.push(`Die gespeicherte Größe ist nicht vorausgewählt (${r.vorgewaehlt})`);
    if (!r.sonder.includes("164")) probleme.push(`Eine Sondergröße fehlt im Menü (${r.sonder.join(", ")}) – sie ginge beim ersten Öffnen verloren`);
    if (r.sonderGewaehlt !== "164") probleme.push(`Die Sondergröße ist nicht vorausgewählt (${r.sonderGewaehlt})`);
    if (r.nachWahl !== "152") probleme.push(`Eine Auswahl kommt nicht an (${r.nachWahl}) – sie muss sofort gelten, ohne Tippbremse`);
    if (r.minHoehe < 48) probleme.push(`Das Menü ist ${r.minHoehe} px hoch – gefordert 48`);
    if (r.ohneListe.menues) probleme.push("Ein Gegenstand ohne Größenliste bekommt ein leeres Auswahlmenü statt eines Freitextfelds");
    if (!r.ohneListe.felder) probleme.push("Ein Gegenstand ohne Größenliste hat gar kein Größenfeld mehr");
    if (!probleme.length) zeilen.push(`Größe: Auswahlmenü mit ${r.werte.length - 1} Größen à ${r.minHoehe} px, Sondergröße bleibt, Freitext nur ohne Liste`);
  }

  const fehler = s.fehler();
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);
  await s.schliessen();

  return h.ergebnis("Ausstattung: die Größe wird ausgewählt, nicht getippt", !probleme.length, zeilen.concat(probleme));
};
