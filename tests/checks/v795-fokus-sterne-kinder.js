/* v795 · Charles 07.11.
   a) Nachbereitung: Die Kinder-Skala (1–3) steht für jedes anwesende Kind auf 2 (gut); ein schon vergebener Wert hat Vorrang;
      beim Speichern landet die 2 als Wert (nur 1 und 3 muss man ändern)
   b) Übungs-Bewertung: Aus den drei Antippreihen je Übung (EVAL_DATA) entsteht je Übung „★ Ø (n×)“ – in der Übungsliste, in der
      Zeile im Plan-Block und im Detail mit Schnitt je Reihe und jedem Einsatz; übersprungene und unbewertete zählen nicht;
      eine nie bewertete Übung zeigt nichts. Die ⭐ der Liste bleiben die Schwierigkeit.
   c) Fokus „Verbesserung von …“: Schritt 3 zeigt Chips (statt der Vorsätze aus dem Tagebuch), Auswahl und Freitext landen in
      trainingsplan.kopf.fokus (ohne andere Teile des Kopfes zu verlieren), ein anderer Trainer sieht ihn beim Laden,
      im Tagebuch-Auslöser steht „Verbesserung von: …“; gibt es noch keine Zeile, wird er beim Plan-Speichern nachgetragen */
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const datum = h.tagePlus(-1), morgen = h.tagePlus(2);
  const patches = [], plaene = {};
  plaene[morgen] = { datum: morgen, kopf: { schwerpunkt: "Anbieten und Freilaufen", material: "Hütchen" }, plan: [] };
  const s = await h.starten({ hoehe: 2400, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), profiles: [{ name: "Charles", rolle: "trainer" }], termine: [], anwesenheit: [], einheit_bewertung: [], trainings_eval: [],
    trainingsplan: (u, req) => {
      const d = (u.searchParams.get("datum") || "").replace(/^eq\./, "");
      if (req.method() === "PATCH") { const b = JSON.parse(req.postData() || "{}"); patches.push({ d, b }); if (plaene[d]) Object.assign(plaene[d], b); return { status: 204, body: "" }; }
      if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); plaene[b.datum] = Object.assign(plaene[b.datum] || {}, b); return { status: 201, body: JSON.stringify([plaene[b.datum]]) }; }
      if (d === datum) return [{ datum, plan: [{ formIdx: 1, formName: "Dribbel Quadrat", trainer: "Alle", slotLabel: "Hauptteil" }], kopf: {} }];
      return plaene[d] ? [plaene[d]] : [];
    }
  }) });
  await h.sichtbarMachen(s.page, "#train-sub-planung");
  const r = await s.page.evaluate(async ({ K, datum, morgen }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    window.trainerMe = async () => "Charles";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    await loadKader();
    const o = {};
    // a) Kinder-Skala
    AW_DATA[datum] = {}; K.slice(0, 4).forEach((n, i) => { AW_DATA[datum][n] = { da: true, qual: i === 1 ? 3 : 0 }; });
    await einheitBewertenOpen(); await einheitDetailOpen(datum); await w(300);
    o.sterne = K.slice(0, 4).map((n, i) => { const el = document.getElementById("eb-stars-sp-" + i); return el ? Number(el.dataset.val) : null; });
    // b) Übungs-Bewertung
    const idx = 1, fname = tpAllForms()[1].name;
    o.idx = idx;
    EVAL_DATA["2026-10-01"] = [{ name: fname, formIdx: idx, trainer: "Charles", "Durchführung": 4, "Spaßfaktor Kinder": 5, "Anforderung umgesetzt": 3, notiz: "" }];
    EVAL_DATA["2026-10-08"] = [{ name: fname, formIdx: idx, trainer: "Peter", "Durchführung": 5, "Spaßfaktor Kinder": 5, "Anforderung umgesetzt": 4, notiz: "" },
                               { name: fname, formIdx: idx, trainer: "Kenneth", skipped: true }];
    _tpEinsatz = { "2026-10-01": [_tfNormName(fname)], "2026-10-08": [_tfNormName(fname)] };   // wie nach dem Speichern der Pläne dieser Tage
    const b = tpUebungBewertung(idx);
    o.bew = { n: b.n, schnitt: b.schnitt, dims: b.dims };
    o.kurz = tpBewKurz(idx).replace(/<[^>]+>/g, "").replace(/\\s+/g, " ").trim();
    o.detail = tpBewDetailHtml(idx).replace(/<[^>]+>/g, " ").replace(/\\s+/g, " ");
    o.hist = tpExerciseHistoryHtml(idx).replace(/<[^>]+>/g, "");
    o.liste = (() => { const x = _tfKarte({ f: tpAllForms()[idx], i: idx, gr: "" }); return x.replace(/<[^>]+>/g, " ").replace(/\\s+/g, " "); })();
    const nie = tpAllForms().findIndex((f, i) => i !== idx && !tpUebungBewertung(i).n);
    o.nie = tpBewKurz(nie);
    // c) Fokus
    document.getElementById("tp-date").innerHTML = `<option value="${morgen}">${morgen}</option>`; document.getElementById("tp-date").value = morgen;
    await tpKopfLaden(morgen); await w(300);
    const chips = () => [...document.querySelectorAll("#tp-fokus [aria-pressed]")];
    o.chips = chips().map(c => c.textContent.replace("✓", "").trim());
    o.hoehen = chips().map(c => Math.round(c.getBoundingClientRect().height));
    o.vorgenommen = /Vorgenommen/.test(document.getElementById("tp-fokus").textContent);
    chips().find(c => /Passspiel/.test(c.textContent)).click(); chips().find(c => /Defensiv/.test(c.textContent)).click();
    const t = document.getElementById("tp-fokus-text"); t.value = "Torwart mit dem Fuß"; t.dispatchEvent(new Event("input"));
    await w(1400);
    o.gedrueckt = chips().filter(c => c.getAttribute("aria-pressed") === "true").map(c => c.textContent.replace("✓", "").trim());
    // anderer Trainer lädt neu
    _tpFokus = { keys: [], text: "", datum: null, offen: false }; await tpKopfLaden(morgen); await w(300);
    o.neuGeladen = chips().filter(c => c.getAttribute("aria-pressed") === "true").length + "|" + document.getElementById("tp-fokus-text").value;
    o.label = tpFokusLabels(_tpFokus);
    return o;
  }, { K, datum, morgen });
  const fe = s.fehler(); await s.schliessen();
  const J = JSON.stringify;
  if (J(r.sterne) !== J([2, 3, 2, 2])) probleme.push("a) Kinder-Sterne: " + J(r.sterne));
  zeilen.push("a) Kinder-Skala vorbelegt: " + J(r.sterne) + " (ein vergebener Wert 3 bleibt)");
  if (r.bew.n !== 2 || Math.abs(r.bew.schnitt - (4 + 5 + 3 + 5 + 5 + 4) / 6) > 1e-9) probleme.push("b) Schnitt: " + J(r.bew));
  if (!/^★ 4,3 \(2×\)$/.test(r.kurz)) probleme.push("b) Kurzform: " + r.kurz);
  if (!/Ø 4,3 von 5/.test(r.detail) || !/Peter: Durchführung 5\/5/.test(r.detail) || /Kenneth/.test(r.detail)) probleme.push("b) Detail: " + r.detail);
  if (!/★ 4,3/.test(r.hist) || !/★ 4,3/.test(r.liste)) probleme.push("b) Plan/Liste: " + J({ hist: r.hist, liste: r.liste.slice(0, 200) }));
  if (r.nie !== "") probleme.push("b) nie bewertete Übung zeigt etwas: " + r.nie);
  zeilen.push(`b) Schnitt ${r.kurz}, Detail mit Einsätzen, Liste und Plan-Zeile zeigen ihn, übersprungene zählen nicht`);
  if (r.chips.length !== 11 || !r.chips.includes("Passspiel") || !r.chips.includes("Defensivverhalten") || r.hoehen.some(x => x < 44) || r.vorgenommen) probleme.push("c) Chips: " + J({ n: r.chips.length, hoehen: r.hoehen, vorgenommen: r.vorgenommen }));
  const p = patches.find(x => x.d === morgen && x.b.kopf && x.b.kopf.fokus);
  if (!p || J(p.b.kopf.fokus.keys.sort()) !== J(["defensive", "passspiel"]) || p.b.kopf.fokus.text !== "Torwart mit dem Fuß" || p.b.kopf.schwerpunkt !== "Anbieten und Freilaufen" || p.b.kopf.material !== "Hütchen")
    probleme.push("c) Speichern: " + J(patches));
  if (r.neuGeladen !== "2|Torwart mit dem Fuß") probleme.push("c) neu geladen: " + r.neuGeladen);
  if (r.label !== "Passspiel, Defensivverhalten, Torwart mit dem Fuß") probleme.push("c) Auslöser-Text: " + r.label);
  zeilen.push("c) 11 Chips ≥ 44 px, Auswahl und Freitext in kopf.fokus (Schwerpunkt und Material bleiben), nach dem Laden wieder da: " + r.label);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v795 Fokus „Verbesserung von“, Übungs-Bewertung, Kinder-Skala mittig", !probleme.length, probleme.length ? probleme : zeilen);
};
