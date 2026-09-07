/* v461 – zwei Meldungen aus der Nominierung: ausgetragene Kinder standen weiter in der
   Liste, und wer auf „Dabei" gesetzt wurde, landete bei mehr Zusagen als Sollstaerke
   automatisch auf „Pausiert" – ohne dass es jemand entschieden haette. Jetzt: dabei =
   spielt mit, Pause ist eine Entscheidung des Trainers. */
module.exports = async function (h) {
  const K = h.KINDER, RAUS = K[6], probleme = [], zeilen = [];
  const rows = h.kaderZeilen({ inaktiv: [RAUS] });
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: rows }), hoehe: 2400 });
  const r = await s.page.evaluate(async ({ K, RAUS }) => {
    await loadKader();
    let box = document.getElementById("team-panel"); if (!box) { box = document.createElement("div"); box.id = "team-panel"; document.body.appendChild(box); }
    let nb = document.getElementById("nom-panel"); if (!nb) { nb = document.createElement("div"); nb.id = "nom-panel"; document.body.appendChild(nb); }
    let sd = document.getElementById("spieltag-date"); if (!sd) { sd = document.createElement("select"); sd.id = "spieltag-date"; document.body.appendChild(sd); }
    sd.innerHTML = '<option value="2026-09-05" selected>2026-09-05</option>'; sd.value = "2026-09-05";
    nomStatus = {}; nomOvr = new Set(); nomRsvp = {}; TEAMS = {}; TEAM_ANZAHL = 1; TEAM_TRAINER = {}; TEAM_GRUND = {};
    KADER.forEach(k => nomStatus[k.name] = "offen");
    teamsRender(); nomRender();
    // Kinderzeilen sicher erkennen: jede traegt genau drei nomSet-Knoepfe
    const namenInListe = () => [...new Set([...document.querySelectorAll('#nom-panel button[onclick^="nomSet("], #team-panel button[onclick^="nomSet("]')].map(b => (b.getAttribute("onclick").match(/nomSet\('([^']*)'/) || [])[1]).filter(Boolean))];
    const out = { liste: namenInListe().length, raus: namenInListe().some(t => t.includes(RAUS)), nenner: document.getElementById("nom-panel").textContent };
    // alle 14 aktiven auf „dabei" – mehr als die Sollstaerke eines Teams
    KADER.filter(k => k.aktiv !== false).forEach(k => nomSet(k.name, "dabei"));
    out.imTeam = Object.keys(TEAMS).length;
    out.ohneTeam = KADER.filter(k => k.aktiv !== false && !TEAMS[k.name]).map(k => k.name);
    out.hinweis = document.getElementById("team-panel").textContent.replace(/\s+/g, " ");
    // haendisch auf Pause – und wieder zurueck
    teamSet(K[0], 0); out.nachPause = !TEAMS[K[0]];
    teamSet(K[0], 1); out.zurueck = TEAMS[K[0]] === 1;
    // Automatik verteilt ebenfalls alle
    TEAMS = {}; teamsAuto(); out.autoImTeam = Object.keys(TEAMS).length;
    return out;
  }, { K, RAUS });
  const fehler = s.fehler(); await s.schliessen();
  if (r.liste !== 14) probleme.push(`${r.liste} Kinder in der Liste statt 14`);
  if (r.raus) probleme.push("ausgetragenes Kind steht in der Nominierung");
  if (!/von 14( dabei|\b)/.test(r.nenner))   // v481: „Wer ist dabei? N von 14" probleme.push("Nenner zaehlt ausgetragene mit: " + r.nenner.trim().slice(0, 60));
  if (r.imTeam !== 14 || r.ohneTeam.length) probleme.push(`nach „dabei" sind ${r.imTeam} im Team, ohne Team: ${JSON.stringify(r.ohneTeam)}`);
  if (!/(Kinder in einem Team|Adler 1: 14 Kinder)/.test(r.hinweis) || !/Sollstärke/.test(r.hinweis))   // v481: Karten statt Wand probleme.push("Hinweis zur Teamgroesse fehlt");
  if (/pausiert:/.test(r.hinweis)) probleme.push("es steht weiter „N Kinder pausiert“ da, obwohl niemand pausiert wurde");
  if (!r.nachPause) probleme.push("haendisches Pausieren wirkt nicht");
  if (!r.zurueck) probleme.push("„Spielt mit“ nimmt die Pause nicht zurueck");
  if (r.autoImTeam !== 14) probleme.push(`Automatik teilt nur ${r.autoImTeam} von 14 ein`);
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Liste ${r.liste} · nach „dabei" ${r.imTeam} im Team, 0 ohne · Pause haendisch ${r.nachPause}/zurueck ${r.zurueck} · Automatik ${r.autoImTeam}`);
  return h.ergebnis("Nominierung: nur aktive Kinder, „Dabei“ heißt „Spielt mit“", !probleme.length, zeilen.concat(probleme));
};
