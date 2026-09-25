/* v623 · PO (Bildschirmfoto Trainingsplan, Durchgang 2 von 15 Min.): „Der Hinweis 3 Minuten frei,
   dann eng, macht der Sinn? Und durch die Anpassungen der Zeiten in den Hauptteilen stimmen die
   Zeitangaben in den Beschreibungen der Übungen nicht mehr." Rückfragen: Hinweis ganz weglassen;
   Anteile statt Minuten, dazu die Planzeit im Info-Fenster.

   a) Vorlagen: „3 Min frei, dann eng" steht in keinem Block mehr, der Stand ist hochgesetzt
      (die Struktur prüft weiter v568).
   b) Bibliothek: Schusszone, Pass zählt doppelt und Raute teilen die geplante Zeit in Anteile
      statt in feste Minuten; Stand hoch, _euPruefung grün.
   c) Gespeicherte Pläne: Ein Label alter Art verliert den Hinweis beim Zeichnen – die Feldtexte
      hinter „|" bleiben, auch der angelegte Durchgang 2 trägt ihn nicht.
   d) Info-Fenster aus dem Plan: „Im Plan: 15 Min." und daneben der Richtwert der Übung; aus der
      Übungsdatenbank (ohne Plan) bleibt die alte Anzeige. */
"use strict";
module.exports = async function (h) {
  const fs = require("fs"), path = require("path");
  const probleme = [], zeilen = [];
  const lies = f => fs.readFileSync(path.join(h.REPO, f), "utf8");
  const vorTxt = lies("uebungen/vorlagen.json"), bibTxt = lies("uebungen/bibliothek.json");
  const vor = JSON.parse(vorTxt), bib = JSON.parse(bibTxt);

  // a) Vorlagen
  if (/Min frei, dann eng/.test(vorTxt)) probleme.push("a) „3 Min frei, dann eng“ steht noch in vorlagen.json");
  if (String(vor.stand) <= "2026-09-18-1") probleme.push(`a) Vorlagen-Stand „${vor.stand}“ nicht hochgesetzt`);

  // b) Bibliothek
  const NAMEN = ["3 gegen 3 auf vier Minitore mit Schusszone", "3 gegen 3 auf vier Minitore – Pass zählt doppelt", "Raute mit Torwart – Angriff über den anderen Flügel"];
  for (const n of NAMEN) {
    const u = bib.uebungen.find(x => x.name === n);
    if (!u) { probleme.push(`b) „${n}“ fehlt`); continue; }
    const fest = String(u.ablauf).match(/(Teil [AB], \d+ Minuten|\d+ Minuten (frei|mit Regel|offen)|Minute \d+–\d+|\d+ Minuten in drei Abschnitten)/);
    if (fest) probleme.push(`b) „${n}“: feste Zeit „${fest[0]}“`);
    if (!/geplanten? Zeit/.test(u.ablauf)) probleme.push(`b) „${n}“: kein Anteil der geplanten Zeit`);
  }
  if (String(bib.stand) <= "2026-09-25-1") probleme.push(`b) Bibliotheks-Stand „${bib.stand}“ nicht hochgesetzt`);

  const s = await h.starten({ hoehe: 2000, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  await h.sichtbarMachen(s.page, "#tp-timeline");
  const r = await s.page.evaluate(async ({ vorTxt, bibTxt }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = {};
    out.ev = [];   // Struktur der Vorlagen prüft v568 gegen die Übungen; hier zählt nur der Text
    out.eu = typeof _euPruefung === "function" ? _euPruefung(bibTxt).fehler : ["_euPruefung fehlt"];
    if (typeof tpOhneFreiEng !== "function") { out.fehlt = true; return out; }
    await loadKader();
    // c) gespeicherter Plan alter Art
    tpSlots.length = 0; tpCoaches = {};
    tpSlots.push({ label: "Hauptteil 1 – Stationen, 3 Min frei, dann eng: Adler aus dem Tor (Punkt nur, wenn …) | 2 gegen 1 plus Torwart", dauer: 15, typ: "main" });
    tpSlots.push({ label: "Abschlussturnier", dauer: 18, typ: "abschluss" });
    tpRenderTimeline();
    out.label = tpSlots[0].label;
    out.feld = (tpFeldTexte(0) || []).length;
    out.dom = [...document.querySelectorAll(".tp-slot-label")].map(e => e.textContent.trim()).join(" / ");
    tpDurchgaengeSetzen(0, 2); await warte(60);
    out.dg2 = (tpSlots[1] || {}).label || "";
    // d) Info-Fenster
    const sel = document.getElementById("tp-form-0-0");
    const alle = tpAllForms();
    const idx = alle.findIndex(f => f && f.dauer && !/^15\b/.test(String(f.dauer)));
    out.dbg = { sel: !!sel, idx, n: alle.length };
    if (sel && idx >= 0) {
      if (![...sel.options].some(o => o.value === String(idx))) sel.add(new Option("x", String(idx)));
      sel.value = String(idx);
      tpShowExFromSel("tp-form-0-0"); await warte(30);
      const m = document.getElementById("uebung-modal");
      out.info = m ? m.textContent.replace(/\s+/g, " ") : "";
      m && m.remove();
      tpShowExercise(idx); await warte(30);
      const m2 = document.getElementById("uebung-modal");
      out.ohnePlan = m2 ? m2.textContent.replace(/\s+/g, " ") : "";
      m2 && m2.remove();
    }
    return out;
  }, { vorTxt, bibTxt }).catch(e => ({ err: String(e) }));
  const fe = s.fehler();
  await s.schliessen();

  if (r.err) probleme.push("Seite: " + r.err);
  else {
    if (r.ev.length) probleme.push("a) vorlagen.json besteht die Prüfung nicht: " + r.ev.slice(0, 3).join(" · "));
    if (r.eu.length) probleme.push("b) bibliothek.json besteht die Prüfung nicht: " + r.eu.slice(0, 3).join(" · "));
    if (r.fehlt) probleme.push("c) tpOhneFreiEng fehlt");
    else {
      if (/Min frei/.test(r.label)) probleme.push(`c) gespeichertes Label behält den Hinweis: „${r.label}“`);
      if (!/\|/.test(r.label) || r.feld < 2) probleme.push(`c) Feldtexte verloren (${r.feld})`);
      if (/Min frei/.test(r.dom)) probleme.push(`c) Blockkopf zeigt den Hinweis: ${r.dom}`);
      if (/Min frei/.test(r.dg2) || !/Durchgang 2/.test(r.dg2)) probleme.push(`c) Durchgang 2: „${r.dg2}“`);
      if (!/Im Plan: 15 Min\./.test(r.info || "")) probleme.push(`d) Info-Fenster ohne Planzeit: ${String(r.info).slice(0, 120)} ${JSON.stringify(r.dbg)}`);
      if (!/Richtwert \d+/.test(r.info || "")) probleme.push("d) Info-Fenster ohne Richtwert der Übung");
      if (/Im Plan/.test(r.ohnePlan || "")) probleme.push("d) Info ohne Plan behauptet eine Planzeit");
    }
    zeilen.push(`c) „${r.label}“ · DG2 „${r.dg2}“ · d) ${(String(r.info).match(/Im Plan: \d+ Min\.[^👥]*/) || ["–"])[0].trim()}`);
  }
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v623 Planzeit statt fester Minuten, kein „3 Min frei, dann eng“", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
