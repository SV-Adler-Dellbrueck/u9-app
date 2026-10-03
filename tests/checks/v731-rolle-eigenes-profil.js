/* v731 · authRole() liest die Rolle des eigenen Kontos – nicht die erste Zeile, die die Datenbank zeigt.
   PO 03.10. (Bildschirmfoto): „Sehe Löschen nicht im Trainerzugang.“ Trainer dürfen alle Profile lesen;
   profiles?select=role&limit=1 lieferte ein Elternprofil, die App hielt das Trainerkonto für „parent“.
   a) Mit Trainerkonto liefert authRole() „trainer“, obwohl ohne Filter zuerst „parent“ käme
   b) Jede Rollenabfrage trägt id=eq.<eigene Kennung> */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "trainer@example.org", sub: "t-eigen", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const urls = [];
  const basis = h.supabaseAttrappe({ kader: h.kaderZeilen(), dsgvo_consent: [{ version: "x" }],
    profiles: u => { const s = String(u); if (/select=role/.test(s)) urls.push(s); return /id=eq\.t-eigen/.test(s) ? [{ role: "trainer" }] : [{ role: "parent" }, { role: "trainer" }]; },
    eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
    termine: [], rueckmeldungen: [], team_config: [{ spenden_link: "" }],
    rpc: { eltern_news: {}, training_rueckblick: [], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false } });
  const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 390, hoehe: 844, supabase: basis });
  await s.page.evaluate(tk => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: tk, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(3000);
  const r = await s.page.evaluate(async () => ({ rolle: typeof authRole === "function" ? await authRole() : "fehlt" })).catch(e => ({ fehler: String(e) }));
  const f = s.fehler(); await s.schliessen();
  const titel = "v731 authRole() liest das eigene Profil";
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  if (r.fehler || r.rolle !== "trainer") probleme.push("a) authRole() = " + JSON.stringify(r));
  else zeilen.push("a) Trainerkonto wird als „trainer“ erkannt");
  const ohne = urls.filter(u => !/id=eq\.t-eigen/.test(u));
  if (!urls.length || ohne.length) probleme.push(`b) ${ohne.length} von ${urls.length} Rollenabfragen ohne eigene Kennung`);
  else zeilen.push(`b) alle ${urls.length} Rollenabfragen mit id=eq.<eigene Kennung>`);
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
