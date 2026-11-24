/* v959 · Charles 23.11.: „Wir haben montags jetzt immer einen Part Torwart-Skill-Training, 30 Minuten ca. … Also montags
   diesen Block bei der Trainingsplanung mit einsetzen. Kann aber wie alle anderen gelöscht werden. Da brauchen wir aber
   keine inhaltliche Planung. Wenn … die Torhüter da sind, dann trainieren die mit [dem Torwarttrainer] und nicht in der
   Zeit in den anderen Übungen.“ Freigegeben: ab einem Torhüter, fester Name am Block, neben dem ganzen Hauptteil.
   a) tpTorwartMontag: montags mit Torhüter → Block (typ tw, alle, extern = Name aus dem letzten Plan), parallel zum ersten
      Hauptteil; freitags, ohne anwesenden Torhüter oder mit schon vorhandenem Torwart-Block → nichts.
   b) Dauer = Summe der Hauptteile (17 + 17 = 34); die Einheit wird nicht länger.
   c) Keine Übung: tpFelderZahl 0; gezeichnet „Torhüter heute“ mit den Anwesenden und das Feld „Torwarttrainer“, kein
      Auswahlfeld; die Listenzeile nennt Name und Torhüter, kein „Übung fehlt“.
   d) Trainingsstart (_tlSnapshot): in beiden Hauptteilen eine Zeile „🧤 Torwart-Training mit …“ beim Torwarttrainer; die
      Torhüter stehen in keiner Feldgruppe. Keine echten Namen im Repo: Torwarttrainer heißt hier „Trainer T“. */
"use strict";
module.exports = async function (h) {
  const titel = "v959 Torwart-Training montags: neben dem Hauptteil, ohne Übung, mit festem Namen";
  const probleme = [], zeilen = [];
  const kader = h.kaderZeilen().map((k, i) => ({ ...k, tw: i < 3 }));
  const s = await h.starten({ start: "/trainer/index.html", angemeldet: true, warten: 2500,
    supabase: h.supabaseAttrappe({ kader, trainingsplan: [{ datum: "2026-11-16", slots: [{ typ: "tw", alle: true, extern: "Trainer T", label: "Torwart-Training" }] }] }) });
  const r = await s.page.evaluate(async () => {
    if (typeof tpTorwartMontag !== "function") return { alt: true };
    const w = ms => new Promise(x => setTimeout(x, ms)), txt = el => el ? el.textContent.replace(/\s+/g, " ").trim() : "";
    for (let i = 0; i < 30 && !KADER.length; i++) await w(100);
    const out = {};
    const rahmen = () => [
      { label: "Straßenfußball-Fenster", dauer: 10, typ: "warmup" }, { label: "Aufwärmen", dauer: 8, typ: "warmup" },
      { label: "Hauptteil 1", dauer: 17, typ: "main" }, { label: "Hauptteil 2", dauer: 17, typ: "main" },
      { label: "Abschlussspiel", dauer: 18, typ: "abschluss" }];
    TP_KIND_ABSAGE = [];
    tpSlots = rahmen(); out.freitag = await tpTorwartMontag("2026-11-27");
    tpSlots = rahmen(); TP_KIND_ABSAGE = KADER.filter(k => k.tw).map(k => k.name); out.ohneTw = await tpTorwartMontag("2026-11-30");
    TP_KIND_ABSAGE = [KADER.filter(k => k.tw)[2].name];   // einer sagt ab
    tpSlots = rahmen(); out.montag = await tpTorwartMontag("2026-11-30");
    const tw = tpSlots.find(x => x.typ === "tw") || {};
    out.slot = { alle: tw.alle, extern: tw.extern, parallelZu: tw.parallelZu, label: tw.label };
    out.nochmal = await tpTorwartMontag("2026-11-30");
    _tpParallelOrdnen();
    out.dauer = tw.dauer;
    out.gesamt = tpSlots.filter(x => !tpIstParallel(x)).reduce((a, x) => a + x.dauer, 0);
    const si = tpSlots.indexOf(tw);
    _tpFelderStand = { trainer: ["Trainer A", "Trainer B"], tgAnz: 2 };
    out.felder = tpFelderZahl(si);
    out.angebot = tpTwAngebot(si).map(k => k.name);
    // c) Zeichnen
    let tl = document.getElementById("tp-timeline");
    if (tl) {
      try { tpGeaendert({ speichern: "nein" }); } catch (e) { out.zeichnenFehler = String(e); }
      await w(300);
      const el = document.querySelector(`#tp-timeline .tp-slot[data-si="${si}"]`);
      out.c = { da: !!el, text: txt(el), auswahl: !!document.getElementById(`tp-form-${si}-0`), name: (document.getElementById(`tp-tw-extern-${si}`) || {}).value || null,
        haken: [...document.querySelectorAll(`.tp-tw-player[data-slot="${si}"]`)].map(c => c.value) };
      out.zeile = el ? _tpBlockZeileHtml(el).replace(/<[^>]+>/g, "") : "";
    } else out.c = { keineSeite: true };
    // d) Snapshot
    try {
      const st = _tlSnapshot();
      const ht = st.filter(x => /Hauptteil/.test(x.label));
      out.d = ht.map(x => ({ label: x.label, tw: x.gruppen.filter(g => /Torwart-Training/.test(g.uebung)).map(g => g.trainer + ": " + g.uebung),
        twInGruppe: x.gruppen.filter(g => !/Torwart/.test(g.uebung) && Array.isArray(g.kinder)).some(g => g.kinder.some(k => out.angebot.includes(k))) }));
    } catch (e) { out.d = { fehler: String(e) }; }
    return out;
  }).catch(err => ({ fehler: String(err) }));
  const fe = s.fehler(); await s.schliessen();
  if (r.alt) return h.ergebnis(titel, false, ["tpTorwartMontag fehlt (Stand vor v959)"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  if (r.freitag !== false || r.ohneTw !== false || r.montag !== true || r.nochmal !== false) probleme.push(`a) Fr ${r.freitag} · ohne Torhüter ${r.ohneTw} · Mo ${r.montag} · zweimal ${r.nochmal}`);
  if (!r.slot.alle || r.slot.extern !== "Trainer T" || r.slot.parallelZu !== 2) probleme.push("a) Block " + JSON.stringify(r.slot));
  if (r.dauer !== 34 || r.gesamt !== 70) probleme.push(`b) Dauer ${r.dauer}, Einheit ${r.gesamt}`);
  if (r.felder !== 0) probleme.push("c) Übungsfelder " + r.felder);
  if (r.angebot.length !== 2) probleme.push("c) Torhüter heute " + JSON.stringify(r.angebot));
  if (r.c.keineSeite) zeilen.push("c) ohne Planungsseite übersprungen");
  else {
    if (!r.c.da || r.c.auswahl || r.c.name !== "Trainer T" || r.c.haken.length !== 2 || !/Torhüter heute/.test(r.c.text) || !/Keine Übung nötig/.test(r.c.text) || !/neben dem ganzen Hauptteil/.test(r.c.text)) probleme.push("c) gezeichnet " + JSON.stringify(r.c).slice(0, 300) + (r.zeichnenFehler ? " · " + r.zeichnenFehler : ""));
    if (!/mit Trainer T/.test(r.zeile) || /Übung fehlt/.test(r.zeile)) probleme.push("c) Listenzeile „" + r.zeile + "“");
  }
  if (!Array.isArray(r.d) || r.d.length < 2 || r.d.some(x => x.tw.length !== 1 || !/^Trainer T: 🧤 Torwart-Training mit /.test(x.tw[0]) || x.twInGruppe)) probleme.push("d) Snapshot " + JSON.stringify(r.d).slice(0, 400));
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`a) Mo ${r.montag}, Fr ${r.freitag}, ohne Torhüter ${r.ohneTw} · b) ${r.dauer} Min neben ${r.gesamt} Min Einheit · c) ${r.angebot.length} Torhüter heute, Zeile „${String(r.zeile || "").slice(0, 60)}“`);
  zeilen.push(`d) ${Array.isArray(r.d) ? r.d.map(x => x.label + ": " + x.tw.join("")).join(" | ").slice(0, 200) : ""}`);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
