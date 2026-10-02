/* v640 · PO 27.09.: „Angelegte Übungen müssen auch einen Bearbeiten-Button bekommen.“
   a) Eigene Übung: ✏️ in der Liste und „Übung bearbeiten“ in der Detailansicht; mitgelieferte nicht.
   b) Die Maske öffnet gefüllt, Titel „Übung bearbeiten“, Knopf „Änderungen speichern“.
   c) Speichern schickt PATCH an genau diese Zeile (kein neues POST), die Liste zeigt den neuen Stand.
   d) Steht die Übung schon in einem Plan, bleibt der Name seit v716 FREI (PO 02.10.) – der Hinweis sagt,
      dass der neue Name in Plänen mitgenommen wird (uebung_umbenennen).
   e) Danach erfasst die Maske wieder neu.
   f) PO: „Auch Übung kopieren macht Sinn“ – bei jeder Übung, auch der mitgelieferten: Maske gefüllt,
      Name „… (Variante)“, „Übung erfassen“ legt eine NEUE Übung an, das Original bleibt.
   g) Derselbe Name wie eine vorhandene Übung wird abgewiesen, statt still nur lokal zu landen. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const eigen = { id: 77, name: "Zickzack der Beispielhasen", kat: "technik", ablauf: "Alter Ablauf.", coaching: "Kopf hoch", spieler: "6-10", feld: "20x15", dauer: "10", spass: 4, diff: 2, custom: true, tags: "Eigene Übung", skizze: { s: [[40, 90, "g"]], b: [[48, 90]] } };
  const s = await h.starten({ hoehe: 1400, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), trainingsformen: [eigen], trainingsplan: [] }) });
  const r = await s.page.evaluate(async name => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = {};
    document.getElementById("pin-gate")?.remove(); const m = document.getElementById("main-app"); if (m) m.style.display = "block";
    for (let i = 0; i < 40 && !CUSTOM_FORMS.some(f => f.name === name); i++) await warte(50);
    if (!CUSTOM_FORMS.some(f => f.name === name)) { CUSTOM_FORMS.push({ id: 77, name, kat: "technik", ablauf: "Alter Ablauf.", custom: true, dauer: "10", spieler: "6-10", feld: "20x15" }); }
    go("formen"); await warte(900);
    const idx = tpAllForms().findIndex(f => f.name === name);
    document.getElementById("training-search").value = "Zickzack"; renderTraining(); await warte(80);
    out.a = { liste: !!document.querySelector('.tf-bearbeiten[aria-label*="Zickzack"]'), bibIdx: tpAllForms().findIndex(f => typeof f.id === "string" && /^tf/.test(f.id)) };
    tpShowExercise(idx); await warte(50);
    out.a.detail = [...document.querySelectorAll("#uebung-modal button")].some(b => /Übung bearbeiten/.test(b.textContent));
    document.getElementById("uebung-modal")?.remove();
    tpShowExercise(out.a.bibIdx); await warte(50);
    out.a.bibDetail = [...document.querySelectorAll("#uebung-modal button")].some(b => /Übung bearbeiten/.test(b.textContent));
    document.getElementById("uebung-modal")?.remove();
    // b) Maske
    uebungBearbeiten(idx); await warte(50);
    out.b = { name: document.getElementById("tf-name").value, ablauf: document.getElementById("tf-ablauf").value, kat: document.getElementById("tf-kat").value,
      titel: document.getElementById("tf-titel").textContent, knopf: document.getElementById("tf-haupt").textContent.trim(), gesperrt: document.getElementById("tf-name").readOnly, skizze: !!window.TF_SKIZZE };
    // c) speichern
    document.getElementById("tf-ablauf").value = "Neuer Ablauf mit Abschluss.";
    await saveCustomTraining(); await warte(80);
    out.c = { ablauf: tpAllForms()[idx].ablauf, anzahl: CUSTOM_FORMS.filter(f => f.name === name).length, zu: document.getElementById("training-modal").style.display };
    // d) im Plan genutzt → Name gesperrt
    _tpEinsatz = { "2026-09-01": [_tfNormName(name)] };
    uebungBearbeiten(idx); await warte(50);
    out.d = { gesperrt: document.getElementById("tf-name").readOnly, hinweis: !document.getElementById("tf-name-hinweis").hidden };
    closeAddTraining();
    // e) zurück auf Erfassen
    openAddTraining();
    out.e = { titel: document.getElementById("tf-titel").textContent, knopf: document.getElementById("tf-haupt").textContent.trim(), frei: !document.getElementById("tf-name").readOnly, edit: window.TF_EDIT_IDX };
    closeAddTraining();
    // f) kopieren – eine mitgelieferte Übung
    const bib = tpAllForms()[out.a.bibIdx], vorher = CUSTOM_FORMS.length;
    tpShowExercise(out.a.bibIdx); await warte(50);
    const kopKnopf = [...document.querySelectorAll("#uebung-modal button")].find(b => /Übung kopieren/.test(b.textContent));
    out.f = { knopf: !!kopKnopf, bibName: bib.name };
    kopKnopf && kopKnopf.click(); await warte(50);
    out.f.name = document.getElementById("tf-name").value; out.f.titel = document.getElementById("tf-titel").textContent;
    out.f.knopfText = document.getElementById("tf-haupt").textContent.trim(); out.f.edit = window.TF_EDIT_IDX;
    out.f.ablauf = document.getElementById("tf-ablauf").value === String(bib.ablauf || "");
    await saveCustomTraining(); await warte(80);
    out.f.neu = CUSTOM_FORMS.length - vorher; out.f.original = tpAllForms()[out.a.bibIdx].name;
    // g) Name schon vergeben
    uebungKopieren(idx); await warte(30);
    document.getElementById("tf-name").value = name;
    await saveCustomTraining(); await warte(50);
    out.g = { offen: document.getElementById("training-modal").style.display !== "none", neu: CUSTOM_FORMS.length - vorher };
    closeAddTraining();
    return out;
  }, eigen.name);
  const schreib = s.gesendet.filter(x => /trainingsformen/.test(x.pfad));
  const fe = s.fehler(); await s.schliessen();

  if (!r.a.liste || !r.a.detail) probleme.push("a) Bearbeiten-Knopf fehlt: " + JSON.stringify(r.a));
  if (r.a.bibIdx < 0 || r.a.bibDetail) probleme.push("a) mitgelieferte Übung (tf…) bietet Bearbeiten an oder fehlt: " + r.a.bibIdx);
  const b = r.b;
  if (b.name !== eigen.name || b.ablauf !== eigen.ablauf || b.kat !== "technik" || !/bearbeiten/.test(b.titel) || b.knopf !== "Änderungen speichern" || b.gesperrt || !b.skizze) probleme.push("b) Maske: " + JSON.stringify(b));
  const patch = schreib.find(x => x.methode === "PATCH");
  if (!patch || !/id=eq\.77/.test(patch.suche) || patch.body.ablauf !== "Neuer Ablauf mit Abschluss." || "custom" in patch.body) probleme.push("c) PATCH: " + JSON.stringify(patch && { s: patch.suche, b: patch.body }).slice(0, 200));
  const posts = schreib.filter(x => x.methode === "POST");
  if (posts.some(x => x.body && x.body.name === eigen.name)) probleme.push("c) Bearbeiten legt eine neue Übung an");
  const f = r.f;
  if (!f.knopf || f.name !== f.bibName + " (Variante)" || !/kopieren/.test(f.titel) || f.knopfText !== "Übung erfassen" || f.edit !== null || !f.ablauf) probleme.push("f) Kopieren: " + JSON.stringify(f));
  if (f.neu !== 1 || f.original !== f.bibName || posts.length !== 1 || posts[0].body.name !== f.bibName + " (Variante)") probleme.push("f) Kopie nicht neu angelegt: " + JSON.stringify({ neu: f.neu, posts: posts.map(x => x.body && x.body.name) }));
  if (!r.g.offen || r.g.neu !== 1) probleme.push("g) doppelter Name nicht abgewiesen: " + JSON.stringify(r.g));
  if (r.c.ablauf !== "Neuer Ablauf mit Abschluss." || r.c.anzahl !== 1 || r.c.zu !== "none") probleme.push("c) lokal: " + JSON.stringify(r.c));
  if (r.d.gesperrt || !r.d.hinweis) probleme.push("d) Name im Plan gesperrt oder ohne Hinweis: " + JSON.stringify(r.d));
  if (!/Eigene Übung/.test(r.e.titel) || r.e.knopf !== "Übung erfassen" || !r.e.frei || r.e.edit !== null) probleme.push("e) Maske bleibt im Bearbeiten: " + JSON.stringify(r.e));
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`Kopie: „${f.name}“`, `Maske: ${b.titel} · ${b.knopf} · PATCH ${patch ? patch.suche : "–"} · im Plan: Name frei ${!r.d.gesperrt}, Hinweis ${r.d.hinweis}`);
  return h.ergebnis("v640 Übungen bearbeiten und kopieren", !probleme.length, probleme.concat(zeilen));
};
