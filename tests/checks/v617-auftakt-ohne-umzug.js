/* v617 · PO: „Das Fenster, das ganz am Anfang eingeblendet wird, dass die App jetzt an einer
   anderen Stelle ist und man weitergeleitet wird, das kann weg." – und: „Ist es möglich, dass
   beim Öffnen eine Art Animation abläuft, z. B. das Adler-Logo einfliegt?"

   Ersetzt den Prüffall v515 (Umzugs-Hinweis), dessen Gegenstand es nicht mehr gibt.

   a) Umzug: Auch mit ?umzug=1 erscheint kein Hinweis mehr; umzugHinweis gibt es nicht mehr.
   b) Auftakt in trainer/, eltern/ und kinder/: #adler-intro steht sofort, trägt das Wappen,
      ist aria-hidden, klickt nicht (pointer-events:none), liegt über allen Dialogen
      (z > 10069) und ist nach spätestens 2 s aus dem DOM.
   c) Einmal je Sitzung: nach einem Neuladen kommt er nicht noch einmal.
   d) Geteilte Links (Stadionheft) öffnen ohne Auftakt.
   e) „Bewegung reduzieren": kein Flug, nach spätestens 1,2 s weg.
   f) Ein Tipp beendet ihn sofort.
   g) PO: „Die Gegner-Datenbank in der Festival-Planung einklappen." Die Schnellwahl steht
      zugeklappt da, trägt die Zahl der freien Vereine, bleibt nach dem Aufklappen über ein
      Neuzeichnen offen; ein Verein, der schon dabei ist, steht nicht mehr darin. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const attrappe = () => h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [] });

  /* Öffnet die Seite neu, als wäre es der erste Start der Sitzung, und misst den Auftakt. */
  const messen = async (s, pfad, opt = {}) => {
    if (opt.ruhig) await s.page.emulateMedia({ reducedMotion: "reduce" });
    if (!opt.gleicheSitzung) await s.page.evaluate(() => { try { sessionStorage.removeItem("adler-intro"); } catch (e) {} });
    const t0 = Date.now();
    await s.page.goto("https://app.test" + pfad, { waitUntil: "commit" });
    const da = await s.page.waitForSelector("#adler-intro", { state: "attached", timeout: 1500 }).then(() => true).catch(() => false);
    if (!da) return { da: false };
    const info = await s.page.evaluate(() => {
      const d = document.getElementById("adler-intro"); if (!d) return null;
      const st = getComputedStyle(d), img = d.querySelector("img");
      return { hidden: d.getAttribute("aria-hidden"), pe: st.pointerEvents, z: +st.zIndex, rolle: d.getAttribute("role"),
        wappen: !!img && /logo\.png$/.test(img.getAttribute("src") || ""), flug: img ? getComputedStyle(img).animationName : "" };
    });
    if (opt.tippen) {
      await s.page.waitForTimeout(200);
      await s.page.mouse.click(20, 20);
      const nachTipp = await s.page.evaluate(() => !!document.getElementById("adler-intro"));
      return { da, ...info, nachTipp };
    }
    const weg = await s.page.waitForSelector("#adler-intro", { state: "detached", timeout: 3000 }).then(() => true).catch(() => false);
    return { da, ...info, weg, ms: Date.now() - t0 };
  };

  const s = await h.starten({ start: "/trainer/index.html?umzug=1", supabase: attrappe(), warten: 2200, intro: true });

  // a) Umzug
  const a = await s.page.evaluate(() => ({ hinweis: !!document.getElementById("umzug-hinweis"), fn: typeof umzugHinweis, url: location.search }));
  if (a.hinweis) probleme.push("a) der Umzugs-Hinweis erscheint noch");
  if (a.fn !== "undefined") probleme.push("a) umzugHinweis gibt es noch");
  zeilen.push(`a) ?umzug=1: Hinweis ${a.hinweis ? "da" : "weg"}, umzugHinweis ${a.fn}`);

  // b) drei Einstiege
  for (const [name, pfad] of [["Trainer", "/trainer/index.html"], ["Eltern", "/eltern/index.html"], ["Kabine", "/kinder/index.html"]]) {
    const r = await messen(s, pfad);
    if (!r.da) { probleme.push(`b) ${name}: kein Auftakt`); continue; }
    if (r.hidden !== "true") probleme.push(`b) ${name}: nicht aria-hidden`);
    if (r.pe !== "none") probleme.push(`b) ${name}: fängt Klicks ab (pointer-events ${r.pe})`);
    if (!(r.z > 10069)) probleme.push(`b) ${name}: z-index ${r.z} im Bereich der Dialoge`);
    if (r.rolle) probleme.push(`b) ${name}: als ${r.rolle} gekennzeichnet`);
    if (!r.wappen) probleme.push(`b) ${name}: ohne Adler-Wappen`);
    if (!/adlerIntroFlug/.test(r.flug)) probleme.push(`b) ${name}: das Wappen fliegt nicht ein (${r.flug})`);
    if (!r.weg || r.ms > 2600) probleme.push(`b) ${name}: nach ${r.ms} ms noch da`);
    zeilen.push(`b) ${name}: Auftakt ${r.flug}, z ${r.z}, weg nach ${r.ms} ms`);
  }

  // c) gleiche Sitzung, neu geladen
  const c = await messen(s, "/trainer/index.html", { gleicheSitzung: true });
  if (c.da) probleme.push("c) nach dem Neuladen kommt der Auftakt noch einmal");
  // d) geteilter Link
  const d = await messen(s, "/eltern/index.html?heft");
  if (d.da) probleme.push("d) das Stadionheft öffnet mit Auftakt");
  // f) Tipp
  const f = await messen(s, "/trainer/index.html", { tippen: true });
  if (!f.da || f.nachTipp) probleme.push(`f) ein Tipp beendet den Auftakt nicht (${f.da ? "noch da" : "nicht erschienen"})`);
  // e) Bewegung reduzieren
  const e = await messen(s, "/trainer/index.html", { ruhig: true });
  if (!e.da) probleme.push("e) mit „Bewegung reduzieren“ fehlt das Wappen ganz");
  else {
    if (/adlerIntroFlug/.test(e.flug)) probleme.push("e) mit „Bewegung reduzieren“ fliegt das Wappen trotzdem");
    if (!e.weg || e.ms > 1800) probleme.push(`e) mit „Bewegung reduzieren“ nach ${e.ms} ms noch da`);
  }
  zeilen.push(`c) Neuladen: ${c.da ? "Auftakt" : "keiner"} · d) Heft: ${d.da ? "Auftakt" : "keiner"} · e) ruhig: ${e.flug || "–"}, ${e.ms} ms · f) Tipp: ${f.nachTipp ? "bleibt" : "weg"}`);

  const fe = s.fehler();
  await s.schliessen();

  // g) Festival-Planer: Gegner-Datenbank eingeklappt
  {
    const t = await h.starten({ warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [], nominierungen: [],
      gegner: [{ name: "FC Gastverein" }, { name: "DJK Roland Köln-West" }, { name: "TuS Nachbar" }],
      heimturnier: (u, req) => req.method() === "PATCH" ? { status: 204, body: "" } : [] }) });
    const g = await t.page.evaluate(async () => {
      const warte = ms => new Promise(r => setTimeout(r, ms));
      document.getElementById("pin-gate")?.remove();
      window._htGegner = undefined;
      _HT = { id: 7, name: "Kinderfestival", datum: "2026-10-10", config: { art: "festival", start: "10:15", dauer: 60, wechsel: 5,
        vereine: [{ name: "SV Adler Dellbrück", teams: 2, kinder: 10 }, { name: "FC Gastverein", teams: 1, kinder: 8 }] }, teams: [], plan: [] };
      const body = document.createElement("div"); body.id = "ht-body"; document.body.appendChild(body);
      fstRender(); await warte(500);
      const d = () => document.getElementById("fst-gegner-db");
      const vorher = { da: !!d(), offen: d() && d().open, versteckt: d() && d().hidden, zahl: document.getElementById("fst-gegner-zahl")?.textContent || "",
        chips: [...document.querySelectorAll("#fst-gegner button")].map(b => b.textContent.trim()), sichtbar: d() ? d().querySelector("summary").getBoundingClientRect().height : 0 };
      d().open = true; fstRender(); await warte(400);
      return { vorher, nachher: d() && d().open };
    });
    const ge = t.fehler();
    await t.schliessen();
    if (!g.vorher.da) probleme.push("g) keine eingeklappte Gegner-Schnellwahl im Festival-Planer");
    else {
      if (g.vorher.offen) probleme.push("g) die Gegner-Datenbank steht aufgeklappt da");
      if (g.vorher.versteckt || g.vorher.sichtbar < 44) probleme.push(`g) die Kopfzeile ist nicht bedienbar (${g.vorher.sichtbar} px)`);
      if (g.vorher.chips.length !== 2 || g.vorher.chips.some(c => /Gastverein/.test(c))) probleme.push("g) Schnellwahl falsch: " + g.vorher.chips.join(", "));
      if (!/2/.test(g.vorher.zahl)) probleme.push(`g) Zahl der freien Vereine fehlt („${g.vorher.zahl}“)`);
      if (!g.nachher) probleme.push("g) nach dem Neuzeichnen ist die Schnellwahl wieder zu");
    }
    if (ge.length) probleme.push("Konsole (g): " + ge.slice(0, 2).join(" | "));
    zeilen.push(`g) Gegner-DB: ${g.vorher.offen ? "offen" : "zu"} (${g.vorher.zahl.trim()}), Chips ${g.vorher.chips.join(", ")}, nach Neuzeichnen ${g.nachher ? "offen" : "zu"}`);
  }
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v617 Auftakt: Wappen fliegt ein, kein Umzugs-Hinweis mehr; Gegner-DB im Festival eingeklappt", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
