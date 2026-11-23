/* v439 – „wenn ich Hauptteil 2 loesche, kann ich das Abschlussspiel verlaengern?"
   Jede Phase bekam ein Dauer-Feld, die Summe zeigt „noch N Min. frei". Geprueft am
   gerenderten Zeitstrahl: Feld vorhanden, wirkt, 44 px hoch, Kopfzeile ohne Ueberstand. */
module.exports = async function (h) {
  const s = await h.starten({ hoehe: 1200 });
  await h.sichtbarMachen(s.page, "#tp-timeline");
  const r = await s.page.evaluate(kinder => {
    window.KADER = kinder.map((n, i) => ({ id: i + 1, name: n, aktiv: true, nr: i + 1 }));
    if (typeof tpSlots === "undefined" || typeof tpRenderTimeline !== "function") return { fehler: "tpSlots/tpRenderTimeline fehlt" };
    const stand = () => ({
      phasen: [...document.querySelectorAll(".tp-slot-head")].map(k => ({ label: k.querySelector(".tp-slot-label")?.textContent.trim(), dauer: k.querySelector(".tp-dauer-sel")?.value || null })),
      gesamt: (document.getElementById("tp-timeline").textContent.replace(/\s+/g, " ").match(/Gesamt:.*?Min\.(?: · noch \d+ Min\. frei| – zu lang!)?/) || [""])[0].trim()
    });
    tpSlots.length = 0;
    tpSlots.push({ label: "Ankommen & Aufwärmen", dauer: 10, farbe: "#059669", typ: "warmup" },
                 { label: "Hauptteil 1", dauer: 20, farbe: "#1a56db", typ: "main" },
                 { label: "Hauptteil 2", dauer: 20, farbe: "#7c3aed", typ: "main" },
                 { label: "Abschlussspiel", dauer: 20, farbe: "#c2410c", typ: "abschluss" });
    tpRenderTimeline();
    const start = stand();
    tpRemoveSlot(tpSlots.findIndex(x => x.label === "Hauptteil 2"));
    const nachLoeschen = stand();
    const ai = tpSlots.findIndex(x => (x.typ || "") === "abschluss");
    const sel = [...document.querySelectorAll(".tp-dauer-sel")][ai];
    if (sel) { sel.value = "45"; sel.dispatchEvent(new Event("change")); }
    const nachVerlaengern = stand();
    const hoehen = [...document.querySelectorAll(".tp-dauer-sel")].map(e => Math.round(e.getBoundingClientRect().height));
    const kopf = [...document.querySelectorAll(".tp-slot-head")].map(k => {
      const b = k.getBoundingClientRect();
      const raus = [...k.children].filter(c => c.getBoundingClientRect().right > b.right + 0.5).length;
      return { ueberstand: Math.round(k.scrollWidth - k.clientWidth), raus, papierkorb: !!k.querySelector(".tp-mehr") };   // v952: Löschen steckt im ⋯-Menü
    });
    return { start, nachLoeschen, nachVerlaengern, hatFeld: !!sel, hoehen, kopf, gesamtDauer: tpSlots.reduce((a, x) => a + (x.dauer || 0), 0) };
  }, h.KINDER);
  const fehler = s.fehler();
  await s.schliessen();
  if (r.fehler) return h.ergebnis("Phasendauer im Trainingsplan", false, [r.fehler]);
  const probleme = [];
  if (r.start.phasen.length !== 4 || r.nachLoeschen.phasen.length !== 3) probleme.push(`Phasen: ${r.start.phasen.length} → ${r.nachLoeschen.phasen.length} (erwartet 4 → 3)`);
  if (!r.hatFeld) probleme.push("Abschlussspiel hat kein Dauer-Feld");
  const ab = r.nachVerlaengern.phasen.find(p => /Abschluss/.test(p.label || ""));
  if (!ab || ab.dauer !== "45") probleme.push(`Abschlussspiel steht nach dem Verlaengern auf ${ab && ab.dauer}, erwartet 45`);
  if (r.gesamtDauer !== 75) probleme.push(`Gesamtdauer ${r.gesamtDauer}, erwartet 75`);
  if (!/frei/.test(r.nachLoeschen.gesamt)) probleme.push(`nach dem Loeschen fehlt der Hinweis „noch … Min. frei": „${r.nachLoeschen.gesamt}"`);
  if (r.hoehen.some(x => x < 44)) probleme.push("Dauer-Feld unter 44 px: " + r.hoehen.join("/"));
  r.kopf.forEach((k, i) => { if (k.ueberstand > 0 || k.raus) probleme.push(`Kopfzeile ${i + 1}: ${k.ueberstand}px Ueberstand, ${k.raus} Element(e) draussen`); if (!k.papierkorb) probleme.push(`Kopfzeile ${i + 1}: ⋯-Menü (Löschen) fehlt`); });
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  return h.ergebnis("Phasendauer im Trainingsplan: loeschen, verlaengern, Rest anzeigen", !probleme.length,
    [`${r.start.phasen.length} → ${r.nachLoeschen.phasen.length} Phasen · Abschluss ${ab && ab.dauer} Min. · „${r.nachLoeschen.gesamt}" · Feldhoehen ${r.hoehen.join("/")}`].concat(probleme));
};
