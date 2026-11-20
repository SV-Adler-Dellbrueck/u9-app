/* v918 · Charles 20.11. (Bild): Begegnungen im Termin der Eltern-App raus, nur der Link; kein Weg zurück aus der
   Turnierseite; „wir stellen 2 oder 3 Teams – es muss eine Auswahlmöglichkeit geben, welches Team ich verfolge“.
   a) Termin-Block: keine Begegnungen mehr, ein Knopf „Spielplan ansehen“ mit &von=app.
   b) Turnierseite mit &von=app: Leiste „← Zurück zur Adler-App“ (≥ 44 px); ohne den Zusatz keine Leiste.
   c) Verein gewählt, der mehrere Teams stellt: zweite Reihe „Welches Team verfolgst du?“ mit „Alle Teams“ und je
      Team einer Taste (aria-pressed, ✓). Team 2 gewählt: „★ euer Spiel“ nur an dessen Spielen, die Karte nennt
      Team 2, das Handy merkt die Wahl; Vereinswechsel hebt sie auf.
   SCHIRM=<pfad> legt ein Bild der Seite nach der Teamwahl ab. */
"use strict";
module.exports = async function (h) {
  const titel = "v918 Festival: Termin nur mit Link, Zurück zur App, Teamwahl";
  const probleme = [], zeilen = [];
  const teams = ["Adler Dellbrück 1", "Adler Dellbrück 2", "Rath Heumar U9 II 1", "Rath Heumar U9 II 2", "SW Köln U9 I 1", "SW Köln U9 I 2"];
  const zeiten = ["10:15", "10:28", "10:41"], paare = [[[0, 2], [1, 4], [3, 5]], [[0, 4], [1, 3], [2, 5]], [[0, 5], [1, 2], [3, 4]]], formen = ["f4", "funino", "funino"];
  const plan = []; paare.forEach((r, ri) => r.forEach(([a, b], fi) => plan.push({ runde: ri + 1, zeit: zeiten[ri], feld: fi + 1, a, b, form: formen[fi] })));
  const row = { slug: "fest-x", name: "Kinderfestival", datum: "2026-11-21", ort: "Platz", teams, plan,
    config: { art: "festival", format: "festival", ergebnisse: false, imTermin: true, start: "10:15", startIst: "10:15", dauer: 40, spieldauer: 8, wechsel: 5,
      felder: [{ form: "f4" }, { form: "funino" }, { form: "funino" }],
      vereine: [{ name: "SV Adler Dellbrück", teams: 2 }, { name: "Rath Heumar U9 II", teams: 2 }, { name: "SC SW Köln U9 I", teams: 2 }],
      wappen: { "SV Adler Dellbrück": "logo.png" } } };
  const starte = start => h.starten({ start, angemeldet: false, warten: 2500, jetzt: "2026-11-21T09:31:00", breite: 390, hoehe: 1400, supabase: h.supabaseAttrappe({ heimturnier: () => [row] }) });
  // a) und b) ohne Zusatz
  let s = await starte("/eltern/index.html?turnier=fest-x");
  const ohne = await s.page.evaluate(() => !!document.getElementById("htp-zurueck"));
  const block = await s.page.evaluate(r => typeof htTerminBlockHtml === "function" ? htTerminBlockHtml(r) : null, row);
  await s.schliessen();
  if (block == null) probleme.push("a) htTerminBlockHtml fehlt");
  else if (/td-sp-zeile|gegen /.test(block) || !/Spielplan ansehen/.test(block) || !/von=app/.test(block)) probleme.push(`a) Termin-Block: ${block.replace(/\s+/g, " ").slice(0, 200)}`);
  s = await starte("/eltern/index.html?turnier=fest-x&v=2&von=app");
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)), $ = q => document.querySelector(q), $$ = q => [...document.querySelectorAll(q)];
    const z = $("#htp-zurueck button"); const out = { zurueck: z ? { text: z.textContent.trim(), hoch: Math.round(z.getBoundingClientRect().height) } : null };
    out.teamVor = $$("#ht-public .fst-teamwahl .htp-chip").length;
    $$("#ht-public .fst-filter:not(.fst-teamwahl) .htp-chip")[0].click(); await w(300);
    const tc = $$("#ht-public .fst-teamwahl .htp-chip");
    out.teamChips = tc.map(c => c.textContent.trim() + ":" + c.getAttribute("aria-pressed"));
    out.sterneAlle = $$("#ht-public .fst-zeile.mein .fst-stern").length;
    if (tc[2]) { tc[2].click(); await w(300); }
    out.nachTeam = { chips: $$("#ht-public .fst-teamwahl .htp-chip").map(c => c.textContent.trim() + ":" + c.getAttribute("aria-pressed")),
      sterne: $$("#ht-public .fst-zeile.mein").map(z => z.textContent.replace(/\s+/g, " ")), mein: ($("#ht-public .fst-mein") || {}).textContent || "" };
    try { out.gemerkt = localStorage.getItem("adler_festival_team_fest-x"); } catch (e) {}
    window.scrollTo(0, 0);
    return out;
  });
  if (process.env.SCHIRM) await s.page.screenshot({ path: process.env.SCHIRM, clip: { x: 0, y: 0, width: 390, height: 900 } });
  const r2 = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)), $$ = q => [...document.querySelectorAll(q)];
    $$("#ht-public .fst-filter:not(.fst-teamwahl) .htp-chip")[1].click(); await w(300);
    let g = null; try { g = localStorage.getItem("adler_festival_team_fest-x"); } catch (e) {}
    return { gemerkt: g };
  });
  const fehler = s.fehler(); await s.schliessen();
  if (ohne) probleme.push("b) Leiste erscheint auch ohne &von=app");
  if (!r.zurueck || !/Zurück zur Adler-App/.test(r.zurueck.text) || r.zurueck.hoch < 44) probleme.push(`b) Leiste: ${JSON.stringify(r.zurueck)}`);
  if (r.teamVor !== 0) probleme.push("c) Teamwahl schon vor der Vereinswahl");
  if (r.teamChips.join(" ") !== "Alle Teams✓:true Team 1:false Team 2:false" || r.sterneAlle !== 6) probleme.push(`c) Teamreihe: ${r.teamChips.join(" ")}, Sterne ${r.sterneAlle}`);
  const nurTeam2 = r.nachTeam.sterne.length === 3 && r.nachTeam.sterne.every(t => /Adler Dellbrück 2/.test(t));
  if (!nurTeam2 || !/Adler Dellbrück 2 gegen/.test(r.nachTeam.mein) || r.gemerkt !== "1" || !/Team 2✓:true/.test(r.nachTeam.chips.join(" "))) probleme.push(`c) Team 2: ${JSON.stringify(r.nachTeam)}, gemerkt ${r.gemerkt}`);
  if (r2.gemerkt !== null) probleme.push(`c) Vereinswechsel hebt die Teamwahl nicht auf (${r2.gemerkt})`);
  zeilen.push(`a) Termin nur mit Link · b) „${r.zurueck && r.zurueck.text}“ ${r.zurueck && r.zurueck.hoch} px, ohne Zusatz keine · c) ${r.teamChips.length} Tasten, Team 2 → ${r.nachTeam.sterne.length} Spiele mit ★`);
  if (fehler.length) probleme.push("Konsole: " + fehler.slice(0, 2).join(" | "));
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
