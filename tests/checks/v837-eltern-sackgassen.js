/* v837 · Eltern-App: fünf Sackgassen (Bestandsaufnahme November 2026, 3.1, 3.2, 3.6, 3.8, 3.12).
   a) Ohne Netz zeigt das Dashboard den zuletzt geladenen Stand mit Hinweis „Keine Verbindung … Stand vom …“ –
      vorher stand dort „Dein Trainer hat diese E-Mail noch keinem Kind zugeordnet“.
   b) Ohne Netz und ohne gemerkten Stand: „Keine Verbindung“ mit „Nochmal versuchen“ (≥ 56 px), nicht „keinem Kind“.
   c) Wirklich kein Kind (Antwort leer): der Text nennt die Einladungskarte. Der gemerkte Stand verschwindet beim Abmelden.
   d) Die Kabine fragt beim ersten Start auf dem Gerät nach dem Kabinen-Code; „Noch nicht“ startet nichts, danach fragt sie nicht mehr.
   e) „Neue Adler-Rufe“ öffnet den Raum mit dem Ungelesenen, nicht den ersten offenen.
   f) Nach dem Code-Login bietet die App das Passwort-Fenster an; ?rsvp und ?rufe zeigen keinen Auftakt. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v837 Eltern: Termin ohne Netz, Kabine fragt nach dem Code, Rufe im richtigen Raum, Passwort nach Code-Login";
  const probleme = [], zeilen = [];
  const datum = h.tagePlus(2);
  const termin = { id: 5, datum, uhrzeit: "16:45", uhrzeit_ende: "18:00", typ: "training", titel: "", ort: "Sportplatz", trainer_status: {}, platz_status: null };
  const TOKEN = "x." + Buffer.from(JSON.stringify({ sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600, email: "eltern@example.org" })).toString("base64url") + ".y";
  const st = { netz: true, leer: false };
  const e = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1000, breite: 390, hoehe: 844,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: () => !st.netz ? { status: 503, body: "{}" } : st.leer ? [] : [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
      termine: () => !st.netz ? { status: 503, body: "{}" } : [termin],
      rueckmeldungen: [], eltern_angaben: [{ vorname: "Erwachsener", nachname: "Beispiel" }],
      rpc: { rufe_ungelesen: [{ raum_id: 3, anzahl: 0, an_alle: false }, { raum_id: 7, anzahl: 2, an_alle: false }] },
      rufe_nachricht: [{ autor_name: "Trainerteam", text: "Bitte Trikots mitbringen", autor: "andere" }] }) });
  await e.page.exposeFunction("__netz", (netz, leer) => { st.netz = netz; st.leer = !!leer; });
  await e.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await e.page.reload({ waitUntil: "networkidle" }); await e.page.waitForTimeout(4000);
  const r = await e.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    if (typeof elternStandLesen !== "function") return { alt: true };
    const out = {};
    const body = () => document.getElementById("ep-dash-body");
    const text = () => body().innerText.replace(/\s+/g, " ");
    out.gemerkt = !!localStorage.getItem("adler_eltern_stand");
    // a)
    await window.__netz(false); await elternDashLoad(); await w(1500);
    const off = document.getElementById("eltern-offline");
    out.a = { hinweis: off ? off.innerText.replace(/\s+/g, " ") : "", termin: /Nächster Termin/i.test(text()) && /16:45/.test(text()), keinKind: /keinem Kind/.test(text()), erstes: off ? body().firstElementChild === off || body().querySelector("#eltern-offline") === off : false };
    // b)
    localStorage.removeItem("adler_eltern_stand"); await elternDashLoad(); await w(600);
    const kn = [...body().querySelectorAll("button")].find(b => /Nochmal versuchen/.test(b.textContent));
    out.b = { text: text().slice(0, 120), knopf: kn ? Math.round(kn.getBoundingClientRect().height) : 0, keinKind: /keinem Kind/.test(text()) };
    // c)
    await window.__netz(true, true); await elternDashLoad(); await w(600);
    out.c = { text: text().slice(0, 200) };
    await window.__netz(true, false); await elternDashLoad(); await w(1500);
    out.c.wiederGemerkt = !!localStorage.getItem("adler_eltern_stand");
    sbClearToken(); out.c.nachAbmelden = !!localStorage.getItem("adler_eltern_stand");
    // d)
    let starts = 0; window.kabineOpen = () => { starts++; };
    localStorage.removeItem("adler_kabine_bekannt");
    const frage = () => document.getElementById("frage-modal");
    const p1 = elternKabineStart(); await w(150);
    out.d = { frage1: !!frage(), text: frage() ? frage().innerText.replace(/\s+/g, " ") : "" };
    if (frage()) frage().querySelector("#frage-nein").click(); await p1; out.d.nachNein = starts;
    const p2 = elternKabineStart(); await w(150); if (frage()) frage().querySelector("#frage-ja").click(); await p2; out.d.nachJa = starts;
    const p3 = elternKabineStart(); await w(150); out.d.frage3 = !!frage(); await p3; out.d.nachDritt = starts;
    out.d.kachel = !!document.querySelector('button[onclick="elternKabineStart()"]') && !document.querySelector('#ep-dash-body button[onclick="kabineOpen()"]');
    // e)
    let raum = "nie"; window.rufeOpen = x => { raum = x; };
    window.sbToken = () => "t";
    await rufeBadgeLoad(); await w(100);
    out.e = { gemerkt: window._rufeNeuRaum }; rufeEinstieg(); await w(50); out.e.geoeffnet = raum;
    return out;
  }).catch(x => ({ fehler: String(x) }));
  const fe = e.fehler(); await e.schliessen();
  if (r.alt) return h.ergebnis(titel, false, ["elternStandLesen fehlt (Stand vor v837)"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  if (!r.gemerkt) probleme.push("a) nach dem Laden ist kein Stand gemerkt");
  if (!/Keine Verbindung/.test(r.a.hinweis) || !/Stand vom/.test(r.a.hinweis) || !r.a.termin || r.a.keinKind) probleme.push("a) ohne Netz: " + JSON.stringify(r.a).slice(0, 260));
  else zeilen.push("a) ohne Netz: Termin 16:45 bleibt sichtbar, Hinweis „" + r.a.hinweis.slice(0, 60) + "…“");
  if (!/Keine Verbindung/.test(r.b.text) || r.b.knopf < 56 || r.b.keinKind) probleme.push("b) ohne Netz, ohne Stand: " + JSON.stringify(r.b));
  else zeilen.push(`b) ohne Netz und ohne Stand: „Keine Verbindung“, Knopf ${r.b.knopf} px`);
  if (!/keinem Kind/.test(r.c.text) || !/Einladungskarte/.test(r.c.text) || /Dein Trainer/.test(r.c.text)) probleme.push("c) kein Kind: " + r.c.text);
  else if (!r.c.wiederGemerkt || r.c.nachAbmelden) probleme.push(`c) gemerkter Stand: nach Laden ${r.c.wiederGemerkt}, nach Abmelden ${r.c.nachAbmelden}`);
  else zeilen.push("c) kein Kind: Text nennt die Einladungskarte; gemerkter Stand verschwindet beim Abmelden");
  if (!r.d.frage1 || !/Kabinen-Code/.test(r.d.text) || r.d.nachNein !== 0 || r.d.nachJa !== 1 || r.d.frage3 || r.d.nachDritt !== 2 || !r.d.kachel) probleme.push("d) Kabine: " + JSON.stringify(r.d).slice(0, 300));
  else zeilen.push("d) Kabine: erste Frage nach dem Code, „Noch nicht“ startet nichts, danach ohne Frage");
  if (String(r.e.gemerkt) !== "7" || String(r.e.geoeffnet) !== "7") probleme.push("e) Adler-Rufe: gemerkt " + r.e.gemerkt + ", geöffnet " + r.e.geoeffnet);
  else zeilen.push("e) Adler-Rufe: öffnet Raum 7 (zwei ungelesen) statt des ersten Raums");
  const portal = fs.readFileSync(path.join(h.REPO, "md-eltern-portal.js"), "utf8"), intro = fs.readFileSync(path.join(h.REPO, "intro.js"), "utf8");
  const verify = portal.split("async function elternPortalVerify")[1].split("\nfunction ")[0];
  if (!/elternPasswortOpen\(\)/.test(verify)) probleme.push("f) nach dem Code-Login öffnet sich das Passwort-Fenster nicht");
  if (!/\|rsvp\|rufe\)/.test(intro)) probleme.push("f) Auftakt läuft weiter bei ?rsvp und ?rufe");
  if (!probleme.some(p => p.startsWith("f)"))) zeilen.push("f) Passwort-Fenster nach dem Code-Login; kein Auftakt bei ?rsvp und ?rufe");
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
