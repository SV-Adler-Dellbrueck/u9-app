/* v627 · PO: „Zusätzlich wäre es super, wenn ich auf Nachbewertung gehe, ich durch einen
   Bewertungsprozess durchlaufe. So wie die Multiple-Choice-Kacheln.“ Kacheln: als Standard,
   Bogen bleibt; Training, Spiel und Festival; Worte mit Sternen.

   a) Training: Das Fenster öffnet mit dem Ablauf, der Bogen ist verborgen; Schritt 1 enthält
      den Sprachnotiz-Kasten (genau einmal im Dokument).
   b) Eine Kachel setzt das Feld des Bogens (Sterne) und geht weiter; Beschriftung mit Wort und Sternen.
   c) „fand nicht statt“ setzt „übersprungen“ und überspringt die übrigen Fragen dieser Übung.
   d) Kinder: Kachel setzt die Kinder-Sterne.
   e) Am Ende „Speichern“ schreibt über den gewohnten Weg (einheit_bewertung, trainings_eval).
   f) „Alles auf einen Blick“ zeigt den Bogen mit den gesetzten Werten; der Kasten ist zurück.
   g) Festival: Ablauf je Mannschaft, Kachel setzt _FZ.wert, überlebt das Neuzeichnen,
      „Speichern“ schreibt event_bewertung. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const gestern = h.tagePlus(-1);
  const plan = [
    { formIdx: 1, formName: "Adler 1 – Aktivierung", trainer: "Alle", slotLabel: "Warm up" },
    { formIdx: 2, formName: "Dribbel Quadrat", trainer: "Alle", slotLabel: "Warm up" }
  ];
  const posts = [];
  const merk = name => (u, req) => { if (req.method() !== "GET") posts.push(name); return []; };
  const s = await h.starten({ hoehe: 1400, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), profiles: [{ name: "Charles", rolle: "trainer" }], anwesenheit: [],
    einheit_bewertung: merk("einheit_bewertung"), trainings_eval: merk("trainings_eval"), event_bewertung: merk("event_bewertung"),
    trainingsplan: [{ datum: gestern, plan, kopf: {} }], nominierungen: [], heimturnier: [{ teams: ["Adler 1", "TuS Gast"] }],
    termine: [{ id: 8, datum: gestern, typ: "turnier", titel: "Festival" }] }) });

  const r = await s.page.evaluate(async ({ gestern }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const sicht = el => !!el && el.offsetParent !== null;
    const kachel = t => [...document.querySelectorAll("#nb-weg button")].find(b => b.textContent.includes(t));
    const tippe = async t => { const b = kachel(t); if (!b) return false; b.click(); await warte(320); return true; };
    window.trainerMe = async () => "Charles";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    if (typeof nbWegStart !== "function") return { fehlt: true };
    await loadKader();
    AW_DATA[gestern] = { "Kind A": { da: true }, "Kind B": { da: true } };
    await einheitBewertenOpen(); await einheitDetailOpen(gestern);
    for (let i = 0; i < 40 && !document.getElementById("nb-weg"); i++) await warte(50);
    const out = {};
    out.a = { weg: sicht(document.getElementById("nb-weg")), bogen: sicht(document.getElementById("eb-rows")),
      box: document.querySelectorAll("#nb-box").length, boxImWeg: !!document.querySelector("#nb-weg #nb-box") };
    await tippe("Frage für Frage");
    out.b = { frage: document.querySelector("#nb-weg").textContent.includes("Wie viel Spaß"), label: (kachel("viel") || {}).textContent };
    await tippe("★★★★ viel");
    out.b.spass = Number(document.getElementById("eb-stars-spass").dataset.val);
    out.b.jetzt = document.querySelector("#nb-weg").textContent.includes("Plan umsetzen");
    await tippe("★★★ okay");                 // Umsetzung 3
    const weiter = [...document.querySelectorAll("#nb-weg button")].find(b => /überspringen|Weiter/.test(b.textContent));
    weiter.click(); await warte(80);          // Erfolg übersprungen
    // Übung 1: fand nicht statt → springt auf Übung 2
    await tippe("fand nicht statt");
    out.c = { skip: document.getElementById("eb-skip-0").checked, titel: document.querySelector("#nb-weg").textContent.includes("Übung 2 von 2") };
    await tippe("★★★★★ top");               // Übung 2 Durchführung 5
    out.c.ue2 = Number(document.getElementById("eb-stars-ue-1-Durchführung").dataset.val);
    await tippe("★★★ okay"); await tippe("★★ selten");
    // Kinder
    out.d = { kinder: document.querySelector("#nb-weg").textContent.includes("Wie waren die Kinder") };
    const kb = [...document.querySelectorAll("#nb-weg button[aria-label]")].find(b => /Kind B: stark/.test(b.getAttribute("aria-label")));
    kb && kb.click(); await warte(50);
    out.d.sterne = Number(document.getElementById("eb-stars-sp-1").dataset.val);
    [...document.querySelectorAll("#nb-weg button")].find(b => b.textContent.trim() === "Weiter").click(); await warte(50);
    const ta = document.querySelector('#nb-weg textarea[data-nb-ziel="#eb-notiz"]'); if (ta) ta.value = "Guter Tag";
    [...document.querySelectorAll("#nb-weg button")].find(b => b.textContent.trim() === "Weiter").click(); await warte(50);
    out.e = { ende: document.querySelector("#nb-weg").textContent.includes("so steht es"), notiz: document.getElementById("eb-notiz").value };
    // f) vorher „Alles auf einen Blick“ prüfen: Zurück, dann Blick
    [...document.querySelectorAll("#nb-weg button")].find(b => /Alles auf einen Blick/.test(b.textContent)).click(); await warte(50);
    out.f = { weg: !!document.getElementById("nb-weg"), bogen: sicht(document.getElementById("eb-rows")), box: sicht(document.getElementById("nb-box")),
      boxZahl: document.querySelectorAll("#nb-box").length, spass: Number(document.getElementById("eb-stars-spass").dataset.val) };
    // e) speichern über den Ablauf: neu starten, zum Ende springen
    nbWegStart("training"); _nbWeg.i = _nbWeg.schritte.length - 1; nbWegZeichnen();
    [...document.querySelectorAll("#nb-weg button")].find(b => /Speichern/.test(b.textContent)).click(); await warte(2200);   // Übungen gehen gebündelt nach 1,5 s an den Server
    document.getElementById("eb-modal")?.remove();
    // g) Festival
    TM_TERMINE = [{ id: 8, datum: gestern, typ: "turnier", titel: "Festival" }];
    await fazitOpen(8);
    for (let i = 0; i < 40 && !document.getElementById("nb-weg"); i++) await warte(50);
    await tippe("Frage für Frage");
    const f1 = document.querySelector("#nb-weg").textContent;
    await tippe("gut verteilt");
    fazitRender(); await warte(30);           // Neuzeichnen des Bogens darf den Ablauf nicht beenden
    out.g = { frage: /Ordnung im Raum/.test(f1), ordnung: ((_FZ.wert.teams["1"] || {}).ordnung), nachRender: !!document.getElementById("nb-weg") && document.querySelector("#nb-weg").textContent.includes("Passspiel") };
    _nbWeg.i = _nbWeg.schritte.length - 1; nbWegZeichnen();
    [...document.querySelectorAll("#nb-weg button")].find(b => /Speichern/.test(b.textContent)).click(); await warte(400);
    return out;
  }, { gestern });
  const fe = s.fehler();
  await s.schliessen();
  if (r.fehlt) return h.ergebnis("v627 Geführte Nachbereitung", false, ["nbWegStart fehlt"]);
  if (!r.a.weg || r.a.bogen) probleme.push(`a) Ablauf ${r.a.weg ? "da" : "fehlt"}, Bogen ${r.a.bogen ? "sichtbar" : "verborgen"}`);
  if (r.a.box !== 1 || !r.a.boxImWeg) probleme.push(`a) Sprachnotiz-Kasten: ${r.a.box}× im Dokument, im Ablauf ${r.a.boxImWeg}`);
  if (!r.b.frage || !/★★★★ viel/.test(r.b.label || "")) probleme.push(`b) Frage/Beschriftung: ${JSON.stringify(r.b)}`);
  if (r.b.spass !== 4 || !r.b.jetzt) probleme.push(`b) Kachel setzt ${r.b.spass} statt 4, weiter: ${r.b.jetzt}`);
  if (!r.c.skip || !r.c.titel) probleme.push(`c) „fand nicht statt“: ${JSON.stringify(r.c)}`);
  if (r.c.ue2 !== 5) probleme.push(`c) Übung 2 Durchführung ${r.c.ue2} statt 5`);
  if (!r.d.kinder || r.d.sterne !== 3) probleme.push(`d) Kinder: ${JSON.stringify(r.d)}`);
  if (!r.e.ende || r.e.notiz !== "Guter Tag") probleme.push(`e) Ende/Notiz: ${JSON.stringify(r.e)}`);
  if (r.f.weg || !r.f.bogen || !r.f.box || r.f.boxZahl !== 1 || r.f.spass !== 4) probleme.push(`f) Alles auf einen Blick: ${JSON.stringify(r.f)}`);
  if (!posts.includes("einheit_bewertung") || !posts.includes("trainings_eval")) probleme.push(`e) gespeichert: ${posts.join(", ") || "nichts"}`);
  if (!r.g.frage || r.g.ordnung !== 3 || !r.g.nachRender) probleme.push(`g) Festival: ${JSON.stringify(r.g)}`);
  if (!posts.includes("event_bewertung")) probleme.push("g) Festival nicht gespeichert");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`Training: Spaß ${r.b.spass}, Übung 1 übersprungen ${r.c.skip}, Übung 2 ${r.c.ue2}★, Kind B ${r.d.sterne}★ · gespeichert ${[...new Set(posts)].join(", ")}`);
  zeilen.push(`Festival: Ordnung ${r.g.ordnung}, Ablauf nach Neuzeichnen ${r.g.nachRender}`);
  return h.ergebnis("v627 Geführte Nachbereitung: Frage für Frage mit Antwort-Kacheln", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
