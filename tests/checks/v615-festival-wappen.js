/* v615 · PO: „Wenn wir das Kinderfestival planen über einen externen Link, wäre es super, wenn
   wir dort die Vereinslogos der jeweiligen Mannschaften auch hinterlegen aus der Gegnerdatenbank.“

   Die öffentliche Seite liest ohne Anmeldung, die Tabelle `gegner` ist für sie gesperrt. Beim
   Speichern schreibt die App deshalb die Wappen-Adressen als Schnappschuss in `config.wappen`.

   a) Speichern: config.wappen trägt das Wappen des Gastvereins aus der Gegner-DB, für uns
      selbst logo.png; ein Verein ohne Wappen bekommt keinen Eintrag. Kurzformen wie
      „Roland West“ finden „DJK Roland Köln-West“; passen zwei Vereine gleich gut, wird nicht
      geraten.
   b) Öffentliche Festivalseite (?turnier=…): neben den Teamnamen der Spiele und in der
      Aufwärmliste steht das Wappen – alt leer, aria-hidden, mit onerror.
   c) Die Seite bleibt im dunklen Modus des Handys hell (festes Layout): die leise Fußzeile
      hat dort mindestens 4,5:1. */
"use strict";
const WAPPEN = "https://example.org/storage/v1/object/public/wappen/gast.png";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const heute = h.heute();

  // ── a) Speichern ────────────────────────────────────────────────────────────
  let gepatcht = null;
  {
    const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [],
      gegner: [{ name: "FC Gastverein", wappen_url: WAPPEN }, { name: "DJK Roland Köln-West", wappen_url: WAPPEN + "?rw" },
               { name: "Doppel Nord", wappen_url: WAPPEN + "?n" }, { name: "Doppel Süd", wappen_url: WAPPEN + "?s" }],
      heimturnier: (u, req) => { if (req.method() === "PATCH") { try { gepatcht = JSON.parse(req.postData() || "{}"); } catch (e) {} return { status: 204, body: "" }; } return []; } }) });
    const r = await s.page.evaluate(async () => {
      if (typeof _htWappenErgaenzen !== "function") return { fehlt: true };
      _HT = { id: 7, name: "Kinderfestival", datum: "2026-10-10", config: { art: "festival" }, teams: [], plan: [] };
      const cfg = { art: "festival", vereine: [{ name: "SV Adler Dellbrück", kinder: 14, teams: 2 }, { name: "FC Gastverein", kinder: 10, teams: 2 }, { name: "TuS Ohne Wappen", kinder: 8, teams: 1 },
        { name: "Roland West", kinder: 8, teams: 1 }, { name: "Doppel", kinder: 8, teams: 1 }] };
      await htPatch({ config: cfg });
      return { lokal: (_HT.config || {}).wappen || null };
    });
    await s.schliessen();
    const w = (gepatcht && gepatcht.config && gepatcht.config.wappen) || {};
    if (r.fehlt) probleme.push("a) _htWappenErgaenzen fehlt");
    if (w["FC Gastverein"] !== WAPPEN) probleme.push("a) das Wappen des Gastvereins fehlt im gespeicherten Plan: " + JSON.stringify(w));
    if (w["SV Adler Dellbrück"] !== "logo.png") probleme.push("a) unser eigenes Wappen fehlt");
    if ("TuS Ohne Wappen" in w) probleme.push("a) Verein ohne Wappen hat trotzdem einen Eintrag");
    if (w["Roland West"] !== WAPPEN + "?rw") probleme.push("a) „Roland West“ findet „DJK Roland Köln-West“ nicht");
    if ("Doppel" in w) probleme.push("a) bei zwei gleich guten Treffern wurde geraten: " + w["Doppel"]);
    zeilen.push("a) gespeichert: " + JSON.stringify(w));
  }

  // ── b) + c) öffentliche Seite, dunkler Modus ────────────────────────────────
  {
    const vereine = [{ name: "SV Adler Dellbrück", kinder: 14, teams: 2 }, { name: "FC Gastverein", kinder: 10, teams: 2 }];
    let row = null;
    const s = await h.starten({ start: "/eltern/index.html?turnier=kinderfestival-10-10", angemeldet: false, warten: 2500, scheme: "dark",
      supabase: h.supabaseAttrappe({ heimturnier: () => row ? [row] : [] }) });
    // Plan im Browser bauen lassen (echte Funktionen), dann Seite neu laden
    row = await s.page.evaluate(async ({ vereine, heute, WAPPEN }) => {
      const warte = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 40 && typeof fstTeamsBauen !== "function"; i++) await warte(100);
      const teams = fstTeamsBauen(vereine);
      const cfg = { art: "festival", start: "10:15", dauer: 60, spieldauer: 8, wechsel: 5, felder: fstFelderKuerzen(FST_STANDARD_FELDER, teams), vereine,
        wappen: { "SV Adler Dellbrück": "logo.png", "FC Gastverein": WAPPEN } };
      return { id: 7, slug: "kinderfestival-10-10", name: "Kinderfestival", datum: heute, ort: "Sportplatz", aktiv: true, config: cfg, teams: teams.map(t => t.name), plan: fstPlanBauen(teams, cfg) };
    }, { vereine, heute, WAPPEN });
    await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(2500);
    const r = await s.page.evaluate((helfer) => {
      eval(helfer);
      const wrap = document.getElementById("ht-public"); if (!wrap) return { keineSeite: true };
      const bilder = [...wrap.querySelectorAll("img")].filter(i => i.getAttribute("aria-hidden") === "true");
      const gast = bilder.filter(i => /gast\.png/.test(i.src));
      const fuss = [...wrap.querySelectorAll("div")].reverse().find(d => /aktualisiert sich von selbst/.test(d.textContent) && d.children.length <= 1);
      return { theme: document.documentElement.getAttribute("data-theme"), bilder: bilder.length, gast: gast.length,
        altLeer: bilder.every(i => i.getAttribute("alt") === ""), onerror: bilder.every(i => /remove/.test(i.getAttribute("onerror") || "")),
        fussK: fuss ? window.__kontrastVon(fuss) : null, text: wrap.textContent.slice(0, 80) };
    }, h.kontrastHelfer);
    const f = s.fehler().filter(x => !/example\.org|ERR_/.test(x));
    await s.schliessen();
    if (r.keineSeite) probleme.push("b) die öffentliche Seite wurde nicht aufgebaut");
    else {
      if (r.gast < 2) probleme.push(`b) das Gast-Wappen steht nur ${r.gast}× auf der Seite`);
      if (!r.altLeer || !r.onerror) probleme.push("b) Wappen ohne leeres alt oder ohne onerror");
      if (r.theme !== "light") probleme.push(`c) die Seite folgt dem dunklen Modus (data-theme=${r.theme})`);
      if (r.fussK == null || r.fussK < 4.5) probleme.push(`c) Fußzeile im dunklen Modus des Handys: ${r.fussK}:1`);
    }
    if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
    zeilen.push(`b) öffentliche Seite: ${r.bilder} Wappen, davon ${r.gast}× Gastverein · c) Farbschema ${r.theme}, Fußzeile ${r.fussK}:1`);
  }
  return h.ergebnis("v615 Festival-Link: Vereinswappen aus der Gegner-Datenbank, Seite bleibt hell", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
