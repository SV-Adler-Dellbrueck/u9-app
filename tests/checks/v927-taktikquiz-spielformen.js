/* v927 · Taktik-Quiz in den Spielformen der U9 (Auftragspaket doku/auftrag-taktikquiz-3plus1-funino, Charles 21.11.2026).

   Die U9 spielt laut Kreis Köln 3 gegen 3 auf Minitore (FUNiño) und 3+1 gegen 3+1; 4+1 ist die Spielform der
   E-Jugend. Bis v926 gab es nur 4+1-Szenarien auf einem Großfeld mit Strafraum. Geprüft werden die Abnahmekriterien:
   a) 120 Szenarien; in der Blockübersicht stehen „3+1 – Raute ohne Aufpasser“ und „FUNiño – Dreieck ohne Jäger“ oben
      unter „So spielen wir“, darunter die zehn 4+1-Blöcke.
   b) Feld je Spielform: 3+1 und 4+1 mit Jugendtoren und Mittellinie, ohne Strafraum/Mittelkreis; FUNiño mit vier
      Minitoren und zwei gestrichelten Schusszonen. Nach „Beenden“ ist das Feld wieder das des Taktikboards.
   c) Gespeicherter Fortschritt am Blockindex bleibt: „Grundlagen der Raute 8/10“ zeigt 🥈 und den Sticker.
   d) Ergebnis nach einem 3+1-Block nennt das 3+1 (Text ab 80 %); 7 von 10 ergibt 🥈 wie bisher; 0 von 10 keine Medaille.
   e) Lösungskreise bei 360 px: Schrift ≥ 11,5 px.
   f) Szenario 55 gibt ohne Zug keinen Punkt, Szenario 79 legt das Ziel an den Ball, nicht auf den Gegner.
   g) FORMATIONS['3+1'] = Torwart, zwei Flitzer, Jäger – kein Aufpasser; das Taktikbrett stellt es ohne Fehler auf. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ start: "/kinder/index.html?quiz", breite: 360, warten: 2500 });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const out = {};
    if (typeof tqStartBlock !== "function" || typeof TQ_SCENARIOS === "undefined") return { fehlt: "tqStartBlock" };
    out.anzahl = TQ_SCENARIOS.length;
    // c) Fortschritt vorab im Gerät
    localStorage.setItem("adler_quiz_progress", JSON.stringify({ "Kind A": { 0: { score: 8, total: 10, date: "2026-11-01" } } }));
    tqPlayer = "Kind A";
    tqBlocksShow(); await w(50);
    const panel = document.getElementById("tq-panel");
    out.gruppen = [...panel.querySelectorAll(".tq-gruppe")].map(x => x.textContent.trim());
    const karten = [...panel.querySelectorAll("#tq-blocks-grid [onclick^='tqStartBlock']")].map(x => x.textContent.replace(/\s+/g, " ").trim());
    out.ersteKarten = karten.slice(0, 3);
    out.kartenZahl = karten.length;
    out.raute = karten.find(t => /Grundlagen der Raute/.test(t)) || "";
    out.sticker = panel.textContent.match(/Sticker-Heft \((\d+)\/(\d+)\)/);
    out.sticker = out.sticker ? out.sticker[1] + "/" + out.sticker[2] : "";
    // b) Felder
    const svg = document.querySelector("#taktik-field > svg");
    out.svgDa = !!svg;
    const orig = svg ? svg.innerHTML : "";
    const feld = () => ({
      feld: svg.dataset.feld || "",
      kreise: svg.querySelectorAll("circle").length,
      tore: [...svg.querySelectorAll("rect")].filter(x => Number(x.getAttribute("height")) <= 8).map(x => Number(x.getAttribute("width"))),
      strich: svg.querySelectorAll("line[stroke-dasharray]").length,
      linien: svg.querySelectorAll("line").length
    });
    const blockNr = name => TQ_BLOCKS.findIndex(b => b.name === name);
    out.b31 = blockNr("3+1 – Raute ohne Aufpasser"); out.bFun = blockNr("FUNiño – Dreieck ohne Jäger");
    tqStartBlock(out.b31); await w(30); out.f31 = feld(); out.n31 = tqScenarios.length; out.feld31 = tqScenarios.every(x => x.feld === "3+1");
    // e) Lösungskreise
    tqShowSolution(tqScenarios[0]);
    out.loesSchrift = [...document.querySelectorAll("#taktik-tokens .tq-loes-text")].map(x => parseFloat(getComputedStyle(x).fontSize));
    // d) Ergebnis 3+1, 7 von 10
    tqScore = 7; tqTotal = 10; tqShowResult(); await w(20);
    out.ergebnis7 = (document.getElementById("tq-result-panel") || {}).textContent || "";
    tqScore = 8; tqTotal = 10; tqShowResult(); await w(20);   // „… versteht …“ steht ab 80 %
    out.ergebnis = (document.getElementById("tq-result-panel") || {}).textContent || "";
    tqStop(); await w(20);
    out.zurueck = svg.innerHTML === orig;
    tqStartBlock(out.bFun); await w(30); out.fFun = feld(); out.feldFun = tqScenarios.every(x => x.feld === "funino");
    tqScore = 0; tqTotal = 10; tqShowResult(); await w(20);
    out.ergebnisFun = (document.getElementById("tq-result-panel") || {}).textContent || "";
    tqStop(); await w(20);
    tqStartBlock(0); await w(30); out.f41 = feld(); out.erstes41 = tqScenarios[0].title;
    tqStop(); await w(20);
    out.zurueck2 = svg.innerHTML === orig;
    // f) 55 und 79
    const s55 = TQ_SCENARIOS[54], s79 = TQ_SCENARIOS[78];
    const j = s55.start.find(x => x.role === "Jäger"), t55 = s55.targets["Jäger"];
    out.s55 = { titel: s55.title, abstand: Math.round(Math.hypot(j.x - t55.x, j.y - t55.y)), r: t55.r };
    const t79 = s79.targets["Flitzer L"], g = s79.opps[0], b = s79.ball.to;
    out.s79 = { titel: s79.title, zumGegner: Math.round(Math.hypot(t79.x - g.x, t79.y - g.y) * 10) / 10, zumBall: Math.round(Math.hypot(t79.x - b.x, t79.y - b.y) * 10) / 10 };
    // g) Formation
    out.form31 = (FORMATIONS["3+1"].slots || []).map(x => x.role + ":" + x.rk);
    return out;
  });
  const fe = s.fehler();
  await s.schliessen();
  if (r.fehlt) return h.ergebnis("v927 Taktik-Quiz in den Spielformen der U9", false, [r.fehlt + " fehlt"]);

  // a)
  if (r.anzahl !== 120) probleme.push(`a) ${r.anzahl} Szenarien statt 120`);
  if (String(r.gruppen) !== "So spielen wir,4+1 – mit Aufpasser und Jäger") probleme.push(`a) Gruppen in der Übersicht: ${JSON.stringify(r.gruppen)}`);
  if (!/^3\+1 – Raute ohne Aufpasser/.test(r.ersteKarten[0] || "") || !/^FUNiño – Dreieck ohne Jäger/.test(r.ersteKarten[1] || "") || !/^Grundlagen der Raute/.test(r.ersteKarten[2] || ""))
    probleme.push(`a) Reihenfolge der Blöcke: ${JSON.stringify(r.ersteKarten)}`);
  if (r.kartenZahl !== 12) probleme.push(`a) ${r.kartenZahl} Blockkarten statt 12`);
  // c)
  if (!/🥈/.test(r.raute) || !/8\/10/.test(r.raute)) probleme.push(`c) Gespeicherter Stand „Grundlagen der Raute 8/10“ erscheint als „${r.raute}“`);
  if (r.sticker !== "1/12") probleme.push(`c) Sticker-Heft zeigt ${r.sticker || "nichts"} statt 1/12`);
  // b)
  if (!r.svgDa) probleme.push("b) #taktik-field hat kein SVG");
  else {
    const jugend = f => f.kreise === 0 && f.tore.length === 2 && f.tore.every(x => Math.abs(x - 71) < 1) && f.strich === 0;
    if (r.n31 !== 10 || !r.feld31) probleme.push(`b) 3+1-Block hat ${r.n31} Szenarien, alle mit feld 3+1: ${r.feld31}`);
    if (r.f31.feld !== "3+1" || !jugend(r.f31)) probleme.push(`b) 3+1-Feld: ${JSON.stringify(r.f31)} – erwartet zwei Jugendtore (71 von 284 = 25 %), keine Kreise`);
    if (r.fFun.feld !== "funino" || r.fFun.tore.length !== 4 || r.fFun.strich !== 2 || r.fFun.kreise !== 0 || !r.feldFun) probleme.push(`b) FUNiño-Feld: ${JSON.stringify(r.fFun)} – erwartet vier Minitore und zwei gestrichelte Schusszonen`);
    if (r.f41.feld !== "4+1" || !jugend(r.f41)) probleme.push(`b) 4+1-Feld („${r.erstes41}“): ${JSON.stringify(r.f41)} – erwartet Jugendtore ohne Strafraum`);
    if (!r.zurueck || !r.zurueck2) probleme.push("b) Nach „Beenden“ ist das Feld nicht wieder das des Taktikboards");
  }
  // d)
  if (!/versteht das 3\+1/.test(r.ergebnis) || /Raute/.test(r.ergebnis)) probleme.push(`d) Ergebnis nach 3+1: „${r.ergebnis.replace(/\s+/g, " ").slice(0, 120)}“`);
  if (!/🥈/.test(r.ergebnis7)) probleme.push("d) 7 von 10 ergibt nicht 🥈");
  if (/🥇|🥈|🥉/.test(r.ergebnisFun) || !/0 von 10/.test(r.ergebnisFun)) probleme.push(`d) 0 von 10 im FUNiño: „${r.ergebnisFun.replace(/\s+/g, " ").slice(0, 120)}“`);
  // e)
  if (!r.loesSchrift.length) probleme.push("e) Lösungskreise ohne Beschriftung");
  else if (Math.min(...r.loesSchrift) < 11.5) probleme.push(`e) Beschriftung der Lösungskreise ${Math.min(...r.loesSchrift)} px – Untergrenze 11,5`);
  // f)
  if (r.s55.abstand <= r.s55.r) probleme.push(`f) „${r.s55.titel}“: Jäger startet ${r.s55.abstand} vom Ziel (Radius ${r.s55.r}) – Punkt ohne Zug`);
  if (r.s79.zumGegner < 7 || r.s79.zumBall >= r.s79.zumGegner) probleme.push(`f) „${r.s79.titel}“: Ziel ${r.s79.zumGegner} vom Gegner, ${r.s79.zumBall} vom Ball`);
  // g)
  if (String(r.form31) !== "TW:tw,Flitzer L:flitzer_l,Flitzer R:flitzer_r,Jäger:jaeger") probleme.push(`g) FORMATIONS['3+1'] = ${r.form31}`);
  if (fe.length) probleme.push("Konsole (Kinder): " + fe.slice(0, 2).join(" | "));

  // g) Taktikbrett im Trainer-Einstieg: 3+1 aufstellen
  const t = await h.starten({ warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const rb = await t.page.evaluate(async () => {
    for (let i = 0; i < 40 && typeof _brGrundstellung !== "function"; i++) await new Promise(x => setTimeout(x, 100));
    if (typeof _brGrundstellung !== "function") return { fehlt: "_brGrundstellung" };
    try {
      const g = _brGrundstellung("3+1");
      const sz = _brFeld("funino").li.filter(l => l[4] === "sz").map(l => l[1]);
      return { wir: g.toks.filter(x => x.t === "wir" || x.t === "tw").map(x => x.k), sz };
    } catch (e) { return { fehler: String(e && e.message || e) }; }
  });
  const fe2 = t.fehler();
  await t.schliessen();
  if (rb.fehlt) probleme.push("g) " + rb.fehlt + " fehlt im Trainer-Einstieg");
  else if (rb.fehler) probleme.push("g) Taktikbrett 3+1 bricht ab: " + rb.fehler);
  else {
    if (rb.wir.length !== 4) probleme.push(`g) Taktikbrett 3+1 stellt ${rb.wir.length} Steine auf: ${rb.wir}`);
    if (String(rb.sz) !== "80,200") probleme.push(`Taktikbrett FUNiño: Schusszone bei y ${rb.sz} statt 80/200 (24/76 %)`);
  }
  if (fe2.length) probleme.push("Konsole (Trainer): " + fe2.slice(0, 2).join(" | "));

  if (!probleme.length) zeilen.push(`${r.anzahl} Szenarien · oben „So spielen wir“ (3+1, FUNiño) · Felder: 3+1 ${r.f31.tore.length} Jugendtore, FUNiño ${r.fFun.tore.length} Minitore + ${r.fFun.strich} Schusszonen, 4+1 ohne Strafraum · Feld nach Beenden zurück · Raute 8/10 → 🥈, Sticker 1/12 · Lösungsschrift ${Math.min(...r.loesSchrift)} px · Brett 3+1: ${rb.wir.join(" ")}`);
  return h.ergebnis("v927 Taktik-Quiz in den Spielformen der U9: Blöcke, Feld, Ergebnis, 3+1-Formation", !probleme.length, zeilen.concat(probleme));
};
