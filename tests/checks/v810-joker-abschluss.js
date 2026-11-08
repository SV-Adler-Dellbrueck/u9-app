/* v810 · Joker-Duell mit Verteidiger „Hände hinter dem Rücken“ (Projekt-Chat 08.11.2026, Fassung 2) und
   Abschlussturnier/Abschlussspiel nach Spielform und Zahl der Kinder (Charles 08.11.2026).
   a) Übung: Absatz „VERTEIDIGER IN STUFE 1 UND 2“ nach „BALLVERSORGUNG“, Stufe 1/2/3 neu, Fehlerbild, Variante, Skizze Bild 2;
      Stand der Bibliothek erhöht (Abgleich beim Öffnen zieht nach); Schau-Tore unverändert
   b) Regel: FUNiño Turnier ab 9 (sonst Spiel auf Wunsch ab 6), 3+1 Turnier ab 12 oder Spiel ab 8, 4+1 nur Spiel ab 10;
      Trainer zählen mit; Turnier mit so vielen vollen Teams wie möglich
   c) Block: zeigt „Abschlussturnier · 5 Teams“ bei 15 Kindern FUNiño, „Abschlussspiel“ bei 4+1, 3+1 als dritte Form;
      der Blockname wechselt zwischen „Abschlussturnier“ und „Abschlussspiel“, der Rest der Beschriftung bleibt */
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  // a)
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const jd = bib.uebungen.find(u => u.name === "Joker-Duell – anbieten und freilaufen");
  const st = bib.uebungen.find(u => /^Schau-Tore/.test(u.name));
  const ab = jd ? jd.ablauf : "";
  const pa = {
    absatz: /BALLVERSORGUNG:[^\n]*\n\nVERTEIDIGER IN STUFE 1 UND 2: Der Verteidiger hält die Hände hinter dem Rücken und erobert den Ball nicht\./.test(ab),
    vorStufe1: ab.indexOf("VERTEIDIGER IN STUFE 1 UND 2") < ab.indexOf("STUFE 1 – FREI"),
    stufe1: /bis der Ball gespielt ist, und stellen sich dann dem Angreifer in den Weg, ohne den Ball zu erobern\./.test(ab),
    stufe2: /Der Verteidiger hält die Hände hinter dem Rücken, stellt sich vor oder hinter den Angreifer/.test(ab) && !/greift erst ein, wenn der Ball gespielt ist/.test(ab),
    stufe3: /gehen beide Verteidiger zurück auf ihre roten Hütchen und der Joker spielt neu an\. Nach mehreren Durchläufen wechseln die Positionen, es wird rotiert wie in Stufe 1\./.test(ab),
    fehler: /oder nimmt in Stufe 1 und 2 die Hände nach vorn\./.test(ab),
    variante: /stellt sich in Stufe 2 erst nach zwei Sekunden in den Weg/.test(jd ? jd.varianten : ""),
    skizze: JSON.stringify(jd ? jd.skizze : "").includes("Bild 2 – Annahme, Verteidiger stellt zu"),
    stand: bib.stand === "2026-11-08-1",
    schauTore: !!st && !/Hände hinter dem Rücken/.test(st.ablauf)
  };
  if (Object.values(pa).includes(false)) probleme.push("a) Übung: " + JSON.stringify(pa));
  zeilen.push("Joker-Duell: Verteidiger-Absatz, Stufen 1–3, Fehlerbild, Variante, Skizze Bild 2; Schau-Tore unverändert");
  // b, c)
  const datum = h.tagePlus(2), K = h.KINDER;
  const s = await h.starten({ hoehe: 2400, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), termine: [], nominierungen: [], anwesenheit: [], trainingsformen: [], trainingsplan: [], trainingsgruppen: [],
    trainingsturnier: (u, req) => (req.method() !== "GET" ? { status: 201, body: "[]" } : []) }) });
  await h.sichtbarMachen(s.page, "#train-sub-planung");
  await h.terminSetzen(s.page, datum);
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    if (typeof abschlussArt !== "function") return { fehlt: true };
    const art = (sf, n, wu) => { const a = abschlussArt(sf, n, wu); return a.art ? a.art + a.teams : "–"; };
    const out = { regel: {
      f9: art("funino", 9), f8: art("funino", 8), f8s: art("funino", 8, "spiel"), f15: art("funino", 15), f5s: art("funino", 5, "spiel"),
      v13: art("f4", 13), v9: art("f4", 9), d12: art("f3", 12), d12s: art("f3", 12, "spiel"), d8: art("f3", 8), d7: art("f3", 7) } };
    try { localStorage.removeItem("adler_blitz"); } catch (e) {}
    BLZ = null; tpSlots.length = 0;
    [{ label: "Ankommen", dauer: 8, typ: "warmup" }, { label: "Hauptteil", dauer: 20, typ: "main" }, { label: "Abschlussturnier – wer bietet sich an, bevor der Ball kommt?", dauer: 18, typ: "abschluss" }].forEach(x => tpSlots.push(x));
    tpRenderTimeline();
    for (let i = 0; i < 20 && !document.querySelector(".tp-abschluss-teams button"); i++) await w(100);
    const el = () => document.querySelector(".tp-abschluss-teams");
    const artEl = () => document.querySelector(".tp-abschluss-teams .tp-abschluss-art");
    out.formen = [...el().querySelectorAll("button[aria-pressed]")].filter(b => /FUNiño|3\+1|4\+1/.test(b.textContent)).map(b => b.textContent.replace("✓", "").trim());
    out.funino = { art: artEl() && artEl().dataset.art, text: artEl() ? artEl().textContent.replace(/\s+/g, " ") : "" };
    [...el().querySelectorAll("button[aria-pressed]")].find(b => /4\+1/.test(b.textContent)).click(); await w(300);
    out.vier = { art: artEl() && artEl().dataset.art, text: el().textContent.replace(/\s+/g, " "), anzahl: BLZ.anzahl, label: tpSlots[2].label };
    [...el().querySelectorAll("button[aria-pressed]")].find(b => /3\+1/.test(b.textContent)).click(); await w(300);
    out.drei = { art: artEl() && artEl().dataset.art, anzahl: BLZ.anzahl, label: tpSlots[2].label, lieber: !![...el().querySelectorAll("button")].find(b => /Lieber Abschlussspiel/.test(b.textContent)) };
    [...el().querySelectorAll("button")].find(b => /Lieber Abschlussspiel/.test(b.textContent)).click(); await w(300);
    out.dreiSpiel = { art: artEl() && artEl().dataset.art, anzahl: BLZ.anzahl, label: tpSlots[2].label };
    out.kopf = [...document.querySelectorAll(".tp-slot-label")].map(x => x.textContent).join(" | ");
    return out;
  });
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) probleme.push("abschlussArt fehlt");
  else {
    const soll = { f9: "turnier3", f8: "–", f8s: "spiel2", f15: "turnier5", f5s: "–", v13: "spiel2", v9: "–", d12: "turnier3", d12s: "spiel2", d8: "spiel2", d7: "–" };
    if (JSON.stringify(r.regel) !== JSON.stringify(soll)) probleme.push("b) Regel: " + JSON.stringify(r.regel));
    if (r.formen.join("|") !== "FUNiño|3+1|4+1") probleme.push("c) Spielformen: " + r.formen.join("|"));
    if (r.funino.art !== "turnier" || !/Abschlussturnier · 5 Teams à 3/.test(r.funino.text) || !/15 Kinder/.test(r.funino.text)) probleme.push("c) FUNiño 15: " + JSON.stringify(r.funino));
    if (r.vier.art !== "spiel" || !/ein Turnier bräuchte 15 Kinder/.test(r.vier.text) || r.vier.anzahl !== 2 || r.vier.label !== "Abschlussspiel – wer bietet sich an, bevor der Ball kommt?") probleme.push("c) 4+1: " + JSON.stringify(r.vier).slice(0, 300));
    if (r.drei.art !== "turnier" || r.drei.anzahl !== 3 || !/^Abschlussturnier – /.test(r.drei.label) || !r.drei.lieber) probleme.push("c) 3+1: " + JSON.stringify(r.drei));
    if (r.dreiSpiel.art !== "spiel" || r.dreiSpiel.anzahl !== 2 || !/^Abschlussspiel – /.test(r.dreiSpiel.label)) probleme.push("c) 3+1 als Spiel: " + JSON.stringify(r.dreiSpiel));
    if (!/Abschlussspiel/.test(r.kopf)) probleme.push("c) Blockkopf: " + r.kopf);
  }
  zeilen.push("Regel: FUNiño Turnier ab 9, 3+1 Turnier ab 12 oder Spiel ab 8, 4+1 nur Spiel ab 10; Block zeigt Art und Teams, Name wechselt mit");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v810 Joker-Duell Verteidiger, Abschlussturnier oder Abschlussspiel", !probleme.length, probleme.length ? probleme : zeilen);
};
