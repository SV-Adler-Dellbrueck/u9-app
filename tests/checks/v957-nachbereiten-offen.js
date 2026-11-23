/* v957 · Charles 23.11.: „In der Ansicht nur offene Rückmeldungen anzeigen der letzten 10 Tage. Danach automatisch
   archivieren. Wenn nichts offen ist, dann die Kachel ausblenden.“
   a) nbAltbestand rollt mit: vor 3 Tagen offen, vor 11 Tagen abgelegt; die feste Grenze (01.11.2026) gilt weiter.
   b) Liste „Nachbereiten“: nur das offene Training von vorgestern – nicht das von mir bewertete, nicht das vor 12 Tagen,
      nicht das abgesagte, nicht das Training heute um 23:59 und nicht das Spiel, das ich abgelegt habe.
   c) Ohne Offenes sagt die Liste „Nichts offen“.
   d) Startseite: mit einem offenen Termin „📝 Nachbereiten – 1 offen“, ohne Offenes keine Kachel. */
"use strict";
module.exports = async function (h) {
  const titel = "v957 Nachbereiten: nur Offenes der letzten 10 Tage, ohne Offenes keine Kachel";
  const probleme = [], zeilen = [];
  const d2 = h.tagePlus(-2), d12 = h.tagePlus(-12);
  let offen = true;
  const termine = () => offen ? [{ id: 1, typ: "training", datum: d2, uhrzeit: "17:00", uhrzeit_ende: "18:30" }] : [];
  const s = await h.starten({ hoehe: 1200, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ name: "Charles", rolle: "trainer" }],
    termine, einheit_bewertung: [], event_bewertung: [], trainingsplan: [], nachbereitung_verzicht: [] }) });
  await s.page.exposeFunction("__offen", v => { offen = !!v; });
  const r = await s.page.evaluate(async ({ d2, d12 }) => {
    const w = ms => new Promise(x => setTimeout(x, ms)), txt = el => el ? el.textContent.replace(/\s+/g, " ").trim() : "";
    for (let i = 0; i < 50 && typeof nbAltbestand !== "function"; i++) await w(100);
    window.trainerMe = async () => "Charles";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    const vor = n => isoLokal(new Date(Date.now() - n * 864e5));
    const out = { a: [nbAltbestand(vor(3)), nbAltbestand(vor(11)), nbAltbestand("2026-11-01")] };
    let c = document.getElementById("eb-card"); if (!c) { c = document.createElement("div"); c.id = "eb-card"; document.body.appendChild(c); }
    EB_ME = "Charles"; EB_VERZ = new Set(["t9"]); EB_EVENT_BEW = [];
    EB_TERMINE = [
      { id: 1, datum: d2, typ: "training", uhrzeit: "17:00" },
      { id: 2, datum: vor(3), typ: "training", uhrzeit: "17:00" },
      { id: 3, datum: d12, typ: "training", uhrzeit: "17:00" },
      { id: 4, datum: vor(1), typ: "training", uhrzeit: "17:00", platz_status: "abgesagt" },
      { id: 5, datum: isoLokal(), typ: "training", uhrzeit: "23:59" },
      { id: 9, datum: vor(4), typ: "spiel", gegner: "Gastverein", uhrzeit: "10:00", uhrzeit_ende: "11:00" }];
    EINHEIT_CACHE.length = 0; EINHEIT_CACHE.push({ datum: vor(3), autor: "Charles" });
    einheitListRender();
    out.b = [...c.querySelectorAll('[role="button"]')].map(txt);
    EB_TERMINE = EB_TERMINE.filter(t => t.id !== 1); einheitListRender();
    out.c = txt(c.querySelector(".eb-leer"));
    let slot = document.getElementById("trainer-todo-slot"); if (!slot) { slot = document.createElement("div"); slot.id = "trainer-todo-slot"; document.body.appendChild(slot); }
    window.fazitOffene = async () => [];
    const knopf = () => [...document.querySelectorAll("#trainer-todo-slot button, #home-nachbereiten button")].map(txt).filter(t => /Nachbereiten/.test(t));
    await trainerTodoLoad(); out.mit = knopf();
    await window.__offen(false); await trainerTodoLoad(); out.ohne = knopf();
    return out;
  }, { d2, d12 }).catch(x => ({ fehler: String(x) }));
  const fe = s.fehler(); await s.schliessen();
  if (r.fehler) probleme.push(r.fehler);
  else {
    if (JSON.stringify(r.a) !== "[false,true,true]") probleme.push("a) nbAltbestand vor 3 / vor 11 Tagen / 01.11.: " + JSON.stringify(r.a));
    const dd = d2.split("-").reverse().join(".");
    if (r.b.length !== 1 || !r.b[0].includes(dd) || !/von dir noch offen/.test(r.b[0])) probleme.push("b) Liste: " + JSON.stringify(r.b));
    if (!/Nichts offen/.test(r.c)) probleme.push("c) leere Liste: „" + r.c + "“");
    if (JSON.stringify(r.mit) !== JSON.stringify(["📝 Nachbereiten – 1 offen"])) probleme.push("d) mit Offenem: " + JSON.stringify(r.mit));
    if (r.ohne.length) probleme.push("d) ohne Offenes steht die Kachel noch: " + JSON.stringify(r.ohne));
  }
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`a) ${JSON.stringify(r.a)} · b) ${(r.b || []).map(t => t.slice(0, 50)).join(" | ")} · d) ${JSON.stringify(r.mit)} / ohne ${JSON.stringify(r.ohne)}`);
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
