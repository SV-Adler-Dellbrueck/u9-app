/* v673 · Adler-Rufe: Benachrichtigungen aufs Handy
   Beschluss 29.09.: „Nur neue Nachrichten, mit Ruhezeit“, „Gebündelt, höchstens alle 30 Min.“,
   Trainerteam sofort. Die Regeln stecken in rufe_push_faellig() und sind am 29.09. in der Datenbank
   mit Rollback gefahren (erster Ruf sofort, zweiter nach 5 Min. wartet, nach 31 Min. gebündelt,
   Trainerruf sofort, 22:30 nichts) – ohne dass eine Nachricht verschickt wurde. Hier geprüft:
   a) Glocke im Chat-Kopf: an → „aus“ schreibt rufe_push_aus, wieder an löscht die Zeile
   b) ?rufe öffnet den Chat nach der Anmeldung – im Trainerbereich nicht, solange die PIN-Sperre steht
   c) Edge Function und Cron: kein Schlüssel im Code, Cron-Schlüssel aus dem Vault, alle 5 Minuten
   d) Sicherung enthält rufe_push_aus und rufe_push_stand
   PO 29.09. (Bildschirmfoto): „Die neue Kachel Adler-Rufe hat keine Funktion … vielleicht als kleines
   Icon ganz oben … mit einer kleinen Ziffer, wie viele neue Nachrichten.“
   e) Eltern-Kopfzeile und Trainer-Kopfzeile tragen 💬 (≥ 44 px) mit roter Zahl; die große Kachel ist weg
   f) Ist das Modul noch nicht geladen, wartet der Einstieg und öffnet dann – nie still nichts
   g) Mit neuen Rufen steht ganz oben auf der Eltern-Startseite eine Zeile mit dem letzten Ruf */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const tok = "x." + Buffer.from(JSON.stringify({ sub: "u-eigen" })).toString("base64") + ".y";
  const basis = aus => h.supabaseAttrappe({
    rufe_raum: [{ id: 5, name: "Allgemein", emoji: "📣", sort: 0 }], rufe_nachricht: [], rufe_reaktion: [], rufe_fixiert: [],
    rufe_push_aus: aus, rpc: { is_rufe_mod: false }
  });
  // a) Glocke (Eltern)
  const s = await h.starten({ start: "/eltern/index.html", warten: 1000, hoehe: 800, supabase: basis([]) });
  const r = await s.page.evaluate(async tok => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    if (typeof rufeGlockeUmschalten !== "function") return { fehlt: true };
    window.sbToken = () => tok;
    await rufeOpen(); await w(300);
    const g = document.getElementById("rufe-glocke");
    const out = { vorher: g.textContent + "/" + g.getAttribute("aria-pressed"), hoehe: Math.round(g.getBoundingClientRect().height) };
    await rufeGlockeUmschalten(); await w(100);
    out.aus = g.textContent + "/" + g.getAttribute("aria-pressed");
    await rufeGlockeUmschalten(); await w(100);
    out.wieder = g.textContent;
    rufeClose();
    // b) Absicht bei Eltern: öffnet von selbst
    sessionStorage.setItem("adler_rufe_intent", "1");
    _rfAbsicht(); await w(2600);
    out.elternOffen = !!document.getElementById("rufe-modal");
    out.absichtWeg = !sessionStorage.getItem("adler_rufe_intent");
    rufeClose();
    return out;
  }, tok);
  const sg = s.gesendet.filter(x => /rufe_push_aus/.test(x.pfad)).map(x => x.methode + " " + (x.suche || "") + " " + JSON.stringify(x.body));
  const f1 = s.fehler(); await s.schliessen();
  if (r.fehlt) return h.ergebnis("Adler-Rufe: Benachrichtigungen", false, ["rufeGlockeUmschalten fehlt"]);
  if (r.vorher !== "🔔/true" || r.aus !== "🔕/false" || r.wieder !== "🔔") probleme.push(`a) Glocke: ${JSON.stringify(r)}`);
  if (r.hoehe < 44) probleme.push(`a) Glocke ${r.hoehe} px`);
  if (!sg.some(x => /^POST .*"user_id":"u-eigen"/.test(x)) || !sg.some(x => /^DELETE \?user_id=eq\.u-eigen/.test(x))) probleme.push(`a) Schreibzugriffe: ${JSON.stringify(sg)}`);
  if (!r.elternOffen || !r.absichtWeg) probleme.push(`b) Eltern: Chat nach ?rufe offen ${r.elternOffen}, Absicht verbraucht ${r.absichtWeg}`);

  // b) Trainer mit PIN-Sperre
  const t = await h.starten({ warten: 1200, hoehe: 800, ohnePinGate: false, supabase: basis([]) });
  const rt = await t.page.evaluate(async tok => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    window.sbToken = () => tok;
    let gate = document.getElementById("pin-gate");
    if (!gate) { gate = document.createElement("div"); gate.id = "pin-gate"; document.body.appendChild(gate); }
    gate.classList.remove("hidden"); gate.style.display = "block";
    sessionStorage.setItem("adler_rufe_intent", "1");
    _rfAbsicht(); await w(2600);
    const gesperrt = !!document.getElementById("rufe-modal");
    gate.classList.add("hidden"); gate.style.display = "none";
    await w(2300);
    const offen = !!document.getElementById("rufe-modal");
    if (typeof rufeClose === "function") rufeClose();
    return { gesperrt, offen };
  }, tok);
  const f2 = t.fehler(); await t.schliessen();
  if (rt.gesperrt) probleme.push("b) Trainer: Chat öffnet sich über der PIN-Sperre");
  if (!rt.offen) probleme.push("b) Trainer: Chat öffnet nach der PIN nicht");

  // e, f, g) Einstieg oben (Eltern-Dashboard nachgebaut wie im echten Aufruf)
  const e = await h.starten({ start: "/eltern/index.html", warten: 2500, hoehe: 900, supabase: h.supabaseAttrappe({
    rufe_raum: [{ id: 5, name: "Allgemein", emoji: "📣", sort: 0 }], rufe_reaktion: [], rufe_fixiert: [], rufe_push_aus: [],
    rufe_nachricht: [{ id: 9, raum_id: 5, autor: "u-andere", autor_name: "Anna", autor_zusatz: "", autor_rolle: "eltern", text: "Wer fährt Samstag?", created_at: new Date().toISOString() }],
    eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 6 } }], kader: h.kaderZeilen(), termine: [],
    rpc: { is_rufe_mod: false, rufe_ungelesen: [{ raum_id: 5, anzahl: 3, an_alle: false }] } }) });
  const re = await e.page.evaluate(async tok => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    window.sbToken = () => tok; window.sbEmail = () => "a@b.c";
    const root = document.createElement("div"); document.body.appendChild(root);
    elternPortalDashboard(root); await w(200);
    await elternDashLoad(); await w(300);
    await rufeBadgeLoad(); await w(200);
    const k = document.getElementById("rufe-kopf");
    const out = { kopf: !!k, hoehe: k ? Math.round(k.getBoundingClientRect().height) : 0, zahl: k ? k.querySelector(".rufe-badge").textContent : "",
      kachel: !!document.getElementById("rufe-einstieg"), hinweis: (document.getElementById("rufe-hinweis") || {}).textContent || "" };
    // f) Modul „noch nicht da“: rufeOpen kurz wegnehmen, dann zurückgeben
    const echt = window.rufeOpen; window.rufeOpen = undefined;
    rufeEinstieg(); await w(400);
    out.vorher = !!document.getElementById("rufe-modal");
    window.rufeOpen = echt; await w(700);
    out.nachher = !!document.getElementById("rufe-modal");
    if (typeof rufeClose === "function") rufeClose();
    return out;
  }, tok);
  const f3 = e.fehler(); await e.schliessen();
  if (!re.kopf || re.hoehe < 44 || re.zahl !== "3") probleme.push(`e) Eltern-Kopfzeile: ${JSON.stringify(re)}`);
  if (re.kachel) probleme.push("e) Die große Kachel steht noch da");
  if (re.vorher || !re.nachher) probleme.push(`f) Einstieg ohne Modul: vorher ${re.vorher}, nachher ${re.nachher}`);
  if (!/3 neue Adler-Rufe/.test(re.hinweis) || !/Anna: Wer fährt Samstag\?/.test(re.hinweis)) probleme.push(`g) Hinweiszeile: „${re.hinweis}“`);
  const shell = fs.readFileSync(path.join(h.REPO, "shell.html"), "utf8");
  if (!/id="rufe-kopf"[^>]*onclick="rufeEinstieg\(\)"/.test(shell) || !/rufe-badge/.test(shell)) probleme.push("e) Trainer-Kopfzeile ohne 💬 mit Zahl");
  if (f3.length) probleme.push("Konsole Einstieg: " + f3.slice(0, 2).join(" | "));
  zeilen.push(`e) 💬 oben mit Zahl ${re.zahl}, ${re.hoehe} px, Kachel weg · f) Einstieg wartet aufs Modul · g) „${re.hinweis.replace(/\s+/g, " ").trim().slice(0, 60)}“`);

  // c) Edge Function und Migration
  const fn = fs.readFileSync(path.join(h.REPO, "supabase/functions/rufe-push/index.ts"), "utf8");
  const mig = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20260929_v673_rufe_push.sql"), "utf8");
  if (!/adler_geheimnis/.test(fn) || !/rufe_push_faellig/.test(fn)) probleme.push("c) Edge Function holt Schlüssel nicht aus dem Vault oder fragt die Datenbank nicht");
  if (/BEGIN PRIVATE|-----|vapid_private\s*=\s*["']/i.test(fn)) probleme.push("c) Schlüssel im Code");
  if (!/'\*\/5 \* \* \* \*'/.test(mig) || !/vault\.decrypted_secrets where name = 'adler_cron_secret'/.test(mig)) probleme.push("c) Cron nicht alle 5 Min. oder Schlüssel nicht aus dem Vault");
  if (!/v_std >= 21 or v_std < 7/.test(mig) || !/interval '30 minutes'/.test(mig)) probleme.push("c) Ruhezeit oder Bündelung fehlt in rufe_push_faellig");
  const views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  if (!/"rufe_push_aus","rufe_push_stand"/.test(views)) probleme.push("d) Sicherung ohne rufe_push_aus/rufe_push_stand");
  if (f1.length || f2.length) probleme.push("Konsole: " + f1.concat(f2).slice(0, 2).join(" | "));
  zeilen.push(`a) Glocke ${r.vorher} → ${r.aus} → ${r.wieder}, ${sg.length} Schreibzugriffe · b) Eltern öffnet nach ?rufe, Trainer erst nach der PIN`);
  zeilen.push("c) Edge Function ohne Schlüssel, Cron alle 5 Min. mit Vault-Schlüssel, Ruhezeit und Bündelung in der Datenbank · d) Sicherung");
  return h.ergebnis("Adler-Rufe: Benachrichtigungen", !probleme.length, probleme.length ? probleme : zeilen);
};
