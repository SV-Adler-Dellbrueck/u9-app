/* v809 · Eltern (Charles 08.11.2026)
   a) „🫖 Tee mitbringen“ steht bei Training, Spiel und Turnier immer unter „Wer hilft mit?“ (ohne Freigabe, „0 von 2“),
      nicht bei sonstigen Terminen; das Trainerteam hakt es nicht an (nicht in der Freigabe-Liste)
   b) Nach dem Eintragen fliegt ein Herz herein: Satz aus ADLER_DANK, zweimal hintereinander nie derselbe, Klicks gehen durch,
      nach 2,6 s weg; mit reduzierter Bewegung nur eingeblendet
   c) Smiley-Abfrage im „Zu erledigen“-Fenster schließt nach dem Smiley NICHT mehr: Kommentarfeld hat den Fokus, „Fertig“
      speichert den Kommentar und schließt */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const datum = h.tagePlus(2);
  const puls = [], helferPost = [];
  const s = await h.starten({ start: "/eltern/index.html", warten: 900, supabase: h.supabaseAttrappe({
    event_helfer: (u, req) => { if (req.method() === "POST") { helferPost.push(JSON.parse(req.postData() || "{}")); return { status: 201, body: "[]" }; } return []; },
    event_puls: (u, req) => { if (req.method() === "POST") { puls.push(JSON.parse(req.postData() || "{}")); return { status: 201, body: "[]" }; } return []; } }) });
  const r = await s.page.evaluate(async datum => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const box = id => { let b = document.getElementById(id); if (!b) { b = document.createElement("div"); b.id = id; document.body.appendChild(b); } return b; };
    const out = {};
    if (typeof tdHelferLoad !== "function" || typeof adlerDank !== "function" || typeof tdPulsFertig !== "function") return { fehlt: true };
    const td = box("td-helfer"), k = box("helfer-card");
    out.a = {};
    for (const typ of ["training", "spiel", "turnier", "event"]) {
      const t = { id: 7, typ, datum, uhrzeit: "16:45" };
      await tdHelferLoad(t); await elternHelferKachelLoad(t); await w(30);
      out.a[typ] = { td: td.textContent.replace(/\s+/g, " "), k: k.textContent.replace(/\s+/g, " "), frei: !!document.querySelector("#helfer-eigen-td,#helfer-eigen-btn") };
    }
    out.a.vorlage = HELFER_AUFGABEN.filter(a => a.immer).map(a => a.t);
    // b) Herz
    window.sbToken = window.sbToken && window.sbToken() ? window.sbToken : () => "t";
    await tdHelferAdd(7, "🫖 Tee mitbringen"); await w(80);
    const d1 = document.getElementById("adler-dank");
    out.b = { da: !!d1, herz: !!(d1 && d1.querySelector(".ad-herz")), t1: d1 ? d1.querySelector(".ad-text").textContent : "", pe: d1 ? getComputedStyle(d1).pointerEvents : "", rolle: d1 && d1.getAttribute("role"),
      anim: d1 ? getComputedStyle(d1.querySelector(".ad-herz")).animationName : "", saetze: ADLER_DANK.slice() };
    const folge = [];
    for (let i = 0; i < 12; i++) { adlerDank(); folge.push(document.querySelector("#adler-dank .ad-text").textContent); }
    out.b.doppelt = folge.some((x, i) => i && x === folge[i - 1]);
    await w(2700); out.b.weg = !document.getElementById("adler-dank");
    // c) Smiley im Nudge
    const slot = box("puls-nudge-slot"); slot.innerHTML = '<div id="td-puls"></div>';
    tdPulsRender(9, null, true);
    await tdPulsSave(9, 3); await w(1700);
    const feld = document.getElementById("td-puls-txt");
    out.c = { noch: !!feld, fokus: document.activeElement === feld, fertig: !!document.getElementById("td-puls-fertig") };
    if (feld) feld.value = "Schönes Training, danke!";
    await tdPulsFertig(9); await w(50);
    out.c.zu = !document.getElementById("td-puls-txt");
    return out;
  }, datum);
  // reduzierte Bewegung
  await s.page.emulateMedia({ reducedMotion: "reduce" });
  const ruhig = await s.page.evaluate(() => { adlerDank(); const el = document.querySelector("#adler-dank .ad-herz"); return el ? getComputedStyle(el).animationName : ""; });
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) probleme.push("Funktionen fehlen");
  else {
    for (const typ of ["training", "spiel", "turnier"]) {
      const x = r.a[typ];
      if (!/Tee mitbringen/.test(x.k) || !/0 von 2/.test(x.k) || !/Tee mitbringen/.test(x.td) || x.frei) probleme.push(`a) ${typ}: ` + x.k.slice(0, 120));
    }
    if (/Tee/.test(r.a.event.k + r.a.event.td)) probleme.push("a) Tee auch bei sonstigem Termin");
    if (r.a.vorlage.join() !== "🫖 Tee mitbringen") probleme.push("a) feste Aufgaben: " + r.a.vorlage.join());
    if (!helferPost.some(p => p.aufgabe === "🫖 Tee mitbringen" && p.termin_id === 7)) probleme.push("b) Eintrag „Tee“ nicht gesendet: " + JSON.stringify(helferPost));
    if (!r.b.da || !r.b.herz || !r.b.saetze.includes(r.b.t1) || r.b.pe !== "none" || r.b.rolle !== "status" || r.b.anim !== "adFlug" || r.b.doppelt || !r.b.weg || r.b.saetze.length < 4) probleme.push("b) Herz: " + JSON.stringify(r.b));
    if (ruhig !== "adRuhig") probleme.push("b) reduzierte Bewegung: " + ruhig);
    if (!r.c.noch || !r.c.fokus || !r.c.fertig || !r.c.zu) probleme.push("c) Smiley: " + JSON.stringify(r.c));
    const letzte = puls[puls.length - 1] || {};
    if (puls.length < 2 || letzte.mood !== 3 || letzte.kommentar !== "Schönes Training, danke!" || letzte.termin_id !== 9) probleme.push("c) gespeichert: " + JSON.stringify(puls));
  }
  const gegner = fs.readFileSync(path.join(h.REPO, "md-gegner.js"), "utf8");
  if (!/alle\.filter\(a=>!a\.immer\)/.test(gegner)) probleme.push("a) Trainer-Freigabe bietet „Tee“ zum Abhaken an");
  zeilen.push("Tee: Training, Spiel, Turnier immer („0 von 2“), sonst nicht; kein Freifeld ohne Freigabe; nicht in der Trainer-Freigabe");
  zeilen.push("Herz: Satz aus " + (r.b ? r.b.saetze.length : "?") + " Varianten, nie zweimal derselbe, Klicks gehen durch, nach 2,6 s weg, ruhig bei reduzierter Bewegung");
  zeilen.push("Smiley: Karte bleibt offen, Fokus im Kommentar, „Fertig“ speichert und schließt");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v809 Tee mitbringen, Herz mit Dank, Kommentar nach dem Smiley", !probleme.length, probleme.length ? probleme : zeilen);
};
