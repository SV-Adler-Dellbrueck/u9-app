/* v923 · Charles 21.11.: „Bei der Planung von Festivals und Turnieren wäre es noch schön, wenn es so weit ausgeglichen
   ist, dass jede Mannschaft auch gleich häufig auf den verschiedenen Plätzen spielt.“ Am Festival 21.11. (4 Teams,
   Käfig 3+1 und FUNiño, 5 Runden) stand ein Team 4× auf Feld 1 und 1× auf Feld 2, ein anderes umgekehrt.
   a) Festival: in typischen Größen spielt jede Mannschaft auf jedem Feld gleich oft, höchstens 1 Unterschied.
      Ausnahme 8 Teams auf 4 Feldern in 7 Runden: dort geht 1 mit diesen Paarungen nachweislich nicht auf – höchstens 2.
   b) Paarungen, Runden und Uhrzeiten bleiben; je Runde kein Feld doppelt; die Spielform folgt dem Feld.
   c) Heimturnier (jeder gegen jeden, Gruppen): höchstens 1 Unterschied, nie zwei Spiele zur selben Zeit auf einem Feld,
      das Finale bleibt auf Feld 1.
   d) Derselbe Aufruf ergibt denselben Plan (fester Zufall). */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
module.exports = async function (h) {
  const titel = "v923 Festival und Heimturnier: jede Mannschaft gleich oft auf jedem Feld";
  const probleme = [], zeilen = [];
  const leer = () => new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => "" : leer(), apply: () => leer() });
  const ctx = { console: { log() {}, warn() {}, error() {} }, addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }), document: leer(),
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, navigator: {}, location: { search: "", href: "", pathname: "/" }, URLSearchParams,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {} };
  ctx.window = ctx; vm.createContext(ctx);
  try { vm.runInContext(fs.readFileSync(path.join(h.REPO, "core.js"), "utf8"), ctx); } catch (e) { /* DOM-Teile fehlen hier – die Planer brauchen sie nicht */ }
  vm.runInContext(fs.readFileSync(path.join(h.REPO, "md-turnierplan.js"), "utf8"), ctx);
  const fstPlanBauen = vm.runInContext("fstPlanBauen", ctx), htGen = vm.runInContext("_htGen", ctx);
  const spreizung = (plan, F) => { const z = {}; plan.forEach(p => { if (typeof p.a !== "number") return; [p.a, p.b].forEach(t => { (z[t] = z[t] || Array(F + 1).fill(0))[p.feld]++; }); });
    return Math.max(...Object.values(z).map(c => Math.max(...c.slice(1)) - Math.min(...c.slice(1)))); };
  const doppelt = (plan, key) => { const s = {}; return plan.some(p => { const k = key(p) + "|" + p.feld; if (s[k]) return true; s[k] = 1; return false; }); };
  /* a) + b) Festival */
  const faelle = [[4, ["f3", "funino"], 5, 1], [4, ["f3", "funino"], 6, 1], [5, ["f4", "funino"], 6, 1], [6, ["f4", "funino", "funino"], 6, 1],
    [6, ["f3", "funino"], 7, 1], [7, ["f4", "funino", "funino"], 8, 1], [12, ["f4", "f4", "funino", "funino"], 10, 1], [8, ["f4", "f4", "funino", "funino"], 7, 2]];
  /* v984 (Charles 27.11.): Bleiben Felder frei, ist das Jugendtor-Feld in jeder Runde belegt. 3 Teams auf Käfig + FUNiño
     (ein Spiel je Runde) spielen deshalb immer im Käfig – der frühere Fall „3/2 gleich oft“ gilt nicht mehr. */
  { const teams = Array.from({ length: 3 }, (_, i) => ({ name: "T" + i, verein: "V" + i }));
    const plan = fstPlanBauen(teams, { felder: [{ form: "f3" }, { form: "funino" }], spieldauer: 8, wechsel: 2, dauer: 58, start: "10:00" });
    if (!plan.length || !plan.every(p => p.feld === 1)) probleme.push("a) 3 Teams auf Käfig + FUNiño: nicht jedes Spiel im Käfig – " + plan.map(p => p.feld).join(","));
    else zeilen.push(`a) 3 Teams, ein Spiel je Runde: alle ${plan.length} Spiele im Käfig (v984)`); }
  const ergebnis = [];
  for (const [n, ff, runden, soll] of faelle) {
    const teams = Array.from({ length: n }, (_, i) => ({ name: "T" + i, verein: "V" + i }));
    const cfg = { felder: ff.map(form => ({ form })), spieldauer: 8, wechsel: 2, dauer: runden * 10 - 2, start: "10:00" };
    const plan = fstPlanBauen(teams, cfg), F = ff.length, sp = spreizung(plan, F);
    ergebnis.push(`${n}/${F}: ${sp}`);
    if (sp > soll) probleme.push(`a) ${n} Teams auf ${F} Feldern, ${runden} Runden: Unterschied ${sp} (erlaubt ${soll})`);
    if (doppelt(plan, p => p.runde)) probleme.push(`b) ${n}/${F}: ein Feld in einer Runde doppelt`);
    if (!plan.every(p => p.form === ff[p.feld - 1])) probleme.push(`b) ${n}/${F}: Spielform passt nicht zum Feld`);
    const nochmal = fstPlanBauen(teams, cfg);
    if (JSON.stringify(nochmal) !== JSON.stringify(plan)) probleme.push(`d) ${n}/${F}: zweiter Aufruf ergibt einen anderen Plan`);
  }
  /* b) Paarungen und Zeiten wie ohne Ausgleich: die Spiele je Runde sind dieselben Paare, nur auf anderen Feldern */
  { const teams = Array.from({ length: 4 }, (_, i) => ({ name: "T" + i, verein: "V" + i }));
    const plan = fstPlanBauen(teams, { felder: [{ form: "f3" }, { form: "funino" }], spieldauer: 8, wechsel: 2, dauer: 48, start: "10:15" });
    const zeiten = [...new Set(plan.map(p => p.zeit))];
    if (zeiten.join(",") !== "10:15,10:25,10:35,10:45,10:55") probleme.push("b) Uhrzeiten verschoben: " + zeiten.join(","));
    const z = {}; plan.forEach(p => [p.a, p.b].forEach(t => { (z[t] = z[t] || [0, 0, 0])[p.feld]++; }));
    zeilen.push("Festival wie am 21.11. (4 Teams, 2 Felder, 5 Runden): " + Object.values(z).map(c => c[1] + ":" + c[2]).join(" · ")); }
  /* c) Heimturnier */
  const ht = [];
  for (const [n, F, format] of [[5, 2, "jeder"], [6, 3, "jeder"], [6, 2, "jeder"], [8, 2, "gruppen"]]) {
    const plan = htGen(Array.from({ length: n }, (_, i) => "T" + i), { format, felder: F, gruppen: 2, spieldauer: 10, start: "10:00" });
    const sp = spreizung(plan, F); ht.push(`${n}/${F} ${format}: ${sp}`);
    if (sp > 1) probleme.push(`c) Heimturnier ${n} Teams, ${F} Felder, ${format}: Unterschied ${sp}`);
    if (doppelt(plan, p => p.zeit)) probleme.push(`c) Heimturnier ${n}/${F}: zwei Spiele zur selben Zeit auf einem Feld`);
    if (plan.some(p => p.phase === "Finale" && p.feld !== 1)) probleme.push(`c) Heimturnier ${n}/${F}: Finale nicht auf Feld 1`);
  }
  zeilen.push("a) größter Unterschied je Festival (Teams/Felder: Spiele): " + ergebnis.join(" · ") + " · c) Heimturnier: " + ht.join(" · ") + " · d) gleich bei zweitem Aufruf");
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
