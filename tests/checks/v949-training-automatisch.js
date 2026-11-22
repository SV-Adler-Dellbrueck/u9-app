/* v949 · Charles 22.11.: „Eine Kachel, die alles automatisch baut fürs Training aus vorbereiteten Einheiten. Eine Leitfrage sollte
   schon festgelegt worden sein. Sollte sie fehlen, sollte ein Hinweis erscheinen und sie wird bestimmt.“ – Leitfrage je Monat
   (periodisierung.leitfrage, Migration v949), Einheit: die nächste noch nicht trainierte der Folge (Saisonformat zuerst).
   a) Ohne Leitfrage des Monats: Hinweis „keine Leitfrage festgelegt“ mit allen Leitfragen zum Antippen (≥ 44 px).
   b) Antippen speichert die Leitfrage für den Monat (POST periodisierung mit monat, thema, leitfrage) und zeigt sofort
      „Dein Training ist bereit“ mit „Leitfrage des Monats · Einheit …“ und „Training bauen“ (≥ 56 px).
   c) Schon trainierte Einheiten (≥ 60 % ihrer Übungen in einem Plan des Monats) werden übersprungen; Saisonformat zuerst.
   d) „Andere Einheit“ blättert weiter; „Training bauen“ schreibt den Plan; danach „Dein Training steht“.
   e) Nur noch zwei Kacheln (Selbst bauen, Mit KI) und der Block als Link; Vorlagen-Fenster: „Für <Tag> übernehmen“. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v949 Training automatisch: Leitfrage des Monats, nächste Einheit, ein Knopf";
  const probleme = [], zeilen = [];
  const mig = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20261122_v949_periodisierung_leitfrage.sql"), "utf8");
  if (!/add column if not exists leitfrage text/.test(mig)) probleme.push("Migration ohne Spalte leitfrage");
  const F1 = "Wie behalte ich den Ball, wenn einer kommt?", F5 = "Wo stehe ich, wenn wir den Ball haben – und wo, wenn nicht?";
  const bl = [{ typ: "warmup", label: "Aufwärmen", dauer: 10 }, { typ: "main", label: "Hauptteil", dauer: 40, uebung_name: "Korridor-Funino" }, { typ: "abschluss", label: "Abschlussspiel", dauer: 20 }];
  const vorlagen = [
    { id: 1, name: "L1-1 Abschirmen", leitfrage: F1, folge_nr: 1, ordnung: "4+1", tags: [], bloecke: bl },
    { id: 11, name: "L5-1 Anbieten", leitfrage: F5, folge_nr: 1, ordnung: "3+1", tags: [], bloecke: bl },
    { id: 12, name: "L5-2 Freilaufen", leitfrage: F5, folge_nr: 2, ordnung: "4+1", tags: [], bloecke: bl },
    { id: 13, name: "L5-3 Raute", leitfrage: F5, folge_nr: 3, ordnung: "FUNiño", tags: [], bloecke: bl }];
  const datum = h.tagePlus(1);
  let per = [], posts = [], plan = null;
  const s = await h.starten({ breite: 390, hoehe: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [{ id: 70, datum, typ: "training", uhrzeit: "16:45" }],
    trainingsvorlagen: vorlagen, trainingsblock: [],
    trainingsplan: (u, req) => { if (req.method() === "POST") { plan = JSON.parse(req.postData() || "null"); return { status: 201, body: "[]" }; }
      if (/datum=gte/.test(u.search)) return [{ datum: h.tagePlus(-3), plan: [{ formName: "Ü-A" }, { formName: "Ü-B" }] }];   // trainiert: L5-1
      if (!plan || !decodeURIComponent(u.search).includes(plan.datum)) return [];
      if (/select=slots/.test(u.search)) return [{ slots: plan.slots || [] }]; if (/select=plan/.test(u.search)) return [{ plan: plan.plan || [] }]; return [plan]; },
    periodisierung: (u, req) => { if (req.method() !== "GET") { const b = JSON.parse(req.postData() || "{}"); posts.push({ m: req.method(), b }); per = [{ monat: b.monat || datum.slice(0, 7), leitfrage: b.leitfrage }]; return { status: 201, body: "[]" }; } return per; } }) });
  await h.sichtbarMachen(s.page, "#tp-timeline");
  const r = await s.page.evaluate(async ({ datum }) => {
    const w = ms => new Promise(x => setTimeout(x, ms)), txt = e => e ? e.textContent.replace(/\s+/g, " ").trim() : "";
    await loadKader();
    const f = document.getElementById("tp-date"); if (![...f.options].some(o => o.value === datum)) f.add(new Option(datum, datum)); f.value = datum;
    await tpTrainerRsvpLaden(datum); await tpPlanRestore(datum); for (let i = 0; i < 30 && !document.getElementById("tps-haupt"); i++) await w(100);
    // Übungen je Einheit festlegen (die Attrappe kennt keine Bibliothek): L5-1 = Ü-A, Ü-B (schon trainiert), L5-2 = Ü-C, L5-3 = Ü-D
    const orig = vuPlanAusVorlage; window.vuPlanAusVorlage = v => { const o = orig(v); const n = { "L5-1 Anbieten": ["Ü-A", "Ü-B"], "L5-2 Freilaufen": ["Ü-C"], "L5-3 Raute": ["Ü-D"] }[v.name]; if (n) o.plan = n.map(x => ({ formName: x })); return o; };
    _tpaLf = {}; await tpStartRender(datum); await w(100);
    const out = {};
    out.a = { text: txt(document.getElementById("tps-haupt")), chips: [...document.querySelectorAll(".tps-lf-chip")].map(b => Math.round(b.getBoundingClientRect().height)) };
    const i5 = _tbLeitfragen().indexOf("Wo stehe ich, wenn wir den Ball haben – und wo, wenn nicht?");
    await tpaLfSetzen(datum, i5); await w(200);
    out.b = { text: txt(document.getElementById("tps-haupt")), knopf: Math.round(document.getElementById("tps-bauen")?.getBoundingClientRect().height || 0) };
    document.getElementById("tps-andere-einheit").click(); await w(300);
    out.d1 = txt(document.querySelector("#tps-haupt .tps-lf"));
    document.getElementById("tps-andere-einheit").click(); await w(300); document.getElementById("tps-andere-einheit").click(); await w(300);
    out.d2 = txt(document.querySelector("#tps-haupt .tps-lf"));
    window.frageJaNein = async () => true; window.vuPlanAusVorlage = orig;   // echte Übungsliste zum Schreiben
    await tpaBauen(datum); await w(400);
    out.d3 = txt(document.getElementById("tps-haupt"));
    out.e = { wege: [...document.querySelectorAll(".tps-wege .tps-weg")].map(txt) };
    await vorlageUebernehmenOpen(); await w(300); _vuAuswahl = 12; _vuPlanDa = false; vorlageUebernehmenRender(); await w(100);
    out.e.vu = txt(document.getElementById("vu-haupt")); document.getElementById("vu-modal")?.remove();
    return out;
  }, { datum }).catch(x => ({ fehler: String(x) }));
  const fe = s.fehler(); await s.schliessen();
  if (r.fehler) probleme.push(r.fehler);
  else {
    if (!/keine Leitfrage festgelegt/.test(r.a.text) || r.a.chips.length < 2 || Math.min(...r.a.chips) < 44) probleme.push(`a) ${r.a.text.slice(0, 120)} · Chips ${JSON.stringify(r.a.chips)}`);
    const p = posts[posts.length - 1] || {};
    if (!p.b || p.b.leitfrage !== F5 || !p.b.thema || p.b.monat !== datum.slice(0, 7)) probleme.push("b) gespeichert: " + JSON.stringify(posts));
    if (!/Dein Training ist bereit/.test(r.b.text) || !/Leitfrage des Monats · Einheit L5-3/.test(r.b.text) || r.b.knopf < 56) probleme.push(`c) erste Einheit (L5-3 FUNiño vor L5-2, L5-1 schon trainiert): ${r.b.text.slice(0, 160)} · Knopf ${r.b.knopf}`);
    if (!/Einheit L5-2/.test(r.d1) || !/Einheit L5-3/.test(r.d2)) probleme.push(`d) Andere Einheit: „${r.d1}“ / „${r.d2}“`);
    if (!plan || !/Dein Training steht/.test(r.d3)) probleme.push("d) Training bauen: " + (plan ? "Plan da" : "kein Plan") + " · " + r.d3.slice(0, 80));
    if (r.e.wege.length !== 2 || !/Selbst bauen/.test(r.e.wege[0]) || !/Mit KI/.test(r.e.wege[1])) probleme.push("e) Kacheln " + JSON.stringify(r.e.wege));
    if (!/^.?Für \S+ \d\d\.\d\d\. übernehmen/.test(r.e.vu.trim())) probleme.push("e) Vorlagen-Knopf „" + r.e.vu + "“");
  }
  const fehler = fe.filter(x => !/Failed to load resource/.test(x)); if (fehler.length) probleme.push("Konsole: " + fehler.slice(0, 2).join(" | "));
  zeilen.push(`a) Hinweis + ${(r.a || {}).chips ? r.a.chips.length : 0} Leitfragen · b) gespeichert, „Training bauen“ ${(r.b || {}).knopf} px`);
  zeilen.push(`c) L5-1 trainiert → zuerst L5-3 (FUNiño), dann L5-2 · d) Plan geschrieben · e) „${(r.e || {}).vu}“`);
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
