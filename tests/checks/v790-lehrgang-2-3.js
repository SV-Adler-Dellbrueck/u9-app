/* v790 · Lehrgangsaufgabe 2.3: Joker-Duell, Schau-Tore und Vorlage L5-8 (doku/auftrag-lehrgang-2-3/)
   Charles 06.11.: Kategorie von „Joker-Duell“ wahrnehmung (individual ist in Spielform-Blöcken nicht erlaubt), „ordnung“ der Vorlage „1 gegen 1“
   (Freitext gibt es nicht, nur die feste Liste). Sonst unverändert gegenüber den Nachtragsdateien.
   a) Jede Übung steht genau einmal in der Bibliothek, die Vorlage genau einmal in vorlagen.json – gleich der Nachtragsdatei bis auf die zwei Entscheidungen
   b) _euPruefung und _eiSkizzeFehler beanstanden nichts; Material wie im Auftrag; drei Bilder (Grundbild + zwei Schritte) mit denselben fünf Spielern;
      kein Spielerabstand unter 24 (54,0 / 36,1 / 27,7 und 34,7 / 34,4 / 34,9)
   c) _evPruefung beanstandet die Vorlage nicht; jedes uebung_name zeigt auf eine Bibliotheksübung
   d) Kein Kindername in den Einträgen */
"use strict";
const fs = require("fs"), path = require("path");
const SOLL = [
  { name: "Joker-Duell – anbieten und freilaufen", kat: "wahrnehmung", mat: "2 Minitore · 10 Hütchen · 1 Ball", abst: [54.0, 36.1, 27.7] },
  { name: "Schau-Tore – vor dem Ball schauen, dann ins gezeigte Tor", kat: "wahrnehmung", mat: "4 Minitore · 4 Hütchen · 1 Ball", abst: [34.7, 34.4, 34.9] }
];
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const D = path.join(h.REPO, "doku/auftrag-lehrgang-2-3");
  const nachU = JSON.parse(fs.readFileSync(path.join(D, "nachtrag-uebungen-joker-duell.json"), "utf8"));
  const nachV = JSON.parse(fs.readFileSync(path.join(D, "nachtrag-vorlage-l5-8.json"), "utf8"));
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const vl = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8"));
  const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  // a)
  const eintraege = SOLL.map((s, k) => {
    const soll = JSON.parse(JSON.stringify(nachU.uebungen.find(u => u.name === s.name))); soll.kat = s.kat;
    const t = bib.uebungen.filter(u => u.name === s.name);
    if (t.length !== 1) probleme.push(`a) „${s.name}“ ${t.length}× in der Bibliothek`);
    else if (!gleich(t[0], soll)) probleme.push(`a) „${s.name}“ weicht von der Nachtragsdatei ab (erlaubt: nur kat)`);
    return t[0] || soll;
  });
  const sollV = JSON.parse(JSON.stringify(nachV.vorlagen[0])); sollV.ordnung = "1 gegen 1";
  const tv = vl.vorlagen.filter(v => v.name === sollV.name);
  if (tv.length !== 1) probleme.push(`a) Vorlage ${tv.length}× in vorlagen.json`);
  else if (!gleich(tv[0], sollV)) probleme.push("a) Vorlage weicht von der Nachtragsdatei ab (erlaubt: nur ordnung)");
  const alle = JSON.stringify(eintraege) + JSON.stringify(tv);
  for (const n of h.KINDER) if (alle.includes(n)) probleme.push(`d) Kindername ${n} in den Einträgen`);
  // b) Bilder und Spielerabstände aus den Daten
  eintraege.forEach((u, k) => {
    const bilder = [u.skizze.s].concat((u.skizze.schritte || []).map(s => s.s));
    if (bilder.length !== 3) probleme.push(`b) „${SOLL[k].name}“ hat ${bilder.length} Bilder statt 3`);
    const nm = b => b.map(p => p[3] || (p[2] === "r" ? "rot" : "?")).join(",");
    if (new Set(bilder.map(nm)).size !== 1) probleme.push(`b) „${SOLL[k].name}“ nicht dieselben Spieler in jedem Bild: ${bilder.map(nm).join(" | ")}`);
    const ab = bilder.map(b => Math.round(Math.min(...b.flatMap((p, i) => b.slice(i + 1).map(q => Math.hypot(p[0] - q[0], p[1] - q[1])))) * 10) / 10);
    if (!gleich(ab, SOLL[k].abst) || ab.some(x => x < 24)) probleme.push(`b) „${SOLL[k].name}“ Spielerabstand ${ab.join(" / ")}`);
  });
  // b) + c) in der App
  const custom = bib.uebungen.map((u, i) => ({ ...u, id: 6000 + i, custom: true }));
  const t = await h.starten({ warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), trainingsformen: custom }) });
  const r = await t.page.evaluate(async ({ uJson, vJson, namen }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 40 && typeof _euPruefung !== "function"; i++) await w(100);
    if (typeof loadCustomForms === "function") await loadCustomForms();
    const u = JSON.parse(uJson);
    return { eu: _euPruefung(uJson).fehler, ev: _evPruefung(vJson).fehler,
      je: u.uebungen.map(x => ({ sk: _eiSkizzeFehler(x.skizze), mat: skzMaterialText(x.skizze), da: tpAllForms().some(f => f.name === x.name) })) };
  }, { uJson: JSON.stringify({ schema: bib.schema, uebungen: eintraege }), vJson: JSON.stringify({ schema: vl.schema, vorlagen: [sollV] }), namen: SOLL.map(s => s.name) }).catch(e => ({ fehler: String(e) }));
  const f = t.fehler(); await t.schliessen();
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  if (r.fehler) probleme.push("b) " + r.fehler);
  else {
    if (r.eu.length) probleme.push(`b) _euPruefung: ${r.eu.join(" | ")}`);
    if (r.ev.length) probleme.push(`c) _evPruefung: ${r.ev.join(" | ")}`);
    r.je.forEach((x, k) => {
      if (x.sk.length) probleme.push(`b) „${SOLL[k].name}“ _eiSkizzeFehler: ${x.sk.join(" | ")}`);
      if (x.mat !== SOLL[k].mat) probleme.push(`b) „${SOLL[k].name}“ Material: ${x.mat}`);
      if (!x.da) probleme.push(`b) „${SOLL[k].name}“ erscheint nicht in der Übungsliste der App`);
    });
  }
  // c) jedes uebung_name zeigt auf eine Bibliotheksübung
  const bibNamen = new Set(bib.uebungen.map(u => u.name));
  const verweise = sollV.bloecke.flatMap(b => [b.uebung_name].concat((b.stationen || []).map(s => s.uebung_name))).filter(Boolean);
  const fehlt = verweise.filter(n => !bibNamen.has(n));
  if (!verweise.length || fehlt.length) probleme.push(`c) Verweise ohne Bibliotheksübung: ${fehlt.join(" | ") || "keine Verweise gefunden"}`);
  zeilen.push(`Übungen ${SOLL.length}× in der Bibliothek, Vorlage 1× · Material ${SOLL.map(s => s.mat).join(" / ")} · 3 Bilder, gleiche Spieler, Abstand ≥ 24 · ${verweise.length} Verweise → alle in der Bibliothek`);
  return h.ergebnis("Lehrgang 2.3: Joker-Duell, Schau-Tore und Vorlage L5-8 in Bibliothek und Vorlagen", !probleme.length, zeilen.concat(probleme));
};
