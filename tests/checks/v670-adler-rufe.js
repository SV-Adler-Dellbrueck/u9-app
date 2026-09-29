/* v670 · Adler-Rufe, Stufe 1 – der Team-Chat für Eltern und Trainer
   Beschluss 29.09. (Kachelrunden): offener Gruppenchat, Name „Adler-Rufe“, ein Raum zum Start,
   Moderatoren legen weitere an; Antworten mit Zitat, Reaktionen, bis zu drei fixierte Rufe mit
   Ablauf, @alle nur für Moderatoren, Bearbeiten, Suche; melden, stummschalten, archivieren statt
   löschen. Die Rechte (Kinder ohne Zugang, Name aus der Datenbank, archivierte nur für Trainer,
   kein direktes Ändern) sind am 29.09. in der Datenbank mit simulierten Anmeldungen gefahren
   (Rollback) – die Attrappe hier würde jede Regel bestätigen. Am DOM geprüft:
   a) Eltern-Startseite: großer Knopf „Adler-Rufe“ mit Zahl der neuen Rufe
   b) Fenster: role=dialog, Rufe mit Name und Zusatz, eigener Ruf als „Du“, Zitat, Reaktionen,
      fixierter Ruf oben, Text wird maskiert (kein HTML aus Rufen)
   c) Senden schreibt raum_id, text, antwort_auf; @alle nur, wenn Moderator
   d) Menü eines fremden Rufs für Eltern: reagieren, antworten, melden – nicht fixieren,
      archivieren oder stummschalten; Melden fragt im eigenen Fenster, kein Systemdialog
   e) Moderator: fixieren (mit Dauer), archivieren über RPC, ＋ Raum
   f) Suche fragt text=ilike ab und zeigt Treffer
   g) Trainer: Kacheln „Adler-Rufe“ und „Adler-Rufe moderieren“; Sicherung enthält die Tabellen */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const jetzt = Date.now();
  const iso = m => new Date(jetzt - m * 60000).toISOString();
  const liste = [
    { id: 3, autor: "u-andere", autor_name: "Anna", autor_zusatz: "Eltern von Kind B", autor_rolle: "eltern", text: "Wer fährt am Samstag? <img src=x onerror=alert(1)>", antwort_auf: 1, an_alle: false, bearbeitet_am: null, archiviert_am: null, created_at: iso(2) },
    { id: 2, autor: "u-eigen", autor_name: "Paul", autor_zusatz: "Eltern von Kind A", autor_rolle: "eltern", text: "Hallo zusammen", antwort_auf: null, an_alle: false, bearbeitet_am: null, archiviert_am: null, created_at: iso(10) },
    { id: 1, autor: "u-trainer", autor_name: "Charles", autor_zusatz: "Trainerteam", autor_rolle: "trainer", text: "@alle Training fällt aus", antwort_auf: null, an_alle: true, bearbeitet_am: null, archiviert_am: null, created_at: iso(30) }
  ];
  const basis = mod => h.supabaseAttrappe({
    rufe_raum: [{ id: 5, name: "Allgemein", emoji: "📣", sort: 0 }],
    rufe_nachricht: (u, req) => (req.method() === "POST" ? { status: 201, body: "[]" } : (/ilike/.test(u.search) ? [liste[0]] : liste)),
    rufe_reaktion: [{ nachricht_id: 3, user_id: "u-eigen", emoji: "👍" }, { nachricht_id: 3, user_id: "u-x", emoji: "👍" }],
    rufe_fixiert: [{ nachricht_id: 1, bis: null }],
    rufe_gelesen: [], rufe_meldung: [],
    rpc: { is_rufe_mod: mod, rufe_ungelesen: [{ raum_id: 5, anzahl: 4, an_alle: true }], rufe_archivieren: true }
  });
  const token = sub => "x." + Buffer.from(JSON.stringify({ sub })).toString("base64") + ".y";

  // ── Eltern ──────────────────────────────────────────────────────────────
  const s = await h.starten({ start: "/eltern/index.html", warten: 1000, hoehe: 900, supabase: basis(false) });
  const r = await s.page.evaluate(async ({ tok }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const out = { fehlt: [] };
    for (const n of ["rufeOpen", "rufeBadgeLoad", "rufeSenden", "rufeMenue", "rufeModOpen"]) if (typeof window[n] !== "function") out.fehlt.push(n);
    if (out.fehlt.length) return out;
    window.sbToken = () => tok;
    window._sys = 0; window.confirm = () => { window._sys++; return true; }; window.prompt = () => { window._sys++; return ""; };
    // a) Einstieg mit Zahl
    const box = document.createElement("div");
    box.innerHTML = `<button id="rufe-einstieg"><span class="rufe-badge" style="display:none"></span></button>`;
    document.body.appendChild(box);
    await rufeBadgeLoad();
    const b = box.querySelector(".rufe-badge");
    out.a = { zahl: b.textContent, sichtbar: b.style.display !== "none", label: b.getAttribute("aria-label") };
    // b) Fenster
    await rufeOpen(); await w(300);
    const m = document.getElementById("rufe-modal");
    out.b = { dialog: m && m.getAttribute("role"), rufe: m.querySelectorAll(".rf-msg").length,
      text: m.querySelector("#rufe-liste").textContent.replace(/\s+/g, " "),
      img: m.querySelectorAll("#rufe-liste img").length, zitat: m.querySelectorAll(".rf-zitat").length,
      reakt: [...m.querySelectorAll(".rf-reakt")].map(x => x.textContent.trim() + "/" + x.getAttribute("aria-pressed")),
      fix: (m.querySelector("#rufe-fix") || {}).textContent || "", raumChips: getComputedStyle(m.querySelector("#rufe-raeume")).display,
      senden: Math.round(m.querySelector("#rufe-senden").getBoundingClientRect().height) };
    // c) Antworten auf Ruf 3 und senden – @alle als Elternteil zählt nicht
    rufeAntworten(3);
    document.getElementById("rufe-text").value = "Ich fahre @alle";
    await rufeSenden(); await w(150);
    // d) Menü eines fremden Rufs
    rufeMenue(3); await w(50);
    const mm = document.getElementById("rufe-menue");
    out.d = { text: mm ? mm.textContent.replace(/\s+/g, " ") : "", emo: mm ? mm.querySelectorAll(".rf-emo").length : 0 };
    const melden = mm && [...mm.querySelectorAll("button")].find(x => /Melden/.test(x.textContent));
    if (melden) { melden.click(); await w(80); const f = document.getElementById("frage-modal"); const ja = f && [...f.querySelectorAll("button")].find(x => x.textContent.trim() === "Melden"); out.d.frage = !!ja; if (ja) ja.click(); await w(150); }
    out.sys = window._sys;
    // f) Suche
    rufeSucheUmschalten(); rufeSucheSetzen("Samstag"); await w(450);
    out.f = document.getElementById("rufe-liste").textContent.replace(/\s+/g, " ");
    rufeClose();
    return out;
  }, { tok: token("u-eigen") });
  const post = s.gesendet.filter(x => /rufe_/.test(x.pfad)).map(x => x.methode + " " + x.pfad.split("/").pop() + " " + JSON.stringify(x.body));
  const f1 = s.fehler(); await s.schliessen();
  if (r.fehlt.length) return h.ergebnis("Adler-Rufe: Team-Chat Stufe 1", false, [r.fehlt.join(", ") + " fehlt"]);
  if (r.a.zahl !== "4" || !r.a.sichtbar || !/an alle/.test(r.a.label || "")) probleme.push(`a) Zahl neuer Rufe: ${JSON.stringify(r.a)}`);
  if (r.b.dialog !== "dialog" || r.b.rufe !== 3) probleme.push(`b) Fenster: ${r.b.dialog}, ${r.b.rufe} Rufe`);
  for (const w of ["Anna", "Eltern von Kind B", "Du", "Charles", "@alle"]) if (!r.b.text.includes(w)) probleme.push(`b) „${w}“ fehlt`);
  if (r.b.img) probleme.push("b) HTML aus einem Ruf wird ausgeführt");
  if (r.b.zitat !== 1) probleme.push(`b) ${r.b.zitat} Zitate`);
  if (!r.b.reakt.includes("👍 2/true")) probleme.push(`b) Reaktionen: ${JSON.stringify(r.b.reakt)}`);
  if (!/Training fällt aus/.test(r.b.fix)) probleme.push("b) Fixierter Ruf steht nicht oben");
  if (r.b.raumChips !== "none") probleme.push("b) Raum-Leiste bei einem Raum für Eltern sichtbar");
  if (r.b.senden < 48) probleme.push(`b) Senden-Knopf ${r.b.senden} px`);
  const senden = post.find(x => /^POST rufe_nachricht /.test(x)) || "";
  if (!/"raum_id":5/.test(senden) || !/"antwort_auf":3/.test(senden) || !/"an_alle":false/.test(senden)) probleme.push(`c) Senden: ${senden}`);
  if (!/Antworten/.test(r.d.text) || !/Melden/.test(r.d.text) || r.d.emo !== 6) probleme.push(`d) Menü: ${r.d.text.slice(0, 120)} · ${r.d.emo} Emojis`);
  if (/fixieren|Archivieren|Stummschalten/i.test(r.d.text)) probleme.push("d) Eltern sehen Moderations-Aktionen");
  if (!r.d.frage || r.sys) probleme.push(`d) Melden: eigenes Fenster ${r.d.frage}, Systemdialoge ${r.sys}`);
  if (!post.some(x => /^POST rufe_meldung .*"nachricht_id":3/.test(x))) probleme.push(`d) Meldung nicht gesendet: ${JSON.stringify(post)}`);
  if (!/1 Treffer/.test(r.f) || !/Samstag/.test(r.f)) probleme.push(`f) Suche: ${r.f.slice(0, 100)}`);
  zeilen.push(`a) Zahl ${r.a.zahl} · b) ${r.b.rufe} Rufe, Zitat, 👍 2, fixiert oben, kein HTML · c) ${senden.slice(0, 90)}`);
  zeilen.push(`d) Eltern-Menü ohne Moderation, Melden im eigenen Fenster · f) Suche: 1 Treffer`);

  // ── Moderator (Trainer) ────────────────────────────────────────────────
  const t = await h.starten({ warten: 1200, hoehe: 900, supabase: basis(true) });
  const rt = await t.page.evaluate(async ({ tok }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    document.getElementById("pin-gate")?.remove();
    window.sbToken = () => tok;
    const out = {};
    const kacheln = _kachelInhalt("elki");
    out.kacheln = { rufe: /rufeOpen/.test(kacheln), mod: /rufeModOpen/.test(kacheln) };
    await rufeOpen(); await w(300);
    out.raumChips = [...document.querySelectorAll("#rufe-raeume button")].map(b => b.textContent.trim());
    document.getElementById("rufe-text").value = "@alle Treffpunkt 9 Uhr";
    await rufeSenden(); await w(150);
    rufeMenue(3); await w(50);
    out.menue = (document.getElementById("rufe-menue") || {}).textContent || "";
    rufeFixMenue(3); await w(30);
    const d7 = [...document.querySelectorAll("#rufe-menue button")].find(b => /7 Tage/.test(b.textContent)); if (d7) d7.click(); await w(150);
    rufeArchivieren(3, false); await w(80);
    const ja = [...(document.getElementById("frage-modal") || document).querySelectorAll("button")].find(x => x.textContent.trim() === "Archivieren"); if (ja) ja.click(); await w(150);
    rufeClose();
    return out;
  }, { tok: token("u-trainer") });
  const tg = t.gesendet.filter(x => /rufe_/.test(x.pfad)).map(x => x.methode + " " + x.pfad.split("/").pop() + (x.suche || "") + " " + JSON.stringify(x.body));
  const f2 = t.fehler(); await t.schliessen();
  if (!rt.kacheln.rufe || !rt.kacheln.mod) probleme.push(`g) Kacheln: ${JSON.stringify(rt.kacheln)}`);
  if (!rt.raumChips.some(x => /Raum/.test(x))) probleme.push(`e) „＋ Raum“ fehlt: ${JSON.stringify(rt.raumChips)}`);
  if (!tg.some(x => /^POST rufe_nachricht .*"an_alle":true/.test(x))) probleme.push(`c) @alle als Moderator nicht gesetzt: ${JSON.stringify(tg)}`);
  if (!/fixieren/.test(rt.menue) || !/Archivieren/.test(rt.menue) || !/Stummschalten/.test(rt.menue)) probleme.push(`e) Moderator-Menü: ${rt.menue.slice(0, 160)}`);
  const fix = tg.find(x => /^POST rufe_fixiert/.test(x)) || "";
  if (!/"nachricht_id":3/.test(fix) || !/"bis":"\d{4}-/.test(fix)) probleme.push(`e) Fixieren: ${fix}`);
  if (!tg.some(x => /^POST rpc\/rufe_archivieren|^POST rufe_archivieren .*"p_id":3/.test(x))) probleme.push(`e) Archivieren: ${JSON.stringify(tg)}`);
  const views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  const fehlt = ["rufe_raum", "rufe_nachricht", "rufe_reaktion", "rufe_fixiert", "rufe_meldung", "rufe_stumm", "rufe_moderator", "rufe_gelesen"].filter(x => !views.includes(`"${x}"`));
  if (fehlt.length) probleme.push("g) Sicherung ohne " + fehlt.join(", "));
  if (f1.length || f2.length) probleme.push("Konsole: " + f1.concat(f2).slice(0, 2).join(" | "));
  zeilen.push(`e) Moderator: ＋ Raum, @alle gesetzt, fixiert 7 Tage, archiviert über RPC · g) Kacheln und Sicherung vollständig`);
  return h.ergebnis("Adler-Rufe: Team-Chat Stufe 1", !probleme.length, probleme.length ? probleme : zeilen);
};
