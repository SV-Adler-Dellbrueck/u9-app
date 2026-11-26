/* v972 · „Wie war's?“ und To-do doppeln sich (Charles 26.11.2026, Bild): Die Karte „Wie war's?“ fragt nach dem letzten Training,
   daneben stand eine To-do-Karte mit nur „📝 Nachbereiten – 1 offen“ – derselbe Weg. todoDoppelWeg suchte den Knopf noch unter
   seinem alten Text „Nachbereiten – Training“ (vor v957).
   a) Einziges offenes To-do = Termin der Karte, ein Offenes: Die To-do-Karte verlässt das Karussell, kein „Nachbereiten“ bleibt
   b) Zwei Offene: Karte weg aus dem Karussell, „Nachbereiten – 2 offen“ steht als Zeile darunter
   c) Ohne To-do stand der Knopf schon unten: mit einem Offenen verschwindet er, sobald „Wie war's?“ da ist
   d) Ein anderes To-do bleibt mit Knopf in der Karte (nur der Termin der Karte tritt zurück) */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ warten: 900, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 60 && typeof todoDoppelWeg !== "function"; i++) await w(100);
    const box = id => { let b = document.getElementById(id); if (!b) { b = document.createElement("div"); b.id = id; document.body.appendChild(b); } return b; };
    const slot = box("trainer-todo-slot"), unten = box("home-nachbereiten");
    const knopf = n => `<button class="btn eb-einstieg" data-offen="${n}" onclick="einheitBewertenOpen()">📝 Nachbereiten – ${n} offen</button>`;
    const zeile = k => `<div class="todo-zeile" data-termin="${k}"><button class="btn btn-zeile">Einheit nachbereiten</button></div>`;
    const lage = () => ({ karte: !!slot.querySelector(".card"), slot: slot.innerHTML.trim().length, unten: unten.textContent.replace(/\s+/g, " ").trim(), zeilen: slot.querySelectorAll(".todo-zeile").length, knopfInKarte: !!slot.querySelector(".eb-einstieg") });
    const o = {};
    window._wieWarsKey = "d2026-11-23";
    slot.innerHTML = `<div class="card">${zeile("d2026-11-23")}${knopf(1)}</div>`; unten.innerHTML = ""; todoDoppelWeg(); o.a = lage();
    slot.innerHTML = `<div class="card">${zeile("d2026-11-23")}${knopf(2)}</div>`; unten.innerHTML = ""; todoDoppelWeg(); o.b = lage();
    slot.innerHTML = ""; unten.innerHTML = `<div>${knopf(1)}</div>`; todoDoppelWeg(); o.c = lage();
    slot.innerHTML = `<div class="card">${zeile("d2026-11-23")}${zeile("d2026-11-16")}${knopf(2)}</div>`; unten.innerHTML = ""; todoDoppelWeg(); o.d = lage();
    return o;
  });
  const fe = s.fehler(); await s.schliessen();
  if (r.a.slot || r.a.unten) probleme.push("a) " + JSON.stringify(r.a)); else zeilen.push("a) ein Offenes = Karte „Wie war's?“: keine zweite Karte, kein „Nachbereiten“");
  if (r.b.slot || !/Nachbereiten – 2 offen/.test(r.b.unten)) probleme.push("b) " + JSON.stringify(r.b)); else zeilen.push("b) zwei Offene: „Nachbereiten – 2 offen“ als Zeile unter dem Karussell");
  if (r.c.unten) probleme.push("c) " + JSON.stringify(r.c)); else zeilen.push("c) Knopf unten mit einem Offenen verschwindet neben „Wie war's?“");
  if (r.d.zeilen !== 1 || !r.d.knopfInKarte || !r.d.karte) probleme.push("d) " + JSON.stringify(r.d)); else zeilen.push("d) anderes To-do bleibt mit Knopf in der Karte");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v972 „Wie war's?“ und To-do doppeln sich nicht", !probleme.length, zeilen.concat(probleme));
};
