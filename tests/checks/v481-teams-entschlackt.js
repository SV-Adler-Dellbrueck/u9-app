/* v481 – PO: „Die Kachel Teams festlegen ist viel zu überladen. Außerdem wäre es super, wenn
   in der Kachel der eingeteilten Teams auch übersichtlich das Team zu sehen ist – aktuell
   muss ich die Anwesenheit komplett durchscrollen und selbst zusammenzählen."
   Geprueft: „Wer ist dabei?" ist ein zugeklappter Block mit der Zahl; die Kinderliste
   traegt keine Team-Knoepfe mehr; je Team eine Karte mit Namens-Chips, ein Tipp schiebt
   ins naechste Team; eine Hauptaktion; die Team-Kacheln (Adler 1/2) zeigen die Namen
   ohne Aufklappen; der Erklaerabsatz ist weg. */
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const heute = h.heute();
  const termine = [{ id: 1, datum: heute, typ: "spiel", gegner: "Testgegner", uhrzeit: "10:15", trainer_status: {} }];
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, nominierungen: [] }), hoehe: 1800 });
  await h.sichtbarMachen(s.page, "#train-sub-spieltag");
  const r = await s.page.evaluate(async ({ K, heute }) => {
    await loadKader();
    if (typeof teamChipTap !== "function") return { fehlt: "teamChipTap" };
    let sd = document.getElementById("spieltag-date"); if (!sd) { sd = document.createElement("select"); sd.id = "spieltag-date"; document.body.appendChild(sd); }
    sd.innerHTML = `<option value="${heute}" selected>${heute}</option>`; sd.value = heute;
    const mk = id => { let el = document.getElementById(id); if (!el) { el = document.createElement("div"); el.id = id; document.body.appendChild(el); } return el; };
    mk("nom-panel"); mk("team-panel"); mk("spieltag-teamkarten"); mk("spieltag-teaminhalt");
    Object.keys(nomStatus).forEach(k => delete nomStatus[k]);
    K.forEach((n, i) => { nomStatus[n] = i < 10 ? "dabei" : "nicht"; });
    TEAM_ANZAHL = 2; TEAMS = {}; TEAM_FORM = {}; TEAM_FELDER = []; TEAM_LEIH = {}; TEAM_KARTE_OFFEN = 0;
    teamsAuto(); nomRender(); spieltagTeamKartenRender();
    const nom = document.getElementById("nom-panel"), team = document.getElementById("team-panel");
    const det = document.getElementById("nom-dabei");
    const summary = det ? det.querySelector("summary").textContent.replace(/\s+/g, " ").trim() : "";
    const nomButtons = [...nom.querySelectorAll("button")].map(b => b.textContent.trim());
    const chipsJe = [...team.querySelectorAll(".team-karte[data-team]")].map(k => ({ team: k.dataset.team, chips: [...k.querySelectorAll(".team-chip")].map(c => c.textContent.trim()) }));
    const haupt = [...team.querySelectorAll("button")].filter(b => /In die Nominierungen übertragen/.test(b.textContent)).length;
    const absatz = /Wer auf „Dabei“ steht, wird direkt einem Team/.test(team.textContent + nom.textContent);
    const kachelNamen = [...document.querySelectorAll("#spieltag-teamkarten .karte-kader")].map(k => [...k.querySelectorAll("span")].filter(x => !x.querySelector("span")).length);
    const kachelText = document.getElementById("spieltag-teamkarten").textContent;
    // Chip antippen: Kind wechselt ins naechste Team
    const kid = K[1], vorher = TEAMS[kid];
    teamChipTap(kid);
    const nachher = TEAMS[kid] || 0;
    const chipH = (() => { const c = document.querySelector("#team-panel .team-chip"); return c ? parseInt(getComputedStyle(c).minHeight) : 0; })();
    return { summary, offen: !!(det && det.open), nomButtons, chipsJe, haupt, absatz, kachelNamen, kachelHatNamen: K.slice(0, 10).every(n => kachelText.includes(n)), vorher, nachher, chipH };
  }, { K, heute });
  const fehler = s.fehler(); await s.schliessen();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt`); return h.ergebnis("Teams festlegen entschlackt", false, probleme); }
  if (!/10 von 15/.test(r.summary)) probleme.push(`„Wer ist dabei?“ ohne Zahl: „${r.summary}“`);
  if (r.offen) probleme.push("„Wer ist dabei?“ steht offen, obwohl schon Kinder dabei sind");
  const teamKnoepfe = r.nomButtons.filter(b => /^(Spielt mit|Pause|Pausiert|1|2|3|4)$/.test(b));
  if (teamKnoepfe.length) probleme.push(`Kinderliste trägt noch Team-Knöpfe: ${JSON.stringify(teamKnoepfe.slice(0, 4))}`);
  const summe = r.chipsJe.filter(k => k.team !== "0").reduce((a, k) => a + k.chips.length, 0);
  if (r.chipsJe.filter(k => k.team !== "0").length !== 2 || summe !== 10) probleme.push(`Team-Karten: ${JSON.stringify(r.chipsJe.map(k => k.team + ":" + k.chips.length))} statt 2 Karten mit 10 Chips`);
  if (r.haupt !== 1) probleme.push(`${r.haupt} Hauptaktionen statt 1`);
  if (r.absatz) probleme.push("der Erklärabsatz steht noch da");
  if (r.kachelNamen.length !== 2 || r.kachelNamen.reduce((a, b) => a + b, 0) !== 10 || !r.kachelHatNamen) probleme.push(`Team-Kacheln zeigen die Namen nicht ohne Aufklappen: ${JSON.stringify(r.kachelNamen)}`);
  if (r.nachher === r.vorher) probleme.push(`Chip-Tipp verschiebt nicht (Team ${r.vorher} → ${r.nachher})`);
  if (r.chipH < 44) probleme.push(`Namens-Chip nur ${r.chipH}px hoch`);
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`„${r.summary}“ (zu: ${!r.offen}) · Kinderliste-Knöpfe ${r.nomButtons.length} · Team-Karten ${JSON.stringify(r.chipsJe.map(k => k.team + ":" + k.chips.length))}`);
  zeilen.push(`Hauptaktion ${r.haupt} · Absatz ${r.absatz} · Kachel-Namen ${JSON.stringify(r.kachelNamen)} · Tipp ${r.vorher} → ${r.nachher} · Chip ${r.chipH}px`);
  return h.ergebnis("Teams festlegen entschlackt: zwei Blöcke, Namens-Chips, eine Hauptaktion, Kachel zeigt den Kader", !probleme.length, zeilen.concat(probleme));
};
