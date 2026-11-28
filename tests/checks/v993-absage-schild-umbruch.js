/* v993 · Charles 28.11.2026 (zwei Bildschirmfotos, Termin 05.12.): „Die Ansicht hat sich irgendwie verschoben … erst wird die Kachel
   groß angezeigt, dann kann ich sie auf dem Bildschirm reduzieren und dann ist es optisch wieder richtig.“
   Ursache: Der Termin am 06.12. ist abgesagt mit einem langen Grund („Die Halle vor Ort ist nicht nutzbar. Evtl gibt es einen
   Ausweichtermin im Januar.“). Das Schild „🔴 Fällt aus · Grund“ hatte white-space:nowrap und stand in der Terminliste (seit v983)
   mit flex:none neben dem Titel – es ragte rechts aus dem Bildschirm („…nuar.“ im Hintergrund), die Seite wurde breiter, und der
   Browser zeigte sie vergrößert an, bis man sie zusammenschob.
   a) Terminliste in Handybreite (390 px) mit dem langen Grund: die Seite wird nicht breiter als der Bildschirm, das Schild bleibt
      ganz in der Zeile und nennt den Grund vollständig
   b) das Schild allein in einer schmalen Spalte (240 px): nicht breiter als die Spalte, „🔴 Fällt aus“ bricht nicht um */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const GRUND = "Die Halle vor Ort ist nicht nutzbar. Evtl gibt es einen Ausweichtermin im Januar.";
  const s = await h.starten({ breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await s.page.evaluate(async (GRUND) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 60 && (typeof tmRow !== "function" || typeof terminAbsageChip !== "function"); i++) await w(100);
    if (typeof tmRow !== "function") return { fehlt: true };
    const t = { id: 110, typ: "turnier", datum: "2026-12-06", uhrzeit: "09:00:00", titel: "Hallenturnier SC Borussia Lindenthal", platz_status: "abgesagt", platz_status_note: GRUND };
    const o = {};
    const vorher = document.documentElement.scrollWidth;
    const box = document.createElement("div"); box.style.cssText = "padding:0 16px"; box.innerHTML = tmRow(t);
    document.body.prepend(box); await w(50);
    const zeile = box.querySelector(".tm-zeile"), chip = box.querySelector(".tm-absage span");
    const zr = zeile.getBoundingClientRect(), cr = chip.getBoundingClientRect();
    o.a = { seite: document.documentElement.scrollWidth, vorher, fenster: window.innerWidth, chipRechts: Math.round(cr.right), zeileRechts: Math.round(zr.right), text: chip.textContent };
    box.remove();
    const spalte = document.createElement("div"); spalte.style.cssText = "width:240px"; spalte.innerHTML = terminAbsageChip(t);
    document.body.prepend(spalte); await w(50);
    const c2 = spalte.firstElementChild, kopf = c2.firstElementChild || c2;   // ältere Fassung ohne eigenes Element für „Fällt aus“
    o.b = { breite: Math.round(c2.getBoundingClientRect().width), kopfZeilen: Math.round(kopf.getBoundingClientRect().height / parseFloat(getComputedStyle(c2).lineHeight)) };
    spalte.remove();
    return o;
  }, GRUND);
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) return h.ergebnis("v993 Absage-Schild bricht um", false, ["tmRow fehlt"]);
  if (r.a.seite > r.a.fenster || r.a.chipRechts > r.a.zeileRechts || !r.a.text.includes(GRUND)) probleme.push("a) " + JSON.stringify(r.a));
  else zeilen.push(`a) Terminliste 390 px: Seite ${r.a.seite} px breit (Fenster ${r.a.fenster}), Schild endet bei ${r.a.chipRechts} in der Zeile (${r.a.zeileRechts}), Grund vollständig`);
  if (r.b.breite > 240 || r.b.kopfZeilen > 1) probleme.push("b) " + JSON.stringify(r.b));
  else zeilen.push(`b) Schild in 240 px Spalte ${r.b.breite} px breit, „🔴 Fällt aus“ in einer Zeile`);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v993 Absage-Schild bricht um – die Seite wird nicht breiter als der Bildschirm", !probleme.length, zeilen.concat(probleme));
};
