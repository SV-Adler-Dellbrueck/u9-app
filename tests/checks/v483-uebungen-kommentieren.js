/* v483 – PO: „Wie kann ein Trainer optional die Übungen nach einem Training bewerten und
   kommentieren?" Bestand: „Einheit bewerten" mit Sternen je Übung, aber das Kommentarfeld
   je Übung blieb immer leer, und im Trainings-Bereich fehlte der Einstieg (nur To-do fuer
   Eingeteilte und die Hilfe). PO-Wahl: Kommentar je Übung; Einstieg im Trainingsplan, sobald
   die Einheit vorbei ist. Geprueft: Kommentarfeld je Übung, Speichern traegt den Kommentar
   in trainings_eval, der Trainingsplan zeigt ihn bei der Übung, der Knopf erscheint nur bei
   einer beendeten Einheit. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const heute = h.heute(), morgen = h.tagePlus(1), gestern = h.tagePlus(-1);
  const jetzt = new Date(); const hh = n => String(n).padStart(2, "0");
  const ende = `${hh(Math.max(0, jetzt.getHours() - 1))}:00`;   // heutiges Training seit einer Stunde vorbei
  const termine = [
    { id: 1, datum: heute, typ: "training", uhrzeit: "10:00", uhrzeit_ende: ende, trainer_status: {} },
    { id: 2, datum: morgen, typ: "training", uhrzeit: "16:45", uhrzeit_ende: "18:00", trainer_status: {} }
  ];
  const s = await h.starten({ supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), termine,
    trainingsplan: [{ datum: heute, plan: [{ formIdx: 0, slotLabel: "Hauptteil", formName: "Übung 0", trainer: "" }], slots: [] }],
    einheit_bewertung: [], anwesenheit: [], profiles: [{ name: "Charles", rolle: "trainer" }]
  }), hoehe: 1800 });
  await h.sichtbarMachen(s.page, "#train-sub-planung");
  const r = await s.page.evaluate(async ({ heute, morgen }) => {
    await loadKader(); window.trainerMe = async () => "Charles";
    const warte = ms => new Promise(r => setTimeout(r, ms));
    if (typeof tpNachbereitenKnopf !== "function" || typeof tpUebungKommentare !== "function") return { fehlt: "tpNachbereitenKnopf" };
    document.getElementById("pin-gate")?.remove();
    const m = document.getElementById("main-app"); if (m) { m.style.display = ""; if (getComputedStyle(m).display === "none") m.style.display = "block"; }
    let slot = document.getElementById("tp-nachbereiten"); if (!slot) { slot = document.createElement("div"); slot.id = "tp-nachbereiten"; document.body.appendChild(slot); }
    let d = document.getElementById("tp-date"); if (!d) { d = document.createElement("select"); d.id = "tp-date"; document.body.appendChild(d); }
    d.innerHTML = `<option value="${heute}">${heute}</option><option value="${morgen}">${morgen}</option>`;
    // 1) Knopf nur bei beendeter Einheit
    d.value = morgen; await tpNachbereitenKnopf(morgen); const knopfMorgen = !!slot.querySelector("button");
    d.value = heute; await tpNachbereitenKnopf(heute); const knopfHeute = slot.querySelector("button")?.textContent.trim() || "";
    // 2) Nachbereitung oeffnen: Kommentarfeld je Uebung, speichern
    Object.keys(EVAL_DATA).forEach(k => delete EVAL_DATA[k]);
    await einheitNachbereiten(heute); await warte(600);
    const feld = document.getElementById("eb-ue-notiz-0");
    const feldH = feld ? parseInt(getComputedStyle(feld).minHeight) : 0;
    if (feld) feld.value = "Zu eng gesteckt – nächstes Mal mehr Abstand";
    if (typeof einheitSave === "function") await einheitSave();
    await warte(1800);
    const gespeichert = (EVAL_DATA[heute] || [])[0]?.notiz || "";
    // 3) Im Plan sichtbar
    tpExerciseLog[heute] = [0];
    const hist = tpExerciseHistoryHtml(0);
    const komm = tpUebungKommentare(0);
    return { knopfMorgen, knopfHeute, feld: !!feld, feldH, gespeichert, hist, komm };
  }, { heute, morgen });
  const fehler = s.fehler();
  const posts = s.gesendet.filter(g => g.methode === "POST" && /trainings_eval$/.test(g.pfad));
  await s.schliessen();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt`); return h.ergebnis("Übungen kommentieren", false, probleme); }
  if (r.knopfMorgen) probleme.push("Knopf „Einheit nachbereiten“ steht bei einem künftigen Training");
  if (!/nachbereiten/.test(r.knopfHeute)) probleme.push(`kein Knopf bei der beendeten Einheit („${r.knopfHeute}“)`);
  if (!r.feld) probleme.push("kein Kommentarfeld je Übung");
  if (r.feld && r.feldH < 44) probleme.push(`Kommentarfeld nur ${r.feldH}px hoch`);
  if (!/eng gesteckt/.test(r.gespeichert)) probleme.push(`Kommentar nicht gespeichert („${r.gespeichert}“)`);
  const mitNotiz = posts.filter(p => p.body && Array.isArray(p.body.data) && p.body.data.some(e => /eng gesteckt/.test(e.notiz || "")));
  if (!mitNotiz.length) probleme.push(`Kommentar kommt nicht in trainings_eval an (${posts.length} Upserts)`);
  if (!/eng gesteckt/.test(r.hist)) probleme.push(`Trainingsplan zeigt den Kommentar nicht bei der Übung: „${r.hist.replace(/<[^>]+>/g, "").slice(0, 80)}“`);
  if (r.komm.length !== 1) probleme.push(`${r.komm.length} Kommentare statt 1`);
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Knopf: morgen ${r.knopfMorgen} · heute „${r.knopfHeute.slice(0, 40)}“ · Feld ${r.feld} ${r.feldH}px`);
  zeilen.push(`gespeichert „${r.gespeichert}“ · Upserts mit Kommentar ${mitNotiz.length}/${posts.length}`);
  zeilen.push(`Plan: „${r.hist.replace(/<[^>]+>/g, "").slice(0, 90)}“`);
  return h.ergebnis("Übungen kommentieren: Feld je Übung, im Plan sichtbar, Einstieg nach der Einheit", !probleme.length, zeilen.concat(probleme));
};
