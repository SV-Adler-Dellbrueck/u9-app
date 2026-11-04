/* v786 · Einheitliche Linien-Symbole in den Kachel-Scheiben des Eltern-Dashboards (Charles 04.11.)
   a) Die Scheiben tragen ein SVG (stroke currentColor, eine Strichstärke) statt Emoji; kein Emoji mehr in einer Scheibe mit hellblauem Grund
   b) Strichfarbe gegen Scheibe ≥ 3:1 (Bedienelement-Regel), hell
   c) Scheiben bleiben aria-hidden, Titel daneben vorhanden; unbekanntes Zeichen fällt aufs Emoji zurück */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u-eltern", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const termine = [1, 3].map((tage, i) => ({ id: 100 + i, datum: h.tagePlus(tage), typ: "training", titel: "", uhrzeit: "16:45", uhrzeit_ende: "18:00", ort: "Sportplatz", trainer_status: {} }));
  const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 3500, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
    eltern_kinder: [{ spieler_id: 3, label: "", kader: { id: 3, name: "Kind C", nr: 9, foto_stadionheft_ok: true } }],
    termine, rueckmeldungen: [], team_config: [{ spenden_link: "" }],
    rpc: { eltern_news: {}, training_rueckblick: [], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false } }) });
  await s.page.waitForLoadState("networkidle"); await s.page.waitForTimeout(1500);
  await s.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(3500);
  const r = await s.page.evaluate(() => {
    const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); };
    const kr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    const scheiben = [...document.querySelectorAll("span[aria-hidden='true']")].filter(e => e.style.width === "40px" && getComputedStyle(e).backgroundColor === "rgb(219, 234, 254)");
    const svg = scheiben.filter(e => e.querySelector("svg"));
    const emoji = scheiben.filter(e => !e.querySelector("svg")).map(e => e.textContent.trim());
    const kmin = Math.min(...svg.map(e => kr(getComputedStyle(e).color, getComputedStyle(e).backgroundColor)));
    const sw = [...new Set(svg.map(e => e.querySelector("svg").getAttribute("stroke-width")))];
    return { gesamt: scheiben.length, svg: svg.length, emoji, kmin, sw, fallback: epIcon("🦄"), bekannt: /<svg/.test(epIcon("📅")) };
  });
  const fe = s.fehler(); await s.schliessen();
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  if (r.svg < 4 || r.emoji.length) probleme.push("a) Scheiben: " + JSON.stringify({ gesamt: r.gesamt, svg: r.svg, emoji: r.emoji }));
  if (r.kmin < 3 || r.sw.length !== 1) probleme.push("b) Kontrast/Strich: " + JSON.stringify({ kmin: r.kmin, sw: r.sw }));
  if (r.fallback !== "🦄" || !r.bekannt) probleme.push("c) Rückfall: " + JSON.stringify({ f: r.fallback, b: r.bekannt }));
  zeilen.push(`${r.svg} von ${r.gesamt} Scheiben mit Linien-Symbol, Strich ${r.sw.join("/")}, Kontrast ab ${r.kmin.toFixed(1)}:1`);
  return h.ergebnis("Eltern: Linien-Symbole statt Emoji in den Kachel-Scheiben", !probleme.length, zeilen.concat(probleme));
};
