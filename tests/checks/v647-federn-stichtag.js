/* v647 · Neustart der Federn und des Team-Levels (Beschluss Trainerteam 27.09.2026).
   Gezählt und gesperrt wird in der Datenbank (Migration 20260927_v647_federn_stichtag.sql);
   die Regeln selbst sind am 27.09. direkt dort mit Rollback gefahren und im PR belegt –
   eine Attrappe würde jede Summe bestätigen. Hier geprüft, was die App dazu beiträgt:

   a) Der Stichtag ist eine Team-Einstellung: „Team-Quests verwalten“ zeigt „Federn zählen
      ab“ mit dem Datum aus team_einstellungen.federn_ab (nur Trainer), gerechnet in Europe/Berlin.
   b) Speichern ohne Änderung schreibt federn_ab NICHT (ein nicht geladener Wert darf den
      Stichtag nie leeren); ein geändertes Datum geht als 00:00 Uhr Berlin (UTC-Wert) raus.
   c) Kein Stichtag fest im Code: kein Datum 2026-09-28 in einer App-Datei.
   d) Serien-Federn erst nach den Trainings-Federn (der Server zählt für eine Serie nur
      Trainings seit dem Stichtag und muss die heutige schon sehen).
   e) Die Migration hält Quiz als einzige Ausnahme fest und behandelt Team-Level und
      Meilensteine mit derselben Summe. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const R = h.REPO;
  const s = await h.starten({ warten: 1200, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    team_config: [{ id: 1, belohnung: "", double_xp_until: null, teamquest_federn: 20 }],
    team_einstellungen: [{ id: 1, federn_ab: "2026-09-27T22:00:00+00:00" }],
    team_quests: []
  }) });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const zu = async () => { for (let i = 0; i < 60 && document.getElementById("quest-editor"); i++) await w(50); };
    document.getElementById("pin-gate")?.remove();
    if (typeof loadTeamConfig !== "function" || typeof questEditorOpen !== "function") return { fehlt: true };
    await loadTeamConfig();
    questEditorOpen(); await w(80);
    const f = document.getElementById("qe-federn-ab");
    const out = { wert: f ? f.value : null, label: (document.querySelector('label[for="qe-federn-ab"]') || {}).textContent || "",
      hoehe: f ? Math.round(f.getBoundingClientRect().height) : 0 };
    const btn = [...document.querySelectorAll("#quest-editor button")].find(b => /Speichern/.test(b.textContent));
    if (btn) btn.click(); await zu();
    questEditorOpen(); await w(80);
    const f2 = document.getElementById("qe-federn-ab"); if (f2) f2.value = "2026-10-05";
    const btn2 = [...document.querySelectorAll("#quest-editor button")].find(b => /Speichern/.test(b.textContent));
    if (btn2) btn2.click(); await zu();
    out.danach = typeof teamFedernAb !== "undefined" ? teamFedernAb : null;
    return out;
  });
  const cfg = s.gesendet.filter(x => /team_config/.test(x.pfad) && x.methode === "POST").map(x => x.body);
  const te = s.gesendet.filter(x => /team_einstellungen/.test(x.pfad) && x.methode === "POST").map(x => x.body);
  const fe = s.fehler();
  await s.schliessen();
  if (r.fehlt) return h.ergebnis("v647 Federn-Stichtag", false, ["loadTeamConfig/questEditorOpen fehlen"]);

  if (r.wert !== "2026-09-28") probleme.push(`a) Feld zeigt ${JSON.stringify(r.wert)} statt 2026-09-28`);
  if (!/zählen ab/.test(r.label)) probleme.push(`a) Beschriftung: ${r.label}`);
  if (r.hoehe < 44) probleme.push(`a) Datumsfeld ${r.hoehe} px hoch`);
  if (cfg.length !== 2) probleme.push(`b) ${cfg.length} Speicherungen der Team-Quests statt 2`);
  if (cfg.some(b => "federn_ab" in b)) probleme.push("b) Stichtag landet in team_config (für Eltern lesbar)");
  if (te.length !== 1) probleme.push(`b) ${te.length} Schreibzugriffe auf team_einstellungen statt 1 (nur beim geänderten Datum)`);
  else if (te[0].federn_ab !== "2026-10-04T22:00:00.000Z") probleme.push(`b) geändertes Datum als ${JSON.stringify(te[0].federn_ab)} gesendet`);
  if (r.danach !== "2026-10-04T22:00:00.000Z") probleme.push(`b) teamFedernAb danach ${r.danach}`);

  // c)
  const appDateien = fs.readdirSync(R).filter(f => /\.(js|html)$/.test(f) && f !== "sw.js");
  const mitDatum = appDateien.filter(f => /2026-09-28|28\.09\.2026/.test(fs.readFileSync(path.join(R, f), "utf8")));
  if (mitDatum.length) probleme.push("c) Stichtag fest im Code: " + mitDatum.join(", "));

  // d)
  const boot = fs.readFileSync(path.join(R, "boot.js"), "utf8");
  if (!/Promise\.all\([^;]*"training"[^;]*\)\s*\.then\(\(\)=>awStreakAward\(data\)\)/.test(boot)) probleme.push("d) Serien werden nicht erst nach den Trainings-Federn vergeben");

  // e)
  const mig = fs.readFileSync(path.join(R, "supabase/migrations/20260927_v647_federn_stichtag.sql"), "utf8");
  if (!/p_quelle in \('quiz','wissensquiz','fairplay_quiz'\)/.test(mig)) probleme.push("e) Quiz-Quellen nicht festgehalten");
  if (!/v_federn := public\.team_federn_total_roh\(\)/.test(mig)) probleme.push("e) Meilensteine zählen nicht mit der Team-Summe");
  if (!/create policy "te trainer" on public\.team_einstellungen for all to authenticated using \(public\.is_trainer\(\)\)/.test(mig)) probleme.push("e) team_einstellungen ohne Trainer-RLS");
  if (/delete from public\.punkte_log/i.test(mig)) probleme.push("e) Migration löscht Buchungen");

  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`Feld ${r.wert} · Speichern unverändert ohne Stichtag · geändert → ${te[0] && te[0].federn_ab}`);
  return h.ergebnis("v647 Federn-Stichtag: Team-Einstellung, nichts im Code, Serien nach Training", !probleme.length, probleme.concat(zeilen));
};
