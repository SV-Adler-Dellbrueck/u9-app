/* v666 · Training: überall „alle außer Absagen“, ein Knopf für Betreuung, kein Scrollsprung
   PO 29.09. (drei Bildschirmfotos zum Fr 02.10.): „Es sind an verschiedenen Stellen
   unterschiedliche Angaben. Einmal 4 Spieler, in der Übersicht keiner und bei Diese Woche 14.“
   a) Trainingsplan: vor der Anwesenheit bilden alle außer den Absagen den Pool – nicht nur
      die ausdrücklichen Zusagen; die Zusagen bleiben als Zahl sichtbar
   b) Anwesenheit: ist für das Training noch nichts gespeichert, sind alle außer den Absagen
      vorbelegt, mit Hinweis „noch nicht gespeichert“ und dem Wort „abgesagt“ am Kind
   PO 29.09. (zwei Bildschirmfotos): „Ich bleibe vor: die Kachel zum Anklicken braucht den
   Vornamen des eigenen Kindes nicht. Es ist ja der Zugang des Elternteils. Auch der Hinweis
   darunter ‚Hier steht dein Vorname aus Meine Angaben‘ kann weg. Wenn ich bei den kommenden
   Terminen auf den Daumen klicke, dann rutscht das Bild ein Stück runter.“
   c) Betreuung: genau ein Knopf ohne Kindernamen, kein Vornamen-Hinweis
   d) Scroll-Anker: wächst Inhalt oberhalb der Termin-Leiste, bleibt sie an ihrer Stelle */
"use strict";
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const datum = h.tagePlus(3);

  // ── a) und b) im Trainerbereich ──────────────────────────────────────────
  const s = await h.starten({ hoehe: 2400, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  await h.sichtbarMachen(s.page, "#tp-timeline");
  const r = await s.page.evaluate(async ({ K, datum }) => {
    const out = { fehlt: [] };
    for (const n of ["_tgPool", "tpPrognoseLoad", "awRenderList"]) if (typeof window[n] !== "function") out.fehlt.push(n);
    if (out.fehlt.length) return out;
    await loadKader();
    const feld = document.getElementById("tp-date");
    if (feld && ![...feld.options].some(o => o.value === datum)) feld.add(new Option(datum, datum));
    if (feld) feld.value = datum;
    window.AW_DATA = {};
    TP_KIND_RSVP = K.slice(0, 4); TP_KIND_ABSAGE = [K[4]];
    const p = _tgPool();
    out.a = { quelle: p.quelle, n: p.namen.length, absageDrin: p.namen.includes(K[4]) };
    if (!document.getElementById("tp-prognose")) { const d = document.createElement("div"); d.id = "tp-prognose"; document.body.appendChild(d); }
    await tpPrognoseLoad();
    out.a.text = (document.getElementById("tp-prognose")?.textContent || "").replace(/\s+/g, " ").trim();

    // b) Anwesenheit vorbelegt
    let sel = document.getElementById("aw-date");
    if (!sel) { sel = document.createElement("select"); sel.id = "aw-date"; document.body.appendChild(sel); }
    if (![...sel.options].some(o => o.value === datum)) sel.add(new Option(datum, datum));
    sel.value = datum;
    let liste = document.getElementById("aw-list");
    if (!liste) { liste = document.createElement("div"); liste.id = "aw-list"; document.body.appendChild(liste); }
    window._awVorab = {}; _awVorab[datum] = { absage: new Set([K[4]]) };
    awRenderList();
    const kacheln = [...liste.querySelectorAll(".aw-tile")];
    const ab = kacheln.find(b => b.dataset.player === K[4]);
    out.b = { an: kacheln.filter(b => b.classList.contains("on")).length, gesamt: kacheln.length,
      abAus: ab ? !ab.classList.contains("on") : false, abText: ab ? /abgesagt/.test(ab.textContent) : false,
      hinweis: !!document.getElementById("aw-vorab-hinweis") };
    // gespeicherte Anwesenheit schlägt die Vorbelegung
    AW_DATA[datum] = { _trainers: [] }; AW_DATA[datum][K[0]] = { da: true, qual: 0 };
    awRenderList();
    out.b.gespeichert = { an: liste.querySelectorAll(".aw-tile.on").length, hinweis: !!document.getElementById("aw-vorab-hinweis") };
    return out;
  }, { K, datum });
  const f1 = s.fehler(); await s.schliessen();
  if (r.fehlt.length) return h.ergebnis("Training: alle außer Absagen", false, [r.fehlt.join(", ") + " fehlt"]);
  if (f1.length) probleme.push("Konsole Trainer: " + f1.slice(0, 2).join(" | "));
  if (r.a.quelle !== "vorab") probleme.push(`a) Quelle „${r.a.quelle}“ – erwartet „vorab“`);
  if (r.a.n !== 14) probleme.push(`a) Pool ${r.a.n} Kinder – erwartet 14 (alle außer der einen Absage)`);
  if (r.a.absageDrin) probleme.push("a) Die Absage steht im Pool");
  if (!/14 dabei · 1 abgesagt/.test(r.a.text)) probleme.push(`a) Prognose „${r.a.text}“`);
  if (!/4 ausdrücklich zugesagt/.test(r.a.text)) probleme.push("a) Die Zahl der Zusagen fehlt in der Prognose");
  if (r.b.an !== 14 || r.b.gesamt !== 15) probleme.push(`b) ${r.b.an} von ${r.b.gesamt} vorbelegt – erwartet 14 von 15`);
  if (!r.b.abAus) probleme.push("b) Das abgesagte Kind ist vorbelegt");
  if (!r.b.abText) probleme.push("b) „abgesagt“ fehlt an der Kachel");
  if (!r.b.hinweis) probleme.push("b) Hinweis „noch nicht gespeichert“ fehlt");
  if (r.b.gespeichert.an !== 1 || r.b.gespeichert.hinweis) probleme.push(`b) Gespeicherte Anwesenheit wird überschrieben (${r.b.gespeichert.an} an, Hinweis ${r.b.gespeichert.hinweis})`);
  zeilen.push(`a) Pool ${r.a.n} (${r.a.quelle}) · „${r.a.text.slice(0, 80)}“`);
  zeilen.push(`b) vorbelegt ${r.b.an}/${r.b.gesamt}, Absage aus ${r.b.abAus}, Hinweis ${r.b.hinweis} · nach Speichern ${r.b.gespeichert.an} an`);

  // ── c) und d) im Elternbereich ───────────────────────────────────────────
  const s2 = await h.starten({ start: "/eltern/index.html", warten: 1000, hoehe: 800,
    supabase: h.supabaseAttrappe({ betreuung: [], rpc: { betreuung_board: [{ name: "Elternteil X" }] } }) });
  const e = await s2.page.evaluate(async ({ K }) => {
    const out = { fehlt: [] };
    for (const n of ["elternBetreuungLoad", "betreuungKnopf", "_epAnkerMerken", "_epAnkerHalten"]) if (typeof window[n] !== "function") out.fehlt.push(n);
    if (out.fehlt.length) return out;
    const box = document.createElement("div"); box.id = "betreuung-card"; document.body.appendChild(box);
    await elternBetreuungLoad(77, [{ spieler_id: 1, name: K[0] }, { spieler_id: 2, name: K[1] }]);
    const knoepfe = box.querySelectorAll("button");
    const k = document.getElementById("betreuung-knopf");
    out.c = { knoepfe: knoepfe.length, text: k ? k.textContent.trim() : "", hoehe: k ? Math.round(k.getBoundingClientRect().height) : 0,
      name: K.slice(0, 2).some(n => box.textContent.includes(n)), hinweis: /Hier steht dein Vorname/.test(box.textContent) };
    box.remove();

    // d) Anker
    const wurzel = document.createElement("div");
    wurzel.innerHTML = `<div id="oben" style="height:300px"></div><div data-scrollkeep="termine" style="height:120px"></div><div style="height:3000px"></div>`;
    document.body.appendChild(wurzel);
    const sc = document.scrollingElement || document.documentElement;
    const leiste = wurzel.querySelector('[data-scrollkeep="termine"]');
    sc.scrollTop = leiste.getBoundingClientRect().top + sc.scrollTop - 200;
    await new Promise(x => setTimeout(x, 50));
    const vor = _epAnkerMerken(wurzel);
    out.d = { vorTop: vor ? Math.round(vor.top) : null };
    document.getElementById("oben").style.height = "520px";    // Inhalt darüber wächst
    _epAnkerHalten(vor, wurzel);
    await new Promise(x => setTimeout(x, 150));
    out.d.nachTop = Math.round(leiste.getBoundingClientRect().top);
    return out;
  }, { K });
  const f2 = s2.fehler(); await s2.schliessen();
  if (e.fehlt.length) return h.ergebnis("Training: alle außer Absagen", false, [e.fehlt.join(", ") + " fehlt"]);
  if (f2.length) probleme.push("Konsole Eltern: " + f2.slice(0, 2).join(" | "));
  if (e.c.knoepfe !== 1) probleme.push(`c) ${e.c.knoepfe} Knöpfe – erwartet einer für das Elternteil`);
  if (!/Ich bleibe vor Ort/.test(e.c.text)) probleme.push(`c) Knopftext „${e.c.text}“`);
  if (e.c.name) probleme.push("c) Ein Kindername steht in der Betreuungs-Karte");
  if (e.c.hinweis) probleme.push("c) Der Vornamen-Hinweis steht noch da");
  if (e.c.hoehe < 44) probleme.push(`c) Knopf nur ${e.c.hoehe} px`);
  if (e.d.vorTop === null) probleme.push("d) Anker nicht gemerkt, obwohl die Leiste im Blick ist");
  else if (Math.abs(e.d.nachTop - e.d.vorTop) > 2) probleme.push(`d) Leiste springt von ${e.d.vorTop} auf ${e.d.nachTop} px`);
  zeilen.push(`c) ${e.c.knoepfe} Knopf „${e.c.text}“, ${e.c.hoehe} px, Name ${e.c.name}, Hinweis ${e.c.hinweis}`);
  zeilen.push(`d) Leiste oben ${e.d.vorTop} → ${e.d.nachTop} px nach 220 px Zuwachs darüber`);

  return h.ergebnis("Training: alle außer Absagen, ein Betreuungsknopf, kein Scrollsprung", !probleme.length, probleme.length ? probleme : zeilen);
};
