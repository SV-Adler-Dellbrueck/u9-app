/* v504 – PO: „Wie nutzen wir diese Funktionen während eines Festivals, weil es da viele Spiele
   geben wird? Momentan hängt das alles unter Spieltag und Match, aber eigentlich brauchen wir das
   für jedes einzelne Spiel." Kachel: die Runde aus dem Spielplan ist das Spiel. Geprueft: Tor und
   Gegentor tragen die Runde; Tore und Gegentore einer Runde landen als Ergebnis im Festival-Plan
   (nur dieses Spiel, aus unserer Sicht); der Trainer-Ticker und der Eltern-Ticker zeigen einen
   Absatz je Spiel mit Gegner und Feld; das Live-Ergebnis zaehlt nur die laufende Runde;
   Ereignisse ohne Runde bleiben lesbar. */
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const heute = h.heute();
  let htRow = null; const patches = [], actions = [], events = [];
  const filt = (rows, u, felder) => rows.filter(x => felder.every(f => { const v = u.searchParams.get(f); return !v || !v.startsWith("eq.") || String(x[f]) === v.slice(3); }));
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [], nominierungen: [], matchday: (u, req) => req.method() === "GET" ? [] : { status: 201, body: "[]" },
    heimturnier: (u, req) => { if (req.method() === "PATCH") { const b = JSON.parse(req.postData() || "{}"); patches.push(b); if (htRow && b.plan) htRow.plan = b.plan; return { status: 204, body: "" }; } return htRow ? [htRow] : []; },
    match_actions: (u, req) => { if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); b.id = actions.length + 1; actions.push(b); return { status: 201, body: JSON.stringify([b]) }; } return filt(actions, u, ["aktion", "runde", "datum"]); },
    ticker_events: (u, req) => { if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); b.id = events.length + 1; b.created_at = new Date(Date.now() + events.length * 1000).toISOString(); events.push(b); return { status: 201, body: "[]" }; } return filt(events, u, ["typ", "runde"]).slice().reverse(); }
  }), hoehe: 1600 });
  await h.sichtbarMachen(s.page, "#train-sub-spieltag");
  htRow = await s.page.evaluate(async ({ heute }) => {
    await loadKader();
    if (typeof fstPlanBauen !== "function" || typeof fstAdlerSpiele !== "function") return null;
    const vereine = [{ name: "SV Adler Dellbrück", kinder: 10, teams: 2 }, { name: "SC Wahn Grengel", kinder: 10, teams: 2 }, { name: "SV Rath-Heumar", kinder: 10, teams: 2 }];
    const teams = fstTeamsBauen(vereine);
    const cfg = { art: "festival", format: "festival", start: "10:15", dauer: 60, spieldauer: 8, wechsel: 5, felder: fstFelderKuerzen(FST_STANDARD_FELDER, teams), vereine, infos: "" };
    return { id: 9, slug: "kinderfestival-test", name: "Kinderfestival", datum: heute, config: cfg, teams: teams.map(t => t.name), plan: fstPlanBauen(teams, cfg) };
  }, { heute });
  if (!htRow) { await s.schliessen(); return h.ergebnis("Spiel je Runde", false, ["fstPlanBauen/fstAdlerSpiele fehlt"]); }
  const r = await s.page.evaluate(async ({ K, heute }) => {
    if (typeof teamErgebnisNachziehen !== "function" || typeof tickerAbsaetze !== "function") return { fehlt: "teamErgebnisNachziehen/tickerAbsaetze" };
    const warte = ms => new Promise(r => setTimeout(r, ms));
    let sd = document.getElementById("spieltag-date"); if (!sd) { sd = document.createElement("select"); sd.id = "spieltag-date"; document.body.appendChild(sd); }
    sd.innerHTML = `<option value="${heute}" selected>${heute}</option>`; sd.value = heute;
    spieltagTeam = 1; TEAM_ANZAHL = 2;
    await teamPlanLaden();
    const plan = { id: TEAM_PLAN && TEAM_PLAN.id, runde: typeof teamRundeJetzt === "function" ? teamRundeJetzt() : null, spiele: TEAM_PLAN ? (TEAM_PLAN.spiele[1] || []).map(p => ({ runde: p.runde, gegner: p.gegner, seite: p.seite, idx: p.idx })) : [] };
    // Tor und Gegentor in Runde 1
    mcTickerOpen = true; atCounts = {}; atTorRunden = []; atSel = K[1];
    tickerGoal(); await warte(400);
    tickerCounterGoal(); await warte(400);
    const live = { tore: atTore(), gegen: atGegentore };
    await atLoadGegentore();
    const liveNachLaden = { tore: atTore(), gegen: atGegentore };
    // Trainer-Ticker
    let feed = document.getElementById("ticker-feed"); if (!feed) { const tp = document.getElementById("ticker-panel"); tickerRenderControls(); await warte(100); feed = document.getElementById("ticker-feed"); }
    await tickerRenderFeed(); await warte(150);
    const feedText = feed ? feed.textContent.replace(/\s+/g, " ") : "";
    // Live-Ergebnis in Runde 2: leer
    const alt = TEAM_PLAN.runde; TEAM_PLAN.runde = 2; const rundeZwei = atTore(); TEAM_PLAN.runde = alt;
    // Absaetze
    const gr = tickerAbsaetze([{ runde: 1, text: "a" }, { runde: null, text: "b" }, { runde: 2, text: "c" }, { runde: 1, text: "d" }], TEAM_PLAN.spiele[1]).map(g => ({ runde: g.runde, n: g.events.length, gegner: g.spiel ? g.spiel.gegner : null }));
    // Vollbild-Kopf
    atLiveOpen(); await warte(100);
    const kopf = (document.getElementById("at-live") || {}).textContent || ""; atLiveClose();
    return { plan, live, liveNachLaden, feedText, rundeZwei, gr, kopf: kopf.replace(/\s+/g, " ").slice(0, 160) };
  }, { K, heute });
  if (r.fehlt) { await s.schliessen(); return h.ergebnis("Spiel je Runde", false, [`${r.fehlt} fehlt`]); }
  // Eltern-Ticker (Nur-Ansehen)
  const eltern = await s.page.evaluate(async ({ heute }) => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    await renderTickerView(heute); await warte(400);
    const roots = [...document.body.children].reverse();
    const root = roots.find(x => /Liveticker U9/.test(x.textContent || ""));
    const t = root ? root.textContent.replace(/\s+/g, " ") : "";
    try { clearInterval(tickerViewTimer); clearInterval(tickerViewMinuteTimer); } catch (e) {}
    return t;
  }, { heute });
  const fehler = s.fehler(); await s.schliessen();
  const sp1 = r.plan.spiele.find(p => p.runde === 1);
  if (r.plan.id !== 9 || r.plan.runde !== 1) probleme.push(`Prüfaufbau: TEAM_PLAN id ${r.plan.id}, Runde ${r.plan.runde}`);
  const tor = actions.find(a => a.aktion === "tor"), geg = events.find(e => e.typ === "gegentor");
  if (!tor || tor.runde !== 1) probleme.push(`Das Tor trägt keine Runde (${tor ? tor.runde : "kein Tor"})`);
  if (!geg || geg.runde !== 1) probleme.push(`Das Gegentor trägt keine Runde (${geg ? geg.runde : "kein Gegentor"})`);
  const p = htRow.plan[sp1 ? sp1.idx : -1];
  const unser = p ? (sp1.seite === "a" ? [p.ta, p.tb] : [p.tb, p.ta]) : null;
  if (!patches.length) probleme.push("Der Festival-Plan wurde nicht nachgezogen");
  else if (!unser || unser[0] !== 1 || unser[1] !== 1) probleme.push(`Im Plan steht ${unser ? unser.join(":") : "–"} statt 1:1 (Seite ${sp1 && sp1.seite})`);
  const andere = htRow.plan.filter((x, i) => i !== (sp1 && sp1.idx) && x.ta != null).length;
  if (andere) probleme.push(`${andere} andere Spiele bekamen ein Ergebnis`);
  // Gegentore zählt das Vollbild beim Tipp selbst hoch; hier wurde direkt getickert – geprüft wird der geladene Stand.
  if (r.live.tore !== 1 || r.liveNachLaden.tore !== 1 || r.liveNachLaden.gegen !== 1) probleme.push(`Live-Ergebnis Runde 1: ${r.liveNachLaden.tore}:${r.liveNachLaden.gegen}`);
  if (r.rundeZwei !== 0) probleme.push(`In Runde 2 zählt das Live-Ergebnis ${r.rundeZwei} Tore aus Runde 1`);
  if (!new RegExp("Runde 1 · gegen " + (sp1 ? sp1.gegner : "")).test(r.feedText)) probleme.push(`Trainer-Ticker ohne Absatz „Runde 1 · gegen ${sp1 && sp1.gegner}“: „${r.feedText.slice(0, 100)}“`);
  if (!/1:1/.test(r.feedText)) probleme.push("Der Absatz im Trainer-Ticker zeigt den Stand 1:1 nicht");
  if (r.gr.map(g => g.runde).join(",") !== "2,1,0" || r.gr[1].n !== 2 || !r.gr[1].gegner) probleme.push(`Absätze: ${JSON.stringify(r.gr)}`);
  if (!/Runde 1/.test(r.kopf)) probleme.push(`Vollbild-Kopf ohne Runde: „${r.kopf}“`);
  if (!/Runde 1 · gegen/.test(eltern)) probleme.push(`Eltern-Ticker ohne Absatz je Spiel: „${eltern.slice(0, 120)}“`);
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Runde ${r.plan.runde} gegen ${sp1 && sp1.gegner}: Tor runde=${tor && tor.runde}, Gegentor runde=${geg && geg.runde}, Plan ${unser ? unser.join(":") : "–"} (${patches.length} Patch), andere Spiele unberührt ${!andere}`);
  zeilen.push(`Live ${r.liveNachLaden.tore}:${r.liveNachLaden.gegen} · in Runde 2 ${r.rundeZwei} · Absätze ${r.gr.map(g => g.runde).join(",")} · Vollbild „${r.kopf.slice(0, 60)}“`);
  zeilen.push(`Trainer-Ticker: „${r.feedText.slice(0, 80)}“ · Eltern: ${/Runde 1 · gegen/.test(eltern)}`);
  return h.ergebnis("Die Runde ist das Spiel – Ergebnis je Runde im Plan, Absätze im Ticker", !probleme.length, zeilen.concat(probleme));
};
