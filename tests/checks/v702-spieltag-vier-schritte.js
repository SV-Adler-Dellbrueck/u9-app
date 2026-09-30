/* v702 · Spieltag in vier Schritten, Termin-Karte, Fehlerbehebungen
   PO 30.09. (Kinderfestival auswärts): „die ganze Ansicht vom Spieltag … sehr verzweigt in den
   Kacheln, man fühlt sich verloren“ – Kacheln: „Eine Seite, 4 Schritte“, „Die Woche davor“.

   a) Kapitän: gezählt wird nur ein VERGANGENER Spieltag; eine Wahl für Samstag zählt nicht
   b) „Wer kommt?“: oben, wer noch keine Antwort hat; Liste offen, Offene zuerst; „Offene per
      Push erinnern“ schickt push-send art „rsvp_offen“ mit dem Termin – nicht an alle Eltern
   c) Termin-Karte: auswärts „Spielplan hinzufügen“ (Link speichern → termine.turnierplan_url),
      kein Turnier-Modus-Banner; heim „Festival planen“
   d) Wechsel: 15 Sekunden vorher vibriert es einmal ([200,100,200]), nicht in jeder Sekunde
   e) Match-Uhr am Handy (360 px): Minute und Phase in einer Zeile, Knöpfe darunter, nichts ragt raus
   f) Tipp auf einen Spieltag in „Diese Woche“ führt auf die Spieltag-Seite: dieses Datum, „Wer kommt?“
   g) Startseite: Heimspiel in den nächsten sechs Tagen → Karte; nur Auswärtsspiele → keine
   h) „Spieltag bei uns“ nur, wenn der NÄCHSTE Spieltag ein Heimspiel ist
   i) Termin-Fenster eines Auswärtsturniers: kein „Turnier-Modus“, dafür „Zum Spieltag“ und „Spielplan“ */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const K = h.KINDER;
  const in3 = h.tagePlus(3), in10 = h.tagePlus(10), vor7 = h.tagePlus(-7);
  const kader = h.kaderZeilen();
  const termine = [
    { id: 72, datum: in3, typ: "turnier", titel: "Kinderfestival · Gastgeber A", gegner: "Gastgeber A", heim: false, uhrzeit: "10:00:00", treffzeit: "09:15", ort: "Sportplatz A", trainer_status: {} },
    { id: 76, datum: in10, typ: "turnier", titel: "Kinderfestival · Heim", gegner: "Kinderfestival · Heim", heim: true, uhrzeit: "10:00:00", trainer_status: {} }
  ];
  const q = (u, k) => u.searchParams.getAll(k);
  const termineFn = (u, req) => {
    if (req.method() === "PATCH") { const id = (u.searchParams.get("id") || "").slice(3); const t = termine.find(x => String(x.id) === id); if (t) Object.assign(t, JSON.parse(req.postData() || "{}")); patches.push(JSON.parse(req.postData() || "{}")); return { status: 204, body: "" }; }
    let l = termine.slice();
    for (const v of q(u, "datum")) {
      if (v.startsWith("gte.")) l = l.filter(t => t.datum >= v.slice(4));
      else if (v.startsWith("lte.")) l = l.filter(t => t.datum <= v.slice(4));
      else if (v.startsWith("eq.")) l = l.filter(t => t.datum === v.slice(3));
    }
    if (u.searchParams.get("heim") === "is.true") l = l.filter(t => t.heim === true);
    const id = u.searchParams.get("id"); if (id) l = l.filter(t => "eq." + t.id === id);
    const lim = Number(u.searchParams.get("limit") || 0); if (lim) l = l.slice(0, lim);
    return l;
  };
  const patches = [], pushAnfragen = [];
  const rm = [{ spieler_id: kader[0].id, status: "zugesagt" }, { spieler_id: kader[1].id, status: "abgesagt" }];
  const s = await h.starten({ breite: 360, hoehe: 900, warten: 1200, supabase: h.supabaseAttrappe({
    kader, termine: termineFn, nominierungen: [], anwesenheit: [], matchday: [], heimturnier: [],
    rueckmeldungen: (u) => (u.searchParams.get("termin_id") === "eq.72" ? rm : []),
    match_actions: (u) => (u.searchParams.get("aktion") === "eq.kapitaen"
      ? [{ spieler: K[0], datum: in3 }, { spieler: K[1], datum: vor7 }, { spieler: K[2], datum: in3 + "__t2" }] : []),
    funktionen: { "push-send": (u, req) => { pushAnfragen.push(JSON.parse(req.postData() || "{}")); return { ok: true, familien: 13, offen: 13, sent: 4 }; } }
  }) });
  await h.sichtbarMachen(s.page, "#main-app");
  const r = await s.page.evaluate(async ({ K, in3, in10 }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const bis = async (f, n) => { for (let i = 0; i < (n || 60) && !f(); i++) await warte(50); return f(); };
    if (typeof spieltagZuTermin !== "function" || typeof spieltagKopfRender !== "function" || typeof rsvpOffeneErinnern !== "function") return { fehlt: true };
    await loadKader();
    const out = {};
    // f) Tipp in „Diese Woche“
    wocheOpen(72, in3, "turnier");
    await bis(() => (document.getElementById("spieltag-date") || {}).value === in3 && document.getElementById("nom-ohne-antwort"), 80);
    await warte(300);
    out.f = { datum: document.getElementById("spieltag-date").value, offen: (document.getElementById("mt-phase-wer") || {}).open === true,
              gedrueckt: [...document.querySelectorAll("#mt-phasen .phase-kachel")].filter(b => b.getAttribute("aria-pressed") === "true").map(b => b.dataset.phase).join(",") };
    // b) Wer kommt?
    const oa = document.getElementById("nom-ohne-antwort");
    out.b = { block: oa ? oa.textContent.replace(/\s+/g, " ").trim() : "", listeOffen: (document.getElementById("nom-dabei") || {}).open === true };
    const namen = [...document.querySelectorAll("#nom-dabei span[style*='flex:1']")].map(x => x.textContent.trim());
    out.b.erste = namen[0] || ""; out.b.letzte2 = namen.slice(-2);
    const er = document.getElementById("nom-erinnern");
    out.b.knopf = er ? Math.round(er.getBoundingClientRect().height) : 0;
    if (er) { er.click(); await warte(200); }
    // a) Kapitän
    out.a = { count: Object.assign({}, KAP_COUNT), heute: Object.assign({}, KAP_HEUTE) };
    // c) Termin-Karte auswärts
    const kopf = document.getElementById("st-kopf");
    out.c = { kopf: kopf ? kopf.textContent.replace(/\s+/g, " ").trim() : "", banner: document.getElementById("spieltag-turnier-banner").hidden };
    spieltagPlanOpen(); await warte(50);
    const url = document.getElementById("st-plan-url");
    if (url) { url.value = "https://beispiel.de/spielplan"; await spieltagPlanUrlSpeichern(null); await warte(50); }
    out.c.dialog = !!document.getElementById("st-plan-modal") && document.getElementById("st-plan-modal").getAttribute("role") === "dialog";
    out.c.nachher = (document.getElementById("st-kopf") || {}).textContent || "";
    document.getElementById("st-plan-modal")?.remove();
    // c) heim
    document.getElementById("spieltag-date").value = in10; spieltagKopfRender();
    out.c.heim = (document.getElementById("st-kopf") || {}).textContent.replace(/\s+/g, " ").trim();
    document.getElementById("spieltag-date").value = in3;
    // d) Vibration
    const vib = []; navigator.vibrate = x => { vib.push(JSON.stringify(x)); return true; };
    rotIntervalMin = 1; rotElapsed = 43; rotTick(); rotTick(); rotTick();   // Rest 16 → 15 → 14 … bei 45 genau einmal
    out.d = vib.slice();
    // e) Match-Uhr
    spieltagPhaseZeigen("live"); await warte(100);
    if (typeof mcState === "undefined" || !mcState) window.mcState = { clock_status: "running", half: 1, started_at: new Date(Date.now() - 180000).toISOString(), paused_ms: 0 };
    else Object.assign(mcState, { clock_status: "running", half: 1, started_at: new Date(Date.now() - 180000).toISOString(), paused_ms: 0 });
    mcRenderLive(); await warte(50);
    const box = document.getElementById("mc-panel"), kopfU = box && box.querySelector(".mc-kopf"), kn = box && box.querySelector(".mc-knoepfe");
    out.e = kopfU && kn ? { kopfH: Math.round(kopfU.getBoundingClientRect().height), knUnter: kn.getBoundingClientRect().top >= kopfU.getBoundingClientRect().bottom - 1,
      raus: box.scrollWidth > box.clientWidth + 1, knoepfe: [...kn.querySelectorAll("button")].map(b => Math.round(b.getBoundingClientRect().height)) } : null;
    // g) Startseite
    go("home"); await warte(400); await homeHeimspielLoad(); await warte(50);
    out.g = { karte: !!document.getElementById("home-heimspiel-karte") };
    // h) Spieltag bei uns
    go("ue-spieltag"); await warte(400); await _kachelTurnierCheck(); await warte(50);
    out.h = (document.getElementById("kachel-turnier") || {}).textContent || "";
    // i) Termin-Fenster
    out.i = typeof _tmdKarte === "function" ? _tmdKarte({ id: 72, datum: in3, typ: "turnier", titel: "Kinderfestival", heim: false }).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ") : "";
    return out;
  }, { K, in3, in10 }).catch(e => ({ fehler: String(e) }));
  const fe = s.fehler(); await s.schliessen();
  const titel = "v702 Spieltag in vier Schritten, Termin-Karte, Kapitän, Erinnern, Vibration";
  if (r.fehlt) return h.ergebnis(titel, false, ["Funktionen fehlen (spieltagZuTermin/spieltagKopfRender/rsvpOffeneErinnern)"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Abbruch: " + r.fehler]);

  // a)
  if (r.a.count[K[0]] || r.a.count[K[2]]) probleme.push("a) Wahl für einen kommenden Spieltag zählt schon: " + JSON.stringify(r.a.count));
  if (r.a.count[K[1]] !== 1) probleme.push("a) Vergangener Spieltag zählt nicht: " + JSON.stringify(r.a.count));
  if (r.a.heute[1] !== K[0] || r.a.heute[2] !== K[2]) probleme.push("a) Kapitäne des Tages fehlen: " + JSON.stringify(r.a.heute));
  // b)
  if (!/Noch keine Antwort der Eltern · 13/.test(r.b.block) || r.b.block.includes(K[0]) || !r.b.block.includes(K[2])) probleme.push("b) Block ohne Antwort: " + r.b.block.slice(0, 120));
  if (!r.b.listeOffen) probleme.push("b) Liste ist zugeklappt");
  if (r.b.erste !== K[2] && !r.b.erste.includes(K[2])) probleme.push("b) Offene stehen nicht zuerst: " + r.b.erste);
  if (r.b.knopf < 48) probleme.push("b) Erinnern-Knopf " + r.b.knopf + " px");
  const pa = pushAnfragen[0] || {};
  if (pa.art !== "rsvp_offen" || pa.termin_id !== 72 || pa.audience) probleme.push("b) push-send: " + JSON.stringify(pushAnfragen));
  // c)
  if (!/Auswärts/.test(r.c.kopf) || !/Treff 09:15/.test(r.c.kopf) || !/Spielplan hinzufügen/.test(r.c.kopf) || /Turnier-Modus/.test(r.c.kopf)) probleme.push("c) Kopf auswärts: " + r.c.kopf);
  if (!r.c.banner) probleme.push("c) Turnier-Modus-Banner sichtbar");
  if (!patches.some(p => p.turnierplan_url === "https://beispiel.de/spielplan")) probleme.push("c) Link nicht gespeichert: " + JSON.stringify(patches));
  if (!r.c.dialog || !/Spielplan da/.test(r.c.nachher)) probleme.push("c) Nach dem Speichern: " + JSON.stringify({ d: r.c.dialog, k: r.c.nachher.slice(0, 80) }));
  if (!/Heim/.test(r.c.heim) || !/Festival planen/.test(r.c.heim)) probleme.push("c) Kopf heim: " + r.c.heim);
  // d)
  if (JSON.stringify(r.d) !== JSON.stringify(["[200,100,200]"])) probleme.push("d) Vibration: " + JSON.stringify(r.d));
  // e)
  if (!r.e || !r.e.knUnter || r.e.raus || r.e.knoepfe.some(x => x < 48)) probleme.push("e) Match-Uhr: " + JSON.stringify(r.e));
  // f)
  if (r.f.datum !== in3 || !r.f.offen || r.f.gedrueckt !== "wer") probleme.push("f) Tipp auf den Termin: " + JSON.stringify(r.f));
  // g) – Heim erst in 10 Tagen: keine Karte (Woche davor = sechs Tage)
  if (r.g.karte) probleme.push("g) Heimspiel-Karte, obwohl das Heimspiel erst in 10 Tagen ist");
  // h)
  if (/Spieltag bei uns/.test(r.h)) probleme.push("h) „Spieltag bei uns“ steht, obwohl der nächste Spieltag auswärts ist");
  // i)
  if (/Turnier-Modus/.test(r.i) || !/Zum Spieltag/.test(r.i) || !/Spielplan/.test(r.i)) probleme.push("i) Termin-Fenster: " + r.i.slice(0, 160));
  // Server
  const ps = fs.readFileSync(path.join(h.REPO, "supabase/functions/push-send/index.ts"), "utf8");
  if (!/body\.art === "rsvp_offen"/.test(ps) || !/rueckmeldungen/.test(ps)) probleme.push("push-send kennt rsvp_offen nicht");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));

  zeilen.push(`a) Kapitän gezählt ${JSON.stringify(r.a.count)} · b) ${r.b.block.slice(0, 44)}… → push-send ${pa.art} #${pa.termin_id}`);
  zeilen.push(`c) ${r.c.kopf.slice(0, 70)} · d) Vibration ${r.d} · e) Uhr: Knöpfe ${r.e && r.e.knoepfe} px darunter · f) ${r.f.datum}/${r.f.gedrueckt}`);
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
