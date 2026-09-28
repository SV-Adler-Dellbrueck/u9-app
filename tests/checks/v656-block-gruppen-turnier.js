/* v656 – Trainingsblock: Gruppen nach Trainern, Abschlussturnier, Themen als Kacheln.

   PO am 28.09., mit Bildschirmfoto: Einheit aus dem Block übernommen, 14 Kinder, zwei Trainer
   angehakt – die App bildete DREI Gruppen (5/5/4) und stellte an jede Station dieselbe
   3-gegen-3-Übung „für 6 gedacht“. Seine Entscheidungen:
   · „Lieber eine Übung mit einem Spieler mehr, den man ein- und auswechselt, als eine nicht
     betreute Gruppe.“ Ein Wechsler je Station ist machbar; werden es mehr, keine neue Gruppe,
     sondern eine Übung, die mit so vielen Kindern läuft, oder die bestehende per KI angepasst.
   · Jede Einheit endet mit einem kleinen Turnier, rund zehn Minuten – vom letzten Spielblock.
   · Die Themen sollen als Kacheln dastehen, bei denen man auf einen Blick sieht, worum es geht.

   Fälle:
   a) Rechnung: sind Trainer angehakt und hat die Einheit keine Stationen, gibt es so viele
      Gruppen wie Trainer (14 Kinder, 2 Trainer → 2). Ohne Trainer bleibt die Kinderzahl.
   b) L4-5 bei 14 Kindern und zwei Trainern übernehmen → zwei Gruppen 7/7.
   c) Abschlussturnier: L4-5 hat keinen Abschluss – angehängt werden 10 Minuten, der letzte
      Spielblock gibt sie ab, die Gesamtdauer bleibt. Eine Vorlage mit Abschluss bleibt, wie
      sie ist.
   d) Zu viele Wechsler: bei 9 Kindern an einer Übung für 6 steht ein Hinweis mit höchstens
      drei Übungen, in die 9 Kinder passen (mit höchstens einem Wechsler), und ein KI-Knopf;
      alle Knöpfe mindestens 44 px. Der KI-Knopf öffnet die Übung als Kopie und schreibt den
      Auftrag ins KI-Feld – ohne Kindernamen.
   e) Themen-Kacheln im Block: sechs Kacheln; nach der Wahl stehen die Einheiten als Karten
      mit Dauer und „Ablauf ansehen“, gewählt wird über „Wählen“. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");
  const vor = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8"));
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const inaktiv = h.KINDER.slice(14);
  const datum = h.tagePlus(2);
  const custom = (bib.uebungen || []).map((u, i) => ({ ...u, id: 6000 + i, custom: true }));
  const rows = (vor.vorlagen || []).map((v, i) => ({ ...v, id: 500 + i }));
  const plaene = {};
  const s = await h.starten({
    hoehe: 2600,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen({ inaktiv }), nominierungen: [], anwesenheit: [],
      termine: [{ id: 91, datum, typ: "training", trainer_status: { Charles: "ja", Finn: "ja" } }],
      trainingsformen: custom,
      trainingsvorlagen: rows,
      trainingsgruppen: (u, req) => (req.method() === "POST" ? { status: 201, body: "[]" } : []),
      trainingsplan: (u, req) => {
        if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); plaene[b.datum] = b; return { status: 201, body: "[]" }; }
        const d = (u.searchParams.get("datum") || "").replace(/^eq\./, "");
        const p = plaene[d]; if (!p) return [];
        return [p];
      }
    })
  });
  await h.sichtbarMachen(s.page, "#train-sub-planung");
  await h.sichtbarMachen(s.page, "#tp-timeline");

  const r = await s.page.evaluate(async ({ datum, kinderNamen }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = { fehlt: [] };
    for (const n of ["tgBedarf", "tpGroesserHinweis", "tpUebungTausch", "tpUebungKiAnpassen", "vuAbschlussturnierSichern", "vuThemenKacheln", "blockEinheitKarte"])
      if (typeof window[n] !== "function") out.fehlt.push(n);
    if (out.fehlt.length) return out;
    await loadKader();
    const feld = document.getElementById("tp-date");
    if (feld && ![...feld.options].some(o => o.value === datum)) feld.add(new Option(datum, datum));
    if (feld) feld.value = datum;
    await tpTrainerRsvpLaden(datum);
    out.trainer = tpGetCheckedTrainers().length;
    out.kinder = _tgPool().namen.length;

    // a)
    out.rechnung = { "14/0": tgBedarf(14, 0), "14/1": tgBedarf(14, 1), "13/3": tgBedarf(13, 3) };

    // b) + c)
    await vorlagenLaden();
    const v45 = VORLAGEN.find(v => String(v.name).startsWith("L4-5 "));
    _vuAuswahl = String(v45.id);
    await vorlageUebernehmenSetzen(); await warte(500);
    out.gruppen = ((tgFor() || {}).gruppen || []).map(g => g.kinder.length);
    out.quelle = v45.bloecke.map(b => ({ typ: b.typ, dauer: b.dauer }));
    const mitAbschluss = [{ typ: "main", dauer: 20 }, { typ: "abschluss", dauer: 15 }];
    out.mitAbschluss = vuAbschlussturnierSichern(mitAbschluss) || mitAbschluss.length !== 2;
    const kurz = [{ typ: "warmup", dauer: 10 }, { typ: "main", dauer: 12 }];
    vuAbschlussturnierSichern(kurz);
    out.kurz = kurz.map(x => x.dauer);

    // d)
    const alle = tpAllForms();
    const idx = alle.findIndex((f, i) => { const sp = tpUebungSpanne(i); return !sp.alle && sp.max === 6 && sp.min === 6; });
    out.uebung = idx >= 0 ? alle[idx].name : "";
    _tpStationGruppe["probe-sel"] = { n: 9, si: 99, p: 0 };
    const box = document.createElement("div"); box.id = "probe-box";
    box.innerHTML = tpGroesserHinweis("probe-sel", idx, 9);
    document.body.appendChild(box);
    const knoepfe = [...box.querySelectorAll("button")];
    out.tausch = knoepfe.filter(b => /tpUebungTausch/.test(b.getAttribute("onclick") || "")).map(b => {
      const i = +(/,(\d+)\)/.exec(b.getAttribute("onclick")) || [])[1];
      const sp = tpUebungSpanne(i);
      return { name: b.textContent.trim(), min: sp.min, max: sp.max, i };
    });
    out.kiKnopf = knoepfe.some(b => /tpUebungKiAnpassen/.test(b.getAttribute("onclick") || ""));
    out.hoehen = knoepfe.map(b => Math.round(b.getBoundingClientRect().height));
    out.text = box.textContent.replace(/\s+/g, " ");
    box.remove();
    tpUebungKiAnpassen(idx, 9); await warte(300);
    const t = document.getElementById("tf-ki-text");
    out.kiText = t ? t.value : "";
    out.maskeOffen = (document.getElementById("training-modal") || {}).style?.display !== "none";
    out.kiMitNamen = kinderNamen.some(n => out.kiText.includes(n));
    if (typeof closeAddTraining === "function") closeAddTraining();

    // e)
    await blockEditorOpen(); await warte(300);
    const tb = () => document.getElementById("tb-inhalt");
    out.themen = tb().querySelectorAll(".vu-thema").length;
    tb().querySelectorAll(".vu-thema")[3]?.click(); await warte(150);
    out.karten = tb().querySelectorAll(".tb-einheit").length;
    out.ablauf = tb().querySelectorAll(".tb-einheit details").length;
    const waehlen = () => [...tb().querySelectorAll(".tb-einheit button")];
    waehlen()[0]?.click(); await warte(80);
    waehlen()[1]?.click(); await warte(80);
    waehlen()[2]?.click(); await warte(150);
    out.gewaehlt = waehlen().filter(b => b.getAttribute("aria-pressed") === "true").length;
    out.speichernFrei = !document.getElementById("tb-speichern")?.disabled;
    out.kartenText = (tb().querySelector(".tb-einheit") || {}).textContent?.replace(/\s+/g, " ") || "";
    blockEditorClose();

    // f) Kinderziel nachziehen: nur geänderte Spalten, bestehende Vorlagen erreicht
    const merk = VORLAGEN.slice();
    VORLAGEN.length = 0;
    VORLAGEN.push({ id: 1, name: "Ohne Ziel", skalierung: { "8": "a" } }, { id: 2, name: "Gleich", skalierung: { "8": "a" }, ziel_kinder: "Heute x." });
    out.f = await _evSkalierungNachziehen([
      { name: "Ohne Ziel", neu: false, skalierung: { "8": "a" }, ziel_kinder: "Heute schaust du, wer frei ist." },
      { name: "Gleich", neu: false, skalierung: { "8": "a" }, ziel_kinder: "Heute x." }]);
    VORLAGEN.length = 0; merk.forEach(v => VORLAGEN.push(v));
    return out;
  }, { datum, kinderNamen: h.KINDER });

  const fehler = s.fehler();
  const patches = s.gesendet.filter(x => x.methode === "PATCH" && /trainingsvorlagen$/.test(x.pfad));
  await s.schliessen();
  const titel = "v656 Block: Gruppen nach Trainern, Abschlussturnier, Themen-Kacheln";
  if (r.fehlt.length) return h.ergebnis(titel, false, [r.fehlt.join(", ") + " fehlt"]);
  r.slots = ((plaene[datum] || {}).slots || []).map(x => ({ typ: x.typ, dauer: x.dauer, label: x.label }));

  // a)
  if (r.trainer !== 2) probleme.push(`${r.trainer} Trainer angehakt statt 2`);
  if (r.kinder !== 14) probleme.push(`${r.kinder} Kinder im Pool statt 14`);
  if (r.rechnung["14/0"] !== 2) probleme.push(`14 Kinder, zwei Trainer, keine Stationen → ${r.rechnung["14/0"]} Gruppen statt 2`);
  if (r.rechnung["14/1"] !== 2) probleme.push(`14 Kinder, zwei Trainer, eine Station → ${r.rechnung["14/1"]} Gruppen statt 2`);
  if (r.rechnung["13/3"] !== 2) probleme.push(`Drei Stationen machen bei zwei Trainern ${r.rechnung["13/3"]} statt 2 Gruppen auf`);
  // b)
  if (String(r.gruppen.slice().sort()) !== "7,7") probleme.push(`L4-5 bei 14 Kindern und zwei Trainern: Gruppen ${r.gruppen.join("/")} statt 7/7`);
  // c)
  const letzte = r.slots[r.slots.length - 1] || {};
  const summe = a => a.reduce((x, y) => x + (Number(y.dauer) || 0), 0);
  if (letzte.typ !== "abschluss" || letzte.label !== "Abschlussturnier" || letzte.dauer !== 10) probleme.push("Kein Abschlussturnier von 10 Minuten am Ende: " + JSON.stringify(letzte));
  if (r.slots.length !== r.quelle.length + 1) probleme.push(`${r.slots.length} Phasen statt ${r.quelle.length + 1}`);
  if (summe(r.slots) !== summe(r.quelle)) probleme.push(`Die Einheit ist ${summe(r.slots)} statt ${summe(r.quelle)} Minuten lang – das Turnier soll aus dem letzten Spielblock kommen`);
  const vorletzte = r.slots[r.slots.length - 2] || {}, quelleLetzte = r.quelle[r.quelle.length - 1] || {};
  if (vorletzte.dauer !== quelleLetzte.dauer - 10) probleme.push(`Der letzte Spielblock hat ${vorletzte.dauer} statt ${quelleLetzte.dauer - 10} Minuten`);
  if (r.mitAbschluss) probleme.push("Eine Vorlage mit eigenem Abschluss bekommt ein zweites Turnier");
  if (String(r.kurz) !== "10,10,2" && String(r.kurz) !== "10,12") {
    if (r.kurz[1] < 10) probleme.push(`Ein kurzer Spielblock wird unter 10 Minuten gedrückt: ${r.kurz.join("/")}`);
  }
  // d)
  if (!r.uebung) probleme.push("Keine Übung für genau 6 Kinder in der Bibliothek – der Fall lässt sich nicht prüfen");
  else {
    if (!/Zu viele Wechsler/.test(r.text)) probleme.push("Kein Hinweis „Zu viele Wechsler“: " + r.text.slice(0, 120));
    if (!r.tausch.length) probleme.push("Keine Übung vorgeschlagen, in die 9 Kinder passen");
    if (r.tausch.length > 3) probleme.push(`${r.tausch.length} Vorschläge statt höchstens 3`);
    r.tausch.forEach(t => { if (!(t.min <= 9 && 9 <= t.max + 1)) probleme.push(`„${t.name}“ passt nicht zu 9 Kindern (${t.min}–${t.max})`); });
    if (!r.kiKnopf) probleme.push("Kein Knopf „Per KI anpassen“");
    if (r.hoehen.some(x => x < 44)) probleme.push("Knöpfe unter 44 px: " + r.hoehen.join("/"));
    if (!r.maskeOffen) probleme.push("Der KI-Knopf öffnet die Übungsmaske nicht");
    if (!/für 9 Kinder/.test(r.kiText) || !r.kiText.includes(r.uebung)) probleme.push("Der KI-Auftrag nennt Übung oder Kinderzahl nicht: " + r.kiText.slice(0, 120));
    if (r.kiMitNamen) probleme.push("Im KI-Auftrag steht ein Kindername");
  }
  // e)
  if (r.themen !== 6) probleme.push(`${r.themen} Themen-Kacheln im Block statt 6`);
  if (r.karten < 3) probleme.push(`Nach der Themenwahl ${r.karten} Einheiten-Karten`);
  if (r.ablauf !== r.karten) probleme.push("Nicht jede Einheit lässt sich aufklappen („Ablauf ansehen“)");
  if (r.gewaehlt !== 3 || !r.speichernFrei) probleme.push(`Über „Wählen“ ${r.gewaehlt} von 3 gewählt, Erfassen ${r.speichernFrei ? "frei" : "gesperrt"}`);
  if (!/Min\./.test(r.kartenText)) probleme.push("Die Einheiten-Karte nennt keine Dauer");
  // f)
  if (patches.length !== 1 || JSON.stringify(Object.keys(patches[0].body || {})) !== '["ziel_kinder"]' || !/id=eq\.1$/.test(patches[0].suche))
    probleme.push("f) Kinderziel nachziehen: " + JSON.stringify(patches.map(p => ({ s: p.suche, b: p.body }))));
  const ohneZiel = (vor.vorlagen || []).filter(v => !/^Heute /.test(String(v.ziel_kinder || "")) || String(v.ziel_kinder).length > 160).map(v => v.name);
  if (ohneZiel.length) probleme.push("Vorlagen ohne gültiges Kinderziel: " + ohneZiel.join(", "));
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);

  if (!probleme.length) {
    zeilen.push(`Rechnung: 14 Kinder/2 Trainer → ${r.rechnung["14/0"]} Gruppen, drei Stationen ebenfalls ${r.rechnung["13/3"]} · L4-5 übernommen → ${r.gruppen.join("/")}`);
    zeilen.push(`Abschlussturnier: ${r.slots.map(x => x.dauer).join("+")} = ${summe(r.slots)} Min., letzter Spielblock ${quelleLetzte.dauer}→${vorletzte.dauer} · mit eigenem Abschluss unverändert · kurzer Block ${r.kurz.join("/")}`);
    zeilen.push(`Zu viele Wechsler bei „${r.uebung}“ und 9 Kindern: ${r.tausch.map(t => `${t.name} (${t.min}–${t.max})`).join(" · ")} + KI-Knopf, alle ≥44 px, Auftrag ohne Namen`);
    zeilen.push(`Kinderziel: ${vor.vorlagen.length} Vorlagen mit Satz, Nachziehen schreibt nur ziel_kinder und nur, wo es fehlt`);
    zeilen.push(`Block: ${r.themen} Themen-Kacheln → ${r.karten} Einheiten-Karten mit Ablauf, 3 über „Wählen“`);
  }
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
