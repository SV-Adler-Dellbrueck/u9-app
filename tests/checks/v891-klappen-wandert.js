/* v891 · Bestandsaufnahme 4.8, Schritt 9 – Fehlerbild 3: Klappzustand wandert mit dem Block.

   Bis v890 hing der Klappzustand (_tpOffen) am Blockindex und blieb beim Verschieben und Löschen
   an der Stelle stehen: danach war ein anderer Block auf- bzw. zugeklappt (Golden G3). Seit v891
   zieht tpSlotsNeuOrdnen ihn mit, Löschen samt Rückgängig nimmt ihn mit (Beschluss Charles 19.11.).

   a) Hauptteil 1 aufklappen und ans Ende der Kette schieben: Hauptteil 1 bleibt offen, der Block,
      der an seine alte Stelle rückt, bleibt zu.
   b) Hauptteil 2 aufgeklappt, der Block davor (Aufwärmen) wird gelöscht: Hauptteil 2 bleibt offen,
      kein anderer Block klappt auf; Rückgängig: Aufwärmen kommt zu zurück, Hauptteil 2 bleibt offen.
   c) Hauptteil 2 aufgeklappt, gelöscht, Rückgängig: kommt offen zurück. Gegen v890 rot.
   Seit v954 ist „offen“ das Block-Fenster von unten (.tp-sheet, immer nur eines); die Regel bleibt: es hängt am Block. */
"use strict";
const golden = require("./v877-trainingsplan-golden.js").intern;

module.exports = async function (h) {
  const titel = "4.8 Schritt 9 · Fehlerbild 3: Klappzustand wandert beim Verschieben und Löschen mit dem Block";
  const zeilen = []; let ok = true;
  const pruef = (bed, text) => { zeilen.push((bed ? "✓ " : "✗ ") + text); if (!bed) ok = false; };
  const s = await golden.seite(h, { id: "v891" });
  const p = s.page;
  try {
    await p.evaluate(async () => {
      window._offen = () => [...document.querySelectorAll("#tp-timeline .tp-slot")].filter(el => document.getElementById("tp-timeline").classList.contains("tp-liste") ? el.classList.contains("tp-sheet") : !el.classList.contains("tp-zu"))
        .map(el => tpSlotName((tpSlots[Number(el.dataset.si)] || {}).label || "")).filter(n => !/Fenster|Abschluss/.test(n));
      window._undo = () => { const k = [...document.querySelectorAll("#undo-toast button")].find(x => /Rückgängig/.test(x.textContent)); if (k) k.click(); return !!k; };
      window._si = re => tpSlots.findIndex(x => re.test(x.label || ""));
      await tpGenerate();
    });
    await golden.ruhe(s);
    const a = await p.evaluate(() => {
      const h1 = _si(/^Hauptteil 1$/); tpKlapp(h1); const vor = _offen();
      tpSlotVerschieben(h1, _tpKette().length - 2);
      return { vor, nach: _offen() };
    });
    pruef(JSON.stringify(a.vor) === '["Hauptteil 1"]' && JSON.stringify(a.nach) === '["Hauptteil 1"]',
      `a) verschoben: offen vorher ${JSON.stringify(a.vor)}, nachher ${JSON.stringify(a.nach)} (soll beide Male Hauptteil 1)`);
    const b = await p.evaluate(() => {
      tpKlapp(_si(/^Hauptteil 1$/)); tpKlapp(_si(/^Hauptteil 2$/)); const vor = _offen();
      tpRemoveSlot(_si(/^Aufwärmen$/)); const nach = _offen();
      const u = _undo(); return { vor, nach, u, zurueck: _offen(), aufw: _si(/^Aufwärmen$/) };
    });
    pruef(JSON.stringify(b.vor) === '["Hauptteil 2"]' && JSON.stringify(b.nach) === '["Hauptteil 2"]',
      `b) Block davor gelöscht: offen vorher ${JSON.stringify(b.vor)}, nachher ${JSON.stringify(b.nach)}`);
    pruef(b.u && b.aufw >= 0 && JSON.stringify(b.zurueck) === '["Hauptteil 2"]', `b) Rückgängig: Aufwärmen zurück (zu), offen ${JSON.stringify(b.zurueck)}`);
    const c = await p.evaluate(() => {
      tpRemoveSlot(_si(/^Hauptteil 2$/)); const nach = _offen();
      const u = _undo(); return { nach, u, zurueck: _offen() };
    });
    pruef(JSON.stringify(c.nach) === "[]" && c.u && JSON.stringify(c.zurueck) === '["Hauptteil 2"]',
      `c) offener Block gelöscht (offen danach ${JSON.stringify(c.nach)}), Rückgängig: kommt offen zurück ${JSON.stringify(c.zurueck)}`);
    const fe = s.fehler(); pruef(!fe.length, `keine Fehler in der Konsole${fe.length ? " · " + fe[0] : ""}`);
  } catch (e) {
    pruef(false, "Abbruch – " + String(e.message || e).split("\n")[0]);
  } finally { await s.schliessen(); }
  return h.ergebnis(titel, ok, zeilen);
};
