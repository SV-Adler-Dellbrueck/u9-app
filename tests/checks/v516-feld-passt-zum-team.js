/* v516 – PO beim Blick in den fertigen Plan fürs Festival am 12.09.: „Adler 2 hat aber nur
   4 Kinder und kann so kein 4+1 spielen." Er hatte recht, und es war nicht nur seine
   Mannschaft: im Käfig standen ZWEI Vierer-Teams.
   Zwei Ursachen, beide für sich plausibel. fstTeamsVorschlag rechnet mit dem DURCHSCHNITT der
   Feldgrößen – (5+3+3)/3 = 3,67 plus ein Wechselkind –, das stimmt auf FUNiño und ist auf 4+1
   genau einer zu wenig. Und fstPlanBauen verteilt die Felder mit (k+s)%F, also rein nach
   Position: die Kinderzahl steht an jedem Team, wurde aber nie gelesen. Nebenwirkung: eine
   Mannschaft kam NIE aufs Jugendtor-Feld, auch nicht in einer fünften Runde.
   PO: „Jedes Team soll auf jeden Fall mal 4+1 spielen." Deshalb gleicht die App die Felder aus
   und WARNT bei zu kleinen Teams – sie räumt sie NICHT weg. Der Trainer lässt lieber jemanden
   aushelfen, als ein Team das große Feld nie sehen zu lassen.
   Geprüft wird beides am echten Aufbau des 12.09. (9 · 5 · 9 Kinder, Käfig + 2× FUNiño). */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [], heimturnier: (u, req) => req.method() === "GET" ? [] : { status: 204, body: "" } }),
    hoehe: 1800
  });

  const r = await s.page.evaluate(async ({ kh }) => {
    eval(kh);                                             // __kontrastVon(el)
    const warte = ms => new Promise(r => setTimeout(r, ms));
    for (const n of ["fstFelderAusgleichen", "fstZuKlein", "fstZuKleinHtml", "fstPlanBauen", "fstTeamsBauen"])
      if (typeof window[n] !== "function") return { fehlt: n };

    /* Der echte Aufbau vom 12.09.2026 – der Fall, an dem es aufgefallen ist. */
    const vereine = [{ name: "SV Adler Dellbrück", teams: 2, kinder: 9 },
                     { name: "Rath-Heumar", teams: 1, kinder: 5 },
                     { name: "Wahn Grengel", teams: 2, kinder: 9 }];
    const felder = [{ form: "f4" }, { form: "funino" }, { form: "funino" }];
    const cfg = { art: "festival", format: "festival", start: "10:15", dauer: 60, spieldauer: 10, wechsel: 5, felder, vereine, infos: "" };
    const teams = fstTeamsBauen(vereine);
    const plan = fstPlanBauen(teams, cfg);

    // ── Kommt jede Mannschaft einmal aufs Jugendtor-Feld? ────────────────────
    const gross = new Set();
    plan.forEach(p => { if (_fstJugendtore(p.form)) { gross.add(p.a); gross.add(p.b); } });
    const ohneGrosses = teams.map((t, i) => gross.has(i) ? null : t.name).filter(Boolean);

    // ── Was der Ausgleich NICHT anfassen darf ────────────────────────────────
    const roh = [];
    _fstRunden(teams.length).forEach(pa => pa.forEach(x => roh.push(x.slice().sort().join("-"))));
    const fremd = plan.filter(p => !roh.includes([p.a, p.b].sort().join("-"))).length;
    let teamDoppelt = 0, feldDoppelt = 0;
    [...new Set(plan.map(p => p.runde))].forEach(rd => {
      const sp = plan.filter(p => p.runde === rd);
      const idx = sp.flatMap(p => [p.a, p.b]), fd = sp.map(p => p.feld);
      if (new Set(idx).size !== idx.length) teamDoppelt++;
      if (new Set(fd).size !== fd.length) feldDoppelt++;
    });
    /* Zeiten und Runden bleiben, weil nur innerhalb einer Zeitscheibe getauscht wird:
       jede Runde behält genau eine Uhrzeit. */
    const zeitProRunde = [...new Set(plan.map(p => p.runde))]
      .map(rd => new Set(plan.filter(p => p.runde === rd).map(p => p.zeit)).size);

    // ── Der Ausgleich ist eine reine Feldvertauschung ────────────────────────
    const vorher = fstFelderAusgleichen(plan, felder);      // zweiter Lauf ändert nichts mehr
    const stabil = JSON.stringify(vorher) === JSON.stringify(plan);

    // ── Die Warnung nennt genau die knappen Teams ────────────────────────────
    const warn = fstZuKlein(plan, teams, felder)
      .map(x => "R" + x.runde + " " + x.feld + " " + x.name + " " + x.kinder + "/" + x.auf);

    // Alle gross genug → keine Warnung
    const dicke = fstTeamsBauen([{ name: "A", teams: 1, kinder: 8 }, { name: "B", teams: 1, kinder: 8 }]);
    const ohneWarn = fstZuKlein(fstPlanBauen(dicke, { ...cfg, vereine: [] }), dicke, felder).length;
    const leerHtml = fstZuKleinHtml(fstPlanBauen(dicke, { ...cfg, vereine: [] }), dicke, felder);

    // ── Und sie steht wirklich in der Planer-Ansicht ─────────────────────────
    _HT = { id: 6, slug: "kinderfestival-12-09", name: "Kinderfestival", datum: "2026-09-12",
            edit_code: "X", config: cfg, teams: teams.map(t => t.name), plan };
    const body = document.createElement("div"); body.id = "ht-body"; document.body.appendChild(body);
    fstRender(); await warte(150);
    const kasten = [...document.querySelectorAll("div")].find(d => /Zu wenig Kinder für das Feld/.test(d.textContent) && d.querySelector("ul"));
    const sichtbar = !!kasten;
    const kastenText = sichtbar ? kasten.textContent.replace(/\s+/g, " ").trim() : "";
    const punkte = sichtbar ? [...kasten.querySelectorAll("li")].length : 0;
    const kontrast = sichtbar ? __kontrastVon(kasten) : 0;
    body.remove();

    return { teams: teams.map(t => t.name + ":" + t.kinder), ohneGrosses, fremd, teamDoppelt, feldDoppelt,
             zeitProRunde, stabil, warn, ohneWarn, leerHtml, sichtbar, kastenText, punkte, kontrast,
             felderJeRunde: [...new Set(plan.map(p => p.runde))].map(rd =>
               plan.filter(p => p.runde === rd).map(p => fstFeldName(felder, p.feld - 1)).join("+")) };
  }, { kh: h.kontrastHelfer });
  const fehler = s.fehler(); await s.schliessen();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt`); return h.ergebnis("Feld passt zum Team", false, probleme); }

  // ── Jede Mannschaft einmal aufs grosse Feld ───────────────────────────────
  if (r.ohneGrosses.length)
    probleme.push(`Nie auf dem Jugendtor-Feld: ${r.ohneGrosses.join(", ")} – „jedes Team soll auf jeden Fall mal 4+1 spielen“`);

  // ── Was der Ausgleich nicht anfassen darf ─────────────────────────────────
  if (r.fremd) probleme.push(`${r.fremd} Paarung(en) stehen nicht in der Kreismethode – der Ausgleich darf nur Felder tauschen, nie Gegner`);
  if (r.teamDoppelt) probleme.push(`In ${r.teamDoppelt} Runde(n) spielt ein Team zweimal`);
  if (r.feldDoppelt) probleme.push(`In ${r.feldDoppelt} Runde(n) ist ein Feld doppelt belegt`);
  if (r.zeitProRunde.some(x => x !== 1)) probleme.push(`Eine Runde hat mehrere Uhrzeiten (${r.zeitProRunde.join(",")}) – getauscht wird nur innerhalb einer Zeitscheibe`);
  if (!r.stabil) probleme.push("Ein zweiter Durchlauf des Ausgleichs ändert den Plan noch einmal – er ist nicht in sich fertig");

  // ── Die Warnung ───────────────────────────────────────────────────────────
  if (r.warn.length !== 2) probleme.push(`Die Warnung nennt ${r.warn.length} Fälle statt 2: ${r.warn.join(" · ")}`);
  if (!r.warn.every(x => /^R1 Käfig/.test(x))) probleme.push(`Gewarnt wird für ${r.warn.join(" · ")} – erwartet beide Vierer-Teams in Runde 1 im Käfig`);
  if (!r.warn.some(x => /Adler Dellbrück 2 4\/5/.test(x))) probleme.push("Adler Dellbrück 2 (4 Kinder auf 4+1) wird nicht gemeldet");
  if (!r.warn.some(x => /Wahn Grengel 2 4\/5/.test(x))) probleme.push("Wahn Grengel 2 (4 Kinder auf 4+1) wird nicht gemeldet – es ist nicht nur die eigene Mannschaft");
  if (r.ohneWarn !== 0) probleme.push(`Bei ausreichend grossen Teams meldet die App ${r.ohneWarn} Fälle`);
  if (r.leerHtml !== "") probleme.push("Ohne Befund bleibt trotzdem ein Kasten stehen");

  // ── Sie steht in der Ansicht, lesbar ──────────────────────────────────────
  if (!r.sichtbar) probleme.push("Im Festival-Planer steht keine Warnung – dort, wo es sich noch ändern liesse");
  if (r.punkte !== 2) probleme.push(`Der Kasten führt ${r.punkte} Zeilen statt 2 auf`);
  if (r.sichtbar && !/aushelfen/i.test(r.kastenText)) probleme.push("Der Kasten sagt nicht, was jetzt hilft");
  if (r.sichtbar && !/Adler Dellbrück 2/.test(r.kastenText)) probleme.push("Der Kasten nennt die Mannschaft nicht beim Namen – Farbe allein trägt die Bedeutung nicht");
  if (r.kontrast && r.kontrast < 4.5) probleme.push(`Warnkasten ${r.kontrast}:1 (mindestens 4.5)`);
  if (fehler.length) probleme.push(...fehler.slice(0, 3));

  zeilen.push(`Teams: ${r.teams.join(" · ")}`);
  zeilen.push(`Felder je Runde: ${r.felderJeRunde.join(" | ")} · alle einmal am Jugendtor: ${!r.ohneGrosses.length}`);
  zeilen.push(`Unangetastet: Paarungen ${r.fremd === 0} · Team doppelt ${r.teamDoppelt} · Feld doppelt ${r.feldDoppelt} · in sich fertig ${r.stabil}`);
  zeilen.push(`Warnung: ${r.warn.join(" · ")} · ohne Befund kein Kasten: ${r.leerHtml === ""} · Kontrast ${r.kontrast}:1`);
  return h.ergebnis("Feld passt zum Team – und jeder kommt einmal aufs grosse Feld", !probleme.length, zeilen.concat(probleme));
};
