/* v668 · Grillhütte: zwei Familien je Heimtermin, Sperrtage, Info auf der Startseite
   PO 29.09.: „Da jetzt alle Eltern informiert sind … können wir die Einteilung durch die App
   vornehmen … immer die Familie einteilen … Trackst das im Hintergrund, dass jeder auch einmal
   zugewiesen wird. Und dann informieren wir auf der ersten Startseite die jeweiligen Eltern …
   Eine Sondersituation beim Vater von Leif … an welchen Wochenenden er verfügbar ist.“
   Kacheln: zwei Familien je Heimtermin; jetzt nur den nächsten Heimtermin einteilen.
   Die Reihenfolge der Einteilung (Saison, Sperrtage, nicht zweimal am selben Tag) steckt in
   dienst_einteilen und ist in der Datenbank mit Probedaten gefahren (Rollback) – die Attrappe
   würde jede Regel bestätigen. Am DOM geprüft:
   a) Startseite: der eigene Dienst steht auch 60 Tage vorher, mit „Eure Familie ist eingeteilt“
      und „2 Familien“; kein Kindername
   b) Termin-Fenster: von zwei Zeilen am selben Termin wird die eigene gezeigt
   c) Trainer: je Termin zwei Plätze; „einteilen“ nennt die offenen Plätze; Umbuchen auf Platz 2
      schreibt platz 2; dieselbe Familie zweimal am selben Tag wird abgewiesen
   d) Sperrtag: „kann an dem Tag nicht“ schreibt dienst_sperre, „aufheben“ löscht sie
   e) dienst_sperre steht in der Sicherung */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const weit = h.tagePlus(60);
  const dienste = [
    { termin_id: 7, datum: weit, uhrzeit: "10:15", gegner: "Kinderfestival", dienst_id: 21, status: "eingeteilt", name: null, eigene: false, kann_uebernehmen: false, platz: 1, plaetze: 2 },
    { termin_id: 7, datum: weit, uhrzeit: "10:15", gegner: "Kinderfestival", dienst_id: 22, status: "eingeteilt", name: null, eigene: true, kann_uebernehmen: false, platz: 2, plaetze: 2 }
  ];
  const s = await h.starten({ start: "/eltern/index.html", warten: 1000,
    supabase: h.supabaseAttrappe({ rpc: { dienste_public: dienste } }) });
  const r = await s.page.evaluate(async () => {
    if (typeof elternBuedchenLoad !== "function") return { fehlt: true };
    let slot = document.getElementById("buedchen-slot");
    if (!slot) { slot = document.createElement("div"); slot.id = "buedchen-slot"; document.body.appendChild(slot); }
    await elternBuedchenLoad();
    const out = { karten: slot.querySelectorAll(".gh-karte").length, text: slot.textContent.replace(/\s+/g, " "),
      ersatz: !!slot.querySelector(".gh-ersatz") };
    const box = document.createElement("div"); box.id = "td-buedchen"; document.body.appendChild(box);
    await tdBuedchenLoad({ id: 7 });
    out.termin = box.textContent.replace(/\s+/g, " ");
    return out;
  });
  const f1 = s.fehler(); await s.schliessen();
  if (r.fehlt) return h.ergebnis("Grillhütte: zwei Familien, Sperrtage, Startseite", false, ["elternBuedchenLoad fehlt"]);
  if (r.karten !== 1 || !/Eure Familie ist eingeteilt/.test(r.text) || !/2 Familien/.test(r.text) || !r.ersatz) probleme.push(`a) Startseite: ${r.karten} Karten – ${r.text.slice(0, 160)}`);
  if (/Kind [A-Z]/.test(r.text + r.termin)) probleme.push("a) Kindername in der Eltern-Anzeige");
  if (!/Ihr seid dran/.test(r.termin)) probleme.push(`b) Termin-Fenster zeigt nicht die eigene Zeile: ${r.termin.slice(0, 120)}`);
  zeilen.push(`a) ${r.karten} Karte in 60 Tagen: „${r.text.slice(0, 90)}…“ · b) Termin: eigene Zeile`);

  const heute = h.tagePlus(0);
  const t = await h.starten({ warten: 1200, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    team_config: [{ id: 1, dienst_plaetze: 2 }],
    termine: [{ id: 7, datum: weit, uhrzeit: "10:15", gegner: "Kinderfestival", typ: "turnier", heim: true },
              { id: 8, datum: h.tagePlus(80), uhrzeit: "10:00", gegner: "Gastverein B", typ: "spiel", heim: true }],
    dienst_einteilung: [{ id: 21, termin_id: 7, kind_id: 1, status: "eingeteilt", uebernommen_von: null, platz: 1 }],
    dienst_sperre: [{ id: 5, kind_id: 11, datum: h.tagePlus(80) }],
    profiles: [], rpc: { dienst_einteilen: 3 }
  }) });
  const rt = await t.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    document.getElementById("pin-gate")?.remove();
    if (typeof grillTrainerOpen !== "function" || typeof grillSperren !== "function") return { fehlt: true };
    window._toasts = []; const alt = window.toast; window.toast = (m, a) => { window._toasts.push(m); try { alt && alt(m, a); } catch (e) {} };
    await grillTrainerOpen(); await w(120);
    const m = document.getElementById("gh-tr-modal");
    const out = { einteilen: (document.getElementById("gh-einteilen") || {}).textContent || "", termine: m.querySelectorAll(".gh-termin").length,
      plaetze: m.querySelectorAll('select[onchange^="grillUmbuchen"]').length, sperreText: m.textContent.replace(/\s+/g, " ") };
    const sels = [...m.querySelectorAll(".gh-termin")][0].querySelectorAll("select");
    const setze = (sel, i) => { sel.value = sel.options[i].value; sel.dispatchEvent(new Event("change")); };
    setze(sels[1], 1); await w(150);     // Platz 2 an Termin 7: Kind A – steht dort schon auf Platz 1
    const sels2 = [...document.querySelectorAll("#gh-tr-modal .gh-termin")][0].querySelectorAll("select");
    setze(sels2[1], 2); await w(150);    // Platz 2: Kind B
    const sels3 = [...document.querySelectorAll("#gh-tr-modal .gh-termin")][0].querySelectorAll("select");
    setze(sels3[2], 3); await w(150);    // Sperrtag: Kind C
    const weg = [...document.querySelectorAll("#gh-tr-modal button")].find(b => /aufheben/.test(b.textContent));
    if (weg) weg.click(); await w(150);
    out.toasts = window._toasts.slice();
    return out;
  });
  const tg = t.gesendet.filter(x => /dienst_/.test(x.pfad)).map(x => x.methode + " " + x.pfad.split("/").pop() + (x.suche || "") + " " + JSON.stringify(x.body));
  const f2 = t.fehler(); await t.schliessen();
  if (rt.fehlt) return h.ergebnis("Grillhütte: zwei Familien, Sperrtage, Startseite", false, ["grillTrainerOpen/grillSperren fehlt"]);
  if (!/3 Plätze offen/.test(rt.einteilen)) probleme.push(`c) Einteilen-Knopf: „${rt.einteilen}“`);
  if (rt.termine !== 2 || rt.plaetze < 4) probleme.push(`c) ${rt.termine} Termine, ${rt.plaetze} Plätze sichtbar`);
  if (!rt.toasts.some(x => /schon/.test(x))) probleme.push("c) Dieselbe Familie zweimal am selben Tag nicht abgewiesen");
  const post2 = tg.filter(x => /^POST dienst_einteilung /.test(x));
  if (post2.length !== 1 || !/"platz":2/.test(post2[0]) || !/"kind_id":2/.test(post2[0])) probleme.push(`c) Umbuchen Platz 2: ${JSON.stringify(post2)}`);
  if (!tg.some(x => /^POST dienst_sperre /.test(x) && /"kind_id":3/.test(x) && /"datum"/.test(x))) probleme.push(`d) Sperrtag nicht geschrieben: ${JSON.stringify(tg)}`);
  if (!/Kann an dem Tag nicht/.test(rt.sperreText)) probleme.push("d) Bestehende Sperre wird nicht angezeigt");
  if (!tg.some(x => /^DELETE dienst_sperre\?id=eq\.5/.test(x))) probleme.push(`d) Aufheben löscht nicht: ${JSON.stringify(tg)}`);
  const views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  if (!/"dienst_sperre"/.test(views)) probleme.push("e) dienst_sperre fehlt in der Sicherung");
  if (f1.length || f2.length) probleme.push("Konsole: " + f1.concat(f2).slice(0, 2).join(" | "));
  zeilen.push(`c) „${rt.einteilen.trim()}“ · ${rt.termine} Termine je 2 Plätze · doppelt abgewiesen · ${post2.join(" ")}`);
  zeilen.push(`d) ${tg.filter(x => /sperre/.test(x)).join(" · ")}`);
  return h.ergebnis("Grillhütte: zwei Familien, Sperrtage, Startseite", !probleme.length, probleme.length ? probleme : zeilen);
};
