/* v496 – PO: „Rotations-Timer immer mit dem Countdown gleichzeitig starten. Kann bei Bedarf
   angehalten werden." und „Die Rolle Anstoß können wir rausnehmen."
   Geprueft: der zentrale Anpfiff startet den Wechsel-Timer des angezeigten Teams mit halber
   Spielzeit als Intervall und ohne Rueckfrage, ein Team, das die Runde aussetzt, startet nicht,
   Anhalten bleibt moeglich – und im Rollen-Panel steht nur noch der Kapitaen. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const heute = h.heute();
  let htRow = null;
  const s = await h.starten({ supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), nominierungen: [], matchday: [], match_actions: [],
    termine: [{ id: 1, datum: heute, typ: "turnier", heim: true, uhrzeit: "10:15", titel: "Kinderfestival", trainer_status: {} }],
    heimturnier: (u, req) => req.method() === "GET" ? (htRow ? [htRow] : []) : { status: 204, body: "" }
  }), hoehe: 1600 });
  const bau = await s.page.evaluate(({ heute }) => {
    // Sechs Teams auf zwei Feldern: in jeder Runde setzen zwei Teams aus
    const vereine = [{ name: "SV Adler Dellbrück", kinder: 14, teams: 2 }, { name: "SC Wahn Grengel", kinder: 10, teams: 2 }, { name: "SV Rath-Heumar", kinder: 10, teams: 2 }];
    const teams = fstTeamsBauen(vereine);
    const cfg = { art: "festival", format: "festival", start: "10:15", dauer: 60, spieldauer: 8, wechsel: 5, felder: [{ form: "f4" }, { form: "funino" }], vereine, infos: "" };
    return { id: 9, slug: "x", name: "Kinderfestival", datum: heute, config: cfg, teams: teams.map(t => t.name), plan: fstPlanBauen(teams, cfg) };
  }, { heute });
  htRow = bau;
  const r = await s.page.evaluate(async ({ heute, row }) => {
    if (typeof rotStart !== "function") return { fehlt: "rotStart" };
    await loadKader(); document.getElementById("pin-gate")?.remove();
    const app = document.getElementById("main-app"); if (app) app.style.display = "block";
    window.spieltagRawDate = () => heute; window.spieltagKey = () => heute;
    TEAM_ANZAHL = 2; Object.keys(TEAMS).forEach(k => delete TEAMS[k]);
    KADER.filter(k => k.aktiv !== false).forEach((k, i) => { TEAMS[k.name] = (i % 2) + 1; });
    Object.keys(nomStatus).forEach(k => delete nomStatus[k]); KADER.forEach(k => { nomStatus[k.name] = "dabei"; });
    let box = document.getElementById("team-panel"); if (!box) { box = document.createElement("div"); box.id = "team-panel"; document.body.appendChild(box); }
    // Ein confirm() beim Anpfiff wäre ein Fehler – wir zählen mit
    let fragen = 0; window.confirm = () => { fragen++; return true; };
    // Zeiten erfassen, damit rotReset() fragen würde
    rotFieldSec["Kind A"] = 120; rotIntervalMin = 5; rotElapsed = 99;
    if (rotTimerId) { clearInterval(rotTimerId); rotTimerId = null; }
    _HT = JSON.parse(JSON.stringify(row));
    // Welche Runde spielt Adler 1 nicht mit?
    const idx = row.teams.findIndex(n => /Adler/.test(n));
    const runden = [...new Set(row.plan.map(p => p.runde))].sort((a, b) => a - b);
    const ohne = runden.find(rr => !row.plan.some(p => p.runde === rr && (p.a === idx || p.b === idx)));
    const mit = runden.find(rr => row.plan.some(p => p.runde === rr && (p.a === idx || p.b === idx)));
    if (typeof spieltagTeam !== "undefined") spieltagTeam = 1;
    // a) Runde, in der Adler 1 spielt
    await fstAnpfiff(mit); await new Promise(r => setTimeout(r, 300));
    const a = { laeuft: !!rotTimerId, intervall: rotIntervalMin, elapsed: rotElapsed, zeiten: rotFieldSec["Kind A"], fragen };
    // b) anhalten bleibt möglich
    rotStop(); const b = { laeuft: !!rotTimerId };
    // c) Runde, in der Adler 1 aussetzt
    if (ohne) { _HT.config = JSON.parse(JSON.stringify(row.config)); await fstAnpfiff(ohne); await new Promise(r => setTimeout(r, 300)); }
    const c = { runde: ohne || null, laeuft: !!rotTimerId };
    if (rotTimerId) { clearInterval(rotTimerId); rotTimerId = null; }
    // d) Rollen-Panel
    let rp = document.getElementById("rollen-panel"); if (!rp) { rp = document.createElement("div"); rp.id = "rollen-panel"; document.body.appendChild(rp); }
    window.nominierteSpieler = () => KADER.slice(0, 5).map(k => k.name);
    await rollenPanelRender(); await new Promise(r => setTimeout(r, 100));
    return { a, b, c, rollen: rp.textContent.replace(/\s+/g, " "), anstossWeg: typeof window.anstossSet === "undefined" };
  }, { heute, row: bau });
  const fehler = s.fehler(); await s.schliessen();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt`); return h.ergebnis("Rotation und Rollen", false, probleme); }
  if (!r.a.laeuft) probleme.push("Der Wechsel-Timer startet nicht mit dem Anpfiff");
  if (r.a.intervall !== 4) probleme.push(`Wechsel alle ${r.a.intervall} Min. statt 4 (halbe Spielzeit)`);
  if (r.a.elapsed !== 0) probleme.push(`Der Rundenzähler startet bei ${r.a.elapsed} Sekunden`);
  if (r.a.zeiten !== 120) probleme.push(`Die erfassten Spielzeiten wurden gelöscht (${r.a.zeiten})`);
  if (r.a.fragen) probleme.push(`${r.a.fragen} Rückfrage(n) beim Anpfiff – der Trainer steht am Feld`);
  if (r.b.laeuft) probleme.push("Anhalten wirkt nicht mehr");
  if (r.c.runde && r.c.laeuft) probleme.push(`Der Timer läuft, obwohl Adler 1 Runde ${r.c.runde} aussetzt`);
  if (/Anstoß/.test(r.rollen)) probleme.push("Die Rolle „Anstoß“ steht noch im Panel");
  if (!/Kapitän/.test(r.rollen)) probleme.push("Der Kapitän fehlt im Panel");
  if (!r.anstossWeg) probleme.push("anstossSet lebt noch");
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Anpfiff: Timer läuft ${r.a.laeuft}, Wechsel alle ${r.a.intervall} Min., Zähler ${r.a.elapsed}s, Spielzeiten bleiben ${r.a.zeiten}s, ${r.a.fragen} Rückfragen`);
  zeilen.push(`Anhalten ${!r.b.laeuft} · aussetzende Runde ${r.c.runde || "–"} startet nicht ${!r.c.laeuft}`);
  zeilen.push(`Rollen: „${r.rollen.slice(0, 70)}“`);
  return h.ergebnis("Wechsel-Timer startet mit dem Anpfiff, Rolle „Anstoß“ ist raus", !probleme.length, zeilen.concat(probleme));
};
