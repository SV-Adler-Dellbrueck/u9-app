/* v894 · Bestandsaufnahme 4.8, Schritt 9 – Fehlerbild 5: gespeicherte Übung, die nicht (mehr) passt.

   Bis v893 gingen beim Öffnen gespeicherte Einträge, die nicht (mehr) passten, still verloren und
   fehlten beim nächsten Speichern: die Übung vom falschen Typ fiel weg, die Dublette rutschte ins
   nächste freie Feld desselben Blocks, alte `durchgaenge` ersetzten die eigene Übung von Hauptteil 2
   durch die des Kopfes (Golden G5). Seit v894 (Beschluss Charles 19.11.):

   a) die Übung vom falschen Typ (Torwart-Übung in Hauptteil 1/Feld 2) bleibt, mit Hinweis am Feld;
   b) die Dublette (zweimal Hauptteil 1/Feld 1) bleibt an ihrem Feld, Feld 3 bleibt frei;
   c) Hauptteil 2 (als Durchgang an Hauptteil 1 gebunden) behält seine eigene Übung „Stangentausch“;
   d) Öffnen schreibt nichts; „Plan speichern“ schreibt alle drei wieder. Gegen v893 rot. */
"use strict";
const golden = require("./v877-trainingsplan-golden.js").intern;
const tpPosts = s => s.gesendet.filter(g => /\/rest\/v1\/trainingsplan$/.test(g.pfad) && g.methode === "POST");

module.exports = async function (h) {
  const titel = "4.8 Schritt 9 · Fehlerbild 5: gespeicherte Übungen, die nicht (mehr) passen, bleiben beim Öffnen erhalten";
  const zeilen = []; let ok = true;
  const pruef = (bed, text) => { zeilen.push((bed ? "✓ " : "✗ ") + text); if (!bed) ok = false; };
  const g5 = golden.SZENARIEN.find(x => x.id === "G5-oeffnen-aus-der-db");
  const s = await golden.seite(h, g5);
  const p = s.page;
  try {
    const n0 = tpPosts(s).length;
    const a = await p.evaluate(async () => {
      await tpTrainerRsvpLaden("2030-03-05"); await tpPlanRestore("2030-03-05");
      const name = id => { const i = tpWahlIdx(id); return i == null ? null : (tpAllForms()[i] || {}).name; };
      const h1 = tpSlots.findIndex(x => x.label === "Hauptteil 1"), h2 = tpSlots.findIndex(x => x.label === "Hauptteil 2");
      return { h1, h2, f: [0, 1, 2].map(q => name(`tp-form-${h1}-${q}`)), g: [0, 1].map(q => name(`tp-form-${h2}-${q}`)),
        kette: !!(tpSlots[h2].kette && tpSlots[h2].kette === tpSlots[h1].kette),
        hinweis: (document.getElementById(`tp-form-${h1}-1-fremd`) || {}).textContent || "", seite: (document.getElementById(`tp-form-${h1}-1`) || {}).value, pruefen: tpZustandPruefen() };
    });
    await golden.ruhe(s);
    pruef(a.f[1] === "Adler TW – Einlaufen" && a.hinweis.includes("Passt nicht zum Blocktyp") && a.seite !== "",
      `a) falscher Typ bleibt: Hauptteil 1/Feld 2 = ${a.f[1]}, Hinweis „${a.hinweis}“`);
    pruef(a.f[0] === "Passtor im Quadrat" && a.f[2] === null, `b) Dublette bleibt an Feld 1, Feld 3 frei: ${JSON.stringify(a.f)}`);
    pruef(a.kette && JSON.stringify(a.g) === '["Stangentausch","Stangentausch"]', `c) Hauptteil 2 als Durchgang behält „Stangentausch“: ${JSON.stringify(a.g)}`);
    pruef(!a.pruefen.length, `Zustand = Seite${a.pruefen.length ? " · " + a.pruefen[0] : ""}`);
    pruef(tpPosts(s).length === n0, "d) Öffnen schreibt nichts");
    await p.evaluate(async () => { await tpPlanSave(true); });
    await golden.ruhe(s);
    const b = tpPosts(s).slice(n0).pop(), plan = b ? b.body.plan : [];
    const hat = (bl, fe, n) => plan.some(e => e.block === bl && e.feld === fe && e.formName === n);
    pruef(hat(a.h1, 1, "Adler TW – Einlaufen") && hat(a.h1, 0, "Passtor im Quadrat") && !plan.some(e => e.block === a.h1 && e.feld === 2) && hat(a.h2, 0, "Stangentausch") && hat(a.h2, 1, "Stangentausch"),
      `d) gespeichert: ${plan.filter(e => e.block === a.h1 || e.block === a.h2).map(e => `${e.block}/${e.feld} ${e.formName}`).join(" · ")}`);
    const fe = s.fehler(); pruef(!fe.length, `keine Fehler in der Konsole${fe.length ? " · " + fe[0] : ""}`);
  } catch (e) {
    pruef(false, "Abbruch – " + String(e.message || e).split("\n")[0]);
  } finally { await s.schliessen(); }
  return h.ergebnis(titel, ok, zeilen);
};
