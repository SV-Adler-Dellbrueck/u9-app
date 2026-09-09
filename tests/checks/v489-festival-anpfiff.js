/* v489 – PO: „Jedes Spiel im Festival soll gemeinsam angepfiffen werden … dann läuft im
   Spielplan live ein Countdown, den jeder Trainer sieht, egal ob Adler oder extern … gekoppelt
   mit dem Liveticker und den Auswechslungen … gestartet werden kann an beiden Stellen."
   Kacheln: Trinkpause zählt rückwärts · Ton und Vibration auf dem Gerät, das angepfiffen hat ·
   alle Adler-Teams der Runde starten mit. Geprueft: Phasen der Uhr aus dem Anker, Anpfiff
   schreibt Anker und zieht die geplanten Zeiten nach, Match-Uhren der Adler-Teams bekommen
   denselben Anker, Countdown in Trainer- und Gast-Ansicht, Signal beim Ablauf, Anpfiff an der
   Match-Uhr startet die Festival-Runde. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const heute = h.heute();
  let htRow = null;   // was ein GET auf heimturnier liefert – wird nach dem ersten Teil gesetzt
  const hei = (u, req) => req.method() === "GET" ? (htRow ? [htRow] : []) : { status: 204, body: "" };
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [], nominierungen: [], matchday: [], heimturnier: hei }), hoehe: 1400 });
  const r = await s.page.evaluate(async ({ heute }) => {
    if (typeof fstAnpfiff !== "function" || typeof fstUhrStand !== "function" || typeof fstAppAnpfiff !== "function") return { fehlt: "fstAnpfiff/fstUhrStand/fstAppAnpfiff" };
    await loadKader(); document.getElementById("pin-gate")?.remove();
    const app = document.getElementById("main-app"); if (app) app.style.display = "block";
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const teams = fstTeamsBauen([{ name: "SV Adler Dellbrück", kinder: 14, teams: 2 }, { name: "SC Wahn Grengel", kinder: 10, teams: 2 }, { name: "SV Rath-Heumar", kinder: 10, teams: 2 }]);
    const cfg = { art: "festival", start: "10:15", dauer: 60, spieldauer: 8, wechsel: 5, felder: fstFelderKuerzen(FST_STANDARD_FELDER, teams), vereine: [], infos: "" };
    const plan = fstPlanBauen(teams, cfg);
    _HT = { id: 7, name: "Kinderfestival", datum: heute, edit_code: "abc", config: JSON.parse(JSON.stringify(cfg)), teams: teams.map(t => t.name), plan };
    const body = document.createElement("div"); body.id = "ht-body"; document.body.appendChild(body);
    fstRender(); await warte(200);
    const vorher = { phase: fstUhrStand(_HT).phase, knopf: !!document.querySelector("#fst-uhr button") };
    // 1) Runde 2 anpfeifen
    const geplant2 = (plan.find(p => p.runde === 2) || {}).zeit;
    await fstAnpfiff(2); await warte(400);
    const u = (_HT.config || {}).uhr || {};
    const st = fstUhrStand(_HT);
    const zeigtJetzt = fstZeitIst(geplant2, _HT.config);
    const jetzt = _fstJetztHhmm();
    const uhrText = document.getElementById("fst-uhr")?.textContent.replace(/\s+/g, " ").trim() || "";
    // 2) Phasen: Pause und Ende aus demselben Anker
    const dauerMs = 8 * 60000, pauseMs = 5 * 60000;
    const setzeAnker = ms => { _HT.config.uhr = { ...u, start: new Date(Date.now() - ms).toISOString() }; };
    setzeAnker(dauerMs + 1000); const pause = fstUhrStand(_HT);
    setzeAnker(dauerMs + pauseMs + 2000); const ende = fstUhrStand(_HT);
    // 3) Signal beim Ablauf – auf dem Gerät, das angepfiffen hat
    const rufe = []; navigator.vibrate = (...a) => { rufe.push(a); return true; };
    setzeAnker(dauerMs + 1000); _fstSignalFuer = 2; _fstUhrMarke = ""; fstUhrMalen();
    const pauseText = document.getElementById("fst-uhr")?.textContent.replace(/\s+/g, " ").trim() || "";
    // 4) Gast-Ansicht: derselbe Anker, derselbe Rest, kein Anpfiff-Knopf
    _HT.config.uhr = { ...u };
    body.remove();   // Trainer- und Gast-Ansicht laufen nie zugleich – im Test sonst zwei gleiche IDs
    const wrap = document.createElement("div"); document.body.appendChild(wrap);
    _htPub = { slug: "x", code: "", wrap, row: _HT };
    _fstUhrMarke = ""; _fstPublicRender(wrap, _HT); await warte(50);
    const gastUhr = wrap.querySelector("#fst-uhr");
    const gastText = gastUhr ? gastUhr.textContent.replace(/\s+/g, " ").trim() : "";
    const gastKnopf = gastUhr ? gastUhr.querySelectorAll("button").length : -1;
    const gastRest = fstUhrStand(_htPub.row).rest;
    const gruss = /Herzlich willkommen bei den Adlern/.test(wrap.textContent);
    // Die Trinkpause muss auch bei den Gast-Trainern rückwärts laufen – nur anpfeifen dürfen sie nicht
    _HT.config.uhr = { ...u, start: new Date(Date.now() - (dauerMs + 60000)).toISOString() };
    _fstUhrMarke = ""; _fstPublicRender(wrap, _HT); await warte(50);
    const gastPauseEl = wrap.querySelector("#fst-uhr");
    const gastPause = gastPauseEl ? gastPauseEl.textContent.replace(/\s+/g, " ").trim() : "";
    const gastPauseKnopf = gastPauseEl ? gastPauseEl.querySelectorAll("button").length : -1;
    const gastPauseRest = Math.round(fstUhrStand(_HT).rest);
    _HT.config.uhr = { ...u };
    _htPub = null;
    return { teams: _HT.teams, plan, cfg: _HT.config, vorher, uhrRunde: u.runde, ankerOk: !!u.start, phase: st.phase, rest: Math.round(st.rest),
      zeigtJetzt, jetzt, uhrText, pause: pause.phase, pauseNaechste: pause.naechste, ende: ende.phase,
      vibriert: rufe.length, pauseText, gastText, gastKnopf, gastRest: Math.round(gastRest), spiele: plan.length,
      gruss, gastPause, gastPauseKnopf, gastPauseRest };
  }, { heute });
  // 5) Anpfiff an der Match-Uhr im Spieltag startet die Festival-Runde – mit demselben Anker
  if (!r.fehlt) {
    const ohneUhr = JSON.parse(JSON.stringify(r.cfg)); delete ohneUhr.uhr;
    htRow = { id: 7, datum: heute, config: ohneUhr, teams: r.teams, plan: r.plan };
    r.app = await s.page.evaluate(async ({ heute }) => {
      window.spieltagRawDate = () => heute; window.spieltagKey = () => heute;
      const anker = new Date().toISOString();
      await fstAppAnpfiff(anker);
      await new Promise(r => setTimeout(r, 400));
      return { anker };
    }, { heute });
  }
  const fehler = s.fehler(); const gesendet = s.gesendet.slice(); await s.schliessen();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt`); return h.ergebnis("Festival-Anpfiff", false, probleme); }
  if (r.vorher.phase !== "aus" || !r.vorher.knopf) probleme.push(`vor dem Anpfiff: Phase ${r.vorher.phase}, Knopf ${r.vorher.knopf}`);
  if (r.uhrRunde !== 2 || !r.ankerOk) probleme.push(`Anker nicht gesetzt: Runde ${r.uhrRunde}, Start ${r.ankerOk}`);
  if (r.phase !== "laeuft" || r.rest < 470 || r.rest > 480) probleme.push(`nach dem Anpfiff Phase ${r.phase}, Rest ${r.rest}s statt ~480`);
  if (r.zeigtJetzt !== r.jetzt) probleme.push(`Runde 2 steht im Plan auf ${r.zeigtJetzt}, angepfiffen wurde um ${r.jetzt}`);
  if (!/Runde 2 läuft/.test(r.uhrText)) probleme.push(`Uhr zeigt „${r.uhrText.slice(0, 60)}“`);
  if (r.pause !== "pause" || r.pauseNaechste !== 3) probleme.push(`nach der Spielzeit Phase ${r.pause}, nächste Runde ${r.pauseNaechste}`);
  if (r.ende !== "ende") probleme.push(`nach der Trinkpause Phase ${r.ende} statt ende`);
  if (!/Zeit um/.test(r.pauseText) || !/Runde 3 anpfeifen/.test(r.pauseText)) probleme.push(`Pausen-Anzeige „${r.pauseText.slice(0, 70)}“`);
  if (!r.vibriert) probleme.push("kein Signal beim Ablauf der Spielzeit");
  if (!/Runde 2 läuft/.test(r.gastText)) probleme.push(`Gast-Ansicht ohne Countdown: „${r.gastText.slice(0, 60)}“`);
  if (r.gastKnopf !== 0) probleme.push(`Gast-Ansicht hat ${r.gastKnopf} Knöpfe in der Uhr – anpfeifen dürfen nur wir`);
  if (Math.abs(r.gastRest - r.rest) > 3) probleme.push(`Rest unterschiedlich: Trainer ${r.rest}s, Gast ${r.gastRest}s`);
  if (!/Zeit um/.test(r.gastPause) || !/Runde 3/.test(r.gastPause)) probleme.push(`Gäste sehen die Trinkpause nicht: „${r.gastPause.slice(0, 70)}“`);
  if (r.gastPauseRest < 230 || r.gastPauseRest > 245) probleme.push(`Pausen-Rest bei den Gästen ${r.gastPauseRest}s statt ~240`);
  if (r.gastPauseKnopf !== 0) probleme.push(`Gäste hätten ${r.gastPauseKnopf} Anpfiff-Knöpfe in der Pause`);
  if (!r.gruss) probleme.push("Gruß an die Gäste fehlt auf der öffentlichen Seite");
  const md = gesendet.filter(g => /matchday/.test(g.pfad) && g.methode === "POST");
  const keys = [...new Set(md.map(g => g.body && g.body.datum))].sort();
  const anker = [...new Set(md.map(g => g.body && g.body.started_at))];
  if (keys.length !== 2 || keys[0] !== h.heute() || keys[1] !== h.heute() + "__t2") probleme.push(`Match-Uhren: ${JSON.stringify(keys)} – erwartet beide Adler-Teams`);
  if (md.some(g => g.body.clock_status !== "running" || g.body.spieldauer_min !== 8)) probleme.push("Match-Uhr ohne laufenden Status oder falsche Spielzeit");
  const patches = gesendet.filter(g => /heimturnier/.test(g.pfad) && g.methode === "PATCH" && g.body && g.body.config && g.body.config.uhr);
  if (patches.length < 2) probleme.push(`nur ${patches.length} Uhr-Speicherungen – Anpfiff aus der App fehlt`);
  const ausApp = patches[patches.length - 1];
  if (r.app && ausApp && ausApp.body.config.uhr.start !== r.app.anker) probleme.push("die App-Uhr trägt einen anderen Anker als die Match-Uhr");
  if (!ausApp || ausApp.body.config.uhr.runde !== 1) probleme.push(`Anpfiff an der Match-Uhr startete Runde ${ausApp && ausApp.body.config.uhr.runde} statt 1`);
  if (anker.length > 2) probleme.push(`${anker.length} verschiedene Anker – alle Uhren müssen denselben tragen`);
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Anpfiff Runde 2: Rest ${r.rest}s · Plan zeigt ${r.zeigtJetzt} (jetzt ${r.jetzt}) · „${r.uhrText.slice(0, 40)}“`);
  zeilen.push(`Phasen: läuft → ${r.pause} (nächste ${r.pauseNaechste}) → ${r.ende} · Signal ${r.vibriert}× · Gast-Rest ${r.gastRest}s, ${r.gastKnopf} Knöpfe`);
  zeilen.push(`Gäste in der Pause: „${r.gastPause.slice(0, 56)}“ · Rest ${r.gastPauseRest}s · ${r.gastPauseKnopf} Knöpfe · Gruß ${r.gruss}`);
  zeilen.push(`Match-Uhren: ${JSON.stringify(keys)} mit ${anker.length} Anker · Uhr-Speicherungen ${patches.length} (App startet Runde ${ausApp && ausApp.body.config.uhr.runde})`);
  return h.ergebnis("Festival-Anpfiff: gemeinsamer Countdown aus einem Anker, gekoppelt mit der Match-Uhr", !probleme.length, zeilen.concat(probleme));
};
