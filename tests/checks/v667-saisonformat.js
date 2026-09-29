/* v667 · Saisonformat: je eine Einheit 3+1 und FUNiño für L1 bis L3, vier neue Übungen, und der
   Block wählt zuerst Einheiten im Saisonformat vor.
   PO 28.09.: „Die Saison spielt nur FUNiño 3 gegen 3 und 3+1 … die Automatik nimmt je Block
   mindestens zwei Einheiten in 3+1/FUNiño.“ Entwurf mit sechs Einheiten und vier Übungen am
   29.09. abgenommen: „Saisonformat ok, bau v667“.
   a) Datei: die vier Übungen und sechs Einheiten stehen drin, kommen durch _euPruefung und
      _evPruefung, jede Einheit 70 Min. mit 38 Min. Spielform, Skalierung 8/10/12/14
   b) Skizzen der vier Übungen rendern dunkel und hell
   c) Block-Editor: mit der Leitfrage sind drei Einheiten vorgewählt, mindestens zwei im
      Saisonformat; der Hinweis sagt es
   d) Gibt es zu einer Leitfrage weniger als zwei, sind alle vorhandenen gewählt und der Hinweis
      sagt, dass es nur eine gibt */
"use strict";
const NEU_U = ["3+1 gegen 3 – Ball halten, der Torwart ist die Rettung", "FUNiño 2 gegen 2 – abschirmen, dann Seite wechseln",
  "Flitzer-Duell – 1 gegen 1 an der Seite, dann aufs Jugendtor", "FUNiño 1 gegen 1 – vorbei, dann das freie Minitor"];
const NEU_V = ["L1-5", "L1-6", "L2-5", "L2-6", "L3-4", "L3-5"];
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");
  const vor = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8"));
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const neuU = (bib.uebungen || []).filter(u => NEU_U.includes(u.name));
  const neuV = (vor.vorlagen || []).filter(v => NEU_V.some(p => String(v.name).startsWith(p + " ")));
  if (neuU.length !== 4) probleme.push(`a) ${neuU.length} der vier Übungen in bibliothek.json`);
  if (neuV.length !== 6) probleme.push(`a) ${neuV.length} der sechs Einheiten in vorlagen.json`);
  neuV.forEach(v => {
    const summe = (v.bloecke || []).reduce((a, b) => a + (Number(b.dauer) || 0), 0);
    if (summe !== 70 || v.netto_spielform_min !== 38) probleme.push(`a) ${v.name}: ${summe} Min., netto ${v.netto_spielform_min}`);
    if (Object.keys(v.skalierung || {}).join("/") !== "8/10/12/14") probleme.push(`a) ${v.name}: Skalierung ${Object.keys(v.skalierung || {}).join("/")}`);
    if (!["3+1", "FUNiño"].includes(v.ordnung)) probleme.push(`a) ${v.name}: Ordnung „${v.ordnung}“`);
  });

  const rows = (vor.vorlagen || []).map((v, i) => ({ ...v, id: 500 + i }));
  const s = await h.starten({ hoehe: 2400, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), trainingsvorlagen: rows, trainingsblock: [],
    trainingsformen: (bib.uebungen || []).map((u, i) => ({ ...u, id: 6000 + i, custom: true })) }) });
  const r = await s.page.evaluate(async ({ bib, vor, NEU_U }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = { fehlt: [] };
    for (const n of ["_euPruefung", "_evPruefung", "_skz", "blockEditorOpen", "blockThemaSetzen", "_tbVorwahl", "_tbSaisonHinweis", "vuThemen"])
      if (typeof window[n] !== "function") out.fehlt.push(n);
    if (out.fehlt.length) return out;
    await loadCustomForms();
    out.fehlerU = _euPruefung(JSON.stringify(bib)).fehler;
    out.fehlerV = _evPruefung(JSON.stringify(vor)).fehler;
    out.skizzen = bib.uebungen.filter(u => NEU_U.includes(u.name)).map(u => {
      try { const d = _skz(u.skizze), l = _skz(u.skizze, { hell: true }); return { name: u.name, ok: /<svg/.test(d) && /<svg/.test(l) }; }
      catch (e) { return { name: u.name, ok: false, fehler: String(e.message || e) }; }
    });
    await vorlagenLaden();
    await blockEditorOpen(); await warte(200);
    out.c = [];
    for (const [i, t] of vuThemen().entries()) {
      blockThemaSetzen(i); await warte(60);
      const wahl = _tbWahlGeordnet();
      out.c.push({ frage: t.frage, wahl, saison: wahl.filter(n => _tbSaison(VORLAGEN.find(v => v.name === n))).length,
        hinweis: (document.getElementById("tb-saison") || {}).textContent || "",
        knopf: !document.getElementById("tb-speichern")?.disabled });
    }
    blockEditorClose();
    // d) nur eine Einheit im Saisonformat
    const echt = VORLAGEN.slice();
    VORLAGEN.length = 0;
    echt.filter(v => /^L1-/.test(v.name) && !/^L1-6 /.test(v.name)).forEach(v => VORLAGEN.push(v));
    const f = echt.find(v => /^L1-1 /.test(v.name)).leitfrage;
    out.d = { wahl: _tbVorwahl(f), hinweis: _tbSaisonHinweis(_tbFolge(f), _tbVorwahl(f)) };
    VORLAGEN.length = 0; echt.forEach(v => VORLAGEN.push(v));
    return out;
  }, { bib, vor, NEU_U });
  const f = s.fehler(); await s.schliessen();
  if (r.fehlt.length) return h.ergebnis("Saisonformat: sechs Einheiten, vier Übungen, Vorwahl im Block", false, [r.fehlt.join(", ") + " fehlt"]);
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  if (r.fehlerU.length) probleme.push("a) _euPruefung: " + r.fehlerU.slice(0, 2).join(" | "));
  if (r.fehlerV.length) probleme.push("a) _evPruefung: " + r.fehlerV.slice(0, 2).join(" | "));
  const skz = r.skizzen.filter(x => !x.ok);
  if (r.skizzen.length !== 4 || skz.length) probleme.push("b) Skizze rendert nicht: " + skz.map(x => x.name + (x.fehler ? " (" + x.fehler + ")" : "")).join(", "));
  if (r.c.length !== 6) probleme.push(`c) ${r.c.length} Themen statt 6`);
  r.c.forEach(x => {
    if (x.wahl.length !== 3 || x.saison < 2) probleme.push(`c) „${x.frage}“: ${x.wahl.length} vorgewählt, ${x.saison} im Saisonformat`);
    if (!/im Saisonformat/.test(x.hinweis)) probleme.push(`c) „${x.frage}“: kein Hinweis`);
    if (!x.knopf) probleme.push(`c) „${x.frage}“: „Block erfassen“ gesperrt trotz Vorwahl`);
  });
  const l1 = r.c.find(x => /Ball, wenn einer kommt/.test(x.frage)) || { wahl: [] };
  if (l1.wahl.map(n => n.slice(0, 4)).join(",") !== "L1-1,L1-5,L1-6") probleme.push(`c) L1 vorgewählt: ${l1.wahl.join(", ")}`);
  if (!/^L1-5 /.test(r.d.wahl[0] || "") || r.d.wahl.length !== 3) probleme.push(`d) Vorwahl bei nur einer: ${r.d.wahl.join(", ")}`);
  if (!/nur eine Einheit/.test(r.d.hinweis)) probleme.push(`d) Hinweis: „${r.d.hinweis.replace(/<[^>]+>/g, "")}“`);
  zeilen.push(`a) 4 Übungen, 6 Einheiten, beide Dateien ohne Befund · b) 4 Skizzen dunkel und hell`);
  zeilen.push("c) " + r.c.map(x => `${x.wahl.map(n => n.slice(0, 4)).join("/")} (${x.saison} Saison)`).join(" · "));
  zeilen.push(`d) nur eine: ${r.d.wahl.map(n => n.slice(0, 4)).join("/")} · „${r.d.hinweis.replace(/<[^>]+>/g, "").trim().slice(0, 90)}“`);
  return h.ergebnis("Saisonformat: sechs Einheiten, vier Übungen, Vorwahl im Block", !probleme.length, probleme.length ? probleme : zeilen);
};
