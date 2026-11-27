/* ═══ Festival-Planer für Heimspieltage (Auftrag doku/auftrag-kinderfestival-planer/auftrag.md) ═══
   Ein zusätzlicher Einstieg neben dem bestehenden Festival-Ablauf (md-turnierplan.js). Wer ihn nicht öffnet, merkt nichts.

   planFestival(eingabe) → plan ist eine REINE Funktion: kein Netz, keine Seite, keine Uhr, kein Zufall. Gleiche Eingabe,
   gleicher Plan. Die Oberfläche (unten) ruft sie nur auf und schreibt das Ergebnis auf Wunsch in den bestehenden
   Festival-Datensatz (Tabelle heimturnier: teams, plan, config) – der Link ?turnier=… zeigt es wie jeden anderen Plan.

   Regeln an EINER Stelle: FP_REGELN. Quelle: Durchführungsbestimmungen Kinderfußball, Fußballkreis Köln, gültig ab
   01.08.2026 (Saison 2026/27), abgeglichen mit der Abschrift in md-wissen.js (v518) – das PDF selbst lag beim Bau nicht vor.
   Belegt sind dort die Abschnitte 1, 2, 3 und 7; bei den übrigen steht „Abschnitt offen“. Was nicht drinsteht, ist ANNAHME. */
const FP_REGELN = {
  quelle: "Durchführungsbestimmungen Kinderfußball, Fußballkreis Köln, gültig ab 01.08.2026 (Saison 2026/27)",
  altersklasse: "U9",
  // Abschnitt 1 – Spielformen U9: Minitore 3 gegen 3, Jugendtore 3+1 gegen 3+1. 4 gegen 4 und 4+1 erst ab U10.
  formen: {
    mini:     { label: "3 gegen 3",     aufFeld: 3, tw: 0, tore: "Minitore",  abschnitt: "Abschnitt 1" },
    jugend:   { label: "3+1 gegen 3+1", aufFeld: 4, tw: 1, tore: "Jugendtore", abschnitt: "Abschnitt 1" },
    // ANNAHME (steht nicht in der Tabelle für U9): 4 Feldspieler + 1 Torhüter, Rotation 0 bis 1, Team 5 bis 6.
    jugend41: { label: "4+1 gegen 4+1", aufFeld: 5, tw: 1, tore: "Jugendtore", abschnitt: "Annahme (Ausnahme nach Absprache)", annahme: true }
  },
  // Abschnitt 3 – Spieleranzahl U8/U9: 3 Feldspieler + 1 bis 2 Rotation, gesamt 4 bis 5; auf Jugendtoren ergänzt ein Torhüter.
  feldspieler: 3, rotationMin: 1, rotationMax: 2, teamMin: 4, teamMax: 5,
  teamMinSpielbar: 3,                 // darunter keine 3 gegen 3 mehr möglich (kein Team unter 3 bilden)
  team41Min: 5, team41Max: 6,         // ANNAHME für 4+1 (siehe formen.jugend41)
  // Abschnitt 2 – Feld ca. 25 × 20 m; Minitore mit Schusszone etwa 6 m; Jugendtore auf 1,65 m, nur Mittellinie.
  feldMass: "ca. 25 × 20 m", schusszoneM: 6, jugendtorHoehe: "1,65 m",
  // Empfohlen 6 Spiele à 7 Minuten je Team, Spieltag 60 Minuten; Pausen am jeweils nächsten Feld (Abschnitt offen – im PDF nachsehen).
  spieleEmpfohlen: 6, spielzeit: 7, zeitfenster: 60, wechselzeit: 1,
  // Wechsel der Rotationsspieler nach jedem Tor bei beiden Teams, spätestens nach 1 bis 2 Minuten (Spielregeln; Abschnitt offen).
  wechselregel: "Rotationsspieler wechseln nach jedem Tor bei beiden Teams, spätestens nach 1 bis 2 Minuten.",
  // Höchstens so viele Betreuer auf dem Platz, wie Teams gemeldet sind (Abschnitt offen – im PDF nachsehen).
  // Material (ANNAHME zum Aufbau): je Minitor-Feld 4 Minitore, 4 Hütchen für zwei Schusszonen, 2 für die Mittellinie;
  // je Jugendtor-Feld 2 Jugendtore und 2 Hütchen für die Mittellinie.
  material: { mini: { minitore: 4, jugendtore: 0, huetchen: 6 }, jugend: { minitore: 0, jugendtore: 2, huetchen: 2 } },
  felderMax: 5
};
const FP_ABWEICHUNG_41 = "Abweichung von den Durchführungsbestimmungen, nach Absprache der Trainer";
const FP_FARBEN = ["#1d4ed8", "#b91c1c", "#15803d", "#7c3aed", "#b45309", "#0e7490", "#be185d", "#4d7c0f", "#475569", "#9a3412", "#1e3a8a", "#065f46", "#6b21a8", "#854d0e", "#831843"];

/* Kurzname für die Teamzeile: „SV Adler Dellbrück U9 I“ → „Adler Dellbrück U9 I“ (nur wenn danach ein Name bleibt). */
function fpKurz(name) {
  const s = String(name || "Team").trim();
  const ohne = s.replace(/^(SV|SC|FC|TuS|VfL|VfB|DJK|SG|TSV|1\.\s*FC)\s+/i, "").trim();
  return ohne && /^[A-Za-zÄÖÜäöüß]/.test(ohne) ? ohne : s;
}
/* Kinder gleichmäßig auf t Teams: 9 auf 2 → [5,4]. */
function fpVerteilen(kinder, t) {
  const k = Math.max(0, Math.floor(Number(kinder) || 0)), n = Math.max(1, t);
  return Array.from({ length: n }, (_, i) => Math.floor(k / n) + (i < k % n ? 1 : 0));
}
/* Teamzahl je Verein: gemeldet → übernehmen; sonst je nach Variante. groß = kleinste Zahl mit höchstens 5 je Team;
   klein = größte Zahl mit mindestens 3 je Team. */
function fpTeamZahl(v, variante) {
  const k = Math.max(0, Math.floor(Number(v.kinder) || 0));
  if (v.teams != null && Number(v.teams) > 0) return Math.floor(Number(v.teams));
  if (k <= 0) return 0;
  const gross = Math.max(1, Math.ceil(k / FP_REGELN.teamMax));
  if (variante !== "klein") return gross;
  return Math.max(gross, Math.floor(k / FP_REGELN.teamMinSpielbar));
}
function fpForm(feld) {
  if (!feld || feld.tor !== "jugend") return "mini";
  return feld.vierPlusEins ? "jugend41" : "jugend";
}

/* Paarungen einer Zeitscheibe (Runde): k Spiele, kein Team doppelt. Kosten: wer weniger gespielt hat zuerst, noch nicht
   getroffene Gegner zuerst, Vereinsduelle so spät wie möglich, niemand zweimal hintereinander spielfrei.
   Vollständige Suche mit Schranke – bei höchstens 15 Teams und 5 Feldern schnell genug. */
function _fpScheibe(n, k, st, s, S, verein) {
  const kosten = (a, b) => {
    let c = (st.gespielt[a] + st.gespielt[b]) * 1000000;          // zuerst: gleich viele Spiele für alle
    c += (st.treffen[a][b] || 0) * 10000;
    if (verein[a] === verein[b]) c += 1000 * (S - s);            // je früher, desto teurer
    return c;
  };
  const alle = [];
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) alle.push([a, b, kosten(a, b)]);
  alle.sort((x, y) => x[2] - y[2] || x[0] - y[0] || x[1] - y[1]);
  const pausenStrafe = (benutzt) => {
    let p = 0;
    for (let i = 0; i < n; i++) if (!benutzt.has(i) && st.pauseZuletzt[i]) p += 50000;   // zweimal hintereinander frei
    return p;
  };
  let best = null, bestK = Infinity;
  const such = (start, wahl, benutzt, summe) => {
    if (summe >= bestK) return;
    if (wahl.length === k) { const t = summe + pausenStrafe(benutzt); if (t < bestK) { bestK = t; best = wahl.slice(); } return; }
    for (let i = start; i < alle.length; i++) {
      if (alle.length - i < k - wahl.length) break;
      const [a, b, c] = alle[i]; if (benutzt.has(a) || benutzt.has(b)) continue;
      benutzt.add(a); benutzt.add(b); wahl.push([a, b]);
      such(i + 1, wahl, benutzt, summe + c);
      wahl.pop(); benutzt.delete(a); benutzt.delete(b);
    }
  };
  such(0, [], new Set(), 0);
  return best || [];
}
/* Felder einer Runde zuordnen: Jugendtor-Felder gleichmäßig, niemand dauerhaft auf demselben Feld. */
function _fpFelderZuordnen(spiele, felderNr, felderForm, st) {
  const k = spiele.length; let best = null, bestK = Infinity;
  const perm = (rest, wahl) => {
    if (wahl.length === k) {
      let c = 0;
      wahl.forEach((fi, j) => { const [a, b] = spiele[j]; const nr = felderNr[fi], jug = felderForm[fi] !== "mini";
        c += ((st.aufFeld[a][nr] || 0) + (st.aufFeld[b][nr] || 0)) * 10;
        if (jug) c += (st.jugend[a] + st.jugend[b]) * 25; });
      if (c < bestK) { bestK = c; best = wahl.slice(); }
      return;
    }
    for (let i = 0; i < rest.length; i++) perm(rest.slice(0, i).concat(rest.slice(i + 1)), wahl.concat(rest[i]));
  };
  perm(felderNr.map((_, i) => i), []);
  return best;
}

/* Kern: aus fertigen Teams und Feldern den Plan. */
function _fpPlanAusTeams(teams, felder, opt) {
  const n = teams.length, F = felder.length, hinweise = [];
  const spielzeit = opt.spielzeit, wechsel = opt.wechsel;
  const kSpiele = Math.max(0, Math.min(F, Math.floor(n / 2)));
  /* v984 (Charles 27.11.): Gibt es mehr Felder als Spiele, kommt das Jugendtor-Feld (Käfig, 3+1/4+1) immer zuerst dran –
     bei vier Teams also Käfig und ein FUNiño-Feld, nicht zweimal FUNiño. Ohne Jugendtor-Feld bleibt die Reihenfolge. */
  const reihe = felder.slice().sort((x, y) => (x.form === "mini") - (y.form === "mini") || x.nr - y.nr);
  const genutzt = reihe.slice(0, kSpiele).sort((x, y) => x.nr - y.nr), frei = reihe.slice(kSpiele).sort((x, y) => x.nr - y.nr);
  const moeglicheGegner = Math.max(0, n - 1);
  let ziel = Math.min(FP_REGELN.spieleEmpfohlen, moeglicheGegner);
  if (opt.wiederholung && moeglicheGegner > 0) ziel = FP_REGELN.spieleEmpfohlen;
  const maxRundenZeit = Math.max(1, Math.floor((opt.zeitfenster + wechsel) / (spielzeit + wechsel)));
  let S = kSpiele ? Math.ceil(n * ziel / (2 * kSpiele)) : 0;
  if (opt.runden != null && Number(opt.runden) > 0) S = Math.floor(Number(opt.runden));
  const verein = teams.map(t => t.verein);
  const st = { gespielt: Array(n).fill(0), treffen: Array.from({ length: n }, () => Array(n).fill(0)), pauseZuletzt: Array(n).fill(false),
    aufFeld: Array.from({ length: n }, () => ({})), jugend: Array(n).fill(0) };
  const runden = [];
  for (let s = 0; s < S && kSpiele > 0; s++) {
    const paare = _fpScheibe(n, kSpiele, st, s, S, verein);
    const zu = _fpFelderZuordnen(paare, genutzt.map(f => f.nr), genutzt.map(f => f.form), st);
    const spiele = paare.map((p, j) => ({ feld: genutzt[zu[j]].nr, a: p[0], b: p[1] })).sort((x, y) => x.feld - y.feld);
    const imSpiel = new Set(); spiele.forEach(g => { imSpiel.add(g.a); imSpiel.add(g.b); });
    const pause = []; for (let i = 0; i < n; i++) if (!imSpiel.has(i)) pause.push(i);
    spiele.forEach(g => { const f = felder.find(x => x.nr === g.feld);
      [g.a, g.b].forEach(t => { st.gespielt[t]++; st.aufFeld[t][g.feld] = (st.aufFeld[t][g.feld] || 0) + 1; if (f.form !== "mini") st.jugend[t]++; });
      st.treffen[g.a][g.b]++; st.treffen[g.b][g.a]++; });
    for (let i = 0; i < n; i++) st.pauseZuletzt[i] = !imSpiel.has(i);
    runden.push({ nr: s + 1, spiele, pause });
  }
  const kz = fpKennzahlen({ teams, felder, runden, spielzeit, wechsel });
  // Hinweise – nie still korrigieren
  if (frei.length) hinweise.push({ art: "info", text: `${frei.length === 1 ? "Feld " + frei[0].nr + " bleibt" : "Felder " + frei.map(f => f.nr).join(", ") + " bleiben"} frei – für ${n} Teams reichen ${kSpiele} Feld${kSpiele === 1 ? "" : "er"} (je Spiel 2 Teams).` });
  if (n % 2 === 1 && kSpiele === Math.floor(n / 2)) hinweise.push({ art: "info", text: `Ungerade Teamzahl: je Runde ist ein Team spielfrei.` });
  const minSpiele = kz.spieleJeTeam.length ? Math.min(...kz.spieleJeTeam) : 0;
  if (n >= 2 && minSpiele < FP_REGELN.spieleEmpfohlen) {
    const wh = moeglicheGegner < FP_REGELN.spieleEmpfohlen && !opt.wiederholung;
    hinweise.push({ art: "warn", text: `Weniger als ${FP_REGELN.spieleEmpfohlen} Spiele je Team (mindestens ${minSpiele}).${wh ? ` Es gibt nur ${moeglicheGegner} ${moeglicheGegner === 1 ? "möglichen Gegner" : "mögliche Gegner"} – eine Wiederholungsrunde lässt sich zuschalten; im Zeitfenster von ${opt.zeitfenster} Min. passen höchstens ${maxRundenZeit} Runden.` : ""}` });
  }
  if (S >= 1 && n === 2) hinweise.push({ art: "info", text: `Nur eine Begegnung je Runde. Die Rundenzahl ist durch das Zeitfenster begrenzt: höchstens ${maxRundenZeit} Runden in ${opt.zeitfenster} Min.` });
  if (kz.gesamtdauer > opt.zeitfenster) hinweise.push({ art: "warn", text: `Gesamtdauer ${kz.gesamtdauer} Min. liegt über dem Zeitfenster von ${opt.zeitfenster} Min. Vorschlag: höchstens ${maxRundenZeit} Runden oder kürzere Spielzeit.` });
  let ungetroffen = 0; for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (!st.treffen[a][b]) ungetroffen++;
  if (n >= 3 && ungetroffen) hinweise.push({ art: "info", text: `Nicht jeder spielt gegen jeden: ${ungetroffen} Begegnung${ungetroffen === 1 ? "" : "en"} kommen nicht vor (${moeglicheGegner} mögliche Gegner, ${S} Runden).` });
  return { runden, kennzahlen: kz, hinweise, genutzteFelder: genutzt.map(f => f.nr), freieFelder: frei.map(f => f.nr), zielSpiele: ziel };
}

/* Kennzahlen NUR aus dem Plan (Teams, Felder, Runden) – ein Test rechnet sie unabhängig nach. */
function fpKennzahlen(p) {
  const n = p.teams.length;
  const spieleJeTeam = Array(n).fill(0), kindMin = Array(n).fill(0);
  p.runden.forEach(r => r.spiele.forEach(g => {
    const f = p.felder.find(x => x.nr === g.feld), auf = FP_REGELN.formen[f.form].aufFeld;
    [g.a, g.b].forEach(t => { spieleJeTeam[t]++; kindMin[t] += p.spielzeit * Math.min(auf, p.teams[t].kinder || 0); });
  }));
  const R = p.runden.length;
  const nettoJeTeam = spieleJeTeam.map(x => x * p.spielzeit);
  const schnittJeKind = kindMin.map((m, t) => p.teams[t].kinder ? Math.round(m / p.teams[t].kinder * 100) / 100 : 0);
  const genutzt = new Set(); p.runden.forEach(r => r.spiele.forEach(g => genutzt.add(g.feld)));
  const mat = { minitore: 0, jugendtore: 0, huetchen: 0 };
  p.felder.filter(f => genutzt.has(f.nr)).forEach(f => { const m = FP_REGELN.material[f.form === "mini" ? "mini" : "jugend"]; mat.minitore += m.minitore; mat.jugendtore += m.jugendtore; mat.huetchen += m.huetchen; });
  return {
    runden: R, spieleJeTeam, nettoJeTeam, schnittJeKind,
    pausenJeTeam: spieleJeTeam.map(x => R - x),
    minKind: schnittJeKind.length ? Math.min(...schnittJeKind) : 0,
    gesamtdauer: R ? R * p.spielzeit + (R - 1) * p.wechsel : 0,   // ohne Wechsel nach der letzten Runde (Charles 26.11.)
    minitore: mat.minitore, jugendtore: mat.jugendtore, huetchen: mat.huetchen,
    betreuer: n
  };
}

/* Eingabe normalisieren (Standardwerte aus FP_REGELN). */
function _fpEingabe(e) {
  e = e || {};
  const felder = (Array.isArray(e.felder) && e.felder.length ? e.felder : [{ tor: "mini" }]).slice(0, FP_REGELN.felderMax)
    .map((f, i) => ({ nr: i + 1, tor: f && f.tor === "jugend" ? "jugend" : "mini", vierPlusEins: !!(f && f.tor === "jugend" && f.vierPlusEins) }))
    .map(f => ({ ...f, form: fpForm(f) }));
  return {
    vereine: (Array.isArray(e.vereine) ? e.vereine : []).filter(v => v && (Number(v.kinder) > 0 || Number(v.teams) > 0))
      .map(v => ({ name: String(v.name || "Verein").trim() || "Verein", kinder: Math.max(0, Math.floor(Number(v.kinder) || 0)), teams: v.teams != null && v.teams !== "" && Number(v.teams) > 0 ? Math.floor(Number(v.teams)) : null })),
    felder,
    spielzeit: Number(e.spielzeit) > 0 ? Number(e.spielzeit) : FP_REGELN.spielzeit,
    wechsel: e.wechsel != null && Number(e.wechsel) >= 0 ? Number(e.wechsel) : FP_REGELN.wechselzeit,
    zeitfenster: Number(e.zeitfenster) > 0 ? Number(e.zeitfenster) : FP_REGELN.zeitfenster,
    runden: e.runden != null && Number(e.runden) > 0 ? Math.floor(Number(e.runden)) : null,
    wiederholung: !!e.wiederholung,
    modus: "jeder-gegen-jeden"   // Champions-League-Modus ist Ausbaustufe 2
  };
}

/* Teams bauen und die Teamgröße prüfen. */
function _fpTeams(ein, variante) {
  const teams = [], hinweise = [];
  ein.vereine.forEach(v => {
    const t = fpTeamZahl(v, variante); if (!t) return;
    const groessen = fpVerteilen(v.kinder, t), kurz = fpKurz(v.name);
    groessen.forEach((g, i) => teams.push({ name: t > 1 ? `${kurz} ${i + 1}` : kurz, verein: v.name, kinder: g }));
    const unter = groessen.filter(g => g < FP_REGELN.teamMin), ueber = groessen.filter(g => g > FP_REGELN.teamMax);
    if (unter.length || ueber.length) {
      const teil = v.teams ? `gemeldet ${t} Team${t === 1 ? "" : "s"}` : (unter.length && t === Math.ceil(v.kinder / FP_REGELN.teamMax) ? `${v.kinder} Kinder lassen sich nicht in Teams zu ${FP_REGELN.teamMin} bis ${FP_REGELN.teamMax} teilen` : `${t} Teams`);
      hinweise.push({ art: "warn", text: `${fpKurz(v.name)}: Teams mit ${groessen.join(" + ")} Kindern – ${teil}; unter der Teamgröße-Empfehlung (${FP_REGELN.teamMin} bis ${FP_REGELN.teamMax}, Abschnitt 3).`.replace("unter der", ueber.length && !unter.length ? "über der" : "unter der") });
    }
    if (groessen.some(g => g === 3)) hinweise.push({ art: "info", text: `${fpKurz(v.name)}: Teams mit 3 Kindern spielen ohne Rotation (keiner zum Wechseln).` });
    if (groessen.some(g => g < 3)) hinweise.push({ art: "warn", text: `${fpKurz(v.name)}: Ein Team mit weniger als 3 Kindern kann nicht 3 gegen 3 spielen.` });
  });
  teams.forEach((t, i) => { t.farbe = FP_FARBEN[i % FP_FARBEN.length]; });
  return { teams, hinweise };
}

/* Öffentliche Funktion: ein Plan für die gewählte Variante („gross“ Standard, „klein“). */
function planFestival(eingabe, variante) {
  const ein = _fpEingabe(eingabe), v = variante === "klein" ? "klein" : "gross";
  const { teams, hinweise: th } = _fpTeams(ein, v);
  const felder = ein.felder.map(f => ({ ...f, label: FP_REGELN.formen[f.form].label, tore: FP_REGELN.formen[f.form].tore,
    mass: FP_REGELN.feldMass, schusszone: f.form === "mini", mittellinie: f.form !== "mini", annahme: !!FP_REGELN.formen[f.form].annahme }));
  const hinweise = th.slice();
  if (felder.some(f => f.form === "jugend41")) {
    hinweise.unshift({ art: "abweichung", text: FP_ABWEICHUNG_41 + "." });
    hinweise.push({ art: "info", text: `Annahme für 4+1: 4 Feldspieler, 1 Torhüter, 0 bis 1 Rotation – Team ${FP_REGELN.team41Min} bis ${FP_REGELN.team41Max} Kinder. Steht nicht in der Tabelle für U9.` });
  }
  if (teams.length < 2) {
    return { variante: v, eingabe: ein, teams, felder, runden: [], kennzahlen: fpKennzahlen({ teams, felder, runden: [], spielzeit: ein.spielzeit, wechsel: ein.wechsel }),
      hinweise: hinweise.concat({ art: "warn", text: "Für einen Spielplan braucht es mindestens zwei Teams." }), wechselregel: FP_REGELN.wechselregel, genutzteFelder: [], freieFelder: felder.map(f => f.nr) };
  }
  const p = _fpPlanAusTeams(teams, felder, ein);
  return { variante: v, eingabe: ein, teams, felder, runden: p.runden, kennzahlen: p.kennzahlen, hinweise: hinweise.concat(p.hinweise),
    wechselregel: FP_REGELN.wechselregel, genutzteFelder: p.genutzteFelder, freieFelder: p.freieFelder, zielSpiele: p.zielSpiele };
}

/* Variantenvergleich: große und kleine Teams (wenn verschieden), sortiert nach den Minuten des am wenigsten
   bespielten Kindes – zuerst gezeigt, nicht automatisch gewählt. */
function planFestivalVarianten(eingabe) {
  const a = planFestival(eingabe, "gross"), b = planFestival(eingabe, "klein");
  const gleich = JSON.stringify(a.teams.map(t => t.kinder)) === JSON.stringify(b.teams.map(t => t.kinder));
  const liste = gleich ? [a] : [a, b];
  return liste.sort((x, y) => y.kennzahlen.minKind - x.kennzahlen.minKind);
}

/* Plan → Felder des bestehenden Festival-Datensatzes (heimturnier: teams, plan, config). Rein, ohne Netz.
   Formen wie im bestehenden Ablauf: Minitore = „funino“ (3 gegen 3), Jugendtore = „f3“ (3+1), 4+1 = „f4“. */
const FP_ZU_FORM = { mini: "funino", jugend: "f3", jugend41: "f4" };
function fpZuHeimturnier(plan, start) {
  const [sh, sm] = String(start || "10:15").split(":").map(Number);
  const zeit = r => { const m = (sh || 0) * 60 + (sm || 0) + (r - 1) * (plan.eingabe.spielzeit + plan.eingabe.wechsel); return String(Math.floor(m / 60) % 24).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); };
  const rows = [];
  plan.runden.forEach(r => r.spiele.forEach(g => {
    const f = plan.felder.find(x => x.nr === g.feld);
    rows.push({ runde: r.nr, feld: g.feld, form: FP_ZU_FORM[f.form], zeit: zeit(r.nr), a: g.a, b: g.b, phase: "Runde " + r.nr });
  }));
  const abw = plan.felder.some(f => f.form === "jugend41");
  return {
    teams: plan.teams.map(t => t.name),
    plan: rows,
    config: {
      felder: plan.felder.filter(f => plan.genutzteFelder.includes(f.nr)).map(f => ({ form: FP_ZU_FORM[f.form] })),
      vereine: plan.eingabe.vereine.map(v => ({ name: v.name, kinder: v.kinder, teams: plan.teams.filter(t => t.verein === v.name).length })),
      spieldauer: plan.eingabe.spielzeit, wechsel: plan.eingabe.wechsel, dauer: plan.eingabe.zeitfenster, spieldauerManuell: true, teamsManuell: true,
      planer: { stand: FP_REGELN.quelle, wechselregel: plan.wechselregel, abweichung: abw ? FP_ABWEICHUNG_41 : "", betreuer: plan.kennzahlen.betreuer,
        hinweise: plan.hinweise.filter(h => h.art !== "info" || /spielfrei|Rotation/.test(h.text)).map(h => h.text) }
    }
  };
}

/* ═══ Oberfläche (nur Trainer-Bereich, Welle 2). Einstieg: Knopf „🧮 Festival-Planer“ im Festival-Fenster. ═══
   Ein Bildschirm Eingabe (Hauptaktion „Plan erzeugen“), ein Bildschirm Ergebnis (Hauptaktion „Plan übernehmen“).
   Übernehmen schreibt Teams, Plan und Felder in den geöffneten Festival-Datensatz – derselbe Weg wie „Spielplan
   erzeugen“; der bestehende Link zeigt ihn. Ohne Übernehmen ändert sich nichts. */
let _FP = null;
const FP_HEIM = "SV Adler Dellbrück U9 I";
function fpOpen() {
  const cfg = (typeof _HT !== "undefined" && _HT && _HT.config) || {};
  const vereine = (cfg.vereine || []).map(v => ({ name: v.name || "", kinder: v.kinder || 0, teams: null }));
  if (!vereine.length) vereine.push({ name: FP_HEIM, kinder: 0, teams: null });
  const felder = (cfg.felder && cfg.felder.length ? cfg.felder : [{ form: "funino" }, { form: "funino" }, { form: "funino" }])
    .slice(0, FP_REGELN.felderMax).map(f => ({ tor: f.form === "f3" || f.form === "f4" ? "jugend" : "mini", vierPlusEins: false }));
  _FP = { vereine, felder, spielzeit: FP_REGELN.spielzeit, wechsel: FP_REGELN.wechselzeit, zeitfenster: FP_REGELN.zeitfenster, wiederholung: false, varianten: null, wahl: 0 };
  document.getElementById("fp-modal")?.remove();
  const m = document.createElement("div"); m.id = "fp-modal";
  m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-label", "Festival-Planer");
  m.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10003;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.innerHTML = `<div class="fp-karte"><div id="fp-body"></div></div>`;
  document.body.appendChild(m);
  _fpStil(); fpRender();
}
function fpSchliessen() { document.getElementById("fp-modal")?.remove(); _FP = null; }
function _fpStil() {
  if (document.getElementById("fp-stil")) return;
  const st = document.createElement("style"); st.id = "fp-stil";
  st.textContent = `.fp-karte{background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:520px;width:100%;margin:auto}
.fp-h{font-size:var(--s-text);font-weight:800;margin:16px 0 8px}
.fp-zeile{display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap}
.fp-feld{box-sizing:border-box;min-height:48px;padding:8px 12px;border:1px solid var(--rand-bedien);border-radius:10px;font:inherit;font-size:var(--s-text);background:var(--surface2);color:var(--text)}
.fp-step{display:inline-flex;align-items:center;gap:4px}
.fp-step button{min-width:48px;min-height:48px;border:1px solid var(--rand-bedien);border-radius:10px;background:var(--surface2);color:var(--text);font:inherit;font-size:var(--s-karte);font-weight:800;cursor:pointer}
.fp-step b{min-width:32px;text-align:center;font-size:var(--s-karte)}
.fp-haupt{display:block;width:100%;min-height:56px;margin-top:16px;border:none;border-radius:12px;background:var(--text);color:var(--surface);font:inherit;font-size:var(--s-teil);font-weight:800;cursor:pointer}
.fp-neben{min-height:48px;padding:0 14px;border:1px solid var(--rand-bedien);border-radius:10px;background:transparent;color:var(--text);font:inherit;font-weight:700;cursor:pointer}
.fp-hin{display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border-radius:10px;margin-bottom:6px;font-size:var(--s-text);line-height:1.4;border:1px solid var(--rand-bedien)}
.fp-hin b{white-space:nowrap}
.fp-kz{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.fp-kz div{border:1px solid var(--rand-bedien);border-radius:10px;padding:8px;text-align:center}
.fp-kz b{display:block;font-size:var(--s-teil);font-variant-numeric:tabular-nums}
.fp-kz span{font-size:var(--s-klein);color:var(--text2)}
.fp-tab{width:100%;border-collapse:collapse;font-size:var(--s-klein)}
.fp-tab th,.fp-tab td{border:1px solid var(--rand-bedien);padding:6px 4px;text-align:left;vertical-align:top}
.fp-punkt{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:4px;vertical-align:middle}
.fp-haupt:focus-visible,.fp-neben:focus-visible,.fp-step button:focus-visible{outline:3px solid var(--blue);outline-offset:2px}`;
  document.head.appendChild(st);
}
function fpSetzen(pfad, wert) {
  if (!_FP) return;
  const [a, i, b] = String(pfad).split(".");
  if (b != null) { const o = _FP[a][Number(i)]; if (!o) return; o[b] = wert; }
  else _FP[a] = wert;
  _FP.varianten = null;
  fpRender();
}
function fpSchritt(pfad, delta, min, max) {
  const [a, i, b] = String(pfad).split(".");
  const alt = b != null ? (_FP[a][Number(i)][b] || 0) : _FP[a];
  fpSetzen(pfad, Math.max(min, Math.min(max, (Number(alt) || 0) + delta)));
}
function fpVereinPlus() { _FP.vereine.push({ name: "", kinder: 0, teams: null }); _FP.varianten = null; fpRender(); }
function fpVereinWeg(i) { _FP.vereine.splice(i, 1); _FP.varianten = null; fpRender(); }
function fpFelder(delta) {
  const n = Math.max(1, Math.min(FP_REGELN.felderMax, _FP.felder.length + delta));
  while (_FP.felder.length < n) _FP.felder.push({ tor: "mini", vierPlusEins: false });
  _FP.felder.length = n; _FP.varianten = null; fpRender();
}
function fpEingabe() {
  return { vereine: _FP.vereine.map(v => ({ name: v.name || "Verein", kinder: v.kinder, teams: v.teams })), felder: _FP.felder,
    spielzeit: _FP.spielzeit, wechsel: _FP.wechsel, zeitfenster: _FP.zeitfenster, wiederholung: _FP.wiederholung };
}
function fpErzeugen() {
  const e = fpEingabe();
  if (e.vereine.filter(v => v.kinder > 0 || v.teams).length < 1) { if (typeof toast === "function") toast("Bitte Kinderzahlen erfassen", "err"); return; }
  _FP.varianten = planFestivalVarianten(e); _FP.wahl = 0; fpRender();
  document.getElementById("fp-body")?.scrollIntoView({ block: "start" });
}
function _fpStep(pfad, wert, min, max, label) {
  return `<span class="fp-step" role="group" aria-label="${esc(label)}"><button type="button" onclick="fpSchritt('${pfad}',-1,${min},${max})" aria-label="${esc(label)} weniger">−</button><b>${wert}</b><button type="button" onclick="fpSchritt('${pfad}',1,${min},${max})" aria-label="${esc(label)} mehr">+</button></span>`;
}
function _fpHinweisHtml(h) {
  const art = { warn: ["⚠️", "Hinweis", "var(--warn-dim,#fef3c7)"], abweichung: ["⛔", "Abweichung", "var(--rot-dim,#fee2e2)"], info: ["ℹ️", "Info", "var(--surface2)"] }[h.art] || ["ℹ️", "Info", "var(--surface2)"];
  return `<div class="fp-hin" style="background:${art[2]}"><span aria-hidden="true">${art[0]}</span><div><b>${art[1]}:</b> ${esc(h.text)}</div></div>`;
}
function fpRender() {
  const el = document.getElementById("fp-body"); if (!el || !_FP) return;
  const kopf = typeof mdlHead === "function" ? mdlHead("fp-modal", "🧮", "Festival-Planer", "Kinder je Verein und Felder eingeben – die App rechnet Teams, Runden und Felder", "#b45309") : "<b>🧮 Festival-Planer</b>";
  if (_FP.varianten) { el.innerHTML = kopf + _fpErgebnisHtml(); return; }
  const v = _FP.vereine.map((x, i) => `<div style="border:1px solid var(--rand-bedien);border-radius:12px;padding:10px;margin-bottom:8px">
      <div class="fp-zeile"><input class="fp-feld" style="flex:1;min-width:0" value="${esc(x.name)}" aria-label="Vereinsname" placeholder="Verein" onchange="fpSetzen('vereine.${i}.name',this.value)">
        ${_FP.vereine.length > 1 ? `<button type="button" class="fp-neben" onclick="fpVereinWeg(${i})" aria-label="${esc(x.name || "Verein")} entfernen">✕</button>` : ""}</div>
      <div class="fp-zeile"><span style="min-width:64px">Kinder</span>${_fpStep("vereine." + i + ".kinder", x.kinder || 0, 0, 40, "Kinder")}
        <label style="margin-left:auto;display:flex;align-items:center;gap:6px">Teams <select class="fp-feld" onchange="fpSetzen('vereine.${i}.teams',this.value?Number(this.value):null)">
          <option value=""${x.teams ? "" : " selected"}>App rechnet</option>${[1, 2, 3, 4, 5].map(n => `<option value="${n}"${x.teams === n ? " selected" : ""}>${n} gemeldet</option>`).join("")}</select></label></div>
    </div>`).join("");
  const f = _FP.felder.map((x, i) => `<div class="fp-zeile" style="border-bottom:1px solid var(--rand-bedien);padding-bottom:8px">
      <b style="min-width:56px">Feld ${i + 1}</b>
      <div class="seg-ctrl" role="group" aria-label="Tore auf Feld ${i + 1}" style="flex:1">
        <button type="button" class="seg-btn${x.tor === "mini" ? " active" : ""}" aria-pressed="${x.tor === "mini"}" onclick="fpSetzen('felder.${i}.tor','mini')" style="min-height:48px">Minitore · 3 gegen 3</button>
        <button type="button" class="seg-btn${x.tor === "jugend" ? " active" : ""}" aria-pressed="${x.tor === "jugend"}" onclick="fpSetzen('felder.${i}.tor','jugend')" style="min-height:48px">Jugendtore · 3+1</button>
      </div>
      ${x.tor === "jugend" ? `<label style="display:flex;align-items:center;gap:8px;min-height:48px;width:100%"><input type="checkbox" style="width:24px;height:24px"${x.vierPlusEins ? " checked" : ""} onchange="fpSetzen('felder.${i}.vierPlusEins',this.checked)"> 4+1 nach Absprache der Trainer</label>` : ""}
    </div>`).join("");
  el.innerHTML = kopf + `
    <div class="fp-h">Vereine</div>${v}
    <button type="button" class="fp-neben" onclick="fpVereinPlus()">＋ Verein</button>
    <div class="fp-h" style="display:flex;align-items:center;gap:10px">Felder <span style="margin-left:auto">${_fpStep("felder", _FP.felder.length, 1, FP_REGELN.felderMax, "Felder").replace(/fpSchritt\('felder',(-?1),1,5\)/g, "fpFelder($1)")}</span></div>${f}
    <div class="fp-h">Zeiten</div>
    <div class="fp-zeile"><span style="min-width:120px">Spielzeit (Min.)</span>${_fpStep("spielzeit", _FP.spielzeit, 3, 15, "Spielzeit")}</div>
    <div class="fp-zeile"><span style="min-width:120px">Wechsel (Min.)</span>${_fpStep("wechsel", _FP.wechsel, 0, 10, "Wechselzeit")}</div>
    <div class="fp-zeile"><span style="min-width:120px">Zeitfenster (Min.)</span>${_fpStep("zeitfenster", _FP.zeitfenster, 20, 120, "Zeitfenster").replace(/,(-?)1,20,120/g, ",$15,20,120")}</div>
    <label style="display:flex;align-items:center;gap:8px;min-height:48px"><input type="checkbox" style="width:24px;height:24px"${_FP.wiederholung ? " checked" : ""} onchange="fpSetzen('wiederholung',this.checked)"> Wiederholungsrunde, wenn es weniger als ${FP_REGELN.spieleEmpfohlen} Gegner gibt</label>
    <div style="font-size:var(--s-klein);color:var(--text2);margin-top:6px">Modus: Jeder gegen Jeden. Regeln: ${esc(FP_REGELN.quelle)}.</div>
    <button type="button" class="fp-haupt" onclick="fpErzeugen()">Plan erzeugen</button>`;
}
function _fpErgebnisHtml() {
  const vs = _FP.varianten, p = vs[_FP.wahl] || vs[0], k = p.kennzahlen;
  const name = x => x.variante === "klein" ? "Kleine Teams" : "Große Teams";
  const wahl = vs.length > 1 ? `<div class="fp-h">Varianten</div><div class="seg-ctrl" role="group" aria-label="Variante">${vs.map((x, i) =>
    `<button type="button" class="seg-btn${i === _FP.wahl ? " active" : ""}" aria-pressed="${i === _FP.wahl}" style="min-height:56px" onclick="_FP.wahl=${i};fpRender()">${name(x)}<br><small>${x.teams.length} Teams · schwächstes Kind ${String(x.kennzahlen.minKind).replace(".", ",")} Min.</small></button>`).join("")}</div>
    <div style="font-size:var(--s-klein);color:var(--text2);margin-top:4px">Zuerst steht die Variante mit den meisten Spielminuten für das am wenigsten bespielte Kind. Ihr entscheidet.</div>` : "";
  const T = i => { const t = p.teams[i]; return `<span class="fp-punkt" style="background:${t.farbe}" aria-hidden="true"></span>${esc(t.name)}`; };
  const fNr = p.genutzteFelder;
  const tab = `<table class="fp-tab"><thead><tr><th>Runde</th>${fNr.map(n => `<th>Feld ${n}</th>`).join("")}<th>Pause</th></tr></thead><tbody>${p.runden.map(r =>
    `<tr><td>${r.nr}</td>${fNr.map(n => { const g = r.spiele.find(x => x.feld === n); return `<td>${g ? T(g.a) + "<br>" + T(g.b) : "–"}</td>`; }).join("")}<td>${r.pause.length ? r.pause.map(T).join("<br>") + (fpBuntAn() ? "<br>→ 🌈 Buntes Feld" : "") : "–"}</td></tr>`).join("")}</tbody></table>`;
  const zahl = x => String(x).replace(".", ",");
  const kz = `<div class="fp-kz">
      <div><b>${p.teams.length}</b><span>Teams</span></div><div><b>${fNr.length} von ${p.felder.length}</b><span>Felder belegt</span></div><div><b>${k.runden}</b><span>Runden</span></div>
      <div><b>${k.gesamtdauer}</b><span>Minuten gesamt</span></div><div><b>${zahl(Math.min(...k.nettoJeTeam))}–${zahl(Math.max(...k.nettoJeTeam))}</b><span>Netto-Min. je Team</span></div>
      <div><b>${zahl(k.minKind)}</b><span>Min. je Kind (mind.)</span></div>
      <div><b>${k.betreuer}</b><span>Betreuer höchstens</span></div><div><b>${k.minitore} · ${k.jugendtore}</b><span>Minitore · Jugendtore</span></div><div><b>${k.huetchen}</b><span>Hütchen</span></div></div>`;
  const teams = `<table class="fp-tab"><thead><tr><th>Team</th><th>Kinder</th><th>Spiele</th><th>Netto</th><th>je Kind</th><th>Pausen</th></tr></thead><tbody>${p.teams.map((t, i) =>
    `<tr><td>${T(i)}</td><td>${t.kinder}</td><td>${k.spieleJeTeam[i]}</td><td>${k.nettoJeTeam[i]}</td><td>${zahl(k.schnittJeKind[i])}</td><td>${k.pausenJeTeam[i]}</td></tr>`).join("")}</tbody></table>`;
  const felder = p.felder.map(f => `<div class="fp-hin"><b>Feld ${f.nr}</b><div>${esc(f.tore)} · ${esc(f.label)} · ${esc(f.mass)} · ${f.schusszone ? "Schusszone ca. " + FP_REGELN.schusszoneM + " m" : "nur Mittellinie, Tore auf " + FP_REGELN.jugendtorHoehe}${p.freieFelder.includes(f.nr) ? " · <b>bleibt frei</b>" : ""}</div></div>`).join("");
  return `${wahl}
    <div class="fp-h">Hinweise</div>${p.hinweise.length ? p.hinweise.map(_fpHinweisHtml).join("") : '<div style="color:var(--text2)">Keine Abweichung von der Empfehlung.</div>'}
    <div class="fp-h">Kennzahlen</div>${kz}${fpBuntAn() ? `<div class="fp-bunt-mat" style="font-size:var(--s-klein);color:var(--text2);margin-top:4px">Dazu 🌈 Buntes Feld: ${FP_BUNT_MATERIAL}.</div>` : ""}
    <div class="fp-h">Rundenplan</div><div style="overflow-x:auto">${tab}</div>
    <div class="fp-h">Teams</div><div style="overflow-x:auto">${teams}</div>
    <div class="fp-h">Felder und Aufbau</div>${felder}
    <div class="fp-h">Wechselregel</div><div style="font-size:var(--s-text)">${esc(p.wechselregel)}</div>
    <button type="button" class="fp-haupt" onclick="fpUebernehmen()">Plan übernehmen</button>
    <div class="fp-zeile" style="margin-top:8px"><button type="button" class="fp-neben" onclick="_FP.varianten=null;fpRender()">← Eingabe ändern</button><button type="button" class="fp-neben" onclick="fpSchliessen()">Schließen</button></div>`;
}
async function fpUebernehmen() {
  if (!_FP || !_FP.varianten || typeof _HT === "undefined" || !_HT) return;
  const p = _FP.varianten[_FP.wahl] || _FP.varianten[0];
  const hatErg = (_HT.plan || []).some(x => x.ta != null);
  const frage = hatErg ? "Es gibt schon Ergebnisse – sie gehen verloren." : ((_HT.plan || []).length ? "Der bisherige Spielplan wird ersetzt." : "");
  if (frage && typeof frageJaNein === "function" && !await frageJaNein({ emoji: "🧮", titel: "Plan übernehmen?", text: frage, ja: "Übernehmen", ton: hatErg ? "rot" : undefined })) return;
  const l = fpZuHeimturnier(p, (_HT.config || {}).start || "10:15");
  const cfg = { ...(_HT.config || {}), ...l.config, vereine: l.config.vereine.map(v => ({ ...v, teamsManuell: true, manuell: true })) };
  if (typeof htPatch === "function" && await htPatch({ config: cfg, teams: l.teams, plan: l.plan })) {
    if (typeof toast === "function") toast("🧮 Plan übernommen – " + l.plan.length + " Spiele");
    fpSchliessen();
    if (typeof fstRender === "function") fstRender();
  }
}

/* letzte Definition der Datei – MODUL_WACHE prüft diesen Namen */
/* v982 · 🌈 Buntes Feld (Charles 27.11.: „Wenn zb ein team Pause hat … und es noch von anderen Mannschaften spieler gibt die pausieren
   oder auswechsel spieler sind und bei der Kälte nicht rumstehen wollen oder sollen“; Bild freigegeben: immer ein FUNiño-Feld oben links
   im Feldplan, „sonst kein Buntes Feld“). Der Schalter steht im Festival-Fenster; die Turnierseite zeigt Karte, Feld im Plan und
   „Pause → 🌈 Buntes Feld“ (fstBunt in md-turnierplan.js). Der Spielplan selbst bleibt unverändert. Hier, nicht in md-turnierplan.js,
   weil die Turnierseite ein festes Größenbudget hat (v899) und den Schalter nicht braucht. */
const FP_BUNT_MATERIAL = "4 Minitore, 6 Hütchen";
function fstBuntPlatz(cfg) {
  const f = (cfg && cfg.felder && cfg.felder.length) ? cfg.felder : FST_STANDARD_FELDER;
  return fstBunt({ bunt: true }, f);
}
function fstBuntSetzen(an) {
  if (!_HT) return; _HT.config = _HT.config || {};
  _HT.config.bunt = !!an && fstBuntPlatz(_HT.config);
  fstZeitSpeichern();
}
function fstBuntWahlHtml(cfg) {
  cfg = cfg || {};
  const platz = fstBuntPlatz(cfg), an = !!cfg.bunt && platz;
  const b = (on, v, txt) => `<button type="button" class="seg-btn${on ? " active" : ""}" aria-pressed="${on ? "true" : "false"}" onclick="fstBuntSetzen(${v})"${!platz && v ? " disabled" : ""}>${txt}</button>`;
  return `<div style="font-size:var(--s-text);font-weight:800;margin:16px 0 6px">🌈 Buntes Feld</div>
    <div class="seg-ctrl" id="fst-bunt-wahl" role="group" aria-label="Buntes Feld" style="flex-wrap:wrap">${b(an, 1, "Ja, wir bauen eins auf")}${b(!an, 0, "Nein")}</div>
    <div style="font-size:var(--s-klein);color:var(--text2);margin-top:4px">${platz
      ? "Ein FUNiño-Feld oben links für alle, die gerade Pause haben oder ausgewechselt sind: kicken, warm bleiben, spontan ein Spiel – Kinder aller Vereine gemischt, ohne Ergebnis. Material: " + FP_BUNT_MATERIAL + ". Die Turnierseite zeigt es im Feldplan und bei jeder Pause."
      : "Oben links ist heute kein Platz frei (dort liegen schon zwei Felder oder ein Jugendtor-Feld) – deshalb gibt es kein Buntes Feld."}</div>`;
}
function fpBuntAn() { return typeof _HT !== "undefined" && !!_HT && !!(_HT.config && _HT.config.bunt) && fstBuntPlatz(_HT.config); }
function festivalPlanerModulDa() { return true; }
