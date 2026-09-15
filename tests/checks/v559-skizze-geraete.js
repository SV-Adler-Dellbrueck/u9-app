/* v559 – Geräte, Dribbeltore und die Frage, was man dafür aus dem Schrank holt.

   Grundlage sind die vierzig Trainingsformen des Verbands, die im Drive liegen. Ihre
   Organisationssätze nennen immer wieder Dinge, die unser Zeichner nicht kannte:
   Stangentore (in fünf der vierzig), Hütchentore (in vier), Stangen als passive Gegner,
   Markierungsteller, eine Minihürde im Koordinationsparcours, den Mittelkreis als Feld
   und das Balldepot beim Trainer (in acht). Zwei einzeln gesetzte Hütchen sahen bisher
   aus wie zwei Hütchen – nicht wie ein Ziel.

   Der zweite Teil ist der eigentliche Gewinn: jede dieser Vorlagen beginnt mit einem
   Materialsatz. Bei uns muss den niemand schreiben, er steht schon in der Zeichnung.
   Und weil die App den Schrank kennt (Material-Inventur seit v545), lässt sich sagen,
   ob das Gezeichnete überhaupt da ist.

   Fälle:
   a) Ohne die neuen Listen zeichnet der Renderer unverändert.
   b) Jedes neue Gerät erscheint im Bild, in beiden Rasenvarianten, und benutzt nur
      Farben aus dem Farbsatz.
   c) Ein Dribbeltor steht auf zwei Pfosten und trägt eine Verbindung dazwischen – sonst
      wäre es kein Tor, sondern zwei Hütchen.
   d) Die Legende zeigt genau die Geräte, die vorkommen, und keine anderen.
   e) Die Materialzählung zählt, was gezeichnet ist: ein Dribbeltor sind ZWEI Pfosten,
      ein Jugendtor ist kein Minitor, und bei mehreren Übungen auf einem Aufbau gilt das
      Maximum, nicht die Summe.
   f) Ein- und Mehrzahl stimmen („1 Ball", nicht „1 Bälle").
   g) Der Abgleich gegen den Bestand: was gezählt ist und nicht reicht, wird als Fehlmenge
      benannt; was der Bestand gar nicht führt, wird als solches benannt statt still
      übergangen; ein Posten ohne Zählung sagt nichts (leer heißt „nicht gezählt").
   h) Der Import kennt die neuen Listen und weist sie in einem Schritt ab – Geräte
      gehören zum Aufbau und damit in Bild 1. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const PROBE = {
    z: [[20, 20, 240, 140]], kr: [[140, 90, 34]],
    dtor: [[40, 30, 26, "h", "s", "y"], [200, 140, 24, "h", "h", "r"]],
    ger: [[70, 70, "stange", "w"], [110, 70, "teller", "b"], [150, 70, "huerde", "r"], [200, 70, "depot"]],
    tor: [[10, 80, "v", 24], [250, 68, "v", 44, "j"]],
    h: [[60, 150, "r"], [90, 150, "r"]],
    s: [[70, 120, "g", "A"]], b: [[78, 128]]
  };

  const s = await h.starten({ hoehe: 1400, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });

  const r = await s.page.evaluate(({ PROBE }) => {
    for (const n of ["skzMaterial", "skzMaterialSumme", "skzMatWort"])
      if (typeof window[n] !== "function") return { fehlt: n };
    const farben = ["#4ade80", "#f87171", "#60a5fa", "#fbbf24", "#fff", "#ffffff"];

    // a) ohne die neuen Listen unverändert
    const ohne = { s: [[10, 10, "g"]], h: [[20, 20, "r"]] };
    const kopie = JSON.parse(JSON.stringify(ohne));
    kopie.ger = []; kopie.dtor = []; kopie.kr = [];
    const unveraendert = _skz(ohne) === _skz(kopie);

    // b) + c) die Geräte im Bild
    const dunkel = _skz(PROBE), hell = _skz(PROBE, { hell: true });
    const halter = document.createElement("div"); halter.innerHTML = dunkel;
    const svg = halter.querySelector("svg");
    /* Der Ball ist ebenfalls r=4, aber gefüllt – gezählt werden nur die Ringe. */
    const ringe = [...svg.querySelectorAll('circle[r="4"][fill="none"]')].length;
    const ellipsen = svg.querySelectorAll("ellipse").length;                  // Teller
    const gestrichelt = [...svg.querySelectorAll('line[stroke-dasharray="3,3"]')].length;  // Tor-Verbindungen
    const kreiszone = [...svg.querySelectorAll('circle[stroke-dasharray="6,3"]')].length;

    // d) Legende
    const legende = skzLegende(false, PROBE);
    const nurStange = skzLegende(false, { ger: [[10, 10, "stange"]] });

    // e) + f) Materialzählung
    const mat = skzMaterial(PROBE);
    const alsText = {};
    mat.forEach(m => alsText[m.schluessel] = m.anzahl);
    const einsText = skzMaterialText({ b: [[1, 1]], ger: [[2, 2, "huerde"]] });
    const zweiText = skzMaterialText({ b: [[1, 1], [2, 2]], ger: [[2, 2, "huerde"], [3, 3, "huerde"]] });
    const summe = skzMaterialSumme([{ tor: [[1, 1, "h", 24]], h: [[1, 1], [2, 2], [3, 3]] },
                                    { tor: [[1, 1, "h", 24], [2, 2, "h", 24]], h: [[1, 1]] }]);

    // h) Import
    const impGut = _eiSkizzeFehler(PROBE);
    const impSchritt = _eiSkizzeFehler({ s: [[1, 1, "g"]], schritte: [{ ger: [[1, 1, "stange"]] }] });

    return {
      unveraendert, ringe, ellipsen, gestrichelt, kreiszone,
      hellAnders: dunkel !== hell,
      fremdeFarben: (dunkel.match(/(?:fill|stroke)="(#[0-9a-f]{3,6})"/gi) || [])
        .map(x => x.slice(x.indexOf('"') + 1, -1))
        /* Rasen, Rand, Ball und die vier Pfeilfarben stehen in jeder Zeichnung. */
        .filter(c => !farben.includes(c) && !["#2d6a2d", "#1a4a1a", "#fff", "#333", "#fde047", "#fca5a5", "#7dd3fc", "#15803d", "#991b1b", "#1d4ed8", "#713f12", "#475569"].includes(c)),
      legendeHat: ["Stange", "Markierungsteller", "Minihürde", "Balldepot", "Stangentor", "Hütchentor"].filter(x => legende.includes(x)),
      nurStangeHat: ["Stange", "Minihürde", "Balldepot"].filter(x => nurStange.includes(x)),
      mat: alsText, einsText, zweiText,
      summe: summe.map(m => m.anzahl + " " + m.was).join(" · "),
      impGut, impSchritt
    };
  }, { PROBE });

  if (r.fehlt) { await s.schliessen(); return h.ergebnis("Skizze: Geräte und Material", false, [r.fehlt + " fehlt"]); }

  if (!r.unveraendert) probleme.push("Eine Beschreibung mit leeren neuen Listen zeichnet anders als ohne sie");
  /* 3 Ringe: eine Stange plus die zwei Pfosten des Stangentors. */
  if (r.ringe !== 3) probleme.push(`${r.ringe} Stangen-Ringe gezeichnet statt 3`);
  if (r.ellipsen !== 1) probleme.push(`${r.ellipsen} Markierungsteller statt 1`);
  if (r.gestrichelt !== 2) probleme.push(`${r.gestrichelt} Tor-Verbindungen statt 2 – ohne sie sind es zwei Pfosten, kein Tor`);
  if (r.kreiszone !== 1) probleme.push(`${r.kreiszone} Kreiszonen statt 1`);
  if (!r.hellAnders) probleme.push("Die helle Fassung zeichnet die Geräte nicht anders");
  if (r.fremdeFarben.length) probleme.push("Farbe außerhalb des Farbsatzes: " + [...new Set(r.fremdeFarben)].join(", "));
  if (r.legendeHat.length !== 6) probleme.push("In der Legende fehlen: " + ["Stange", "Markierungsteller", "Minihürde", "Balldepot", "Stangentor", "Hütchentor"].filter(x => !r.legendeHat.includes(x)).join(", "));
  if (r.nurStangeHat.length !== 1) probleme.push("Die Legende zeigt Geräte, die gar nicht vorkommen: " + r.nurStangeHat.join(", "));
  if (!probleme.length) zeilen.push(`Geräte: ${r.legendeHat.length} Symbole, Legende zeigt nur das Vorkommende, beide Rasenvarianten`);

  // e) Zählung
  const soll = { minitor: 1, jugendtor: 1, huetchen: 4, stange: 3, teller: 1, huerde: 1, ball: 1, depot: 1 };
  Object.keys(soll).forEach(k => {
    if (r.mat[k] !== soll[k]) probleme.push(`Materialzählung ${k}: ${r.mat[k] === undefined ? "fehlt" : r.mat[k]} statt ${soll[k]}`);
  });
  if (r.einsText !== "1 Minihürde · 1 Ball") probleme.push(`Einzahl falsch: „${r.einsText}“`);
  if (r.zweiText !== "2 Minihürden · 2 Bälle") probleme.push(`Mehrzahl falsch: „${r.zweiText}“`);
  if (r.summe !== "2 Minitore · 3 Hütchen") probleme.push(`Summe über zwei Übungen: „${r.summe}“ – erwartet das Maximum „2 Minitore · 3 Hütchen“`);
  if (!probleme.length) zeilen.push(`Material: ${Object.keys(soll).length} Gegenstände gezählt, Dribbeltor als zwei Pfosten, bei einem Aufbau gilt das Maximum`);

  // h) Import
  if (r.impGut.length) probleme.push("Eine gültige Beschreibung mit Geräten wird abgewiesen: " + r.impGut.join("; "));
  if (!r.impSchritt.length) probleme.push("Geräte in einem Schritt werden nicht abgewiesen – der Aufbau gehört in Bild 1");

  // ── g) Abgleich gegen den Bestand ─────────────────────────────────────────
  const bestand = await s.page.evaluate(({ PROBE }) => {
    if (typeof matBedarfZeile !== "function") return { fehlt: "matBedarfZeile" };
    /* Gezählter Bestand: 2 Hütchen (rot) und 1 Hütchen (gelb) = 3 – gebraucht werden 4.
       Markierungsteller steht in der Liste, ist aber nicht gezählt. Stangen fehlen ganz. */
    MAT_POSTEN = [
      { name: "Hütchen", variante: "rot", ist: 2, aktiv: true },
      { name: "Hütchen", variante: "gelb", ist: 1, aktiv: true },
      { name: "Markierungsteller", variante: null, ist: null, aktiv: true },
      { name: "Bälle", variante: "Größe 4", ist: 12, aktiv: true }
    ];
    const zeile = matBedarfZeile(PROBE);
    return {
      fehlmenge: /es fehlen 1/.test(zeile),
      hatHuetchen: /4 Hütchen/.test(zeile),
      tellerOhneWarnung: !/Markierungsteller · es fehlen/.test(zeile),
      ungefuehrt: /Nicht im Materialbestand geführt:/.test(zeile),
      nenntStangen: /Nicht im Materialbestand geführt:[^<]*Stangen/.test(zeile),
      ballOhneWarnung: !/Ball · es fehlen/.test(zeile),
      leer: matBedarfZeile({ s: [[1, 1, "g"]] })
    };
  }, { PROBE });
  if (bestand.fehlt) probleme.push(bestand.fehlt + " fehlt");
  else {
    if (!bestand.hatHuetchen) probleme.push("Die Materialzeile nennt die Hütchen nicht");
    if (!bestand.fehlmenge) probleme.push("Vier gebrauchte Hütchen gegen drei gezählte ergeben keine Fehlmenge");
    if (!bestand.tellerOhneWarnung) probleme.push("Ein Posten ohne Zählung wird als Fehlmenge gemeldet – leer heißt „nicht gezählt“");
    if (!bestand.ballOhneWarnung) probleme.push("Ein ausreichender Bestand wird als Fehlmenge gemeldet");
    if (!bestand.ungefuehrt || !bestand.nenntStangen) probleme.push("Was der Bestand nicht führt, wird nicht benannt");
    if (bestand.leer) probleme.push("Eine Skizze ohne Material zeigt trotzdem eine Materialzeile");
    if (!probleme.length) zeilen.push("Bestand: Fehlmenge benannt, ungezählter Posten stillgehalten, nicht geführte Gegenstände ausgewiesen");
  }

  // ── Editor: die neuen Werkzeuge ───────────────────────────────────────────
  await h.sichtbarMachen(s.page, "#view-formen");
  const ed = await s.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    skzEditorOpen(null, () => {});
    await warte(100);
    const ids = ["stange", "teller", "huerde", "depot", "stangentor", "huetchentor", "kreis"];
    const da = ids.filter(i => document.querySelector('#skz-palette button[data-werk="' + i + '"]'));
    const hoehen = da.map(i => Math.round(document.querySelector('#skz-palette button[data-werk="' + i + '"]').getBoundingClientRect().height));
    // Eine Stange setzen
    skzSetWerkzeug("stange"); skzBuehneDown({ clientX: 0, clientY: 0, preventDefault() {} });
    const nachStange = (_skzSpec.ger || []).length;
    // Ein Stangentor mit zwei Tipps
    skzSetWerkzeug("stangentor");
    skzBuehneDown({ clientX: 0, clientY: 0, preventDefault() {} });
    skzBuehneDown({ clientX: 0, clientY: 0, preventDefault() {} });
    const nachTor = (_skzSpec.dtor || []).length;
    document.getElementById("skz-modal")?.remove();
    return { da: da.length, minHoehe: hoehen.length ? Math.min(...hoehen) : 0, nachStange, nachTor };
  });
  if (ed.da !== 7) probleme.push(`${ed.da} von 7 neuen Werkzeugen im Editor`);
  if (ed.minHoehe < 44) probleme.push(`Ein Werkzeug-Knopf ist ${ed.minHoehe} px hoch – gefordert 44`);
  if (ed.nachStange !== 1) probleme.push("Ein Tipp mit dem Stangen-Werkzeug setzt keine Stange");
  if (!probleme.length) zeilen.push(`Editor: 7 neue Werkzeuge, alle ${ed.minHoehe} px hoch`);

  const fehler = s.fehler();
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);
  await s.schliessen();

  /* ── i) Kein Funktionsname zweimal ─────────────────────────────────────────
     Beim Bauen dieser Version hieß die neue Funktion zuerst `matZeile` – so wie eine
     Funktion, die es in derselben Datei schon gab. JavaScript sagt dazu nichts: die
     spätere Definition gewinnt stillschweigend, und die Materialzeile zeigte plötzlich
     ein Eingabefeld der Inventur. Nichts war rot, nichts stand in der Konsole.

     Deshalb ab jetzt maschinell: kein Name zweimal in einer Datei, und keiner in zwei
     Dateien. Beide Fälle enden im selben stillen Überschreiben, weil alle Dateien sich
     einen Namensraum teilen (CLAUDE.md: „Ein globaler Name darf nicht in Welle 1 UND
     Welle 2 definiert werden"). */
  const fs = require("fs"), path = require("path");
  const dateien = fs.readdirSync(h.REPO).filter(f => /\.js$/.test(f));
  const namenAus = src => (src.match(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm) || [])
    .map(m => m.replace(/^(?:async\s+)?function\s+/, ""));
  const global = {}, doppelt = [];
  dateien.forEach(f => {
    const namen = namenAus(fs.readFileSync(path.join(h.REPO, f), "utf8"));
    const zahl = {};
    namen.forEach(n => zahl[n] = (zahl[n] || 0) + 1);
    Object.keys(zahl).filter(n => zahl[n] > 1).forEach(n => doppelt.push(`${n} steht ${zahl[n]}× in ${f}`));
    [...new Set(namen)].forEach(n => (global[n] = global[n] || []).push(f));
  });
  Object.keys(global).filter(n => global[n].length > 1)
    .forEach(n => doppelt.push(`${n} steht in ${global[n].join(" und ")}`));
  if (doppelt.length) probleme.push("Funktionsname mehrfach vergeben – die spätere Definition gewinnt still: " + doppelt.join(" · "));
  else zeilen.push(`Namen: ${Object.keys(global).length} Funktionen über ${dateien.length} Dateien, keiner doppelt`);

  return h.ergebnis("Skizze: Geräte aus den Verbandsvorlagen und die Materialliste dazu", !probleme.length, zeilen.concat(probleme));
};
