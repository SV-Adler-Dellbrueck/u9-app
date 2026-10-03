/* v731 · Kabine: „Heute war Spieltag“ zwei Stunden nach dem offiziellen Ende.
   PO 03.10. (Bildschirmfoto): „Heute ist Spieltag sollte 2 Stunden nach dem offiziellen Ende des Spiels
   auch umspringen auf ‚Heute war Spieltag‘. Vielleicht mit einem motivierenden Hinweis.“
   a) Ende vor mehr als 2 Stunden: „Heute war Spieltag! 🦅“ plus ein Satz aus KAB_NACH_SPIEL, keine Packliste
   b) Ende noch nicht + 2 Stunden: weiter „Heute ist Spieltag! 🔥“, kein Hinweis, Packliste da
   c) Ohne Endzeit bleibt es bei „Heute ist Spieltag!“ */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const p2 = n => String(n).padStart(2, "0");
  const vor3h = new Date(Date.now() - 3 * 3600e3);
  const vorbeiMoeglich = vor3h.toDateString() === new Date().toDateString();   // kurz nach Mitternacht nicht prüfbar
  const fall = async (ende) => {
    const termin = { id: 61, datum: h.heute(), typ: "turnier", titel: "Testfestival", uhrzeit: "00:00:00", uhrzeit_ende: ende };
    const basis = h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
      termine: [termin], rueckmeldungen: [], team_config: [{ spenden_link: "" }],
      rpc: { eltern_news: {}, training_rueckblick: [], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false } });
    const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 390, hoehe: 844, supabase: basis });
    await s.page.evaluate(tk => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: tk, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
    await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(3000);
    const r = await s.page.evaluate(async () => {
      const w = ms => new Promise(x => setTimeout(x, ms));
      for (let i = 0; i < 40 && typeof kabineCountdownLoad !== "function"; i++) await w(100);
      window._elternKids = window._elternKids && window._elternKids.length ? window._elternKids : [{ spieler_id: 1, kader: { id: 1, name: "Kind A" } }];
      ["kab-countdown", "kab-pack"].forEach(id => { if (!document.getElementById(id)) { const d = document.createElement("div"); d.id = id; document.body.appendChild(d); } });
      await kabineCountdownLoad(); await kabinePackLoad(); await w(200);
      const c = document.getElementById("kab-countdown"), hinweis = c.querySelector(".kab-nach-spiel");
      return { text: c.textContent.replace(/\s+/g, " ").trim(), hinweis: hinweis ? hinweis.textContent : null,
        imSatzVorrat: hinweis ? KAB_NACH_SPIEL.includes(hinweis.textContent) : null,
        pack: (document.getElementById("kab-pack").textContent || "").trim() };
    }).catch(e => ({ fehler: String(e) }));
    const f = s.fehler(); await s.schliessen();
    return { ...r, f };
  };
  const a = vorbeiMoeglich ? await fall(`${p2(vor3h.getHours())}:${p2(vor3h.getMinutes())}:00`) : null;
  const b = await fall("23:59:00");
  const c = await fall(null);
  const titel = "v731 Kabine: „Heute war Spieltag“ zwei Stunden nach Spielende";
  const f = [].concat(a ? a.f : [], b.f, c.f); if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  if (!a) zeilen.push("a) übersprungen (kurz nach Mitternacht)");
  else if (a.fehler || !/Heute war Spieltag! 🦅/.test(a.text) || !a.imSatzVorrat || a.pack) probleme.push("a) " + JSON.stringify(a));
  else zeilen.push("a) „Heute war Spieltag! 🦅“ mit Hinweis, keine Packliste");
  if (b.fehler || !/Heute ist Spieltag! 🔥/.test(b.text) || b.hinweis || !/Tasche/.test(b.pack)) probleme.push("b) " + JSON.stringify(b));
  else zeilen.push("b) vor Ende + 2 h: „Heute ist Spieltag!“ und Packliste");
  if (c.fehler || !/Heute ist Spieltag! 🔥/.test(c.text) || c.hinweis) probleme.push("c) " + JSON.stringify(c));
  else zeilen.push("c) ohne Endzeit unverändert");
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
