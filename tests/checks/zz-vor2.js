"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const vl = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8"));
  const neu = bib.uebungen.filter(u => /^(Joker-Duell|Schau-Tore)/.test(u.name));
  const custom = bib.uebungen.map((u, i) => ({ ...u, id: 6000 + i, custom: true }));
  const t = await h.starten({ warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), trainingsformen: custom }) });
  const r = await t.page.evaluate(async ({ uJson, vJson }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 40 && typeof _euPruefung !== "function"; i++) await w(100);
    if (typeof loadCustomForms === "function") await loadCustomForms();
    const u = JSON.parse(uJson);
    const teller = u.uebungen.map(x => ({ n: x.name.slice(0, 10), bilder: skzBildZahl(x.skizze), mat: skzMaterialText(x.skizze), fehler: _eiSkizzeFehler(x.skizze), legende: (typeof skzLegendeArten === "function") ? [...skzLegendeArten(x.skizze)] : null,
      svg0: _skz(x.skizze).slice(0, 0) }));
    // Zeichnung: wie sieht ein Gerät „teller“ im SVG aus?
    const sv = _skz(u.uebungen[0].skizze);
    const gerTeile = (sv.match(/<circle[^>]*>/g) || []).length;
    return { eu: _euPruefung(uJson).fehler, ev: _evPruefung(vJson).fehler, teller, gerTeile, svgAusschnitt: sv.slice(0, 0) };
  }, { uJson: JSON.stringify({ schema: bib.schema, uebungen: neu }), vJson: JSON.stringify({ schema: vl.schema, vorlagen: vl.vorlagen.filter(v => /^L5-8 /.test(v.name)) }) }).catch(e => ({ fehler: String(e) }));
  const f = t.fehler(); await t.schliessen();
  return h.ergebnis("Vorprüfung 2", true, [JSON.stringify(r, null, 1), "Konsole " + JSON.stringify(f)]);
};
