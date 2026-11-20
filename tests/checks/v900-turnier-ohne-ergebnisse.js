/* v900 · Heimturnier ohne Ergebnisse als Standard.
   PO 20.11.: „Beim Anlegen des Turniers sollte immer eingestellt sein, dass wir keine Ergebnisse zählen.
   Durch einen Klick oder Schieberegler soll man das verändern können, so dass auch Ergebnisse
   eingetragen werden können."

   a) Ein neu angelegtes Turnier trägt config.ergebnisse = false.
   b) Planer, Schalter aus: role="switch" mit aria-checked="false", keine Ergebnis-Tasten, kein
      Ergebnis-Link, fstErgebnis öffnet kein Eingabeblatt.
   c) Ein Tipp auf den Schalter speichert ergebnisse = true; danach stehen Ergebnis-Tasten und der
      Ergebnis-Link da, der Schalter steht auf „an“ und ist mindestens 44 px hoch.
   d) Spielplan-Link, Schalter aus, selbst mit Schreib-Code und eingetragenem 2:1: kein Stand, keine
      Eingabetaste, unten „Wir zählen keine Ergebnisse“; htPubEdit öffnet nichts.
   e) Ticker-Rechnung (fstAdlerSpiele) liefert bei „aus“ keinen Stand.
   f) Monitor, Schalter aus: „gegen“ statt eines Stands.
   g) Turniere von vor v900 (ohne Schlüssel) behalten Ergebnisse. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const heute = h.heute();
  const s = await h.starten({ hoehe: 1400, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [], nominierungen: [],
    heimturnier: (u, req) => req.method() === "PATCH" ? { status: 204, body: "" } : req.method() === "POST" ? [{ id: 9 }] : [] }) });
  const r = await s.page.evaluate(async ({ heute }) => {
    if (typeof htErgebnisseAn !== "function" || typeof fstErgebnisseSetzen !== "function") return { fehlt: "htErgebnisseAn/fstErgebnisseSetzen" };
    await loadKader(); document.getElementById("pin-gate")?.remove();
    const m = document.getElementById("main-app"); if (m) m.style.display = "block";
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const aus = { a: {} };

    // a) Anlegen
    const name = document.createElement("input"); name.id = "ht-name"; name.value = "Herbstfestival"; document.body.appendChild(name);
    const body = document.createElement("div"); body.id = "ht-body"; body.style.width = "360px"; document.body.appendChild(body);
    await htNeu(); await warte(300);

    // b) Planer, Schalter aus
    const teams = fstTeamsBauen([{ name: "SV Adler Dellbrück", kinder: 14, teams: 2 }, { name: "SC Wahn Grengel", kinder: 10, teams: 2 }, { name: "SV Rath-Heumar", kinder: 10, teams: 2 }]);
    const cfg = { art: "festival", format: "festival", ergebnisse: false, start: "10:15", dauer: 60, spieldauer: 8, wechsel: 5, felder: fstFelderKuerzen(FST_STANDARD_FELDER, teams), vereine: [], infos: HT_INFOS_VORLAGE };
    const plan = fstPlanBauen(teams, cfg);
    _HT = { id: 7, name: "Kinderfestival", datum: heute, edit_code: "abc123", config: cfg, teams: teams.map(t => t.name), plan };
    fstRender(); await warte(300);
    const sch = () => body.querySelector('#fst-erg-schalter[role="switch"]');
    const ergTasten = () => [...body.querySelectorAll("button")].filter(b => /Ergebnis eintragen/.test(b.getAttribute("aria-label") || "")).length;
    const ergLink = () => [...body.querySelectorAll("button")].some(b => /Ergebnis-Link/.test(b.textContent));
    aus.b = { schalter: !!sch(), checked: sch() && sch().getAttribute("aria-checked"), tasten: ergTasten(), link: ergLink() };
    fstErgebnis(0); await warte(100);
    aus.b.blatt = !!document.getElementById("fst-erg"); document.getElementById("fst-erg")?.remove();

    // c) einschalten
    sch().click(); await warte(400);
    aus.c = { checked: sch() && sch().getAttribute("aria-checked"), tasten: ergTasten(), link: ergLink(), hoch: sch() ? Math.round(sch().getBoundingClientRect().height) : 0, an: htErgebnisseAn(_HT) };

    // d) Spielplan-Link, aus, mit Code und 2:1
    const row = { ...JSON.parse(JSON.stringify(_HT)) }; row.config.ergebnisse = false; row.plan[0].ta = 2; row.plan[0].tb = 1;
    const wrap = document.createElement("div"); wrap.id = "ht-public"; document.body.appendChild(wrap);
    _htPub = { slug: "x", code: "abc123", wrap, row }; _fstPublicRender(wrap, row);
    aus.d = { stand: /2\s*:\s*1|–\s*:\s*–/.test(wrap.textContent), tasten: [...wrap.querySelectorAll("button")].filter(b => /Ergebnis eintragen/.test(b.getAttribute("aria-label") || "")).length,
      fuss: /Wir zählen keine Ergebnisse/.test(wrap.textContent), helferText: /Ergebnisse antippen/.test(wrap.textContent) };
    htPubEdit(0); await warte(100);
    aus.d.blatt = !!document.getElementById("htpub-sheet"); document.getElementById("htpub-sheet")?.remove();

    // e) Ticker
    const sp = fstAdlerSpiele(row); const alle = Object.values(sp).flat();
    aus.e = { spiele: alle.length, mitStand: alle.filter(x => x.tore != null || x.gegentore != null).length };

    // f) Monitor
    htPubMonitor(); await warte(200);
    const mon = document.getElementById("htpub-monitor");
    aus.f = { da: !!mon, gegen: mon ? mon.querySelectorAll(".htp-mon-tore").length && [...mon.querySelectorAll(".htp-mon-tore")].every(t => /gegen/.test(t.textContent) && !/\d/.test(t.textContent)) : false,
      hinweis: mon ? /Wir zählen keine Ergebnisse/.test(mon.textContent) : false, felder: mon ? mon.querySelectorAll(".htp-mon-tore").length : 0 };
    if (typeof htPubMonitorStop === "function") htPubMonitorStop();

    // g) Altbestand
    const alt = { config: { art: "festival" }, plan: [] }, liga = { config: { format: "liga", ergebnisse: false }, plan: [] };
    aus.g = { alt: htErgebnisseAn(alt), liga: htErgebnisseAn(liga) };
    return aus;
  }, { heute });
  const fehler = s.fehler(); const gesendet = s.gesendet.slice(); await s.schliessen();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt`); return h.ergebnis("Turnier ohne Ergebnisse", false, probleme); }

  const neu = gesendet.find(g => g.methode === "POST" && /heimturnier/.test(g.pfad || "") && g.body && g.body.config);
  if (!neu) probleme.push("a) kein Anlegen gesendet");
  else if (neu.body.config.ergebnisse !== false) probleme.push(`a) neues Turnier trägt ergebnisse = ${JSON.stringify(neu.body.config.ergebnisse)} statt false`);
  zeilen.push(`a) neu angelegt: ergebnisse = ${neu ? JSON.stringify(neu.body.config.ergebnisse) : "–"}`);

  if (!r.b.schalter || r.b.checked !== "false") probleme.push(`b) Schalter fehlt oder steht nicht auf aus (${r.b.checked})`);
  if (r.b.tasten) probleme.push(`b) ${r.b.tasten} Ergebnis-Tasten trotz „aus“`);
  if (r.b.link) probleme.push("b) Ergebnis-Link trotz „aus“");
  if (r.b.blatt) probleme.push("b) fstErgebnis öffnet trotz „aus“ ein Eingabeblatt");
  zeilen.push(`b) aus: Schalter ${r.b.checked}, ${r.b.tasten} Tasten, Link ${r.b.link}, Blatt ${r.b.blatt}`);

  const an = gesendet.filter(g => g.methode === "PATCH" && g.body && g.body.config && g.body.config.ergebnisse === true);
  if (!an.length) probleme.push("c) Einschalten nicht gespeichert");
  if (r.c.checked !== "true" || !r.c.an) probleme.push(`c) Schalter steht nach dem Tipp auf ${r.c.checked}`);
  if (!r.c.tasten) probleme.push("c) nach dem Einschalten keine Ergebnis-Tasten");
  if (!r.c.link) probleme.push("c) nach dem Einschalten kein Ergebnis-Link");
  if (r.c.hoch < 44) probleme.push(`c) Schalter nur ${r.c.hoch} px hoch`);
  zeilen.push(`c) an: ${r.c.tasten} Tasten, Link ${r.c.link}, Schalter ${r.c.hoch} px`);

  if (r.d.stand) probleme.push("d) Spielplan-Link zeigt trotz „aus“ einen Stand");
  if (r.d.tasten) probleme.push(`d) ${r.d.tasten} Eingabetasten trotz „aus“`);
  if (r.d.helferText) probleme.push("d) Hinweis „Ergebnisse antippen“ trotz „aus“");
  if (!r.d.fuss) probleme.push("d) Satz „Wir zählen keine Ergebnisse“ fehlt");
  if (r.d.blatt) probleme.push("d) htPubEdit öffnet trotz „aus“ ein Blatt");
  zeilen.push(`d) Link: Stand ${r.d.stand}, Tasten ${r.d.tasten}, Fußzeile ${r.d.fuss}`);

  if (!r.e.spiele || r.e.mitStand) probleme.push(`e) Ticker: ${r.e.mitStand} von ${r.e.spiele} Spielen mit Stand`);
  zeilen.push(`e) Ticker: ${r.e.spiele} Spiele, ${r.e.mitStand} mit Stand`);

  if (!r.f.da) probleme.push("f) Monitor öffnet nicht");
  else {
    if (r.f.felder && !r.f.gegen) probleme.push("f) Monitor zeigt einen Stand statt „gegen“");
    if (!r.f.hinweis) probleme.push("f) Monitor ohne „Wir zählen keine Ergebnisse“");
  }
  zeilen.push(`f) Monitor: ${r.f.felder} Paarungen, „gegen“ ${r.f.gegen}`);

  if (!r.g.alt) probleme.push("g) Festival ohne Schlüssel verliert die Ergebnisse");
  if (!r.g.liga) probleme.push("g) Liga verliert die Ergebnisse");
  zeilen.push(`g) Altbestand an ${r.g.alt}, Liga an ${r.g.liga}`);

  const rot = fehler.filter(f => !/Failed to load resource|net::ERR/.test(f));
  if (rot.length) probleme.push("Konsolenfehler: " + rot.slice(0, 3).join(" | "));
  return h.ergebnis("v900 Heimturnier ohne Ergebnisse als Standard", !probleme.length, probleme.length ? probleme : zeilen);
};
