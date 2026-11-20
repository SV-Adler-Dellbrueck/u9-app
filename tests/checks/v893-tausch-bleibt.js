/* v893 · Bestandsaufnahme 4.8, Schritt 9 – Fehlerbild 4: getauschte Übung außerhalb des Blocktyps.

   Bis v892 verschwand eine Übung, die per Tausch (tpUebungTausch, auch KI-Tausch in md-block.js)
   in ein Feld kam, dessen Blocktyp sie nicht anbietet, beim nächsten Neuzeichnen und fehlte dann
   im gespeicherten Plan (Golden G2). Seit v893 bleibt sie, bekommt eine eigene Option im Feld und
   einen Hinweis darunter (Beschluss Charles 19.11.).

   a) Tausch gegen eine Torwart-Übung in Hauptteil 1/Feld 2, dann Dauer ändern (zeichnet neu):
      Zustand, Auswahlfeld und Picker-Knopf tragen sie, der Hinweis steht da, gespeichert ist sie.
   b) KI-Tausch (blockKiTausch) in Hauptteil 1/Feld 1 mit einer Einzeltraining-Übung: bleibt nach dem
      Neuzeichnen ebenso.
   c) Wird im Feld wieder eine passende Übung gewählt, verschwinden fremde Option und Hinweis.
   Gegen v892 rot. */
"use strict";
const golden = require("./v877-trainingsplan-golden.js").intern;
const tpPosts = s => s.gesendet.filter(g => /\/rest\/v1\/trainingsplan$/.test(g.pfad) && g.methode === "POST");
const HINWEIS = "Passt nicht zum Blocktyp – bleibt trotzdem im Plan.";

module.exports = async function (h) {
  const titel = "4.8 Schritt 9 · Fehlerbild 4: getauschte Übung außerhalb des Blocktyps bleibt erhalten und wird gespeichert";
  const zeilen = []; let ok = true;
  const pruef = (bed, text) => { zeilen.push((bed ? "✓ " : "✗ ") + text); if (!bed) ok = false; };
  const s = await golden.seite(h, { id: "v893" });
  const p = s.page;
  const feld = id => p.evaluate(id => {
    const sel = document.getElementById(id), i = tpWahlIdx(id), o = sel && sel.selectedOptions[0];
    return { i, seite: sel ? sel.value : null, fremd: !!(o && o.dataset.fremd), knopf: (document.getElementById(id + "-pick") || {}).textContent || "",
      hinweis: (document.getElementById(id + "-fremd") || {}).textContent || "", name: i == null ? null : (tpAllForms()[i] || {}).name, pruefen: tpZustandPruefen() };
  }, id);
  try {
    const z = await p.evaluate(async () => {
      await tpGenerate();
      const si = tpSlots.findIndex(x => tpIstHauptteil(x.typ));
      return { si, tw: tpAllForms().findIndex(f => f && f.kat === "torwart"), ind: tpAllForms().findIndex(f => f && f.kat === "individual") };
    });
    await golden.ruhe(s);
    const id1 = `tp-form-${z.si}-1`, id0 = `tp-form-${z.si}-0`;
    await p.evaluate(({ id1, tw, si }) => { tpUebungTausch(id1, tw); tpSetDauer(si, 15); }, { id1, tw: z.tw, si: z.si });
    const a = await feld(id1);
    pruef(a.i === z.tw && a.seite === String(z.tw) && a.fremd && a.knopf.startsWith(a.name || "?"),
      `a) nach Tausch und Neuzeichnen: Zustand ${a.i}, Feld ${a.seite} (eigene Option ${a.fremd}), Knopf „${a.knopf}“`);
    pruef(a.hinweis.includes(HINWEIS), `a) Hinweis am Feld: „${a.hinweis}“`);
    pruef(!a.pruefen.length, `a) Zustand = Seite${a.pruefen.length ? " · " + a.pruefen[0] : ""}`);
    const n0 = tpPosts(s).length;
    await p.evaluate(async () => { await tpPlanSave(true); });
    await golden.ruhe(s);
    const b0 = tpPosts(s).slice(n0).pop(), e = b0 && b0.body.plan.find(x => x.block === z.si && x.feld === 1);
    pruef(!!e && e.formIdx === z.tw, `a) gespeichert: Hauptteil 1/Feld 2 = ${e ? e.formName : "fehlt"}`);

    await p.evaluate(({ id0, ind, si }) => {
      window._tbKiTausch = [{ selId: id0, i: ind, zu: (tpAllForms()[ind] || {}).name, grund: "" }];
      blockKiTausch(0); tpSetDauer(si, 16);
    }, { id0, ind: z.ind, si: z.si });
    const b = await feld(id0);
    pruef(b.i === z.ind && b.seite === String(z.ind) && b.fremd && b.hinweis.includes(HINWEIS),
      `b) KI-Tausch nach dem Neuzeichnen erhalten: ${b.name} (Hinweis ${b.hinweis ? "da" : "fehlt"})`);

    const c = await p.evaluate(id1 => {
      const sel = document.getElementById(id1), v = [...sel.options].find(o => o.value !== "" && !o.dataset.fremd).value;
      tpPickerOpen(id1); tpPickerSet(Number(v));
      return { fremdOpt: !!sel.querySelector("option[data-fremd]"), hinweis: !!document.getElementById(id1 + "-fremd"), i: tpWahlIdx(id1), v: Number(v) };
    }, id1);
    pruef(c.i === c.v && !c.fremdOpt && !c.hinweis, `c) passende Übung gewählt: fremde Option weg (${!c.fremdOpt}), Hinweis weg (${!c.hinweis})`);
    const fe = s.fehler(); pruef(!fe.length, `keine Fehler in der Konsole${fe.length ? " · " + fe[0] : ""}`);
  } catch (e) {
    pruef(false, "Abbruch – " + String(e.message || e).split("\n")[0]);
  } finally { await s.schliessen(); }
  return h.ergebnis(titel, ok, zeilen);
};
