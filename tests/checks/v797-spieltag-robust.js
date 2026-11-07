/* v797 · UX-Prüfung Training/Spieltag (07.11.): vier Dinge, die am Platz wehtun.
   a) Wechsel-Timer zählt nach der Uhr: nach 90 s Hintergrund stehen 90 s auf dem Konto, nicht 1 s.
      Überlauf läuft über den Takt (modulo), die 15-s-Vorwarnung kommt auch beim Sprung über die Schwelle – einmal.
   b) Wake-Lock: gibt das System ihn frei, wird der Merker gelöscht und beim Zurückkehren neu angefordert.
   c) Papierkorb im Plan: Beschriftung, Rückgängig stellt Block, Übung und Trainer an derselben Stelle wieder her.
   d) Autosave-Fehler: statt stillem Schlucken steht „Nicht gespeichert“ da; die Startleiste ist im Plan vorhanden. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ hoehe: 2400, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  await h.sichtbarMachen(s.page, "#tp-timeline");
  const r = await s.page.evaluate(async () => {
    const out = { fehlt: [] };
    for (const n of ["rotTick", "requestWakeLock", "tpRemoveSlot", "tpSpeicherFehler"]) if (typeof window[n] !== "function") out.fehlt.push(n);
    const w = ms => new Promise(x => setTimeout(x, ms));
    // a) Timer
    const vib = []; navigator.vibrate = x => { vib.push(1); return true; };
    rotIntervalMin = 5; rotElapsed = 0; rotField = ["Kind A"]; rotBench = ["Kind B"]; rotTW = null; rotFieldSec = {}; rotBenchSec = {};
    _rotLetzt = Date.now() - 90000; rotTick();
    out.a1 = { el: rotElapsed, feld: rotFieldSec["Kind A"], bank: rotBenchSec["Kind B"] };
    rotIntervalMin = 1; rotElapsed = 50; vib.length = 0; _rotLetzt = Date.now() - 20000; rotTick();
    out.a2 = { el: rotElapsed, vib: vib.length };            // 70 % 60 = 10, Takt-Signal (1× vibrate)
    rotElapsed = 40; vib.length = 0; _rotLetzt = Date.now() - 10000; rotTick();
    out.a3 = { el: rotElapsed, vib: vib.length };            // über 45 gesprungen → genau eine Vorwarnung
    _rotLetzt = null;
    // b) Wake-Lock
    let anf = 0, hoerer = null;
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request: async () => { anf++; return { addEventListener: (_, f) => { hoerer = f; }, release() {} }; } } });
    wakeLock = null; await requestWakeLock(); await requestWakeLock();
    out.b1 = anf; hoerer && hoerer(); out.b2 = wakeLock; await requestWakeLock(); out.b3 = anf;
    // c) Papierkorb
    tpSlots.length = 0; tpCoaches = {};
    tpSlots.push({ label: "Hauptteil 1", dauer: 20, farbe: "#1a56db", typ: "main" });
    tpSlots.push({ label: "Hauptteil 2", dauer: 20, farbe: "#7c3aed", typ: "main" });
    tpSlots.push({ label: "Hauptteil 3", dauer: 20, farbe: "#7c3aed", typ: "main" });
    tpRenderTimeline();
    const sel = document.getElementById("tp-form-1-0"); sel.value = sel.options[4].value; tpOnSelectChange(sel);
    const gewaehlt = sel.value;
    out.label = document.querySelector('.tp-slot[data-si="0"] .tp-remove')?.getAttribute("aria-label") || "";
    tpRemoveSlot(1);
    out.nach = tpSlots.map(x => x.label);
    const knopf = [...document.querySelectorAll("#undo-toast button")].find(b => /rückgängig/i.test(b.textContent));
    out.knopf = !!knopf; if (knopf) knopf.click();
    await w(100);
    out.zurueck = tpSlots.map(x => x.label);
    out.uebung = document.getElementById("tp-form-1-0")?.value === gewaehlt;
    // d) Fehlerhinweis + Leiste
    tpSpeicherFehler("2099-01-01");
    out.fehler = (document.getElementById("tp-gespeichert") || {}).textContent || "";
    out.leiste = !!document.getElementById("tp-start-leiste");
    return out;
  });
  if (r.fehlt.length) probleme.push("fehlt: " + r.fehlt.join(", "));
  if (r.a1.el !== 90 || r.a1.feld !== 90 || r.a1.bank !== 90) probleme.push("a1) 90 s Hintergrund: " + JSON.stringify(r.a1));
  if (r.a2.el !== 10 || r.a2.vib !== 1) probleme.push("a2) Überlauf: " + JSON.stringify(r.a2));
  if (r.a3.el !== 50 || r.a3.vib !== 1) probleme.push("a3) Vorwarnung beim Sprung: " + JSON.stringify(r.a3));
  if (r.b1 !== 1) probleme.push("b1) Doppelanforderung: " + r.b1);
  if (r.b2 !== null || r.b3 !== 2) probleme.push(`b2/b3) nach Freigabe nicht neu angefordert (${r.b2}, ${r.b3})`);
  if (!/Block .*löschen/.test(r.label)) probleme.push("c1) Papierkorb ohne Beschriftung: " + r.label);
  if (r.nach.join() !== "Hauptteil 1,Hauptteil 3") probleme.push("c2) Löschen: " + r.nach);
  if (!r.knopf) probleme.push("c3) keine Rückgängig-Meldung");
  if (r.zurueck.join() !== "Hauptteil 1,Hauptteil 2,Hauptteil 3" || !r.uebung) probleme.push(`c4) Rückgängig: ${r.zurueck} / Übung ${r.uebung}`);
  if (!/Nicht gespeichert/.test(r.fehler)) probleme.push("d1) kein Hinweis: " + r.fehler);
  if (!r.leiste) probleme.push("d2) Startleiste fehlt");
  const fe = s.fehler(); if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  await s.schliessen();
  zeilen.push("Timer zählt nach der Uhr (90 s → 90 s), Vorwarnung einmalig; Wake-Lock wird nach Freigabe neu geholt; Papierkorb beschriftet, Rückgängig stellt Block samt Übung her; Speicherfehler sichtbar");
  return h.ergebnis("v797 Spieltag/Training robust", !probleme.length, probleme.length ? probleme : zeilen);
};
