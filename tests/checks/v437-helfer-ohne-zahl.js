/* v437 – Number(null) ist 0: „nichts gesagt" galt wie „null Tore", und die beiden
   Trainings-Aufgaben verschwanden aus der Eltern-Kachel (32 von 33 Trainings).
   Erwartung: NULL → Aufgabe ohne Zahl, ausdrueckliche 0 → keine Aufgabe, Zahl → mit Zahl.
   v662 (PO 28.09.: Aufgaben nur noch auf Freigabe des Trainers): Ob eine Aufgabe erscheint,
   entscheidet die Freigabe am Termin, nicht mehr die 0. Bleibt geprüft: ohne Torzahl wird
   keine Zahl erfunden, mit Torzahl steht sie im Text; ohne Freigabe erscheint nichts. */
module.exports = async function (h) {
  const s = await h.starten({ start: "/eltern/index.html", warten: 1000 });
  const r = await s.page.evaluate(morgen => {
    if (typeof helferTasksFuer !== "function") return null;
    const basis = { id: 1, typ: "training", datum: morgen, uhrzeit: "16:45:00",
      helfer_aufgaben: [{ t: "🥅 Funino-Tore", n: 1 }, { t: "🥅 Jugendtore", n: 1 }] };
    const lauf = t => helferTasksFuer(t.typ, t).map(a => a.d(t));
    return {
      ohne: lauf({ ...basis, helfer_funino: null, helfer_jugendtore: null }),
      null0: lauf({ ...basis, helfer_aufgaben: null, helfer_funino: 8, helfer_jugendtore: 2 }),
      zahlen: lauf({ ...basis, helfer_funino: 8, helfer_jugendtore: 2 }),
      gemischt: lauf({ ...basis, helfer_funino: 6, helfer_jugendtore: null })
    };
  }, h.tagePlus(1));
  await s.schliessen();
  if (!r) return h.ergebnis("Helfer-Aufgaben: NULL ist nicht 0", false, ["helferTasksFuer fehlt"]);
  const zahlIm = t => /\b\d+\b\s*(Funino|Jugend)/i.test(t);
  const probleme = [];
  if (r.ohne.length !== r.zahlen.length) probleme.push(`ohne Angabe: ${r.ohne.length} Aufgaben, mit Zahlen ${r.zahlen.length} – beide Tore-Aufgaben muessen stehen`);
  if (r.ohne.some(zahlIm)) probleme.push("ohne Angabe wird eine Zahl erfunden: " + r.ohne.join(" / "));
  if (r.null0.length) probleme.push(`ohne Freigabe: ${r.null0.length} Aufgaben, erwartet keine`);
  if (!r.zahlen.every(zahlIm)) probleme.push("mit Zahlen fehlt die Zahl: " + r.zahlen.join(" / "));
  if (r.gemischt.length !== r.zahlen.length) probleme.push(`gemischt (6/NULL): ${r.gemischt.length} Aufgaben, erwartet ${r.zahlen.length}`);
  return h.ergebnis("Helfer-Aufgaben: NULL ist nicht 0", !probleme.length,
    [`ohne Angabe: ${r.ohne.length} · ohne Freigabe: ${r.null0.length} · 8/2: ${r.zahlen.length} · 6/NULL: ${r.gemischt.length}`].concat(probleme));
};
