/* v472 – Rundgang, Paket „Startseite entdoppeln": dieselben Termine standen dreimal auf der
   Startseite („Bist du dabei?", „Diese Woche", Termin-Karussell) und das Karussell noch
   einmal auf der Termine-Seite; „N ohne deine Antwort" stand zweimal; „Bewertung
   ueberfaellig" dreimal; die untere Leiste zeigte am Handy sieben Icons ohne Wort.
   Geprueft: Karussell weg (beide Seiten), Zahl aus der „Alle Termine"-Zeile raus,
   Pinnwand ohne „ueberfaellig", Leiste beschriftet (Wort sichtbar, lesbar gross). */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const t1 = h.tagePlus(1), t2 = h.tagePlus(3), t3 = h.tagePlus(5);
  const termine = [
    { id: 1, datum: t1, typ: "training", uhrzeit: "16:45", trainer_status: {} },
    { id: 2, datum: t2, typ: "spiel", titel: "Testspiel", uhrzeit: "10:15", heim: true, trainer_status: {} },
    { id: 3, datum: t3, typ: "training", uhrzeit: "16:45", trainer_status: {} }
  ];
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, profiles: [{ name: "Charles", rolle: "trainer" }] }), hoehe: 1600 });
  await h.sichtbarMachen(s.page, "#home-content");
  const r = await s.page.evaluate(async () => {
    await loadKader(); window.trainerMe = async () => "Charles";
    document.getElementById("pin-gate")?.remove();
    const m = document.getElementById("main-app"); if (m) { m.style.display = ""; if (getComputedStyle(m).display === "none") m.style.display = "block"; }
    go("home"); await new Promise(r => setTimeout(r, 900));
    const home = (document.getElementById("home-content") || document.body).textContent.replace(/\s+/g, " ");
    const alle = [...document.querySelectorAll("button")].map(b => (b.textContent || "").replace(/\s+/g, " ").trim()).find(t => /^🗓️ Alle \d+ Termine/.test(t)) || "";
    // Leiste
    const span = document.querySelector("#main-nav .nb span");
    const cs = span ? getComputedStyle(span) : null;
    const woerter = [...document.querySelectorAll("#main-nav .nb span")].map(x => x.textContent.trim());
    // Termine-Seite
    go("termine"); await new Promise(r => setTimeout(r, 900));
    const termineSeite = (document.getElementById("train-sub-termine") || document.body).textContent.replace(/\s+/g, " ");
    // Pinnwand
    go("team"); await new Promise(r => setTimeout(r, 700));
    const pinnwand = (document.getElementById("team-stats") || { textContent: "" }).textContent.replace(/\s+/g, " ");
    return { homeKarussell: !!document.getElementById("home-carousel") || /Nächste Termine · wischen/i.test(home),
      alle, leisteSichtbar: cs ? cs.display !== "none" : false, leisteGroesse: cs ? parseFloat(cs.fontSize) : 0, woerter,
      termineKarussell: !!document.getElementById("tm-carousel") || /wischen & antippen/i.test(termineSeite),
      pinnwand, karussellFn: typeof tmCarouselHtml };
  });
  const fehler = s.fehler(); await s.schliessen();
  if (r.homeKarussell) probleme.push("Startseite zeigt noch das Termin-Karussell");
  if (r.termineKarussell) probleme.push("Termine-Seite zeigt noch das Karussell über der Liste");
  if (r.karussellFn !== "undefined") probleme.push("tmCarouselHtml existiert noch (toter Code)");
  if (!r.alle) probleme.push("„Alle N Termine“-Knopf fehlt");
  else if (/ohne deine Antwort/.test(r.alle)) probleme.push(`„Alle Termine“-Zeile wiederholt die Zahl: „${r.alle}“`);
  if (!r.leisteSichtbar) probleme.push("Leiste: Beschriftung am Handy versteckt");
  if (r.leisteGroesse < 10) probleme.push(`Leiste: Beschriftung nur ${r.leisteGroesse}px (mindestens 10)`);
  if (r.woerter.length !== 7) probleme.push(`Leiste: ${r.woerter.length} Wörter statt 7: ${JSON.stringify(r.woerter)}`);
  if (/überfällig/i.test(r.pinnwand)) probleme.push("Pinnwand zeigt weiter „Bewertung überfällig“ (dritte Stelle)");
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Karussell Home ${r.homeKarussell} · Termine ${r.termineKarussell} · Funktion ${r.karussellFn}`);
  zeilen.push(`„${r.alle}“ · Leiste ${r.woerter.join("/")} @ ${r.leisteGroesse}px sichtbar ${r.leisteSichtbar}`);
  zeilen.push(`Pinnwand: „${r.pinnwand.slice(0, 80)}“`);
  return h.ergebnis("Startseite entdoppelt: kein Karussell, eine Zahl, beschriftete Leiste", !probleme.length, zeilen.concat(probleme));
};
