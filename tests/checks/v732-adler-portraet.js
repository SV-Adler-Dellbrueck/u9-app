/* v732 · „Adler im Porträt“: mehr Fan-Fakten, Porträt-Fragen im Kabinen-Reporter, KI-Entwurf ohne Namen.
   PO 03.10.: „Es gibt ja Fan-Fakten für jeden Spieler. Diese wollen wir pro Woche ins Spielerprofil ins
   Adler Nest einbauen. Dafür sind es aber nicht genug Infos … Zusätzlich soll der Kabinen-Reporter einige
   Fragen stellen, um daraus nachher per KI einen tollen Bericht über den Spieler zu verfassen.“
   a) Fan-Fakten-Editor: zehn Porträt-Felder; Speichern schickt sie mit; fehlen die Spalten (400), werden
      wenigstens die bisherigen Felder gespeichert
   b) Kabinen-Reporter: fünf neue Kachel-Fragen und ein freies Feld; die freie Antwort wird gespeichert
   c) Reihum: Vorschlag ist das Kind, das noch nie bzw. am längsten nicht im Porträt war
   d) KI-Entwurf: an ki-portraet geht kein Name (eigenes Kind „Kind A“, andere „ein Mitspieler“), kein
      Spitzname, kein nicht freigegebener Freitext; der Vorname kommt erst danach in den Text
   e) Im Heft heißt die Rubrik „Adler im Porträt“ (nicht „Spieler im Fokus“) */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const posts = { fanfacts: [], reporter: [] }, kiBodies = [];
  let fanfactsFehler = false;
  const basis = h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [], ausstattung_ausgabe: [],
    kind_fanfacts: (u, req) => {
      if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); posts.fanfacts.push(b);
        if (fanfactsFehler && "hobby" in b) return { status: 400, body: JSON.stringify({ code: "PGRST204", message: "column not found" }) }; return []; }
      return [{ spieler_id: 1, spitzname: "Flitzi", hobby: "Lego", lieblingstier: "Gepard" }];
    },
    kabine_reporter: (u, req) => {
      if (req.method() === "POST") { posts.reporter.push(JSON.parse(req.postData() || "{}")); return []; }
      return [{ frage: "Was kannst du schon richtig gut?", antwort: "Schnell rennen", freigegeben: false },
              { frage: "Was soll jeder über dich wissen?", antwort: "Ich spiele oft mit Probo", freigegeben: true },
              { frage: "Was soll jeder über dich wissen?", antwort: "Geheim: Telefon von Probo", freigegeben: false }];
    },
    portraet_verlauf: [{ spieler_id: 1, woche: "2026-09-28" }],
    funktionen: { "ki-portraet": (u, req) => { kiBodies.push(req.postData() || ""); return { text: "Kind A mag Lego und Geparden. Toll, Kind A!" }; } } });
  const s = await h.starten({ warten: 1500, supabase: basis });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 50 && (typeof elternFanfactsOpen !== "function" || typeof heftPortraetEntwurf !== "function" || typeof kabineReporterFrage !== "function"); i++) await w(100);
    const out = {};
    // a) Fan-Fakten
    await elternFanfactsOpen(1, "Testa"); await w(200);
    out.felder = FF_PORTRAET.filter(([k]) => document.getElementById("ff-" + k)).length;
    out.hobbyVorbelegt = (document.getElementById("ff-hobby") || {}).value;
    document.getElementById("ff-kann_gut").value = "Witze erzählen";
    await elternFanfactsSave(1); await w(300);
    // b) Reporter
    const kb = document.createElement("div"); kb.id = "kabine-body"; document.body.appendChild(kb);
    out.neueFragen = ["Wie lange spielst du schon Fußball?", "Was kannst du schon richtig gut?", "Was willst du als Nächstes lernen?", "Mit wem kickst du zuhause?", "Was magst du an den Adlern am meisten?"].filter(f => REPORTER_FRAGEN.some(q => q.f === f && q.o && q.o.length >= 4)).length;
    _krSid = 1; _krName = "Testa"; _krOffen = REPORTER_FRAGEN.filter(q => q.frei);
    kabineReporterFrage(); await w(100);
    const ta = document.getElementById("kr-frei"); out.freiFeld = !!ta;
    if (ta) { ta.value = "Ich kann einen Handstand"; await kabineReporterFrei(); await w(200); }
    // c) Reihum
    heftKader = [{ id: 1, name: "Testa" }, { id: 2, name: "Probo" }, { id: 3, name: "Alpi" }];
    const nv = heftPortraetNaechster(heftKader, [{ spieler_id: 1, woche: "2026-09-28" }, { spieler_id: 3, woche: "2026-09-21" }]);
    out.reihum = nv && nv.kind.name;
    const nv2 = heftPortraetNaechster(heftKader, [{ spieler_id: 1, woche: "2026-09-28" }, { spieler_id: 2, woche: "2026-09-14" }, { spieler_id: 3, woche: "2026-09-21" }]);
    out.reihum2 = nv2 && nv2.kind.name;
    // d) KI-Entwurf
    heftCfg.fokusId = "1"; heftCfg.fokusText = "";
    await heftPortraetEntwurf(); await w(300);
    out.text = heftCfg.fokusText;
    // e) Rubrik
    heftFotos = []; heftFanfacts = {}; heftTermin = null; window._heftReporter = [];
    out.html = heftBuildHtml({ titel: "Adler Nest", fokusId: "1", fokusText: "x", mask: true }, { mask: true });
    return out;
  }).catch(e => ({ fehler: String(e) }));
  // Fallback bei fehlenden Spalten
  fanfactsFehler = true; const vorher = posts.fanfacts.length;
  const r2 = await s.page.evaluate(async () => { const w = ms => new Promise(x => setTimeout(x, ms)); await elternFanfactsOpen(1, "Testa"); await w(200); await elternFanfactsSave(1); await w(300); return !document.getElementById("fanfacts-modal"); }).catch(e => String(e));
  const f = s.fehler().filter(x => !/400/.test(x)); await s.schliessen();
  const titel = "v732 Adler im Porträt: Fan-Fakten, Reporter-Fragen, KI-Entwurf ohne Namen";
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  if (r.fehler) { probleme.push(r.fehler); return h.ergebnis(titel, false, probleme); }
  const p1 = posts.fanfacts[0] || {};
  if (r.felder !== 10 || r.hobbyVorbelegt !== "Lego" || p1.kann_gut !== "Witze erzählen" || p1.hobby !== "Lego") probleme.push("a) " + JSON.stringify({ felder: r.felder, vor: r.hobbyVorbelegt, post: p1 }));
  else zeilen.push("a) zehn Porträt-Felder, vorbelegt und mitgespeichert");
  const fb = posts.fanfacts.slice(vorher);
  if (fb.length !== 2 || !("hobby" in fb[0]) || ("hobby" in fb[1]) || fb[1].spitzname !== "Flitzi" || r2 !== true) probleme.push("a) Rückfall: " + JSON.stringify({ fb, r2 }));
  else zeilen.push("a) ohne neue Spalten: bisherige Felder trotzdem gespeichert");
  const rp = posts.reporter[0] || {};
  if (r.neueFragen !== 5 || !r.freiFeld || rp.frage !== "Was soll jeder über dich wissen?" || rp.antwort !== "Ich kann einen Handstand") probleme.push("b) " + JSON.stringify({ neu: r.neueFragen, frei: r.freiFeld, rp }));
  else zeilen.push("b) fünf neue Kachel-Fragen, freies Feld wird gespeichert");
  if (r.reihum !== "Probo" || r.reihum2 !== "Probo") probleme.push("c) " + JSON.stringify([r.reihum, r.reihum2]));
  else zeilen.push("c) reihum: nie dran → zuerst, sonst am längsten her");
  const ki = kiBodies[0] || "";
  let kb = {}; try { kb = JSON.parse(ki); } catch (e) {}
  const verboten = ["Testa", "Probo", "Alpi", "Flitzi", "Telefon"].filter(n => ki.includes(n));
  if (!ki || verboten.length || kb.kind !== "Kind A" || !/ein Mitspieler/.test(ki) || (kb.fakten || {}).hobby !== "Lego" || r.text !== "Testa mag Lego und Geparden. Toll, Testa!") probleme.push("d) " + JSON.stringify({ verboten, kb, text: r.text }));
  else zeilen.push("d) KI bekommt „Kind A“/„ein Mitspieler“, keinen Spitznamen, keinen ungeprüften Freitext; Vorname erst danach");
  if (!/Adler im Porträt/.test(r.html) || /Spieler im Fokus/.test(r.html)) probleme.push("e) Rubrik heißt nicht „Adler im Porträt“");
  else zeilen.push("e) Rubrik „Adler im Porträt“");
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
