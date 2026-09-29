/* v657 · Blockplanung automatisch, „Aktualisieren nach Anwesenheit“.

   PO am 28.09.: „… über die Auswahl eines Themas … mit der Angabe, über welchen Zeitraum wir
   planen, durch die App und die KI einen automatisch stimmigen Trainingsplan erstellen und in
   alle in diesem Zeitraum befindlichen Trainingseinheiten integrieren“ – und am Trainingstag
   „über einen Button (,Aktualisieren nach Anwesenheit‘) … die Übungen noch mal anpassen und
   prüfen, ob der Plan aufgeht“. Kacheln: bestehende Pläne „Alle überschreiben“; erst Regeln,
   dann KI (Empfehlung, von Charles offen gelassen und so gebaut).

   a) Block planen: jedes Training im Zeitraum bekommt seinen Plan (A-B-C), ein schon stehender
      Plan wird ersetzt, jede Einheit endet mit Abschlussturnier. Der Block-Editor sagt vorher,
      dass stehende Pläne ersetzt werden.
   b) Aktualisieren, Regeln: 8 Kinder, 2 Trainer → zwei Gruppen zu 4. Stationen, deren Übung nicht
      zur Gruppe passt, bekommen eine passende; danach passt jede Station (oder die App sagt,
      dass es keine gibt). Knopf mindestens 56 px.
   c) Aktualisieren, KI: an die KI gehen Zahlen, Übungen und Kandidaten – keine Kindernamen.
      Ein Vorschlag mit einer Übung aus der Bibliothek erscheint mit „Übernehmen“, einer mit
      erfundener Übung nicht; „Übernehmen“ setzt die Übung an die Station.
   d) KI fällt aus: der Plan aus den Regeln steht, die Karte sagt es. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");
  const vor = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8"));
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const rows = (vor.vorlagen || []).map((v, i) => ({ ...v, id: 500 + i }));
  const custom = (bib.uebungen || []).map((u, i) => ({ ...u, id: 6000 + i, custom: true }));
  const namen = p => (rows.find(v => v.name.startsWith(p + " ")) || {}).name;
  const F = (rows.find(v => v.name.startsWith("L4-6 ")) || {}).leitfrage;
  const von = h.tagePlus(1), bis = h.tagePlus(15);
  const trainings = [2, 5, 9].map((t, i) => ({ id: 80 + i, datum: h.tagePlus(t), typ: "training", uhrzeit: "17:00",
    trainer_status: { Charles: "ja", Finn: "ja" } }));
  const block = { id: 11, leitfrage: F, ziel: "", von, bis, vorlagen: [namen("L4-6"), namen("L4-5"), namen("L4-8")] };
  const plaene = { [trainings[1].datum]: { datum: trainings[1].datum, slots: [{ label: "Alt", dauer: 60, typ: "main" }], plan: [] } };
  const posts = [];
  let kiBody = null, kiAus = false;
  const s = await h.starten({ hoehe: 2600, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen({ inaktiv: h.KINDER.slice(8) }), nominierungen: [], anwesenheit: [],
    termine: trainings,
    trainingsformen: custom,
    trainingsvorlagen: rows,
    trainingsblock: [block],
    trainingsgruppen: (u, req) => (req.method() === "POST" ? { status: 201, body: "[]" } : []),
    trainingsplan: (u, req) => {
      if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); plaene[b.datum] = b; posts.push(b.datum); return { status: 201, body: "[]" }; }
      const d = (u.searchParams.get("datum") || "").replace(/^eq\./, "");
      const p = plaene[d]; return p ? [p] : [];
    },
    funktionen: {
      "ki-plan-pruefen": (u, req) => {
        if (kiAus) return { status: 502, body: JSON.stringify({ error: "KI-Dienst nicht erreichbar (502)" }) };
        kiBody = JSON.parse(req.postData() || "{}");
        const b0 = (kiBody.bloecke || [])[0] || {}, st = (b0.stationen || [])[0] || {};
        const zu = (kiBody.kandidaten || []).map(k => k.name).find(n => n !== st.uebung) || "";
        return { passt: false, urteil: "Station 1 passt besser mit einer anderen Übung.",
          tausch: [{ block: b0.block, station: st.station, zu, grund: "passt zum Thema" },
                   { block: b0.block, station: st.station, zu: "Gibt es nicht", grund: "erfunden" }],
          hinweise: ["Frag die Kinder: Wo ist der freie Mitspieler?"] };
      }
    }
  }) });
  await h.sichtbarMachen(s.page, "#train-sub-planung");
  await h.sichtbarMachen(s.page, "#tp-timeline");

  const r = await s.page.evaluate(async ({ block, trainings, kinderNamen }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = { fehlt: [] };
    for (const n of ["blockAllePlanen", "blockAktualisieren", "vuPlanAusVorlage", "vuPlanSchreiben", "blockKiTausch"])
      if (typeof window[n] !== "function") out.fehlt.push(n);
    if (out.fehlt.length) return out;
    await loadKader();
    await vorlagenLaden(); await blockLaden();

    // a) Editor-Hinweis und Planen
    await blockEditorOpen(); await warte(200);
    const t = vuThemen().findIndex(x => x.frage === block.leitfrage);
    blockThemaSetzen(t); await warte(80);
    const folge = _tbFolge(block.leitfrage).map(v => v.name);
    block.vorlagen.forEach(n => blockVorlageUmschalten(folge.indexOf(n)));
    blockVonSetzen(block.von); await warte(300);
    out.aHinweis = (document.getElementById("tb-vorschau") || {}).textContent || "";
    blockEditorClose();
    out.aErg = await blockAllePlanen(block);

    // b) Aktualisieren am ersten Training
    const datum = trainings[0].datum;
    const feld = document.getElementById("tp-date");
    if (feld && ![...feld.options].some(o => o.value === datum)) feld.add(new Option(datum, datum));
    feld.value = datum;
    await tpTrainerRsvpLaden(datum);
    await tpPlanRestore(datum); await warte(200);
    await blockPlanKarte(datum); await warte(100);
    const knopf = document.getElementById("tp-block-akt");
    out.bHoehe = knopf ? Math.round(knopf.getBoundingClientRect().height) : 0;
    const vorher = Object.keys(_tpStationGruppe).map(id => (tpAllForms()[+document.getElementById(id).value] || {}).name);
    await blockAktualisieren(datum); await warte(300);
    out.bGruppen = ((tgFor() || {}).gruppen || []).map(g => g.kinder.length);
    out.bVorher = vorher;
    out.bNachher = Object.keys(_tpStationGruppe).map(id => (tpAllForms()[+document.getElementById(id).value] || {}).name);
    out.bUnpassend = Object.keys(_tpStationGruppe).filter(id => !_tbStationPasst(id)).length;
    out.bText = ((document.getElementById("tp-block-ergebnis") || {}).textContent || "").replace(/\s+/g, " ");
    // c) KI-Vorschläge
    const kiKnoepfe = [...document.querySelectorAll("#tp-block-ki button")].filter(b => /Übernehmen/.test(b.textContent));
    out.cKnoepfe = kiKnoepfe.length;
    const t0 = (window._tbKiTausch || [])[0];
    if (t0) { kiKnoepfe[0].click(); await warte(80); out.cGesetzt = document.getElementById(t0.selId).value === String(t0.i); }
    out.cKiText = ((document.getElementById("tp-block-ki") || {}).textContent || "").replace(/\s+/g, " ");
    return out;
  }, { block, trainings, kinderNamen: h.KINDER });

  // d) KI fällt aus
  let dText = "";
  if (!r.fehlt.length) {
    kiAus = true;
    dText = await s.page.evaluate(async (datum) => {
      await blockAktualisieren(datum); await new Promise(x => setTimeout(x, 300));
      return ((document.getElementById("tp-block-ergebnis") || {}).textContent || "").replace(/\s+/g, " ");
    }, trainings[0].datum);
  }
  const fehler = s.fehler();
  await s.schliessen();
  const titel = "v657 Blockplanung automatisch, Aktualisieren nach Anwesenheit";
  if (r.fehlt.length) return h.ergebnis(titel, false, [r.fehlt.join(", ") + " fehlt"]);

  // a)
  if (!/Stehende Pläne in diesem Zeitraum werden ersetzt/.test(r.aHinweis)) probleme.push("a) Der Editor sagt nicht, dass stehende Pläne ersetzt werden");
  if (r.aErg.geplant !== 3 || r.aErg.fehler) probleme.push("a) blockAllePlanen: " + JSON.stringify(r.aErg));
  trainings.forEach((t, i) => {
    const p = plaene[t.datum] || {};
    const letzte = (p.slots || [])[(p.slots || []).length - 1] || {};
    if (!(p.slots || []).length) probleme.push(`a) ${t.datum}: kein Plan`);
    else if (letzte.typ !== "abschluss") probleme.push(`a) ${t.datum}: endet nicht mit Abschlussturnier`);
    if ((p.slots || []).some(x => x.label === "Alt")) probleme.push(`a) ${t.datum}: alter Plan nicht ersetzt`);
  });
  // b)
  if (String(r.bGruppen.slice().sort()) !== "4,4") probleme.push(`b) Gruppen ${r.bGruppen.join("/")} statt 4/4`);
  if (r.bUnpassend && !/keine passende Übung/.test(r.bText)) probleme.push(`b) ${r.bUnpassend} Stationen passen nicht, ohne dass es gesagt wird`);
  if (String(r.bVorher) === String(r.bNachher) && !/Alle Übungen passen/.test(r.bText)) probleme.push("b) Nichts getauscht und nichts gesagt");
  if (!/8 Kinder · 2 Gruppen/.test(r.bText)) probleme.push("b) Ergebnis nennt Kinder und Gruppen nicht: " + r.bText.slice(0, 120));
  if (r.bHoehe < 56) probleme.push(`b) Knopf ${r.bHoehe} px statt 56`);
  // c)
  const kb = JSON.stringify(kiBody || {});
  if (!kiBody) probleme.push("c) Die KI wurde nicht gefragt");
  else {
    if (h.KINDER.some(n => kb.includes(n))) probleme.push("c) Kindername in der Anfrage an die KI");
    if (!(kiBody.kandidaten || []).length || !(kiBody.bloecke || []).length) probleme.push("c) Anfrage ohne Blöcke oder Kandidaten");
    if (kiBody.kinder !== 8 || kiBody.trainer !== 2) probleme.push(`c) Zahlen ${kiBody.kinder}/${kiBody.trainer} statt 8/2`);
  }
  if (r.cKnoepfe !== 1) probleme.push(`c) ${r.cKnoepfe} Übernehmen-Knöpfe statt 1 (erfundene Übung muss wegfallen)`);
  if (!r.cGesetzt) probleme.push("c) Übernehmen setzt die Übung nicht");
  if (!/Wo ist der freie Mitspieler/.test(r.cKiText)) probleme.push("c) Hinweis der KI fehlt");
  // d)
  if (!/KI-Prüfung nicht möglich/.test(dText) || !/Der Plan oben steht/.test(dText)) probleme.push("d) KI-Ausfall wird nicht sauber gemeldet: " + dText.slice(-120));
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);

  if (!probleme.length) {
    zeilen.push(`Block planen: ${r.aErg.geplant} Trainings, alle mit Abschlussturnier, stehender Plan ersetzt`);
    zeilen.push(`Aktualisieren: ${r.bText.replace(/^Nach Anwesenheit aktualisiert/, "").slice(0, 160)}`);
    zeilen.push(`KI: Anfrage ohne Namen, ${kiBody.kandidaten.length} Kandidaten · 1 von 2 Vorschlägen gültig, Übernehmen setzt ihn · Ausfall: Plan bleibt`);
  }
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
