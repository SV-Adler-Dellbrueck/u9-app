/* v846 · Rückmeldungen: ein Name, ein Weg (Bestandsaufnahme November 2026, 2.8).
   Vorher: zwei Fenster mit demselben Titel „Rückmeldungen“ (Stand mit Erinnern; Detail mit Zeitpunkt, Grund, Verlauf), erreichbar
   über „Rückmeldungen der Eltern“, „Antworten“ und einen Eintrag hinter „Für die Eltern“ – ohne Verbindung untereinander.
   a) Alle Einstiege heißen „Rückmeldungen“ und öffnen den Stand; der versteckte Eintrag heißt „Rückmeldungen im Detail“.
   b) Im Stand steht „Wann wurde geantwortet?“ (≥ 44 px) und öffnet das Detail über dem Stand.
   c) Im Detail führt „Zum Stand“ zurück; die Fenster tragen verschiedene Titel („– Stand“, „– im Detail“).
   d) Die Gruppe ohne Rückmeldung heißt „Keine Rückmeldung“ (Wortliste v842). */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v846 Rückmeldungen: Stand und Detail verbunden, alle Einstiege heißen gleich";
  const probleme = [], zeilen = [];
  const d1 = h.tagePlus(2);
  const termine = [{ id: 4, datum: d1, uhrzeit: "16:45", uhrzeit_ende: "18:00", typ: "training", titel: "", trainer_status: {} }];
  const s = await h.starten({ warten: 1800, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine,
    rueckmeldungen: [{ termin_id: 4, spieler_id: 1, status: "zugesagt" }, { termin_id: 4, spieler_id: 2, status: "abgesagt" }],
    rpc: { rueckmelde_termin: [{ name: "Kind A", status: "zugesagt", letzte_aenderung: new Date().toISOString(), beginn: d1 + "T16:45:00", genau: true, verlauf: [] },
      { name: "Kind B", status: "abgesagt", grund: "Geburtstag", letzte_aenderung: new Date().toISOString(), beginn: d1 + "T16:45:00", genau: true, verlauf: [] }, { name: "Kind C", status: null, verlauf: [] }] } }) });
  await h.sichtbarMachen(s.page, "#main-app");
  const r = await s.page.evaluate(async (termine) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    await loadKader(); TM_TERMINE = termine;
    await rsvpOverviewOpen(4); await w(300);
    const ov = document.getElementById("rsvp-ov-modal"); if (!ov) return { fehler: "Stand-Fenster öffnet nicht" };
    const kn = document.getElementById("rsvp-ov-detail");
    const out = { titelStand: ov.querySelector(".mdl-titel").textContent.trim(), knopf: kn ? Math.round(kn.getBoundingClientRect().height) : 0, knopfText: kn ? kn.textContent.trim() : "" };
    if (!kn) return out;
    kn.click(); await w(400);
    const rmd = document.getElementById("rmd-modal");
    out.detail = !!rmd; if (!rmd) return out;
    out.titelDetail = rmd.querySelector(".mdl-titel").textContent.trim();
    out.ueber = Number(getComputedStyle(rmd).zIndex) > Number(getComputedStyle(ov).zIndex);
    out.gruppen = rmd.textContent.replace(/\s+/g, " ");
    const zurueck = document.getElementById("rmd-zum-stand"); out.zurueck = zurueck ? Math.round(zurueck.getBoundingClientRect().height) : 0;
    if (zurueck) zurueck.click(); await w(200);
    out.nachZurueck = { detailZu: !document.getElementById("rmd-modal"), standOffen: !!document.getElementById("rsvp-ov-modal") };
    document.getElementById("rsvp-ov-modal")?.remove();
    await rmdOpen(4); await w(400); document.getElementById("rmd-zum-stand").click(); await w(600);
    out.vonDetailAllein = !!document.getElementById("rsvp-ov-modal") && !document.getElementById("rmd-modal");
    return out;
  }, termine).catch(e => ({ fehler: String(e) }));
  const fe = s.fehler(); await s.schliessen();
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  if (!r.knopf && !/– Stand/.test(r.titelStand || "")) return h.ergebnis(titel, false, ["Stand vor v846: kein Weg vom Stand ins Detail"]);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  const q = fs.readFileSync(path.join(h.REPO, "md-gegner.js"), "utf8");
  if (/Rückmeldungen der Eltern<\/button>|<\/i>Antworten<\/button>/.test(q) || !/l:"Rückmeldungen im Detail"/.test(q)) probleme.push("a) Einstiege heißen nicht einheitlich „Rückmeldungen“ bzw. „Rückmeldungen im Detail“");
  if (r.knopf < 44 || !/Wann wurde geantwortet/.test(r.knopfText) || !r.detail || !r.ueber) probleme.push("b) Weg ins Detail: " + JSON.stringify({ k: r.knopf, t: r.knopfText, offen: r.detail, ueber: r.ueber }));
  if (r.titelStand === r.titelDetail || !/Stand/.test(r.titelStand) || !/Detail/.test(r.titelDetail || "")) probleme.push(`c) Titel: „${r.titelStand}“ / „${r.titelDetail}“`);
  if (r.zurueck < 44 || !r.nachZurueck || !r.nachZurueck.detailZu || !r.nachZurueck.standOffen || !r.vonDetailAllein) probleme.push("c) Weg zurück: " + JSON.stringify({ z: r.zurueck, n: r.nachZurueck, allein: r.vonDetailAllein }));
  if (!/Keine Rückmeldung · 1/.test(r.gruppen || "") || /Keine Antwort/.test(r.gruppen || "")) probleme.push("d) Gruppe ohne Rückmeldung falsch benannt");
  if (!probleme.length) zeilen.push(`„${r.titelStand}“ → „${r.knopfText.slice(0, 24)}…“ (${r.knopf} px) → „${r.titelDetail}“ → „Zum Stand“ (${r.zurueck} px) zurück`);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
