/* v784 · Wärme in der Trainer-App (Charles 04.11.: „Alles außer die offenen Punkte umsetzen“)
   a) Hell: Kopf der Trainer-App ist ein blaues Band (Schrift weiß, ≥ 4,5:1), Seitengrund zart getönt
   b) Dunkel: Kopf und Grund bleiben wie zuvor (kein blaues Band, Schrift hell auf dunklem Grund)
   c) Die vier Kopfknöpfe bleiben im Bild, der Kopf läuft am Handy nicht über */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const termine = [{ id: 1, datum: h.tagePlus(1), uhrzeit: "16:45", uhrzeit_ende: "18:00", typ: "training", titel: "Training", platz: "vorne links", trainer_status: {} }];
  const s = await h.starten({ breite: 390, hoehe: 844, warten: 1500, angemeldet: true, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, anwesenheit: [] }) });
  await h.sichtbarMachen(s.page, "#main-app");
  const messen = () => s.page.evaluate(() => {
    const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); };
    const kr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    const tb = document.querySelector("#main-app > .topbar"), t1 = tb.querySelector(".logo-t1"), t2 = tb.querySelector(".logo-t2");
    const bg = getComputedStyle(tb).backgroundColor, cs = getComputedStyle;
    const r = tb.getBoundingClientRect();
    return { bg, t1: cs(t1).color, t2: cs(t2).color, k1: kr(cs(t1).color, bg), k2: kr(cs(t2).color, bg), body: cs(document.body).backgroundColor, knoepfe: [...tb.querySelectorAll("button")].filter(b => b.getBoundingClientRect().width > 0).length, passt: document.documentElement.scrollWidth <= innerWidth + 1, rechts: Math.round(r.right) };
  });
  await s.page.evaluate(() => { document.documentElement.setAttribute("data-theme", "light"); });
  await s.page.waitForTimeout(300);
  const hell = await messen();
  await s.page.evaluate(() => { document.documentElement.setAttribute("data-theme", "dark"); });
  await s.page.waitForTimeout(300);
  const dunkel = await messen();
  const f = s.fehler(); await s.schliessen();
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  if (hell.bg !== "rgb(26, 86, 219)" || hell.k1 < 4.5 || hell.k2 < 4.5) probleme.push("a) Kopf hell: " + JSON.stringify(hell));
  if (hell.body !== "rgb(238, 244, 252)") probleme.push("a) Grund hell: " + hell.body);
  if (dunkel.bg === "rgb(26, 86, 219)" || dunkel.k1 < 4.5 || dunkel.k2 < 4.5) probleme.push("b) Kopf dunkel: " + JSON.stringify(dunkel));
  if (dunkel.body === "rgb(238, 244, 252)") probleme.push("b) Grund dunkel blieb hell");
  /* seit v819 zwei sichtbare Knöpfe (Team-Chat und „⋯“), vorher vier */
  if (hell.knoepfe < 2 || !hell.passt || hell.rechts > 390) probleme.push("c) Kopf: " + JSON.stringify(hell));
  zeilen.push(`hell: Band ${hell.bg}, Schrift ${hell.k1.toFixed(1)}:1 / ${hell.k2.toFixed(1)}:1, Grund ${hell.body} · dunkel: Band ${dunkel.bg}, ${dunkel.k1.toFixed(1)}:1`);
  return h.ergebnis("Trainer-App: blaues Kopfband und getönter Grund hell, dunkel unverändert", !probleme.length, zeilen.concat(probleme));
};
