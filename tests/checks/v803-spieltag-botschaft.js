/* v803 · Nachricht an alle Kinder eines Spieltags (Charles 07.11.): Text oder Sprache an alle, die dabei waren – in die Kabine,
   bei den Eltern ein Push (lob_push_faellig, Migration v803).
   a) Spieltag „③ Nach dem Spiel“: Karte „Nachricht an die Kinder“ mit der Zahl der „dabei“-Kinder
   b) Dialog: Text, Aufnahme, Empfänger (alle „dabei“ vorgewählt, einzeln abwählbar); ohne Inhalt oder Empfänger wird nicht gesendet;
      erst „Prüfen“, dann „Ja, senden“; je Kind eine Zeile (art spieltag, gleiche gruppe, Betreff mit Turnier, Termin-Nr.)
   c) mit Sprache: je Kind eine Datei im Bucket (Pfad beginnt mit der Kind-Nr.), Zeilen tragen den Pfad
   d) Zurückziehen: Zeilen der Gruppe weg, Dateien weg
   e) Kabine: Textnachricht als Karte mit Betreff, Text und „Neu“; wird einmal als gehört vermerkt; Sprachnachricht mit Knopf zum Anhören
   f) Migration: Spalten, Prüfregeln, Push-Text für „spieltag“ */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [], K = h.KINDER;
  const heute = h.tagePlus(0);
  const lobe = [], uploads = [], loeschen = [];
  let nextId = 100;
  const nom = {}; K.slice(0, 4).forEach(n => { nom[n] = "dabei"; }); nom[K[4]] = "nicht";
  const s = await h.starten({ hoehe: 2000, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), anwesenheit: [], trainingsplan: [], trainingsgruppen: [],
    termine: [{ id: 77, datum: heute, typ: "turnier", titel: "Kinderfestival", uhrzeit: "10:15", trainer_status: {} }],
    nominierungen: u => ((u.searchParams.get("datum") || "").includes("__nom") ? [{ datum: heute + "__nom", data: nom }] : []),
    kabine_lob: (u, req) => {
      if (req.method() === "POST") { const b = JSON.parse(req.postData() || "[]"); (Array.isArray(b) ? b : [b]).forEach(z => lobe.push({ id: nextId++, created_at: new Date().toISOString(), gehoert_am: null, ...z })); return { status: 201, body: "[]" }; }
      if (req.method() === "DELETE") { const g = (u.searchParams.get("gruppe") || "").replace("eq.", ""); for (let i = lobe.length - 1; i >= 0; i--) if (lobe[i].gruppe === g) lobe.splice(i, 1); return { status: 204, body: "" }; }
      const gq = (u.searchParams.get("gruppe") || "").replace("eq.", "");
      return lobe.filter(z => !gq || z.gruppe === gq).map(z => ({ ...z }));
    } }) });
  await s.page.route(/\/storage\/v1\/object\/kabine-lob\//, r => {
    const m = r.request().method(), url = r.request().url().split("/kabine-lob/")[1];
    if (m === "POST") { uploads.push(decodeURIComponent(url)); return r.fulfill({ status: 200, contentType: "application/json", body: "{}" }); }
    if (m === "DELETE") { loeschen.push(decodeURIComponent(url)); return r.fulfill({ status: 200, contentType: "application/json", body: "{}" }); }
    return r.continue();
  });
  await h.sichtbarMachen(s.page, "#train-sub-spieltag");
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const out = {};
    await loadKader(); document.getElementById("pin-gate")?.remove();
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    if (typeof botschaftOpen !== "function") return { fehlt: true };
    const nomVor = {}; KADER.forEach(k => { nomVor[k.name] = "offen"; });
    const dabei = KADER.filter(k => k.aktiv !== false).slice(0, 4).map(k => k.name); dabei.forEach(n => { nomVor[n] = "dabei"; });
    nomStatus = nomVor;
    await botschaftRender();
    const pan = document.getElementById("botschaft-panel");
    out.a = { text: pan ? pan.textContent.replace(/\s+/g, " ") : "", knopf: !!document.getElementById("bot-offen"), hoehe: Math.round((document.getElementById("bot-offen") || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height) };
    // b)
    await botschaftOpen(); await w(100);
    out.dbg = { termin: !!_botTermin, kinder: _botKinder.length, datum: typeof spieltagRawDate === "function" ? spieltagRawDate() : "?", modal: !!document.getElementById("botschaft-modal") };
    if (!document.getElementById("botschaft-modal")) return out;
    const m = document.getElementById("botschaft-modal");
    out.b = { role: m && m.getAttribute("role"), chips: m ? m.querySelectorAll("#bot-kinder button").length : 0 };
    botschaftPruefen(); out.b.leer = (document.getElementById("bot-meldung") || {}).textContent;
    document.getElementById("bot-text").value = "Ihr wart heute richtig stark – danke fürs Zusammenspielen!"; botschaftZaehler();
    document.querySelector("#bot-kinder button").click();   // erstes Kind abwählen
    out.b.nachAbwahl = (document.getElementById("bot-anzahl") || {}).textContent;
    botschaftPruefen(); out.b.pruefen = (document.getElementById("bot-knoepfe") || {}).textContent.replace(/\s+/g, " ");
    document.getElementById("bot-ja").click(); await w(600);
    out.b.zu = !document.getElementById("botschaft-modal");
    // c) mit Sprache
    await botschaftOpen(); await w(100);
    window._botBlob = null;
    _botBlob = new Blob(["x"], { type: "audio/webm" });
    document.getElementById("bot-text").value = "";
    botschaftPruefen(); document.getElementById("bot-ja").click(); await w(900);
    out.c = { zu: !document.getElementById("botschaft-modal") };
    await botschaftRender(); out.liste = (document.getElementById("botschaft-panel") || {}).textContent.replace(/\s+/g, " ");
    return out;
  });
  if (r.fehlt) { await s.schliessen(); return h.ergebnis("v803 Spieltag-Nachricht", false, ["botschaftOpen fehlt"]); }
  if (r.dbg && !r.dbg.modal) { await s.schliessen(); return h.ergebnis("v803 Spieltag-Nachricht", false, ["Dialog ging nicht auf: " + JSON.stringify({ dbg: r.dbg, a: r.a })]); }
  const text = lobe.filter(z => z.nachricht), sprache = lobe.filter(z => z.path);
  if (!/dabei waren \(4\)/.test(r.a.text) || !r.a.knopf || r.a.hoehe < 48) probleme.push("a) Karte: " + JSON.stringify(r.a));
  if (r.b.role !== "dialog" || r.b.chips !== 4 || !/Text schreiben|Sprachnachricht/.test(r.b.leer || "") || !/3 von 4/.test(r.b.nachAbwahl || "") || !/3 Kinder/.test(r.b.pruefen || "") || !r.b.zu) probleme.push("b) Dialog: " + JSON.stringify(r.b));
  const g = text[0] && text[0].gruppe;
  if (text.length !== 3 || text.some(z => z.art !== "spieltag" || z.gruppe !== g || z.path || z.termin_id !== 77 || !/^Nach dem Turnier „Kinderfestival“/.test(z.betreff || "") || !/richtig stark/.test(z.nachricht)) || new Set(text.map(z => z.spieler_id)).size !== 3) probleme.push("b) Zeilen: " + JSON.stringify(text).slice(0, 300));
  if (sprache.length !== 4 || uploads.length !== 4 || sprache.some(z => z.art !== "spieltag" || !new RegExp("^" + z.spieler_id + "/\\d+-sp\\.webm$").test(z.path)) || sprache.some(z => z.nachricht) || !r.c.zu) probleme.push("c) Sprache: " + JSON.stringify({ n: sprache.length, up: uploads.length, p: sprache.map(z => z.path) }));
  zeilen.push(`Karte, Dialog (4 Kinder, eins abgewählt → 3 Zeilen mit gleicher Gruppe), Sprache (4 Dateien, Pfad beginnt mit der Kind-Nr.)`);
  // d) Zurückziehen
  const d = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const knoepfe = () => document.querySelectorAll(".bot-gesendet button");
    const n0 = knoepfe().length; knoepfe()[0].click(); await w(700);
    const n1 = document.querySelectorAll(".bot-gesendet").length; return { n0, n1 };
  });
  const nachErsten = { rest: lobe.length, geloescht: loeschen.length };
  const d2 = await s.page.evaluate(async () => { const w = ms => new Promise(x => setTimeout(x, ms)); const b = document.querySelectorAll(".bot-gesendet button"); if (b[0]) b[0].click(); await w(700); return document.querySelectorAll(".bot-gesendet").length; });
  if (d.n0 !== 2 || d.n1 !== 1 || d2 !== 0 || lobe.length !== 0 || loeschen.length !== 4 || nachErsten.rest !== 4 || nachErsten.geloescht !== 0 || loeschen.some(p => !/^\d+\/\d+-sp\.webm$/.test(p))) probleme.push("d) Zurückziehen: " + JSON.stringify({ d, d2, nachErsten, rest: lobe.length, geloescht: loeschen.length }));
  zeilen.push(`Zurückziehen: ${d.n0} Nachrichten gelistet, danach ${lobe.length} Zeilen übrig, ${loeschen.length} Dateien gelöscht`);
  // e) Kabine
  const kab = [
    { id: 301, spieler_id: 1, path: null, art: "spieltag", nachricht: "Ihr wart stark!", betreff: "Nach dem Turnier „Kinderfestival“ · 07.11.", created_at: "2026-11-07T17:00:00Z", gehoert_am: null },
    { id: 302, spieler_id: 1, path: "1/x-sp.webm", art: "spieltag", nachricht: null, betreff: "Nach dem Turnier „Kinderfestival“ · 07.11.", created_at: "2026-11-07T17:05:00Z", gehoert_am: null },
    { id: 303, spieler_id: 1, path: "1/a.webm", art: "lob", nachricht: null, betreff: null, created_at: "2026-10-03T16:20:00Z", gehoert_am: "2026-10-03T18:00:00Z" }];
  const patches = [];
  const s2 = await h.starten({ start: "/eltern/index.html", warten: 2500, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), profiles: [{ role: "parent" }],
    kabine_lob: (u, req) => { if (req.method() === "PATCH") { patches.push(decodeURIComponent(u.search)); return { status: 204, body: "" }; } return kab; } }) });
  const e = await s2.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 80 && typeof lobListeOpen !== "function"; i++) await w(50);
    if (typeof lobListeOpen !== "function") return { fehlt: true };
    window._elternKids = [{ spieler_id: 1, kader: { id: 1, name: "Testa Beispiel" } }];
    await lobListeOpen(1, "Testa"); await w(500);
    const dlg = document.getElementById("lob-liste");
    return { karten: dlg.querySelectorAll(".lob-karte").length, zeilen: dlg.querySelectorAll(".lob-zeile").length, text: dlg.textContent.replace(/\s+/g, " "), neu: dlg.querySelectorAll(".lob-neu").length,
      klein: [...dlg.querySelectorAll("button")].filter(b => b.getBoundingClientRect().height < 44).length };
  });
  const fe = [...s.fehler(), ...s2.fehler()]; await s.schliessen(); await s2.schliessen();
  if (e.fehlt) probleme.push("e) lobListeOpen fehlt");
  else if (e.karten !== 2 || e.zeilen !== 2 || !/Ihr wart stark!/.test(e.text) || !/Nach dem Turnier „Kinderfestival“/.test(e.text) || e.neu !== 2 || e.klein || patches.length !== 1 || !/id=in\.\(301,302\)&gehoert_am=is\.null/.test(patches[0])) probleme.push("e) Kabine: " + JSON.stringify({ ...e, patches }));
  zeilen.push("Kabine: zwei Karten (Text + Sprache) und das alte Lob in der Liste, „Neu“ 2×, ein PATCH für die Text-Zeilen");
  // f) Migration
  const sql = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20261110_v803_spieltag_botschaft.sql"), "utf8");
  if (!/path drop not null/.test(sql) || !/art in \('lob','spieltag'\)/.test(sql) || !/char_length\(nachricht\) <= 600/.test(sql) || !/kabine_lob_inhalt_check/.test(sql) || !/'💬 Nachricht für '/.test(sql)) probleme.push("f) Migration unvollständig");
  zeilen.push("Migration: path optional, art, Text ≤ 600, Text oder Datei, Push-Text für spieltag");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v803 Nachricht an die Kinder nach dem Spieltag", !probleme.length, probleme.length ? probleme : zeilen);
};
