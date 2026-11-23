/* v955 · Charles 23.11.: „Alle Rückmeldungen, die älter sind als 2.11.26, ablegen und aus der Erinnerungsliste rausnehmen.“
   a) nbAltbestand: 01.11.2026 und früher gilt als abgelegt, 02.11.2026 nicht.
   b) Liste „Einheit bewerten“: ein unbewertetes Training vom 30.10. steht mit 🗂️ und „abgelegt“, eines vom 02.11. weiter mit
      ⭐ „von dir noch offen“; ein bewertetes bleibt ✅.
   c) Startseite: „Einheit … nachbereiten“ fragt nicht mehr nach dem 30.10., wohl aber nach einem Training ab 02.11. (Quelltext:
      die To-do-Liste filtert mit nbAltbestand).
   Seit v957 zeigt die Liste nur Offenes der letzten 10 Tage: Bewertetes und Abgelegtes fehlen dort; die Uhr steht deshalb
   auf dem 08.11.2026, damit das rollende Fenster den 02.11. noch offen lässt. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v955 Rückmeldungen vor dem 02.11.2026 abgelegt – nicht mehr in den Erinnerungen";
  const probleme = [], zeilen = [];
  const s = await h.starten({ hoehe: 1200, jetzt: "2026-11-08T12:00:00" });
  const r = await s.page.evaluate(async () => {
    for (let i = 0; i < 50 && typeof nbAltbestand !== "function"; i++) await new Promise(x => setTimeout(x, 100));
    const out = { a: [nbAltbestand("2026-10-30"), nbAltbestand("2026-11-01"), nbAltbestand("2026-11-02")] };
    let c = document.getElementById("eb-card"); if (!c) { c = document.createElement("div"); c.id = "eb-card"; document.body.appendChild(c); }
    EB_ME = "Trainer A";
    EB_TERMINE = [{ datum: "2026-11-06", typ: "training", uhrzeit: "16:45" }, { datum: "2026-11-02", typ: "training", uhrzeit: "16:45" }, { datum: "2026-10-30", typ: "training", uhrzeit: "16:45" }];
    EINHEIT_CACHE.length = 0; EINHEIT_CACHE.push({ datum: "2026-11-06", autor: "Trainer A" });
    einheitListRender();
    out.b = [...c.querySelectorAll('[role="button"]')].map(e => e.textContent.replace(/\s+/g, " ").trim());
    return out;
  }).catch(x => ({ fehler: String(x) }));
  const fe = s.fehler(); await s.schliessen();
  if (r.fehler) probleme.push(r.fehler);
  else {
    if (JSON.stringify(r.a) !== "[true,true,false]") probleme.push("a) " + JSON.stringify(r.a));
    const z = d => (r.b || []).find(t => t.includes(d)) || "";
    if (z("06.11.2026")) probleme.push("b) bewertet steht seit v957 nicht mehr in der Liste: " + z("06.11.2026"));
    if (!/⭐/.test(z("02.11.2026")) || !/von dir noch offen/.test(z("02.11.2026"))) probleme.push("b) 02.11.: " + z("02.11.2026"));
    if (z("30.10.2026")) probleme.push("b) abgelegt steht seit v957 nicht mehr in der Liste: " + z("30.10.2026"));
  }
  const views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  if (!/nbAltbestand\(row\.datum\)/.test(views)) probleme.push("c) Startseiten-To-do filtert nicht mit nbAltbestand");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`a) 30.10./01.11./02.11. → ${JSON.stringify(r.a)} · b) ${(r.b || []).map(t => t.slice(0, 60)).join(" | ")}`);
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
