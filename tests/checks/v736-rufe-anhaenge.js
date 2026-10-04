/* v736 · Adler-Ruf: 5.000 Zeichen und Anhänge (doku/auftrag-rufe-anhaenge/Auftragspaket_Rufe_Anhaenge.md)
   Rechte, Bucket-Regeln und „kein halber Ruf“ prüft tests/sql/v736-rufe-anhaenge.sql gegen ein echtes Postgres.
   Am DOM:
   a) Regeln als reine Funktionen: Name bereinigt (Pfad, Steuerzeichen, verbotene Zeichen, 120 Zeichen mit Endung),
      .docm/.exe/.svg/.html abgelehnt, 11 MB abgelehnt, Bilder/PDF/Office erkannt
   b) Feld und Bearbeiten mit maxlength 5000; Zähler „Noch … Zeichen“ erst ab 4.500
   c) 900 Zeichen gekürzt mit „Weiterlesen“ (≥ 44 px), 300 Zeichen nicht; Tipp klappt auf
   d) Senden: 📎 wählt PNG, PDF, DOCX → drei Chips mit ✕ (≥ 44 px), Hinweis „Offener Raum …“; fünfte Datei,
      .exe und 11 MB werden abgelehnt; Senden lädt nach <raum>/<uuid>.<endung> hoch und ruft rufe_senden einmal mit
      allen Anhängen; danach ist alles leer
   e) Scheitert das Hochladen der zweiten Datei: kein rufe_senden, die erste Datei wird wieder gelöscht, Text und
      Auswahl bleiben
   f) Anzeige: Bild als Miniatur (Blob aus /authenticated/), Tipp → Großansicht (Dialog); PDF → neuer Tab; DOCX →
      Download mit Originalnamen; „Anhang entfernt“
   g) privater Raum: kein Hinweis zu Fotos anderer Kinder
   h) Trainer: ⋯ → „Anhänge endgültig löschen“ (Rückfrage) löscht die Datei und ruft rufe_anhaenge_loeschen
   i) 📎 und Senden ≥ 48 px, 360 px ohne seitliches Scrollen; Sicherung kennt rufe_anhang */
"use strict";
const fs = require("fs"), path = require("path");
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const token = sub => "x." + Buffer.from(JSON.stringify({ sub })).toString("base64") + ".y";
  const iso = m => new Date(Date.now() - m * 60000).toISOString();
  const ruf = (id, raum, text, m, extra) => Object.assign({ id, raum_id: raum, autor: "u-andere", autor_name: "Anna", autor_zusatz: "", autor_rolle: "eltern", text, antwort_auf: null, an_alle: false, bearbeitet_am: null, archiviert_am: null, created_at: iso(m), anhang_entfernt_am: null, rufe_anhang: [] }, extra || {});
  const liste = () => [
    ruf(34, 5, "Kurz und knapp: " + "a".repeat(280), 1, { rufe_anhang: [{ id: 3, pfad: "5/33333333-3333-4333-8333-333333333333.docx", name: "Helferliste Oktober.docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", groesse: 24576 }] }),
    ruf(33, 5, "Formular anbei", 2, { rufe_anhang: [{ id: 2, pfad: "5/22222222-2222-4222-8222-222222222222.pdf", name: "Anmeldung Turnier.pdf", mime: "application/pdf", groesse: 120000 }] }),
    ruf(32, 5, "📎 Anhang", 3, { rufe_anhang: [{ id: 1, pfad: "5/11111111-1111-4111-8111-111111111111.png", name: "Aushang.png", mime: "image/png", groesse: 2048 }] }),
    ruf(31, 5, "Lang: " + "Wort ".repeat(180), 4),
    ruf(30, 5, "Früher mit Anhang", 5, { anhang_entfernt_am: iso(1) })];
  async function start(pfadStart, breite, speicher) {
    const s = await h.starten({ start: pfadStart, warten: 1000, breite: breite || 390, hoehe: 900, supabase: h.supabaseAttrappe({
      rufe_raum: () => [{ id: 5, name: "Allgemein", emoji: "📣", sort: 0, familie_kind: null }, { id: 11, name: "Trainerteam", emoji: "🔒", sort: 1000, familie_kind: 1 }],
      rufe_nachricht: (u, req) => req.method() === "POST" ? { status: 201, body: "[]" } : (/raum_id=eq\.5/.test(u.search) ? liste() : []),
      rufe_umfrage: [], rufe_reaktion: [], rufe_fixiert: [], rufe_gelesen: [], rufe_push_aus: [],
      rpc: { is_rufe_mod: false, rufe_ungelesen: [], rufe_umfrage_stand: [], rufe_senden: 40, rufe_anhaenge_loeschen: [["5/11111111-1111-4111-8111-111111111111.png"]] }
    }) });
    s.speicher = speicher || [];
    s.versagen = 0;
    await s.page.route(/\/storage\/v1\/object\//, r => {
      const q = r.request(), u = q.url().replace(/^.*\/object\//, "");
      s.speicher.push(q.method() + " " + u + (q.method() === "POST" ? " " + (q.headers()["content-type"] || "") : ""));
      if (q.method() === "POST" && s.versagen && s.speicher.filter(x => x.startsWith("POST")).length === s.versagen) return r.fulfill({ status: 500, body: "{}" });
      if (/authenticated\//.test(u)) return r.fulfill({ status: 200, contentType: /\.png$/.test(u) ? "image/png" : "application/octet-stream", body: /\.png$/.test(u) ? PNG : Buffer.from("x") });
      return r.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
    return s;
  }
  const oeffnen = (s, tok) => s.page.evaluate(async tok => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 40 && typeof rufeOpen !== "function"; i++) await w(100);
    if (typeof rufeAnhangPruefen !== "function") return { fehlt: true };
    window.sbToken = () => tok; window._toasts = []; const t0 = window.toast; window.toast = (m, a) => { window._toasts.push(String(m)); };
    window._offen = []; window.open = u => { window._offen.push(String(u)); return {}; };
    window._downloads = []; const c0 = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) { window._downloads.push(this.download); return; } return c0.apply(this, arguments); };
    await rufeOpen(5); await w(900);
    return { ok: true };
  }, tok);

  // ── Eltern, 360 px ──
  const s = await start("/eltern/index.html", 360);
  const o = await oeffnen(s, token("u-eigen"));
  if (o.fehlt) { await s.schliessen(); return h.ergebnis("v736 Adler-Ruf: 5.000 Zeichen und Anhänge", false, ["rufeAnhangPruefen fehlt"]); }
  const ra = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)), out = {};
    // a)
    out.a = { name1: rufeAnhangName("C:\\Users\\x\\Mein:Formular?.pdf"), name2: rufeAnhangName("../../etc/\u0007passwd.docx"), name3: rufeAnhangName("x".repeat(200) + ".xlsx"),
      leer: rufeAnhangName("   "), typen: ["a.docm", "a.exe", "a.svg", "a.html", "a.zip", "a.xlsm"].map(n => rufeAnhangPruefen(n, 10).ok),
      gross: rufeAnhangPruefen("a.pdf", 11 * 1048576).ok, arten: ["a.PNG", "a.pdf", "a.docx", "a.pptx", "a.jpeg"].map(n => { const p = rufeAnhangPruefen(n, 10); return p.ok && p.art + "/" + p.endung; }),
      groesse: [rufeGroesseText(2048), rufeGroesseText(1572864)] };
    // b)
    const feld = document.getElementById("rufe-text"), z = document.getElementById("rufe-zaehler");
    feld.value = "x".repeat(4400); rufeTextWachsen(feld); const unter = z.style.display;
    feld.value = "x".repeat(4600); rufeTextWachsen(feld);
    out.b = { max: feld.maxLength, unter, ueber: z.style.display, text: z.textContent };
    feld.value = ""; rufeTextWachsen(feld);
    rufeBearbeitenOpen(34); await w(60); out.b.edit = document.getElementById("rufe-edit")?.maxLength; document.getElementById("rufe-menue")?.remove();
    // c)
    const msg = id => document.querySelector(`#rufe-liste .rf-msg[data-id="${id}"]`);
    const wl = msg(31)?.querySelector(".rf-weiter");
    out.c = { lang: !!wl, kurz: !!msg(34)?.querySelector(".rf-weiter"), h: wl ? Math.round(wl.getBoundingClientRect().height) : 0, hoeheVor: msg(31)?.querySelector(".rf-text").getBoundingClientRect().height };
    wl?.click(); await w(50);
    out.c.hoeheNach = msg(31)?.querySelector(".rf-text").getBoundingClientRect().height; out.c.knopfWeg = !msg(31)?.querySelector(".rf-weiter");
    // f) Anzeige
    msg(32)?.scrollIntoView(); await w(700);
    const img = msg(32)?.querySelector("img[data-pfad]");
    out.f = { bild: !!img, src: img ? String(img.getAttribute("src") || "").slice(0, 5) : "", entfernt: /Anhang entfernt/.test(msg(30)?.textContent || "") };
    msg(32)?.querySelector(".rf-bild")?.click(); await w(400);
    const g = document.getElementById("rufe-gross"); out.f.gross = g && g.getAttribute("role"); g?.remove();
    msg(33)?.querySelector(".rf-datei")?.click(); await w(300);
    msg(34)?.querySelector(".rf-datei")?.click(); await w(300);
    out.f.offen = window._offen.slice(); out.f.downloads = window._downloads.slice();
    out.f.dateiH = Math.round(msg(33)?.querySelector(".rf-datei").getBoundingClientRect().height || 0);
    // i)
    const hh = id => Math.round(document.getElementById(id)?.getBoundingClientRect().height || 0);
    out.i = { anhang: hh("rufe-anhang-knopf"), senden: hh("rufe-senden"), quer: document.documentElement.scrollWidth > 361 };
    return out;
  });
  // d) Dateien wählen
  await s.page.setInputFiles("#rufe-datei", [{ name: "Bildschirmfoto.png", mimeType: "image/png", buffer: PNG }, { name: "Aushang.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n") },
    { name: "Liste.docx", mimeType: "", buffer: Buffer.from("PK..") }]);
  await s.page.waitForTimeout(600);
  await s.page.setInputFiles("#rufe-datei", [{ name: "virus.exe", mimeType: "application/octet-stream", buffer: Buffer.from("MZ") }, { name: "riesig.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(11 * 1048576) },
    { name: "Vier.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF") }, { name: "Fuenf.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF") }]);
  await s.page.waitForTimeout(500);
  const rd = await s.page.evaluate(() => {
    const chips = [...document.querySelectorAll("#rufe-chips .rf-chip")];
    const hin = document.getElementById("rufe-offen-hinweis");
    return { chips: chips.map(c => c.textContent.replace(/\s+/g, " ").trim()), weg: Math.min(...chips.map(c => Math.round(c.querySelector(".rf-chip-weg").getBoundingClientRect().height))),
      thumb: !!chips[0]?.querySelector("img"), hinweis: hin && hin.style.display !== "none" ? hin.textContent : "", toasts: window._toasts.slice(), quer: document.documentElement.scrollWidth > 361 };
  });
  // e) zweites Hochladen scheitert
  s.versagen = 2;
  await s.page.evaluate(() => { document.getElementById("rufe-text").value = "Bitte ausfüllen"; });
  await s.page.click("#rufe-senden"); await s.page.waitForTimeout(800);
  const re = await s.page.evaluate(() => ({ text: document.getElementById("rufe-text").value, chips: document.querySelectorAll("#rufe-chips .rf-chip").length, toast: window._toasts.slice(-1)[0] || "" }));
  const speicherE = s.speicher.slice(); const sendenE = s.gesendet.filter(x => /rpc\/rufe_senden/.test(x.pfad)).length;
  // d) Senden klappt
  s.versagen = 0; s.speicher.length = 0;
  await s.page.click("#rufe-senden"); await s.page.waitForTimeout(900);
  const senden = s.gesendet.filter(x => /rpc\/rufe_senden/.test(x.pfad)).map(x => x.body);
  const nach = await s.page.evaluate(() => ({ text: document.getElementById("rufe-text").value, chips: document.querySelectorAll("#rufe-chips .rf-chip").length }));
  // g) privater Raum
  await s.page.evaluate(async () => { await rufeRaumWechseln(11); await new Promise(x => setTimeout(x, 400)); });
  await s.page.setInputFiles("#rufe-datei", [{ name: "Attest.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF") }]); await s.page.waitForTimeout(300);
  const rg = await s.page.evaluate(() => { const hin = document.getElementById("rufe-offen-hinweis"); return { chips: document.querySelectorAll("#rufe-chips .rf-chip").length, hinweis: hin && hin.style.display !== "none" }; });
  const f1 = s.fehler(); await s.schliessen();

  // h) Trainer
  const st = await start("/trainer/index.html");
  await oeffnen(st, token("u-trainer"));
  const rh = await st.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    rufeMenue(32); await w(80);
    const z = [...document.querySelectorAll("#rufe-menue button")].find(b => /Anhänge endgültig löschen/.test(b.textContent));
    const out = { zeile: !!z };
    z?.click(); await w(300);
    out.frage = document.getElementById("frage-modal")?.textContent.replace(/\s+/g, " ") || "";
    document.getElementById("frage-ja")?.click(); await w(600);
    rufeMenue(31); await w(60);
    out.ohneAnhang = [...document.querySelectorAll("#rufe-menue button")].some(b => /Anhänge endgültig/.test(b.textContent));
    document.getElementById("rufe-menue")?.remove();
    return out;
  });
  const loeschRpc = st.gesendet.filter(x => /rpc\/rufe_anhaenge_loeschen/.test(x.pfad)).map(x => x.body);
  const loeschSpeicher = st.speicher.filter(x => x.startsWith("DELETE"));
  const f2 = st.fehler(); await st.schliessen();

  // ── Auswertung ──
  const a = ra.a;
  if (a.name1 !== "Mein_Formular_.pdf" || a.name2 !== "passwd.docx" || a.name3.length !== 120 || !a.name3.endsWith(".xlsx") || a.leer !== "Datei") probleme.push(`a) Namen: ${JSON.stringify([a.name1, a.name2, a.name3.length, a.leer])}`);
  if (a.typen.some(Boolean) || a.gross) probleme.push(`a) verbotene Typen oder 11 MB angenommen: ${JSON.stringify(a.typen)} ${a.gross}`);
  if (a.arten.join(",") !== "bild/png,pdf/pdf,office/docx,office/pptx,bild/jpg") probleme.push(`a) Arten: ${a.arten.join(",")}`);
  if (a.groesse.join(" | ") !== "2 KB | 1,5 MB") probleme.push(`a) Größe: ${a.groesse.join(" | ")}`);
  zeilen.push(`a) „Mein:Formular?.pdf“ → „${a.name1}“ · .docm/.exe/.svg/.html/.zip/.xlsm und 11 MB abgelehnt`);
  if (ra.b.max !== 5000 || ra.b.edit !== 5000 || ra.b.unter !== "none" || ra.b.ueber === "none" || ra.b.text !== "Noch 400 Zeichen") probleme.push(`b) 5.000/Zähler: ${JSON.stringify(ra.b)}`);
  zeilen.push(`b) maxlength ${ra.b.max}/${ra.b.edit} · Zähler „${ra.b.text}“ erst ab 4.500`);
  if (!ra.c.lang || ra.c.kurz || ra.c.h < 44 || !(ra.c.hoeheNach > ra.c.hoeheVor) || !ra.c.knopfWeg) probleme.push(`c) Weiterlesen: ${JSON.stringify(ra.c)}`);
  zeilen.push(`c) 900 Zeichen gekürzt (${Math.round(ra.c.hoeheVor)} px → ${Math.round(ra.c.hoeheNach)} px nach „Weiterlesen“), 300 Zeichen ohne`);
  if (rd.chips.length !== 4 || !rd.thumb || rd.weg < 44) probleme.push(`d) Chips: ${JSON.stringify(rd.chips)} ✕ ${rd.weg} px`);
  if (!/Offener Raum – alle Eltern lesen mit\. Bitte keine Fotos anderer Kinder\./.test(rd.hinweis)) probleme.push(`d) Hinweis offener Raum fehlt: „${rd.hinweis}“`);
  if (!rd.toasts.some(t => /virus\.exe.*geht nicht/.test(t)) || !rd.toasts.some(t => /riesig\.pdf.*größer als 10 MB/.test(t)) || !rd.toasts.some(t => /Höchstens vier/.test(t))) probleme.push(`d) Ablehnungen: ${JSON.stringify(rd.toasts)}`);
  if (sendenE !== 0 || re.text !== "Bitte ausfüllen" || re.chips !== 4 || !/nicht hochgeladen/.test(re.toast) || !speicherE.some(x => x.startsWith("DELETE rufe-anhang/5/"))) probleme.push(`e) Abbruch: senden ${sendenE}, ${JSON.stringify(re)}, Speicher ${JSON.stringify(speicherE)}`);
  zeilen.push(`e) zweites Hochladen scheitert → kein Ruf, erste Datei wieder gelöscht, Text und 4 Anhänge bleiben`);
  const sb = senden[0] || {}, an = sb.p_anhaenge || [];
  const posts = s.speicher.filter(x => x.startsWith("POST"));
  if (senden.length !== 1 || an.length !== 4 || sb.p_raum !== 5 || sb.p_text !== "Bitte ausfüllen" || !an.every(x => /^5\/[0-9a-f-]{36}\.(png|pdf|docx)$/.test(x.pfad)) || posts.length !== 4) probleme.push(`d) Senden: ${JSON.stringify(senden)} · ${JSON.stringify(posts)}`);
  if (!an.some(x => x.name === "Liste.docx" && x.mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") || !posts.some(x => /\.docx application\/vnd\.openxmlformats/.test(x))) probleme.push(`d) DOCX ohne Browser-Typ: ${JSON.stringify(an)}`);
  if (nach.text !== "" || nach.chips !== 0) probleme.push(`d) nach dem Senden nicht leer: ${JSON.stringify(nach)}`);
  zeilen.push(`d) 4 Anhänge hochgeladen (${posts.map(p => p.split(" ")[1].split(".").pop()).join(", ")}) · rufe_senden einmal mit allen · danach leer`);
  const f = ra.f;
  if (!f.bild || f.src !== "blob:" || f.gross !== "dialog" || !f.entfernt) probleme.push(`f) Bild/Entfernt: ${JSON.stringify(f)}`);
  if (f.offen.length !== 1 || !/^blob:/.test(f.offen[0]) || f.downloads[0] !== "Helferliste Oktober.docx" || f.dateiH < 44) probleme.push(`f) PDF/DOCX: ${JSON.stringify(f)}`);
  zeilen.push(`f) Bild als Miniatur mit Großansicht · PDF im neuen Tab · DOCX als „${f.downloads[0]}“ · „Anhang entfernt“`);
  if (rg.chips !== 1 || rg.hinweis) probleme.push(`g) privater Raum: ${JSON.stringify(rg)}`);
  if (!rh.zeile || !/endgültig/.test(rh.frage) || rh.ohneAnhang || loeschRpc.length !== 1 || loeschRpc[0].p_nachricht !== 32 || !loeschSpeicher.some(x => /rufe-anhang\/5\/11111111/.test(x))) probleme.push(`h) Trainer löscht: ${JSON.stringify(rh)} · ${JSON.stringify(loeschRpc)} · ${JSON.stringify(loeschSpeicher)}`);
  zeilen.push(`g) privat ohne Hinweis · h) Trainer: Rückfrage, Datei gelöscht, rufe_anhaenge_loeschen(32)`);
  if (ra.i.anhang < 48 || ra.i.senden < 48 || ra.i.quer || rd.quer) probleme.push(`i) Größen: ${JSON.stringify(ra.i)} quer ${rd.quer}`);
  const views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  if (!/"rufe_anhang"/.test(views) || !/rufe_anhang_dateien:"/.test(views)) probleme.push("i) Sicherung: rufe_anhang fehlt oder die Ausnahme für die Dateien");
  zeilen.push(`i) 📎 ${ra.i.anhang} px · Senden ${ra.i.senden} px · 360 px ohne Querscrollen · Sicherung mit rufe_anhang`);
  if (f1.length) probleme.push("Konsole Eltern: " + f1.slice(0, 2).join(" | "));
  if (f2.length) probleme.push("Konsole Trainer: " + f2.slice(0, 2).join(" | "));
  return h.ergebnis("v736 Adler-Ruf: 5.000 Zeichen und Anhänge", !probleme.length, zeilen.concat(probleme));
};
