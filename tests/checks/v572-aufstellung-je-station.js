/* v572 – Unter jeder Station steht, wie diese Gruppe an dieser Übung aufgestellt ist.

   (Seit v573 mit fünfzehn Kindern geprüft statt mit vierzehn – siehe Kommentar im Aufbau.)

   Befund des PO am 18.09., direkt nach v571: „Bei Rot sind fünf Spieler und kein Hinweis,
   dass einer wartet, weil die spielen ja nur drei plus eins.“ Genau so war es: Seit v571
   zeigt die App die Anpassung, die die Einheit für eine Gruppengröße nennt – und schwieg
   sonst, solange die Gruppe groß genug war. Bei L4-8 nennt das Block-Label sie für Feld 1
   („bei 5 wartet eines“) und für Feld 3, für Feld 2 nicht. An Feld 2 stand also eine
   Fünfergruppe vor „FUNiño 3 gegen 1“ – vier spielen, und was das fünfte Kind tut, stand
   nirgends.

   Rechnen lässt es sich immer: Die Übungsbeschreibung nennt die aktiven Plätze und die
   Wartenden getrennt („6 je Station (3 Angreifer, 1 Verteidiger, 2 warten als nächste)“).
   Seit v572 steht die Zeile deshalb in jedem Fall, in dem eine Zahl bekannt ist – mit der
   Anpassung der Einheit, wenn es eine gibt, sonst gerechnet.

   Fälle:
   a) Mehr Kinder als Plätze: „👥 5 Kinder: 4 spielen, eines wechselt ein“ – Einzahl und
      Mehrzahl richtig.
   b) Genau passend: „👥 4 Kinder: alle spielen“.
   c) Die Anpassung der Einheit geht vor – bei fünfzehn Kindern tritt dieser Fall an keinem
      Feld mehr ein (der Ausgleich aus v573 trifft überall die Plätze), geprüft wird er
      deshalb in v571 mit zwölf Kindern. Hier bleibt nur die Gegenprobe: Wo eine Anpassung
      steht, darf die gerechnete Fassung sie nicht überschreiben.
   d) Zu wenige: der Hinweis aus v571 bleibt, samt Weg.
   e) Keine Zahl im Freitext („8–14“ beim Aufwärmen) → keine Zeile, nichts Erfundenes. */
const L48 = "L4-8";
const FW = "FUNiño 3 gegen 2 mit Wandspieler – links, Mitte, rechts";
const F1 = "FUNiño 3 gegen 1 – der Mittlere hat den Ball";
const TW = "2 gegen 1 plus Torwart – der Flitzer macht es breit";

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");
  const vor = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8"));
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));

  /* Fünfzehn Kinder, nicht vierzehn wie beim PO: Seit v573 gleicht die App die Feldstärken an
     die Übungen an, und die drei Stationen von L4-8 haben zusammen genau vierzehn aktive
     Plätze (4 + 4 + 6). Mit vierzehn Kindern ginge alles auf, und den Fall dieser Prüfung –
     mehr Kinder als Plätze, eines wechselt ein – gäbe es nicht mehr. Mit fünfzehn bleibt an
     einem Feld eines übrig, und genau dort muss es stehen. */
  const datum = h.tagePlus(2);
  const custom = (bib.uebungen || []).map((u, i) => ({ ...u, id: 6000 + i, custom: true }));
  const rows = (vor.vorlagen || []).map((v, i) => ({ ...v, id: 500 + i }));
  const plaene = {};
  const s = await h.starten({
    hoehe: 2600,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen({ inaktiv: h.KINDER.slice(15) }), nominierungen: [], anwesenheit: [],
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

  const r = await s.page.evaluate(async ({ datum, L48 }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = { fehlt: [] };
    for (const n of ["tpGruppeHinweis", "tpUebungBedarf", "tpFeldVariante"]) if (typeof window[n] !== "function") out.fehlt.push(n);
    if (out.fehlt.length) return out;
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
    out.gruppen = ((tgFor() || {}).gruppen || []).map(g => g.kinder.length);

    /* Alle Stationen aller Hauptteile einsammeln: Übung, Gruppengröße, gezeigte Zeile. */
    out.stationen = [];
    tpSlots.forEach((sl, si) => {
      if (!tpIstHauptteil(sl.typ)) return;
      [...document.querySelectorAll(`.tp-form-sel[id^="tp-form-${si}-"]`)].forEach((sel, p) => {
        if (!sel.value) return;
        const g = _tpStationGruppe[sel.id] || {};
        out.stationen.push({
          si, p, name: (tpAllForms()[+sel.value] || {}).name || "",
          n: g.n, aktiv: tpUebungBedarf(+sel.value),
          text: ((document.getElementById(sel.id + "-grp") || {}).textContent || "").replace(/\s+/g, " ").trim()
        });
      });
    });
    /* e) Das Aufwärmen nennt „8–14“ – keine Zahl je Station, also auch keine Zeile. */
    const warm = tpSlots.findIndex(sl => sl.typ === "warmup" && !tpIstHauptteil(sl.typ));
    const wsel = document.querySelector(`.tp-form-sel[id^="tp-form-${warm}-"]`);
    out.warmup = wsel ? { name: (tpAllForms()[+wsel.value] || {}).name || "", text: ((document.getElementById(wsel.id + "-grp") || {}).textContent || "").trim() } : null;
    return out;
  }, { datum, L48 });

  const fehler = s.fehler();
  await s.schliessen();
  if (r.fehlt.length) return h.ergebnis("Aufstellung je Station", false, [r.fehlt.join(", ") + " fehlt"]);

  if (r.kinder !== 15) probleme.push(`${r.kinder} Kinder im Pool statt 15`);
  if (String(r.gruppen.slice().sort()) !== "5,5,5") probleme.push(`Gruppen ${r.gruppen.join("/")} statt 5/5/5`);

  // a) mehr Kinder als Plätze – der Fall des PO an „3 gegen 1“
  const mehr = r.stationen.filter(x => x.aktiv && x.n > x.aktiv);
  if (!mehr.length) probleme.push("Keine Station, an der mehr Kinder als Plätze stehen – der Fall des PO tritt gar nicht ein");
  mehr.forEach(x => {
    const rest = x.n - x.aktiv;
    const soll = `👥 ${x.n} Kinder: ${x.aktiv} spielen, ${rest === 1 ? "eines wechselt" : rest + " wechseln"} ein`;
    /* Nennt die Einheit für diese Größe selbst etwas, geht ihr Text vor (Fall c). */
    const eigen = /Kinder: (wartet|nur |zwei |startet)/.test(x.text);
    if (!eigen && !x.text.includes(soll)) probleme.push(`„${x.name.slice(0, 28)}“ mit ${x.n} Kindern zeigt „${x.text.slice(0, 70)}“ statt „${soll}“`);
  });
  // b) genau passend
  const genau = r.stationen.filter(x => x.aktiv && x.n === x.aktiv);
  genau.forEach(x => {
    const eigen = /Kinder: (wartet|nur |zwei |startet)/.test(x.text);
    if (!eigen && !x.text.includes(`👥 ${x.n} Kinder: alle spielen`)) probleme.push(`„${x.name.slice(0, 28)}“ mit genau ${x.n} Kindern zeigt „${x.text.slice(0, 70)}“ statt „alle spielen“`);
  });
  /* c) Gegenprobe: Wo die Einheit eine Anpassung nennt, steht sie – und nicht die gerechnete
     Fassung daneben. Bei fünfzehn Kindern kommt das an keinem Feld vor (v571 prüft es mit
     zwölf); die Schleifen laufen dann leer, und das ist hier richtig so. */
  const feld1 = r.stationen.filter(x => x.name === TW && x.n === 5);
  feld1.forEach(x => { if (!/5 Kinder: wartet eines/.test(x.text)) probleme.push(`Feld 1 mit fünf Kindern zeigt nicht die Angabe der Einheit („wartet eines“), sondern „${x.text.slice(0, 70)}“`); });
  const wand4 = r.stationen.filter(x => x.name === FW && x.n === 4);
  wand4.forEach(x => { if (!/4 Kinder: zwei Angreifer/.test(x.text)) probleme.push(`Feld 3 mit vier Kindern zeigt nicht die Anpassung der Einheit, sondern „${x.text.slice(0, 70)}“`); });
  const doppelt = r.stationen.filter(x => /Kinder: .*(wartet|nur |zwei Angreifer)/.test(x.text) && /spielen,|alle spielen/.test(x.text));
  if (doppelt.length) probleme.push(`An ${doppelt.length} Station(en) stehen Anpassung und gerechnete Fassung nebeneinander: „${doppelt[0].text.slice(0, 90)}“`);
  // d) zu wenige – der Hinweis aus v571 bleibt
  const wenig = r.stationen.filter(x => x.aktiv && x.n < x.aktiv && !/Kinder: (wartet|nur |zwei |startet)/.test(x.text));
  wenig.forEach(x => { if (!/ist für \d+ gedacht/.test(x.text)) probleme.push(`Zu kleine Gruppe an „${x.name.slice(0, 28)}“ ohne Hinweis: „${x.text.slice(0, 70)}“`); });
  // e) ohne Zahl im Freitext keine Zeile
  if (r.warmup && r.warmup.text) probleme.push(`Das Aufwärmen („${r.warmup.name.slice(0, 24)}“) bekommt eine Zeile, obwohl seine Beschreibung keine Zahl je Station nennt: „${r.warmup.text.slice(0, 60)}“`);
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);

  if (!probleme.length) {
    const f2 = r.stationen.find(x => x.name === F1 && x.n === 5);
    zeilen.push(`15 Kinder → Einteilung ${r.gruppen.join("/")} · ${r.stationen.length} besetzte Stationen in den Hauptteilen`);
    if (f2) zeilen.push(`Der Fall des PO: „${f2.text.slice(0, 80)}“`);
    zeilen.push(`Anpassung der Einheit: ${feld1.length}× an Feld 1, ${wand4.length}× an Feld 3 · nie doppelt mit der gerechneten Fassung`);
    zeilen.push(`Genau passend: ${genau.length} Station(en) „alle spielen“ · Aufwärmen ohne Zahl: keine Zeile`);
  }
  return h.ergebnis("Aufstellung je Station", !probleme.length, zeilen.concat(probleme));
};
