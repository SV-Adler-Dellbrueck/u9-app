/* v749 · Sammelauftrag vom 04.10.: fünf Übungen (doku/auftrag-uebungen-sammel-2026-10-04)
   Drei standen seit v723 in der Bibliothek; neu sind FUNiño-Wachstum und Eishockey-Reihentausch, und
   „Doppelpass durch die Stangen“ trägt die Fassung vom 04.10. (zwei Parcours im Wechsel, 4–8 Kinder).
   PO 04.10. (Kachel „Wie vorgeschlagen“): 4 und 5 neu, 1 nachziehen (Datei und Datenbank), 3 so lassen.
   a) Jede der fünf Übungen steht genau einmal in der Bibliothek; 1, 2, 4, 5 gleich dem Auftrag,
      3 bis auf „spieler“ (Kachel-Entscheid v723)
   b) _euPruefung und _eiSkizzeFehler beanstanden nichts
   c) Materialzeilen wie im Sammelauftrag – „2 Balldepots“ im Plural (vorher „2 Balldepot“)
   d) Art und Betreuung haben einen Vorschlag; Bilder und GIF liegen in den Auftragsordnern
   e) Kein Kindername in den Einträgen */
"use strict";
const fs = require("fs"), path = require("path");
const SOLL = [
  { ordner: "auftrag-uebung-doppelpass-stangen", slug: "doppelpass-durch-die-stangen", gif: true,
    mat: "1 Minitor · 2 Hütchen · 4 Stangen · 1 Freistoß-Dummy · 2 Bälle", art: "uebung", betr: "allein" },
  { ordner: "auftrag-uebung-stangentausch", slug: "stangentausch", mat: "4 Stangen · 4 Bälle", art: "weder", betr: "allein" },
  { ordner: "auftrag-uebung-abschlussspiel-raute-countdown", slug: "abschlussspiel-raute-countdown",
    mat: "2 Jugendtore · 1 Ball · 1 Balldepot", art: "spiel", betr: "fuehrt", spieler: "8–12 (zwei Teams zu je 4, bis zu zwei Wechsler je Team)" },
  { ordner: "auftrag-uebung-funino-wachstum", slug: "funino-wachstum", gif: true,
    mat: "4 Minitore · 1 Ball · 2 Balldepots", art: "spiel", betr: "fuehrt" },
  { ordner: "auftrag-uebung-eishockey-reihentausch", slug: "eishockey-reihentausch", gif: true,
    mat: "2 Jugendtore · 4 Hütchen · 1 Ball", art: "spiel", betr: "fuehrt" }
];
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const eintraege = SOLL.map(s => {
    const auftrag = fs.readFileSync(path.join(h.REPO, "doku", s.ordner, "README.md"), "utf8");
    const soll = JSON.parse((auftrag.match(/```json\n([\s\S]*?)```/) || [])[1] || "{}").uebungen[0];
    s.name = soll.name;
    if (s.spieler) soll.spieler = s.spieler;
    const treffer = bib.uebungen.filter(u => u.name === s.name);
    if (treffer.length !== 1) probleme.push(`a) „${s.name}“ ${treffer.length}× in der Bibliothek`);
    else if (JSON.stringify(treffer[0]) !== JSON.stringify(soll)) probleme.push(`a) „${s.name}“ weicht vom Auftrag ab`);
    const text = JSON.stringify(treffer[0] || {});
    for (const n of h.KINDER) if (text.includes(n)) probleme.push(`e) Kindername ${n} in „${s.name}“`);
    for (const f of [s.slug + ".png", s.slug + ".svg"].concat(s.gif ? [s.slug + "-animation.gif"] : []))
      if (!fs.existsSync(path.join(h.REPO, "doku", s.ordner, f))) probleme.push(`d) Bild fehlt: ${s.ordner}/${f}`);
    return treffer[0] || soll;
  });
  const t = await h.starten({ warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await t.page.evaluate(async json => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 40 && typeof _euPruefung !== "function"; i++) await w(100);
    return { eu: _euPruefung(json).fehler || [], je: JSON.parse(json).uebungen.map(u => ({
      sk: _eiSkizzeFehler(u.skizze), mat: skzMaterialText(u.skizze),
      art: (typeof UEBUNG_ART_VORSCHLAG !== "undefined" ? UEBUNG_ART_VORSCHLAG : {})[u.name],
      betr: (typeof UEBUNG_BETREUUNG_VORSCHLAG !== "undefined" ? UEBUNG_BETREUUNG_VORSCHLAG : {})[u.name] })) };
  }, JSON.stringify({ schema: bib.schema, uebungen: eintraege })).catch(e => ({ fehler: String(e) }));
  const f = t.fehler(); await t.schliessen();
  if (r.fehler) probleme.push("b) " + r.fehler);
  else {
    if (r.eu.length) probleme.push(`b) _euPruefung: ${r.eu.join(" | ")}`);
    r.je.forEach((x, k) => {
      const s = SOLL[k];
      if (x.sk.length) probleme.push(`b) „${s.name}“ _eiSkizzeFehler: ${x.sk.join(" | ")}`);
      if (x.mat !== s.mat) probleme.push(`c) „${s.name}“ Material: ${x.mat} statt ${s.mat}`);
      if (x.art !== s.art || x.betr !== s.betr) probleme.push(`d) „${s.name}“ Art/Betreuung ${x.art}/${x.betr}`);
      zeilen.push(`„${s.name}“: ${x.mat} · ${x.art}, ${x.betr}`);
    });
  }
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  return h.ergebnis("v749 Sammelauftrag: fünf Übungen, Doppelpass mit zwei Parcours, „Balldepots“",
    !probleme.length, probleme.length ? probleme : zeilen.concat(["a) je einmal, wie im Auftrag · b) keine Beanstandung · d) Bilder da · e) ohne Namen"]));
};
