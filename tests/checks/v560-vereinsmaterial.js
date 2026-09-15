/* v560 – Vereinsmaterial: was nicht uns gehört, aber jeder benutzen darf.

   Der Verein hält Geräte für alle Mannschaften vor: Stangen, Koordinationsleitern,
   Minihürden in mehreren Höhen, Freistoß-Dummys, Ringe. Für den Materialabgleich unter
   der Skizze ist das ein eigener Zustand: vorhanden, aber nicht gesichert. Wer „6 Stangen"
   liest und am Platz feststellt, dass eine andere Mannschaft schneller war, ist schlechter
   dran als jemand, dem die Zeile sagt, dass er sie vorher sichern muss.

   Zwei Geräte fehlten dem Zeichner ganz: der Koordinationsring und der mannshohe
   Freistoß-Dummy. Material eintragen zu können, das man nicht zeichnen kann, wäre eine
   halbe Sache.

   Fälle:
   a) Ring und Dummy erscheinen im Bild, in beiden Rasenvarianten, mit Farben aus dem
      Farbsatz – und sind voneinander und vom Spieler unterscheidbar.
   b) Eine unbekannte Geräte-Art wird übersprungen statt gezeichnet: eine ältere Fassung
      der App muss eine neuere Beschreibung ohne Bruch zeichnen können.
   c) Die Legende nennt beide beim Namen, aber nur wenn sie vorkommen.
   d) Die Materialzählung kennt sie, in Ein- und Mehrzahl.
   e) Der Abgleich weist Vereinsmaterial als solches aus – und nur dann, wenn ALLE Posten
      dieses Gegenstands dem Verein gehören. Steht auch eigenes im Schrank, ist die Menge
      gesichert und der Zusatz wäre eine Warnung ohne Anlass.
   f) Farbe ist nicht der einzige Träger: „(Verein)" steht als Wort in der Zeile.
   g) Die Inventur kann das Kennzeichen setzen – in der Liste und beim Erfassen. */
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

  // ── e) + f) Vereinsmaterial im Abgleich ───────────────────────────────────
  const verein = await s.page.evaluate(() => {
    if (typeof matBedarfZeile !== "function") return { fehlt: "matBedarfZeile" };
    const SPEC = { ger: [[10, 10, "stange"], [20, 10, "stange"], [30, 10, "ring"]], b: [[40, 40], [50, 40]] };
    /* Stangen und Ringe gehören dem Verein, die Bälle uns. */
    MAT_POSTEN = [
      { name: "Stangen", ist: 6, verein: true, aktiv: true },
      { name: "Koordinationsringe", ist: null, verein: true, aktiv: true },
      { name: "Bälle", ist: 12, verein: false, aktiv: true }
    ];
    const rein = matBedarfZeile(SPEC);
    /* Derselbe Gegenstand zweimal: einer dem Verein, einer uns – dann ist er gesichert. */
    MAT_POSTEN = [
      { name: "Stangen", ist: 6, verein: true, aktiv: true },
      { name: "Stangen", ist: 4, verein: false, aktiv: true },
      { name: "Bälle", ist: 12, verein: false, aktiv: true }
    ];
    const gemischt = matBedarfZeile(SPEC);
    const abgleich = matAbgleich(skzMaterial(SPEC));
    return {
      stangeMarkiert: /2 Stangen <span[^>]*>\(Verein\)<\/span>/.test(rein),
      ringMarkiert: /1 Koordinationsring <span[^>]*>\(Verein\)<\/span>/.test(rein),
      ballOhneMarke: !/Bälle <span[^>]*>\(Verein\)/.test(rein),
      hinweis: /Vereinsmaterial teilen sich alle Mannschaften/.test(rein),
      gemischtOhneMarke: !/Stangen <span[^>]*>\(Verein\)/.test(gemischt),
      gemischtOhneHinweis: !/Vereinsmaterial teilen sich/.test(gemischt),
      gemischtSumme: (abgleich.find(m => m.schluessel === "stange") || {}).ist,
      wortNichtNurFarbe: /\(Verein\)/.test(rein)
    };
  });

  if (verein.fehlt) probleme.push(verein.fehlt + " fehlt");
  else {
    if (!verein.stangeMarkiert || !verein.ringMarkiert) probleme.push("Vereinsmaterial wird in der Bedarfszeile nicht ausgewiesen");
    if (!verein.ballOhneMarke) probleme.push("Eigenes Material wird als Vereinsmaterial ausgewiesen");
    if (!verein.hinweis) probleme.push("Der Hinweis zum Sichern fehlt, obwohl Vereinsmaterial gebraucht wird");
    if (!verein.gemischtOhneMarke || !verein.gemischtOhneHinweis) probleme.push("Ein Gegenstand, den es auch als eigenen Posten gibt, wird als Vereinsmaterial ausgewiesen – die Menge ist gesichert");
    if (verein.gemischtSumme !== 10) probleme.push(`Vereins- und eigener Posten werden nicht zusammengezählt (${verein.gemischtSumme} statt 10)`);
    if (!verein.wortNichtNurFarbe) probleme.push("„(Verein)“ steht nicht als Wort in der Zeile – Farbe darf nie der einzige Bedeutungsträger sein");
    if (!probleme.length) zeilen.push("Vereinsmaterial: als Wort ausgewiesen, gemischter Bestand gilt als gesichert, Mengen summiert");
  }

  // ── g) Die Inventur setzt das Kennzeichen ─────────────────────────────────
  const inv = await s.page.evaluate(async () => {
    if (typeof matVereinTippen !== "function") return { fehlt: "matVereinTippen" };
    await materialOpen();
    MAT_POSTEN = [{ id: 901, name: "Stangen", kategorie: "Geräte", ist: null, soll: null, verein: false, aktiv: true, sort: 10 }];
    materialRender();
    const kasten = document.querySelector('#mat-body input[type="checkbox"]');
    const beschriftet = kasten ? (kasten.getAttribute("aria-label") || "") : "";
    matVereinTippen(901, true);
    const gesetzt = MAT_POSTEN[0].verein === true;
    materialRender();
    const jetztAn = !!document.querySelector('#mat-body input[type="checkbox"]')?.checked;
    matPostenNeuOpen();
    const imDialog = !!document.getElementById("mn-verein");
    const hoehe = Math.round(document.getElementById("mn-verein")?.closest("label")?.getBoundingClientRect().height || 0);
    const geraeteSchublade = [...document.querySelectorAll("#mn-kat option")].some(o => o.textContent === "Geräte");
    document.getElementById("mat-neu")?.remove();
    document.getElementById("mat-modal")?.remove();
    return { kasten: !!kasten, beschriftet, gesetzt, jetztAn, imDialog, hoehe, geraeteSchublade };
  });

  if (inv.fehlt) probleme.push(inv.fehlt + " fehlt");
  else {
    if (!inv.kasten) probleme.push("In der Inventur lässt sich das Kennzeichen nicht setzen");
    if (!/Verein/.test(inv.beschriftet)) probleme.push("Das Kennzeichen hat keine sprechende Beschriftung für Screenreader");
    if (!inv.gesetzt || !inv.jetztAn) probleme.push("Das gesetzte Kennzeichen überlebt das Neuzeichnen nicht");
    if (!inv.imDialog) probleme.push("Beim Erfassen eines Postens fehlt das Kennzeichen");
    if (inv.hoehe < 48) probleme.push(`Die Zeile im Erfassen-Dialog ist ${inv.hoehe} px hoch – gefordert 48`);
    if (!inv.geraeteSchublade) probleme.push("Die Schublade „Geräte“ fehlt – Stangen und Hürden sind weder Markierung noch Sonstiges");
    if (!probleme.length) zeilen.push(`Inventur: Kennzeichen in Liste und Erfassen-Dialog, Zeile ${inv.hoehe} px, Schublade „Geräte“ da`);
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

  return h.ergebnis("Vereinsmaterial: Ring, Dummy und was dem Verein gehört", !probleme.length, zeilen.concat(probleme));
};
