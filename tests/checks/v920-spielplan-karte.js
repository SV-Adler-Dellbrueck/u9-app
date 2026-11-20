/* v920 · Charles 20.11. (Bild der Eltern-Startseite): „Ist der Link zum Spielplan nicht im Termin, weil das Kind nicht
   zugesagt hat?“ – Nein: er stand nur im Termin-Fenster, nicht in der Karte „Nächster Termin“. Und auf der Turnierseite
   klang „Alles lesen – und gern an eure Eltern weiterleiten“ nach den Eltern der Trainer.
   a) Karte „Nächster Termin“ (Heimspiel, Spielplan freigegeben): Knopf „Spielplan ansehen“ mit &von=app, keine
      Begegnungen – unabhängig von der Rückmeldung (hier: Absage).
   b) Ohne Freigabe (imTermin aus) kein Block in der Karte.
   c) Turnierseite: der Knopf heißt „Alles lesen: unsere Bitte an alle am Spielfeldrand“, „eure Eltern“ steht nirgends. */
"use strict";
const fs = require("fs"), path = require("path");
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
module.exports = async function (h) {
  const titel = "v920 Spielplan-Knopf in der Karte „Nächster Termin“, Satz am Spielfeldrand";
  const probleme = [], zeilen = [];
  const tag = h.tagePlus(1);
  const teams = ["SV Adler Dellbrück 1", "SV Adler Dellbrück 2", "SC Wahn Grengel 1", "SC Wahn Grengel 2"];
  const plan = [{ runde: 1, zeit: "10:15", feld: 1, a: 0, b: 2, form: "f4" }, { runde: 1, zeit: "10:15", feld: 2, a: 1, b: 3, form: "funino" }];
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const lauf = async (imTermin) => {
    const zeile = { slug: "kinderfestival-x", name: "Kinderfestival", datum: tag, teams, plan,
      config: { art: "festival", format: "festival", start: "10:15", spieldauer: 8, felder: [{ form: "f4" }, { form: "funino" }], imTermin } };
    const e = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 390, hoehe: 1400,
      supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
        eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7 } }],
        termine: [{ id: 6, datum: tag, typ: "turnier", uhrzeit: "10:15", titel: "Kinderfestival", heim: true }],
        rueckmeldungen: [{ termin_id: 6, spieler_id: 1, status: "abgesagt", grund: "Geburtstag" }], heimturnier: () => [zeile] }) });
    await e.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
    await e.page.reload({ waitUntil: "networkidle" });
    const r = await e.page.evaluate(async () => {
      const w = ms => new Promise(x => setTimeout(x, ms));
      for (let i = 0; i < 40 && !document.getElementById("termin-card"); i++) await w(150);
      for (let i = 0; i < 30 && !document.querySelector("#ht-spielplan-karte .td-spielplan"); i++) await w(100);
      const k = document.getElementById("ht-spielplan-karte"), a = k && k.querySelector("a.btn");
      return { karte: !!document.getElementById("termin-card"), slot: !!k, text: k ? k.textContent.replace(/\s+/g, " ").trim() : "", href: a ? a.getAttribute("href") : "", hoch: a ? Math.round(a.getBoundingClientRect().height) : 0 };
    });
    const fe = e.fehler().filter(f => !/Failed to load resource|net::ERR/.test(f)); await e.schliessen();
    return { r, fe };
  };
  const an = await lauf(true), aus = await lauf(false);
  if (!an.r.karte) probleme.push("a) Karte „Nächster Termin“ nicht gerendert");
  else {
    if (!/Spielplan ansehen/.test(an.r.text) || !/von=app/.test(an.r.href) || an.r.hoch < 44) probleme.push(`a) Knopf fehlt oder falsch: „${an.r.text.slice(0, 120)}“ ${an.r.href} (${an.r.hoch} px)`);
    if (/gegen /.test(an.r.text)) probleme.push("a) Begegnungen in der Karte");
  }
  if (aus.r.text) probleme.push(`b) ohne Freigabe trotzdem: „${aus.r.text.slice(0, 80)}“`);
  const tp = fs.readFileSync(path.join(h.REPO, "md-turnierplan.js"), "utf8");
  if (!/>Alles lesen: unsere Bitte an alle am Spielfeldrand<\/button>/.test(tp) || /eure Eltern/.test(tp)) probleme.push("c) Satz am Spielfeldrand nicht ersetzt");
  zeilen.push(`a) Absage, Karte zeigt „Spielplan ansehen“ (${an.r.hoch} px, &von=app) · b) ohne Freigabe kein Block · c) „Alles lesen: unsere Bitte an alle am Spielfeldrand“`);
  const fe = an.fe.concat(aus.fe); if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
