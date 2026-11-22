/* v940 · Planung: der fertige Plan zuerst (Charles 22.11.2026, Entwurf im Bild freigegeben: „Ja, so bauen … 3D-Effekte,
   Schatten, optische Spielereien beim Drücken“; Anpassung „Automatisch mit Hinweis“; statt zweier Leitfragen „Wiederholung“).

   a) Termin im Trainingsblock ohne Plan: oben „Dein Training ist bereit“ mit der Leitfrage des Blocks, Einheit und
      Training n von m, Ablauf Aufwärmen · Hauptteil · Abschluss, „rechnet mit N Kindern“; Hauptknopf „Plan übernehmen“
      (≥ 56 px); darunter drei gleich breite Kacheln (≥ 140 px hoch): Andere Leitfrage, Selbst bauen, Mit KI.
   b) „Plan übernehmen“ schreibt den Plan; danach „Dein Training steht“ mit „Passt – speichern“; ein Herz mit Gruß erscheint.
   c) Automatische Anpassung (nur wenn sich Kinder- oder Trainerzahl seit dem letzten Öffnen auf dem Gerät geändert haben): ändert sich etwas, wird übernommen und der Hinweis „Angepasst wegen …“ mit „Rückgängig“
      erscheint; zwei Stunden vor Beginn nicht; nicht erneut für einen zurückgenommenen Stand. „Rückgängig“ schreibt
      den vorherigen Plan zurück.
   d) „Andere Leitfrage“ bietet „Vorwoche wiederholen“ (Leitfrage aus dem Block der Vorwoche) und öffnet die Vorlagen
      gefiltert auf diese Leitfrage.
   e) Termin ohne Block und ohne Plan: „Noch kein Plan“, Hauptknopf „Leitfrage wählen“, dazu „Trainingsblock anlegen“.
      Seit v949: ohne Leitfrage des Monats Hinweis „keine Leitfrage festgelegt“ mit den Leitfragen zum Antippen, der Block als Link;
      nur noch zwei Kacheln (Selbst bauen, Mit KI).
   f) 360 px: nichts läuft über, Schrift ≥ 14 px; die Kacheln haben den 3D-Schatten. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const F = "Wie behalte ich den Ball, wenn einer kommt?";
  const bl = [{ typ: "warmup", label: "Aufwärmen", dauer: 10 }, { typ: "main", label: "Hauptteil", dauer: 40, uebung_name: "Korridor-Funino" }, { typ: "abschluss", label: "Abschlussspiel", dauer: 20 }];
  const vorlagen = [1, 2, 3, 4].map(i => ({ id: i, name: `L1-${i} Probe ${i}`, leitfrage: F, folge_nr: i, tags: [], skalierung: { "8": "acht", "12": "zwölf" }, bloecke: bl }));
  const von = h.tagePlus(0), bis = h.tagePlus(20);
  const trainings = [1, 4, 8, 11, 15, 18].map((t, i) => ({ id: 70 + i, datum: h.tagePlus(t), typ: "training", uhrzeit: "17:00" }));
  const block = { id: 9, leitfrage: F, ziel: "Jedes Kind schirmt ab", von, bis, vorlagen: vorlagen.slice(0, 3).map(v => v.name) };
  let plan = null; const posts = [];
  const s = await h.starten({ breite: 360, hoehe: 1600, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), termine: trainings, trainingsvorlagen: vorlagen, trainingsblock: [block],
    trainingsplan: (u, req) => {
      if (req.method() === "POST") { try { plan = JSON.parse(req.postData() || "null"); posts.push(plan); } catch (e) {} return { status: 201, body: "[]" }; }
      if (!plan || !decodeURIComponent(u.search).includes(plan.datum)) return [];   // Plan gilt nur an seinem Datum
      if (/select=slots/.test(u.search)) return [{ slots: plan.slots || [] }];
      if (/select=plan/.test(u.search)) return [{ plan: plan.plan || [] }];
      return [plan];
    } }) });
  await h.sichtbarMachen(s.page, "#tp-timeline");
  const r = await s.page.evaluate(async ({ trainings, F, ohne }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const txt = e => e ? e.textContent.replace(/\s+/g, " ").trim() : "";
    const out = {};
    if (typeof tpStartRender !== "function") return { fehlt: true };
    await loadKader();
    const oeffnen = async datum => { const f = document.getElementById("tp-date"); if (![...f.options].some(o => o.value === datum)) f.add(new Option(datum, datum)); f.value = datum; await tpTrainerRsvpLaden(datum); await tpPlanRestore(datum); for (let i = 0; i < 60 && !document.querySelector("#tp-start .tps"); i++) await w(50); await w(150); };
    const datum = trainings[3].datum;
    await oeffnen(datum);
    const el = document.getElementById("tp-start"), haupt = document.getElementById("tps-haupt");
    const wege = [...el.querySelectorAll(".tps-wege .tps-weg")];
    const sicht = [...el.querySelectorAll("*")].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && e.getClientRects().length);
    out.a = { text: txt(haupt), knopf: txt(document.getElementById("tps-uebernehmen")), kh: Math.round(document.getElementById("tps-uebernehmen")?.getBoundingClientRect().height || 0),
      wege: wege.map(txt), wb: wege.map(b => Math.round(b.getBoundingClientRect().width)), wh: wege.map(b => Math.round(b.getBoundingClientRect().height)),
      schrift: Math.min(...sicht.map(e => parseFloat(getComputedStyle(e).fontSize))), ueber: document.documentElement.scrollWidth - innerWidth,
      schatten: getComputedStyle(wege[0]).boxShadow.includes("inset") };
    // b)
    window.frageJaNein = async () => true;
    await tpStartUebernehmen(datum); await w(300);
    out.b = { text: txt(document.getElementById("tps-haupt")), speichern: !!document.getElementById("tps-speichern"), herz: txt(document.getElementById("fr-herz")) };
    // c) automatische Anpassung (Rechnung gestellt: dieselbe wie „Plan anpassen“, eigene Prüfungen v719)
    const altV = window.tpAnpassenVorschlag, altU = window.tpAnpassenUebernehmen;
    window.tpAnpassenVorschlag = () => ({ kinderZahl: 9, trainer: ["Trainer A"], raus: ["Kind A", "Kind B"], rein: [], vorher: 2, nachher: 1, tausch: [], nichts: false });
    let uebernommen = 0; window.tpAnpassenUebernehmen = async () => { uebernommen++; return { getauscht: 1 }; };
    TP_TERMIN_ZEIT = "17:00";
    const auto = await tpStartAuto(datum); await tpStartRender(datum);
    out.c = { auto, uebernommen, hinweis: txt(document.getElementById("tps-hinweis")), rueck: !!document.querySelector("#tps-hinweis button") };
    const heute = new Date(), hh = String(heute.getHours() + 1).padStart(2, "0");
    const isoHeute = isoLokal(); TP_TERMIN_ZEIT = (heute.getHours() < 23 ? hh : "23") + ":30";
    out.c.frier = await tpStartAuto(isoHeute);
    TP_TERMIN_ZEIT = "17:00";
    const vorPosts = window.__posts = 0;
    await tpStartRueckgaengig(); await w(200);
    out.c.nein = (localStorage.getItem("tps_nein_" + datum) || "").startsWith("9|");
    out.c.wieder = await tpStartAuto(datum);
    // Schwelle: ohne gemerkte Lage passt nichts an (erstes Öffnen), mit anderer Lage schon
    let zaehl = 0; window.tpAnpassenUebernehmen = async () => { zaehl++; return { getauscht: 0 }; };
    localStorage.removeItem("tps_nein_" + datum);
    localStorage.removeItem("tps_lage_" + datum); _tpsHinweis = null; await tpStartNachLaden(datum); out.c.ohneLage = zaehl;
    localStorage.setItem("tps_lage_" + datum, "99|Niemand"); await tpStartNachLaden(datum); out.c.andereLage = zaehl;
    out.c.gemerkt = localStorage.getItem("tps_lage_" + datum) !== "99|Niemand";
    window.tpAnpassenVorschlag = altV; window.tpAnpassenUebernehmen = altU;
    // d) Andere Leitfrage
    await tpStartLeitfrage(datum); await w(100);
    out.d = { modal: txt(document.getElementById("tps-modal")) };
    await tpStartVorwoche(); await w(300);
    out.d.vu = !!document.getElementById("vu-modal"); out.d.filter = (typeof _vuFilter !== "undefined" && _vuFilter.leitfrage) || "";
    document.getElementById("vu-modal")?.remove();
    // e) ohne Block
    await oeffnen(ohne);
    out.e = { text: txt(document.getElementById("tps-haupt")), wahl: document.querySelectorAll("#tps-haupt .tps-lf-chip").length, block: !!document.getElementById("tps-block") };   // v949
    return out;
  }, { trainings, F, ohne: h.tagePlus(30) }).catch(e => ({ fehler: String(e) }));
  const fehler = s.fehler().filter(x => !/Failed to load resource/.test(x)); await s.schliessen();
  if (r.fehler || r.fehlt) return h.ergebnis("v940 Planung: fertiger Plan zuerst", false, [r.fehler || "tpStartRender fehlt"]);
  const P = x => probleme.push(x);
  if (!/Dein Training ist bereit/.test(r.a.text) || !r.a.text.includes(F) || !/Einheit A · Training 4 von 6/.test(r.a.text) || !/Aufwärmen\s*10 Min/.test(r.a.text) || !/Abschluss\s*20 Min/.test(r.a.text) || !/rechnet mit \d+ Kindern/.test(r.a.text)) P(`a) Karte: „${r.a.text.slice(0, 260)}“`);
  if (!/Plan übernehmen/.test(r.a.knopf) || r.a.kh < 56) P(`a) Hauptknopf „${r.a.knopf}“ ${r.a.kh} px`);
  /* v949: „Andere Leitfrage“ entfällt als Kachel (Leitfrage des Monats direkt in der Karte) – zwei Kacheln */
  if (r.a.wege.length !== 2 || !/Selbst bauen/.test(r.a.wege[0]) || !/Mit KI/.test(r.a.wege[1]) || Math.max(...r.a.wb) - Math.min(...r.a.wb) > 1 || Math.min(...r.a.wh) < 140) P(`a) Kacheln: ${JSON.stringify([r.a.wege, r.a.wb, r.a.wh])}`);
  if (!/Dein Training steht/.test(r.b.text) || !r.b.speichern || !/❤️/.test(r.b.herz)) P(`b) nach Übernehmen: ${JSON.stringify(r.b).slice(0, 240)}`);
  if (!posts.length) P("b) kein Plan geschrieben");
  if (!r.c.auto || r.c.uebernommen !== 1 || !/Angepasst wegen 2 Absagen: 1 statt 2 Felder · eine Übung getauscht/.test(r.c.hinweis) || !r.c.rueck) P(`c) Anpassung: ${JSON.stringify(r.c)}`);
  if (r.c.frier !== false) P("c) zwei Stunden vor Beginn trotzdem angepasst");
  if (r.c.ohneLage !== 0 || r.c.andereLage !== 1 || !r.c.gemerkt) P(`c) Schwelle: ohne Lage ${r.c.ohneLage}, andere Lage ${r.c.andereLage}, gemerkt ${r.c.gemerkt}`);
  if (!r.c.nein || r.c.wieder !== false) P(`c) Rückgängig: gemerkt ${r.c.nein}, erneut angepasst ${r.c.wieder}`);
  if (!/Vorwoche wiederholen/.test(r.d.modal) || !r.d.modal.includes(F) || !r.d.vu || r.d.filter !== F) P(`d) Andere Leitfrage: ${JSON.stringify(r.d).slice(0, 240)}`);
  if (!/Noch kein Plan/.test(r.e.text) || !r.e.wahl || !/keine Leitfrage festgelegt/.test(r.e.text) || !r.e.block) P(`e) ohne Block: ${JSON.stringify(r.e).slice(0, 200)}`);
  if (r.a.ueber > 0 || r.a.schrift < 14 || !r.a.schatten) P(`f) 360 px: über ${r.a.ueber}, Schrift ${r.a.schrift}, Schatten ${r.a.schatten}`);
  if (fehler.length) P("Konsole: " + fehler.slice(0, 2).join(" | "));
  zeilen.push(`a) „${r.a.knopf}“ ${r.a.kh} px · Kacheln ${r.a.wb.join("/")} × ${Math.min(...r.a.wh)} px · Schrift ≥ ${r.a.schrift} px`, `c) „${r.c.hinweis}“ · eingefroren ${!r.c.frier} · d) Vorwoche → Filter „${r.d.filter.slice(0, 30)}…“ · e) ohne Block Hinweis + Leitfragen`);
  return h.ergebnis("v940 Planung: fertiger Plan zuerst, drei Wege, automatische Anpassung", !probleme.length, zeilen.concat(probleme));
};
