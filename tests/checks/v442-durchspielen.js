/* v442 – „kein klassisches Finale, es soll immer gespielt werden". Der Planer baut
   kein Finale mehr; die Regel lautet: gerade Teamzahl UND Felder >= Teams/2. Der Team-
   vorschlag muss gerade sein. Gerechnet mit dem echten Planer, nicht gelesen. */
module.exports = async function (h) {
  const s = await h.starten();
  const r = await s.page.evaluate(async kinder => {
    window.KADER = kinder.map((n, i) => ({ id: i + 1, name: n, aktiv: true }));
    const finale = [];
    for (const [teams, budget, felder] of [[5, 30, 1], [5, 30, 2], [4, 30, 1], [3, 30, 1], [5, 40, 1], [6, 30, 2], [4, 30, 2]]) {
      const pl = _blzPlanen(teams, budget, felder, "kinder", 0);
      const phasen = [...new Set((pl.ms || []).map(m => m.phase || "runde"))];
      if (phasen.some(p => /final|halb/i.test(p)) || pl.finaleBonus) finale.push(`${teams}T/${budget}/${felder}F: ${phasen.join(",")}`);
    }
    blitzOpen(); BLZ.spielform = "funino";
    const regel = [];
    for (const [teams, felder, soll] of [[4, 2, true], [4, 1, false], [5, 3, false], [6, 3, true], [6, 2, false], [2, 1, true]]) {
      await blzAnzahl(teams); BLZ.felder = felder;   // v875: blzAnzahl ist async (Rückfrage als Fenster)
      const d = _blzDurchspielen();
      regel.push({ teams, felder, ok: d && d.ok === soll && d.gerade === (teams % 2 === 0), ist: d && d.ok, soll });
    }
    const v = _blzTeamVorschlag();
    return { finale, regel, vorschlag: v, html: _blzDurchspielHtml() };
  }, h.KINDER);
  await s.schliessen();
  const probleme = [];
  if (r.finale.length) probleme.push("Planer baut noch ein Finale: " + r.finale.join(" | "));
  r.regel.filter(x => !x.ok).forEach(x => probleme.push(`${x.teams} Teams auf ${x.felder} Feld(ern): durchspielen=${x.ist}, erwartet ${x.soll}`));
  if (!r.vorschlag || r.vorschlag.teams % 2 !== 0 || r.vorschlag.felder !== r.vorschlag.teams / 2) probleme.push("Teamvorschlag nicht gerade / Felder nicht Teams/2: " + JSON.stringify(r.vorschlag));
  if (!/Trinken|wartet|spielfrei|Feld/.test(r.html)) probleme.push("Durchspiel-Hinweis fehlt");
  return h.ergebnis("Ohne Finale: Durchspiel-Regel und gerader Teamvorschlag", !probleme.length,
    [`Finale in ${r.finale.length} von 7 Plaenen · Regel ${r.regel.filter(x => x.ok).length}/${r.regel.length} · Vorschlag ${JSON.stringify(r.vorschlag)}`].concat(probleme));
};
