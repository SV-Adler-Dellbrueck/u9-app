/* v882 · Bestandsaufnahme 4.8, Schritt 4: Die Übungswahl liegt im Zustand (TP_ZUSTAND.wahl).

   A) Die zehn Golden-Abläufe aus v877 (dieselben Schritte, dieselbe Seite – ohne Sollwerte):
      tpZustandPruefen() muss nach JEDEM Zeichnen (Haken an _tpRenderTimelineIntern) und nach
      jedem Schritt (nach Ruhe) leer sein – Auswahlfeld, Marken data-station/data-alle/data-erbt
      und Picker-Knopf stimmen mit dem Zustand überein. Abgedeckt sein müssen Vorlagen-Marken
      (station, alleFelder) und geerbte Übungen im Durchgang.
   B) Einzelne Wege an einer gefüllten Seite:
      – tpWahlSetzen + Neuzeichnen projiziert Wert, Marken und Picker-Knopf; die Wahl geht so in
        den gespeicherten Plan; „hand“ nimmt alle Vorlagen-Marken weg (v608)
      – die Lesestellen lesen den Zustand: vor dem Neuzeichnen kennen Kurzzeile, Stationstimer,
        Trainingsstart, Material und Feldbedarf schon die neue Wahl, das Auswahlfeld noch nicht
      – ein Eingriff sel.value= ohne Ereignis wird von der Brücke übernommen (beim Zeichnen und
        beim Speichern)
      – eine Übung, die der Block nicht anbietet, fällt beim Zeichnen still weg (tpWahlZulaessig,
        Verhalten wie bisher – Fehlerbild 4, behoben erst ab Schritt 9) */
"use strict";
const golden = require("./v877-trainingsplan-golden.js").intern;

/* Läuft in der Seite: prüft nach jedem Zeichnen. */
function haken() {
  window.__v882 = { zeichnungen: 0, abweichungen: [], schritt: "Start", marken: { station: 0, alle: 0, erbt: 0, wahl: 0 } };
  const orig = window._tpRenderTimelineIntern;
  window._tpRenderTimelineIntern = function () {
    const r = orig.apply(this, arguments);
    const w = window.__v882; w.zeichnungen++;
    try {
      const ab = tpZustandPruefen();
      ab.forEach(x => w.abweichungen.push(`${w.schritt}, Zeichnung ${w.zeichnungen}: ${x}`));
      const werte = Object.values(TP_ZUSTAND.wahl);
      w.marken.station = Math.max(w.marken.station, werte.filter(x => x.station != null).length);
      w.marken.alle = Math.max(w.marken.alle, werte.filter(x => x.alle).length);
      w.marken.erbt = Math.max(w.marken.erbt, werte.filter(x => x.erbt && x.i != null).length);
      w.marken.wahl = Math.max(w.marken.wahl, werte.filter(x => x.i != null).length);
    } catch (e) { w.abweichungen.push(`${w.schritt}, Zeichnung ${w.zeichnungen}: Abbruch der Prüfung – ${e.message}`); }
    return r;
  };
}

async function ablauf(h, def) {
  const s = await golden.seite(h, def);
  const p = s.page;
  const zeilen = [];
  try {
    await p.evaluate(`(${haken.toString()})()`);
    const start = await p.evaluate(() => tpZustandPruefen());
    start.forEach(x => zeilen.push(`Start: ${x}`));
    for (const [name, tun] of def.schritte) {
      await p.evaluate(n => { window.__v882.schritt = n; }, name);
      await tun(p, s);
      await golden.ruhe(s);
      const ab = await p.evaluate(() => tpZustandPruefen());
      ab.forEach(x => zeilen.push(`nach „${name}“: ${x}`));
    }
    const w = await p.evaluate(() => window.__v882);
    w.abweichungen.forEach(x => zeilen.push(x));
    return { id: def.id, ok: !zeilen.length, zeichnungen: w.zeichnungen, schritte: def.schritte.length, marken: w.marken, zeilen, fehler: s.fehler() };
  } catch (e) {
    return { id: def.id, ok: false, zeilen: zeilen.concat([`Abbruch – ${String(e.message || e).split("\n")[0]}`]), marken: {}, fehler: s.fehler() };
  } finally { await s.schliessen(); }
}

module.exports = async function (h) {
  const titel = "4.8 Schritt 4 · Übungswahl im Zustand: Seite = Zustand nach jedem Schritt der zehn Golden-Abläufe, Projektion und Brücke";
  const zeilen = []; let ok = true;
  const pruef = (bed, text) => { zeilen.push((bed ? "✓ " : "✗ ") + text); if (!bed) ok = false; };

  /* ── A: die zehn Golden-Abläufe ── */
  const liste = golden.SZENARIEN, erg = new Array(liste.length);
  let naechstes = 0;
  const arbeiter = async () => { for (;;) { const i = naechstes++; if (i >= liste.length) return; erg[i] = await ablauf(h, liste[i]); } };
  await Promise.all(Array.from({ length: Math.max(1, Number(process.env.GOLDEN_PARALLEL) || 3) }, arbeiter));
  const summe = { station: 0, alle: 0, erbt: 0, wahl: 0, zeichnungen: 0 };
  erg.forEach(r => {
    Object.keys(summe).forEach(k => { summe[k] += k === "zeichnungen" ? (r.zeichnungen || 0) : ((r.marken || {})[k] || 0); });
    pruef(r.ok && r.zeichnungen > 0, `${r.id}: ${r.schritte || "?"} Schritte, ${r.zeichnungen || 0} Zeichnungen – Seite = Zustand${r.zeilen.length ? " · " + r.zeilen.slice(0, 3).join(" | ") : ""}`);
    if (r.fehler && r.fehler.length) pruef(false, `${r.id}: Fehler in der Konsole · ${r.fehler[0]}`);
  });
  pruef(summe.station > 0 && summe.alle > 0 && summe.erbt > 0 && summe.wahl > 0,
    `abgedeckt: Vorlagen-Marken station (${summe.station}) und alleFelder (${summe.alle}), geerbte Übungen (${summe.erbt}), ${summe.zeichnungen} Zeichnungen`);

  /* ── B: Projektion, Lesestellen, Brücke ── */
  const s = await golden.seite(h, { id: "B", db: null });
  const p = s.page;
  try {
    await p.evaluate(async () => { await tpGenerate(); });
    await golden.ruhe(s);
    const b = await p.evaluate(() => {
      const out = {};
      const h1 = tpSlots.findIndex(x => /^Hauptteil 1$/.test(x.label || "")), h2 = tpSlots.findIndex(x => /^Hauptteil 2$/.test(x.label || ""));
      const id = `tp-form-${h1}-0`, id2 = `tp-form-${h2}-0`, sel = () => document.getElementById(id);
      const angebot = si => tpFilteredOpts(tpSlots[si].typ || "main").map(x => x.i);
      const alle = tpAllForms(), name = i => (alle[i] || {}).name;
      /* 1) Lesestellen lesen den Zustand: Wahl gesetzt, noch nicht gezeichnet */
      const vorher = tpWahlIdx(id);
      const neu = angebot(h1).find(i => i !== vorher && !Object.values(TP_ZUSTAND.wahl).some(w => w.i === i) && name(i));
      tpWahlSetzen(id, neu);
      const slotEl = document.querySelector(`#tp-timeline .tp-slot[data-si="${h1}"]`);
      out.lesen = {
        feld: sel().value === String(vorher),                                     // die Seite zeigt noch die alte Wahl
        idx: tpWahlIdx(id) === neu,
        kurz: tpSlotKurz(slotEl).includes(name(neu)),
        timer: stTimerStations().some(st => st.forms.includes(name(neu))),
        start: _tlSnapshot().some(st => st.gruppen.some(g => g.uebung === name(neu))),
        bedarf: tpFeldBedarfe(h1, 1)[0] === tpUebungBedarf(neu),
        plan: tpPlanEntries().some(e => e.block === h1 && e.feld === 0 && e.formIdx === neu)
      };
      /* 2) Neuzeichnen projiziert Wert, Marken und Picker-Knopf */
      const marke = angebot(h2).find(i => i !== neu && name(i));
      tpWahlSetzen(id, neu, { station: 2 });
      tpWahlSetzen(id2, marke, { alle: true });
      tpRenderTimeline();
      const opt = sel().querySelector(`option[value="${neu}"]`);
      out.projektion = {
        wert: sel().value === String(neu), station: sel().dataset.station === "2", alle: document.getElementById(id2).dataset.alle === "1",
        knopf: !!opt && document.getElementById(id + "-pick").textContent === opt.textContent,
        pruefen: tpZustandPruefen(),
        plan: tpPlanEntries().filter(e => (e.block === h1 || e.block === h2) && e.feld === 0).map(e => ({ b: e.block, i: e.formIdx, st: e.station, a: e.alleFelder }))
      };
      out.erwartet = [{ b: h1, i: neu, st: 2 }, { b: h2, i: marke, a: true }].sort((x, y) => x.b - y.b);
      /* 3) hand: Hand schlägt Vorlage – alle Marken weg, auch am anderen Feld */
      tpWahlSetzen(id, neu, { station: 1, hand: true });
      tpRenderTimeline();
      out.hand = { marken: document.querySelectorAll("#tp-timeline .tp-form-sel[data-station],#tp-timeline .tp-form-sel[data-alle]").length,
        zustand: Object.values(TP_ZUSTAND.wahl).filter(w => w.station != null || w.alle).length, zweites: tpWahlIdx(id2) === marke, pruefen: tpZustandPruefen() };
      /* 4) Brücke: sel.value= ohne Ereignis – beim Zeichnen übernommen */
      const fremd = angebot(h1).find(i => i !== neu && i !== marke && name(i));
      sel().value = String(fremd);
      const vorBruecke = tpWahlIdx(id);
      tpRenderTimeline();
      out.bruecke = { vorher: vorBruecke === neu, nachher: tpWahlIdx(id) === fremd, feld: sel().value === String(fremd), pruefen: tpZustandPruefen() };
      /* … und beim Speichern (der Serialisierer zieht nach) */
      const fremd2 = angebot(h1).find(i => i !== neu && i !== marke && i !== fremd && name(i));
      sel().value = String(fremd2);
      out.brueckeSpeichern = tpPlanEntries().some(e => e.block === h1 && e.feld === 0 && e.formIdx === fremd2) && tpWahlIdx(id) === fremd2;
      /* 5) Nicht im Angebot des Blocks: fällt beim Zeichnen still weg (wie bisher) */
      const tw = alle.findIndex(f => f && f.kat === "torwart");
      out.zulaessig = { main: tpWahlZulaessig(h1, fremd2), tw: tpWahlZulaessig(h1, tw) };
      tpWahlSetzen(id, tw);
      tpRenderTimeline();
      out.verworfen = { idx: tpWahlIdx(id), feld: sel().value, pruefen: tpZustandPruefen() };
      return out;
    });
    const l = b.lesen;
    pruef(l.feld && l.idx && l.kurz && l.timer && l.start && l.bedarf && l.plan,
      `Lesestellen lesen den Zustand (vor dem Zeichnen): ${JSON.stringify(l)}`);
    const pr = b.projektion;
    pruef(pr.wert && pr.station && pr.alle && pr.knopf && !pr.pruefen.length && JSON.stringify(pr.plan) === JSON.stringify(b.erwartet),
      `tpWahlSetzen + Neuzeichnen: Wert, data-station, data-alle, Picker-Knopf, gespeicherter Plan ${JSON.stringify(pr.plan)}${pr.pruefen.length ? " · " + pr.pruefen[0] : ""}`);
    pruef(b.hand.marken === 0 && b.hand.zustand === 0 && b.hand.zweites && !b.hand.pruefen.length, `hand: alle Vorlagen-Marken weg, Seite und Zustand (${JSON.stringify(b.hand)})`);
    pruef(b.bruecke.vorher && b.bruecke.nachher && b.bruecke.feld && !b.bruecke.pruefen.length && b.brueckeSpeichern,
      `Brücke: sel.value= ohne Ereignis beim Zeichnen und beim Speichern übernommen (${JSON.stringify(b.bruecke)}, Speichern ${b.brueckeSpeichern})`);
    pruef(b.zulaessig.main && !b.zulaessig.tw && b.verworfen.idx === null && b.verworfen.feld === "" && !b.verworfen.pruefen.length,
      `Torwart-Übung im Hauptteil: nicht zulässig, beim Zeichnen still verworfen (${JSON.stringify(b.verworfen)})`);
    const fe = s.fehler();
    pruef(!fe.length, `B: keine Fehler in der Konsole${fe.length ? " · " + fe[0] : ""}`);
  } catch (e) {
    pruef(false, "B: Abbruch – " + String(e.message || e).split("\n")[0]);
  } finally { await s.schliessen(); }
  return h.ergebnis(titel, ok, zeilen);
};
