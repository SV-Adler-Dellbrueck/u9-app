/* v906 · Vorlagen-Marken (station/alle) gehören zum Termin.

   Bis v905 leerte das Öffnen eines Termins MIT gespeicherter Struktur zwar die Übungen, behielt aber die
   Vorlagen-Marken der gleichnamigen Felder des zuvor geöffneten Termins (tpZustandLaden: „die Marken bleiben
   am Auswahlfeld“). Nur der Weg ohne Struktur (v892) leerte alles. Die fremde Marke ging bei der nächsten
   Speicherung als `station` in den Plan des neuen Termins.

   a) Termin A: Übung mit Marke station 2 in Hauptteil-Feld 1, speichern.
   b) Termin B: dieselbe Struktur, eine Übung im selben Feld ohne Marke, speichern.
   c) A öffnen, dann B öffnen: das Feld trägt keine Marke; nach einer Speicherung steht in B kein `station`.
   d) A erneut öffnen: die eigene Marke station 2 ist wieder da (sie kommt aus dem gespeicherten Plan). */
"use strict";
const golden = require("./v877-trainingsplan-golden.js").intern;
module.exports = async function (h) {
  const titel = "v906 Vorlagen-Marken eines vorigen Termins bleiben nicht stehen";
  const zeilen = []; let ok = true;
  const pruef = (bed, text) => { zeilen.push((bed ? "✓ " : "✗ ") + text); if (!bed) ok = false; };
  const s = await golden.seite(h, { id: "v906", db: null });
  const p = s.page, A = "2030-03-05", B = "2030-03-07";
  try {
    const r = await p.evaluate(async ({ A, B }) => {
      const oeffnen = async d => { const f = document.getElementById("tp-date"); f.value = d; await tpTrainerRsvpLaden(d); await tpPlanRestore(d); };
      const feld = () => { const si = tpSlots.findIndex(x => /spielform|main/.test(x.typ)); return `tp-form-${si}-0`; };
      const passend = id => { const si = +id.split("-")[2]; return tpAllForms().findIndex((f, i) => tpWahlZulaessig(si, i, {})); };
      await oeffnen(A);
      const id = feld(), fi = passend(id);
      tpWahlSetzen(id, fi, { station: 2 }); await tpPlanSave(true);
      await oeffnen(B);
      const idB = feld(), fiB = passend(idB);
      tpWahlSetzen(idB, fiB, {}); await tpPlanSave(true);
      await oeffnen(A);
      const markeA1 = (TP_ZUSTAND.wahl[id] || {}).station;
      await oeffnen(B);
      const markeB = (TP_ZUSTAND.wahl[idB] || {}).station;
      await tpPlanSave(true);
      await oeffnen(A);
      const markeA2 = (TP_ZUSTAND.wahl[id] || {}).station;
      return { id, idB, markeA1, markeB, markeA2, gleichesFeld: id === idB };
    }, { A, B });
    const planB = (s.plan.db[B] || {}).plan || [];
    pruef(r.gleichesFeld, `a/b) beide Termine nutzen dasselbe Feld ${r.id}`);
    pruef(r.markeA1 === 2, `a) Termin A trägt seine Marke (station ${r.markeA1})`);
    pruef(r.markeB == null, `c) Termin B nach A: keine fremde Marke (station ${r.markeB})`);
    pruef(!planB.some(e => e.station != null), `c) gespeicherter Plan B ohne station (${JSON.stringify(planB.map(e => e.station))})`);
    pruef(r.markeA2 === 2, `d) Termin A erneut: Marke wieder da (station ${r.markeA2})`);
  } catch (e) { pruef(false, "Ausnahme: " + e.message); }
  const f = s.fehler(); if (f.length) pruef(false, "Konsole: " + f[0]);
  await s.schliessen();
  return h.ergebnis(titel, ok, zeilen);
};
