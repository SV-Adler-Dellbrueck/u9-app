/* v571 – Was an DIESEM Feld für DIESE Gruppe gilt.

   Befund des PO am 18.09., mit Bildschirmfoto: L4-8 übernommen, dreizehn Kinder, drei Felder
   sauber gebildet (5/4/4) – und an Feld 3 „FUNiño 3 gegen 2 mit Wandspieler“ die vier Grünen
   Krokodile. „Die letzte Übung braucht 5 Spieler, es sind aber nur 4 Spieler in der Gruppe.“

   Die Antwort stand längst in der Einheit: Das Block-Label von L4-8 nennt für Feld 3
   „(bei 5 nur ein Verteidiger, bei 4 zwei Angreifer gegen einen Verteidiger plus
   Wandspieler)“. Nur stand das Label einmal oben am Block, alle drei Felder in einer Zeile,
   und wurde am Handy abgeschnitten; unter der Station stand allein der Übungsname.

   Fälle:
   a) Die Rechnung: `tpLabelFeldTexte` trennt das Label an „|“ und streift den Block-Präfix;
      `tpFeldVariante` findet die Anpassung zur Gruppengröße (und nur die); `tpFeldGrundtext`
      lässt die Klammer weg; `tpUebungBedarf` liest die Zahl je Station – ohne „je …“ gar
      nicht, und Wartende zählen nicht zum Minimum („6 je Station, 2 warten“ → 4).
   b) Der echte Fall am DOM: L4-8 mit zwölf Kindern übernehmen. Unter Feld 3 steht der
      Feldtext und darunter fett „👥 4 Kinder: zwei Angreifer gegen einen Verteidiger plus
      Wandspieler“. Auch Hauptteil 2 und 3 tragen ihn, obwohl ihr Label nur zurückverweist.
   c) Der Text hängt an der ÜBUNG: Wird die Übung an einem Feld getauscht, verschwindet er,
      statt etwas zu behaupten, das nicht mehr stimmt.
   d) Nennt die Einheit für diese Größe nichts und ist die Gruppe zu klein, steht dort der
      Hinweis mit der Zahl und dem Weg – Zusammenlegen kostet ein Feld und sagt das.
   e) `tgZusammenlegen`: aus 4/4/4 wird 6/6, ohne neu zu mischen – Namen, Trainer und von Hand
      verschobene Kinder der bleibenden Gruppen bleiben. Aufgelöst wird bei gleicher Größe die
      hinterste Gruppe, nicht die erste. */
const L48 = "L4-8", L46 = "L4-6";
const FW = "FUNiño 3 gegen 2 mit Wandspieler – links, Mitte, rechts";
const VAR4 = "zwei Angreifer gegen einen Verteidiger plus Wandspieler";

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");
  const vor = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8"));
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));

  const datum = h.tagePlus(2);
  /* Zwölf Kinder, nicht dreizehn: Seit v573 gleicht die App die Feldstärken an die Übungen an
     (4 + 4 + 6 = 14 Plätze bei L4-8). Mit vierzehn Kindern geht das auf, und die Vierergruppe
     an der Wandspieler-Station – der Fall, den diese Prüfung festhält – gäbe es nicht mehr.
     Mit zwölf reicht es nicht für den Ausgleich, die Gruppen bleiben 4/4/4, und Feld 3 steht
     weiter mit vier Kindern da: genau dann muss die Anpassung der Einheit sichtbar sein. */
  const gruppen = [
    { name: "Blaue Haie", emo: "🔵", kinder: h.KINDER.slice(0, 6), trainer: "Charles" },
    { name: "Rote Füchse", emo: "🔴", kinder: h.KINDER.slice(6, 12), trainer: "Finn" }
  ];
  const custom = (bib.uebungen || []).map((u, i) => ({ ...u, id: 6000 + i, custom: true }));
  const rows = (vor.vorlagen || []).map((v, i) => ({ ...v, id: 500 + i }));
  const plaene = {};
  const s = await h.starten({
    hoehe: 2600,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen({ inaktiv: h.KINDER.slice(12) }), nominierungen: [], anwesenheit: [],
      termine: (u) => {
        const d = (u.searchParams.get("datum") || "").replace(/^eq\./, "");
        const alle = [{ id: 91, datum, typ: "training", trainer_status: { Charles: "ja", Finn: "ja" } }];
        return alle.filter(t => !d || t.datum === d);
      },
      trainingsformen: custom,
      trainingsvorlagen: rows,
      trainingsgruppen: (u, req) => {
        if (req.method() === "POST") return { status: 201, body: "[]" };
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

  const r = await s.page.evaluate(async ({ datum, L48, L46, FW }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = { fehlt: [] };
    for (const n of ["tpLabelFeldTexte", "tpFeldTexte", "tpFeldTextFuer", "tpFeldVariante", "tpFeldGrundtext", "tpUebungBedarf", "tpGruppeHinweis", "tgZusammenlegen"])
      if (typeof window[n] !== "function") out.fehlt.push(n);
    if (out.fehlt.length) return out;
    await loadKader();
    const feld = document.getElementById("tp-date");
    if (feld && ![...feld.options].some(o => o.value === datum)) feld.add(new Option(datum, datum));
    if (feld) feld.value = datum;
    await tpTrainerRsvpLaden(datum);
    out.kinder = _tgPool().namen.length;

    // a) die Rechnung
    await vorlagenLaden();
    out.geladen = VORLAGEN.length;
    const v48 = VORLAGEN.find(v => String(v.name).startsWith(L48 + " "));
    const bl = (v48.bloecke || []).filter(b => (b.stationen || []).length > 1);
    out.teile1 = tpLabelFeldTexte(bl[0].label);
    out.teile2 = tpLabelFeldTexte(bl[1].label);
    out.var4 = tpFeldVariante(out.teile1[2], 4);
    out.var5 = tpFeldVariante(out.teile1[2], 5);
    out.var6 = tpFeldVariante(out.teile1[2], 6);
    out.varOhne = tpFeldVariante(out.teile1[1], 4);
    out.grund = tpFeldGrundtext(out.teile1[2]);
    const idxVon = n => tpAllForms().findIndex(f => f.name === n);
    out.bedarfWand = tpUebungBedarf(idxVon(FW));
    out.bedarfWarten = tpUebungBedarf(idxVon("FUNiño 3 gegen 1 – der Mittlere hat den Ball"));
    out.bedarfWarmup = tpUebungBedarf(idxVon("Warm up Adler"));

    // b) der echte Fall
    await tgSync(); await warte(150);
    const idVon = pfx => String((VORLAGEN.find(v => String(v.name).startsWith(pfx + " ")) || {}).id);
    const uebernehmen = async pfx => { _vuAuswahl = idVon(pfx); await vorlageUebernehmenSetzen(); await warte(500); };
    await uebernehmen(L48);
    out.gruppen = ((tgFor() || {}).gruppen || []).map(g => g.kinder.length);
    const haupt = tpSlots.map((sl, si) => ({ si, typ: sl.typ, felder: sl.felder })).filter(x => x.typ === "spielform" || x.typ === "main");
    out.felderImSlot = haupt.map(x => (x.felder || []).length);
    /* Das Feld mit der Wandspieler-Übung suchen – die Gruppen rücken je Hauptteil weiter,
       die Übung bleibt an ihrem Feld. */
    const stationText = (si, p) => (document.getElementById(`tp-form-${si}-${p}-grp`) || {}).textContent || "";
    const wand = [];
    haupt.forEach(x => {
      [...document.querySelectorAll(`.tp-form-sel[id^="tp-form-${x.si}-"]`)].forEach((sel, p) => {
        if (sel.value && (tpAllForms()[+sel.value] || {}).name === FW) {
          const g = _tpStationGruppe[sel.id] || {};
          wand.push({ si: x.si, p, n: g.n, text: stationText(x.si, p) });
        }
      });
    });
    out.wand = wand;

    // c) Übung tauschen → Text verschwindet
    if (wand.length) {
      const sel = document.getElementById(`tp-form-${wand[0].si}-${wand[0].p}`);
      const fremd = idxVon("Passtor im Quadrat");
      sel.value = String(fremd); tpOnSelectChange(sel); await warte(60);
      out.nachTausch = stationText(wand[0].si, wand[0].p);
      out.nachTauschName = (tpAllForms()[fremd] || {}).name;
    }

    /* d) L4-6 nennt keine Größenvarianten, und „3+1 gegen 2 – Adler aus dem Tor“ braucht
       sechs (ohne Wartende). Dreizehn Kinder ergeben 5/4/4 – an dieser Station steht also
       eine zu kleine Gruppe, und die Einheit sagt nichts dazu. Genau dann der Hinweis. */
    tgBilden(3);
    await uebernehmen(L46);
    const zuKlein = [];
    tpSlots.forEach((sl, si) => {
      if (!tpIstHauptteil(sl.typ)) return;
      [...document.querySelectorAll(`.tp-form-sel[id^="tp-form-${si}-"]`)].forEach((sel, p) => {
        const t = stationText(si, p);
        if (/ist für \d+ gedacht/.test(t)) zuKlein.push(t.replace(/\s+/g, " ").trim());
      });
    });
    out.zuKlein = zuKlein.slice(0, 2);

    // e) zusammenlegen ohne neu zu mischen
    tgBilden(3);
    const g3 = (tgFor() || {}).gruppen;
    out.vorher = g3.map(g => ({ name: g.name, n: g.kinder.length, trainer: g.trainer }));
    const proband = g3[0].kinder[0];
    tgZusammenlegen(2);
    const g2 = (tgFor() || {}).gruppen;
    out.nachher = g2.map(g => ({ name: g.name, n: g.kinder.length, trainer: g.trainer }));
    out.probandBleibt = !!(g2[0] && g2[0].kinder.includes(proband));
    out.summe = g2.reduce((a, g) => a + g.kinder.length, 0);
    return out;
  }, { datum, L48, L46, FW });

  const fehler = s.fehler();
  await s.schliessen();
  if (r.fehlt.length) return h.ergebnis("Feldtext und Gruppengröße je Station", false, [r.fehlt.join(", ") + " fehlt"]);

  // a)
  if (!Array.isArray(r.teile1) || r.teile1.length !== 3) probleme.push(`Hauptteil 1 von L4-8 ergibt ${r.teile1 ? r.teile1.length : "keine"} Feldtexte statt drei`);
  else if (!/^Feld 1 /.test(r.teile1[0])) probleme.push(`Der Block-Präfix steht noch im ersten Feldtext: „${String(r.teile1[0]).slice(0, 60)}…“`);
  if (r.teile2 !== null) probleme.push("Hauptteil 2 hat eigene Feldtexte – erwartet wird der Rückverweis (null)");
  if (r.var4 !== VAR4) probleme.push(`Variante bei 4 kommt als „${r.var4}“ statt „${VAR4}“`);
  if (r.var5 !== "nur ein Verteidiger") probleme.push(`Variante bei 5 kommt als „${r.var5}“`);
  if (r.var6 !== null) probleme.push(`Für 6 Kinder nennt die Einheit nichts, geliefert wird „${r.var6}“`);
  if (r.varOhne !== null) probleme.push(`Feld 2 hat keine Variantenklammer, geliefert wird „${r.varOhne}“`);
  if (/\(bei /.test(String(r.grund))) probleme.push(`Der Grundtext trägt die Variantenklammer noch: „${r.grund}“`);
  if (r.bedarfWand !== 6) probleme.push(`Bedarf der Wandspieler-Übung ist ${r.bedarfWand} statt 6`);
  if (r.bedarfWarten !== 4) probleme.push(`Bedarf von „3 gegen 1“ ist ${r.bedarfWarten} statt 4 – die zwei Wartenden gehören nicht zum Minimum`);
  if (r.bedarfWarmup !== 0) probleme.push(`Das Aufwärmen („8–14“) liefert einen Stationsbedarf von ${r.bedarfWarmup} statt keinen`);

  // b)
  if (r.kinder !== 12) probleme.push(`${r.kinder} Kinder im Pool statt 12`);
  if (String(r.gruppen.slice().sort()) !== "4,4,4") probleme.push(`Gruppen ${r.gruppen.join("/")} statt 4/4/4`);
  if (String(r.felderImSlot) !== "3,3,3") probleme.push(`Feldtexte je Hauptteil im Slot: ${r.felderImSlot.join("/")} statt 3/3/3 – Hauptteil 2 und 3 holen sie von Hauptteil 1`);
  if (r.wand.length !== 3) probleme.push(`Die Wandspieler-Übung steht an ${r.wand.length} Feldern statt an dreien (einmal je Hauptteil)`);
  const vier = (r.wand || []).filter(w => w.n === 4);
  if (!vier.length) probleme.push("Keine Vierergruppe an der Wandspieler-Station – der Fall des PO tritt gar nicht ein");
  vier.forEach(w => {
    if (!/Feld 3 an vier Hütchentoren/.test(w.text)) probleme.push(`Feld ${w.p + 1} in Block ${w.si} zeigt den Feldtext nicht: „${w.text.slice(0, 70)}“`);
    if (!w.text.includes("4 Kinder: " + VAR4)) probleme.push(`Die Anpassung für vier Kinder fehlt an Feld ${w.p + 1} in Block ${w.si}: „${w.text.slice(0, 90)}“`);
  });
  const fuenf = (r.wand || []).filter(w => w.n === 5);
  fuenf.forEach(w => { if (!w.text.includes("5 Kinder: nur ein Verteidiger")) probleme.push(`Die Fünfergruppe bekommt ihre Anpassung nicht: „${w.text.slice(0, 90)}“`); });
  if (r.wand.some(w => w.n > 5)) probleme.push(`Mit zwölf Kindern dürfte der Ausgleich aus v573 nicht greifen, an der Wandspieler-Station stehen aber ${r.wand.map(w => w.n).join("/")}`);

  // c)
  if (r.nachTausch && /Hütchentoren/.test(r.nachTausch)) probleme.push(`Nach dem Tausch auf „${r.nachTauschName}“ steht der alte Feldtext weiter da: „${r.nachTausch.slice(0, 70)}“`);

  // d)
  if (!r.zuKlein.length) probleme.push("Vier Kinder an einer Übung für sechs – es kommt kein Hinweis");
  else {
    if (!/\b[45] Kinder an dieser Station/.test(r.zuKlein[0])) probleme.push(`Der Hinweis nennt die Gruppengröße nicht: „${r.zuKlein[0]}“`);
    if (!/zusammenlegen|Alle Kinder an ein Feld|keine Anpassung/.test(r.zuKlein[0])) probleme.push(`Der Hinweis nennt keinen Weg: „${r.zuKlein[0]}“`);
  }

  // e)
  if (String(r.nachher.map(g => g.n)) !== "6,6") probleme.push(`Zusammenlegen ergibt ${r.nachher.map(g => g.n).join("/")} statt 6/6`);
  if (r.summe !== 12) probleme.push(`Nach dem Zusammenlegen sind ${r.summe} Kinder verteilt statt 12`);
  if (!r.probandBleibt) probleme.push("Beim Zusammenlegen wurde neu gemischt – ein Kind der bleibenden Gruppe hat gewechselt");
  if (r.nachher[0] && r.vorher[0] && r.nachher[0].name !== r.vorher[0].name) probleme.push(`Die erste Gruppe heißt nach dem Zusammenlegen „${r.nachher[0].name}“ statt „${r.vorher[0].name}“`);
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);

  if (!probleme.length) {
    zeilen.push(`Rechnung: drei Feldtexte, Variante bei 4 „${VAR4}“, bei 5 „nur ein Verteidiger“ · Bedarf 6 / 4 (Wartende zählen nicht) / keiner beim Aufwärmen`);
    zeilen.push(`12 Kinder → ${r.gruppen.join("/")}; die Wandspieler-Station zeigt ihren Feldtext in allen drei Hauptteilen, die Vierergruppe bekommt ihre Anpassung`);
    zeilen.push(`Übung getauscht → Feldtext weg · zu kleine Gruppe → „${(r.zuKlein[0] || "").slice(0, 80)}“`);
    zeilen.push(`Zusammenlegen: ${r.vorher.map(g => g.n).join("/")} → ${r.nachher.map(g => g.n).join("/")}, ohne neu zu mischen`);
  }
  return h.ergebnis("Feldtext und Gruppengröße je Station", !probleme.length, zeilen.concat(probleme));
};
