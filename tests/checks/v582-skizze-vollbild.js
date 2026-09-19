/* v582 – Vollbild für die Großansicht.

   PO am 19.09., auf die Frage nach Vollbild- und Tablet-Modus: „Ja, bau das Vollbild ein."

   „Groß zeigen" füllte den Bildschirm schon – aber nur den Teil, den der Browser freigibt.
   Auf dem Tablet an der Linie stehen darüber und darunter Browser- und Systemleiste und
   nehmen der Zeichnung die Höhe, die sie am nötigsten braucht. Dieselbe Mechanik wie im
   Taktikboard seit v17.4: die Fullscreen-API.

   Fälle:
   a) Der Knopf steht in der Großansicht, trägt 56 px wie seine Nachbarn und sagt, wohin
      der Tipp führt.
   b) Ein echter Tipp schaltet das Vollbild ein: `document.fullscreenElement` ist gesetzt
      und der Knopf schlägt um. Dass die Zeichnung die gewonnene Höhe NUTZT, lässt sich im
      Prüfstand nicht am Vollbild zeigen – dort ist das Fenster schon der ganze Bildschirm,
      es gibt nichts zu gewinnen. Geprüft wird deshalb die Kopplung selbst: Ändert sich die
      verfügbare Höhe, misst sich das Bild neu. Genau das ist es, was am Tablet wirkt.
   c) Ein zweiter Tipp schaltet es wieder aus.
   d) Die Systemgeste (ESC) zieht den Knopf mit – sonst stünde er auf „an", während längst
      nichts mehr im Vollbild ist.
   e) Schließen verlässt das Vollbild; niemand bleibt auf einem leeren schwarzen Bild.
   f) Wo das Gerät es nicht kann, erscheint der Knopf gar nicht – ein Knopf, der nichts
      tut, ist schlechter als keiner.
   g) Ein abgelehnter Wunsch legt den Knopf nicht um: gemeldet wird, was wirklich geschah. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const UEBUNG = {
    name: "Probe", dauer: "10", kat: "technik",
    skizze: { s: [[40, 40, "g", "A"], [120, 90, "r"]], h: [[95, 90, "y"]], tor: [[240, 72, "v", 36]], p: [[54, 84, 92, 78, "d"]] }
  };

  const s = await h.starten({ breite: 900, hoehe: 700, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });

  const vorbereitet = await s.page.evaluate(({ UEBUNG }) => {
    const fehlt = ["skzGrossOpen", "skzVollbildMoeglich", "skzGrossVollbild", "skzVollbildAn"].filter(n => typeof window[n] !== "function");
    if (fehlt.length) return { fehlt };
    window.tpAllForms = () => [UEBUNG];
    skzGrossOpen(0);
    const k = document.getElementById("skz-gross-voll");
    return {
      moeglich: skzVollbildMoeglich(),
      da: !!k,
      text: k ? k.textContent.trim() : "",
      hoehe: k ? Math.round(k.getBoundingClientRect().height) : 0,
      titel: k ? (k.getAttribute("title") || "") : "",
      gedrueckt: k ? k.getAttribute("aria-pressed") : "",
      halterVor: Math.round((document.getElementById("skz-gross-halter") || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height)
    };
  }, { UEBUNG });

  if (vorbereitet.fehlt) { await s.schliessen(); return h.ergebnis("Skizze: Vollbild", false, [vorbereitet.fehlt.join(", ") + " fehlt"]); }

  /* b) + c) Ein ECHTER Klick – nur der zählt als Nutzergeste, und ohne Geste weist der
     Browser das Vollbild ab. Gemessen wird danach am Dokument, nicht an unserer Absicht. */
  let an = {}, aus = {};
  if (vorbereitet.da) {
    await s.page.click("#skz-gross-voll");
    await s.page.waitForTimeout(350);
    an = await s.page.evaluate(() => ({
      imVollbild: !!document.fullscreenElement,
      text: (document.getElementById("skz-gross-voll") || {}).textContent ? document.getElementById("skz-gross-voll").textContent.trim() : "",
      gedrueckt: (document.getElementById("skz-gross-voll") || {}).getAttribute ? document.getElementById("skz-gross-voll").getAttribute("aria-pressed") : "",
      halter: Math.round((document.getElementById("skz-gross-halter") || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height)
    }));
    await s.page.click("#skz-gross-voll");
    await s.page.waitForTimeout(350);
    aus = await s.page.evaluate(() => ({
      imVollbild: !!document.fullscreenElement,
      text: document.getElementById("skz-gross-voll").textContent.trim()
    }));
  }

  /* b2) Die Kopplung: mehr Höhe heißt größeres Bild. Im Prüfstand gewinnt das Vollbild
     keine Fläche (das Fenster IST der Bildschirm), also wird das Fenster selbst größer
     gemacht – dieselbe Rechnung, die am Tablet die Leisten freigeben. */
  const kleinerHalter = await s.page.evaluate(() => Math.round(document.getElementById("skz-gross-halter").getBoundingClientRect().height));
  await s.page.setViewportSize({ width: 900, height: 1000 });
  await s.page.waitForTimeout(250);
  const groesserHalter = await s.page.evaluate(() => Math.round(document.getElementById("skz-gross-halter").getBoundingClientRect().height));

  // d) Systemgeste: das Ereignis entscheidet, nicht der Knopf
  const nachGeste = await s.page.evaluate(async () => {
    const k = document.getElementById("skz-gross-voll");
    const echt = Object.getOwnPropertyDescriptor(Document.prototype, "fullscreenElement");
    Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => document.documentElement });
    document.dispatchEvent(new Event("fullscreenchange"));
    const anText = k.textContent.trim();
    Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => null });
    document.dispatchEvent(new Event("fullscreenchange"));
    const ausText = k.textContent.trim();
    delete document.fullscreenElement;
    if (echt) Object.defineProperty(document, "fullscreenElement", echt);
    return { anText, ausText };
  });

  // g) Ein abgelehnter Wunsch legt den Knopf nicht um
  const abgelehnt = await s.page.evaluate(() => {
    const e = document.documentElement, echt = e.requestFullscreen;
    e.requestFullscreen = () => Promise.reject(new Error("abgelehnt"));
    skzGrossVollbild();
    const text = document.getElementById("skz-gross-voll").textContent.trim();
    e.requestFullscreen = echt;
    return { text, imVollbild: !!document.fullscreenElement };
  });

  // e) Schließen verlässt das Vollbild
  const beimSchliessen = await s.page.evaluate(() => {
    let verlassen = 0;
    const echtExit = document.exitFullscreen;
    Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => document.documentElement });
    document.exitFullscreen = () => { verlassen++; return Promise.resolve(); };
    skzGrossClose();
    document.exitFullscreen = echtExit;
    delete document.fullscreenElement;
    return { verlassen, zu: !document.getElementById("skz-gross-modal") };
  });

  // f) Ohne Unterstützung kein Knopf
  const ohne = await s.page.evaluate(({ UEBUNG }) => {
    const e = document.documentElement;
    const req = e.requestFullscreen, wreq = e.webkitRequestFullscreen;
    e.requestFullscreen = undefined; e.webkitRequestFullscreen = undefined;
    const moeglich = skzVollbildMoeglich();
    window.tpAllForms = () => [UEBUNG];
    skzGrossOpen(0);
    const da = !!document.getElementById("skz-gross-voll");
    const andere = !!document.getElementById("skz-gross-hell");
    skzGrossClose();
    e.requestFullscreen = req; e.webkitRequestFullscreen = wreq;
    return { moeglich, da, andere };
  }, { UEBUNG });

  const fehler = s.fehler();
  await s.schliessen();

  // a)
  if (!vorbereitet.moeglich) probleme.push("Der Prüfstand meldet kein Vollbild – dann prüft dieser Fall nichts");
  if (!vorbereitet.da) probleme.push("In der Großansicht fehlt der Vollbild-Knopf");
  if (!/Vollbild/.test(vorbereitet.text)) probleme.push(`Der Knopf sagt „${vorbereitet.text}“`);
  if (vorbereitet.hoehe < 56) probleme.push(`Der Knopf ist ${vorbereitet.hoehe} px hoch – in der Großansicht tragen die Knöpfe 56 px`);
  if (!vorbereitet.titel) probleme.push("Der Knopf sagt nicht, wozu er gut ist");
  if (vorbereitet.gedrueckt !== "false") probleme.push(`aria-pressed steht anfangs auf „${vorbereitet.gedrueckt}“`);
  // b) + c)
  if (!an.imVollbild) probleme.push("Ein Tipp schaltet das Vollbild nicht ein");
  else {
    if (!/beenden/i.test(an.text || "")) probleme.push(`Im Vollbild sagt der Knopf „${an.text}“`);
    if (an.gedrueckt !== "true") probleme.push(`Im Vollbild steht aria-pressed auf „${an.gedrueckt}“`);

    if (aus.imVollbild) probleme.push("Ein zweiter Tipp verlässt das Vollbild nicht");
    if (aus.text && /beenden/i.test(aus.text)) probleme.push(`Nach dem Verlassen sagt der Knopf weiter „${aus.text}“`);
  }
  // b2)
  if (!(groesserHalter > kleinerHalter)) probleme.push(`Mehr Höhe ändert nichts: Zeichnung bleibt bei ${groesserHalter} px (vorher ${kleinerHalter} px) – im Vollbild bliebe die gewonnene Fläche ungenutzt`);
  // d)
  if (!/beenden/i.test(nachGeste.anText)) probleme.push(`Nach dem Vollbild-Ereignis sagt der Knopf „${nachGeste.anText}“`);
  if (/beenden/i.test(nachGeste.ausText)) probleme.push("Die Systemgeste zieht den Knopf nicht mit – er steht auf „an“, obwohl das Vollbild weg ist");
  // g)
  if (/beenden/i.test(abgelehnt.text)) probleme.push("Ein abgelehnter Wunsch legt den Knopf trotzdem um");
  // e)
  if (!beimSchliessen.verlassen) probleme.push("Schließen lässt das Vollbild stehen");
  if (!beimSchliessen.zu) probleme.push("Die Großansicht schließt nicht");
  // f)
  if (ohne.moeglich) probleme.push("Ohne Unterstützung meldet die App trotzdem Vollbild");
  if (ohne.da) probleme.push("Ohne Unterstützung steht der Knopf trotzdem da");
  if (!ohne.andere) probleme.push("Ohne Vollbild fehlen auch die übrigen Knöpfe – nur der Vollbild-Knopf darf entfallen");
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);

  if (!probleme.length) {
    zeilen.push(`Knopf: „${vorbereitet.text}“, ${vorbereitet.hoehe} px, mit Erklärung`);
    zeilen.push(`Tipp schaltet ein, zweiter Tipp wieder aus · mehr Höhe → Zeichnung ${kleinerHalter} → ${groesserHalter} px`);
    zeilen.push("Systemgeste zieht den Knopf mit · ein abgelehnter Wunsch nicht · Schließen verlässt das Vollbild");
    zeilen.push("Ohne Unterstützung des Geräts erscheint der Knopf gar nicht, die übrigen bleiben");
  }
  return h.ergebnis("Skizze: Vollbild", !probleme.length, zeilen.concat(probleme));
};
