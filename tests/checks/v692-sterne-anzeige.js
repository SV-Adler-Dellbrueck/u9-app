/* v692 · Schwierigkeit nur noch im Übungsdetail ändern
   PO 30.09. (Kachel „Nur anzeigen“): In der Übungsliste änderte ein Tipp auf die Sterne sofort und
   ohne Rückfrage die Schwierigkeit – für das ganze Trainerteam.
   a) Übungsliste und Übungswahl: die Sterne sind kein Knopf mehr (nur Anzeige mit Beschreibung)
   b) Übungsdetail: drei Knöpfe „⭐ / ⭐⭐ / ⭐⭐⭐“ (≥ 44 px), die gewählte Stufe ist aria-pressed
   c) Ein Tipp dort setzt genau diese Stufe; Liste und Detail zeigen sie danach */
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
    go("formen"); await w(900);
    _tfDb.gruppe = "passen"; renderTraining(); await w(300);
    const liste = document.getElementById("training-content");
    out.listeKnopf = [...liste.querySelectorAll("button")].some(b => /tpStern/.test(b.getAttribute("onclick") || ""));
    out.listeAnzeige = liste.querySelectorAll('[role="img"][aria-label^="Schwierigkeit"]').length;
    go("planung"); await w(1000);
    const sel = document.querySelector('select[id^="tp-form-0"]');
    tpPickerOpen(sel.id); await w(300);
    const pk = document.getElementById("tp-pick-modal");
    out.pickerKnopf = [...pk.querySelectorAll("button")].some(b => /tpStern/.test(b.getAttribute("onclick") || ""));
    pk.remove();
    const forms = tpAllForms();
    const idx = forms.findIndex(f => _tpStern(f) === 1);
    const name = forms[idx].name;
    tpShowExercise(idx); await w(300);
    const knoepfe = [...document.querySelectorAll("#uebung-sterne button[data-stern]")];
    out.b = { n: knoepfe.length, h: Math.min(...knoepfe.map(b => Math.round(b.getBoundingClientRect().height))), gedrueckt: knoepfe.filter(b => b.getAttribute("aria-pressed") === "true").map(b => b.dataset.stern) };
    knoepfe[2].click(); await w(400);
    out.c = { stufe: _tpStern(forms[idx]), meta: (window._uebungMeta || {})[name], gedrueckt: [...document.querySelectorAll("#uebung-sterne button[aria-pressed='true']")].map(b => b.dataset.stern) };
    return out;
  });
  const f = s.fehler(); await s.schliessen();
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  if (r.listeKnopf || !r.listeAnzeige) probleme.push(`a) Übungsliste: Knopf ${r.listeKnopf}, Anzeigen ${r.listeAnzeige}`);
  if (r.pickerKnopf) probleme.push("a) In der Übungswahl ändern die Sterne noch die Schwierigkeit");
  if (r.b.n !== 3 || r.b.h < 44 || JSON.stringify(r.b.gedrueckt) !== '["1"]') probleme.push(`b) Detail: ${JSON.stringify(r.b)}`);
  if (r.c.stufe !== 3 || r.c.meta !== 3 || JSON.stringify(r.c.gedrueckt) !== '["3"]') probleme.push(`c) Nach dem Tipp: ${JSON.stringify(r.c)}`);
  zeilen.push(`Liste: ${r.listeAnzeige} Sternanzeigen, kein Knopf · Detail: 3 Knöpfe ${r.b.h} px, 1 → 3 gesetzt`);
  return h.ergebnis("Schwierigkeit nur im Übungsdetail ändern, in Liste und Übungswahl nur Anzeige", !probleme.length, zeilen.concat(probleme));
};
