/* v436 – ein Trainer ist ausgeschieden; sein Name stand an fuenf Stellen fest im Code.
   Geprueft wird am DOM: jede Stelle, die eine Trainerliste zeigt, kennt genau TRAINER
   (und keinen Namen daneben) – und beide Einstiege starten ohne Konsolenfehler. */
module.exports = async function (h) {
  const zeilen = [], probleme = [];
  for (const [bereich, start] of [["Trainer", "/trainer/index.html"], ["Eltern", "/eltern/index.html"]]) {
    const s = await h.starten({ start, warten: 1200 });
    const r = await s.page.evaluate(() => {
      const out = { trainer: typeof TRAINER !== "undefined" ? TRAINER.slice() : [] };
      // Der Stab fuellt sich aus Rueckmeldungen selbst wieder auf – nur TRAINER antworten
      if (typeof trainerstabNamen === "function") {
        const antworten = {}; out.trainer.forEach(t => antworten[t] = "ja");
        out.stab = trainerstabNamen(antworten);
      }
      try {
        if (typeof renderTrainerUI === "function") renderTrainerUI();
        const sel = document.getElementById("p-trainer");
        if (sel) out.profil = [...sel.options].map(o => o.value).filter(Boolean);
      } catch (e) { out.profilFehler = String(e); }
      return out;
    });
    const fehler = s.fehler();
    await s.schliessen();
    const fremd = l => (l || []).filter(n => !r.trainer.includes(n));
    if (!r.trainer.length) probleme.push(`${bereich}: TRAINER fehlt oder ist leer`);
    if (r.stab && r.stab.length !== r.trainer.length) probleme.push(`${bereich}: Stab hat ${r.stab.length} Namen, TRAINER ${r.trainer.length}`);
    if (fremd(r.stab).length) probleme.push(`${bereich}: Stab kennt Namen ausserhalb von TRAINER: ${fremd(r.stab).join(", ")}`);
    /* v635 PO: „Wir bewerten gemeinsam als Trainer, nicht jeder einzeln“ – „Trainerteam“ ist
       bewusst der erste Eintrag der Bewertungs-Auswahl. Jeder andere Name ausserhalb von
       TRAINER bleibt ein Befund. */
    const profilFremd = fremd(r.profil).filter(n => n !== "Trainerteam");
    if (profilFremd.length) probleme.push(`${bereich}: Profil-Auswahl bietet an: ${profilFremd.join(", ")}`);
    if (r.profilFehler) probleme.push(`${bereich}: renderTrainerUI wirft ${r.profilFehler}`);
    if (fehler.length) probleme.push(`${bereich}: ${fehler.slice(0, 3).join(" | ")}`);
    zeilen.push(`${bereich}: TRAINER=${r.trainer.length} · Stab=${r.stab ? r.stab.length : "–"} · Profil-Optionen=${r.profil ? r.profil.length : "–"} · Konsolenfehler=${fehler.length}`);
  }
  return h.ergebnis("Trainerliste hat eine Quelle, beide Einstiege starten fehlerfrei", !probleme.length, zeilen.concat(probleme));
};
