/* v671 · Trainerfamilien vom Grillhütten-Dienst befreit, Adler-Symbol in der Statusleiste
   PO 29.09.: „Bei den Grillhüttendiensten die Eltern rausnehmen, die selber Trainer sind.“ –
   „Ist es möglich, dass wenn eine Push-Benachrichtigung kommt, so wie bei WhatsApp das Icon oben in
   der Leiste des Handys erscheint … vielleicht das Adler-Dellbrück-Logo oder ein Adler-Symbol.“
   Android zeigt in der Statusleiste nur die Form des „badge“-Bildes (einfarbig). Das Wappen als
   Ganzes würde dort ein weißer Kreis; deshalb der Adler aus dem Wappen, weiß auf transparent.
   a) badge-adler.png: 96 × 96, nur Weiß und Transparenz, sichtbare Fläche zwischen 15 und 70 %
   b) sw.js zeigt Push mit diesem badge und hat es im Precache
   c) Grillhütten-Fenster: Abschnitt „Vom Dienst befreit“ zeigt befreite Familien; „Familie
      befreien“ schreibt dienst_befreit, „aufheben“ löscht; die Sicherung enthält die Tabelle
   d) Beifang aus dem Prüflauf: zwei schnelle Seitenwechsel, deren Überblendungen in vertauschter
      Reihenfolge ankommen, enden auf der zuletzt gewählten Seite (v553 schlug unter Last fehl)
   Die Reihenfolge der Einteilung (befreite nie) ist in der Datenbank gefahren. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const sw = fs.readFileSync(path.join(h.REPO, "sw.js"), "utf8");
  if (!/badge:"\.\/badge-adler\.png"/.test(sw)) probleme.push("b) Push nutzt nicht badge-adler.png");
  if (!/"\.\/badge-adler\.png"/.test(sw)) probleme.push("b) badge-adler.png fehlt im Precache");
  const views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  if (!/"dienst_befreit"/.test(views)) probleme.push("c) dienst_befreit fehlt in der Sicherung");

  const t = await h.starten({ warten: 1200, hoehe: 1200, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), team_config: [{ id: 1, dienst_plaetze: 2 }],
    termine: [{ id: 7, datum: h.tagePlus(60), uhrzeit: "10:15", gegner: "Kinderfestival", typ: "turnier", heim: true }],
    dienst_einteilung: [], dienst_sperre: [], profiles: [],
    dienst_befreit: [{ kind_id: 1, grund: "Trainerfamilie" }]
  }) });
  const r = await t.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    // a) das Bild selbst
    const img = new Image(); img.src = "/badge-adler.png"; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const g = c.getContext("2d"); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let bunt = 0, deckend = 0;
    for (let i = 0; i < d.length; i += 4) { if (d[i + 3] > 20) { deckend++; if (d[i] < 235 || d[i + 1] < 235 || d[i + 2] < 235) bunt++; } }
    const out = { a: { w: img.width, h: img.height, bunt, anteil: Math.round(100 * deckend / (c.width * c.height)) } };
    // c) Grillhütten-Fenster
    document.getElementById("pin-gate")?.remove();
    if (typeof grillTrainerOpen !== "function" || typeof grillBefreien !== "function") { out.fehlt = true; return out; }
    // d) Überblendungen vertauscht: erst sammeln, dann rückwärts ausführen
    const echt = document.startViewTransition; const wart = [];
    document.startViewTransition = cb => { wart.push(cb); return { finished: Promise.resolve(), ready: Promise.resolve(), updateCallbackDone: Promise.resolve() }; };
    openTab("elki"); openTab("orga");
    wart.reverse().forEach(cb => cb());
    document.startViewTransition = echt;
    out.d = [...document.querySelectorAll(".view.active")].map(v => v.id);
    await grillTrainerOpen(); await w(150);
    const box = document.getElementById("gh-befreit");
    out.c = { text: box ? box.textContent.replace(/\s+/g, " ") : "" };
    const sel = box && box.querySelector("select");
    if (sel) { sel.value = sel.options[2].value; sel.dispatchEvent(new Event("change")); }
    await w(150);
    const weg = [...document.querySelectorAll("#gh-befreit button")].find(b => /aufheben/.test(b.textContent));
    if (weg) weg.click(); await w(150);
    return out;
  });
  const tg = t.gesendet.filter(x => /dienst_befreit/.test(x.pfad)).map(x => x.methode + " " + x.pfad.split("/").pop() + (x.suche || "") + " " + JSON.stringify(x.body));
  const f = t.fehler(); await t.schliessen();
  if (r.a.w !== 96 || r.a.h !== 96) probleme.push(`a) Größe ${r.a.w}×${r.a.h}`);
  if (r.a.bunt) probleme.push(`a) ${r.a.bunt} farbige Pixel – Android zeigt nur die Form`);
  if (r.a.anteil < 15 || r.a.anteil > 70) probleme.push(`a) sichtbare Fläche ${r.a.anteil} %`);
  if (r.fehlt) probleme.push("c) grillTrainerOpen/grillBefreien fehlt");
  else {
    if (!/Vom Dienst befreit/.test(r.c.text) || !/Kind As Familie/.test(r.c.text)) probleme.push(`c) Abschnitt: ${r.c.text.slice(0, 140)}`);
    if (!tg.some(x => /^POST dienst_befreit .*"kind_id":\d+.*"grillhuette"/.test(x))) probleme.push(`c) Befreien nicht geschrieben: ${JSON.stringify(tg)}`);
    if (!tg.some(x => /^DELETE dienst_befreit\?kind_id=eq\.1&dienst=eq\.grillhuette/.test(x))) probleme.push(`c) Aufheben löscht nicht: ${JSON.stringify(tg)}`);
  }
  if (String(r.d) !== "view-ue-orga") probleme.push(`d) Nach elki → orga mit vertauschten Überblendungen: ${JSON.stringify(r.d)}`);
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  zeilen.push(`a) badge-adler.png 96×96, nur Weiß, ${r.a.anteil} % Fläche · b) Push und Precache`);
  zeilen.push(`c) ${tg.join(" · ")}`);
  zeilen.push(`d) vertauschte Überblendungen → ${r.d}`);
  return h.ergebnis("Trainerfamilien befreit, Adler in der Statusleiste", !probleme.length, probleme.length ? probleme : zeilen);
};
