/* v788 · Taktik: Seite in der Familienfarbe der Startkachel (Charles 04.11., Bildschirmfoto)
   a) Der KI-Kasten „Beschreib die Situation“ auf der Taktik-Seite hat den Rand der Taktik-Farbe (var(--fam-taktik)), nicht Lila
   b) Der Knopf „Zeichnen lassen“ trägt Rand und Schrift in Taktik-Orange, Schrift ≥ 4,5:1 gegen die Kachel – hell und dunkel
   c) Der Kasten im Fenster „Eigene Übung“ (Training) behält seinen lila Rand */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ breite: 390, hoehe: 844, warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [] }) });
  await h.sichtbarMachen(s.page, "#main-app");
  const messen = () => s.page.evaluate(() => {
    const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); };
    const kr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    const ki = document.querySelector("#sit-hub .tf-ki"), los = document.getElementById("sit-ki-los");
    const probe = document.createElement("div"); probe.style.color = "var(--fam-taktik)"; document.body.appendChild(probe);
    const fam = getComputedStyle(probe).color; probe.remove();
    const cs = el => getComputedStyle(el);
    return { rand: cs(ki).borderLeftColor, fam, losRand: cs(los).borderTopColor, losFarbe: cs(los).color, kontrast: kr(cs(los).color, cs(los).backgroundColor === "rgba(0, 0, 0, 0)" ? cs(ki).backgroundColor : cs(los).backgroundColor) };
  });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    go("taktik"); await w(800);
    for (let i = 0; i < 40 && !document.querySelector("#sit-hub .tf-ki"); i++) await w(50);
    return { da: !!document.querySelector("#sit-hub .tf-ki") };
  });
  if (!r.da) { await s.schliessen(); return h.ergebnis("Taktik: Seite in der Familienfarbe", false, ["KI-Kasten der Taktik-Seite nicht gefunden"]); }
  await s.page.evaluate(() => document.documentElement.setAttribute("data-theme", "light")); await s.page.waitForTimeout(250);
  const hell = await messen();
  await s.page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark")); await s.page.waitForTimeout(250);
  const dunkel = await messen();
  await s.page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
  const c = await s.page.evaluate(() => { const d = document.createElement("div"); d.className = "tf-ki"; document.body.appendChild(d); const col = getComputedStyle(d).borderLeftColor; const p = document.createElement("div"); p.style.color = "var(--purple)"; document.body.appendChild(p); const pc = getComputedStyle(p).color; d.remove(); p.remove(); return { col, pc }; });
  const fe = s.fehler(); await s.schliessen();
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  for (const [n, m] of [["hell", hell], ["dunkel", dunkel]]) {
    if (m.rand !== m.fam) probleme.push(`a) ${n}: Rand ${m.rand}, Taktik-Farbe ${m.fam}`);
    if (m.losRand !== m.fam) probleme.push(`b) ${n}: Knopfrand ${m.losRand}`);
    if (m.kontrast < 4.5) probleme.push(`b) ${n}: Schrift ${m.losFarbe} nur ${m.kontrast.toFixed(2)}:1`);
  }
  if (c.col !== c.pc) probleme.push(`c) Eigene Übung: Rand ${c.col}, erwartet lila ${c.pc}`);
  zeilen.push(`Rand ${hell.rand} = Taktik-Farbe · Knopfschrift hell ${hell.kontrast.toFixed(1)}:1, dunkel ${dunkel.kontrast.toFixed(1)}:1 · Eigene Übung lila`);
  return h.ergebnis("Taktik: Seite in der Familienfarbe der Startkachel (kein Lila)", !probleme.length, zeilen.concat(probleme));
};
