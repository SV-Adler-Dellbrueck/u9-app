/* v562 – Was im Vereinsschuppen liegt, zählen wir nicht.

   Stangen, Leitern, Minihürden, Dummys und Ringe liegen im Materialschuppen des Vereins.
   Soll und Ist wären dort zwei Felder, die niemand ausfüllen kann: die Zahl ändert sich,
   ohne dass wir dabei sind, und die Inventur würde nie fertig, weil immer fünf Posten
   „ohne Zahl" übrig blieben. Was wir wissen müssen, steht im Namen und im Ort.

   Erkannt wird das am Ort, nicht an einem Kennzeichen – eines gab es schon und war eines
   zu viel (v561). Der Ausgang bei anderem Wortlaut ist harmlos: zwei Felder zu viel, nie
   eine falsche Zahl.

   Fälle:
   a) Ein Posten im Vereinsschuppen zeigt Name und Ort, aber keine Zahlenfelder.
   b) Ein eigener Posten behält beide Felder – die Regel greift nur, wo sie soll.
   c) Der Zähler im Kopf lässt die fremden Posten aus, sonst wird die Inventur nie fertig.
   d) Die Materialzeile unter der Skizze führt sie weiterhin als bekannt, aber ungezählt:
      keine Fehlmenge, und nicht unter „nicht im Bestand geführt".
   e) Trikotsätze und Spieltagsjacken sind aus der Inventur verschwunden – sie hängen an
      den Ausstattungs-Artikeln und werden im Spielerprofil geführt. Ein Posten auf
      `aktiv:false` taucht in der Liste nicht mehr auf und zählt im Abgleich nicht mit. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];

  const s = await h.starten({ hoehe: 1400, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });

  const r = await s.page.evaluate(async () => {
    for (const n of ["materialOpen", "matFremd", "matZeile"])
      if (typeof window[n] !== "function") return { fehlt: n };
    await materialOpen();
    MAT_POSTEN = [
      { id: 901, name: "Stangen", kategorie: "Geräte", variante: null, ist: null, soll: null, ort: "Materialschuppen Verein", aktiv: true, sort: 10 },
      { id: 902, name: "Bälle", kategorie: "Bälle", variante: "Größe 4", ist: 9, soll: 12, ort: null, aktiv: true, sort: 20 },
      { id: 903, name: "Hütchen", kategorie: "Hütchen", variante: "rot", ist: null, soll: null, ort: "unser Schrank", aktiv: true, sort: 30 },
      { id: 904, name: "Trikotsätze", kategorie: "Kleidung", variante: null, ist: 1, soll: 1, ort: null, aktiv: false, sort: 40 }
    ];
    materialRender();

    const karten = [...document.querySelectorAll('#mat-body div[style*="border-left-width"]')]
      .filter(d => /Stangen|Bälle|Hütchen|Trikot/.test(d.textContent));
    const fremd = karten.find(d => /Stangen/.test(d.textContent));
    const eigen = karten.find(d => /Bälle/.test(d.textContent));

    return {
      regel: [matFremd({ ort: "Materialschuppen Verein" }), matFremd({ ort: "unser Schrank" }), matFremd({ ort: null }), matFremd({})],
      fremdOhneFelder: fremd ? fremd.querySelectorAll('input[type="number"]').length : -1,
      fremdNenntOrt: fremd ? /Materialschuppen Verein/.test(fremd.textContent) : false,
      fremdNenntName: fremd ? /Stangen/.test(fremd.textContent) : false,
      eigenMitFeldern: eigen ? eigen.querySelectorAll('input[type="number"]').length : -1,
      kopf: (document.getElementById("mat-body")?.textContent || "").match(/(\d+) von (\d+) Posten ohne Zahl/) || [],
      trikotWeg: !/Trikotsätze/.test(document.getElementById("mat-body")?.textContent || "")
    };
  });

  if (r.fehlt) probleme.push(r.fehlt + " fehlt");
  else {
    const [verein, eigenerOrt, ohneOrt, leer] = r.regel;
    if (!verein) probleme.push("Ein Posten im Materialschuppen des Vereins gilt nicht als fremd");
    if (eigenerOrt || ohneOrt || leer) probleme.push("Ein eigener Posten gilt als fremd");
    if (r.fremdOhneFelder !== 0) probleme.push(`Der Posten im Vereinsschuppen zeigt ${r.fremdOhneFelder} Zahlenfelder – dort zählt niemand`);
    if (!r.fremdNenntName || !r.fremdNenntOrt) probleme.push("Name oder Ort fehlen am Posten im Vereinsschuppen");
    if (r.eigenMitFeldern !== 2) probleme.push(`Ein eigener Posten zeigt ${r.eigenMitFeldern} Zahlenfelder statt zwei`);
    /* Zwei eigene Posten, einer davon ohne Zahl – der fremde darf nicht mitzählen. */
    if (r.kopf[1] !== "1" || r.kopf[2] !== "2") probleme.push(`Der Zähler im Kopf lautet „${r.kopf[0] || "—"}" statt „1 von 2 Posten ohne Zahl"`);
    if (!r.trikotWeg) probleme.push("Ein stillgelegter Posten steht weiterhin in der Liste");
    if (!probleme.length) zeilen.push(`Vereinsschuppen: Name und Ort ohne Zahlenfelder, eigene Posten unverändert, Zähler ${r.kopf[0]}`);
  }

  // ── d) Der Abgleich kennt sie, zählt sie aber nicht ───────────────────────
  const bedarf = await s.page.evaluate(() => {
    if (typeof matBedarfZeile !== "function") return { fehlt: "matBedarfZeile" };
    MAT_POSTEN = [
      { name: "Stangen", ist: null, ort: "Materialschuppen Verein", aktiv: true },
      { name: "Bälle", ist: 12, ort: null, aktiv: true },
      { name: "Trikotsätze", ist: 1, ort: null, aktiv: false }
    ];
    const zeile = matBedarfZeile({ ger: [[10, 10, "stange"], [20, 10, "stange"]], b: [[40, 40]] });
    return {
      nenntStangen: /2 Stangen/.test(zeile),
      ohneFehlmenge: !/es fehlen/.test(zeile),
      alsGefuehrt: !/Nicht im Materialbestand geführt[^<]*Stangen/.test(zeile),
      stillgelegtZaehltNicht: matBestandFuer("Trikotsätze").gefuehrt === false
    };
  });
  if (bedarf.fehlt) probleme.push(bedarf.fehlt + " fehlt");
  else {
    if (!bedarf.nenntStangen) probleme.push("Die Materialzeile nennt die Stangen nicht");
    if (!bedarf.ohneFehlmenge) probleme.push("Ein ungezählter Posten wird als Fehlmenge gemeldet – leer heißt „nicht gezählt“");
    if (!bedarf.alsGefuehrt) probleme.push("Ein Posten im Vereinsschuppen gilt als nicht geführt, obwohl er in der Liste steht");
    if (!bedarf.stillgelegtZaehltNicht) probleme.push("Ein stillgelegter Posten zählt im Abgleich weiterhin mit");
    if (!probleme.length) zeilen.push("Abgleich: bekannt, aber ungezählt – keine Fehlmenge, kein „nicht geführt“");
  }

  const fehler = s.fehler();
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);
  await s.schliessen();

  return h.ergebnis("Material: was im Vereinsschuppen liegt, zählt niemand", !probleme.length, zeilen.concat(probleme));
};
