/* v733 · Adler Nest als Ausgaben (Auftragspaket 03.10.2026)
   Das Nest erscheint nach jedem Spieltag als eigene Ausgabe, nur hinter dem Login (Eltern, Kinder-Konten,
   Trainer). Die Rechte selbst (Eltern nur Veröffentlichtes, anon nichts, tag_quellen nie an Eltern,
   7. Foto / 3. Privatfoto / Privatfoto ohne Einverständnis serverseitig abgelehnt) sind in
   tests/sql/v733-heft-ausgabe.sql gegen ein echtes Postgres geprüft; hier geht es um das, was die App zeigt.
   a) Eltern ohne veröffentlichte Ausgabe: Leerzustand mit einem Satz
   b) Zwei Ausgaben: die neueste (02) öffnet, das Archiv zeigt 01; Archiv-Klick öffnet 01
   c) Reihenfolge Deckblatt → Spieltag → Porträt → Rubriken; leere Felder fehlen (kein „null“, kein Platzhalter)
   d) Spieltagskarte, Teams (Kapitän „(C)“) und Ergebnis aus den App-Daten
   e) Porträtkind ohne starken Fuß: kein Feld „Starker Fuß“; Reporter-Antworten nur, was kommt
   f) Hördatei: Knopf ≥ 48 px mit Dauer, Antippen lädt die Datei; „Zurück zur App“ ≥ 44 px schließt
   g) Schriften lokal: vendor/barlow.css geladen, keine Anfrage an fonts.googleapis.com / fonts.gstatic.com
   h) Alter Link ?heft: Hinweis „Das Adler Nest lesen Eltern in der App“ mit Weg zur Anmeldung, kein Aufruf
      von stadionheft-view
   i) Editor: das 7. Galeriefoto wird abgelehnt („6 von 6“); bei 2 Privatfotos kein weiteres Hochladen;
      ohne Häkchen „Familie ist einverstanden“ bleibt das Hochladen gesperrt
   j) Befund 03.10.: Kapitän, der nicht mehr im Team steht, wird verworfen („Kapitän neu wählen“, Zeile
      gelöscht); Aktionen von Kindern, die „verletzt“/„nicht“ gemeldet sind, zählen nicht */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const JPG = Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=", "base64");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const basisEltern = extra => h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
    eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
    termine: [], rueckmeldungen: [], team_config: [{ spenden_link: "" }],
    rpc: Object.assign({ eltern_news: {}, training_rueckblick: [], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false }, extra) });
  const elternStart = async (sb) => {
    const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 390, hoehe: 844, supabase: sb });
    s.anfragen = []; s.page.on("request", r => s.anfragen.push(r.url()));
    await s.page.route(/\/storage\/v1\/object\/authenticated\//, r => r.fulfill({ status: 200, contentType: /\.mp3$/.test(r.request().url()) ? "audio/mpeg" : "image/jpeg", body: JPG }));
    await s.page.evaluate(tk => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: tk, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
    await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(2500);
    return s;
  };

  // a) Leerzustand
  const sa = await elternStart(basisEltern({ heft_ausgaben_liste: [] }));
  const ra = await sa.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 40 && typeof nestOpen !== "function"; i++) await w(100);
    await nestOpen(); await w(300);
    const l = document.getElementById("nest-leer");
    return { text: l ? l.textContent.trim() : null, dialog: document.getElementById("nest-modal")?.getAttribute("role") };
  }).catch(e => ({ fehler: String(e) }));
  const fa = sa.fehler(); await sa.schliessen();
  if (ra.fehler || !ra.text || (ra.text.match(/[.!?]/g) || []).length > 2 || ra.dialog !== "dialog") probleme.push("a) " + JSON.stringify(ra));
  else zeilen.push(`a) Leerzustand: „${ra.text}“`);

  // b–g) Zwei veröffentlichte Ausgaben
  const liste = [
    { id: 12, nummer: 2, datum: h.tagePlus(-1), typ: "turnier", titel: "Testfestival · Testverein U9", gegner: null, heim: false, veroeffentlicht_am: new Date().toISOString() },
    { id: 11, nummer: 1, datum: h.tagePlus(-8), typ: "spiel", titel: "Spiel", gegner: "Testgegner", heim: true, veroeffentlicht_am: new Date(Date.now() - 7 * 864e5).toISOString() }];
  const ausgabe = (id, nr, extra) => Object.assign({ id, nummer: nr, team: "adler1", schlagzeile: "Testschlagzeile " + nr, teaser_spieltag: "Drei Teams im Test",
    teaser_portraet: "Kind B im Porträt", teaser_tag: null, audio_sekunden: 96, anpfiff: "Hallo Adler-Familie!", spieltag_text: "Erster Absatz.\nZweiter Absatz.",
    zitat: "Viele Doppelpässe.", eltern_dank: "Danke fürs Anfeuern.", sonderzeile: null, foto_ids: [1, 2, 3, 4], portraet_einleitung: "Ein Satz zur Einleitung.",
    portraet_trainersatz: "Ein Teamspieler.", training_leitfrage: null, training_text: null, tag_lernen: "1990: Etwas zum Lernen.", tag_lustig: "1955: Etwas zum Schmunzeln.",
    kommentar: "Danke an alle.", status: "veroeffentlicht" }, extra || {});
  const lesen = {
    12: { ausgabe: ausgabe(12, 2), termin: { id: 81, datum: liste[0].datum, typ: "turnier", titel: "Testfestival · Testverein U9", gegner: null, heim: false, ort: "Teststraße 1, 50000 Köln", uhrzeit: "10:15:00", uhrzeit_ende: "11:30:00", spielform: "funino", ergebnis: null },
      teams: [{ nr: 1, kinder: [{ name: "Kind B", nr: 8, kapitaen: true }, { name: "Kind C", nr: 9, kapitaen: false }], trainer: ["Trainer X"] },
              { nr: 2, kinder: [{ name: "Kind D", nr: 10, kapitaen: false }], trainer: ["Trainer Y"] }],
      ergebnisse: [{ team: 1, gegner: "Gegner 1", tore: 2, gegentore: 1 }],
      portraet: { name: "Kind B", nr: 8, position: null, lieblingsverein: "Testverein", vorbild: "Testvorbild", hobby: "Schwimmen", saisonziel: "Zweikämpfe", reporter: [{ frage: "Dein Traumtor?", antwort: "Aus der Ferne." }] },
      naechster: { datum: h.tagePlus(6), typ: "turnier", titel: "Turnier Zwei", heim: false, uhrzeit: "10:00:00", treffzeit: "09:30" } },
    11: { ausgabe: ausgabe(11, 1, { foto_ids: [] }), termin: { id: 82, datum: liste[1].datum, typ: "spiel", titel: "Spiel", gegner: "Testgegner", heim: true, ort: null, uhrzeit: "10:00:00", uhrzeit_ende: null, spielform: null, ergebnis: "3:2" },
      teams: [], ergebnisse: [], portraet: null, naechster: null } };
  const medien = { 12: [{ art: "titelbild", bucket: "heft_media", pfad: "12/titel.jpg" }, { art: "audio", bucket: "heft_media", pfad: "12/hoeren.mp3" },
    ...[1, 2, 3, 4].map(i => ({ art: "galerie", bucket: "termin_media", pfad: `81/foto-${i}.jpg`, pos: i }))], 11: [] };
  const arg = req => { try { return JSON.parse(req.postData() || "{}").p_ausgabe; } catch (e) { return null; } };
  const sb = await elternStart(basisEltern({ heft_ausgaben_liste: liste, heft_ausgabe_lesen: (u, req) => lesen[arg(req)] || null, heft_medien: (u, req) => medien[arg(req)] || [] }));
  const rb = await sb.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 40 && typeof nestOpen !== "function"; i++) await w(100);
    await nestOpen(); await w(1200);
    const m = document.getElementById("nest-modal"), txt = el => el ? el.textContent.replace(/\s+/g, " ").trim() : null;
    const out = {
      kopf: txt(m.querySelector(".nest-kopf")), abschnitte: [...m.querySelectorAll("[data-abschnitt]")].map(x => x.dataset.abschnitt),
      archiv: [...m.querySelectorAll(".nest-archiv button")].map(b => ({ t: txt(b), cur: b.getAttribute("aria-current") })),
      karte: txt(document.getElementById("nest-spieltagskarte")), teams: [...m.querySelectorAll(".nest-team")].map(txt),
      fotos: [...m.querySelectorAll("#nest-fotos img")].filter(i => /^blob:/.test(i.src)).length,
      titelbild: /^blob:/.test(document.getElementById("nest-titelbild")?.src || ""),
      steck: txt(document.getElementById("nest-steckbrief")), reporter: txt(document.getElementById("nest-reporter")),
      heft: txt(m), zitat: txt(m.querySelector(".nest-zitat")),
      schrift: getComputedStyle(m.querySelector(".nest-schlagzeile")).fontFamily
    };
    const hb = document.getElementById("nest-hoeren");
    out.hoeren = hb ? { h: Math.round(hb.getBoundingClientRect().height), t: txt(hb) } : null;
    if (hb) { hb.click(); await w(800); }
    out.audioSrc = /^blob:/.test(document.getElementById("nest-audio")?.src || "");
    const z = m.querySelector(".nest-ende .nest-zurueck"); out.zurueckH = z ? Math.round(z.getBoundingClientRect().height) : 0;
    // Archiv: Ausgabe 01 öffnen
    const b01 = [...m.querySelectorAll(".nest-archiv button")].find(b => /Ausgabe 01/.test(b.textContent));
    if (b01) { b01.click(); await w(900); }
    out.kopf01 = txt(document.querySelector("#nest-modal .nest-kopf")); out.erg01 = txt(document.getElementById("nest-ergebnis"));
    out.abschnitte01 = [...document.querySelectorAll("#nest-modal [data-abschnitt]")].map(x => x.dataset.abschnitt);
    document.querySelector("#nest-modal .nest-ende .nest-zurueck")?.click(); await w(200);
    out.zu = !document.getElementById("nest-modal");
    return out;
  }).catch(e => ({ fehler: String(e) }));
  const fonts = sb.anfragen.filter(u => /fonts\.(googleapis|gstatic)\.com/.test(u)).length;
  const barlow = sb.anfragen.filter(u => /vendor\/barlow\.css/.test(u)).length, woff = sb.anfragen.filter(u => /vendor\/fonts\/barlow-[a-z-]+\.woff2/.test(u)).length;
  const fb = sb.fehler(); await sb.schliessen();
  if (rb.fehler) probleme.push("b–g) " + rb.fehler);
  else {
    const arch = rb.archiv || [];
    if (!/Ausgabe 02/.test(rb.kopf) || arch.length !== 2 || !arch.some(x => /Ausgabe 01/.test(x.t)) || !arch.some(x => /Ausgabe 02/.test(x.t) && x.cur === "true") || !/Ausgabe 01/.test(rb.kopf01) || rb.erg01 !== "Ergebnis3:2")
      probleme.push("b) " + JSON.stringify({ kopf: rb.kopf, arch, kopf01: rb.kopf01, erg01: rb.erg01 }));
    else zeilen.push("b) neueste ist Ausgabe 02, Archiv zeigt 01 und öffnet sie (Ergebnis 3:2 aus dem Termin)");
    const reihe = (rb.abschnitte || []).join(",");
    if (reihe !== "deckblatt,spieltag,portraet,rubriken" || /\bnull\b|undefined|NaN/.test(rb.heft || "") || (rb.abschnitte01 || []).join(",") !== "deckblatt,spieltag,rubriken" || /Gute Besserung|Aus dem Training/.test(rb.heft || ""))
      probleme.push("c) " + JSON.stringify({ reihe, reihe01: rb.abschnitte01 }) + " · " + String(rb.heft).slice(0, 160));
    else zeilen.push("c) Deckblatt → Spieltag → Porträt → Rubriken; ohne Porträt fehlt der Abschnitt, leere Felder fehlen");
    const k = rb.karte || "";
    if (!/Testfestival/.test(k) || !/Testverein U9/.test(k) || !/Teststraße 1/.test(k) || !/10:15–11:30 Uhr/.test(k) || !/FUNiño/.test(k) || !/2 Adler-Teams/.test(k) || !/2:1 gegen Gegner 1/.test(k)
      || !/Kind B \(C\), Kind C/.test(rb.teams[0] || "") || !/Trainer X/.test(rb.teams[0] || "") || rb.fotos !== 4 || !rb.titelbild || !/^„?Viele Doppelpässe/.test(rb.zitat || ""))
      probleme.push("d) " + JSON.stringify({ k, teams: rb.teams, fotos: rb.fotos, titelbild: rb.titelbild, zitat: rb.zitat }));
    else zeilen.push(`d) Spieltagskarte „${k.slice(0, 70)}…“ · Team 1 „${rb.teams[0]}“ · 4 Fotos, Titelbild`);
    if (/Starker Fuß/.test(rb.steck || "") || !/Lieblingsverein/.test(rb.steck || "") || !/Vorbild/.test(rb.steck || "") || !/Traumtor/.test(rb.reporter || "") || /Position/.test(rb.steck || ""))
      probleme.push("e) " + JSON.stringify({ steck: rb.steck, rep: rb.reporter }));
    else zeilen.push(`e) Steckbrief „${rb.steck}“ – ohne starken Fuß und Position, Reporter „${rb.reporter}“`);
    if (!rb.hoeren || rb.hoeren.h < 48 || !/1:36 Min\./.test(rb.hoeren.t) || !rb.audioSrc || rb.zurueckH < 44 || !rb.zu)
      probleme.push("f) " + JSON.stringify({ hoeren: rb.hoeren, audio: rb.audioSrc, zurueck: rb.zurueckH, zu: rb.zu }));
    else zeilen.push(`f) „${rb.hoeren.t}“ ${rb.hoeren.h} px, lädt die Hördatei; „Zurück zur App“ ${rb.zurueckH} px schließt`);
    if (fonts || !barlow || !woff || !/Barlow Condensed/.test(rb.schrift || "")) probleme.push("g) " + JSON.stringify({ fonts, barlow, woff, schrift: rb.schrift }));
    else zeilen.push(`g) Barlow lokal (barlow.css + ${woff} woff2), ${fonts} Anfragen an Google`);
  }
  if (fa.length || fb.length) probleme.push("Konsole: " + fa.concat(fb).slice(0, 2).join(" | "));

  // h) alter öffentlicher Link
  const sh = await h.starten({ start: "/eltern/index.html?heft", angemeldet: false, warten: 1500, supabase: h.supabaseAttrappe({ funktionen: { "stadionheft-view": { published: true, heft: { titel: "Altes Heft" }, spieler: [] } } }) });
  const rh = await sh.page.evaluate(() => ({ text: document.body.textContent.replace(/\s+/g, " "), link: document.getElementById("heft-zum-login")?.getAttribute("href") || "" }));
  const altAufruf = (sh.gesendet || []).filter(x => /stadionheft-view/.test(x.pfad)).length;
  await sh.schliessen();
  if (!/Das Adler Nest lesen Eltern in der App\./.test(rh.text) || !/\?portal$/.test(rh.link) || /Altes Heft/.test(rh.text) || altAufruf)
    probleme.push("h) " + JSON.stringify({ link: rh.link, altAufruf, text: rh.text.slice(0, 160) }));
  else zeilen.push("h) ?heft zeigt „Das Adler Nest lesen Eltern in der App.“ mit Weg zur Anmeldung, ohne alten Inhalt");

  // i) Editor
  const zeile = { id: 5, team: "adler1", nummer: 3, termin_id: 81, status: "entwurf", schlagzeile: "Test", foto_ids: [],
    portraet_privatfotos: [{ pfad: "5/a.jpg", unterschrift: "Eins", einverstanden: true }, { pfad: "5/b.jpg", unterschrift: "Zwei", einverstanden: true }] };
  const st = await h.starten({ warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [{ id: 81, datum: h.tagePlus(-1), typ: "turnier", titel: "Testfestival" }],
    heft_ausgabe: u => /id=eq\.5/.test(String(u)) ? [zeile] : /select=nummer/.test(String(u)) ? [{ nummer: 3 }] : [zeile], kabine_reporter: [], portraet_verlauf: [],
    rpc: { termin_gallery: [1, 2, 3, 4, 5, 6, 7].map(i => ({ id: 700 + i, foto_path: `81/f${i}.jpg`, created_at: new Date().toISOString() })) } }) });
  await st.page.route(/\/storage\/v1\/object\/authenticated\//, r => r.fulfill({ status: 200, contentType: "image/jpeg", body: JPG }));
  const ri = await st.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 40 && typeof nestEditorOpen !== "function"; i++) await w(100);
    const toasts = []; const t0 = window.toast; window.toast = (m, k) => { toasts.push(String(m)); try { t0 && t0(m, k); } catch (e) {} };
    await nestEditorOpen(); await w(300); await nestEdOeffnen(5); await w(900);
    const knoepfe = [...document.querySelectorAll("#nest-ed-fotos .nest-ed-foto")];
    for (const b of knoepfe) { b.click(); await w(30); }
    const out = { fotos: knoepfe.length, gewaehlt: document.querySelectorAll('#nest-ed-fotos .nest-ed-foto[aria-pressed="true"]').length,
      zahl: document.getElementById("nest-foto-zahl")?.textContent, toast: toasts.find(t => /Höchstens 6/.test(t)) || null,
      privatInput: !!document.getElementById("nest-privat-wahl"), privatText: (document.getElementById("nest-ed-privat") || {}).textContent || "" };
    // neue Ausgabe: ohne Häkchen kein Hochladen
    await nestEdNeu(); await w(700);
    const inp = document.getElementById("nest-privat-wahl"), ok = document.getElementById("nest-privat-ok");
    out.neuNummer = (document.querySelector("#nest-ed-body") || {}).textContent.match(/Ausgabe (\d+)/)?.[1];
    out.gesperrt = !!(inp && inp.disabled);
    if (ok) { ok.click(); await w(50); }
    out.frei = !!(inp && !inp.disabled);
    window.toast = t0;
    return out;
  }).catch(e => ({ fehler: String(e) }));
  const fi = st.fehler(); await st.schliessen();
  if (ri.fehler || ri.fotos !== 7 || ri.gewaehlt !== 6 || ri.zahl !== "6 von 6" || !ri.toast || ri.privatInput || !/Mehr als 2 Privatfotos/.test(ri.privatText) || !ri.gesperrt || !ri.frei || ri.neuNummer !== "04")
    probleme.push("i) " + JSON.stringify(ri));
  else zeilen.push(`i) 7 Fotos angetippt → 6 gewählt („${ri.zahl}“, „${ri.toast}“); bei 2 Privatfotos kein Hochladen; neu (Nr. ${ri.neuNummer}): gesperrt bis zum Häkchen`);
  if (fi.length) probleme.push("Konsole Editor: " + fi.slice(0, 2).join(" | "));

  // j) Befund 03.10.
  const sj = await h.starten({ warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const rj = await sj.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 40 && typeof kapitaenWahlHtml !== "function"; i++) await w(100);
    KAP_HEUTE = { 3: "Kind A" };
    const html = kapitaenWahlHtml(3, ["Kind B", "Kind C"]); await w(200);
    const bleibt = (KAP_HEUTE = { 2: "Kind D" }, kapitaenWahlHtml(2, ["Kind D", "Kind E"]), KAP_HEUTE[2]);
    nomStatus = { "Kind A": "verletzt", "Kind B": "dabei", "Kind C": "nicht" };
    return { neu: /Kapitän neu wählen/.test(html) && /Kind A/.test(html), weg: !KAP_HEUTE[3], bleibt,
      nd: [nomNichtDabei("Kind A"), nomNichtDabei("Kind B"), nomNichtDabei("Kind C"), nomNichtDabei("Kind O")] };
  }).catch(e => ({ fehler: String(e) }));
  const del = (sj.gesendet || []).filter(x => x.methode === "DELETE" && /match_actions/.test(x.pfad) && /aktion=eq\.kapitaen/.test(x.suche || "") && /Kind%20A|Kind A/.test(x.suche || ""));
  await sj.schliessen();
  if (rj.fehler || !rj.neu || !rj.weg || rj.bleibt !== "Kind D" || !del.length || JSON.stringify(rj.nd) !== "[true,false,true,false]")
    probleme.push("j) " + JSON.stringify({ ...rj, del: del.length }));
  else zeilen.push("j) Kapitän außerhalb des Teams verworfen („Kapitän neu wählen“, Zeile gelöscht), im Team bleibt er; verletzt/nicht zählen nicht");

  return h.ergebnis("v733 Adler Nest als Ausgaben: lesen, hören, Editor, alter Link, Kapitän", !probleme.length, zeilen.concat(probleme));
};
