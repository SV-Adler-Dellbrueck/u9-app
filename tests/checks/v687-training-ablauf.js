/* v687 · Training: Trainingsplan in fünf Schritten, Anwesenheit mit Zählung, Turnier mit Klappbereich
   PO 30.09. (Bildschirmfoto der Training-Kacheln): „Die erste Untermaske passt, aber darunter die
   Ebene muss besser werden. Hier auch die Logik und Sinnhaftigkeit der Inhalte und des Aufbaus
   kritisch überprüfen und optimieren.“
   a) Trainingsplan: Schritte 1–5 (Termin · Wer trainiert mit? · Inhalt wählen · Ablauf und Gruppen ·
      Speichern und starten) in dieser Reihenfolge; Terminwahl in 1, Trainer in 2, „Vorlage
      übernehmen“ und „Auto-Plan“ nebeneinander in 3, der Ablauf in 4, Spielform-Minuten,
      „Plan speichern“ und „Trainingsstart“ in 5; eine Hauptaktion (Trainingsstart ≥ 56 px, Plan
      speichern darunter kleiner)
   b) Anwesenheit: Schritte 1–3; die Zählung „✓ n da · m fehlen“ folgt jedem Tipp, der Knopf nennt
      dieselbe Zahl, „Alle da“ steht nur, wenn jemand fehlt
   c) Trainingsturnier: Spielform, Zeit und Felder im Klappbereich „So wird gespielt“ mit
      Zusammenfassung; beim ersten Mal offen, nach einer Einstellung beim nächsten Öffnen zu; ein
      Tipp auf eine Zeit hält ihn offen */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const termine = [{ id: 1, datum: h.tagePlus(1), uhrzeit: "17:00", uhrzeit_ende: "18:15", typ: "training", titel: "Training", trainer_status: {} }];
  const s = await h.starten({ breite: 390, hoehe: 844, warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, anwesenheit: [] }) });
  await h.sichtbarMachen(s.page, "#main-app");
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    await loadKader();
    const out = {};
    // a)
    go("planung"); await w(1200);
    const box = document.getElementById("train-sub-planung");
    const kinder = [...box.children];
    const schritte = kinder.filter(e => e.classList.contains("tp-schritt")).map(e => e.textContent.replace(/\s+/g, " ").trim());
    const idx = el => kinder.indexOf(el && el.closest("#train-sub-planung > *"));
    const sIdx = n => kinder.findIndex(e => e.classList.contains("tp-schritt") && e.textContent.trim().startsWith(String(n)));
    const knopf = t => [...box.querySelectorAll("button")].find(b => b.textContent.includes(t));
    out.plan = { schritte,
      termin: idx(document.getElementById("tp-vorplan")), trainer: idx(document.getElementById("tp-trainer-checks")),
      vorlage: idx(knopf("Vorlage übernehmen")), auto: idx(knopf("Auto-Plan")), ablauf: idx(document.getElementById("tp-timeline")),
      netto: idx(document.getElementById("tp-netto")), speichern: idx(knopf("Plan speichern")), start: idx(knopf("Trainingsstart")),
      s: [1, 2, 3, 4, 5].map(sIdx),
      nebeneinander: knopf("Vorlage übernehmen") && knopf("Auto-Plan") && knopf("Vorlage übernehmen").parentElement === knopf("Auto-Plan").parentElement,
      hStart: Math.round(knopf("Trainingsstart").getBoundingClientRect().height), hSpeichern: Math.round(knopf("Plan speichern").getBoundingClientRect().height) };
    // b)
    go("anwesenheit"); await w(1200);
    const aw = document.getElementById("train-sub-anwesenheit");
    out.aw = { schritte: [...aw.querySelectorAll(".tp-schritt")].map(e => e.textContent.replace(/\s+/g, " ").trim()) };
    const kacheln = [...document.querySelectorAll("#aw-list .aw-tile")];
    const zahl = () => (document.getElementById("aw-zahl") || {}).textContent || "";
    const knopfT = () => (document.getElementById("aw-save-btn") || {}).textContent || "";
    const alle = () => { const a = document.getElementById("aw-alle"); return !!a && !a.hidden; };
    kacheln.forEach(b => b.classList.add("on")); awZaehlen();
    out.aw.voll = { zahl: zahl(), knopf: knopfT().trim(), alle: alle() };
    if (kacheln[0]) kacheln[0].click();
    out.aw.einer = { zahl: zahl(), knopf: knopfT().trim(), alle: alle(), n: kacheln.length };
    // c)
    try { localStorage.removeItem("adler_blitz"); } catch (e) {}
    BLZ = null; blitzOpen(); await w(400);
    const d1 = document.getElementById("blz-einst");
    out.blz = { erst: d1 ? d1.open : null, summary: d1 ? d1.querySelector("summary").textContent.replace(/\s+/g, " ").trim() : "" };
    blzBudget(25); await w(100);
    out.blz.nachTipp = (document.getElementById("blz-einst") || {}).open;
    document.getElementById("blitz-modal").remove();
    blitzOpen(); await w(400);
    const d2 = document.getElementById("blz-einst");
    out.blz.zweites = d2 ? d2.open : null;
    out.blz.summary2 = d2 ? d2.querySelector("summary").textContent.replace(/\s+/g, " ").trim() : "";
    return out;
  });
  const f = s.fehler(); await s.schliessen();
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  const p = r.plan;
  const soll = ["1Termin", "2Wer trainiert mit?", "3Inhalt wählen", "4Ablauf und Gruppen", "5Speichern und starten"];   // die Ziffer steht im Kreis davor (aria-hidden)
  if (JSON.stringify(p.schritte) !== JSON.stringify(soll)) probleme.push(`a) Schritte: ${JSON.stringify(p.schritte)}`);
  const [s1, s2, s3, s4, s5] = p.s;
  const zw = (x, a, b) => x > a && (b < 0 || x < b);
  if (!zw(p.termin, s1, s2)) probleme.push("a) Terminwahl steht nicht in Schritt 1");
  if (!zw(p.trainer, s2, s3)) probleme.push("a) Trainer stehen nicht in Schritt 2");
  if (!zw(p.vorlage, s3, s4) || !zw(p.auto, s3, s4)) probleme.push("a) Vorlage/Auto-Plan stehen nicht in Schritt 3");
  if (!p.nebeneinander) probleme.push("a) Vorlage und Auto-Plan stehen nicht nebeneinander");
  if (!zw(p.ablauf, s4, s5)) probleme.push("a) Der Ablauf steht nicht in Schritt 4");
  if (!(p.netto > s5 && p.speichern > s5 && p.start > s5)) probleme.push("a) Spielform-Minuten, Speichern und Start stehen nicht in Schritt 5");
  if (p.hStart < 56 || p.hSpeichern >= p.hStart) probleme.push(`a) Hauptaktion: Start ${p.hStart} px, Speichern ${p.hSpeichern} px`);
  if (r.aw.schritte.length !== 3) probleme.push(`b) Anwesenheit: ${JSON.stringify(r.aw.schritte)}`);
  const n = r.aw.einer.n;
  if (r.aw.voll.zahl !== `✓ ${n} da · 0 fehlen` || !r.aw.voll.knopf.endsWith(`· ${n} da`) || r.aw.voll.alle) probleme.push(`b) alle da: ${JSON.stringify(r.aw.voll)}`);
  if (r.aw.einer.zahl !== `✓ ${n - 1} da · 1 fehlt` || !r.aw.einer.knopf.endsWith(`· ${n - 1} da`) || !r.aw.einer.alle) probleme.push(`b) einer fehlt: ${JSON.stringify(r.aw.einer)}`);
  if (r.blz.erst !== true) probleme.push("c) Beim ersten Mal ist „So wird gespielt“ nicht offen");
  if (!/So wird gespielt/.test(r.blz.summary) || !/20 Min\./.test(r.blz.summary)) probleme.push(`c) Zusammenfassung: „${r.blz.summary}“`);
  if (r.blz.nachTipp !== true) probleme.push("c) Ein Tipp auf die Zeit klappt den Bereich zu");
  if (r.blz.zweites !== false) probleme.push("c) Nach einer Einstellung öffnet der Bereich beim nächsten Mal wieder offen");
  if (!/25 Min\./.test(r.blz.summary2)) probleme.push(`c) Zusammenfassung nach der Einstellung: „${r.blz.summary2}“`);
  zeilen.push(`Plan: ${p.schritte.join(" › ")} · Start ${p.hStart} px / Speichern ${p.hSpeichern} px`);
  zeilen.push(`Anwesenheit: „${r.aw.voll.zahl}“ → „${r.aw.einer.zahl}“, Knopf „${r.aw.einer.knopf}“ · Turnier: offen ${r.blz.erst} → danach ${r.blz.zweites} („${r.blz.summary2}“)`);
  return h.ergebnis("Training: Plan in fünf Schritten, Anwesenheit mit Zählung, Turnier mit Klappbereich", !probleme.length, zeilen.concat(probleme));
};
