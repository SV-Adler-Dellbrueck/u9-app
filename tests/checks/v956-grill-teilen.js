/* v956 · Charles 23.11.: „Am Samstag haben sich zwei Eltern den Grillhüttendienst geteilt. Beide haben 45 Minuten gemacht.
   Wie können wir das in der App berücksichtigen? Evtl. auch eine Lösung, wenn nur eine Person an einem Tag tatsächlich
   benötigt wird.“ Freigegeben: „Ja, so bauen“ – die zweite Familie steht in geteilt_kind, beide zählen je ½.
   a) ghHalb: 0 → „0“, 0,5 → „½“, 1,5 → „1½“, 2 → „2“.
   b) Trainer: am Termin mit 1 Familie „Geteilt mit“ → PATCH dienst_einteilung geteilt_kind; danach steht
      „(geteilt · je ½)“ in der Zeile; „Nicht geteilt“ schreibt null.
   c) Eltern (Grillhütte & Helfen): „Familie A & Familie B“ mit Marke „geteilt · je ½“, kein „Ersatz suchen“;
      Tabelle 1½ / ½, Team 2. Bei offener Wahl drei Knöpfe; „Wir teilen uns die Zeit“ ruft grill_wahl mit p_teilen.
   d) ghDienstHtml (Startseite, Termin): geteilt → „Ihr teilt euch …“ bzw. „Zwei Familien teilen sich …“.
   e) Migration: geteilt_kind, dienst_anteil (je ½), dienst_einteilen nach Anteil und ohne die zweite Familie,
      grill_wahl mit p_teilen; push-send schickt der zweiten Familie dieselben Mitteilungen. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v956 Grillhütte teilen: zwei Familien, je ½ Dienst";
  const probleme = [], zeilen = [];
  const tag = h.tagePlus(6);
  // Trainer
  const T = [{ id: 60, datum: tag, uhrzeit: "10:15", titel: "Heimspiel", typ: "spiel", heim: true, grill_plaetze: 1, grill_zeit: "", grill_beide: null }];
  const DE = [{ id: 1, termin_id: 60, kind_id: 1, platz: 1, status: "eingeteilt", geteilt_kind: null }];
  const s = await h.starten({ breite: 360, hoehe: 1400, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ name: "Charles", rolle: "trainer" }],
    termine: () => T, dienst_einteilung: () => DE, team_config: [{ dienst_plaetze: 2 }], dienst_sperre: [], dienst_befreit: [], rpc: { dienst_einteilen: 0 } }) });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)), txt = el => el ? el.textContent.replace(/\s+/g, " ").trim() : "";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    document.getElementById("pin-gate")?.remove();
    for (let i = 0; i < 40 && typeof ghHalb !== "function"; i++) await w(100);
    const out = { halb: [0, 0.5, 1.5, 2].map(ghHalb) };
    await loadKader();
    let box = document.getElementById("gh-tr-inhalt"); if (!box) { box = document.createElement("div"); box.id = "gh-tr-inhalt"; document.body.prepend(box); }
    await ghTrainerDaten(); grillTrainerRender();
    const z = document.getElementById("gh-t-60"), sel = z && z.querySelector(".gh-teilen select");
    out.optionen = sel ? sel.options.length : 0;
    out.erste = sel ? txt(sel.options[0]) : "";
    if (sel) { sel.value = sel.options[1].value; out.wert = sel.value; sel.dispatchEvent(new Event("change")); await w(300); }
    _ghTr.dienste[0].geteilt_kind = Number(out.wert); grillTrainerRender();
    out.zeile = txt(document.getElementById("gh-t-60"));
    const sel2 = document.querySelector("#gh-t-60 .gh-teilen select");
    if (sel2) { sel2.value = ""; sel2.dispatchEvent(new Event("change")); await w(300); }
    return out;
  }).catch(x => ({ fehler: String(x) }));
  const patch = s.gesendet.filter(g => /\/rest\/v1\/dienst_einteilung/.test(g.pfad) && g.methode === "PATCH").map(g => g.body && g.body.geteilt_kind);
  const feT = s.fehler(); await s.schliessen();
  // Eltern
  const D = { saison_ab: "2026-07-01", heimspiele: [
      { termin_id: 60, datum: tag, uhrzeit: "10:15:00", gegner: "Heimspiel", plaetze: 1, dienste: [
        { dienst_id: 1, platz: 1, status: "eingeteilt", familie: "Kind A", eigene: true, kann_uebernehmen: false, geteilt_mit: "Kind B" }] },
      { termin_id: 61, datum: h.tagePlus(13), uhrzeit: "10:15:00", gegner: "Festival", plaetze: 1, dienste: [
        { dienst_id: 3, platz: 1, status: "eingeteilt", familie: "Kind A", eigene: true, kann_uebernehmen: false },
        { dienst_id: 4, platz: 2, status: "eingeteilt", familie: "Kind C", eigene: false, kann_uebernehmen: false }] }],
    familien: [{ familie: "Kind A", eigene: true, grill: 1.5, tee: 0, aufbau: 0, abbau: 0, betreuung: 0 },
               { familie: "Kind B", eigene: false, grill: 0.5, tee: 0, aufbau: 0, abbau: 0, betreuung: 0 }] };
  const e = await h.starten({ start: "/eltern/index.html", breite: 360, hoehe: 900, warten: 1500, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), termine: [{ id: 60, grill_zeit: "", grill_beide: null }, { id: 61, grill_zeit: "", grill_beide: null }],
    rpc: { helfer_uebersicht: D, dienste_public: [], grill_wahl: { termin_id: 61, bleibt: 1, mit: 3, geteilt: true } }, funktionen: { "push-send": { ok: true, sent: 2 } } }) });
  const re = await e.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)), txt = el => el ? el.textContent.replace(/\s+/g, " ").trim() : "";
    for (let i = 0; i < 40 && typeof elternHelfenOpen !== "function"; i++) await w(100);
    window.frageJaNein = async () => true;
    const out = {
      dEigen: txt(Object.assign(document.createElement("div"), { innerHTML: ghDienstHtml({ termin_id: 99, dienst_id: 9, status: "eingeteilt", eigene: true, geteilt: true, plaetze: 1 }) })),
      dAndere: txt(Object.assign(document.createElement("div"), { innerHTML: ghDienstHtml({ termin_id: 99, dienst_id: 9, status: "eingeteilt", eigene: false, geteilt: true, plaetze: 1 }) }))
    };
    await elternHelfenOpen(); await w(300);
    const f = document.getElementById("helfen-fenster"), heim = f ? [...f.querySelectorAll(".hf-heim")] : [];
    out.geteilt = txt(heim[0]);
    out.ersatz = !!(heim[0] && heim[0].querySelector(".gh-ersatz"));
    out.chip = !!(heim[0] && heim[0].querySelector(".gh-geteilt-chip"));
    out.tabelle = [...(f ? f.querySelectorAll(".hf-tabelle tbody tr") : [])].map(tr => txt(tr.querySelector("td")));
    const wb = heim[1] && heim[1].querySelector(".gh-wahl"), kn = wb ? [...wb.querySelectorAll("button")] : [];
    out.knoepfe = kn.map(b => txt(b) + ":" + Math.round(b.getBoundingClientRect().height));
    out.rand = kn.some(b => b.getBoundingClientRect().right > window.innerWidth);
    const t = wb && wb.querySelector(".gh-wahl-teilen"); if (t) { t.click(); await w(500); }
    return out;
  }).catch(x => ({ fehler: String(x) }));
  const rpc = e.gesendet.filter(g => /rpc\/grill_wahl$/.test(g.pfad)).map(g => g.body);
  const pushE = e.gesendet.filter(g => /functions\/v1\/push-send$/.test(g.pfad)).map(g => g.body && g.body.art);
  const feE = e.fehler(); await e.schliessen();

  if (r.fehler) probleme.push("Trainer: " + r.fehler);
  else {
    if (JSON.stringify(r.halb) !== JSON.stringify(["0", "½", "1½", "2"])) probleme.push("a) ghHalb " + JSON.stringify(r.halb));
    if (r.optionen < 2 || !/Nicht geteilt/.test(r.erste)) probleme.push(`b) Auswahl „Geteilt mit“ fehlt (${r.optionen} Optionen, „${r.erste}“)`);
    if (patch[0] !== Number(r.wert) || patch[1] !== null) probleme.push("b) PATCH geteilt_kind " + JSON.stringify(patch));
    if (!/geteilt · je ½/.test(r.zeile)) probleme.push("b) Zeile ohne „geteilt · je ½“");
  }
  if (re.fehler) probleme.push("Eltern: " + re.fehler);
  else {
    if (!/Ihr teilt euch die Grillhütte/.test(re.dEigen) || !/Zwei Familien teilen sich/.test(re.dAndere)) probleme.push(`d) ghDienstHtml „${re.dEigen}“ / „${re.dAndere}“`);
    if (!/Familie Kind A & Familie Kind B/.test(re.geteilt) || !re.chip) probleme.push("c) geteilter Dienst „" + re.geteilt + "“");
    if (re.ersatz) probleme.push("c) „Ersatz suchen“ beim geteilten Dienst");
    if (JSON.stringify(re.tabelle) !== JSON.stringify(["1½", "½", "2"])) probleme.push("c) Tabelle " + JSON.stringify(re.tabelle));
    if (re.knoepfe.length !== 3 || !/^Wir teilen uns die Zeit/.test(re.knoepfe[2]) || re.knoepfe.some(k => Number(k.split(":")[1]) < 44)) probleme.push("c) Knöpfe " + JSON.stringify(re.knoepfe));
    if (re.rand) probleme.push("c) Knöpfe ragen über den Rand");
    if (rpc.length !== 1 || rpc[0].p_id !== 3 || rpc[0].p_teilen !== true || rpc[0].p_uebernehmen !== false) probleme.push("c) grill_wahl " + JSON.stringify(rpc));
    if (!pushE.includes("grill_wahl_fertig")) probleme.push("c) kein Push grill_wahl_fertig");
  }
  const mig = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20261123_v956_grill_teilen.sql"), "utf8");
  if (!/add column if not exists geteilt_kind bigint references public\.kader\(id\) on delete set null/.test(mig)) probleme.push("e) Spalte geteilt_kind fehlt");
  if (!/function public\.dienst_anteil\(p_kind bigint, p_dienst text, p_ab text\)/.test(mig) || !/then 1\.0 else 0\.5/.test(mig)) probleme.push("e) dienst_anteil fehlt");
  if (!/public\.dienst_anteil\(k2\.id, p_dienst/.test(mig) || !/public\.rufe_familie\(d\.geteilt_kind\)=public\.rufe_familie\(ka\.id\)/.test(mig)) probleme.push("e) dienst_einteilen nicht nach Anteil oder zweite Familie nicht ausgeschlossen");
  if (!/function public\.grill_wahl\(p_id bigint, p_uebernehmen boolean, p_teilen boolean default false\)/.test(mig) || !/drop function if exists public\.grill_wahl\(bigint, boolean\)/.test(mig)) probleme.push("e) grill_wahl mit p_teilen fehlt");
  const ps = fs.readFileSync(path.join(h.REPO, "supabase/functions/push-send/index.ts"), "utf8");
  if ((ps.match(/kind_id,status,uebernommen_kind,geteilt_kind/g) || []).length !== 3 || !/if \(w\.geteilt\)/.test(ps)) probleme.push("e) push-send kennt die zweite Familie nicht");
  const fe = feT.concat(feE).filter(x => !/Failed to load resource/.test(x)); if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`a) ${(r.halb || []).join(" ")} · b) ${r.optionen} Optionen, PATCH ${JSON.stringify(patch)}`);
  zeilen.push(`c) „${String(re.geteilt || "").slice(0, 45)}…“ · Tabelle ${(re.tabelle || []).join("/")} · ${(re.knoepfe || []).join(" | ")} · grill_wahl ${rpc.length}×`);
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
