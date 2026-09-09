/* v480 – PO: „Die Teams sollen aber nicht fest alle Spiele 4+1 oder nur FUNiño spielen,
   sondern auch durchwechseln." Antworten (Kacheln, Freitext): feste Teams, die Teamgroesse
   wird je Runde angepasst, wenn das Feld mehr Kinder braucht; Felder und Formate stehen vor
   dem Festival fest; Torwart-Kinder wechseln sich ab und spielen auch FUNiño.
   Geprueft mit 8 Kindern (Kind A = Torwart) auf Feld 1 (4+1) und Feld 2 (FUNiño):
   Grund-Einteilung 4 + 4; Runde 1: Adler 1 auf 4+1 bekommt ein Kind aus Adler 2 (5 + 3);
   Runde 2: Felder getauscht, Aushilfe zurueck, Adler 2 braucht auf 4+1 einen Torwart und
   bekommt Kind A (3 + 5); Anzeige nennt Runde, Zuordnung und Aushilfe; alles wird gespeichert. */
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const heute = h.heute();
  const termine = [{ id: 1, datum: heute, typ: "turnier", titel: "Kinderfestival · Heim", heim: true, uhrzeit: "10:15", trainer_status: {} }];
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, nominierungen: [] }), hoehe: 1800 });
  await h.sichtbarMachen(s.page, "#train-sub-spieltag");
  const r = await s.page.evaluate(async ({ K, heute }) => {
    await loadKader();
    if (typeof teamFelderAendern !== "function" || typeof teamRundeSetzen !== "function") return { fehlt: "teamFelderAendern" };
    let sd = document.getElementById("spieltag-date"); if (!sd) { sd = document.createElement("select"); sd.id = "spieltag-date"; document.body.appendChild(sd); }
    sd.innerHTML = `<option value="${heute}" selected>${heute}</option>`; sd.value = heute;
    let panel = document.getElementById("team-panel"); if (!panel) { panel = document.createElement("div"); panel.id = "team-panel"; document.body.appendChild(panel); }
    Object.keys(nomStatus).forEach(k => delete nomStatus[k]);
    K.forEach((n, i) => { nomStatus[n] = i < 8 ? "dabei" : "nicht"; });
    TEAM_ANZAHL = 2; TEAMS = {}; TEAM_FORM = {};
    teamFelderAendern(["4+1", "funino"]);
    const groesse = t => Object.keys(TEAMS).filter(x => TEAMS[x] === t).length;
    const leih = () => Object.assign({}, TEAM_LEIH);
    const r1 = { t1: groesse(1), t2: groesse(2), leih: leih(), twTeam: TEAMS[K[0]], form1: teamFormVon(1), form2: teamFormVon(2) };
    const rundeText = () => document.getElementById("team-runde")?.textContent.replace(/\s+/g, " ").trim() || "";
    const r1Text = rundeText();
    const feldSegs = document.querySelectorAll('#team-felder [aria-label^="Spielform Feld"]').length;
    const teamSegs = document.querySelectorAll('#team-panel [aria-label^="Spielform Adler"]').length;
    teamRundeSetzen(2); await new Promise(r => setTimeout(r, 400));   // teamsSpeichern laeuft ohne await – sonst liest der Test vor dem Upsert
    const r2 = { t1: groesse(1), t2: groesse(2), leih: leih(), twTeam: TEAMS[K[0]], form1: teamFormVon(1), form2: teamFormVon(2), text: rundeText() };
    return { r1, r1Text, feldSegs, teamSegs, r2 };
  }, { K, heute });
  const fehler = s.fehler();
  const saves = s.gesendet.filter(g => g.methode === "POST" && /nominierungen$/.test(g.pfad) && g.body && String(g.body.datum || "").endsWith("__teams"));
  await s.schliessen();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt`); return h.ergebnis("Festival-Runden", false, probleme); }
  if (r.r1.t1 !== 5 || r.r1.t2 !== 3) probleme.push(`Runde 1: ${r.r1.t1} + ${r.r1.t2} statt 5 + 3 (Aushilfe für das 4+1-Feld)`);
  if (Object.keys(r.r1.leih).length !== 1 || Object.values(r.r1.leih)[0] !== 2) probleme.push(`Runde 1: Aushilfe ${JSON.stringify(r.r1.leih)} statt genau ein Kind aus Adler 2`);
  if (r.r1.form1 !== "4+1" || r.r1.form2 !== "funino") probleme.push(`Runde 1: Spielformen ${r.r1.form1}/${r.r1.form2}`);
  if (r.r1.twTeam !== 1) probleme.push(`Runde 1: Torwart-Kind in Team ${r.r1.twTeam} statt 1`);
  if (!/Runde 1/.test(r.r1Text) || !/Adler 1 → Feld 1/.test(r.r1Text) || !/Aushilfe/.test(r.r1Text)) probleme.push(`Runden-Anzeige unvollständig: „${r.r1Text.slice(0, 120)}“`);
  if (r.feldSegs !== 2) probleme.push(`${r.feldSegs} Feld-Wähler statt 2`);
  if (r.teamSegs !== 0) probleme.push(`mit Feldern stehen noch ${r.teamSegs} Spielform-Wähler je Team`);
  if (r.r2.form1 !== "funino" || r.r2.form2 !== "4+1") probleme.push(`Runde 2: Felder nicht getauscht (${r.r2.form1}/${r.r2.form2})`);
  if (r.r2.t1 !== 3 || r.r2.t2 !== 5) probleme.push(`Runde 2: ${r.r2.t1} + ${r.r2.t2} statt 3 + 5`);
  if (r.r2.twTeam !== 2 || r.r2.leih[K[0]] !== 1) probleme.push(`Runde 2: Torwart-Kind hilft nicht bei Adler 2 aus (Team ${r.r2.twTeam}, Leih ${JSON.stringify(r.r2.leih)})`);
  if (!/Runde 2/.test(r.r2.text)) probleme.push("Runde 2 wird nicht angezeigt");
  const last = saves[saves.length - 1];
  if (!last || !Array.isArray(last.body.data._felder) || last.body.data._felder.join() !== "4+1,funino" || last.body.data._runde !== 2 || !last.body.data._leih || last.body.data._leih["1"] !== 1) probleme.push(`Speichern ohne Felder/Runde/Aushilfe: ${JSON.stringify(last && { f: last.body.data._felder, r: last.body.data._runde, l: last.body.data._leih })}`);
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Runde 1: ${r.r1.t1} + ${r.r1.t2} (${r.r1.form1}/${r.r1.form2}), Aushilfe ${JSON.stringify(r.r1.leih)}, TW in Team ${r.r1.twTeam}`);
  zeilen.push(`Runde 2: ${r.r2.t1} + ${r.r2.t2} (${r.r2.form1}/${r.r2.form2}), Aushilfe ${JSON.stringify(r.r2.leih)}, TW in Team ${r.r2.twTeam}`);
  zeilen.push(`Anzeige: „${r.r2.text.slice(0, 110)}…“ · Feld-Wähler ${r.feldSegs} · gespeichert ${saves.length}×`);
  return h.ergebnis("Festival-Runden: Felder, feste Teams wandern, Aushilfe je Runde, Torwart wechselt", !probleme.length, zeilen.concat(probleme));
};
