/* v616 · PO: „Beim Festival sollten interne Duelle vermieden werden. Eher nochmal gegen eine
   andere Mannschaft mehrfach spielen.“ – und: „Wenn ich alle Teams angegeben habe, wäre es
   super, wenn die App die optimale Spielzeit pro Begegnung berechnen würde. Alles zwischen 7
   und 10 Minuten ist erlaubt.“

   a) Festival wie am 26.09. (Adler 3, Roland West 2, Bergfried 2 Teams, 60 Min., 5 Min. Pause):
      kein Spiel zweier Teams desselben Vereins, kein Team zweimal in einer Runde, jedes Team
      spielt gleich oft oder höchstens eins weniger.
   b) Die errechnete Spielzeit liegt zwischen 7 und 10 Minuten und füllt die 60 Minuten:
      hier 8 Min. × 5 Runden + 4 Pausen = 60.
   c) Nur zwei Vereine mit je zwei Teams: die Zeit wird gefüllt – lieber Wiederholungen als
      interne Duelle.
   d) Ein einziger Verein: dann geht es nicht anders, der Plan entsteht trotzdem.
   e) Wer die Spielzeit von Hand setzt, wird nicht überstimmt; der Planer bietet die Empfehlung
      an. Ohne Handeingabe zeigt er „Empfohlen: 8 Min.“ und nutzt sie beim Erstellen. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [], nominierungen: [],
    heimturnier: (u, req) => req.method() === "PATCH" ? { status: 204, body: "" } : [] }), hoehe: 1400 });
  const r = await s.page.evaluate(async () => {
    if (typeof fstSpielzeitOptimal !== "function" || typeof _fstPaarungen !== "function") return { fehlt: true };
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const pruef = (vereine, extra) => {
      const teams = fstTeamsBauen(vereine);
      const cfg = { art: "festival", start: "10:15", dauer: 60, wechsel: 5, felder: fstFelderKuerzen(FST_STANDARD_FELDER, teams), vereine, ...(extra || {}) };
      const opt = fstSpielzeitOptimal(teams.length, cfg);
      cfg.spieldauer = opt.min;
      const plan = fstPlanBauen(teams, cfg);
      const runden = [...new Set(plan.map(p => p.runde))];
      const intern = plan.filter(p => teams[p.a].verein === teams[p.b].verein).length;
      const doppelt = runden.filter(rd => { const ids = plan.filter(p => p.runde === rd).flatMap(p => [p.a, p.b]); return new Set(ids).size !== ids.length; }).length;
      const je = teams.map((t, i) => plan.filter(p => p.a === i || p.b === i).length);
      return { opt, runden: runden.length, spiele: plan.length, intern, doppelt, je, letzte: plan.length ? plan[plan.length - 1].zeit : "" };
    };
    const out = {};
    out.a = pruef([{ name: "SV Adler Dellbrück", teams: 3, kinder: 9 }, { name: "Roland West", teams: 2, kinder: 9 }, { name: "Bergfried Leverkusen", teams: 2, kinder: 9 }]);
    out.c = pruef([{ name: "SV Adler Dellbrück", teams: 2, kinder: 10 }, { name: "Gast", teams: 2, kinder: 10 }]);
    out.d = pruef([{ name: "SV Adler Dellbrück", teams: 2, kinder: 10 }]);
    // e) Planer-Ansicht: automatisch, dann von Hand
    await loadKader(); document.getElementById("pin-gate")?.remove();
    const m = document.getElementById("main-app"); if (m) m.style.display = "block";
    const vereine = [{ name: "SV Adler Dellbrück", teams: 3, kinder: 9 }, { name: "Roland West", teams: 2, kinder: 9 }, { name: "Bergfried Leverkusen", teams: 2, kinder: 9 }];
    _HT = { id: 7, name: "Kinderfestival", datum: "2026-09-26", config: { art: "festival", start: "10:15", dauer: 60, spieldauer: 12, wechsel: 5, felder: FST_STANDARD_FELDER.slice(), vereine }, teams: [], plan: [] };
    const body = document.createElement("div"); body.id = "ht-body"; document.body.appendChild(body);
    fstRender(); await warte(200);
    out.eAuto = { feld: document.getElementById("fst-spiel")?.value, text: (body.textContent.match(/Empfohlen:[^.]*\./) || [""])[0] };
    await fstPlanErstellen(); await warte(200);
    out.eAutoPlan = { spieldauer: _HT.config.spieldauer, runden: new Set((_HT.plan || []).map(p => p.runde)).size };
    _HT.config.spieldauerManuell = true; _HT.config.spieldauer = 10; _HT.plan = [];
    fstRender(); await warte(200);
    const knopf = [...body.querySelectorAll("button")].find(b => /Empfehlung übernehmen/.test(b.textContent));
    await fstPlanErstellen(); await warte(200);
    out.eHand = { spieldauer: _HT.config.spieldauer, knopf: knopf ? knopf.textContent.trim() : null };
    return out;
  });
  const f = s.fehler();
  await s.schliessen();
  if (r.fehlt) { probleme.push("fstSpielzeitOptimal/_fstPaarungen fehlen"); return h.ergebnis("v616 Festival-Paarungen und Spielzeit", false, probleme); }

  const spanne = je => Math.max(...je) - Math.min(...je);
  // a)
  if (r.a.intern) probleme.push(`a) ${r.a.intern} interne Duelle`);
  if (r.a.doppelt) probleme.push(`a) in ${r.a.doppelt} Runde(n) spielt ein Team zweimal`);
  if (spanne(r.a.je) > 1) probleme.push(`a) ungleich verteilt: ${r.a.je.join(",")}`);
  // b)
  if (r.a.opt.min < 7 || r.a.opt.min > 10) probleme.push(`b) Spielzeit ${r.a.opt.min} Min. außerhalb 7–10`);
  if (r.a.opt.min !== 8 || r.a.opt.rest !== 0 || r.a.runden !== 5) probleme.push(`b) erwartet 8 Min. × 5 Runden ohne Rest, ist ${r.a.opt.min} Min. × ${r.a.runden}, Rest ${r.a.opt.rest}`);
  // c)
  if (r.c.intern) probleme.push(`c) zwei Vereine: ${r.c.intern} interne Duelle`);
  if (r.c.runden !== r.c.opt.runden) probleme.push(`c) die Zeit wird nicht gefüllt: ${r.c.runden} von ${r.c.opt.runden} Runden`);
  // d)
  if (!r.d.spiele) probleme.push("d) ein einziger Verein: kein Plan");
  // e)
  if (r.eAuto.feld !== "8") probleme.push(`e) ohne Handeingabe steht ${r.eAuto.feld} statt 8 im Feld Spielzeit`);
  if (!/Empfohlen: 8 Min\./.test(r.eAuto.text)) probleme.push(`e) keine Empfehlung im Planer: „${r.eAuto.text}“`);
  if (r.eAutoPlan.spieldauer !== 8) probleme.push(`e) der Plan nutzt ${r.eAutoPlan.spieldauer} statt der errechneten 8 Min.`);
  if (r.eHand.spieldauer !== 10) probleme.push(`e) die Handeingabe 10 Min. wurde überstimmt (${r.eHand.spieldauer})`);
  if (!r.eHand.knopf) probleme.push("e) bei Handeingabe fehlt „Empfehlung übernehmen“");
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));

  zeilen.push(`a/b) 26.09.: ${r.a.opt.min} Min. × ${r.a.runden} Runden (Rest ${r.a.opt.rest}), ${r.a.spiele} Spiele, intern ${r.a.intern}, je Team ${r.a.je.join(",")}, letzte Runde ${r.a.letzte}`);
  zeilen.push(`c) zwei Vereine: ${r.c.runden} Runden, intern ${r.c.intern}, je Team ${r.c.je.join(",")} · d) ein Verein: ${r.d.spiele} Spiele`);
  zeilen.push(`e) automatisch ${r.eAuto.feld} Min. („${r.eAuto.text}“) · Hand: ${r.eHand.spieldauer} Min., Knopf „${r.eHand.knopf}“`);
  return h.ergebnis("v616 Festival: keine internen Duelle, Spielzeit 7–10 Min. errechnet", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
