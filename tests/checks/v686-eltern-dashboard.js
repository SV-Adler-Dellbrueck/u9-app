/* v686 · Eltern-Bereich: jeder Termin einmal, lesbare Überschriften, 44 px
   PO 29.09.: „Mach alles“ – nach dem Umbau der Trainer-App (v681–v685) die Eltern-App.
   Gemessen am Dashboard (390 × 844): dieselben Zusage-Knöpfe standen für einen Termin bis zu
   dreimal da (Nächster Termin, Rückmeldung fehlt, Wisch-Karussell).
   a) Für jeden Termin gibt es höchstens EINE Reihe Zusage-Knöpfe auf dem Dashboard
   b) „Danach“ zeigt beantwortete und spätere Termine als Zeile (≥ 48 px) mit dem Stand in Worten,
      ohne Zusage-Knöpfe; was oben steht, steht dort nicht noch einmal
   c) Abschnitts-Überschriften nicht in Versalien, mindestens 13 px
   d) Jede Bedienfläche mindestens 44 px – ausgenommen Links im Fließtext (Ort, Gegner)
   e) Das Termin-Fenster schließt über einen Knopf mit 44 px */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const termine = [
    { id: 5, datum: h.tagePlus(2), typ: "training", uhrzeit: "16:45", uhrzeit_ende: "18:00", ort: "Sportplatz" },
    { id: 6, datum: h.tagePlus(4), typ: "spiel", uhrzeit: "10:00", gegner: "Gegner FC", ort: "Auswärts" },
    { id: 7, datum: h.tagePlus(6), typ: "training", uhrzeit: "16:45", ort: "Sportplatz" },
    { id: 8, datum: h.tagePlus(20), typ: "training", uhrzeit: "16:45", ort: "Sportplatz" }];
  const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 390, hoehe: 844,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
      termine, rueckmeldungen: [{ termin_id: 7, spieler_id: 1, status: "zugesagt" }] }) });
  await s.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(4500);
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const sichtbar = el => { const b = el.getBoundingClientRect(); if (b.width <= 0 || b.height <= 0) return false;
      for (let e = el; e && e !== document.documentElement; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) === 0) return false; } return true; };
    const html = document.body.innerHTML;
    const reihen = {};
    for (const id of [5, 6, 7, 8]) reihen[id] = (html.match(new RegExp(`elternRsvp\\(${id},1,'abgesagt'\\)`, "g")) || []).length;
    const danach = [...document.querySelectorAll("button")].filter(b => /terminDetailOpen\(\d+\)/.test(b.getAttribute("onclick") || "") && b.closest("div") && /Danach/.test(b.parentElement.textContent));
    const danachInfo = danach.map(b => ({ id: Number((b.getAttribute("onclick").match(/\d+/) || [])[0]), h: Math.round(b.getBoundingClientRect().height), t: b.textContent.replace(/\s+/g, " ").trim() }));
    const titel = [...document.querySelectorAll("div")].filter(d => sichtbar(d) && /^(📅 Termine|🎮 Für die Kinder|Mehr)$/.test(d.textContent.trim()) && !d.children.length)
      .map(d => ({ t: d.textContent.trim(), px: parseFloat(getComputedStyle(d).fontSize), tt: getComputedStyle(d).textTransform }));
    const bedien = [...document.querySelectorAll("button, a[href], select, input:not([type=hidden]), [role=button]")].filter(sichtbar)
      .filter(e => !(e.tagName === "A" && getComputedStyle(e).display === "inline"));
    const klein = bedien.filter(e => e.getBoundingClientRect().height < 43.5).map(e => (e.textContent || e.getAttribute("aria-label") || e.tagName).replace(/\s+/g, " ").trim().slice(0, 22) + "@" + Math.round(e.getBoundingClientRect().height));
    await terminDetailOpen(5); await w(900);
    const dlg = document.getElementById("td-modal");
    const zu = dlg ? [...dlg.querySelectorAll("button")].find(b => b.textContent.trim() === "×") : null;
    return { reihen, danachInfo, titel, klein, zu: zu ? Math.round(Math.min(zu.getBoundingClientRect().width, zu.getBoundingClientRect().height)) : null };
  });
  const f = s.fehler(); await s.schliessen();
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  for (const id in r.reihen) if (r.reihen[id] > 1) probleme.push(`a) Termin ${id}: ${r.reihen[id]} Reihen Zusage-Knöpfe`);
  const ids = r.danachInfo.map(x => x.id);
  if (!ids.includes(7) || !ids.includes(8)) probleme.push(`b) „Danach“ zeigt ${JSON.stringify(ids)} – erwartet 7 (beantwortet) und 8 (später)`);
  if (ids.includes(5) || ids.includes(6)) probleme.push(`b) „Danach“ wiederholt einen Termin von oben: ${JSON.stringify(ids)}`);
  r.danachInfo.forEach(x => { if (x.h < 48) probleme.push(`b) Zeile ${x.id} nur ${x.h} px`); });
  const z7 = r.danachInfo.find(x => x.id === 7); if (z7 && !/Zusage/.test(z7.t)) probleme.push(`b) Zeile 7 nennt den Stand nicht: „${z7.t}“`);
  const z8 = r.danachInfo.find(x => x.id === 8); if (z8 && !/offen/.test(z8.t)) probleme.push(`b) Zeile 8 nennt „offen“ nicht: „${z8.t}“`);
  if (r.reihen[7] || r.reihen[8]) probleme.push("b) In „Danach“ stehen Zusage-Knöpfe");
  if (r.titel.length < 3) probleme.push(`c) nur ${r.titel.length} Abschnitts-Überschriften gefunden`);
  r.titel.forEach(x => { if (x.px < 13 || x.tt === "uppercase") probleme.push(`c) „${x.t}“: ${x.px}px ${x.tt}`); });
  if (r.klein.length) probleme.push(`d) ${r.klein.length} Bedienflächen unter 44 px: ${r.klein.slice(0, 4).join(" | ")}`);
  if (r.zu === null) probleme.push("e) Termin-Fenster ohne ×-Knopf gefunden");
  else if (r.zu < 44) probleme.push(`e) Schließen-Knopf nur ${r.zu} px`);
  zeilen.push(`Zusage-Reihen ${JSON.stringify(r.reihen)} · Danach ${JSON.stringify(ids)} · Überschriften ${r.titel.map(x => x.px + "px").join("/")} · Schließen ${r.zu} px`);
  return h.ergebnis("Eltern-Dashboard: jeder Termin einmal, lesbare Überschriften, 44 px", !probleme.length, zeilen.concat(probleme));
};
