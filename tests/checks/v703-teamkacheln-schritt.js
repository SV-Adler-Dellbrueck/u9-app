/* v703 · Kacheln „Adler n“ nur in den Schritten 2 bis 4
   PO 01.10. (Bildschirmfoto „Wer kommt?“ mit Adler 1–3 darunter): „Wenn ich unten eins der Teams
   anklicke, passiert nichts.“ Die Kachel klappte auf, ihr Inhalt (Aufstellung, Uhr, Ergebnis) gehört
   aber zu den Schritten 2–4, die unter „Wer kommt?“ zu sind – die Kachel blieb leer.
   a) Unter „Wer kommt?“ stehen keine Team-Kacheln
   b) In „Teams“ stehen sie; ein Tipp klappt die Kachel auf und zeigt sichtbaren Inhalt (Aufstellung)
   c) Wird eine Kachel ohne offenen Schritt 2–4 geöffnet (Sprung von außen), öffnet sich Schritt 2
   d) PO 01.10. (zweites Bildschirmfoto, „Während“ in Adler 1): „Kacheln sind verschoben“. Am Handy
      (390 px) stehen „eine“/„zwei“ und Start/Reset je nebeneinander, nichts ragt über den Rand,
      die Karten in der Team-Kachel sind mindestens 300 px breit */
"use strict";
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const heute = h.heute();
  const termine = [{ id: 1, datum: heute, typ: "turnier", titel: "Festival", uhrzeit: "10:00", trainer_status: {} }];
  const s = await h.starten({ breite: 390, hoehe: 1600, warten: 1200, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, nominierungen: [], anwesenheit: [], matchday: [] }) });
  await h.sichtbarMachen(s.page, "#main-app");
  const r = await s.page.evaluate(async ({ K }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    await loadKader();
    go("spieltag"); await warte(900);
    Object.keys(nomStatus).forEach(k => delete nomStatus[k]);
    K.forEach((n, i) => { nomStatus[n] = i < 12 ? "dabei" : "nicht"; });
    TEAM_ANZAHL = 3; TEAMS = {}; TEAM_FORM = {}; TEAM_FELDER = []; TEAM_LEIH = {}; TEAM_KARTE_OFFEN = 0;
    teamsAuto(); spieltagTeamKartenRender();
    const sichtbar = el => !!el && el.getBoundingClientRect().height > 0 && getComputedStyle(el).display !== "none";
    const out = {};
    spieltagPhaseZeigen("wer"); await warte(100);
    out.a = sichtbar(document.getElementById("spieltag-teamkarten"));
    spieltagPhaseZeigen("vor"); await warte(100);
    TEAM_KARTE_OFFEN = 0; spieltagTeamKartenRender(); await warte(50);
    out.b = { kacheln: sichtbar(document.getElementById("spieltag-teamkarten")) };
    const knopf = document.querySelector("#spieltag-teamkarten button");
    if (knopf) { knopf.click(); await warte(400); }
    const inhalt = document.querySelector("[id^='spieltag-karte-inhalt-'] #mt-phase-nom");
    out.b.offen = TEAM_KARTE_OFFEN; out.b.inhalt = sichtbar(inhalt) ? inhalt.getBoundingClientRect().height : 0;
    // c) Sprung von außen: alles zu, dann Kachel öffnen
    spieltagPhasenZu(); TEAM_KARTE_OFFEN = 0; await warte(50);
    spieltagKarteOeffnen(1); await warte(400);
    out.c = { phase: spieltagPhaseAktuell(), inhalt: sichtbar(document.querySelector("[id^='spieltag-karte-inhalt-'] #mt-phase-nom")) };
    // d) Während, Adler 1 offen
    spieltagPhaseZeigen("live"); await warte(200);
    if (typeof mcState === "undefined" || !mcState) window.mcState = { clock_status: "paused", half: 1, started_at: null, paused_ms: 420000 };
    else Object.assign(mcState, { clock_status: "paused", half: 1, started_at: null, paused_ms: 420000 });
    mcRenderLive(); rotRenderControls(); await warte(100);
    const zeile = sel => { const b = [...document.querySelectorAll(sel)].filter(x => x.getBoundingClientRect().height > 0); return b.length ? new Set(b.map(x => Math.round(x.getBoundingClientRect().top))).size === 1 && b.length : 0; };
    const breit = [...document.querySelectorAll("[id^='spieltag-karte-inhalt-'] .abschnitt")].filter(x => x.getBoundingClientRect().height > 0).map(x => Math.round(x.getBoundingClientRect().width));
    const raus = [...document.querySelectorAll("#mc-panel *, #rot-panel *")].filter(x => x.getBoundingClientRect().right > window.innerWidth + 1).length;
    out.d = { hz: zeile(".mc-seg button"), rot: zeile(".rot-knoepfe .btn"), breit, raus,
      hoehen: [...document.querySelectorAll(".mc-seg button, .rot-knoepfe .btn, #rot-interval, #mc-dauer")].map(x => Math.round(x.getBoundingClientRect().height)) };
    return out;
  }, { K }).catch(e => ({ fehler: String(e) }));
  const fe = s.fehler(); await s.schliessen();
  const titel = "v703 Team-Kacheln nur in den Schritten 2–4, Tipp zeigt Inhalt, „Während“ am Handy aufgeräumt";
  if (r.fehler) return h.ergebnis(titel, false, ["Abbruch: " + r.fehler]);
  if (r.a) probleme.push("a) Unter „Wer kommt?“ stehen Team-Kacheln");
  if (!r.b.kacheln) probleme.push("b) In „Teams“ fehlen die Team-Kacheln");
  if (!r.b.offen || !r.b.inhalt) probleme.push("b) Tipp auf die Kachel zeigt keinen Inhalt: " + JSON.stringify(r.b));
  if (r.c.phase !== "vor" || !r.c.inhalt) probleme.push("c) Kachel ohne Schritt geöffnet: " + JSON.stringify(r.c));
  if (r.d.hz !== 2) probleme.push("d) „eine“/„zwei“ nicht nebeneinander: " + JSON.stringify(r.d));
  if (r.d.rot !== 2) probleme.push("d) Start/Reset nicht nebeneinander: " + JSON.stringify(r.d));
  if (r.d.raus) probleme.push("d) " + r.d.raus + " Elemente ragen über den Rand");
  if (!r.d.breit.length || r.d.breit.some(w => w < 300)) probleme.push("d) Karten in der Team-Kachel zu schmal: " + JSON.stringify(r.d.breit));
  if (r.d.hoehen.some(x => x < 44)) probleme.push("d) Bedienelement unter 44 px: " + JSON.stringify(r.d.hoehen));
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`d) eine/zwei ${r.d.hz} · Start/Reset ${r.d.rot} in einer Zeile · Kartenbreite ${JSON.stringify(r.d.breit)} · über Rand ${r.d.raus}`);
  zeilen.push(`a) unter „Wer kommt?“ sichtbar ${r.a} · b) Tipp → Kachel ${r.b.offen}, Inhalt ${Math.round(r.b.inhalt)} px · c) ${JSON.stringify(r.c)}`);
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
