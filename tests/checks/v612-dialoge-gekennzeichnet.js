/* v612 · Paket C, zweiter Schritt: jedes Fenster ist ein Dialog.

   Befund der App-Prüfung vom 24.09.: Rund 130 Overlays entstehen als fest positioniertes
   <div> direkt am body, ohne role="dialog". CLAUDE.md verlangt die Kennzeichnung – ohne sie
   greift der zentrale Fokus-Trap nicht, der Fokus bleibt beim Öffnen hinter dem Fenster, und
   ein Bildschirmleser kündigt nichts an.

   Jetzt kennzeichnet core.js ein neues Vollbild-Overlay selbst (_dialogKennzeichnen).

   a) Sechs echte Fenster des Trainers: role="dialog", aria-modal="true", ein Name, und der
      Fokus steht nach dem Öffnen darin.
   b) Tab bleibt im Fenster: nach 25× Tab ist der Fokus nicht dahinter gelandet.
   c) Eine Meldung (toast) wird NICHT zum Dialog – sie ist klein und blockiert nichts. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ warten: 2500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });   // Start ist durch, bevor Fenster aufgehen
  await s.page.evaluate(() => document.getElementById("pin-gate")?.remove());
  const fenster = [];
  for (const name of ["materialOpen", "trainerPlanOpen", "pausenOpen", "notfallTrainerOpen", "fundbueroOpen", "kasseOpen"]) {
    const e = await s.page.evaluate(async (name) => {
      if (typeof window[name] !== "function") return { name, fehlt: true };
      const vorher = new Set([...document.body.children]);
      try { await window[name](); } catch (e) {}
      await new Promise(r => setTimeout(r, 1200));   // Inhalt nachladen, dann kommt auch der Name
      const neu = [...document.body.children].filter(el => !vorher.has(el) && getComputedStyle(el).position === "fixed");
      const dlg = neu[neu.length - 1];
      if (!dlg) return { name, keinFenster: true };
      dlg.dataset.v612 = "1";
      return { name, role: dlg.getAttribute("role"), modal: dlg.getAttribute("aria-modal"),
        label: dlg.getAttribute("aria-label") || (dlg.getAttribute("aria-labelledby") ? "(labelledby)" : ""),
        fokusDrin: dlg.contains(document.activeElement) };
    }, name);
    if (!e.fehlt && !e.keinFenster) {
      // b) echte Tab-Taste, 25-mal
      let raus = 0;
      for (let i = 0; i < 25; i++) {
        await s.page.keyboard.press("Tab");
        if (!(await s.page.evaluate(() => { const d = document.querySelector("[data-v612]"); return !!d && d.contains(document.activeElement); }))) raus++;
      }
      e.raus = raus;
      await s.page.evaluate(() => document.querySelector("[data-v612]")?.remove());
    }
    fenster.push(e);
  }
  // c) Meldung
  const toastRolle = await s.page.evaluate(async () => {
    toast("Gespeichert");
    await new Promise(r => setTimeout(r, 100));
    const t = [...document.body.children].reverse().find(el => /Gespeichert/.test(el.textContent || ""));
    return t ? t.getAttribute("role") : "(nicht gefunden)";
  });
  const r = { fenster, toastRolle };
  const f = s.fehler();
  await s.schliessen();

  for (const e of r.fenster) {
    if (e.fehlt || e.keinFenster) { probleme.push(`a) ${e.name}: ${e.fehlt ? "Funktion fehlt" : "kein Fenster geöffnet"}`); continue; }
    if (e.role !== "dialog" || e.modal !== "true") probleme.push(`a) ${e.name}: role=${e.role} aria-modal=${e.modal}`);
    if (!e.label) probleme.push(`a) ${e.name}: Fenster ohne Namen`);
    if (!e.fokusDrin) probleme.push(`a) ${e.name}: Fokus steht nach dem Öffnen nicht im Fenster`);
    if (e.raus) probleme.push(`b) ${e.name}: Tab führte ${e.raus}× aus dem Fenster`);
  }
  if (r.toastRolle === "dialog") probleme.push("c) die Meldung wurde als Dialog gekennzeichnet");
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  zeilen.push("a/b) " + r.fenster.map(e => `${e.name}: ${e.role || "–"}${e.label ? " „" + e.label.slice(0, 24) + "“" : ""}${e.fokusDrin ? " · Fokus drin" : ""}${e.raus ? " · " + e.raus + "× raus" : ""}`).join(" | "));
  zeilen.push(`c) Meldung: role=${r.toastRolle}`);
  return h.ergebnis("v612 Fenster sind Dialoge: Rolle, Name, Fokus drin, Tab bleibt drin, Meldungen nicht", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
