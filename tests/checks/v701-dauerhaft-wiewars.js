/* v701 · Konsequenz „gilt dauerhaft“, Aha oben auf der Prüfkarte, Benachrichtigung „Wie war's?“
   Aufträge: doku/auftrag-tagebuch-ki-sortieren/nachtrag-2-2026-09-29.md (Punkte 2 und 3),
   prozess-nacherfassung.md (Tipp auf die Benachrichtigung öffnet direkt die Aufnahme).
   PO 30.09.: „Alles inkl. Push“.

   a) Prüfkarte: das Aha-Feld steht oben – vor Baustein und Beobachtung
   b) „gilt dauerhaft“: Knopf neben den Datums-Chips; „Passt so“ ohne Datum ergibt einen fertigen
      Eintrag (kein Keim), der Punkt trägt dauerhaft=true und bis=null
   c) Wiedervorlage: ein dauerhafter Punkt steht nicht darin, ein Punkt mit Frist schon
   d) Tagebuch-Fenster: Haken „gilt dauerhaft“ blendet das Datum aus und speichert dauerhaft
   e) Liste und Export: „(gilt dauerhaft)“ statt einer Frist
   f) Benachrichtigung: ?wiewars=e<id> öffnet die Prüfkarte; bei offener App nimmt pushZielEmpfangen
      das Ziel an; ein fremder Wert wird abgelehnt
   g) Server: Migration mit Spalte, Log-Tabelle (RLS), Entscheidung in wiewars_push_faellig nur für
      service_role; rufe-push verschickt beides; Sicherung kennt das Log */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const gestern = h.tagePlus(-1), morgen = h.tagePlus(1);
  const db = {
    tagebuch_eintrag: [{ id: 20, autor: "Charles", datum: gestern, quelle: "einheit", termin_id: 41, anlass: "einheit", status: "keim",
      baustein: "ich", ausloeser: "Training", beobachtung: "Ich habe im Spiel nichts reingerufen.", aha: "Die Kinder lösen mehr, als ich denke.",
      konsequenz: "Anweisungen im Spiel schließe ich aus.", ki_vorschlag: true, bestaetigt_am: null, rueckfragen: [], schlagworte: [] }],
    tagebuch_punkt: [
      { id: 50, eintrag_id: 20, art: "konsequenz", text: "Anweisungen im Spiel schließe ich aus.", bis: null, dauerhaft: false, erledigt_am: null, autor: "Charles" },
      { id: 51, eintrag_id: 99, art: "todo", text: "Hütchen nachkaufen", bis: morgen, dauerhaft: false, erledigt_am: null, autor: "Charles" }],
    tagebuch_kind: []
  };
  let naechste = 200;
  const passt = (z, q) => {
    for (const [k, v] of q.entries()) {
      if (["select", "order", "limit", "on_conflict"].includes(k)) continue;
      const w = z[k];
      if (v.startsWith("eq.") && String(w) !== decodeURIComponent(v.slice(3))) return false;
      if (v === "is.null" && w != null) return false;
      if (v === "is.true" && w !== true) return false;
    }
    return true;
  };
  const tabelle = name => (u, req) => {
    const q = u.searchParams, m = req.method();
    if (m === "GET") return db[name].filter(z => passt(z, q));
    const body = (() => { try { return JSON.parse(req.postData() || "null"); } catch (e) { return null; } })();
    if (m === "POST") { const neu = (Array.isArray(body) ? body : [body]).map(b => ({ id: naechste++, ...b })); db[name].push(...neu); return { status: 201, body: JSON.stringify(neu) }; }
    if (m === "PATCH") { db[name].filter(z => passt(z, q)).forEach(z => Object.assign(z, body)); return { status: 204, body: "" }; }
    if (m === "DELETE") { db[name] = db[name].filter(z => !passt(z, q)); return { status: 204, body: "" }; }
    return [];
  };
  const s = await h.starten({ hoehe: 1600, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen().map((z, i) => ({ ...z, alias: String.fromCharCode(65 + i) })),
    profiles: [{ name: "Charles", rolle: "trainer" }],
    termine: [{ id: 42, datum: morgen, uhrzeit: "17:00", typ: "training", trainer_status: { Charles: "ja" } }],
    tagebuch_eintrag: tabelle("tagebuch_eintrag"), tagebuch_punkt: tabelle("tagebuch_punkt"), tagebuch_kind: tabelle("tagebuch_kind"),
    einheit_bewertung: [], event_bewertung: []
  }) });

  const r = await s.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const bis = async (f, n) => { for (let i = 0; i < (n || 60) && !f(); i++) await warte(50); return f(); };
    window.trainerMe = async () => "Charles";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    if (typeof tbpDauerhaft !== "function" || typeof wieWarsAbsichtJetzt !== "function" || typeof tbFristText !== "function") return { fehlt: true };
    await loadKader();
    const out = {};

    // f) Benachrichtigung bei geschlossener Karte: Absicht → Prüfkarte
    try { sessionStorage.setItem("adler_wiewars_intent", "e20"); } catch (e) {}
    wieWarsAbsichtJetzt();
    await bis(() => document.getElementById("tbp-passt"));
    out.f = { karte: !!document.getElementById("tb-pruefen"), rest: (() => { try { return sessionStorage.getItem("adler_wiewars_intent"); } catch (e) { return "?"; } })() };

    // a) Reihenfolge: Aha vor Baustein-Knöpfen und Beobachtung
    const k = document.getElementById("tb-pruefen-karte");
    const alle = [...k.querySelectorAll("#tbp-aha, #tbp-beobachtung, button[onclick^='tbpBaustein']")];
    out.a = { erstes: alle[0] && (alle[0].id || "baustein"), ahaWert: (document.getElementById("tbp-aha") || {}).value,
              ahaSchrift: parseFloat(getComputedStyle(document.getElementById("tbp-aha")).fontSize) };

    // b) gilt dauerhaft
    const d0 = k.querySelector("button.tbp-dauerhaft");
    out.b = { knopf: !!d0, hoehe: d0 ? d0.getBoundingClientRect().height : 0 };
    d0 && d0.click(); await warte(20);
    out.b.gedrueckt = (k.querySelector("button.tbp-dauerhaft") || {}).getAttribute && k.querySelector("button.tbp-dauerhaft").getAttribute("aria-pressed");
    await tbPasstSo(); await warte(80);

    // c) Wiedervorlage
    let box = document.getElementById("tb-liste"); if (!box) { box = document.createElement("div"); box.id = "tb-liste"; document.body.appendChild(box); }
    await tagebuchListe(); await warte(50);
    out.c = tbWiedervorlagePunkte().map(p => p.id);

    // e) Liste und Export
    tbSicht("eintraege"); await warte(20);
    out.e = { zeile: (box.querySelector('.tb-zeile[data-id="20"]') || {}).textContent || "", md: tbMarkdown(_TB_LISTE.find(x => x.id === 20), "arbeit") };

    // d) Tagebuch-Fenster: neuer Eintrag mit Haken
    tagebuchNeu && tagebuchNeu(); await bis(() => document.getElementById("tb-konsequenz"));
    tbBaustein("ich");
    document.getElementById("tb-ausloeser").value = "Grundsatz";
    document.getElementById("tb-aha").value = "Fragen statt Ansagen.";
    document.getElementById("tb-konsequenz").value = "Ich frage in jeder Pause zuerst.";
    const cb = document.getElementById("tb-konsequenz_dauerhaft");
    out.d = { haken: !!cb, datumVorher: !!document.getElementById("tb-konsequenz_bis") };
    if (cb) { cb.checked = true; cb.dispatchEvent(new Event("change")); await warte(20); }
    out.d.datumNachher = !!document.getElementById("tb-konsequenz_bis");
    await tagebuchSpeichern(); await warte(80);

    // f) offene App: das Ziel wird angenommen, Fremdes nicht
    const antw = [];
    const frage = url => new Promise(res => { const ch = new MessageChannel(); ch.port1.onmessage = e => { antw.push(e.data.ok); res(); }; pushZielEmpfangen({ data: { art: "push-ziel", url }, ports: [ch.port2] }); });
    await frage(location.pathname + "?wiewars=d2031-01-10");
    await frage(location.pathname + "?wiewars=javascript:alert(1)");
    out.f.ziel = antw;
    try { sessionStorage.removeItem("adler_wiewars_intent"); } catch (e) {}
    document.getElementById("tb-pruefen")?.remove(); document.getElementById("nb-gross-ov")?.remove();
    return out;
  }).catch(e => ({ fehler: String(e) }));
  const fe = s.fehler(); await s.schliessen();
  const titel = "v701 Konsequenz „gilt dauerhaft“, Aha oben, Benachrichtigung „Wie war's?“";
  if (r.fehlt) return h.ergebnis(titel, false, ["Funktionen fehlen (tbpDauerhaft/wieWarsAbsichtJetzt/tbFristText)"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Abbruch: " + r.fehler]);

  const e20 = db.tagebuch_eintrag.find(x => x.id === 20) || {};
  const p50 = db.tagebuch_punkt.find(x => x.id === 50) || {};
  const neuP = db.tagebuch_punkt.filter(x => x.id >= 200 && x.art === "konsequenz");
  if (!r.f.karte || r.f.rest) probleme.push("f) ?wiewars=e20 öffnet die Prüfkarte nicht: " + JSON.stringify(r.f));
  if (r.a.erstes !== "tbp-aha") probleme.push("a) Aha steht nicht oben: erstes Feld " + r.a.erstes);
  if (r.a.ahaWert !== "Die Kinder lösen mehr, als ich denke.") probleme.push("a) Aha nicht übernommen: " + r.a.ahaWert);
  if (!(r.a.ahaSchrift >= 15)) probleme.push("a) Aha nicht groß: " + r.a.ahaSchrift + " px");
  if (!r.b.knopf || r.b.hoehe < 44) probleme.push("b) Knopf „gilt dauerhaft“ fehlt oder zu klein: " + JSON.stringify(r.b));
  if (r.b.gedrueckt !== "true") probleme.push("b) Knopf nicht gedrückt nach Tipp");
  if (e20.status !== "fertig" || !e20.bestaetigt_am) probleme.push("b) Ohne Datum, aber dauerhaft: nicht fertig/bestätigt: " + JSON.stringify({ s: e20.status, b: !!e20.bestaetigt_am }));
  if (p50.dauerhaft !== true || p50.bis !== null) probleme.push("b) Punkt nicht dauerhaft gespeichert: " + JSON.stringify(p50));
  if (r.c.includes(50) || !r.c.includes(51)) probleme.push("c) Wiedervorlage: " + JSON.stringify(r.c));
  if (!/gilt dauerhaft/.test(r.e.zeile) || !/Anweisungen im Spiel schließe ich aus\. \(gilt dauerhaft\)/.test(r.e.md)) probleme.push("e) „(gilt dauerhaft)“ fehlt: " + r.e.md.split("\n").find(l => /Konsequenz/.test(l)));
  if (!r.d.haken || !r.d.datumVorher || r.d.datumNachher) probleme.push("d) Haken im Tagebuch-Fenster: " + JSON.stringify(r.d));
  if (neuP.length !== 1 || neuP[0].dauerhaft !== true || neuP[0].bis !== null) probleme.push("d) Neuer Punkt nicht dauerhaft: " + JSON.stringify(neuP));
  if (JSON.stringify(r.f.ziel) !== "[true,false]") probleme.push("f) pushZielEmpfangen: " + JSON.stringify(r.f.ziel));

  // g) Server
  const mig = fs.readdirSync(path.join(h.REPO, "supabase/migrations")).find(f => /v701/.test(f));
  const sql = mig ? fs.readFileSync(path.join(h.REPO, "supabase/migrations", mig), "utf8") : "";
  if (!/add column if not exists dauerhaft boolean not null default false/.test(sql)) probleme.push("g) Spalte dauerhaft fehlt in der Migration");
  if (!/create table if not exists public\.wiewars_push_log/.test(sql) || !/alter table public\.wiewars_push_log enable row level security/.test(sql)) probleme.push("g) Log-Tabelle/RLS fehlt");
  if (!/grant execute on function public\.wiewars_push_faellig\(timestamptz\) to service_role/.test(sql) || !/revoke all on function public\.wiewars_push_faellig/.test(sql)) probleme.push("g) Rechte der Funktion");
  if (!/v_std >= 21 or v_std < 7/.test(sql)) probleme.push("g) Ruhezeit fehlt");
  const fn = fs.readFileSync(path.join(h.REPO, "supabase/functions/rufe-push/index.ts"), "utf8");
  if (!/rpc\("wiewars_push_faellig"\)/.test(fn)) probleme.push("g) rufe-push fragt wiewars_push_faellig nicht");
  const views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  if (!views.includes('"wiewars_push_log"')) probleme.push("g) Sicherung ohne wiewars_push_log");
  const boot = fs.readFileSync(path.join(h.REPO, "boot.js"), "utf8");
  if (!/adler_wiewars_intent/.test(boot)) probleme.push("g) boot.js merkt ?wiewars nicht");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));

  zeilen.push(`a) Aha oben (${r.a.ahaSchrift}px) · b) dauerhaft → ${e20.status}, bis ${p50.bis} · c) Wiedervorlage ${JSON.stringify(r.c)} · d) Haken blendet Datum aus`);
  zeilen.push(`e) „(gilt dauerhaft)“ in Liste und Export · f) ?wiewars öffnet Prüfkarte, offene App ${JSON.stringify(r.f.ziel)} · g) Migration, rufe-push, Sicherung`);
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
