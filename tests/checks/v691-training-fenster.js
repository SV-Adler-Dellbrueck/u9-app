/* v691 · Training: Fenster unter den Kacheln
   PO 30.09.: „Optimiere vor allem den ganzen Bereich Training und alles was darunter liegt.“
   a) Übungsdetail ist als Dialog gekennzeichnet (role, aria-modal, Titel) – vorher griff der
      zentrale Fokus-Trap nicht
   b) Übungsdetail: Kennzahlen vor der Skizze, Ablauf vor den Coaching-Tipps, „Übung kopieren“
      erst danach
   c) Solo-Timer ist als Dialog gekennzeichnet
   d) Feldbeschriftungen in Formularen ohne Großbuchstaben („Name“, nicht „NAME“) */
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
    const forms = tpAllForms();
    const idx = forms.findIndex(f => f.svg && f.coaching && f.ablauf);
    tpShowExercise(idx); await w(300);
    const m = document.getElementById("uebung-modal");
    out.a = { role: m.getAttribute("role"), modal: m.getAttribute("aria-modal"), titel: (document.getElementById(m.getAttribute("aria-labelledby") || "x") || {}).textContent || "" };
    const txt = m.textContent;
    const pos = t => txt.indexOf(t);
    const f = forms[idx];
    out.b = { chips: pos("👥"), skizze: m.innerHTML.indexOf('id="uebung-skizze"'), chipsHtml: m.innerHTML.indexOf("👥"), ablauf: pos(f.ablauf.slice(0, 20)), coaching: pos("Coaching-Tipps"), kopieren: pos("Übung kopieren") };
    m.remove();
    go("planung"); await w(1000); tpGenerate(); await w(600);
    stTimerStart(); await w(300);
    const t = document.getElementById("st-timer");
    out.c = t ? { role: t.getAttribute("role"), modal: t.getAttribute("aria-modal"), label: t.getAttribute("aria-label") } : null;
    t?.remove();
    openAddTraining(); await w(300);
    const lab = document.querySelector('#training-modal label[for="tf-name"]');
    out.d = lab ? getComputedStyle(lab).textTransform : "fehlt";
    return out;
  });
  const f = s.fehler(); await s.schliessen();
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  if (r.a.role !== "dialog" || r.a.modal !== "true" || !r.a.titel) probleme.push(`a) Übungsdetail: ${JSON.stringify(r.a)}`);
  const b = r.b;
  if (!(b.chipsHtml < b.skizze)) probleme.push("b) Die Kennzahlen stehen nicht vor der Skizze");
  if (!(b.ablauf >= 0 && b.coaching > b.ablauf && b.kopieren > b.coaching)) probleme.push(`b) Reihenfolge Ablauf/Coaching/Kopieren: ${JSON.stringify(b)}`);
  if (!r.c || r.c.role !== "dialog" || r.c.modal !== "true" || !r.c.label) probleme.push(`c) Solo-Timer: ${JSON.stringify(r.c)}`);
  if (r.d !== "none") probleme.push(`d) Feldbeschriftung: text-transform ${r.d}`);
  zeilen.push(`Übungsdetail: Dialog „${r.a.titel}“ · Kennzahlen › Skizze › Ablauf › Coaching › Kopieren`);
  zeilen.push(`Solo-Timer: ${r.c ? r.c.label : "–"} · Beschriftung ${r.d}`);
  return h.ergebnis("Training: Übungsdetail und Solo-Timer als Dialog, klare Reihenfolge, Beschriftungen ohne Versalien", !probleme.length, zeilen.concat(probleme));
};
