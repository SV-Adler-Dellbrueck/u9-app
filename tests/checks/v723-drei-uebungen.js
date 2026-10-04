/* v723 · Drei Übungen aus den Auftragspaketen vom 02.10.
   doku/auftrag-uebung-doppelpass-stangen, doku/auftrag-uebung-stangentausch,
   doku/auftrag-uebung-abschlussspiel-raute-countdown. PO 02.10. (Kachel): „Alle drei in v723,
   Spieler 8–12“ – beim Abschlussspiel steht statt „8“ die Spanne der Raute-Übung, weil der Ablauf
   12 Kinder mit Wechslern nennt und „Plan anpassen“ (v719) die Übung sonst bei 9–12 Kindern tauscht.
   a) Jede Übung steht genau einmal in der Bibliothek, unverändert gegenüber dem Auftrag (beim
      Abschlussspiel bis auf „spieler“)
   b) _euPruefung und _eiSkizzeFehler beanstanden nichts
   c) Material aus der Skizze wie im Auftrag
   d) Kinder je Station: 4 (seit v749 4–8, zwei Parcours) · 2–6 · 8–12 mit Torwart; Art und Betreuung haben einen Vorschlag
   e) Kein Kindername in den Einträgen */
"use strict";
const fs = require("fs"), path = require("path");
const SOLL = [
  { ordner: "auftrag-uebung-doppelpass-stangen", name: "Doppelpass durch die Stangen",
    mat: "1 Minitor · 2 Hütchen · 4 Stangen · 1 Freistoß-Dummy · 2 Bälle", spanne: [4, 8, false], art: "uebung", betr: "allein" },   // v749: Paket vom 04.10. – zwei Parcours, 4–8
  { ordner: "auftrag-uebung-stangentausch", name: "Stangentausch",
    mat: "4 Stangen · 4 Bälle", spanne: [2, 6, false], art: "weder", betr: "allein" },
  { ordner: "auftrag-uebung-abschlussspiel-raute-countdown", name: "Abschlussspiel – 3+1 gegen 3+1 Raute mit Countdown",
    mat: "2 Jugendtore · 1 Ball · 1 Balldepot", spanne: [8, 12, true], art: "spiel", betr: "fuehrt",
    spieler: "8–12 (zwei Teams zu je 4, bis zu zwei Wechsler je Team)" }
];
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const eintraege = SOLL.map(s => {
    const auftrag = fs.readFileSync(path.join(h.REPO, "doku", s.ordner, "README.md"), "utf8");
    const soll = JSON.parse((auftrag.match(/```json\n([\s\S]*?)```/) || [])[1] || "{}").uebungen[0];
    if (s.spieler) soll.spieler = s.spieler;
    const treffer = bib.uebungen.filter(u => u.name === s.name);
    if (treffer.length !== 1) probleme.push(`a) „${s.name}“ ${treffer.length}× in der Bibliothek`);
    else if (JSON.stringify(treffer[0]) !== JSON.stringify(soll)) probleme.push(`a) „${s.name}“ weicht vom Auftrag ab`);
    const text = JSON.stringify(treffer[0] || {});
    for (const n of h.KINDER) if (text.includes(n)) probleme.push(`e) Kindername ${n} in „${s.name}“`);
    return treffer[0] || soll;
  });
  const custom = bib.uebungen.map((u, i) => ({ ...u, id: 6000 + i, custom: true }));
  const t = await h.starten({ warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), trainingsformen: custom }) });
  const r = await t.page.evaluate(async ({ json, namen }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 40 && typeof _euPruefung !== "function"; i++) await w(100);
    if (typeof loadCustomForms === "function") await loadCustomForms();
    const alle = tpAllForms();
    return { eu: _euPruefung(json).fehler, je: JSON.parse(json).uebungen.map((u, k) => {
      const i = alle.findIndex(f => f.name === namen[k]);
      const sp = i >= 0 ? tpUebungSpanne(i) : null;
      return { sk: _eiSkizzeFehler(u.skizze), mat: skzMaterialText(u.skizze), da: i >= 0,
        spanne: sp ? [sp.min, sp.max, !!sp.tw] : null,
        art: (typeof UEBUNG_ART_VORSCHLAG !== "undefined" ? UEBUNG_ART_VORSCHLAG : {})[u.name],
        betr: (typeof UEBUNG_BETREUUNG_VORSCHLAG !== "undefined" ? UEBUNG_BETREUUNG_VORSCHLAG : {})[u.name] };
    }) };
  }, { json: JSON.stringify({ schema: bib.schema, uebungen: eintraege }), namen: SOLL.map(s => s.name) }).catch(e => ({ fehler: String(e) }));
  const f = t.fehler(); await t.schliessen();
  if (r.fehler) probleme.push("b) " + r.fehler);
  else {
    if (r.eu.length) probleme.push(`b) _euPruefung: ${r.eu.join(" | ")}`);
    r.je.forEach((x, k) => {
      const s = SOLL[k];
      if (x.sk.length) probleme.push(`b) „${s.name}“ _eiSkizzeFehler: ${x.sk.join(" | ")}`);
      if (x.mat !== s.mat) probleme.push(`c) „${s.name}“ Material: ${x.mat}`);
      if (!x.da) probleme.push(`d) „${s.name}“ fehlt in der Übungsliste`);
      else if (JSON.stringify(x.spanne) !== JSON.stringify(s.spanne)) probleme.push(`d) „${s.name}“ Kinder je Station ${JSON.stringify(x.spanne)} statt ${JSON.stringify(s.spanne)}`);
      if (x.art !== s.art || x.betr !== s.betr) probleme.push(`d) „${s.name}“ Art/Betreuung ${x.art}/${x.betr}`);
      else zeilen.push(`„${s.name}“: ${x.mat} · ${s.spanne[0]}–${s.spanne[1]} Kinder${s.spanne[2] ? " mit Torwart" : ""} · ${x.art}, ${x.betr}`);
    });
  }
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  return h.ergebnis("v723 Drei Übungen: Doppelpass durch die Stangen, Stangentausch, Abschlussspiel mit Countdown",
    !probleme.length, probleme.length ? probleme : zeilen.concat(["a) je einmal, wie im Auftrag · b) keine Beanstandung · e) ohne Namen"]));
};
