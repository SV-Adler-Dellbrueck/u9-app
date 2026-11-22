/* v941 · Zwei Übungen aus der Praxis und der Grundsatz „ein Schema je Übungsform“ (Charles 22.11.2026,
   Auftrag doku/auftrag-uebungen-praxis-20-11/auftrag.md).

   a) Beide Übungen stehen in uebungen/bibliothek.json mit dem vollen Schema (Skizze, kurz ≤ 80 Zeichen, Kurzfassung in ablauf,
      ablauf_lang); kein „Lehrgang“ im Namen; die ganze Datei besteht _euPruefung, beide Skizzen _eiSkizzeFehler; der Stand ist
      hochgesetzt.
   b) ablauf_lang trägt genau die zwölf Überschriften in der festen Reihenfolge; Coaching-Aspekte höchstens drei Kernpunkte und
      Korrekturen; Eskalationsstufen leichter und schwerer; nirgends „Provokationsregel“.
   c) CLAUDE.md schreibt den Grundsatz mit derselben Reihenfolge fest.
   d) Übungsdetail in der App: Kurzfassung sichtbar, Skizze gezeichnet, „📖 Ganze Beschreibung“ zugeklappt mit den Überschriften. */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const KOEPFE = ["ZIEL", "KURZBESCHREIBUNG", "AUFBAU", "ABLAUF", "REGELN", "COACHING-ASPEKTE", "ESKALATIONSSTUFEN", "ZUSATZREGELN", "VORTEILE", "NACHTEILE", "TYPISCHE FEHLERBILDER", "WORAUF ACHTEN"];
const NAMEN = ["Anbieten und Freilaufen – Einstimmen", "Pylonen-Spiel – Läufer gegen Wächter"];
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const roh = fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"), bib = JSON.parse(roh);
  const ctx = { console, window: {}, document: { getElementById: () => null, querySelector: () => null, addEventListener() {} }, localStorage: { getItem() { return null; }, setItem() {} }, setTimeout };
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(h.REPO, "md-einheit-import.js"), "utf8"), ctx);
  const pruef = vm.runInContext("_euPruefung", ctx)(roh).fehler;
  if (pruef.length) probleme.push("a) _euPruefung: " + pruef.slice(0, 3).join(" | "));
  if (String(bib.stand) < "2026-11-22-1") probleme.push(`a) Stand „${bib.stand}“ nicht hochgesetzt`);
  for (const n of NAMEN) {
    const u = bib.uebungen.find(x => x.name === n);
    if (!u) { probleme.push(`a) „${n}“ fehlt`); continue; }
    const fehlt = ["kat", "kurz", "spieler", "feld", "dauer", "diff", "ablauf", "coaching", "varianten", "ablauf_lang", "skizze"].filter(k => u[k] == null || u[k] === "");
    if (fehlt.length) probleme.push(`a) „${n}“: es fehlt ${fehlt.join(", ")}`);
    if (/lehrgang/i.test(u.name) || String(u.kurz).length > 80) probleme.push(`a) „${n}“: Name oder kurz (${String(u.kurz).length} Zeichen)`);
    const sk = vm.runInContext("_eiSkizzeFehler", ctx)(u.skizze); if (sk.length) probleme.push(`a) „${n}“ Skizze: ${sk.join("; ")}`);
    const L = String(u.ablauf_lang || ""), koepfe = L.split("\n").filter(z => /^[A-ZÄÖÜ][A-ZÄÖÜ -]+$/.test(z.trim())).map(z => z.trim());
    if (JSON.stringify(koepfe) !== JSON.stringify(KOEPFE)) probleme.push(`b) „${n}“: Überschriften ${koepfe.join(" · ")}`);
    const teil = k => { const i = L.indexOf("\n" + k + "\n") >= 0 ? L.indexOf("\n" + k + "\n") : L.indexOf(k + "\n"); const rest = L.slice(i + k.length + 1); const j = KOEPFE.slice(KOEPFE.indexOf(k) + 1).map(x => rest.indexOf("\n" + x + "\n")).filter(x => x >= 0); return rest.slice(0, j.length ? Math.min(...j) : undefined); };
    const coach = teil("COACHING-ASPEKTE"), punkte = (coach.match(/^\d\./gm) || []).length;
    if (punkte < 1 || punkte > 3 || !/Korrekturen/.test(coach)) probleme.push(`b) „${n}“: Coaching ${punkte} Kernpunkte, Korrekturen ${/Korrekturen/.test(coach)}`);
    const esk = teil("ESKALATIONSSTUFEN"); if (!/Leichter/.test(esk) || !/Schwerer/.test(esk)) probleme.push(`b) „${n}“: Eskalationsstufen ohne leichter/schwerer`);
    if (/Provokationsregel/i.test(JSON.stringify(u))) probleme.push(`b) „${n}“: „Provokationsregel“ im Text`);
    zeilen.push(`a/b) „${n}“: ${koepfe.length} Überschriften, ${punkte} Kernpunkte, kurz ${String(u.kurz).length} Zeichen, Skizze ok`);
  }
  const cm = fs.readFileSync(path.join(h.REPO, "CLAUDE.md"), "utf8");
  if (!/Ziel · Kurzbeschreibung · Aufbau · Ablauf · Regeln · Coaching-Aspekte\*\* \(höchstens drei Kernpunkte, dazu Korrekturen\) \*\*· Eskalationsstufen\*\* \(leichter, schwerer\) \*\*· Zusatzregeln · Vorteile · Nachteile · Typische Fehlerbilder · Worauf achten/.test(cm)) probleme.push("c) CLAUDE.md: Grundsatz fehlt oder andere Reihenfolge");
  // d) Übungsdetail – die Zeile, wie sie nach dem Abgleich in der Datenbank steht (_euForm)
  const zeile = (u, id) => Object.assign(vm.runInContext("_euForm", ctx)(u), { id });
  const formen = NAMEN.map((n, i) => zeile(bib.uebungen.find(x => x.name === n) || { name: n }, 9101 + i));
  const t = await h.starten({ warten: 900, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), trainingsformen: formen }) });
  const r = await t.page.evaluate(async (NAMEN) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    document.getElementById("pin-gate")?.remove();
    for (let i = 0; i < 40 && typeof tpShowExercise !== "function"; i++) await w(100);
    if (typeof loadCustomForms === "function") await loadCustomForms();
    const alle = tpAllForms(), out = [];
    for (const n of NAMEN) {
      const i = alle.findIndex(f => f.name === n); if (i < 0) { out.push(null); continue; }
      tpShowExercise(i); await w(300);
      const d = [...document.querySelectorAll('[role="dialog"]')].pop(), det = d && d.querySelector("details.ue-lang");
      out.push({ text: d ? d.textContent : "", svg: !!(d && d.querySelector("#uebung-skizze svg")), det: !!det, offen: det ? det.open : null, lang: det ? det.textContent : "" });
      d && d.remove();
    }
    return out;
  }, NAMEN);
  const fehler = t.fehler(); await t.schliessen();
  r.forEach((x, k) => {
    const u = bib.uebungen.find(y => y.name === NAMEN[k]) || {};
    if (!x) { probleme.push(`d) „${NAMEN[k]}“ nicht geladen`); return; }
    if (!x.text.includes(String(u.ablauf || "").slice(0, 40)) || !x.svg || !x.det || x.offen !== false || !/📖 Ganze Beschreibung/.test(x.lang) || !/ZIEL[\s\S]*WORAUF ACHTEN/.test(x.lang))
      probleme.push(`d) „${NAMEN[k]}“: ${JSON.stringify({ svg: x.svg, det: x.det, offen: x.offen })}`);
  });
  if (!probleme.some(p => p.startsWith("d)"))) zeilen.push("d) Kurzfassung sichtbar, Skizze gezeichnet, „📖 Ganze Beschreibung“ zugeklappt mit den zwölf Überschriften");
  if (fehler.length) probleme.push("Konsole: " + fehler.slice(0, 2).join(" | "));
  return h.ergebnis("v941 Zwei Übungen aus der Praxis, ein Schema je Übungsform", !probleme.length, zeilen.concat(probleme));
};
