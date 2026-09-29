/* v663 · Ansprechpartner im Team unter „Mehr vom Team“
   PO 28.09.: „… sollte in der App auch unter ‚Mehr vom Team' der gewählte Elternbeirat stehen
   und Kassenwart … Mannschaftskasse: 40 €/Saison.“ Die echten Namen stehen nur in der
   Datenbank (team_config.eltern_team) – hier Platzhalter.
   a) Eltern-Bereich: Karte „Ansprechpartner im Team“ mit Rollen, Namen und Beitrag, im Reiter „Mehr vom Team“
   b) Nichts gepflegt: keine leere Karte
   c) Trainer-Editor schreibt team_config (id 1, Upsert) mit Rollen und Beitrag; leere Zeilen fallen weg
   d) Keine Namen im Code: die Karte kommt nur aus der Datenbank */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const et = { rollen: [{ rolle: "Elternbeirat", name: "Elternteil von Kind A" }, { rolle: "Kasse", name: "Elternteil von Kind B" }], kasse_beitrag: "40 € pro Saison" };
  const lauf = async wert => {
    const s = await h.starten({ start: "/eltern/index.html", warten: 1200,
      supabase: h.supabaseAttrappe({ team_config: u => /eltern_team/.test(u.search) ? [{ eltern_team: wert }] : [] }) });
    const r = await s.page.evaluate(async () => {
      let slot = document.getElementById("team-ansprech-slot");
      if (!slot) { slot = document.createElement("div"); slot.id = "team-ansprech-slot"; document.body.appendChild(slot); }
      await elternTeamAnsprechLoad();
      return { text: slot.textContent.replace(/\s+/g, " ").trim() };
    });
    const f = s.fehler(); await s.schliessen();
    if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
    return r;
  };
  const a = await lauf(et);
  const portal = fs.readFileSync(path.join(h.REPO, "md-eltern-portal.js"), "utf8");
  const von = portal.indexOf('id="cat-mehr"'), bis = portal.indexOf("/cat-mehr", von), slotPos = portal.indexOf('id="team-ansprech-slot"');
  if (!(von > 0 && slotPos > von && slotPos < bis)) probleme.push("a) Platz für die Karte fehlt im Reiter „Mehr vom Team“");
  for (const w of ["Ansprechpartner im Team", "Elternbeirat", "Elternteil von Kind A", "Kasse", "Elternteil von Kind B", "Mannschaftskasse", "40 € pro Saison"])
    if (!a.text.includes(w)) probleme.push(`a) „${w}“ fehlt: ${a.text.slice(0, 160)}`);
  zeilen.push(`a) ${a.text.slice(0, 140)}`);
  const b = await lauf(null);
  if (b.text) probleme.push("b) Leere Karte steht da: " + b.text.slice(0, 80));
  zeilen.push(`b) ohne Pflege: ${b.text ? "Karte da" : "nichts"}`);

  const s = await h.starten({ start: "/trainer/index.html", warten: 1500,
    supabase: h.supabaseAttrappe({ team_config: u => /eltern_team/.test(u.search) ? [{ eltern_team: null }] : [] }) });
  await s.page.evaluate(async () => {
    await elternTeamEditOpen();
    const r = document.querySelectorAll("#et-modal .et-rolle"), n = document.querySelectorAll("#et-modal .et-name");
    r[0].value = "Elternbeirat"; n[0].value = "Elternteil von Kind C"; r[2].value = "Kasse"; n[2].value = "Elternteil von Kind D";
    r[1].value = "nur Rolle";
    document.getElementById("et-beitrag").value = "40 € pro Saison";
    await elternTeamEditSave(document.getElementById("et-save"));
  });
  await s.page.waitForTimeout(300);
  const post = s.gesendet.find(x => /team_config/.test(x.pfad));
  const zu = await s.page.evaluate(() => !document.getElementById("et-modal"));
  const f = s.fehler(); await s.schliessen();
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  const body = post && (Array.isArray(post.body) ? post.body[0] : post.body);
  if (!post || !/on_conflict=id/.test(post.suche) || !body || body.id !== 1) probleme.push("c) Kein Upsert auf team_config id 1");
  else {
    const rl = (body.eltern_team && body.eltern_team.rollen) || [];
    if (rl.length !== 2 || rl[1].name !== "Elternteil von Kind D") probleme.push("c) Rollen falsch: " + JSON.stringify(rl));
    if (body.eltern_team.kasse_beitrag !== "40 € pro Saison") probleme.push("c) Beitrag fehlt");
  }
  if (!zu) probleme.push("c) Fenster bleibt nach dem Speichern offen");
  zeilen.push(`c) gesendet: ${post ? JSON.stringify(body.eltern_team).slice(0, 140) : "nichts"}`);

  const code = ["md-eltern-portal.js", "views.js"].map(d => fs.readFileSync(path.join(h.REPO, d), "utf8")).join("\n");
  if (/Elternbeirätin:|Kassenwärtin:/.test(code)) probleme.push("d) Namen stehen im Code");
  const mig = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20260928_v663_eltern_team.sql"), "utf8");
  if (!/add column if not exists eltern_team jsonb/.test(mig)) probleme.push("d) Migration ohne Spalte eltern_team");
  return h.ergebnis("v663 Ansprechpartner im Team", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
