/* v808 · Kindernamen in Schreibvarianten (Charles 08.11.2026). Nur erfundene Namen.
   a) Kölner Phonetik: Müller-Lüdenscheidt 65752682, Wikipedia 3412, Breschnew 17863
   b) tbPseudonym (Kopieren, Teilen, Monatsexport): gepflegte Variante nur in ihrer Schreibweise („Mika“ → Kind B, „mika“ bleibt),
      Gastkind ohne Buchstaben → „ein Kind“, streng ähnlich („Mikaila“, Abstand 1) → Kind B, locker ähnlich („Mykaila“, Abstand 2) bleibt,
      erlaubtes Wort („Team“) bleibt
   c) KI-Maske (nbMaske): dieselben Wörter bekommen den Platzhalter des Kindes, kein Name geht hinaus
   d) Prüfkarte: „Ist das ein Name?“ für „Mykaila“ – „Ja, Mikaela“ ruft namen_schreibweise_setzen mit Buchstabe B; danach keine Frage mehr
   e) Kinderprofil: Karte „Andere Schreibweisen“ zeigt „Mika“, „Erfassen“ legt eine neue Schreibweise für B an
   f) Migration: streng (Abstand ≤ 1), Varianten ohne „i“-Schalter, Alltagswörter erlaubt, Rechte; Export-Skript meldet namen_auto */
"use strict";
const fs = require("fs"), path = require("path"), { pathToFileURL } = require("url");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const kader = [
    { id: 1, name: "Testa", nr: 1, aktiv: true, sort_order: 1, alias: "A" },
    { id: 2, name: "Mikaela", nr: 2, aktiv: true, sort_order: 2, alias: "B" },
    { id: 3, name: "Bero", nr: 3, aktiv: true, sort_order: 3, alias: "C" }];
  const liste = [{ art: "name", wort: "Mika", alias: "B" }, { art: "name", wort: "Gastino", alias: null }, { art: "wort", wort: "Team", alias: null }];
  const gesetzt = [];
  const text = "Mika lacht, mika nicht. Mikaila kam. Gastino half. Mykaila auch. Das Team jubelte.";
  const s = await h.starten({ hoehe: 1600, supabase: h.supabaseAttrappe({
    kader, termine: [], profiles: [{ name: "Charles", rolle: "trainer" }],
    tagebuch_eintrag: [{ id: 50, autor: "Charles", datum: h.tagePlus(-1), quelle: "einheit", anlass: "einheit", status: "keim", ki_vorschlag: true, ausloeser: "Training", beobachtung: "Mykaila spielte im Team.", aha: "", konsequenz: "", rueckfragen: [] }],
    tagebuch_punkt: [],
    rpc: {
      namen_schreibweisen: () => liste.concat(gesetzt.filter(g => g.p_art !== "loeschen").map(g => ({ art: g.p_art, wort: g.p_wort, alias: g.p_alias }))),
      namen_schreibweise_setzen: (u, req) => { gesetzt.push(JSON.parse(req.postData() || "{}")); return null; }
    } }) });
  await h.sichtbarMachen(s.page, "#train-sub-spieltag");
  const r = await s.page.evaluate(async (text) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    window.trainerMe = async () => "Charles";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    document.getElementById("pin-gate")?.remove();
    const out = {};
    if (typeof koelnerPhonetik !== "function" || typeof namenNachbessern !== "function") return { fehlt: true };
    out.a = [koelnerPhonetik("Müller-Lüdenscheidt"), koelnerPhonetik("Wikipedia"), koelnerPhonetik("Breschnew")];
    await loadKader(); await namenSchreibLaden(true);
    out.b = typeof tbPseudonym === "function" ? tbPseudonym(text) : null;
    const m = typeof nbMaske === "function" ? nbMaske([]) : null;
    out.c = m ? m.weg(text) : null;
    // d) Prüfkarte
    if (typeof tbPruefenOpen === "function") {
      await tbPruefenOpen(50); await w(100);
      const fr = [...document.querySelectorAll("#tb-pruefen .tbp-name")];
      out.d = { fragen: fr.map(x => x.textContent.replace(/\s+/g, " ").trim()), knopfHoehe: fr[0] ? Math.round(fr[0].querySelector("button").getBoundingClientRect().height) : 0 };
      const ja = fr[0] && [...fr[0].querySelectorAll("button")].find(b => /^Ja/.test(b.textContent));
      if (ja) { ja.click(); for (let i = 0; i < 40 && document.querySelectorAll("#tb-pruefen .tbp-name").length; i++) await w(50); }
      out.d.danach = document.querySelectorAll("#tb-pruefen .tbp-name").length;
      if (typeof tbPruefenZu === "function") tbPruefenZu(); await w(100);
    }
    // e) Kinderprofil
    if (typeof kinderProfilOpen === "function") {
      await kinderProfilOpen(2); await w(100);
      const sec = [...document.querySelectorAll("#kp-modal .kp-karte")].find(x => /Andere Schreibweisen/.test(x.textContent));
      out.e = { da: !!sec, chips: sec ? sec.querySelector(".kp-schreib").textContent.replace(/\s+/g, " ") : "" };
      const inp = document.getElementById("kp-schreib-neu");
      if (inp) { inp.value = "Mikka"; await kinderProfilSchreibNeu(); }
      const sec3 = [...document.querySelectorAll("#kp-modal .kp-karte")].find(x => /Andere Schreibweisen/.test(x.textContent));
      out.e.nachher = sec3 ? sec3.querySelector(".kp-schreib").textContent.replace(/\s+/g, " ") : "";
      await kinderProfilZu(); await w(100);
      await kinderProfilOpen(1); await w(50);
      const sec2 = [...document.querySelectorAll("#kp-modal .kp-karte")].find(x => /Andere Schreibweisen/.test(x.textContent));
      out.e.andereKinder = sec2 ? sec2.querySelector(".kp-schreib").textContent.replace(/\s+/g, " ") : "";
      await kinderProfilZu(); await w(100);
    }
    return out;
  }, text);
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) probleme.push("Hilfsfunktionen fehlen");
  else {
    if (r.a.join() !== "65752682,3412,17863") probleme.push("a) Kölner Phonetik: " + r.a.join());
    const soll = "Kind B lacht, mika nicht. Kind B kam. ein Kind half. Mykaila auch. Das Team jubelte.";
    if (r.b !== soll) probleme.push("b) tbPseudonym: " + r.b);
    if (!r.c || /Mika |Mikaila|Gastino|Mikaela/.test(r.c) || !/mika nicht/.test(r.c) || !/ein Kind half/.test(r.c) || !/Mykaila/.test(r.c) || (r.c.match(/Kind \d+/g) || []).filter((x, i, a) => a.indexOf(x) === i).length !== 1) probleme.push("c) KI-Maske: " + r.c);
    if (!r.d || r.d.fragen.length !== 1 || !/„Mykaila“ – ist das Mikaela\?/.test(r.d.fragen[0]) || r.d.knopfHoehe < 44 || r.d.danach !== 0) probleme.push("d) Prüfkarte: " + JSON.stringify(r.d));
    const g = gesetzt.find(x => x.p_wort === "Mykaila");
    if (!g || g.p_art !== "name" || g.p_alias !== "B") probleme.push("d) RPC: " + JSON.stringify(gesetzt));
    const g2 = gesetzt.find(x => x.p_wort === "Mikka");
    if (!r.e || !r.e.da || !/„Mika“/.test(r.e.chips) || /Gastino/.test(r.e.chips) || !g2 || g2.p_alias !== "B" || !/„Mikka“/.test(r.e.nachher) || /„Mika“/.test(r.e.andereKinder)) probleme.push("e) Kinderprofil: " + JSON.stringify(r.e) + " " + JSON.stringify(g2));
  }
  zeilen.push("Phonetik stimmt; Teilen und KI-Maske: Variante nur in ihrer Schreibweise, Gastkind → „ein Kind“, streng ähnlich ersetzt, locker ähnlich bleibt, „Team“ bleibt");
  zeilen.push("Prüfkarte fragt „Ist das ein Name?“ und schreibt mit einem Tipp; Kinderprofil zeigt und erfasst Schreibweisen je Kind");
  // f)
  const sql = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20261113_v808_namen_aehnlich.sql"), "utf8");
  const pf = {
    streng: /levenshtein\(lower\(tok\), lower\(k\.n\)\) <= 1/.test(sql),
    variante_ohne_i: /coalesce\('Kind ' \|\| r\.alias, 'ein Kind'\), 'g'\)/.test(sql),
    team_erlaubt: /\('Team'\)/.test(sql),
    rechte: /grant execute on function public\.namen_schreibweisen\(\), public\.namen_schreibweise_setzen\(text, text, text\) to authenticated/.test(sql) && /is_trainer\(\)/.test(sql),
    lese: /grant select on export\.namen_auto, export\.namen_verdacht to adler_export_lese/.test(sql),
  };
  if (Object.values(pf).includes(false)) probleme.push("f) Migration: " + JSON.stringify(pf));
  const ex = await import(pathToFileURL(path.join(h.REPO, "tools/export-tagebuch.mjs")).href);
  const st = ex.baueStand({}, [], new Date("2026-11-08T00:00:00Z"), [{ tabelle: "tagebuch_eintrag", id: "9", feld: "aha", anzahl: 1 }]);
  if (!st.namen_auto || st.namen_auto.length !== 1 || st.skript_version !== 2) probleme.push("f) stand.json ohne namen_auto");
  zeilen.push("Migration streng (Abstand ≤ 1), Varianten ohne Rücksicht-Schalter, Alltagswörter erlaubt, Rechte; stand.json meldet namen_auto");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v808 Kindernamen in Schreibvarianten", !probleme.length, probleme.length ? probleme : zeilen);
};
