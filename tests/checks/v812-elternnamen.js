/* v812 · Elternnamen verlassen die App nicht (Charles 08.11.2026). Nur erfundene Namen.
   a) tbPseudonym (Kopieren, Teilen, Monatsexport, Lehrgang): hinterlegter Elternname voll und als Teil, auch mit Genitiv-s
      → „ein Elternteil“; unbekannter Name hinter „Vater“ fällt weg; „dem Vater Bescheid“ und „Mama Kind A“ bleiben; Trainer bleibt
   b) KI-Maske: Elternname → „Elternteil 1“, kein Name geht hinaus; nbZurueck setzt ihn im Entwurf wieder ein
   c) Ohne Elternliste (alte Datenbank) bleibt alles wie in v808
   d) Migration: export.ohne_namen ruft ohne_erwachsene, namen_schreibweisen liefert art 'eltern' nur für Trainer */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const kader = [{ id: 1, name: "Testa", nr: 1, aktiv: true, sort_order: 1, alias: "A" }, { id: 2, name: "Bero", nr: 2, aktiv: true, sort_order: 2, alias: "B" }];
  let mitEltern = true;
  const liste = () => [{ art: "wort", wort: "Bescheid", alias: null }].concat(mitEltern ? [
    { art: "eltern", wort: "Gundula Wanderer", alias: null }, { art: "eltern", wort: "Gundula", alias: null }, { art: "eltern", wort: "Wanderer", alias: null }] : []);
  const text = "Gundula Wanderer sprach mit Charles. Wanderers Auto stand da. Testas Vater Dagobert rief. Ich gab dem Vater Bescheid. Die Mama Testa kam.";
  const s = await h.starten({ hoehe: 1200, supabase: h.supabaseAttrappe({ kader, termine: [], rpc: { namen_schreibweisen: () => liste() } }) });
  const r = await s.page.evaluate(async (text) => {
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    if (typeof namenNachbessern !== "function" || typeof tbPseudonym !== "function" || typeof nbMaske !== "function") return { fehlt: true };
    await loadKader(); await namenSchreibLaden(true);
    const out = { a: tbPseudonym(text) };
    const m = nbMaske(["Testa"]); out.b = m.weg(text);
    _nbMaskeAktiv = m; out.b2 = nbZurueck("Elternteil 1 hat Kind 1 gelobt."); _nbMaskeAktiv = null;
    return out;
  }, text);
  if (r.fehlt) probleme.push("Funktionen fehlen");
  else {
    if (!/^ein Elternteil sprach mit Charles\. ein Elternteil Auto stand da\. Kind A Vater rief\. Ich gab dem Vater Bescheid\. Die Mama Kind A kam\./.test(r.a.split("\n").pop()) && !r.a.includes("ein Elternteil sprach mit Charles. ein Elternteil Auto stand da. Kind A Vater rief. Ich gab dem Vater Bescheid. Die Mama Kind A kam."))
      probleme.push("a) " + r.a.slice(-200));
    if (/Gundula|Wanderer|Dagobert|Testa/.test(r.b) || !/Elternteil 1/.test(r.b)) probleme.push("b) Maske: " + r.b);
    if (r.b2 !== "Gundula Wanderer hat Testa gelobt.") probleme.push("b) zurück: " + r.b2);
  }
  zeilen.push("a) „ein Elternteil“, „Vater Dagobert“ → „Vater“, „Bescheid“ und „Mama Kind A“ bleiben · b) KI sieht „Elternteil 1“, Entwurf bekommt den Namen zurück");
  // c) ohne Elternliste
  mitEltern = false;
  const c = await s.page.evaluate(async () => { await namenSchreibLaden(true); return tbPseudonym("Gundula kam mit Testa."); });
  if (!c.includes("Gundula kam mit Kind A.")) probleme.push("c) " + c);
  zeilen.push("c) ohne Elternliste unverändert");
  const fe = s.fehler(); await s.schliessen();
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  // d) Migration
  const sql = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20261114_v812_elternnamen.sql"), "utf8");
  const d = { kette: /export\.ohne_erwachsene\(export\.ohne_namen_fest\(t\)\)/.test(sql), eltern: /'eltern'::text, e\.wort, null::text from export\.erwachsene_namen\(\) e where public\.is_trainer\(\)/.test(sql),
    rechte: /revoke all on function export\.erwachsene_namen\(\), export\.ohne_erwachsene\(text\) from public, anon, authenticated/.test(sql), opa: /\(Vater\|Mutter\|Papa\|Mama\|Opa\|Oma\|Onkel\|Tante\|Herr\|Frau\)\$'/.test(sql) };
  if (Object.values(d).includes(false)) probleme.push("d) " + JSON.stringify(d));
  zeilen.push("d) Export ersetzt Erwachsene nach den Kindern, Elternliste nur für Trainer, Verwandtschaftswörter allein bleiben");
  return h.ergebnis("v812 Elternnamen: Export, Kopieren und KI", !probleme.length, probleme.length ? probleme : zeilen);
};
