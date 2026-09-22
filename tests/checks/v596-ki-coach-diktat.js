/* v596 · Adler-Coach: Diktieren, „Optional" hält Wort, Reiter sind Reiter
   Drei Befunde des PO vom 22.09.2026, alle am echten Dialog gemessen:
   a) „Beim Klick auf Idee beschreiben passiert nichts." – kein Fehler, aber die beiden
      Knöpfe sahen aus wie Aktionen. Jetzt ein Reiterpaar mit role/aria-selected, und
      „Idee" ist beim Öffnen gewählt.
   b) Das Feld heißt „Optional", die Sperre prüfte es trotzdem: Wer nur die vier
      Auswahlfelder einstellte, bekam „Bitte kurz beschreiben". Gesendet wird ohnehin
      der Satz aus den Auswahlfeldern.
   c) Diktieren – nur, wo das Gerät zuhören kann; Verstandenes wird angehängt. */
"use strict";

module.exports = async function (h) {
  const probleme = [], zeilen = [];

  const attrappe = h.supabaseAttrappe({
    kader: h.kaderZeilen(), periodisierung: [], termine: [], trainer_notes: [],
    funktionen: { "ki-uebung": { uebungen: [], rest: 19 } }
  });

  // ── a) Reiter, und „Idee" ist beim Öffnen gewählt ───────────────────────────
  {
    const s = await h.starten({ start: "/trainer/index.html", warten: 1000, supabase: attrappe });
    const r = await s.page.evaluate(async () => {
      kiCoachOpen();
      await new Promise(r => setTimeout(r, 400));
      const leiste = document.getElementById("ki-modus");
      const knoepfe = [...leiste.querySelectorAll("button")];
      const idee = knoepfe.find(b => b.dataset.modus === "idee");
      const text = knoepfe.find(b => b.dataset.modus === "text");
      const vorher = idee.getAttribute("aria-selected");
      kiSetModus("idee");                       // genau der Klick aus dem Befund
      const nachher = idee.getAttribute("aria-selected");
      const blockDa = getComputedStyle(document.getElementById("ki-block-idee")).display !== "none";
      return {
        tablist: leiste.getAttribute("role"),
        rollen: knoepfe.map(b => b.getAttribute("role")),
        panels: ["ki-block-idee", "ki-block-text"].map(id => document.getElementById(id).getAttribute("role")),
        ideeVorher: vorher, ideeNachher: nachher,
        textGewaehlt: text.getAttribute("aria-selected"),
        ariaPressed: knoepfe.some(b => b.hasAttribute("aria-pressed")),
        blockDa,
        hoehe: Math.min(...knoepfe.map(b => Math.round(b.getBoundingClientRect().height)))
      };
    });
    zeilen.push(`a) Reiterleiste ${r.tablist} · Knöpfe ${r.rollen.join("/")} · „Idee" gewählt: vorher ${r.ideeVorher}, nach dem Klick ${r.ideeNachher} · ${r.hoehe} px`);
    if (r.tablist !== "tablist") probleme.push("a) die Leiste ist keine tablist: " + r.tablist);
    if (r.rollen.join() !== "tab,tab") probleme.push("a) die Knöpfe tragen nicht role=tab: " + r.rollen.join("/"));
    if (r.panels.join() !== "tabpanel,tabpanel") probleme.push("a) die Blöcke sind keine tabpanel: " + r.panels.join("/"));
    if (r.ideeVorher !== "true") probleme.push("a) „Idee beschreiben“ ist beim Öffnen nicht gewählt");
    if (r.ideeNachher !== "true") probleme.push("a) nach dem Klick auf den gewählten Reiter stimmt aria-selected nicht mehr");
    if (r.textGewaehlt !== "false") probleme.push("a) „Text übernehmen“ gilt gleichzeitig als gewählt");
    if (r.ariaPressed) probleme.push("a) ein Reiter trägt noch aria-pressed – das gehört zum Knopf, nicht zum Reiter");
    if (!r.blockDa) probleme.push("a) der Idee-Block ist nicht sichtbar");
    if (r.hoehe < 44) probleme.push(`a) Reiter nur ${r.hoehe} px hoch (mindestens 44)`);
    const fehler = s.fehler(); if (fehler.length) probleme.push("a) Konsole: " + fehler.slice(0, 2).join(" | "));
    await s.schliessen();
  }

  // ── b) Ohne Freitext geht die Anfrage trotzdem hinaus ───────────────────────
  {
    const s = await h.starten({ start: "/trainer/index.html", warten: 1000, supabase: attrappe });
    const r = await s.page.evaluate(async () => {
      kiCoachOpen();
      await new Promise(r => setTimeout(r, 400));
      document.getElementById("ki-prompt").value = "";     // das „optionale“ Feld bleibt leer
      await kiCoachGenerate();
      await new Promise(r => setTimeout(r, 500));
      const t = (document.body.innerText || "");
      return { abfuhr: /Bitte kurz beschreiben/.test(t) };
    });
    const rufe = s.abgefragt.filter(x => /functions\/v1\/ki-uebung/.test(x.pfad));
    const mit = rufe[0] && rufe[0].body ? String(rufe[0].body.prompt || "") : "";
    zeilen.push(`b) ohne Freitext: ${rufe.length} Aufruf(e) · gesendet „${mit.slice(0, 70)}“`);
    if (r.abfuhr) probleme.push("b) das als „Optional“ beschriftete Feld wird weiterhin erzwungen");
    if (rufe.length !== 1) probleme.push(`b) ${rufe.length} Aufrufe der Edge Function statt eines`);
    if (!/Schwerpunkt/.test(mit)) probleme.push("b) der Satz aus den Auswahlfeldern fehlt in der Anfrage: " + mit);
    await s.schliessen();
  }

  // ── c) Diktieren: nur wo möglich, und es hängt an ───────────────────────────
  {
    const s = await h.starten({ start: "/trainer/index.html", warten: 1000, supabase: attrappe });
    const r = await s.page.evaluate(async () => {
      // Ohne SpeechRecognition darf der Knopf gar nicht erst erscheinen.
      delete window.SpeechRecognition; delete window.webkitSpeechRecognition;
      kiCoachOpen();
      await new Promise(r => setTimeout(r, 300));
      const ohne = !!document.getElementById("ki-mic");
      document.getElementById("ki-modal").remove();

      // Mit Attrappe: Knopf da, Verstandenes wird ANGEHÄNGT statt zu ersetzen.
      let gestartet = 0, gestoppt = 0, inst = null;
      window.SpeechRecognition = function () {
        inst = this; this.start = () => { gestartet++; }; this.stop = () => { gestoppt++; };
      };
      kiCoachOpen();
      await new Promise(r => setTimeout(r, 300));
      const mit = !!document.getElementById("ki-mic");
      const feld = document.getElementById("ki-prompt");
      feld.value = "Erster Satz.";
      kiDiktat();
      const knopfText = document.getElementById("ki-mic").textContent.trim();
      inst.onresult({ results: [[{ transcript: "Zweiter Satz." }]] });
      const nachDiktat = feld.value;
      inst.onend();
      // Reiterwechsel muss das Lauschen beenden – im Text-Modus gibt es das Feld nicht.
      kiDiktat();
      kiSetModus("text");
      const gestopptNachWechsel = gestoppt;
      return { ohne, mit, knopfText, nachDiktat, gestartet, gestopptNachWechsel,
               lang: inst.lang, interim: inst.interimResults };
    });
    zeilen.push(`c) Knopf ohne Spracherkennung ${r.ohne ? "da" : "aus"} · mit ${r.mit ? "da" : "fehlt"} · „${r.knopfText}“ · Feld danach „${r.nachDiktat}“`);
    if (r.ohne) probleme.push("c) der Diktierknopf steht da, obwohl das Gerät nicht zuhören kann");
    if (!r.mit) probleme.push("c) der Diktierknopf fehlt, obwohl Spracherkennung da ist");
    if (r.nachDiktat !== "Erster Satz. Zweiter Satz.") probleme.push(`c) Diktiertes ersetzt statt anzuhängen: „${r.nachDiktat}“`);
    if (!/stoppen/i.test(r.knopfText)) probleme.push("c) der Knopf sagt während der Aufnahme nicht, wie man sie beendet: " + r.knopfText);
    if (r.lang !== "de-DE") probleme.push("c) Erkennungssprache " + r.lang + " statt de-DE");
    if (r.interim !== false) probleme.push("c) interimResults ist nicht aus – halbe Sätze landen im Feld");
    if (r.gestopptNachWechsel < 1) probleme.push("c) der Wechsel auf „Text übernehmen“ beendet das Lauschen nicht");
    await s.schliessen();
  }

  return h.ergebnis("Adler-Coach: Diktieren, Optional, Reiter", probleme.length === 0, zeilen.concat(probleme));
};
