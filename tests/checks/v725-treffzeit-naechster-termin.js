/* v725 · Die Karte „Nächster Termin“ in der Eltern-App zeigt die Treffzeit.
   PO 02.10. (Bildschirmfoto Kinderfestival 03.10.): „Auf der Startseite der Eltern-App ist nur noch
   die Anstoßzeit für das Auswärtsspiel angezeigt und nicht mehr der Treffpunkt.“ Ursache: seit v686
   steht jeder Termin nur einmal, der nächste also nicht mehr in der Liste darunter, die „Treffen …“
   zeigte – die Karte selbst kannte nur die Uhrzeit.
   a) Turnier mit Treffzeit: „Treffen 09:30 · Anstoß 10:15 Uhr“ auf der Karte
   b) Training ohne Treffzeit: nur „17:00 Uhr“, kein „Treffen“ */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const fall = async (termin) => {
    const basis = h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
      termine: [termin], rueckmeldungen: [], team_config: [{ spenden_link: "" }],
      rpc: { eltern_news: {}, training_rueckblick: [], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false } });
    const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 390, hoehe: 844, supabase: basis });
    await s.page.evaluate(tk => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: tk, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
    await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(4000);
    const text = await s.page.evaluate(() => { const k = document.getElementById("termin-card"); return k ? k.textContent.replace(/\s+/g, " ") : null; });
    const f = s.fehler(); await s.schliessen();
    return { text, f };
  };
  const a = await fall({ id: 91, datum: h.tagePlus(1), typ: "turnier", titel: "Testturnier", uhrzeit: "10:15:00", treffzeit: "09:30", heim: false, ort: "Teststraße 1, 50000 Köln" });
  const b = await fall({ id: 92, datum: h.tagePlus(1), typ: "training", titel: "Training", uhrzeit: "17:00:00" });
  const titel = "v725 Nächster Termin zeigt die Treffzeit";
  const f = [].concat(a.f, b.f); if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  if (!a.text) probleme.push("a) keine Karte „Nächster Termin“");
  else if (!/Treffen 09:30 · Anstoß 10:15 Uhr/.test(a.text)) probleme.push("a) " + a.text.slice(0, 200));
  else zeilen.push("a) Turnier: „Treffen 09:30 · Anstoß 10:15 Uhr“");
  if (!b.text) probleme.push("b) keine Karte „Nächster Termin“");
  else if (/Treffen/.test(b.text) || !/17:00 Uhr/.test(b.text)) probleme.push("b) " + b.text.slice(0, 200));
  else zeilen.push("b) Training ohne Treffzeit: „17:00 Uhr“");
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
