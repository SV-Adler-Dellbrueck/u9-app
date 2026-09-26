/* v630 · PO: „Die Bewertung der Einheiten können durchaus einen größeren Umfang haben. Und damit
   auch in der Zusammenfassung und Analyse der KI ein längeres Textfeld ergeben … Auch hier wäre noch
   wichtig, dass immer auch mit einer Art Stempel ersichtlich ist, wer hat die Bewertung vorgenommen
   aus dem Trainerteam.“ Kacheln: „Je Trainer eigene“, „Alles in v630“.

   a) Speichern schreibt die Einheit MIT Autor und Konflikt auf datum+autor – Peters Bewertung
      desselben Tages bleibt stehen.
   b) Die Liste sagt, wer bewertet hat („bewertet von Charles, Peter“).
   c) Im Fenster stehen die eigenen Sterne (nicht Peters), der Stempel „✍️ Charles“ und, zum Lesen,
      Peters Bewertung mit Stempel und Notiz.
   d) Übungen: Peters Bewertung derselben „Alle“-Übung steht darunter und bleibt beim Speichern;
      der eigene Eintrag trägt von/am; ein Eintrag ohne Namen (vor v630) wird ersetzt.
   e) Längere Texte: Einheits-Notiz 3000, Übungskommentar 800, Spiel-Sätze 1500, Sprachnotiz 12000
      Zeichen; eine lange KI-Notiz kommt ungekürzt an; die Felder wachsen mit.
   f) Tagebuch: Stempel in der Liste und im Fenster.
   g) KI-Funktion: keine 200-Zeichen-Vorgabe mehr, großzügige Grenzen; Migration mit PK datum+autor. */
"use strict";
module.exports = async function (h) {
  const fs = require("fs"), path = require("path");
  const probleme = [], zeilen = [];
  const gestern = h.tagePlus(-1);
  const posts = [], evalPosts = [];
  const PETER_E = { datum: gestern, autor: "Peter", spass: 2, umsetzung: 2, erfolg: null, notiz: "Peter: zu viel Wartezeit.", updated_at: "2026-09-25T19:10:00Z" };
  const MEINE_E = { datum: gestern, autor: "Charles", spass: 5, umsetzung: 4, erfolg: 3, notiz: "Meine alte Notiz", updated_at: "2026-09-25T18:40:00Z" };
  const ALT = { name: "Dribbel Quadrat", trainer: "Alle", formIdx: 1, notiz: "ohne Namen", skipped: false, "Durchführung": 3 };
  const PETER_U = { name: "Dribbel Quadrat", trainer: "Alle", formIdx: 1, notiz: "Peter fand es zu eng", skipped: false, "Durchführung": 2, von: "Peter", am: "2026-09-25T19:10:00Z" };
  const langeNotiz = "Die Kinder waren am Anfang unruhig. ".repeat(30).trim();   // gut 1000 Zeichen
  const s = await h.starten({ hoehe: 1600, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), profiles: [{ name: "Charles", rolle: "trainer" }], anwesenheit: [],
    trainingsplan: [{ datum: gestern, plan: [{ formIdx: 1, formName: "Dribbel Quadrat", trainer: "Alle", slotLabel: "Warm up" }], kopf: {} }],
    termine: [{ id: 3, datum: gestern, typ: "training", uhrzeit: "17:00" }],
    einheit_bewertung: (u, req) => { if (req.method() !== "GET") { posts.push({ url: req.url(), body: JSON.parse(req.postData() || "{}") }); return { status: 201, body: "[]" }; } return [MEINE_E, PETER_E]; },
    trainings_eval: (u, req) => { if (req.method() !== "GET") { evalPosts.push(JSON.parse(req.postData() || "{}")); return { status: 201, body: "[]" }; } return [{ data: [ALT, PETER_U] }]; },
    tagebuch_eintrag: [{ id: 1, datum: gestern, autor: "Peter", baustein: "ich", ausloeser: "Training", aha: "a", konsequenz: "k", updated_at: "2026-09-25T20:00:00Z" }],
    funktionen: { "ki-nachbereitung": () => ({ art: "training", ergebnis: { einheit: { spass: null, umsetzung: null, erfolg: null, notiz: langeNotiz }, uebungen: [], kinder: [] } }) }
  }) });
  const r = await s.page.evaluate(async ({ gestern }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    window.trainerMe = async () => "Charles";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    if (typeof stempelText !== "function") return { fehlt: true };
    await loadKader();
    EVAL_DATA[gestern] = [ { name: "Dribbel Quadrat", trainer: "Alle", formIdx: 1, notiz: "ohne Namen", skipped: false, "Durchführung": 3 },
                           { name: "Dribbel Quadrat", trainer: "Alle", formIdx: 1, notiz: "Peter fand es zu eng", skipped: false, "Durchführung": 2, von: "Peter", am: "2026-09-25T19:10:00Z" } ];
    await einheitBewertenOpen();
    const out = {};
    out.b = document.getElementById("eb-card").textContent.replace(/\s+/g, " ");
    await einheitDetailOpen(gestern); await warte(200);
    if (typeof nbWegAus === "function") nbWegAus();
    const card = document.getElementById("eb-card");
    out.c = { text: card.textContent.replace(/\s+/g, " "), spass: Number(document.getElementById("eb-stars-spass").dataset.val),
      notiz: document.getElementById("eb-notiz").value, ueNotiz: document.getElementById("eb-ue-notiz-0").value };
    // e) Grenzen und Mitwachsen
    const hoch0 = document.getElementById("eb-notiz").offsetHeight;
    document.getElementById("nb-text").value = "Heute war es unruhig, das hat sich durchgezogen."; _nbText = document.getElementById("nb-text").value;
    await nbAuswerten("training"); await warte(80);
    out.e = { ebNotizMax: document.getElementById("eb-notiz").maxLength, ueMax: document.getElementById("eb-ue-notiz-0").maxLength,
      nbMax: document.getElementById("nb-text").maxLength, notizLaenge: document.getElementById("eb-notiz").value.length,
      hoch0, hoch1: document.getElementById("eb-notiz").offsetHeight, ueTag: document.getElementById("eb-ue-notiz-0").tagName };
    document.getElementById("eb-ue-notiz-0").value = "Eigener Kommentar";
    await einheitSave(); await warte(1900);
    out.d = { eval: JSON.parse(JSON.stringify(EVAL_DATA[gestern] || [])) };
    document.getElementById("eb-modal")?.remove();
    // f) Tagebuch
    let box = document.getElementById("tb-liste"); if (!box) { box = document.createElement("div"); box.id = "tb-liste"; document.body.appendChild(box); }
    await tagebuchListe(); await warte(50);
    out.f = { liste: box.textContent.replace(/\s+/g, " ") };
    if (typeof tbOeffnen === "function") { tbOeffnen({ quelle: "frei", datum: gestern }); await warte(150); }
    out.f.fenster = (document.getElementById("tb-card") || {}).textContent || "";
    return out;
  }, { gestern });
  const fe = s.fehler();
  await s.schliessen();
  if (r.fehlt) return h.ergebnis("v630 Stempel und Länge", false, ["stempelText fehlt"]);
  // a
  const p = posts[0] || { url: "", body: {} };
  if (p.body.autor !== "Charles" || !/on_conflict=datum(%2C|,)autor/.test(p.url)) probleme.push(`a) gespeichert: ${JSON.stringify({ url: p.url.slice(-40), autor: p.body.autor })}`);
  // b
  if (!/bewertet von Charles, Peter/.test(r.b)) probleme.push("b) Liste: " + r.b.slice(0, 200));
  // c
  if (r.c.spass !== 5 || r.c.notiz === PETER_E.notiz) probleme.push(`c) eigene Werte: Spaß ${r.c.spass}, Notiz „${r.c.notiz}“`);
  if (!/✍️ Charles/.test(r.c.text) || !/Auch bewertet von Peter/.test(r.c.text) || !/zu viel Wartezeit/.test(r.c.text) || !/✍️ Peter · 25\.09\.2026/.test(r.c.text)) probleme.push("c) Stempel/Peter: " + r.c.text.slice(0, 260));
  // d
  const ev = r.d.eval;
  const meins = ev.find(e => e.von === "Charles"), peter = ev.find(e => e.von === "Peter"), ohne = ev.filter(e => !e.von);
  if (!meins || meins.notiz !== "Eigener Kommentar" || !meins.am || !peter || ohne.length) probleme.push("d) Übungen: " + JSON.stringify(ev.map(e => (e.von || "–") + ":" + e.notiz)));
  if (r.c.ueNotiz !== "ohne Namen") probleme.push(`d) Eintrag ohne Namen nicht als eigener geladen: „${r.c.ueNotiz}“`);
  if (!/✍️ Peter.*zu eng/.test(r.c.text)) probleme.push("d) Peters Übungsbewertung nicht sichtbar");
  // e
  const e = r.e;
  if (e.ebNotizMax !== 3000 || e.ueMax !== 800 || e.nbMax !== 12000 || e.ueTag !== "TEXTAREA") probleme.push("e) Grenzen: " + JSON.stringify(e));
  if (e.notizLaenge < 1000) probleme.push(`e) lange KI-Notiz gekürzt auf ${e.notizLaenge} Zeichen`);
  if (!(e.hoch1 > e.hoch0 + 40)) probleme.push(`e) Einheits-Notiz wächst nicht mit (${e.hoch0} → ${e.hoch1} px)`);
  const fz = fs.readFileSync(path.join(h.REPO, "md-fazit.js"), "utf8");
  if (!/id="fz-getragen" class="wachsen" rows="2" maxlength="1500"/.test(fz) || !/id="fz-arbeiten" class="wachsen" rows="2" maxlength="1500"/.test(fz)) probleme.push("e) Spiel-Sätze nicht auf 1500");
  // f
  if (!/✍️ Peter/.test(r.f.liste)) probleme.push("f) Tagebuch-Liste ohne Stempel: " + r.f.liste.slice(0, 160));
  if (r.f.fenster && !/✍️ Charles/.test(r.f.fenster)) probleme.push("f) Tagebuch-Fenster ohne Stempel");
  // g
  const ki = fs.readFileSync(path.join(h.REPO, "supabase/functions/ki-nachbereitung/index.ts"), "utf8");
  if (/höchstens 200 Zeichen/.test(ki) || !/MAX_TEXT = 12000/.test(ki) || !/satz\(e\.notiz, 3000\)/.test(ki) || !/satz\(t\.beobachtung, 4000\)/.test(ki)) probleme.push("g) KI-Grenzen nicht angehoben");
  const mig = fs.readdirSync(path.join(h.REPO, "supabase/migrations")).filter(f => /einheit_bewertung_je_trainer/.test(f));
  if (!mig.length || !/primary key \(datum, autor\)/.test(fs.readFileSync(path.join(h.REPO, "supabase/migrations", mig[0]), "utf8"))) probleme.push("g) Migration fehlt");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`Einheit: autor ${p.body.autor} · Übungen: ${ev.map(x => (x.von || "–")).join(", ")} · KI-Notiz ${e.notizLaenge} Zeichen, Feld ${e.hoch0}→${e.hoch1} px`);
  return h.ergebnis("v630 Stempel je Trainer und längere Texte fürs Trainer-Tagebuch", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
