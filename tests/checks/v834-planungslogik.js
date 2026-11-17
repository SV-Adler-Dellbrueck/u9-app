/* v834 · Planungslogik (Bestandsaufnahme 17.11.2026, Charles' Entscheidungen vom selben Tag).
   a) Drei-Stufen-Vorlage (L1-1) mit zwei Trainern: beide Felder spielen in jeder Stufe dieselbe Übung –
      vorher bekam Feld 2 eine fremde Übung, und keine Gruppe erlebte frei → eng → offen. Keine automatische Zusatzregel.
   b) Leerer Plan, ein Trainer: Straßenfußball-Fenster 10, Aufwärmen 8, EINE Spielform in drei Stufen (12/12/10),
      Abschluss 18 = 70 Minuten; genau eine Zusatzregel, und zwar in Stufe 2; das Fenster bleibt ohne Übung.
   c) Leerer Plan, drei Trainer: Rahmen 10/8/34/18, Stationen im Wechsel wie bisher; höchstens eine Zusatzregel, im zweiten Hauptteil.
   e) Sondereinheit mit einem einzigen Hauptteil (Technik-Parcours), zwei Trainer: beide Felder spielen den Parcours.
   d) Lehrgangsformen („Lehrgang – …“) kommen nie an eine Station; Ganztagsformen („…-Tag“) sind keine automatische Regel. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");
  const vor = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8"));
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const inaktiv = h.KINDER.slice(14);
  const d3 = h.tagePlus(2), d2 = h.tagePlus(4), d1 = h.tagePlus(6);
  const custom = (bib.uebungen || []).map((u, i) => ({ ...u, id: 6000 + i, custom: true }));
  const rows = (vor.vorlagen || []).map((v, i) => ({ ...v, id: 500 + i }));
  const plaene = {};
  const termine = [
    { id: 91, datum: d3, typ: "training", trainer_status: { Charles: "ja", Finn: "ja", Kenneth: "ja" } },
    { id: 92, datum: d2, typ: "training", trainer_status: { Charles: "ja", Finn: "ja" } },
    { id: 93, datum: d1, typ: "training", trainer_status: { Charles: "ja" } }];
  const s = await h.starten({
    hoehe: 2600,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen({ inaktiv }), nominierungen: [], anwesenheit: [],
      // Die Attrappe filtert nicht – der Plan fragt je Datum, also hier selbst filtern.
      termine: (u) => { const d = (u.searchParams.get("datum") || "").replace(/^eq\./, ""); return termine.filter(t => !d || t.datum === d); },
      trainingsformen: custom,
      trainingsvorlagen: rows,
      periodisierung: [],
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

  const r = await s.page.evaluate(async ({ d3, d2, d1 }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    if (typeof tpIstStufe !== "function") return { alt: true };
    await loadKader();
    const feld = document.getElementById("tp-date");
    const datumSetzen = async d => {
      if (![...feld.options].some(o => o.value === d)) feld.add(new Option(d, d));
      feld.value = d; await tpTrainerRsvpLaden(d); await tpPlanRestore(d); await warte(200);
    };
    const alle = tpAllForms();
    const bild = () => tpSlots.map((sl, si) => ({ typ: sl.typ, label: sl.label, dauer: Number(sl.dauer), regel: sl.regel || null,
      felder: [...document.querySelectorAll(`.tp-form-sel[id^="tp-form-${si}-"]`)].map(x => x.value === "" ? null : alle[+x.value].name) }));
    const out = {};
    // a)
    await datumSetzen(d2); await vorlagenLaden();
    _vuAuswahl = String(VORLAGEN.find(v => String(v.name).startsWith("L1-1 ")).id);
    out.trainerA = tpGetCheckedTrainers().length;
    await vorlageUebernehmenSetzen(); await warte(700);
    out.a = bild();
    // b)
    await datumSetzen(d1); tpSlots = [...TP_PHASEN]; tpRenderTimeline(); await warte(100);
    out.trainerB = tpGetCheckedTrainers().length;
    await tpGenerate(); await warte(400);
    out.b = bild();
    // c)
    await datumSetzen(d3); tpSlots = [...TP_PHASEN]; tpRenderTimeline(); await warte(100);
    out.trainerC = tpGetCheckedTrainers().length;
    await tpGenerate(); await warte(400);
    out.c = bild();
    // e) Sondereinheit mit einem einzigen Hauptteil: beide Felder dieselbe Übung
    await datumSetzen(d2); tpSlots = [...TP_PHASEN]; tpRenderTimeline(); await warte(100);
    const vs = VORLAGEN.find(v => /Technik-Parcours/.test(v.name));
    if (vs) { _vuAuswahl = String(vs.id); await vorlageUebernehmenSetzen(); await warte(700); out.e = bild(); }
    // d)
    out.lehrgang = tpNurErwachsene({ name: "Lehrgang – Zwei-Seiten-Spiel" }) && !tpStationTauglich({ name: "Lehrgang – Zwei-Seiten-Spiel" });
    out.kinderform = tpNurErwachsene({ name: "Pflichtpass-Funino" });
    out.rahmen = TP_PHASEN.map(p => p.dauer).join("+");
    return out;
  }, { d3, d2, d1 });
  const fehler = s.fehler(); await s.schliessen();
  const titel = "v834 Planungslogik: Stufen bleiben zusammen, eine Regel je Einheit, ein Trainer bekommt eine Spielform in drei Stufen";
  if (r.alt) return h.ergebnis(titel, false, ["tpIstStufe fehlt (Stand vor v834)"]);
  if (fehler.length) probleme.push("Konsole: " + fehler.slice(0, 2).join(" | "));
  const H = b => b.filter(x => ["main", "spielform", "uebungsform"].includes(x.typ));
  const summe = b => b.reduce((n, x) => n + x.dauer, 0);
  // a)
  const hA = H(r.a);
  if (r.trainerA !== 2) probleme.push(`a) Voraussetzung: ${r.trainerA} Trainer`);
  else if (hA.length !== 3 || hA.some(x => x.felder.length !== 2)) probleme.push("a) nicht drei Stufen mit je zwei Feldern: " + JSON.stringify(hA.map(x => x.felder)));
  else if (hA.some(x => x.felder[0] !== "1gg1 Tore-Duell" || x.felder[1] !== "1gg1 Tore-Duell")) probleme.push("a) ein Feld spielt in einer Stufe etwas anderes: " + JSON.stringify(hA.map(x => x.felder)));
  else if (r.a.some(x => x.regel)) probleme.push("a) Vorlage hat eine automatische Zusatzregel bekommen: " + r.a.map(x => x.regel).filter(Boolean).join(", "));
  else zeilen.push("a) L1-1, zwei Trainer: beide Felder „1gg1 Tore-Duell“ in allen drei Stufen, keine automatische Regel");
  // b)
  const hB = H(r.b), namenB = new Set(hB.map(x => x.felder[0]));
  if (r.trainerB !== 1) probleme.push(`b) Voraussetzung: ${r.trainerB} Trainer`);
  else {
    if (r.b.map(x => x.dauer).join("+") !== "10+8+12+12+10+18" || summe(r.b) !== 70) probleme.push("b) Rahmen " + r.b.map(x => x.dauer).join("+"));
    if (hB.length !== 3 || !hB.every((x, i) => new RegExp("^Stufe " + (i + 1)).test(x.label))) probleme.push("b) keine drei Stufen: " + hB.map(x => x.label).join(" | "));
    if (namenB.size !== 1 || namenB.has(null)) probleme.push("b) nicht eine Übung in allen Stufen: " + [...namenB].join(" / "));
    if (/^Lehrgang/.test([...namenB][0] || "")) probleme.push("b) Lehrgangsform gewählt");
    const mitRegel = hB.map((x, i) => x.regel ? i + 1 : 0).filter(Boolean);
    if (mitRegel.join() !== "2") probleme.push("b) Zusatzregel in Stufe " + (mitRegel.join(",") || "keiner") + " statt nur in Stufe 2");
    if (/-Tag$/.test((hB[1] || {}).regel || "")) probleme.push("b) Ganztagsform als Regel: " + hB[1].regel);
    if (r.b[0].felder.some(Boolean) || !/Stra(ß|ss)enfu/.test(r.b[0].label)) probleme.push("b) Straßenfußball-Fenster fehlt oder trägt eine Übung");
    if (!r.b[1].felder[0]) probleme.push("b) Aufwärmen leer");
    if (!probleme.some(p => p.startsWith("b)"))) zeilen.push(`b) ein Trainer: 10+8+12+12+10+18 · „${[...namenB][0]}“ in drei Stufen · Regel „${hB[1].regel}“ nur in Stufe 2`);
  }
  // c)
  const hC = H(r.c);
  if (r.trainerC !== 3) probleme.push(`c) Voraussetzung: ${r.trainerC} Trainer`);
  else {
    if (summe(r.c) !== 70 || summe(hC) !== 34 || r.c[0].dauer !== 10 || r.c[1].dauer !== 8 || r.c[r.c.length - 1].dauer !== 18) probleme.push("c) Rahmen " + r.c.map(x => x.dauer).join("+"));
    if (hC.length !== 3 || hC.some(x => x.felder.length !== 3 || x.felder.some(n => !n))) probleme.push("c) nicht drei Hauptteile mit drei gefüllten Feldern");
    const mr = hC.map((x, i) => x.regel ? i + 1 : 0).filter(Boolean);
    if (mr.length > 1 || (mr.length === 1 && mr[0] !== 2)) probleme.push("c) Zusatzregeln in Hauptteil " + mr.join(","));
    if (!probleme.some(p => p.startsWith("c)"))) zeilen.push(`c) drei Trainer: ${r.c.map(x => x.dauer).join("+")} · ${mr.length} Zusatzregel${mr.length ? " in Hauptteil 2" : ""}`);
  }
  const hE = H(r.e || []);
  if (!r.e) probleme.push("e) Vorlage Technik-Parcours nicht gefunden");
  else if (hE.length !== 1 || hE[0].felder.length !== 2 || new Set(hE[0].felder).size !== 1 || !/^Technik-Parcours/.test(hE[0].felder[0] || "")) probleme.push("e) Sondereinheit: Felder " + JSON.stringify(hE.map(x => x.felder)));
  else zeilen.push("e) Sondereinheit Technik-Parcours, zwei Trainer: beide Felder der Parcours");
  if (!r.lehrgang || r.kinderform) probleme.push("d) Lehrgangsfilter: Lehrgang " + r.lehrgang + ", Kinderform " + r.kinderform);
  if (r.rahmen !== "10+20+20+20") probleme.push("Das leere Gerüst hat sich geändert (Altpläne ohne Struktur hängen daran): " + r.rahmen);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
