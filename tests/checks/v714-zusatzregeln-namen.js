/* v714 – Zusatzregeln statt Stationen, Vornamen im Tagebuch-Kasten, kompakter Kasten.

   PO am 02.10. (Bildschirmfotos 07:02/07:05): „Lobpflicht ist gar keine eigene Übung, sondern nur
   eine Ergänzung für jede Übung … eher wie eine Provokationsregel.“ Entschieden: zehn Einträge sind
   Zusatzregeln (sechs reine Regeln, vier Spielformen mit eingebauter Regel), keine davon an eine
   Station; je Hauptteil schlägt „Training füllen“ eine als Regel für alle Stationen vor.
   Dazu: „Es ist wichtig, dass ich die Kinder mit klarem Vornamen in den Beschreibungen sehe und
   nicht nur mit Buchstaben“ und „Die Ansicht ist etwas zu groß“.

   Fälle:
   a) Training füllen, 14 Kinder, drei Trainer: keine Zusatzregel und keine Übung für Erwachsene an
      einer Station; jeder Hauptteil trägt eine Regel aus ZUSATZREGELN, keine doppelt; die Zeile
      „Regel für alle Stationen“ steht im Block mit zwei Knöpfen ≥ 44 px.
   b) Regel wegtippen → weg; erneutes „Training füllen“ setzt sie nicht wieder.
   c) Tagebuch-Vorschläge zu einem Text über Pressing, Lob und Umschalten: keine Zusatzregel, nichts
      für Erwachsene.
   d) Kasten „Vorgenommen“: der Deckname „Kind X“ erscheint als Vorname des Kindes; der Export macht
      daraus wieder den Buchstaben; je Vorsatz ein zugeklapptes <details>, der Kasten bleibt bei zwei
      Vorsätzen unter 260 px hoch. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const inaktiv = h.KINDER.slice(14);
  const d3 = h.tagePlus(2);
  const custom = (bib.uebungen || []).map((u, i) => ({ ...u, id: 6000 + i, custom: true }));
  const termine = [{ id: 91, datum: d3, typ: "training", trainer_status: { Charles: "ja", Finn: "ja", Kenneth: "ja" } }];
  const punkte = [
    { id: 1, eintrag_id: 10, datum: "2026-09-25", text: "Mit Kind B Zweikampfverhalten und Körperkontakt üben, dazu Ballumgang mit beiden Füßen und die Ballruhe-Regel bei Trinkpausen konsequenter durchsetzen.", bis: null, dauerhaft: true, erledigt_am: null, wirkung: null },
    { id: 2, eintrag_id: 11, datum: "2026-09-26", text: "Kraft einteilen und Zweikämpfe gezielt eingehen statt jeden zu 110 % anzugehen.", bis: null, dauerhaft: false, erledigt_am: null, wirkung: null }];
  const s = await h.starten({
    hoehe: 2600, breite: 390,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen({ inaktiv }), nominierungen: [], anwesenheit: [],
      termine: (u) => { const d = (u.searchParams.get("datum") || "").replace(/^eq\./, ""); return termine.filter(t => !d || t.datum === d); },
      trainingsformen: custom, periodisierung: [],
      tagebuch_punkt: punkte,
      trainingsgruppen: (u, req) => (req.method() === "POST" ? { status: 201, body: "[]" } : []),
      trainingsplan: (u, req) => (req.method() === "POST" ? { status: 201, body: "[]" } : [])
    })
  });
  await h.sichtbarMachen(s.page, "#train-sub-planung");
  await h.sichtbarMachen(s.page, "#tp-timeline");

  const r = await s.page.evaluate(async ({ d3 }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = { fehlt: [] };
    for (const n of ["tpIstZusatzregel", "tpStationTauglich", "tpRegelZeile", "tpRegelWeg", "tbKlarnamen"])
      if (typeof window[n] !== "function") out.fehlt.push(n);
    if (typeof ZUSATZREGELN === "undefined") out.fehlt.push("ZUSATZREGELN");
    if (out.fehlt.length) return out;
    await loadKader();
    const feld = document.getElementById("tp-date");
    if (![...feld.options].some(o => o.value === d3)) feld.add(new Option(d3, d3));
    feld.value = d3; await tpTrainerRsvpLaden(d3); await warte(200);
    const alle = tpAllForms();
    out.zahlRegeln = ZUSATZREGELN.filter(n => alle.some(f => f.name === n)).length;
    // a)
    await tpGenerate(); await warte(400);
    const haupt = tpSlots.map((sl, si) => ({ sl, si })).filter(x => tpIstHauptteil(x.sl.typ));
    out.stationen = haupt.map(x => [...document.querySelectorAll(`.tp-form-sel[id^="tp-form-${x.si}-"]`)].map(e => e.value === "" ? null : alle[+e.value].name));
    out.untauglich = out.stationen.flat().filter(n => n && !tpStationTauglich(alle.find(f => f.name === n)));
    out.regeln = haupt.map(x => x.sl.regel);
    const zeilen = [...document.querySelectorAll("#tp-timeline .tp-regel")];
    out.zeilen = zeilen.length;
    out.knopfHoehen = zeilen.flatMap(z => [...z.querySelectorAll("button")].map(b => Math.round(b.getBoundingClientRect().height)));
    // b)
    const si0 = haupt[0].si, weg = tpSlots[si0].regel;
    tpRegelWeg(si0); await warte(100);
    out.nachWeg = tpSlots[si0].regel;
    await tpGenerate(); await warte(300);
    out.nachZweitem = tpSlots[si0].regel;
    out.wegName = weg;
    // c)
    out.vorschlaege = tbUebungVorschlaege("Lob für den Mitspieler, Pressing nach Ballverlust und Umschalten nach Ballgewinn").map(v => v.f.name);
    out.vorschlaegeUntauglich = out.vorschlaege.filter(n => !tpStationTauglich(alle.find(f => f.name === n)));
    // d)
    const kind = KADER.find(k => k && k.name);
    kind.alias = "B";
    out.vorname = tbVorname(kind.name);
    const box = document.createElement("div"); box.id = "t-fokus"; box.style.width = "358px";
    document.getElementById("train-sub-planung").prepend(box);
    await tbFokusInto("t-fokus", d3, "plan"); await warte(100);
    out.text = box.textContent.replace(/\s+/g, " ");
    out.details = box.querySelectorAll("details").length;
    out.offen = box.querySelectorAll("details[open]").length;
    out.hoehe = Math.round(box.getBoundingClientRect().height);
    out.export = tbPseudonym(tbKlarnamen("Mit Kind B üben"));
    return out;
  }, { d3 });

  const fehler = s.fehler();
  await s.schliessen();
  const titel = "v714 Zusatzregeln statt Stationen, Vornamen und kompakter Kasten";
  if (r.fehlt.length) return h.ergebnis(titel, false, [r.fehlt.join(", ") + " fehlt"]);
  if (fehler.length) probleme.push("Konsole: " + fehler.slice(0, 2).join(" | "));

  // a)
  if (r.zahlRegeln !== 10) probleme.push(`a) ${r.zahlRegeln} von 10 Zusatzregeln in der Übungsliste gefunden`);
  if (r.untauglich.length) probleme.push("a) an einer Station: " + r.untauglich.join(", "));
  else if (r.regeln.some(x => !x) || new Set(r.regeln).size !== r.regeln.length) probleme.push("a) Regeln je Hauptteil: " + JSON.stringify(r.regeln));
  else if (r.zeilen !== r.regeln.length) probleme.push(`a) ${r.zeilen} Regel-Zeilen statt ${r.regeln.length}`);
  else if (r.knopfHoehen.some(x => x < 44)) probleme.push("a) Knopf unter 44 px: " + r.knopfHoehen.join("/"));
  else zeilen.push(`a) Stationen ${r.stationen[0].join(" · ")}; Regeln ${r.regeln.join(" · ")}`);

  // b)
  if (r.nachWeg !== null) probleme.push("b) Wegtippen setzt die Regel nicht auf null: " + r.nachWeg);
  else if (r.nachZweitem !== null) probleme.push("b) zweites „Training füllen“ setzt die weggetippte Regel wieder: " + r.nachZweitem);
  else zeilen.push(`b) „${r.wegName}“ weggetippt, bleibt auch nach erneutem Füllen weg`);

  // c)
  if (r.vorschlaegeUntauglich.length) probleme.push("c) Tagebuch schlägt vor: " + r.vorschlaegeUntauglich.join(", "));
  else zeilen.push(`c) Tagebuch-Vorschläge: ${r.vorschlaege.join(" · ") || "keine"}`);

  // d)
  if (!r.text.includes(r.vorname) || /Kind B\b/.test(r.text)) probleme.push("d) Deckname nicht zum Vornamen: " + r.text.slice(0, 120));
  else if (r.export !== "Mit Kind B üben") probleme.push("d) Export macht den Vornamen nicht wieder zum Buchstaben: " + r.export);
  else if (r.details !== 2 || r.offen) probleme.push(`d) ${r.details} Klappen (${r.offen} offen) statt 2 zugeklappte`);
  else if (r.hoehe >= 260) probleme.push(`d) Kasten ${r.hoehe} px hoch`);
  else zeilen.push(`d) Vorname statt „Kind B“, Export wieder „Kind B“, zwei Klappen, Kasten ${r.hoehe} px`);

  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
