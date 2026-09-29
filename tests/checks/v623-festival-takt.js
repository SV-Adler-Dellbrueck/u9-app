/* v623 · PO: „In den Festival-Link noch aufnehmen, wie lange die Spielzeiten sind und dass wir
   zwischen jedem Spiel 5 Minuten Trinkpause und Wechselfenster einplanen."

   a) Die Gast-Seite nennt über den Runden Rundenzahl, Spielzeit, Beginn und Ende und die
      Trinkpause mit Wechselfenster – errechnet aus Plan und Einstellung.
   b) Eine andere Spielzeit (10 Min.) steht sofort richtig da – kein fester Text.
   c) Ohne Plan keine Zeile. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [] }), hoehe: 1400 });
  const r = await s.page.evaluate(() => {
    if (typeof fstTaktZeile !== "function") return { fehlt: true };
    const vereine = [{ name: "SV Adler Dellbrück", kinder: 10, teams: 2 }, { name: "SV Auweiler-Esch", kinder: 10, teams: 2 }, { name: "VfB 05 Köln", kinder: 10, teams: 1 }];
    const teams = fstTeamsBauen(vereine);
    const lauf = spiel => {
      const cfg = { art: "festival", start: "10:15", dauer: 60, spieldauer: spiel, wechsel: 5, felder: FST_STANDARD_FELDER };
      const plan = fstPlanBauen(teams, cfg);
      const wrap = document.createElement("div"); document.body.appendChild(wrap);
      _fstPublicRender(wrap, { name: "Kinderfestival", datum: "2026-09-26", teams: teams.map(t => t.name), plan, config: cfg });
      const z = wrap.querySelector("#fst-takt");
      const runden = new Set(plan.map(p => p.runde)).size;
      const starts = plan.map(p => p.zeit).sort();
      const out = { text: z ? z.textContent.replace(/\s+/g, " ").trim() : "", runden, erste: starts[0], letzte: starts[starts.length - 1],
        vorRunde: !!(z && wrap.innerHTML.indexOf('id="fst-takt"') < wrap.innerHTML.indexOf("Runde 1")) };
      wrap.remove(); return out;
    };
    const leer = document.createElement("div");
    _fstPublicRender(leer, { name: "x", teams: [], plan: [], config: { art: "festival" } });
    return { acht: lauf(8), zehn: lauf(10), leer: !!leer.querySelector("#fst-takt") };
  });
  const fe = s.fehler();
  await s.schliessen();
  if (r.fehlt) probleme.push("fstTaktZeile fehlt");
  else {
    const plus = (hhmm, m) => { const [a, b] = hhmm.split(":").map(Number), t = a * 60 + b + m; return String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0"); };
    for (const [k, min] of [["acht", 8], ["zehn", 10]]) {
      const x = r[k];
      if (!new RegExp(`${x.runden} Runden à ${min} Minuten`).test(x.text)) probleme.push(`${k === "acht" ? "a" : "b"}) Runden/Spielzeit fehlen: „${x.text}“`);
      if (!x.text.includes(`von ${x.erste} bis ${plus(x.letzte, min)} Uhr`)) probleme.push(`${k === "acht" ? "a" : "b"}) Beginn/Ende falsch: „${x.text}“`);
      if (!/5 Minuten Trinkpause und Wechselfenster/.test(x.text)) probleme.push(`a) Trinkpause/Wechselfenster fehlt: „${x.text}“`);
      if (!x.vorRunde) probleme.push("a) Die Zeile steht nicht über den Runden");
    }
    if (r.leer) probleme.push("c) Zeile ohne Plan");
    zeilen.push(r.acht.text);
  }
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v623 Festival-Link nennt Spielzeit und Trinkpause", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
