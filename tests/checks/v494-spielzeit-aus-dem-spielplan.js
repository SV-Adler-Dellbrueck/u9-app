/* v494 – PO: „Der Timer hier steht auf 10 Minuten, in der Festival-Planung sind aber 8 Minuten
   hinterlegt." Die Match-Uhr nahm die Spielzeit aus dem Termin (sonst 10), der Spielplan wurde
   nicht gefragt. Wie bei Feld, Spielform und Runde (v493) ist der Plan die Quelle. Geprueft:
   die Uhr uebernimmt die Spielzeit des Plans und spielt ohne Halbzeit, die Einstellung zeigt
   die Quelle statt eines Eingabefeldes, Aendern greift nicht – und ohne Spielplan bleibt der
   Termin massgeblich. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const heute = h.heute();
  let htRow = null;
  const s = await h.starten({ supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), nominierungen: [],
    termine: [{ id: 1, datum: heute, typ: "turnier", heim: true, uhrzeit: "10:15", titel: "Kinderfestival", spieldauer_min: 10, halbzeiten: 2, trainer_status: {} }],
    matchday: [], heimturnier: (u, req) => req.method() === "GET" ? (htRow ? [htRow] : []) : { status: 204, body: "" }
  }), hoehe: 1400 });
  const bau = await s.page.evaluate(({ heute }) => {
    const teams = fstTeamsBauen([{ name: "SV Adler Dellbrück", kinder: 14, teams: 2 }, { name: "SC Wahn Grengel", kinder: 10, teams: 2 }]);
    const cfg = { art: "festival", format: "festival", start: "10:15", dauer: 60, spieldauer: 8, wechsel: 5, felder: fstFelderKuerzen(FST_STANDARD_FELDER, teams), vereine: [] };
    return { id: 9, slug: "x", name: "Kinderfestival", datum: heute, config: cfg, teams: teams.map(t => t.name), plan: fstPlanBauen(teams, cfg) };
  }, { heute });
  htRow = bau;
  const mit = await s.page.evaluate(async ({ heute }) => {
    if (typeof mcLoad !== "function") return { fehlt: "mcLoad" };
    await loadKader(); document.getElementById("pin-gate")?.remove();
    const app = document.getElementById("main-app"); if (app) app.style.display = "block";
    window.spieltagRawDate = () => heute; window.spieltagKey = () => heute;
    let box = document.getElementById("mc-panel");
    if (!box) { box = document.createElement("div"); box.id = "mc-panel"; document.body.appendChild(box); }
    await mcLoad(); await new Promise(r => setTimeout(r, 150));
    const txt = box.textContent.replace(/\s+/g, " ");
    const vorher = mcSpieldauer;
    mcSetDauer(12); await new Promise(r => setTimeout(r, 150));
    return { dauer: mcSpieldauer, hz: mcHalbzeiten, txt, feld: !!document.getElementById("mc-dauer"),
      knopf: /Im Spielplan ändern/.test(txt), nachAendern: mcSpieldauer, vorher };
  }, { heute });
  if (mit.fehlt) { await s.schliessen(); return h.ergebnis("Spielzeit aus dem Spielplan", false, [`${mit.fehlt} fehlt`]); }
  const gesendetMit = s.gesendet.filter(g => g.methode !== "GET" && /termine|matchday/.test(g.pfad)).length;
  htRow = null;
  const ohne = await s.page.evaluate(async () => {
    await mcLoad(); await new Promise(r => setTimeout(r, 150));
    const box = document.getElementById("mc-panel");
    return { dauer: mcSpieldauer, hz: mcHalbzeiten, feld: !!document.getElementById("mc-dauer"), txt: box.textContent.replace(/\s+/g, " ") };
  });
  const fehler = s.fehler(); await s.schliessen();
  if (mit.dauer !== 8) probleme.push(`Match-Uhr auf ${mit.dauer} Min. statt der 8 aus dem Spielplan`);
  if (mit.hz !== 1) probleme.push(`${mit.hz} Halbzeiten – im Festival wird eine Spielzeit gespielt`);
  if (!/Spielzeit 8 Min\. · aus dem Spielplan/.test(mit.txt)) probleme.push(`Die Quelle steht nicht dabei: „${mit.txt.slice(0, 90)}“`);
  if (mit.feld) probleme.push("Das Eingabefeld für die Spielzeit steht noch da, obwohl der Plan führt");
  if (!mit.knopf) probleme.push("Kein Weg in den Spielplan");
  if (mit.nachAendern !== 8) probleme.push(`Ändern hat gegriffen: ${mit.nachAendern} Min.`);
  if (gesendetMit) probleme.push(`${gesendetMit} Schreibzugriffe, obwohl die Spielzeit aus dem Plan kommt`);
  if (ohne.dauer !== 10 || ohne.hz !== 2) probleme.push(`ohne Spielplan ${ohne.dauer} Min./${ohne.hz} HZ statt 10/2 aus dem Termin`);
  if (!ohne.feld) probleme.push("ohne Spielplan fehlt das Eingabefeld");
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Mit Spielplan: ${mit.dauer} Min., ${mit.hz} Spielzeit · „aus dem Spielplan“ ${!mit.feld} · Ändern wirkungslos ${mit.nachAendern === 8}`);
  zeilen.push(`Ohne Spielplan: ${ohne.dauer} Min., ${ohne.hz} Halbzeiten aus dem Termin, Feld ${ohne.feld}`);
  return h.ergebnis("Match-Uhr nimmt die Spielzeit aus dem Spielplan", !probleme.length, zeilen.concat(probleme));
};
