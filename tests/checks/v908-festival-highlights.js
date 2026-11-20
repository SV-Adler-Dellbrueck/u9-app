/* v908 · Festivalseite mit Highlights (Charles 20.11.: „gerne noch ein paar optische Highlights mehr“).
   Am echten ?turnier=… (schlank geladen, v899), 390 px, 10:31 Uhr, Runde 2 läuft:
   a) Kopf mit Spielfeld-Linien (.fst-kopf) und Wappenreihe.
   b) „Wer ist dein Verein?“ mit einer Wappen-Taste je Verein (≥ 44 px, aria-pressed); antippen merkt die Wahl
      (localStorage) und zeigt die Karte „Läuft gerade / Euer nächstes Spiel“ mit Uhrzeit, Feld und Gegner.
   c) Die Spiele des gewählten Vereins tragen „★ euer Spiel“ (nicht nur Farbe), die anderen nicht.
   d) Die laufende Runde trägt „LIVE“ und einen Laufbalken mit Restminuten.
   e) Mannschaften mit Wappen; erneut antippen hebt die Wahl auf.
   f) Kein Konsolenfehler (die schlanke Seite kennt kein jsq). */
"use strict";
module.exports = async function (h) {
  const titel = "v908 Festivalseite: Kopf, Mein Verein, eigene Spiele, LIVE-Runde";
  const probleme = [], zeilen = [];
  const teams = ["Adler Dellbrück 1", "Adler Dellbrück 2", "Rath Heumar U9 II 1", "Rath Heumar U9 II 2", "SW Köln U9 I 1", "SW Köln U9 I 2"];
  const zeiten = ["10:15", "10:28", "10:41"], paare = [[[0, 2], [1, 4], [3, 5]], [[0, 4], [1, 3], [2, 5]], [[0, 5], [1, 2], [3, 4]]], formen = ["f4", "funino", "funino"];
  const plan = []; paare.forEach((r, ri) => r.forEach(([a, b], fi) => plan.push({ runde: ri + 1, zeit: zeiten[ri], feld: fi + 1, a, b, form: formen[fi] })));
  const row = { slug: "fest-x", name: "Kinderfestival", datum: "2026-11-21", ort: "Platz", teams, plan,
    config: { art: "festival", format: "festival", ergebnisse: false, start: "10:15", startIst: "10:15", dauer: 40, spieldauer: 8, wechsel: 5,
      felder: [{ form: "f4" }, { form: "funino" }, { form: "funino" }],
      vereine: [{ name: "SV Adler Dellbrück", teams: 2 }, { name: "Rath Heumar U9 II", teams: 2 }, { name: "SC SW Köln U9 I", teams: 2 }],
      wappen: { "SV Adler Dellbrück": "logo.png" } } };
  const s = await h.starten({ start: "/eltern/index.html?turnier=fest-x", angemeldet: false, warten: 2500, jetzt: "2026-11-21T10:31:00", breite: 390, hoehe: 1400,
    supabase: h.supabaseAttrappe({ heimturnier: () => [row] }) });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)), $ = q => document.querySelector(q), $$ = q => [...document.querySelectorAll(q)];
    const out = { kopf: !!$("#ht-public .fst-kopf .htp-wappenreihe") };
    const chips = $$("#ht-public .fst-filter .htp-chip");
    out.chips = chips.length; out.chipHoch = chips.length ? Math.min(...chips.map(c => c.getBoundingClientRect().height)) : 0;
    out.vorWahl = { mein: !!$("#ht-public .fst-mein"), sterne: $$("#ht-public .fst-stern").length };
    if (!chips.length) return out;
    chips[0].click(); await w(300);
    let gemerkt = null; try { gemerkt = localStorage.getItem("adler_festival_fest-x"); } catch (e) {}
    const mein = $("#ht-public .fst-mein");
    out.nachWahl = { gemerkt, gedrueckt: $$("#ht-public .fst-filter .htp-chip")[0].getAttribute("aria-pressed"), mein: mein ? mein.textContent.replace(/\s+/g, " ").trim() : "",
      sterne: $$("#ht-public .fst-zeile.mein .fst-stern").length, sterneFremd: $$("#ht-public .fst-zeile:not(.mein) .fst-stern").length, teamsMein: $$("#ht-public .fst-team.mein").length,
      teamWappen: $$("#ht-public .fst-team .htp-wp").length };
    const live = $("#ht-public .fst-runde.live");
    out.live = live ? { text: live.textContent.replace(/\s+/g, " "), balken: !!live.querySelector(".htp-lauf i"), wert: (live.querySelector(".htp-lauf") || { getAttribute: () => "" }).getAttribute("aria-valuenow") } : null;
    $$("#ht-public .fst-filter .htp-chip")[0].click(); await w(300);
    out.aufgehoben = { mein: !!$("#ht-public .fst-mein"), sterne: $$("#ht-public .fst-stern").length };
    return out;
  });
  const fehler = s.fehler(); await s.schliessen();
  if (!r.kopf) probleme.push("a) Kopf ohne .fst-kopf mit Wappenreihe");
  if (r.chips !== 3 || r.chipHoch < 44) probleme.push(`b) ${r.chips} Vereinstasten, kleinste ${r.chipHoch} px`);
  if (r.vorWahl.mein || r.vorWahl.sterne) probleme.push("b) ohne Wahl schon Karte oder Sterne");
  if (!r.nachWahl) return h.ergebnis(titel, false, probleme.concat(["b) keine Vereinstasten"]));
  if (r.nachWahl.gemerkt !== "SV Adler Dellbrück" || r.nachWahl.gedrueckt !== "true") probleme.push(`b) Wahl nicht gemerkt (${r.nachWahl.gemerkt}, aria-pressed ${r.nachWahl.gedrueckt})`);
  if (!/Läuft gerade/.test(r.nachWahl.mein) || !/10:28 Uhr · Käfig/.test(r.nachWahl.mein) || !/gegen SW Köln U9 I 1/.test(r.nachWahl.mein)) probleme.push(`b) Karte: „${r.nachWahl.mein}“`);
  if (r.nachWahl.sterne !== 6 || r.nachWahl.sterneFremd) probleme.push(`c) ★ an ${r.nachWahl.sterne} eigenen (soll 6) und ${r.nachWahl.sterneFremd} fremden Spielen`);
  if (r.nachWahl.teamsMein !== 2 || r.nachWahl.teamWappen !== 6) probleme.push(`e) Mannschaften: ${r.nachWahl.teamsMein} markiert, ${r.nachWahl.teamWappen} mit Wappen`);
  if (!r.live || !/LIVE/.test(r.live.text) || !r.live.balken || !/noch 5 Min\./.test(r.live.text)) probleme.push(`d) laufende Runde: ${r.live ? r.live.text.slice(0, 120) : "fehlt"}`);
  if (r.aufgehoben.mein || r.aufgehoben.sterne) probleme.push("e) erneut antippen hebt die Wahl nicht auf");
  if (fehler.length) probleme.push("f) Konsole: " + fehler.slice(0, 2).join(" | "));
  zeilen.push(`a) Kopf · b) ${r.chips} Vereine, Karte „${r.nachWahl.mein.slice(0, 60)}“ · c) ${r.nachWahl.sterne} eigene Spiele mit ★ · d) LIVE, Balken ${r.live && r.live.wert}% · e) Wahl aufhebbar`);
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
