/* v954 · Charles 22./23.11.: „Die Blöcke Aufwärmen, Hauptteil etc. sind immer noch optisch nicht ansehnlich und nicht gut
   strukturiert. Muss intuitiver und einfacher sein.“ – „Nach dem tieferen Umbau“ → Entwurf freigegeben („Ja, so bauen“).
   a) Gefüllter Plan: jeder Block eine Zeile mit Name, Zeit und Minuten („· 50 Min“), je Feld Übung · Trainer; fehlt eine
      Übung, steht „Übung fehlt“; keine Auswahlfelder, kein ⋯, kein − / + sichtbar; Zeile ≥ 44 px.
   b) Tippen auf die Zeile öffnet den Block als Fenster von unten (role=dialog, aria-modal, fixed, unten bündig) mit Dauer
      − / +, Übungsfeldern, Trainer, ✕ (≥ 44 px) und Fuß „Nach oben / Nach unten / Löschen“ (≥ 44 px); dahinter ein Schleier;
      die Fokus-Falle hält Tab im Fenster (es ist der oberste Dialog, der Schleier nicht).
   c) Escape schließt, der Fokus geht auf die Zeile zurück; ein Tipp auf den Schleier schließt ebenfalls.
   d) Im Fenster − / + ändert die Minuten, das Fenster bleibt offen (es hängt am Block, auch nach dem Neuzeichnen).
   e) Bei 360 px ragt nichts hinaus. */
"use strict";
module.exports = async function (h) {
  const titel = "v954 Plan ändern als Liste: eine Zeile je Block, Bearbeiten im Fenster von unten";
  const probleme = [], zeilen = [];
  const s = await h.starten({ breite: 360, hoehe: 800 });
  await h.sichtbarMachen(s.page, "#tp-timeline");
  const r = await s.page.evaluate(async (kinder) => {
    const w = ms => new Promise(x => setTimeout(x, ms)), txt = e => e ? e.textContent.replace(/\s+/g, " ").trim() : "";
    const sichtbar = e => !!e && !!e.offsetParent && getComputedStyle(e).display !== "none";
    window.KADER = kinder.map((n, i) => ({ id: i + 1, name: n, aktiv: true, nr: i + 1 }));
    tpSlots.length = 0; tpCoaches = {};
    tpSlots.push({ label: "Aufwärmen", dauer: 10, farbe: "#16a34a", typ: "warmup" }, { label: "Hauptteil", dauer: 30, farbe: "#1a56db", typ: "main" }, { label: "Abschlussspiel", dauer: 15, farbe: "#c2410c", typ: "abschluss" });
    tpRenderTimeline(); await w(100);
    const forms = tpAllForms(), hi = tpSlots.findIndex(x => x.typ === "main");
    const ids = tpWahlFelder(hi); if (ids[0]) tpWahlSetzen(ids[0], forms.findIndex(f => f && f.name));
    tpRenderTimeline(); await w(200);
    const tl = document.getElementById("tp-timeline"), out = { liste: tl.classList.contains("tp-liste") };
    const zeile = tl.querySelector(`.tp-slot[data-si="${hi}"]`), kurz = zeile && zeile.querySelector(".tp-kurz");
    out.a = { zeilen: tl.querySelectorAll(".tp-slot.tp-zeile").length, text: txt(kurz), zeit: getComputedStyle(zeile.querySelector(".tp-slot-time"), "::after").content,
      felder: [...tl.querySelectorAll(".tp-slot.tp-zeile .tp-form-sel, .tp-slot.tp-zeile .tp-pick, .tp-slot.tp-zeile .tp-mehr, .tp-slot.tp-zeile .tp-dauer")].filter(sichtbar).length,
      h: Math.round(kurz ? kurz.getBoundingClientRect().height : 0), fehlt: /Übung fehlt/.test(txt(tl.querySelector(`.tp-slot[data-si="${tpSlots.findIndex(x => x.typ === "warmup")}"] .tp-kurz`))) };
    kurz.click(); await w(150);
    const sh = tl.querySelector(".tp-slot.tp-sheet"), rr = sh && sh.getBoundingClientRect();
    out.b = { da: !!sh, role: sh && sh.getAttribute("role"), modal: sh && sh.getAttribute("aria-modal"), fixed: sh && getComputedStyle(sh).position, unten: rr ? Math.round(innerHeight - rr.bottom) : -1,
      dauer: sichtbar(sh && sh.querySelector(".tp-dauer")), pick: sichtbar(sh && sh.querySelector(".tp-pick")), zu: Math.round(sh && sh.querySelector(".tp-sheet-zu") ? sh.querySelector(".tp-sheet-zu").getBoundingClientRect().height : 0),
      fuss: [...(sh ? sh.querySelectorAll(".tp-sheet-fuss button") : [])].map(b => txt(b).replace(/^\W+/, "") + ":" + Math.round(b.getBoundingClientRect().height)), dim: !!document.getElementById("tp-sheet-dim"),
      oben: typeof _obersterDialog === "function" ? _obersterDialog() === sh : true,
      raus: sh ? [...sh.querySelectorAll("*")].some(e => e.offsetParent && e.getBoundingClientRect().right > innerWidth + 1) : true };
    // d) Minuten im Fenster
    const vor = tpSlots[hi].dauer; sh.querySelectorAll(".tp-dauer-k")[1].click(); await w(150);
    out.d = { vor, nach: tpSlots[hi].dauer, offen: !!tl.querySelector(`.tp-slot.tp-sheet[data-si="${hi}"]`) };
    // c) Escape, dann Schleier
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await w(100);
    out.c = { zu: !tl.querySelector(".tp-slot.tp-sheet"), dimWeg: !document.getElementById("tp-sheet-dim"), fokus: document.activeElement && document.activeElement.classList.contains("tp-kurz") };
    tpBlockOeffnen(hi); await w(100); document.getElementById("tp-sheet-dim").click(); await w(100);
    out.c.schleier = !tl.querySelector(".tp-slot.tp-sheet");
    out.quer = document.documentElement.scrollWidth > innerWidth + 1;
    return out;
  }, h.KINDER).catch(x => ({ fehler: String(x) }));
  const fe = s.fehler(); await s.schliessen();
  if (r.fehler) probleme.push(r.fehler);
  else {
    if (!r.liste || r.a.zeilen !== 3 || !/· 30 Min/.test(r.a.zeit) || r.a.felder || r.a.h < 44 || !r.a.fehlt || !/›/.test(r.a.text)) probleme.push("a) Liste " + JSON.stringify(r.a));
    if (!r.b.da || r.b.role !== "dialog" || r.b.modal !== "true" || r.b.fixed !== "fixed" || Math.abs(r.b.unten) > 1 || !r.b.dauer || !r.b.pick || r.b.zu < 44 || !r.b.dim || !r.b.oben) probleme.push("b) Fenster " + JSON.stringify(r.b));
    if (r.b.fuss.length < 2 || !r.b.fuss.some(x => /^Löschen/.test(x)) || r.b.fuss.some(x => Number(x.split(":")[1]) < 44)) probleme.push("b) Fuß " + JSON.stringify(r.b.fuss));
    if (r.b.raus || r.quer) probleme.push(`e) ragt hinaus: Fenster ${r.b.raus}, Seite ${r.quer}`);
    if (r.d.nach !== r.d.vor + 5 || !r.d.offen) probleme.push("d) " + JSON.stringify(r.d));
    if (!r.c.zu || !r.c.dimWeg || !r.c.fokus || !r.c.schleier) probleme.push("c) " + JSON.stringify(r.c));
  }
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`a) ${(r.a || {}).zeilen} Zeilen, „${String((r.a || {}).text || "").slice(0, 50)}“, Minuten ${(r.a || {}).zeit}, „Übung fehlt“ ${(r.a || {}).fehlt}`);
  zeilen.push(`b) Fenster ${(r.b || {}).role}/${(r.b || {}).fixed}, Fuß ${((r.b || {}).fuss || []).join(" | ")} · c) Escape und Schleier schließen · d) − / + ${(r.d || {}).vor}→${(r.d || {}).nach}, bleibt offen`);
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
