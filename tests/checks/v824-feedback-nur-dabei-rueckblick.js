/* v824 · Eltern-Bereich (Charles 10.11.2026, Bildschirmfoto „Zu erledigen“).
   1) „Wie war das Training?“ stand bei jeder Familie – auch wenn das Kind abgesagt hatte oder fehlte –
      und ließ sich nicht wegklicken.
   2) Die Neuigkeit „Im Training geübt“ schloss beim Antippen nur das Fenster; weil Öffnen als gelesen
      gilt, war sie danach fort, ohne dass man sie lesen konnte.

   a) Kind hat abgesagt → keine Frage.
   b) Keine Rückmeldung zum Training (gilt als zugesagt) → Frage mit „×“ (mind. 44 px); „×“ blendet aus,
      zählt in „Zu erledigen“ nicht mehr und bleibt nach dem Neuladen weg.
   c) Die Anwesenheit der Trainer geht vor: eingetragen „nicht da“ → keine Frage, auch ohne Absage;
      eingetragen „da“ → Frage, auch wenn vorher abgesagt war.
   d) Tipp auf „Im Training geübt“ öffnet ein Fenster (Dialog) mit allen Übungen; das Neuigkeiten-Fenster
      bleibt dahinter offen. */
"use strict";
module.exports = async function (h) {
  const titel = "v824 Eltern: Trainings-Feedback nur, wenn das Kind dabei war; Rückblick zum Nachlesen";
  const probleme = [], zeilen = [];
  const TOKEN = "x." + Buffer.from(JSON.stringify({ sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600, email: "eltern@example.org" })).toString("base64url") + ".y";
  const gestern = h.tagePlus(-1);
  const termine = [{ id: 55, datum: gestern, uhrzeit: "17:00", uhrzeit_ende: "18:15", typ: "training", titel: "Training", trainer_status: {} },
    { id: 60, datum: h.tagePlus(3), uhrzeit: "17:00", typ: "training", titel: "Training", trainer_status: {} }];
  const THEMEN = ["Übung Eins", "Übung Zwei", "Übung Drei", "Übung Vier", "Übung Fünf"];
  const lauf = async (opt, tun) => {
    const rpc = { eltern_news: {}, training_rueckblick: [{ datum: gestern, themen: THEMEN }], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false };
    if (opt.anw !== undefined) rpc.eltern_dabei = [{ termin_id: 55, dabei: opt.anw }];
    const e = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1000, breite: 390, hoehe: 844,
      supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
        eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
        /* Die echte Abfrage der Feedback-Karte filtert auf vergangene Termine (datum=lt.heute) – die Attrappe muss das nachbilden,
           sonst gilt der kommende Termin als „jüngster“. */
        termine: u => /datum=lt\./.test(decodeURIComponent(String((u && u.search) || u))) ? termine.filter(t => t.datum < h.heute()) : termine,
        rueckmeldungen: opt.rueck || [], event_puls: [], rpc }) });
    await e.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 }));
      localStorage.setItem("adler_news_seen", JSON.stringify({ tr: "2000-01-01" })); }, TOKEN);
    await e.page.reload({ waitUntil: "networkidle" }); await e.page.waitForTimeout(4000);
    const r = await tun(e.page);
    const f = e.fehler(); await e.schliessen();
    if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
    return r;
  };
  const karte = page => page.evaluate(() => { const s = document.getElementById("puls-nudge-slot");
    if (typeof elternCatOpen === "function" && s && s.innerHTML.trim()) elternCatOpen("todo");   // die Karte liegt im Fenster „Zu erledigen“ – offen messen if (typeof pulsNudgeWeg !== "function") return { alt: true };
    const x = s && s.querySelector("button[onclick^='pulsNudgeWeg']"); const b = x ? x.getBoundingClientRect() : null;
    return { da: !!(s && s.innerHTML.trim()), x: b ? Math.round(Math.min(b.width, b.height)) : 0, todo: (document.getElementById("eltern-todo-badge") || {}).textContent || "" }; });

  const a = await lauf({ rueck: [{ termin_id: 55, spieler_id: 1, status: "abgesagt" }] }, karte);
  if (a.alt) return h.ergebnis(titel, false, ["Feedback-Karte ohne „×“ (Stand vor v824)"]);
  if (a.da) probleme.push("a) Frage steht da, obwohl das Kind abgesagt hat");

  const b = await lauf({}, async page => {
    const vor = await karte(page);
    await page.evaluate(() => document.querySelector("#puls-nudge-slot button[onclick^='pulsNudgeWeg']").click()); await page.waitForTimeout(200);
    const nach = await karte(page);
    await page.reload({ waitUntil: "networkidle" }); await page.waitForTimeout(4000);
    return { vor, nach, neu: await karte(page) };
  });
  if (!b.vor.da) probleme.push("b) keine Frage, obwohl das Training als zugesagt gilt");
  else {
    if (b.vor.x < 44) probleme.push("b) „×“ " + b.vor.x + " px");
    if (b.nach.da) probleme.push("b) „×“ blendet die Frage nicht aus");
    if (b.vor.todo === b.nach.todo) probleme.push(`b) Zähler „Zu erledigen“ bleibt bei „${b.nach.todo}“`);
    if (b.neu.da) probleme.push("b) nach dem Neuladen ist die Frage wieder da");
  }

  const c1 = await lauf({ anw: false }, karte), c2 = await lauf({ anw: true, rueck: [{ termin_id: 55, spieler_id: 1, status: "abgesagt" }] }, karte);
  if (c1.da) probleme.push("c) Frage steht da, obwohl die Anwesenheit „nicht da“ sagt");
  if (!c2.da) probleme.push("c) keine Frage, obwohl die Anwesenheit „da“ sagt");

  const d = await lauf({}, async page => page.evaluate(async themen => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    elternCatOpen("news"); await w(300);
    const zeile = [...document.querySelectorAll("#cat-news button")].find(x => /im Training geübt/.test(x.textContent));
    if (!zeile) return { zeile: false, panel: document.getElementById("cat-news").innerText.slice(0, 120) };
    zeile.click(); await w(300);
    const m = document.getElementById("rb-modal"), ov = document.getElementById("el-cat-overlay");
    const out = { zeile: true, dialog: !!m && m.getAttribute("role") === "dialog", alle: !!m && themen.every(t => m.innerText.indexOf(t) >= 0), dahinter: ov && getComputedStyle(ov).display !== "none" };
    const zu = m && [...m.querySelectorAll("button")].find(x => /Schließen/.test(x.textContent)); if (zu) zu.click(); await w(100);
    out.zu = !document.getElementById("rb-modal"); return out;
  }, THEMEN));
  if (!d.zeile) probleme.push("d) keine Zeile „Im Training geübt“ in den Neuigkeiten: " + d.panel);
  else if (!d.dialog || !d.alle || !d.dahinter || !d.zu) probleme.push("d) Rückblick: " + JSON.stringify(d));

  zeilen.push(`abgesagt → keine Frage · ohne Rückmeldung → Frage mit „×“ ${b.vor.x} px, Zähler „${b.vor.todo}“ → „${b.nach.todo}“ · Anwesenheit geht vor · Rückblick mit ${THEMEN.length} Übungen im Dialog`);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
