/* v729 · „Meine Angaben“ zeigt nur die eigenen Angaben – auch mit Trainerrechten.
   PO 03.10. (Bildschirmfoto): Ein Vater, dessen Konto Trainerrechte hat, sah unter „Meine Angaben“ Name,
   Handy und Geburtstag eines anderen Vaters. Das Trainerteam darf alle Zeilen von eltern_angaben lesen;
   die Abfrage hatte keinen Filter und nahm die erste Zeile.
   a) Das Fenster füllt die eigenen Angaben, nicht die fremden, die die Datenbank zuerst liefert
   b) Jede Abfrage an eltern_angaben trägt user_id=eq.<eigene Kennung> */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const UID = "u-eigen";
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: UID, exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const FREMD = { vorname: "Fremd", nachname: "Andere", handy: "0000 111", geburtstag: "1980-01-01" };
  const EIGEN = { vorname: "Eigen", nachname: "Selbst", handy: "0000 222", geburtstag: "1981-02-02" };
  const urls = [];
  const basis = h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "trainer" }], dsgvo_consent: [{ version: "x" }],
    eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
    termine: [], rueckmeldungen: [], team_config: [{ spenden_link: "" }],
    // wie die Datenbank mit Trainerrechten: ohne Filter alle Zeilen, die fremde zuerst
    eltern_angaben: u => { urls.push(String(u)); return /user_id=eq\.u-eigen/.test(String(u)) ? [EIGEN] : [FREMD, EIGEN]; },
    rpc: { eltern_news: {}, training_rueckblick: [], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false } });
  const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 390, hoehe: 844, supabase: basis });
  await s.page.evaluate(tk => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: tk, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(3500);
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    await elternAngabenOpen(); await w(300);
    const v = id => (document.getElementById(id) || {}).value;
    return { vor: v("ang-vor"), nach: v("ang-nach"), handy: v("ang-handy") };
  }).catch(e => ({ fehler: String(e) }));
  const f = s.fehler(); await s.schliessen();
  const titel = "v729 „Meine Angaben“ nur die eigenen, auch mit Trainerrechten";
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  if (r.fehler || r.vor !== "Eigen" || r.nach !== "Selbst" || r.handy !== "0000 222") probleme.push("a) Fenster zeigt " + JSON.stringify(r));
  else zeilen.push("a) Fenster zeigt die eigenen Angaben");
  const ohne = urls.filter(u => !/user_id=eq\.u-eigen/.test(u));
  if (!urls.length || ohne.length) probleme.push(`b) ${ohne.length} von ${urls.length} Abfragen ohne Filter auf das eigene Konto`);
  else zeilen.push(`b) alle ${urls.length} Abfragen mit user_id=eq.<eigene Kennung>`);
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
