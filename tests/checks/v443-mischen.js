/* v443 – „Neu mischen funktioniert nicht": die Verteilung war deterministisch, bei
   gleicher Staerke kam immer die Kader-Reihenfolge heraus. Echte Klicks auf die
   Knoepfe; danach: Mischen darf die Ausgewogenheit nicht kaputtmachen. */
module.exports = async function (h) {
  const s = await h.starten({ hoehe: 1600 });
  await s.page.evaluate(kinder => { window.KADER = kinder.map((n, i) => ({ id: i + 1, name: n, aktiv: true })); blitzOpen(); }, h.KINDER);
  await s.page.waitForTimeout(300);
  const teams = () => s.page.evaluate(() => JSON.stringify(BLZ.teams.map(t => t.spieler.join(","))));
  const vorher = await teams();
  const chip = await s.page.$('#blitz-body button[onclick^="blzCycle"]');
  if (chip) { await chip.click(); await s.page.waitForTimeout(200); }
  const nachKlick = await teams();
  const laeufe = [];
  for (let i = 0; i < 5; i++) {
    const kn = await s.page.$('#blitz-body button[onclick^="blzNeuMischen"]');
    if (!kn) break;
    await kn.click(); await s.page.waitForTimeout(150); laeufe.push(await teams());
  }
  // Ausgewogenheit: 5 starke, 5 mittlere, 5 schwache – die Summen muessen nah beieinander bleiben
  const bal = await s.page.evaluate(async () => {
    const st = {}; KADER.forEach((k, i) => st[k.name] = i < 5 ? 10 : i < 10 ? 5 : 1);
    window.teamStaerke = n => st[n] || 0;
    await blzAnzahl(3);   // v875: blzAnzahl ist async (Rückfrage als Fenster)
    const spannen = [], versch = new Set();
    for (let i = 0; i < 6; i++) { blzNeuMischen(); const su = BLZ.teams.map(t => t.spieler.reduce((a, n) => a + st[n], 0)); spannen.push(Math.max(...su) - Math.min(...su)); versch.add(JSON.stringify(BLZ.teams.map(t => t.spieler.join(",")))); }
    return { spanne: Math.max(...spannen), versch: versch.size };
  });
  const fehler = s.fehler();
  await s.schliessen();
  const probleme = [];
  if (!chip) probleme.push("keine Kind-Kachel gefunden");
  else if (vorher === nachKlick) probleme.push("Kind-Kachel antippen aendert nichts");
  if (laeufe.length < 5) probleme.push("Misch-Knopf nicht gefunden");
  const verschieden = new Set(laeufe).size;
  if (verschieden < 2) probleme.push("5× Neu mischen: immer dieselbe Aufteilung");
  if (bal.spanne > 5) probleme.push(`Staerke-Spanne nach dem Mischen ${bal.spanne} (Soll <= 5)`);
  if (bal.versch < 2) probleme.push("mit Staerken: Mischen wechselt nie");
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  return h.ergebnis("Turnier: Kachel und „Neu mischen“ wirken, Teams bleiben ausgewogen", !probleme.length,
    [`Kachel wirkt ${vorher !== nachKlick} · ${verschieden} verschiedene Aufteilungen in ${laeufe.length} Laeufen · Spanne ${bal.spanne}, ${bal.versch}/6 verschieden`].concat(probleme));
};
