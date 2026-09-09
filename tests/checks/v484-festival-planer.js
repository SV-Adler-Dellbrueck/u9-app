/* v484 – PO: „Wenn wir ein Festival als Heimspiel haben, kommen 2 bis 3 andere Mannschaften
   zu uns. Dafür müssen wir ein kleines Turnier mit 1 Stunde Dauer organisieren … Standard
   wäre ein 4+1 Feld und 2 x FUNiño Felder … es soll auch eine Teilen-Funktion geben …
   einfache Übersicht und super Optik. Baue auch gerne das Logo ein." Entscheidungen: App
   rechnet Teams aus den Kinderzahlen, Runden mit allen Feldern gleichzeitig, keine Tabelle,
   Festival ersetzt das alte Turnier-Formular. Geprueft: Teams aus Kinderzahlen, Feld-
   Vorschlag, Runden-Plan (kein Team zweimal gleichzeitig, Formatwechsel), Zeiten passen in
   die Stunde, oeffentliche Seite mit Wappen und ohne Tabelle. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [] }), hoehe: 1400 });
  const r = await s.page.evaluate(() => {
    if (typeof fstPlanBauen !== "function" || typeof fstTeamsBauen !== "function") return { fehlt: "fstPlanBauen" };
    // Drei Vereine à 10 Kinder – der Fall des PO
    const vereine = [
      { name: "SV Adler Dellbrück", kinder: 10, teams: fstTeamsVorschlag(10, FST_STANDARD_FELDER) },
      { name: "SV Auweiler-Esch", kinder: 10, teams: fstTeamsVorschlag(10, FST_STANDARD_FELDER) },
      { name: "VfB 05 Köln", kinder: 10, teams: fstTeamsVorschlag(10, FST_STANDARD_FELDER) }
    ];
    const teams = fstTeamsBauen(vereine);
    const vorschlag = fstFelderVorschlag(teams.length);
    const cfg = { start: "10:00", dauer: 60, spieldauer: 8, wechsel: 2, felder: FST_STANDARD_FELDER };
    const plan = fstPlanBauen(teams, cfg);
    // Kein Team zweimal in derselben Runde, Feld nicht doppelt belegt
    let doppelt = 0, feldDoppelt = 0;
    [...new Set(plan.map(p => p.runde))].forEach(rd => {
      const sp = plan.filter(p => p.runde === rd);
      const idx = sp.flatMap(p => [p.a, p.b]);
      if (new Set(idx).size !== idx.length) doppelt++;
      const fd = sp.map(p => p.feld);
      if (new Set(fd).size !== fd.length) feldDoppelt++;
    });
    // Sieht jedes Team beide Formate?
    const formen = {};
    plan.forEach(p => { [p.a, p.b].forEach(i => { (formen[i] = formen[i] || new Set()).add(p.form); }); });
    const nurEinFormat = Object.values(formen).filter(x => x.size < 2).length;
    const zeiten = [...new Set(plan.map(p => p.zeit))];
    const bedarf = fstBedarf(teams, cfg);
    // Öffentliche Ansicht
    const wrap = document.createElement("div"); document.body.appendChild(wrap);
    _fstPublicRender(wrap, { name: "Kinderfestival", datum: "2026-09-12", ort: "Thurner Kamp 97", teams: teams.map(t => t.name), plan, config: cfg });
    const html = wrap.innerHTML;
    return {
      teams: teams.map(t => t.name + ":" + t.kinder), vorschlag: vorschlag.length, vorschlagFormen: vorschlag.map(f => f.form).join(","),
      spiele: plan.length, runden: [...new Set(plan.map(p => p.runde))].length, doppelt, feldDoppelt, nurEinFormat,
      ersteZeit: zeiten[0], letzteZeit: zeiten[zeiten.length - 1], bedarf,
      logo: /logo\.png/.test(html), tabelle: /📊|Tordifferenz|\bPkt\b|\bPunkte\b/.test(html),
      hatFelder: /FUNiño 3 gegen 3/.test(html) && /4\+1 mit Torwart/.test(html), hatRunde: /Runde 1/.test(html)
    };
  });
  const fehler = s.fehler(); await s.schliessen();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt`); return h.ergebnis("Festival-Planer", false, probleme); }
  if (r.teams.length !== 6) probleme.push(`3 Vereine à 10 Kinder ergeben ${r.teams.length} Teams statt 6: ${JSON.stringify(r.teams)}`);
  if (r.vorschlag !== 3 || r.vorschlagFormen !== "f4,funino,funino") probleme.push(`Feld-Vorschlag ${r.vorschlag} (${r.vorschlagFormen}) statt 3 (f4,funino,funino)`);
  if (r.doppelt) probleme.push(`${r.doppelt} Runden mit einem Team in zwei Spielen gleichzeitig`);
  if (r.feldDoppelt) probleme.push(`${r.feldDoppelt} Runden mit doppelt belegtem Feld`);
  if (r.nurEinFormat) probleme.push(`${r.nurEinFormat} Teams sehen nur ein Format`);
  if (r.runden < 4 || r.runden > 6) probleme.push(`${r.runden} Runden in 60 Min. bei 8+2 – erwartet 5`);
  if (r.spiele !== r.runden * 3) probleme.push(`${r.spiele} Spiele bei ${r.runden} Runden und 3 Feldern`);
  if (r.ersteZeit !== "10:00") probleme.push(`Beginn ${r.ersteZeit} statt 10:00`);
  if (r.letzteZeit > "11:00") probleme.push(`letzte Runde ${r.letzteZeit} – nach der Stunde`);
  if (!r.logo) probleme.push("kein Wappen auf der öffentlichen Seite");
  if (r.tabelle) probleme.push("die öffentliche Seite zeigt eine Tabelle");
  if (!r.hatFelder || !r.hatRunde) probleme.push(`öffentliche Seite ohne Feld-Legende oder Runden (Felder ${r.hatFelder}, Runden ${r.hatRunde})`);
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Teams: ${JSON.stringify(r.teams)} · Feld-Vorschlag ${r.vorschlag} (${r.vorschlagFormen})`);
  zeilen.push(`Plan: ${r.runden} Runden, ${r.spiele} Spiele, ${r.ersteZeit}–${r.letzteZeit} · voll wären ${r.bedarf.scheiben} Runden ≈ ${r.bedarf.minuten} Min.`);
  zeilen.push(`Öffentlich: Wappen ${r.logo} · Tabelle ${r.tabelle} · Felder ${r.hatFelder} · Formatwechsel für alle ${!r.nurEinFormat}`);
  return h.ergebnis("Festival-Planer: Teams aus Kinderzahlen, Felder, Runden, öffentliche Seite mit Wappen", !probleme.length, zeilen.concat(probleme));
};
