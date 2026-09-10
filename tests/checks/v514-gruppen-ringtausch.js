/* v514 – PO: „Ich fände auch super, wenn wir z. B. zwei Gruppen haben im Training und dann
   zwei Übungen machen und die Gruppen darauf aufteilen und dann die Gruppen einfach nur
   switchen."
   Bis dahin stand Gruppe 1 in JEDEM Hauptteil an Feld 1 – bei zwei Übungen nebeneinander
   machte Gruppe 1 also nur die eine und Gruppe 2 nur die andere. Jetzt rückt die Zuordnung
   von Hauptteil zu Hauptteil um eine Station weiter.
   Kacheln: Wechsel von Block zu Block · Knopf UND Timer · Ringtausch für beliebig viele
   Gruppen (bei zwei ist er der Tausch).
   Geprueft wird die Rechnung selbst (tpFelderGruppen mit Versatz), der automatische Versatz
   aus der Blockfolge, der Knopf, das Zuruecknehmen – und dass der Stationstimer DIESELBE
   Zuordnung zeigt: zwei Quellen, die auseinanderlaufen, waeren am Platz schlimmer als gar
   keine Anzeige. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const datum = h.tagePlus(2);
  const gruppen = [
    { name: "Blau", emo: "🔵", kinder: [h.KINDER[0], h.KINDER[1], h.KINDER[2]] },
    { name: "Grün", emo: "🟢", kinder: [h.KINDER[3], h.KINDER[4], h.KINDER[5]] },
    { name: "Rot", emo: "🔴", kinder: [h.KINDER[6], h.KINDER[7], h.KINDER[8]] }
  ];
  const plaene = {};
  const s = await h.starten({
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(), termine: [], nominierungen: [], anwesenheit: [], trainingsformen: [],
      trainingsgruppen: [{ datum, gruppen, aus_anwesenheit: false }],
      trainingsplan: (u, req) => {
        if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); plaene[b.datum] = b; return { status: 201, body: "[]" }; }
        const d = (u.searchParams.get("datum") || "").replace(/^eq\./, "");
        return plaene[d] ? [plaene[d]] : [];
      }
    }), hoehe: 2000
  });
  await h.sichtbarMachen(s.page, "#train-sub-planung");
  await h.terminSetzen(s.page, datum);

  const r = await s.page.evaluate(async ({ datum }) => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    if (typeof tpVersatz !== "function") return { fehlt: "tpVersatz" };
    if (typeof tpFelderGruppen !== "function") return { fehlt: "tpFelderGruppen" };

    // ── Die Rechnung selbst: Ringtausch bei 2, 3 und 4 Gruppen ──────────────
    const g = n => ({ gruppen: Array.from({ length: n }, (_, i) => ({ name: "G" + (i + 1), emo: "•", kinder: ["K" + i] })) });
    const reihe = (n, v) => tpFelderGruppen(g(n), n, [], v).map(f => f.name).join(",");
    const rechnung = {
      zwei0: reihe(2, 0), zwei1: reihe(2, 1), zwei2: reihe(2, 2),
      drei1: reihe(3, 1), drei2: reihe(3, 2), drei3: reihe(3, 3),
      vier1: reihe(4, 1),
      minus: reihe(3, -1),
      ohneVersatz: tpFelderGruppen(g(3), 3, []).map(f => f.name).join(",")   // Aufruf wie vor v514
    };

    // ── Drei Hauptteile: der Versatz kommt aus der Blockfolge ────────────────
    tpSlots.length = 0;
    [{ label: "Ankommen", dauer: 8, typ: "warmup" },
     { label: "Stufe 1", dauer: 12, typ: "main" },
     { label: "Stufe 2", dauer: 12, typ: "main" },
     { label: "Stufe 3", dauer: 12, typ: "main" },
     { label: "Abschluss", dauer: 15, typ: "abschluss" }].forEach(x => tpSlots.push(x));
    await tgSync(); await warte(150);
    tpRenderTimeline(); await warte(150);
    const automatisch = tpSlots.map((x, i) => tpVersatz(i));

    // Was steht in der Zeitleiste? (die Zeile „⇄ … → Feld n")
    const zeileVon = si => {
      const alle = [...document.querySelectorAll(".tp-ringtausch")];
      return alle[si] ? alle[si].textContent.replace(/\s+/g, " ").trim() : "";
    };
    const zeilen0 = [zeileVon(0), zeileVon(1), zeileVon(2)];
    const knoepfe = [...document.querySelectorAll(".tp-ringtausch button")].map(b => b.textContent.trim());
    const knopfHoehe = Math.min(...[...document.querySelectorAll(".tp-ringtausch button")].map(b => Math.round(b.getBoundingClientRect().height)));

    // ── Der Knopf: einmal weiterrücken am zweiten Hauptteil (Slot 2) ─────────
    tpVersatzSetzen(2, 1); await warte(150);
    const nachKnopf = { versatz: tpVersatz(2), zeile: zeileVon(1), gespeichert: (tpSlots[2] || {}).versatz };
    // Und wieder zurück
    tpVersatzZurueck(2); await warte(150);
    const nachZurueck = { versatz: tpVersatz(2), eigen: (tpSlots[2] || {}).versatz };

    // ── Der Timer zeigt dieselbe Zuordnung ──────────────────────────────────
    const stationen = stTimerStations();
    const timerGruppen = stationen.map(x => (x.gruppen || []).join(" · "));
    // ohne Gruppen (Aufwärmen/Abschluss) darf nichts stehen
    const timerLeer = [stationen[0], stationen[4]].every(x => !(x.gruppen || []).length);
    return { rechnung, automatisch, zeilen0, knoepfe, knopfHoehe, nachKnopf, nachZurueck, timerGruppen, timerLeer };
  }, { datum });
  const fehler = s.fehler(); await s.schliessen();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt`); return h.ergebnis("Gruppen-Ringtausch", false, probleme); }

  // ── Die Rechnung ──────────────────────────────────────────────────────────
  const soll = {
    zwei0: "G1,G2", zwei1: "G2,G1", zwei2: "G1,G2",          // bei zwei Gruppen: Tausch, und wieder zurück
    drei1: "G2,G3,G1", drei2: "G3,G1,G2", drei3: "G1,G2,G3", // bei drei: Weiterrücken, nach drei Runden herum
    vier1: "G2,G3,G4,G1",
    minus: "G3,G1,G2",                                        // rückwärts bleibt im Ring
    ohneVersatz: "G1,G2,G3"                                   // alter Aufruf ohne Versatz ändert nichts
  };
  Object.keys(soll).forEach(k => {
    if (r.rechnung[k] !== soll[k]) probleme.push(`Ringtausch ${k}: ${r.rechnung[k]} statt ${soll[k]}`);
  });

  // ── Der automatische Versatz zählt nur Hauptteile ─────────────────────────
  if (r.automatisch.join(",") !== "0,0,1,2,3")
    probleme.push(`Automatischer Versatz ${r.automatisch.join(",")} statt 0,0,1,2,3 – gezählt werden nur die Hauptteile vor dem Block`);

  // ── Die Zeile in der Zeitleiste ───────────────────────────────────────────
  if (r.zeilen0.some(z => !z)) probleme.push("Nicht jeder Hauptteil zeigt, welche Gruppe an welchem Feld steht");
  if (!/🔵 Blau → Feld 1/.test(r.zeilen0[0])) probleme.push(`Erster Hauptteil: „${r.zeilen0[0]}“ – erwartet Blau an Feld 1`);
  if (!/🟢 Grün → Feld 1/.test(r.zeilen0[1])) probleme.push(`Zweiter Hauptteil: „${r.zeilen0[1]}“ – die Gruppen müssen weitergerückt sein`);
  if (!/🔴 Rot → Feld 1/.test(r.zeilen0[2])) probleme.push(`Dritter Hauptteil: „${r.zeilen0[2]}“ – erwartet Rot an Feld 1`);
  if (!r.knoepfe.some(t => /weiterrücken/.test(t))) probleme.push("Der Knopf „⇄ weiterrücken“ fehlt");
  if (r.knopfHoehe < 44) probleme.push(`Die Knöpfe am Block sind ${r.knopfHoehe} px hoch (mindestens 44)`);

  // ── Knopf und Zurücknehmen ────────────────────────────────────────────────
  if (r.nachKnopf.versatz !== 2) probleme.push(`Nach einmal „weiterrücken“ steht der Versatz auf ${r.nachKnopf.versatz} statt 2`);
  if (r.nachKnopf.gespeichert !== 2) probleme.push("Der Versatz wird nicht am Slot festgehalten – er ginge beim Speichern verloren");
  if (!/🔴 Rot → Feld 1/.test(r.nachKnopf.zeile)) probleme.push(`Nach dem Knopf steht dort „${r.nachKnopf.zeile}“`);
  if (r.nachZurueck.eigen !== undefined) probleme.push("„↩ automatisch“ löscht den eigenen Versatz nicht");
  if (r.nachZurueck.versatz !== 1) probleme.push(`Nach „↩ automatisch“ steht der Versatz auf ${r.nachZurueck.versatz} statt wieder auf 1`);
  if (!Object.keys(plaene).length) probleme.push("Der Ringtausch wird nicht gespeichert");
  else {
    const slots = (plaene[datum] || {}).slots || [];
    if (!slots.length) probleme.push("Im gespeicherten Plan stehen keine Phasen");
    /* Ein Plan, in dem NUR die Gruppen weitergerückt wurden, ist nicht leer – sonst
       hielte ihn die Schutzregel in tpPlanSave dafür und schriebe ihn nie. */
    const mitVersatz = slots.some(x => x.versatz != null);
    if (!mitVersatz) probleme.push("Der gespeicherte Plan trägt den Versatz nicht");
  }

  // ── Timer und Zeitleiste zeigen dasselbe ──────────────────────────────────
  if (!r.timerLeer) probleme.push("Der Timer zeigt Gruppen auch bei Aufwärmen oder Abschluss – dort gibt es keine");
  [1, 2, 3].forEach((si, k) => {
    const erwartet = ["🔵 Blau", "🟢 Grün", "🔴 Rot"][k];
    if (!r.timerGruppen[si] || r.timerGruppen[si].indexOf(erwartet + " → Feld 1") !== 0)
      probleme.push(`Der Timer zeigt für Hauptteil ${k + 1} „${r.timerGruppen[si]}“ statt „${erwartet} → Feld 1 …“ – Timer und Zeitleiste müssen dieselbe Zuordnung zeigen`);
  });
  if (fehler.length) probleme.push(...fehler.slice(0, 3));

  zeilen.push(`Ringtausch: 2 Gruppen ${r.rechnung.zwei0} → ${r.rechnung.zwei1} → ${r.rechnung.zwei2} · 3 Gruppen ${r.rechnung.drei1} / ${r.rechnung.drei2} / ${r.rechnung.drei3} · 4 Gruppen ${r.rechnung.vier1}`);
  zeilen.push(`Automatisch aus der Blockfolge: ${r.automatisch.join(",")} (nur Hauptteile zählen) · Knöpfe ${r.knoepfe.join(" / ")} · ${r.knopfHoehe} px`);
  zeilen.push(`Zeitleiste: ${r.zeilen0.map(z => z.split("⇄ weiterrücken")[0].replace(/^⇄\s*/, "").trim()).join(" | ")}`);
  zeilen.push(`Timer zeigt dieselbe Zuordnung: ${r.timerGruppen.filter(Boolean).map(x => x.split(" · ")[0]).join(" | ")}`);
  return h.ergebnis("Gruppen rücken von Block zu Block weiter", !probleme.length, zeilen.concat(probleme));
};
