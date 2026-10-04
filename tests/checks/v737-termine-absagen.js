/* v737 · Termine absagen (Ferien, Zeitraum) und Rückmeldung für alle künftigen Termine
   PO 04.10.: „Anstehende Termine wie Trainings jetzt schon absagen wegen Ferien … mit kurzer Begründung, was die
   Eltern dann sehen“ (Kachel: „Ohne Mitteilung“) und „Die Eltern müssen auch immer schon alle Termine in der
   Zukunft zu- und absagen können.“
   a) Trainer: „Ferien & Zeitraum absagen“ – Herbstferien vorgewählt, nur Trainings im Zeitraum abgehakt, Grund
      „Herbstferien“; ein Tipp schreibt platz_status „abgesagt“ + Grund für genau diese Termine (ein PATCH), keine
      Push-Nachricht; schon abgesagte lassen sich zurücknehmen (platz_status null)
   b) Trainer: „Fällt aus“ steht oben im Termin-Fenster (nicht erst hinter „Für die Eltern“)
   c) Eltern: Text „fällt am … aus“ statt „heute“ für einen späteren Termin
   d) Eltern-Startseite: nächster Termin abgesagt → keine Rückmeldeknöpfe; „Rückmeldung fehlt“ ohne abgesagte
      Termine; die Terminliste zeigt „Fällt aus“
   e) Eltern „Alle Termine“: ganze Saison (mehr als 15), je Kind 👍/🤔/👎 (≥ 44 px), abgesagte ohne Knöpfe mit
      „Fällt aus · Grund“; ein Tipp speichert die Rückmeldung
   f) Kalender-Abo: Trainermeetings raus, abgesagt als CANCELLED (season-ics im Repo); Export der App ebenso */
"use strict";
const fs = require("fs"), path = require("path");
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const T = n => h.tagePlus(n);
  // Herbstferien in 10–23 Tagen; darin drei Trainings, ein Turnier, ein schon abgesagtes Training
  const FERIEN = [{ von: T(10), bis: T(23), name: "Herbstferien" }, { von: T(80), bis: T(95), name: "Weihnachtsferien" }];
  const termine = [
    { id: 1, datum: T(2), typ: "training", titel: "", uhrzeit: "16:45:00", platz_status: "abgesagt", platz_status_note: "Platz gesperrt" },
    { id: 2, datum: T(5), typ: "training", titel: "", uhrzeit: "16:45:00" },
    { id: 3, datum: T(11), typ: "training", titel: "", uhrzeit: "16:45:00" },
    { id: 4, datum: T(13), typ: "turnier", titel: "Herbstturnier", uhrzeit: "10:00:00", heim: false },
    { id: 5, datum: T(14), typ: "training", titel: "", uhrzeit: "16:45:00" },
    { id: 6, datum: T(18), typ: "training", titel: "", uhrzeit: "16:45:00", platz_status: "abgesagt", platz_status_note: "Herbstferien" },
    { id: 7, datum: T(25), typ: "training", titel: "", uhrzeit: "16:45:00" }
  ].concat(Array.from({ length: 14 }, (_, i) => ({ id: 20 + i, datum: T(30 + i * 3), typ: "training", titel: "", uhrzeit: "16:45:00" })));

  // ── a) + b) Trainer ──
  const patches = [];
  const st = await h.starten({ warten: 1200, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(),
    termine: (u, req) => { if (req.method() === "PATCH") { patches.push({ url: decodeURIComponent(u.search), body: JSON.parse(req.postData() || "{}") }); return { status: 204, body: "" }; } return termine; } }) });
  const ra = await st.page.evaluate(async F => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 40 && typeof tmAbsagenOpen !== "function"; i++) await w(100);
    if (typeof tmAbsagenOpen !== "function") return { fehlt: true };
    localStorage.setItem("adler_ferien", JSON.stringify({ at: Date.now(), rows: F })); window._ferien = F;
    const r = await fetch(`${SB_URL}/rest/v1/termine?select=*`, { headers: sbAuthHeaders() }); TM_TERMINE = await r.json();
    window.tmLoad = () => {};
    await tmAbsagenOpen(); await w(200);
    const m = document.getElementById("tm-absagen-modal");
    const haken = () => [...m.querySelectorAll('#tm-ab-liste input[type=checkbox]')].map(c => Number(c.dataset.id) + (c.checked ? "✓" : ""));
    const out = { dialog: m && m.getAttribute("role"), ferien: m.querySelector('.tm-ab-ferien[aria-pressed="true"]')?.textContent.trim(), grund: document.getElementById("tm-ab-grund").value,
      haken: haken(), los: document.getElementById("tm-ab-los").textContent, zurueck: document.getElementById("tm-ab-zurueck").style.display !== "none",
      losH: Math.round(document.getElementById("tm-ab-los").getBoundingClientRect().height) };
    document.getElementById("tm-ab-nur").click(); await w(50); out.mitTurnier = haken();
    document.getElementById("tm-ab-nur").click(); await w(50);
    document.getElementById("tm-ab-los").click(); await w(400);
    out.zu = !document.getElementById("tm-absagen-modal");
    // zurücknehmen: das schon abgesagte Training 6
    await tmAbsagenOpen(); await w(200);
    document.querySelector('#tm-ab-liste input[data-id="6"]').click(); await w(30);
    out.zurueckText = document.getElementById("tm-ab-zurueck").textContent;
    document.getElementById("tm-ab-zurueck").click(); await w(400);
    // b) Termin-Fenster
    await tmDetailOpen(2); await w(300);
    const md = document.getElementById("tmd-modal");
    const oben = document.getElementById("tm-stattfinden-2");
    const details = [...md.querySelectorAll("details")].find(d => /Für die Eltern/.test(d.textContent));
    out.b = { oben: !!oben && /Fällt aus/.test(oben.textContent), inEltern: !!details && /Fällt aus/.test(details.querySelector("div")?.textContent || "") };
    md.remove();
    return out;
  }, FERIEN);
  const ft = st.fehler(); await st.schliessen();
  if (ra.fehlt) probleme.push("a) tmAbsagenOpen fehlt");
  else {
    if (ra.dialog !== "dialog" || !/Herbstferien/.test(ra.ferien || "") || ra.grund !== "Herbstferien") probleme.push(`a) Fenster: ${JSON.stringify(ra)}`);
    if (ra.haken.join(",") !== "3✓,5✓,6") probleme.push(`a) Abgehakt: ${ra.haken.join(",")} statt 3✓,5✓,6 (Trainings im Zeitraum, das abgesagte nicht)`);
    if (!ra.mitTurnier.includes("4✓")) probleme.push(`a) „Nur Trainings“ aus nimmt das Turnier nicht dazu: ${ra.mitTurnier.join(",")}`);
    if (ra.los !== "2 Termine absagen" || ra.losH < 48) probleme.push(`a) Knopf „${ra.los}“ ${ra.losH} px`);
    const p1 = patches[0] || {};
    if (!/id=in\.\(3,5\)/.test(p1.url || "") || p1.body.platz_status !== "abgesagt" || p1.body.platz_status_note !== "Herbstferien" || !ra.zu) probleme.push(`a) PATCH: ${JSON.stringify(p1)}`);
    const p2 = patches[1] || {};
    if (!/id=in\.\(6\)/.test(p2.url || "") || p2.body.platz_status !== null || !/zurücknehmen/.test(ra.zurueckText)) probleme.push(`a) Zurücknehmen: ${JSON.stringify(p2)} „${ra.zurueckText}“`);
    zeilen.push(`a) Herbstferien: Trainings 3 und 5 abgehakt, Grund „Herbstferien“ → ein PATCH id=in.(3,5); Training 6 zurückgenommen`);
    if (!ra.b.oben || ra.b.inEltern) probleme.push(`b) „Fällt aus“ im Termin-Fenster: ${JSON.stringify(ra.b)}`);
    zeilen.push(`b) „Fällt aus“ oben im Termin-Fenster, nicht mehr hinter „Für die Eltern“`);
  }
  if (ft.length) probleme.push("Konsole Trainer: " + ft.slice(0, 2).join(" | "));

  // ── c)–e) Eltern ──
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const rueck = [], abfragen = [];
  const se = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
    eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
    termine: u => { abfragen.push(decodeURIComponent(u.search)); const m = /limit=(\d+)/.exec(u.search); return m ? termine.slice(0, Number(m[1])) : termine; },
    rueckmeldungen: (u, req) => { if (req.method() === "POST") { rueck.push(JSON.parse(req.postData() || "{}")); return { status: 201, body: "[]" }; } return []; },
    team_config: [{ spenden_link: "" }],
    rpc: { eltern_news: {}, training_rueckblick: [], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false } }) });
  await se.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await se.page.reload({ waitUntil: "networkidle" }); await se.page.waitForTimeout(3500);
  const re = await se.page.evaluate(async T5 => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const karte = document.getElementById("termin-card"), offen = document.getElementById("eltern-offen-card");
    const out = { d: { karte: karte ? karte.textContent.replace(/\s+/g, " ") : "", knoepfe: karte ? [...karte.querySelectorAll("button")].filter(b => /Zusage|Absage|Unsicher/.test(b.textContent)).length : -1,
      offenIds: offen ? (offen.innerHTML.match(/terminDetailOpen\((\d+)\)/g) || []).join(",") : "" } };
    out.c = typeof elternPlatzHinweisHtml === "function" ? elternPlatzHinweisHtml({ platz_status: "abgesagt", platz_status_note: "Herbstferien", datum: T5 }).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ") : "";
    await elternTermineOpen(); await w(800);
    const m = document.getElementById("et-modal");
    const zeilen = [...m.querySelectorAll(".et-termin")];
    const z = id => m.querySelector(`.et-termin[data-id="${id}"]`);
    out.e = { anzahl: zeilen.length, knoepfe2: z(2) ? z(2).querySelectorAll(".et-rsvp").length : -1, knoepfe1: z(1) ? z(1).querySelectorAll(".et-rsvp").length : -1,
      text1: z(1) ? z(1).textContent.replace(/\s+/g, " ") : "", h: z(2) ? Math.min(...[...z(2).querySelectorAll(".et-rsvp")].map(b => Math.round(b.getBoundingClientRect().height))) : 0,
      spaet: !!z(33) };
    z(33)?.querySelector('.et-rsvp')?.click(); await w(800);
    out.e.nach = document.querySelector('#et-modal .et-termin[data-id="33"] .et-rsvp[aria-pressed="true"]') ? "ok" : "";
    return out;
  }, T(5));
  const fe = se.fehler(); await se.schliessen();
  if (!/fällt am \w\w \d\d\.\d\d\. aus/.test(re.c) || /heute/.test(re.c)) probleme.push(`c) Text: „${re.c}“`);
  zeilen.push(`c) „${(re.c.match(/Der Termin fällt am [^.]+\.[^.]+\. aus/) || [""])[0]}“`);
  if (re.d.knoepfe !== 0 || !/Fällt aus/.test(re.d.karte)) probleme.push(`d) Nächster Termin abgesagt, aber Rückmeldeknöpfe: ${re.d.knoepfe} · „${re.d.karte.slice(0, 120)}“`);
  if (/terminDetailOpen\(1\)/.test(re.d.offenIds)) probleme.push(`d) „Rückmeldung fehlt“ fragt den abgesagten Termin ab: ${re.d.offenIds}`);
  zeilen.push(`d) nächster Termin „Fällt aus“ ohne Rückmeldeknöpfe, nicht unter „Rückmeldung fehlt“`);
  if (re.e.anzahl < 20 || !re.e.spaet || !abfragen.some(a => /limit=300/.test(a))) probleme.push(`e) ganze Saison: ${re.e.anzahl} Termine (Abfragen ${abfragen.length})`);
  if (re.e.knoepfe2 !== 3 || re.e.knoepfe1 !== 0 || !/Fällt aus · Platz gesperrt/.test(re.e.text1) || re.e.h < 44) probleme.push(`e) Knöpfe/Absage: ${JSON.stringify(re.e)}`);
  if (!rueck.some(x => x.termin_id === 33 && x.spieler_id === 1 && x.status === "zugesagt")) probleme.push(`e) Zusage für Termin 33 nicht gespeichert: ${JSON.stringify(rueck)}`);
  zeilen.push(`e) „Alle Termine“: ${re.e.anzahl} Termine, je Kind 3 Knöpfe (${re.e.h} px), abgesagt „Fällt aus · Platz gesperrt“ ohne Knöpfe, Zusage für einen späten Termin gespeichert`);
  if (fe.length) probleme.push("Konsole Eltern: " + fe.slice(0, 2).join(" | "));
  // f) Kalender
  const ics = fs.readFileSync(path.join(h.REPO, "supabase/functions/season-ics/index.ts"), "utf8");
  const ep = fs.readFileSync(path.join(h.REPO, "md-eltern-portal.js"), "utf8");
  if (!/neq\("typ", "trainermeeting"\)/.test(ics) || !/STATUS:CANCELLED/.test(ics) || !/STATUS:CANCELLED/.test(ep)) probleme.push("f) Kalender: Trainermeetings oder Absage nicht berücksichtigt");
  zeilen.push("f) Kalender-Abo ohne Trainermeetings, abgesagte als CANCELLED (Abo und Export)");
  return h.ergebnis("v737 Termine absagen (Ferien, Zeitraum) und Rückmeldung für alle künftigen Termine", !probleme.length, zeilen.concat(probleme));
};
