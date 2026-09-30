/* v699 · Mannschaftskasse: alle Eltern lesen, die Kasse bucht – mit Datum, Kategorie und Beleg
   PO 30.09.: „Kachel Mannschaftskasse, in der alle Eltern Leserechte haben. Milja soll eine extra
   Kachel haben, wo sie die Kontobewegungen eintragen und Ausgaben festhalten kann – damit die Eltern
   immer den aktuellen Kontostand sehen und alle Ausgaben, für was und wann.“ Kacheln: Beiträge
   fließen automatisch ein; Belege gleich mitbauen.
   a) Eltern-Startseite: Kachel „Mannschaftskasse“ mit Kassenstand; „Kasse führen“ nur für die Kasse
   b) Übersicht (Dialog): Kassenstand, Einnahmen/Ausgaben, jede Bewegung mit Datum, Kategorie, Zweck;
      Beiträge als Sammelposten ohne Namen; „Beleg vorhanden“ statt Beleg; keine Bearbeiten-Knöpfe;
      Filter „Ausgaben“; Ausgaben je Kategorie; Beitrag mit Stand des eigenen Kindes und PayPal
   c) Kasse bucht: Datum, Kategorie, Zweck mit Namens-Hinweis, Beleg → Upload in „kasse-belege“,
      Buchung trägt Betrag (Ausgabe negativ), Datum, Kategorie, Beleg
   d) Bearbeiten füllt das Formular und speichert per PATCH mit geaendert_am
   e) Umlage mit Zahlungen lässt sich nicht löschen (nur deaktivieren)
   f) Export: Kategorie, Beleg, Sammelposten, Summen, Kassenstand
   g) Datenbank: eigener Bucket „kasse-belege“ nur für is_kasse, Eltern lesen Buchungen, Sammelposten */
"use strict";
const fs = require("fs"), path = require("path");
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const summary = { saldo: 152.5, umlagen: [{ id: 7, titel: "Saisonbeitrag", betrag: 40, faellig: "2026-10-31", paypal_link: "https://paypal.me/beispiel" }],
    sammel: [{ id: 7, titel: "Saisonbeitrag", betrag: 40, anzahl: 2, summe: 80, datum: "2026-09-28" }] };
  const buchungen = [{ id: 1, datum: "2026-09-01", betrag: 100, zweck: "Übertrag Vorsaison", kategorie: "uebertrag", beleg: null },
    { id: 2, datum: "2026-09-20", betrag: -27.5, zweck: "Eis nach dem Turnier", kategorie: "feiern", beleg: "abc.jpg" }];
  async function eltern(istKasse, schreib) {
    const basis = h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
      termine: [], rueckmeldungen: [], kasse_zahlung: [{ umlage_id: 7, spieler_id: 1, bezahlt_am: "2026-09-28" }],
      kasse_umlagen: [{ id: 7, titel: "Saisonbeitrag", betrag: 40, faellig: "2026-10-31", paypal_link: null, aktiv: true }],
      team_config: [{ spenden_link: "" }],
      rpc: { kasse_summary: summary, is_kasse: istKasse, kasse_uebersicht: { kinder: [{ id: 1, name: "Kind A" }, { id: 2, name: "Kind B" }], zahlungen: [{ u: 7, s: 1, am: "2026-09-28" }, { u: 7, s: 2, am: "2026-09-27" }] } },
      teamkasse: (u, req) => { if (req.method() !== "GET") { schreib.push({ m: req.method(), url: u.pathname + u.search, body: req.postData() }); return { status: 201, body: "[]" }; } return buchungen; } });
    const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 390, hoehe: 844,
      supabase: (u, req) => { if (/\/storage\/v1\/object\//.test(u.pathname)) { schreib.push({ m: req.method(), url: u.pathname, body: "" }); return { status: 200, body: "{}" }; } return basis(u, req); } });
    await s.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
    await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(4000);
    return s;
  }
  // ── a) + b) normales Elternteil ──
  const s1 = await eltern(false, []);
  const r = await s1.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 40 && typeof mannschaftskasseOpen !== "function"; i++) await w(100);
    const out = {}, txt = e => e ? e.textContent.replace(/\s+/g, " ").trim() : "";
    const k = document.getElementById("mannschaftskasse-kachel");
    out.a = { kachel: txt(k), h: k ? Math.round(k.getBoundingClientRect().height) : 0, fuehren: !!document.getElementById("kasse-fuehren-kachel"),
      altKarte: /Kassenstand:/.test(txt(document.getElementById("cat-mehr"))) };
    k?.click(); for (let i = 0; i < 30 && !document.querySelector("#mk-modal .kasse-zeile"); i++) await w(100); await w(400);
    const m = document.getElementById("mk-modal");
    out.b = { role: m && m.getAttribute("role"), modal: m && m.getAttribute("aria-modal"), text: txt(m), zeilen: m ? m.querySelectorAll(".kasse-zeile").length : 0,
      bearbeiten: m ? m.querySelectorAll('[aria-label="Bearbeiten"],[aria-label="Löschen"]').length : -1,
      paypal: !!(m && m.querySelector('a[href^="https://paypal.me"]')), stand: txt(m && m.querySelector(".kz-stand")) };
    m?.querySelector('.mk-filter[data-f="aus"]')?.click(); await w(100);
    out.b.aus = m ? m.querySelectorAll("#mk-liste .kasse-zeile").length : 0;
    out.b.ausGedrueckt = m?.querySelector('.mk-filter[data-f="aus"]')?.getAttribute("aria-pressed");
    return out;
  });
  const f1 = s1.fehler(); await s1.schliessen();
  // ── c)–f) Kasse ──
  const schreib = [];
  const s2 = await eltern(true, schreib);
  await s2.page.evaluate(async () => { const w = ms => new Promise(x => setTimeout(x, ms)); for (let i = 0; i < 40 && !document.getElementById("kasse-fuehren-kachel"); i++) await w(100); document.getElementById("kasse-fuehren-kachel")?.click(); for (let i = 0; i < 40 && !document.getElementById("k-form"); i++) await w(100); await w(800); });
  const vor = await s2.page.evaluate(() => {
    const m = document.getElementById("kasse-modal"), txt = e => e ? e.textContent.replace(/\s+/g, " ").trim() : "";
    return { role: m && m.getAttribute("role"), text: txt(m), kat: document.querySelectorAll("#k-kat option").length, datum: !!document.getElementById("k-datum"),
      hinweis: /keine Namen von Kindern oder Familien/.test(txt(m)), beleg: m ? m.querySelectorAll('[aria-label="Beleg ansehen"]').length : 0,
      bearb: m ? m.querySelectorAll('[aria-label="Bearbeiten"]').length : 0, zeilen: m ? m.querySelectorAll(".kasse-zeile").length : 0,
      knopfH: Math.round(document.getElementById("k-speichern")?.getBoundingClientRect().height || 0) };
  });
  await s2.page.selectOption("#k-typ", "-1"); await s2.page.fill("#k-betrag", "12.50"); await s2.page.fill("#k-datum", "2026-09-25");
  await s2.page.selectOption("#k-kat", "ausruestung"); await s2.page.fill("#k-zweck", "Hütchen");
  await s2.page.setInputFiles("#k-beleg", { name: "quittung.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%Test\n") });
  await s2.page.click("#k-speichern"); await s2.page.waitForTimeout(800);
  const nachNeu = schreib.slice();
  await s2.page.evaluate(() => kasseBuchungBearbeiten(2)); await s2.page.waitForTimeout(200);
  const form = await s2.page.evaluate(() => ({ betrag: document.getElementById("k-betrag").value, kat: document.getElementById("k-kat").value, typ: document.getElementById("k-typ").value, knopf: document.getElementById("k-speichern").textContent }));
  await s2.page.fill("#k-zweck", "Eis nach dem Turnier (korrigiert)"); await s2.page.click("#k-speichern"); await s2.page.waitForTimeout(800);
  const nachEdit = schreib.slice(nachNeu.length);
  const r2 = await s2.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 30 && !window._kasseUebersicht; i++) await w(100);
    const toasts = []; const t0 = window.toast; window.toast = (m, a) => { toasts.push(m); };
    await kasseDelUmlage(7); window.toast = t0;
    let csv = ""; const c0 = URL.createObjectURL; URL.createObjectURL = b => { b.text().then(t => { csv = t; }); return "blob:x"; };
    const a0 = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () {};
    kasseExport(); await w(200); URL.createObjectURL = c0; HTMLAnchorElement.prototype.click = a0;
    return { toasts, csv };
  });
  const f2 = s2.fehler(); await s2.schliessen();
  // ── Auswertung ──
  if (f1.length) probleme.push("Konsole Eltern: " + f1.slice(0, 2).join(" | "));
  if (f2.length) probleme.push("Konsole Kasse: " + f2.slice(0, 2).join(" | "));
  if (!/Mannschaftskasse/.test(r.a.kachel) || !/152,50/.test(r.a.kachel) || r.a.h < 44) probleme.push(`a) Kachel: ${JSON.stringify(r.a)}`);
  if (r.a.fuehren) probleme.push("a) „Kasse führen“ bei normalem Elternteil");
  if (r.a.altKarte) probleme.push("a) alte Teamkasse-Karte steht noch unter „Mehr vom Team“");
  const b = r.b;
  if (b.role !== "dialog" || b.modal !== "true") probleme.push(`b) Dialog: ${b.role}/${b.modal}`);
  if (!/152,50/.test(b.text) || !/Einnahmen \+ 180,00/.test(b.text) || !/Ausgaben − 27,50/.test(b.text)) probleme.push(`b) Summen: „${b.text.slice(0, 160)}“`);
  if (b.zeilen !== 3 || !/Saisonbeitrag – 2 Familien/.test(b.text) || !/20\.09\.2026/.test(b.text) || !/Feiern/.test(b.text) || !/Beleg vorhanden/.test(b.text)) probleme.push(`b) Liste: ${b.zeilen} Zeilen`);
  if (b.bearbeiten !== 0) probleme.push(`b) Eltern sehen ${b.bearbeiten} Bearbeiten/Löschen-Knöpfe`);
  if (!b.paypal || !/bezahlt/.test(b.stand)) probleme.push(`b) Beitrag: PayPal ${b.paypal}, Stand „${b.stand}“`);
  if (b.aus !== 1 || b.ausGedrueckt !== "true") probleme.push(`b) Filter Ausgaben: ${b.aus} Zeilen, aria-pressed ${b.ausGedrueckt}`);
  if (!/Ausgaben nach Kategorie/.test(b.text)) probleme.push("b) Ausgaben nach Kategorie fehlen");
  if (vor.role !== "dialog" || vor.kat !== 7 || !vor.datum || !vor.hinweis || vor.knopfH < 48) probleme.push(`c) Formular: ${JSON.stringify({ ...vor, text: undefined })}`);
  if (vor.beleg !== 1 || vor.bearb !== 2 || vor.zeilen !== 3) probleme.push(`c) Liste der Kasse: Beleg ${vor.beleg}, Bearbeiten ${vor.bearb}, Zeilen ${vor.zeilen}`);
  const up = nachNeu.find(x => x.m === "POST" && /\/storage\/v1\/object\/kasse-belege\/[^/]+\.pdf$/.test(x.url));
  const post = nachNeu.find(x => x.m === "POST" && /teamkasse/.test(x.url));
  let pb = {}; try { pb = JSON.parse(post && post.body || "{}"); } catch (e) {}
  if (!up) probleme.push(`c) Beleg-Upload fehlt: ${JSON.stringify(nachNeu.map(x => x.m + " " + x.url))}`);
  if (!post || pb.betrag !== -12.5 || pb.datum !== "2026-09-25" || pb.kategorie !== "ausruestung" || pb.zweck !== "Hütchen" || !pb.beleg || (up && !up.url.endsWith(pb.beleg))) probleme.push(`c) Buchung: ${JSON.stringify(pb)}`);
  const patch = nachEdit.find(x => x.m === "PATCH" && /teamkasse\?id=eq\.2/.test(x.url));
  let eb = {}; try { eb = JSON.parse(patch && patch.body || "{}"); } catch (e) {}
  if (form.betrag !== "27.50" || form.kat !== "feiern" || form.typ !== "-1" || !/Änderung speichern/.test(form.knopf)) probleme.push(`d) Formular beim Bearbeiten: ${JSON.stringify(form)}`);
  if (!patch || eb.zweck !== "Eis nach dem Turnier (korrigiert)" || !eb.geaendert_am || eb.beleg !== "abc.jpg") probleme.push(`d) PATCH: ${JSON.stringify(eb)}`);
  if (!r2.toasts.some(t => /deaktivieren statt löschen/.test(t)) || schreib.some(x => x.m === "DELETE" && /kasse_umlagen/.test(x.url))) probleme.push(`e) Umlage mit Zahlungen: ${JSON.stringify(r2.toasts)}`);
  const kopf = (r2.csv.split(/\r\n/)[0] || "").replace(/^﻿/, "");
  if (kopf !== "Art;Datum;Kategorie;Zweck / Umlage;Betrag;Kind;Status;Beleg" || !/Beiträge \(Sammelposten\)/.test(r2.csv) || !/Summe;;Feiern & Ausflüge/.test(r2.csv) || !/Kassenstand;/.test(r2.csv)) probleme.push(`f) Export: ${r2.csv.slice(0, 200)}`);
  const mig = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20260930_v699_mannschaftskasse.sql"), "utf8");
  if (!/bucket_id = 'kasse-belege' and public\.is_kasse\(\)/.test(mig) || /bucket_id = 'belege'/.test(mig)) probleme.push("g) Belege-Bucket: nur „kasse-belege“ mit is_kasse");
  if (!/create policy tk_lesen on public\.teamkasse for select using \(public\.sitzung_gueltig\(\)\)/.test(mig) || !/'sammel'/.test(mig)) probleme.push("g) Eltern-Lesen oder Sammelposten fehlen in der Migration");
  zeilen.push(`Eltern: „${r.a.kachel}“ · ${b.zeilen} Bewegungen · Filter Ausgaben → ${b.aus} · Beitrag „${b.stand}“`);
  zeilen.push(`Kasse: Formular mit ${vor.kat} Kategorien · Beleg → ${up ? up.url.replace(/^.*\/object\//, "") : "—"} · Buchung ${pb.betrag} € am ${pb.datum} (${pb.kategorie})`);
  zeilen.push(`Bearbeiten → PATCH mit geaendert_am · Umlage mit Zahlungen gesperrt · Export ${kopf.split(";").length} Spalten`);
  return h.ergebnis("Mannschaftskasse: alle Eltern lesen, die Kasse bucht mit Datum, Kategorie und Beleg", !probleme.length, zeilen.concat(probleme));
};
