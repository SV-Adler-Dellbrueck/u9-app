/* v833 · Übung und Vorlage „Technik-Parcours“ für das Training am 16.11.2026 (doku/auftrag-uebung-technik-parcours/, zweite Fassung).
   a) Übung genau einmal in bibliothek.json, Vorlage genau einmal in vorlagen.json – Zeichen für Zeichen wie die JSON-Blöcke im README
      (folge_nr null bleibt: _evPruefung nimmt es an); beide Stände mindestens 2026-11-15-1, sonst holt der Abgleich die Dateien nicht.
   b) _euPruefung, _eiSkizzeFehler und _evPruefung beanstanden nichts, wenn die App die Bibliothek kennt; skzSpecSaeubern ändert inhaltlich nichts.
   c) Skizze: ein Bild, quer, 11 Spieler, kein Spielerabstand unter 24; Material 4 Minitore · 12 Hütchen · 8 Bälle, kein Trainer.
   d) Übungsart Übungsform (`uebung`), Betreuung „läuft allein“ (die Kinder zählen selbst auf dem Laufzettel).
   e) Bild technik-parcours.png und .svg liegen im Paketordner.
   f) Kein Kindername in Übung und Vorlage; keine Funktion zum Eintragen durch Kinder (nicht beauftragt). */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v833 Technik-Parcours: Übung und Vorlage für den 16.11., Prüfungen der App, Skizze, Übungsform";
  const probleme = [], zeilen = [];
  const D = path.join(h.REPO, "doku/auftrag-uebung-technik-parcours");
  const md = fs.readFileSync(path.join(D, "README.md"), "utf8");
  const bl = [...md.matchAll(/```json\n([\s\S]*?)```/g)].map(m => JSON.parse(m[1]));
  const sollU = bl[0].uebungen[0], sollV = bl[1].vorlagen[0];
  /* v882 (Charles 19.11.): Tag „halle“ nach der Regel 27 x 45 m – der Käfig 40 x 25 m passt hinein. */
  sollV.tags = (sollV.tags || []).concat(["halle"]);
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const vl = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8"));
  const tu = bib.uebungen.filter(u => u.name === sollU.name), tv = vl.vorlagen.filter(v => v.name === sollV.name);
  if (!tu.length) return h.ergebnis(titel, false, ["Übung nicht in der Bibliothek (Stand vor v833)"]);
  if (tu.length !== 1) probleme.push(`a) Übung ${tu.length}× in der Bibliothek`);
  else if (JSON.stringify(tu[0]) !== JSON.stringify(sollU)) probleme.push("a) Übung weicht vom Paket ab");
  if (tv.length !== 1) probleme.push(`a) Vorlage ${tv.length}× in vorlagen.json`);
  else if (JSON.stringify(tv[0]) !== JSON.stringify(sollV)) probleme.push("a) Vorlage weicht vom Paket ab");
  const rang = x => String(x || "").split("-").map(t => parseInt(t, 10) || 0);
  const mind = (a, b) => { a = rang(a); b = rang(b); for (let i = 0; i < Math.max(a.length, b.length); i++) if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0); return true; };
  if (!mind(bib.stand, "2026-11-15-1")) probleme.push("a) Stand der Bibliothek " + bib.stand);
  if (!mind(vl.stand, "2026-11-15-1")) probleme.push("a) Stand der Vorlagen " + vl.stand);
  const text = JSON.stringify(tu) + JSON.stringify(tv);
  for (const n of h.KINDER) if (text.includes(n)) probleme.push("f) Kindername " + n);
  for (const f of ["technik-parcours.png", "technik-parcours.svg"]) if (!fs.existsSync(path.join(D, f)) || fs.statSync(path.join(D, f)).size < 1000) probleme.push("e) fehlt: " + f);

  const custom = bib.uebungen.map((u, i) => ({ ...u, id: 7000 + i, custom: true }));
  const s = await h.starten({ warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), trainingsformen: custom }) });
  const r = await s.page.evaluate(async ({ uJson, vJson, name }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 60 && !(typeof _eiFormIndex === "function" && _eiFormIndex("Warm up Adler") >= 0); i++) await w(150);
    const spec = JSON.parse(uJson).uebungen[0].skizze;
    const norm = x => JSON.stringify(x, (k, v) => Array.isArray(v) ? (v.length ? v : undefined) : (v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map(q => [q, v[q]])) : v));
    const d = document.createElement("div"); d.innerHTML = _skz(spec);
    let eng = 99; (spec.s || []).forEach((a, i) => spec.s.forEach((b, j) => { if (j > i) eng = Math.min(eng, Math.hypot(a[0] - b[0], a[1] - b[1])); }));
    return { eu: _euPruefung(uJson).fehler, sk: _eiSkizzeFehler(spec), ev: _evPruefung(vJson).fehler,
      saeubern: norm(spec) === norm(skzSpecSaeubern(JSON.parse(JSON.stringify(spec)))),
      bilder: skzBildZahl(spec), vb: d.querySelector("svg").getAttribute("viewBox"), spieler: (spec.s || []).length, eng: Math.round(eng * 10) / 10,
      mat: skzMaterialText(spec), matSchl: skzMaterial(spec).map(x => x.schluessel),
      art: _tpArtVorschlag({ name }), artLabel: (UEBUNG_ART[_tpArtVorschlag({ name })] || {}).kurz,
      betr: (typeof UEBUNG_BETREUUNG_VORSCHLAG !== "undefined" ? UEBUNG_BETREUUNG_VORSCHLAG : {})[name] };
  }, { uJson: JSON.stringify({ schema: bib.schema, uebungen: [tu[0] || sollU] }), vJson: JSON.stringify({ schema: vl.schema, vorlagen: [tv[0] || sollV] }), name: sollU.name }).catch(e => ({ fehler: String(e) }));
  const fe = s.fehler(); await s.schliessen();
  if (r.fehler) return h.ergebnis(titel, false, probleme.concat(["Fehler im Ablauf: " + r.fehler]));
  if (r.eu.length) probleme.push("b) _euPruefung: " + r.eu.join(" | "));
  if (r.sk.length) probleme.push("b) _eiSkizzeFehler: " + r.sk.join(" | "));
  if (r.ev.length) probleme.push("b) _evPruefung: " + r.ev.join(" | "));
  if (!r.saeubern) probleme.push("b) skzSpecSaeubern verändert die Skizze");
  if (r.bilder !== 1 || r.vb !== "0 0 280 180") probleme.push(`c) ${r.bilder} Bilder, Format ${r.vb}`);
  if (r.spieler !== 11 || r.eng < 24) probleme.push(`c) ${r.spieler} Spieler, engster Abstand ${r.eng}`);
  if (r.mat !== "4 Minitore · 12 Hütchen · 8 Bälle" || r.matSchl.includes("trainer")) probleme.push("c) Material: " + r.mat);
  if (r.art !== "uebung" || r.artLabel !== "Übungsform") probleme.push(`d) Übungsart ${r.art} (${r.artLabel})`);
  if (r.betr !== "allein") probleme.push("d) Betreuung " + r.betr);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`Übung und Vorlage wie im Paket · Prüfungen ohne Befund · 1 Bild quer, 11 Spieler, engster Abstand ${r.eng} · ${r.mat} · ${r.artLabel}, läuft allein`);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
