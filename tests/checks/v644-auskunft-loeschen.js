/* v644 · PO: „Löschen/Auskunft per Knopf“ – Entscheidung 27.09.: „Download der Daten, außer die
   Einschätzungen der Trainer“ und „Konto selbst, Kind per Antrag“.

   a) „Meine Daten herunterladen“ holt den Auszug aus der RPC eltern_datenauszug und speichert ihn.
   b) Das Fenster „Daten löschen“: je Kind ein Antrag, das Konto erst nach dem Häkchen; Knöpfe ≥ 44 px.
   c) Der Antrag schreibt loeschantrag mit dem Kind (die Kennung setzt die Datenbank); ein offener Antrag zeigt nur den Stand.
   d) Konto löschen ruft konto-loeschen mit bestaetigt:true und meldet danach ab.
   e) Trainer: Karte „Löschanträge“ mit Namen und „Jetzt löschen“ → kind-loeschen mit der Kader-ID.
   f) Statisch: der Auszug enthält keine Einschätzungs-Tabellen; loeschantrag steht in der Sicherung. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const K = h.KINDER;
  let antraege = [];
  const s = await h.starten({ hoehe: 1400, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    loeschantrag: (u, req) => (req.method() === "GET" ? (/erledigt_am=is\.null/.test(u.search) ? antraege.filter(a => !a.erledigt_am) : antraege) : { status: 201, body: "[]" }),
    rpc: { eltern_datenauszug: () => ({ verein: "SV Adler Dellbrück · U9", kinder: [{ stammdaten: { name: "Kind A" } }], hinweis: "ohne Einschätzungen" }) },
    funktionen: { "konto-loeschen": () => ({ ok: true }), "kind-loeschen": () => ({ ok: true, bewertungen: 1 }) } }) });
  const r = await s.page.evaluate(async K => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = {};
    try { await loadKader(); } catch (e) {}
    const kid = KADER[1];
    window._elternKids = [{ spieler_id: kaderId(kid), kader: { name: kid.name } }];
    const log = [];
    const echt = window.fetch;
    window.fetch = (u, o) => { if (/supabase\.co/.test(String(u)) && o && o.method && o.method !== "GET") log.push(o.method + " " + String(u).split(".co/")[1] + " " + (o.body || "")); return echt(u, o); };
    // a) Download
    let geladen = null; const ecu = URL.createObjectURL;
    URL.createObjectURL = b => { geladen = b; return "blob:x"; };
    const ac = HTMLAnchorElement.prototype.click; let datei = ""; HTMLAnchorElement.prototype.click = function () { datei = this.download; };
    await elternDataExport(); await warte(50);
    out.a = { rpc: log.some(x => /rpc\/eltern_datenauszug/.test(x)), datei, inhalt: geladen ? await geladen.text() : "" };
    URL.createObjectURL = ecu; HTMLAnchorElement.prototype.click = ac;
    // b) Fenster
    await elternLoeschenOpen(); await warte(50);
    const m = document.getElementById("el-loeschen-modal");
    const knoepfe = m ? [...m.querySelectorAll("button")] : [];
    out.b = { dialog: m && m.getAttribute("role") === "dialog" && m.getAttribute("aria-modal") === "true",
      kindKnopf: knoepfe.some(b => b.textContent.includes(kid.name)), kontoGesperrt: document.getElementById("el-konto-los")?.disabled,
      klein: knoepfe.filter(b => b.getBoundingClientRect().height < 44).map(b => b.textContent.trim()) };
    // c) Antrag
    const kb = knoepfe.find(b => b.textContent.includes(kid.name));
    await elternLoeschantrag(kaderId(kid), kb); await warte(80);
    out.c = { post: log.find(x => /^POST rest\/v1\/loeschantrag /.test(x)) || "" };
    return { out, kidId: kaderId(kid), kidName: kid.name };
  }, K);
  // offener Antrag → Stand statt Knopf
  antraege = [{ id: 5, spieler_id: r.kidId, erstellt_am: "2026-09-20T10:00:00Z", erledigt_am: null, antrag_email: "eltern@example.org" }];
  const r2 = await s.page.evaluate(async ({ kidId, kidName }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = {};
    await elternLoeschenOpen(); await warte(50);
    const m = document.getElementById("el-loeschen-modal");
    out.stand = /Löschantrag gestellt am/.test(m.textContent); out.knopfWeg = ![...m.querySelectorAll("button")].some(b => b.textContent.includes(kidName));
    // d) Konto löschen – ohne Häkchen passiert nichts
    const log = []; const echt = window.fetch;
    window.fetch = (u, o) => { if (/functions\/v1/.test(String(u))) log.push(String(u).split("/functions/v1/")[1] + " " + (o && o.body || "")); return echt(u, o); };
    let abgemeldet = false; const alt = window.elternPortalLogout; window.elternPortalLogout = () => { abgemeldet = true; };
    await elternKontoLoeschen(document.getElementById("el-konto-los")); await warte(30);
    out.ohneHaken = log.length;
    const cb = document.getElementById("el-konto-ok"); cb.checked = true; cb.dispatchEvent(new Event("change"));
    out.freigegeben = !document.getElementById("el-konto-los").disabled;
    await elternKontoLoeschen(document.getElementById("el-konto-los")); await warte(80);
    out.konto = log.find(x => /^konto-loeschen/.test(x)) || ""; out.abgemeldet = abgemeldet;
    window.elternPortalLogout = alt;
    // e) Trainer
    let box = document.getElementById("la-trainer"); if (!box) { box = document.createElement("div"); box.id = "la-trainer"; document.body.appendChild(box); }
    await loeschantraegeTrainerLoad(); await warte(50);
    out.karte = box.textContent; const jetzt = [...box.querySelectorAll("button")].find(b => /Jetzt löschen/.test(b.textContent));
    window.confirm = () => true;
    if (jetzt) jetzt.click(); await warte(120);
    out.kind = log.find(x => /^kind-loeschen/.test(x)) || "";
    window.fetch = echt;
    return out;
  }, { kidId: r.kidId, kidName: r.kidName });
  const fe = s.fehler(); await s.schliessen();

  const a = r.out.a;
  if (!a.rpc || !/^adler-daten-\d{4}-\d{2}-\d{2}\.json$/.test(a.datei) || !/ohne Einschätzungen/.test(a.inhalt)) probleme.push("a) Download: " + JSON.stringify({ rpc: a.rpc, datei: a.datei }));
  const b = r.out.b;
  if (!b.dialog || !b.kindKnopf || b.kontoGesperrt !== true) probleme.push("b) Fenster: " + JSON.stringify(b));
  if (b.klein.length) probleme.push("b) Knöpfe unter 44 px: " + b.klein.join(", "));
  if (!new RegExp('"spieler_id":' + r.kidId).test(r.out.c.post) || /"antrag_von"/.test(r.out.c.post)) probleme.push("c) Antrag (antrag_von setzt die Datenbank): " + r.out.c.post);
  if (!r2.stand || !r2.knopfWeg) probleme.push("c) offener Antrag zeigt keinen Stand: " + JSON.stringify({ stand: r2.stand, knopfWeg: r2.knopfWeg }));
  if (r2.ohneHaken !== 0 || !r2.freigegeben || !/"bestaetigt":true/.test(r2.konto) || !r2.abgemeldet) probleme.push("d) Konto löschen: " + JSON.stringify(r2));
  if (!r2.karte.includes(r.kidName) || !/Löschanträge \(1\)/.test(r2.karte)) probleme.push("e) Trainer-Karte: " + r2.karte.slice(0, 120));
  if (!new RegExp('"spieler_id":' + r.kidId).test(r2.kind)) probleme.push("e) kind-loeschen nicht aufgerufen: " + r2.kind);
  // f) statisch
  const mig = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20260927_v644_auskunft_loeschen.sql"), "utf8");
  const liste = (mig.match(/foreach tab in array array\[([\s\S]*?)\]/) || [])[1] || "";
  ["spielerprofile", "entwicklungsziele", "tagebuch_eintrag", "blitz_ratings", "einheit_bewertung", "trainings_eval", "nominierung_hinweis"].forEach(t => {
    if (liste.includes("'" + t + "'")) probleme.push("f) Einschätzung im Auszug: " + t);
  });
  if (!liste) probleme.push("f) Tabellenliste des Auszugs nicht gefunden");
  if (!/"loeschantrag"/.test(fs.readFileSync(path.join(h.REPO, "views.js"), "utf8"))) probleme.push("f) loeschantrag fehlt in der Sicherung");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`Download ${a.datei} · Antrag ${r.out.c.post.slice(0, 60)} · Konto ${r2.konto.slice(0, 40)} · Trainer ${r2.kind.slice(0, 40)}`);
  return h.ergebnis("v644 Auskunft und Löschen per Knopf", !probleme.length, probleme.concat(zeilen));
};
