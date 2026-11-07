/* v800 · Trainingsplan-Umbau (Charles 07.11.: „Bau den Seitenumbau“), nach dem UX-Audit:
   a) Zwei Zeilen im Blockkopf: voller Name oben, Zeitspanne und Dauer darunter; nichts abgeschnitten, Papierkorb ≥ 44 px
   b) Neuzeichnen behält Scrollstand und Fokus (Dauer ändern, Papierkorb fokussiert)
   c) „Block hinzufügen“ ist ein Dialog (role, aria-modal) und schließt per Esc
   d) „Einheit bewerten“ zeigt sofort eine Ladezeile, nicht erst nach den Abfragen */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ breite: 390, hoehe: 844, warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  await h.sichtbarMachen(s.page, "#main-app");
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    await loadKader(); document.getElementById("pin-gate")?.remove();
    go("planung"); await w(900);
    const out = {};
    tpSlots.length = 0; tpCoaches = {};
    tpSlots.push({ label: "Ankommen & Aufwärmen", dauer: 10, farbe: "#16a34a", typ: "warm" });
    ["Hauptteil 1", "Hauptteil 2", "Hauptteil 3", "Hauptteil 4"].forEach((l, i) => tpSlots.push({ label: l, dauer: 15, farbe: "#1a56db", typ: "main" }));
    tpRenderTimeline(); await w(200);
    const kopf = document.querySelector('.tp-slot[data-si="0"] .tp-slot-head');
    const lab = kopf.querySelector(".tp-slot-label"), zeit = kopf.querySelector(".tp-slot-time"), rm = kopf.querySelector(".tp-remove");
    out.a = { zweiZeilen: zeit.getBoundingClientRect().top >= lab.getBoundingClientRect().bottom - 2, vollerName: lab.scrollWidth <= lab.clientWidth + 1,
      rmH: Math.round(rm.getBoundingClientRect().height), rmB: Math.round(rm.getBoundingClientRect().width), quer: document.documentElement.scrollWidth <= innerWidth + 1 };
    // b) Scroll + Fokus
    tpRenderTimeline(); await w(600);   // erst einschwingen lassen (Gruppen-Abgleich ändert die Höhe einmal)
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }); await w(150);   // ganz unten: beim Leeren der Leiste würde der Bildschirm nach oben springen
    document.querySelector('.tp-slot[data-si="4"] .tp-remove').focus({ preventScroll: true });
    const y0 = Math.round(document.querySelector('.tp-slot[data-si="4"]').getBoundingClientRect().top);
    
    const dbg = [Math.round(scrollY)]; tpRenderTimeline(); dbg.push(Math.round(scrollY)); await w(700); dbg.push(Math.round(scrollY)); out.dbg = dbg;
    out.b = { y0, y1: Math.round(document.querySelector('.tp-slot[data-si="4"]').getBoundingClientRect().top), fokus: document.activeElement && document.activeElement.classList.contains("tp-remove") && document.activeElement.closest(".tp-slot")?.dataset.si };
    // c) Dialog
    tpAddSlot(); await w(100);
    const m = document.getElementById("tp-add-modal");
    out.c = { da: !!m, role: m && m.getAttribute("role"), modal: m && m.getAttribute("aria-modal") };
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await w(100);
    out.c.zu = !document.getElementById("tp-add-modal");
    // d) Einheit bewerten: Ladezeile sofort
    const orig = window.fetch; window.fetch = (...a) => new Promise(() => {});
    einheitBewertenOpen(); await w(100);
    out.d = (document.getElementById("eb-card") || {}).textContent || "";
    window.fetch = orig; document.getElementById("eb-modal")?.remove();
    return out;
  });
  const fe = s.fehler(); await s.schliessen();
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  if (!r.a.zweiZeilen || !r.a.vollerName || r.a.rmH < 44 || r.a.rmB < 44 || !r.a.quer) probleme.push("a) Blockkopf: " + JSON.stringify(r.a));
  if (Math.abs(r.b.y1 - r.b.y0) > 6 || r.b.fokus !== "4") probleme.push("b) Scroll/Fokus: " + JSON.stringify(r.b) + JSON.stringify(r.dbg));
  if (!r.c.da || r.c.role !== "dialog" || r.c.modal !== "true" || !r.c.zu) probleme.push("c) Block-hinzufügen-Dialog: " + JSON.stringify(r.c));
  if (!/Lade/.test(r.d)) probleme.push("d) keine Ladezeile: „" + r.d.slice(0, 60) + "“");
  zeilen.push(`Blockkopf zweizeilig (Papierkorb ${r.a.rmB}×${r.a.rmH}), Scroll ${r.b.y0}→${r.b.y1} und Fokus bleiben, Dialog mit Esc, Ladezeile: „${r.d.slice(0, 30)}“`);
  return h.ergebnis("v800 Trainingsplan-Umbau", !probleme.length, probleme.length ? probleme : zeilen);
};
