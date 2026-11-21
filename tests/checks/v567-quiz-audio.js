/* v567 – Das Vorlesen im Taktik-Quiz kommt aus Aufnahmen, nicht mehr aus der Gerätestimme.

   PO: „Vorlesen ist immer noch genauso wie vorher." Auf seinem Android gibt es genau eine
   deutsche Stimme – da hilft die beste Auswahl nichts. Deshalb liegen die 100 Szenarien als
   vorproduzierte MP3 unter `audio/quiz/`, benannt nach dem Hash des Sprechtexts. Ändert
   jemand den Text eines Szenarios, passt der Name nicht mehr, die Datei fehlt – und die App
   fällt auf die Gerätestimme zurück, statt einen alten Text vorzulesen.

   Fälle:
   a) Für JEDES Szenario liegt die Datei, die die App ansteuern würde, im Repo. Das ist die
      Sperrklinke gegen stille Textänderungen: ohne neue Aufnahme wird der Lauf rot.
   b) Der Hash ist stabil und stimmt mit dem Benennungsskript überein (`tools/`): ein
      Referenzwert, den beide Seiten liefern müssen.
   c) Antippen spielt die Datei des laufenden Szenarios; der Knopf zeigt Stopp; erneutes
      Antippen hält an.
   d) Kann die Datei nicht spielen (kein Netz, 404), springt die Gerätestimme ein.
   e) Die Dateien sind nicht im Precache – 15 MB gehören nicht in jede Installation.

   v927 · Ausnahmeliste OHNE_AUFNAHME (Charles 21.11.: „Jetzt KEINE Aufnahmen. Bis zur Gesamtvertonung liest bei allen
   neuen oder geänderten Texten die Gerätestimme.“) Betroffen sind genau die 20 neuen Szenarien (3+1, FUNiño) und die
   zehn Korrekturen mit neuem Sprechtext. Geführt über den TITEL, nicht über die Nummer, damit jedes weitere Szenario
   ohne Aufnahme weiter rot wird. Wenn das ganze Quiz mit „Lennart – Energetic“ neu vertont ist, wird die Liste
   gelöscht – steht ein Titel hier, der nicht (mehr) existiert, wird der Lauf ebenfalls rot. */
const OHNE_AUFNAHME = [
  // Korrekturen aus doku/auftrag-taktikquiz-3plus1-funino/korrekturen.json mit „aufnahme: true“ (alte Ava-Datei gelöscht)
  "IGEL – Durchbruch verhindern", "Flügelspiel: Flitzer L gewinnt das 1gg1", "Flügelspiel: Querpass kommt!",
  "Standard: Ecke für uns", "Spiel: Gegner drängt – kompakt bleiben", "Spiel: Überzahl nutzen – 5 gegen 4",
  "Spiel: Unterzahl – 4 gegen 5", "TW kommt heraus!", "TW – Querpass abfangen", "Herausschieben aus der Defensive",
  // v930: ohne Spielstand und Restzeit umformuliert (Durchführungsbestimmungen 4.10/4.11, Charles 21.11.)
  "Raute kompakt nach vorne", "Spiel: Gegner steht tief – mutig angreifen!", "Ball in Ruhe halten", "Ballgewinn vorne – alle greifen an!",
  // Block „3+1 – Raute ohne Aufpasser“
  "3+1 – Grundstellung beim Toraus des Gegners", "3+1 – Torwart eröffnet flach", "3+1 – Adler: der Torwart kommt raus",
  "3+1 – Igel: die Flitzer schließen die Lücke", "3+1 – Igel: Gegner kommt über eure linke Seite",
  "3+1 – Ball weg: Jäger jagt, Flitzer zurück", "3+1 – Der Torwart hilft mit", "3+1 – Schießen erst in der gegnerischen Hälfte",
  "3+1 – Drei Tore hinten: der Aufpasser kommt dazu", "3+1 – Zwei Anspielstationen",
  // Block „FUNiño – Dreieck ohne Jäger“
  "FUNiño – Toraus: raus aus der Schusszone", "FUNiño – Adler: Flitzer greifen die Tore außen an", "FUNiño – Der Aufpasser rückt mit",
  "FUNiño – Links oder rechts?", "FUNiño – Einer drängt, zwei schützen die Tore", "FUNiño – Gegner wechselt die Seite",
  "FUNiño – Ballgewinn: sofort breit", "FUNiño – Tor nur aus der Schusszone", "FUNiño – Drei Tore hinten: der Jäger kommt dazu",
  "FUNiño – Eingewechselt: welche Rolle hast du?",
];
module.exports = async function (h) {
  const fs = require("fs"), path = require("path");
  const probleme = [], zeilen = [];

  // e) Precache und Loader bleiben frei von Audio
  const sw = fs.readFileSync(path.join(h.REPO, "sw.js"), "utf8");
  if (/audio\/quiz/.test(sw)) probleme.push("audio/quiz steht im Service Worker – 15 MB gehören nicht in den Precache");

  const s = await h.starten({ warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await s.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = { fehlt: [] };
    for (const n of ["ttsHash", "tqAudioUrl", "tqSpeak", "tqSpeakGeraet", "ttsSprechtext"]) if (typeof window[n] !== "function") out.fehlt.push(n);
    if (typeof TQ_SCENARIOS === "undefined") out.fehlt.push("TQ_SCENARIOS");
    if (out.fehlt.length) return out;

    out.referenz = ttsHash("Adler");
    out.namen = TQ_SCENARIOS.map(sc => tqAudioUrl(sc).split("/").pop());
    out.titel = TQ_SCENARIOS.map(sc => sc.title);
    out.eindeutig = new Set(out.namen).size;

    // c) Antippen spielt die Datei – Audio durch eine Attrappe ersetzt, die mitschreibt
    const gespielt = [], pausiert = [];
    const EchtAudio = window.Audio;
    class Attrappe {
      constructor(src) { this.src = src; }
      play() { gespielt.push(this.src); return Promise.resolve(); }
      pause() { pausiert.push(this.src); }
    }
    window.Audio = Attrappe;
    _ttsVoices = [];
    tqScenarios = [TQ_SCENARIOS[0]]; tqIdx = 0; tqPlayer = "";
    const btn = document.createElement("button"); btn.textContent = "🔊";
    tqSpeak(btn);
    await warte(50);
    out.gespielt = gespielt.slice();
    out.knopfLaeuft = btn.textContent;
    tqSpeak(btn); // zweiter Tipp: Stopp
    await warte(50);
    out.pausiert = pausiert.length;
    out.knopfDanach = btn.textContent;

    // d) Datei spielt nicht → Gerätestimme
    const gesprochen = [];
    const echtSynth = window.speechSynthesis;
    try {
      Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speaking: false, pending: false, cancel() {}, getVoices: () => [], speak: u => gesprochen.push(u.text) } });
      class Kaputt { constructor(src) { this.src = src; } play() { return Promise.reject(new Error("404")); } pause() {} }
      window.Audio = Kaputt;
      tqSpeak(null);
      await warte(80);
    } catch (e) { out.fehlerRueckfall = String(e && e.message || e); }
    try { Object.defineProperty(window, "speechSynthesis", { configurable: true, value: echtSynth }); } catch (e) {}
    window.Audio = EchtAudio;
    out.rueckfall = gesprochen.length;
    return out;
  });
  const fehler = s.fehler();
  await s.schliessen();

  if (r.fehlt.length) { probleme.push(r.fehlt.join(", ") + " fehlt"); }
  else {
    // b) Referenz aus demselben Algorithmus in Node (so benennt tools/quiz-audio-namen.js die Dateien)
    const hash = t => { let x = 0x811c9dc5; for (const ch of String(t)) { x ^= ch.codePointAt(0); x = Math.imul(x, 0x01000193) >>> 0; } return x.toString(16).padStart(8, "0"); };
    if (r.referenz !== hash("Adler")) probleme.push(`ttsHash("Adler") = ${r.referenz}, das Benennungsskript käme auf ${hash("Adler")} – die Dateinamen passen nicht zusammen`);
    // a) jede Datei vorhanden
    const da = n => fs.existsSync(path.join(h.REPO, "audio", "quiz", n));
    const fehlend = r.namen.filter((n, i) => !da(n) && !OHNE_AUFNAHME.includes(r.titel[i]));
    if (fehlend.length) probleme.push(`${fehlend.length} von ${r.namen.length} Szenarien ohne Aufnahme (z. B. ${fehlend[0]}, „${r.titel[r.namen.indexOf(fehlend[0])]}“) – Text geändert, ohne neu aufzunehmen?`);
    const veraltet = OHNE_AUFNAHME.filter(t => !r.titel.includes(t));
    if (veraltet.length) probleme.push(`Ausnahmeliste nennt ${veraltet.length} Titel, die es nicht gibt (z. B. „${veraltet[0]}“) – Liste nachziehen`);
    const ausnahmen = OHNE_AUFNAHME.filter(t => r.titel.includes(t)).length;
    if (r.eindeutig !== r.namen.length) probleme.push(`Zwei Szenarien teilen sich eine Datei (${r.namen.length - r.eindeutig} Dubletten)`);
    // c)
    if (r.gespielt.length !== 1) probleme.push(`Antippen spielt ${r.gespielt.length} Dateien statt einer`);
    else if (!r.gespielt[0].endsWith("audio/quiz/" + r.namen[0])) probleme.push(`Gespielt wird „${r.gespielt[0]}“ statt der Datei des Szenarios`);
    if (r.knopfLaeuft !== "⏹️") probleme.push(`Während der Wiedergabe zeigt der Knopf „${r.knopfLaeuft}“ statt Stopp`);
    if (r.pausiert !== 1) probleme.push("Der zweite Tipp hält die Wiedergabe nicht an");
    if (r.knopfDanach !== "🔊") probleme.push(`Nach dem Stopp zeigt der Knopf „${r.knopfDanach}“`);
    // d)
    if (r.fehlerRueckfall) probleme.push("Rückfall bricht ab: " + r.fehlerRueckfall);
    if (r.rueckfall < 1) probleme.push("Spielt die Datei nicht, bleibt es stumm – die Gerätestimme müsste einspringen");
    if (!probleme.length) zeilen.push(`${r.namen.length - ausnahmen} Aufnahmen vorhanden und eindeutig, ${ausnahmen} bewusst ohne (Gerätestimme bis zur Lennart-Vertonung) · Antippen spielt ${r.gespielt[0].split("/").pop()}, Stopp geht · ohne Datei ${r.rueckfall} Sätze per Gerätestimme`);
  }
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);

  return h.ergebnis("Quiz-Vorlesen: Aufnahmen je Szenario, Gerätestimme nur als Rückfall", !probleme.length, zeilen.concat(probleme));
};
