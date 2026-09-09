/* v497 – PO: „Schön, wenn nur das nächste anstehende Spiel sichtbar ist und der Rest eingeklappt.
   Dann ist es übersichtlicher. Im externen Link auch. Vielleicht kann man im Trainer-Zugang dort
   sogar mehr einklappen." Geprueft: in beiden Ansichten ist genau die laufende bzw. naechste Runde
   offen und der Rest zugeklappt (mit Zusammenfassung), der Aushang bleibt vollstaendig, und im
   Planer klappt die Vorbereitung zu, sobald der Spielplan steht. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const heute = h.heute();
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), nominierungen: [], termine: [], matchday: [], heimturnier: (u, req) => req.method() === "GET" ? [] : { status: 204, body: "" } }), hoehe: 1600 });
  const r = await s.page.evaluate(async ({ heute }) => {
    if (typeof fstPlanHtml !== "function") return { fehlt: "fstPlanHtml" };
    await loadKader(); document.getElementById("pin-gate")?.remove();
    const app = document.getElementById("main-app"); if (app) app.style.display = "block";
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const vereine = [{ name: "SV Adler Dellbrück", kinder: 14, teams: 2 }, { name: "SC Wahn Grengel", kinder: 10, teams: 2 }, { name: "SV Rath-Heumar", kinder: 10, teams: 2 }];
    const teams = fstTeamsBauen(vereine);
    const cfg = { art: "festival", format: "festival", start: "10:15", dauer: 60, spieldauer: 8, wechsel: 5, felder: fstFelderKuerzen(FST_STANDARD_FELDER, teams), vereine, infos: "" };
    const plan = fstPlanBauen(teams, cfg);
    const row = { id: 9, slug: "x", name: "Kinderfestival", datum: heute, config: cfg, teams: teams.map(t => t.name), plan };
    const runden = [...new Set(plan.map(p => p.runde))].length;
    const zaehl = html => { const d = document.createElement("div"); d.innerHTML = html; return { details: d.querySelectorAll("details").length, hoehe: [...d.querySelectorAll("summary")].map(x => x.style.minHeight) }; };
    // a) Trainer ohne Uhr: Runde 1 offen
    const a = zaehl(fstPlanHtml(plan, row.teams, cfg.felder, false, false, cfg));
    // b) Trainer mit laufender Runde 3
    const cfg3 = { ...cfg, uhr: { runde: 3, start: new Date().toISOString(), dauer: 8 } };
    const h3 = fstPlanHtml(plan, row.teams, cfg3.felder, false, false, cfg3);
    const d3 = document.createElement("div"); d3.innerHTML = h3;
    const offen3 = [...d3.children].filter(x => x.tagName !== "DETAILS").map(x => (x.textContent.match(/Runde (\d+)/) || [])[1]);
    // c) Aushang: alles offen
    const c = zaehl(fstPlanHtml(plan, row.teams, cfg.felder, true, false, cfg));
    // d) Gast-Seite
    const wrap = document.createElement("div"); document.body.appendChild(wrap);
    _htPub = { slug: "x", code: "", wrap, row: { ...row, config: cfg3 } }; _fstUhrMarke = "";
    _fstPublicRender(wrap, { ...row, config: cfg3 }); await warte(60);
    const gDet = wrap.querySelectorAll("details");
    const gastRunden = [...gDet].map(x => (x.querySelector("summary").textContent.match(/Runde (\d+)/) || [])[1]);
    const gastOffen = [...wrap.querySelectorAll("div")].filter(x => /▶ läuft|als Nächstes/.test(x.textContent) && /Runde/.test(x.textContent));
    _htPub = null;
    // e) Planer: Vorbereitung klappt zu, sobald der Plan steht
    let box = document.getElementById("ht-body"); if (!box) { box = document.createElement("div"); box.id = "ht-body"; document.body.appendChild(box); }
    _HT = { id: 9, name: "Kinderfestival", datum: heute, edit_code: "abc", config: cfg, teams: row.teams, plan: [] };
    fstRender(); await warte(120);
    const ohnePlan = !!document.getElementById("fst-vorbereitung");
    const nummernVorher = /1 · Wer kommt|2 · Felder|3 · Zeitplan/.test(box.textContent);
    _HT.plan = plan; fstRender(); await warte(120);
    const vor = document.getElementById("fst-vorbereitung");
    return { a, offen3, c, runden, gastZu: gastRunden.filter(Boolean), gastOffen: gastOffen.length > 0,
      ohnePlan, mitPlan: !!vor, zu: vor ? !vor.open : null,
      inhalt: vor ? /Wer kommt|Felder aufbauen|Zeitplan/.test(vor.textContent) : false,
      // v498: Schrittnummern nur, solange die Schritte sichtbar sind
      nummernVorher, nummernNachher: /\d · (Wer kommt|Wer spielt|Felder aufbauen|Zeitplan|Der Plan)/.test(box.textContent),
      summHoehe: vor ? vor.querySelector("summary").style.minHeight : "" };
  }, { heute });
  const fehler = s.fehler(); await s.schliessen();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt`); return h.ergebnis("Nur die nächste Runde", false, probleme); }
  if (r.a.details !== r.runden - 1) probleme.push(`Trainer: ${r.a.details} von ${r.runden} Runden zugeklappt – erwartet ${r.runden - 1}`);
  if (r.a.hoehe.some(x => x !== "44px")) probleme.push(`Zugeklappte Runden nur ${JSON.stringify(r.a.hoehe)} hoch`);
  if (r.offen3.join(",") !== "3") probleme.push(`Bei laufender Runde 3 ist Runde ${r.offen3.join(",") || "–"} offen`);
  if (r.c.details !== 0) probleme.push(`Der Aushang klappt ${r.c.details} Runden zu – gedruckt gehört alles aufs Blatt`);
  if (r.gastZu.length !== r.runden - 1 || r.gastZu.includes("3")) probleme.push(`Gast-Seite: zugeklappt ${JSON.stringify(r.gastZu)} – Runde 3 muss offen sein`);
  if (!r.gastOffen) probleme.push("Gast-Seite: keine Runde als laufend markiert");
  if (r.ohnePlan) probleme.push("Ohne Spielplan ist die Vorbereitung schon eingeklappt");
  if (!r.mitPlan) probleme.push("Mit Spielplan klappt die Vorbereitung nicht ein");
  if (r.mitPlan && !r.zu) probleme.push("Die Vorbereitung ist offen statt zugeklappt");
  if (!r.inhalt) probleme.push("Vereine, Felder und Zeiten stecken nicht im Klappblock");
  if (r.summHoehe !== "44px") probleme.push(`Klappdeckel ${r.summHoehe} statt 44px`);
  if (!r.nummernVorher) probleme.push("Ohne Spielplan fehlen die Schrittnummern 1–3");
  if (r.nummernNachher) probleme.push("Mit Spielplan stehen noch Schrittnummern da, obwohl die Schritte zugeklappt sind");
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Trainer: ${r.a.details} von ${r.runden} Runden zugeklappt · bei laufender Runde 3 offen: Runde ${r.offen3.join(",")}`);
  zeilen.push(`Gast-Seite zugeklappt: Runden ${r.gastZu.join(", ")} · Aushang klappt nichts zu (${r.c.details})`);
  zeilen.push(`Vorbereitung: ohne Plan offen ${!r.ohnePlan}, mit Plan zugeklappt ${r.zu}, Inhalt drin ${r.inhalt} · Schrittnummern vorher ${r.nummernVorher}, nachher ${r.nummernNachher}`);
  return h.ergebnis("Nur die laufende Runde ist offen, die Vorbereitung klappt nach dem Planen zu", !probleme.length, zeilen.concat(probleme));
};
