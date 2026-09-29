/* v675 · Team-Level neu starten und Federn frei vergeben
   PO 29.09.: „Setze die Team-Federn nochmal auf Null … Es soll auch möglich sein, als Trainer eine
   freie Anzahl an Federn dem Team, also jedem Spieler, zu geben und auch einzelnen Kindern.“
   Kacheln: „Nur Team-Level“ (Karten der Kinder bleiben) und „1 bis 100 je Kind“ (mit Grund).
   In der Datenbank mit Rollback gefahren: nach dem Neustart Team 0, Karten unverändert; 20 an alle
   14 aktiven Kinder → Team 280; 101 und ohne Grund abgewiesen; reine Eltern können nicht vergeben
   und sehen das Lob nur fürs eigene Kind. Am 29.09. eingespielt, Team-Level steht auf 0.
   a) Kachel „Federn vergeben“ unter Eltern & Kinder
   b) Ganzes Team: jedes aktive Kind, genau die gewählte Zahl, mit Grund, über xp_award_frei
   c) Einzelne Kinder: nur die angehakten
   d) Über 100, ohne Grund oder ohne Kind: kein Aufruf
   e) Team-Quests: „Team-Level jetzt auf Null“ schreibt nur team_ab – nie federn_ab
   f) Kabine zeigt „Vom Trainerteam“ mit Zahl und Grund
   g) Hilfe erklärt, wofür es Federn gibt, und die Migration begrenzt 1–100 und nur Trainer */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const kader = h.kaderZeilen({ inaktiv: [h.KINDER[14]] });
  const aktiv = kader.filter(k => k.aktiv).length;
  const t = await h.starten({ warten: 1500, hoehe: 1000, supabase: h.supabaseAttrappe({
    kader, team_einstellungen: [{ id: 1, federn_ab: "2026-09-27T22:00:00Z", team_ab: null }],
    team_config: [{ id: 1, belohnung: "", teamquest_federn: 20, double_xp_until: null }], team_quests: [],
    rpc: { xp_award_frei: (u, req) => JSON.parse(req.postData() || "{}").p_spieler_ids.length }
  }) });
  const r = await t.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    document.getElementById("pin-gate")?.remove();
    if (typeof federnVergebenOpen !== "function" || typeof teamLevelNeustart !== "function") return { fehlt: true };
    window.frageJaNein = async () => true;
    const out = { kachel: /federnVergebenOpen/.test(_kachelInhalt("elki")) };
    const setz = (n, g) => { document.getElementById("fv-anzahl").value = n; document.getElementById("fv-grund").value = g; };
    // b) ganzes Team
    federnVergebenOpen(); await w(50);
    const m = document.getElementById("fv-modal");
    out.dialog = m.getAttribute("role");
    out.team = [...m.querySelectorAll(".fv-art")].map(b => b.textContent.trim() + "/" + b.getAttribute("aria-pressed"));
    out.hoehe = Math.round(document.getElementById("fv-los").getBoundingClientRect().height);
    setz(20, "Super Einsatz beim Turnier");
    await federnVergebenLos(document.getElementById("fv-los")); await w(100);
    out.zuNachTeam = !document.getElementById("fv-modal");
    // d) ungültig
    federnVergebenOpen(); await w(50);
    setz(150, "Zu viel"); await federnVergebenLos(); await w(50);
    setz(10, " "); await federnVergebenLos(); await w(50);
    federnVergebenArt(false); setz(10, "Tolle Pässe"); await federnVergebenLos(); await w(50);
    // c) einzelne
    const boxen = [...document.querySelectorAll("#fv-kinder .fv-kind")];
    out.kinderSichtbar = getComputedStyle(document.getElementById("fv-kinder")).display;
    out.boxen = boxen.length;
    boxen[1].checked = true; boxen[3].checked = true;
    await federnVergebenLos(); await w(100);
    // e) Team-Level
    questEditorOpen(); await w(100);
    out.teamText = (document.getElementById("qe-team-ab") || {}).textContent || "";
    const knopf = [...document.querySelectorAll("#quest-editor button")].find(b => /Team-Level jetzt auf Null/.test(b.textContent));
    out.knopf = !!knopf;
    if (knopf) { await teamLevelNeustart(knopf); await w(100); }
    out.teamTextDanach = (document.getElementById("qe-team-ab") || {}).textContent || "";
    return out;
  });
  const frei = t.gesendet.filter(x => x.pfad.endsWith("/rpc/xp_award_frei")).map(x => x.body);
  const te = t.gesendet.filter(x => /team_einstellungen/.test(x.pfad)).map(x => x.body);
  const f1 = t.fehler(); await t.schliessen();
  if (r.fehlt) return h.ergebnis("Federn frei vergeben, Team-Level neu", false, ["federnVergebenOpen/teamLevelNeustart fehlt"]);
  if (!r.kachel) probleme.push("a) Kachel „Federn vergeben“ fehlt unter Eltern & Kinder");
  if (r.dialog !== "dialog") probleme.push("b) Fenster ist kein Dialog");
  if (r.team[0] !== `Ganzes Team (${aktiv})/true`) probleme.push(`b) Team-Knopf: ${JSON.stringify(r.team)}`);
  if (r.hoehe < 56) probleme.push(`b) Hauptaktion ${r.hoehe} px`);
  const b0 = frei[0] || {};
  if (!b0.p_spieler_ids || b0.p_spieler_ids.length !== aktiv || b0.p_spieler_ids.includes(15) || b0.p_anzahl !== 20 || b0.p_grund !== "Super Einsatz beim Turnier") probleme.push(`b) Team-Vergabe: ${JSON.stringify(b0)}`);
  if (!r.zuNachTeam) probleme.push("b) Fenster bleibt nach dem Vergeben offen");
  if (frei.length !== 2) probleme.push(`d) ${frei.length} Aufrufe statt 2 (Team + zwei Kinder) – ungültige Eingaben gingen durch?`);
  const b1 = frei[1] || {};
  if (r.kinderSichtbar !== "grid" || r.boxen !== aktiv) probleme.push(`c) Kinderliste: ${r.kinderSichtbar}, ${r.boxen} Kästchen`);
  if (JSON.stringify(b1.p_spieler_ids) !== "[2,4]" || b1.p_anzahl !== 10 || b1.p_grund !== "Tolle Pässe") probleme.push(`c) Einzeln: ${JSON.stringify(b1)}`);
  if (!r.knopf) probleme.push("e) Knopf „Team-Level jetzt auf Null“ fehlt");
  const tb = te[te.length - 1] || {};
  if (!tb.team_ab || "federn_ab" in tb) probleme.push(`e) Team-Level-Neustart schreibt: ${JSON.stringify(te)}`);
  if (!/Karten der Kinder bleiben unberührt/.test(r.teamTextDanach)) probleme.push(`e) Hinweis: „${r.teamTextDanach}“`);
  if (f1.length) probleme.push("Konsole Trainer: " + f1.slice(0, 2).join(" | "));
  zeilen.push(`a) Kachel · b) Team: ${b0.p_spieler_ids ? b0.p_spieler_ids.length : 0} Kinder × ${b0.p_anzahl} „${b0.p_grund}“ · c) einzeln ${JSON.stringify(b1.p_spieler_ids)} · d) 3 ungültige ohne Aufruf`);
  zeilen.push(`e) ${JSON.stringify(tb).slice(0, 60)} · „${r.teamTextDanach.slice(0, 60)}“`);

  // f) Kabine
  const k = await h.starten({ start: "/eltern/index.html", warten: 1200, hoehe: 900, supabase: h.supabaseAttrappe({
    rpc: { xp_lob: [{ spieler_id: 1, delta: 20, grund: "Super Einsatz beim Turnier", created_at: new Date().toISOString() }] }
  }) });
  const rk = await k.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    if (typeof kabineLobLoad !== "function") return { fehlt: true };
    window.sbToken = () => "x." + btoa(JSON.stringify({ sub: "u-eigen" })) + ".y";
    window._elternKids = [{ spieler_id: 1 }];
    const el = document.createElement("div"); el.id = "kab-lob"; document.body.appendChild(el);
    await kabineLobLoad(); await w(50);
    return { text: el.textContent.replace(/\s+/g, " ").trim() };
  });
  const kg = k.gesendet.filter(x => /xp_lob/.test(x.pfad)).length;
  const f2 = k.fehler(); await k.schliessen();
  if (rk.fehlt) probleme.push("f) kabineLobLoad fehlt");
  else if (!/Vom Trainerteam/.test(rk.text) || !/\+20/.test(rk.text) || !/Super Einsatz beim Turnier/.test(rk.text)) probleme.push(`f) Kabine: „${rk.text}“`);
  if (kg) probleme.push("f) Kabine liest das Lob per POST (sähe aus wie ein Schreibzugriff)");
  if (f2.length) probleme.push("Konsole Kabine: " + f2.slice(0, 2).join(" | "));
  zeilen.push(`f) Kabine: „${rk.text || ""}“`);

  // g) Hilfe und Migration
  const views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  if (!/Federn – wofür es sie gibt/.test(views) || !/Training anwesend 15/.test(views) || !/Team-Level jetzt auf Null/.test(views)) probleme.push("g) Hilfe-Eintrag „Federn – wofür es sie gibt“ fehlt oder unvollständig");
  const mig = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20260929_v675_team_level_frei.sql"), "utf8");
  if (!/not public\.is_trainer\(\)/.test(mig) || !/not between 1 and 100/.test(mig) || !/greatest\(federn_ab, team_ab\)/.test(mig)) probleme.push("g) Migration: Trainerprüfung, Grenze 1–100 oder Team-Start fehlt");
  zeilen.push("g) Hilfe erklärt alle Quellen und Einstellorte; nur Trainer, 1–100, Team-Start getrennt von den Karten");
  return h.ergebnis("Federn frei vergeben, Team-Level neu", !probleme.length, probleme.length ? probleme : zeilen);
};
