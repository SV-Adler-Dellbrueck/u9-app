/* v727 · Liveticker für Eltern nur, wenn das Trainerteam ihn einschaltet – sonst grau mit Augenzwinkern.
   PO 03.10. (Bildschirmfoto Spieltag): „Stell den Liveticker und die Konferenz vorerst aus bzw. grau
   unterlegen“. Seit v728 (PO 03.10.): „durch einen einfachen Schalter an- und auszuschalten … mit dem
   Hinweis, Kommentator kurzfristig im Urlaub oder ein anderer witziger Kommentar.“ Schalter =
   matchday.ticker_open („Liveticker starten / stoppen“ im Trainerbereich).
   a) Ticker aus, zwei Teams, Kind in Adler 1: kein Knopf „Liveticker öffnen“, kein „Konferenz“, dafür ein
      grauer, nicht antippbarer Hinweis (≥ 44 px) aus ELTERN_TICKER_SPRUECHE; Team und Trainer bleiben;
      oben keine LIVE-Kachel
   b) Ticker an: „Liveticker öffnen · Adler 1“ und „Konferenz“ sind da */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const heute = h.heute();
  const lauf = async (offen) => {
    const basis = h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
      termine: [{ id: 91, datum: heute, typ: "turnier", titel: "Testturnier", uhrzeit: "23:00:00", heim: false, ort: "Teststraße 1, 50000 Köln" }],
      rueckmeldungen: [], team_config: [{ spenden_link: "" }],
      matchday: [{ datum: heute, clock_status: "idle", ticker_open: offen }], ticker_events: [],
      rpc: { eltern_news: {}, training_rueckblick: [], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false,
        kind_team: { ok: true, team: 1, anzahl: 2, trainer: ["Trainer X"] }, mein_ticker_helfer: [] } });
    const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 390, hoehe: 844, supabase: basis });
    await s.page.evaluate(tk => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: tk, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); localStorage.removeItem("adler_live_weg"); }, TOKEN);
    await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(4500);
    const r = await s.page.evaluate(() => {
      const slot = document.getElementById("eltern-ticker-slot"), live = document.getElementById("eltern-live-slot");
      const note = slot && slot.querySelector('[aria-disabled="true"]');
      return { da: !!slot, text: slot ? slot.textContent.replace(/\s+/g, " ") : "",
        knoepfe: slot ? [...slot.querySelectorAll("button")].map(b => b.textContent.trim()) : [],
        note: note ? { text: note.textContent, h: Math.round(note.getBoundingClientRect().height), klick: !!note.getAttribute("onclick") } : null,
        sprueche: typeof ELTERN_TICKER_SPRUECHE !== "undefined" ? ELTERN_TICKER_SPRUECHE : [],
        live: live ? live.textContent.trim() : "" };
    });
    const f = s.fehler(); await s.schliessen();
    return { r, f };
  };
  const a = await lauf(false), b = await lauf(true);
  const titel = "v727/v728 Liveticker für Eltern folgt dem Schalter des Trainerteams";
  const f = [].concat(a.f, b.f); if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  const r = a.r;
  if (!r.da) probleme.push("a) kein Ticker-Bereich auf der Karte");
  else if (r.knoepfe.some(t => /Liveticker|Konferenz/.test(t))) probleme.push("a) Knöpfe trotz Ticker aus: " + r.knoepfe.join(" | "));
  else if (!r.note || !r.sprueche.includes(r.note.text) || r.note.h < 44 || r.note.klick) probleme.push("a) Hinweis: " + JSON.stringify(r.note));
  else if (!/Adler 1/.test(r.text) || !/Trainer X/.test(r.text)) probleme.push("a) Team/Trainer fehlen: " + r.text.slice(0, 200));
  else if (/LIVE|Liveticker läuft/.test(r.live)) probleme.push("a) LIVE-Kachel trotz Ticker aus");
  else zeilen.push(`a) Ticker aus: „${r.note.text.slice(0, 50)}…“ (${r.note.h} px), keine Knöpfe, Team und Trainer bleiben`);
  if (!b.r.knoepfe.some(t => /Liveticker öffnen/.test(t)) || !b.r.knoepfe.some(t => /Konferenz/.test(t))) probleme.push("b) Ticker an, Knöpfe: " + b.r.knoepfe.join(" | "));
  else zeilen.push("b) Ticker an: „Liveticker öffnen“ und „Konferenz“ aktiv");
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
