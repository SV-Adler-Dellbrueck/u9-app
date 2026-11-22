/* v924 · Charles 21.11.: Rückrunde anlegen, die Grillhütte aber „erst 6 Wochen vorher“ einteilen – sonst bekämen
   Familien jetzt schon einen Push für einen Dienst im Mai.
   a) Nur ein Heimtermin in 3 Monaten offen → die Automatik ruft dienst_einteilen gar nicht erst auf.
   b) Ein Heimtermin in 10 Tagen offen → die Automatik teilt ein (dienst_einteilen wird aufgerufen).
   c) Trainer-Fenster: Der ferne Termin zeigt „wird ab TT.MM. eingeteilt“ statt „offen“ und zählt nicht zu
      „n Plätze offen“; der nahe zählt.
   d) Migration: dieselbe Grenze in dienst_einteilen (current_date + 42).
   v951 · Charles 22.11. hebt das auf: „Die Grillhütte planen wir schon für die ganze Saison durch unter den Eltern.“ Seitdem gilt:
   a) Auch ein Heimtermin in 3 Monaten (innerhalb der Saison) wird eingeteilt (dienst_einteilen aufgerufen).
   c) Kein „wird ab … eingeteilt“ mehr; beide Termine zählen zu „n Plätze offen“.
   d) Migration v951: Grenze bis 30.06. der Saison. Der Dateiname bleibt, damit die Geschichte nachvollziehbar ist. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v924/v951 Grillhütte: automatisch die ganze Saison einteilen";
  const probleme = [], zeilen = [];
  const nah = h.tagePlus(10), fern = h.tagePlus(90);
  const lauf = async (termine) => {
    const s = await h.starten({ hoehe: 1400, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ name: "Charles", rolle: "trainer" }],
      termine: () => termine, dienst_einteilung: [], team_config: [{ dienst_plaetze: 1 }], dienst_sperre: [], dienst_befreit: [],
      rpc: { dienst_einteilen: 0 } }) });
    const r = await s.page.evaluate(async () => {
      const w = ms => new Promise(x => setTimeout(x, ms));
      if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
      document.getElementById("pin-gate")?.remove();
      for (let i = 0; i < 40 && typeof ghAutoEinteilen !== "function"; i++) await w(100);
      await loadKader();
      await ghAutoEinteilen({ still: true });
      let box = document.getElementById("gh-tr-inhalt"); if (!box) { box = document.createElement("div"); box.id = "gh-tr-inhalt"; document.body.prepend(box); }
      await ghTrainerDaten(); grillTrainerRender();
      return { knopf: (document.getElementById("gh-einteilen") || {}).textContent || "", spaeter: [...box.querySelectorAll(".gh-spaeter")].map(x => x.textContent.trim()), text: box.textContent.replace(/\s+/g, " ") };
    });
    const rpc = s.gesendet.filter(g => /rpc\/dienst_einteilen$/.test(g.pfad)).length;
    const fe = s.fehler(); await s.schliessen();
    return { r, rpc, fe };
  };
  const nurFern = await lauf([{ id: 51, datum: fern, uhrzeit: "10:15", titel: "Kinderfestival · Heim", typ: "turnier", heim: true, grill_plaetze: 1 }]);
  const beide = await lauf([{ id: 50, datum: nah, uhrzeit: "10:15", titel: "Kinderfestival · Heim", typ: "turnier", heim: true, grill_plaetze: 1 },
    { id: 51, datum: fern, uhrzeit: "10:15", titel: "Kinderfestival · Heim", typ: "turnier", heim: true, grill_plaetze: 1 }]);
  if (nurFern.rpc !== 1) probleme.push(`a) Termin in 3 Monaten: dienst_einteilen ${nurFern.rpc}× aufgerufen (erwartet 1, ganze Saison)`);
  if (beide.rpc !== 1) probleme.push(`b) zwei Termine: dienst_einteilen ${beide.rpc}× aufgerufen (erwartet 1)`);
  if (beide.r.spaeter.length !== 0 || /wird ab/.test(beide.r.text) || !/\(2 Plätze offen\)/.test(beide.r.knopf)) probleme.push(`c) Fenster: „${beide.r.spaeter.join(" | ")}“, Knopf „${beide.r.knopf}“`);
  const mig = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20261122_v951_grillhuette_saison.sql"), "utf8");
  if (!/-06-30'\s+-- v951: die ganze Saison/.test(mig) || /current_date \+ 42,/.test(mig.replace(/^--.*$/mg, ""))) probleme.push("d) Saison-Grenze fehlt in der Migration v951");
  zeilen.push(`a) Termin in 3 Monaten → eingeteilt · b) zwei Termine → 1 Aufruf · c) Knopf „${beide.r.knopf.trim()}“, kein „wird ab“ · d) Migration v951 bis 30.06.`);
  const fe = nurFern.fe.concat(beide.fe); if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
