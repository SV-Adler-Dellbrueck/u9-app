/* v537 – Paket B aus doku/auftrag-stationen: Vorlagen mit Stationen.

   Das Trainerteam arbeitet mit Stationen: mehrere Aufbauten, je Station ein Trainer,
   die Gruppen rücken weiter. Bisher konnte eine Vorlage nur EINE Übung je Block nennen.
   Das Schema adler-vorlagen/1 bekommt additiv `stationen`.

   Geprüft werden die Abnahmekriterien 4 bis 6 plus die Regeln des Pakets:
   4) Drei Stationen, drei Feldtrainer → drei Felder, je eine eigene Übung.
   5) Dieselbe Vorlage bei zwei Feldtrainern → zwei Felder, die dritte Station entfällt,
      und die Vorschau sagt das vorher.
   6) Eine Station mit rolle "tw" wird ein paralleler Torwart-Block, kein Feld.
   7) Prüfung vor dem Schreiben: `uebung_name` UND `stationen` zusammen ist ein Fehler,
      eine unbekannte Übung in einer Station ebenso, eine unpassende Kategorie ebenso.
   8) Bestehende Vorlagen ohne `stationen` bleiben gültig. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const datum = h.tagePlus(5);

  /* „Übernehmen" schreibt den Plan und liest ihn sofort wieder vom Server. Die Attrappe
     muss ihn deshalb merken – sonst käme eine leere Antwort zurück und der Plan stünde
     wieder auf der Standard-Einheit. Der Rundlauf ist hier genau das, was geprüft wird. */
  let gespeichert = null;
  const s = await h.starten({ hoehe: 2400, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    termine: [{ id: 88, datum, typ: "training", trainer_status: { Charles: "ja", Peter: "ja", Kenneth: "ja" } }],
    trainingsvorlagen: [],
    trainingsplan: (u, req) => {
      if (req.method() === "POST") { try { gespeichert = JSON.parse(req.postData() || "null"); } catch (e) {} return { status: 201, body: "[]" }; }
      if (!gespeichert) return [];
      if (/select=slots/.test(u.search)) return [{ slots: gespeichert.slots || [] }];
      if (/select=plan/.test(u.search)) return [{ plan: gespeichert.plan || [] }];
      return [gespeichert];
    }
  }) });
  await h.sichtbarMachen(s.page, "#tp-timeline");

  const r = await s.page.evaluate(async ({ datum }) => {
    await loadKader();
    const out = {};
    const alle = tpAllForms();
    // Drei Übungen, die in einen Hauptteil passen, plus eine Torwart-Übung
    const haupt = alle.filter(f => !["aufwaermen", "torwart", "individual"].includes(f.kat)).slice(0, 3).map(f => f.name);
    const tw = (alle.find(f => f.kat === "torwart") || {}).name || null;
    out.haupt = haupt; out.tw = tw;

    const vorlage = (stationen) => ({
      schema: "adler-vorlagen/1", vorlagen: [{
        name: "Stationen-Probe", leitfrage: "Wie behalten wir den Ball?",
        bloecke: [{ typ: "spielform", label: "Stufe 1", dauer: 11, stationen }]
      }]
    });

    // 7) Prüfung vor dem Schreiben
    out.beides = _evPruefung(JSON.stringify({ schema: "adler-vorlagen/1", vorlagen: [{ name: "X",
      bloecke: [{ typ: "spielform", label: "S", dauer: 10, uebung_name: haupt[0], stationen: [{ uebung_name: haupt[1] }] }] }] })).fehler;
    out.leer = _evPruefung(JSON.stringify(vorlage([]))).fehler;
    out.unbekannt = _evPruefung(JSON.stringify(vorlage([{ uebung_name: "Gibt es nicht" }]))).fehler;
    out.falscheRolle = _evPruefung(JSON.stringify(vorlage([{ uebung_name: haupt[0], rolle: "quatsch" }]))).fehler;
    out.ohneNamen = _evPruefung(JSON.stringify(vorlage([{ rolle: "tw" }]))).fehler;
    const dreiPlusTw = [{ uebung_name: haupt[0] }, { uebung_name: haupt[1] }, { uebung_name: haupt[2] }].concat(tw ? [{ uebung_name: tw, rolle: "tw" }] : []);
    out.gut = _evPruefung(JSON.stringify(vorlage(dreiPlusTw))).fehler;
    // 8) Bestand bleibt gültig
    out.altbestand = _evPruefung(JSON.stringify({ schema: "adler-vorlagen/1", vorlagen: [{ name: "Alt",
      leitfrage: "Wie behalten wir den Ball?",
      bloecke: [{ typ: "spielform", label: "S", dauer: 10, uebung_name: haupt[0] }] }] })).fehler;

    // 4)+6) Übernehmen bei drei Feldtrainern
    VORLAGEN.length = 0;
    VORLAGEN.push({ id: 1, name: "Stationen-Probe", leitfrage: "", tags: [], skalierung: {},
      bloecke: [{ typ: "spielform", label: "Stufe 1", dauer: 11, stationen: dreiPlusTw }] });
    _vuAuswahl = 1;
    const feld = document.getElementById("tp-date");
    if (feld && ![...feld.options].some(o => o.value === datum)) feld.add(new Option(datum, datum));
    if (feld) feld.value = datum;
    await tpTrainerRsvpLaden(datum);
    out.trainer = tpGetCheckedTrainers().slice();
    // 5) Hinweis in der Vorschau, wenn die Felder nicht reichen
    out.hinweisDrei = _evStationenHinweis(VORLAGEN[0], 3);
    out.hinweisZwei = _evStationenHinweis(VORLAGEN[0], 2);
    out.blockText = _evBlockText(VORLAGEN[0].bloecke[0]);

    await vorlageUebernehmenSetzen();
    await new Promise(r => setTimeout(r, 400));
    out.slotTypen = tpSlots.map(x => ({ label: x.label, typ: x.typ, parallelZu: x.parallelZu }));
    const werte = si => [...document.querySelectorAll(`.tp-form-sel[id^="tp-form-${si}-"]`)].map(x => x.value);
    out.felderStufe1 = werte(0);
    out.twSlot = tpSlots.findIndex(x => x.typ === "tw");
    out.twWert = out.twSlot >= 0 ? werte(out.twSlot) : null;
    return out;
  }, { datum });

  const fehler = s.fehler();
  await s.schliessen();
  // Was wurde überhaupt geschrieben? Hilft, wenn die Übernahme nichts tut.
  r.gespeichertePlanlaenge = gespeichert && gespeichert.plan ? gespeichert.plan.length : 0;

  // 7) Prüfung
  if (!r.beides.some(f => /zusammen/.test(f))) probleme.push(`„uebung_name“ und „stationen“ zusammen wird nicht abgewiesen: ${JSON.stringify(r.beides)}`);
  if (!r.leer.length) probleme.push("eine leere Stationen-Liste wird nicht abgewiesen");
  if (!r.unbekannt.some(f => /gibt es nicht/i.test(f))) probleme.push(`eine unbekannte Übung in einer Station wird nicht benannt: ${JSON.stringify(r.unbekannt)}`);
  if (!r.falscheRolle.some(f => /rolle/i.test(f))) probleme.push(`eine unbekannte Rolle wird nicht abgewiesen: ${JSON.stringify(r.falscheRolle)}`);
  if (!r.ohneNamen.some(f => /uebung_name/.test(f))) probleme.push(`eine Station ohne Übung wird nicht abgewiesen: ${JSON.stringify(r.ohneNamen)}`);
  if (r.gut.length) probleme.push(`eine gültige Vorlage mit Stationen wird abgewiesen: ${JSON.stringify(r.gut)}`);
  // 8) Bestand
  if (r.altbestand.length) probleme.push(`eine bestehende Vorlage ohne Stationen wird abgewiesen: ${JSON.stringify(r.altbestand)}`);

  // 5) Hinweis
  if (r.hinweisDrei) probleme.push(`bei drei Feldern erscheint ein Hinweis, obwohl es reicht: „${r.hinweisDrei}“`);
  if (!/3 Stationen geplant, 2 Felder verfügbar/.test(r.hinweisZwei || "")) probleme.push(`der Hinweis bei zwei Feldern lautet „${r.hinweisZwei}“`);
  if (!/1\./.test(r.blockText || "")) probleme.push(`die Vorschau listet die Stationen nicht: „${r.blockText}“`);
  if (r.tw && !/Torwart, parallel/.test(r.blockText || "")) probleme.push(`die Torwart-Station wird in der Vorschau nicht als solche benannt: „${r.blockText}“`);

  // 4) drei Felder, je eine eigene Übung
  if (String(r.trainer) !== "Charles,Peter,Kenneth" && r.trainer.length !== 3) probleme.push(`Feldtrainer [${r.trainer}] (erwartet drei)`);
  const f1 = r.felderStufe1 || [];
  if (f1.length !== 3) probleme.push(`Stufe 1 hat ${f1.length} Felder (erwartet 3)`);
  if (f1.some(x => !x)) probleme.push(`ein Feld blieb leer: [${f1}]`);
  if (new Set(f1).size !== f1.length) probleme.push(`die Felder tragen nicht drei verschiedene Übungen: [${f1}]`);

  // 6) tw-Station als paralleler Block
  if (r.tw) {
    if (r.twSlot < 0) probleme.push("die Torwart-Station wurde kein eigener Block");
    else {
      const slot = (r.slotTypen || [])[r.twSlot] || {};
      if (slot.parallelZu !== 0) probleme.push(`der Torwart-Block hängt nicht parallel am Hauptteil (parallelZu=${slot.parallelZu})`);
      if (!(r.twWert || []).some(Boolean)) probleme.push("der Torwart-Block trägt keine Übung");
    }
    if (f1.length > 3) probleme.push("die Torwart-Station wurde als zusätzliches Feld gezählt");
  }

  if (fehler.length) probleme.push(...fehler.slice(0, 2));

  zeilen.push(`Prüfung: beides ${r.beides.length}, leer ${r.leer.length}, unbekannt ${r.unbekannt.length}, Rolle ${r.falscheRolle.length}, gültig ${r.gut.length}, Bestand ${r.altbestand.length}`);
  zeilen.push(`Vorschau: „${(r.blockText || "").slice(0, 80)}“ · Hinweis bei 2 Feldern: „${r.hinweisZwei}“`);
  zeilen.push(`Übernahme: ${r.gespeichertePlanlaenge} Plan-Einträge geschrieben · Felder [${f1}] · Slots ${JSON.stringify((r.slotTypen || []).map(x => x.typ))}`);

  return h.ergebnis("Vorlagen mit Stationen: eigene Übung je Feld, Torwart parallel", !probleme.length, zeilen.concat(probleme));
};
