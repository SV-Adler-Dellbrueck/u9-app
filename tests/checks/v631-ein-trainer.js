/* v631 · PO: „Überlege mal, welche Trainingsformen wir noch in die App einbauen können, die auch
   mit einem einzigen Trainer durchführbar sind, ohne eine hohe Komplexität zu haben.“ Kachel:
   „Schritt 1 + 2 bauen“.

   Befund: An Übungen fehlt es kaum; die App wusste nur nicht, welche ohne Trainer laufen. Seit
   v570 plant sie die Felder nach der Kinderzahl – bei 15 Kindern und zwei Trainern drei Felder,
   eines davon ohne Trainer.

   a) Jede Übung (data.js + Bibliothek) hat einen Vorschlag „läuft allein / Trainer führt /
      Trainer am Feld“ – eine neue Übung ohne Vorschlag macht diese Prüfung rot.
   b) Der Vorschlag gilt nicht als Einordnung: Durchsicht zeigt ihn, geschrieben wird erst mit
      „Einordnung übernehmen“, in einem PATCH auf team_config.uebung_betreuung.
   c) Übungsdetail: „👤 läuft allein (Vorschlag)“ – nach dem Übernehmen ohne „(Vorschlag)“.
   d) Plan: Feld ohne Trainer mit einer Übung, die einen Trainer braucht → Hinweis mit drei
      Übungen, die allein laufen; ein Tipp tauscht, der Hinweis verschwindet.
   e) Bekommt das Feld einen Trainer, verschwindet der Hinweis auch mit der alten Übung.
   f) Ein Block mit nur einem Feld warnt nie – dort steht der eine Trainer ja. */
"use strict";
const L48 = "L4-8";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const vor = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8"));
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  // a) Abdeckung – im Node-Kontext aus data.js gelesen
  const ctx = { window: {}, document: { addEventListener() {}, getElementById() { return null; }, querySelector() { return null; } }, navigator: {}, localStorage: { getItem() { return null; } } };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(h.REPO, "data.js"), "utf8") + ";this.__TF=TRAININGSFORMEN;this.__BV=typeof UEBUNG_BETREUUNG_VORSCHLAG!=='undefined'?UEBUNG_BETREUUNG_VORSCHLAG:null;", ctx);
  if (!ctx.__BV) return h.ergebnis("v631 Ein Trainer", false, ["UEBUNG_BETREUUNG_VORSCHLAG fehlt"]);
  const namen = ctx.__TF.map(f => f.name).concat(bib.uebungen.map(u => u.name));
  const ohne = namen.filter(n => !["allein", "fuehrt", "feld"].includes(ctx.__BV[n]));
  if (ohne.length) probleme.push(`a) ${ohne.length} Übungen ohne Vorschlag: ${ohne.slice(0, 5).join(" · ")}`);
  const zaehl = k => Object.values(ctx.__BV).filter(v => v === k).length;
  zeilen.push(`Vorschlag: ${zaehl("allein")} allein, ${zaehl("fuehrt")} Trainer führt, ${zaehl("feld")} Trainer am Feld (von ${namen.length})`);

  const datum = h.tagePlus(2);
  const custom = (bib.uebungen || []).map((u, i) => ({ ...u, id: 6000 + i, custom: true }));
  const rows = (vor.vorlagen || []).map((v, i) => ({ ...v, id: 500 + i }));
  const plaene = {}, patches = [];
  const s = await h.starten({ hoehe: 2600, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen({ inaktiv: h.KINDER.slice(15) }), nominierungen: [], anwesenheit: [],
    team_config: (u, req) => { if (req.method() === "PATCH") { patches.push(JSON.parse(req.postData() || "{}")); return { status: 204, body: "" }; } return [{ id: 1, uebung_meta: {}, uebung_art: {}, uebung_betreuung: {}, netto_richtwert: 48 }]; },
    termine: (u) => { const d = (u.searchParams.get("datum") || "").replace(/^eq\./, ""); return [{ id: 91, datum, typ: "training", trainer_status: { Charles: "ja", Finn: "ja" } }].filter(t => !d || t.datum === d); },
    trainingsformen: custom, trainingsvorlagen: rows,
    trainingsgruppen: (u, req) => (req.method() === "POST" ? { status: 201, body: "[]" } : []),
    trainingsplan: (u, req) => {
      if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); plaene[b.datum] = b; return { status: 201, body: "[]" }; }
      const d = (u.searchParams.get("datum") || "").replace(/^eq\./, ""); const p = plaene[d]; if (!p) return [];
      if (/select=slots/.test(u.search) && !/plan/.test(u.search)) return [{ datum: d, slots: p.slots || [] }];
      if (/select=plan/.test(u.search) && !/slots/.test(u.search)) return [{ datum: d, plan: p.plan || [] }];
      return [p];
    }
  }) });
  await h.sichtbarMachen(s.page, "#train-sub-planung");
  await h.sichtbarMachen(s.page, "#tp-timeline");
  const r = await s.page.evaluate(async ({ datum, L48 }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    if (typeof tpBetreuungHinweis !== "function" || typeof betrDurchsichtOpen !== "function") return { fehlt: true };
    const out = {};
    /* Die Fenster-Verwaltung aus v624 geht beim Schließen einen Verlaufsschritt zurück. Frisch
       geladen gibt es davor nur about:blank – ein Schritt zu viel verließe die Seite. */
    for (let i = 0; i < 6; i++) history.pushState({ v631: i }, "");
    await loadKader();
    window._uebungMeta = null; await uebungMetaLoad();
    const feld = document.getElementById("tp-date");
    if (feld && ![...feld.options].some(o => o.value === datum)) feld.add(new Option(datum, datum));
    if (feld) feld.value = datum;
    await tpTrainerRsvpLaden(datum);
    await vorlagenLaden(); await tgSync(); await warte(120);
    _vuAuswahl = String((VORLAGEN.find(v => String(v.name).startsWith(L48 + " ")) || {}).id);
    await vorlageUebernehmenSetzen(); await warte(500);
    // d) Feld ohne Trainer finden
    let ziel = null, einzeln = null;
    tpSlots.forEach((sl, si) => {
      const sels = [...document.querySelectorAll(`select.tp-form-sel[id^="tp-form-${si}-"]`)];
      if (tpIstHauptteil(sl.typ) && sels.length > 1) sels.forEach(x => { if (!ziel && !tpCoaches[x.id] && _tpStationGruppe[x.id]) ziel = x.id; });
    });
    out.ziel = ziel;
    if (!ziel) return out;
    const alle = tpAllForms(), idxVon = n => alle.findIndex(f => f.name === n);
    const setze = async (id, n) => { const sel = document.getElementById(id); const i = idxVon(n); if (![...sel.options].some(o => o.value === String(i))) sel.add(new Option(n, String(i))); sel.value = String(i); tpOnSelectChange(sel); await warte(40); };
    const hin = id => ((document.getElementById(id + "-betr") || {}).textContent || "").replace(/\s+/g, " ").trim();
    await setze(ziel, "Farb-Entscheidung");          // Vorschlag: Trainer führt
    out.d = { text: hin(ziel), knoepfe: [...document.querySelectorAll(`#${ziel}-betr button`)].map(b => b.textContent.trim()) };
    const b0 = document.querySelector(`#${ziel}-betr button`);
    if (b0) { b0.click(); await warte(60); }
    out.d.nach = (alle[+document.getElementById(ziel).value] || {}).name; out.d.textNach = hin(ziel);
    // e) Trainer eingeteilt → still, auch mit „Trainer führt“
    await setze(ziel, "Farb-Entscheidung");
    tpSetCoach(ziel, "Charles"); await warte(40);
    out.e = hin(ziel);
    // f) Block mit nur einem Feld
    tpSlots.forEach((sl, si) => { const sels = [...document.querySelectorAll(`select.tp-form-sel[id^="tp-form-${si}-"]`)]; if (!einzeln && sels.length === 1 && _tpStationGruppe[sels[0].id]) einzeln = sels[0].id; });
    if (einzeln) { delete tpCoaches[einzeln]; await setze(einzeln, "Farb-Entscheidung"); out.f = hin(einzeln); } else out.f = "(kein Einzelblock)";
    // c) Detail vorher
    const fi = idxVon("Hai & Fische");
    tpShowExercise(fi); await warte(30);
    out.c = { vorher: (document.querySelector("#uebung-modal .tp-ex-betr") || {}).textContent || "" };
    document.getElementById("uebung-modal")?.remove();
    // b) Durchsicht
    const vorPatch = window._uebungBetreuung && Object.keys(window._uebungBetreuung).length;
    betrDurchsichtOpen(); await warte(30);
    const box = document.getElementById("bd-inhalt");
    out.b = { vorPatch, text: box.textContent.replace(/\s+/g, " ") };
    const knopf = [...box.querySelectorAll("button")].find(x => /Hai & Fische/.test(x.getAttribute("aria-label") || ""));
    if (knopf) { knopf.click(); await warte(20); }   // allein → fuehrt
    await betrDurchsichtUebernehmen(); await warte(60);
    out.b.nachHai = (window._uebungBetreuung || {})["Hai & Fische"];
    out.b.anzahl = Object.keys(window._uebungBetreuung || {}).length;
    out.b.zu = !document.getElementById("bd-modal");
    tpShowExercise(fi); await warte(30);
    out.c.nachher = (document.querySelector("#uebung-modal .tp-ex-betr") || {}).textContent || "";
    return out;
  }, { datum, L48 });
  const fe = s.fehler();
  await s.schliessen();
  if (r.fehlt) return h.ergebnis("v631 Ein Trainer", false, ["tpBetreuungHinweis/betrDurchsichtOpen fehlt"]);
  if (!r.ziel) probleme.push("d) kein Feld ohne Trainer gefunden – der Fall tritt nicht ein");
  else {
    if (!/kein Trainer eingeteilt/.test(r.d.text) || !/Farb-Entscheidung/.test(r.d.text) || r.d.knoepfe.length !== 3) probleme.push(`d) Hinweis: „${r.d.text.slice(0, 160)}“ · ${r.d.knoepfe.length} Vorschläge`);
    if (!r.d.nach || r.d.nach === "Farb-Entscheidung" || r.d.textNach) probleme.push(`d) Tausch: ${r.d.nach} · Hinweis danach „${r.d.textNach}“`);
    if (r.e) probleme.push(`e) mit Trainer trotzdem Hinweis: „${r.e.slice(0, 80)}“`);
    if (r.f && r.f !== "(kein Einzelblock)") probleme.push(`f) Einzelfeld warnt: „${r.f.slice(0, 80)}“`);
    zeilen.push(`Feld ${r.ziel}: „Farb-Entscheidung“ → Vorschläge ${r.d.knoepfe.join(" | ")} → getauscht zu „${r.d.nach}“`);
  }
  if (!/läuft allein \(Vorschlag\)/.test(r.c.vorher) || !/Trainer führt/.test(r.c.nachher) || /Vorschlag/.test(r.c.nachher)) probleme.push(`c) Detail: vorher „${r.c.vorher}“, nachher „${r.c.nachher}“`);
  if (r.b.vorPatch) probleme.push("b) Einordnung stand schon vor der Durchsicht fest");
  if (!/Läuft allein/.test(r.b.text) || !/Trainer führt/.test(r.b.text) || !/Trainer am Feld/.test(r.b.text)) probleme.push("b) Durchsicht ohne die drei Gruppen: " + r.b.text.slice(0, 120));
  const p = patches.find(x => x.uebung_betreuung);
  if (patches.length !== 1 || !p || r.b.nachHai !== "fuehrt" || r.b.anzahl !== namen.length || !r.b.zu) probleme.push(`b) Übernehmen: ${patches.length} PATCH, Hai & Fische „${r.b.nachHai}“, ${r.b.anzahl} von ${namen.length} eingeordnet`);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v631 Ein Trainer: welche Übung läuft allein, und der Plan sagt es am Feld ohne Trainer", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
