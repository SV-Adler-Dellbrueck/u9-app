/* v783 · Eltern-Kopf aufgeräumt, Begrüßung, Bestätigung bei der Zusage (Charles 04.11.: „Alles außer die offenen Punkte umsetzen“)
   a) Im Band stehen oben nur „Adler-Rufe“ und „⋯“ (zwei Knöpfe, je ≥ 44 px); Schrift, Hell/Dunkel, Hilfe, Passwort und Abmelden liegen im zugeklappten Streifen
      („⋯“ klappt ihn auf und zu, aria-expanded folgt) – die Knöpfe selbst bleiben erhalten
   b) Begrüßung: „Hallo, Familie von <Vorname>“ und „Nächstes: Training morgen“
   c) Nach einer Zusage bekommt die Terminkarte kurz die Klasse ep-pop; die Animation läuft nur ohne „Bewegung reduzieren“ */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u-eltern", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const termine = [1, 3, 5].map((tage, i) => ({ id: 100 + i, datum: h.tagePlus(tage), typ: "training", titel: "", uhrzeit: "16:45", uhrzeit_ende: "18:00", ort: "Sportplatz", trainer_status: {} }));
  const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 3500, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
    eltern_kinder: [{ spieler_id: 3, label: "", kader: { id: 3, name: "Kind C", nr: 9, foto_stadionheft_ok: true } }],
    termine, rueckmeldungen: [], team_config: [{ spenden_link: "" }],
    rpc: { eltern_news: {}, training_rueckblick: [], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false } }) });
  await s.page.waitForLoadState("networkidle"); await s.page.waitForTimeout(1500);
  await s.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(3500);
  const ev = (fn, arg) => s.page.evaluate(fn, arg);
  const r = {};
  r.a1 = await ev(() => {
    const band = document.getElementById("ep-kopf"), m = document.getElementById("ep-menue"), k = document.getElementById("ep-menue-knopf");
    const sichtbar = [...band.querySelectorAll("button")].filter(b => b.getBoundingClientRect().height > 0);
    return { sichtbar: sichtbar.map(b => b.id || b.className || b.textContent.trim()), hoehen: sichtbar.map(b => Math.round(b.getBoundingClientRect().height)), zu: m && getComputedStyle(m).display === "none", expanded: k && k.getAttribute("aria-expanded"),
      drin: ["schrift-toggle", "theme-toggle"].map(c => !!(m && (m.querySelector("." + c) || m.querySelector("#" + c)))), logout: !!(m && /Abmelden/.test(m.textContent)) };
  });
  await ev(() => document.getElementById("ep-menue-knopf").click()); await s.page.waitForTimeout(200);
  r.a2 = await ev(() => { const m = document.getElementById("ep-menue"); return { auf: getComputedStyle(m).display !== "none", expanded: document.getElementById("ep-menue-knopf").getAttribute("aria-expanded"), knoepfe: [...m.querySelectorAll("button")].filter(b => b.getBoundingClientRect().height >= 44).length }; });
  await ev(() => document.getElementById("ep-menue-knopf").click()); await s.page.waitForTimeout(100);
  r.a3 = await ev(() => getComputedStyle(document.getElementById("ep-menue")).display === "none");
  r.b = await ev(() => ({ gruss: document.getElementById("ep-gruss").textContent.trim(), gruss2: document.getElementById("ep-gruss2").textContent.trim() }));
  await ev(() => { window._epPop = 1; elternDashLoad(); }); await s.page.waitForTimeout(1500);
  r.c1 = await ev(() => { const t = document.getElementById("termin-card"); return t ? { pop: t.classList.contains("ep-pop"), anim: getComputedStyle(t).animationName } : null; });
  await s.page.emulateMedia({ reducedMotion: "reduce" });
  r.c2 = await ev(() => { const t = document.getElementById("termin-card"); return t ? getComputedStyle(t).animationName : null; });
  const fe = s.fehler(); await s.schliessen();
  if (r.a1.sichtbar.length !== 2 || r.a1.hoehen.some(x => x < 44) || !r.a1.zu || r.a1.expanded !== "false" || r.a1.drin.some(x => !x) || !r.a1.logout) probleme.push("a1) " + JSON.stringify(r.a1));
  if (!r.a2.auf || r.a2.expanded !== "true" || r.a2.knoepfe < 5 || !r.a3) probleme.push("a2) " + JSON.stringify({ a2: r.a2, a3: r.a3 }));
  zeilen.push(`a) im Band sichtbar: ${r.a1.sichtbar.join(" + ")} (${r.a1.hoehen.join("/")} px) · Streifen zu → auf (${r.a2.knoepfe} Knöpfe ≥ 44 px) → zu`);
  if (!/^Hallo, Familie von Kind C$/.test(r.b.gruss) || !/^Nächstes: Training morgen$/.test(r.b.gruss2)) probleme.push("b) " + JSON.stringify(r.b));
  zeilen.push(`b) „${r.b.gruss}“ · „${r.b.gruss2}“`);
  if (!r.c1 || !r.c1.pop || r.c1.anim !== "epPop" || r.c2 !== "none") probleme.push("c) " + JSON.stringify({ c1: r.c1, c2: r.c2 }));
  zeilen.push(`c) Pop-Klasse gesetzt, Animation ${r.c1 && r.c1.anim}; bei „reduzieren“ ${r.c2}`);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v783 Eltern-Kopf: Rufe und „⋯“, Begrüßung, Bestätigung bei der Zusage", !probleme.length, probleme.length ? probleme : zeilen);
};
