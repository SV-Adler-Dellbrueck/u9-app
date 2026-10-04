/* v756 · Adler Nest: PDF-Export (Trainerbereich) und Teil-Link für die Hördatei (Nachtrag 04.10.2026)
   Charles 04.10.: PDF per Browser-Druck, „erstmal nur in der Trainer-App“.
   a) PDF veröffentlichter Ausgabe: Druckbereich mit Deckblatt, Spieltag, Porträt, Rubriken; statt Player ein antippbarer Link
      mit QR-Code, kein <audio>, keine Knöpfe; Dateiname Adler-Nest_Ausgabe-03; als PDF gedruckt vier Seiten
   b) Link: ist keiner aktiv, wird einer erzeugt (heft_audio_link_neu), sonst der aktive genommen
   c) Entwurf: Vermerk „Entwurf“, kein Hör-Link, kein Link erzeugt
   d) Ohne Hördatei: kein Hörblock
   e) Editor: Knopf „PDF herunterladen“ ≥ 48 px mit Hinweis „Bitte nur an Familien weitergeben“; Link mit Ablaufdatum,
      Erneuern und Zurückziehen (≥ 44 px)
   f) Hörseite ?hoeren=<token>: Knopf ≥ 56 px, preload=none, Abspielen holt die Adresse; abgelaufen zeigt den Hinweis;
      keine Anfrage an Google Fonts oder andere fremde Server */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const TOKEN = "ab".repeat(32);
  const bis = new Date(Date.now() + 30 * 864e5).toISOString();
  let neuAufrufe = 0, aktiv = [];
  const ausgabe = (st, extra) => Object.assign({ id: 3, team: "adler1", nummer: 3, termin_id: 81, status: st, schlagzeile: "Test-Schlagzeile", audio_pfad: "3/hoeren.mp3", audio_sekunden: 75,
    anpfiff: "Anpfiff-Text", spieltag_text: "Bericht.", portraet_spieler_id: null, portraet_einleitung: "", foto_ids: [], kommentar: "Wort vom Team", training_leitfrage: "Leitfrage?" }, extra || {});
  const lesen = st => ({ ausgabe: ausgabe(st), termin: { id: 81, datum: "2026-10-03", typ: "turnier", titel: "Testfestival", heim: true, ort: "Testplatz", uhrzeit: "10:00:00", uhrzeit_ende: null, spielform: null, ergebnis: null },
    teams: [{ nr: 1, kinder: [{ name: "Kind A", kapitaen: true }], trainer: [] }], ergebnisse: [], naechster: null,
    portraet: { name: "Kind B", nr: 8, position: null, lieblingsverein: "Testverein", saisonziel: "Zweikämpfe", reporter: [{ frage: "Traumtor?", antwort: "Aus der Ferne." }] } });
  let stand = "veroeffentlicht", mitAudio = true;
  const sb = () => h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [], heft_ausgabe: [ausgabe("veroeffentlicht")], kabine_reporter: [], portraet_verlauf: [], portraet_einreichung: [],
    heft_audio_link: () => aktiv,
    rpc: { heft_ausgabe_lesen: () => lesen(stand), heft_medien: () => mitAudio ? [{ art: "audio", bucket: "heft_media", pfad: "3/hoeren.mp3" }] : [],
      heft_audio_link_neu: () => { neuAufrufe++; aktiv = [{ token: TOKEN, gueltig_bis: bis }]; return [{ token: TOKEN, gueltig_bis: bis }]; }, heft_audio_link_zurueckziehen: 1 } });
  const t = await h.starten({ warten: 1500, breite: 390, hoehe: 844, supabase: sb() });
  const r = await t.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 60 && typeof nestDruckVorbereiten !== "function"; i++) await w(100);
    if (typeof nestDruckVorbereiten !== "function") return { fehlt: true };
    const halt = document.createElement("div"); halt.setAttribute("aria-modal", "true"); halt.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none"; document.body.appendChild(halt);
    const out = {};
    const stand = () => { const c = document.getElementById("nest-druck"); if (!c) return null;
      const l = c.querySelector("a.nest-hoerlink");
      return { abschnitte: [...c.querySelectorAll("section")].map(s => s.dataset.abschnitt), link: l ? l.getAttribute("href") : null, qr: !!c.querySelector(".nest-qr svg"),
        audio: !!c.querySelector("audio"), knoepfe: c.querySelectorAll("#nest-hoeren, .nest-zurueck").length, entwurf: !!c.querySelector(".nest-entwurf"), titel: document.title,
        text: c.textContent.replace(/\s+/g, " "), bis: l ? l.textContent : "" }; };
    out.a = await nestDruckVorbereiten(3); out.a.stand = stand();
    return out;
  });
  if (r.fehlt) { await t.schliessen(); return h.ergebnis("v756 Nest-PDF", false, ["nestDruckVorbereiten fehlt"]); }
  const a = r.a, sa = a.stand || {};
  // als PDF drucken (Playwright druckt mit dem Druck-Stylesheet)
  await t.page.emulateMedia({ media: "print" });
  const pdf = await t.page.pdf({ preferCSSPageSize: true, printBackground: true });
  await t.page.emulateMedia({ media: "screen" });
  const seiten = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
  const url = "/?hoeren=" + TOKEN;
  if (JSON.stringify(sa.abschnitte) !== '["deckblatt","spieltag","portraet","rubriken"]' || !sa.link || !sa.link.endsWith("?hoeren=" + TOKEN) || !sa.qr || sa.audio || sa.knoepfe || sa.entwurf
      || sa.titel !== "Adler-Nest_Ausgabe-03" || !/Link gültig bis/.test(sa.bis) || /undefined|null/.test(sa.text) || neuAufrufe !== 1 || seiten !== 4)
    probleme.push("a) " + JSON.stringify({ abschnitte: sa.abschnitte, link: sa.link, qr: sa.qr, audio: sa.audio, knoepfe: sa.knoepfe, titel: sa.titel, bis: sa.bis, neuAufrufe, seiten }));
  zeilen.push(`a) Druckbereich ${sa.abschnitte.join(" · ")}, Link + QR statt Player, als PDF ${seiten} Seiten (je ${a.hoch} px hoch), Titel „${sa.titel}“`);

  // b) zweiter Lauf nimmt den aktiven Link
  await t.page.evaluate(() => nestDruckAufraeumen());
  const b = await t.page.evaluate(async () => { await nestDruckVorbereiten(3); const l = document.querySelector("#nest-druck a.nest-hoerlink"); nestDruckAufraeumen(); return l ? l.getAttribute("href") : null; });
  if (neuAufrufe !== 1 || !b || !b.endsWith(TOKEN)) probleme.push(`b) neuAufrufe ${neuAufrufe}, Link ${b}`);
  zeilen.push("b) aktiver Link wird wiederverwendet, nur beim ersten Mal erzeugt");

  // c) Entwurf, d) ohne Hördatei
  stand = "entwurf"; neuAufrufe = 0;
  const c = await t.page.evaluate(async () => { await nestDruckVorbereiten(3); const e = document.querySelector("#nest-druck .nest-entwurf"), l = document.querySelector("#nest-druck a.nest-hoerlink"); const o = { entwurf: !!e, text: e ? e.textContent : "", link: !!l }; nestDruckAufraeumen(); return o; });
  if (!c.entwurf || !/ENTWURF/.test(c.text) || c.link || neuAufrufe) probleme.push("c) " + JSON.stringify({ c, neuAufrufe }));
  zeilen.push("c) Entwurf: Vermerk „ENTWURF“, kein Hör-Link, kein Link erzeugt");
  stand = "veroeffentlicht"; mitAudio = false;
  const d = await t.page.evaluate(async () => { await nestDruckVorbereiten(3); const k = document.querySelector("#nest-druck"); const o = { link: !!k.querySelector("a.nest-hoerlink"), qr: !!k.querySelector(".nest-qr"), hoeren: /zum Hören/.test(k.textContent) }; nestDruckAufraeumen(); return o; });
  if (d.link || d.qr || d.hoeren) probleme.push("d) " + JSON.stringify(d));
  zeilen.push("d) ohne Hördatei kein Hörblock");
  mitAudio = true;

  // e) Editor
  const e = await t.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    await nestEditorOpen(); await w(300); await nestEdOeffnen(3); await w(900);
    const box = document.getElementById("nest-ed-teilen"); if (!box) return { fehlt: true };
    const pdf = document.getElementById("nest-ed-pdf");
    const knoepfe = [...box.querySelectorAll("button")].map(b => ({ t: b.textContent.trim(), h: Math.round(b.getBoundingClientRect().height) }));
    return { pdfH: pdf ? Math.round(pdf.getBoundingClientRect().height) : 0, text: box.textContent.replace(/\s+/g, " "), knoepfe };
  });
  const noetig = ["PDF herunterladen", "Link erneuern (30 Tage)", "Link zurückziehen", "Link kopieren"];
  if (e.fehlt || e.pdfH < 48 || !/Bitte nur an Familien weitergeben/.test(e.text) || !/Gültig bis/.test(e.text) || noetig.some(n => !e.knoepfe.some(k => k.t.includes(n))) || e.knoepfe.some(k => k.h < 44))
    probleme.push("e) " + JSON.stringify(e).slice(0, 400));
  zeilen.push(`e) Editor: PDF-Knopf ${e.pdfH} px, Hinweis, Link mit Ablaufdatum, Kopieren/Erneuern/Zurückziehen`);
  const fe = t.fehler(); await t.schliessen();
  if (fe.length) probleme.push("Konsole Trainer: " + fe.slice(0, 2).join(" | "));

  // f) Hörseite
  const aufrufe = [], fremd = [];
  const s = await h.starten({ start: "/eltern/index.html?hoeren=" + TOKEN, angemeldet: false, warten: 1500, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({}) });
  s.page.on("request", q => { const u = new URL(q.url()); if (!/^(app\.test|wgbcibqcqidudoksfkcv\.supabase\.co)$/.test(u.host)) fremd.push(q.url()); });
  await s.page.route(/\/functions\/v1\/heft-audio/, rt => { aufrufe.push(rt.request().url()); rt.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" },
    body: JSON.stringify(gueltig ? { ok: true, url: "https://app.test/hoeren-test.mp3", nummer: 3, sekunden: 75 } : { ok: false }) }); });
  await s.page.route(/hoeren-test\.mp3/, rt => rt.fulfill({ status: 200, contentType: "audio/mpeg", body: Buffer.from("ID3") }));
  let gueltig = true;
  const f1 = await s.page.evaluate(async tk => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 40 && typeof renderHoerseite !== "function"; i++) await w(100);
    HTMLMediaElement.prototype.play = function () { window.__spielt = this.src; return Promise.resolve(); };
    await renderHoerseite(tk); await w(300);
    const k = document.getElementById("hoer-knopf"), a = document.getElementById("hoer-audio");
    const out = { seite: !!document.getElementById("hoer-seite"), knopfH: k ? Math.round(k.getBoundingClientRect().height) : 0, preload: a && a.getAttribute("preload"), srcVorher: a && a.getAttribute("src"),
      text: document.getElementById("hoer-seite").textContent.replace(/\s+/g, " "), pin: !!document.getElementById("pin-gate") };
    k.click(); await w(300);
    out.spielt = window.__spielt || null;
    return out;
  }, TOKEN);
  gueltig = false;
  const f2 = await s.page.evaluate(async tk => { await renderHoerseite(tk); await new Promise(x => setTimeout(x, 300)); const m = document.getElementById("hoer-abgelaufen"); return { text: m ? m.textContent : "", knopf: !!document.getElementById("hoer-knopf") }; }, TOKEN);
  const fe2 = s.fehler(); await s.schliessen();
  if (!f1.seite || f1.knopfH < 56 || f1.preload !== "none" || f1.srcVorher || !/Ausgabe 03/.test(f1.text) || !/zum Hören/.test(f1.text) || !/hoeren-test\.mp3$/.test(f1.spielt || "") || f1.pin)
    probleme.push("f) " + JSON.stringify(f1));
  if (!/Dieser Link ist abgelaufen\. Das Adler Nest gibt es in der Adler-App\./.test(f2.text) || f2.knopf) probleme.push("f) abgelaufen: " + JSON.stringify(f2));
  if (fremd.length) probleme.push("f) fremde Anfragen: " + fremd.slice(0, 3).join(", "));
  if (!aufrufe.every(u => new RegExp("token=" + TOKEN).test(u))) probleme.push("f) Aufruf ohne Token");
  if (fe2.length) probleme.push("Konsole Hörseite: " + fe2.slice(0, 2).join(" | "));
  zeilen.push(`f) Hörseite: Knopf ${f1.knopfH} px, preload=${f1.preload}, Abspielen holt die Adresse, abgelaufen zeigt den Hinweis, ${fremd.length} fremde Anfragen`);
  return h.ergebnis("v756 Adler Nest: PDF (Trainer) und Hörlink", !probleme.length, probleme.length ? probleme : zeilen);
};
