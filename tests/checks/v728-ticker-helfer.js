/* v728 · Ticker-Helfer: aus der Trainer-App freischalten oder unter „Wer hilft mit?“ eintragen.
   PO 03.10.: „den Elternteil direkt aus der Trainer-App benennen … bekommt dann eine Nachricht in der
   Eltern-App und den Zugang zum Ticker“ (Kachel: eingeben und bedienen) und „der Ticker sollte in die
   Helferliste … als Helfereintragung“.
   a) Eltern: liefert mein_ticker_helfer einen Eintrag, steht – auch bei Ticker aus – „Du bist heute
      Ticker-Helfer“ mit „Ticker bedienen“ (?delegate=<Code>) und „Ticker ansehen“, Knöpfe ≥ 44 px
   b) Trainer: „Elternteil als Ticker-Helfer freischalten“ listet zuerst, wer sich unter „Wer hilft mit?“ für
      „📻 Live-Ticker“ gemeldet hat, dann die übrigen Elternkonten (Kind statt Adresse);
      ein Tipp schreibt ticker_helfer (Datum, Team 1, E-Mail) als Upsert auf (datum, team) – je Team genau
      eine Person (PO 03.10.) – und ruft push-send mit art „ticker_helfer“
   c) Trainer, Auswärtsturnier: unter den Helferaufgaben steht neben „Betreuung“ auch „Live-Ticker“ */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const heute = h.heute();
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  // a) Eltern
  const basis = h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
    eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
    termine: [{ id: 91, datum: heute, typ: "turnier", titel: "Testturnier", uhrzeit: "23:00:00", heim: false, ort: "Teststraße 1, 50000 Köln" }],
    rueckmeldungen: [], team_config: [{ spenden_link: "" }], matchday: [{ datum: heute, ticker_open: false }], ticker_events: [],
    rpc: { eltern_news: {}, training_rueckblick: [], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false,
      kind_team: { ok: true, team: 1, anzahl: 1, trainer: [] },
      mein_ticker_helfer: [{ team: 1, schluessel: heute, token: "11111111-2222-3333-4444-555555555555", ticker_open: false }] } });
  const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 390, hoehe: 844, supabase: basis });
  await s.page.evaluate(tk => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: tk, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(4500);
  const ra = await s.page.evaluate(() => {
    const box = document.getElementById("eltern-helfer-box"); if (!box) return null;
    const b = [...box.querySelectorAll("button")];
    return { text: box.textContent.replace(/\s+/g, " "), knoepfe: b.map(x => ({ t: x.textContent.trim(), on: x.getAttribute("onclick"), h: Math.round(x.getBoundingClientRect().height) })) };
  });
  const fa = s.fehler(); await s.schliessen();
  if (!ra) probleme.push("a) kein Helfer-Kasten");
  else {
    const bed = ra.knoepfe.find(k => /Ticker bedienen/.test(k.t)), an = ra.knoepfe.find(k => /Ticker ansehen/.test(k.t));
    if (!/Du bist Ticker-Helfer/.test(ra.text) || !bed || !an) probleme.push("a) " + JSON.stringify(ra).slice(0, 240));
    else if (!/delegate=/.test(bed.on) || !/11111111-2222-3333-4444-555555555555/.test(bed.on)) probleme.push("a) Bedienen-Ziel: " + bed.on);
    else if (ra.knoepfe.some(k => k.h < 44)) probleme.push("a) Knopfhöhen " + ra.knoepfe.map(k => k.h).join("/"));
    else zeilen.push(`a) Eltern, Ticker aus: „Du bist Ticker-Helfer“, „Ticker bedienen“ (Helfer-Code) und „Ticker ansehen“, ${ra.knoepfe.map(k => k.h).join("/")} px`);
  }
  // b) c) Trainer
  const posts = [], pushes = [];
  const t = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(),
    eltern_kinder: [{ email: "eltern@example.org", spieler_id: 1, label: "Mama" }, { email: "zwei@example.org", spieler_id: 2, label: "" }],
    termine: [{ id: 91, datum: heute, typ: "turnier" }],
    event_helfer: [{ user_id: "u2", created_at: "2026-10-01T10:00:00Z" }],
    profiles: (u) => /email/.test(u.search) ? [{ id: "u2", email: "zwei@example.org" }] : [{ role: "trainer" }],
    ticker_helfer: (u, req) => { if (req.method() === "POST") { posts.push(Object.assign(JSON.parse(req.postData() || "null") || {}, { _q: u.search })); return { status: 201, body: "" }; } return []; },
    funktionen: { "push-send": (u, req) => { pushes.push(JSON.parse(req.postData() || "{}")); return { ok: true, sent: 1 }; } } }) });
  const rb = await t.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 40 && typeof tickerHelferOeffnen !== "function"; i++) await w(100);
    if (typeof tickerHelferOeffnen !== "function") return { fehlt: true };
    if (typeof loadKader === "function") await loadKader();
    await tickerHelferOeffnen(); await w(200);
    const m = document.getElementById("th-modal");
    const knoepfe = m ? [...m.querySelectorAll("button")].map(b => b.textContent.trim()) : [];
    const rolle = m && m.getAttribute("role");
    const ziel = m && [...m.querySelectorAll("button")].find(b => /Kind A/.test(b.textContent));
    if (ziel) { ziel.click(); await w(400); }
    // c) Helferaufgaben auswärts
    const html = typeof tmHelferFreigabeHtml === "function" ? tmHelferFreigabeHtml({ typ: "turnier", heim: false, helfer_aufgaben: [] }) : "";
    return { knoepfe, rolle, html };
  });
  const ft = t.fehler(); await t.schliessen();
  if (rb.fehlt) probleme.push("b) tickerHelferOeffnen fehlt");
  else {
    if (rb.rolle !== "dialog" || !rb.knoepfe.some(k => /Mama von Kind A/.test(k)) || rb.knoepfe.some(k => /@/.test(k) && /Kind/.test(k))) probleme.push("b) Liste: " + JSON.stringify(rb.knoepfe));
    else if (rb.knoepfe.filter(k => k !== "✕")[0] !== "Eltern von Kind B") probleme.push("b) Gemeldete nicht oben: " + JSON.stringify(rb.knoepfe));
    else if (posts.length !== 1 || posts[0].email !== "eltern@example.org" || posts[0].team !== 1 || !/^\d{4}-\d{2}-\d{2}$/.test(posts[0].datum)) probleme.push("b) ticker_helfer: " + JSON.stringify(posts));
    else if (!/on_conflict=datum,team(&|$)/.test(posts[0]._q)) probleme.push("b) je Team nur eine Person – Upsert auf (datum, team) fehlt: " + posts[0]._q);
    else if (pushes.length !== 1 || pushes[0].art !== "ticker_helfer" || pushes[0].email !== "eltern@example.org") probleme.push("b) push-send: " + JSON.stringify(pushes));
    else zeilen.push("b) Trainer: Gemeldete oben („Eltern von Kind B“), dann weitere Eltern; Tipp schreibt ticker_helfer und schickt push-send „ticker_helfer“");
    if (!/Betreuung/.test(rb.html) || !/Live-Ticker/.test(rb.html)) probleme.push("c) Helferaufgaben auswärts: " + rb.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 200));
    else zeilen.push("c) Auswärtsturnier: „Betreuung“ und „Live-Ticker“ als Helferaufgabe");
  }
  const f = [].concat(fa, ft); if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  return h.ergebnis("v728 Ticker-Helfer: freischalten oder eintragen, „Ticker bedienen“ in der Eltern-App", !probleme.length, zeilen.concat(probleme));
};
