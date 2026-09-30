/* v690 · Training: die Ebene unter den Kacheln, samt Fenstern
   PO 30.09.: „Optimiere vor allem den ganzen Bereich Training und alles was darunter liegt.“
   a) Spielform nur noch EINE Zahl: kein „Spielform-Anteil“ unter dem Ablauf mehr (der aus den
      Übungen schätzte und der Minutenzahl widersprach), in Schritt 5 „N von M Minuten (P %)“,
      M = Gesamt der Zeitleiste
   b) „Trainingsblock anlegen“ ist ein leiser Link unter den beiden Hauptwegen, kein breiter Knopf
      darüber
   c) Hinweiskarten (Mindset, Team-Fokus) stehen unter „Block hinzufügen“, nicht zwischen Ablauf und
      Knopf
   d) Übungswahl: „Block hinzufügen“ statt „Phase hinzufügen“, Kategorie als Wort („Aufwärmen“)
   e) Übungen: die Pflege-Einstiege stehen bei den Werkzeugen, nicht zwischen Liste und Werkzeugen
   f) Themenplan: Unterzeile nennt den Ort „unter Übungen“, nicht „Trainings-Tab“ */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const termine = [{ id: 1, datum: h.tagePlus(1), uhrzeit: "17:00", uhrzeit_ende: "18:15", typ: "training", titel: "Training", trainer_status: {} }];
  const s = await h.starten({ breite: 390, hoehe: 844, warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, anwesenheit: [] }) });
  await h.sichtbarMachen(s.page, "#main-app");
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    await loadKader();
    const out = {};
    go("planung"); await w(1200);
    tpGenerate(); await w(900);
    const box = document.getElementById("train-sub-planung");
    const netto = document.getElementById("tp-netto").textContent.replace(/\s+/g, " ");
    const gesamtZeile = [...box.querySelectorAll("#tp-timeline div")].map(d => d.textContent).find(t => /^Gesamt:/.test(t.trim())) || "";
    out.a = { sfq: !!document.getElementById("tp-sfq"), anteilText: /Spielform-Anteil/.test(box.textContent), netto, gesamtRechnung: tpGesamtMinuten(), gesamtZeile: (gesamtZeile.match(/Gesamt:\s*(\d+)/) || [])[1] };
    // b)
    if (typeof blockPlanKarte === "function") { await blockPlanKarte(); await w(200); }
    const link = document.getElementById("tp-block-link");
    const hin = [...box.querySelectorAll("div")].find(d => d.textContent.trim() === "Oder unten jeden Block selbst belegen.");
    out.b = { link: !!link, nachHinweis: !!(link && hin && (hin.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING)), breiterKnopf: !!document.querySelector("#tp-block .btn") };
    // c)
    if (typeof tpRenderMindsetTip === "function") tpRenderMindsetTip();
    const add = document.getElementById("tp-add-slot");
    const karten = ["tp-mindset-tip", "tp-team-fokus"].map(id => document.getElementById(id)).filter(Boolean);
    out.c = { n: karten.length, alleDarunter: karten.every(k => add.compareDocumentPosition(k) & Node.DOCUMENT_POSITION_FOLLOWING) };
    // d)
    const sel = document.querySelector('select[id^="tp-form-0"]');
    tpPickerOpen(sel.id); await w(400);
    const pk = (document.getElementById("tp-pick-modal") || {}).textContent || "";
    out.d = { phase: /Phase hinzufügen/.test(pk), block: /Block hinzufügen/.test(pk), roh: /· aufwaermen ·/.test(pk), wort: /· Aufwärmen ·/.test(pk) };
    document.getElementById("tp-pick-modal")?.remove();
    // e)
    go("formen"); await w(900);
    const werkz = [...document.querySelectorAll("#train-sub-formen div")].find(d => d.textContent.trim() === "🧰 Werkzeuge");
    const ein = document.getElementById("tf-art-einstieg");
    out.e = !!(werkz && ein && (werkz.compareDocumentPosition(ein) & Node.DOCUMENT_POSITION_FOLLOWING));
    // f)
    await periodOpen(); await w(300);
    out.f = ((document.getElementById("period-modal") || {}).textContent || "").replace(/\s+/g, " ");
    document.getElementById("period-modal")?.remove();
    return out;
  });
  const f = s.fehler(); await s.schliessen();
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  const a = r.a;
  if (a.sfq || a.anteilText) probleme.push("a) „Spielform-Anteil“ steht noch unter dem Ablauf");
  const m = a.netto.match(/Spielform: (\d+) von (\d+) Minuten \((\d+) %\)/);
  if (!m) probleme.push(`a) Schritt 5: „${a.netto}“`);
  else {
    if (+m[2] !== a.gesamtRechnung || String(a.gesamtRechnung) !== a.gesamtZeile) probleme.push(`a) Gesamt ${m[2]} / Rechnung ${a.gesamtRechnung} / Zeitleiste ${a.gesamtZeile}`);
    if (+m[3] !== Math.round(+m[1] / +m[2] * 100)) probleme.push(`a) Anteil ${m[3]} % passt nicht zu ${m[1]}/${m[2]}`);
  }
  if (!r.b.link || !r.b.nachHinweis || r.b.breiterKnopf) probleme.push(`b) Trainingsblock: ${JSON.stringify(r.b)}`);
  if (!r.c.n || !r.c.alleDarunter) probleme.push(`c) Hinweiskarten: ${JSON.stringify(r.c)}`);
  if (r.d.phase || !r.d.block || r.d.roh || !r.d.wort) probleme.push(`d) Übungswahl: ${JSON.stringify(r.d)}`);
  if (!r.e) probleme.push("e) Pflege-Einstiege stehen nicht bei den Werkzeugen");
  if (/Trainings-Tab/.test(r.f) || !/unter Übungen/.test(r.f)) probleme.push(`f) Themenplan: „${r.f.slice(0, 120)}“`);
  zeilen.push(`Schritt 5: „${a.netto.trim().slice(0, 90)}“ · Zeitleiste ${a.gesamtZeile} Min.`);
  zeilen.push(`Block-Link ${r.b.link} · Hinweiskarten unter „Block hinzufügen“: ${r.c.n} · Übungswahl Wort ${r.d.wort}`);
  return h.ergebnis("Training tief: eine Spielform-Zahl, Block als Link, Hinweise unten, Pflege bei Werkzeugen", !probleme.length, zeilen.concat(probleme));
};
