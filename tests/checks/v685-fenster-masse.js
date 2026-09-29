/* v685 · Die Fenster hinter den Kacheln, die Doppelung auf der Startseite, der Hilfetext „Übungen“
   PO 29.09.: „Mach alles“ – nach v681–v683 (Unterseiten) die Fenster, die hinter den Kacheln liegen.
   a) Jedes Fenster, das eine Kachel der Bereiche Team, Training, Eltern & Kinder und Orga öffnet,
      trägt role="dialog"; keine Bedienfläche darin unter 44 px, keine Schrift unter 12 px,
      nichts über dem rechten Rand (390 × 844)
   b) „Wie war's?“ und das To-do zum selben Termin stehen nicht beide auf der Startseite;
      ein To-do zu einem anderen Termin bleibt
   c) Der Hilfetext „Übungen“ ist höchstens 3000 Zeichen lang und nennt die Kacheln „Vorlagen“ und
      „Eigene Übung“ */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const termine = [
    { id: 1, datum: h.tagePlus(1), uhrzeit: "17:00", uhrzeit_ende: "18:15", typ: "training", titel: "Training", trainer_status: {} },
    { id: 2, datum: h.tagePlus(2), uhrzeit: "10:00", uhrzeit_ende: "12:00", typ: "spiel", titel: "Spiel", gegner: "Gegner A", trainer_status: {} }];
  const s = await h.starten({ breite: 390, hoehe: 844, warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, profiles: [{ name: "Charles", rolle: "trainer" }] }) });
  s.page.on("dialog", d => d.dismiss().catch(() => {}));
  await h.sichtbarMachen(s.page, "#main-app");
  const r = await s.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    await loadKader();
    window.confirm = () => false; window.prompt = () => null; window.alert = () => {};
    const W = innerWidth, fenster = [];
    const sichtbar = el => { const b = el.getBoundingClientRect(); if (b.width <= 0 || b.height <= 0) return false;
      for (let e = el; e && e !== document.documentElement; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) === 0) return false; } return true; };
    const kacheln = [];
    for (const k of ["team", "training", "elki", "orga"])
      for (const m of _kachelInhalt(k).matchAll(/kachelRun\('([^']+)'(?:,'([^']*)')?\)/g))
        if (!["go", "spieltagPhase", "backupExport"].includes(m[1])) kacheln.push([m[1], m[2]]);
    for (const [fn, arg] of kacheln) {
      const vorher = new Set([...document.body.children]);
      go("home"); await warte(150);
      try { const f = window[fn]; if (typeof f !== "function") { fenster.push({ fn, fehlt: true }); continue; }
        const x = arg === undefined ? f() : f(arg); if (x && x.then) await Promise.race([x, warte(2500)]); } catch (e) { fenster.push({ fn, fehler: String(e).slice(0, 80) }); continue; }
      await warte(800);
      const dlg = [...document.querySelectorAll('[role="dialog"]')].filter(sichtbar).pop();
      const neu = dlg || [...document.body.children].filter(e => !vorher.has(e) && sichtbar(e)).pop();
      if (!neu) { fenster.push({ fn, keins: true }); continue; }
      const bedien = [...neu.querySelectorAll("button, a[href], select, input:not([type=hidden]), textarea, [role=button]")].filter(sichtbar)
        .filter(e => !(e.tagName === "INPUT" && (e.type === "checkbox" || e.type === "radio") && e.closest("label") && sichtbar(e.closest("label"))));
      const klein = bedien.filter(e => e.getBoundingClientRect().height < 43.5).map(e => ((e.textContent || e.getAttribute("aria-label") || e.tagName).replace(/\s+/g, " ").trim().slice(0, 20)) + "@" + Math.round(e.getBoundingClientRect().height));
      const winzig = [...neu.querySelectorAll("*")].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && sichtbar(e) && parseFloat(getComputedStyle(e).fontSize) < 11.5)
        .map(e => e.textContent.replace(/\s+/g, " ").trim().slice(0, 20) + "@" + getComputedStyle(e).fontSize);
      const breit = [...neu.querySelectorAll("*")].filter(e => sichtbar(e) && e.getBoundingClientRect().right > W + 1 && !e.closest("[style*='overflow']")).length;
      fenster.push({ fn, dialog: !!dlg, klein, winzig, breit });
      neu.remove(); document.querySelectorAll('[role="dialog"]').forEach(d => d.remove()); document.body.style.overflow = "";
    }
    // b) Doppelung: To-do-Kasten mit zwei Zeilen, „Wie war's?“ steht für t2
    const slot = document.getElementById("trainer-todo-slot") || document.body.appendChild(Object.assign(document.createElement("div"), { id: "trainer-todo-slot" }));
    slot.innerHTML = `<div class="card"><div class="todo-zeile" data-termin="t2"><button>Spiel nachbereiten</button></div><div class="todo-zeile" data-termin="d2026-01-01"><button>Einheit nachbereiten</button></div><button>📝 Nachbereiten – Training, Spiel, Festival</button></div>`;
    window._wieWarsKey = "t2"; todoDoppelWeg();
    const b1 = { t2: !!slot.querySelector('[data-termin="t2"]'), andere: !!slot.querySelector('[data-termin="d2026-01-01"]') };
    window._wieWarsKey = "d2026-01-01"; todoDoppelWeg();
    const b2 = { zeilen: slot.querySelectorAll(".todo-zeile").length, einstieg: /Nachbereiten – Training/.test(slot.textContent), karte: !!slot.querySelector(".card") };
    window._wieWarsKey = null;
    return { fenster, b1, b2 };
  });
  const fe = s.fehler(); await s.schliessen();
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  let n = 0;
  for (const x of r.fenster) {
    if (x.fehlt) { probleme.push(`a) ${x.fn} fehlt`); continue; }
    if (x.fehler) { probleme.push(`a) ${x.fn}: ${x.fehler}`); continue; }
    if (x.keins) { probleme.push(`a) ${x.fn} öffnet kein Fenster`); continue; }
    n++;
    if (!x.dialog) probleme.push(`a) ${x.fn}: Fenster ohne role="dialog"`);
    if (x.klein.length) probleme.push(`a) ${x.fn}: ${x.klein.length} Bedienflächen unter 44 px – ${x.klein.slice(0, 3).join(" | ")}`);
    if (x.winzig.length) probleme.push(`a) ${x.fn}: ${x.winzig.length} Schriften unter 12 px – ${x.winzig.slice(0, 3).join(" | ")}`);
    if (x.breit) probleme.push(`a) ${x.fn}: ${x.breit} Elemente über dem Rand`);
  }
  if (r.b1.t2) probleme.push("b) Das To-do zum Termin von „Wie war's?“ steht noch da");
  if (!r.b1.andere) probleme.push("b) Ein To-do zu einem anderen Termin ist mit verschwunden");
  if (r.b2.zeilen || !r.b2.einstieg || r.b2.karte) probleme.push(`b) Ohne To-do bleibt ${JSON.stringify(r.b2)} – erwartet nur die Zeile „Nachbereiten“`);
  const views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  const ue = (views.match(/\{t:"Übungen", d:"((?:[^"\\]|\\.)*)"/) || [])[1] || "";
  if (!ue) probleme.push("c) Hilfetext „Übungen“ nicht gefunden");
  else { if (ue.length > 3000) probleme.push(`c) Hilfetext „Übungen“ hat ${ue.length} Zeichen`); if (!/„Vorlagen“/.test(ue) || !/Eigene Übung/.test(ue)) probleme.push("c) Hilfetext nennt die Kacheln nicht"); }
  zeilen.push(`${n} Fenster gemessen · Hilfe „Übungen“ ${ue.length} Zeichen`);
  return h.ergebnis("Fenster hinter den Kacheln: 44 px, 12 px, role=dialog · keine Doppelung Wie war's/To-do", !probleme.length, zeilen.concat(probleme));
};
