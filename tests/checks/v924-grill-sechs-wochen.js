/* v924 · Charles 21.11.: Rückrunde anlegen, die Grillhütte aber „erst 6 Wochen vorher“ einteilen – sonst bekämen
   Familien jetzt schon einen Push für einen Dienst im Mai.
   a) Nur ein Heimtermin in 3 Monaten offen → die Automatik ruft dienst_einteilen gar nicht erst auf.
   b) Ein Heimtermin in 10 Tagen offen → die Automatik teilt ein (dienst_einteilen wird aufgerufen).
   c) Trainer-Fenster: Der ferne Termin zeigt „wird ab TT.MM. eingeteilt“ statt „offen“ und zählt nicht zu
      „n Plätze offen“; der nahe zählt.
   d) Migration: dieselbe Grenze in dienst_einteilen (current_date + 42). */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v924 Grillhütte: automatisch erst 6 Wochen vor dem Heimtermin";
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
  if (nurFern.rpc !== 0) probleme.push(`a) Termin in 3 Monaten: dienst_einteilen ${nurFern.rpc}× aufgerufen`);
  if (beide.rpc !== 1) probleme.push(`b) Termin in 10 Tagen: dienst_einteilen ${beide.rpc}× aufgerufen (erwartet 1)`);
  const d = new Date(fern + "T12:00:00"); d.setDate(d.getDate() - 42);
  const ab = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  if (beide.r.spaeter.length !== 1 || beide.r.spaeter[0] !== `wird ab ${ab} eingeteilt` || !/\(1 Platz offen\)/.test(beide.r.knopf)) probleme.push(`c) Fenster: „${beide.r.spaeter.join(" | ")}“, Knopf „${beide.r.knopf}“`);
  if (/Plätze? offen/.test(nurFern.r.knopf)) probleme.push(`c) nur ferner Termin, trotzdem „${nurFern.r.knopf}“`);
  const mig = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20261121_v924_grill_sechs_wochen.sql"), "utf8");
  if (!/te\.datum <= to_char\(current_date \+ 42,'YYYY-MM-DD'\)/.test(mig)) probleme.push("d) Grenze fehlt in der Migration");
  zeilen.push(`a) nur ferner Termin → kein Aufruf · b) naher Termin → 1 Aufruf · c) ferner Termin „wird ab ${ab} eingeteilt“, Knopf „${beide.r.knopf.trim()}“ · d) Migration mit current_date + 42`);
  const fe = nurFern.fe.concat(beide.fe); if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
