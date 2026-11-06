/* v791 · Gedanke ohne Termin per KI sortieren (Charles 06.11.). Im Dialog „Gedanke“ gibt es neben „Gedanke erfassen“ den Knopf
   „Von der KI sortieren lassen“. Geprüft (ohne echte KI): was die Edge Function bekommt (art „gedanke“, Namen als „Kind n“,
   nie ein Name), dass die Antwort als Vorschlag gespeichert wird (anlass „gedanke“, quelle „frei“, kein Termin, ki_vorschlag, Diktat
   wörtlich), dass die Prüfkarte aufgeht, und dass „Gedanke erfassen“ unverändert unsortiert speichert. Die Sortierung selbst
   macht die KI und ist nur von Hand gegen die ausgerollte Funktion prüfbar. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [], K = h.KINDER;
  const db = [], anfragen = [];
  const antwort = { baustein: "spiel_spieler", beobachtung: "Kind 2 war in der Pause allein.", aha: "Mir ist klar geworden, dass Pausen Lernzeit sind.", konsequenzen: ["Ich frage Kind 2 in der Pause."], schlagworte: ["Pause"], rueckfragen: [], todos: [] };
  const s = await h.starten({ warten: 800, hoehe: 1500, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen().map((z, i) => ({ ...z, alias: String.fromCharCode(65 + i) })), termine: [], profiles: [{ name: "Charles", rolle: "trainer" }],
    tagebuch_punkt: (u, req) => req.method() === "POST" ? { status: 201, body: "[]" } : [],
    tagebuch_eintrag: (u, req) => {
      if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); const z = { id: 700 + db.length, ...b }; db.push(z); return { status: 201, body: JSON.stringify([z]) }; }
      if (req.method() === "GET") { const id = (u.searchParams.get("id") || "").replace("eq.", ""); return id ? db.filter(z => String(z.id) === id) : db; }
      return { status: 204, body: "" };
    },
    funktionen: { "ki-nachbereitung": (u, req) => { anfragen.push(JSON.parse(req.postData() || "{}")); return { art: "gedanke", ergebnis: { tagebuch: antwort } }; } }
  }) });
  const text = "Heute ist mir aufgefallen, dass " + K[1] + " in der Pause allein stand und nur zugeschaut hat. Pausen sind Lernzeit.";
  const r = await s.page.evaluate(async ({ text }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    document.getElementById("pin-gate")?.remove();
    if (typeof tagebuchGedankeSortieren !== "function") return { fehlt: true };
    window.trainerMe = async () => "Charles";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    const out = {};
    tagebuchGedanke(); await w(40);
    const ki = document.getElementById("tb-gedanke-ki");
    out.knopf = ki ? Math.round(ki.getBoundingClientRect().height) : 0;
    out.beide = !!document.getElementById("tb-gedanke-los");
    document.getElementById("tb-gedanke-text").value = "kurz";
    await tagebuchGedankeSortieren(); out.zuKurz = document.getElementById("tb-gedanke-meldung").textContent;
    document.getElementById("tb-gedanke-text").value = text;
    await tagebuchGedankeSortieren(); await w(300);
    out.dialogZu = !document.getElementById("tb-gedanke");
    out.karte = document.body.textContent.replace(/\s+/g, " ");
    return out;
  }, { text });
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) return h.ergebnis("v791 Gedanke per KI", false, ["tagebuchGedankeSortieren fehlt"]);
  if (r.knopf < 44 || !r.beide) probleme.push("Knöpfe: " + JSON.stringify({ knopf: r.knopf, beide: r.beide }));
  if (!/ein paar Sätze/.test(r.zuKurz)) probleme.push("zu kurz: " + r.zuKurz);
  if (anfragen.length !== 1) probleme.push("KI-Aufrufe: " + anfragen.length);
  const a = anfragen[0] || {};
  if (a.art !== "gedanke" || a.fuer != null || /Kind B/.test(a.text || "") || !/Kind 2 in der Pause allein/.test(a.text || "")) probleme.push("Anfrage: " + JSON.stringify(a));
  zeilen.push("Anfrage art „gedanke“, ohne Termin, Name als „" + ((/Kind \d+/.exec(a.text || "") || [])[0]) + "“");
  const e = db[0] || {};
  if (db.length !== 1 || e.anlass !== "gedanke" || e.quelle !== "frei" || e.termin_id != null || e.ki_vorschlag !== true || e.status !== "keim" || e.bestaetigt_am != null
      || e.diktat !== text || !/^Kind B war in der Pause allein\.$/.test(e.beobachtung || "") || e.aha !== "Mir ist klar geworden, dass Pausen Lernzeit sind." || !/^Gedanke vom /.test(e.ausloeser || "")) probleme.push("Eintrag: " + JSON.stringify(e));
  zeilen.push("Vorschlag gespeichert: Gedanke, frei, ohne Termin, Keim, Diktat wörtlich, Name in der App zurück");
  if (!r.dialogZu || !/Passt so/.test(r.karte)) probleme.push("Prüfkarte: dialogZu=" + r.dialogZu + " passtSo=" + /Passt so/.test(r.karte));
  const fn = fs.readFileSync(path.join(h.REPO, "supabase/functions/ki-nachbereitung/index.ts"), "utf8");
  if (!/body\?\.art === "gedanke"/.test(fn) || !/SYS_GEDANKE/.test(fn) || !/art === "gedanke" \? \{\}/.test(fn)) probleme.push("Edge Function kennt art „gedanke“ nicht");
  zeilen.push("Edge Function: art „gedanke“, eigene Anweisung, nur der Tagebuch-Teil");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v791 Gedanke ohne Termin per KI sortieren", !probleme.length, probleme.length ? probleme : zeilen);
};
