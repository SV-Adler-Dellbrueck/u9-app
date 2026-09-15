/* v560 – Zwei Geräte, die dem Zeichner fehlten.

   Der Verein hält Geräte für alle Mannschaften vor. Zwei davon konnte der Zeichner nicht
   darstellen: den Koordinationsring und den mannshohen Freistoß-Dummy. Material eintragen
   zu können, das man nicht zeichnen kann, wäre eine halbe Sache.

   Wo das Material liegt, sagt seit v561 die Ortszeile am Posten („Materialschuppen Verein").
   Der Prüffall dazu steht in `v561-material-kacheln.js`.

   Fälle:
   a) Ring und Dummy erscheinen im Bild, in beiden Rasenvarianten, mit Farben aus dem
      Farbsatz – und sind voneinander und vom Spieler unterscheidbar.
   b) Eine unbekannte Geräte-Art wird übersprungen statt gezeichnet: eine ältere Fassung
      der App muss eine neuere Beschreibung ohne Bruch zeichnen können.
   c) Die Legende nennt beide beim Namen, aber nur wenn sie vorkommen.
   d) Die Materialzählung kennt sie, in Ein- und Mehrzahl.
   e) Beide Werkzeuge stehen im Editor. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];

  const s = await h.starten({ hoehe: 1400, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });

  // ── a) bis d) Zeichnung, Legende, Zählung ─────────────────────────────────
  const r = await s.page.evaluate(() => {
    for (const n of ["skzMaterial", "skzLegende", "skzMatWort"])
      if (typeof window[n] !== "function") return { fehlt: n };
    const farben = ["#4ade80", "#f87171", "#60a5fa", "#fbbf24", "#fff", "#ffffff"];
    const spec = { ger: [[70, 70, "ring", "y"], [150, 70, "dummy", "b"]], s: [[40, 120, "g"]] };

    const halter = document.createElement("div");
    halter.innerHTML = _skz(spec);
    const svg = halter.querySelector("svg");
    /* Der Ring ist die einzige hohle Ellipse – der Markierungsteller ist gefüllt. */
    const ringe = [...svg.querySelectorAll('ellipse[fill="none"]')].length;
    /* Der Dummy steht: ein hohes Rechteck mit Kopf darüber, kein Kreis mit r=8. */
    const koerper = [...svg.querySelectorAll("rect")].filter(e => Number(e.getAttribute("height")) > Number(e.getAttribute("width"))).length;
    const kopf = [...svg.querySelectorAll('circle[r="2.4"]')].length;
    const spieler = [...svg.querySelectorAll('circle[r="8"]')].length;

    const hellSvg = document.createElement("div");
    hellSvg.innerHTML = _skz(spec, { hell: true });
    const hellRinge = [...hellSvg.querySelectorAll('ellipse[fill="none"]')].length;

    /* Geprüft werden die Geräte selbst, nicht Rasen und Ränder: die tragen Palettenfarben,
       die mit dem Farbsatz der Mannschaften nichts zu tun haben. */
    const ringFarbe = (svg.querySelector('ellipse[fill="none"]')?.getAttribute("stroke") || "").toLowerCase();
    const dummyFarbe = ([...svg.querySelectorAll("rect")].find(e => Number(e.getAttribute("height")) > Number(e.getAttribute("width")))?.getAttribute("fill") || "").toLowerCase();
    const fremd = [ringFarbe, dummyFarbe].filter(c => !farben.includes(c));

    // b) unbekannte Art wird übersprungen
    const nurSpieler = _skz({ s: [[40, 120, "g"]] });
    const mitUnbekannt = _skz({ s: [[40, 120, "g"]], ger: [[70, 70, "trampolin", "y"]] });

    // c) Legende
    const legRing = skzLegende(false, spec);
    const legOhne = skzLegende(false, { s: [[10, 10, "g"]] });

    // d) Zählung
    const viele = skzMaterial({ ger: [[10, 10, "ring"], [20, 10, "ring"], [30, 10, "dummy"], [40, 10, "dummy"]] });
    const eins = skzMaterial({ ger: [[10, 10, "ring"], [30, 10, "dummy"]] });

    return {
      ringe, koerper, kopf, spieler, hellRinge, fremd, ringFarbe, dummyFarbe,
      unbekanntNeutral: nurSpieler === mitUnbekannt,
      legNenntRing: /Koordinationsring/.test(legRing),
      legNenntDummy: /Freistoß-Dummy/.test(legRing),
      legOhneGeraet: !/Koordinationsring|Freistoß-Dummy/.test(legOhne),
      mehrzahl: viele.map(m => m.anzahl + " " + m.was).join(" · "),
      einzahl: eins.map(m => m.anzahl + " " + m.was).join(" · ")
    };
  });

  if (r.fehlt) probleme.push(r.fehlt + " fehlt");
  else {
    if (r.ringe !== 1 || r.hellRinge !== 1) probleme.push(`${r.ringe} Ringe im dunklen, ${r.hellRinge} im hellen Bild – erwartet je einer`);
    if (r.koerper !== 1 || r.kopf !== 1) probleme.push(`Der Dummy ist nicht als stehende Figur gezeichnet (${r.koerper} Körper, ${r.kopf} Kopf)`);
    if (r.spieler !== 1) probleme.push(`${r.spieler} Spielerkreise – der Dummy darf keiner sein`);
    if (r.fremd.length) probleme.push("Gerätefarbe außerhalb des Farbsatzes: " + r.fremd.join(", "));
    if (r.ringFarbe !== "#fbbf24" || r.dummyFarbe !== "#60a5fa") probleme.push(`Die gewählte Farbe kommt nicht am Gerät an (Ring ${r.ringFarbe}, Dummy ${r.dummyFarbe})`);
    if (!r.unbekanntNeutral) probleme.push("Eine unbekannte Geräte-Art wird gezeichnet statt übersprungen – eine ältere Fassung der App muss eine neuere Beschreibung zeichnen können");
    if (!r.legNenntRing || !r.legNenntDummy) probleme.push("Die Legende nennt Ring oder Dummy nicht beim Namen");
    if (!r.legOhneGeraet) probleme.push("Die Legende zeigt Geräte, die gar nicht vorkommen");
    if (r.mehrzahl !== "2 Koordinationsringe · 2 Freistoß-Dummys") probleme.push("Mehrzahl falsch: " + r.mehrzahl);
    if (r.einzahl !== "1 Koordinationsring · 1 Freistoß-Dummy") probleme.push("Einzahl falsch: " + r.einzahl);
    if (!probleme.length) zeilen.push("Ring und Dummy: beide Rasenvarianten, unbekannte Art übersprungen, Legende und Zählung stimmen");
  }

  // ── Editor: die zwei neuen Werkzeuge ──────────────────────────────────────
  await h.sichtbarMachen(s.page, "#view-formen");
  const ed = await s.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    skzEditorOpen(null, () => {});
    await warte(100);
    const ids = ["ring", "dummy"];
    const knoepfe = ids.map(i => document.querySelector('#skz-palette button[data-werk="' + i + '"]'));
    const hoehen = knoepfe.filter(Boolean).map(b => Math.round(b.getBoundingClientRect().height));
    skzSetWerkzeug("dummy"); skzBuehneDown({ clientX: 0, clientY: 0, preventDefault() {} });
    const gesetzt = (_skzSpec.ger || []).filter(g => g[2] === "dummy").length;
    document.getElementById("skz-modal")?.remove();
    return { da: knoepfe.filter(Boolean).length, minHoehe: hoehen.length ? Math.min(...hoehen) : 0, gesetzt };
  });
  if (ed.da !== 2) probleme.push(`${ed.da} von 2 neuen Werkzeugen im Editor`);
  if (ed.minHoehe < 44) probleme.push(`Ein Werkzeug-Knopf ist ${ed.minHoehe} px hoch – gefordert 44`);
  if (ed.gesetzt !== 1) probleme.push("Ein Tipp mit dem Dummy-Werkzeug setzt keinen Dummy");
  if (!probleme.length) zeilen.push(`Editor: Ring und Dummy, beide ${ed.minHoehe} px hoch`);

  const fehler = s.fehler();
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);
  await s.schliessen();

  return h.ergebnis("Skizze: Koordinationsring und Freistoß-Dummy", !probleme.length, zeilen.concat(probleme));
};
