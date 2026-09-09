/* v493 – PO: „Wir haben bei Teams festlegen auch eine Planung der Adler-Teams eingebaut. Können
   wir diese nicht direkt an den Turnier-Spielplan koppeln und automatisieren?" Kacheln: Feld und
   Spielform kommen aus dem Spielplan und werden dort geändert · die Runde springt mit dem Anpfiff ·
   die Team-Kachel nennt Feld, Spielform und Gegner. Geprueft: Zuordnung und Spielform folgen dem
   Plan, der Gegner steht dabei, der Anpfiff schaltet weiter, Abgeleitetes wird nicht gespeichert,
   und ohne Spielplan bleibt die Handsteuerung. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const heute = h.heute();
  let htRow = null;
  const s = await h.starten({ supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    termine: [{ id: 1, datum: heute, typ: "turnier", heim: true, uhrzeit: "10:15", titel: "Kinderfestival", trainer_status: {} }],
    nominierungen: [], matchday: [],
    heimturnier: (u, req) => req.method() === "GET" ? (htRow ? [htRow] : []) : { status: 204, body: "" }
  }), hoehe: 1600 });
  // 1) Spielplan bauen – wie ihn der Planer erzeugt
  const bau = await s.page.evaluate(({ heute }) => {
    if (typeof fstPlanBauen !== "function") return null;
    const teams = fstTeamsBauen([{ name: "SV Adler Dellbrück", kinder: 14, teams: 2 }, { name: "SC Wahn Grengel", kinder: 10, teams: 2 }]);
    const cfg = { art: "festival", format: "festival", start: "10:15", dauer: 60, spieldauer: 8, wechsel: 5, felder: fstFelderKuerzen(FST_STANDARD_FELDER, teams), vereine: [] };
    return { id: 9, slug: "x", name: "Kinderfestival", datum: heute, config: cfg, teams: teams.map(t => t.name), plan: fstPlanBauen(teams, cfg) };
  }, { heute });
  if (!bau) { await s.schliessen(); return h.ergebnis("Teams aus dem Spielplan", false, ["fstPlanBauen fehlt"]); }
  htRow = bau;
  const feldVon = (runde, teamIdx) => { const p = bau.plan.find(x => x.runde === runde && (x.a === teamIdx || x.b === teamIdx)); return p ? { feld: p.feld, form: p.form, gegner: bau.teams[p.a === teamIdx ? p.b : p.a] } : null; };
  // 2) Teams festlegen liest den Plan
  const vor = await s.page.evaluate(async ({ heute }) => {
    if (typeof teamPlanLaden !== "function") return { fehlt: "teamPlanLaden" };
    await loadKader(); document.getElementById("pin-gate")?.remove();
    const app = document.getElementById("main-app"); if (app) app.style.display = "block";
    window.spieltagRawDate = () => heute; window.spieltagKey = () => heute;
    TEAM_ANZAHL = 2; Object.keys(TEAMS).forEach(k => delete TEAMS[k]);
    KADER.filter(k => k.aktiv !== false).forEach((k, i) => { TEAMS[k.name] = (i % 2) + 1; });
    Object.keys(nomStatus).forEach(k => delete nomStatus[k]);
    KADER.forEach(k => { nomStatus[k.name] = "dabei"; });
    let box = document.getElementById("team-panel");
    if (!box) { box = document.createElement("div"); box.id = "team-panel"; document.body.appendChild(box); }
    await teamPlanLaden(); teamsRender();
    await new Promise(r => setTimeout(r, 100));
    return { runde: TEAM_PLAN && TEAM_PLAN.runde, felder: (TEAM_PLAN || {}).felder,
      von: JSON.parse(JSON.stringify((TEAM_PLAN || {}).von || {})),
      idx: [1, 2].map(t => teamFeldIndex(t)), form: [1, 2].map(t => teamFormVon(t)),
      panel: box.textContent.replace(/\s+/g, " "), gespeichertFelder: TEAM_FELDER.slice() };
  }, { heute });
  if (vor.fehlt) { await s.schliessen(); return h.ergebnis("Teams aus dem Spielplan", false, [`${vor.fehlt} fehlt`]); }
  // 3) Anpfiff der zweiten Runde – die Ansicht muss mitziehen
  const nach = await s.page.evaluate(async ({ row }) => {
    _HT = JSON.parse(JSON.stringify(row));
    await fstAnpfiff(2);
    await new Promise(r => setTimeout(r, 200));
    return { config: _HT.config };
  }, { row: bau });
  htRow = { ...bau, config: nach.config };
  const jetzt = await s.page.evaluate(async () => {
    await teamPlanNachziehen();
    await new Promise(r => setTimeout(r, 150));
    const box = document.getElementById("team-panel");
    return { runde: TEAM_PLAN && TEAM_PLAN.runde, idx: [1, 2].map(t => teamFeldIndex(t)), form: [1, 2].map(t => teamFormVon(t)),
      panel: box.textContent.replace(/\s+/g, " ") };
  });
  // 4) Speichern trägt kein abgeleitetes Feld – und ohne Plan bleibt die Handsteuerung
  const rest = await s.page.evaluate(async () => {
    await teamsSpeichern();
    await new Promise(r => setTimeout(r, 200));
    return { ok: true };
  });
  const gesendet = s.gesendet.slice();
  htRow = null;
  const ohne = await s.page.evaluate(async () => {
    await teamPlanLaden();
    teamFelderAendern(["4+1", "funino"]); teamsRender();
    await new Promise(r => setTimeout(r, 150));
    const box = document.getElementById("team-panel");
    return { plan: TEAM_PLAN, panel: box.textContent.replace(/\s+/g, " "), idx: [1, 2].map(t => teamFeldIndex(t)) };
  });
  const fehler = s.fehler(); await s.schliessen();
  // Auswertung
  const soll1 = [feldVon(1, 0), feldVon(1, 1)], soll2 = [feldVon(2, 0), feldVon(2, 1)];
  if (vor.runde !== 1) probleme.push(`erste Runde ${vor.runde} statt 1`);
  [0, 1].forEach(i => {
    if (!soll1[i]) return;
    if (vor.idx[i] !== soll1[i].feld - 1) probleme.push(`Adler ${i + 1} steht auf Feld ${vor.idx[i] + 1}, der Plan sagt ${soll1[i].feld}`);
    const sollForm = soll1[i].form === "f4" ? "4+1" : "funino";
    if (vor.form[i] !== sollForm) probleme.push(`Adler ${i + 1} spielt ${vor.form[i]}, das Feld ist ${sollForm}`);
    if ((vor.von[i + 1] || {}).gegner !== soll1[i].gegner) probleme.push(`Gegner von Adler ${i + 1}: „${(vor.von[i + 1] || {}).gegner}“ statt „${soll1[i].gegner}“`);
  });
  if (!/aus dem Spielplan/.test(vor.panel) || !/Im Spielplan ändern/.test(vor.panel)) probleme.push("Der Abschnitt nennt den Spielplan nicht als Quelle");
  if (/Nächste Runde/.test(vor.panel)) probleme.push("Der Runden-Knopf steht noch da, obwohl der Plan führt");
  if (!/Runde 1 von/.test(vor.panel)) probleme.push(`Kopfzeile „${vor.panel.slice(0, 60)}“`);
  if (jetzt.runde !== 2) probleme.push(`nach dem Anpfiff Runde ${jetzt.runde} statt 2`);
  if (!/Runde 2 von/.test(jetzt.panel)) probleme.push("Die Ansicht zieht nach dem Anpfiff nicht mit");
  [0, 1].forEach(i => { if (soll2[i] && jetzt.idx[i] !== soll2[i].feld - 1) probleme.push(`Runde 2: Adler ${i + 1} auf Feld ${jetzt.idx[i] + 1}, Plan sagt ${soll2[i].feld}`); });
  const nom = gesendet.filter(g => /nominierungen/.test(g.pfad) && g.methode === "POST" && g.body && /__teams$/.test(String(g.body.datum || ""))).pop();
  if (!nom) probleme.push("keine Einteilung gespeichert");
  else if (!Array.isArray(nom.body.data._felder) || nom.body.data._felder.length) probleme.push(`abgeleitete Felder gespeichert: ${JSON.stringify(nom.body.data._felder)}`);
  if (ohne.plan) probleme.push("ohne Spielplan bleibt die Kopplung aktiv");
  if (!/Nächste Runde/.test(ohne.panel)) probleme.push("ohne Spielplan fehlt die Handsteuerung");
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Runde 1: Adler 1 → ${vor.von[1] && vor.von[1].feldName} (${vor.form[0]}) gegen ${vor.von[1] && vor.von[1].gegner} · Adler 2 → ${vor.von[2] && vor.von[2].feldName} (${vor.form[1]})`);
  zeilen.push(`Anpfiff Runde 2 → Ansicht auf Runde ${jetzt.runde}, Felder ${JSON.stringify(jetzt.idx.map(i => i + 1))}, Formen ${JSON.stringify(jetzt.form)}`);
  zeilen.push(`Gespeichert ohne abgeleitete Felder ${nom ? JSON.stringify(nom.body.data._felder) : "–"} · ohne Spielplan wieder von Hand ${/Nächste Runde/.test(ohne.panel)}`);
  return h.ergebnis("Teams festlegen liest Feld, Spielform und Gegner aus dem Spielplan", !probleme.length, zeilen.concat(probleme));
};
