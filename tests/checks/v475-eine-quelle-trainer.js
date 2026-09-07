/* v475 – PO: „Eigentlich müsste doch eine Quelle vorgegeben werden, wo ich als Trainer
   angebe, ob ich da bin, und dann müssten sich diese Ergebnisse in die weiteren
   Unterbereiche automatisch einpflegen … Dann muss es noch eine Möglichkeit geben, das
   händisch zu ändern." Befund vom 07.09.: fuer den 11.09. war eine Anwesenheit im Voraus
   gespeichert – der Plan folgte ihr und ignorierte ab da die Rueckmeldungen; der Sprung
   aus der Vorausplanung liess Chips und Quelle vom vorherigen Tag stehen.
   Geprueft: kuenftiger Tag folgt den Rueckmeldungen trotz gespeicherter Anwesenheit,
   „keine Antwort" traegt ein ?, Antippen schreibt die Rueckmeldung (PATCH termine),
   die Anwesenheits-Chips eines kuenftigen Tages spiegeln die Rueckmeldung und schreiben
   sie zurueck, der Vorausplanungs-Sprung laedt Chips und Quelle des neuen Tages. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const morgen = h.tagePlus(1), uebermorgen = h.tagePlus(2);
  const termine = [
    { id: 11, datum: morgen, typ: "training", uhrzeit: "16:45", trainer_status: { Peter: "ja", Markus: "ja", Charles: "ja", Kenneth: "nein" } },
    { id: 12, datum: uebermorgen, typ: "training", uhrzeit: "16:45", trainer_status: { Finn: "ja" } }
  ];
  // Die Attrappe filtert nicht – hier muss sie, sonst kommt fuer uebermorgen der Termin von morgen.
  const termineGefiltert = u => termine.filter(t => {
    const d = (u.searchParams.get("datum") || "").replace(/^eq\./, ""), id = (u.searchParams.get("id") || "").replace(/^eq\./, "");
    return (!d || t.datum === d) && (!id || String(t.id) === id);
  });
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: termineGefiltert, trainingsplan: [] }), hoehe: 1800 });
  const r = await s.page.evaluate(async ({ morgen, uebermorgen }) => {
    await loadKader();
    const warte = ms => new Promise(r => setTimeout(r, ms));
    Object.keys(AW_DATA).forEach(k => delete AW_DATA[k]);
    // Genau die Lage vom 07.09.: fuer morgen liegt eine im Voraus gespeicherte Anwesenheit
    AW_DATA[morgen] = { _trainers: ["Charles", "Finn", "Peter", "Markus"] };
    const mk = (id, tag) => { let el = document.getElementById(id); if (!el) { el = document.createElement(tag || "div"); el.id = id; document.body.appendChild(el); } return el; };
    mk("tp-trainer-checks"); mk("tp-trainer-quelle"); mk("aw-trainer-quelle");
    const d = mk("tp-date", "select"); d.innerHTML = `<option value="${morgen}">${morgen}</option><option value="${uebermorgen}">${uebermorgen}</option>`; d.value = morgen;
    // 1) Plan fuer morgen
    if (typeof tpTrainerRsvpLaden !== "function") return { fehlt: "tpTrainerRsvpLaden" };
    await tpTrainerRsvpLaden(morgen);
    const box = document.getElementById("tp-trainer-checks");
    const haken = () => [...box.querySelectorAll("input")].filter(i => i.checked).map(i => i.value).sort();
    const planHaken = haken();
    const planQuelle = document.getElementById("tp-trainer-quelle").textContent.replace(/\s+/g, " ").trim();
    const finnChip = [...box.querySelectorAll("label")].find(l => /Finn/.test(l.textContent));
    const finnMarke = finnChip ? finnChip.textContent.replace(/\s+/g, " ").trim() : "";
    // 2) Antippen: Kenneth kommt doch → Rueckmeldung „ja" am Termin 11
    if (typeof tpTrainerManuell === "function") await tpTrainerManuell("Kenneth", true);
    await warte(200);
    const nachTipp = haken();
    // 3) Anwesenheit fuer morgen: Chips spiegeln die Rueckmeldung, nicht die gespeicherte Liste
    const awDate = mk("aw-date", "select"); awDate.innerHTML = `<option value="${morgen}">${morgen}</option>`; awDate.value = morgen;
    const awBox = mk("aw-trainer-checks");
    awBox.innerHTML = (TRAINER || []).map(t => `<label><input type="checkbox" value="${t}" onchange="awTrainerToggle(this)"><span>${t}</span></label>`).join("");
    mk("aw-list");
    if (typeof awLoad === "function") awLoad();
    await warte(400);
    const awHaken = [...awBox.querySelectorAll("input")].filter(i => i.checked).map(i => i.value).sort();
    const awQuelle = document.getElementById("aw-trainer-quelle").textContent.replace(/\s+/g, " ").trim();
    // Kenneth in der Anwesenheit abhaken → schreibt die Rueckmeldung „nein"
    const cbK = [...awBox.querySelectorAll("input")].find(i => i.value === "Kenneth");
    if (cbK) { cbK.checked = false; if (typeof awTrainerToggle === "function") await awTrainerToggle(cbK); }
    await warte(200);
    // 4) Vorausplanungs-Sprung auf uebermorgen: Chips und Quelle wechseln mit
    if (typeof tpVorplanJump === "function") tpVorplanJump(uebermorgen);
    await warte(500);
    const sprungHaken = haken(), sprungDatum = document.getElementById("tp-date").value;
    return { planHaken, planQuelle, finnMarke, nachTipp, awHaken, awQuelle, sprungHaken, sprungDatum };
  }, { morgen, uebermorgen });
  const fehler = s.fehler();
  const patches = s.gesendet.filter(g => g.methode === "PATCH" && /termine/.test(g.pfad));
  await s.schliessen();
  if (r.fehlt) { probleme.push(`Funktion ${r.fehlt} fehlt`); return h.ergebnis("Eine Quelle für die Trainer-Anwesenheit", false, probleme); }
  if (JSON.stringify(r.planHaken) !== JSON.stringify(["Charles", "Markus", "Peter"])) probleme.push(`Plan für morgen folgt nicht den Rückmeldungen: ${JSON.stringify(r.planHaken)} (gespeicherte Anwesenheit im Voraus darf nicht zählen)`);
  if (!/Rückmeldung/.test(r.planQuelle)) probleme.push(`Quelle im Plan: „${r.planQuelle}“`);
  if (!/\?/.test(r.finnMarke)) probleme.push(`„keine Antwort“ ohne Zeichen: „${r.finnMarke}“`);
  const p1 = patches.find(p => /id=eq\.11/.test(p.suche || "") && p.body && p.body.trainer_status && p.body.trainer_status.Kenneth === "ja");
  if (!p1) probleme.push(`Antippen im Plan schreibt keine Rückmeldung „ja“ für Kenneth an Termin 11 (${patches.length} PATCHes: ${JSON.stringify(patches.map(p => [p.suche, p.body && p.body.trainer_status]))})`);
  if (!r.nachTipp.includes("Kenneth")) probleme.push(`nach dem Tipp ist Kenneth nicht angehakt: ${JSON.stringify(r.nachTipp)}`);
  // Die Attrappe merkt sich PATCHes nicht – die Rueckmeldung bleibt Charles/Markus/Peter; entscheidend: NICHT die gespeicherte Liste mit Finn
  if (JSON.stringify(r.awHaken) !== JSON.stringify(["Charles", "Markus", "Peter"])) probleme.push(`Anwesenheits-Chips für morgen zeigen ${JSON.stringify(r.awHaken)} statt der Rückmeldungen`);
  if (!/Rückmeldung/.test(r.awQuelle)) probleme.push(`Quelle in der Anwesenheit: „${r.awQuelle}“`);
  const p2 = patches.find(p => /id=eq\.11/.test(p.suche || "") && p.body && p.body.trainer_status && p.body.trainer_status.Kenneth === "nein");
  if (!p2) probleme.push("Abhaken in der Anwesenheit (künftiger Tag) schreibt keine Rückmeldung „nein“");
  if (r.sprungDatum !== uebermorgen) probleme.push(`Sprung setzt das Datum nicht (${r.sprungDatum})`);
  if (JSON.stringify(r.sprungHaken) !== JSON.stringify(["Finn"])) probleme.push(`nach dem Sprung auf übermorgen stehen die Chips noch vom Vortag: ${JSON.stringify(r.sprungHaken)}`);
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Plan morgen: ${JSON.stringify(r.planHaken)} · „${r.planQuelle}“ · Finn „${r.finnMarke}“`);
  zeilen.push(`Tipp Kenneth → ${JSON.stringify(r.nachTipp)} · PATCHes ${patches.length}`);
  zeilen.push(`Anwesenheit morgen: ${JSON.stringify(r.awHaken)} · „${r.awQuelle}“`);
  zeilen.push(`Sprung: ${r.sprungDatum} → ${JSON.stringify(r.sprungHaken)}`);
  return h.ergebnis("Eine Quelle für die Trainer-Anwesenheit: Rückmeldung gilt, Antippen schreibt zurück, Sprung lädt den Tag", !probleme.length, zeilen.concat(probleme));
};
