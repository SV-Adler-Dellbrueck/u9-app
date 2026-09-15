/* v563 – Im Kinder-Quiz fehlte die Frage.

   Auf dem Handy war im laufenden Szenario nur der Platz mit den Figuren zu sehen: keine
   Aufgabe, kein Tipp, kein „Prüfen", kein „Überspringen". Schuld waren zwei CSS-Regeln aus
   der Whitelist, die für den Kinder-Modus die Trainer-Werkzeuge des Taktikboards versteckt:

   - `body.quiz-extern.tq-playing #view-taktik>#tq-panel{display:none}` nahm im Spielmodus
     das ganze Quiz-Panel weg. Das Panel IST aber das Quiz und kein Trainer-Werkzeug.
   - `.quiz-extern .tb-wrap>div:not(.tb-field)` erwischte zusätzlich den Aufgaben-Chip, der
     die Aufgabe eigentlich über dem Feld festhält (K6). Damit war auch der letzte Ort weg,
     an dem die Frage noch gestanden hätte.

   Ein Kind konnte das Quiz also weder lesen noch beantworten – nur Figuren schieben.

   Fälle:
   a) Im laufenden Szenario steht das Panel sichtbar da.
   b) Die Aufgabe des Szenarios steht darin, im Wortlaut.
   c) Der Aufgaben-Chip über dem Feld ist sichtbar und trägt dieselbe Aufgabe.
   d) „Prüfen" und „Überspringen" sind antippbar (44 px) – ohne sie endet kein Szenario.
   e) Die Trainer-Werkzeuge des Taktikboards bleiben verborgen; die Whitelist ist nicht
      versehentlich ganz aufgemacht worden. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];

  const s = await h.starten({
    start: "/trainer/index.html?quiz&from=kabine",
    breite: 412, hoehe: 900, warten: 2000,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() })
  });

  const r = await s.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    /* `let` auf oberster Ebene landet nicht auf `window` – deshalb typeof auf den Namen
       selbst, nicht der Umweg über window. */
    if (typeof tqStartBlock !== "function") return { fehlt: "tqStartBlock" };
    tqPlayer = "Kind A";
    tqStartBlock(0);
    await warte(500);

    const panel = document.getElementById("tq-panel");
    const chip = document.getElementById("tq-task-chip");
    const sicht = el => el ? getComputedStyle(el).display : "fehlt";
    const knopf = t => {
      const b = [...document.querySelectorAll("#tq-panel button")].find(x => new RegExp(t).test(x.textContent));
      return b ? Math.round(b.getBoundingClientRect().height) : -1;
    };
    const sc = (typeof tqScenarios !== "undefined" && tqScenarios[0]) || {};

    /* e) Die Werkzeugleisten des Taktikboards dürfen weiterhin weg sein. */
    const werkzeuge = [...document.querySelectorAll("#view-taktik > *")]
      .filter(el => el.id !== "tq-panel" && !el.classList.contains("tb-wrap"))
      .filter(el => getComputedStyle(el).display !== "none").length;

    return {
      panel: sicht(panel),
      chip: sicht(chip),
      chipText: chip ? chip.textContent.trim() : "",
      aufgabe: sc.task || "",
      /* Das Panel schreibt die Aufgabe mit kleinem Anfangsbuchstaben („Kind A, stelle …"),
         der Chip im Original. Verglichen wird deshalb ohne Rücksicht auf Groß und Klein. */
      panelNenntAufgabe: panel ? panel.textContent.toLowerCase().includes((sc.task || "").slice(0, 24).toLowerCase()) : false,
      pruefen: knopf("Prüfen"),
      ueberspringen: knopf("Überspringen"),
      werkzeuge
    };
  });

  if (r.fehlt) probleme.push(r.fehlt + " fehlt");
  else {
    if (r.panel === "none" || r.panel === "fehlt") probleme.push(`Im laufenden Szenario ist das Quiz-Panel „${r.panel}“ – dann steht dort keine Frage`);
    if (!r.aufgabe) probleme.push("Das erste Szenario trägt gar keine Aufgabe – Gegenprobe kaputt");
    else {
      if (!r.panelNenntAufgabe) probleme.push("Die Aufgabe des Szenarios steht nicht im Panel");
      if (r.chip === "none" || r.chip === "fehlt") probleme.push(`Der Aufgaben-Chip über dem Feld ist „${r.chip}“`);
      else if (!r.chipText.includes(r.aufgabe.slice(0, 24))) probleme.push(`Der Chip trägt nicht die Aufgabe, sondern „${r.chipText}“`);
    }
    if (r.pruefen < 44) probleme.push(`„Prüfen“ ist ${r.pruefen} px hoch – ohne den Knopf endet kein Szenario`);
    if (r.ueberspringen < 44) probleme.push(`„Überspringen“ ist ${r.ueberspringen} px hoch`);
    if (r.werkzeuge) probleme.push(`${r.werkzeuge} Trainer-Werkzeuge des Taktikboards sind im Kinder-Modus sichtbar – die Whitelist ist zu weit aufgemacht`);
    if (!probleme.length) zeilen.push(`Quiz: Panel und Chip sichtbar, Aufgabe im Wortlaut, Prüfen ${r.pruefen} px, kein Trainer-Werkzeug offen`);
  }

  const fehler = s.fehler();
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);
  await s.schliessen();

  return h.ergebnis("Kinder-Quiz: die Frage steht wieder da", !probleme.length, zeilen.concat(probleme));
};
