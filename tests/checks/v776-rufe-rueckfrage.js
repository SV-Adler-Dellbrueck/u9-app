/* v776 · PO 03.11.: Markus (Trainer und Vater) schrieb einen Wunsch seines Sohnes versehentlich in den privaten Raum der Familie von Jonas.
   „Rückfrage für Trainer bauen – aber Familie von Jonas muss es heißen.“
   a) Trainer im Familienraum: Senden fragt vorher „Nachricht an die Familie von Jonas?“; Abbrechen sendet nichts, Senden sendet genau einmal
   b) Der Kopf des Raums sagt „Privat mit der Familie von Jonas“
   c) Familie mit zwei Kindern: „Familie von Jonas & Kolja“
   d) Offener Raum (Trainer) und Eltern im eigenen Raum: keine Rückfrage, der Ruf geht sofort raus */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const posts = [];
  const s = await h.starten({ hoehe: 1200, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  await s.page.route(/\/rest\/v1\/rufe_nachricht/, route => {
    const rq = route.request();
    if (rq.method() === "POST") { posts.push(JSON.parse(rq.postData() || "{}")); return route.fulfill({ status: 201, body: "" }); }
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const out = {};
    if (typeof rufeSenden !== "function" || typeof _rfFamilienRueckfrage !== "function") return { fehlt: true };
    rufeLaden = async () => {};                       // Raumliste und Nachrichten sind hier nicht Thema
    const feld = document.createElement("textarea"); feld.id = "rufe-text"; document.body.appendChild(feld);
    const knopf = document.createElement("button"); knopf.id = "rufe-senden"; document.body.appendChild(knopf);
    const modal = () => document.getElementById("frage-modal");
    const text = () => modal() ? modal().textContent.replace(/\s+/g, " ").trim() : null;
    const setze = (trainer, raum, fam) => {
      _rf = { raeume: [{ id: 11, familie_kind: 3 }, { id: 5, familie_kind: null }], raum, liste: [], dateien: [], antwort: null, mod: trainer, trainer, fam: fam || { 3: "Jonas" }, uid: "x" };
      feld.value = "Können wir mal wieder die Übung mit den vier Ecken machen";
    };
    // a) Trainer, Familienraum
    setze(true, 11);
    rufeSenden(); await w(300);
    out.a1 = text();
    document.getElementById("frage-nein").click(); await w(300);
    out.a2 = { zu: !modal(), feld: feld.value.length > 0 };
    rufeSenden(); await w(300);
    document.getElementById("frage-ja").click(); await w(500);
    out.a3 = { zu: !modal() };
    // c) zwei Kinder
    setze(true, 11, { 3: "Jonas & Kolja" });
    rufeSenden(); await w(300);
    out.c = text();
    document.getElementById("frage-nein").click(); await w(300);
    window.__setze = setze; window.__text = text; window.__modal = modal;
    return out;
  });
  const nachA = posts.length;
  const r2 = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const out = {}, feld = document.getElementById("rufe-text"), setze = window.__setze, modal = window.__modal;
    // d) Trainer im offenen Raum, Eltern im eigenen Raum
    setze(true, 5);
    await rufeSenden(); await w(300);
    out.d1 = { modal: !!modal() };
    setze(false, 11);
    await rufeSenden(); await w(300);
    out.d2 = { modal: !!modal() };
    // b) Kopfzeile
    const unter = document.createElement("div"); unter.id = "rufe-unter"; document.body.appendChild(unter);
    const f2 = document.createElement("textarea"); f2.id = "rufe-feld-x";
    setze(true, 11);
    if (typeof _rfKopfZeigen === "function") { try { _rfKopfZeigen(); } catch (e) {} }
    out.b = unter.textContent.trim();
    return out;
  });
  Object.assign(r, r2);
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) return h.ergebnis("v776 Rufe-Rückfrage", false, ["rufeSenden oder _rfFamilienRueckfrage fehlt"]);
  if (!/Nachricht an die Familie von Jonas\?/.test(r.a1 || "") || !/Senden/.test(r.a1) || !/Abbrechen/.test(r.a1)) probleme.push("a1) " + r.a1);
  if (!r.a2.zu || !r.a2.feld || nachA !== 1) probleme.push("a) nach Abbrechen / Senden: " + JSON.stringify({ a2: r.a2, a3: r.a3, posts: nachA }));
  if (!r.a3.zu) probleme.push("a3) Fenster bleibt offen");
  zeilen.push(`a) „${(r.a1 || "").slice(0, 60)}…“ · Abbrechen sendet nichts, Text bleibt · Senden genau 1×`);
  if (!/Familie von Jonas & Kolja\?/.test(r.c || "")) probleme.push("c) " + r.c);
  zeilen.push("c) zwei Kinder: „Familie von Jonas & Kolja“");
  if (r.d1.modal || r.d2.modal || posts.length !== 3) probleme.push("d) " + JSON.stringify({ d1: r.d1, d2: r.d2, posts: posts.length }));
  zeilen.push("d) offener Raum und Eltern: keine Rückfrage, 3 Rufe insgesamt gesendet");
  if (!/Privat mit der Familie von Jonas/.test(r.b || "")) probleme.push("b) Kopf: „" + r.b + "“");
  zeilen.push(`b) Kopf: „${r.b}“`);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v776 Adler-Rufe: Trainer werden vor dem Senden in einen Familienraum gefragt", !probleme.length, probleme.length ? probleme : zeilen);
};
