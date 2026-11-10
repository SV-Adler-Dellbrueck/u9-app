/* v831 · Elternrunde: auch die Elternkonten von Trainern bleiben draußen (Charles 10.11.2026:
   „Ich kann in die Elterngruppe, obwohl ich Trainer bin – wahrscheinlich, weil ich mit einer anderen Mail angemeldet bin.“)
   a) Statisch: die Migration führt eine Sperrliste und fragt an allen Stellen, die v829 mit is_trainer() absicherte,
      jetzt rufe_trainerperson() (Raum sichtbar, Raumliste, Räume verwalten, Meldungen, Push). Keine Adresse im Repo.
   b) Am Gerät: im leeren Eltern-Raum steht nicht mehr „alle Eltern und das Trainerteam lesen mit“. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v831 Elternrunde: Elternkonten von Trainern gesperrt, richtiger Leertext";
  const probleme = [];
  const datei = path.join(h.REPO, "supabase/migrations/20261121_v831_elternrunde_ausschluss.sql");
  if (!fs.existsSync(datei)) return h.ergebnis(titel, false, ["Migration v831 fehlt (Stand vor v831)"]);
  const sql = fs.readFileSync(datei, "utf8");
  const muss = [
    ["Sperrliste", /create table if not exists public\.rufe_eltern_ausschluss/],
    ["RLS an", /alter table public\.rufe_eltern_ausschluss enable row level security/],
    ["Funktion", /create or replace function public\.rufe_trainerperson\(\)[\s\S]*rufe_eltern_ausschluss/],
    ["Raum sichtbar", /function public\.rufe_raum_sichtbar[\s\S]*when r\.nur_eltern then not public\.rufe_trainerperson\(\)/],
    ["Raumliste", /create policy rr_lesen[\s\S]*when nur_eltern then not public\.rufe_trainerperson\(\)/],
    ["Räume verwalten", /create policy rr_mod[\s\S]*not public\.rufe_trainerperson\(\)/],
    ["Meldungen", /create policy rme_mod[\s\S]*public\.rufe_trainerperson\(\)/],
    ["Push", /FUNCTION public\.rufe_push_faellig[\s\S]*r\.nur_eltern and \(e\.trainer or exists\(select 1 from rufe_eltern_ausschluss/i]
  ];
  for (const [n, re] of muss) if (!re.test(sql)) probleme.push("a) Migration: " + n + " fehlt");
  if (/@[a-z0-9.-]+\.[a-z]{2,}/i.test(sql.replace(/trainer@example\.org/g, ""))) probleme.push("a) Migration enthält eine E-Mail-Adresse");

  const token = sub => "x." + Buffer.from(JSON.stringify({ sub })).toString("base64") + ".y";
  const s = await h.starten({ start: "/eltern/index.html", warten: 1000, breite: 360, hoehe: 800, supabase: h.supabaseAttrappe({
    rufe_raum: () => [{ id: 9, name: "Elternrunde", emoji: "👪", sort: 10, familie_kind: null, nur_eltern: true }],
    rufe_nachricht: [], rufe_umfrage: [], rufe_reaktion: [], rufe_fixiert: [], rufe_gelesen: [], rufe_push_aus: [],
    rpc: { is_rufe_mod: false, rufe_ungelesen: [], rufe_umfrage_stand: [] } }) });
  const r = await s.page.evaluate(async tok => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 40 && typeof rufeOpen !== "function"; i++) await w(100);
    window.sbToken = () => tok;
    await rufeOpen(9); await w(900);
    return (document.getElementById("rufe-liste") || {}).innerText || "";
  }, token("u-eltern"));
  const f = s.fehler(); await s.schliessen();
  if (/Trainerteam lesen mit/.test(r)) probleme.push("b) Leertext behauptet, das Trainerteam lese mit: " + r.replace(/\s+/g, " "));
  if (!/nur Eltern/.test(r)) probleme.push("b) Leertext sagt nicht, dass nur Eltern lesen: " + r.replace(/\s+/g, " "));
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme : ["Sperrliste an allen Stellen · Leertext: " + r.replace(/\s+/g, " ").slice(0, 90)]);
};
