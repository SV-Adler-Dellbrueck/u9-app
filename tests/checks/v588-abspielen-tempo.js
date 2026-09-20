/* v588 – Bild 5 und 6, und das Abspielen ist langsamer.

   Charles am 20.09., nach v587: „Bild 5 und 6 dazu, Abspielen langsamer." Zwei Befunde
   aus derselben Sitzung am Handy:

   1. Mit vier Bildern endete das Abspielen der Lehrgangsübung, sobald FR am Korridorende
      stand – der flache Pass zum Jäger und der Abschluss waren nur Pfeile. Jetzt folgen
      Bild 5 (Ball beim Jäger, Schuss) und Bild 6 (Ball im Tor, keine Wege mehr).
   2. Jedes Bild stand 600 ms und glitt in 800 ms zum nächsten, egal wie weit. Am Handy war
      die Nummer eines Pfeils kaum gelesen, da lief der nächste Übergang. Jetzt: eine Sekunde
      Stand, und die Gleitzeit hängt an der weitesten Strecke des Übergangs (1,2 s bis 2,2 s).

   Geprüft wird:
   a) Die Lehrgangsübung hat sechs Bilder; 4→5 bewegt Spieler und Ball, 5→6 nur den Ball,
      und der landet im Tor (oberhalb der Torlinie bei y 24); Bild 6 hat keine Wege.
   b) `_skzGleitDauer`: kurze Strecke → Mindestzeit 1,2 s, mittlere → dazwischen, lange →
      Höchstzeit 2,2 s; Standzeit mindestens eine Sekunde; harter Schnitt mindestens 1,8 s.
   c) Am DOM: Das Abspielen der Lehrgangsübung lässt Bild 1 mindestens 0,9 s stehen, und
      der erste Übergang (Ball 84 Punkte) dauert mindestens 1,4 s – gemessen am Ball im
      großen Fenster, nicht behauptet. */
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const NAME = "Raute mit Torwart – Angriff über den anderen Flügel";
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const u = bib.uebungen.find(x => x.name === NAME);
  if (!u) return h.ergebnis("Abspielen: Bild 5 und 6, langsamer", false, ["Die Übung steht nicht in der Bibliothek"]);

  const s = await h.starten({ hoehe: 1400, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), trainingsformen: [Object.assign({ id: 9010, custom: true, tags: "Import" }, u)] }) });
  await h.sichtbarMachen(s.page, "#view-formen");
  const r = await s.page.evaluate(async ({ NAME }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = { fehlt: ["skzBildZahl", "_skzBild", "_skzGleitDauer", "skzGrossOpen", "skzGrossAbspielen"].filter(n => typeof window[n] !== "function") };
    if (out.fehlt.length) return out;
    await loadCustomForms();
    const idx = tpAllForms().findIndex(f => f.name === NAME);
    const spec = tpAllForms()[idx].skizze;
    // a) sechs Bilder
    const n = skzBildZahl(spec); out.n = n;
    const weit = (a, b) => (a || []).reduce((m, e, i) => { const z = (b || [])[i]; return z ? Math.max(m, Math.hypot(e[0] - z[0], e[1] - z[1])) : m; }, 0);
    /* v589: die letzten drei Bilder – Pass in die Mitte, Abschluss, Tor –, gleich wie viele davor liegen. */
    const b4 = _skzBild(spec, n - 3), b5 = _skzBild(spec, n - 2), b6 = _skzBild(spec, n - 1);
    out.a = { sp45: Math.round(weit(b4.s, b5.s)), ball45: Math.round(weit(b4.b, b5.b)), sp56: Math.round(weit(b5.s, b6.s)), ball56: Math.round(weit(b5.b, b6.b)),
              ballY6: (b6.b || [[0, 0]])[0][1], wege6: (b6.p || []).length, wege5: (b5.p || []).length, text5: ((b5.tx || [])[0] || [])[2] || "", text6: ((b6.tx || [])[0] || [])[2] || "" };
    // b) Zeiten
    const st = (d) => ({ s: [[0, 0, "g"]], b: [[0, d]] });
    out.b = { kurz: _skzGleitDauer(st(0), st(16)), mittel: _skzGleitDauer(st(0), st(84)), lang: _skzGleitDauer(st(0), st(200)), stand: SKZ_STAND, schnitt: SKZ_SCHNITT };
    // c) am DOM: Ball im großen Fenster verfolgen
    skzGrossOpen(idx); await warte(200);
    const halter = document.getElementById("skz-gross-halter");
    const ball = () => { const c = halter && halter.querySelector('circle[r="4"]'); return c ? [Number(c.getAttribute("cx")), Number(c.getAttribute("cy"))] : null; };
    const start = ball();
    const t0 = performance.now();
    skzGrossAbspielen();
    let erstBewegt = null, zuletztBewegt = null, vorher = start;
    while (performance.now() - t0 < 4500) {
      await warte(40);
      const jetzt = ball();
      if (jetzt && vorher && (Math.abs(jetzt[0] - vorher[0]) > 0.05 || Math.abs(jetzt[1] - vorher[1]) > 0.05)) {
        if (erstBewegt == null) erstBewegt = performance.now() - t0;
        zuletztBewegt = performance.now() - t0;
      }
      vorher = jetzt;
      if (erstBewegt != null && zuletztBewegt != null && performance.now() - t0 - zuletztBewegt > 600) break;   // erste Bewegung vorbei
    }
    skzGrossStopp();
    out.c = { start, erstBewegt: erstBewegt == null ? null : Math.round(erstBewegt), dauer: (erstBewegt == null || zuletztBewegt == null) ? null : Math.round(zuletztBewegt - erstBewegt) };
    return out;
  }, { NAME });
  const fehler = s.fehler();
  await s.schliessen();
  if (r.fehlt.length) return h.ergebnis("Abspielen: Bild 5 und 6, langsamer", false, [r.fehlt.join(", ") + " fehlt"]);

  // a)
  if (r.n < 6) probleme.push(`${r.n} Bilder – Abschluss und Tor fehlen`);
  if (r.a.sp45 < 20 || r.a.ball45 < 20) probleme.push(`Bild 4→5 bewegt zu wenig: Spieler ${r.a.sp45}, Ball ${r.a.ball45}`);
  if (r.a.sp56 !== 0 || r.a.ball56 < 60) probleme.push(`Bild 5→6: Spieler ${r.a.sp56} (soll 0), Ball ${r.a.ball56} (soll ≥ 60 – der Schuss geht übers Feld)`);
  if (r.a.ballY6 > 24) probleme.push(`Bild 6: der Ball liegt bei y ${r.a.ballY6} – im Tor wäre er oberhalb von 24`);
  if (r.a.wege6 !== 0) probleme.push(`Bild 6 zeigt ${r.a.wege6} Wege – nach dem Tor ist nichts mehr zu zeigen`);
  if (r.a.wege5 !== 1) probleme.push(`Bild 5 zeigt ${r.a.wege5} Wege statt genau den Schuss`);
  if (!/Abschluss/.test(r.a.text5) || !/Tor/.test(r.a.text6) || /Flanke/i.test(r.a.text5 + r.a.text6)) probleme.push(`Bildtexte 5/6: „${r.a.text5}“ · „${r.a.text6}“`);
  if (r.a.text6.length > 30) probleme.push(`Bildtext 6 hat ${r.a.text6.length} Zeichen (höchstens 30)`);
  // b)
  if (r.b.kurz !== 1200) probleme.push(`Kurze Strecke gleitet ${r.b.kurz} ms statt 1200`);
  if (!(r.b.mittel > 1200 && r.b.mittel < 2200)) probleme.push(`Mittlere Strecke (84 Punkte) gleitet ${r.b.mittel} ms – erwartet zwischen 1200 und 2200`);
  if (r.b.lang !== 2200) probleme.push(`Lange Strecke gleitet ${r.b.lang} ms statt 2200`);
  if (r.b.stand < 1000) probleme.push(`Standzeit ${r.b.stand} ms – unter einer Sekunde liest niemand die Nummer`);
  if (r.b.schnitt < 1800) probleme.push(`Harter Schnitt ${r.b.schnitt} ms – zu schnell für „weniger Bewegung“`);
  // c)
  if (!r.c.start) probleme.push("Im großen Fenster ist kein Ball zu finden");
  else if (r.c.erstBewegt == null) probleme.push("Das Abspielen bewegt den Ball nicht");
  else {
    if (r.c.erstBewegt < 900) probleme.push(`Bild 1 stand nur ${r.c.erstBewegt} ms, bevor der Ball loslief (mindestens 900)`);
    if (r.c.dauer < 1400) probleme.push(`Der erste Übergang (Ball 84 Punkte) dauerte ${r.c.dauer} ms – erwartet mindestens 1400`);
  }
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);

  if (!probleme.length) {
    zeilen.push(`${r.n} Bilder, die letzten drei: Pass→Abschluss Spieler ${r.a.sp45} · Ball ${r.a.ball45}, 5→6 nur der Ball ${r.a.ball56} bis y ${r.a.ballY6} (im Tor), Bild 6 ohne Wege – „${r.a.text5}“ · „${r.a.text6}“`);
    zeilen.push(`Gleitzeit: 16 Punkte ${r.b.kurz} ms · 84 Punkte ${r.b.mittel} ms · 200 Punkte ${r.b.lang} ms; Stand ${r.b.stand} ms, Schnitt ${r.b.schnitt} ms`);
    zeilen.push(`Am DOM: Bild 1 stand ${r.c.erstBewegt} ms, der erste Übergang lief ${r.c.dauer} ms`);
  }
  return h.ergebnis("Abspielen: Bild 5 und 6, langsamer", !probleme.length, zeilen.concat(probleme));
};
