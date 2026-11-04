/* v785 · „Diese Woche“-Streifen im Eltern-Dashboard (Charles 04.11.)
   a) Bei ≥ 2 Terminen in sieben Tagen: sieben Tage, je Tag mit Termin eine Kachel ≥ 44 px, Stand als Zeichen UND Wort (aria-label)
   b) Zusage ✓ · offen ! · fällt aus/Absage ✕; Termine jenseits der Woche zählen nicht
   c) Bei nur einem Termin in der Woche erscheint der Streifen nicht
   d) Im echten Dashboard sitzt der Streifen unter der Terminkarte, ohne waagerechtes Scrollen */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u-eltern", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const termine = [1, 3, 5, 12].map((tage, i) => ({ id: 100 + i, datum: h.tagePlus(tage), typ: "training", titel: "", uhrzeit: "16:45", uhrzeit_ende: "18:00", ort: "Sportplatz", trainer_status: {} }));
  const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 3500, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
    eltern_kinder: [{ spieler_id: 3, label: "", kader: { id: 3, name: "Kind C", nr: 9, foto_stadionheft_ok: true } }],
    termine, rueckmeldungen: [], team_config: [{ spenden_link: "" }],
    rpc: { eltern_news: {}, training_rueckblick: [], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false } }) });
  await s.page.waitForLoadState("networkidle"); await s.page.waitForTimeout(1500);
  await s.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(3500);
  const r = await s.page.evaluate(() => {
    const iso = n => { const d = new Date(Date.now() + n * 864e5); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
    const T = (id, n, extra) => Object.assign({ id, datum: iso(n), typ: "training", titel: "", trainer_status: {} }, extra || {});
    const kids = [{ spieler_id: 3, kader: { name: "Kind C" } }];
    const box = html => { const d = document.createElement("div"); d.innerHTML = html; return d; };
    const rows = [T(1, 1), T(2, 2), T(3, 4), T(4, 12)];
    const w = box(elternWochenleisteHtml(rows, kids, { 1: { 3: "zugesagt" }, 2: {}, 3: { 3: "abgesagt" } }));
    const k = [...w.querySelectorAll("button")].map(b => b.getAttribute("aria-label"));
    const zeichen = [...w.querySelectorAll("button")].map(b => b.lastElementChild.textContent);
    const eins = elternWochenleisteHtml([T(1, 1), T(4, 12)], kids, {});
    const dash = document.getElementById("eltern-woche"), tk = document.getElementById("termin-card");
    return { tage: w.querySelectorAll("#eltern-woche > div:nth-child(2) > *").length, kachel: k.length, labels: k, zeichen, eins, dashDa: !!dash, unter: dash && tk ? dash.getBoundingClientRect().top > tk.getBoundingClientRect().top : null, quer: document.documentElement.scrollWidth <= innerWidth + 1 };
  });
  const dashH = await s.page.evaluate(() => { const b = document.querySelector("#eltern-woche button"); return b ? Math.round(b.getBoundingClientRect().height) : 0; });
  const fe = s.fehler(); await s.schliessen();
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  if (r.tage !== 7) probleme.push("a) Tage: " + r.tage);
  if (r.kachel !== 3 || !r.labels.every(l => /, (zugesagt|Antwort offen|nicht dabei|fällt aus)/.test(l))) probleme.push("a) Kacheln/Labels: " + JSON.stringify(r.labels));
  if (r.zeichen.join("") !== "✓!✕") probleme.push("b) Zeichen: " + r.zeichen.join(""));
  if (r.eins !== "") probleme.push("c) bei einem Termin kein Streifen, war: " + r.eins.slice(0, 40));
  if (!r.dashDa || r.unter === false || !r.quer || dashH < 44) probleme.push("d) Dashboard: " + JSON.stringify({ da: r.dashDa, unter: r.unter, quer: r.quer, h: dashH }));
  zeilen.push(`7 Tage, ${r.kachel} Kacheln (${r.zeichen.join(" ")}), Kachelhöhe ${dashH} px, im Dashboard ${r.dashDa ? "da" : "fehlt"}`);
  return h.ergebnis("Eltern: „Diese Woche“-Streifen mit Stand je Tag", !probleme.length, zeilen.concat(probleme));
};
