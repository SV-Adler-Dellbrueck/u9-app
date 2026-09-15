/* v564 – Die Kachel „Anwesenheit" auf der Spieltag-Seite führte zum Training.

   Sie rief `go("anwesenheit")` – und diese Liste zeigt seit v477 bewusst nur
   Trainingstermine („ein Ort je Termintyp"). Wer vom Spieltag kam, landete also bei der
   Anwesenheit des nächsten Trainings und konnte für das Spiel nichts sehen und nichts
   ändern.

   Gebaut war die Spieltags-Anwesenheit längst: sie heißt „Wer ist dabei?" und steht im
   Match unter „Teams festlegen" – „Dabei" IST die Anwesenheit dieses Spieltags und zählt
   für die Spiele-Quote. Nur klappt der Block zu, sobald jemand dabei ist; von einer Kachel
   aus war er nicht zu finden.

   Fälle:
   a) Die Kachel ruft den neuen Weg, nicht mehr die Trainingsliste.
   b) Der Weg landet auf der Spieltag-Seite und klappt beides auf: „Teams festlegen" und
      die Liste „Wer ist dabei?".
   c) In der Liste steht je Kind Dabei / Nicht / Verletzt, antippbar mit 44 px.
   d) Die Trainings-Kachel führt weiterhin zur Trainingsliste — die beiden Anwesenheiten
      bleiben getrennt, das ist die Entscheidung aus v477.
   e) Mehrere Kinder nacheinander: Jeder Tipp zeichnet die Liste neu, und dabei entschied
      bisher allein die Zahl der Dabei-Kinder über „offen". Nach dem ERSTEN Kind klappte
      der Block also zu, und für jedes weitere musste man ihn neu aufziehen. Der Prüffall
      setzt drei Kinder hintereinander und verlangt, dass die Liste dabei offen bleibt. */
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const heute = h.heute();

  const s = await h.starten({ hoehe: 1600, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    termine: [
      { id: 1, datum: heute, typ: "turnier", uhrzeit: "10:00", gegner: "Gegner A", titel: "Kinderfestival A", trainer_status: {} },
      { id: 2, datum: h.tagePlus(3), typ: "training", uhrzeit: "16:45", trainer_status: {} }
    ]
  }) });

  // ── a) + d) Wohin die beiden Kacheln zeigen ───────────────────────────────
  const kacheln = await s.page.evaluate(() => {
    if (typeof _kachelInhalt !== "function") return { fehlt: "_kachelInhalt" };
    return { spieltag: _kachelInhalt("spieltag"), training: _kachelInhalt("training") };
  });
  if (kacheln.fehlt) probleme.push(kacheln.fehlt + " fehlt");
  else {
    if (!/spieltagAnwesenheitOpen/.test(kacheln.spieltag)) probleme.push("Die Spieltag-Kachel ruft nicht den Weg zur Spieltags-Anwesenheit");
    if (/kachelRun\('go','anwesenheit'\)/.test(kacheln.spieltag)) probleme.push("Die Spieltag-Kachel führt weiterhin zur Anwesenheit des Trainings");
    if (!/kachelRun\('go','anwesenheit'\)/.test(kacheln.training)) probleme.push("Die Trainings-Kachel führt nicht mehr zur Trainingsliste – die beiden Anwesenheiten müssen getrennt bleiben");
  }

  // ── b) + c) Der Weg selbst ────────────────────────────────────────────────
  const offen = await s.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    if (typeof spieltagAnwesenheitOpen !== "function") return { fehlt: "spieltagAnwesenheitOpen" };
    spieltagAnwesenheitOpen();
    await warte(900);
    const seite = document.getElementById("train-sub-spieltag");
    return {
      fehlt: null,
      seiteGewaehlt: seite ? !seite.hasAttribute("hidden") && seite.style.display !== "none" : false,
      vorOffen: (document.getElementById("mt-phase-vor") || {}).open === true,
      listeOffen: (document.getElementById("nom-dabei") || {}).open === true
    };
  });

  /* Gemessen wird erst, wenn der Baum wirklich sichtbar ist: im Prüfstand hängt die Seite
     unter einer Ansicht, die ohne Anmeldung ausgeblendet bleibt, und in einem
     ausgeblendeten Baum ist jeder Knopf 0 px hoch – das sagt nichts über seine Größe. */
  await h.sichtbarMachen(s.page, "#train-sub-spieltag");
  const weg = await s.page.evaluate(async () => {
    const seite = document.getElementById("train-sub-spieltag");
    const knoepfe = [...document.querySelectorAll("#nom-panel button")]
      .filter(b => /^(Dabei|Nicht|Verletzt)$/.test(b.textContent.trim()));
    const hoehen = knoepfe.map(b => Math.round(b.getBoundingClientRect().height));

    return {
      seiteSichtbar: seite ? getComputedStyle(seite).display !== "none" : false,
      knoepfe: knoepfe.length,
      minHoehe: hoehen.length ? Math.min(...hoehen) : 0,
      beschriftung: [...new Set(knoepfe.map(b => b.textContent.trim()))].sort().join(",")
    };
  });

  if (offen.fehlt) probleme.push(offen.fehlt + " fehlt");
  else {
    if (!offen.vorOffen) probleme.push("„Teams festlegen“ ist nicht aufgeklappt");
    if (!offen.listeOffen) probleme.push("Die Liste „Wer ist dabei?“ ist nicht aufgeklappt – zugeklappt ist sie von der Kachel aus nicht zu finden");
    if (!weg.seiteSichtbar) probleme.push("Der Weg landet nicht auf der Spieltag-Seite");
    if (weg.knoepfe < K.length * 3) probleme.push(`${weg.knoepfe} Knöpfe für ${K.length} Kinder – erwartet drei je Kind (Dabei, Nicht, Verletzt)`);
    if (weg.beschriftung !== "Dabei,Nicht,Verletzt") probleme.push(`Die Auswahl je Kind heißt „${weg.beschriftung}“`);
    if (weg.minHoehe < 44) probleme.push(`Ein Knopf ist ${weg.minHoehe} px hoch – gefordert 44`);
    if (!probleme.length) zeilen.push(`Spieltags-Anwesenheit: Seite offen, beide Blöcke aufgeklappt, ${weg.knoepfe} Knöpfe à ${weg.minHoehe} px`);
  }

  // ── e) Drei Kinder nacheinander, ohne die Liste neu aufzuziehen ───────────
  const nacheinander = await s.page.evaluate(async ({ K }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    if (typeof nomSet !== "function") return { fehlt: "nomSet" };
    const offen = [];
    for (const name of K.slice(0, 3)) {
      nomSet(name, "dabei");
      await warte(60);
      offen.push((document.getElementById("nom-dabei") || {}).open === true);
    }
    const dabei = K.slice(0, 3).filter(n => nomStatus[n] === "dabei").length;
    /* Gegenprobe: von Hand zugeklappt bleibt sie auch nach dem nächsten Tipp zu –
       die Liste folgt dem Trainer, nicht der Zahl der Dabei-Kinder. */
    const d = document.getElementById("nom-dabei"); if (d) d.open = false;
    nomSet(K[3], "dabei");
    await warte(60);
    const bleibtZu = (document.getElementById("nom-dabei") || {}).open === false;
    return { offen, dabei, bleibtZu };
  }, { K });

  if (nacheinander.fehlt) probleme.push(nacheinander.fehlt + " fehlt");
  else {
    if (nacheinander.offen.some(x => !x)) probleme.push(`Die Liste klappt beim Antippen zu (offen nach je einem Tipp: ${nacheinander.offen.join(", ")}) – dann lässt sich kein zweites Kind setzen`);
    if (nacheinander.dabei !== 3) probleme.push(`${nacheinander.dabei} von 3 Kindern stehen auf „Dabei“`);
    if (!nacheinander.bleibtZu) probleme.push("Eine von Hand zugeklappte Liste geht beim nächsten Tipp wieder auf");
    if (!probleme.length) zeilen.push("Mehrere Kinder nacheinander: Liste bleibt offen, von Hand zugeklappt bleibt sie zu");
  }

  const fehler = s.fehler();
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);
  await s.schliessen();

  return h.ergebnis("Spieltag: die Kachel „Anwesenheit“ führt zur Spieltags-Anwesenheit", !probleme.length, zeilen.concat(probleme));
};
