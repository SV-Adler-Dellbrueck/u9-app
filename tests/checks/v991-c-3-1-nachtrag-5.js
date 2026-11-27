/* v991 · C-Lizenz 3.1, Nachtrag 5 (Charles 27.11.2026): Bezug zu den DFB-Leitlinien im Coaching, Korridor mit
   Markierungsscheiben, Hütchen nur an den Ecken – und der Legendenfehler im Skizzen-Export.
   a) „Lehrgang – Zwei-Seiten-Spiel“: ablauf, ablauf_lang, varianten, coaching, skizze wie nachtrag.json; kurz, feld, spieler wie
      seit v988; Kurzfassung ≤ 1.000 (v917); Coaching mit Block „Bezug zu den DFB-Leitlinien“
   b) Skizze: _euPruefung und _eiSkizzeFehler ohne Befund; 4 Hütchen nur an den Ecken, 8 Teller auf den Korridorlinien;
      Material „4 Minitore · 4 Hütchen · 8 Markierungsteller · 1 Ball“, kein Trainer; Spielerkreise ≥ 24 auseinander
   c) Legende im Export (doku/auftrag-lehrgangsskizzen/export-skizzen.js): kein Text ragt über den Rand oder in die nächste
      Spalte – bei 3.1, „Drei Bahnen“ und einer Probe mit allen Wegarten und langen Gerätenamen; vorher wurde
      „Markierungsteller“ in der dritten Spalte bei 280 Einheiten (1120 px) rechts abgeschnitten
   d) Stand hochgesetzt */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v991 C-3.1 Nachtrag 5: Scheiben am Korridor, Leitlinien im Coaching, Legende ohne Abschneiden";
  const probleme = [], zeilen = [];
  const NAME = "Lehrgang – Zwei-Seiten-Spiel";
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const roh = fs.readFileSync(path.join(h.REPO, "doku/auftrag-lehrgang-c-3-1/nachtrag.json"), "utf8");
  const nt = JSON.parse(roh).uebungen[0];
  const u = bib.uebungen.find(x => x.name === NAME);
  if (!u) return h.ergebnis(titel, false, ["Übung fehlt in der Bibliothek"]);
  // a)
  ["ablauf", "ablauf_lang", "varianten", "coaching"].forEach(k => { if (u[k] !== nt[k]) probleme.push(`a) ${k} nicht wie nachtrag.json`); });
  if (JSON.stringify(u.skizze) !== JSON.stringify(nt.skizze)) probleme.push("a) Skizze nicht wie nachtrag.json");
  if (u.kurz !== "4 gegen 4, vier Minitore: Torschuss erst nach Seitenwechsel über den Korridor." || u.feld !== "36 × 24 m, Korridor 5 m längs" || u.spieler !== "7–9") probleme.push("a) kurz, feld oder spieler verändert");
  if (u.ablauf.length > 1000) probleme.push(`a) Kurzfassung ${u.ablauf.length} Zeichen`);
  if (!/Bezug zu den DFB-Leitlinien/.test(u.coaching)) probleme.push("a) Coaching ohne Bezug zu den DFB-Leitlinien");
  if (/Hütchenlinie/.test(u.ablauf + u.ablauf_lang)) probleme.push("a) es steht noch „Hütchenlinie“ im Text");
  // b) statisch
  const sk = u.skizze, z = sk.z[0], kor = sk.z[1];
  const ecken = new Set([`${z[0]},${z[1]}`, `${z[0] + z[2]},${z[1]}`, `${z[0]},${z[1] + z[3]}`, `${z[0] + z[2]},${z[1] + z[3]}`]);
  if ((sk.h || []).length !== 4 || !(sk.h || []).every(x => ecken.has(`${x[0]},${x[1]}`))) probleme.push("b) Hütchen nicht nur an den Ecken");
  const teller = (sk.ger || []).filter(g => g[2] === "teller");
  if (teller.length !== 8 || !teller.every(t => t[1] === kor[1] || t[1] === kor[1] + kor[3])) probleme.push("b) Teller nicht auf den Korridorlinien");
  const eng = [];
  sk.s.forEach((a, i) => sk.s.forEach((b, j) => { if (j > i && Math.hypot(a[0] - b[0], a[1] - b[1]) < 24) eng.push(i + "↔" + j); }));
  if (eng.length) probleme.push("b) Spieler zu eng: " + eng.join(", "));
  if (String(bib.stand) < "2026-11-27-6") probleme.push(`d) Stand „${bib.stand}“ nicht hochgesetzt`);
  // b) und c) im Browser
  const drei = bib.uebungen.find(x => x.name === "Lehrgang – Drei Bahnen, klare Zuständigkeit");
  const probe = { z: [[30, 20, 220, 140]], p: [[40, 40, 80, 40, "p", 1], [40, 60, 80, 60, "l", 2], [40, 80, 80, 80, "s", 3], [40, 100, 80, 100, "d", 4]],
    li: [[30, 90, 250, 90, "m"]], ger: [[100, 30, "teller", "y"], [120, 30, "matte", "w"], [140, 30, "gymball", "w"], [160, 30, "trainer", "w"]], s: [[200, 50, "g", "A"]] };
  const expDatei = path.join(h.REPO, "doku/auftrag-lehrgangsskizzen/export-skizzen.js");
  let { imBrowserHelfer } = require(expDatei);
  if (typeof imBrowserHelfer !== "function") {   // ältere Fassung exportiert den Helfer nicht – für die Gegenprobe aus dem Quelltext holen
    const ctx = { require: () => new Proxy({}, { get: () => () => ({}) }), module: { exports: {} }, console, process, __dirname: path.dirname(expDatei), __filename: expDatei };
    ctx.exports = ctx.module.exports; require("vm").runInNewContext(fs.readFileSync(expDatei, "utf8") + "\n;this.__h=imBrowserHelfer;", ctx);
    imBrowserHelfer = ctx.__h;
  }
  const s = await h.starten({ breite: 900, hoehe: 900, warten: 400, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  await s.page.evaluate(imBrowserHelfer);
  const r = await s.page.evaluate(async ({ roh, specs }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 60 && (typeof _euPruefung !== "function" || typeof _expLegende !== "function"); i++) await w(100);
    for (let i = 0; i < 40 && !(typeof _eiFormIndex === "function" && _eiFormIndex("Warm up Adler") >= 0); i++) await w(150);
    const spec = JSON.parse(roh).uebungen[0].skizze;
    const out = { eu: _euPruefung(roh).fehler, sk: _eiSkizzeFehler(spec), mat: skzMaterial(spec).map(x => `${x.anzahl} ${x.was}`), schl: skzMaterial(spec).map(x => x.schluessel), leg: [] };
    for (const [name, sp, B] of specs) {
      const L = _expLegende(sp, B, 180);
      const box = document.createElement("div"); document.body.appendChild(box);
      box.innerHTML = '<svg viewBox="0 0 ' + B + ' ' + (180 + L.H_LEG) + '" width="' + B + '" height="' + (180 + L.H_LEG) + '" xmlns="http://www.w3.org/2000/svg">' + L.teile.join("") + '</svg>';
      const texte = [...box.querySelectorAll("svg > text")]   /* nur die Beschriftungen, nicht Texte in den Gerätesymbolen */
       .map(t => { const bb = t.getBBox(); return { txt: t.textContent, x: bb.x, r: bb.x + bb.width, y: Math.round(bb.y) }; });
      const fehler = [];
      texte.forEach(t => { if (t.r > B + 0.5) fehler.push(`„${t.txt}“ ragt ${(t.r - B).toFixed(1)} über den Rand`); });
      texte.forEach((t, i) => texte.forEach((o, j) => { if (j !== i && o.y === t.y && o.x > t.x && t.r > o.x - 28 + 0.5) fehler.push(`„${t.txt}“ läuft in „${o.txt}“`); }));
      out.leg.push({ name, B, spalten: L.spalten, n: texte.length, fehler, texte: texte.map(t => t.txt) });
      box.remove();
    }
    return out;
  }, { roh, specs: [["3.1", nt.skizze, 280], ["Drei Bahnen", drei ? drei.skizze : nt.skizze, 280], ["Probe 280", probe, 280], ["Probe 180", probe, 180]] });
  const f = s.fehler(); await s.schliessen();
  if (r.eu.length) probleme.push("b) _euPruefung: " + r.eu.join(" · "));
  if (r.sk.length) probleme.push("b) _eiSkizzeFehler: " + r.sk.join(" · "));
  if (r.mat.join(" · ") !== "4 Minitore · 4 Hütchen · 8 Markierungsteller · 1 Ball") probleme.push("b) Material: " + r.mat.join(" · "));
  if (r.schl.includes("trainer")) probleme.push("b) der Trainer steht im Material");
  r.leg.forEach(l => {
    if (l.fehler.length) probleme.push(`c) Legende ${l.name}: ` + l.fehler.join(" · "));
    if (l.name === "3.1" && !l.texte.includes("Markierungsteller")) probleme.push("c) Legende 3.1 ohne Markierungsteller");
  });
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  zeilen.push(`Kurzfassung ${u.ablauf.length} Zeichen · Material ${r.mat.join(" · ")} · Legende ` + r.leg.map(l => `${l.name}: ${l.n} Einträge in ${l.spalten} Spalten`).join(", "));
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
