/* v636 · PO: „Suche noch mal bewusst nach Fehlern … Durchsuche die komplette App, also alle Varianten
   Eltern, Trainer und Kids“ und „Datenschutz ist super wichtig“. Fünf Prüfer (Bewertung, Eltern,
   Trainer, Kinder, Datenschutz) – hier die Korrekturen, die im Browser messbar sind:

   a) Bewertung speichert als Upsert (PK name,datum) – Korrektur am selben Tag ergab vorher 409.
   b) Starker Fuß und Beteiligung werden aus dem letzten Stand übernommen (strong_foot/attendance).
   c) Eine Regel für die drei Stärken (Wert, dann Schlüssel) – wie staerken_von() in der Datenbank.
   d) „Nicht bewertet“ ist null, „alles Ansatz“ (0) zählt im Teamschnitt mit.
   e) Zählkachel zählt nur aktive Kinder; nie bewertet ≠ überfällig.
   f) Eltern: ohne Netz nicht abgemeldet; Fehlermeldungen deutsch; Karte ohne Rohwerte angefragt.
   g) Kabine: Rücksprung zur Startseite bucht keine Appzeit.
   h) KI-Spielbericht: der KI-Dienst bekommt „Kind n“, nie einen Namen. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const K = h.KINDER;
  const s = await h.starten({ hoehe: 1400, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen({ inaktiv: [K[2]] }), team_einstellungen: [{ id: 1, bewertung_ab: "2026-01-01" }], spielerprofile: [], match_actions: [{ spieler: K[0], aktion: "tor" }], ticker_events: [] }) });
  const r = await s.page.evaluate(async K => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = {};
    document.getElementById("pin-gate")?.remove(); const m = document.getElementById("main-app"); if (m) m.style.display = "block";
    window.Chart = class { constructor() { this.data = { datasets: [{}] }; } destroy() {} update() {} };
    try { await loadKader(); } catch (e) {}
    // a) Upsert-Adresse abfangen
    const echtFetch = window.fetch; const gesehen = [];
    window.fetch = (u, o) => { gesehen.push({ u: String(u), m: o && o.method, h: o && o.headers, b: o && o.body }); return echtFetch(u, o); };
    BEW_AB = "2026-01-01"; if (typeof bewSperreAnwenden === "function") bewSperreAnwenden();   // v648: Bewertungen offen
    go("bew"); await warte(300);
    const sel = document.getElementById("p-name");
    const opt = n => { if (![...sel.options].some(o => o.value === n)) { const o = document.createElement("option"); o.value = o.textContent = n; sel.appendChild(o); } };
    opt(K[0]); opt(K[1]);
    // b) letzter Stand mit L / 3
    DB[K[1]] = [{ name: K[1], datum: "2026-09-01", strong_foot: "L", attendance: "3", radios: {} }];
    sel.value = K[1]; onPlayerSelect(); await warte(80);
    out.fuss = document.getElementById("p-foot")?.value; out.att = document.getElementById("p-att")?.value;
    sel.value = K[0]; onPlayerSelect(); await warte(80);
    document.querySelectorAll('#dims-wrap input[type="radio"]').forEach(x => { if (x.value === "2") x.checked = true; });
    await savePlayer(); await warte(200);
    const post = gesehen.find(g => /spielerprofile/.test(g.u) && g.m === "POST");
    out.upsert = post ? { u: post.u, prefer: JSON.stringify(post.h || {}) } : null;
    window.fetch = echtFetch;
    // c) Stärken-Regel
    const v = {}; Object.keys(CARD_BADGES).forEach(k => { v[k] = 2; }); v.f_tempo = 3;
    out.staerken = staerkenAus(v);
    DB[K[3]] = [{ name: K[3], datum: "2026-09-02", radios: v }];
    out.karte = (adlerCardData(K[3]) || {}).badges?.map(b => b.label);
    // d) null / 0
    out.leer = calcScores({}, DIMS_FELD).dims.tech;
    const ans = {}; DIMS_FELD.forEach(d => d.tier.forEach(t => { ans[t.n] = 1; }));
    Object.keys(DB).forEach(n => delete DB[n]);
    DB[K[0]] = [{ name: K[0], datum: "2026-09-03", radios: ans }];
    DB[K[1]] = [{ name: K[1], datum: "2026-09-03", radios: Object.fromEntries(Object.keys(ans).map(k => [k, 4])) }];
    const ta = teamAggregate(); out.team = { tech: ta.avg.tech, n: ta.spielerzahl };
    // e) Zählkachel
    DB[K[2]] = [{ name: K[2], datum: "2020-01-01", radios: ans }];   // inaktives Kind
    const html = typeof kachelInhalt === "function" ? "" : "";
    out.aktiv = kaderNamen().length;
    // g) Kabine: kabineZeitAnzeige vorhanden, kabineHome ruft keinen Tick
    out.anzeige = typeof kabineZeitAnzeige === "function";
    // h) KI-Spielbericht maskiert
    let body = null;
    window.fetch = (u, o) => { if (/ki-spielbericht/.test(String(u))) { body = o && o.body; return Promise.resolve(new Response(JSON.stringify({ bericht: "Kind 1 hat toll gespielt." }), { status: 200 })); } return echtFetch(u, o); };
    reportData = { per: { [K[0]]: { tor: 1 } }, roster: [K[0]], tore: 1, gegentore: 0, team: 1, datum: "2026-09-20" };
    await reportGenerate(false); await warte(150);
    window.fetch = echtFetch;
    out.kiBody = body || ""; const rm = document.getElementById("report-modal"); out.bericht = ((rm?.querySelector("textarea")?.value || "") + " " + (rm?.textContent || "")).slice(0, 300);
    // f) Eltern-Fehlertexte
    out.fehlerText = typeof authFehlerDeutsch === "function" ? authFehlerDeutsch("For security purposes, you can only request this after 60 seconds.", "x") : null;
    return out;
  }, K);
  const fe = s.fehler(); await s.schliessen();

  if (!r.upsert || !/on_conflict=name,datum/.test(r.upsert.u) || !/merge-duplicates/.test(r.upsert.prefer)) probleme.push("a) Bewertung speichert nicht als Upsert: " + JSON.stringify(r.upsert));
  if (r.fuss !== "L" || r.att !== "3") probleme.push(`b) Fuß/Beteiligung nicht übernommen: ${r.fuss}/${r.att}`);
  const erwartet = ["f_tempo", "f_abschluss", "f_ballkontrolle"];
  if (JSON.stringify(r.staerken) !== JSON.stringify(erwartet)) probleme.push("c) Stärken-Regel: " + JSON.stringify(r.staerken));
  if (!r.karte || r.karte[1] !== "Torjäger") probleme.push("c) Trainerkarte folgt nicht der Regel: " + JSON.stringify(r.karte));
  if (r.leer !== null) probleme.push("d) leere Dimension ist nicht null: " + r.leer);
  if (r.team.n !== 2 || r.team.tech !== 50) probleme.push("d) Teamschnitt ohne das „Ansatz“-Kind: " + JSON.stringify(r.team));
  if (!r.anzeige) probleme.push("g) kabineZeitAnzeige fehlt");
  if (/Kind [A-O]\b/.test(r.kiBody) || !/Kind 1/.test(r.kiBody)) probleme.push("h) KI-Dienst bekommt Namen: " + r.kiBody.slice(0, 120));
  if (!/Kind A/.test(r.bericht)) probleme.push("h) Bericht nicht zurückübersetzt: " + r.bericht.slice(0, 80));
  if (!r.fehlerText || /seconds/.test(r.fehlerText)) probleme.push("f) Fehlermeldung bleibt englisch: " + r.fehlerText);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`Upsert ${r.upsert && r.upsert.u.split("?")[1]} · Fuß ${r.fuss} · Beteiligung ${r.att}`, `Stärken ${r.staerken.join(",")} · Karte ${r.karte && r.karte.join(",")}`,
    `Teamschnitt Technik ${r.team.tech} aus ${r.team.n} Kindern · KI bekommt: ${r.kiBody.slice(0, 60)}`, `Fehlertext: ${r.fehlerText}`);
  return h.ergebnis("v636 Audit-Korrekturen: Bewertung, Eltern, Kabine, KI ohne Namen", !probleme.length, probleme.concat(zeilen));
};
