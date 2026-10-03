/* v729 · Die Eltern-App zeigt bei jedem Termin auch das Ende.
   PO 03.10.: „In der Eltern-App soll bei Spieltagen zu Hause oder auswärts auch immer das Ende angezeigt
   werden.“ Kachel: „und auch beim Training die Endzeiten anzeigen“. Spieltage enden ungefähr („ca.“),
   Trainings pünktlich. Der Kalender-Export trug bis dahin jeden Termin mit festen 90 Minuten ein.
   a) Karte „Nächster Termin“, Turnier: „Treffen 09:30 · Anstoß 10:15 · Ende ca. 11:30 Uhr“
   b) Karte „Nächster Termin“, Training: „17:00–18:30 Uhr“ (ohne „ca.“)
   c) „Alle Termine“: „10:15–11:30 Uhr“ und „17:00–18:30 Uhr“
   d) Kalender-Export: DTEND ist die Endzeit (Turnier 11:30, Training 18:30), ohne Ende weiter +90 Min. */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const TURNIER = { id: 91, datum: h.tagePlus(1), typ: "turnier", titel: "Testturnier", uhrzeit: "10:15:00", uhrzeit_ende: "11:30:00", treffzeit: "09:30", heim: false, ort: "Teststraße 1, 50000 Köln" };
  const TRAINING = { id: 92, datum: h.tagePlus(2), typ: "training", titel: "Training", uhrzeit: "17:00:00", uhrzeit_ende: "18:30:00" };
  const OHNE = { id: 93, datum: h.tagePlus(3), typ: "event", titel: "Ohne Ende", uhrzeit: "15:00:00" };
  const fall = async (termine, mitListe) => {
    const basis = h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
      termine, rueckmeldungen: [], team_config: [{ spenden_link: "" }],
      rpc: { eltern_news: {}, training_rueckblick: [], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false } });
    const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 390, hoehe: 844, supabase: basis });
    await s.page.evaluate(tk => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: tk, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
    await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(4000);
    const r = await s.page.evaluate(async (mitListe) => {
      const w = ms => new Promise(x => setTimeout(x, ms));
      const k = document.getElementById("termin-card");
      const out = { karte: k ? k.textContent.replace(/\s+/g, " ") : null };
      if (!mitListe) return out;
      elternTermineOpen(); await w(200);
      const m = document.getElementById("et-modal"); out.liste = m ? m.textContent.replace(/\s+/g, " ") : null; if (m) m.remove();
      for (let i = 0; i < 40 && typeof icsLocalStart !== "function"; i++) await w(100);
      const B = window.Blob; let ics = null;
      window.Blob = function (teile, o) { ics = teile.join(""); return new B(teile, o); };
      const klick = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () {};
      try { elternTermineIcs(); } finally { window.Blob = B; HTMLAnchorElement.prototype.click = klick; }
      out.ics = ics;
      return out;
    }, mitListe);
    const f = s.fehler(); await s.schliessen();
    return { ...r, f };
  };
  const a = await fall([TURNIER, TRAINING, OHNE], true);
  const b = await fall([TRAINING], false);
  const titel = "v729 Eltern-App zeigt das Ende von Spieltag und Training";
  const f = [].concat(a.f, b.f); if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  if (!a.karte || !/Treffen 09:30 · Anstoß 10:15 · Ende ca\. 11:30 Uhr/.test(a.karte)) probleme.push("a) " + String(a.karte).slice(0, 200));
  else zeilen.push("a) Turnier: „Treffen 09:30 · Anstoß 10:15 · Ende ca. 11:30 Uhr“");
  if (!b.karte || !/17:00–18:30 Uhr/.test(b.karte) || /ca\./.test(b.karte)) probleme.push("b) " + String(b.karte).slice(0, 200));
  else zeilen.push("b) Training: „17:00–18:30 Uhr“");
  if (!a.liste || !/10:15–11:30 Uhr/.test(a.liste) || !/17:00–18:30 Uhr/.test(a.liste) || !/15:00 Uhr/.test(a.liste)) probleme.push("c) " + String(a.liste).slice(0, 300));
  else zeilen.push("c) „Alle Termine“ mit Ende, ohne Ende nur Beginn");
  const ende = id => ((a.ics || "").split("BEGIN:VEVENT").find(x => x.includes("UID:adler-" + id + "-")) || "").match(/DTEND:\d{8}T(\d{4})/);
  const e1 = ende(91), e2 = ende(92), e3 = ende(93);
  if (!e1 || e1[1] !== "1130" || !e2 || e2[1] !== "1830" || !e3 || e3[1] !== "1630") probleme.push("d) DTEND " + JSON.stringify([e1 && e1[1], e2 && e2[1], e3 && e3[1]]));
  else zeilen.push("d) Kalender: Ende 11:30 / 18:30, ohne Ende 15:00 + 90 Min.");
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
