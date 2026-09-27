/* v646 · Grillhüttendienst – doku/auftrag-grillhuette/ (Paket 22.09. + Nachtrag 27.09., Vorrang).
   Am DOM geprüft, was die Oberfläche zusagt; die Rechte und die Reihenfolge der Einteilung
   (Kriterien 1–3, 5, 6, 9–11) sind am 27.09. direkt in der Datenbank mit Probedaten gefahren
   (Rollback) und im PR belegt – die Attrappe hier würde jede Regel bestätigen.

   a) Startseite (Kriterium 4): eigener Dienst innerhalb von 14 Tagen mit „Ersatz suchen“,
      ein fremder freigegebener Dienst mit „Übernehmen“; eigener Dienst in 30 Tagen und fremde
      besetzte Dienste stehen dort nicht. Status als Chip mit Text (Kriterium 12).
   b) „Ersatz suchen“ fragt im eigenen Fenster (kein Systemdialog) und schickt dienst_freigeben;
      Rückmeldung „Ersatz wird gesucht“. „Übernehmen“ schickt dienst_uebernehmen; „Übernommen“.
   c) Knöpfe heißen genau „Ersatz suchen“ und „Übernehmen“ und sind ≥ 48 px hoch.
   d) Kein Kindername in der Eltern-Anzeige (Kriterium 10).
   e) Termin-Fenster: der Dienst steht dort mit Chip.
   f) Trainer: „Grillhütte einteilen“ ruft dienst_einteilen; „Umbuchen“ schreibt kind_id mit
      status eingeteilt (Kriterium 7). Keine Markierung „sieben Tage vorher“ (Nachtrag).
   g) Der Büdchen-Dienst ist abgelöst: kein Aufruf von buedchen_plan/buedchen_optout mehr. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const R = h.REPO;
  const dienste = [
    { termin_id: 1, datum: h.tagePlus(5), uhrzeit: "10:00", gegner: "Gastverein A", dienst_id: 11, status: "eingeteilt", name: null, eigene: true, kann_uebernehmen: false },
    { termin_id: 2, datum: h.tagePlus(9), uhrzeit: "11:00", gegner: "Gastverein B", dienst_id: 12, status: "freigegeben", name: null, eigene: false, kann_uebernehmen: true },
    { termin_id: 3, datum: h.tagePlus(30), uhrzeit: "10:00", gegner: "Gastverein C", dienst_id: 13, status: "eingeteilt", name: null, eigene: true, kann_uebernehmen: false },
    { termin_id: 4, datum: h.tagePlus(12), uhrzeit: "10:00", gegner: "Gastverein D", dienst_id: 14, status: "eingeteilt", name: null, eigene: false, kann_uebernehmen: false }
  ];
  const s = await h.starten({ start: "/eltern/index.html", warten: 900, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    rpc: { dienste_public: dienste, dienst_freigeben: true, dienst_uebernehmen: true }
  }) });
  await s.page.evaluate(() => {
    window.sbToken = () => "a.eyJzdWIiOiJlbHRlcm4tdWlkIiwiZW1haWwiOiJlQGUuZGUifQ.b";
    window.sbAuthHeaders = x => ({ ...(x || {}), "Content-Type": "application/json" });
    window._sys = 0; window.confirm = () => { window._sys++; return true; };
    window._toasts = []; const alt = window.toast; window.toast = (m, a) => { window._toasts.push(m); if (alt) try { alt(m, a); } catch (e) {} };
    if (!document.getElementById("buedchen-slot")) { const d = document.createElement("div"); d.id = "buedchen-slot"; document.body.appendChild(d); }
  });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    if (typeof elternBuedchenLoad !== "function" || typeof ghErsatzSuchen !== "function") return { fehlt: true };
    await elternBuedchenLoad();
    const slot = document.getElementById("buedchen-slot");
    const out = { text: slot.textContent.replace(/\s+/g, " "), karten: slot.querySelectorAll(".gh-karte").length, chips: [...slot.querySelectorAll(".gh-chip")].map(c => c.textContent) };
    const ersatz = slot.querySelector(".gh-ersatz"), ueb = slot.querySelector(".gh-uebernehmen");
    out.ersatz = ersatz ? [ersatz.textContent.trim(), Math.round(ersatz.getBoundingClientRect().height)] : null;
    out.ueb = ueb ? [ueb.textContent.trim(), Math.round(ueb.getBoundingClientRect().height)] : null;
    const klick = async (knopf, ja) => { knopf.click(); await w(60); const f = document.getElementById("frage-modal"); const b = f && [...f.querySelectorAll("button")].find(x => x.textContent.trim() === ja); if (b) b.click(); await w(120); return !!f; };
    out.frageErsatz = ersatz ? await klick(ersatz, "Ersatz suchen") : false;
    const ueb2 = document.querySelector("#buedchen-slot .gh-uebernehmen");
    out.frageUeb = ueb2 ? await klick(ueb2, "Übernehmen") : false;
    out.toasts = window._toasts.slice(); out.sys = window._sys;
    // e) Termin-Fenster
    const box = document.createElement("div"); box.id = "td-buedchen"; document.body.appendChild(box);
    await tdBuedchenLoad({ id: 2 });
    out.termin = box.textContent.replace(/\s+/g, " ");
    return out;
  });
  const gesendet = s.gesendet.filter(x => /\/rpc\/dienst_/.test(x.pfad)).map(x => x.pfad.split("/").pop() + ":" + JSON.stringify(x.body));
  const fe = s.fehler();
  await s.schliessen();
  if (r.fehlt) return h.ergebnis("v646 Grillhütte", false, ["Funktionen fehlen"]);

  if (r.karten !== 2 || !/Gastverein A/.test(r.text) || !/Gastverein B/.test(r.text) || /Gastverein C|Gastverein D/.test(r.text)) probleme.push(`a) Startseite zeigt ${r.karten} Karten: ${r.text.slice(0, 200)}`);
  if (!r.chips.includes("eingeteilt") || !r.chips.includes("Ersatz gesucht")) probleme.push(`a) Status-Chips: ${JSON.stringify(r.chips)}`);
  if (!r.ersatz || r.ersatz[0] !== "Ersatz suchen" || r.ersatz[1] < 48) probleme.push(`c) Knopf Ersatz suchen: ${JSON.stringify(r.ersatz)}`);
  if (!r.ueb || r.ueb[0] !== "Übernehmen" || r.ueb[1] < 48) probleme.push(`c) Knopf Übernehmen: ${JSON.stringify(r.ueb)}`);
  if (!r.frageErsatz || !r.frageUeb || r.sys) probleme.push(`b) Rückfragen: eigenes Fenster ${r.frageErsatz}/${r.frageUeb}, Systemdialoge ${r.sys}`);
  if (!gesendet.includes('dienst_freigeben:{"p_id":11}') || !gesendet.includes('dienst_uebernehmen:{"p_id":12}')) probleme.push(`b) gesendet: ${JSON.stringify(gesendet)}`);
  if (!r.toasts.includes("Ersatz wird gesucht") || !r.toasts.includes("Übernommen")) probleme.push(`b) Rückmeldungen: ${JSON.stringify(r.toasts)}`);
  if (/Kind [A-Z]/.test(r.text + r.termin)) probleme.push("d) Kindername in der Eltern-Anzeige");
  if (!/Grillhütte/.test(r.termin) || !/Ersatz gesucht/.test(r.termin)) probleme.push(`e) Termin-Fenster: ${r.termin.slice(0, 160)}`);

  // f) Trainer
  const t = await h.starten({ warten: 1200, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    termine: [{ id: 1, datum: h.tagePlus(5), uhrzeit: "10:00", gegner: "Gastverein A", typ: "spiel", heim: true }, { id: 2, datum: h.tagePlus(9), gegner: "Gastverein B", typ: "spiel", heim: true }],
    dienst_einteilung: [{ id: 11, termin_id: 1, kind_id: 1, status: "freigegeben", uebernommen_von: null }],
    profiles: [],
    rpc: { dienst_einteilen: 1 }
  }) });
  const rt = await t.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    document.getElementById("pin-gate")?.remove();
    if (typeof grillTrainerOpen !== "function") return { fehlt: true };
    await grillTrainerOpen(); await w(100);
    const m = document.getElementById("gh-tr-modal");
    const out = { text: m ? m.textContent.replace(/\s+/g, " ") : "", dialog: m && m.getAttribute("role") };
    const k = document.getElementById("gh-einteilen"); out.einteilen = k ? k.textContent.trim() : ""; if (k) k.click(); await w(150);
    const sel = document.querySelector("#gh-tr-modal select");
    if (sel) { sel.value = sel.options[2].value; sel.dispatchEvent(new Event("change")); }
    await w(150);
    return out;
  });
  const tg = t.gesendet.filter(x => /dienst_einteil/.test(x.pfad)).map(x => x.methode + " " + x.pfad.split("/").pop() + (x.suche || "") + " " + JSON.stringify(x.body));
  const tfe = t.fehler();
  await t.schliessen();
  if (rt.fehlt) probleme.push("f) grillTrainerOpen fehlt im Trainerbereich");
  else {
    if (rt.dialog !== "dialog" || !/Grillhütte einteilen/.test(rt.einteilen)) probleme.push(`f) Trainer-Fenster: ${rt.dialog} / ${rt.einteilen}`);
    if (!tg.some(x => /^POST dienst_einteilen/.test(x))) probleme.push(`f) Einteilen nicht gesendet: ${JSON.stringify(tg)}`);
    if (!tg.some(x => /^PATCH dienst_einteilung\?id=eq\.11 .*"status":"eingeteilt"/.test(x) && /"kind_id":\d+/.test(x) && /"uebernommen_von":null/.test(x))) probleme.push(`f) Umbuchen: ${JSON.stringify(tg)}`);
    if (/sieben Tage|7 Tage|teilt .* von Hand/i.test(rt.text)) probleme.push("f) Rückfall-Hinweis im Trainerbereich (laut Nachtrag entfallen)");
  }
  // g)
  const code = ["md-kasse.js", "md-eltern-portal.js", "md-gegner.js"].map(f => fs.readFileSync(path.join(R, f), "utf8")).join("\n");
  if (/rpc\/buedchen_(plan|optout)/.test(code)) probleme.push("g) Büdchen-Dienst wird noch aufgerufen");
  if (fe.length || tfe.length) probleme.push("Konsole: " + fe.concat(tfe).slice(0, 2).join(" | "));
  zeilen.push(`Startseite ${r.karten} Karten · Knöpfe ${r.ersatz && r.ersatz[1]}/${r.ueb && r.ueb[1]} px · ${gesendet.join(", ")} · Trainer: ${tg.length} Schreibzugriffe`);
  return h.ergebnis("v646 Grillhütte: einteilen, Ersatz suchen, übernehmen", !probleme.length, probleme.concat(zeilen));
};
