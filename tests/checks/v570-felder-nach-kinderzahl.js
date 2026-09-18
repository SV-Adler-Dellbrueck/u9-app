/* v570 – Die Zahl der Felder folgt der Kinderzahl, nicht allein der Trainerzahl.

   Befund des PO am 18.09., mit Bildschirmfoto: L4-8 übernommen, dreizehn Kinder eingetragen,
   zwei Feldtrainer angehakt – im Plan standen ZWEI Stationen statt drei, und daneben meldete
   die App „2 Gruppen liegen über der Zielgröße von 6 Kindern“. Sie wusste also, dass die
   Gruppen zu groß sind, und ließ trotzdem die dritte Station fallen. Seine Entscheidung:
   „Auch wenn es nicht genug Trainer für jede Station gibt, besser als wenn Kinder in der
   Warteschlange stehen müssen.“

   Seit v570 entscheidet der Bedarf (`tgBedarf`): Stationen der Einheit, angehakte Trainer und
   Kinderzahl (höchstens sechs je Gruppe), nach unten begrenzt durch die Kinderzahl selbst
   (mindestens vier je Gruppe – darunter ist keine Spielform spielbar). Reicht eine bestehende
   Aufteilung nicht, wird eine Gruppe ABGESPALTEN statt neu gemischt: die übrigen behalten
   Kinder, Namen und Trainer.

   Fälle:
   a) Die Rechnung selbst, gegen die Skalierungszeilen von L4-8: 8 → zwei Felder, 10 → zwei,
      12 → drei, 13 → drei, 14 → drei. Die Trainerzahl bleibt dabei unangetastet: wer drei
      Feldtrainer anhakt, bekommt drei Gruppen wie eh und je (v536).
   b) Abspalten: aus 7/6 wird 5/4/4; Name und Trainer der bestehenden Gruppen bleiben, ein von
      Hand verschobenes Kind bleibt, wo es ist.
   c) Der echte Fall: 13 Kinder, zwei Feldtrainer, L4-8 übernehmen → drei Gruppen, drei Felder
      mit drei VERSCHIEDENEN Übungen.
   d) Zwei Stationen, 13 Kinder: drei Felder, Feld 3 wiederholt Station 1 (PO-Entscheidung
      „Station wiederholen“) – so wartet niemand.
   e) Reichen die Kinder nicht (8 Kinder, drei Stationen): zwei Felder wie bisher, und der
      Block sagt, warum – mit der Zahl, die es bräuchte.
   f) Stellt der Trainer von Hand weniger Gruppen ein, als die Einheit braucht, steht am Block
      der Knopf „👥 3 Gruppen bilden“. */
const L48 = "L4-8", L46 = "L4-6";
const A = "2 gegen 1 plus Torwart – der Flitzer macht es breit";
const F1 = "FUNiño 3 gegen 1 – der Mittlere hat den Ball";
const FW = "FUNiño 3 gegen 2 mit Wandspieler – links, Mitte, rechts";
const ADLER = "3+1 gegen 2 – Adler aus dem Tor";

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");
  const vor = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8"));
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));

  /* Dreizehn Kinder wie beim PO: die übrigen des Prüfkaders stehen auf inaktiv und zählen
     damit weder in `_tgPool` noch in der Rechnung. */
  const inaktiv = h.KINDER.slice(13);
  const datum = h.tagePlus(2);
  const gruppen = [
    { name: "Blaue Haie", emo: "🔵", kinder: h.KINDER.slice(0, 7), trainer: "Charles" },
    { name: "Rote Füchse", emo: "🔴", kinder: h.KINDER.slice(7, 13), trainer: "Finn" }
  ];
  const custom = (bib.uebungen || []).map((u, i) => ({ ...u, id: 6000 + i, custom: true }));
  const rows = (vor.vorlagen || []).map((v, i) => ({ ...v, id: 500 + i }));
  const plaene = {}, gruppenPosts = [];
  const s = await h.starten({
    hoehe: 2600,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen({ inaktiv }), nominierungen: [], anwesenheit: [],
      termine: [{ id: 91, datum, typ: "training", trainer_status: { Charles: "ja", Finn: "ja" } }],
      trainingsformen: custom,
      trainingsvorlagen: rows,
      trainingsgruppen: (u, req) => {
        if (req.method() === "POST") { gruppenPosts.push(JSON.parse(req.postData() || "{}")); return { status: 201, body: "[]" }; }
        return [{ datum, gruppen, aus_anwesenheit: false }];
      },
      trainingsplan: (u, req) => {
        if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); plaene[b.datum] = b; return { status: 201, body: "[]" }; }
        const d = (u.searchParams.get("datum") || "").replace(/^eq\./, "");
        const p = plaene[d]; if (!p) return [];
        if (/select=slots/.test(u.search) && !/plan/.test(u.search)) return [{ datum: d, slots: p.slots || [] }];
        if (/select=plan/.test(u.search) && !/slots/.test(u.search)) return [{ datum: d, plan: p.plan || [] }];
        return [p];
      }
    })
  });
  await h.sichtbarMachen(s.page, "#train-sub-planung");
  await h.sichtbarMachen(s.page, "#tp-timeline");

  const r = await s.page.evaluate(async ({ datum, L48, L46 }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = { fehlt: [] };
    for (const n of ["tgBedarf", "tgErweitern", "tgBilden", "tpStationenBedarf", "tgFertig", "vorlageUebernehmenSetzen"])
      if (typeof window[n] !== "function") out.fehlt.push(n);
    if (out.fehlt.length) return out;
    await loadKader();
    const feld = document.getElementById("tp-date");
    if (feld && ![...feld.options].some(o => o.value === datum)) feld.add(new Option(datum, datum));
    if (feld) feld.value = datum;
    await tpTrainerRsvpLaden(datum);
    out.trainer = tpGetCheckedTrainers().slice();
    out.kinder = _tgPool().namen.length;

    // a) Die Rechnung – die Kinderzahl deckelt nach oben UND nach unten
    out.rechnung = {};
    [[8, 3], [10, 3], [12, 3], [13, 3], [14, 3], [13, 2], [8, 1], [3, 3]].forEach(([k, st]) => { out.rechnung[k + "/" + st] = tgBedarf(k, st); });
    out.zielMin = TG_ZIEL_MIN; out.zielMax = TG_ZIEL_MAX;

    // b) Abspalten statt neu mischen
    await tgSync(); await warte(150);
    const vorher = (tgFor() || {}).gruppen || [];
    out.vorher = vorher.map(g => ({ name: g.name, n: g.kinder.length, trainer: g.trainer }));
    const proband = vorher[0] && vorher[0].kinder[0];           // bleibt in seiner Gruppe
    tgErweitern(3);
    const nachher = (tgFor() || {}).gruppen || [];
    out.nachher = nachher.map(g => ({ name: g.name, n: g.kinder.length, trainer: g.trainer }));
    out.probandBleibt = !!(nachher[0] && nachher[0].kinder.includes(proband));
    // zurück auf zwei für den echten Fall
    tgBilden(2);
    (tgFor() || {}).gruppen.forEach((g, i) => { g.name = vorher[i] ? vorher[i].name : g.name; g.trainer = vorher[i] ? vorher[i].trainer : ""; });

    await vorlagenLaden();                                      // sonst ist VORLAGEN leer
    out.geladen = VORLAGEN.length;
    const idVon = pfx => String((VORLAGEN.find(v => String(v.name).startsWith(pfx + " ")) || {}).id);
    const werte = si => [...document.querySelectorAll(`.tp-form-sel[id^="tp-form-${si}-"]`)].map(x => x.value ? (tpAllForms()[+x.value] || {}).name || "?" : "");
    const haupt = () => tpSlots.map((sl, si) => ({ typ: sl.typ, stationen: sl.stationen || 0, felder: werte(si) })).filter(x => x.typ === "spielform" || x.typ === "main");
    const uebernehmen = async pfx => { _vuAuswahl = idVon(pfx); await vorlageUebernehmenSetzen(); await warte(500); return { gruppen: ((tgFor() || {}).gruppen || []).map(g => g.kinder.length), haupt: haupt() }; };

    // c) Der echte Fall: 13 Kinder, zwei Trainer, drei Stationen
    out.l48 = await uebernehmen(L48);
    out.hinweis48 = (document.getElementById("tp-timeline") || {}).textContent || "";
    // d) Zwei Stationen, 13 Kinder → drei Felder, Feld 3 wiederholt Station 1
    tgBilden(2); await warte(50);
    out.l46 = await uebernehmen(L46);

    /* f) Stellt der Trainer von Hand auf zwei Gruppen zurück, obwohl die Einheit drei
       Felder braucht und die Kinder reichen, steht der Weg zurück am Block. */
    await uebernehmen(L48);
    tgBilden(2); tpRenderTimeline(); await warte(150);
    const leiste = document.getElementById("tp-timeline") || {};
    out.knopfText = leiste.textContent || "";
    out.knopfHtml = /tgAnzahlSetzen\(3\)/.test(leiste.innerHTML || "");
    return out;
  }, { datum, L48, L46 });

  const fehler = s.fehler();
  await s.schliessen();
  if (r.fehlt.length) return h.ergebnis("Felder und Gruppen folgen der Kinderzahl", false, [r.fehlt.join(", ") + " fehlt"]);

  // a)
  /* „3/3" ist der Gegenprobe-Fall: drei Kinder tragen rechnerisch keine zweite Gruppe, die
     zwei angehakten Feldtrainer bekommen sie trotzdem – die Trainerzahl bleibt unangetastet
     (v536), gedeckelt wird nur der Aufschlag aus Stationen und Kinderzahl. */
  const soll = { "8/3": 2, "10/3": 2, "12/3": 3, "13/3": 3, "14/3": 3, "13/2": 3, "8/1": 2, "3/3": 2 };
  const abw = Object.keys(soll).filter(k => r.rechnung[k] !== soll[k]).map(k => `${k} → ${r.rechnung[k]} statt ${soll[k]}`);
  if (abw.length) probleme.push("Gruppenzahl falsch gerechnet: " + abw.join(" · "));
  if (r.kinder !== 13) probleme.push(`${r.kinder} Kinder im Pool, erwartet 13`);
  if ((r.trainer || []).length !== 2) probleme.push(`${(r.trainer || []).length} Feldtrainer angehakt, erwartet 2`);
  if (!r.geladen) probleme.push("Keine Vorlagen geladen – der Prüfstand kann nichts übernehmen");

  // b)
  const n = (r.nachher || []).map(x => x.n).sort((a, b) => b - a);
  if (String(n) !== "5,4,4") probleme.push(`Abspalten ergibt ${n.join("/")} statt 5/4/4`);
  if ((r.nachher[0] || {}).name !== "Blaue Haie" || (r.nachher[1] || {}).name !== "Rote Füchse")
    probleme.push(`Die bestehenden Gruppen heißen nach dem Abspalten ${r.nachher.map(x => x.name).join(", ")}`);
  if ((r.nachher[0] || {}).trainer !== "Charles" || (r.nachher[1] || {}).trainer !== "Finn")
    probleme.push("Beim Abspalten gehen die Trainer der bestehenden Gruppen verloren");
  if (!r.probandBleibt) probleme.push("Ein Kind der ersten Gruppe ist beim Abspalten gewandert – die bestehenden Gruppen bleiben, wie sie sind");

  // c)
  const g48 = (r.l48.gruppen || []).slice().sort((a, b) => b - a);
  if (String(g48) !== "5,4,4") probleme.push(`L4-8 bei 13 Kindern: Gruppen ${g48.join("/")} statt 5/4/4`);
  const h48 = r.l48.haupt || [];
  if (h48.length !== 3) probleme.push(`L4-8: ${h48.length} Hauptteile statt 3`);
  else {
    if (h48.some(x => x.stationen !== 3)) probleme.push(`L4-8: Feldbedarf am Block ${h48.map(x => x.stationen).join("/")} statt 3/3/3 – der Slot merkt sich die Stationszahl nicht`);
    h48.forEach((x, i) => { if (String(x.felder) !== String([A, F1, FW])) probleme.push(`L4-8 Hauptteil ${i + 1}: [${x.felder.join(" | ")}] statt drei verschiedener Übungen`); });
  }
  if (/Stationen geplant/.test(r.hinweis48 || "")) probleme.push("Bei 13 Kindern erscheint trotzdem der Hinweis auf entfallende Stationen");

  // d)
  const g46 = (r.l46.gruppen || []).slice().sort((a, b) => b - a);
  if (String(g46) !== "5,4,4") probleme.push(`L4-6 bei 13 Kindern: Gruppen ${g46.join("/")} statt 5/4/4`);
  const h46 = r.l46.haupt || [];
  if (!h46.length) probleme.push("L4-6: keine Hauptteile");
  else if (String(h46[0].felder) !== String([ADLER, "2 gegen 1 plus Torwart – der Flitzer macht es breit", ADLER]))
    probleme.push(`L4-6 Hauptteil 1 bei drei Feldern: [${h46[0].felder.join(" | ")}] – Feld 3 sollte Station 1 wiederholen`);

  // f)
  if (!/3 Stationen geplant, 2 Felder/.test(r.knopfText || "")) probleme.push("Bei zwei Gruppen und drei Stationen sagt der Block nicht, dass eine Station entfällt");
  else if (!r.knopfHtml || !/3 Gruppen bilden/.test(r.knopfText || "")) probleme.push("Am Block fehlt der Knopf „3 Gruppen bilden“, obwohl die Kinder für drei Felder reichen");

  /* e) Reichen die Kinder nicht, bleibt es bei zwei Feldern – und der Block sagt den Grund
     statt einen Knopf anzubieten, der nichts bewirken würde. Eigene Sitzung mit acht
     Kindern, weil der Kader beim Start feststeht. */
  const klein = await h.starten({
    hoehe: 2000,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen({ inaktiv: h.KINDER.slice(8) }), nominierungen: [], anwesenheit: [],
      termine: [{ id: 92, datum, typ: "training", trainer_status: { Charles: "ja", Finn: "ja" } }],
      trainingsformen: custom, trainingsvorlagen: rows,
      trainingsgruppen: (u, req) => (req.method() === "POST" ? { status: 201, body: "[]" } : []),
      trainingsplan: (u, req) => {
        if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); plaene[b.datum] = b; return { status: 201, body: "[]" }; }
        const d = (u.searchParams.get("datum") || "").replace(/^eq\./, "");
        const pl = plaene[d]; if (!pl) return [];
        if (/select=slots/.test(u.search) && !/plan/.test(u.search)) return [{ datum: d, slots: pl.slots || [] }];
        if (/select=plan/.test(u.search) && !/slots/.test(u.search)) return [{ datum: d, plan: pl.plan || [] }];
        return [pl];
      }
    })
  });
  await h.sichtbarMachen(klein.page, "#train-sub-planung");
  await h.sichtbarMachen(klein.page, "#tp-timeline");
  const rk = await klein.page.evaluate(async ({ datum, L48 }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    await loadKader();
    const feld = document.getElementById("tp-date");
    if (feld && ![...feld.options].some(o => o.value === datum)) feld.add(new Option(datum, datum));
    if (feld) feld.value = datum;
    await tpTrainerRsvpLaden(datum);
    await vorlagenLaden();
    await tgSync(); await warte(120);
    const out = { kinder: _tgPool().namen.length };
    _vuAuswahl = String((VORLAGEN.find(v => String(v.name).startsWith("L4-8 ")) || {}).id);
    await vorlageUebernehmenSetzen(); await warte(500);
    out.gruppen = ((tgFor() || {}).gruppen || []).map(g => g.kinder.length);
    const leiste = document.getElementById("tp-timeline") || {};
    out.text = leiste.textContent || "";
    out.knopf = /tgAnzahlSetzen\(/.test(leiste.innerHTML || "");
    return out;
  }, { datum, L48 });
  const fehlerKlein = klein.fehler();
  await klein.schliessen();
  if (rk.kinder !== 8) probleme.push(`Zweite Sitzung: ${rk.kinder} Kinder statt 8`);
  const gk = (rk.gruppen || []).slice().sort((a, b) => b - a);
  if (String(gk) !== "4,4") probleme.push(`Bei acht Kindern entstehen Gruppen ${gk.join("/")} statt 4/4`);
  if (!/3 Stationen geplant, 2 Felder/.test(rk.text || "")) probleme.push("Bei acht Kindern fehlt der Hinweis auf die entfallende Station");
  else if (!/bräuchte es 12 Kinder/.test(rk.text || "")) probleme.push(`Der Grund fehlt oder nennt die falsche Zahl: „${(rk.text.match(/Für ein weiteres Feld[^.]*\./) || [])[0] || "–"}“`);
  if (rk.knopf) probleme.push("Bei acht Kindern wird ein Knopf angeboten, der nichts bewirken kann");
  if (fehlerKlein.length) probleme.push("Konsole (zweite Sitzung): " + fehlerKlein[0]);

  if (fehler.length) probleme.push("Konsole: " + fehler[0]);
  if (!probleme.length) {
    zeilen.push(`Rechnung: ${Object.keys(soll).map(k => k + "→" + r.rechnung[k]).join(" · ")} (Zielgröße ${r.zielMin}–${r.zielMax} je Gruppe)`);
    zeilen.push(`Abspalten: 7/6 → ${r.nachher.map(x => x.n).join("/")} · Namen, Trainer und die Kinder der bestehenden Gruppen bleiben`);
    zeilen.push(`L4-8 mit 13 Kindern und zwei Trainern: drei Gruppen ${g48.join("/")}, drei Felder mit drei Übungen, kein Hinweis`);
    zeilen.push(`L4-6 (zwei Stationen) mit 13 Kindern: drei Felder, Feld 3 wiederholt Station 1`);
    zeilen.push(`Von Hand auf zwei Gruppen: Block sagt „3 Stationen geplant, 2 Felder“ und bietet „3 Gruppen bilden“`);
    zeilen.push(`Mit acht Kindern: zwei Gruppen ${gk.join("/")}, kein Knopf – stattdessen die nötige Kinderzahl`);
  }
  return h.ergebnis("Felder und Gruppen folgen der Kinderzahl", !probleme.length, zeilen.concat(probleme));
};
