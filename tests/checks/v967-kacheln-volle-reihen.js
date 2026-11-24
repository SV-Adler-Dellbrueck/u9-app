/* v967 · Charles 24.11.: „Die unteren beiden Kacheln gehen auch nebeneinander. Prüfe das nochmal in der gesamten App, ob wir den
   Platz besser nutzen können.“
   a) kTiles mit 1 bis 9 Kacheln: jede Reihe ist ganz gefüllt (keine Kachel neben einer Lücke), Kacheln einer Reihe gleich breit,
      jede ≥ 44 px hoch; 3/6/9 bleiben dreispaltig, 2/4 zweispaltig (v849).
   b) Spieltag: „Analyse“ und – vor einem Heimspiel – „Festival ausrichten“ stehen in einer Reihe; auswärts nur „Analyse“ (als Zeile). */
"use strict";
module.exports = async function (h) {
  const titel = "v967 Kachelreihen ohne Lücke: ungerade Gruppen füllen jede Reihe, Spieltag mit Analyse und Festival nebeneinander";
  const probleme = [], zeilen = [];
  const lauf = async heim => {
    const s = await h.starten({ warten: 1800, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: heim ? [{ id: 9, typ: "turnier", heim: true, datum: h.tagePlus(3), titel: "Festival" }] : [] }) });
    await h.sichtbarMachen(s.page, "#main-app");
    const r = await s.page.evaluate(async heim => {
      const w = ms => new Promise(x => setTimeout(x, ms)), out = {};
      if (heim) {
        const box = document.createElement("div"); box.style.cssText = "width:358px;position:absolute;left:16px;top:0;z-index:99999;background:#fff"; document.body.appendChild(box);
        out.a = [];
        for (let n = 1; n <= 9; n++) {
          box.innerHTML = kTiles(Array.from({ length: n }, (_, i) => ({ emo: "📊", label: "Kachel " + (i + 1), fn: "x" })), "#1d4ed8"); await w(30);
          const g = box.querySelector(".k-raster"), gb = g.getBoundingClientRect(), rows = {};
          [...g.children].forEach(c => { const b = c.getBoundingClientRect(); (rows[Math.round(b.top)] = rows[Math.round(b.top)] || []).push(b); });
          const reihen = Object.values(rows);
          out.a.push({ n, spalten: getComputedStyle(g).gridTemplateColumns.split(" ").length, reihen: reihen.map(r => r.length),
            voll: reihen.every(r => r.reduce((a, b) => a + b.width, 0) >= gb.width * 0.9), gleich: reihen.every(r => Math.max(...r.map(b => b.width)) - Math.min(...r.map(b => b.width)) < 2),
            minH: Math.min(...reihen.flat().map(b => b.height)) });
        }
        box.remove();
      }
      go("ue-spieltag"); await w(400); await _kachelTurnierCheck(); await w(80);
      const k = [...document.querySelectorAll("#kachel-turnier .k-raster > button")];
      out.b = { labels: k.map(b => b.textContent.replace(/\s+/g, " ").trim()), tops: k.map(b => Math.round(b.getBoundingClientRect().top)), text: (document.getElementById("kachel-turnier") || {}).textContent || "" };
      return out;
    }, heim).catch(e => ({ fehler: String(e) }));
    await s.schliessen(); return r;
  };
  const mit = await lauf(true), ohne = await lauf(false);
  if (mit.fehler || ohne.fehler) return h.ergebnis(titel, false, ["Ablauf: " + (mit.fehler || ohne.fehler)]);
  for (const x of mit.a) {
    if (!x.voll || !x.gleich || x.minH < 44) probleme.push(`a) ${x.n} Kacheln: Reihen ${x.reihen.join("+")}, voll ${x.voll}, gleich ${x.gleich}, ${Math.round(x.minH)} px`);
    if (x.n % 3 === 0 && x.spalten !== 3) probleme.push(`a) ${x.n} Kacheln nicht dreispaltig`);
    if ((x.n === 2 || x.n === 4) && x.spalten !== 2) probleme.push(`a) ${x.n} Kacheln nicht zweispaltig`);
  }
  if (mit.b.labels.length !== 2 || !/Analyse/.test(mit.b.labels[0]) || !/Festival ausrichten/.test(mit.b.labels[1]) || mit.b.tops[0] !== mit.b.tops[1]) probleme.push("b) Heimspiel: " + JSON.stringify(mit.b));
  if (ohne.b.labels.length !== 1 || /Spieltag bei uns|Festival/.test(ohne.b.text)) probleme.push("b) auswärts: " + JSON.stringify(ohne.b));
  zeilen.push("a) " + mit.a.map(x => `${x.n}→${x.reihen.join("+")}`).join(" · ") + " · b) Heimspiel: Analyse | Festival in einer Reihe, auswärts nur Analyse");
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
