/* v984 · Charles 27.11.2026: „wenn es mehrere Felder gibt zb 3, dann den Käfig immer priorisiert in die Planung aufnehmen als 3+1 oder
   falls 4+1 gespielt wird. Also bei 4 aktiven Mannschaften nicht beide auf einem funino Feld sondern einmal Käfig und einmal Funino.
   Es sei denn, es wird nur funino gespielt, dann fällt der Käfig eh raus.“ (Plan vom 28.11.: Runde 1 und 2 auf FUNiño 2 und 3, Käfig leer.)
   a) Festival-Ablauf (fstPlanBauen), Käfig 3+1 + 2 FUNiño: bei 4 und 5 Teams (2 Spiele je Runde) ist der Käfig in JEDER Runde belegt;
      ebenso mit 4+1 im Käfig
   b) nur FUNiño-Felder: keine Vorgabe – alle Felder kommen dran (wie bisher)
   c) Festival-Planer: Jugendtor-Feld zuerst, auch wenn es nicht Feld 1 ist (4 Teams, Felder FUNiño, FUNiño, Jugendtore → Feld 3 plus ein FUNiño, nicht 1 und 2);
      nur Minitore: Felder 1 und 2
   d) volle Belegung (so viele Spiele wie Felder) bleibt unverändert: jedes Team einmal im Käfig (v516) */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const pruef = (bed, ok, nein) => bed ? zeilen.push(ok) : probleme.push(nein);
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 60 && (typeof fstPlanBauen !== "function" || typeof planFestival !== "function"); i++) await w(100);
    const F = (...x) => x.map(form => ({ form }));
    const teams = n => Array.from({ length: n }, (_, i) => ({ name: "Team " + (i + 1), verein: "V" + (i % 3), kinder: 5 }));
    const runden = (plan) => { const m = {}; plan.forEach(p => { (m[p.runde] = m[p.runde] || []).push(p.feld); }); return Object.values(m).map(l => l.sort().join("+")); };
    const cfg = felder => ({ start: "10:15", dauer: 60, spieldauer: 8, wechsel: 5, felder });
    const o = {};
    o.a4 = runden(fstPlanBauen(teams(4), cfg(F("f3", "funino", "funino"))));
    o.a5 = runden(fstPlanBauen(teams(5), cfg(F("f3", "funino", "funino"))));
    o.a41 = runden(fstPlanBauen(teams(4), cfg(F("f4", "funino", "funino"))));
    o.b = runden(fstPlanBauen(teams(4), cfg(F("funino", "funino", "funino"))));
    const p6 = fstPlanBauen(teams(6), cfg(F("f3", "funino", "funino")));
    const imKaefig = new Set(); p6.filter(p => p.feld === 1).forEach(p => { imKaefig.add(p.a); imKaefig.add(p.b); });
    o.d = { runden: runden(p6), imKaefig: imKaefig.size };
    const V = [{ name: "A", kinder: 8 }, { name: "B", kinder: 8 }];
    o.c1 = planFestival({ vereine: V, felder: [{ tor: "mini" }, { tor: "mini" }, { tor: "jugend" }] }, "gross").genutzteFelder;
    o.c2 = planFestival({ vereine: V, felder: [{ tor: "mini" }, { tor: "mini" }, { tor: "mini" }] }, "gross").genutzteFelder;
    const pc = planFestival({ vereine: V, felder: [{ tor: "mini" }, { tor: "mini" }, { tor: "jugend" }] }, "gross");
    o.c3 = pc.runden.every(r => r.spiele.some(g => g.feld === 3));
    return o;
  });
  const fe = s.fehler(); await s.schliessen();
  const immer1 = l => l.length > 0 && l.every(x => x.split("+").includes("1"));
  pruef(immer1(r.a4) && immer1(r.a5) && immer1(r.a41), `a) Käfig in jeder Runde belegt (4 Teams: ${r.a4.join(" · ")}; 5 Teams: ${r.a5.join(" · ")}; 4+1 ebenso)`, "a) " + JSON.stringify({ a4: r.a4, a5: r.a5, a41: r.a41 }));
  const alle = new Set(r.b.flatMap(x => x.split("+")));
  pruef(alle.size === 3, `b) nur FUNiño: alle drei Felder kommen dran (${r.b.join(" · ")})`, "b) " + JSON.stringify(r.b));
  pruef(r.c1.length === 2 && r.c1.includes(3) && r.c3 && r.c2.join() === "1,2", "c) Planer: Jugendtor-Feld zuerst (Käfig auf Feld 3 plus ein FUNiño-Feld, Feld 3 in jeder Runde), nur Minitore: 1 und 2", "c) " + JSON.stringify({ c1: r.c1, c2: r.c2, c3: r.c3 }));
  pruef(r.d.runden.every(x => x === "1+2+3") && r.d.imKaefig === 6, "d) volle Belegung unverändert: jedes der 6 Teams einmal im Käfig", "d) " + JSON.stringify(r.d));
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v984 Käfig zuerst, wenn Felder frei bleiben (Festival-Ablauf und Planer)", !probleme.length, zeilen.concat(probleme));
};
