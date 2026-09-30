/* v700 · Lehrgang 5.2 (Korb-Chaos-Funino) und Einheit „Endzone und Fähnchen“ (L5-7)
   Zwei Auftragspakete aus dem Projekt-Chat (doku/auftrag-lehrgang-5-2, doku/auftrag-endzone-faehnchen).
   PO 30.09. per Kacheln: Zeile 64 wird Import (eine Zeile je Name), Wurfspiele über ein Merkmal
   in der Skizze, neue Ordnung „Endzone (4 gegen 4)“, Leitfrage 5 im neuen Wortlaut.
   a) Bibliothek und Vorlagen: je Name genau ein Eintrag, zeichengleich mit dem Nachtrag (wie v583)
   b) Korb-Chaos: Skizze ohne Beanstandung, Material „5 Minitore · 20 Hütchen · 1 Ball · 1 Balldepot“,
      Legende „Zuwurf“ und „Torwurf“ statt Pass und Schuss; das Merkmal übersteht das Säubern
   c) Endzone: Skizze ohne Beanstandung, drei Bilder, gleiche Spieler in jedem Bild, „8 Hütchen“
   d) L5-7 besteht die Vorlagenprüfung (Ordnung „Endzone (4 gegen 4)“), Leitfrage 5 im neuen Wortlaut
   e) Editor: Schalter „Wurfspiel“ benennt die Kacheln Pass/Schuss um und schaltet zurück
   f) Abgleich: Zeile mit Vermerk „Import“ wird auf den Nachtrag gezogen, „Eigene Übung“ nie
   g) Übungsart „spiel“ für beide, Betreuung: Korb „Trainer am Feld“, Endzone „läuft allein“ */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const lies = f => JSON.parse(fs.readFileSync(path.join(h.REPO, f), "utf8"));
  const bib = lies("uebungen/bibliothek.json"), vor = lies("uebungen/vorlagen.json");
  const korbN = lies("doku/auftrag-lehrgang-5-2/nachtrag.json").uebungen[0];
  const endN = lies("doku/auftrag-endzone-faehnchen/nachtrag-uebung-endzone-faehnchen.json").uebungen[0];
  const l57N = lies("doku/auftrag-endzone-faehnchen/nachtrag-vorlage-l5-7.json").vorlagen[0];
  // a)
  for (const [n, liste] of [[korbN, bib.uebungen], [endN, bib.uebungen], [l57N, vor.vorlagen]]) {
    const t = liste.filter(x => x.name === n.name);
    if (t.length !== 1) probleme.push(`a) „${n.name}“ ${t.length}× statt einmal`);
    else if (JSON.stringify(t[0]) !== JSON.stringify(n)) probleme.push(`a) „${n.name}“ weicht vom Nachtrag ab`);
  }
  if (korbN.skizze.wurf !== true) probleme.push("a) Nachtrag 5.2 ohne Merkmal „wurf“");
  const s = await h.starten({ breite: 1200, hoehe: 900, warten: 2500 });
  await h.sichtbarMachen(s.page, "#main-app");
  const r = await s.page.evaluate(async ({ korb, end, l57 }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 50 && typeof skzEditorOpen !== "function"; i++) await w(100);
    const out = {}, txt = x => String(x || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    // b)
    out.korb = { fehler: _eiSkizzeFehler(korb.skizze), mat: skzMaterialText(korb.skizze), leg: txt(skzLegende(false, korb.skizze)),
      saeubern: (skzSpecSaeubern(korb.skizze) || {}).wurf === true, falsch: _eiSkizzeFehler({ wurf: "ja" }).join(" ") };
    // c)
    const n = skzBildZahl(end.skizze), spieler = [];
    for (let i = 0; i < n; i++) spieler.push((_skzBild(end.skizze, i).s || []).map(x => x[2] + (x[3] || "")).join(","));
    out.end = { fehler: _eiSkizzeFehler(end.skizze), mat: skzMaterialText(end.skizze), bilder: n, gleich: spieler.every(x => x === spieler[0]),
      leg: txt(skzLegende(false, end.skizze)) };
    // d)
    CUSTOM_FORMS = [...CUSTOM_FORMS, { id: 901, name: "Warm up Adler", kat: "aufwaermen", tags: "Import" }, { id: 902, name: "Endzone und Fähnchen", kat: "wahrnehmung", tags: "Import" }];
    const pv = _evPruefung(JSON.stringify({ schema: "adler-vorlagen/1", vorlagen: [l57] }));
    out.l57 = { fehler: pv.fehler, ordnung: EI_ORDNUNGEN.includes("Endzone (4 gegen 4)") };
    // e)
    skzEditorOpen(JSON.parse(JSON.stringify(korb.skizze)), () => {}); await w(400);
    const lbl = id => (document.querySelector(`[data-werk="${id}"] .skz-werk-lbl`) || {}).textContent;
    out.ed = { an: [lbl("pass"), lbl("schuss")], knopf: document.getElementById("skz-wurf")?.getAttribute("aria-pressed"),
      h: Math.round(document.getElementById("skz-wurf")?.getBoundingClientRect().height || 0) };
    skzWurfUm(); await w(100);
    out.ed.aus = [lbl("pass"), lbl("schuss")]; out.ed.knopfAus = document.getElementById("skz-wurf")?.getAttribute("aria-pressed");
    // f)
    const patches = []; const f0 = window.fetch;
    window.fetch = async (u, o) => { if (o && o.method === "PATCH") patches.push(String(u)); return new Response("[]", { status: 200 }); };
    const alt = { ...korb, ablauf: "alter Text" };
    CUSTOM_FORMS = [{ id: 64, ...alt, tags: "Import", custom: true }];
    const e1 = await _euNachziehen([{ ...korb, neu: false }]);
    CUSTOM_FORMS = [{ id: 64, ...alt, tags: "Eigene Übung", custom: true }];
    const e2 = await _euNachziehen([{ ...korb, neu: false }]);
    window.fetch = f0;
    out.abgleich = { importGezogen: e1.aktualisiert, patch: patches[0] || "", eigeneBelassen: e2.belassen, patches: patches.length };
    // g)
    out.art = [UEBUNG_ART_VORSCHLAG[korb.name], UEBUNG_ART_VORSCHLAG[end.name]];
    out.betreuung = [UEBUNG_BETREUUNG_VORSCHLAG[korb.name], UEBUNG_BETREUUNG_VORSCHLAG[end.name]];
    return out;
  }, { korb: korbN, end: endN, l57: l57N });
  const f = s.fehler(); await s.schliessen();
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  if (r.korb.fehler.length) probleme.push(`b) Korb-Skizze: ${r.korb.fehler.join("; ")}`);
  if (r.korb.mat !== "5 Minitore · 20 Hütchen · 1 Ball · 1 Balldepot") probleme.push(`b) Material „${r.korb.mat}“`);
  if (!/Zuwurf/.test(r.korb.leg) || !/Torwurf/.test(r.korb.leg) || /\bPass\b|\bSchuss\b/.test(r.korb.leg)) probleme.push(`b) Legende „${r.korb.leg.trim()}“`);
  if (!r.korb.saeubern) probleme.push("b) Säubern verliert „wurf“");
  if (!/Ja\/Nein/.test(r.korb.falsch)) probleme.push("b) „wurf“ als Text wird nicht beanstandet");
  if (r.end.fehler.length || r.end.bilder !== 3 || !r.end.gleich || !/^8 Hütchen/.test(r.end.mat)) probleme.push(`c) Endzone: ${JSON.stringify({ ...r.end, leg: undefined })}`);
  if (!/Pass/.test(r.end.leg) || /Zuwurf/.test(r.end.leg)) probleme.push(`c) Endzone-Legende „${r.end.leg.trim()}“`);
  if (r.l57.fehler.length || !r.l57.ordnung) probleme.push(`d) L5-7: ${r.l57.fehler.join(" | ")}`);
  if (l57N.leitfrage !== "Wo stehe ich, wenn wir den Ball haben – und wo, wenn nicht?") probleme.push(`d) Leitfrage L5-7 „${l57N.leitfrage}“`);
  if (JSON.stringify(r.ed.an) !== JSON.stringify(["Zuwurf", "Torwurf"]) || r.ed.knopf !== "true" || r.ed.h < 44) probleme.push(`e) Editor an: ${JSON.stringify(r.ed)}`);
  if (JSON.stringify(r.ed.aus) !== JSON.stringify(["Pass", "Schuss"]) || r.ed.knopfAus !== "false") probleme.push(`e) Editor aus: ${JSON.stringify(r.ed)}`);
  if (r.abgleich.importGezogen !== 1 || !/trainingsformen\?id=in\.\(64\)&tags=eq\.Import/.test(r.abgleich.patch) || r.abgleich.eigeneBelassen !== 1 || r.abgleich.patches !== 1) probleme.push(`f) Abgleich: ${JSON.stringify(r.abgleich)}`);
  if (JSON.stringify(r.art) !== JSON.stringify(["spiel", "spiel"]) || JSON.stringify(r.betreuung) !== JSON.stringify(["feld", "allein"])) probleme.push(`g) Art ${r.art} · Betreuung ${r.betreuung}`);
  zeilen.push(`Korb-Chaos: ${r.korb.mat} · Legende „${r.korb.leg.trim()}“`);
  zeilen.push(`Endzone: ${r.end.bilder} Bilder, gleiche Spieler ${r.end.gleich} · ${r.end.mat} · L5-7 ohne Befund ${!r.l57.fehler.length}`);
  zeilen.push(`Editor: ${r.ed.an.join("/")} → ${r.ed.aus.join("/")} · Abgleich: Import gezogen ${r.abgleich.importGezogen}, eigene belassen ${r.abgleich.eigeneBelassen}`);
  return h.ergebnis("Lehrgang 5.2 und Endzone und Fähnchen: aufgenommen, Wurfspiel-Legende, L5-7", !probleme.length, zeilen.concat(probleme));
};
