/* v716 · Beitrag bezahlt oder offen – direkt auf der Kachel „Mannschaftskasse“ der Eltern.
   PO 02.10.: „… unter der Mannschaftskasse auch einen Hinweis im jeweiligen Elternzugang, ob mein
   Beitrag schon bezahlt ist oder ob er noch offen ist. Das müsste auf Seiten der Administration der
   Mannschaftskasse abgehakt sein.“ Grundlage: aktive Umlage (kasse_summary.umlagen) und das Häkchen
   der Kasse (kasse_zahlung, nur eigene Kinder).
   a) abgehakt → „Saisonbeitrag: ✓ bezahlt“ auf der Kachel
   b) nicht abgehakt → „Saisonbeitrag: ○ 40 € offen“
   c) keine aktive Umlage → keine Zeile */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  async function lauf(umlagen, zahlungen) {
    const basis = h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
      termine: [], rueckmeldungen: [], kasse_zahlung: zahlungen, team_config: [{ spenden_link: "" }],
      rpc: { kasse_summary: { saldo: 10, umlagen, sammel: [] }, is_kasse: false } });
    const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 390, hoehe: 844, supabase: basis });
    await s.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
    await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(4000);
    const t = await s.page.evaluate(() => { const e = document.getElementById("mk-beitrag-stand"); return e ? e.textContent.replace(/\s+/g, " ").trim() : null; });
    const f = s.fehler(); await s.schliessen();
    return { t, f };
  }
  const U = [{ id: 7, titel: "Saisonbeitrag", betrag: 40, faellig: null, paypal_link: null }];
  const a = await lauf(U, [{ umlage_id: 7, spieler_id: 1, bezahlt_am: "2026-09-28" }]);
  const b = await lauf(U, []);
  const c = await lauf([], []);
  const f = [].concat(a.f, b.f, c.f);
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  if (a.t !== "Saisonbeitrag: ✓ bezahlt") probleme.push(`a) „${a.t}“`); else zeilen.push(`a) „${a.t}“`);
  if (b.t !== "Saisonbeitrag: ○ 40 € offen") probleme.push(`b) „${b.t}“`); else zeilen.push(`b) „${b.t}“`);
  if (c.t !== "") probleme.push(`c) ohne Umlage: „${c.t}“`); else zeilen.push("c) ohne Umlage keine Zeile");
  return h.ergebnis("v716 Eltern: Beitrag bezahlt oder offen auf der Kassen-Kachel", !probleme.length, zeilen.concat(probleme));
};
