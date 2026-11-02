/* v774 · Charles 02.11.: „Wenn ein Termin innerhalb der letzten 24 Stunden abgesagt wird, wird ein Grund als Pflichtangabe aktiviert.“
   Gemeint sind beide Seiten: die Absage der Eltern für ihr Kind und das Ausfallen eines Termins durch das Trainerteam. Die Kabine ist ausgenommen.
   a) Eltern, Termin-Fenster, Termin in 3 Std.: Absage zeigt „Grund der Absage“ ohne „Ohne Grund“; „Speichern“ ist gesperrt, solange nichts steht
      (Text sagt es); Abbrechen speichert nichts; mit Grund wird er als kommentar gespeichert
   b) Eltern, Termin in 5 Tagen: wie bisher, kein Fenster, Absage wird gespeichert
   c) Eltern, Liste (elternRsvp), Termin in 3 Std.: gleiche Pflicht; ein Tipp auf eine Auswahl füllt das Feld
   d) Trainerteam, „Fällt aus“ bei Termin in 3 Std.: Grund-Fenster, ohne Grund nichts gespeichert, mit Grund steht platz_status_note im Speichern;
      bei Termin in 5 Tagen wie bisher ohne Fenster */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const lokal = d => { const p = n => String(n).padStart(2, "0"); return { datum: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, uhrzeit: `${p(d.getHours())}:${p(d.getMinutes())}` }; };
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const bald = lokal(new Date(Date.now() + 3 * 3600e3)), spaet = lokal(new Date(Date.now() + 5 * 24 * 3600e3));
  const termine = [{ id: 100, ...bald, typ: "training", titel: "", trainer_status: "ok" }, { id: 101, ...spaet, typ: "training", titel: "", trainer_status: "ok" }];
  const posts = [];
  const rueckmeldungen = (u, req) => {
    const m = req.method();
    if (m === "POST") { const b = JSON.parse(req.postData() || "{}"); posts.push(b); return { status: 201, body: "" }; }
    if (m === "GET") return [];
    return { status: 204, body: "" };
  };
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u-eltern", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 3500, breite: 390, hoehe: 1400, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
    eltern_kinder: [{ spieler_id: 3, label: "", kader: { id: 3, name: "Kind C", nr: 9, foto_stadionheft_ok: true } }],
    termine: u => { const id = (u.searchParams.get("id") || "").replace("eq.", ""); return id ? termine.filter(x => String(x.id) === id) : termine; },
    rueckmeldungen, team_config: [{ spenden_link: "" }],
    rpc: { eltern_news: {}, training_rueckblick: [], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false } }) });
  await s.page.waitForLoadState("networkidle"); await s.page.waitForTimeout(1500);
  await s.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(3500);
  const ev = (fn, arg) => s.page.evaluate(fn, arg);
  const dlg = () => ev(() => { const o = document.getElementById("rg-ov"); if (!o) return null; const ok = o.querySelector("#rg-ok"), sk = o.querySelector("#rg-skip");
    return { text: o.textContent.replace(/\s+/g, " ").trim(), ohneGrund: /Ohne Grund/.test(o.querySelector("#rg-skip").textContent), skip: sk.textContent.trim(), ok: ok.textContent.trim(), gesperrt: ok.getAttribute("aria-disabled") }; });
  const fehlt = await ev(() => typeof tdRsvp !== "function" || typeof rsvpPflichtGrund !== "function");
  if (fehlt) { await s.schliessen(); return h.ergebnis("v774 Pflicht-Grund", false, ["tdRsvp oder rsvpPflichtGrund fehlt"]); }
  const r = {};
  // a) Termin-Fenster, in 3 Std.
  ev(() => { tdRsvp(100, 3, "abgesagt"); }); await s.page.waitForTimeout(700);
  r.a1 = await dlg();
  await ev(() => document.getElementById("rg-ok")?.click()); await s.page.waitForTimeout(200);
  r.a2 = { nochOffen: !!(await dlg()), posts: posts.length };
  await ev(() => document.getElementById("rg-skip")?.click()); await s.page.waitForTimeout(500);
  r.a3 = { zu: !(await dlg()), posts: posts.length };
  ev(() => { tdRsvp(100, 3, "abgesagt"); }); await s.page.waitForTimeout(700);
  await ev(() => { const t = document.getElementById("rg-txt"); t.value = "Schule"; t.dispatchEvent(new Event("input")); }); await s.page.waitForTimeout(100);
  r.a4gesperrt = (await dlg()).gesperrt;
  await ev(() => document.getElementById("rg-ok")?.click()); await s.page.waitForTimeout(1500);
  r.a4 = posts.filter(p => p.status === "abgesagt" && p.termin_id === 100 && p.kommentar === "Schule").length;
  // b) in 5 Tagen: kein Fenster
  const vorher = posts.length;
  ev(() => { tdRsvp(101, 3, "abgesagt"); }); await s.page.waitForTimeout(1200);
  r.b = { fenster: !!(await dlg()), gespeichert: posts.slice(vorher).filter(p => p.termin_id === 101 && p.status === "abgesagt").length };
  // c) Liste
  posts.length = 0;
  ev(() => { elternRsvp(100, 3, "abgesagt"); }); await s.page.waitForTimeout(700);
  r.c1 = await dlg();
  await ev(() => document.querySelector("#rg-chips button")?.click()); await s.page.waitForTimeout(150);
  r.c2 = await ev(() => ({ txt: document.getElementById("rg-txt").value, gesperrt: document.getElementById("rg-ok").getAttribute("aria-disabled") }));
  await ev(() => document.getElementById("rg-ok")?.click()); await s.page.waitForTimeout(1500);
  r.c3 = posts.filter(p => p.status === "abgesagt" && p.termin_id === 100 && p.kommentar).length;
  const fe = s.fehler(); await s.schliessen();

  // d) Trainerteam
  const patches = [];
  const t = await h.starten({ warten: 900, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), termine,
    team_config: [{ id: 1, uebung_meta: {}, uebung_art: {}, netto_richtwert: 48 }] }) });
  const tev = (fn, arg) => t.page.evaluate(fn, arg);
  await t.page.route(/\/rest\/v1\/termine\?id=eq\.\d+/, async route => {
    const rq = route.request();
    if (rq.method() === "PATCH") { patches.push({ url: rq.url(), body: JSON.parse(rq.postData() || "{}") }); return route.fulfill({ status: 204, body: "" }); }
    return route.fallback();
  });
  await tev(termine => { window.TM_TERMINE = termine.map(x => ({ ...x })); }, termine);
  tev(() => { platzAmpelSet(100, "abgesagt"); }); await t.page.waitForTimeout(700);
  r.d1 = await tev(() => { const o = document.getElementById("rg-ov"); return o ? { ohneGrund: /Ohne Grund/.test(o.querySelector("#rg-skip").textContent), titel: o.textContent.replace(/\s+/g, " ").trim().slice(0, 60) } : null; });
  await tev(() => document.getElementById("rg-skip")?.click()); await t.page.waitForTimeout(400);
  r.d2 = { patches: patches.length };
  tev(() => { platzAmpelSet(100, "abgesagt"); }); await t.page.waitForTimeout(700);
  await tev(() => { const x = document.getElementById("rg-txt"); x.value = "Platz gesperrt"; x.dispatchEvent(new Event("input")); });
  await tev(() => document.getElementById("rg-ok")?.click()); await t.page.waitForTimeout(800);
  r.d3 = patches.filter(p => /id=eq\.100/.test(p.url) && p.body.platz_status === "abgesagt" && p.body.platz_status_note === "Platz gesperrt").length;
  tev(() => { platzAmpelSet(101, "abgesagt"); }); await t.page.waitForTimeout(800);
  r.d4 = { fenster: await tev(() => !!document.getElementById("rg-ov")), gespeichert: patches.filter(p => /id=eq\.101/.test(p.url) && p.body.platz_status === "abgesagt").length };
  const fe2 = t.fehler(); await t.schliessen();

  if (!r.a1 || r.a1.ohneGrund || r.a1.skip !== "Abbrechen" || r.a1.gesperrt !== "true" || !/Erst Grund nennen/.test(r.a1.ok) || !/24 Stunden/.test(r.a1.text)) probleme.push("a1) " + JSON.stringify(r.a1));
  if (!r.a2.nochOffen || r.a2.posts !== 0) probleme.push("a2) leer speichern: " + JSON.stringify(r.a2));
  if (!r.a3.zu || r.a3.posts !== 0) probleme.push("a3) Abbrechen speichert nichts: " + JSON.stringify(r.a3));
  if (r.a4gesperrt !== "false" || r.a4 !== 1) probleme.push("a4) mit Grund: " + JSON.stringify({ g: r.a4gesperrt, n: r.a4 }));
  zeilen.push("a) Termin-Fenster, Termin in 3 Std.: Pflicht-Fenster ohne „Ohne Grund“, leer gesperrt, Abbrechen speichert nichts, mit Grund als kommentar gespeichert");
  if (r.b.fenster || r.b.gespeichert !== 1) probleme.push("b) " + JSON.stringify(r.b));
  zeilen.push("b) Termin in 5 Tagen: kein Fenster, Absage gespeichert");
  if (!r.c1 || r.c1.ohneGrund || r.c1.gesperrt !== "true" || r.c2.txt === "" || r.c2.gesperrt !== "false" || r.c3 !== 1) probleme.push("c) " + JSON.stringify({ c1: r.c1, c2: r.c2, c3: r.c3 }));
  zeilen.push("c) Liste: gleiche Pflicht, Auswahl füllt das Feld, Grund gespeichert");
  if (!r.d1 || r.d1.ohneGrund || r.d2.patches !== 0 || r.d3 !== 1 || r.d4.fenster || r.d4.gespeichert !== 1) probleme.push("d) " + JSON.stringify(r));
  zeilen.push("d) Trainerteam: „Fällt aus“ unter 24 Std. verlangt den Grund (ohne Grund nichts gespeichert, mit Grund als platz_status_note), bei 5 Tagen wie bisher");
  const alle = fe.concat(fe2); if (alle.length) probleme.push("Konsole: " + alle.slice(0, 2).join(" | "));
  return h.ergebnis("v774 Absage in den letzten 24 Stunden: Grund ist Pflicht (Eltern und Trainerteam)", !probleme.length, probleme.length ? probleme : zeilen);
};
