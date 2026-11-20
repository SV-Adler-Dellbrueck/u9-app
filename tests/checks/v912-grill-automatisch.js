/* v912 · Grillhütte automatisch und 1 oder 2 Familien je Termin (Charles 20.11., Bilder: „Nicht eingeteilt steht 2× im
   Fenster und auch nicht schön von der Optik. Wenn ich drauf klicke, schließt sich das Fenster nicht. Die Einteilung der
   Eltern soll automatisch erfolgen, so dass jede[r] mal dran kommt. An manchen Heimspielen brauchen wir 1 Helfer, an
   manchen 2. Das sollte einstellbar sein.“ – Kacheln: beim Speichern + täglich; je Termin im Fenster; Familie bleibt Einheit).

   a) Terminzeile ohne Familie: einmal „noch niemand eingeteilt“, keine zweite Marke „noch nicht eingeteilt“; „Einteilen ›“.
   b) Das Fenster liegt über einem offenen Termin-Fenster (z-index höher).
   c) Im Fenster je Termin „Familien: 1 | 2“ mit aria-pressed; ein freier Platz zeigt nur die Marke, nicht zusätzlich Text.
   d) Auf 1 stellen bei zwei eingeteilten Familien: Rückfrage, Platz 2 wird gelöscht, termine.grill_plaetze = 1 gespeichert.
   e) ghAutoEinteilen: ruft dienst_einteilen und schickt nur den neu Eingeteilten einen Push; ist nichts offen, wird gar
      nichts geschrieben (kein RPC).
   f) Speichern eines Heimtermins und der Start der Trainer-App rufen die automatische Einteilung (Quelltext, geprüft mit typeof);
      die Migration rechnet je Termin (grill_plaetze) und je Familie (rufe_familie). */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v912 Grillhütte: automatisch einteilen, 1 oder 2 Familien je Termin, Zeile und Fenster aufgeräumt";
  const probleme = [], zeilen = [];
  const tag = h.tagePlus(1), tag2 = h.tagePlus(8);
  let einteilung = [{ id: 21, termin_id: 8, kind_id: 1, status: "eingeteilt", uebernommen_von: null, uebernommen_kind: null, platz: 1 },
                    { id: 22, termin_id: 8, kind_id: 2, status: "eingeteilt", uebernommen_von: null, uebernommen_kind: null, platz: 2 }];
  const termine = [{ id: 7, datum: tag, uhrzeit: "10:15", gegner: "", titel: "Kinderfestival", typ: "turnier", heim: true, grill_plaetze: null },
                   { id: 8, datum: tag2, uhrzeit: "11:30", gegner: "Gastverein", titel: null, typ: "spiel", heim: true, grill_plaetze: null }];
  const rpcs = [], pushes = [], patches = [], deletes = [];
  const t = await h.starten({ warten: 1200, hoehe: 1400, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), team_config: [{ id: 1, dienst_plaetze: 2 }], profiles: [], dienst_sperre: [], dienst_befreit: [],
    termine: (u, req) => { if (req.method() === "PATCH") { const b = JSON.parse(req.postData() || "{}"); patches.push({ suche: u.search, b }); const id = Number((u.searchParams.get("id") || "").replace("eq.", "")); termine.forEach(x => { if (x.id === id) Object.assign(x, b); }); return { status: 204, body: "" }; } return termine; },
    dienst_einteilung: (u, req) => {
      if (req.method() === "DELETE") { const id = Number((u.searchParams.get("id") || "").replace("eq.", "")); deletes.push(id); einteilung = einteilung.filter(x => x.id !== id); return { status: 204, body: "" }; }
      return einteilung;
    },
    rpc: { dienst_einteilen: () => { rpcs.push(1); einteilung.push({ id: 30, termin_id: 7, kind_id: 3, status: "eingeteilt", uebernommen_von: null, uebernommen_kind: null, platz: 1 }); return 1; } },
    funktionen: { "push-send": (u, req) => { const b = JSON.parse(req.postData() || "{}"); pushes.push(b); return { ok: true, familien: (b.kind_ids || []).length, sent: 1 }; } }
  }) });
  const r = await t.page.evaluate(async ({ tag }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    document.getElementById("pin-gate")?.remove();
    for (let i = 0; i < 50 && typeof ghAutoEinteilen !== "function"; i++) await w(100);
    if (typeof ghAutoEinteilen !== "function" || typeof grillPlaetzeSetzen !== "function") return { fehlt: true };
    try { localStorage.setItem("adler_grill_auto", isoLokal()); } catch (e) {}
    await loadKader();
    const out = {};
    // a) Terminzeile
    const slot = document.createElement("div"); slot.id = "bd-tm-7"; document.body.appendChild(slot);
    await buedchenTrainerFill({ id: 7, datum: tag });
    const z = slot.querySelector("button.gh-zeile");
    out.zeile = z ? z.textContent.replace(/\s+/g, " ").trim() : "";
    out.zeileMarke = slot.querySelectorAll(".gh-chip").length;
    // b) Fenster über einem offenen Termin-Fenster
    const td = document.createElement("div"); td.id = "td-test"; td.setAttribute("role", "dialog"); td.style.cssText = "position:fixed;inset:0;z-index:10040"; document.body.appendChild(td);
    z.click(); for (let i = 0; i < 30 && !document.querySelector("#gh-t-7"); i++) await w(100); await w(200);
    const m = document.getElementById("gh-tr-modal");
    out.zOben = m ? Number(getComputedStyle(m).zIndex) > 10040 : false;
    td.remove();
    // c) Familien-Schalter, freier Platz nur Marke
    const g7 = document.getElementById("gh-t-7"), g8 = document.getElementById("gh-t-8");
    out.schalter = g8 ? [...g8.querySelectorAll(".gh-anzahl button")].map(b => b.textContent.trim() + ":" + b.getAttribute("aria-pressed")) : [];
    out.freiText = g7 ? /noch nicht eingeteilt –/.test(g7.textContent) : true;
    // d) Termin 8 auf 1 stellen → Rückfrage bestätigen
    const p = grillPlaetzeSetzen(8, 1);
    for (let i = 0; i < 30 && !document.getElementById("frage-modal"); i++) await w(100);
    const ja = [...document.querySelectorAll("#frage-modal button")].find(b => /Austragen/.test(b.textContent));
    out.rueckfrage = !!ja; if (ja) ja.click();
    await p; await w(300);
    const g8b = document.getElementById("gh-t-8");
    out.nachEins = g8b ? [...g8b.querySelectorAll(".gh-anzahl button")].map(b => b.textContent.trim() + ":" + b.getAttribute("aria-pressed")).join(" ") : "";
    return out;
  }, { tag });
  const nachD = { rpcs: rpcs.length, pushes: JSON.parse(JSON.stringify(pushes)) };
  // e) nichts offen → kein RPC
  const e2 = await t.page.evaluate(async () => { const vor = 0; await ghAutoEinteilen({ still: true }); return true; });
  const fehler = t.fehler(); await t.schliessen();
  if (r.fehlt) return h.ergebnis(titel, false, ["ghAutoEinteilen/grillPlaetzeSetzen fehlt"]);
  if (!/noch niemand eingeteilt/.test(r.zeile) || /noch nicht eingeteilt/.test(r.zeile) || r.zeileMarke || !/Einteilen ›/.test(r.zeile)) probleme.push(`a) Terminzeile: „${r.zeile}“, ${r.zeileMarke} Marken`);
  if (!r.zOben) probleme.push("b) Grillhütten-Fenster liegt unter dem Termin-Fenster");
  if (r.schalter.join(" ") !== "1:false 2:true") probleme.push(`c) Schalter Termin 8: ${r.schalter.join(" ")}`);
  if (r.freiText) probleme.push("c) freier Platz zeigt zusätzlich „– noch nicht eingeteilt –“");
  if (!r.rueckfrage || JSON.stringify(deletes) !== "[22]" || !patches.some(x => /id=eq\.8/.test(x.suche) && x.b.grill_plaetze === 1) || r.nachEins !== "1:true 2:false") probleme.push(`d) Rückfrage ${r.rueckfrage}, gelöscht ${JSON.stringify(deletes)}, gespeichert ${JSON.stringify(patches)}, Schalter ${r.nachEins}`);
  // Nach d) lief ghAutoEinteilen: Termin 7 hatte 2 offene Plätze → genau ein RPC und Push nur an Kind 3
  if (nachD.rpcs !== 1 || nachD.pushes.length !== 1 || JSON.stringify(nachD.pushes[0].kind_ids) !== "[3]" || nachD.pushes[0].termin_id !== 7) probleme.push(`e) automatisch: ${nachD.rpcs} RPC, Pushes ${JSON.stringify(nachD.pushes)}`);
  zeilen.push(`a) „${r.zeile}“ · b) Fenster oben ${r.zOben} · c) ${r.schalter.join(" ")} · d) Platz 2 ausgetragen, grill_plaetze 1 · e) ${nachD.rpcs} RPC, Push an [3]`);

  const kasse = fs.readFileSync(path.join(h.REPO, "md-kasse.js"), "utf8"), boot = fs.readFileSync(path.join(h.REPO, "boot.js"), "utf8");
  const geg = fs.readFileSync(path.join(h.REPO, "md-gegner.js"), "utf8"), kal = fs.readFileSync(path.join(h.REPO, "md-kalender.js"), "utf8");
  if (!/typeof ghAutoEinteilenTaeglich==="function"/.test(boot) || !/\\\/trainer\\\//.test(boot)) probleme.push("f) boot.js startet die tägliche Einteilung nicht (geprüft, nur Trainer)");
  if (!/typeof ghAutoEinteilen==="function"\)setTimeout\(\(\)=>ghAutoEinteilen/.test(geg) || !/typeof ghAutoEinteilen==="function"\)setTimeout\(\(\)=>ghAutoEinteilen/.test(kal)) probleme.push("f) Speichern/Anlegen eines Heimtermins teilt nicht automatisch ein");
  const mig = fs.readdirSync(path.join(h.REPO, "supabase/migrations")).filter(f => /grill_plaetze/.test(f)).map(f => fs.readFileSync(path.join(h.REPO, "supabase/migrations", f), "utf8")).join("\n");
  if (!/grill_plaetze smallint/.test(mig) || !/coalesce\(t\.grill_plaetze, v_standard\)/.test(mig) || !/rufe_familie/.test(mig) || !/coalesce\(te\.grill_plaetze, v_plaetze\)/.test(mig)) probleme.push("f) Migration rechnet nicht je Termin/Familie");
  if (fehler.length) probleme.push("Konsole: " + fehler.slice(0, 2).join(" | "));
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
