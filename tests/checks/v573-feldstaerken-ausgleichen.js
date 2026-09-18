/* v573 – An jedem Feld steht die Zahl, die die Übung dort braucht.

   Befund des PO am 18.09., dritter Anlauf am selben Bildschirmfoto: „Bei der Gruppe Grüne
   Krokodile ist die Übung aber für sechs Kinder. Und in der Gruppeneinteilung sind nur vier
   eingeteilt.“ Die drei Stationen von L4-8 brauchen verschieden viele Kinder: „2 gegen 1 plus
   Torwart“ und „FUNiño 3 gegen 1“ je vier aktive Plätze (ihre Beschreibung rechnet zwei
   Wartende dazu), „3 gegen 2 mit Wandspieler“ sechs – dort wartet niemand. Vierzehn Kinder
   sind also genau 4 + 4 + 6. Die App teilte gleichmäßig 5/5/4 und stellte die Vierergruppe
   ausgerechnet an das Feld, das sechs braucht.

   Seit v573 wandern für den einzelnen Hauptteil so viele Kinder mit, wie die Übungen
   verlangen – die gespeicherte Einteilung (Name, Trainer, Gruppe des Kindes) bleibt davon
   unberührt, und der Plan sagt namentlich, wer für diesen Block das Feld wechselt.

   Fälle:
   a) Die Rechnung: [5,5,4] mit Bedarf [4,4,6] wird [4,4,6]; kein Kind geht verloren; ein Feld
      gibt nie unter seinen eigenen Bedarf ab; ohne Bedarfe bleibt alles, wie es ist.
   b) Der echte Fall am DOM: L4-8 mit vierzehn Kindern → Feld 3 sechs, Feld 1 und 2 je vier,
      und an Feld 3 steht „alle spielen“ statt einer Anpassung für vier.
   c) Auch nach dem Weiterrücken: in allen drei Hauptteilen 4/4/6.
   d) Der Trainingsstart (`_tlSnapshot`) zeigt dieselben Feldstärken wie die Zeitleiste – seit
      v573 auch mit Versatz.
   e) Die Leihkinder stehen namentlich am Feld, aus dem sie kommen und an dem sie spielen. */
const L48 = "L4-8";
const FW = "FUNiño 3 gegen 2 mit Wandspieler – links, Mitte, rechts";

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");
  const vor = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8"));
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));

  const datum = h.tagePlus(2);
  const custom = (bib.uebungen || []).map((u, i) => ({ ...u, id: 6000 + i, custom: true }));
  const rows = (vor.vorlagen || []).map((v, i) => ({ ...v, id: 500 + i }));
  const plaene = {};
  const s = await h.starten({
    hoehe: 2600,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen({ inaktiv: h.KINDER.slice(14) }), nominierungen: [], anwesenheit: [],
      termine: (u) => {
        const d = (u.searchParams.get("datum") || "").replace(/^eq\./, "");
        const alle = [{ id: 91, datum, typ: "training", trainer_status: { Charles: "ja", Finn: "ja" } }];
        return alle.filter(t => !d || t.datum === d);
      },
      trainingsformen: custom,
      trainingsvorlagen: rows,
      trainingsgruppen: (u, req) => (req.method() === "POST" ? { status: 201, body: "[]" } : []),
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

  const r = await s.page.evaluate(async ({ datum, L48, FW }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = { fehlt: [] };
    for (const n of ["tpFelderAusgleich", "tpFeldBedarfe", "tpFelderGruppen", "_tlSnapshot"]) if (typeof window[n] !== "function") out.fehlt.push(n);
    if (out.fehlt.length) return out;

    // a) die Rechnung, unabhängig vom DOM
    const bau = (...n) => n.map((k, i) => ({ name: "G" + i, emo: "👥", kinder: Array.from({ length: k }, (_, j) => "G" + i + "-" + j) }));
    const roh = tpFelderAusgleich(bau(5, 5, 4), [4, 4, 6]);
    out.a1 = roh.map(f => f.kinder.length);
    out.a1summe = roh.reduce((a, f) => a + f.kinder.length, 0);
    out.a1geliehen = (roh[2].geliehen || []).length;
    out.a1fremd = (roh[2].geliehen || []).map(x => x.von);
    // niemand gibt unter den eigenen Bedarf ab: [4,4,4] mit Bedarf [4,4,6] bleibt
    out.a2 = tpFelderAusgleich(bau(4, 4, 4), [4, 4, 6]).map(f => f.kinder.length);
    // ohne Bedarfe unverändert
    out.a3 = tpFelderAusgleich(bau(5, 5, 4), null).map(f => f.kinder.length);
    // eine Übermenge wird nicht künstlich verteilt
    out.a4 = tpFelderAusgleich(bau(6, 6, 6), [4, 4, 6]).map(f => f.kinder.length);

    await loadKader();
    const feld = document.getElementById("tp-date");
    if (feld && ![...feld.options].some(o => o.value === datum)) feld.add(new Option(datum, datum));
    if (feld) feld.value = datum;
    await tpTrainerRsvpLaden(datum);
    out.kinder = _tgPool().namen.length;
    await vorlagenLaden();
    await tgSync(); await warte(120);
    const idVon = pfx => String((VORLAGEN.find(v => String(v.name).startsWith(pfx + " ")) || {}).id);
    _vuAuswahl = idVon(L48); await vorlageUebernehmenSetzen(); await warte(500);
    out.gespeichert = ((tgFor() || {}).gruppen || []).map(g => g.kinder.length);

    // b) + c) je Hauptteil die Feldstärken und die Übung dazu
    out.haupt = [];
    tpSlots.forEach((sl, si) => {
      if (!tpIstHauptteil(sl.typ)) return;
      const sels = [...document.querySelectorAll(`.tp-form-sel[id^="tp-form-${si}-"]`)];
      out.haupt.push({
        si, versatz: tpVersatz(si),
        bedarf: tpFeldBedarfe(si, sels.length),
        felder: sels.map((sel, p) => {
          const g = _tpStationGruppe[sel.id] || {};
          return { n: g.n, uebung: sel.value ? (tpAllForms()[+sel.value] || {}).name || "" : "", text: ((document.getElementById(sel.id + "-grp") || {}).textContent || "").replace(/\s+/g, " ").trim() };
        })
      });
    });
    // e) Leihkinder am Feld
    out.leih = [...document.querySelectorAll(".tp-leih")].map(x => x.textContent.replace(/\s+/g, " ").trim());

    // d) Trainingsstart
    const snap = _tlSnapshot();
    out.start = snap.filter(st => /Hauptteil/.test(st.label)).map(st => st.gruppen.map(g => (g.kinder || []).length));
    return out;
  }, { datum, L48, FW });

  const fehler = s.fehler();
  await s.schliessen();
  if (r.fehlt.length) return h.ergebnis("Feldstärken ausgleichen", false, [r.fehlt.join(", ") + " fehlt"]);

  // a)
  if (String(r.a1) !== "4,4,6") probleme.push(`Ausgleich [5,5,4] mit Bedarf [4,4,6] ergibt ${JSON.stringify(r.a1)} statt [4,4,6]`);
  if (r.a1summe !== 14) probleme.push(`Beim Ausgleich gehen Kinder verloren: ${r.a1summe} statt 14`);
  if (r.a1geliehen !== 2) probleme.push(`Feld 3 weist ${r.a1geliehen} geliehene Kinder aus statt zwei`);
  if (new Set(r.a1fremd).size !== 2) probleme.push(`Beide Leihkinder kommen von derselben Gruppe (${JSON.stringify(r.a1fremd)}) – der Überschuss war aber auf zwei Felder verteilt`);
  if (String(r.a2) !== "4,4,4") probleme.push(`Ein Feld gibt unter seinen eigenen Bedarf ab: ${JSON.stringify(r.a2)} statt [4,4,4]`);
  if (String(r.a3) !== "5,5,4") probleme.push(`Ohne Bedarfe wird trotzdem verschoben: ${JSON.stringify(r.a3)}`);
  if (String(r.a4) !== "6,6,6") probleme.push(`Bei ausreichender Besetzung wird trotzdem verschoben: ${JSON.stringify(r.a4)}`);

  // b) + c)
  if (r.kinder !== 14) probleme.push(`${r.kinder} Kinder im Pool statt 14`);
  if (String(r.gespeichert.slice().sort()) !== "4,5,5") probleme.push(`Die gespeicherte Einteilung ist ${r.gespeichert.join("/")} statt 5/5/4 – sie darf sich nicht ändern`);
  if (r.haupt.length !== 3) probleme.push(`${r.haupt.length} Hauptteile statt drei`);
  r.haupt.forEach(ht => {
    const n = ht.felder.map(f => f.n);
    const soll = ht.bedarf;
    ht.felder.forEach((f, i) => {
      if (soll[i] && f.n !== soll[i]) probleme.push(`Block ${ht.si}, Feld ${i + 1} („${f.uebung.slice(0, 26)}“): ${f.n} Kinder, die Übung braucht ${soll[i]}`);
    });
    if (n.reduce((a, b) => a + b, 0) !== 14) probleme.push(`Block ${ht.si}: ${n.join("+")} = ${n.reduce((a, b) => a + b, 0)} Kinder statt 14`);
  });
  const wand = r.haupt.flatMap(ht => ht.felder.filter(f => f.uebung === FW));
  if (wand.length !== 3) probleme.push(`Die Wandspieler-Übung steht an ${wand.length} Feldern statt an dreien`);
  wand.forEach(f => {
    if (f.n !== 6) probleme.push(`Am Wandspieler-Feld stehen ${f.n} Kinder statt sechs`);
    if (!/6 Kinder: alle spielen/.test(f.text)) probleme.push(`Am Wandspieler-Feld steht „${f.text.slice(0, 70)}“ statt „6 Kinder: alle spielen“`);
  });
  // e)
  if (!r.leih.length) probleme.push("Kein Feld weist die geliehenen Kinder aus");
  else if (!/Dazu für diesen Block/.test(r.leih.join(" ")) || !/spielt an Feld/.test(r.leih.join(" "))) probleme.push(`Die Leihzeile nennt nicht beides (woher, wohin): ${JSON.stringify(r.leih.slice(0, 2))}`);
  // d)
  r.start.forEach((st, i) => {
    const plan = (r.haupt[i] || {}).felder || [];
    if (String(st) !== String(plan.map(f => f.n))) probleme.push(`Trainingsstart Block ${i + 1}: ${JSON.stringify(st)} statt ${JSON.stringify(plan.map(f => f.n))} wie in der Zeitleiste`);
  });
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);

  if (!probleme.length) {
    zeilen.push(`Rechnung: [5,5,4] + Bedarf [4,4,6] → [4,4,6], 14 Kinder erhalten, zwei Leihkinder von zwei Feldern · ohne Bedarf unverändert`);
    zeilen.push(`14 Kinder, Einteilung bleibt ${r.gespeichert.join("/")} · auf den Feldern je Hauptteil ${r.haupt.map(ht => ht.felder.map(f => f.n).join("/")).join(" · ")}`);
    zeilen.push(`Wandspieler-Feld in allen drei Hauptteilen mit sechs Kindern: „alle spielen“`);
    zeilen.push(`Am Feld: „${(r.leih[0] || "").slice(0, 90)}“ · Trainingsstart deckungsgleich mit der Zeitleiste`);
  }
  return h.ergebnis("Feldstärken ausgleichen", !probleme.length, zeilen.concat(probleme));
};
