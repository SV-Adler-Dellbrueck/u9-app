/* v510 – PO (mit Bildschirmfoto vom Taktikboard): „Im Taktik-Board sind Lukas und Testkind noch
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
   Der Pro-Modus wird bei 390 px gemessen: nichts darf breiter sein als der Bildschirm. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const raus = [h.KINDER[3], h.KINDER[4]];          // zwei Feldspieler; der Torhüter (KINDER[0]) bleibt dabei
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen({ inaktiv: raus }) }), hoehe: 1600 });
  await h.sichtbarMachen(s.page, "#view-taktik");
  const r = await s.page.evaluate(async ({ raus }) => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    if (typeof kaderNamen !== "function") return { fehlt: "kaderNamen" };
    await loadKader();
    const kader = { gesamt: KADER.length, aktiv: kaderNamen().length, drin: kaderNamen().filter(n => raus.includes(n)) };
    // 1) Aufstellung und Bank kennen nur noch die aktiven Kinder
    taktikSetFormation("4+1"); await warte(120);
    const board = { feld: tbField.map(p => p.name), bank: tbBench.slice() };
    const boardRaus = board.feld.concat(board.bank).filter(n => raus.includes(n));
    // 2) Der Kopf: eine Karte, Spielformen als gleich breite Kacheln, Rest zugeklappt
    const kopf = document.querySelector("#view-taktik .tb-kopf");
    const formBtns = [...document.querySelectorAll("#view-taktik .tb-formen .tb-form-btn")];
    const breiten = formBtns.map(b => Math.round(b.getBoundingClientRect().width));
    const details = document.querySelector("#view-taktik .tb-mehr");
    const mehrTexte = details ? [...details.querySelectorAll("button")].map(b => b.textContent.trim()) : [];
    const sichtbarOhneMehr = [...document.querySelectorAll("#view-taktik .tb-kopf button")]
      .filter(b => !details || !details.contains(b)).map(b => b.textContent.trim());
    const summary = details ? details.querySelector("summary") : null;
    const feldOben = Math.round(document.querySelector("#view-taktik .tb-field").getBoundingClientRect().top);
    // 3) Pro-Modus am Handy
    document.documentElement.requestFullscreen = () => Promise.resolve();
    taktikProToggle(); await warte(150);
    const feld = document.querySelector("#view-taktik .tb-field").getBoundingClientRect();
    const exit = document.getElementById("tb-pro-exit");
    const bank = document.querySelector("#view-taktik .tb-bench-area");
    /* Was in einem seitlich scrollbaren Kasten steht (die Bank ist ein Streifen), darf
       breiter sein – es laesst sich ja schieben. Alles andere nicht. */
    const imScroller = e => { for (let x = e.parentElement; x && x.id !== "view-taktik"; x = x.parentElement)
      if (/auto|scroll/.test(getComputedStyle(x).overflowX)) return true; return false; };
    const breiter = [...document.querySelectorAll("#view-taktik *")]
      .filter(e => e.getBoundingClientRect().right > window.innerWidth + 1 && !imScroller(e))
      .map(e => (e.id || e.className || e.tagName) + " bis " + Math.round(e.getBoundingClientRect().right));
    const pro = {
      an: document.body.classList.contains("taktik-pro"),
      feldBreite: Math.round(feld.width), fensterBreite: window.innerWidth,
      kopfWeg: !kopf || getComputedStyle(kopf).display === "none",
      exitSichtbar: !!exit && getComputedStyle(exit).display !== "none" && Math.round(exit.getBoundingClientRect().height) >= 44,
      bankRichtung: bank ? getComputedStyle(bank).flexDirection : null,
      breiter: breiter.slice(0, 3)
    };
    taktikProToggle(); await warte(120);
    const zurueck = { proAus: !document.body.classList.contains("taktik-pro"), kopfDa: !!kopf && getComputedStyle(kopf).display !== "none" };
    return { kader, board, boardRaus, breiten, mehrTexte, sichtbarOhneMehr, mehrOffen: details ? details.open : null,
      summaryHoehe: summary ? Math.round(summary.getBoundingClientRect().height) : 0, feldOben, pro, zurueck };
  }, { raus });
  const fehler = s.fehler(); await s.schliessen();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt`); return h.ergebnis("Taktik-Seite", false, probleme); }

  /* Am Tablet: Feld links, Bank rechts. Das Feld bekam dort seine HÖHE vorgegeben und die
     Breite aus dem Seitenverhältnis – bei 820x1000 wurde es damit breiter als seine Spalte
     und schob sich unter die Bank. Am Handy war davon nichts zu sehen. Deshalb zweite
     Messung in Tablet-Breite. */
  const t = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }), breite: 820, hoehe: 1000 });
  await h.sichtbarMachen(t.page, "#view-taktik");
  const tab = await t.page.evaluate(async () => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    await loadKader(); taktikSetFormation("4+1");
    document.documentElement.requestFullscreen = () => Promise.resolve();
    taktikProToggle(); await warte(150);
    const feld = document.querySelector("#view-taktik .tb-field").getBoundingClientRect();
    const seite = document.querySelector("#view-taktik .tb-side").getBoundingClientRect();
    const bank = document.querySelector("#view-taktik .tb-bench-area");
    return { spalten: getComputedStyle(document.querySelector("#view-taktik .tb-wrap")).gridTemplateColumns,
      feldRechts: Math.round(feld.right), seiteLinks: Math.round(seite.left), feldLinks: Math.round(feld.left),
      bankRichtung: bank ? getComputedStyle(bank).flexDirection : null };
  });
  const tabFehler = t.fehler(); await t.schliessen();
  if (tab.feldRechts > tab.seiteLinks) probleme.push(`Am Tablet läuft das Feld unter die Bank (Feld bis ${tab.feldRechts}, Bank ab ${tab.seiteLinks})`);
  if (tab.feldLinks < 0) probleme.push(`Am Tablet steht das Feld links außerhalb (${tab.feldLinks})`);
  if (tab.bankRichtung !== "column") probleme.push(`Am Tablet steht die Bank als ${tab.bankRichtung} statt als Spalte`);
  if (tabFehler.length) probleme.push(...tabFehler.slice(0, 2));

  if (r.kader.aktiv !== r.kader.gesamt - raus.length) probleme.push(`kaderNamen liefert ${r.kader.aktiv} von ${r.kader.gesamt} – erwartet ${r.kader.gesamt - raus.length}`);
  if (r.kader.drin.length) probleme.push(`kaderNamen nennt stillgelegte Kinder: ${r.kader.drin.join(", ")}`);
  if (r.boardRaus.length) probleme.push(`Auf dem Taktikboard stehen noch Kinder, die nicht mehr dabei sind: ${r.boardRaus.join(", ")}`);
  if (r.board.feld.length !== 5) probleme.push(`Die 4+1-Aufstellung steht mit ${r.board.feld.length} Kindern auf dem Feld statt mit 5 (Torhüter dabei?)`);
  if (r.board.feld[0] !== h.KINDER[0]) probleme.push(`Im Tor steht „${r.board.feld[0]}“ statt des Torhüters „${h.KINDER[0]}“`);

  if (!r.breiten.length) probleme.push("Die Spielform-Knöpfe stehen nicht mehr in der Kopfkarte");
  else if (Math.max(...r.breiten) - Math.min(...r.breiten) > 2) probleme.push(`Die Spielform-Knöpfe sind unterschiedlich breit: ${r.breiten.join(" / ")}`);
  if (r.mehrOffen !== false) probleme.push("„Mehr“ ist nicht zugeklappt");
  if (r.summaryHoehe < 44) probleme.push(`Der Aufklapper „Mehr“ ist nur ${r.summaryHoehe} px hoch (mindestens 44)`);
  ["Bibliothek", "KI-Coach", "Video", "Speichern", "Leeres Feld"].forEach(t => {
    if (!r.mehrTexte.some(x => x.includes(t))) probleme.push(`„${t}“ steht nicht unter „Mehr“`);
  });
  ["Zeichnen", "Teilen", "Pro-Modus"].forEach(t => {
    if (!r.sichtbarOhneMehr.some(x => x.includes(t))) probleme.push(`„${t}“ ist nicht mehr ohne Umweg erreichbar`);
  });
  if (r.sichtbarOhneMehr.length > 8) probleme.push(`Der Kopf zeigt weiterhin ${r.sichtbarOhneMehr.length} Knöpfe auf einmal`);

  const p = r.pro;
  if (!p.an) probleme.push("Der Pro-Modus schaltet nicht ein");
  if (p.breiter.length) probleme.push(`Im Pro-Modus ragt etwas über den Bildschirmrand: ${p.breiter.join(" · ")}`);
  if (p.feldBreite < p.fensterBreite * 0.8) probleme.push(`Das Feld nutzt im Pro-Modus am Handy nur ${p.feldBreite} von ${p.fensterBreite} px`);
  if (!p.kopfWeg) probleme.push("Im Pro-Modus steht die Kopfkarte noch im Weg");
  if (!p.exitSichtbar) probleme.push("Im Pro-Modus fehlt ein sichtbarer Knopf zum Beenden (mindestens 44 px)");
  if (p.bankRichtung !== "row") probleme.push(`Die Bank steht am Handy als ${p.bankRichtung} statt als Streifen (row)`);
  if (!r.zurueck.proAus || !r.zurueck.kopfDa) probleme.push("Nach dem Beenden kommt die normale Ansicht nicht zurück");
  if (fehler.length) probleme.push(...fehler.slice(0, 3));

  zeilen.push(`Kader: ${r.kader.aktiv} von ${r.kader.gesamt} aktiv · Feld ${r.board.feld.join(", ")} · Bank ${r.board.bank.length} · stillgelegte dabei ${r.boardRaus.length}`);
  zeilen.push(`Kopf: Spielform-Knöpfe ${r.breiten.join("/")} px · offen sichtbar ${r.sichtbarOhneMehr.join(" · ")} · unter „Mehr“ ${r.mehrTexte.length}`);
  zeilen.push(`Pro-Modus bei ${p.fensterBreite} px: Feld ${p.feldBreite} px, Kopf weg ${p.kopfWeg}, Beenden ${p.exitSichtbar}, Bank ${p.bankRichtung}, nichts zu breit ${!p.breiter.length}`);
  zeilen.push(`Pro-Modus bei 820 px: Spalten ${tab.spalten} · Feld ${tab.feldLinks}…${tab.feldRechts}, Bank ab ${tab.seiteLinks} · Bank ${tab.bankRichtung}`);
  return h.ergebnis("Taktik-Seite: nur aktive Kinder, ein Kopf, Pro-Modus am Handy", !probleme.length, zeilen.concat(probleme));
};
