/* v674 · Adler-Rufe, Stufe 2: privat an das Trainerteam und Abstimmungen
   Beschluss 29.09. (Kachelrunden): „private Eltern ↔ Trainerteam“; Abstimmungen „namentlich oder
   anonym, der Ersteller wählt“, „alle Eltern dürfen starten“. PO 29.09.: „Direkt Stufe 2 komplett“.
   Die Rechte sind am 29.09. in der Datenbank mit simulierten Anmeldungen gefahren (Rollback):
   fremde Familie und Moderatorin sehen den Privatraum nicht, kommen nicht hinein, können dort
   weder archivieren noch fixieren; Trainer landet über jedes Kind der Familie im selben Raum;
   @alle wirkt privat nicht; stumm heißt offen nein, privat ja; Antworten werden bereinigt,
   Einfachwahl lässt nur eine zu, nach dem Ende keine Stimme mehr; anonyme Stimmen tragen keinen
   Namen, auch nicht für das Trainerteam; Push eines Privatrufs nur an die Familie.
   Am DOM geprüft:
   a) Eltern: Raumknopf „🔒 Trainerteam“ legt den Raum über RPC an und öffnet ihn; Kopf und
      Schreibfeld sagen, wer mitliest; im Menü kein Melden und kein Fixieren
   b) Abstimmung namentlich: Antworten als Knöpfe ≥ 44 px mit Zahl, eigene Wahl mit ✓ (nicht nur
      Farbe), Namen unter der Antwort, „3 haben abgestimmt“
   c) Abstimmen: Einfachwahl schickt [0], nochmal die eigene nimmt zurück ([]); Mehrfachwahl
      ergänzt; anonym zeigt keine Namen
   d) Anlegen: ohne Frage kein Aufruf; mit Frage, drei Antworten, anonym, mehrfach, 3 Tage →
      rufe_umfrage_erstellen mit genau diesen Werten
   e) Trainer: kein Knopf je Familie, sondern „🔒 Familien · 2“; die Liste fasst Geschwister zu
      einer Familie zusammen, Ungelesenes zuerst; Tipp öffnet den Raum dieser Familie
   f) Benachrichtigung mit ?rufe=<Raum> öffnet genau diesen Raum
   g) Sicherung enthält rufe_umfrage und rufe_stimme */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const K = h.KINDER;
  const token = sub => "x." + Buffer.from(JSON.stringify({ sub })).toString("base64") + ".y";
  const iso = m => new Date(Date.now() - m * 60000).toISOString();
  const ruf = (id, raum, autor, text, m) => ({ id, raum_id: raum, autor, autor_name: autor === "u-eigen" ? "Paul" : "Anna", autor_zusatz: "", autor_rolle: "eltern", text, antwort_auf: null, an_alle: false, bearbeitet_am: null, archiviert_am: null, created_at: iso(m) });
  const umfragen = [
    { id: 7, nachricht_id: 20, optionen: ["Ja", "Nein"], anonym: false, mehrfach: false, schluss: null, beendet_am: null, von: "u-andere" },
    { id: 8, nachricht_id: 21, optionen: ["Brötchen", "Kuchen", "Obst"], anonym: true, mehrfach: true, schluss: iso(-600), beendet_am: null, von: "u-andere" }
  ];
  const stand = [
    { umfrage_id: 7, option: 0, anzahl: 2, namen: ["Anna (" + K[1] + ")", "Ben (" + K[2] + ")"], ich: false, teilnehmer: 3 },
    { umfrage_id: 7, option: 1, anzahl: 1, namen: ["Paul (" + K[0] + ")"], ich: true, teilnehmer: 3 },
    { umfrage_id: 8, option: 0, anzahl: 4, namen: null, ich: true, teilnehmer: 5 },
    { umfrage_id: 8, option: 2, anzahl: 2, namen: null, ich: false, teilnehmer: 5 }
  ];

  // ── Eltern ──────────────────────────────────────────────────────────────
  let privatDa = false;
  const s = await h.starten({ start: "/eltern/index.html", warten: 1000, hoehe: 900, supabase: h.supabaseAttrappe({
    rufe_raum: () => [{ id: 5, name: "Allgemein", emoji: "📣", sort: 0, familie_kind: null }].concat(privatDa ? [{ id: 11, name: "Trainerteam", emoji: "🔒", sort: 1000, familie_kind: 1 }] : []),
    rufe_nachricht: (u, req) => req.method() === "POST" ? { status: 201, body: "[]" }
      : (/raum_id=eq\.5/.test(u.search) ? [ruf(21, 5, "u-andere", "Was bringen wir mit?", 5), ruf(20, 5, "u-andere", "Grillen nach dem Spiel?", 10)] : []),
    rufe_umfrage: u => umfragen.filter(x => new RegExp("[(,]" + x.nachricht_id + "[,)]").test(decodeURIComponent(u.search))),
    rufe_reaktion: [], rufe_fixiert: [], rufe_gelesen: [], rufe_push_aus: [],
    rpc: { is_rufe_mod: false, rufe_ungelesen: [], rufe_umfrage_stand: stand, rufe_abstimmen: true, rufe_umfrage_erstellen: 30,
      rufe_privat_raum: () => { privatDa = true; return 11; } }
  }) });
  const r = await s.page.evaluate(async tok => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const out = {};
    if (typeof rufeUmfrageNeu !== "function" || typeof rufePrivat !== "function") return { fehlt: true };
    window.sbToken = () => tok;
    window._sys = 0; window.confirm = () => { window._sys++; return true; }; window.prompt = () => { window._sys++; return ""; };
    await rufeOpen(); await w(400);
    const m = document.getElementById("rufe-modal");
    const chips = () => [...m.querySelectorAll("#rufe-raeume button")].map(b => b.textContent.trim() + (b.getAttribute("aria-pressed") === "true" ? "*" : ""));
    // b) namentliche Abstimmung
    const optionen = [...m.querySelectorAll(".rf-umfrage")].map(u => ({
      knoepfe: [...u.querySelectorAll(".rf-option")].map(b => ({ t: b.textContent.replace(/\s+/g, " ").trim(), an: b.getAttribute("aria-pressed"), h: Math.round(b.getBoundingClientRect().height) })),
      namen: [...u.querySelectorAll(".rf-namen")].map(n => n.textContent.trim()), text: u.textContent.replace(/\s+/g, " ") }));
    out.b = { chips: chips(), optionen };
    // c) abstimmen
    const knopf = (u, i) => m.querySelectorAll(".rf-umfrage")[u].querySelectorAll(".rf-option")[i];
    const namentlich = [...m.querySelectorAll(".rf-umfrage")].findIndex(u => /namentlich/.test(u.textContent));
    const anonym = 1 - namentlich;
    knopf(namentlich, 0).click(); await w(150);
    knopf(namentlich, 1).click(); await w(150);
    knopf(anonym, 1).click(); await w(150);
    out.namentlich = namentlich;
    // d) anlegen
    document.getElementById("rufe-umfrage-knopf").click(); await w(100);
    const blatt = document.getElementById("rufe-menue");
    out.d = { dialog: blatt && blatt.getAttribute("role") };
    document.getElementById("rf-umfrage-los").click(); await w(100);
    out.d.ohneFrage = !!document.getElementById("rufe-menue");
    document.getElementById("rf-frage").value = "Grillen nach dem Heimspiel?";
    document.getElementById("rf-opt-0").value = "Ja"; document.getElementById("rf-opt-1").value = "Nein";
    document.getElementById("rf-opt-mehr").click(); await w(30);
    document.getElementById("rf-opt-2").value = "Vielleicht";
    [...document.querySelectorAll("#rf-arten .rf-art")].find(b => /Anonym/.test(b.textContent)).click(); await w(30);
    out.d.hinweis = document.getElementById("rf-art-hinweis").textContent;
    document.getElementById("rf-mehrfach").checked = true;
    document.getElementById("rf-schluss").value = "72";
    document.getElementById("rf-umfrage-los").click(); await w(300);
    out.d.zu = !document.getElementById("rufe-menue");
    // a) privat an das Trainerteam
    [...m.querySelectorAll("#rufe-raeume button")].find(b => /Trainerteam/.test(b.textContent)).click(); await w(400);
    out.a = { chips: chips(), unter: document.getElementById("rufe-unter").textContent, feld: document.getElementById("rufe-text").placeholder,
      leer: document.getElementById("rufe-liste").textContent.replace(/\s+/g, " "), raum: _rf.raum };
    // Menü eines Rufs im Privatraum (Trainer schreibt)
    _rf.liste = [{ id: 40, raum_id: 11, autor: "u-trainer", autor_name: "Charles", autor_zusatz: "Trainerteam", autor_rolle: "trainer", text: "Gute Besserung", created_at: new Date().toISOString() }];
    rufeRender(); rufeMenue(40); await w(50);
    out.a.menue = document.getElementById("rufe-menue").textContent.replace(/\s+/g, " ");
    document.getElementById("rufe-menue").remove();
    rufeClose();
    // f) Benachrichtigung mit Raum
    sessionStorage.setItem("adler_rufe_intent", "11");
    _rfAbsicht(); await w(2700);
    out.f = { offen: !!document.getElementById("rufe-modal"), raum: _rf && _rf.raum };
    rufeClose();
    out.sys = window._sys;
    return out;
  }, token("u-eigen"));
  const rpc = n => s.gesendet.filter(x => x.pfad.endsWith("/rpc/" + n)).map(x => JSON.stringify(x.body));
  const f1 = s.fehler(); await s.schliessen();
  if (r.fehlt) return h.ergebnis("Adler-Rufe: privat und Abstimmungen", false, ["rufeUmfrageNeu/rufePrivat fehlt"]);
  // a)
  if (!r.b.chips.some(c => /^🔒 Trainerteam$/.test(c))) probleme.push(`a) Kein Knopf „🔒 Trainerteam“: ${JSON.stringify(r.b.chips)}`);
  if (!rpc("rufe_privat_raum").includes('{"p_kind":null}')) probleme.push(`a) Privatraum nicht über RPC angelegt: ${JSON.stringify(rpc("rufe_privat_raum"))}`);
  if (r.a.raum !== 11 || !r.a.chips.includes("🔒 Trainerteam*")) probleme.push(`a) Privatraum nicht geöffnet: ${JSON.stringify(r.a)}`);
  if (!/nur ihr und das Trainerteam/.test(r.a.unter) || !/an das Trainerteam/.test(r.a.feld) || !/nicht die anderen Eltern/.test(r.a.leer)) probleme.push(`a) Wer liest mit? „${r.a.unter}“ / „${r.a.feld}“ / „${r.a.leer.slice(0, 120)}“`);
  if (/Melden|fixieren/i.test(r.a.menue)) probleme.push(`a) Menü im Privatraum: ${r.a.menue}`);
  // b)
  const nam = r.b.optionen[r.namentlich] || { knoepfe: [], namen: [], text: "" }, ano = r.b.optionen[1 - r.namentlich] || { knoepfe: [], namen: [], text: "" };
  if (nam.knoepfe.length !== 2 || nam.knoepfe[1].an !== "true" || !/^✓/.test(nam.knoepfe[1].t) || /✓/.test(nam.knoepfe[0].t)) probleme.push(`b) Knöpfe: ${JSON.stringify(nam.knoepfe)}`);
  if (nam.knoepfe.some(k => k.h < 44)) probleme.push(`b) Knopf unter 44 px: ${JSON.stringify(nam.knoepfe.map(k => k.h))}`);
  if (!nam.namen.some(n => n.includes("Anna (" + K[1] + ")"))) probleme.push(`b) Namen fehlen: ${JSON.stringify(nam.namen)}`);
  if (!/3 haben abgestimmt/.test(nam.text)) probleme.push(`b) Teilnehmerzahl: ${nam.text.slice(0, 160)}`);
  // c)
  const ab = rpc("rufe_abstimmen");
  if (ab[0] !== '{"p_umfrage":7,"p_optionen":[0]}' || ab[1] !== '{"p_umfrage":7,"p_optionen":[]}' || ab[2] !== '{"p_umfrage":8,"p_optionen":[0,1]}') probleme.push(`c) Stimmen: ${JSON.stringify(ab)}`);
  if (ano.namen.length || !/anonym/.test(ano.text)) probleme.push(`c) Anonyme Abstimmung zeigt Namen: ${JSON.stringify(ano.namen)}`);
  // d)
  const neu = rpc("rufe_umfrage_erstellen");
  if (r.d.dialog !== "dialog") probleme.push("d) Anlegen ist kein Dialog");
  if (!r.d.ohneFrage || neu.length !== 1) probleme.push(`d) Ohne Frage: Fenster offen ${r.d.ohneFrage}, Aufrufe ${neu.length}`);
  if (neu[0] !== '{"p_raum":5,"p_frage":"Grillen nach dem Heimspiel?","p_optionen":["Ja","Nein","Vielleicht"],"p_anonym":true,"p_mehrfach":true,"p_stunden":72}') probleme.push(`d) Anlegen: ${neu[0]}`);
  if (!/auch das Trainerteam nicht/.test(r.d.hinweis)) probleme.push(`d) Hinweis zu anonym: „${r.d.hinweis}“`);
  if (!r.d.zu) probleme.push("d) Fenster bleibt nach dem Anlegen offen");
  // f)
  if (!r.f.offen || r.f.raum !== 11) probleme.push(`f) ?rufe=11: ${JSON.stringify(r.f)}`);
  if (r.sys) probleme.push(`${r.sys} Systemdialoge`);
  if (f1.length) probleme.push("Konsole Eltern: " + f1.slice(0, 2).join(" | "));
  zeilen.push(`a) ${r.b.chips.join(" ")} → Privatraum 11, „${r.a.unter}“, Menü ohne Melden/Fixieren`);
  zeilen.push(`b) ${nam.knoepfe.map(k => k.t).join(" / ")} · Namen ${nam.namen.join("; ")} · c) ${ab.join(" ")} · anonym ohne Namen`);
  zeilen.push(`d) ${neu[0]} · f) ?rufe=11 öffnet Raum ${r.f.raum}`);

  // ── Trainer ─────────────────────────────────────────────────────────────
  let neuRaum = false;
  const t = await h.starten({ warten: 1200, hoehe: 900, supabase: h.supabaseAttrappe({
    rufe_raum: () => [{ id: 5, name: "Allgemein", emoji: "📣", sort: 0, familie_kind: null },
      { id: 11, name: "Trainerteam", emoji: "🔒", sort: 1000, familie_kind: 1 }, { id: 12, name: "Trainerteam", emoji: "🔒", sort: 1000, familie_kind: 3 }]
      .concat(neuRaum ? [{ id: 13, name: "Trainerteam", emoji: "🔒", sort: 1000, familie_kind: 4 }] : []),
    eltern_kinder: [{ email: "a@x.test", spieler_id: 1 }, { email: "a@x.test", spieler_id: 2 }, { email: "a2@x.test", spieler_id: 2 }, { email: "b@x.test", spieler_id: 3 }, { email: "c@x.test", spieler_id: 4 }],
    kader: h.kaderZeilen(), rufe_nachricht: [], rufe_reaktion: [], rufe_fixiert: [], rufe_gelesen: [], rufe_push_aus: [], rufe_umfrage: [],
    rpc: { is_rufe_mod: true, rufe_ungelesen: [{ raum_id: 12, anzahl: 2, an_alle: false }], rufe_privat_raum: () => { neuRaum = true; return 13; } }
  }) });
  const rt = await t.page.evaluate(async tok => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    document.getElementById("pin-gate")?.remove();
    window.sbToken = () => tok;
    await rufeOpen(); await w(400);
    const chips = () => [...document.querySelectorAll("#rufe-raeume button")].map(b => b.textContent.trim() + (b.getAttribute("aria-pressed") === "true" ? "*" : ""));
    const out = { vorher: chips() };
    [...document.querySelectorAll("#rufe-raeume button")].find(b => /Familien/.test(b.textContent)).click(); await w(100);
    const blatt = document.getElementById("rufe-menue");
    out.liste = [...blatt.querySelectorAll(".rf-familie")].map(b => b.textContent.replace(/\s+/g, " ").trim());
    out.hinweis = blatt.textContent;
    [...blatt.querySelectorAll(".rf-familie")].find(b => /Kind D/.test(b.textContent)).click(); await w(400);
    out.nachher = chips(); out.raum = _rf.raum; out.unter = document.getElementById("rufe-unter").textContent;
    rufeClose();
    return out;
  }, token("u-trainer")).catch(e => ({ fehler: String(e) }));
  const f2 = t.fehler(); const tr = t.gesendet.filter(x => x.pfad.endsWith("/rpc/rufe_privat_raum")).map(x => JSON.stringify(x.body)); await t.schliessen();
  if (rt.fehler) probleme.push("e) " + rt.fehler);
  else {
    if (rt.vorher.some(c => /Kind/.test(c)) || !rt.vorher.includes("🔒 Familien · 2")) probleme.push(`e) Knöpfe: ${JSON.stringify(rt.vorher)}`);
    if (!/^🔒\s*Kind C\s*2 neu$/.test(rt.liste[0] || "") || !rt.liste.some(x => x.includes("Kind A & Kind B")) || rt.liste.length !== 3) probleme.push(`e) Familienliste: ${JSON.stringify(rt.liste)}`);
    if (!/der Elternbeirat nicht/.test(rt.hinweis)) probleme.push("e) Hinweis, wer mitliest, fehlt");
    if (tr[0] !== '{"p_kind":4}' || rt.raum !== 13 || !rt.nachher.includes("🔒 Kind D*") || !/Familie Kind D/.test(rt.unter)) probleme.push(`e) Öffnen: ${JSON.stringify({ tr, rt })}`);
  }
  if (f2.length) probleme.push("Konsole Trainer: " + f2.slice(0, 2).join(" | "));
  if (!rt.fehler) zeilen.push(`e) ${rt.vorher.join(" ")} · Liste: ${rt.liste.join(" | ")} → ${tr[0]} → „${rt.unter}“`);

  // g) Sicherung, Migration, Einstieg über die Benachrichtigung
  const views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  if (!/"rufe_umfrage","rufe_stimme"/.test(views)) probleme.push("g) Sicherung ohne rufe_umfrage/rufe_stimme");
  const mig = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20260929_v674_rufe_privat_umfrage.sql"), "utf8");
  if (!/case when u\.anonym then null else public\.rufe_ich_name\(\)/.test(mig)) probleme.push("g) Anonyme Stimmen speichern einen Namen");
  if (!/create policy rr_mod[\s\S]{0,120}familie_kind is null/.test(mig)) probleme.push("g) Moderatoren dürfen Privaträume ändern");
  if (!/ek\.spieler_id=r\.familie_kind/.test(mig)) probleme.push("g) Push beachtet Privaträume nicht");
  const boot = fs.readFileSync(path.join(h.REPO, "boot.js"), "utf8");
  if (!/adler_rufe_intent",\/\^\\d\+\$\//.test(boot)) probleme.push("f) boot.js merkt sich den Raum aus ?rufe= nicht");
  zeilen.push("g) Sicherung, anonyme Stimmen ohne Namen, Privaträume nur Trainerteam und Familie, Push mit Raum");
  return h.ergebnis("Adler-Rufe: privat und Abstimmungen", !probleme.length, probleme.length ? probleme : zeilen);
};
