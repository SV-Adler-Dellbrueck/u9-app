/* v836 · Eigene Fenster statt Systemdialogen an den Stellen, die der Trainer am Platz trifft (Bestandsaufnahme November 2026, 2.6/2.11/2.12).
   a) Trainingsstart verwerfen: eigenes Fenster ÜBER der Live-Ansicht, kein confirm(); „Zurück“ verwirft nichts.
   b) Trainingsgruppe umbenennen: eigenes Eingabefenster, kein prompt(); der neue Name steht in der Gruppe.
   c) Teams am Spieltag: der Knopf heißt „Teams übernehmen“ (vorher „In die Nominierungen übertragen“), die Rückfrage ist ein eigenes Fenster.
   d) Anwesenheit: Terminwechsel mit offenen Haken fragt im eigenen Fenster; „Zurück“ stellt den alten Termin wieder ein und behält die Haken.
   e) Pinnwand: „Wer schreibt“ ist mit dem angemeldeten Trainer vorbelegt; eine Handwahl bleibt. */
"use strict";
module.exports = async function (h) {
  const titel = "v836 Eigene Fenster am Platz: Trainingsstart verwerfen, Gruppe umbenennen, Teams übernehmen, Anwesenheit, Pinnwand-Autor";
  const probleme = [], zeilen = [];
  const d1 = h.tagePlus(1), d2 = h.tagePlus(3);
  const termine = [{ id: 1, datum: d1, uhrzeit: "16:45", typ: "training", trainer_status: { Charles: "ja", Kenneth: "ja" } }, { id: 2, datum: d2, uhrzeit: "16:45", typ: "training", trainer_status: {} }];
  const s = await h.starten({ warten: 2000, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, anwesenheit: [] }) });
  await h.sichtbarMachen(s.page, "#main-app");
  const r = await s.page.evaluate(async ({ d1, d2 }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    if (typeof _tlFrage !== "function") return { alt: true };
    const out = { system: [] };
    window.confirm = t => { out.system.push("confirm: " + String(t).slice(0, 40)); return false; };
    window.prompt = t => { out.system.push("prompt: " + String(t).slice(0, 40)); return null; };
    await loadKader();
    const frage = () => document.getElementById("frage-modal");
    // a)
    const ov = document.createElement("div"); ov.id = "tl-ov"; ov.style.cssText = "position:fixed;inset:0;z-index:11000;background:#0b1220"; document.body.appendChild(ov);
    _tl.row = { status: "lobby", slot: 0, pflicht: ["Charles"], bereit: {}, plan: { slots: [] } };
    const pa = tlAbbrechen(); await w(150);
    out.a = { fenster: !!frage(), z: frage() ? Number(frage().style.zIndex) : 0, text: frage() ? frage().textContent.replace(/\s+/g, " ") : "" };
    if (frage()) frage().querySelector("#frage-nein").click(); await pa; await w(50);
    out.a.liveBleibt = !!document.getElementById("tl-ov") && !!_tl.row;
    ov.remove(); _tl.row = null;
    // b)
    go("planung"); await w(1200);
    const feld = document.getElementById("tp-date"); if (![...feld.options].some(o => o.value === d1)) feld.add(new Option(d1, d1)); feld.value = d1;
    tgBilden(2); await w(200);
    const pb = tgRename(0); await w(150);
    const ft = document.getElementById("frage-text-modal");
    out.b = { fenster: !!ft, vorbelegt: ft ? ft.querySelector("#frage-text-feld").value : "" };
    if (ft) { ft.querySelector("#frage-text-feld").value = "  Die   Falken "; ft.querySelector("#frage-text-ok").click(); }
    await pb; await w(100);
    out.b.name = (tgFor() || { gruppen: [{}] }).gruppen[0].name;
    // c)
    out.c = {};
    TEAMS[1] = ["Kind A", "Kind B"];
    const pc = teamsAnwenden(); await w(150);
    out.c.fenster = !!frage(); out.c.text = frage() ? frage().textContent.replace(/\s+/g, " ") : "";
    if (frage()) frage().querySelector("#frage-nein").click(); await pc;
    // d)
    go("anwesenheit"); await w(900);
    const aw = document.getElementById("aw-date");
    [d1, d2].forEach(d => { if (![...aw.options].some(o => o.value === d)) aw.add(new Option(d, d)); });
    aw.value = d1; awLoad(); await w(300);
    window._awDirty = true; aw.value = d2; awLoad(); await w(150);
    out.d = { fenster: !!frage() };
    if (frage()) frage().querySelector("#frage-nein").click(); await w(100);
    out.d.zurueck = aw.value === d1 && window._awDirty === true;
    aw.value = d2; awLoad(); await w(150);
    if (frage()) frage().querySelector("#frage-ja").click(); await w(200);
    out.d.gewechselt = aw.value === d2 && window._awDirty === false;
    // e)
    window.trainerMe = async () => "Kenneth";
    const tn = document.getElementById("tn-autor"), tv = document.getElementById("tv-autor");
    [tn, tv].forEach(el => { if (el) delete el.dataset.vorbelegt; });
    await pinnwandAutorVorwahl();
    out.e = { tn: tn && tn.value, tv: tv && tv.value };
    if (tn) { tn.value = "Peter"; await pinnwandAutorVorwahl(); out.e.handwahl = tn.value; }
    return out;
  }, { d1, d2 }).catch(e => ({ fehler: String(e) }));
  const fe = s.fehler(); await s.schliessen();
  if (r.alt) return h.ergebnis(titel, false, ["_tlFrage fehlt (Stand vor v836)"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  if (r.system.length) probleme.push("Systemdialog aufgerufen: " + r.system.join(" · "));
  if (!r.a.fenster || r.a.z <= 11000 || !/ALLE Geräte/.test(r.a.text)) probleme.push("a) Fenster " + r.a.fenster + ", Ebene " + r.a.z);
  else if (!r.a.liveBleibt) probleme.push("a) „Zurück“ hat den Trainingsstart verworfen");
  else zeilen.push(`a) Trainingsstart verwerfen: eigenes Fenster auf Ebene ${r.a.z}, „Zurück“ lässt alles stehen`);
  if (!r.b.fenster || !r.b.vorbelegt || r.b.name !== "Die Falken") probleme.push("b) Gruppe umbenennen: " + JSON.stringify(r.b));
  else zeilen.push(`b) Gruppe umbenennen: Fenster mit „${r.b.vorbelegt}“ vorbelegt → „${r.b.name}“`);
  const quelle = require("fs").readFileSync(require("path").join(h.REPO, "md-teams.js"), "utf8");
  if (/In die Nominierungen übertragen<\/button>/.test(quelle) || !/Teams übernehmen<\/button>/.test(quelle)) probleme.push("c) Knopf heißt nicht „Teams übernehmen“");
  if (!r.c.fenster || !/Teams übernehmen/.test(r.c.text) || /Nominierung/.test(r.c.text)) probleme.push("c) Teams: " + JSON.stringify(r.c).slice(0, 200));
  else zeilen.push("c) Teams: Rückfrage im eigenen Fenster, Knopf „Teams übernehmen“");
  if (!r.d.fenster || !r.d.zurueck || !r.d.gewechselt) probleme.push("d) Anwesenheit: " + JSON.stringify(r.d));
  else zeilen.push("d) Anwesenheit: „Zurück“ stellt den Termin wieder ein, „Verwerfen und wechseln“ lädt den neuen");
  if (r.e.tn !== "Kenneth" || r.e.tv !== "Kenneth" || r.e.handwahl !== "Peter") probleme.push("e) Pinnwand-Autor: " + JSON.stringify(r.e));
  else zeilen.push("e) Pinnwand: Autor mit dem angemeldeten Trainer vorbelegt, Handwahl bleibt");
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
