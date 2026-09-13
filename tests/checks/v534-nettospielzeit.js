/* v534 – Paket 3: Nettospielzeit und Blocktypen (doku/auftrag-adler-luecken).

   Die Trainingsphilosophie Deutschland rechnet in Nettospielzeit: mindestens 48 Minuten
   pro Woche für U8 bis U16. Bis hierher liefen Spielform und Übungsform beide als
   Blocktyp „main" – die App konnte die Zahl gar nicht bilden.

   Geprüft werden die Abnahmekriterien des Pakets:
   1) Eine bestehende Vorlage mit „main" lädt unverändert und zählt als Spielform.
   2) „uebungsform" lädt, erscheint im Plan und ist erkennbar – nicht allein über Farbe.
   3) Nettozeit = Summe der Spielform-Blöcke; Übungsform, Warm-up und Abschluss nicht.
   4) Der Wochenstand summiert die Einheiten der Kalenderwoche gegen den Richtwert.
   5) Unter dem Richtwert erscheint der Hinweis, darüber kein Lob.
   6) Der Richtwert kommt aus der Team-Konfiguration und ist ohne Codeänderung änderbar.
   7) Import: „uebungsform" wird angenommen, ein unbekannter Typ abgewiesen – und zwar
      BEVOR etwas geschrieben wird.

   Dazu der Umbau, ohne den nichts davon trägt: ein Block vom Typ „spielform" oder
   „uebungsform" muss dieselbe Planungsmechanik bekommen wie „main" – Gruppen auf
   Felder, Trainer je Station, Ringtausch. Vorher hing das an der Zeichenkette „main". */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const heute = h.heute();
  // Montag dieser Woche, damit die Spanne sicher in dieselbe Kalenderwoche fällt
  const d = new Date(heute + "T00:00:00");
  const montag = new Date(d); montag.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const iso = x => x.toISOString().slice(0, 10);
  const tagA = iso(montag), tagB = iso(new Date(montag.getTime() + 2 * 864e5));

  const s = await h.starten({ warten: 900, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    team_config: [{ id: 1, uebung_meta: {}, uebung_art: {}, netto_richtwert: 48 }],
    // Zweite Einheit derselben Woche: 20 Minuten Spielform
    trainingsplan: [{ datum: tagB, slots: [
      { label: "Warm-up",   typ: "warmup",     dauer: 10 },
      { label: "Spielform", typ: "spielform",  dauer: 20 }
    ] }]
  }) });

  const r = await s.page.evaluate(async ({ tagA }) => {
    const out = {};
    await uebungMetaLoad();

    // ── Umbau: tragen die neuen Typen die Planungsmechanik? ─────────────────────
    tpSlots.length = 0;
    tpSlots.push({ label: "Warm-up",    dauer: 15, farbe: "#059669", typ: "warmup" });
    tpSlots.push({ label: "Spielform",  dauer: 30, farbe: "#1a56db", typ: "spielform" });
    tpSlots.push({ label: "Übungsform", dauer: 15, farbe: "#7c3aed", typ: "uebungsform" });
    tpSlots.push({ label: "Hauptteil",  dauer: 30, farbe: "#1a56db", typ: "main" });
    document.querySelectorAll("#tp-trainer-checks input").forEach((c, i) => { if (i < 2) c.checked = true; });
    tpRenderTimeline();
    const slots = [...document.querySelectorAll(".tp-slot")];
    slots.forEach(sl => sl.querySelectorAll("select.tp-form-sel").forEach(sel => { tpCoaches[sel.id] = "Charles"; sel.value = "0"; }));
    out.zuordnung = tpSlotsMitZuordnung().map(x => ({ typ: x.typ, coaches: !!x.coaches }));

    // 2) Kennzeichnung im Plan, nicht allein über Farbe
    out.kopfSpielform  = slots[1] ? slots[1].querySelector(".tp-slot-label").textContent.replace(/\s+/g, " ").trim() : "";
    out.kopfUebungsform = slots[2] ? slots[2].querySelector(".tp-slot-label").textContent.replace(/\s+/g, " ").trim() : "";
    out.kopfMain        = slots[3] ? slots[3].querySelector(".tp-slot-label").textContent.replace(/\s+/g, " ").trim() : "";

    // 1)+3) Nettozeit: Spielform 30 + Hauptteil 30 = 60, Warm-up und Übungsform nicht
    out.netto = tpNettoMinuten(tpSlots);
    // Testfall des Pakets: Warm-up 15, Übungsform 15, Spielform 30 → 30, nicht 60
    out.nettoBeispiel = tpNettoMinuten([
      { typ: "warmup", dauer: 15 }, { typ: "uebungsform", dauer: 15 }, { typ: "spielform", dauer: 30 }
    ]);
    // „main" und „spielform" ergeben dieselbe Zahl
    out.nettoMain  = tpNettoMinuten([{ typ: "main", dauer: 24 }]);
    out.nettoSpiel = tpNettoMinuten([{ typ: "spielform", dauer: 24 }]);
    // Abschluss zählt nicht (Abnahme 3)
    out.nettoAbschluss = tpNettoMinuten([{ typ: "abschluss", dauer: 20 }]);

    // 6) Richtwert aus der Team-Konfiguration
    out.richtwert = tpNettoRichtwert();

    // 4)+5) Wochenstand: diese Einheit + die zweite aus der Attrappe
    const datumFeld = document.getElementById("tp-date");
    if (datumFeld) {
      if (![...datumFeld.options].some(o => o.value === tagA)) datumFeld.add(new Option(tagA, tagA));
      datumFeld.value = tagA;
    }
    // unter dem Richtwert: 2×20 Minuten
    tpSlots.length = 0;
    tpSlots.push({ label: "Spielform", dauer: 20, farbe: "#1a56db", typ: "spielform" });
    out.wocheWenig = await tpWocheNetto(tagA);
    await tpNettoRender();
    out.textWenig = (document.getElementById("tp-netto") || {}).textContent.replace(/\s+/g, " ").trim();
    // auf dem Richtwert: 28 + 20 = 48
    tpSlots[0].dauer = 28;
    out.wocheGenug = await tpWocheNetto(tagA);
    await tpNettoRender();
    out.textGenug = (document.getElementById("tp-netto") || {}).textContent.replace(/\s+/g, " ").trim();
    out.knopfRichtwert = !!document.querySelector('#tp-netto button[onclick*="tpRichtwertAendern"]');

    // 7) Import
    out.typenBekannt = EI_TYPEN.slice();
    return out;
  }, { tagA });

  await s.page.waitForTimeout(150);
  const fehler = s.fehler();
  await s.schliessen();

  // Umbau
  const zu = r.zuordnung || [];
  const findeTyp = t => (zu.find(x => x.typ === t) || {}).coaches;
  if (findeTyp("spielform") !== true) probleme.push("ein Block vom Typ „spielform“ speichert seine Trainerzuordnung nicht – dieselbe Falle wie vor dem Umbau");
  if (findeTyp("uebungsform") !== true) probleme.push("ein Block vom Typ „uebungsform“ speichert seine Trainerzuordnung nicht");
  if (findeTyp("main") !== true) probleme.push("„main“ hat seine Trainerzuordnung verloren – der Bestand darf sich nicht ändern");

  // 2) erkennbar, nicht nur farbig
  if (!/Spielform/.test(r.kopfSpielform || "")) probleme.push(`Spielform-Block ohne Wortmarke: „${r.kopfSpielform}“`);
  if (!/Übungsform/.test(r.kopfUebungsform || "")) probleme.push(`Übungsform-Block ohne Wortmarke: „${r.kopfUebungsform}“`);
  if (/Spielform|Übungsform/.test(r.kopfMain || "")) probleme.push(`ein „main“-Block behauptet etwas: „${r.kopfMain}“ – Bestand ist keine Aussage des Trainers`);

  // 1)+3) Nettozeit
  if (r.netto !== 60) probleme.push(`Nettozeit ${r.netto} Min. (erwartet 60 – Spielform 30 + main 30, ohne Warm-up und Übungsform)`);
  if (r.nettoBeispiel !== 30) probleme.push(`Testfall des Pakets: ${r.nettoBeispiel} Min. (erwartet 30, nicht 60)`);
  if (r.nettoMain !== r.nettoSpiel) probleme.push(`„main“ (${r.nettoMain}) und „spielform“ (${r.nettoSpiel}) ergeben nicht dieselbe Zahl`);
  if (r.nettoAbschluss !== 0) probleme.push(`der Abschluss zählt mit (${r.nettoAbschluss} Min.) – laut Abnahme 3 zählt er nicht`);

  // 4)+5)+6) Woche und Richtwert
  if (r.richtwert !== 48) probleme.push(`Richtwert ${r.richtwert} (erwartet 48 aus der Team-Konfiguration)`);
  if (r.wocheWenig !== 40) probleme.push(`Wochenstand ${r.wocheWenig} Min. (erwartet 40 = 20 offen + 20 gespeichert)`);
  if (r.wocheGenug !== 48) probleme.push(`Wochenstand ${r.wocheGenug} Min. (erwartet 48 = 28 offen + 20 gespeichert)`);
  if (!/Diese Woche 40 von 48/.test(r.textWenig || "")) probleme.push(`unter dem Richtwert fehlt der Hinweis: „${(r.textWenig || "").slice(0, 120)}“`);
  if (/Diese Woche \d+ von/.test(r.textGenug || "")) probleme.push(`auf dem Richtwert steht der Mahn-Satz trotzdem: „${(r.textGenug || "").slice(0, 120)}“`);
  if (/super|stark|geschafft|👏|🎉|✅/i.test(r.textGenug || "")) probleme.push(`es wird gelobt, wenn die Woche reicht: „${(r.textGenug || "").slice(0, 120)}“`);
  if (!/Spielform: 20 Minuten/.test(r.textWenig || "")) probleme.push(`die Zahl der Einheit fehlt: „${(r.textWenig || "").slice(0, 120)}“`);
  if (!r.knopfRichtwert) probleme.push("der Richtwert lässt sich nicht ohne Codeänderung ändern – kein Knopf dafür");

  // 7) Import
  ["spielform", "uebungsform", "main"].forEach(t => {
    if (!(r.typenBekannt || []).includes(t)) probleme.push(`der Import kennt den Typ „${t}“ nicht`);
  });
  if ((r.typenBekannt || []).includes("quatsch")) probleme.push("der Import nimmt beliebige Typen an");

  if (fehler.length) probleme.push(...fehler.slice(0, 2));

  zeilen.push(`Zuordnung gespeichert: ${zu.map(x => x.typ + " " + x.coaches).join(" · ")}`);
  zeilen.push(`Netto: Einheit ${r.netto} · Paket-Beispiel ${r.nettoBeispiel} · main ${r.nettoMain} = spielform ${r.nettoSpiel} · Abschluss ${r.nettoAbschluss}`);
  zeilen.push(`Woche: ${r.wocheWenig}/${r.richtwert} → „${(r.textWenig || "").slice(0, 70)}“`);
  zeilen.push(`Woche voll: ${r.wocheGenug}/${r.richtwert} → „${(r.textGenug || "").slice(0, 70)}“`);

  return h.ergebnis("Nettospielzeit: Blocktypen tragen, Einheit zählt, Woche erinnert leise", !probleme.length, zeilen.concat(probleme));
};
