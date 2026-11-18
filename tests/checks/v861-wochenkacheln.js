/* v861 · Eltern „Diese Woche“: Tage mit Termin sind auch auf 360 px mindestens 44 px breit (Bestandsaufnahme 3.13).
   Vorher war jede der sieben Kacheln 39 px breit. Leere Tage dürfen schmal sein; die Legende bricht nicht im Eintrag um.
   d) 3.14: Im Dunkelmodus erreicht ein heller Kartenrand (#cbd5e1) nach der Einfärbung ≥ 3:1 auf der Kartenfläche. */
"use strict";
module.exports = async function (h) {
  const titel = "v861 Eltern: Wochenkacheln mit Termin ≥ 44 px auf 360 px";
  const probleme = [], zeilen = [];
  const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 2500, breite: 360, hoehe: 800,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await s.page.evaluate(() => {
    if (typeof elternWochenleisteHtml !== "function") return { fehlt: true };
    const iso = n => { const d = new Date(Date.now() + n * 864e5); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
    const T = (id, n) => ({ id, datum: iso(n), typ: "training", titel: "", trainer_status: {} });
    const kids = [{ spieler_id: 3, kader: { name: "Kind C" } }];
    const box = document.createElement("div"); box.style.cssText = "width:328px;position:absolute;left:0;top:0";
    box.innerHTML = elternWochenleisteHtml([T(1, 1), T(2, 3), T(3, 5), T(4, 6), T(5, 0)], kids, {});
    document.body.appendChild(box);
    const knoepfe = [...box.querySelectorAll("#eltern-woche button")].map(b => Math.round(b.getBoundingClientRect().width));
    const leer = [...box.querySelectorAll("#eltern-woche > div:nth-of-type(2) > div")].map(d => Math.round(d.getBoundingClientRect().width));
    const legende = [...box.querySelectorAll("#eltern-woche span")].filter(x => x.style.whiteSpace === "nowrap").map(x => x.textContent);
    box.remove();
    let rand = null;
    if (typeof _elSweepOne === "function") {
      document.documentElement.setAttribute("data-theme", "dark");
      const x = document.createElement("div"); x.style.border = "1px solid #cbd5e1"; _elSweepOne(x);
      const m = (x.style.borderTopColor.match(/\d+/g) || []).map(Number);
      const L = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
      rand = m.length === 3 ? +(((L(m) + .05) / (L([41, 47, 61]) + .05)).toFixed(2)) : 0;
      document.documentElement.removeAttribute("data-theme");
    }
    return { knoepfe, leer, legende, rand };
  });
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) return h.ergebnis(titel, false, ["elternWochenleisteHtml fehlt"]);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  if (r.knoepfe.length !== 5 || r.knoepfe.some(w => w < 44)) probleme.push("a) Kacheln mit Termin: " + JSON.stringify(r.knoepfe));
  if (!r.leer.length || r.leer.some(w => w >= Math.min(...r.knoepfe))) probleme.push("b) leere Tage nicht schmaler: " + JSON.stringify(r.leer));
  if (r.legende.length !== 4 || !r.legende.includes("– fällt aus")) probleme.push("c) Legende: " + JSON.stringify(r.legende));
  if (r.rand === null || r.rand < 3) probleme.push("d) Kartenrand im Dunkelmodus: " + r.rand + ":1");
  zeilen.push(`Kartenrand dunkel ${r.rand}:1`);
  zeilen.push(`Kacheln mit Termin ${r.knoepfe.join("/")} px, leere Tage ${r.leer.join("/")} px (Box 328 px = 360 px Bildschirm)`);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
