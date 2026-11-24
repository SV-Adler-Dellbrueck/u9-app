/* v610 · Paket B aus der App-Prüfung vom 24.09.: Doppelungen raus, ein Name je Sache.

   a) Taktik: keine Kachel „Übungen“ mehr – sie sprang in den Bereich Training. Seit v682 hat
      Taktik gar keine Kachelseite mehr (direkt aufs Brett); seit v871 liefert _kachelInhalt dafür nichts.
   b) Spieltag: die Kachel heißt „Wer ist dabei?“ wie der Block im Match (nicht
      „Anwesenheit“ – das ist beim Training die Liste der Trainingstermine).
   c) Orga: kein Emoji doppelt; „Setup-Übersicht“ steht unter Einstellungen.
   d) Eltern & Kinder: die Einladungskarten haben eine eigene Kachel.
   e) Spieltag: „Turnierplan (auswärts)“ (dieselbe Seite wie „Match“) ist weg.
   f) Kabine: höchstens acht Kacheln vorn (seit v755 „Lob vom Trainer“ mit Neu-Punkt vorn; seit v761 wartet dafür „Skill der Woche“ hinter „Mehr entdecken“), der Rest dahinter – keine geht verloren. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];

  // ── a–e: Kachelseiten des Trainers ───────────────────────────────────────────
  {
    const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(),
      termine: [{ id: 7, datum: h.tagePlus(3), typ: "turnier", heim: false }], heimturnier: [] }) });
    const r = await s.page.evaluate(async () => {
      const warte = ms => new Promise(r => setTimeout(r, ms));
      const labels = key => { const d = document.createElement("div"); d.innerHTML = _kachelInhalt(key);
        return [...d.querySelectorAll("button")].map(b => b.textContent.replace(/\s+/g, " ").trim()); };
      const out = {};
      ["spieltag", "orga", "elki"].forEach(k => out[k] = labels(k));
      out.taktik = labels("taktik");   // v871: keine Kachelseite mehr – erwartet leer
      out.spieltagKarte = /id="spieltag-termine"/.test(_kachelInhalt("spieltag"));   // v937: Termin-Kachel statt eigener Karte
      const d = document.createElement("div"); d.innerHTML = _kachelInhalt("orga");
      out.orgaEinst = (d.innerHTML.split(/Einstellungen/)[1] || "");
      // e) Turnier-Gruppe bei einem Auswärtsturnier
      const slot = document.createElement("div"); slot.id = "kachel-turnier"; document.body.appendChild(slot);
      await _kachelTurnierCheck(); await warte(50);
      out.turnier = slot.textContent.replace(/\s+/g, " ").trim();
      return out;
    });
    const f = s.fehler();
    await s.schliessen();
    const emo = t => (t.match(/^\S+/) || [""])[0];
    if (r.taktik.length) probleme.push("a) Taktik hat wieder Kacheln: " + r.taktik.join(" | "));
    // v665 PO: „Auf der Startkachel ‚Wer ist dabei‘ müssen direkt die Rückmeldungen der Eltern angezeigt werden“ – seither eine Karte (st-dabei-karte), keine Kachel.
    if (!r.spieltagKarte) probleme.push("b) Spieltag: keine Karte „Wer ist dabei?“");
    if (r.spieltag.some(t => /^\S+ Anwesenheit$/.test(t))) probleme.push("b) Spieltag heißt weiter „Anwesenheit“");
    const e = r.orga.map(emo), doppelt = e.filter((x, i) => x && e.indexOf(x) !== i);
    if (doppelt.length) probleme.push("c) Orga: Emoji doppelt: " + doppelt.join(" "));
    if (!/Setup-Übersicht/.test(r.orgaEinst)) probleme.push("c) „Setup-Übersicht“ steht nicht unter Einstellungen");
    if (!r.elki.some(t => /Einladungskarten/.test(t))) probleme.push("d) Eltern & Kinder: keine Kachel „Einladungskarten“");
    if (/Turnierplan \(auswärts\)/.test(r.turnier)) probleme.push("e) „Turnierplan (auswärts)“ steht weiter neben „Match“");
    if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
    zeilen.push(`Taktik: keine Kachelseite · Spieltag: ${r.spieltag.join(" | ")}`);
    zeilen.push(`Orga: ${r.orga.join(" | ")} · Auswärtsturnier: „${r.turnier || "(keine Extra-Gruppe)"}“`);
  }

  // ── f: Kabine ────────────────────────────────────────────────────────────────
  {
    const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1500,
      supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }] }) });
    const r = await s.page.evaluate(() => {
      let k = document.getElementById("kabine"); if (!k) { k = document.createElement("div"); k.id = "kabine"; k.innerHTML = '<div id="kabine-body"></div>'; document.body.appendChild(k); }
      kabineHome();
      const body = document.getElementById("kabine-body");
      /* v658: „❓ Zeig mir alles“ startet die Tour und ist keine Kachel.
         v965 (Charles 24.11., „aufräumen“): statt „Mehr entdecken“ drei Türen; dahinter je höchstens sechs Kacheln. */
      const fnVon = () => [...body.querySelectorAll("button[onclick]")].map(b => b.getAttribute("onclick")).filter(x => !/kabineExit|kabineTourStart|kabineHome|kabineTuer/.test(x));
      const vorn = [...body.querySelectorAll("button[onclick^='kabine']")].filter(b => !/kabineExit|kabineTourStart/.test(b.getAttribute("onclick")));
      const tueren = typeof kabineTuer === "function" ? [...body.querySelectorAll("button[onclick^='kabineTuer']")].map(b => b.getAttribute("onclick")) : [];
      const fn = fnVon(), jeTuer = [];
      for (const t of tueren) { eval(t); const f = fnVon(); jeTuer.push(f.length); fn.push(...f); }
      return { vorn: vorn.map(b => b.textContent.replace(/\s+/g, " ").trim()), tueren: tueren.length, jeTuer, fn, mehr: !!body.querySelector("#kab-mehr") };
    });
    const f = s.fehler().filter(x => !/youtube/i.test(x));
    await s.schliessen();
    if (r.vorn.length > 8) probleme.push(`f) vorn stehen ${r.vorn.length} Kacheln`);
    if (r.tueren !== 3 || r.jeTuer.some(n => n > 6)) probleme.push(`f) Türen ${r.tueren}, Kacheln je Tür ${r.jeTuer.join("/")} (erwartet 3 Türen, je ≤ 6)`);
    for (const fn of ["kabineQuiz('schule')", "kabineMyCard()", "kabineCodex()", "kabineShowGallery()", "kabineReporter()", "kabineAlbum()", "kabineStaerken()", "kabineLobWahl()", "kabineShowQuests()", "kabineKudos()", "kabineBrett()", "kabineMission()", "kabineRollen()", "kabineHype()"])
      if (!r.fn.includes(fn)) probleme.push("f) Kachel verloren: " + fn);
    if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
    zeilen.push(`f) Kabine: ${r.vorn.length} vorn (${r.vorn.join(", ")}), dahinter ${r.jeTuer.join(" + ")} Kacheln`);
  }
  return h.ergebnis("v610 Struktur: keine doppelten Kacheln, ein Name je Sache, Kabine mit drei Türen vorn", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
