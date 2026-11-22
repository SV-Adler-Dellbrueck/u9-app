/* v849 · Kachelseiten der Trainer-App (Charles 17.11.2026): Gruppen mit 3, 6 oder 9 Kacheln stehen
   dreispaltig, zwei und vier bleiben zweispaltig.
   a) Team, Orga und Eltern & Kinder passen bei 390 x 844 px über die untere Leiste (kein Scrollen).
   b) Jede Kachel ist mindestens 44 px hoch, keine Beschriftung läuft aus der Kachel –
      auch bei 360 px Breite und der größten Schrift.
   c) Eine Dreiergruppe lässt keine halbe Reihe leer. */
"use strict";
module.exports = async function (h) {
  const titel = "v849 Kachelseiten: Dreierreihen, wo die Gruppe aufgeht – ein Bildschirm, nichts läuft über";
  const probleme = [], zeilen = [];
  const messen = async (breite, hoehe, schrift) => {
    const s = await h.starten({ warten: 1800, breite, hoehe, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
    await h.sichtbarMachen(s.page, "#main-app");
    const r = await s.page.evaluate(async (schrift) => {
      const w = ms => new Promise(x => setTimeout(x, ms)), out = {};
      if (schrift) document.documentElement.dataset.schrift = schrift;
      for (const v of ["ue-team", "ue-orga", "ue-elki"]) {
        go(v); await w(350);
        const el = document.getElementById("view-" + v), nav = document.querySelector("nav,.bnav,#bnav,.bottom-nav");
        const sichtbar = [...el.querySelectorAll(".k-raster button")].filter(b => b.offsetParent && !b.closest("details:not([open])"));
        const klappen = [...el.querySelectorAll("details.k-klappe")].filter(d => d.offsetParent);
        const unten = Math.max(...sichtbar.concat(klappen).map(b => b.getBoundingClientRect().bottom));
        out[v] = {
          raster: [...el.querySelectorAll(".k-raster")].filter(g => !g.closest("details")).map(g => [g.children.length, getComputedStyle(g).gridTemplateColumns.split(" ").length]),
          unten: Math.round(unten), navOben: nav ? Math.round(nav.getBoundingClientRect().top) : null,
          minH: Math.min(...sichtbar.map(b => Math.round(b.getBoundingClientRect().height))),
          ueber: sichtbar.filter(b => b.scrollWidth > b.clientWidth + 1 || [...b.querySelectorAll("span")].some(x => x.getBoundingClientRect().right > b.getBoundingClientRect().right + 1)).map(b => b.textContent.trim())
        };
      }
      return out;
    }, schrift).catch(e => ({ fehler: String(e) }));
    const fe = s.fehler(); await s.schliessen();
    if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
    return r;
  };
  const gross = await messen(390, 844, ""), eng = await messen(360, 800, "sehrgross");
  if (gross.fehler || eng.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + (gross.fehler || eng.fehler)]);
  for (const [v, x] of Object.entries(gross)) {
    if (!x.raster.length) { probleme.push(`${v}: kein Kachelraster (.k-raster) gefunden – Stand vor v849?`); continue; }
    if (x.navOben == null) probleme.push(`${v}: untere Leiste nicht gefunden`);
    /* v937 (Charles 21.11.): Orga trägt oben „Neuer Termin“ und die Termin-Kacheln zum Wischen – die Seite ist damit länger als
       ein Bildschirm; das ist gewollt („Ebenso in Orga“). Team und Eltern & Kinder bleiben ein Bildschirm. */
    else if (v !== "ue-orga" && x.unten > x.navOben) probleme.push(`a) ${v}: reicht bis ${x.unten} px, die Leiste beginnt bei ${x.navOben} px`);
    const falsch = x.raster.filter(([n, sp]) => (n % 3 === 0 && n >= 3) !== (sp === 3));
    if (falsch.length) probleme.push(`c) ${v}: Raster ${JSON.stringify(x.raster)}`);
  }
  for (const [name, r] of [["390 px", gross], ["360 px, größte Schrift", eng]]) for (const [v, x] of Object.entries(r)) {
    if (x.minH < 44) probleme.push(`b) ${v} (${name}): Kachel nur ${x.minH} px hoch`);
    if (x.ueber && x.ueber.length) probleme.push(`b) ${v} (${name}): läuft über: ${x.ueber.join(", ")}`);
  }
  if (!probleme.length) zeilen.push("a) " + Object.entries(gross).map(([v, x]) => `${v} endet bei ${x.unten} px (Leiste ${x.navOben})`).join(" · "),
    "b) kleinste Kachel " + Math.min(...Object.values(gross).concat(Object.values(eng)).map(x => x.minH)) + " px, nichts läuft über · c) " + Object.entries(gross).map(([v, x]) => v + " " + x.raster.map(a => a.join("→")).join(" ")).join(" · "));
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
