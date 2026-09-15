/* v566 – Sechs Funde aus einer Durchsicht der Eltern- und Kinder-Seite.

   1. Die Sammelkarte war oben abgeschnitten: ein zentrierter Flex-Container mit
      `overflow:auto` legt den Überstand VOR den Anfang des Scrollbereichs – dorthin kommt
      niemand. Jetzt zentriert ein Innenkasten mit `margin:auto`, und was nicht passt, scrollt.
   2. Taktik-Quiz: bei gegnerischem Anstoß stand der Jäger in der gegnerischen Hälfte, beim
      Abstoß des Gegners die halbe Raute – beides verbietet die Regel („Gegner hinter die
      Mittellinie"). Dazu Einwürfe, Eckstöße und Rote Karten, die es in unserer Spielform
      nicht gibt, ein Freilaufen mit dem Ziel neben dem Gegner, gerade Anführungszeichen.
      Geprüft werden hier die Regeln als Invarianten über ALLE 100 Szenarien.
   3. Vorlesen: Stimme nach Qualität statt nach Namensliste, Sprechtext statt Bildschirmtext
      („Torwart" statt „TW"), satzweise mit natürlicher Tonhöhe.
   4. Schiri: in der U9 gibt es keinen – raus aus Fairplay-Regeln, Kinder-Codex, Eltern-Quiz
      und den Fairplay-Fragen der Kinder. Die Datenbank trägt dieselben Sätze (Regel 4).
   5. Mitbringliste nur, wenn der Trainer sie beim Event einschaltet (Standard aus).
   6. Saison-Statistik: erst ansehen, dann auf Wunsch teilen – nicht sofort das Teilen-Blatt. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const heute = h.heute();

  // ── 2) + 3) + 4) im Trainer-Einstieg: Daten und reine Funktionen ─────────
  const s1 = await h.starten({ warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r1 = await s1.page.evaluate(() => {
    const out = { quiz: [], fehlt: [] };
    if (typeof TQ_SCENARIOS === "undefined") { out.fehlt.push("TQ_SCENARIOS"); return out; }
    const texte = sc => [sc.title, sc.desc, sc.task, sc.hint, sc.explain && sc.explain.correct, sc.explain && sc.explain.wrong].join(" | ");
    const alts = t => Array.isArray(t) ? t : [t];
    TQ_SCENARIOS.forEach((sc, i) => {
      const n = "#" + (i + 1) + " " + sc.title;
      const tx = texte(sc);
      // Regeln unserer Spielform: kein Einwurf, kein Eckstoß, keine Karten, kein Schiri
      if (/Einwurf|wirft ein|Eckstoß|Rot bekommen|Gelbe Karte|Schiri|Schiedsrichter/.test(tx)) out.quiz.push(n + ": nennt Einwurf/Eckstoß/Karte/Schiri");
      if (/'/.test(tx)) out.quiz.push(n + ": gerade Anführungszeichen im Text");
      // Anstoß oder Abstoß des Gegners: alle in der eigenen Hälfte (y > 50)
      if (/Anstoß für den Gegner|Gegnerischer Abstoß/.test(sc.desc)) {
        Object.entries(sc.targets || {}).forEach(([role, t]) => alts(t).forEach(z => { if (z.y < 50) out.quiz.push(`${n}: Ziel ${role} bei y=${z.y} in der gegnerischen Hälfte`); }));
        sc.start.forEach(t => { if (t.y < 50) out.quiz.push(`${n}: ${t.role} startet bei y=${t.y} in der gegnerischen Hälfte`); });
      }
      // Jedes Ziel gehört zu einem beweglichen Spieler und liegt auf dem Feld
      Object.entries(sc.targets || {}).forEach(([role, t]) => {
        const p = sc.start.find(x => x.role === role);
        if (!p) out.quiz.push(`${n}: Ziel für ${role}, der nicht auf dem Feld steht`);
        else if (p.locked) out.quiz.push(`${n}: Ziel für ${role}, der gesperrt ist`);
        alts(t).forEach(z => { if (z.x < 2 || z.x > 98 || z.y < 2 || z.y > 98 || !(z.r > 0)) out.quiz.push(`${n}: Ziel ${role} außerhalb des Feldes`); });
      });
      // Eine Animation darf kein Ziel schenken
      (sc.anim || []).forEach(a => {
        const p = sc.start.find(x => x.role === a.role);
        const t = sc.targets && sc.targets[a.role];
        if (p && !p.locked && t && alts(t).some(z => z.x === a.to.x && z.y === a.to.y)) out.quiz.push(`${n}: ${a.role} wird ins eigene Ziel animiert`);
      });
    });
    const unterzahl = TQ_SCENARIOS.find(sc => /Unterzahl/.test(sc.title));
    out.unterzahlFeld = unterzahl ? unterzahl.start.filter(t => t.role !== "TW").length : -1;
    out.unterzahlGegner = unterzahl ? (unterzahl.opps || []).length : -1;
    out.anzahl = TQ_SCENARIOS.length;

    // 3) Vorlesen
    if (typeof ttsGermanVoice !== "function" || typeof ttsSprechtext !== "function" || typeof ttsSaetze !== "function") out.fehlt.push("tts");
    else {
      _ttsVoices = [
        { name: "Anna", lang: "de-DE", localService: true },
        { name: "Anna (Erweitert)", lang: "de-DE", localService: true },
        { name: "Google Deutsch", lang: "de-DE", localService: false },
        { name: "Samantha", lang: "en-US", localService: true }
      ];
      out.stimme = (ttsGermanVoice() || {}).name;
      _ttsVoices = [{ name: "Anna (compact)", lang: "de-DE" }, { name: "Yannick", lang: "de-DE" }];
      out.stimmeOhneKompakt = (ttsGermanVoice() || {}).name;
      out.sprech = ttsSprechtext("TW spielt 1gg1 mit Flitzer L ⚽ – 2:1!");
      out.saetze = ttsSaetze("Erster Satz. Zweiter Satz! Dritter?").length;
      // tqSpeak: satzweise, natürliche Tonhöhe – Sprachausgabe durch eine Attrappe ersetzt
      const gesprochen = [];
      const echt = window.speechSynthesis;
      try {
        Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speaking: false, pending: false, cancel() {}, getVoices: () => [], speak: u => gesprochen.push(u) } });
        _ttsVoices = []; // eine Attrappen-Stimme nimmt der Browser nicht an – ohne Stimme spricht das Gerät mit der Standardstimme
        /* v567: Seit es Aufnahmen gibt, spielt tqSpeak zuerst die Datei. Geprüft wird hier
           die Gerätestimme – also die Datei ausschalten, damit der Rückfall greift. */
        window.Audio = function () { throw new Error("keine Aufnahme im Prüfstand"); };
        tqScenarios = [{ desc: "Der TW hat den Ball. Jetzt Tempo!", task: "Schiebe Flitzer L nach vorne!" }]; tqIdx = 0; tqPlayer = "";
        tqSpeak(null);
      } catch (e) { out.speakFehler = String(e && e.message || e); }
      try { Object.defineProperty(window, "speechSynthesis", { configurable: true, value: echt }); } catch (e) {}
      out.aeusserungen = gesprochen.length;
      out.tonhoehe = gesprochen.map(u => u.pitch).join(",");
      out.gesprochenText = gesprochen.map(u => u.text).join(" / ");
    }

    // 4) Schiri: erlaubt ist nur die Aussage, dass es keinen gibt
    const schiri = t => /Schiri|Schiedsrichter/.test(String(t).replace(/kein(en|e)? (Schiri|Schiedsrichter)/g, ""));
    out.schiri = [];
    if (typeof FAIRPLAY_REGELN !== "undefined") FAIRPLAY_REGELN.forEach(r => { if (schiri(r.t + " " + r.d)) out.schiri.push("Fairplay-Regel: " + r.t); });
    if (typeof FAIRPLAY_QUIZ !== "undefined") FAIRPLAY_QUIZ.forEach(q => { if (schiri(q.q + " " + q.opts.join(" "))) out.schiri.push("Eltern-Quiz: " + q.q); });
    if (typeof KINDER_CODEX !== "undefined") KINDER_CODEX.forEach(z => { if (schiri(z)) out.schiri.push("Codex: " + z); });
    if (typeof WQ_QUESTIONS !== "undefined") WQ_QUESTIONS.filter(q => q.cat === "fairplay").forEach(q => { if (schiri(q.q + " " + q.opts.join(" "))) out.schiri.push("Kinder-Fairplay: " + q.q); });
    out.codexSaetze = typeof KINDER_CODEX !== "undefined" ? KINDER_CODEX.length : -1;

    // 5) Termin-Editor: Schalter nur beim Event, und er wird gespeichert
    out.editor = {};
    if (typeof tmEdit !== "function") out.fehlt.push("tmEdit");
    else {
      TM_TERMINE = [
        { id: 501, typ: "event", datum: "2026-12-01", titel: "Weihnachtsfeier", mitbringen: false },
        { id: 502, typ: "training", datum: "2026-12-02" }
      ];
      tmEdit(501);
      const cb = document.getElementById("te-mitbringen");
      out.editor.eventHaken = !!cb;
      out.editor.hoehe = cb ? Math.round(cb.closest("label").getBoundingClientRect().height) : 0;
      if (cb) cb.checked = true;
      out.editor.speichern = typeof tmEditSave === "function";
      if (cb && typeof tmEditSave === "function") tmEditSave(501);
      document.getElementById("tm-edit-modal")?.remove();
      tmEdit(502);
      out.editor.trainingHaken = !!document.getElementById("te-mitbringen");
      document.getElementById("tm-edit-modal")?.remove();
    }
    // Anlegen: Zeile nur beim Event, sonst versteckt UND geleert
    if (typeof tmSetTyp !== "function") out.fehlt.push("tmSetTyp");
    else {
      const row = document.getElementById("tm-mitbringen-row"), mb = document.getElementById("tm-mitbringen");
      out.anlegen = { zeile: !!row && !!mb };
      if (row && mb) {
        tmSetTyp("event"); mb.checked = true;
        out.anlegen.beiEvent = getComputedStyle(row).display;
        tmSetTyp("training");
        out.anlegen.beiTraining = getComputedStyle(row).display;
        out.anlegen.geleert = mb.checked === false;
        tmSetTyp("training");
      }
    }
    return out;
  });
  const gesendet1 = s1.gesendet.slice();
  const fehler1 = s1.fehler();
  await s1.schliessen();

  if (r1.fehlt.length) probleme.push(r1.fehlt.join(", ") + " fehlt");
  probleme.push(...r1.quiz.slice(0, 8));
  if (r1.quiz.length > 8) probleme.push(`… und ${r1.quiz.length - 8} weitere Quiz-Funde`);
  if (r1.unterzahlFeld !== 3) probleme.push(`Unterzahl-Szenario zeigt ${r1.unterzahlFeld} Feldspieler – der Text verspricht drei`);
  if (r1.unterzahlGegner !== 4) probleme.push(`Unterzahl-Szenario zeigt ${r1.unterzahlGegner} Gegner – bei 4+1 sind es vier`);
  if (r1.stimme !== "Anna (Erweitert)") probleme.push(`Vorlesen wählt „${r1.stimme}“ statt der erweiterten Stimme – genau die kompakte klang wie ein Roboter`);
  if (r1.stimmeOhneKompakt !== "Yannick") probleme.push(`Vorlesen wählt „${r1.stimmeOhneKompakt}“ – die kompakte Stimme müsste ganz hinten stehen`);
  if (r1.sprech !== "Torwart spielt 1 gegen 1 mit Flitzer links – 2 zu 1!") probleme.push(`Sprechtext lautet „${r1.sprech}“`);
  if (r1.saetze !== 3) probleme.push(`Satztrennung liefert ${r1.saetze} statt 3 Sätze`);
  if (r1.speakFehler) probleme.push("tqSpeak bricht ab: " + r1.speakFehler);
  if (r1.aeusserungen < 3) probleme.push(`tqSpeak spricht ${r1.aeusserungen} Äußerung(en) – erwartet satzweise (3): „${r1.gesprochenText}“`);
  if (/1\.1/.test(r1.tonhoehe)) probleme.push(`Tonhöhe ${r1.tonhoehe} – die hochgedrehte Stimme klang gepresst`);
  if (/\bTW\b/.test(r1.gesprochenText || "")) probleme.push("Vorgelesen wird „TW“ statt „Torwart“");
  probleme.push(...r1.schiri.map(x => "Schiri steht noch da – " + x));
  if (r1.codexSaetze !== 6) probleme.push(`Kinder-Codex hat ${r1.codexSaetze} Sätze statt 6`);
  if (!r1.editor.eventHaken) probleme.push("Im Termin-Editor fehlt beim Event der Schalter für die Mitbringliste");
  else if (r1.editor.hoehe < 44) probleme.push(`Der Schalter ist ${r1.editor.hoehe} px hoch – gefordert 44`);
  if (r1.editor.trainingHaken) probleme.push("Beim Training steht ein Mitbring-Schalter – dort bringt niemand etwas mit");
  const patch = gesendet1.find(g => g.methode === "PATCH" && /termine/.test(g.pfad) && /501/.test(g.suche));
  if (!patch) probleme.push("Speichern im Editor schickt keinen PATCH auf den Termin");
  else if (patch.body.mitbringen !== true) probleme.push(`Der gesetzte Schalter kommt nicht an (mitbringen=${JSON.stringify(patch.body.mitbringen)})`);
  if (!r1.anlegen || !r1.anlegen.zeile) probleme.push("Im Anlegen-Formular fehlt die Mitbring-Zeile");
  else {
    if (r1.anlegen.beiEvent === "none") probleme.push("Beim Anlegen eines Events ist die Mitbring-Zeile versteckt");
    if (r1.anlegen.beiTraining !== "none") probleme.push("Beim Training bleibt die Mitbring-Zeile sichtbar");
    if (!r1.anlegen.geleert) probleme.push("Ein gesetzter Haken bleibt beim Wechsel auf Training unsichtbar gesetzt – er wanderte in den nächsten Termin");
  }
  if (fehler1.length) probleme.push("Konsole (Trainer): " + fehler1[0]);
  if (!probleme.length) zeilen.push(`Quiz: ${r1.anzahl} Szenarien regelkonform · Vorlesen: „${r1.stimme}“, ${r1.aeusserungen} Sätze · Schiri nirgends · Mitbring-Schalter nur beim Event, gespeichert`);

  // ── 1) + 5) + 6) im Eltern-Einstieg ───────────────────────────────────────
  const EVENT_AN = { id: 601, typ: "event", datum: h.tagePlus(5), titel: "Grillfest", ort: "Platz", mitbringen: true };
  const EVENT_AUS = { id: 602, typ: "event", datum: h.tagePlus(9), titel: "Elternaustausch", ort: "Vereinsheim", mitbringen: false };
  const s2 = await h.starten({ start: "/eltern/index.html", breite: 360, hoehe: 520, warten: 1200, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    termine: (u) => {
      const alle = [EVENT_AN, EVENT_AUS];
      return u.searchParams.get("mitbringen") === "is.true" ? alle.filter(t => t.mitbringen) : alle;
    },
    event_mitbringen: [],
    rpc: { get_child_wrapped: { ok: true, name: "Kind A", tore: 3, aktionen: 40, einsatz_min: 120, xp: 200, spiele: 5 } }
  }) });
  const r2 = await s2.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = { fehlt: [] };
    // 1) Sammelkarte auf einem kleinen Bildschirm: oben erreichbar, unten erreichbar
    if (typeof elternCardShow !== "function" || typeof adlerCardDataFromChild !== "function") out.fehlt.push("elternCardShow");
    else {
      const d = adlerCardDataFromChild({ name: "Kind A", nr: 7, tw: false, geb: "2017-05-01", radios: {}, stats: { tore: 2, trainings: 11 } });
      await elternCardShow(d);
      await warte(300);
      const modal = document.getElementById("adler-card-modal");
      const canvas = modal && modal.querySelector("canvas");
      if (!modal || !canvas) out.fehlt.push("Karten-Fenster");
      else {
        modal.scrollTop = 0;
        out.karteOben = Math.round(canvas.getBoundingClientRect().top);
        modal.scrollTop = modal.scrollHeight;
        const knopf = [...modal.querySelectorAll("button")].find(b => /Schließen/.test(b.textContent));
        out.knopfUnten = knopf ? Math.round(knopf.getBoundingClientRect().bottom) : -1;
        out.fenster = window.innerHeight;
        modal.remove();
      }
    }
    // 5) Mitbringliste: nur eingeschaltete Events
    if (typeof elternMitbringLoad !== "function") out.fehlt.push("elternMitbringLoad");
    else {
      let slot = document.getElementById("mitbring-slot");
      if (!slot) { slot = document.createElement("div"); slot.id = "mitbring-slot"; document.body.appendChild(slot); }
      await elternMitbringLoad([{ spieler_id: 1, kader: { name: "Kind A" } }]);
      out.mitbring = slot.textContent.replace(/\s+/g, " ").trim();
    }
    // 6) Saison-Statistik: ansehen, Teilen ist ein Knopf
    const geteilt = [];
    try { navigator.share = async x => { geteilt.push(x); }; navigator.canShare = () => true; } catch (e) {}
    if (typeof childWrappedOpen !== "function") out.fehlt.push("childWrappedOpen");
    else {
      childWrappedOpen(1);
      await warte(900);
      const m = document.getElementById("wrapped-modal");
      out.statistik = {
        fenster: !!m,
        bild: !!(m && m.querySelector("canvas")),
        teilen: !!(m && [...m.querySelectorAll("button")].some(b => /Teilen/.test(b.textContent))),
        dialog: !!(m && m.getAttribute("role") === "dialog"),
        sofortGeteilt: geteilt.length
      };
      const t = m && [...m.querySelectorAll("button")].find(b => /Teilen/.test(b.textContent));
      if (t) { t.click(); await warte(600); }
      out.statistik.nachKnopf = geteilt.length;
    }
    return out;
  });
  const gesendet2 = s2.gesendet.slice();
  const fehler2 = s2.fehler();
  await s2.schliessen();

  if (r2.fehlt.length) probleme.push(r2.fehlt.join(", ") + " fehlt");
  if (r2.karteOben != null && r2.karteOben < 0) probleme.push(`Die Sammelkarte beginnt ${-r2.karteOben} px über dem Bildschirm – dorthin kommt niemand`);
  if (r2.knopfUnten != null && r2.knopfUnten > r2.fenster) probleme.push(`„Schließen“ endet bei ${r2.knopfUnten} px, der Bildschirm bei ${r2.fenster}`);
  if (r2.mitbring != null) {
    if (!/Grillfest/.test(r2.mitbring)) probleme.push(`Die eingeschaltete Liste (Grillfest) fehlt: „${r2.mitbring.slice(0, 80)}“`);
    if (/Elternaustausch/.test(r2.mitbring)) probleme.push("Der Elternaustausch zeigt eine Mitbringliste – dort bringt niemand etwas mit");
  }
  if (r2.statistik) {
    if (!r2.statistik.fenster || !r2.statistik.bild) probleme.push("Saison-Statistik öffnet kein Fenster mit der Karte");
    if (!r2.statistik.teilen) probleme.push("Im Statistik-Fenster fehlt der Teilen-Knopf");
    if (!r2.statistik.dialog) probleme.push("Das Statistik-Fenster ist kein Dialog (role/aria-modal)");
    if (r2.statistik.sofortGeteilt) probleme.push("Antippen der Saison-Statistik öffnet sofort das Teilen – erst ansehen, dann teilen");
    if (r2.statistik.nachKnopf < 1) probleme.push("Der Teilen-Knopf teilt nicht");
  }
  if (fehler2.length) probleme.push("Konsole (Eltern): " + fehler2[0]);
  if (!probleme.length) zeilen.push(`Karte oben bei ${r2.karteOben} px, Schließen bei ${r2.knopfUnten}/${r2.fenster} px · Mitbringliste nur Grillfest · Statistik: Fenster, Teilen erst per Knopf`);

  return h.ergebnis("Eltern-Durchsicht: Karte, Quiz-Regeln, Vorlesen, Schiri, Mitbringen, Statistik", !probleme.length, zeilen.concat(probleme));
};
