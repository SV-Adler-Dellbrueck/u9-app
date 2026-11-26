/* v977 · Individual-Training: mehrere Kinder oder „Alle rollierend“; Abschluss zählt als Spielform (Charles 26.11.2026)
   a) Einzelblock: Umschalter „✓ Ausgewählte / 🔄 Alle rollierend“ (aria-pressed, ≥ 44 px), Häkchen je Kind;
      zwei Häkchen → Zustand mit beiden, gespeichert als Liste von kader.id (keine Namen auf der Leitung)
   b) Gerät B lädt die Liste wieder; ein alter Plan mit einer einzelnen ID lädt weiter genau dieses Kind
   c) „Alle rollierend“: Häkchen verschwinden, Anzahl und Takt erscheinen, Hinweis rechnet; gespeichert als rolliert {n,takt}, ohne kind
   d) Trainingsstart (_tlSnapshot): bei Auswahl fehlen beide Kinder in den Feldgruppen; rollierend fehlt niemand, die Gruppe trägt roll
   e) Wechsel-Signal: nach 6 Min. genau eine Meldung „🔄 Wechsel Individual“, kein zweites Mal im selben Takt, keins kurz vor Schluss
   f) Spielform-Minuten: Abschluss zählt mit, das parallele Einzeltraining nicht */
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const DB = {}, TERMIN = h.tagePlus(2);
  const gruppen = [{ name: "Blau", emo: "🔵", kinder: [K[0], K[1], K[2]] }, { name: "Grün", emo: "🟢", kinder: [K[3], K[4], K[5]] }];
  const supabase = h.supabaseAttrappe({ kader: h.kaderZeilen(), trainingsgruppen: [{ datum: TERMIN, gruppen, aus_anwesenheit: false }], trainingsplan: (u, req) => {
    if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); DB[b.datum] = { plan: b.plan, slots: b.slots }; return { status: 201, body: "" }; }
    const eq = (u.searchParams.get("datum") || "").replace("eq.", ""), sel = u.searchParams.get("select") || "plan";
    return DB[eq] ? [sel === "slots" ? { slots: DB[eq].slots } : { plan: DB[eq].plan }] : [];
  } });
  const geraet = async () => {
    const s = await h.starten({ supabase, hoehe: 2200 }); await h.sichtbarMachen(s.page, "#tp-timeline"); await h.terminSetzen(s.page, TERMIN);
    await s.page.evaluate(async () => { await loadKader(); const T = TRAINER.slice(0, 2); let box = document.getElementById("tp-trainer-checks"); if (!box) { box = document.createElement("div"); box.id = "tp-trainer-checks"; document.body.appendChild(box); }
      TP_RSVP = {}; T.forEach(t => TP_RSVP[t] = "ja"); TP_TRAINER_MANUELL = {}; tpTrainerChipsRender(); tpCoaches = {}; });
    return s;
  };
  const a = await geraet();
  const A = await a.page.evaluate(async K => {
    const o = {};
    await tgSync(); await new Promise(r => setTimeout(r, 150));
    tpSlots.length = 0;
    tpSlots.push({ label: "Aufwärmen", dauer: 10, farbe: "#059669", typ: "warmup" }, { label: "Hauptteil 1", dauer: 35, farbe: "#1a56db", typ: "spielform" }, { label: "Abschlussturnier", dauer: 18, farbe: "#c2410c", typ: "abschluss" });
    tpRenderTimeline();
    tpDoAddSlot("individual"); const ind = tpSlots.findIndex(x => x.typ === "individual"); tpSlots[ind].parallelZu = 1; tpSlots[ind].dauer = 35; tpRenderTimeline();
    o.ind = ind;
    const wer = document.querySelector(`.tp-ind-wer[data-slot="${ind}"]`);
    const knoepfe = () => [...wer.querySelectorAll(".tp-ind-modus .seg-btn")];
    o.a = { knoepfe: knoepfe().map(b => b.textContent.trim() + ":" + b.getAttribute("aria-pressed") + ":" + Math.round(b.getBoundingClientRect().height)), haken: wer.querySelectorAll(".tp-ind-player").length, alteAuswahl: !!document.getElementById(`tp-ind-player-${ind}`) };
    [K[2], K[0]].forEach(n => { const c = wer.querySelector(`.tp-ind-player[value="${n}"]`); c.checked = true; c.dispatchEvent(new Event("change")); });
    o.a.zustand = tpKinderVon(ind);
    o.a.kachel = (document.querySelector(`.tp-ind-wer[data-slot="${ind}"]`) || {}).isConnected;
    o.f = { netto: tpNettoMinuten(tpSlots), gesamt: tpGesamtMinuten() };
    // d) Auswahl: beide fehlen in den Feldgruppen des Hauptteils
    const snapA = _tlSnapshot(), h1A = snapA.find(st => st.label === "Hauptteil 1");
    const imFeld = st => st.gruppen.filter(g => !g.einzel).flatMap(g => g.kinder || []);
    /* Gegenprobe: ohne Häkchen stehen beide im Feld – sonst sagt „fehlen“ nichts */
    const _tlSnapshotOhne = i => { const alt = tpKinderVon(i); tpKindSetzen(i, []); const st = _tlSnapshot().find(x => x.label === "Hauptteil 1"); tpKindSetzen(i, alt); return st; };
    o.d = { basis: [K[0], K[2]].every(k => imFeld(_tlSnapshotOhne(ind)).includes(k)), auswahlFehlen: [K[0], K[2]].every(k => !imFeld(h1A).includes(k)), auswahlTitel: (h1A.gruppen.find(g => g.einzel) || {}).uebung || "" };
    await tpPlanSave(true);
    return o;
  }, K);
  const post1 = JSON.parse(JSON.stringify(DB[TERMIN] || {}));
  const ind1 = post1.slots && post1.slots.find(x => x.typ === "individual");
  // c) rollierend auf Gerät A
  const C = await a.page.evaluate(async ({ K, ind }) => {
    const o = {};
    document.querySelector(`.tp-ind-wer[data-slot="${ind}"] .seg-btn[data-roll="1"]`).click();
    const wer = document.querySelector(`.tp-ind-wer[data-slot="${ind}"]`);
    o.hiddenAuswahl = wer.querySelector(".tp-ind-auswahl").hidden; o.hiddenRoll = wer.querySelector(".tp-ind-roll").hidden;
    o.knoepfe = [...wer.querySelectorAll(".tp-ind-modus .seg-btn")].map(b => b.getAttribute("aria-pressed")).join(",");
    const n = wer.querySelector(".tp-ind-n"), t = wer.querySelector(".tp-ind-takt");
    o.hoehe = Math.min(n.getBoundingClientRect().height, t.getBoundingClientRect().height);
    n.value = "2"; n.dispatchEvent(new Event("change")); t.value = "6"; t.dispatchEvent(new Event("change"));
    o.roll = tpRollVon(ind); o.hinweis = wer.querySelector(".tp-ind-roll-hinweis").textContent;
    const snap = _tlSnapshot(), h1 = snap.find(st => st.label === "Hauptteil 1");
    o.alleImFeld = [K[0], K[2]].every(k => h1.gruppen.filter(g => !g.einzel).some(g => (g.kinder || []).includes(k)));
    const eg = h1.gruppen.find(g => g.einzel) || {};
    o.gruppeRoll = eg.roll || null; o.titel = eg.uebung || "";
    o.stationRoll = (stTimerStations().find(st => /^Hauptteil 1/.test(st.label)) || {}).roll || null;
    await tpPlanSave(true);
    // e) Signal
    const meld = []; const altU = window.uhrMeldung, altT = window.toast; window.uhrMeldung = async t => { meld.push(t); return true; }; window.toast = () => {};
    const merk = {}, r = { n: 2, takt: 6, dauer: 35 }, D = 35 * 60;
    o.e = [einzelRollTick(r, 359, D, merk, 0), einzelRollTick(r, 360, D, merk, 0), einzelRollTick(r, 361, D, merk, 0), einzelRollTick(r, 720, D, merk, 0), einzelRollTick(r, D - 3, D, merk, 0)];
    o.meld = meld.slice(); window.uhrMeldung = altU; window.toast = altT;
    return o;
  }, { K, ind: A.ind });
  const post2 = JSON.parse(JSON.stringify(DB[TERMIN] || {}));
  const ind2 = post2.slots && post2.slots.find(x => x.typ === "individual");
  const feA = a.fehler(); await a.schliessen();
  // b) Gerät B lädt erst die Liste (post1), dann einen alten Plan mit einer ID
  DB[TERMIN] = post1;
  const b = await geraet();
  const B = await b.page.evaluate(async ({ ind }) => {
    await tpPlanRestore();
    const liste = [...document.querySelectorAll(`.tp-ind-player[data-slot="${ind}"]`)].filter(c => c.checked).map(c => c.value);
    return { liste, zustand: tpKinderVon(ind), roll: tpRollVon(ind) };
  }, { ind: A.ind });
  const alt = JSON.parse(JSON.stringify(post1)); alt.slots.find(x => x.typ === "individual").kind = 6; DB[TERMIN] = alt;
  const B2 = await b.page.evaluate(async ({ ind }) => { await tpPlanRestore(); return { zustand: tpKinderVon(ind), seite: [...document.querySelectorAll(`.tp-ind-player[data-slot="${ind}"]`)].filter(c => c.checked).map(c => c.value) }; }, { ind: A.ind });
  DB[TERMIN] = post2;
  const B3 = await b.page.evaluate(async ({ ind }) => { await tpPlanRestore(); const w = document.querySelector(`.tp-ind-wer[data-slot="${ind}"]`); return { roll: tpRollVon(ind), auswahlHidden: w.querySelector(".tp-ind-auswahl").hidden, n: w.querySelector(".tp-ind-n").value, takt: w.querySelector(".tp-ind-takt").value }; }, { ind: A.ind });
  const feB = b.fehler(); await b.schliessen();

  // Auswertung
  const a0 = A.a;
  if (a0.alteAuswahl || a0.haken < 10 || a0.knoepfe.length !== 2 || !/Ausgewählte:true/.test(a0.knoepfe[0]) || !/rollierend:false/.test(a0.knoepfe[1]) || a0.knoepfe.some(k => Number(k.split(":")[2]) < 44) || JSON.stringify(a0.zustand) !== JSON.stringify([K[0], K[2]]))
    probleme.push("a) " + JSON.stringify(a0));
  else zeilen.push(`a) Umschalter ${a0.knoepfe.map(k => k.split(":").slice(0, 2).join(":")).join(" · ")}, ${a0.haken} Häkchen, zwei angehakt → ${a0.zustand.join(", ")}`);
  if (!ind1 || !Array.isArray(ind1.kind) || ind1.kind.length !== 2 || !ind1.kind.every(x => typeof x === "number") || ind1.rolliert || JSON.stringify(post1).includes("Kind ")) probleme.push("a) gespeichert: " + JSON.stringify(ind1));
  else zeilen.push(`a) gespeichert als kind ${JSON.stringify(ind1.kind)} (IDs, keine Namen)`);
  if (JSON.stringify(B.liste) !== JSON.stringify([K[0], K[2]]) || B.roll || JSON.stringify(B2.zustand) !== JSON.stringify([K[5]]) || JSON.stringify(B2.seite) !== JSON.stringify([K[5]]))
    probleme.push("b) " + JSON.stringify({ B, B2 }));
  else zeilen.push(`b) Gerät B: Liste zurück (${B.liste.join(", ")}); alter Plan mit einer ID → ${B2.zustand.join(", ")}`);
  if (!C.hiddenAuswahl || C.hiddenRoll || C.knoepfe !== "false,true" || C.hoehe < 44 || JSON.stringify(C.roll) !== '{"n":2,"takt":6}' || !/alle 6 Min\. 2 Kinder/.test(C.hinweis) || !/12 Kinder dran|alle \d+ Kinder dran/.test(C.hinweis)
    || !ind2 || JSON.stringify(ind2.rolliert) !== '{"n":2,"takt":6}' || ind2.kind != null || JSON.stringify(B3.roll) !== '{"n":2,"takt":6}' || !B3.auswahlHidden || B3.n !== "2" || B3.takt !== "6")
    probleme.push("c) " + JSON.stringify({ C, ind2, B3 }));
  else zeilen.push(`c) rollierend: Häkchen weg, Anzahl/Takt ≥ 44 px, gespeichert rolliert ${JSON.stringify(ind2.rolliert)}, Gerät B stellt es wieder her; Hinweis „${C.hinweis.slice(0, 90)}…“`);
  if (!A.d.basis || !A.d.auswahlFehlen || !A.d.auswahlTitel.includes(K[0] + ", " + K[2]) || !C.alleImFeld || JSON.stringify(C.gruppeRoll) !== '{"n":2,"takt":6}' || !/rollierend, Wechsel alle 6 Min\./.test(C.titel) || !C.stationRoll || C.stationRoll.takt !== 6)
    probleme.push("d) " + JSON.stringify({ d: A.d, alleImFeld: C.alleImFeld, gruppeRoll: C.gruppeRoll, titel: C.titel, stationRoll: C.stationRoll }));
  else zeilen.push(`d) Auswahl: beide fehlen im Feld („${A.d.auswahlTitel.split(":")[0]}“); rollierend: alle im Feld, Gruppe trägt roll, Stationen-Timer kennt den Takt`);
  if (JSON.stringify(C.e) !== "[false,true,false,true,false]" || C.meld.join("|") !== "🔄 Wechsel Individual|🔄 Wechsel Individual") probleme.push("e) " + JSON.stringify({ e: C.e, meld: C.meld }));
  else zeilen.push("e) Signal bei 6:00 und 12:00 je einmal, nicht bei 5:59/6:01 und nicht kurz vor Schluss");
  if (A.f.netto !== 53 || A.f.gesamt !== 63) probleme.push("f) " + JSON.stringify(A.f)); else zeilen.push(`f) Spielform ${A.f.netto} von ${A.f.gesamt} Min. – Hauptteil 35 + Abschluss 18, Einzeltraining und Aufwärmen nicht`);
  const fe = feA.concat(feB); if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v977 Individual-Training: mehrere Kinder oder rollierend; Abschluss zählt als Spielform", !probleme.length, zeilen.concat(probleme));
};
