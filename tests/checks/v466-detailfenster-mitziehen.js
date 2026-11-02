/* v466 – „ich kann hier die Anwesenheit der Trainer nicht ändern": im Termin-Detailfenster
   tat sich beim Tippen auf „Trainer dabei?" (und auf die Platz-Ampel) nichts. Der Server nahm
   die Aenderung an, aber neu gezeichnet wurde nur die Terminliste – und tmLoad() steigt ohne
   die Liste im DOM sofort wieder aus. Vom Startbildschirm aus ist sie nie da. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  /* v774: drei Tage voraus – unter 24 Stunden wäre der Grund Pflicht und das Grund-Fenster stünde vor „Fällt aus“. */
  const morgen = h.tagePlus(3);
  const s = await h.starten({ supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    termine: [{ id: 4711, datum: morgen, typ: "turnier", titel: "Kinderfestival", heim: true,
                uhrzeit: "10:15", ort: "Musterplatz 1", trainer_status: {} }]
  }), hoehe: 1600 });
  const r = await s.page.evaluate(async (morgen) => {
    await loadKader();
    // Terminliste bewusst NICHT im DOM – genau die Lage auf dem Startbildschirm.
    document.getElementById("tm-upcoming")?.remove();
    document.getElementById("tm-past")?.remove();
    TM_TERMINE = [{ id: 4711, datum: morgen, typ: "turnier", titel: "Kinderfestival",
                    heim: true, uhrzeit: "10:15", ort: "Musterplatz 1", trainer_status: {} }];
    tmDetailOpen(4711);
    const chip = n => [...document.querySelectorAll("#tmd-modal button")]
      .find(b => (b.textContent || "").trim().startsWith(n));
    const vorher = (chip("Charles") || {}).textContent;
    await tmTrainerToggle(4711, "Charles");           // offen → ja
    const nach1 = (chip("Charles") || {}).textContent;
    await tmTrainerToggle(4711, "Charles");           // ja → unsicher
    const nach2 = (chip("Charles") || {}).textContent;
    // Platz-Ampel im selben Fenster
    const ampel = [...document.querySelectorAll("#tmd-modal button")].find(b => /Fällt aus/.test(b.textContent || ""));
    let ampelNach = null;
    if (ampel) { await platzAmpelSet(4711, "abgesagt"); const a2 = [...document.querySelectorAll("#tmd-modal button")].find(b => /Fällt aus/.test(b.textContent || "")); ampelNach = a2 ? a2.style.background : null; }
    return { vorher: (vorher || "").trim(), nach1: (nach1 || "").trim(), nach2: (nach2 || "").trim(),
      ampelNach, offen: !!document.getElementById("tmd-modal"),
      gespeichert: (TM_TERMINE[0] || {}).trainer_status,
      knoepfe: [...document.querySelectorAll("#tmd-modal button")].map(b => (b.textContent || "").trim()).slice(0, 14) };
  }, morgen);
  const fehler = s.fehler(); await s.schliessen();
  if (!/Charles$/.test(r.vorher)) probleme.push(`Startzustand „${r.vorher}“, erwartet „Charles“ ohne Zeichen`);
  if (!/✓/.test(r.nach1)) probleme.push(`nach dem 1. Tippen „${r.nach1}“, erwartet „Charles ✓“ – das Fenster zieht nicht mit`);
  if (!/🤔/.test(r.nach2)) probleme.push(`nach dem 2. Tippen „${r.nach2}“, erwartet „Charles 🤔“`);
  if (!r.offen) probleme.push("Detailfenster ist nach dem Tippen zu");
  if (!r.ampelNach || /surface/.test(r.ampelNach)) probleme.push(`Platz-Ampel „Fällt aus“ bleibt unmarkiert (background ${r.ampelNach})`);
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`„${r.vorher}“ → „${r.nach1}“ → „${r.nach2}“ · Ampel-Hintergrund ${r.ampelNach} · Fenster offen ${r.offen}`);
  return h.ergebnis("Termin-Detailfenster zieht bei Trainer-Chips und Platz-Ampel mit", !probleme.length, zeilen.concat(probleme));
};
