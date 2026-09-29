/* v677 · Trainingseinsatz frei, Monatsübersicht in der Profilbewertung
   PO 29.09.: „Die Bewertung, die ich dir im Screenshot geschickt hatte, ist ja die Bewertung des
   Trainingseinsatzes nach einem einzelnen Training. Die Bewertung, die wir erstmal gesperrt haben,
   ist ja die Profilerstellung … da würde es natürlich helfen, wenn man auch dafür eine Übersicht
   bekommt, wie der Trainingseinsatz des einzelnen Kindes im Laufe der letzten Monate war.“
   Kachel: „Ja, so bauen“.
   a) Ohne Startdatum (Profilbewertung gesperrt) zeigt „Einheit bewerten“ die Sterne je Kind
   b) Team → Bewerten: beim gewählten Kind steht „Trainingseinsatz“ je Monat – Durchschnitt der
      Sterne (nur Tage mit Sternen), wie oft bewertet, wie oft da von wie vielen Trainings
   c) Die Profilbewertung selbst bleibt ohne Startdatum gesperrt
   d) Der Eltern- und Kinderbereich kennt die Übersicht nicht */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const K = h.KINDER;
  const tag = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
  const monat = d => d.slice(0, 7);
  // zwei Trainings in diesem Monat, zwei im Vormonat (Tage so gewählt, dass sie sicher im Monat liegen)
  const heute = new Date(), erster = new Date(heute.getFullYear(), heute.getMonth(), 1, 12);
  const dieser = [tag(0), new Date(erster).toISOString().slice(0, 10)];
  const vorm1 = new Date(heute.getFullYear(), heute.getMonth() - 1, 5, 12).toISOString().slice(0, 10);
  const vorm2 = new Date(heute.getFullYear(), heute.getMonth() - 1, 12, 12).toISOString().slice(0, 10);
  const plan = [{ formIdx: 1, formName: "Dribbel Quadrat", trainer: "Alle", slotLabel: "Hauptteil" }];
  const s = await h.starten({ hoehe: 1600, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), spielerprofile: [], team_einstellungen: [{ id: 1, bewertung_ab: null }], profiles: [{ name: "Charles", rolle: "trainer" }],
    anwesenheit: [], einheit_bewertung: [], trainingsplan: [{ datum: tag(1), plan, kopf: {} }], trainings_eval: [],
    termine: [{ id: 7, datum: tag(1), typ: "training" }], nominierungen: []
  }) });
  const r = await s.page.evaluate(async ({ K, dieser, vorm1, vorm2, gestern }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    document.getElementById("pin-gate")?.remove(); const m = document.getElementById("main-app"); if (m) m.style.display = "block";
    window.Chart = class { constructor() { this.data = { datasets: [{}] }; } destroy() {} update() {} };
    window.trainerMe = async () => "Charles";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    if (typeof bewEinsatzMonate !== "function") return { fehlt: true };
    const out = {};
    // a) gesperrt – trotzdem Sterne je Kind
    BEW_AB = null; bewSperreAnwenden();
    AW_DATA[gestern] = { [K[0]]: { da: true }, [K[1]]: { da: true } };
    await einheitBewertenOpen(); await einheitDetailOpen(gestern);
    for (let i = 0; i < 40 && !document.getElementById("eb-ue-0"); i++) await w(50);
    out.a = document.querySelectorAll('[id^="eb-stars-sp-"]').length;
    document.getElementById("eb-modal")?.remove();
    // b) Monatsübersicht: diese Tage zählen als Trainings
    delete AW_DATA[gestern];
    AW_DATA[dieser[0]] = { [K[0]]: { da: true, qual: 3 } };
    AW_DATA[dieser[1]] = { [K[0]]: { da: true, qual: 2 } };
    AW_DATA[vorm1] = { [K[0]]: { da: true, qual: 1 } };
    AW_DATA[vorm2] = { [K[0]]: { da: false } };
    window.awZaehltage = () => Object.keys(AW_DATA).sort();
    out.monate = bewEinsatzMonate(K[0], 6);
    BEW_AB = "2026-01-01"; bewSperreAnwenden();
    const sel = document.getElementById("p-name");
    if (![...sel.options].some(o => o.value === K[0])) { const o = document.createElement("option"); o.value = o.textContent = K[0]; sel.appendChild(o); }
    sel.value = K[0]; onPlayerSelect(); await w(50);
    out.b = (document.getElementById("bew-einsatz") || {}).textContent || "";
    out.monatsZahl = document.querySelectorAll("#bew-einsatz .bew-einsatz-monat").length;
    // c) ohne Datum gesperrt
    BEW_AB = null; bewSperreAnwenden();
    out.c = document.getElementById("view-bew").classList.contains("bew-gesperrt");
    return out;
  }, { K, dieser, vorm1, vorm2, gestern: tag(1) });
  const f = s.fehler(); await s.schliessen();
  if (r.fehlt) return h.ergebnis("Trainingseinsatz frei, Monatsübersicht", false, ["bewEinsatzMonate fehlt"]);
  if (r.a !== 2) probleme.push(`a) Ohne Startdatum ${r.a} Sternzeilen statt 2 im Bogen`);
  const jetzt = r.monate.find(x => x.monat === monat(dieser[0])) || {}, vor = r.monate.find(x => x.monat === monat(vorm1)) || {};
  if (jetzt.schnitt !== 2.5 || jetzt.bewertet !== 2 || jetzt.da !== 2 || jetzt.trainings !== 2) probleme.push(`b) Dieser Monat: ${JSON.stringify(jetzt)}`);
  if (vor.schnitt !== 1 || vor.bewertet !== 1 || vor.da !== 1 || vor.trainings !== 2) probleme.push(`b) Vormonat: ${JSON.stringify(vor)}`);
  if (!/Trainingseinsatz/.test(r.b) || !/★2,5 \(2×\) · da 2\/2/.test(r.b) || !/★1 \(1×\) · da 1\/2/.test(r.b) || r.monatsZahl !== 2) probleme.push(`b) Anzeige: „${r.b}“`);
  if (!r.c) probleme.push("c) Profilbewertung ohne Startdatum nicht mehr gesperrt");
  for (const dat of ["md-eltern-portal.js", "md-kabine.js"]) {
    if (/bewEinsatz|Trainingseinsatz/.test(fs.readFileSync(path.join(h.REPO, dat), "utf8"))) probleme.push(`d) ${dat} kennt die Übersicht`);
  }
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  zeilen.push(`a) ohne Startdatum ${r.a} Sternzeilen · b) „${r.b.replace(/\s+/g, " ").trim()}“ · c) Profil gesperrt · d) nur Trainer`);
  return h.ergebnis("Trainingseinsatz frei, Monatsübersicht", !probleme.length, probleme.length ? probleme : zeilen);
};
