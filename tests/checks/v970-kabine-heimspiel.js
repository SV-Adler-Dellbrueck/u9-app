/* v970 · Kabine an Heimspielen (Charles 26.11.2026): „ein Infofeld für die Trainer, in welcher Kabine wir an Heimspielen sind.
   Heim 1, Heim 2, Gast 1, Gast 2.“ Beschluss: nur Trainer.
   a) Bearbeiten, Heimspiel: Auswahl „Kabine (nur für Trainer)“ mit „noch offen“ und den vier Kabinen; Speichern schickt kabine „heim2“
   b) Umschalten auf auswärts blendet das Feld aus; Speichern schickt kabine null; Training hat kein Feld
   c) Termin-Fenster (Am Platz und Verwalten) zeigt „🚪 Kabine: Heim 2“, auswärts nichts
   d) Eltern sehen die Kabine nicht (Termin-Fenster der Eltern)
   e) Migration legt termine.kabine mit Prüfregel an (heim1, heim2, gast1, gast2) */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const T = (id, typ, heim, kabine) => ({ id, datum: h.tagePlus(2), typ, heim, uhrzeit: "10:15", uhrzeit_ende: "11:30", titel: "Heimturnier", ort: "Sportplatz Beispiel", kabine });
  const heim = T(801, "turnier", true, "heim2"), aus = T(802, "turnier", false, "gast1"), tr = T(803, "training", null, null);
  const s = await h.starten({ warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: (u, req) => req.method() === "PATCH" ? { status: 204, body: "" } : [] }) });
  const r = await s.page.evaluate(async ({ heim, aus, tr }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 60 && typeof tmKabineHtml !== "function"; i++) await w(100);
    if (typeof tmKabineHtml !== "function") return { fehlt: true };
    const o = {}, sicht = el => !!el && el.offsetParent !== null && getComputedStyle(el).display !== "none";
    TM_TERMINE = [heim, aus, tr];
    const alt = window.fetch; let body = null;
    const fang = () => { body = null; window.fetch = (url, opt) => { if (/termine\?id=eq/.test(url) && opt && opt.method === "PATCH") { body = JSON.parse(opt.body); return Promise.resolve(new Response("", { status: 204 })); } return alt(url, opt); }; };
    // a)
    tmEdit(heim.id); await w(200);
    const sel = document.getElementById("te-kabine");
    o.a = { da: !!sel, sicht: sicht(document.getElementById("te-kabine-row")), opts: sel ? [...sel.options].map(x => x.textContent) : [], wert: sel ? sel.value : null, lbl: (document.getElementById("te-kabine-row") || {}).textContent || "", h: sel ? sel.getBoundingClientRect().height : 0 };
    fang(); await tmEditSave(heim.id); await w(150); window.fetch = alt; o.a.body = body;
    // b)
    tmEdit(heim.id); await w(200);
    tmEditHeim(false, heim.id); await w(50);
    o.b = { sicht: sicht(document.getElementById("te-kabine-row")) };
    fang(); await tmEditSave(heim.id); await w(150); window.fetch = alt; o.b.body = body;
    document.getElementById("tm-edit-modal")?.remove();
    tmEdit(tr.id); await w(200); o.b.training = !!document.getElementById("te-kabine"); document.getElementById("tm-edit-modal")?.remove();
    // c)
    heim.kabine = "heim2"; heim.heim = true;
    const fenster = async (id, modus) => { await tmDetailOpen(id, modus); await w(150); const m = document.getElementById("tmd-modal"); const t = m ? m.textContent.replace(/\s+/g, " ") : ""; m && m.remove(); return t; };
    o.c = { sport: await fenster(heim.id, "sport"), orga: await fenster(heim.id, "orga"), aus: await fenster(aus.id, "sport") };
    // d) Eltern-Fenster (Bausteine)
    o.d = typeof tdDetailOben === "function" ? (tdDetailOben(heim) + tdDetailUnten(heim)) : "";
    return o;
  }, { heim, aus, tr });
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) probleme.push("tmKabineHtml fehlt");
  else {
    if (!r.a.da || !r.a.sicht || r.a.opts.join("|") !== "noch offen|Heim 1|Heim 2|Gast 1|Gast 2" || r.a.wert !== "heim2" || !/nur für Trainer/.test(r.a.lbl) || r.a.h < 44 || !r.a.body || r.a.body.kabine !== "heim2")
      probleme.push("a) " + JSON.stringify(r.a).slice(0, 300));
    else zeilen.push(`a) Heimspiel: Auswahl „noch offen · Heim 1 · Heim 2 · Gast 1 · Gast 2“ (${Math.round(r.a.h)} px), Speichern schickt kabine „heim2“`);
    if (r.b.sicht || !r.b.body || r.b.body.kabine !== null || r.b.training) probleme.push("b) " + JSON.stringify(r.b));
    else zeilen.push("b) auswärts ausgeblendet und kabine null; Training ohne Feld");
    if (!/🚪 Kabine: Heim 2/.test(r.c.sport) || !/🚪 Kabine: Heim 2/.test(r.c.orga) || /Kabine:/.test(r.c.aus)) probleme.push("c) Fenster: " + JSON.stringify({ s: /Kabine: Heim 2/.test(r.c.sport), o: /Kabine: Heim 2/.test(r.c.orga), a: /Kabine:/.test(r.c.aus) }));
    else zeilen.push("c) Termin-Fenster (Am Platz und Verwalten): „🚪 Kabine: Heim 2“, auswärts nichts");
    if (/Kabine|Heim 2/.test(r.d)) probleme.push("d) Eltern sehen die Kabine");
    else zeilen.push("d) Eltern-Termin ohne Kabine");
  }
  const mig = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20261126_v970_termine_kabine.sql"), "utf8");
  if (!/add column if not exists kabine text/.test(mig) || !/kabine in \('heim1','heim2','gast1','gast2'\)/.test(mig)) probleme.push("e) Migration ohne Spalte oder Prüfregel");
  else zeilen.push("e) Migration: termine.kabine mit Prüfregel heim1/heim2/gast1/gast2");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v970 Kabine an Heimspielen (nur Trainer)", !probleme.length, zeilen.concat(probleme));
};
