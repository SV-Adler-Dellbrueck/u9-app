/* v581 – Die Übung beschreiben, die Zeichnung entsteht daraus.

   PO am 19.09.: „Es ist möglich, hier auch einen KI-Modus einzubauen, so dass ich die
   Zeichnung beziehungsweise die Übungsform diktiere und dann die KI mit Hilfe des
   Skizzenboards diese Übung aufzeichnet."

   Das Gerüst stand: `ki-uebung` liefert im Modus „text" zu einer Beschreibung schon eine
   Skizze mit, und `_skz` zeichnet sie. Gefehlt hat der Weg dorthin aus dem Editor – und
   eine Grenze, an der eine fremde Beschreibung hängenbleibt, bevor sie ins SVG wandert.

   Fälle:
   a) `skzSpecSaeubern` ist diese Grenze: unbekannte Listen und Arten fallen weg, Zahlen
      werden auf das Feld geklemmt (quer wie hochkant), Markup verschwindet aus Texten,
      Farben kommen nur aus dem Farbsatz. Eine Beschreibung ohne Inhalt ergibt null.
   b) Eine saubere Beschreibung bleibt unverändert – die Grenze darf den Bestand nicht
      umschreiben.
   c) Weitere Bilder: beweglich ist nur, was sich bewegt; der Aufbau fällt aus einem
      Schritt heraus.
   d) Der Weg im Editor: Knopf da, Fenster mit Textfeld, ein zu kurzer Text wird abgelehnt,
      ohne dass etwas gesendet wird.
   e) Der Lauf gegen die Edge Function: Die Zeichnung landet im Editor, „Zurück" holt den
      vorherigen Stand zurück, und in die Datenbank wird nichts geschrieben.
   f) Kommt keine Skizze zurück, bleibt die alte stehen und es wird gesagt, woran es lag.
   g) Der Zuschnitt des Trainers bleibt: Eine quer gelieferte Zeichnung dreht sich ins
      hochkante Feld statt es umzulegen. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  let gesendet = null, rufe = 0;

  /* Was die Edge Function zurückgibt – mit Absicht mit zwei Fehlern darin: eine Zahl weit
     außerhalb des Feldes und ein Skript im Text. Beides muss die Grenze abfangen. */
  const ANTWORT = {
    uebungen: [{
      titel: "Slalom", beschreibung: "AUFBAU: vier Hütchen …",
      skizze: {
        h: [[95, 90, "y"], [130, 90, "y"], [165, 90, "y"], [9999, 90, "y"]],
        s: [[45, 90, "g", "A"]], b: [[53, 97]],
        p: [[54, 84, 92, 78, "d", 1], [100, 100, 128, 102, "d", 2]],
        tor: [[240, 72, "v", 36]],
        ger: [[20, 20, "trainer", "w"]],
        tx: [[140, 172, "<b>eng</b> am Fuß"]]
      }
    }]
  };

  const s = await h.starten({
    breite: 420, hoehe: 1800,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(),
      funktionen: {
        "ki-uebung": (u, req) => {
          rufe++;
          try { gesendet = JSON.parse(req.postData() || "null"); } catch (e) { }
          return (gesendet && gesendet.text && /nichts/i.test(gesendet.text)) ? { uebungen: [{ titel: "X" }] } : ANTWORT;
        }
      }
    })
  });

  const r = await s.page.evaluate(() => {
    const fehlt = ["skzSpecSaeubern", "skzKiOpen", "skzKiLauf", "skzKiDiktatMoeglich"].filter(n => typeof window[n] !== "function");
    if (fehlt.length) return { fehlt };
    const out = {};

    // a) die Grenze
    out.unbekannt = skzSpecSaeubern({ raketen: [[1, 2]], s: [[40, 40, "g"]] });
    out.geklemmt = skzSpecSaeubern({ s: [[9999, -20, "g"]] }).s[0];
    out.geklemmtHoch = skzSpecSaeubern({ hoch: true, s: [[250, 270, "g"]] }).s[0];
    out.markup = skzSpecSaeubern({ tx: [[50, 50, '<script>alert(1)</script>Hallo']] }).tx[0][2];
    out.farbe = skzSpecSaeubern({ s: [[40, 40, "lila"]] }).s[0][2];
    out.geraet = skzSpecSaeubern({ ger: [[20, 20, "raketenwerfer", "y"], [30, 30, "trainer", "w"]] }).ger;
    out.leer = skzSpecSaeubern({}) === null && skzSpecSaeubern(null) === null && skzSpecSaeubern({ hoch: true }) === null;

    // b) Bestand unverändert
    const sauber = { s: [[40, 40, "g", "A"]], h: [[95, 90, "y"]], p: [[54, 84, 92, 78, "d", 1]], tor: [[240, 72, "v", 36, "j"]], li: [[20, 20, 260, 20, "m"]], kr: [[140, 90, 20]] };
    /* Verglichen wird Liste für Liste, nicht der ganze JSON-Text: die Grenze baut die
       Beschreibung in fester Reihenfolge neu auf, und die Reihenfolge der Schlüssel ist
       für das Bild ohne Bedeutung. */
    const durch = skzSpecSaeubern(JSON.parse(JSON.stringify(sauber)));
    out.bestand = Object.keys(sauber).every(k => JSON.stringify(durch[k]) === JSON.stringify(sauber[k]))
      && Object.keys(durch).length === Object.keys(sauber).length;
    // c) Schritte
    const mitSchritt = skzSpecSaeubern({ s: [[40, 40, "g"]], schritte: [{ s: [[60, 60, "g"]], tor: [[10, 10, "h", 24]] }] });
    out.schritt = mitSchritt.schritte[0];

    // d) der Weg
    skzEditorOpen({ s: [[10, 10, "g", "Z"]] }, () => { });
    out.knopf = !!document.getElementById("skz-ki");
    out.knopfHoehe = Math.round((document.getElementById("skz-ki") || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height);
    skzKiOpen();
    out.fensterDa = !!document.getElementById("skz-ki-modal");
    out.textfeld = !!document.getElementById("skz-ki-text");
    out.diktatPasstZumGeraet = !!document.getElementById("skz-ki-mic") === skzKiDiktatMoeglich();
    return out;
  });

  if (r.fehlt) { await s.schliessen(); return h.ergebnis("Skizze: beschreiben statt tippen", false, [r.fehlt.join(", ") + " fehlt"]); }

  // d) zu kurzer Text sendet nichts
  const kurz = await s.page.evaluate(async () => {
    document.getElementById("skz-ki-text").value = "zu kurz";
    await skzKiLauf();
    return (document.getElementById("skz-ki-stand") || {}).textContent || "";
  });
  const rufeNachKurz = rufe;

  // e) der Lauf
  const lauf = await s.page.evaluate(async () => {
    document.getElementById("skz-ki-text").value = "Vier Hütchen in einer Reihe, ein Kind dribbelt im Slalom durch und schießt auf ein Minitor.";
    await skzKiLauf();
    await new Promise(x => setTimeout(x, 200));
    return {
      fensterZu: !document.getElementById("skz-ki-modal"),
      huetchen: (_skzSpec.h || []).length,
      huetchenGeklemmt: ((_skzSpec.h || [])[3] || [])[0],
      trainer: ((_skzSpec.ger || [])[0] || [])[2],
      nummern: (_skzSpec.p || []).map(e => e[5]),
      textOhneMarkup: (((_skzSpec.tx || [])[0] || [])[2] || ""),
      imBild: (document.getElementById("skz-buehne").innerHTML.match(/<circle/g) || []).length
    };
  });
  const nachUndo = await s.page.evaluate(() => { skzUndo(); return { s: JSON.stringify(_skzSpec.s), h: (_skzSpec.h || []).length }; });

  // f) keine Skizze zurück
  const ohne = await s.page.evaluate(async () => {
    const vorher = JSON.stringify(_skzSpec);
    skzKiOpen();
    document.getElementById("skz-ki-text").value = "Hier steht nichts Brauchbares über einen Aufbau drin.";
    await skzKiLauf();
    const stand = (document.getElementById("skz-ki-stand") || {}).textContent || "";
    const gleich = JSON.stringify(_skzSpec) === vorher;
    skzKiClose();
    return { stand, gleich };
  });

  // g) Zuschnitt des Trainers bleibt
  const hoch = await s.page.evaluate(async () => {
    skzLeeren(); if (!_skzHochkant()) skzFormat();
    skzKiOpen();
    document.getElementById("skz-ki-text").value = "Vier Hütchen in einer Reihe, ein Kind dribbelt im Slalom durch und schießt auf ein Minitor.";
    await skzKiLauf();
    await new Promise(x => setTimeout(x, 150));
    const B = _skzB(), H = _skzH();
    return {
      nochHoch: _skzHochkant(),
      drin: [...(_skzSpec.h || []), ...(_skzSpec.s || [])].every(e => e[0] <= B && e[1] <= H),
      viewBox: (document.getElementById("skz-buehne").querySelector("svg") || {}).getAttribute
        ? document.getElementById("skz-buehne").querySelector("svg").getAttribute("viewBox") : ""
    };
  });

  const geschrieben = s.gesendet.filter(x => /rest\/v1/.test(x.pfad));
  const fehler = s.fehler();
  await s.schliessen();

  // a)
  if (r.unbekannt && r.unbekannt.raketen) probleme.push("Eine unbekannte Liste überlebt die Grenze");
  if (String(r.geklemmt) !== "278,2,g") probleme.push(`Quer geklemmt auf ${r.geklemmt} statt 278,2,g`);
  if (String(r.geklemmtHoch) !== "178,270,g") probleme.push(`Hochkant geklemmt auf ${r.geklemmtHoch} statt 178,270,g`);
  if (/[<>]/.test(r.markup)) probleme.push(`Markup überlebt im Text: ${r.markup}`);
  if (r.farbe !== "g") probleme.push(`Eine erfundene Farbe wird übernommen: ${r.farbe}`);
  if (!(r.geraet.length === 1 && r.geraet[0][2] === "trainer")) probleme.push(`Geräte: ${JSON.stringify(r.geraet)} – nur bekannte Arten dürfen durch`);
  if (!r.leer) probleme.push("Eine leere Beschreibung ergibt nicht null");
  // b) + c)
  if (!r.bestand) probleme.push("Eine saubere Beschreibung wird durch die Grenze verändert");
  if (r.schritt && r.schritt.tor) probleme.push("Der Aufbau bleibt in einem weiteren Bild stehen");
  if (!(r.schritt && r.schritt.s)) probleme.push("Ein weiteres Bild verliert seine Spieler");
  // d)
  if (!r.knopf) probleme.push("Im Editor fehlt der Knopf zum Beschreiben");
  if ((r.knopfHoehe || 0) < 44) probleme.push(`Der Knopf ist ${r.knopfHoehe} px hoch`);
  if (!r.fensterDa || !r.textfeld) probleme.push("Das Fenster zum Beschreiben fehlt oder hat kein Textfeld");
  if (!r.diktatPasstZumGeraet) probleme.push("Der Diktat-Knopf steht auch dort, wo das Gerät nicht zuhören kann");
  if (!/beschreib/i.test(kurz)) probleme.push(`Ein zu kurzer Text sagt „${kurz}“`);
  if (rufeNachKurz !== 0) probleme.push(`Ein zu kurzer Text ruft trotzdem ${rufeNachKurz}× die Edge Function`);
  // e)
  if (!lauf.fensterZu) probleme.push("Das Fenster bleibt nach dem Übernehmen offen");
  if (lauf.huetchen !== 4) probleme.push(`${lauf.huetchen} Hütchen im Editor statt vier`);
  if (lauf.huetchenGeklemmt !== 278) probleme.push(`Das Hütchen bei x = 9999 landet auf ${lauf.huetchenGeklemmt} statt am Rand`);
  if (lauf.trainer !== "trainer") probleme.push("Die Trainerposition kommt nicht durch");
  if (String(lauf.nummern) !== "1,2") probleme.push(`Schrittnummern ${lauf.nummern} statt 1,2`);
  if (/[<>]/.test(lauf.textOhneMarkup)) probleme.push("Markup landet im Bild");
  if (!lauf.imBild) probleme.push("Die Zeichnung steht nicht auf der Bühne");
  if (nachUndo.h) probleme.push(`„Zurück“ lässt ${nachUndo.h} Hütchen stehen – der alte Stand kommt nicht wieder`);
  if (!/"Z"/.test(nachUndo.s)) probleme.push(`Nach „Zurück“ fehlt der vorherige Spieler: ${nachUndo.s}`);
  if (geschrieben.length) probleme.push(`In die Datenbank geschrieben: ${geschrieben.map(x => x.pfad).join(", ")} – das Ergebnis gehört in den Editor`);
  // f)
  if (!ohne.gleich) probleme.push("Ohne Skizze in der Antwort wird die vorhandene Zeichnung überschrieben");
  if (!/Aufbau|Hütchen/i.test(ohne.stand)) probleme.push(`Ohne Skizze sagt das Fenster „${ohne.stand}“ – es soll sagen, woran es lag`);
  // g)
  if (!hoch.nochHoch) probleme.push("Die gelieferte Zeichnung legt das hochkante Feld quer");
  if (!hoch.drin) probleme.push("Im hochkanten Feld liegt die gelieferte Zeichnung außerhalb");
  if (hoch.viewBox !== "0 0 180 280") probleme.push(`Im hochkanten Feld steht das Bild auf „${hoch.viewBox}“`);
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);

  if (!probleme.length) {
    zeilen.push(`Grenze: unbekannte Listen und Arten fallen weg, x = 9999 → ${r.geklemmt[0]} (quer) und ${r.geklemmtHoch[0]} (hochkant), Markup raus, Farbe → ${r.farbe}`);
    zeilen.push("Eine saubere Beschreibung bleibt Zeichen für Zeichen gleich · im weiteren Bild bleibt nur Bewegliches");
    zeilen.push(`Im Editor: Knopf ${r.knopfHoehe} px, Fenster mit Textfeld${r.diktatPasstZumGeraet ? " und passendem Diktat-Angebot" : ""} · zu kurzer Text sendet nichts`);
    zeilen.push(`Lauf: 4 Hütchen, Trainerposition, Nummern ${lauf.nummern.join("/")} · „Zurück“ holt den alten Stand · nichts in die Datenbank`);
    zeilen.push(`Ohne Skizze bleibt die alte stehen · im hochkanten Feld kommt die Zeichnung gedreht an (${hoch.viewBox})`);
  }
  return h.ergebnis("Skizze: beschreiben statt tippen", !probleme.length, zeilen.concat(probleme));
};
