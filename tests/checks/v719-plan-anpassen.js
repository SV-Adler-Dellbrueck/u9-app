/* v719 · „🔄 Plan anpassen“ – der fertige Plan folgt den Zu- und Absagen.
   PO 02.10.: „Ich habe jetzt einen Trainingsplan schon angelegt. Jetzt haben wir noch zwei Kinder
   abgesagt und ein Trainer ist dazugekommen oder ein Trainer ist weggefallen, dass der
   Trainingsplan dementsprechend nochmal angepasst wird … wenn vorher drei Trainer da waren mit
   drei Stationen, dann zwei Stationen draus gemacht werden, geschaut wird, ob die Übungen, die
   dann noch da sind, auf die Anzahl der Spieler passen.“ Kachel: „Mit Vorschau“.
   a) Plan mit drei Trainern und 14 Kindern; danach sagt ein Trainer ab, zwei Kinder sagen ab, und an
      einer Station steht eine Übung für höchstens 3 Kinder. „Plan anpassen“ zeigt ein Fenster
      (role=dialog) mit „3 → 2 Stationen“, den zwei fehlenden Kindern und dem Tausch – und ändert
      dabei noch NICHTS
   b) „Übernehmen“: 2 Stationen je Hauptteil, 2 Gruppen ohne die abgesagten Kinder, Rotation bleibt
      (jede Station in jedem Hauptteil dieselbe Übung), die zu kleine Übung ist ersetzt, keine
      Station trägt eine Übung, die nicht passt; Zusatzregeln bleiben
   c) Ein Trainer kommt dazu: 2 → 3 Stationen, die neue Station ist belegt
   d) Nichts geändert: das Fenster sagt „Alles passt“ und hat keinen „Übernehmen“-Knopf
   e) Knöpfe ≥ 44 px, der Knopf „Plan anpassen“ steht im Trainingsplan */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const inaktiv = h.KINDER.slice(14);
  const d3 = h.tagePlus(2);
  const custom = (bib.uebungen || []).map((u, i) => ({ ...u, id: 6000 + i, custom: true }));
  const status = { Charles: "ja", Finn: "ja", Kenneth: "ja" };
  let rueck = [];
  const termine = (u) => { const d = (u.searchParams.get("datum") || "").replace(/^eq\./, ""); return [{ id: 91, datum: d3, typ: "training", trainer_status: { ...status } }].filter(t => !d || t.datum === d); };
  const s = await h.starten({
    hoehe: 2600, breite: 390,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen({ inaktiv }), nominierungen: [], anwesenheit: [],
      termine, trainingsformen: custom, periodisierung: [], tagebuch_punkt: [],
      rueckmeldungen: () => rueck.slice(),
      trainingsgruppen: (u, req) => (req.method() === "POST" ? { status: 201, body: "[]" } : []),
      trainingsplan: (u, req) => (req.method() === "POST" ? { status: 201, body: "[]" } : [])
    })
  });
  await h.sichtbarMachen(s.page, "#train-sub-planung");
  await h.sichtbarMachen(s.page, "#tp-timeline");

  const stand = () => s.page.evaluate(() => {
    const alle = tpAllForms();
    const haupt = tpSlots.map((sl, si) => ({ sl, si })).filter(x => tpIstHauptteil(x.sl.typ));
    const st = haupt.map(x => [...document.querySelectorAll(`.tp-form-sel[id^="tp-form-${x.si}-"]`)].map(e => e.value === "" ? null : +e.value));
    const tg = tgFor();
    const gruppen = (tg && tg.gruppen || []).map(g => (g.kinder || []).slice());
    const gr = Math.max(...gruppen.map(g => g.length), 0);
    return { st, namen: st.map(r => r.map(i => i == null ? null : alle[i].name)), gruppen, gr,
      passt: st.flat().filter(i => i != null).map(i => ({ n: alle[i].name, p: tpGruppePasst(i, gr) })),
      regeln: haupt.map(x => x.sl.regel) };
  });

  // a) Plan anlegen
  const a0 = await s.page.evaluate(async ({ d3 }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const fehlt = ["tpAnpassen", "tpAnpassenVorschlag", "tpAnpassenUebernehmen"].filter(n => typeof window[n] !== "function");
    if (fehlt.length) return { fehlt };
    await loadKader();
    const feld = document.getElementById("tp-date");
    if (![...feld.options].some(o => o.value === d3)) feld.add(new Option(d3, d3));
    feld.value = d3; await tpTrainerRsvpLaden(d3); await warte(200);
    await tpGenerate(); await warte(400);
    // an Station 1 (in jedem Hauptteil) eine Übung für höchstens 3 Kinder
    const alle = tpAllForms();
    const klein = alle.findIndex((f, i) => tpStationTauglich(f) && f.typ !== "warmup" && (() => { const sp = tpUebungSpanne(i); return !sp.alle && sp.max && sp.max <= 3; })()
      && document.querySelector(`#tp-timeline .tp-form-sel option[value="${i}"]`));
    if (klein < 0) return { fehlt: ["keine kleine Übung in der Liste"] };
    tpSlots.forEach((sl, si) => { if (!tpIstHauptteil(sl.typ)) return; const el = document.getElementById(`tp-form-${si}-1`); if (el) el.value = String(klein); });
    return { klein: alle[klein].name, knopf: (() => { const k = document.getElementById("tp-anpassen-knopf"); return k ? Math.round(k.getBoundingClientRect().height) : 0; })() };
  }, { d3 });
  if (a0.fehlt) { const f = s.fehler(); await s.schliessen(); return h.ergebnis("v719 Plan anpassen", false, [a0.fehlt.join(", ") + " fehlt"].concat(f.slice(0, 1))); }
  const vorher = await stand();

  // Absagen: Kenneth, Kind B und Kind C
  status.Kenneth = "nein";
  rueck = [{ spieler_id: 2, status: "abgesagt" }, { spieler_id: 3, status: "krank" }];
  const a = await s.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const st0 = JSON.stringify([...document.querySelectorAll(".tp-form-sel")].map(e => e.value));
    await tpAnpassen(); await warte(200);
    const m = document.getElementById("tp-anpassen-modal");
    const st1 = JSON.stringify([...document.querySelectorAll(".tp-form-sel")].map(e => e.value));
    const ok = document.getElementById("tp-anpassen-ok");
    return { rolle: m && m.getAttribute("role"), modal: m && m.getAttribute("aria-modal"), text: m ? m.textContent.replace(/\s+/g, " ") : "",
      unveraendert: st0 === st1, knoepfe: m ? [...m.querySelectorAll("button")].map(b => Math.round(b.getBoundingClientRect().height)) : [], ok: !!ok };
  });
  // b) Übernehmen
  await s.page.evaluate(async () => { document.getElementById("tp-anpassen-ok")?.click(); await new Promise(r => setTimeout(r, 600)); });
  const b = await stand();

  // c) Trainer kommt dazu
  status.Kenneth = "ja";
  const c = await s.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    await tpAnpassen(); await warte(200);
    const text = (document.getElementById("tp-anpassen-modal") || {}).textContent || "";
    document.getElementById("tp-anpassen-ok")?.click(); await warte(900);
    return { text: text.replace(/\s+/g, " ") };
  });
  const c2 = await stand();

  // d) nichts geändert
  const d = await s.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    await tpAnpassen(); await warte(200);
    const m = document.getElementById("tp-anpassen-modal");
    const out = { text: m ? m.textContent.replace(/\s+/g, " ") : "", ok: !!document.getElementById("tp-anpassen-ok") };
    m?.remove(); return out;
  });
  const fehler = s.fehler();
  await s.schliessen();

  const titel = "v719 Plan anpassen: Stationen, Gruppen und Übungen folgen Zu- und Absagen";
  if (fehler.length) probleme.push("Konsole: " + fehler.slice(0, 2).join(" | "));
  const breite = st => Math.max(...st.map(r => r.length));
  const rotation = st => st.every(r => r.every((v, p) => v === st[0][p]));

  // a)
  if (breite(vorher.st) !== 3) probleme.push(`a) Ausgangsplan mit ${breite(vorher.st)} Stationen`);
  else if (a.rolle !== "dialog" || a.modal !== "true") probleme.push("a) kein Fenster (role=dialog)");
  else if (!/3 → 2 Stationen/.test(a.text) || !/Kind B/.test(a.text) || !/Kind C/.test(a.text) || !a.text.includes(a0.klein)) probleme.push("a) Vorschau: " + a.text.slice(0, 260));
  else if (!a.unveraendert) probleme.push("a) die Vorschau hat den Plan schon geändert");
  else zeilen.push(`a) Vorschau: 3 → 2 Stationen, Kind B und C fehlen, „${a0.klein}“ wird getauscht – Plan noch unverändert`);

  // b)
  const inGruppe = b.gruppen.flat();
  if (breite(b.st) !== 2 || b.gruppen.length !== 2) probleme.push(`b) ${breite(b.st)} Stationen, ${b.gruppen.length} Gruppen`);
  else if (inGruppe.includes("Kind B") || inGruppe.includes("Kind C") || inGruppe.length !== 12) probleme.push("b) Gruppen: " + JSON.stringify(b.gruppen));
  else if (!rotation(b.st)) probleme.push("b) Rotation verloren: " + JSON.stringify(b.namen));
  else if (b.namen.flat().includes(a0.klein)) probleme.push(`b) „${a0.klein}“ steht noch im Plan`);
  else if (b.passt.some(x => x.p >= 2)) probleme.push("b) passt nicht: " + b.passt.filter(x => x.p >= 2).map(x => x.n).join(", "));
  else if (JSON.stringify(b.regeln) !== JSON.stringify(vorher.regeln)) probleme.push("b) Zusatzregeln verändert");
  else zeilen.push(`b) 2 Stationen (${b.namen[0].join(" · ")}), Gruppen ${b.gruppen.map(g => g.length).join("/")}, Rotation und Regeln bleiben`);

  // c)
  if (!/2 → 3 Stationen/.test(c.text)) probleme.push("c) Vorschau: " + c.text.slice(0, 200));
  else if (breite(c2.st) !== 3 || c2.st.some(r => r.some(v => v == null))) probleme.push("c) nach Übernehmen: " + JSON.stringify(c2.namen));
  else if (!rotation(c2.st)) probleme.push("c) Rotation verloren: " + JSON.stringify(c2.namen));
  else zeilen.push(`c) Trainer dazu: 3 Stationen, neue Station „${c2.namen[0][2]}“`);

  // d)
  if (!/Alles passt/.test(d.text) || d.ok) probleme.push("d) unverändert: " + d.text.slice(0, 160));
  else zeilen.push("d) nichts geändert → „Alles passt“, kein Übernehmen");

  // e)
  if (a0.knopf < 44 || a.knoepfe.some(x => x < 44)) probleme.push(`e) Knöpfe ${a0.knopf}/${a.knoepfe.join("/")} px`);
  else zeilen.push(`e) „Plan anpassen“ ${a0.knopf} px, Fensterknöpfe ${a.knoepfe.join("/")} px`);

  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
