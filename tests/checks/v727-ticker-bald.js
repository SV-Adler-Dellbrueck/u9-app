/* v727 · Liveticker und Konferenz für Eltern vorerst „bald verfügbar“.
   PO 03.10. (Bildschirmfoto Spieltag): „Stell den Liveticker und die Konferenz vorerst aus bzw. grau
   unterlegen mit bald in der Adler verfügbar oder coming soon.“
   a) Spieltag mit zwei Teams, Kind in Adler 1: kein Knopf „Liveticker öffnen“, kein Knopf „Konferenz“,
      dafür ein grauer, nicht antippbarer Hinweis „bald in der Adler-App verfügbar“ (≥ 44 px);
      Team und Trainer des Kindes stehen weiter da
   b) Auch wenn der Trainer den Ticker freigegeben hat, erscheint oben keine LIVE-Kachel */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const heute = h.heute();
  const basis = h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
    eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
    termine: [{ id: 91, datum: heute, typ: "turnier", titel: "Testturnier", uhrzeit: "23:00:00", heim: false, ort: "Teststraße 1, 50000 Köln" }],
    rueckmeldungen: [], team_config: [{ spenden_link: "" }],
    matchday: [{ datum: heute, clock_status: "idle", ticker_open: true }], ticker_events: [],
    rpc: { eltern_news: {}, training_rueckblick: [], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false,
      kind_team: { ok: true, team: 1, anzahl: 2, trainer: ["Trainer X"] } } });
  const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 390, hoehe: 844, supabase: basis });
  await s.page.evaluate(tk => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: tk, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); localStorage.removeItem("adler_live_weg"); }, TOKEN);
  await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(4500);
  const r = await s.page.evaluate(() => {
    const slot = document.getElementById("eltern-ticker-slot"), live = document.getElementById("eltern-live-slot");
    const note = slot && slot.querySelector('[aria-disabled="true"]');
    return { da: !!slot, text: slot ? slot.textContent.replace(/\s+/g, " ") : "",
      knoepfe: slot ? [...slot.querySelectorAll("button")].map(b => b.textContent.trim()) : [],
      note: note ? { text: note.textContent, h: Math.round(note.getBoundingClientRect().height), klick: !!note.getAttribute("onclick") } : null,
      live: live ? live.textContent.trim() : "" };
  });
  const f = s.fehler(); await s.schliessen();
  const titel = "v727 Liveticker und Konferenz für Eltern „bald verfügbar“";
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  if (!r.da) probleme.push("a) kein Ticker-Bereich auf der Karte");
  else if (r.knoepfe.some(t => /Liveticker|Konferenz/.test(t))) probleme.push("a) Knöpfe noch da: " + r.knoepfe.join(" | "));
  else if (!r.note || !/bald in der Adler-App verfügbar/.test(r.note.text) || r.note.h < 44 || r.note.klick) probleme.push("a) Hinweis: " + JSON.stringify(r.note));
  else if (!/Adler 1/.test(r.text) || !/Trainer X/.test(r.text)) probleme.push("a) Team/Trainer fehlen: " + r.text.slice(0, 200));
  else zeilen.push(`a) keine Ticker-Knöpfe, grauer Hinweis „bald in der Adler-App verfügbar“ (${r.note.h} px), Team und Trainer bleiben`);
  if (/LIVE|Liveticker läuft/.test(r.live)) probleme.push("b) LIVE-Kachel oben: " + r.live.slice(0, 120));
  else zeilen.push("b) keine LIVE-Kachel, obwohl der Ticker freigegeben ist");
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
