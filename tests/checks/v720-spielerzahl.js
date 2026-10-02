/* v720 · Kinder je Station von–bis und „mit Torwart“ als feste Felder je Übung.
   PO 02.10.: „jede Übungsform auf eine genaue Anzahl an Spielern festlegen, sodass es einfacher
   wird, eine Übung dann auszutauschen“ – und: „bei manchen Aufgaben auch die Torwartposition
   festlegen“. Kachel: „Von–bis + Torwart“.
   a) Text → Spanne: Wartende zählen zur Obergrenze (vorher abgezogen: „6 je Station (2 gegen 2,
      2 Rotationsspieler)“ galt als genau 4), „bis 8“, „= 6 - 8“, „à 4“, Torwart erkannt, Leeres unsicher
   b) Feste Felder gewinnen über den Text
   c) Editor: Text tippen füllt von/bis/Torwart vor; von Hand Getipptes bleibt; „Übung erfassen“
      schreibt spieler_min, spieler_max, mit_torwart mit
   d) Bearbeiten zeigt die gespeicherten Werte und schreibt sie im PATCH zurück
   e) Übungsansicht: „👥 4–7 je Station · 🧤 Torwart“
   f) Station mit Torwart-Übung nennt das Torwart-Kind der Gruppe, sonst „wechselt durch“
   g) Beim Bilden der Gruppen bekommt jede Gruppe ein Torwart-Kind, wenn es genug gibt */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const inaktiv = h.KINDER.slice(14);
  const d3 = h.tagePlus(2);
  const gesendet = [];
  const eigene = [
    { id: 501, name: "Testform Feste Felder", kat: "passspiel", typ: "main", spieler: "6", spieler_min: 4, spieler_max: 7, mit_torwart: true, custom: true, tags: "Eigene Übung", dauer: "10" },
    { id: 502, name: "Testform Ohne Felder", kat: "passspiel", typ: "main", spieler: "6 je Station (2 gegen 2, 2 Rotationsspieler)", custom: true, tags: "Eigene Übung", dauer: "10" }];
  const termine = (u) => { const d = (u.searchParams.get("datum") || "").replace(/^eq\./, ""); return [{ id: 91, datum: d3, typ: "training", trainer_status: { Charles: "ja", Finn: "ja" } }].filter(t => !d || t.datum === d); };
  const s = await h.starten({
    hoehe: 2600, breite: 390,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen({ inaktiv }), nominierungen: [], anwesenheit: [], termine, periodisierung: [], tagebuch_punkt: [], rueckmeldungen: [],
      trainingsformen: (u, req) => {
        if (req.method() !== "GET") { gesendet.push({ m: req.method(), body: (() => { try { return JSON.parse(req.postData() || "null"); } catch (e) { return null; } })() }); return { status: 201, body: JSON.stringify([{ id: 777 }]) }; }
        return eigene;
      },
      trainingsgruppen: (u, req) => (req.method() === "POST" ? { status: 201, body: "[]" } : []),
      trainingsplan: (u, req) => (req.method() === "POST" ? { status: 201, body: "[]" } : [])
    })
  });
  await h.sichtbarMachen(s.page, "#train-sub-planung");
  await h.sichtbarMachen(s.page, "#tp-timeline");

  const r = await s.page.evaluate(async ({ d3 }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = { fehlt: ["tpSpielerAusText", "tfSpielerAbleiten", "tfSpielerZahlLesen", "tpTorwartHinweis", "tgTorwartVerteilen"].filter(n => typeof window[n] !== "function") };
    if (out.fehlt.length) return out;
    if (typeof loadCustomForms === "function") await loadCustomForms();
    await loadKader();
    // a)
    const F = t => { const x = tpSpielerAusText(t); return x.alle ? "alle" : (x.sicher ? `${x.min}–${x.max}` : "?") + (x.tw ? " TW" : ""); };
    out.a = {
      "6 je Station (2 gegen 2, 2 Rotationsspieler)": F("6 je Station (2 gegen 2, 2 Rotationsspieler)"),
      "6 (3 gegen 3), mit Wechselkindern bis 8": F("6 (3 gegen 3), mit Wechselkindern bis 8"),
      "5 - 7 (plus 1 Torwart) = 6 - 8": F("5 - 7 (plus 1 Torwart) = 6 - 8"),
      "12 (3 Felder à 4)": F("12 (3 Felder à 4)"),
      "4 je Feld (TW + 3), bis 6 mit Wechsel": F("4 je Feld (TW + 3), bis 6 mit Wechsel"),
      "6 je Station (Torwart + 2 gegen 2, 1 wartet)": F("6 je Station (Torwart + 2 gegen 2, 1 wartet)"),
      "": F(""), "beliebig": F("beliebig")
    };
    // b)
    const alle = tpAllForms();
    const i1 = alle.findIndex(f => f.name === "Testform Feste Felder"), i2 = alle.findIndex(f => f.name === "Testform Ohne Felder");
    out.b = { fest: tpUebungSpanne(i1), text: tpUebungSpanne(i2) };
    // c) Editor neu
    openAddTraining();
    document.getElementById("tf-name").value = "Testform Neu";
    const sp = document.getElementById("tf-spieler");
    sp.value = "6 je Station (Torwart + 2 gegen 2, 1 wartet)"; sp.dispatchEvent(new Event("input"));
    const mn = document.getElementById("tf-min"), mx = document.getElementById("tf-max"), tw = document.getElementById("tf-tw");
    out.c = { vor: [mn.value, mx.value, tw.checked],
      hoehen: [mn, mx].map(e => Math.round(e.getBoundingClientRect().height)) };
    mx.value = "7"; mx.dispatchEvent(new Event("input"));
    sp.value = "8"; sp.dispatchEvent(new Event("input"));
    out.c.nachHand = [mn.value, mx.value];
    await saveCustomTraining(); await warte(300);
    // d) Bearbeiten
    const i1b = tpAllForms().findIndex(f => f.name === "Testform Feste Felder");
    uebungBearbeiten(i1b); await warte(100);
    out.d = { werte: [document.getElementById("tf-min").value, document.getElementById("tf-max").value, document.getElementById("tf-tw").checked] };
    document.getElementById("tf-min").value = "5"; document.getElementById("tf-min").dispatchEvent(new Event("input"));
    await saveCustomTraining(); await warte(300);
    // e) Übungsansicht
    tpShowExercise(tpAllForms().findIndex(f => f.name === "Testform Feste Felder")); await warte(150);
    const chip = document.querySelector(".tp-ex-spieler");
    out.e = chip ? chip.textContent.replace(/\s+/g, " ").trim() : null;
    document.getElementById("uebung-modal")?.remove();
    // f) Torwart an der Station
    const kA = KADER.find(k => k.name === "Kind A"); const tw2 = KADER.find(k => k.name === "Kind F"); if (tw2) tw2.tw = true;
    const info1 = { kinder: ["Kind B", "Kind A", "Kind C"] }, info2 = { kinder: ["Kind D", "Kind E"] };
    const ix = tpAllForms().findIndex(f => f.name === "Testform Feste Felder");
    out.f = { mit: tpTorwartHinweis(ix, info1).replace(/<[^>]+>/g, ""), ohne: tpTorwartHinweis(ix, info2).replace(/<[^>]+>/g, ""),
      ohneTwUebung: tpTorwartHinweis(tpAllForms().findIndex(f => f.name === "Testform Ohne Felder"), info1), kA: !!(kA && kA.tw) };
    // g) Verteilen
    const g = tgTorwartVerteilen([{ kinder: ["Kind A", "Kind F", "Kind B"] }, { kinder: ["Kind C", "Kind D", "Kind E"] }]);
    out.g = g.map(x => x.kinder.filter(n => KADER.find(k => k.name === n && k.tw)).length);
    return out;
  }, { d3 });
  const fehler = s.fehler();
  await s.schliessen();
  const titel = "v720 Spielerzahl: von–bis und Torwart je Übung";
  if (r.fehlt && r.fehlt.length) return h.ergebnis(titel, false, [r.fehlt.join(", ") + " fehlt"]);
  if (fehler.length) probleme.push("Konsole: " + fehler.slice(0, 2).join(" | "));

  const soll = { "6 je Station (2 gegen 2, 2 Rotationsspieler)": "4–6", "6 (3 gegen 3), mit Wechselkindern bis 8": "6–8", "5 - 7 (plus 1 Torwart) = 6 - 8": "6–8 TW",
    "12 (3 Felder à 4)": "4–4", "4 je Feld (TW + 3), bis 6 mit Wechsel": "4–6 TW", "6 je Station (Torwart + 2 gegen 2, 1 wartet)": "5–6 TW", "": "?", "beliebig": "alle" };
  const falsch = Object.keys(soll).filter(k => r.a[k] !== soll[k]);
  if (falsch.length) probleme.push("a) " + falsch.map(k => `„${k}“ → ${r.a[k]} statt ${soll[k]}`).join("; "));
  else zeilen.push("a) „6 je Station (2 gegen 2, 2 Rotationsspieler)“ → 4–6 (vorher genau 4), „bis 8“, „= 6 - 8“, „à 4“, Torwart erkannt");

  if (r.b.fest.min !== 4 || r.b.fest.max !== 7 || !r.b.fest.tw || r.b.text.min !== 4 || r.b.text.max !== 6) probleme.push("b) " + JSON.stringify(r.b));
  else zeilen.push("b) feste Felder 4–7 mit Torwart gewinnen über den Text „6“");

  const post = gesendet.find(x => x.m === "POST" && x.body && x.body.name === "Testform Neu");
  if (JSON.stringify(r.c.vor) !== JSON.stringify(["5", "6", true])) probleme.push("c) vorbelegt: " + JSON.stringify(r.c.vor));
  else if (JSON.stringify(r.c.nachHand) !== JSON.stringify(["5", "7"])) probleme.push("c) von Hand überschrieben: " + JSON.stringify(r.c.nachHand));
  else if (!post || post.body.spieler_min !== 5 || post.body.spieler_max !== 7 || post.body.mit_torwart !== true) probleme.push("c) gesendet: " + JSON.stringify(post && post.body).slice(0, 200));
  else if (r.c.hoehen.some(x => x < 44)) probleme.push("c) Felder " + r.c.hoehen.join("/") + " px");
  else zeilen.push("c) Text füllt 5–6 + Torwart vor, „bis 7“ von Hand bleibt, gespeichert 5–7 mit Torwart");

  const patch = gesendet.find(x => x.m === "PATCH" && x.body && x.body.name === "Testform Feste Felder");
  if (JSON.stringify(r.d.werte) !== JSON.stringify(["4", "7", true])) probleme.push("d) Bearbeiten zeigt " + JSON.stringify(r.d.werte));
  else if (!patch || patch.body.spieler_min !== 5 || patch.body.spieler_max !== 7 || patch.body.mit_torwart !== true) probleme.push("d) PATCH: " + JSON.stringify(patch && patch.body).slice(0, 200));
  else zeilen.push("d) Bearbeiten zeigt 4–7 + Torwart, PATCH schreibt 5–7 zurück");

  if (!r.e || !/5–7 je Station/.test(r.e) || !/Torwart/.test(r.e)) probleme.push("e) Ansicht: " + r.e);
  else zeilen.push(`e) Ansicht „${r.e}“`);

  if (!r.f.kA || !/Torwart: Kind A/.test(r.f.mit) || !/wechselt durch/.test(r.f.ohne) || r.f.ohneTwUebung) probleme.push("f) " + JSON.stringify(r.f));
  else zeilen.push(`f) Station: „${r.f.mit.trim()}“ · ohne Torwart-Kind „wechselt durch“`);

  if (JSON.stringify(r.g) !== "[1,1]") probleme.push("g) Torwart-Kinder je Gruppe " + JSON.stringify(r.g));
  else zeilen.push("g) zwei Torwart-Kinder auf zwei Gruppen verteilt");

  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
