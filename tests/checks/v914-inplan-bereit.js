/* v914 · „In den Plan“ (tfInPlan) wartet auf das Ende des Ladens statt fest 900 ms.
   go("planung") startet tpPlanRestore, das alle Felder leert und neu setzt. Mit fester Wartezeit ging die Wahl
   bei langsamem Netz still verloren (Laden > 900 ms), bei schnellem Netz wartete der Trainer unnötig.
   a) Langsam: Laden dauert 1,6 s → die Übung steht danach im Plan (mit 900 ms wäre sie weg).
   b) Schnell: Laden fertig nach ~100 ms → die Übung steht nach deutlich unter 900 ms im Plan.
   c) Quelltext: kein setTimeout(…,900) mehr in tfInPlan, Höchstwartezeit vorhanden. */
"use strict";
const fs = require("fs"), path = require("path");
const golden = require("./v877-trainingsplan-golden.js").intern;
module.exports = async function (h) {
  const titel = "v914 „In den Plan“ wartet auf das Laden statt fest 900 ms";
  const probleme = [], zeilen = [];
  const s = await golden.seite(h, { id: "v914" });
  const p = s.page;
  let r;
  try {
    r = await p.evaluate(async () => {
      const w = ms => new Promise(x => setTimeout(x, ms));
      const echt = window.tpPlanRestore;
      await tpGenerate(); await w(200);
      const leerId = [...document.querySelectorAll("#tp-timeline select")].find(x => x.id && TP_ZUSTAND.wahl[x.id])?.id;
      const leeren = async () => { if (!leerId) return; tpWahlSetzen(leerId, null); tpGeaendert({ speichern: "nein" }); await tpPlanSave(); await echt(document.getElementById("tp-date").value); };
      const lauf = async (verzoegerung) => {
        await leeren();
        // passende Übung für den freien Platz suchen
        let idx = -1, feld = null;
        for (let i = 0, n = tpAllForms().length; i < n && idx < 0; i++) { const f = _tpWahlFeldFuer(i, true); if (f) { idx = i; feld = f; } }
        if (idx < 0) return { keine: true, diag: { leerId, sel: document.querySelectorAll("#tp-timeline select").length, wahl: Object.keys(TP_ZUSTAND.wahl).length, frei: leerId && document.getElementById(leerId)?.value } };
        /* wie im Netz: der Lauf beginnt sofort (Zähler), das Laden dauert */
        const intern = window._tpPlanRestoreIntern; window._tpPlanRestoreIntern = async function (d, l) { await w(verzoegerung); return intern(d, l); };
        const t0 = performance.now();
        await tfInPlan(idx);
        const dauer = Math.round(performance.now() - t0);
        await w(Math.max(300, verzoegerung + 200));   // die alte Fassung setzt nach 900 ms – erst nach dem Laden zählen
        window._tpPlanRestoreIntern = intern;
        const imPlan = Object.values(TP_ZUSTAND.wahl || {}).some(v => v && Number(v.i) === idx) || [...document.querySelectorAll("#tp-timeline select")].some(x => Number(x.value) === idx);
        return { idx, dauer, imPlan };
      };
      const langsam = await lauf(1600);
      await w(400);
      const schnell = await lauf(100);
      return { langsam, schnell };
    });
  } finally { await s.schliessen(); }
  if (r.langsam.keine || r.schnell.keine) probleme.push("keine passende Übung für einen freien Platz gefunden " + JSON.stringify(r.langsam.diag || r.schnell.diag));
  else {
    if (!r.langsam.imPlan || r.langsam.dauer < 1500) probleme.push(`a) langsam: im Plan ${r.langsam.imPlan}, nach ${r.langsam.dauer} ms`);
    if (!r.schnell.imPlan || r.schnell.dauer >= 800) probleme.push(`b) schnell: im Plan ${r.schnell.imPlan}, nach ${r.schnell.dauer} ms`);
    zeilen.push(`a) Laden 1,6 s → Übung ${r.langsam.idx} nach ${r.langsam.dauer} ms im Plan · b) Laden 0,1 s → nach ${r.schnell.dauer} ms im Plan`);
  }
  const boot = fs.readFileSync(path.join(h.REPO, "boot.js"), "utf8");
  const m = /async function tfInPlan\(i\)\{[\s\S]*?\n\}\n/.exec(boot) || /function tfInPlan\(i\)\{[\s\S]*?\n\}\n/.exec(boot);
  const rumpf = m ? m[0].replace(/\/\*[\s\S]*?\*\//g, "") : "";
  if (!rumpf || /\},\s*900\)/.test(rumpf) || !/8000/.test(rumpf)) probleme.push("c) tfInPlan wartet noch fest 900 ms oder ohne Höchstwartezeit");
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
