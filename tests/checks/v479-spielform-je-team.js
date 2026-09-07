/* v479 – PO (Kinderfestival): „Wir spielen auf mehreren Feldern parallel gegen verschiedene
   Mannschaften, und das in verschiedenen Formaten – 4+1 oder FUNiño. Wie teilen wir dann
   die Teams am besten ein? Dabei ist zu berücksichtigen, wie viele Torhüter zugesagt
   haben." Entscheidung (Kacheln): Spielform je Team; Torwart-Kinder zuerst auf die Teams
   mit Torwart; die uebrigen Kinder so, dass der Spielanteil ueber alle Teams gleich bleibt.
   Dazu: „Dabei heisst spielt mit" auch nach dem Laden. Geprueft: 9 Kinder auf 4+1 + FUNiño
   → 6 + 3 mit dem Torwart im 4+1-Team; 10 → 6 + 4; die Anzeige nennt je Team Spielform und
   Anteil; _form wird gespeichert; ein dabei-Kind ohne Team bekommt eines. */
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const heute = h.heute();
  const termine = [{ id: 1, datum: heute, typ: "turnier", titel: "Kinderfestival · Heim", heim: true, uhrzeit: "10:15", trainer_status: {} }];
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, nominierungen: [] }), hoehe: 1800 });
  await h.sichtbarMachen(s.page, "#train-sub-spieltag");
  const r = await s.page.evaluate(async ({ K, heute }) => {
    await loadKader();
    const warte = ms => new Promise(r => setTimeout(r, ms));
    if (typeof teamsAuto !== "function" || typeof teamFormSet !== "function") return { fehlt: "teamFormSet" };
    let sd = document.getElementById("spieltag-date"); if (!sd) { sd = document.createElement("select"); sd.id = "spieltag-date"; document.body.appendChild(sd); }
    sd.innerHTML = `<option value="${heute}" selected>${heute}</option>`; sd.value = heute;
    let panel = document.getElementById("team-panel"); if (!panel) { panel = document.createElement("div"); panel.id = "team-panel"; document.body.appendChild(panel); }
    // Kind A ist der Torwart (Harness). 9 Kinder dabei.
    Object.keys(nomStatus).forEach(k => delete nomStatus[k]);
    K.forEach((n, i) => { nomStatus[n] = i < 9 ? "dabei" : "nicht"; });
    TEAM_ANZAHL = 2; TEAMS = {}; TEAM_FORM = {};
    teamFormSet(1, "4+1"); teamFormSet(2, "funino");
    const groesse = t => Object.keys(TEAMS).filter(x => TEAMS[x] === t).length;
    const neun = { t1: groesse(1), t2: groesse(2), twTeam: TEAMS[K[0]], anteil1: teamSpielanteil(1).anteil, anteil2: teamSpielanteil(2).anteil };
    // v481: die Team-Kacheln heissen .team-karte (Pause-Karte hat data-team="0")
    const kacheln = [...document.querySelectorAll("#team-panel .team-karte[data-team]")].filter(el => el.dataset.team !== "0").map(el => el.textContent.replace(/\s+/g, " ").trim());
    const segs = document.querySelectorAll('#team-panel [aria-label^="Spielform Adler"]').length;
    // 10 Kinder
    nomStatus[K[9]] = "dabei"; teamsAuto();
    const zehn = { t1: groesse(1), t2: groesse(2) };
    // Dabei ohne Team → nachziehen
    delete TEAMS[K[5]];
    const nachgezogen = teamsNachziehen();
    const wieder = !!TEAMS[K[5]];
    return { neun, kacheln, segs, zehn, nachgezogen, wieder };
  }, { K, heute });
  const fehler = s.fehler();
  const saves = s.gesendet.filter(g => g.methode === "POST" && /nominierungen$/.test(g.pfad) && g.body && String(g.body.datum || "").endsWith("__teams"));
  await s.schliessen();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt`); return h.ergebnis("Spielform je Team", false, probleme); }
  if (r.neun.t1 !== 6 || r.neun.t2 !== 3) probleme.push(`9 Kinder: ${r.neun.t1} + ${r.neun.t2} statt 6 + 3`);
  if (r.neun.twTeam !== 1) probleme.push(`Torwart-Kind steht in Team ${r.neun.twTeam} statt im 4+1-Team`);
  if (Math.round(r.neun.anteil1 * 100) !== 83 || Math.round(r.neun.anteil2 * 100) !== 100) probleme.push(`Spielanteile ${Math.round(r.neun.anteil1 * 100)} % / ${Math.round(r.neun.anteil2 * 100)} % statt 83 / 100`);
  if (r.zehn.t1 !== 6 || r.zehn.t2 !== 4) probleme.push(`10 Kinder: ${r.zehn.t1} + ${r.zehn.t2} statt 6 + 4`);
  if (r.segs !== 2) probleme.push(`${r.segs} Spielform-Wähler statt 2`);
  if (r.kacheln.length !== 2 || !/FUNi|Funino/i.test(r.kacheln[1]) || !/%/.test(r.kacheln[0])) probleme.push(`Team-Kacheln ohne Spielform/Anteil: ${JSON.stringify(r.kacheln)}`);
  if (!r.nachgezogen || !r.wieder) probleme.push("ein dabei-Kind ohne Team bleibt ohne Team");
  const mitForm = saves.filter(p => p.body.data && p.body.data._form && p.body.data._form["2"] === "funino");
  if (!mitForm.length) probleme.push(`Spielform je Team wird nicht gespeichert (${saves.length} Speichervorgänge)`);
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`9 Kinder: ${r.neun.t1} + ${r.neun.t2}, Torwart in Team ${r.neun.twTeam}, Anteile ${Math.round(r.neun.anteil1 * 100)} / ${Math.round(r.neun.anteil2 * 100)} % · 10 Kinder: ${r.zehn.t1} + ${r.zehn.t2}`);
  zeilen.push(`Kacheln: ${JSON.stringify(r.kacheln)}`);
  zeilen.push(`Nachgezogen ${r.nachgezogen} · gespeichert mit _form: ${mitForm.length}/${saves.length}`);
  return h.ergebnis("Spielform je Team: Torwart zuerst, Felder füllen, gleicher Spielanteil, Dabei = Team", !probleme.length, zeilen.concat(probleme));
};
