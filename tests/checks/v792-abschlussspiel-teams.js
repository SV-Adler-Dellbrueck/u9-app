/* v792 · Abschlussspiel im Trainingsplan (Charles 06.11.): „Beim Abschlussspiel brauche ich auch die Möglichkeit auf 4+1
   umzustellen und Teams zu bilden. Teams wenn es passt erstmal aus den Trainingsgruppen übernehmen, aber optional änderbar.“
   a) Der Block zeigt Spielform (FUNiño ✓ / 4+1) und je Trainingsgruppe ein Team mit dem Gruppennamen und seinen Kindern
   b) Beim bloßen Zeichnen wird nichts gespeichert (kein Datenbankeintrag je angesehenem Termin)
   c) 4+1 antippen → Spielform f4, gespeichert; „braucht 5 Kinder je Team“ erscheint nur, wenn ein Team zu klein ist
   d) Kind antippen → ins nächste Team; „Aus Trainingsgruppen“ stellt die Gruppen wieder her
   e) Das Trainingsturnier-Fenster zeigt dieselben Teams und dieselbe Spielform (eine Quelle)
   f) Passen die Gruppen nicht (nur eine Gruppe), mischt die App wie bisher und nennt nicht „Trainingsgruppen“ als Quelle */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const datum = h.tagePlus(2), K = h.KINDER;
  const gruppen = [
    { name: "Blaue Haie", emo: "🔵", kinder: K.slice(0, 8) },
    { name: "Rote Füchse", emo: "🔴", kinder: K.slice(8, 15) }
  ];
  async function lauf(gr) {
    const posts = [];
    const s = await h.starten({ hoehe: 2400, supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(), termine: [], nominierungen: [], anwesenheit: [], trainingsformen: [], trainingsplan: [],
      trainingsgruppen: [{ datum, gruppen: gr, aus_anwesenheit: false }],
      trainingsturnier: (u, req) => { if (req.method() !== "GET") { posts.push(req.method()); return { status: 201, body: "[]" }; } return []; }
    }) });
    await h.sichtbarMachen(s.page, "#train-sub-planung");
    await h.terminSetzen(s.page, datum);
    return { s, posts };
  }
  const { s, posts } = await lauf(gruppen);
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    if (typeof abschlussFuellen !== "function") return { fehlt: true };
    try { localStorage.removeItem("adler_blitz"); } catch (e) {}
    BLZ = null;
    tpSlots.length = 0;
    [{ label: "Ankommen", dauer: 8, typ: "warmup" }, { label: "Hauptteil", dauer: 20, typ: "main" }, { label: "Abschlussspiel", dauer: 20, typ: "abschluss" }].forEach(x => tpSlots.push(x));
    await tgSync(); await w(150);
    tpRenderTimeline();
    for (let i = 0; i < 20 && !document.querySelector(".tp-abschluss-teams button"); i++) await w(100);
    const el = () => document.querySelector(".tp-abschluss-teams");
    const txt = () => (el() ? el().textContent.replace(/\s+/g, " ") : "");
    const out = { vorher: { gespeichert: localStorage.getItem("adler_blitz") }, anzahlBloecke: document.querySelectorAll(".tp-abschluss-teams").length };
    out.erst = { text: txt(), teams: BLZ.teams.map(t => [t.name, t.spieler.length]), quelle: BLZ.quelle, form: BLZ.spielform, gespeichert: localStorage.getItem("adler_blitz") };
    out.chips = [...el().querySelectorAll("button[aria-pressed]")].map(b => [b.textContent.trim(), b.getAttribute("aria-pressed"), Math.round(b.getBoundingClientRect().height)]);
    // c) 4+1
    [...el().querySelectorAll("button[aria-pressed]")].find(b => /4\+1/.test(b.textContent)).click(); await w(120);
    out.vierPlusEins = { form: BLZ.spielform, text: txt(), gespeichert: !!localStorage.getItem("adler_blitz"), warn: /braucht 5 Kinder/.test(txt()) };
    // d) Kind antippen, dann zurück
    const kind = el().querySelector("button[title^='Tippen']"); const kn = kind.textContent.trim();
    kind.click(); await w(100);
    out.verschoben = { teams: BLZ.teams.map(t => [t.name, t.spieler.length]), imZweiten: BLZ.teams[1].spieler.includes(kn) };
    const bg = [...el().querySelectorAll("button")].find(b => /Aus Trainingsgruppen/.test(b.textContent)); out.hatGruppenKnopf = !!bg;
    if (bg) { bg.click(); await w(100); }
    out.zurueck = { teams: BLZ.teams.map(t => [t.name, t.spieler.length]), quelle: BLZ.quelle };
    // e) Fenster
    blitzOpen(20); await w(200);
    const m = document.getElementById("blitz-modal");
    out.fenster = { da: !!m, haie: m && /Blaue Haie/.test(m.textContent), fuechse: m && /Rote Füchse/.test(m.textContent), form: BLZ.spielform };
    m && m.remove();
    return out;
  });
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) return h.ergebnis("v792 Abschlussspiel Teams", false, ["abschlussFuellen fehlt"]);
  const t0 = JSON.stringify([["Blaue Haie", 8], ["Rote Füchse", 7]]);
  if (r.anzahlBloecke !== 1 || !/FUNiño ✓/.test(r.erst.text) || !/4\+1/.test(r.erst.text) || JSON.stringify(r.erst.teams) !== t0 || r.erst.quelle !== "Trainingsgruppen")
    probleme.push("a) " + JSON.stringify(r.erst));
  if (r.chips.length !== 2 || r.chips.some(c => c[2] < 44) || r.chips[0][1] !== "true" || r.chips[1][1] !== "false") probleme.push("a) Kacheln: " + JSON.stringify(r.chips));
  zeilen.push("a) Block: FUNiño ✓ / 4+1 · Teams „Blaue Haie“ (8) und „Rote Füchse“ (7) aus den Trainingsgruppen · Kacheln ≥ 44 px");
  if (r.vorher.gespeichert !== null || r.erst.gespeichert !== null || posts.length > 0) probleme.push("b) beim Zeichnen gespeichert: " + JSON.stringify({ lokal: r.erst.gespeichert, posts }));
  zeilen.push("b) Beim Zeichnen nichts gespeichert (kein lokaler Stand, kein Schreibzugriff)");
  if (r.vierPlusEins.form !== "f4" || !/4\+1 ✓/.test(r.vierPlusEins.text) || !r.vierPlusEins.gespeichert || r.vierPlusEins.warn) probleme.push("c) " + JSON.stringify(r.vierPlusEins));
  zeilen.push("c) 4+1 gewählt (f4), gespeichert, 8 und 7 Kinder reichen (keine Warnung)");
  if (JSON.stringify(r.verschoben.teams) !== JSON.stringify([["Blaue Haie", 7], ["Rote Füchse", 8]]) || !r.verschoben.imZweiten || !r.hatGruppenKnopf || JSON.stringify(r.zurueck.teams) !== t0 || r.zurueck.quelle !== "Trainingsgruppen")
    probleme.push("d) " + JSON.stringify({ v: r.verschoben, k: r.hatGruppenKnopf, z: r.zurueck }));
  zeilen.push("d) Kind antippen → 7/8, „Aus Trainingsgruppen“ → wieder 8/7");
  if (!r.fenster.da || !r.fenster.haie || !r.fenster.fuechse || r.fenster.form !== "f4") probleme.push("e) " + JSON.stringify(r.fenster));
  zeilen.push("e) Trainingsturnier-Fenster zeigt dieselben Teams und 4+1");

  // f) Gruppen passen nicht: nur eine Gruppe
  const z = await lauf([{ name: "Blaue Haie", emo: "🔵", kinder: K.slice(0, 15) }]);
  const r2 = await z.s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    try { localStorage.removeItem("adler_blitz"); } catch (e) {}
    BLZ = null; tpSlots.length = 0;
    [{ label: "Hauptteil", dauer: 20, typ: "main" }, { label: "Abschlussspiel", dauer: 20, typ: "abschluss" }].forEach(x => tpSlots.push(x));
    await tgSync(); await w(150); tpRenderTimeline();
    for (let i = 0; i < 20 && !document.querySelector(".tp-abschluss-teams button"); i++) await w(100);
    return { teams: BLZ.teams.map(t => t.spieler.length), quelle: BLZ.quelle, knopf: [...document.querySelectorAll(".tp-abschluss-teams button")].some(b => /Aus Trainingsgruppen/.test(b.textContent)) };
  });
  const fe2 = z.s.fehler(); await z.s.schliessen();
  if (r2.teams.length !== 2 || r2.quelle === "Trainingsgruppen" || r2.knopf || r2.teams.reduce((a, b) => a + b, 0) !== 15) probleme.push("f) " + JSON.stringify(r2));
  zeilen.push(`f) Eine Gruppe → gemischt in 2 Teams (${r2.teams.join("/")}), Quelle „${r2.quelle}“, kein Gruppen-Knopf`);
  const alle = fe.concat(fe2);
  if (alle.length) probleme.push("Konsole: " + alle.slice(0, 2).join(" | "));
  return h.ergebnis("v792 Abschlussspiel: Spielform und Teams im Block", !probleme.length, probleme.length ? probleme : zeilen);
};
