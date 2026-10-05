/* v762 · Adler Nest: PDF für Eltern, wenn das Trainerteam es freigibt
   Charles 05.10.: erst nur Trainerbereich (v756), jetzt „alle Punkte“ – der Eltern-Knopf mit Freigabe je Ausgabe.
   a) Eltern-Leseansicht: Knopf „Als PDF speichern“ nur bei veröffentlichter Ausgabe mit pdf_fuer_eltern = true; Hinweis „Bitte nur an Familien
      weitergeben“; ohne Freigabe kein Knopf; im Kinder-Bereich nie
   b) Das Eltern-PDF hat Druckbereich und Dateinamen wie das Trainer-PDF, aber keinen Hör-Link und erzeugt keinen
   c) Editor: Schalter „Eltern dürfen das PDF … speichern“ (≥ 44 px) nur bei veröffentlichter Ausgabe; schaltet per PATCH nur die eine Spalte */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  let neuAufrufe = 0, patch = null;
  const ausgabe = (st, frei) => ({ id: 3, team: "adler1", nummer: 3, termin_id: 81, status: st, schlagzeile: "Test-Schlagzeile", audio_pfad: "3/hoeren.mp3", audio_sekunden: 75, pdf_fuer_eltern: frei,
    anpfiff: "Anpfiff-Text", spieltag_text: "Bericht.", portraet_spieler_id: null, portraet_einleitung: "", foto_ids: [], kommentar: "Wort vom Team", training_leitfrage: "Leitfrage?" });
  const lesen = (st, frei) => ({ ausgabe: ausgabe(st, frei), termin: { id: 81, datum: "2026-10-03", typ: "turnier", titel: "Testfestival", heim: true, ort: "Testplatz", uhrzeit: "10:00:00", uhrzeit_ende: null, spielform: null, ergebnis: null },
    teams: [{ nr: 1, kinder: [{ name: "Kind A", kapitaen: true }], trainer: [] }], ergebnisse: [], naechster: null, portraet: null });
  let st = "veroeffentlicht", frei = true;
  const t = await h.starten({ warten: 1500, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [], heft_ausgabe: [ausgabe("veroeffentlicht", false)], kabine_reporter: [], portraet_verlauf: [], portraet_einreichung: [],
    heft_audio_link: [], rpc: { heft_ausgaben_liste: () => [{ id: 3, nummer: 3 }], heft_ausgabe_lesen: () => lesen(st, frei), heft_medien: () => [{ art: "audio", bucket: "heft_media", pfad: "3/hoeren.mp3" }],
      heft_audio_link_neu: () => { neuAufrufe++; return [{ token: "ab".repeat(32), gueltig_bis: new Date(Date.now() + 30 * 864e5).toISOString() }]; } } }) });
  await t.page.route(/\/rest\/v1\/heft_ausgabe\?id=eq\.3/, async r => { if (r.request().method() === "PATCH") { patch = r.request().postData(); return r.fulfill({ status: 204, body: "" }); } return r.fallback(); });
  const r = await t.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 60 && typeof nestPdfLesen !== "function"; i++) await w(100);
    if (typeof nestPdfLesen !== "function") return { fehlt: true };
    const halt = document.createElement("div"); halt.setAttribute("aria-modal", "true"); halt.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none"; document.body.appendChild(halt);
    const out = {}, knopf = () => { const b = document.getElementById("nest-pdf-eltern"); return b ? { h: Math.round(b.getBoundingClientRect().height), hinweis: /Bitte nur an Familien weitergeben/.test(b.parentElement.textContent) } : null; };
    await nestOpen(3); await w(300); out.a1 = knopf();
    await nestOpen(3, { kind: true }); await w(300); out.a3 = knopf();
    return out;
  });
  if (r.fehlt) { await t.schliessen(); return h.ergebnis("v762 Nest-PDF Eltern", false, ["nestPdfLesen fehlt"]); }
  frei = false; st = "veroeffentlicht";
  const a2 = await t.page.evaluate(async () => { await nestOpen(3); await new Promise(x => setTimeout(x, 300)); return !!document.getElementById("nest-pdf-eltern"); });
  st = "entwurf"; frei = true;
  const a4 = await t.page.evaluate(async () => { await nestOpen(3); await new Promise(x => setTimeout(x, 300)); return !!document.getElementById("nest-pdf-eltern"); });
  if (!r.a1 || r.a1.h < 48 || !r.a1.hinweis || a2 || r.a3 || a4) probleme.push("a) " + JSON.stringify({ eltern: r.a1, ohneFreigabe: a2, kind: r.a3, entwurf: a4 }));
  zeilen.push(`a) Knopf (${r.a1 && r.a1.h} px) nur Eltern + veröffentlicht + Freigabe; ohne Freigabe, im Kinder-Bereich und im Entwurf keiner; Hinweis steht dabei`);
  st = "veroeffentlicht"; frei = true; neuAufrufe = 0;
  const b = await t.page.evaluate(async () => { await nestOpen(3); await new Promise(x => setTimeout(x, 300)); const m = await nestDruckVorbereiten(3, { eltern: true }); const c = document.getElementById("nest-druck");
    const o = { ok: !!m, titel: document.title, link: !!c.querySelector("a.nest-hoerlink"), qr: !!c.querySelector(".nest-qr svg"), audio: !!c.querySelector("audio") }; nestDruckAufraeumen(); return o; });
  if (!b.ok || b.titel !== "Adler-Nest_Ausgabe-03" || b.link || b.qr || b.audio || neuAufrufe) probleme.push("b) " + JSON.stringify({ b, neuAufrufe }));
  zeilen.push("b) Eltern-PDF: Dateiname wie beim Trainer, kein Hör-Link, kein Link erzeugt");
  const c = await t.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    if (typeof nestEdOpen !== "function" && typeof nestEditorOpen !== "function") return { fehlt: true };
    _nestEd = { a: { id: 3, status: "veroeffentlicht", audio_pfad: "3/hoeren.mp3", pdf_fuer_eltern: false }, termine: [] };
    document.body.insertAdjacentHTML("beforeend", '<div id="nest-ed-teilen" style="position:fixed;left:0;top:0;z-index:99999;background:#fff"></div>');
    await nestEdTeilen(); const l = document.getElementById("nest-ed-pdf-eltern"); const o = { da: !!l, h: l ? Math.round(l.closest("label").getBoundingClientRect().height) : 0, an: l && l.checked };
    if (l) { l.checked = true; l.dispatchEvent(new Event("change", { bubbles: true })); await w(400); o.nachher = !!_nestEd.a.pdf_fuer_eltern; }
    _nestEd.a.status = "entwurf"; await nestEdTeilen(); o.entwurf = !!document.getElementById("nest-ed-pdf-eltern");
    document.getElementById("nest-ed-teilen").remove(); return o;
  });
  if (c.fehlt) probleme.push("c) Editor-Funktionen nicht gefunden");
  else if (!c.da || c.h < 44 || c.an || !c.nachher || c.entwurf || patch !== '{"pdf_fuer_eltern":true}') probleme.push("c) " + JSON.stringify({ c, patch }));
  else zeilen.push(`c) Editor: Schalter (${c.h} px) nur bei veröffentlichter Ausgabe, schreibt nur ${patch}`);
  const fe = t.fehler(); await t.schliessen();
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v762 Nest-PDF für Eltern mit Freigabe je Ausgabe", !probleme.length, probleme.length ? probleme : zeilen);
};
