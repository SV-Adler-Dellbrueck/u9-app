/* v951 · Charles 22.11.: „Die Grillhütte planen wir schon für die ganze Saison durch unter den Eltern. … Genaue Uhrzeiten sind
   ebenfalls nicht klar. Und die finale Uhrzeit und ob beide Eltern vor Ort helfen müssen erhalten wir erst einen Tag vorher.“
   a) ghZeitHtml: ohne Eintrag „Uhrzeit folgt am Vortag“ und „erfahrt ihr am Vortag“; mit Zeit „Grillhütte 11:15–12:30 Uhr“;
      beide ja → „bitte beide Elternteile vor Ort“, nein → „ein Elternteil genügt“.
   b) Trainer-Fenster: je Heimtermin Feld „Grillzeit“ und Auswahl „Beide Elternteile vor Ort?“ (≥ 44 px, bei 360 px nichts über dem Rand), Knopf mit
      „& Familien informieren“, wenn schon eine Familie eingeteilt ist.
   c) Speichern: PATCH termine mit grill_zeit und grill_beide, danach push-send mit art „grill_zeit“; ohne eingeteilte
      Familie kein Push.
   d) Migration: Spalten grill_zeit und grill_beide; push-send kennt art „grill_zeit“. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v951 Grillhütte: Uhrzeit und „beide Elternteile“ je Termin, Push an die eingeteilten Familien";
  const probleme = [], zeilen = [];
  const T = [{ id: 60, datum: h.tagePlus(6), uhrzeit: "10:15", titel: "Kinderfestival · Heim", typ: "turnier", heim: true, grill_plaetze: 1, grill_zeit: null, grill_beide: null },
    { id: 61, datum: h.tagePlus(40), uhrzeit: "10:15", titel: "Kinderfestival · Heim", typ: "turnier", heim: true, grill_plaetze: 1, grill_zeit: null, grill_beide: null }];
  const s = await h.starten({ breite: 360, hoehe: 1400, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ name: "Charles", rolle: "trainer" }],
    termine: () => T, dienst_einteilung: [{ id: 1, termin_id: 60, kind_id: 1, platz: 1, status: "eingeteilt" }], team_config: [{ dienst_plaetze: 1 }],
    dienst_sperre: [], dienst_befreit: [], rpc: { dienst_einteilen: 0 }, funktionen: { "push-send": { familien: 1 } } }) });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)), txt = el => el ? el.textContent.replace(/\s+/g, " ").trim() : "";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    document.getElementById("pin-gate")?.remove();
    for (let i = 0; i < 40 && typeof ghZeitHtml !== "function"; i++) await w(100);
    const out = {}, d = document.createElement("div"), html = t => { d.innerHTML = ghZeitHtml(t); return txt(d); };
    out.leer = html({ grill_zeit: null, grill_beide: null });
    out.ja = html({ grill_zeit: "11:15–12:30", grill_beide: true });
    out.nein = html({ grill_zeit: "", grill_beide: false });
    await loadKader();
    let box = document.getElementById("gh-tr-inhalt"); if (!box) { box = document.createElement("div"); box.id = "gh-tr-inhalt"; document.body.prepend(box); }
    await ghTrainerDaten(); grillTrainerRender();
    const z60 = document.getElementById("gh-zeit-60"), b60 = document.getElementById("gh-beide-60");
    out.felder = !!z60 && !!b60 && !!document.getElementById("gh-zeit-61");
    out.hoehe = [z60, b60].map(x => x ? Math.round(x.getBoundingClientRect().height) : 0);
    out.rand = [...box.querySelectorAll(".gh-zeit-form select,.gh-zeit-speichern")].some(x => x.getBoundingClientRect().right > box.getBoundingClientRect().right + 1);
    const kn = [...box.querySelectorAll(".gh-zeit-speichern")].map(txt); out.knoepfe = kn;
    z60.value = "11:15–12:30"; b60.value = "ja"; await grillZeitSpeichern(60); await w(200);
    out.danach = txt(document.querySelector("#gh-t-60 .gh-zeit"));
    document.getElementById("gh-zeit-61").value = "12:00"; await grillZeitSpeichern(61); await w(200);
    out.quer = document.documentElement.scrollWidth > window.innerWidth + 1;
    return out;
  }).catch(x => ({ fehler: String(x) }));
  const patch = s.gesendet.filter(g => /\/rest\/v1\/termine$/.test(g.pfad) && g.methode === "PATCH");
  const push = s.gesendet.filter(g => /functions\/v1\/push-send$/.test(g.pfad));
  const fe = s.fehler(); await s.schliessen();
  if (r.fehler) probleme.push(r.fehler);
  else {
    if (!/Uhrzeit folgt am Vortag/.test(r.leer) || !/erfahrt ihr am Vortag/.test(r.leer)) probleme.push("a) leer „" + r.leer + "“");
    if (!/Grillhütte 11:15–12:30 Uhr/.test(r.ja) || !/bitte beide Elternteile vor Ort/.test(r.ja)) probleme.push("a) ja „" + r.ja + "“");
    if (!/Uhrzeit folgt am Vortag/.test(r.nein) || !/ein Elternteil genügt/.test(r.nein)) probleme.push("a) nein „" + r.nein + "“");
    if (!r.felder) probleme.push("b) Felder fehlen");
    if (r.hoehe.some(x => x < 44)) probleme.push("b) Feldhöhe " + r.hoehe.join("/"));
    if (!/Familien informieren/.test(r.knoepfe[0] || "") || /Familien informieren/.test(r.knoepfe[1] || "")) probleme.push("b) Knöpfe " + JSON.stringify(r.knoepfe));
    const p60 = patch.find(p => /id=eq\.60/.test(p.suche)), p61 = patch.find(p => /id=eq\.61/.test(p.suche));
    if (!p60 || p60.body.grill_zeit !== "11:15–12:30" || p60.body.grill_beide !== true) probleme.push("c) PATCH 60 " + JSON.stringify(p60 && p60.body));
    if (!p61 || p61.body.grill_zeit !== "12:00" || p61.body.grill_beide !== null) probleme.push("c) PATCH 61 " + JSON.stringify(p61 && p61.body));
    if (push.length !== 1 || push[0].body.art !== "grill_zeit" || push[0].body.termin_id !== 60) probleme.push("c) Push " + JSON.stringify(push.map(p => p.body)));
    if (!/Grillhütte 11:15–12:30 Uhr/.test(r.danach)) probleme.push("c) nach dem Speichern „" + r.danach + "“");
    if (r.quer || r.rand) probleme.push(`ragt über den Rand: Seite ${r.quer}, Formular ${r.rand}`);
  }
  const mig = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20261122_v951_grillhuette_saison.sql"), "utf8");
  if (!/grill_zeit text/.test(mig) || !/grill_beide boolean/.test(mig)) probleme.push("d) Spalten fehlen in der Migration");
  const ps = fs.readFileSync(path.join(h.REPO, "supabase/functions/push-send/index.ts"), "utf8");
  if (!/body\.art === "grill_zeit"/.test(ps)) probleme.push("d) push-send kennt grill_zeit nicht");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`a) „${String(r.leer || "").slice(0, 70)}“ · „${String(r.ja || "").slice(0, 60)}“`);
  zeilen.push(`b) Felder ${(r.hoehe || []).join("/")} px · c) PATCH ${patch.length}×, Push ${push.length}× (nur mit Familie) · d) Migration und push-send`);
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
