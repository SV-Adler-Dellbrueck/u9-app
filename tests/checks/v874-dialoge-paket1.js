/* v874 · Systemdialoge, Paket 1 (Trainingsalltag): Trainingsplan, Spieltag/Live, Termine
   (Bestandsaufnahme November 2026, 4.5; Liste: doku/bestandsaufnahme-2026-11/systemdialoge.md).
   a) Quelltext: in jeder umgestellten Funktion steht kein prompt(), confirm() oder alert() mehr,
      dafür frageJaNein (core.js) bzw. frageText (views.js).
   b) Am gerenderten Trainingsplan, Spieltag und an den Terminen: das Fenster trägt role="dialog"
      und aria-modal="true", „Abbrechen“ ändert nichts, Bestätigen führt die Aktion aus
      (die Attrappe zählt den Schreibzugriff).
   c) frageText löst bei Esc mit null auf, statt den Aufrufer ewig warten zu lassen. */
"use strict";
const fs = require("fs"), path = require("path");
const STELLEN = [
  ["boot.js", "periodDelete", "frageJaNein"], ["boot.js", "tpRichtwertAendern", "frageText"], ["boot.js", "tpMaterialEigen", "frageText"],
  ["md-block.js", "blockEinheitUebernehmen", "frageJaNein"], ["md-block.js", "blockLoeschen", "frageJaNein"],
  ["md-gegner.js", "tmDelete", "frageJaNein"],
  ["md-live-vollbild.js", "blitzDelete", "frageJaNein"], ["md-live-vollbild.js", "tnDel", "frageJaNein"],
  ["md-liveticker.js", "tickerShareViewLink", "frageText"], ["md-liveticker.js", "tickerShareKonfLink", "frageText"],
  ["md-liveticker.js", "tickerShareDelegateLink", "frageText"], ["md-liveticker.js", "tickerDelete", "frageJaNein"],
  ["md-matchcard.js", "mdShareLink", "frageText"], ["md-matchcard.js", "rotReset", "frageJaNein"],
  ["md-matchuhr.js", "mcEnd", "frageJaNein"],
  ["md-turnierplan.js", "turnierPlanDelete", "frageJaNein"], ["md-turnierplan.js", "turnierDelete", "frageJaNein"],
  ["md-voice.js", "vdDelete", "frageJaNein"],
  ["views.js", "epollDelete", "frageJaNein"],
];
module.exports = async function (h) {
  const titel = "v874 Systemdialoge Paket 1: Trainingsplan, Spieltag, Termine als Fenster der App";
  const probleme = [], zeilen = [];
  // a) Quelltext
  const SYS = /(^|[^\w.$])(window\.)?(prompt|confirm|alert)\s*\(/;
  for (const [datei, fn, ersatz] of STELLEN) {
    const q = fs.readFileSync(path.join(h.REPO, datei), "utf8");
    const start = q.search(new RegExp(`(^|\\n)(async\\s+)?function\\s+${fn}\\s*\\(`));
    if (start < 0) { probleme.push(`a) ${datei}: ${fn} fehlt`); continue; }
    const rest = q.slice(start + 1);
    const ende = rest.search(/\n(async\s+)?function\s/);
    const rumpf = ende < 0 ? rest : rest.slice(0, ende);
    if (SYS.test(rumpf)) probleme.push(`a) ${datei}: ${fn} ruft noch einen Systemdialog auf`);
    if (!rumpf.includes(ersatz + "(")) probleme.push(`a) ${datei}: ${fn} nutzt ${ersatz} nicht`);
  }
  if (!probleme.length) zeilen.push(`a) ${STELLEN.length} Stellen ohne prompt/confirm/alert`);

  // b) gerendert
  const d1 = h.tagePlus(1);
  const termine = [{ id: 5, datum: d1, uhrzeit: "16:45", typ: "training", trainer_status: {} }];
  const s = await h.starten({ warten: 2000, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), termine, anwesenheit: [], trainingsplan: [{ datum: d1, kopf: {} }] }) });
  await h.sichtbarMachen(s.page, "#main-app");
  const r = await s.page.evaluate(async ({ d1 }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const out = { system: [] };
    window.confirm = t => { out.system.push("confirm: " + String(t).slice(0, 40)); return false; };
    window.prompt = t => { out.system.push("prompt: " + String(t).slice(0, 40)); return null; };
    window.alert = t => { out.system.push("alert: " + String(t).slice(0, 40)); };
    // Schreibzugriffe je Tabelle zählen (die Attrappe beantwortet sie, die Seite zählt mit)
    const log = [], echt = window.fetch;
    window.fetch = (u, o) => { log.push([((o && o.method) || "GET").toUpperCase(), String(u)]); return echt(u, o); };
    window.__zaehl = (m, t) => log.filter(([mm, uu]) => mm === m && new RegExp("/rest/v1/" + t + "(\\?|$)").test(uu)).length;
    await loadKader();
    const fenster = id => document.getElementById(id);
    /* v890: statt fester 200 ms auf das Fenster warten, nach „Bestätigen“ auf den Schreibvorgang (Obergrenze je 5 s). Fest bleiben
       die Pausen nach „Abbrechen“ – dort wird geprüft, dass NICHTS geschrieben wird. */
    const bis = async (f, n) => { for (let i = 0; i < (n || 100) && !f(); i++) await w(50); return f(); };
    const da = id => bis(() => fenster(id));
    const art = el => el ? { dialog: el.getAttribute("role") === "dialog", modal: el.getAttribute("aria-modal") === "true",
      text: el.textContent.replace(/\s+/g, " ").slice(0, 160),
      klein: [...el.querySelectorAll("button")].filter(b => b.getBoundingClientRect().height > 0 && b.getBoundingClientRect().height < 43.5).length } : null;
    // 1) Trainingsplan: Material ändern (Texteingabe)
    go("planung"); await w(1200);
    const feld = document.getElementById("tp-date");
    if (feld) { if (feld.tagName === "SELECT" && ![...feld.options].some(o => o.value === d1)) feld.add(new Option(d1, d1)); feld.value = d1; }
    out.tp = {};
    let p = tpMaterialEigen(); await da("frage-text-modal");
    out.tp.ab = art(fenster("frage-text-modal"));
    fenster("frage-text-modal")?.querySelector("#frage-text-ab").click(); await p; await w(150);   // bewusst fest: Abbrechen darf NICHTS schreiben
    out.tp.nachAb = window.__zaehl("PATCH", "trainingsplan");
    p = tpMaterialEigen(); await da("frage-text-modal");
    const ft = fenster("frage-text-modal");
    if (ft) { ft.querySelector("#frage-text-feld").value = "Prüf-Material"; ft.querySelector("#frage-text-ok").click(); }
    await p; await bis(() => window.__zaehl("PATCH", "trainingsplan") >= 1);
    out.tp.nachOk = window.__zaehl("PATCH", "trainingsplan");
    // 1b) Esc löst frageText auf
    p = tpRichtwertAendern(); await da("frage-text-modal");
    out.esc = { offen: !!fenster("frage-text-modal"), einzeilig: (fenster("frage-text-modal")?.querySelector("#frage-text-feld") || {}).tagName };
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    out.esc.fertig = await Promise.race([p.then(() => true), w(1500).then(() => false)]);
    out.esc.geschrieben = window.__zaehl("PATCH", "team_config");
    // 2) Spieltag: Ticker-Eintrag löschen
    go("spieltag"); await w(900);
    out.tk = {};
    p = tickerDelete(7, "Tor durch Kind A"); await da("frage-modal");
    out.tk.ab = art(fenster("frage-modal"));
    fenster("frage-modal")?.querySelector("#frage-nein").click(); await p; await w(150);   // bewusst fest: Abbrechen darf NICHTS schreiben
    out.tk.nachAb = window.__zaehl("DELETE", "ticker_events");
    p = tickerDelete(7, "Tor durch Kind A"); await da("frage-modal");
    out.tk.ja = (fenster("frage-modal")?.querySelector("#frage-ja") || {}).textContent;
    fenster("frage-modal")?.querySelector("#frage-ja").click(); await p; await bis(() => window.__zaehl("DELETE", "ticker_events") >= 1);
    out.tk.nachOk = window.__zaehl("DELETE", "ticker_events");
    // 3) Spieltag: Wechsel-Timer zurücksetzen
    out.rot = {};
    if (rotTimerId) { clearInterval(rotTimerId); rotTimerId = null; }
    rotFieldSec["Kind A"] = 120;
    p = rotReset(); await da("frage-modal");
    out.rot.ab = art(fenster("frage-modal"));
    fenster("frage-modal")?.querySelector("#frage-nein").click(); await p; await w(100);   // bewusst fest: Abbrechen darf NICHTS ändern
    out.rot.nachAb = rotFieldSec["Kind A"];
    p = rotReset(); await da("frage-modal");
    fenster("frage-modal")?.querySelector("#frage-ja").click(); await p; await bis(() => rotFieldSec["Kind A"] === 0);
    out.rot.nachOk = rotFieldSec["Kind A"];
    // 4) Termine: Termin löschen
    go("termine"); await w(700);
    out.tm = {};
    p = tmDelete(5); await da("frage-modal");
    out.tm.ab = art(fenster("frage-modal"));
    fenster("frage-modal")?.querySelector("#frage-nein").click(); await p; await w(150);   // bewusst fest: Abbrechen darf NICHTS schreiben
    out.tm.nachAb = window.__zaehl("DELETE", "termine");
    p = tmDelete(5); await da("frage-modal");
    fenster("frage-modal")?.querySelector("#frage-ja").click(); await p; await bis(() => window.__zaehl("DELETE", "termine") >= 1);
    out.tm.nachOk = window.__zaehl("DELETE", "termine");
    return out;
  }, { d1 }).catch(e => ({ fehler: String(e) }));
  const fe = s.fehler(); await s.schliessen();
  if (r.fehler) return h.ergebnis(titel, false, probleme.concat(["Fehler im Ablauf: " + r.fehler]));
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  if (r.system.length) probleme.push("Systemdialog aufgerufen: " + r.system.join(" · "));
  const fensterOk = (x, wo) => {
    if (!x) { probleme.push(`${wo}: kein Fenster der App`); return false; }
    if (!x.dialog || !x.modal) { probleme.push(`${wo}: Fenster ohne role="dialog"/aria-modal`); return false; }
    if (x.klein) { probleme.push(`${wo}: ${x.klein} Knöpfe unter 44 px`); return false; }
    return true;
  };
  if (fensterOk(r.tp.ab, "b1) Trainingsplan Material")) {
    if (r.tp.nachAb !== 0) probleme.push(`b1) „Abbrechen“ hat trotzdem gespeichert (${r.tp.nachAb})`);
    else if (r.tp.nachOk !== 1) probleme.push(`b1) „Übernehmen“ hat ${r.tp.nachOk}× gespeichert statt 1×`);
    else zeilen.push("b1) Trainingsplan · Material: Eingabefenster, Abbrechen speichert nichts, Übernehmen schreibt einmal");
  }
  const mat = s.gesendet.find(x => x.methode === "PATCH" && x.pfad.endsWith("/trainingsplan"));
  if (mat && !(mat.body && mat.body.kopf && mat.body.kopf.material === "Prüf-Material")) probleme.push("b1) Material nicht im Plan: " + JSON.stringify(mat.body).slice(0, 120));
  if (!r.esc.offen || r.esc.einzeilig !== "INPUT" || !r.esc.fertig || r.esc.geschrieben) probleme.push("c) Esc im Eingabefenster: " + JSON.stringify(r.esc));
  else zeilen.push("c) Richtwert: einzeiliges Feld; Esc schließt und löst auf, nichts gespeichert");
  if (fensterOk(r.tk.ab, "b2) Spieltag Ticker-Eintrag")) {
    if (r.tk.nachAb !== 0 || r.tk.nachOk !== 1 || r.tk.ja !== "Löschen") probleme.push("b2) Ticker: " + JSON.stringify(r.tk));
    else if (!/Kind A“/.test(r.tk.ab.text)) probleme.push("b2) Ticker: Eintrag fehlt im Text " + r.tk.ab.text);
    else zeilen.push("b2) Spieltag · Ticker-Eintrag löschen: Abbrechen löscht nichts, „Löschen“ löscht einmal");
  }
  if (fensterOk(r.rot.ab, "b3) Spieltag Wechsel-Timer")) {
    if (r.rot.nachAb !== 120 || r.rot.nachOk !== 0) probleme.push("b3) Wechsel-Timer: " + JSON.stringify(r.rot));
    else zeilen.push("b3) Spieltag · Wechsel-Timer zurücksetzen: Abbrechen behält die Zeiten, Bestätigen setzt auf 0:00");
  }
  if (fensterOk(r.tm.ab, "b4) Termin löschen")) {
    if (r.tm.nachAb !== 0 || r.tm.nachOk !== 1) probleme.push("b4) Termin: " + JSON.stringify(r.tm));
    else zeilen.push("b4) Termine · Termin löschen: Abbrechen löscht nichts, „Löschen“ löscht einmal");
  }
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
