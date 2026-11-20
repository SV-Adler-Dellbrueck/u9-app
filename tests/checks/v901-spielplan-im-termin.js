/* v901 · Spielplan des Heimturniers im Termin der Eltern-App (PO 20.11.: „Beim Heimspiel sollte es noch einen
   Schieberegler geben, der den Spielplan direkt in den Termin in der Eltern-App integriert, damit die Eltern diesen
   auch direkt sehen und anklicken können.").

   a) Planer: Schalter „Spielplan im Termin der Eltern-App“ (role="switch", ≥ 44 px) steht aus; ein Tipp speichert
      config.imTermin = true, danach steht er auf „an“.
   b) Eltern, Schalter aus: im Termin-Fenster des Heimspiels kein Spielplan-Block.
   c) Eltern, Schalter an: Block „Spielplan“ mit den Spielen beider Adler-Teams (Uhrzeit, Feld, Gegner), Zeiten
      nach verschobenem Beginn; Knopf „Ganzen Spielplan ansehen“ führt auf ?turnier=<slug>, mindestens 44 px hoch;
      keine Kindernamen im Block.
   d) Ein Auswärtsspiel am selben Tag zeigt keinen Block. */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const heute = h.heute(), tag = h.tagePlus(1);

  // ── a) Planer ──────────────────────────────────────────────────────────────
  const s = await h.starten({ hoehe: 1400, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [], nominierungen: [],
    heimturnier: (u, req) => req.method() === "PATCH" ? { status: 204, body: "" } : [] }) });
  const a = await s.page.evaluate(async ({ heute }) => {
    if (typeof fstImTerminSetzen !== "function" || typeof htTerminBlockHtml !== "function") return { fehlt: "fstImTerminSetzen/htTerminBlockHtml" };
    await loadKader(); document.getElementById("pin-gate")?.remove();
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const teams = fstTeamsBauen([{ name: "SV Adler Dellbrück", kinder: 10, teams: 2 }, { name: "SC Wahn Grengel", kinder: 10, teams: 2 }]);
    const cfg = { art: "festival", format: "festival", ergebnisse: false, start: "10:15", dauer: 60, spieldauer: 8, wechsel: 5, felder: fstFelderKuerzen(FST_STANDARD_FELDER, teams), vereine: [], infos: HT_INFOS_VORLAGE };
    _HT = { id: 7, slug: "kinderfestival-x", name: "Kinderfestival", datum: heute, edit_code: "abc123", config: cfg, teams: teams.map(t => t.name), plan: fstPlanBauen(teams, cfg) };
    const body = document.createElement("div"); body.id = "ht-body"; body.style.width = "360px"; document.body.appendChild(body);
    fstRender(); await warte(300);
    const sch = () => body.querySelector('#fst-termin-schalter[role="switch"]');
    const vor = sch() ? sch().getAttribute("aria-checked") : null;
    const hoch = sch() ? Math.round(sch().getBoundingClientRect().height) : 0;
    if (sch()) sch().click(); await warte(400);
    return { vor, hoch, nach: sch() ? sch().getAttribute("aria-checked") : null, an: !!_HT.config.imTermin };
  }, { heute });
  const gesendetA = s.gesendet.slice(); const fehlerA = s.fehler(); await s.schliessen();
  if (a.fehlt) return h.ergebnis("v901 Spielplan im Termin", false, [a.fehlt + " fehlt"]);
  if (a.vor !== "false") probleme.push(`a) Schalter steht zu Beginn auf ${a.vor}`);
  if (a.hoch < 44) probleme.push(`a) Schalter nur ${a.hoch} px hoch`);
  if (a.nach !== "true" || !a.an) probleme.push(`a) nach dem Tipp ${a.nach}`);
  if (!gesendetA.some(g => g.methode === "PATCH" && g.body && g.body.config && g.body.config.imTermin === true)) probleme.push("a) Einschalten nicht gespeichert");
  zeilen.push(`a) Schalter ${a.vor} → ${a.nach}, ${a.hoch} px`);
  if (fehlerA.length) probleme.push("a) Konsole: " + fehlerA[0]);

  // ── b)–d) Eltern ───────────────────────────────────────────────────────────
  const teams = ["SV Adler Dellbrück 1", "SV Adler Dellbrück 2", "SC Wahn Grengel 1", "SC Wahn Grengel 2"];
  const plan = [
    { runde: 1, zeit: "10:15", feld: 1, a: 0, b: 2, form: "f4" }, { runde: 1, zeit: "10:15", feld: 2, a: 1, b: 3, form: "funino" },
    { runde: 2, zeit: "10:28", feld: 1, a: 0, b: 3, form: "f4" }, { runde: 2, zeit: "10:28", feld: 2, a: 1, b: 2, form: "funino" }];
  const zeile = { slug: "kinderfestival-x", name: "Kinderfestival", datum: tag, teams, plan,
    config: { art: "festival", format: "festival", start: "10:15", startIst: "10:20", spieldauer: 8, felder: [{ form: "f4" }, { form: "funino" }], imTermin: false } };
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const e = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 390, hoehe: 900,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7 } }],
      termine: [{ id: 6, datum: tag, typ: "spiel", uhrzeit: "10:00", gegner: "SC Wahn Grengel", heim: true },
                { id: 7, datum: tag, typ: "spiel", uhrzeit: "15:00", gegner: "Anderer FC", heim: false, ort: "Auswärts" }],
      rueckmeldungen: [], heimturnier: () => [zeile] }) });
  await e.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await e.page.reload({ waitUntil: "networkidle" });
  await e.page.waitForFunction(() => typeof terminDetailOpen === "function" && typeof htTerminBlockHtml === "function" && (window.ELTERN_TERMINE || typeof ELTERN_TERMINE !== "undefined") && ELTERN_TERMINE.length >= 2, null, { timeout: 20000 }).catch(() => {});
  const offen = (id) => e.page.evaluate(async (id) => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    document.getElementById("td-modal")?.remove();
    await terminDetailOpen(id);
    for (let i = 0; i < 40; i++) { if (document.querySelector("#td-spielplan .td-spielplan")) break; await warte(50); }
    await warte(150);
    const b = document.querySelector("#td-spielplan .td-spielplan");
    if (!b) return { block: false };
    const a = b.querySelector("a.btn");
    return { block: true, text: b.textContent.replace(/\s+/g, " "), zeilen: b.querySelectorAll(".td-sp-zeile").length, teams: b.querySelectorAll(".td-sp-team").length,
      href: a ? a.getAttribute("href") : "", hoch: a ? Math.round(a.getBoundingClientRect().height) : 0 };
  }, id);
  const aus = await offen(6);
  zeile.config.imTermin = true;
  const an = await offen(6);
  const auswaerts = await offen(7);
  const fehlerE = e.fehler(); await e.schliessen();
  if (aus.block) probleme.push("b) Block erscheint, obwohl der Schalter aus ist");
  if (!an.block) probleme.push("c) Schalter an, aber kein Spielplan im Termin");
  else {
    /* v918 (Charles 20.11.): keine Begegnungen mehr im Termin – nur der Knopf, mit &von=app für den Rückweg. */
    if (an.teams !== 0 || an.zeilen !== 0 || /gegen /.test(an.text)) probleme.push(`c) Begegnungen im Termin: ${an.teams} Teams, ${an.zeilen} Zeilen`);
    if (!/\?turnier=kinderfestival-x(&v=\d+)?&von=app$/.test(an.href)) probleme.push(`c) Knopf führt auf „${an.href}“`);
    if (an.hoch < 44) probleme.push(`c) Knopf nur ${an.hoch} px hoch`);
    if (/Kind A/.test(an.text)) probleme.push("c) Kindername im Block");
    zeilen.push(`c) an: ${an.teams} Teams, ${an.zeilen} Spiele, Knopf ${an.href} (${an.hoch} px)`);
  }
  if (auswaerts.block) probleme.push("d) Auswärtsspiel zeigt den Spielplan");
  zeilen.push(`b) aus: Block ${aus.block} · d) auswärts: Block ${auswaerts.block}`);
  const rot = fehlerE.filter(f => !/Failed to load resource|net::ERR/.test(f));
  if (rot.length) probleme.push("Konsole: " + rot.slice(0, 2).join(" | "));
  return h.ergebnis("v901 Spielplan im Termin der Eltern-App", !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
