/* v856 · „Teams festlegen“ (Bestandsaufnahme November 2026, 2.6): Ist die Einteilung übernommen?
   a) Stehen die Team-Zeilen der Datenbank anders als die Einteilung, sagt ein Hinweis über dem Knopf
      „Noch nicht übernommen“ mit der Zahl der betroffenen Kinder (Zeichen und Text, nicht nur Farbe).
   b) Stimmen sie überein, steht „✓ Diese Einteilung ist übernommen“.
   c) Nach „Neu verteilen“ erscheint der Hinweis wieder; nach dem Übertragen verschwindet er.
   d) Ohne geladene Team-Zeilen (kein Netz) steht kein Hinweis – lieber nichts als etwas Falsches. */
"use strict";
module.exports = async function (h) {
  const titel = "v856 Teams festlegen: Stand „übernommen / noch nicht übernommen“ über dem Knopf";
  const probleme = [], zeilen = [];
  const heute = h.heute();
  const s = await h.starten({ warten: 2000, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), nominierungen: [], matchday: [], match_actions: [],
    termine: [{ id: 1, datum: heute, typ: "spiel", heim: true, uhrzeit: "10:15", titel: "Spieltag", trainer_status: {} }] }) });
  const r = await s.page.evaluate(async ({ heute }) => {
    const out = {};
    document.getElementById("pin-gate")?.remove(); const app = document.getElementById("main-app"); if (app) app.style.display = "block";
    if (typeof teamsStand !== "function") return { alt: true };
    await loadKader();
    window.spieltagRawDate = () => heute; window.spieltagKey = () => heute;
    const namen = KADER.filter(k => k.aktiv !== false).map(k => k.name);
    TEAM_ANZAHL = 2; Object.keys(TEAMS).forEach(k => delete TEAMS[k]); namen.forEach((n, i) => { TEAMS[n] = (i % 2) + 1; });
    Object.keys(nomStatus).forEach(k => delete nomStatus[k]); namen.forEach(n => { nomStatus[n] = "dabei"; });
    let box = document.getElementById("team-panel"); if (!box) { box = document.createElement("div"); box.id = "team-panel"; document.body.appendChild(box); }
    const zeile = t => ({ datum: t > 1 ? `${heute}__t${t}` : heute, data: kidMapToIds(Object.fromEntries(namen.map(n => [n, TEAMS[n] === t ? "dabei" : "nicht"]))) });
    const lies = () => { const el = document.getElementById("team-stand"); return el ? { offen: el.dataset.offen, text: el.textContent.trim(), rolle: el.getAttribute("role") } : null; };
    // d) unbekannt
    teamsRender(); out.d = lies();
    // b) gleich
    teamZeilenMerken([zeile(1), zeile(2), { datum: heute + "__teams", data: {} }], heute); teamsRender(); out.b = lies();
    // a) zwei Kinder getauscht, ohne zu übertragen
    const a0 = namen[0], a1 = namen[1]; TEAMS[a0] = 2; TEAMS[a1] = 1; teamsRender(); out.a = lies();
    out.knopfUnter = (() => { const st = document.getElementById("team-stand"), kn = [...box.querySelectorAll("button")].find(b => /Teams übernehmen/.test(b.textContent)); return st && kn ? !!(st.compareDocumentPosition(kn) & Node.DOCUMENT_POSITION_FOLLOWING) : false; })();
    // c) übertragen
    window.sbToken = () => "t";
    out.geschrieben = await teamsZeilenSchreiben(); out.c1 = lies();
    teamsAuto(); teamsRender(); out.c2 = lies(); out.c2stand = teamsStand();
    return out;
  }, { heute }).catch(e => ({ fehler: String(e) }));
  const fe = s.fehler(); await s.schliessen();
  if (r.alt) return h.ergebnis(titel, false, ["teamsStand fehlt (Stand vor v856)"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  if (!r.a || r.a.offen !== "1" || !/^● Noch nicht übernommen – 2 Kinder stehen/.test(r.a.text) || r.a.rolle !== "status" || !r.knopfUnter) probleme.push("a) " + JSON.stringify(r.a) + " · über dem Knopf: " + r.knopfUnter);
  else zeilen.push("a) „" + r.a.text.slice(0, 60) + "…“ über dem Knopf");
  if (!r.b || r.b.offen !== "0" || !/^✓ Diese Einteilung ist übernommen/.test(r.b.text)) probleme.push("b) " + JSON.stringify(r.b)); else zeilen.push("b) „✓ Diese Einteilung ist übernommen.“");
  if (!r.geschrieben || !r.c1 || r.c1.offen !== "0") probleme.push(`c) nach dem Übertragen: geschrieben ${r.geschrieben}, ${JSON.stringify(r.c1)}`);
  else if (r.c2stand.offen !== (r.c2 ? r.c2.offen === "1" : false)) probleme.push("c) Anzeige und Stand widersprechen sich nach „Neu verteilen“: " + JSON.stringify([r.c2, r.c2stand]));
  else zeilen.push(`c) nach dem Übertragen übernommen; nach „Neu verteilen“ ${r.c2stand.offen ? r.c2stand.anders + " anders" : "unverändert"}`);
  if (r.d) probleme.push("d) Hinweis ohne geladene Team-Zeilen: " + JSON.stringify(r.d)); else zeilen.push("d) ohne geladene Zeilen kein Hinweis");
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
