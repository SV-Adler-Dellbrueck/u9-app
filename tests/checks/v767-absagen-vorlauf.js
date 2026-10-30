/* v767 · PO 30.10.: „Wo kann ich sehen, wann Eltern ein Training oder ein Spiel abgesagt haben? Zu wie viel Tagen oder
   Stunden wurde die Absage getätigt?“ Antwort: Reiter „🚫 Absagen“ im Rückmelde-Verhalten (Eltern & Kinder → Eltern verwalten).
   PO-Wahl: „Liste je Absage und zusätzlich Summe je Kind“.

   a) Der Reiter „Absagen“ steht neben Spieltage und Training; die Summe je Kind zählt Absagen, unter 24 Std. und unter 3 Std.
      und nennt den Ø Vorlauf; ohne Ampelfarben, nach Name sortiert
   b) Jede Absage steht einzeln: Termin, Kind, Zeitpunkt und Vorlauf in Tagen oder Stunden; ungenaue Zeitpunkte tragen „≈“
   c) Absage nach Beginn heißt „nach Beginn“; ohne Absagen steht ein ruhiger Satz; schlägt der Abruf fehl, nennt der Dialog die Migration
   d) Die Migration: nur Trainer (is_trainer), kein Zugriff für anon, Protokoll vor created_at, Trainer-Einträge ausgeschlossen;
      der Eltern-Bereich ruft sie nie auf */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const K = h.KINDER;
  const jetzt = Date.now(), vor = std => new Date(jetzt - std * 3600e3).toISOString();
  const absagen = [
    { spieler_id: 2, name: K[1], termin_id: 11, art: "training", datum: h.tagePlus(-2), titel: null, beginn: vor(48), abgesagt_am: vor(48 + 3), vorlauf_std: 3, genau: true },
    { spieler_id: 1, name: K[0], termin_id: 12, art: "spiel", datum: h.tagePlus(-5), titel: "Testspiel", beginn: vor(120), abgesagt_am: vor(120 + 100), vorlauf_std: 100, genau: true },
    { spieler_id: 1, name: K[0], termin_id: 13, art: "training", datum: h.tagePlus(-9), titel: null, beginn: vor(216), abgesagt_am: vor(216 + 0.5), vorlauf_std: 0.5, genau: false },
    { spieler_id: 2, name: K[1], termin_id: 14, art: "spiel", datum: h.tagePlus(-12), titel: "Festival", beginn: vor(288), abgesagt_am: vor(288 - 1), vorlauf_std: -1, genau: true }
  ];
  let modus = "mitDaten";
  const s = await h.starten({ warten: 1200, hoehe: 1400, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), termine: [], profiles: [],
    rpc: { rueckmelde_statistik: [], rueckmelde_absagen: () => modus === "leer" ? [] : modus === "fehler" ? { status: 404, body: JSON.stringify({ message: "function not found" }) } : absagen }
  }) });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    document.getElementById("pin-gate")?.remove();
    if (typeof rueckmeldeStatistikOpen !== "function" || typeof rueckmeldeAbsagenRender !== "function") return { fehlt: true };
    const out = {};
    await rueckmeldeStatistikOpen(); await w(150);
    const m = document.getElementById("rs-modal");
    out.reiter = [...m.querySelectorAll("#rs-art button")].map(b => b.textContent.trim());
    [...m.querySelectorAll("#rs-art button")].find(b => /Absagen/.test(b.textContent)).click(); await w(250);
    const tabellen = [...m.querySelectorAll("table")].map(t => ({ kopf: [...t.querySelectorAll("thead th")].map(x => x.textContent.trim()), zeilen: [...t.querySelectorAll("tbody tr")].map(tr => [...tr.children].map(td => td.textContent.replace(/\s+/g, " ").trim())) }));
    out.summe = tabellen[0]; out.einzeln = tabellen[1];
    out.farben = [...m.querySelectorAll("tbody td")].filter(td => /red|green|amber|#dc2626|#16a34a/.test(td.getAttribute("style") || "")).length;
    out.hinweis = /„≈“/.test(m.textContent);
    out.hoehe = Math.round(m.querySelector("#rs-art button").getBoundingClientRect().height);
    out.gedrueckt = [...m.querySelectorAll("#rs-art button")].map(b => b.getAttribute("aria-pressed")).join(",");
    return out;
  });
  if (r.fehlt) { await s.schliessen(); return h.ergebnis("v767 Absagen", false, ["rueckmeldeAbsagenRender fehlt"]); }
  // c) leer und Fehler
  modus = "leer";
  const leer = await s.page.evaluate(async () => { const w = ms => new Promise(x => setTimeout(x, ms)); window._rsAbsagen = null; await rueckmeldeAbsagenRender(); await w(200); return document.getElementById("rs-inhalt").textContent.trim(); });
  modus = "fehler";
  const fehler = await s.page.evaluate(async () => { const w = ms => new Promise(x => setTimeout(x, ms)); window._rsAbsagen = null; await rueckmeldeAbsagenRender(); await w(200); return document.getElementById("rs-inhalt").textContent.trim(); });
  const fe = s.fehler(); await s.schliessen();

  if (r.reiter.length !== 3 || !/Absagen/.test(r.reiter[2]) || r.hoehe < 36 || r.gedrueckt !== "false,false,true") probleme.push("a) Reiter: " + JSON.stringify({ reiter: r.reiter, hoehe: r.hoehe, gedrueckt: r.gedrueckt }));
  const sm = r.summe || { kopf: [], zeilen: [] };
  const z1 = sm.zeilen.find(z => z[0].replace(/ ›$/, "") === K[0]) || [], z2 = sm.zeilen.find(z => z[0].replace(/ ›$/, "") === K[1]) || [];
  // K[0]: 2 Absagen (100 Std., 0,5 Std.) · unter 24: 1 · unter 3: 1 · Ø 50,25 Std. = 2,1 Tage;  K[1]: 2 (3 Std., -1) · unter 24: 2 · unter 3: 1 · Ø 1,5 Std. → „2 Std.“
  if (sm.kopf.join("|") !== "Kind|Absagen|unter 24 Std.|unter 3 Std.|Ø Vorlauf" || sm.zeilen.length !== 2 || sm.zeilen[0][0].replace(/ ›$/, "") !== [K[0], K[1]].sort((a, b) => a.localeCompare(b, "de"))[0]
      || z1.slice(1).join("|") !== "2|1|1|2,1 Tage" || z2.slice(1).join("|") !== "2|2|1|2 Std." || r.farben) probleme.push("a) Summe je Kind: " + JSON.stringify({ sm, farben: r.farben }));
  zeilen.push(`a) Reiter „${r.reiter[2]}“; Summe je Kind: ${K[0]} ${z1.slice(1).join("/")} · ${K[1]} ${z2.slice(1).join("/")}`);
  const ez = (r.einzeln || { zeilen: [] }).zeilen;
  const ungef = ez.find(z => /Training/.test(z[0]) === false ? false : z[1] === K[0]) || [];
  if (!r.einzeln || r.einzeln.kopf.join("|") !== "Termin|Kind|Absage|Vorlauf" || ez.length !== 4
      || !ez.some(z => z[1] === K[1] && /^3 Std\. vorher$/.test(z[3]))
      || !ez.some(z => z[1] === K[0] && /Testspiel/.test(z[0]) && /^4,2 Tage vorher$/.test(z[3]))
      || !ez.some(z => z[1] === K[0] && /^≈ /.test(z[2]) && /^≈ (unter 1 Std\.|1 Std\.) vorher$/.test(z[3]))
      || !ez.some(z => z[3] === "nach Beginn") || !r.hinweis) probleme.push("b) Einzelne Absagen: " + JSON.stringify({ ez, hinweis: r.hinweis }));
  zeilen.push(`b) ${ez.length} Absagen einzeln: ${ez.map(z => z[3]).join(" · ")}`);
  if (!/noch niemand abgesagt/.test(leer) || !/Migration v767/.test(fehler)) probleme.push("c) leer/Fehler: " + JSON.stringify({ leer, fehler }));
  zeilen.push("c) „nach Beginn“, leer („noch niemand abgesagt“) und Fehler (nennt die Migration)");
  // d) Dateien
  const migDir = path.join(h.REPO, "supabase/migrations");
  const mig = fs.readdirSync(migDir).filter(n => /v767_rueckmelde_absagen/.test(n)).map(n => fs.readFileSync(path.join(migDir, n), "utf8")).join("\n");
  const eltern = fs.readFileSync(path.join(h.REPO, "md-eltern-portal.js"), "utf8");
  const md = /create or replace function public\.rueckmelde_absagen/.test(mig) && /where public\.is_trainer\(\)/.test(mig) && /revoke all on function public\.rueckmelde_absagen\(text\) from public, anon/.test(mig)
    && /coalesce\(l\.geaendert_am, rm\.created_at\)/.test(mig) && /coalesce\(l\.durch_trainer, false\) = false/.test(mig);
  if (!md || /rueckmelde_absagen/.test(eltern)) probleme.push("d) " + JSON.stringify({ migration: md, eltern: /rueckmelde_absagen/.test(eltern) }));
  zeilen.push("d) Migration: nur Trainer, kein anon, Protokoll vor erster Antwort, Trainer-Einträge ausgeschlossen; Eltern-Bereich ruft sie nie auf");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v767 Absagen: Zeitpunkt und Vorlauf je Absage", !probleme.length, probleme.length ? probleme : zeilen);
};
