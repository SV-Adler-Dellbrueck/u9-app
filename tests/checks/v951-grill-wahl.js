/* v951 · Charles 22.11.: „Es werden immer zwei Familien fest eingeplant. Falls nur 1 benötigt werden sollte, wird das von den
   Trainern geändert und die beiden Familien können dann wählen, wer übernimmt … Sollten die beiden Familien sich bis 1 Stunde
   vorher nicht über die App einigen, wählt die App automatisch.“ (Auto-Wahl: wer seltener dran war; Frist vor der Grillzeit)
   a) ghFrist: 1 Stunde vor der Grillzeit, ohne Grillzeit vor dem Termin, ohne beides vor 10:00.
   b) Trainer stellt bei zwei eingeteilten Familien auf 1 um: niemand wird ausgetragen (kein DELETE), grill_plaetze 1,
      Push art „grill_wahl“; im Fenster stehen weiter beide Familien und „Die beiden Familien wählen“.
   c) Eltern (Grillhütte & Helfen): bei der eigenen Familie „Nur eine Familie wird gebraucht“ mit „Wir übernehmen“ und
      „Wir geben ab“ (seit v956 dazu „Wir teilen uns die Zeit“; ≥ 44 px, 360 px ohne Überstand), kein „Ersatz suchen“; „Wir übernehmen“ ruft grill_wahl
      (p_uebernehmen true) und danach push-send „grill_wahl_fertig“.
   d) Migration: grill_wahl, grill_wahl_auto (nur service_role, Reihenfolge freigegeben → seltener dran → Platz), Frist
      1 Stunde, Job alle 10 Minuten ohne Schlüssel im Repo; push-send prüft das Cron-Geheimnis vor der Anmeldung. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v951 Grillhütte: nur eine Familie gebraucht – die beiden wählen selbst, sonst wählt die App";
  const probleme = [], zeilen = [];
  const tag = h.tagePlus(6);
  // Trainer
  const T = [{ id: 60, datum: tag, uhrzeit: "10:15", titel: "Kinderfestival · Heim", typ: "turnier", heim: true, grill_plaetze: 2, grill_zeit: "11:15–12:30", grill_beide: null }];
  const s = await h.starten({ breite: 360, hoehe: 1400, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ name: "Charles", rolle: "trainer" }],
    termine: () => T, dienst_einteilung: [{ id: 1, termin_id: 60, kind_id: 1, platz: 1, status: "eingeteilt" }, { id: 2, termin_id: 60, kind_id: 2, platz: 2, status: "eingeteilt" }],
    team_config: [{ dienst_plaetze: 2 }], dienst_sperre: [], dienst_befreit: [], rpc: { dienst_einteilen: 0 }, funktionen: { "push-send": { familien: 2 } } }) });
  const r = await s.page.evaluate(async (tag) => {
    const w = ms => new Promise(x => setTimeout(x, ms)), txt = el => el ? el.textContent.replace(/\s+/g, " ").trim() : "";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    document.getElementById("pin-gate")?.remove();
    for (let i = 0; i < 40 && typeof ghFrist !== "function"; i++) await w(100);
    const hm = d => String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    const out = { frist: [hm(ghFrist(tag, "10:15", "11:15–12:30")), hm(ghFrist(tag, "10:15:00", "")), hm(ghFrist(tag, null, null))] };
    window.frageJaNein = async () => true;
    await loadKader();
    let box = document.getElementById("gh-tr-inhalt"); if (!box) { box = document.createElement("div"); box.id = "gh-tr-inhalt"; document.body.prepend(box); }
    await ghTrainerDaten(); grillTrainerRender();
    _ghTr.termine[0].grill_plaetze = 2;
    await grillPlaetzeSetzen(60, 1); await w(200);
    _ghTr.termine[0].grill_plaetze = 1; grillTrainerRender();
    const z = document.getElementById("gh-t-60");
    out.trainer = txt(z && z.querySelector(".gh-wahl-trainer"));
    out.familien = (txt(z).match(/Familie \d/g) || []).length;
    return out;
  }, tag).catch(x => ({ fehler: String(x) }));
  const del = s.gesendet.filter(g => g.methode === "DELETE");
  const patch = s.gesendet.filter(g => /\/rest\/v1\/termine$/.test(g.pfad) && g.methode === "PATCH");
  const pushT = s.gesendet.filter(g => /functions\/v1\/push-send$/.test(g.pfad)).map(g => g.body && g.body.art);
  const feT = s.fehler(); await s.schliessen();
  // Eltern
  const D = { saison_ab: "2026-07-01", heimspiele: [{ termin_id: 60, datum: tag, uhrzeit: "10:15:00", gegner: "Kinderfestival", plaetze: 1, dienste: [
      { dienst_id: 1, platz: 1, status: "eingeteilt", familie: "Kind A", eigene: true, kann_uebernehmen: false },
      { dienst_id: 2, platz: 2, status: "eingeteilt", familie: "Kind B", eigene: false, kann_uebernehmen: false }] }],
    familien: [{ familie: "Kind A", eigene: true, grill: 0, tee: 0, aufbau: 0, abbau: 0, betreuung: 0 }] };
  const e = await h.starten({ start: "/eltern/index.html", breite: 360, hoehe: 900, warten: 1500, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), termine: [{ id: 60, grill_zeit: "11:15–12:30", grill_beide: null }],
    rpc: { helfer_uebersicht: D, dienste_public: [], grill_wahl: { termin_id: 60, bleibt: 1, weg: 2 } }, funktionen: { "push-send": { ok: true, sent: 2 } } }) });
  const re = await e.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)), txt = el => el ? el.textContent.replace(/\s+/g, " ").trim() : "";
    for (let i = 0; i < 40 && typeof elternHelfenOpen !== "function"; i++) await w(100);
    window.frageJaNein = async () => true;
    await elternHelfenOpen(); await w(300);
    const f = document.getElementById("helfen-fenster"), wb = f && f.querySelector(".gh-wahl");
    const out = { text: txt(wb), ersatz: !!(f && f.querySelector(".gh-ersatz")) };
    const kn = wb ? [...wb.querySelectorAll("button")] : [];
    out.knoepfe = kn.map(b => txt(b) + ":" + Math.round(b.getBoundingClientRect().height));
    out.rand = kn.some(b => b.getBoundingClientRect().right > window.innerWidth);
    const ja = wb && wb.querySelector(".gh-wahl-ja"); if (ja) { ja.click(); await w(500); }
    return out;
  }).catch(x => ({ fehler: String(x) }));
  const rpc = e.gesendet.filter(g => /rpc\/grill_wahl$/.test(g.pfad));
  const pushE = e.gesendet.filter(g => /functions\/v1\/push-send$/.test(g.pfad)).map(g => g.body && g.body.art);
  const feE = e.fehler(); await e.schliessen();

  if (r.fehler) probleme.push("Trainer: " + r.fehler);
  else {
    if (JSON.stringify(r.frist) !== JSON.stringify(["10:15", "09:15", "09:00"])) probleme.push("a) Frist " + JSON.stringify(r.frist));
    if (del.length) probleme.push("b) trotz Wahl ausgetragen (DELETE)");
    if (!patch.some(p => p.body && p.body.grill_plaetze === 1)) probleme.push("b) grill_plaetze 1 nicht gespeichert");
    if (!pushT.includes("grill_wahl")) probleme.push("b) kein Push grill_wahl: " + JSON.stringify(pushT));
    if (!/Die beiden Familien wählen/.test(r.trainer) || r.familien < 2) probleme.push(`b) Trainerfenster „${r.trainer}“, ${r.familien} Familien`);
  }
  if (re.fehler) probleme.push("Eltern: " + re.fehler);
  else {
    if (!/Nur eine Familie wird gebraucht/.test(re.text) || !/sonst wählt die App/.test(re.text)) probleme.push("c) Hinweis „" + re.text + "“");
    if (re.knoepfe.length !== 3 || !/^Wir übernehmen/.test(re.knoepfe[0]) || !/^Wir geben ab/.test(re.knoepfe[1]) || re.knoepfe.some(k => Number(k.split(":")[1]) < 44)) probleme.push("c) Knöpfe " + JSON.stringify(re.knoepfe));
    if (re.rand) probleme.push("c) Knöpfe ragen über den Rand");
    if (re.ersatz) probleme.push("c) „Ersatz suchen“ trotz offener Wahl");
    if (rpc.length !== 1 || rpc[0].body.p_id !== 1 || rpc[0].body.p_uebernehmen !== true) probleme.push("c) grill_wahl " + JSON.stringify(rpc.map(x => x.body)));
    if (!pushE.includes("grill_wahl_fertig")) probleme.push("c) kein Push grill_wahl_fertig");
  }
  const mig = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20261122_v951_grill_wahl.sql"), "utf8");
  if (!/function public\.grill_wahl\(p_id bigint, p_uebernehmen boolean\)/.test(mig) || !/function public\.grill_wahl_auto\(\)/.test(mig)) probleme.push("d) Funktionen fehlen");
  if (!/order by \(x\.status = 'freigegeben'\)/.test(mig) || !/interval '1 hour'/.test(mig)) probleme.push("d) Auto-Wahl-Reihenfolge oder Frist fehlt");
  if (!/grant execute on function public\.grill_wahl_auto\(\) to service_role/.test(mig) || /grill_wahl_auto\(\) to authenticated/.test(mig)) probleme.push("d) grill_wahl_auto nicht auf service_role beschränkt");
  if (!/'\*\/10 \* \* \* \*'/.test(mig) || /sb_publishable|eyJ/.test(mig)) probleme.push("d) Job fehlt oder Schlüssel im Repo");
  const ps = fs.readFileSync(path.join(h.REPO, "supabase/functions/push-send/index.ts"), "utf8");
  const iCron = ps.indexOf('req.headers.get("x-cron-secret")'), iAuth = ps.indexOf('auth erforderlich');
  if (iCron < 0 || iCron > iAuth || !/body\.art === "grill_wahl"/.test(ps) || !/body\.art === "grill_wahl_fertig"/.test(ps)) probleme.push("d) push-send: Cron-Zweig oder Wahl-Meldungen fehlen");
  const fe = feT.concat(feE).filter(x => !/Failed to load resource/.test(x)); if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`a) Frist ${(r.frist || []).join(" / ")} · b) kein Austragen, Push ${pushT.join(",")}, ${r.familien} Familien sichtbar`);
  zeilen.push(`c) „${String(re.text || "").slice(0, 50)}…“ · ${(re.knoepfe || []).join(" | ")} · grill_wahl ${rpc.length}×, Push ${pushE.join(",")}`);
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
