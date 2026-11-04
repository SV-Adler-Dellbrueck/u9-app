/* v788 · Zwei echte Diktate als Prüffälle für die Sortierung des Tagebuch-Vorschlags (Charles 04.11.)
   Geprüft wird, was ohne KI-Aufruf prüfbar ist: die Bereinigung der KI-Antwort in der Edge Function ki-nachbereitung (sanTagebuch,
   Kürzen) und was aus ihr im Tagebuch wird. Die Zuordnung durch die KI selbst ist hier NICHT geprüft – sie läuft nur gegen die echte
   Edge Function (von Hand; Ergebnis steht im PR). Die „KI-Antworten“ unten sind die erwartete Sortierung, nicht eine echte Antwort.
   Diktat A: Herbstferien, Absagen, Begründung unter 24 Stunden · Diktat B: Tagebuch ohne den Trainer, Kollegen sprechen selbst ein.
   Gemeinsam: Aha = die Sätze ab „Mir ist klar geworden“ wörtlich; kein „der Trainer“; höchstens zwei Konsequenzen; nichts mitten im Wort gekürzt.
   OFFEN (als Zeile gemeldet, kein Fehler): ein Diktat ohne Termin („Gedanke“) wird heute nicht von der KI sortiert; anlass „gedanke“ und
   Status „dauerhaft“ entstehen nicht automatisch – „gilt dauerhaft“ ist ein Knopf auf der Prüfkarte (tagebuch_punkt.dauerhaft). */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm"), mod = require("module");
const REPO = process.env.REPO || path.join(__dirname, "..", "..");
const DIKTAT_A = "In den Herbstferien haben wir nur zwei Trainings angeboten. Eines musste wegen der Platzrenovierung abgesagt werden. Beim anderen waren nur sechs Kinder angemeldet, drei haben kurzfristig abgesagt. Der Kollege hat dann mit drei Kindern trainiert, das war sehr frustrierend. Mir ist klar geworden, dass kurzfristige Absagen die Planung kaputt machen und am meisten die Kinder verlieren, die gekommen sind. Ich habe deshalb in der App eingebaut, dass ich Zu- und Absagen besser nachvollziehen kann. Eine Absage innerhalb der letzten 24 Stunden vor dem Termin braucht jetzt eine Begründung. Das ist umgesetzt und gilt dauerhaft.";
const DIKTAT_B = "Ich hatte in den letzten Wochen weniger Zeit und konnte nicht alle Spiele und Trainings begleiten, das haben die Trainerkollegen gemacht. Dann war ich selbst krank und beruflich stark eingebunden. Deshalb fehlen einige Einträge der letzten Wochen. Mir ist klar geworden, dass ein Tagebuch, das nur funktioniert, wenn ich dabei bin, nicht funktioniert. Die Kollegen sprechen ihre Einheiten selbst ein, dann fehlt nichts, wenn ich ausfalle. Die Trainerkollegen sprechen nach jedem Training ihre Bewertung ein, auch wenn ich nicht dabei bin, und ich lese sie in der Wiedervorlage. Das gilt dauerhaft.";
const AHA_A = "Mir ist klar geworden, dass kurzfristige Absagen die Planung kaputt machen und am meisten die Kinder verlieren, die gekommen sind.";
const AHA_B = "Mir ist klar geworden, dass ein Tagebuch, das nur funktioniert, wenn ich dabei bin, nicht funktioniert. Die Kollegen sprechen ihre Einheiten selbst ein, dann fehlt nichts, wenn ich ausfalle.";
// erwartete Sortierung (so, wie die KI sie nach FORM_TAGEBUCH liefern soll)
const KI_A = { baustein: "organisation", beobachtung: "In den Herbstferien haben wir nur zwei Trainings angeboten. Eines musste wegen der Platzrenovierung abgesagt werden. Beim anderen waren nur sechs Kinder angemeldet, drei haben kurzfristig abgesagt. Ich habe dann mit drei Kindern trainiert, das war sehr frustrierend.", aha: AHA_A,
  konsequenzen: ["Eine Absage innerhalb der letzten 24 Stunden vor dem Termin braucht jetzt eine Begründung."], rueckfragen: [], todos: [], schlagworte: ["Absagen", "Planung", "Begründung"] };
const KI_B = { baustein: "ich", beobachtung: "Ich hatte in den letzten Wochen weniger Zeit und konnte nicht alle Spiele und Trainings begleiten, das haben die Trainerkollegen gemacht. Dann war ich selbst krank und beruflich stark eingebunden. Deshalb fehlen einige Einträge der letzten Wochen.", aha: AHA_B,
  konsequenzen: ["Die Trainerkollegen sprechen nach jedem Training ihre Bewertung ein, auch wenn ich nicht dabei bin, und ich lese sie in der Wiedervorlage."], rueckfragen: [], todos: [], schlagworte: ["Tagebuch", "Wiedervorlage", "Vertretung"] };

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const src = fs.readFileSync(path.join(REPO, "supabase/functions/ki-nachbereitung/index.ts"), "utf8");
  const von = src.indexOf("const BAUSTEINE"), bis = src.indexOf("function sanTraining(");
  if (von < 0 || bis < von) return h.ergebnis("Diktate A und B: Bereinigung und Zuordnung", false, ["sanTagebuch nicht in index.ts gefunden"]);
  const js = mod.stripTypeScriptTypes(src.slice(von, bis) + "\nglobalThis.__san = { sanTagebuch, kuerzen, satz };", { mode: "strip" });
  const ctx = vm.createContext({ globalThis: {} }); vm.runInContext(js, ctx);
  const { sanTagebuch, kuerzen } = ctx.globalThis.__san;
  const woerter = t => String(t).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const imDiktat = (t, d) => { const s = new Set(woerter(d)); return woerter(t).filter(w => !s.has(w)); };

  for (const [name, d, ki, aha, bst, konsTeil] of [["A", DIKTAT_A, KI_A, AHA_A, "organisation", "Begründung"], ["B", DIKTAT_B, KI_B, AHA_B, "ich", "Bewertung"]]) {
    // Der erwartete Aha-Text steht wörtlich im Diktat (sonst ist der Prüffall selbst falsch)
    if (!d.includes(aha)) probleme.push(`${name}) Aha steht nicht wörtlich im Diktat – Prüffall fehlerhaft`);
    const t = sanTagebuch(JSON.parse(JSON.stringify(ki)));
    if (!t) { probleme.push(`${name}) sanTagebuch lieferte null`); continue; }
    if (t.aha !== aha) probleme.push(`${name}) Aha verändert: „${t.aha}“`);
    if (t.baustein !== bst) probleme.push(`${name}) Baustein ${t.baustein}, erwartet ${bst}`);
    if (t.konsequenzen.length !== 1 || !t.konsequenzen[0].includes(konsTeil)) probleme.push(`${name}) Konsequenz: ${JSON.stringify(t.konsequenzen)}`);
    const alles = [t.beobachtung, t.aha, ...t.konsequenzen].join(" ");
    if (/\bder trainer\b/i.test(alles)) probleme.push(`${name}) „der Trainer“ im Text`);
    const fremd = imDiktat(t.aha, d);
    if (fremd.length) probleme.push(`${name}) Aha enthält Wörter, die im Diktat fehlen: ${fremd.join(" ")}`);
    if (t.rueckfragen.length) probleme.push(`${name}) unerwartete Rückfrage`);
    zeilen.push(`${name}: Baustein ${t.baustein} · Aha wörtlich (${woerter(t.aha).length} Wörter, alle im Diktat) · ${t.konsequenzen.length} Konsequenz · kein „der Trainer“`);
  }

  // Höchstens zwei Konsequenzen, höchstens zwei Rückfragen, „null“-Text ist kein Aha
  const viel = sanTagebuch({ baustein: "ich", beobachtung: "x.", aha: "null", konsequenzen: ["a.", "b.", "c.", "d.", "e."], rueckfragen: [{ frage: "Eins?", feld: "aha" }, { frage: "Zwei?" }, { frage: "Drei?" }] });
  if (!viel || viel.konsequenzen.length !== 2 || viel.rueckfragen.length !== 2 || viel.aha !== null) probleme.push("Kappung: " + JSON.stringify(viel && { k: viel.konsequenzen.length, r: viel.rueckfragen.length, aha: viel.aha }));
  // ungültiger Baustein fällt auf spiel_spieler, nie auf etwas Erfundenes
  const unbek = sanTagebuch({ baustein: "quatsch", beobachtung: "x." });
  if (!unbek || unbek.baustein !== "spiel_spieler") probleme.push("Baustein-Rückfall: " + (unbek && unbek.baustein));
  // Kürzen: lange Notiz über der Grenze → am Satzende, mit Hinweis, nie im Wort
  const lang = Array.from({ length: 400 }, (_, i) => `Satz ${i} hat genug Wörter, damit die Grenze überschritten wird.`).join(" ");
  const k = kuerzen(lang, 8000);
  if (k.length > 8000 || !k.endsWith("[gekürzt]") || !/[.!?…] \[gekürzt\]$/.test(k)) probleme.push("Kürzen: Ende „…" + k.slice(-40) + "“");
  const kz = sanTagebuch({ baustein: "ich", beobachtung: lang }); // satz(…, 8000)
  if (!kz.beobachtung.endsWith("[gekürzt]")) probleme.push("Kürzen in sanTagebuch ohne Hinweis");
  zeilen.push(`Kappung 2/2, „null“ ist kein Aha, ungültiger Baustein → spiel_spieler, ${lang.length} Zeichen → ${k.length} mit „[gekürzt]“ am Satzende`);

  // OFFEN: Diktat ohne Termin – nur melden
  const gedankeKi = /art\s*===\s*["']gedanke["']|["']gedanke["']\s*:/.test(src);
  zeilen.push(gedankeKi ? "Diktat ohne Termin („Gedanke“): KI-Pfad vorhanden – anlass „gedanke“ bitte in diesem Prüffall ergänzen"
    : "OFFEN (kein Fehler): Diktat ohne Termin wird nicht von der KI sortiert; anlass „gedanke“ und Status „dauerhaft“ entstehen nicht automatisch (Knopf „gilt dauerhaft“)");
  return h.ergebnis("Diktate A und B: Bereinigung, Zuordnung, Kürzung der KI-Antwort", !probleme.length, zeilen.concat(probleme));
};
