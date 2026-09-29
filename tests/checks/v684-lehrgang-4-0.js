/* v684 · Lehrgangsabgabe 4.0 – Trainingsform für Erwachsene (Ü32), aus PR #210
   Auftragspaket doku/auftrag-lehrgang-4-0/Auftragspaket_Lehrgang_4-0.md (Projekt-Chat, 25.09.).
   a) Die Übung steht genau einmal in der Bibliothek, zeichengleich mit nachtrag.json
   b) _euPruefung und _eiSkizzeFehler ohne Befund; skzSpecSaeubern lässt die Skizze inhaltlich unverändert
   c) Sieben Bilder; in keinem ein Spielerkreis näher als 24 Punkte an einem anderen
   d) Name, kurz, spieler und ablauf nennen Erwachsene bzw. Ü32 ausdrücklich
   e) Material: 2 Jugendtore, 2 Hütchen, 1 Ball, 2 Balldepot(s) – der Trainer zählt nicht
   f) Art „spiel“, Betreuung „fuehrt“
   g) exportAnimation kennt standMs und gleitFaktor; ohne Angabe gelten SKZ_STAND und Faktor 1
   h) Kein Kindername im Eintrag */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const NAME = "Lehrgang Erwachsene (Ü32) – 4 gegen 4 + Torhüter: Umschalten nach Ballgewinn";
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const roh = fs.readFileSync(path.join(h.REPO, "doku/auftrag-lehrgang-4-0/nachtrag.json"), "utf8");
  const soll = JSON.parse(roh).uebungen[0];
  const treffer = bib.uebungen.filter(u => u.name === NAME);
  if (treffer.length !== 1) probleme.push(`a) ${treffer.length}× in der Bibliothek`);
  else if (JSON.stringify(treffer[0]) !== JSON.stringify(soll)) probleme.push("a) Bibliothek und nachtrag.json tragen verschiedene Fassungen");
  const u = treffer[0] || soll;
  for (const k of ["name", "kurz", "spieler", "ablauf"]) if (!/Erwachsene|Ü32/.test(u[k] || "")) probleme.push(`d) „${k}“ nennt die Zielgruppe nicht`);
  const text = JSON.stringify(u);
  for (const n of h.KINDER) if (text.includes(n)) probleme.push(`h) Kindername ${n}`);
  const exp = fs.readFileSync(path.join(h.REPO, "doku/auftrag-lehrgangsskizzen/export-skizzen.js"), "utf8");
  if (!/standMs==null\?SKZ_STAND:standMs/.test(exp) || !/_skzGleitDauer\(a,b\)\*\(gleitFaktor\|\|1\)/.test(exp)) probleme.push("g) exportAnimation kennt standMs/gleitFaktor nicht wie beauftragt");
  const s = await h.starten({ warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await s.page.evaluate(async ({ roh, NAME }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 40 && typeof _euPruefung !== "function"; i++) await w(100);
    const spec = JSON.parse(roh).uebungen[0].skizze;
    const eng = [];
    for (let n = 0; n < skzBildZahl(spec); n++) {
      const b = _skzBild(spec, n);
      (b.s || []).forEach((x, i) => (b.s || []).forEach((y, j) => { if (j > i && Math.hypot(x[0] - y[0], x[1] - y[1]) < 24) eng.push(`Bild ${n + 1}: ${x[3]}↔${y[3]}`); }));
    }
    /* Säubern entfernt in Bild 2 und 6 die leeren Pfeillisten (p: []) – dasselbe Bild. Verglichen
       wird deshalb ohne leere Listen; alles andere muss Zeichen für Zeichen gleich bleiben. */
    const ohneLeer = x => JSON.stringify(x, (k, v) => Array.isArray(v) ? (v.length ? v : undefined)
      : (v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map(q => [q, v[q]])) : v));   // Reihenfolge der Schlüssel zählt nicht
    const vorher = ohneLeer(spec), nachher = ohneLeer(skzSpecSaeubern(JSON.parse(JSON.stringify(spec))));
    return { eu: _euPruefung(roh).fehler, sk: _eiSkizzeFehler(spec), bilder: skzBildZahl(spec), eng,
      saeubern: vorher === nachher, mat: skzMaterialText(spec),
      art: UEBUNG_ART_VORSCHLAG[NAME], betreuung: (typeof UEBUNG_BETREUUNG_VORSCHLAG !== "undefined" ? UEBUNG_BETREUUNG_VORSCHLAG : {})[NAME] };
  }, { roh, NAME }).catch(e => ({ fehler: String(e) }));
  const f = s.fehler(); await s.schliessen();
  if (r.fehler) probleme.push(r.fehler);
  else {
    if (r.eu.length) probleme.push(`b) _euPruefung: ${r.eu.join(" | ")}`);
    if (r.sk.length) probleme.push(`b) _eiSkizzeFehler: ${r.sk.join(" | ")}`);
    if (!r.saeubern) probleme.push("b) skzSpecSaeubern verändert die Skizze");
    if (r.bilder !== 7) probleme.push(`c) ${r.bilder} Bilder statt sieben`);
    if (r.eng.length) probleme.push(`c) zu eng: ${r.eng.slice(0, 3).join(", ")}`);
    for (const m of ["2 Jugendtore", "2 Hütchen", "1 Ball", "2 Balldepot"]) if (!r.mat.includes(m)) probleme.push(`e) Material „${r.mat}“ – ${m} fehlt`);
    if (/Trainer/.test(r.mat)) probleme.push(`e) Der Trainer steht in der Materialzeile: ${r.mat}`);
    if (r.art !== "spiel") probleme.push(`f) Art ${r.art}`);
    if (r.betreuung !== "fuehrt") probleme.push(`f) Betreuung ${r.betreuung}`);
  }
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  if (!r.fehler) zeilen.push(`${r.bilder} Bilder · Material „${r.mat}“ · Art ${r.art} · Betreuung ${r.betreuung} · Säubern unverändert ${r.saeubern}`);
  return h.ergebnis("Lehrgang 4.0: Trainingsform für Erwachsene (Ü32) mit sieben Bildern", !probleme.length, zeilen.concat(probleme));
};
