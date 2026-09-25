/* v624 · PO: „Der Zurück-Button auf dem Handy soll nicht zum Schließen der App führen,
   sondern Seite zurück. Gilt bei allen Apps."

   a) Trainer: Home → Training (Kacheln) → Planung → Zurück → Training → Zurück → Home.
      Der Wechsel aus der Zurück-Taste legt keinen neuen Eintrag an (sonst liefe man im Kreis).
   b) Einstieg mitten in einer Seite: unter ihr liegt die Startseite.
   c) Ein offenes Fenster schließt Zurück zuerst, die Seite bleibt.
   d) Vollbild-Fenster ohne „-modal"-Endung (Festival-Anfahrt, role="dialog") schließt Zurück
      ebenfalls, statt die App zu verlassen; Schließen per Knopf verbraucht den Eintrag still. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [] }) });
  const r = await s.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const zurueck = async () => { history.back(); await warte(120); return curSection; };
    if (typeof seiteZurueck !== "function") return { fehlt: true };
    document.getElementById("pin-gate")?.remove();
    const out = {};
    // b) Einstieg mitten drin
    history.replaceState(null, "");
    const l0 = history.length;
    go("kader"); await warte(60);
    out.b = { state: history.state && history.state.adlerSeite, laenge: history.length - l0 };
    out.b.zurueck = await zurueck();
    // a) Kette
    go("ue-training"); await warte(60); go("planung"); await warte(60);
    const la = history.length;
    out.a = [await zurueck(), await zurueck()];
    out.aNeu = history.length - la;
    // c) Fenster über einer Seite
    go("ue-team"); await warte(60);
    const m = document.createElement("div"); m.id = "probe-modal"; document.body.appendChild(m); await warte(30);
    out.c = { seite: await zurueck(), fenster: !!document.getElementById("probe-modal") };
    // d) Festival-Anfahrt (role=dialog, ohne Endung)
    _htPub = { row: { config: {}, teams: [], plan: [] } };
    if (typeof fstInfoOpen === "function") {
      fstInfoOpen(); await warte(30);
      out.d = { auf: !!document.getElementById("fst-info"), seite: await zurueck() };
      out.d.zu = !document.getElementById("fst-info");
      fstInfoOpen(); await warte(30);
      const vor = curSection;
      document.querySelector("#fst-info button").click(); await warte(150);
      out.d.knopf = { zu: !document.getElementById("fst-info"), seite: curSection, vor };
    }
    return out;
  });
  const fe = s.fehler();
  await s.schliessen();
  if (r.fehlt) probleme.push("seiteZurueck fehlt");
  else {
    if (r.b.state !== "kader" || r.b.zurueck !== "home") probleme.push(`b) Einstieg in „kader“: Zustand ${r.b.state}, Zurück führt nach „${r.b.zurueck}“ statt „home“`);
    if (r.a[0] !== "ue-training" || r.a[1] !== "home") probleme.push(`a) Zurück-Kette: ${r.a.join(" → ")} statt ue-training → home`);
    if (r.aNeu > 0) probleme.push(`a) Zurück legt neue Einträge an (+${r.aNeu})`);
    if (r.c.fenster || r.c.seite !== "ue-team") probleme.push(`c) Fenster ${r.c.fenster ? "bleibt offen" : "zu"}, Seite ${r.c.seite}`);
    if (!r.d || !r.d.auf || !r.d.zu || r.d.seite !== "ue-team") probleme.push(`d) Festival-Anfahrt: ${JSON.stringify(r.d)}`);
    else if (!r.d.knopf.zu || r.d.knopf.seite !== r.d.knopf.vor) probleme.push(`d) Schließen per Knopf verschiebt die Seite: ${JSON.stringify(r.d.knopf)}`);
    zeilen.push(`b) kader → ${r.b.zurueck} · a) ${r.a.join(" → ")} · c) Seite ${r.c.seite}, Fenster zu · d) Anfahrt zu, Seite ${r.d && r.d.seite}`);
  }
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v624 Zurück-Taste: Seite zurück statt App zu", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
