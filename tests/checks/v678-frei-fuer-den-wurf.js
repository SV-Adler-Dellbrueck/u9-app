/* v678 · Übung „Frei für den Wurf“ (doku/auftrag-uebung-wurfspiel/README.md)
   Aus dem Praxisteil des 3. Präsenztags (DFB-Basis-Coach, 25.09.2026): Werfen und Fangen in drei
   Stufen, bei der U9 I als Hauptteil zum Bewegen ohne Ball (Leitfrage 5). PO 29.09.: „ja baue das
   alles“ – als Spielform, ohne Spaßwert (das JSON aus dem Projekt-Chat hat keinen).
   a) Die Bibliothek enthält die Übung genau einmal, unverändert gegenüber dem Auftrag
   b) _euPruefung und _eiSkizzeFehler beanstanden nichts (vorher geprüft, hier festgehalten)
   c) Material aus der Skizze: 4 Hütchen, 1 Ball
   d) Kategorie wahrnehmung liegt unter der Überschrift „Hauptteil“; Art „spiel“
   e) Kein Kindername im Eintrag */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const auftrag = fs.readFileSync(path.join(h.REPO, "doku/auftrag-uebung-wurfspiel/README.md"), "utf8");
  const soll = JSON.parse((auftrag.match(/```json\n([\s\S]*?)```/) || [])[1] || "{}").uebungen[0];
  const treffer = bib.uebungen.filter(u => u.name === "Frei für den Wurf");
  if (treffer.length !== 1) probleme.push(`a) ${treffer.length}× in der Bibliothek`);
  else if (JSON.stringify(treffer[0]) !== JSON.stringify(soll)) probleme.push("a) Eintrag weicht vom Auftrag ab");
  const text = JSON.stringify(treffer[0] || {});
  for (const n of h.KINDER) if (text.includes(n)) probleme.push(`e) Kindername ${n}`);
  const t = await h.starten({ warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await t.page.evaluate(async (json) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 40 && typeof _euPruefung !== "function"; i++) await w(100);
    const u = JSON.parse(json).uebungen[0];
    const gruppe = TF_GRUPPEN ? TF_GRUPPEN.find(g => (g.kats || []).includes(u.kat)) : null;
    return { eu: _euPruefung(json).fehler, sk: _eiSkizzeFehler(u.skizze), mat: skzMaterialText(u.skizze),
      ober: gruppe ? (TF_OBER.find(o => o.gruppen.includes(gruppe.key)) || {}).label : null,
      art: (typeof UEBUNG_ART_VORSCHLAG !== "undefined" ? UEBUNG_ART_VORSCHLAG : {})[u.name] };
  }, JSON.stringify({ schema: bib.schema, uebungen: [treffer[0] || soll] })).catch(e => ({ fehler: String(e) }));
  const f = t.fehler(); await t.schliessen();
  if (r.fehler) probleme.push("b) " + r.fehler);
  else {
    if (r.eu.length) probleme.push(`b) _euPruefung: ${r.eu.join(" | ")}`);
    if (r.sk.length) probleme.push(`b) _eiSkizzeFehler: ${r.sk.join(" | ")}`);
    if (r.mat !== "4 Hütchen · 1 Ball") probleme.push(`c) Material: ${r.mat}`);
    if (r.ober !== "Hauptteil" || r.art !== "spiel") probleme.push(`d) Einordnung: ${r.ober} / ${r.art}`);
  }
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  zeilen.push(`a) einmal, wie im Auftrag · b) keine Beanstandung · c) ${r.mat} · d) ${r.ober}, ${r.art} · e) ohne Namen`);
  return h.ergebnis("Übung „Frei für den Wurf“", !probleme.length, probleme.length ? probleme : zeilen);
};
