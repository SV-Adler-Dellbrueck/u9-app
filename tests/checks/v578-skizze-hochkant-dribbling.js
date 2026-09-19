/* v578 – Hochkant oder quer, und ein Dribbling, das aussieht wie eines.

   PO am 19.09., zum Skizzen-Editor: „Es wäre super, wenn ich wählen könnte, dass das Feld
   hochkant oder im Querformat als Grundlage ist. Dann nochmal zu den einzelnen Grafiken.
   Dribbling zum Beispiel sollte keine gestrichelte Linie sein, sondern eine durchgezogene
   Linie, aber geschwungen."

   Zum Format hat er „Mitdrehen“ gewählt: Beim Umschalten dreht sich die ganze Zeichnung um
   eine Vierteldrehung mit, statt liegenzubleiben und am Rand gestaucht zu werden.

   Fälle:
   a) Der Zuschnitt. Ohne `hoch` entsteht Zeichen für Zeichen dasselbe Bild wie vorher
      (280 × 180); mit `hoch` steht es auf 180 × 280, Rasen und Innenlinie mitgezählt.
   b) Die Drehung. Punkte, Strecken und Kästen wandern, Tor, Leiter und Dribbeltor kippen
      ihre Ausrichtung mit, und zweimal umschalten führt zum Ausgangsbild zurück. Nichts
      liegt danach außerhalb des Feldes.
   c) Das Dribbling ist ein durchgezogener Pfad ohne Strichmuster, beginnt am Startpunkt,
      endet am Endpunkt und trägt die Pfeilspitze. Die anderen drei Arten bleiben, wie sie
      waren – sonst wären Pass und Laufweg nicht mehr auseinanderzuhalten.
   d) Die Legende zeigt dieselbe Welle wie der Platz, nicht mehr das Strichmuster.
   e) Der Editor: Der Knopf sagt, wohin der Tipp führt, die Bühne nimmt den Zuschnitt an,
      „Zurück“ macht die Drehung rückgängig, und eine Vorlage kommt gedreht ins hochkante
      Feld statt es stillschweigend umzulegen.
   f) Ein Tor gehört an die Linie – auch hochkant. Quer entschied die Grenze x > 230; im
      schmalen Feld läge die mitten auf dem Platz. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];

  const PROBE = {
    s: [[40, 30, "g", "A"]], b: [[48, 36]],
    h: [[60, 150, "r"]],
    tor: [[250, 78, "v", 24]],
    leiter: [[60, 120, 40]],
    z: [[20, 20, 60, 40]],
    kr: [[140, 90, 20]],
    li: [[20, 170, 260, 170, "m"]],
    ger: [[100, 40, "stange", "y"]],
    tx: [[140, 172, "Probe"]],
    dtor: [[100, 60, 20, "h", "s", "y"]],
    p: [[40, 40, 200, 120, "d"], [40, 60, 200, 60, "p"], [40, 80, 200, 80, "l"], [40, 100, 200, 100, "s"]],
    schritte: [{ s: [[90, 30, "g", "A"]], p: [[90, 30, 140, 90, "d"]] }]
  };

  const s = await h.starten({ hoehe: 1800, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });

  const r = await s.page.evaluate(({ PROBE }) => {
    const fehlt = ["skzDrehen", "_skzWelle", "skzFormat", "_skz", "skzLegende"].filter(n => typeof window[n] !== "function");
    if (fehlt.length) return { fehlt };
    const out = {};
    const holen = (svg, sel) => { const d = document.createElement("div"); d.innerHTML = svg; return [...d.querySelectorAll(sel)]; };

    // ── a) Zuschnitt ────────────────────────────────────────────────────────
    const quer = _skz(PROBE), hoch = _skz(Object.assign({}, PROBE, { hoch: true }));
    out.viewQuer = (quer.match(/viewBox="([^"]*)"/) || [])[1];
    out.viewHoch = (hoch.match(/viewBox="([^"]*)"/) || [])[1];
    out.rasenHoch = holen(hoch, "rect")[0].getAttribute("width") + "×" + holen(hoch, "rect")[0].getAttribute("height");
    out.innenHoch = holen(hoch, "rect")[1].getAttribute("width") + "×" + holen(hoch, "rect")[1].getAttribute("height");
    out.maxHoch = /max-width:180px/.test(hoch);
    /* Eine Beschreibung ohne `hoch` muss Zeichen für Zeichen dasselbe liefern wie eine,
       der das Feld ausdrücklich fehlt – sonst hätte die Neuerung den Bestand angefasst. */
    out.bestandUnberuehrt = _skz(Object.assign({}, PROBE, { hoch: false })) === quer;

    // ── b) Drehung ──────────────────────────────────────────────────────────
    const eins = skzDrehen(PROBE), zwei = skzDrehen(eins);
    out.hochGesetzt = eins.hoch === true;
    out.querZurueck = zwei.hoch === undefined;
    out.rueckweg = JSON.stringify(zwei.leiter) === JSON.stringify([[60, 120, 40]])
      && JSON.stringify(zwei.s) === JSON.stringify(PROBE.s)
      && JSON.stringify(zwei.p) === JSON.stringify(PROBE.p)
      && JSON.stringify(zwei.z) === JSON.stringify(PROBE.z)
      && JSON.stringify(zwei.tor) === JSON.stringify(PROBE.tor)
      && JSON.stringify(zwei.dtor) === JSON.stringify(PROBE.dtor);
    out.torKippt = eins.tor[0][2];            // „v“ quer an der Seitenlinie → hochkant „h“
    out.leiterKippt = eins.leiter[0][3];
    out.dtorKippt = eins.dtor[0][3];
    out.schrittGedreht = JSON.stringify(eins.schritte[0].s) !== JSON.stringify(PROBE.schritte[0].s)
      && JSON.stringify(zwei.schritte[0].s) === JSON.stringify(PROBE.schritte[0].s);
    /* Nichts darf aus dem Bild fallen: alle Punkte müssen im neuen Zuschnitt liegen. */
    const drin = [];
    ["s", "b", "h", "ger", "tx", "kr"].forEach(f => (eins[f] || []).forEach(e => drin.push([e[0], e[1]])));
    ["p", "li"].forEach(f => (eins[f] || []).forEach(e => { drin.push([e[0], e[1]]); drin.push([e[2], e[3]]); }));
    out.ausserhalb = drin.filter(pt => pt[0] < 0 || pt[0] > 180 || pt[1] < 0 || pt[1] > 280).length;

    // ── c) Dribbling ────────────────────────────────────────────────────────
    const nurD = _skz({ p: [[40, 40, 200, 120, "d"]] });
    const pfad = holen(nurD, "path").filter(x => /^M40/.test(x.getAttribute("d") || ""))[0];
    out.dPfad = !!pfad;
    out.dGestrichelt = pfad ? !!pfad.getAttribute("stroke-dasharray") : true;
    out.dSpitze = pfad ? /url\(#[^)]*d\)/.test(pfad.getAttribute("marker-end") || "") : false;
    out.dEnde = pfad ? /L200 120$/.test(pfad.getAttribute("d") || "") : false;
    out.dBoegen = pfad ? (pfad.getAttribute("d").match(/Q/g) || []).length : 0;
    out.dKeineLinie = !holen(nurD, "line").length;
    /* Die drei anderen bleiben Linien – und der Laufweg bleibt der einzige gestrichelte. */
    const andere = _skz({ p: [[40, 60, 200, 60, "p"], [40, 80, 200, 80, "l"], [40, 100, 200, 100, "s"]] });
    const linien = holen(andere, "line");
    out.andereLinien = linien.length;
    out.laufGestrichelt = linien.filter(x => x.getAttribute("stroke-dasharray") === "5,3").length;

    // ── d) Legende ──────────────────────────────────────────────────────────
    const leg = document.createElement("div"); leg.innerHTML = skzLegende(false, PROBE);
    const legPfade = [...leg.querySelectorAll("path")].filter(x => /Q/.test(x.getAttribute("d") || ""));
    out.legWelle = legPfade.length;
    out.legGepunktet = [...leg.querySelectorAll("line")].filter(x => x.getAttribute("stroke-dasharray") === "2,3").length;
    out.legDribbling = /Dribbling/.test(leg.textContent);

    // ── e) Editor ───────────────────────────────────────────────────────────
    skzEditorOpen(JSON.parse(JSON.stringify(PROBE)), () => {});
    const knopf = document.getElementById("skz-format");
    const buehne = document.getElementById("skz-buehne");
    const ed = {};
    ed.knopfQuer = knopf ? knopf.textContent.trim() : "";
    ed.hoeheKnopf = knopf ? Math.round(knopf.getBoundingClientRect().height) : 0;
    const kuerzen = v => String(v || "").replace(/\s+/g, "");   // der Browser schreibt „280 / 180“
    ed.buehneQuer = kuerzen(buehne && buehne.style.aspectRatio);
    skzFormat();
    ed.knopfHoch = knopf ? knopf.textContent.trim() : "";
    ed.buehneHoch = kuerzen(buehne && buehne.style.aspectRatio);
    ed.specHoch = !!_skzSpec.hoch;
    ed.gedreht = JSON.stringify(_skzSpec.s) !== JSON.stringify(PROBE.s);
    ed.svgHoch = (buehne.querySelector("svg") || {}).getAttribute ? buehne.querySelector("svg").getAttribute("viewBox") : "";
    skzUndo();
    ed.nachUndo = !_skzSpec.hoch && JSON.stringify(_skzSpec.s) === JSON.stringify(PROBE.s);
    // Vorlage im hochkanten Feld: gedreht übernommen, Format bleibt
    skzFormat();
    skzVorlage(0);
    ed.vorlageHoch = !!_skzSpec.hoch;
    ed.vorlageDrin = (_skzSpec.s || []).every(e => e[0] <= 180 && e[1] <= 280);
    ed.vorlageAnders = JSON.stringify(_skzSpec.s) !== JSON.stringify(SKZ_VORLAGEN[0].spec.s);
    // Leeren behält den Zuschnitt
    skzLeeren();
    ed.leerHoch = !!_skzSpec.hoch;

    // ── f) Tor an die Linie, auch hochkant ──────────────────────────────────
    _skzSpec = { hoch: true, tor: [] };
    _skzWerk = "tor";
    const tore = [];
    [[10, 100], [170, 100], [90, 40]].forEach(([x, y]) => {
      _skzSpec.tor = [];
      // dieselbe Rechnung wie beim Tippen, ohne Zeigerereignis
      const j = false, tief = 7, breit = 30, B = _skzB(), H = _skzH();
      if (x < B * 0.18) _skzSpec.tor.push([4, Math.min(y, H - 4 - breit), "v", breit]);
      else if (x > B * 0.82) _skzSpec.tor.push([B - 4 - tief, Math.min(y, H - 4 - breit), "v", breit]);
      else _skzSpec.tor.push([Math.min(x, B - 4 - breit), y, "h", breit]);
      tore.push(_skzSpec.tor[0].slice(0, 3).join(","));
    });
    ed.tore = tore;
    ed.masse = _skzB() + "×" + _skzH();
    document.getElementById("skz-modal")?.remove();
    /* g) Die Importprüfung kennt den Zuschnitt: true ist erlaubt, ein Text nicht – der wäre
       in JavaScript wahr und legte das Feld still um. */
    if (typeof _eiSkizzeFehler === "function") {
      out.pruefJa = _eiSkizzeFehler({ s: [[1, 1, "g"]], hoch: true }).length;
      out.pruefText = _eiSkizzeFehler({ s: [[1, 1, "g"]], hoch: "ja" }).length;
    } else out.pruefJa = out.pruefText = -1;
    out.ed = ed;
    return out;
  }, { PROBE });

  const fehler = s.fehler();
  await s.schliessen();
  if (r.fehlt) return h.ergebnis("Skizze: hochkant oder quer, Dribbling geschwungen", false, [r.fehlt.join(", ") + " fehlt"]);
  const ed = r.ed || {};

  // a)
  if (r.viewQuer !== "0 0 280 180") probleme.push(`Quer steht die viewBox auf „${r.viewQuer}“ statt 0 0 280 180`);
  if (r.viewHoch !== "0 0 180 280") probleme.push(`Hochkant steht die viewBox auf „${r.viewHoch}“ statt 0 0 180 280`);
  if (r.rasenHoch !== "180×280") probleme.push(`Der Rasen misst hochkant ${r.rasenHoch}`);
  if (r.innenHoch !== "172×272") probleme.push(`Die Innenlinie misst hochkant ${r.innenHoch} statt 172×272`);
  if (!r.maxHoch) probleme.push("Hochkant bleibt die Zeichnung auf 280 px Breite angelegt");
  if (!r.bestandUnberuehrt) probleme.push("Eine Skizze ohne Hochformat wird anders gezeichnet als vorher");
  // b)
  if (!r.hochGesetzt) probleme.push("Nach dem Drehen fehlt das Kennzeichen „hoch“");
  if (!r.querZurueck) probleme.push("Zurückgedreht bleibt die Skizze als hochkant gekennzeichnet");
  if (!r.rueckweg) probleme.push("Zweimal drehen führt nicht zum Ausgangsbild zurück");
  if (r.torKippt !== "h") probleme.push(`Das Tor steht nach der Drehung auf „${r.torKippt}“ statt quer`);
  if (r.leiterKippt !== "v") probleme.push(`Die Leiter steht nach der Drehung auf „${r.leiterKippt}“ statt senkrecht`);
  if (r.dtorKippt !== "v") probleme.push(`Das Dribbeltor steht nach der Drehung auf „${r.dtorKippt}“ statt senkrecht`);
  if (!r.schrittGedreht) probleme.push("Die weiteren Bilder drehen nicht mit");
  if (r.ausserhalb) probleme.push(`${r.ausserhalb} Element(e) liegen nach der Drehung außerhalb des Feldes`);
  // c)
  if (!r.dPfad) probleme.push("Das Dribbling ist kein Pfad – die Welle fehlt");
  if (r.dGestrichelt) probleme.push("Das Dribbling trägt weiterhin ein Strichmuster");
  if (!r.dSpitze) probleme.push("Dem Dribbling fehlt die Pfeilspitze");
  if (!r.dEnde) probleme.push("Das Dribbling endet nicht am getippten Endpunkt");
  if (r.dBoegen < 4) probleme.push(`Die Dribbel-Linie hat nur ${r.dBoegen} Bögen – sie ist kaum geschwungen`);
  if (!r.dKeineLinie) probleme.push("Neben dem Pfad steht noch eine gerade Linie");
  if (r.andereLinien !== 3) probleme.push(`Pass, Laufweg und Schuss ergeben ${r.andereLinien} Linien statt drei`);
  if (r.laufGestrichelt !== 1) probleme.push(`${r.laufGestrichelt} gestrichelte Linien statt genau des Laufwegs`);
  // d)
  if (r.legWelle !== 1) probleme.push(`Die Legende zeigt ${r.legWelle} Wellen statt genau einer`);
  if (r.legGepunktet) probleme.push("Die Legende zeigt das alte gepunktete Dribbling");
  if (!r.legDribbling) probleme.push("In der Legende fehlt das Wort Dribbling");
  // e)
  if (!/Hochkant/.test(ed.knopfQuer || "")) probleme.push(`Der Knopf sagt quer „${ed.knopfQuer}“ statt Hochkant`);
  if (!/Querformat/.test(ed.knopfHoch || "")) probleme.push(`Der Knopf sagt hochkant „${ed.knopfHoch}“ statt Querformat`);
  if ((ed.hoeheKnopf || 0) < 44) probleme.push(`Der Format-Knopf ist ${ed.hoeheKnopf} px hoch – Bedienelemente tragen 44 px`);
  if (ed.buehneQuer !== "280/180") probleme.push(`Die Bühne steht quer auf „${ed.buehneQuer}“`);
  if (ed.buehneHoch !== "180/280") probleme.push(`Die Bühne steht hochkant auf „${ed.buehneHoch}“`);
  if (!ed.specHoch || !ed.gedreht) probleme.push("Der Knopf stellt das Feld nicht um oder dreht den Inhalt nicht mit");
  if (ed.svgHoch !== "0 0 180 280") probleme.push(`Im Editor steht das Bild auf „${ed.svgHoch}“`);
  if (!ed.nachUndo) probleme.push("„Zurück“ nimmt die Drehung nicht zurück");
  if (!ed.vorlageHoch) probleme.push("Eine Vorlage legt das hochkante Feld wieder quer");
  if (!ed.vorlageDrin) probleme.push("Die gedrehte Vorlage liegt teilweise außerhalb des Feldes");
  if (!ed.vorlageAnders) probleme.push("Die Vorlage wird ungedreht ins hochkante Feld gesetzt");
  if (!ed.leerHoch) probleme.push("„Leeren“ legt das Feld wieder quer");
  // f)
  if (ed.masse !== "180×280") probleme.push(`Der Editor rechnet hochkant mit ${ed.masse}`);
  const [links, rechts, mitte] = ed.tore || [];
  if (links !== "4,100,v") probleme.push(`Links landet das Tor auf ${links} statt bündig an der Linie`);
  if (rechts !== "169,100,v") probleme.push(`Rechts landet das Tor auf ${rechts} statt bündig an der Linie`);
  if (mitte !== "90,40,h") probleme.push(`In der Mitte landet das Tor auf ${mitte} statt quer, wo getippt wurde`);
  // g)
  if (r.pruefJa !== 0) probleme.push("Die Importprüfung beanstandet ein ordentliches „hoch: true“");
  if (r.pruefText !== 1) probleme.push("Die Importprüfung nimmt „hoch: \"ja\"“ hin – ein Text legte das Feld still um");
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);

  if (!probleme.length) {
    zeilen.push(`Zuschnitt: quer ${r.viewQuer} unverändert · hochkant ${r.viewHoch}, Rasen ${r.rasenHoch}, Innenlinie ${r.innenHoch}`);
    zeilen.push(`Drehung: Tor „v“→„${r.torKippt}“, Leiter →„${r.leiterKippt}“, Dribbeltor →„${r.dtorKippt}“ · Schritte drehen mit · zweimal = Ausgangsbild · nichts außerhalb`);
    zeilen.push(`Dribbling: ${r.dBoegen} Bögen, durchgezogen, mit Spitze, endet am Zielpunkt · Pass/Laufweg/Schuss unverändert (nur der Laufweg gestrichelt)`);
    zeilen.push(`Editor: „${ed.knopfQuer}“ ⇄ „${ed.knopfHoch}“ (${ed.hoeheKnopf} px), Bühne ${ed.buehneQuer} → ${ed.buehneHoch}, Zurück nimmt es zurück`);
    zeilen.push(`Vorlage kommt gedreht ins hochkante Feld, Leeren behält den Zuschnitt · Tore hochkant: ${(ed.tore || []).join(" · ")}`);
    zeilen.push("Importprüfung: „hoch: true“ geht durch, „hoch: \"ja\"“ wird benannt");
  }
  return h.ergebnis("Skizze: hochkant oder quer, Dribbling geschwungen", !probleme.length, zeilen.concat(probleme));
};
