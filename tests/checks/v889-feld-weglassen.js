/* v889 · Bestandsaufnahme 4.8, Schritt 9 – Fehlerbild 1: „Feld weglassen“.

   Bis v888 rückten beim Weglassen eines Feldes (tpFeldWeglassen) nur die Trainer nach, die Übungen
   blieben an ihrem Platz: Trainer und Übung passten danach nicht mehr zusammen (Golden G9).
   Seit v889 rücken beide gemeinsam nach (Beschluss Charles 19.11.).

   Hauptteil 1 mit drei Feldern und drei Trainern; das mittlere Feld wird weggelassen. Erwartet:
   Feld 1 trägt danach Trainer UND Übung des bisherigen Feldes 2, Feld 0 bleibt, Feld 2 gibt es
   nicht mehr – im Zustand, auf der Seite und im verzögert gespeicherten Plan. Gegen v888 rot. */
"use strict";
const golden = require("./v877-trainingsplan-golden.js").intern;
const tpPosts = s => s.gesendet.filter(g => /\/rest\/v1\/trainingsplan$/.test(g.pfad) && g.methode === "POST");

module.exports = async function (h) {
  const titel = "4.8 Schritt 9 · Fehlerbild 1: Feld weglassen – Übungen rücken mit den Trainern nach";
  const zeilen = []; let ok = true;
  const pruef = (bed, text) => { zeilen.push((bed ? "✓ " : "✗ ") + text); if (!bed) ok = false; };
  const s = await golden.seite(h, { id: "v889" });
  const p = s.page;
  try {
    const vor = await p.evaluate(async () => {
      await tpGenerate();
      const si = tpSlots.findIndex(x => /^Hauptteil 1$/.test(x.label || ""));
      ["Charles", "Finn", "Kenneth"].forEach((t, q) => tpSetCoach(`tp-form-${si}-${q}`, t));
      return { si, wahl: [0, 1, 2].map(q => tpWahlIdx(`tp-form-${si}-${q}`)) };
    });
    await golden.ruhe(s);
    pruef(vor.si >= 0 && vor.wahl.every(x => x != null) && new Set(vor.wahl).size === 3,
      `Ausgangslage: Hauptteil 1 mit drei verschiedenen Übungen ${JSON.stringify(vor.wahl)}`);
    const n0 = tpPosts(s).length;
    const nach = await p.evaluate(si => {
      tpFeldWeglassen(si, 1);
      const feld = q => ({ trainer: tpCoaches[`tp-form-${si}-${q}`] || null, wahl: tpWahlIdx(`tp-form-${si}-${q}`),
        seite: (document.getElementById(`tp-form-${si}-${q}`) || { value: null }).value });
      return { felder: tpFelderZahl(si), f0: feld(0), f1: feld(1), f2: feld(2), pruefen: tpZustandPruefen() };
    }, vor.si);
    await golden.ruhe(s);
    pruef(nach.felder === 2 && !nach.f2.trainer && nach.f2.wahl == null && nach.f2.seite === null,
      `zwei Felder übrig, das dritte ohne Trainer und Übung (${JSON.stringify(nach.f2)})`);
    pruef(nach.f0.trainer === "Charles" && nach.f0.wahl === vor.wahl[0], `Feld 0 unverändert: Charles mit Übung ${nach.f0.wahl}`);
    pruef(nach.f1.trainer === "Kenneth" && nach.f1.wahl === vor.wahl[2] && nach.f1.seite === String(vor.wahl[2]),
      `Feld 1 trägt Trainer und Übung des bisherigen Feldes 2: ${nach.f1.trainer} mit Übung ${nach.f1.wahl} (soll Kenneth mit ${vor.wahl[2]}), Seite ${nach.f1.seite}`);
    pruef(!nach.pruefen.length, `Zustand = Seite${nach.pruefen.length ? " · " + nach.pruefen[0] : ""}`);
    const posts = tpPosts(s).slice(n0), b = posts.length ? posts[posts.length - 1].body : null;
    const e = b && b.plan.filter(x => x.block === vor.si).map(x => `${x.feld}:${x.trainer}:${x.formIdx}`);
    pruef(!!b && JSON.stringify(e) === JSON.stringify([`0:Charles:${vor.wahl[0]}`, `1:Kenneth:${vor.wahl[2]}`]),
      `gespeichert (verzögert): ${JSON.stringify(e)}`);
    const fe = s.fehler(); pruef(!fe.length, `keine Fehler in der Konsole${fe.length ? " · " + fe[0] : ""}`);
  } catch (e) {
    pruef(false, "Abbruch – " + String(e.message || e).split("\n")[0]);
  } finally { await s.schliessen(); }
  return h.ergebnis(titel, ok, zeilen);
};
