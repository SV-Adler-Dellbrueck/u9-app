/* v610 · Paket B aus der App-Prüfung vom 24.09.: Doppelungen raus, ein Name je Sache.

   a) Taktik: keine Kachel „Übungen“ mehr – sie sprang in den Bereich Training.
   b) Spieltag: die Kachel heißt „Wer ist dabei?“ wie der Block im Match (nicht
      „Anwesenheit“ – das ist beim Training die Liste der Trainingstermine).
   c) Orga: kein Emoji doppelt; „Setup-Übersicht“ steht unter Einstellungen.
   d) Eltern & Kinder: die Einladungskarten haben eine eigene Kachel.
   e) Spieltag: „Turnierplan (auswärts)“ (dieselbe Seite wie „Match“) ist weg.
   f) Kabine: höchstens acht Kacheln vorn, der Rest hinter „Mehr entdecken“ – keine geht verloren. */
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
      ["taktik", "spieltag", "orga", "elki"].forEach(k => out[k] = labels(k));
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
    if (r.taktik.some(t => /Übungen/.test(t))) probleme.push("a) Taktik führt weiter eine Kachel „Übungen“: " + r.taktik.join(" | "));
    if (!r.spieltag.some(t => /Wer ist dabei\?/.test(t))) probleme.push("b) Spieltag: keine Kachel „Wer ist dabei?“: " + r.spieltag.join(" | "));
    if (r.spieltag.some(t => /^\S+ Anwesenheit$/.test(t))) probleme.push("b) Spieltag heißt weiter „Anwesenheit“");
    const e = r.orga.map(emo), doppelt = e.filter((x, i) => x && e.indexOf(x) !== i);
    if (doppelt.length) probleme.push("c) Orga: Emoji doppelt: " + doppelt.join(" "));
    if (!/Setup-Übersicht/.test(r.orgaEinst)) probleme.push("c) „Setup-Übersicht“ steht nicht unter Einstellungen");
    if (!r.elki.some(t => /Einladungskarten/.test(t))) probleme.push("d) Eltern & Kinder: keine Kachel „Einladungskarten“");
    if (/Turnierplan \(auswärts\)/.test(r.turnier)) probleme.push("e) „Turnierplan (auswärts)“ steht weiter neben „Match“");
    if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
    zeilen.push(`Taktik: ${r.taktik.join(" | ")} · Spieltag: ${r.spieltag.join(" | ")}`);
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
      const alle = [...body.querySelectorAll("button[onclick^='kabine']")].filter(b => !/kabineExit/.test(b.getAttribute("onclick")));
      const mehr = body.querySelector("#kab-mehr");
      const vorn = alle.filter(b => !mehr || !mehr.contains(b));
      return { alle: alle.length, vorn: vorn.map(b => b.textContent.replace(/\s+/g, " ").trim()),
        mehr: !!mehr, zu: mehr ? !mehr.open : null, fn: alle.map(b => b.getAttribute("onclick")) };
    });
    const f = s.fehler().filter(x => !/youtube/i.test(x));
    await s.schliessen();
    if (r.vorn.length > 8) probleme.push(`f) vorn stehen ${r.vorn.length} Kacheln`);
    if (!r.mehr || !r.zu) probleme.push("f) kein zugeklapptes „Mehr entdecken“");
    for (const fn of ["kabineQuiz('taktik')", "kabineMyCard()", "kabineCodex()", "kabineShowGallery()", "kabineReporter()", "kabineAlbum()", "kabineStaerken()"])
      if (!r.fn.includes(fn)) probleme.push("f) Kachel verloren: " + fn);
    if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
    zeilen.push(`f) Kabine: ${r.vorn.length} vorn (${r.vorn.join(", ")}), ${r.alle - r.vorn.length} unter „Mehr entdecken“`);
  }
  return h.ergebnis("v610 Struktur: keine doppelten Kacheln, ein Name je Sache, Kabine mit acht Kacheln vorn", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
