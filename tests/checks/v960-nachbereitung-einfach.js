/* v960 · Charles 24.11. (Bild freigegeben): „Wichtig ist, dass die Trainer es einfach haben, ihre Bewertungen loszuwerden.“
   a) Einstieg: zwei Wege („🎙️ Erzählen“, „✍️ Selbst eingeben“) und „Heute nichts eintragen“ – kein zweites Diktatfeld.
   b) Erzählen: Titel „Erzähl, wie es lief“, Knopf „Auswerten“; solange die KI arbeitet, steht der rollende Ball mit
      „Die KI wertet aus …“; danach „So hat die KI es verstanden“ mit Sternen (Tippen ändert) und „Passt so“; erst „Passt so“
      speichert (einheit_bewertung).
   c) Wer das Tagebuch führt (team_config.tagebuch_fuehrt), bekommt danach die Prüfkarte des Entwurfs; ein anderer Trainer
      „Danke dir!“ – sein Entwurf wird ohne Rückfragen fertig (PATCH status fertig, rueckfragen leer, bestaetigt_am).
   d) Tagebuch des Führenden: lädt alle Autoren; der Eintrag eines Kollegen trägt „👥 Trainerbewertung · <Name>“.
   e) Startseite: unter „📝 Nachbereiten – N offen“ steht „Geht in 2 Minuten …“. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v960 Nachbereitung einfach: zwei Wege, Ball, Prüfen, „Passt so“; Kollegen ohne Rückfragen ins Tagebuch";
  const probleme = [], zeilen = [];
  const gestern = h.tagePlus(-1);
  const lauf = async (ich) => {
    const tb = []; let nr = 80;
    const tbTabelle = (u, req) => {
      if (req.method() === "POST") { let b = null; try { b = JSON.parse(req.postData() || "null"); } catch (e) {} const neu = (Array.isArray(b) ? b : [b]).map(x => ({ id: nr++, ...x })); tb.push(...neu); return neu; }
      if (req.method() === "PATCH") return { status: 204, body: "" };
      const alle = tb.concat([{ id: 5, autor: "Trainer B", datum: gestern, quelle: "einheit", status: "fertig", ki_vorschlag: true, bestaetigt_am: "2026-11-23T10:00:00Z", ausloeser: "Training U9" }]);
      const id = (u.searchParams.get("id") || "").replace("eq.", ""), autor = (u.searchParams.get("autor") || "").replace("eq.", "");
      return alle.filter(x => (!id || String(x.id) === id) && (!autor || x.autor === autor));
    };
    const s = await h.starten({ hoehe: 1600, supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(), profiles: [{ name: ich, rolle: "trainer" }], anwesenheit: [], einheit_bewertung: [], trainings_eval: [], tagebuch_eintrag: tbTabelle, tagebuch_punkt: [], tagebuch_kind: [], nachbereitung_verzicht: [],
      team_config: [{ id: 1, tagebuch_fuehrt: "Charles" }],
      trainingsplan: [{ datum: gestern, plan: [{ formIdx: 1, formName: "Dribbel Quadrat", trainer: "Alle", slotLabel: "Warm up" }], kopf: {} }],
      funktionen: { "ki-nachbereitung": () => ({ art: "training", ergebnis: { einheit: { spass: 4, umsetzung: 3, erfolg: 3, notiz: "Viel über Fragen gecoacht." },
        uebungen: [], kinder: [], tagebuch: { baustein: "ich", beobachtung: "Coaching über Fragen.", aha: null, konsequenz: null, schlagworte: [], rueckfragen: ["Was genau?"] } } }) } }) });
    const r = await s.page.evaluate(async ({ gestern, ich }) => {
      const w = ms => new Promise(x => setTimeout(x, ms)), txt = el => el ? el.textContent.replace(/\s+/g, " ").trim() : "";
      window.trainerMe = async () => ich;
      if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
      document.getElementById("pin-gate")?.remove();
      for (let i = 0; i < 50 && typeof nbPruefen !== "function"; i++) await w(100);
      if (typeof nbPruefen !== "function") return { alt: true };
      await loadKader();
      AW_DATA[gestern] = { "Kind A": { da: true }, "Kind C": { da: true } };
      await einheitBewertenOpen(); await einheitDetailOpen(gestern);
      for (let i = 0; i < 40 && !document.getElementById("nb-weg"); i++) await w(50);
      const out = {};
      const weg = document.getElementById("nb-weg");
      out.a = { text: txt(weg), wege: weg ? [...weg.querySelectorAll(".nb-wahl")].map(b => txt(b.querySelector(".nb-wahl-t"))) : [], box: !!(weg && weg.querySelector("#nb-box")) };
      weg.querySelector(".nb-wahl-erzaehlen")?.click();
      for (let i = 0; i < 40 && !document.getElementById("nb-gross-text"); i++) await w(50);
      out.b = { titel: txt(document.querySelector("#nb-gross-ov > div")), knopf: txt(document.getElementById("nb-gross-los")) };
      const ta = document.getElementById("nb-gross-text"); ta.value = "Heute viel über Fragen gecoacht, die Gruppe hat gut mitgemacht."; nbGrossSync(ta.value);
      const echtKi = window.nbKiHolen; window.nbKiHolen = async (...x) => { await w(700); return echtKi(...x); };   // die KI braucht einen Moment
      document.getElementById("nb-gross-los").click();
      await w(250);
      const lade = document.getElementById("nb-lade");
      out.b.lade = { da: !!lade, text: txt(lade), ball: !!(lade && lade.querySelector(".nb-lade-ball")), status: txt(document.getElementById("nb-gross-status")), ov: !!document.getElementById("nb-gross-ov"), los: txt(document.getElementById("nb-gross-los")) };
      for (let i = 0; i < 60 && !document.querySelector("#nb-weg .nb-passt"); i++) await w(100);
      const pr = document.getElementById("nb-weg");
      out.b.pruefen = txt(pr);
      out.b.sterne = pr ? pr.querySelectorAll(".nb-pr-stern").length : 0;
      out.b.spassVor = einheitGetStar("spass");
      pr?.querySelector('.nb-pr-stern[aria-label="Spaß der Kinder: 2 von 5"]')?.click(); await w(50);
      out.b.spassNach = einheitGetStar("spass");
      out.b.vorPasst = window.__gesendet ? 0 : 0;
      window.__vorPasst = performance.now();
      document.querySelector("#nb-weg .nb-passt")?.click();
      for (let i = 0; i < 60 && !document.getElementById("tb-pruefen") && !document.getElementById("nb-danke"); i++) await w(100);
      await w(300);
      out.c = { pruefen: !!document.getElementById("tb-pruefen"), danke: txt(document.getElementById("nb-danke")), erg: !!document.getElementById("nb-ergebnis"), offen: [...document.querySelectorAll("[role=dialog]")].map(d => d.id).join(","), id: await _nbTbSichern, fuehre: await tbIchFuehre() };
      // d) Tagebuch-Liste (nur beim Führenden sinnvoll)
      let liste = document.getElementById("tb-liste"); if (!liste) { liste = document.createElement("div"); liste.id = "tb-liste"; document.body.appendChild(liste); }
      if (typeof tagebuchListe === "function") { await tagebuchListe(); await w(200); }
      out.d = { kollege: [...document.querySelectorAll("#tb-liste .tb-kollege")].map(txt), fuehrt: !!document.getElementById("tb-fuehrt-wahl") };
      return out;
    }, { gestern, ich }).catch(x => ({ fehler: String(x) }));
    const gesendet = s.gesendet.map(g => ({ m: g.methode, p: g.pfad, body: g.body }));
    const fe = s.fehler(); await s.schliessen();
    return { r, gesendet, fe };
  };
  const fuehrend = await lauf("Charles"), kollege = await lauf("Trainer B");
  const f = fuehrend.r, k = kollege.r;
  if (f.alt) return h.ergebnis(titel, false, ["nbPruefen fehlt (Stand vor v960)"]);
  if (f.fehler || k.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + (f.fehler || k.fehler)]);
  if (JSON.stringify(f.a.wege) !== JSON.stringify(["🎙️ Erzählen", "✍️ Selbst eingeben"]) || !/Heute nichts eintragen/.test(f.a.text) || f.a.box) probleme.push("a) Einstieg " + JSON.stringify(f.a).slice(0, 200));
  if (!/Erzähl, wie es lief/.test(f.b.titel) || !/^Auswerten$/.test(f.b.knopf)) probleme.push(`b) Erzählen „${f.b.titel}“ · Knopf „${f.b.knopf}“`);
  if (!f.b.lade.da || !f.b.lade.ball || !/Die KI wertet aus/.test(f.b.lade.text)) probleme.push("b) Ladeanzeige " + JSON.stringify(f.b.lade));
  if (!/So hat die KI es verstanden/.test(f.b.pruefen) || f.b.sterne < 15 || f.b.spassVor !== 4 || f.b.spassNach !== 2) probleme.push(`b) Prüfschritt: Sterne ${f.b.sterne}, Spaß ${f.b.spassVor} → ${f.b.spassNach} · „${f.b.pruefen.slice(0, 80)}“`);
  const ebF = fuehrend.gesendet.filter(g => /einheit_bewertung/.test(g.p) && g.m === "POST");
  if (!ebF.length || !ebF.some(g => JSON.stringify(g.body).includes('"spass":2'))) probleme.push("b) „Passt so“ speichert nicht den geänderten Spaß-Wert");
  if (!f.c.pruefen || f.c.danke) probleme.push("c) Führender: " + JSON.stringify(f.c));
  if (k.c.pruefen || !/Danke dir/.test(k.c.danke)) probleme.push("c) Kollege: Prüfkarte " + k.c.pruefen + ", Danke „" + k.c.danke + "“");
  const patch = kollege.gesendet.filter(g => /tagebuch_eintrag/.test(g.p) && g.m === "PATCH").map(g => g.body);
  if (!patch.some(b => b && b.status === "fertig" && Array.isArray(b.rueckfragen) && !b.rueckfragen.length && b.bestaetigt_am)) probleme.push("c) Kollegen-Entwurf nicht ohne Rückfragen übernommen: " + JSON.stringify(patch).slice(0, 200));
  if (fuehrend.gesendet.some(g => /tagebuch_eintrag/.test(g.p) && g.m === "PATCH" && g.body && g.body.status === "fertig" && g.body.rueckfragen)) probleme.push("c) Führender: Entwurf ohne Prüfung übernommen");
  const listeF = fuehrend.gesendet.filter(g => g.m === "GET" && /tagebuch_eintrag/.test(g.p));
  if (!f.d.kollege.some(t => /Trainerbewertung · Trainer B/.test(t)) || !f.d.fuehrt) probleme.push("d) Führender sieht Kollegen-Eintrag nicht gekennzeichnet: " + JSON.stringify(f.d));
  if (k.d.kollege.length) probleme.push("d) Kollege sieht fremde Einträge: " + JSON.stringify(k.d.kollege));
  const views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  if (!/Geht in 2 Minuten – einmal erzählen, den Rest macht die KI\./.test(views)) probleme.push("e) Hinweis an der Startseiten-Kachel fehlt");
  const mig = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20261124_v960_tagebuch_fuehrt.sql"), "utf8");
  if (!/add column if not exists tagebuch_fuehrt text/.test(mig)) probleme.push("Migration tagebuch_fuehrt fehlt");
  const fe = fuehrend.fe.concat(kollege.fe).filter(x => !/Failed to load resource/.test(x)); if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`a) ${f.a.wege.join(" | ")} · b) Ball ${f.b.lade.ball}, ${f.b.sterne} Sterne, Spaß ${f.b.spassVor}→${f.b.spassNach} · c) Führender Prüfkarte ${f.c.pruefen}, Kollege „${String(k.c.danke).slice(0, 40)}“ · d) ${f.d.kollege.join(", ")}`);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
