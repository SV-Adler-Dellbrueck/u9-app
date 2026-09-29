/* v672 · Rückmelde-Verhalten je Kind (nur Trainer), übernommener Grillhütten-Dienst zählt für die
   übernehmende Familie
   PO 29.09.: „Kann die App tracken über mehrere Wochen hinweg, wann die Zusagen für einen Termin der
   Eltern getätigt wurden … wie oft dann wieder abgesagt wurde … auf der Basis des Kindes.“ Kacheln:
   „Bauen, nur Trainer“ und „Der übernehmenden Familie“.
   Protokoll, Rechte und Zählung sind in der Datenbank gefahren (Rollback): Eltern schreiben wie
   gewohnt, jede Statusänderung landet im Protokoll, Eltern lesen es nicht.
   a) Kachel „Rückmelde-Verhalten“ unter Kommunikation; das Fenster ist ein Dialog mit einer Tabelle
      je Kind, sortiert wie geliefert (nach Name), ohne Ampelfarben
   b) Umschalten Spieltage ↔ Training; „ohne Antwort“ nur bei Spieltagen; Vorlauf lesbar (Tage/Std.)
   c) Grillhütte: übernommener Dienst nennt die übernehmende Familie und „zählt für sie“
   d) Sicherung enthält rueckmeldung_log; der Eltern-Bereich ruft die Auswertung nie auf */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const K = h.KINDER;
  const stat = [
    { spieler_id: 1, name: K[0], art: "spiel", antworten: 3, vorlauf_std: 96.5, kurzfristig: 0, umentschieden: 1, zu_dann_ab: 1, ohne_antwort: 0 },
    { spieler_id: 1, name: K[0], art: "training", antworten: 5, vorlauf_std: 0.2, kurzfristig: 5, umentschieden: 0, zu_dann_ab: 0, ohne_antwort: null },
    { spieler_id: 2, name: K[1], art: "spiel", antworten: 1, vorlauf_std: 5, kurzfristig: 1, umentschieden: 0, zu_dann_ab: 0, ohne_antwort: 2 }
  ];
  const t = await h.starten({ warten: 1200, hoehe: 1200, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), team_config: [{ id: 1, dienst_plaetze: 2 }],
    termine: [{ id: 7, datum: h.tagePlus(40), uhrzeit: "10:15", gegner: "Kinderfestival", typ: "turnier", heim: true }],
    dienst_einteilung: [{ id: 30, termin_id: 7, kind_id: 1, status: "uebernommen", uebernommen_von: "u-x", uebernommen_kind: 2, platz: 1 }],
    dienst_sperre: [], dienst_befreit: [], profiles: [],
    rpc: { rueckmelde_statistik: stat }
  }) });
  const r = await t.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    document.getElementById("pin-gate")?.remove();
    const out = { fehlt: [] };
    for (const n of ["rueckmeldeStatistikOpen", "rueckmeldeStatistikRender", "grillTrainerOpen"]) if (typeof window[n] !== "function") out.fehlt.push(n);
    if (out.fehlt.length) return out;
    out.kachel = /rueckmeldeStatistikOpen/.test(_kachelInhalt("elki"));
    await rueckmeldeStatistikOpen(); await w(150);
    const m = document.getElementById("rs-modal");
    const zeilen = () => [...m.querySelectorAll("tbody tr")].map(tr => [...tr.children].map(td => td.textContent.trim()));
    out.a = { dialog: m.getAttribute("role"), kopf: [...m.querySelectorAll("thead th")].map(x => x.textContent.trim()), zeilen: zeilen(),
      farben: [...m.querySelectorAll("tbody td")].filter(td => /red|green|amber|#dc2626|#16a34a/.test(td.getAttribute("style") || "")).length };
    rueckmeldeStatistikRender("training"); await w(30);
    out.b = { kopf: [...m.querySelectorAll("thead th")].map(x => x.textContent.trim()), zeilen: zeilen() };
    m.remove();
    await grillTrainerOpen(); await w(150);
    out.c = (document.getElementById("gh-tr-inhalt") || {}).textContent || "";
    return out;
  });
  const f = t.fehler(); await t.schliessen();
  if (r.fehlt.length) return h.ergebnis("Rückmelde-Verhalten und Übernehmen", false, [r.fehlt.join(", ") + " fehlt"]);
  if (!r.kachel) probleme.push("a) Kachel fehlt unter Kommunikation");
  if (r.a.dialog !== "dialog") probleme.push("a) kein Dialog");
  if (r.a.zeilen.length !== 2 || r.a.zeilen[0][0] !== K[0]) probleme.push(`a) Zeilen Spieltage: ${JSON.stringify(r.a.zeilen)}`);
  if (!r.a.kopf.includes("ohne Antwort")) probleme.push("b) Spalte „ohne Antwort“ fehlt bei Spieltagen");
  if (r.a.farben) probleme.push("a) Ampelfarben in der Tabelle");
  if (!r.a.zeilen.some(z => z.includes("4,0 Tage")) || !r.a.zeilen.some(z => z.includes("5 Std."))) probleme.push(`b) Vorlauf-Format: ${JSON.stringify(r.a.zeilen)}`);
  if (r.b.kopf.includes("ohne Antwort")) probleme.push("b) „ohne Antwort“ steht auch beim Training");
  if (r.b.zeilen.length !== 1 || !r.b.zeilen[0].includes("unter 1 Std.")) probleme.push(`b) Training: ${JSON.stringify(r.b.zeilen)}`);
  if (!/übernommen von Kind Bs Familie \(zählt für sie\)/.test(r.c)) probleme.push(`c) Grillhütte: ${r.c.slice(0, 200)}`);
  const views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  if (!/"rueckmeldung_log"/.test(views)) probleme.push("d) rueckmeldung_log fehlt in der Sicherung");
  const eltern = fs.readFileSync(path.join(h.REPO, "md-eltern-portal.js"), "utf8");
  if (/rueckmelde_statistik/.test(eltern)) probleme.push("d) Der Eltern-Bereich ruft die Auswertung auf");
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  zeilen.push(`a) Tabelle Spieltage: ${r.a.zeilen.map(z => z.slice(0, 3).join("/")).join(" · ")}`);
  zeilen.push(`b) Training ohne „ohne Antwort“ · c) übernommen zählt für die übernehmende Familie · d) Sicherung, Eltern ohne Zugriff`);
  return h.ergebnis("Rückmelde-Verhalten und Übernehmen", !probleme.length, probleme.length ? probleme : zeilen);
};
