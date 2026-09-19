/* v576 – „Vorlage übernehmen“ aufgeräumt: suchen statt scrollen.

   PO am 18.09., mit Bildschirmfoto: „Hier müssen wir die Struktur und Optik verbessern.
   Aufgeräumter und vielleicht auch in der Kachel-Logik wie an den anderen Stellen. Und
   übersichtlicher.“ Das Fenster begann mit drei Filterreihen – sechs Leitfragen als volle
   Sätze untereinander, zehn Ordnungen, vier Rahmen-Kacheln –, zusammen höher als der
   Bildschirm. Erst danach kamen dreißig Karten, jede mit ihrer Leitfrage, also sechs Sätze
   fünfmal wiederholt. Und die Rahmen-Kacheln zeigten die Datenschlüssel: „wenig-platz“,
   „schlechtwetter“, „vor-spieltag“.

   Fälle:
   a) Oben ein Suchfeld: Es filtert über Name UND Leitfrage, „L4“ findet die vierte Gruppe.
   b) Die Filterreihen sind eingeklappt; der Knopf nennt die aktive Auswahl im Klartext.
   c) Die Liste ist nach Leitfrage gruppiert – Überschrift mit Kürzel („L1 Wie behalte ich
      den Ball …“), und die Leitfrage steht nicht mehr in jeder Karte.
   d) Rahmen stehen im Klartext, in der Kachel wie in der Karte; ein unbekannter Schlüssel
      wird trotzdem lesbar.
   e) Findet nichts, steht dort ein Weg zurück, nicht nur eine Absage. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");
  const vor = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8"));
  const rows = (vor.vorlagen || []).map((v, i) => ({ ...v, id: 500 + i }));
  const datum = h.tagePlus(3);

  const s = await h.starten({
    hoehe: 2400,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(),
      termine: [{ id: 7, datum, typ: "training", trainer_status: { Charles: "ja", Finn: "ja" } }],
      trainingsvorlagen: rows
    })
  });
  await h.sichtbarMachen(s.page, "#tp-timeline");

  const r = await s.page.evaluate(async ({ datum }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = { fehlt: [] };
    for (const n of ["vuTagLabel", "vuGruppenKopf", "vuSucheSetzen", "vuFilterAuf", "vuFilterLeeren"]) if (typeof window[n] !== "function") out.fehlt.push(n);
    if (out.fehlt.length) return out;
    await loadKader();
    const feld = document.getElementById("tp-date");
    if (feld && ![...feld.options].some(o => o.value === datum)) feld.add(new Option(datum, datum));
    if (feld) feld.value = datum;

    // d) die Übersetzung, unabhängig vom DOM
    out.label = ["wenig-platz", "halle", "schlechtwetter", "vor-spieltag", "neuer_schluessel"].map(vuTagLabel);
    out.kopf = vuGruppenKopf({ name: "L4-8 Drei Felder", leitfrage: "Wie kriege ich den Ball zu einem, der frei ist?" });
    out.kopfOhne = vuGruppenKopf({ name: "Eigene Einheit", leitfrage: "" });

    await vorlageUebernehmenOpen();
    await warte(200);
    const box = () => document.getElementById("vu-inhalt");
    const karten = () => [...box().querySelectorAll("button")].filter(b => /vuWaehlen/.test(b.getAttribute("onclick") || ""));
    const ordChips = () => [...box().querySelectorAll("button")].filter(b => /vuFilterSet\('ordnung'/.test(b.getAttribute("onclick") || ""));
    const tagChips = () => [...box().querySelectorAll("button")].filter(b => /vuFilterSet\('tag'/.test(b.getAttribute("onclick") || ""));

    // b) eingeklappt
    out.offenZuBeginn = _vuFilterOffen;
    out.chipsZuBeginn = ordChips().length + tagChips().length;
    out.suchfeldDa = !!document.getElementById("vu-suche");
    out.kartenAlle = karten().length;
    /* c) Gruppenköpfe: der Text vor der ersten Karte nennt Kürzel und Frage. */
    out.text = (box().textContent || "").replace(/\s+/g, " ");
    out.gruppenKoepfe = (out.text.match(/L\d+ Wie /g) || []).length;
    /* Die Leitfrage darf nicht mehr in jeder Karte stehen: dreißig Karten, sechs Fragen. */
    out.frageInKarte = karten().filter(b => /Wie behalte ich den Ball/.test(b.textContent || "")).length;

    // aufklappen
    vuFilterAuf(); await warte(80);
    out.offenNachTipp = _vuFilterOffen;
    out.tagKacheln = tagChips().map(b => b.textContent.trim());
    // b) der Knopf nennt die Auswahl
    vuFilterSet("ordnung", "FUNiño"); await warte(80);
    const knopf = [...box().querySelectorAll("button")].find(b => /vuFilterAuf/.test(b.getAttribute("onclick") || ""));
    out.knopfText = knopf ? knopf.textContent.replace(/\s+/g, " ").trim() : "";
    out.kartenGefiltert = karten().length;
    vuFilterLeeren(); await warte(80);
    out.nachLeeren = karten().length;

    // a) Suche
    vuSucheSetzen("L4"); await warte(80);
    out.sucheL4 = karten().map(b => (b.querySelector("div") || {}).textContent || "").filter(Boolean);
    vuSucheSetzen("Ball zum Freien"); await warte(80);
    out.sucheFrage = karten().length;
    // e) nichts gefunden
    vuSucheSetzen("zzz keine Einheit"); await warte(80);
    out.leerText = (box().textContent || "").replace(/\s+/g, " ");
    out.wegZurueck = [...box().querySelectorAll("button")].some(b => /Alle zeigen/.test(b.textContent || ""));
    vuSucheSetzen(""); await warte(80);
    out.wiederAlle = karten().length;
    vorlageUebernehmenClose();
    return out;
  }, { datum });

  const fehler = s.fehler();
  await s.schliessen();
  if (r.fehlt.length) return h.ergebnis("Vorlagen-Fenster: suchen statt scrollen", false, [r.fehlt.join(", ") + " fehlt"]);

  // d)
  const sollLabel = "wenig Platz,Halle,schlechtes Wetter,vor dem Spieltag,Neuer schluessel";
  if (String(r.label) !== sollLabel) probleme.push(`Rahmen-Klartext kommt als ${JSON.stringify(r.label)} statt ${JSON.stringify(sollLabel.split(","))}`);
  if (r.kopf !== "L4 · Wie kriege ich den Ball zu einem, der frei ist?") probleme.push(`Gruppenkopf: „${r.kopf}“`);
  if (r.kopfOhne !== "Ohne Leitfrage") probleme.push(`Gruppenkopf ohne Leitfrage: „${r.kopfOhne}“`);
  // b)
  if (r.offenZuBeginn) probleme.push("Die Filterreihen stehen beim Öffnen schon offen – das Fenster soll mit der Liste beginnen");
  if (r.chipsZuBeginn) probleme.push(`${r.chipsZuBeginn} Filterkacheln sind sichtbar, obwohl eingeklappt`);
  if (!r.suchfeldDa) probleme.push("Es gibt kein Suchfeld");
  if (!r.offenNachTipp) probleme.push("Der Filter-Knopf klappt die Reihen nicht auf");
  if (!/FUNiño/.test(r.knopfText)) probleme.push(`Der Filter-Knopf nennt die Auswahl nicht: „${r.knopfText}“`);
  if (r.tagKacheln.some(t => /-/.test(t))) probleme.push(`Rahmen-Kacheln zeigen noch Datenschlüssel: ${JSON.stringify(r.tagKacheln)}`);
  // c)
  if (r.kartenAlle !== 30) probleme.push(`${r.kartenAlle} Karten statt 30`);
  if (r.gruppenKoepfe < 5) probleme.push(`${r.gruppenKoepfe} Gruppenüberschriften – die Liste ist nicht nach Leitfrage gruppiert`);
  if (r.frageInKarte) probleme.push(`Die Leitfrage steht noch in ${r.frageInKarte} Karten, obwohl sie über der Gruppe steht`);
  // a)
  if (!r.sucheL4.length || !r.sucheL4.every(n => /^L4-/.test(n))) probleme.push(`Suche „L4“ findet ${JSON.stringify(r.sucheL4.slice(0, 3))}`);
  if (!r.sucheFrage) probleme.push("Die Suche greift nicht auf die Leitfrage zu");
  if (r.kartenGefiltert >= 30 || !r.kartenGefiltert) probleme.push(`Der Ordnungsfilter wirkt nicht: ${r.kartenGefiltert} Karten`);
  if (r.nachLeeren !== 30) probleme.push(`„Filter aufheben“ stellt ${r.nachLeeren} statt 30 Karten her`);
  // e)
  if (!/Keine Vorlage passt dazu/.test(r.leerText)) probleme.push("Der leere Zustand sagt nichts");
  if (!r.wegZurueck) probleme.push("Der leere Zustand bietet keinen Weg zurück");
  if (r.wiederAlle !== 30) probleme.push(`Nach dem Leeren der Suche ${r.wiederAlle} statt 30 Karten`);
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);

  if (!probleme.length) {
    zeilen.push(`Beginnt mit Suchfeld und eingeklapptem Filter · ${r.kartenAlle} Karten in ${r.gruppenKoepfe} Gruppen, Leitfrage nur noch in der Überschrift`);
    zeilen.push(`Rahmen im Klartext: ${r.tagKacheln.join(" · ")} · Filter-Knopf sagt „${r.knopfText.slice(0, 40)}“`);
    zeilen.push(`Suche „L4“ → ${r.sucheL4.length} Einheiten · nichts gefunden → Weg zurück · Filter aufheben → ${r.nachLeeren}`);
  }
  return h.ergebnis("Vorlagen-Fenster: suchen statt scrollen", !probleme.length, zeilen.concat(probleme));
};
