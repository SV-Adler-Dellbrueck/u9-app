/* v705 · Ruhezeit je Konto, für alle Benachrichtigungen
   PO 01.10.: „Wir können ja auch jeden selbst entscheiden lassen, wie seine Ruhezeiten sein sollen.
   Über eine Möglichkeit wie Einstellungen.“ Kacheln: „Nur in Einstellungen“, „Alle Benachrichtigungen“.
   a) Unter dem Benachrichtigungs-Schalter: Eltern ohne eigene Wahl „21:30–7 Uhr“ (Kachel gewählt, mit ✓),
      vier Kacheln ≥ 44 px in einer Zeile am Handy
   b) Trainer ohne eigene Wahl: „keine“
   c) „22–6“ antippen schreibt push_ruhezeit (Upsert, eigenes Konto, 22:00/06:00) und zeigt es an
   d) „Eigene“ zeigt zwei Uhrzeitfelder; „Übernehmen“ schreibt diese Zeiten
   e) Die Zeile im Chat nennt die eigene Ruhezeit
   f) Server: Tabellen mit RLS, push_ruht/Warteschlange; rufe_push_faellig und wiewars_push_faellig fragen
      push_ruht; push-send verteilt über die Ruhezeit (Test-Meldung ausgenommen), push-cron auch,
      rufe-push holt die Warteschlange nach; Sicherung enthält beide Tabellen
   g) Hilfe und Funktionsübersicht beschreiben die eigene Ruhezeit
   PO 01.10. „Prüf das“ (Trainer bekam keine Meldung): Trainer- und Eltern-App teilen sich auf einem Handy
   eine Push-Adresse; wer in der zweiten App einschaltete, verwarf sie – das andere Konto zeigte ins Leere.
   h) Einschalten meldet je Adresse UND Konto an (on_conflict=endpoint,user_id, eigene Kennung);
      Ausschalten löscht nur den eigenen Eintrag und lässt die Adresse des Handys stehen;
      „an“ heißt: Handy hat ein Abo und dieses Konto steht dafür drin
   i) Datenbank eindeutig je Adresse und Konto; die drei Versandfunktionen schicken je Handy nur einmal */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const tok = "x." + Buffer.from(JSON.stringify({ sub: "u-eigen" })).toString("base64") + ".y";
  const lauf = async (start, ruhe, fn) => {
    const s = await h.starten({ start, warten: 1000, hoehe: 900, supabase: h.supabaseAttrappe({
      push_ruhezeit: ruhe, rufe_raum: [{ id: 5, name: "Allgemein", emoji: "📣", sort: 0 }], rufe_nachricht: [], rufe_reaktion: [], rufe_fixiert: [],
      rufe_push_aus: [], rpc: { is_rufe_mod: false } }) });
    const r = await s.page.evaluate(fn, tok).catch(e => ({ fehler: String(e) }));
    const f = s.fehler(); const alle = s.gesendet.slice(), ges = alle.filter(x => /push_ruhezeit/.test(x.pfad)); await s.schliessen();
    return { r, f, ges, alle };
  };
  const karte = async tok => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    if (typeof ruhezeitRender !== "function") return { fehlt: true };
    window.sbToken = () => tok;
    const d = document.createElement("div"); d.id = "rz-test"; d.className = "ruhezeit-box"; d.style.cssText = "padding:0 16px";
    document.body.prepend(d);
    await ruhezeitRender("rz-test", location.pathname.includes("/trainer/") ? "trainer" : "parent"); await w(100);
    const k = [...d.querySelectorAll(".ruhe-kachel")];
    const out = { kopf: d.querySelector(".ruhe-kopf")?.textContent, gewaehlt: k.filter(x => x.getAttribute("aria-pressed") === "true").map(x => x.textContent),
      zahl: k.length, hoehen: k.map(x => Math.round(x.getBoundingClientRect().height)), zeile: new Set(k.map(x => Math.round(x.getBoundingClientRect().top))).size,
      haken: k.filter(x => x.getAttribute("aria-pressed") === "true").map(x => getComputedStyle(x, "::before").content) };
    k.find(x => x.dataset.k === "nacht")?.click(); await w(300);
    out.nach = d.querySelector(".ruhe-kopf")?.textContent;
    d.querySelector('[data-k="eigen"]')?.click(); await w(200);
    const von = document.getElementById("rz-test-von"), bis = document.getElementById("rz-test-bis");
    out.felder = !!von && !!bis;
    if (von && bis) { von.value = "13:00"; bis.value = "14:30"; d.querySelector(".ruhe-uebernehmen")?.click(); await w(300); }
    out.eigen = d.querySelector(".ruhe-kopf")?.textContent;
    return out;
  };
  const el = await lauf("/eltern/index.html", [], karte);
  const tr = await lauf("/trainer/index.html", [], karte);
  const titel = "v705 Ruhezeit je Konto: Auswahl in den Einstellungen, gilt für alle Benachrichtigungen";
  if (el.r.fehler || el.r.fehlt || tr.r.fehler || tr.r.fehlt) return h.ergebnis(titel, false, ["Abbruch: " + JSON.stringify({ el: el.r, tr: tr.r })]);
  if (!/21:30–7 Uhr/.test(el.r.kopf || "") || el.r.gewaehlt.join() !== "21:30–7") probleme.push("a) Eltern-Vorgabe: " + JSON.stringify(el.r));
  if (el.r.zahl !== 4 || el.r.hoehen.some(x => x < 44) || el.r.zeile !== 1) probleme.push("a) Kacheln: " + JSON.stringify(el.r));
  if (!el.r.haken.every(c => /✓/.test(c))) probleme.push("a) gewählte Kachel ohne ✓: " + JSON.stringify(el.r.haken));
  if (!/keine/.test(tr.r.kopf || "") || tr.r.gewaehlt.join() !== "Keine") probleme.push("b) Trainer-Vorgabe: " + JSON.stringify(tr.r));
  const s1 = el.ges[0], s2 = el.ges[1];
  if (!s1 || !/on_conflict=user_id/.test(s1.suche) || !s1.body || s1.body.user_id !== "u-eigen" || s1.body.von !== "22:00" || s1.body.bis !== "06:00" || !/22–6 Uhr/.test(el.r.nach || ""))
    probleme.push("c) 22–6: " + JSON.stringify({ s1, nach: el.r.nach }));
  if (!el.r.felder || !s2 || s2.body.von !== "13:00" || s2.body.bis !== "14:30" || !/13–14:30 Uhr/.test(el.r.eigen || "")) probleme.push("d) Eigene: " + JSON.stringify({ s2, eigen: el.r.eigen, felder: el.r.felder }));
  // e) Chat-Zeile mit eigener Ruhezeit
  const chat = await lauf("/eltern/index.html", [{ von: "22:00:00", bis: "06:00:00" }], async tok => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    window.sbToken = () => tok; await rufeOpen(); await w(600);
    return { zeile: document.getElementById("rufe-ruhe")?.textContent };
  });
  if (!/ruhen 22–6 Uhr/.test(chat.r.zeile || "") || !/Einstellungen/.test(chat.r.zeile || "")) probleme.push("e) Chat-Zeile: " + JSON.stringify(chat.r));
  // f) Server
  const lies = p => fs.readFileSync(path.join(h.REPO, p), "utf8");
  const migDir = path.join(h.REPO, "supabase/migrations");
  const mig = fs.readdirSync(migDir).filter(d => /v705/.test(d)).map(d => fs.readFileSync(path.join(migDir, d), "utf8")).join("\n");
  for (const t of ["push_ruhezeit", "push_warteschlange"])
    if (!new RegExp("create table if not exists public\\." + t).test(mig) || !new RegExp("alter table public\\." + t + " enable row level security").test(mig)) probleme.push("f) Tabelle/RLS fehlt: " + t);
  if (!/using \(user_id = auth\.uid\(\)\) with check \(user_id = auth\.uid\(\)\)/.test(mig)) probleme.push("f) push_ruhezeit nicht aufs eigene Konto beschränkt");
  if (!/revoke all on public\.push_warteschlange from anon, authenticated/.test(mig)) probleme.push("f) Warteschlange nicht nur Server");
  if (!/function public\.push_ruht/.test(mig) || !/push_ruht\(s\.user_id, p_jetzt\)/.test(mig) || !/push_ruht\(p\.id, p_jetzt\)/.test(mig)) probleme.push("f) rufe/wiewars fragen push_ruht nicht");
  const ps = lies("supabase/functions/push-send/index.ts"), pc = lies("supabase/functions/push-cron/index.ts"), rp = lies("supabase/functions/rufe-push/index.ts");
  const testZweig = ps.slice(ps.indexOf('if (body.art === "test")'), ps.indexOf('if (body.art === "kasse_erinnerung")'));
  if ((ps.match(/await verteilen\(/g) || []).length !== 3 || /verteilen/.test(testZweig)) probleme.push("f) push-send verteilt nicht überall über die Ruhezeit (oder auch den Test)");
  if (!/push_ruhende/.test(pc) || !/push_warteschlange/.test(pc)) probleme.push("f) push-cron ohne Ruhezeit");
  if (!/push_warteschlange_faellig/.test(rp)) probleme.push("f) rufe-push holt die Warteschlange nicht nach");
  const views = lies("views.js"), doku = lies("doku/Uebersicht_Funktionen-Adler-App_v1.md");
  if (!/"push_ruhezeit","push_warteschlange"/.test(views)) probleme.push("f) Sicherung ohne die neuen Tabellen");
  if (!/Ruhezeit \(seit v705\)/.test(views) || !/22–6/.test(views)) probleme.push("g) Hilfe beschreibt die eigene Ruhezeit nicht");
  if (!/Ruhezeit seit v705 je Konto/.test(doku)) probleme.push("g) Funktionsübersicht beschreibt die eigene Ruhezeit nicht");
  // h) ein Handy, zwei Konten
  const hk = await lauf("/eltern/index.html", [], async tok => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    window.sbToken = () => tok;
    let abgemeldet = 0;
    const sub = { endpoint: "https://push.example/e1", toJSON: () => ({ keys: { p256dh: "p", auth: "a" } }), unsubscribe: async () => { abgemeldet++; return true; }, options: {} };
    try { Object.defineProperty(Notification, "permission", { configurable: true, get: () => "granted" }); } catch (e) {}
    try { Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { ready: Promise.resolve({ pushManager: { getSubscription: async () => sub, subscribe: async () => sub } }), addEventListener() {} } }); } catch (e) {}
    window.pushSupported = () => true;
    const out = {};
    out.an = await pushSubscribe("parent");
    await pushUnsubscribe(); await w(50);
    out.abgemeldet = abgemeldet;
    // „an“ je Konto: Attrappe kennt keinen Eintrag für dieses Konto → aus
    out.kontoOhneEintrag = (await pushKontoAbo()) === null;
    return out;
  });
  const anm = hk.alle.find(x => /push_subscriptions$/.test(x.pfad) && x.methode === "POST");
  const ab = hk.alle.find(x => /push_subscriptions$/.test(x.pfad) && x.methode === "DELETE");
  if (!hk.r || hk.r.fehler) probleme.push("h) Abbruch: " + JSON.stringify(hk.r));
  else {
    if (!anm || !/on_conflict=endpoint(%2C|,)user_id/.test(anm.suche) || !anm.body || anm.body.user_id !== "u-eigen") probleme.push("h) Anmeldung nicht je Adresse und Konto: " + JSON.stringify(anm));
    if (!ab || !/user_id=eq\.u-eigen/.test(ab.suche)) probleme.push("h) Ausschalten löscht nicht nur den eigenen Eintrag: " + JSON.stringify(ab));
    if (hk.r.abgemeldet !== 0) probleme.push("h) Ausschalten verwirft die Adresse des Handys");
    if (!hk.r.kontoOhneEintrag) probleme.push("h) „an“, obwohl dieses Konto nicht eingetragen ist");
  }
  if (!/drop constraint if exists push_subscriptions_endpoint_key/.test(mig) || !/unique \(endpoint, user_id\)/.test(mig)) probleme.push("i) Datenbank nicht je Adresse und Konto eindeutig");
  for (const [n, t] of [["push-send", ps], ["push-cron", pc], ["rufe-push", rp]]) if (!/const schon = new Set/.test(t)) probleme.push("i) " + n + " schickt je Handy womöglich doppelt");
  zeilen.push(`h) Anmeldung ${anm ? anm.suche : "–"} · Ausschalten ${ab ? ab.suche.slice(0, 60) : "–"} · Adresse verworfen ${hk.r && hk.r.abgemeldet}`);
  const fe = el.f.concat(tr.f, chat.f, hk.f); if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`Eltern „${el.r.kopf}“ → „${el.r.nach}“ → „${el.r.eigen}“ · Trainer „${tr.r.kopf}“ · Kacheln ${JSON.stringify(el.r.hoehen)}`, `Chat: „${chat.r.zeile}“`);
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
