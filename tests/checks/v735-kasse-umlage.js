/* v735 · Kasse: Umlage bearbeiten, PayPal.Me-Link absichern, Hinweis gegen Doppelzählung
   (doku/auftrag-kasse-umlage/Auftragspaket_Umlage_bearbeiten_PayPal.md, Abnahmekriterien 1–8)
   a) kassePaypalLink als reine Funktion: alle Testfälle des Pakets
   b) Kasse (360 px): neue Umlage mit „paypal.me/Test“ speichert https://paypal.me/Test; example.com wird nicht
      gespeichert (Hinweis); leeres Feld speichert null
   c) ✏️ je Umlage-Zeile; Titel/fällig/Link ändern ohne Rückfrage per PATCH; Betrag bei 0 Häkchen ohne Rückfrage;
      bei 8 Häkchen Rückfrage „+40,00 €“, Abbrechen ändert nichts, Ändern speichert
   d) Kategorie „Beiträge“ zeigt den Hinweis nur bei aktiver Umlage
   e) neue Bedienelemente ≥ 44 px, kein seitliches Scrollen bei 360 px
   f) Eltern: Knopf „PayPal“ für den bereinigten Link, keiner ohne Link */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const kinder = "ABCDEFGH".split("").map((c, i) => ({ id: i + 1, name: "Kind " + c }));
  async function eltern(istKasse, schreib, link, breite) {
    const basis = h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
      termine: [], rueckmeldungen: [], kasse_zahlung: [], team_config: [{ spenden_link: "" }], teamkasse: [],
      kasse_umlagen: (u, req) => { if (req.method() !== "GET") { schreib.push({ m: req.method(), url: u.pathname + u.search, body: req.postData() }); return { status: 201, body: "[]" }; }
        return [{ id: 7, titel: "Mannschaftskasse", betrag: 40, faellig: "2026-10-31", paypal_link: null, aktiv: true },
                { id: 8, titel: "Sommerfest", betrag: 10, faellig: null, paypal_link: "https://paypal.me/Alt", aktiv: true }]; },
      rpc: { kasse_summary: { saldo: 320, umlagen: [{ id: 7, titel: "Mannschaftskasse", betrag: 40, faellig: "2026-10-31", paypal_link: link }], sammel: [] },
        is_kasse: istKasse, kasse_uebersicht: { kinder, zahlungen: kinder.map(k => ({ u: 7, s: k.id, am: "2026-10-04" })) } } });
    const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: breite || 390, hoehe: 844, supabase: basis });
    await s.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
    await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(3500);
    return s;
  }

  // ── b)–e) Kasse am schmalen Handy ──
  const schreib = [];
  const s = await eltern(true, schreib, null, 360);
  const ra = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 40 && typeof kasseOpen !== "function"; i++) await w(100);
    if (typeof kassePaypalLink !== "function") return { fehlt: true };
    const faelle = ["paypal.me/A", "www.paypal.me/A", "https://paypal.me/A", "paypal.com/paypalme/A", "  paypal.me/A  ", "http://paypal.me/A",
      "javascript:alert(1)", "https://paypal.me.evil.de/A", "", "https://example.com/x",
      // Nachtrag 04.10.: Betrag hinter dem Namen
      "paypal.me/Test/40", "https://paypal.me/Test/40EUR", "paypal.me/Test/12,50?x=1#y", "paypal.com/paypalme/Test/40",
      "paypal.me/Test/40/x", "paypal.me/Test/abc", "https://paypal.me.evil.de/Test"];
    const pure = faelle.map(f => [f, kassePaypalLink(f)]);
    kasseOpen(); for (let i = 0; i < 40 && !document.getElementById("u-speichern"); i++) await w(100);
    for (let i = 0; i < 40 && !window._kasseUebersicht; i++) await w(100); await w(300);
    const hoehe = sel => Math.round(document.querySelector(sel)?.getBoundingClientRect().height || 0);
    const stifte = [...document.querySelectorAll('#kasse-modal button[aria-label$="bearbeiten"]')];
    return { pure, stifte: stifte.length, stiftH: Math.min(...stifte.map(b => Math.round(b.getBoundingClientRect().height))),
      speichernH: hoehe("#u-speichern"), hilfe: /PayPal-App → Einstellungen → PayPal\.Me/.test(document.getElementById("kasse-modal").textContent),
      breite: document.documentElement.scrollWidth, innen: document.querySelector("#kasse-modal > div").scrollWidth > document.querySelector("#kasse-modal > div").clientWidth + 1 };
  });
  if (ra.fehlt) { probleme.push("kassePaypalLink fehlt"); await s.schliessen(); return h.ergebnis("v735 Kasse: Umlage bearbeiten, PayPal.Me-Link", false, probleme); }
  const soll = { "paypal.me/A": "https://paypal.me/A", "www.paypal.me/A": "https://www.paypal.me/A", "https://paypal.me/A": "https://paypal.me/A",
    "paypal.com/paypalme/A": "https://www.paypal.com/paypalme/A", "  paypal.me/A  ": "https://paypal.me/A", "": null,
    "paypal.me/Test/40": "https://paypal.me/Test/40", "https://paypal.me/Test/40EUR": "https://paypal.me/Test/40EUR",
    "paypal.me/Test/12,50?x=1#y": "https://paypal.me/Test/12.50", "paypal.com/paypalme/Test/40": "https://www.paypal.com/paypalme/Test/40" };
  ra.pure.forEach(([f, e]) => {
    if (f in soll) { if (!e.ok || e.link !== soll[f]) probleme.push(`a) „${f}“ → ${JSON.stringify(e)} statt ${soll[f]}`); }
    else if (e.ok) probleme.push(`a) „${f}“ wird angenommen (${e.link})`);
  });
  zeilen.push(`a) ${ra.pure.filter(([, e]) => e.ok).length} angenommen, ${ra.pure.filter(([, e]) => !e.ok).length} abgelehnt (http, javascript:, paypal.me.evil.de, example.com, …/40/x, …/abc)`);

  const toasts = [];
  await s.page.exposeFunction("_t735", m => toasts.push(m));
  await s.page.evaluate(() => { const t0 = window.toast; window.toast = (m, a) => { window._t735(String(m)); return t0 && t0(m, a); }; });
  const neu = async (titel, betrag, link) => {
    await s.page.fill("#u-titel", titel); await s.page.fill("#u-betrag", betrag); await s.page.fill("#u-paypal", link);
    await s.page.click("#u-speichern"); await s.page.waitForTimeout(700);
  };
  const posts = () => schreib.filter(x => x.m === "POST").map(x => JSON.parse(x.body || "{}"));
  await neu("Test eins", "40", "paypal.me/Test");
  await neu("Test zwei", "40", "https://example.com/x");
  const nachZwei = posts().length;
  await neu("Test drei", "40", "");
  const p = posts();
  if (!p[0] || p[0].paypal_link !== "https://paypal.me/Test") probleme.push(`b) paypal.me/Test → ${JSON.stringify(p[0])}`);
  if (nachZwei !== 1) probleme.push("b) example.com wurde gespeichert");
  if (!toasts.some(t => /Bitte den PayPal\.Me-Link einfügen, zum Beispiel paypal\.me\/DeinName/.test(t))) probleme.push("b) kein Hinweis bei example.com");
  if (!p[1] || p[1].paypal_link !== null || !("paypal_link" in p[1])) probleme.push(`b) leeres Feld → ${JSON.stringify(p[1])}`);
  zeilen.push(`b) paypal.me/Test → ${p[0] && p[0].paypal_link} · example.com nicht gespeichert · leer → ${p[1] && p[1].paypal_link}`);

  // c) Bearbeiten
  const patches = () => schreib.filter(x => x.m === "PATCH").map(x => ({ url: x.url, b: JSON.parse(x.body || "{}") }));
  const fragen = async () => !!(await s.page.$("#frage-modal"));
  await s.page.evaluate(() => kasseUmlageBearbeiten(7)); await s.page.waitForTimeout(200);
  const form = await s.page.evaluate(() => ({ titel: document.getElementById("u-titel").value, betrag: document.getElementById("u-betrag").value,
    kopf: document.getElementById("u-form-titel").textContent, knopf: document.getElementById("u-speichern").textContent,
    abbrH: Math.round(document.getElementById("u-abbrechen").getBoundingClientRect().height) }));
  await s.page.fill("#u-titel", "Mannschaftskasse 26/27"); await s.page.fill("#u-faellig", "2026-11-15"); await s.page.fill("#u-paypal", "paypal.me/Kasse");
  await s.page.click("#u-speichern"); await s.page.waitForTimeout(500);
  const ohneFrage = !(await fragen()); const pa = patches();
  if (form.titel !== "Mannschaftskasse" || form.betrag !== "40.00" || form.kopf !== "Umlage ändern" || !/Änderung speichern/.test(form.knopf)) probleme.push(`c) Formular: ${JSON.stringify(form)}`);
  if (!ohneFrage || !pa[0] || !/kasse_umlagen\?id=eq\.7/.test(pa[0].url) || pa[0].b.titel !== "Mannschaftskasse 26/27" || pa[0].b.faellig !== "2026-11-15" || pa[0].b.paypal_link !== "https://paypal.me/Kasse") probleme.push(`c) Titel/fällig/Link: Rückfrage ${!ohneFrage}, ${JSON.stringify(pa[0])}`);
  // Betrag ohne Häkchen (Umlage 8)
  await s.page.evaluate(() => kasseUmlageBearbeiten(8)); await s.page.waitForTimeout(150);
  await s.page.fill("#u-betrag", "12"); await s.page.click("#u-speichern"); await s.page.waitForTimeout(500);
  const p8 = patches()[1];
  if ((await fragen()) || !p8 || !/id=eq\.8/.test(p8.url) || p8.b.betrag !== 12) probleme.push(`c) Betrag ohne Häkchen: ${JSON.stringify(p8)}`);
  // Betrag mit 8 Häkchen: Abbrechen
  await s.page.evaluate(() => kasseUmlageBearbeiten(7)); await s.page.waitForTimeout(150);
  await s.page.fill("#u-betrag", "45"); await s.page.click("#u-speichern"); await s.page.waitForTimeout(400);
  const frageText = await s.page.evaluate(() => document.getElementById("frage-modal")?.textContent.replace(/\s+/g, " ") || "");
  await s.page.click("#frage-nein").catch(() => {}); await s.page.waitForTimeout(400);
  const nachAbbr = patches().length;
  await s.page.click("#u-speichern"); await s.page.waitForTimeout(400);
  await s.page.click("#frage-ja").catch(() => {}); await s.page.waitForTimeout(600);
  const pj = patches();
  if (!/Der Betrag ändert sich von 40,00 € auf 45,00 €\. Bei 8 abgehakten Familien ändert sich der Kassenstand um \+40,00 €\. Ändern\?/.test(frageText)) probleme.push(`c) Rückfrage: „${frageText.slice(0, 200)}“`);
  if (nachAbbr !== 2) probleme.push("c) Abbrechen hat trotzdem gespeichert");
  if (pj.length !== 3 || pj[2].b.betrag !== 45) probleme.push(`c) Ändern nach Rückfrage: ${JSON.stringify(pj[2])}`);
  zeilen.push(`c) ✏️ an ${ra.stifte} Umlagen · Titel/fällig/Link ohne Rückfrage · Betrag ohne Häkchen ohne Rückfrage · 8 Häkchen: „+40,00 €“, Abbrechen ändert nichts`);

  // d) Hinweis gegen Doppelzählung
  const rd = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const sicht = () => { const e = document.getElementById("k-kat-hinweis"); return !!e && e.style.display !== "none" && e.offsetHeight > 0; };
    const k = document.getElementById("k-kat");
    k.value = "spenden"; k.dispatchEvent(new Event("change")); const andere = sicht();
    k.value = "beitraege"; k.dispatchEvent(new Event("change")); const mit = sicht();
    const txt = document.getElementById("k-kat-hinweis")?.textContent || "";
    window._kasseDaten.umlagen = window._kasseDaten.umlagen.map(u => ({ ...u, aktiv: false })); kasseKatHinweis(); const ohne = sicht();
    return { andere, mit, ohne, txt };
  });
  if (rd.andere || !rd.mit || rd.ohne) probleme.push(`d) Hinweis: andere ${rd.andere}, Beiträge mit Umlage ${rd.mit}, ohne aktive Umlage ${rd.ohne}`);
  if (!/Beiträge bitte unter „Wer hat bezahlt“ abhaken\. Eine zusätzliche Buchung zählt sie im Kassenstand doppelt\./.test(rd.txt)) probleme.push(`d) Wortlaut: „${rd.txt}“`);
  zeilen.push(`d) Hinweis nur bei „Beiträge“ und aktiver Umlage`);

  // e) Größen
  if (ra.stiftH < 44 || ra.speichernH < 44 || form.abbrH < 44) probleme.push(`e) Höhen: ✏️ ${ra.stiftH}, Speichern ${ra.speichernH}, Abbrechen ${form.abbrH}`);
  if (ra.breite > 360 || ra.innen) probleme.push(`e) seitliches Scrollen bei 360 px (Seite ${ra.breite}, Dialog ${ra.innen})`);
  if (!ra.hilfe) probleme.push("e) Hilfesatz zum PayPal.Me-Link fehlt");
  zeilen.push(`e) ✏️ ${ra.stiftH} px · Speichern ${ra.speichernH} px · Abbrechen ${form.abbrH} px · Seitenbreite ${ra.breite} px`);
  const f1 = s.fehler(); if (f1.length) probleme.push("Konsole Kasse: " + f1.slice(0, 2).join(" | "));
  await s.schliessen();

  // f) Eltern sehen den Knopf
  for (const [link, erwartet] of [["https://paypal.me/Test", true], [null, false]]) {
    const se = await eltern(false, [], link);
    const knopf = await se.page.evaluate(async () => {
      const w = ms => new Promise(x => setTimeout(x, ms));
      for (let i = 0; i < 40 && !document.getElementById("mannschaftskasse-kachel"); i++) await w(100);
      document.getElementById("mannschaftskasse-kachel")?.click();
      for (let i = 0; i < 30 && !document.getElementById("mk-modal"); i++) await w(100); await w(500);
      return [...document.querySelectorAll("#mk-modal a")].filter(a => /PayPal/.test(a.textContent)).map(a => a.getAttribute("href"));
    });
    if (erwartet && !(knopf.length === 1 && knopf[0] === link)) probleme.push(`f) Eltern sehen keinen PayPal-Knopf für ${link}: ${JSON.stringify(knopf)}`);
    if (!erwartet && knopf.length) probleme.push(`f) ohne Link trotzdem ein Knopf: ${JSON.stringify(knopf)}`);
    await se.schliessen();
  }
  zeilen.push("f) Eltern: Knopf „PayPal“ für https://paypal.me/Test, ohne Link keiner");
  return h.ergebnis("v735 Kasse: Umlage bearbeiten, PayPal.Me-Link absichern, Hinweis gegen Doppelzählung", !probleme.length, zeilen.concat(probleme));
};
