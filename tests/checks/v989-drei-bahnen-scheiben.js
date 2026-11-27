/* v989 · Regel von Charles (27.11.2026): Auf dem Spielfeld stören Hütchen, Markierungsscheiben nicht.
   „Lehrgang – Drei Bahnen, klare Zuständigkeit“: die zehn Bahnmarkierungen sind Teller (ger, gelb), Hütchen nur an den vier Ecken.
   a) Skizze: genau vier Hütchen an den Feldecken, zehn Teller auf den Bahnlinien (y 67 und 113), dazu der Trainer – 11 Geräte;
      alles andere an der Skizze wie vorher (Prüfsumme)
   b) In der App: _eiSkizzeFehler ohne Befund, gerendert mit zehn Tellern; Material „3 Minitore · 4 Hütchen · 10 Markierungsteller · 1 Ball“,
      der Trainer zählt nicht; Pfeil 1 läuft nicht durch die Scheibe (140, 113); kein Nummernkreis auf einer Scheibe
   c) Texte: ablauf und AUFBAU in ablauf_lang nennen Linien aus Markierungsscheiben, nicht mehr Hütchenlinien; ablauf ≤ 1.000 */
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");
module.exports = async function (h) {
  const titel = "v989 Drei Bahnen: Scheiben auf den Bahnlinien, Hütchen nur an den Ecken";
  const probleme = [], zeilen = [];
  const NAME = "Lehrgang – Drei Bahnen, klare Zuständigkeit";
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const u = bib.uebungen.find(x => x.name === NAME);
  if (!u) return h.ergebnis(titel, false, ["Übung fehlt in der Bibliothek"]);
  const sk = u.skizze || {};
  // a)
  const ecken = [[30, 20], [250, 20], [30, 160], [250, 160]];
  const h4 = (sk.h || []).map(x => x[0] + "," + x[1]).sort().join(" ");
  if (h4 !== ecken.map(x => x.join(",")).sort().join(" ")) probleme.push("a) Hütchen nicht nur an den vier Ecken: " + h4);
  const teller = (sk.ger || []).filter(g => g[2] === "teller");
  const sollT = [30, 85, 140, 195, 250].flatMap(x => [[x, 67], [x, 113]]);
  if (teller.length !== 10 || !sollT.every(([x, y]) => teller.some(t => t[0] === x && t[1] === y && t[3] === "y"))) probleme.push("a) Teller nicht auf den Bahnlinien: " + JSON.stringify(teller));
  const tr = (sk.ger || []).filter(g => g[2] === "trainer");
  if (tr.length !== 1 || tr[0][0] !== 140 || tr[0][1] !== 170) probleme.push("a) Trainer verschoben: " + JSON.stringify(tr));
  if ((sk.ger || []).length !== 11) probleme.push(`a) ${(sk.ger || []).length} Geräte statt 11`);
  const rest = Object.assign({}, sk); delete rest.h; delete rest.ger;
  const sum = crypto.createHash("sha256").update(JSON.stringify(rest)).digest("hex").slice(0, 16);
  if (sum !== "b2057933b7436270") probleme.push("a) übrige Skizze verändert (" + sum + ")");
  // c)
  if (!/längs durch zwei Linien aus Markierungsscheiben in drei gleich breite Bahnen geteilt/.test(u.ablauf) || /Hütchenlinie/.test(u.ablauf)) probleme.push("c) ablauf nennt keine Markierungsscheiben");
  if (u.ablauf.length > 1000) probleme.push(`c) ablauf ${u.ablauf.length} Zeichen`);
  if (!/Feld 40 × 30 m, durch zwei Linien aus Markierungsscheiben in drei Bahnen geteilt\. Hütchen nur an den Ecken; im Feld stören Hütchen, Scheiben nicht\./.test(u.ablauf_lang) || /Hütchenlinie/.test(u.ablauf_lang)) probleme.push("c) AUFBAU in ablauf_lang nicht ersetzt");
  // b)
  const s = await h.starten({ breite: 900, hoehe: 900, warten: 400, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await s.page.evaluate(async (spec) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 60 && (typeof _eiSkizzeFehler !== "function" || typeof skzMaterial !== "function"); i++) await w(100);
    if (typeof _eiSkizzeFehler !== "function") return { fehlt: true };
    const d = document.createElement("div"); d.innerHTML = _skz(spec);
    return { fehler: _eiSkizzeFehler(spec), material: skzMaterial(spec).map(x => `${x.anzahl} ${x.was}`), schluessel: skzMaterial(spec).map(x => x.schluessel), svg: !!d.querySelector("svg") };
  }, sk);
  const f = s.fehler(); await s.schliessen();
  if (r.fehlt) return h.ergebnis(titel, false, ["_eiSkizzeFehler fehlt"]);
  if (r.fehler.length) probleme.push("b) _eiSkizzeFehler: " + r.fehler.join(" · "));
  if (!r.svg) probleme.push("b) Skizze rendert nicht");
  if (r.material.join(" · ") !== "3 Minitore · 4 Hütchen · 10 Markierungsteller · 1 Ball") probleme.push("b) Material: " + r.material.join(" · "));
  if (r.schluessel.includes("trainer")) probleme.push("b) der Trainer steht im Material");
  const seg = (q, p) => { const dx = p[2] - p[0], dy = p[3] - p[1], t = Math.max(0, Math.min(1, ((q[0] - p[0]) * dx + (q[1] - p[1]) * dy) / (dx * dx + dy * dy))); return Math.hypot(p[0] + t * dx - q[0], p[1] + t * dy - q[1]); };
  const p1 = (sk.p || []).find(p => Number(p[5]) === 1);
  const ab = p1 ? seg([140, 113], p1) : 0;
  if (ab < 6) probleme.push(`b) Pfeil 1 läuft durch die Scheibe (140, 113): ${ab.toFixed(1)}`);
  (sk.p || []).forEach(p => { const dx = p[2] - p[0], dy = p[3] - p[1], len = Math.hypot(dx, dy) || 1, kx = p[0] - dx / len * 7, ky = p[1] - dy / len * 7;
    teller.forEach(t => { if (Math.hypot(kx - t[0], ky - t[1]) < 10) probleme.push(`b) Nummer ${p[5]} liegt auf der Scheibe (${t[0]}, ${t[1]})`); }); });
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  zeilen.push(`Material ${r.material.join(" · ")} · Pfeil 1 mit ${ab.toFixed(1)} Abstand zur Scheibe (140, 113) · ablauf ${u.ablauf.length} Zeichen`);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
