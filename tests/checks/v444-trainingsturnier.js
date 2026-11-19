/* v444 – „ein Turnier als Trainingseinheit vorab planen und speichern": Tabelle
   trainingsturnier, an den Termin des Trainingsplans gebunden. Geraet A plant, Geraet B
   (leerer Speicher) findet es. Zwei Sicherungen: zwei Termine bleiben getrennt, ein
   LAUFENDES Turnier mit Ergebnissen verschwindet beim Terminwechsel nie. */
module.exports = async function (h) {
  const DB = {};
  const supabase = h.supabaseAttrappe({ trainingsturnier: (u, req) => {
    if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); DB[b.datum] = b.data; return { status: 201, body: "" }; }
    const eq = (u.searchParams.get("datum") || "").replace("eq.", "");
    return DB[eq] ? [{ data: DB[eq] }] : [];
  } });
  const FR = h.tagePlus(2), FR2 = h.tagePlus(9), MO2 = h.tagePlus(12), SPAETER = h.tagePlus(40);
  const warte = (p, ms) => p.evaluate(m => new Promise(r => setTimeout(r, m)), ms);
  const stand = p => p.evaluate(() => ({ datum: BLZ.datum, erstes: BLZ.teams[0].name, felder: BLZ.felder, teams: BLZ.teams.map(t => t.name + ":" + t.spieler.join(",")) }));
  const probleme = [], zeilen = [];

  // Geraet A plant vorab
  const a = await h.starten({ supabase });
  await h.terminSetzen(a.page, FR);
  await a.page.evaluate(async kinder => { window.KADER = kinder.map((n, i) => ({ id: i + 1, name: n, aktiv: true })); blitzOpen(); await blzAnzahl(4); BLZ.felder = 2; BLZ.spielform = "funino"; BLZ.teams[0].name = "Die Blauen"; blzSave(); }, h.KINDER);
  await warte(a.page, 1500);
  const planA = await stand(a.page);
  await a.schliessen();
  // Geraet B: leerer Speicher
  const b = await h.starten({ supabase });
  await h.terminSetzen(b.page, FR);
  await b.page.evaluate(kinder => { window.KADER = kinder.map((n, i) => ({ id: i + 1, name: n, aktiv: true })); blitzOpen(); }, h.KINDER);
  await warte(b.page, 1200);
  const planB = await stand(b.page);
  await b.schliessen();
  if (!DB[FR]) probleme.push(`nichts unter ${FR} gespeichert (Tabelle: ${Object.keys(DB).join(",") || "leer"})`);
  if (JSON.stringify(planA.teams) !== JSON.stringify(planB.teams) || planA.felder !== planB.felder) probleme.push(`Geraet B sieht etwas anderes: ${planB.teams.length} Teams, ${planB.felder} Felder, erstes Team „${planB.erstes}“ (A: ${planA.teams.length} Teams, ${planA.felder} Felder, „${planA.erstes}“)`);
  zeilen.push(`Geraet A → Tabelle → Geraet B: ${planB.teams.length} Teams, ${planB.felder} Felder, erstes Team „${planB.erstes}“`);

  // Sicherungen auf EINEM Geraet (gemeinsamer localStorage), je Schritt ein frischer Aufruf
  const g = await h.starten({ supabase, speicherBehalten: true });
  const besuch = async termin => { await g.page.reload({ waitUntil: "networkidle" }); await g.page.waitForTimeout(700);
    await g.page.evaluate(k => { window.sbToken = () => "attrappe"; window.sbAuthHeaders = x => ({ ...(x || {}), "Content-Type": "application/json" }); window.KADER = k.map((n, i) => ({ id: i + 1, name: n, aktiv: true })); }, h.KINDER);
    await h.terminSetzen(g.page, termin); };
  await besuch(FR2); await g.page.evaluate(() => { blitzOpen(); BLZ.teams[0].name = "FREITAG"; blzSave(); }); await warte(g.page, 1500);
  await besuch(MO2); await g.page.evaluate(() => blitzOpen()); await warte(g.page, 1200);
  await g.page.evaluate(() => { BLZ.teams[0].name = "MONTAG"; blzSave(); }); await warte(g.page, 1500);
  const montag = await stand(g.page);
  await besuch(FR2); await g.page.evaluate(() => blitzOpen()); await warte(g.page, 1200);
  const zurueck = await stand(g.page);
  await g.page.evaluate(() => { BLZ.teams[0].name = "LAEUFT"; BLZ.phase = "live"; BLZ.plan = [{ a: 0, b: 1, phase: "runde", ta: 3, tb: 1, slot: 0, feld: 1 }]; blzSave(); }); await warte(g.page, 1500);
  await besuch(SPAETER); await g.page.evaluate(() => blitzOpen()); await warte(g.page, 1200);
  const laufend = await g.page.evaluate(() => ({ erstes: BLZ.teams[0].name, phase: BLZ.phase, ergebnisse: (BLZ.plan || []).filter(x => x.ta != null).length }));
  await g.schliessen();
  if (montag.erstes !== "MONTAG" || zurueck.erstes !== "FREITAG") probleme.push(`Termine vermischt: Montag „${montag.erstes}“, zurueck auf Freitag „${zurueck.erstes}“`);
  if (laufend.erstes !== "LAEUFT" || laufend.ergebnisse !== 1) probleme.push(`laufendes Turnier nach Terminwechsel verloren: „${laufend.erstes}“, ${laufend.ergebnisse} Ergebnis(se)`);
  zeilen.push(`getrennte Termine: ${zurueck.erstes}/${montag.erstes} · laufendes Turnier bleibt: ${laufend.erstes} (${laufend.ergebnisse} Ergebnis)`);
  return h.ergebnis("Trainingsturnier: vorab planen, auf anderem Geraet finden, Termine getrennt", !probleme.length, zeilen.concat(probleme));
};
