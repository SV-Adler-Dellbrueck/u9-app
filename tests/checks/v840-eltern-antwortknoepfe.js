/* v840 · Eine Bauart für die Antwortknöpfe der Eltern (Bestandsaufnahme November 2026, 3.3 und 3.14).
   Vorher: Terminkarte vier Knöpfe ohne Emoji, „Rückmeldung fehlt“ drei ohne „Krank“, Termin-Fenster vier mit Emoji,
   „Alle Termine“ drei mit Emoji; aria-pressed nur an einer Stelle.
   Jetzt an allen vier Stellen: Zusage · Unsicher · Absage · Krank, nur das Wort, ≥ 44 px, aria-pressed und ein Name
   („Kind A: Zusage“); die gewählte Antwort trägt einen Haken. */
"use strict";
module.exports = async function (h) {
  const titel = "v840 Eltern: Antwortknöpfe überall gleich – vier Stufen mit „Krank“, ohne Emoji, mit aria-pressed";
  const probleme = [], zeilen = [];
  const T = (id, tage, typ, t) => ({ id, datum: h.tagePlus(tage), uhrzeit: "16:45", uhrzeit_ende: "18:00", typ, titel: t || "", ort: "Sportplatz", trainer_status: {}, platz_status: null });
  const termine = [T(1, 1, "spiel", "Spielfest"), T(2, 4, "event", "Elternabend"), T(3, 20, "spiel", "Rückrunde")];
  const TOKEN = "x." + Buffer.from(JSON.stringify({ sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600, email: "eltern@example.org" })).toString("base64url") + ".y";
  const e = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1000, breite: 360, hoehe: 800,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
      rueckmeldungen: (u) => /termin_id=eq\.1\b/.test(u.search) || /termin_id=in/.test(u.search) ? [{ termin_id: 1, spieler_id: 1, status: "abgesagt" }] : [{ termin_id: 1, spieler_id: 1, status: "abgesagt" }],
      feier_eintraege: [], eltern_angaben: [{ vorname: "Erwachsener", nachname: "Beispiel" }] }) });
  await e.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await e.page.reload({ waitUntil: "networkidle" }); await e.page.waitForTimeout(4500);
  const r = await e.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    if (typeof elternAntwortKnopf !== "function") return { alt: true };
    const lies = (wurzel, sel) => [...(wurzel ? wurzel.querySelectorAll(sel) : [])].map(b => ({ t: b.textContent.trim(), h: Math.round(b.getBoundingClientRect().height), b: Math.round(b.getBoundingClientRect().width),
      p: b.getAttribute("aria-pressed"), l: b.getAttribute("aria-label") || "", zeilen: Math.round(b.getBoundingClientRect().height / parseFloat(getComputedStyle(b).lineHeight || 16)) }));
    const out = {};
    out.karte = lies(document.getElementById("termin-card"), 'button[onclick*="elternRsvp"]');
    out.offen = lies(document.getElementById("eltern-offen-card"), 'button[onclick^="elternRsvp("]').slice(0, 4);
    if (typeof tmDetailOpen === "function" || typeof elternTerminDetail === "function") { /* Termin-Fenster */ }
    const oeffner = document.querySelector('#eltern-offen-card [onclick*="Detail"], #eltern-offen-card [onclick*="tdOpen"], #eltern-offen-card [onclick*="terminDetail"]');
    if (oeffner) { oeffner.click(); await w(900); }
    const fenster = [...document.querySelectorAll('[role="dialog"]')].find(d => d.querySelector('button[onclick^="tdRsvp("]'));
    out.fenster = lies(fenster, 'button[onclick^="tdRsvp("]'); if (fenster) fenster.remove();
    await elternTermineOpen(); await w(1200);
    out.alle = lies(document, "button.et-rsvp").slice(0, 4);
    return out;
  }).catch(x => ({ fehler: String(x) }));
  const fe = e.fehler(); await e.schliessen();
  if (r.alt) return h.ergebnis(titel, false, ["elternAntwortKnopf fehlt (Stand vor v840)"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  const SOLL = ["Zusage", "Unsicher", "Absage", "Krank"];
  for (const [ort, liste] of [["Terminkarte", r.karte], ["Rückmeldung fehlt", r.offen], ["Termin-Fenster", r.fenster], ["Alle Termine", r.alle]]) {
    const worte = liste.map(x => x.t.replace(/^✓\s*/, ""));
    if (worte.join("|") !== SOLL.join("|")) { probleme.push(`${ort}: Knöpfe „${liste.map(x => x.t).join(" · ")}“ statt Zusage · Unsicher · Absage · Krank`); continue; }
    if (liste.some(x => x.h < 44)) probleme.push(`${ort}: Knopf unter 44 px (${liste.map(x => x.h).join("/")})`);
    if (liste.some(x => x.p !== "true" && x.p !== "false")) probleme.push(`${ort}: aria-pressed fehlt`);
    if (liste.some((x, i) => x.l !== "Kind A: " + SOLL[i])) probleme.push(`${ort}: Name für Vorleseprogramme fehlt (${liste.map(x => x.l).join(" · ")})`);
    if (liste.some(x => x.h > 60)) probleme.push(`${ort}: Knopftext bricht um (${liste.map(x => x.h).join("/")} px bei 360 px Breite)`);
  }
  const gew = (r.karte || []).filter(x => x.p === "true");
  if (gew.length !== 1 || gew[0].t !== "✓ Absage") probleme.push("Terminkarte: gewählte Antwort nicht als „✓ Absage“ markiert: " + JSON.stringify((r.karte || []).map(x => [x.t, x.p])));
  if (!probleme.length) zeilen.push("vier Stellen, je Zusage · Unsicher · Absage · Krank, ≥ 44 px bei 360 px Breite, aria-pressed, „Kind A: …“; gewählt „✓ Absage“");
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
