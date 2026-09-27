/* v510 – PO (mit Bildschirmfoto vom Taktikboard): „Im Taktik-Board sind [ein Kind] und Testkind noch
   drin, rausnehmen. Insgesamt ist die Taktik-Seite optisch bei den Kacheln nicht schön und
   nicht optimal aufgeteilt. Und der Pro-Modus ist am Handy nicht darstellbar – ist er fürs
   Tablet gedacht?"
   Drei Dinge, eine Seite:
   1. Der Kader kennt seit v482 ein `aktiv`-Kennzeichen. Elf Stellen fragen es ab, die
      NAMENSLISTEN fragten es nicht (`KADER.map(k=>k.name)`) – deshalb standen zwei aus dem
      Betrieb genommene Kinder weiter auf dem Feld, auf der Bank und in der fairen Verteilung.
   2. Der Kopf der Seite waren drei Beschriftungen mit drei umbrechenden Knopfreihen, elf
      Knoepfe hoch; das Feld begann erst darunter. Jetzt eine Karte, das Seltene zugeklappt.
   3. Der Pro-Modus hatte eine feste 280-px-Bank NEBEN dem Feld – am Handy passt das nicht.
      Jetzt einspaltig am Handy, zweispaltig ab Tablet.
   Der Pro-Modus wird bei 390 px gemessen: nichts darf breiter sein als der Bildschirm.
   v641: Kopf und Pro-Modus sind mit dem alten Brett aus dem Trainerbereich entfallen (die
   Spielsituationen zeichnen auf der Skizzen-Fläche, Vollbild und „Kinder einsetzen“ liegen in
   deren Großansicht). Geprüft bleibt Punkt 1 – das Brett, das jetzt nur noch das Kinder-Quiz
   nutzt, und die Namenslisten kennen nur aktive Kinder. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const raus = [h.KINDER[3], h.KINDER[4]];          // zwei Feldspieler; der Torhüter (KINDER[0]) bleibt dabei
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen({ inaktiv: raus }) }), hoehe: 1600 });
  const r = await s.page.evaluate(async ({ raus }) => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    if (typeof kaderNamen !== "function") return { fehlt: "kaderNamen" };
    await loadKader();
    const kader = { gesamt: KADER.length, aktiv: kaderNamen().length, drin: kaderNamen().filter(n => raus.includes(n)) };
    taktikSetFormation("4+1"); await warte(120);
    const board = { feld: tbField.map(p => p.name), bank: tbBench.slice() };
    const boardRaus = board.feld.concat(board.bank).filter(n => raus.includes(n));
    const alt = { pro: typeof taktikProToggle, kopf: !!document.querySelector("#view-taktik .tb-kopf") };
    return { kader, board, boardRaus, alt };
  }, { raus });
  const fehler = s.fehler(); await s.schliessen();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt`); return h.ergebnis("Taktik-Brett", false, probleme); }
  if (r.kader.aktiv !== r.kader.gesamt - raus.length) probleme.push(`kaderNamen liefert ${r.kader.aktiv} von ${r.kader.gesamt} – erwartet ${r.kader.gesamt - raus.length}`);
  if (r.kader.drin.length) probleme.push(`kaderNamen nennt stillgelegte Kinder: ${r.kader.drin.join(", ")}`);
  if (r.boardRaus.length) probleme.push(`Auf dem Brett stehen noch Kinder, die nicht mehr dabei sind: ${r.boardRaus.join(", ")}`);
  if (r.board.feld.length !== 5) probleme.push(`Die 4+1-Aufstellung steht mit ${r.board.feld.length} Kindern auf dem Feld statt mit 5 (Torhüter dabei?)`);
  if (r.board.feld[0] !== h.KINDER[0]) probleme.push(`Im Tor steht „${r.board.feld[0]}“ statt des Torhüters „${h.KINDER[0]}“`);
  if (r.alt.pro !== "undefined" || r.alt.kopf) probleme.push("v641: Kopf oder Pro-Modus des alten Bretts sind noch da");
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Kader: ${r.kader.aktiv} von ${r.kader.gesamt} aktiv · Feld ${r.board.feld.join(", ")} · Bank ${r.board.bank.length} · stillgelegte dabei ${r.boardRaus.length}`);
  return h.ergebnis("Taktik-Brett: nur aktive Kinder (Kopf und Pro-Modus seit v641 entfallen)", !probleme.length, zeilen.concat(probleme));
};
