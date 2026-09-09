/* v495 – PO: „Sobald ich auf die Teams klicke, scheint die Spieluhr schon zu laufen. Das soll
   nicht so sein. Erst wenn der Countdown offiziell gestartet wurde." Und: „In der Festival-Planung
   sollte drinstehen, auf welchem Feld die Teams warm machen dürfen – Adler immer im Käfig, die
   anderen auf die Felder aus dem Plan verteilt; das soll im externen Link stehen."
   Geprueft: die Marke „Spiel läuft" haengt am Anpfiff statt an der Auswahl, die Match-Uhr steht
   ohne Anpfiff still (auch bei einer alten laufenden Zeile), und die Aufwaermfelder stehen im
   Planer, im Info-Blatt und auf der Gast-Seite. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const heute = h.heute();
  let htRow = null;
  const s = await h.starten({ supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), nominierungen: [],
    termine: [{ id: 1, datum: heute, typ: "turnier", heim: true, uhrzeit: "10:15", titel: "Kinderfestival", trainer_status: {} }],
    // Eine alte, laufende Zeile – genau der Fall aus dem Screenshot
    matchday: [{ datum: heute, half: 1, clock_status: "running", started_at: new Date(Date.now() - 3 * 60000).toISOString(), paused_ms: 0, spieldauer_min: 10, halbzeiten: 1 }],
    heimturnier: (u, req) => req.method() === "GET" ? (htRow ? [htRow] : []) : { status: 204, body: "" }
  }), hoehe: 1600 });
  const bau = await s.page.evaluate(({ heute }) => {
    const vereine = [{ name: "SV Adler Dellbrück", kinder: 14, teams: 2 }, { name: "SC Wahn Grengel", kinder: 10, teams: 2 }, { name: "SV Rath-Heumar", kinder: 10, teams: 2 }];
    const teams = fstTeamsBauen(vereine);
    const cfg = { art: "festival", format: "festival", start: "10:15", dauer: 60, spieldauer: 8, wechsel: 5, felder: fstFelderKuerzen(FST_STANDARD_FELDER, teams), vereine, infos: "" };
    return { id: 9, slug: "x", name: "Kinderfestival", datum: heute, config: cfg, teams: teams.map(t => t.name), plan: fstPlanBauen(teams, cfg) };
  }, { heute });
  htRow = bau;
  const ohne = await s.page.evaluate(async ({ heute }) => {
    if (typeof fstAufwaermen !== "function" || typeof teamSpielLaeuft !== "function") return { fehlt: "fstAufwaermen/teamSpielLaeuft" };
    await loadKader(); document.getElementById("pin-gate")?.remove();
    const app = document.getElementById("main-app"); if (app) app.style.display = "block";
    window.spieltagRawDate = () => heute; window.spieltagKey = () => heute;
    if (typeof spieltagTeam !== "undefined") spieltagTeam = 1;
    TEAM_ANZAHL = 2; Object.keys(TEAMS).forEach(k => delete TEAMS[k]);
    KADER.filter(k => k.aktiv !== false).forEach((k, i) => { TEAMS[k.name] = (i % 2) + 1; });
    Object.keys(nomStatus).forEach(k => delete nomStatus[k]); KADER.forEach(k => { nomStatus[k.name] = "dabei"; });
    let mp = document.getElementById("mc-panel"); if (!mp) { mp = document.createElement("div"); mp.id = "mc-panel"; document.body.appendChild(mp); }
    await teamPlanLaden(); await mcLoad(); await new Promise(r => setTimeout(r, 150));
    const aw = fstAufwaermen({ config: (window.__cfg = null) || undefined });
    return { uhr: mcState.clock_status, laeuft: [1, 2].map(n => teamSpielLaeuft(n)), panel: mp.textContent.replace(/\s+/g, " ") };
  }, { heute });
  if (ohne.fehlt) { await s.schliessen(); return h.ergebnis("Uhr und Aufwärmen", false, [`${ohne.fehlt} fehlt`]); }
  // Anpfiff der ersten Runde – jetzt darf die Uhr laufen
  const nach = await s.page.evaluate(async ({ row }) => {
    _HT = JSON.parse(JSON.stringify(row));
    await fstAnpfiff(1); await new Promise(r => setTimeout(r, 200));
    return { config: _HT.config };
  }, { row: bau });
  htRow = { ...bau, config: nach.config };
  const mit = await s.page.evaluate(async () => {
    await teamPlanLaden(); await mcLoad(); await new Promise(r => setTimeout(r, 150));
    const mp = document.getElementById("mc-panel");
    return { uhr: mcState.clock_status, laeuft: [1, 2].map(n => teamSpielLaeuft(n)), panel: mp.textContent.replace(/\s+/g, " ") };
  });
  // Aufwärmfelder in Planer, Info-Blatt und Gast-Seite
  const aw = await s.page.evaluate(async ({ row }) => {
    const liste = fstAufwaermen(row);
    const wrap = document.createElement("div"); document.body.appendChild(wrap);
    _htPub = { slug: "x", code: "", wrap, row }; _fstUhrMarke = "";
    _fstPublicRender(wrap, row); await new Promise(r => setTimeout(r, 60));
    const gast = wrap.textContent.replace(/\s+/g, " ");
    fstInfoOpen(); const blatt = document.getElementById("fst-info");
    const info = blatt ? blatt.textContent.replace(/\s+/g, " ") : ""; blatt?.remove();
    _htPub = null;
    return { liste, gast, info };
  }, { row: htRow });
  const fehler = s.fehler(); await s.schliessen();
  if (ohne.uhr !== "idle") probleme.push(`Ohne Anpfiff steht die Uhr auf „${ohne.uhr}“ – die alte laufende Zeile schlägt durch`);
  if (ohne.laeuft.some(Boolean)) probleme.push(`Ohne Anpfiff meldet ein Team „Spiel läuft“: ${JSON.stringify(ohne.laeuft)}`);
  if (mit.uhr !== "running") probleme.push(`Nach dem Anpfiff steht die Uhr auf „${mit.uhr}“`);
  if (!mit.laeuft.every(Boolean)) probleme.push(`Nach dem Anpfiff fehlt „Spiel läuft“: ${JSON.stringify(mit.laeuft)}`);
  if (!/läuft mit dem Spielplan/.test(mit.panel)) probleme.push("Die Match-Uhr nennt den Spielplan nicht als Quelle");
  const adler = aw.liste.find(x => /Adler/.test(x.verein));
  if (!adler || !/Käfig/.test(adler.feld)) probleme.push(`Adler wärmt sich auf „${adler && adler.feld}“ auf statt im Käfig`);
  const gaeste = aw.liste.filter(x => !/Adler/.test(x.verein));
  if (gaeste.some(g => /Käfig/.test(g.feld))) probleme.push("Ein Gast bekommt den Käfig zum Aufwärmen");
  if (new Set(gaeste.map(g => g.feld)).size !== gaeste.length) probleme.push(`Zwei Gäste auf demselben Feld: ${JSON.stringify(gaeste)}`);
  if (!/Aufwärmen/.test(aw.gast) || !/Käfig/.test(aw.gast)) probleme.push("Die Gast-Seite nennt die Aufwärmfelder nicht");
  if (!/Aufwärmen/.test(aw.info)) probleme.push("Das Info-Blatt nennt die Aufwärmfelder nicht");
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Ohne Anpfiff: Uhr ${ohne.uhr}, „Spiel läuft“ ${JSON.stringify(ohne.laeuft)} · nach dem Anpfiff: ${mit.uhr}, ${JSON.stringify(mit.laeuft)}`);
  zeilen.push(`Aufwärmen: ${aw.liste.map(x => x.verein + " → " + x.feld).join(" · ")}`);
  zeilen.push(`Gast-Seite nennt es ${/Aufwärmen/.test(aw.gast)} · Info-Blatt ${/Aufwärmen/.test(aw.info)}`);
  return h.ergebnis("Uhr läuft erst nach dem Anpfiff, Aufwärmfelder stehen im Plan und im Link", !probleme.length, zeilen.concat(probleme));
};
