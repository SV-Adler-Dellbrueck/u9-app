/* v910 · Grillhütte unter Orga, aus dem Termin erreichbar, Familien werden benachrichtigt (Charles 20.11.: „Die Grillhütte
   ist für morgen noch nicht eingeteilt. Wo mache ich das in der App? Und die Eltern, die es betrifft, sollten direkt
   informiert werden per Push und eine Nachricht auch parallel direkt anstoßbar sein, die dann in die Adler-Rufe geht.“
   – „unter Training ist das ja falsch aufgehangen, muss unter Orga sein“).

   a) Orga → Team-Orga hat die Kachel „Grillhütte“; unter Training → Termine steht keine Grillhütten-Kachel mehr.
   b) Die Zeile „🔥 Grillhütte“ im Termin ist ein Knopf; er öffnet die Einteilung und markiert genau diesen Termin.
   c) „Grillhütte einteilen“: danach geht je Termin EIN Push an push-send (art grill_dienst) – nur mit den frisch
      eingeteilten Familien, nicht mit der schon vorher eingeteilten.
   d) Umbuchen schickt den Push an die neue Familie.
   e) „Nachricht an die Familien“: Text vorbelegt mit Tag und „Ersatz suchen“, änderbar; Senden holt je Familie den
      privaten Raum (rpc rufe_privat_raum) und schreibt den geänderten Text als rufe_nachricht.
   f) push-send kennt grill_dienst: nur Trainer, Empfänger aus dienst_einteilung, fester Text, Ruhezeit (verteilen). */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v910 Grillhütte: unter Orga, aus dem Termin, Push und Adler-Rufe an die Familien";
  const probleme = [], zeilen = [];
  const shell = fs.readFileSync(path.join(h.REPO, "shell.html"), "utf8");
  if (/grillTrainerOpen/.test(shell)) probleme.push("a) shell.html (Training → Termine) ruft noch grillTrainerOpen");

  const tag = h.tagePlus(1);
  let einteilung = [{ id: 21, termin_id: 7, kind_id: 1, status: "eingeteilt", uebernommen_von: null, uebernommen_kind: null, platz: 1 }];
  const pushes = [], raeume = [], rufe = [];
  const t = await h.starten({ warten: 1200, hoehe: 1400, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), team_config: [{ id: 1, dienst_plaetze: 2 }], profiles: [], dienst_sperre: [], dienst_befreit: [],
    termine: [{ id: 7, datum: tag, uhrzeit: "10:15", gegner: "", titel: "Kinderfestival", typ: "turnier", heim: true }],
    dienst_einteilung: (u, req) => {
      if (req.method() === "PATCH" || req.method() === "POST") {
        let b = {}; try { b = JSON.parse(req.postData() || "{}"); } catch (e) {}
        if (req.method() === "POST") einteilung.push({ id: 30 + einteilung.length, uebernommen_von: null, uebernommen_kind: null, ...b });
        else { const id = Number((u.searchParams.get("id") || "").replace("eq.", "")); einteilung = einteilung.map(x => x.id === id ? { ...x, ...b } : x); }
        return { status: 204, body: "" };
      }
      return einteilung;
    },
    rpc: {
      dienst_einteilen: () => { einteilung.push({ id: 22, termin_id: 7, kind_id: 2, status: "eingeteilt", uebernommen_von: null, uebernommen_kind: null, platz: 2 }); return 1; },
      rufe_privat_raum: (u, req) => { const b = JSON.parse(req.postData() || "{}"); raeume.push(b.p_kind); return 900 + Number(b.p_kind); }
    },
    rufe_nachricht: (u, req) => { if (req.method() === "POST") { rufe.push(JSON.parse(req.postData() || "{}")); return { status: 201, body: "" }; } return []; },
    funktionen: { "push-send": (u, req) => { const b = JSON.parse(req.postData() || "{}"); pushes.push(b); return { ok: true, familien: (b.kind_ids || [1, 2]).length, sent: 1 }; } }
  }) });
  const r = await t.page.evaluate(async (tag) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    document.getElementById("pin-gate")?.remove();
    for (let i = 0; i < 50 && typeof grillTrainerOpen !== "function"; i++) await w(100);
    if (typeof grillTrainerOpen !== "function" || typeof grillRufOpen !== "function") return { fehlt: true };
    await loadKader();
    const out = {};
    // a) Orga-Kachel
    const orga = _kachelInhalt("orga");
    out.orga = /grillTrainerOpen/.test(orga) && /Grillhütte/.test(orga);
    // b) Zeile im Termin
    const slot = document.createElement("div"); slot.id = "bd-tm-7"; document.body.appendChild(slot);
    await buedchenTrainerFill({ id: 7, datum: tag });
    const knopf = slot.querySelector("button.gh-zeile");
    out.zeile = knopf ? { text: knopf.textContent.replace(/\s+/g, " "), hoch: Math.round(knopf.getBoundingClientRect().height) } : null;
    if (knopf) { knopf.click(); for (let i = 0; i < 30 && !document.querySelector("#gh-t-7"); i++) await w(100); await w(200); }
    out.ziel = !!document.querySelector("#gh-t-7.gh-ziel");
    // c) einteilen
    await grillEinteilen(); await w(300);
    // d) umbuchen Platz 2 auf Kind 3
    await grillUmbuchen(7, "3", 2); await w(300);
    // e) Nachricht
    grillRufOpen(7); await w(100);
    const ta = document.getElementById("gh-ruf-text");
    out.vorbelegt = ta ? ta.value : "";
    if (ta) ta.value = "Hallo – bitte um 9:30 Uhr am Grill sein. Danke!";
    await grillRufSenden(7); await w(300);
    out.rufModalZu = !document.getElementById("gh-ruf-modal");
    return out;
  }, tag);
  const fehler = t.fehler(); await t.schliessen();
  if (r.fehlt) return h.ergebnis(titel, false, ["grillTrainerOpen/grillRufOpen fehlt"]);
  if (!r.orga) probleme.push("a) Orga ohne Kachel „Grillhütte“");
  if (!r.zeile || !/Grillhütte/.test(r.zeile.text) || !/Ändern|Einteilen/.test(r.zeile.text) || r.zeile.hoch < 44) probleme.push(`b) Zeile im Termin: ${JSON.stringify(r.zeile)}`);
  if (!r.ziel) probleme.push("b) Termin im Fenster nicht markiert");
  const p1 = pushes[0], p2 = pushes[1];
  if (!p1 || p1.art !== "grill_dienst" || p1.termin_id !== 7 || JSON.stringify(p1.kind_ids) !== "[2]") probleme.push(`c) Push nach dem Einteilen: ${JSON.stringify(p1)}`);
  if (!p2 || p2.art !== "grill_dienst" || JSON.stringify(p2.kind_ids) !== "[3]") probleme.push(`d) Push nach dem Umbuchen: ${JSON.stringify(p2)}`);
  if (!/Grillhütte/.test(r.vorbelegt) || !/Ersatz suchen/.test(r.vorbelegt) || !/\d\d\.\d\d\./.test(r.vorbelegt)) probleme.push(`e) Vorbelegung: „${r.vorbelegt}“`);
  if (raeume.length !== 2 || rufe.length !== 2 || rufe.some(x => x.text !== "Hallo – bitte um 9:30 Uhr am Grill sein. Danke!" || !(x.raum_id >= 900))) probleme.push(`e) Räume ${JSON.stringify(raeume)}, Rufe ${JSON.stringify(rufe)}`);
  if (!r.rufModalZu) probleme.push("e) Fenster bleibt nach dem Senden offen");
  zeilen.push(`a) Orga-Kachel · b) „${r.zeile && r.zeile.text.slice(0, 60)}“ · c) Push an [2] · d) Push an [3] · e) ${rufe.length} Rufe in ${raeume.length} Familienräume`);

  const ps = fs.readFileSync(path.join(h.REPO, "supabase/functions/push-send/index.ts"), "utf8");
  const blk = (ps.split('body.art === "grill_dienst"')[1] || "").split("body.art ===")[0];
  if (!blk || !/prof\.role !== "trainer"/.test(blk) || !/dienst_einteilung/.test(blk) || !/verteilen\(/.test(blk) || !/Ersatz suchen/.test(blk)) probleme.push("f) push-send: grill_dienst fehlt oder ohne Trainerprüfung/Ruhezeit");
  if (fehler.length) probleme.push("Konsole: " + fehler.slice(0, 2).join(" | "));
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
