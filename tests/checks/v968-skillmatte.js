/* v968 · Übung „Skillmatte – Pass – Tor“ und zwei neue Geräte in der Skizze (Charles 26.11.2026).

   a) Die Übung steht in uebungen/bibliothek.json mit vollem Schema; die Datei besteht _euPruefung, die Skizze _eiSkizzeFehler;
      fünf Bilder; kurz ≤ 80; kein „Lehrgang“ im Namen; ablauf_lang mit den zwölf Überschriften in Großbuchstaben.
   b) Gerätearten matte und gymball: in GER, gezeichnet, Material „1 Minitor · 1 Skillmatte · 1 Gymnastikball · 1 Markierungsteller · 1 Ball“,
      Legende nennt beide, „🎒 Mitnehmen“ zählt beide, Editor-Palette hat beide Kacheln mit mindestens 48 px.
      Ein Bildtext, der nicht ins Feld passt, wird kleiner gesetzt (Bild 3).
   c) Eine unbekannte Geräteart meldet _eiSkizzeFehler jetzt ausdrücklich.
   d) Einordnung: Übungsform, „Trainer führt“, Kategorie Individual. */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const KOEPFE = ["ZIEL", "KURZBESCHREIBUNG", "AUFBAU", "ABLAUF", "REGELN", "COACHING-ASPEKTE", "ESKALATIONSSTUFEN", "ZUSATZREGELN", "VORTEILE", "NACHTEILE", "TYPISCHE FEHLERBILDER", "WORAUF ACHTEN"];
const NAME = "Skillmatte – Pass – Tor";
const MATERIAL = "1 Minitor · 1 Skillmatte · 1 Gymnastikball · 1 Markierungsteller · 1 Ball";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const roh = fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"), bib = JSON.parse(roh);
  const u = bib.uebungen.find(x => x.name === NAME);
  if (!u) return h.ergebnis("v968 Skillmatte – Pass – Tor", false, [`a) „${NAME}“ fehlt in der Bibliothek`]);
  const t = await h.starten({ warten: 900, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await t.page.evaluate(async ({ u, roh }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 60 && (typeof _eiSkizzeFehler !== "function" || typeof skzMaterial !== "function" || typeof tpMaterialVonSpec !== "function"); i++) await w(100);
    const o = {};
    o.pruef = (_euPruefung(roh).fehler || []).slice(0, 3);
    o.skizze = _eiSkizzeFehler(u.skizze);
    o.bilder = skzBildZahl(u.skizze);
    o.ger = ["matte", "gymball"].map(a => ((skzSpecSaeubern({ ger: [[20, 20, a, "y"]] }) || {}).ger || []).length === 1);
    o.material = skzMaterialText(u.skizze);
    const svg = _skz(u.skizze, { bild: 0 }); o.svgMatte = /<rect[^>]*width="24"[^>]*height="16"/.test(svg) || /width="24" height="16"/.test(svg);
    const leg = skzLegende(false, u.skizze); o.legende = ["Skillmatte", "Gymnastikball"].map(n => leg.includes(n));
    const m = tpMaterialVonSpec(u.skizze); o.mitnehmen = [m.matten, m.gymbaelle];
    o.namen = typeof TP_MAT_NAMEN !== "undefined" ? TP_MAT_NAMEN.map(x => x[0]) : [];
    const s3 = _skz(u.skizze, { bild: 2 }), m3 = s3.match(/font-size="([\d.]+)"[^>]*>Annahme auf den starken/);
    o.txGroesse = m3 ? Number(m3[1]) : null;
    o.unbekannt = _eiSkizzeFehler({ ger: [[20, 20, "trampolin", "y"]] });
    o.art = typeof UEBUNG_ART_VORSCHLAG !== "undefined" ? UEBUNG_ART_VORSCHLAG[u.name] : null;
    o.betreuung = typeof UEBUNG_BETREUUNG_VORSCHLAG !== "undefined" ? UEBUNG_BETREUUNG_VORSCHLAG[u.name] : null;
    o.spieler = typeof tpSpielerAusText === "function" ? tpSpielerAusText(u.spieler) : null;
    return o;
  }, { u, roh });
  const fehler = t.fehler(); await t.schliessen();
  // a)
  if (r.pruef.length) probleme.push("a) _euPruefung: " + r.pruef.join(" | "));
  if (r.skizze.length) probleme.push("a) _eiSkizzeFehler: " + r.skizze.join("; "));
  if (r.bilder !== 5) probleme.push(`a) ${r.bilder} Bilder statt 5`);
  const fehlt = ["kat", "kurz", "spieler", "feld", "dauer", "diff", "ablauf", "coaching", "varianten", "ablauf_lang", "skizze"].filter(k => u[k] == null || u[k] === "");
  if (fehlt.length) probleme.push("a) es fehlt " + fehlt.join(", "));
  if (/lehrgang/i.test(u.name) || String(u.kurz).length > 80) probleme.push(`a) Name oder kurz (${String(u.kurz).length} Zeichen)`);
  if (u.kat !== "individual") probleme.push(`a) Kategorie „${u.kat}“ statt individual`);
  const koepfe = String(u.ablauf_lang).split("\n").filter(z => /^[A-ZÄÖÜ][A-ZÄÖÜ -]+$/.test(z.trim())).map(z => z.trim());
  if (JSON.stringify(koepfe) !== JSON.stringify(KOEPFE)) probleme.push("a) Überschriften " + koepfe.join(" · "));
  if (String(bib.stand) < "2026-11-26-1") probleme.push(`a) Stand „${bib.stand}“ nicht hochgesetzt`);
  /* v973: Coaching mit drei Kernpunkten und Korrekturen, Eskalation leichter/schwerer (Charles 26.11.: „Skillmatte angleichen“) */
  const L = String(u.ablauf_lang), teil = (k, n) => L.slice(L.indexOf(k + "\n"), L.indexOf(n + "\n"));
  const coach = teil("COACHING-ASPEKTE", "ESKALATIONSSTUFEN"), esk = teil("ESKALATIONSSTUFEN", "ZUSATZREGELN");
  const kp = (coach.match(/^\d\./gm) || []).length;
  if (kp !== 3 || !/^Korrekturen:/m.test(coach) || !/^Leichter:/m.test(esk) || !/^Schwerer:/m.test(esk) || String(bib.stand) < "2026-11-26-2") probleme.push(`a) Schema: ${kp} Kernpunkte, Korrekturen ${/^Korrekturen:/m.test(coach)}, leichter/schwerer ${/^Leichter:/m.test(esk)}/${/^Schwerer:/m.test(esk)}, Stand ${bib.stand}`);
  if (!probleme.length) zeilen.push(`a) Schema vollständig, 5 Bilder, kurz ${String(u.kurz).length} Zeichen, zwölf Überschriften, Prüfungen ohne Befund`);
  // b)
  const nb = probleme.length;
  if (!r.ger.every(Boolean)) probleme.push("b) skzSpecSaeubern verwirft matte/gymball");
  if (r.material !== MATERIAL) probleme.push(`b) Material „${r.material}“`);
  if (!r.svgMatte) probleme.push("b) Skillmatte nicht als 24 × 16 gezeichnet");
  if (!r.legende.every(Boolean)) probleme.push("b) Legende ohne Skillmatte/Gymnastikball");
  if (r.mitnehmen[0] !== 1 || r.mitnehmen[1] !== 1) probleme.push("b) Mitnehmen zählt " + JSON.stringify(r.mitnehmen));
  if (!r.namen.includes("matten") || !r.namen.includes("gymbaelle")) probleme.push("b) TP_MAT_NAMEN ohne matten/gymbaelle");
  const sk = fs.readFileSync(path.join(h.REPO, "md-skizze.js"), "utf8");
  if (!/id:"matte"[^}]*feld:"ger"[^}]*typ:"matte"/.test(sk) || !/id:"gymball"[^}]*feld:"ger"[^}]*typ:"gymball"/.test(sk)) probleme.push("b) Palette ohne Skillmatte/Gymnastikball");
  if (!/const kachel=w=>`<button[^`]*min-height:48px/.test(sk)) probleme.push("b) Palettenkachel unter 48 px");
  if (!(r.txGroesse >= 6.5 && r.txGroesse < 9)) probleme.push("b) langer Bildtext nicht verkleinert: " + r.txGroesse);
  if (probleme.length === nb) zeilen.push(`b) Bildtext in Bild 3 auf ${r.txGroesse} verkleinert`)
  if (probleme.length === nb) zeilen.push(`b) GER, Zeichnung, Material „${r.material}“, Legende, Mitnehmen und Palette (48 px) kennen beide Geräte`);
  // c)
  if (!r.unbekannt.some(f => /Art „trampolin“ gibt es nicht/.test(f))) probleme.push("c) unbekannte Geräteart nicht gemeldet: " + JSON.stringify(r.unbekannt));
  else zeilen.push("c) unbekannte Geräteart wird gemeldet");
  // d)
  if (r.art !== "uebung" || r.betreuung !== "fuehrt") probleme.push(`d) Einordnung ${r.art}/${r.betreuung}`);
  else if (!r.spieler || r.spieler.min !== 2 || r.spieler.max !== 2 || r.spieler.tw) probleme.push("d) Kinder je Station " + JSON.stringify(r.spieler));
  else zeilen.push("d) Übungsform, „Trainer führt“, 2 bis 2 Kinder, ohne Torwart");
  if (fehler.length) probleme.push("Konsole: " + fehler.slice(0, 2).join(" | "));
  return h.ergebnis("v968 Skillmatte – Pass – Tor", !probleme.length, zeilen.concat(probleme));
};
