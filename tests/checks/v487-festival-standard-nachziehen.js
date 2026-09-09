/* v487 – PO: „Die Infos unten sind nicht vollständig, fehlt der Hinweis wegen der eigenen
   Bälle, ebenso im teilbaren Link. Start immer 10:15 und mit allen 4 Plätzen … Das
   Vereinsheim liegt mittig zum Hauptplatz, nicht mittig zur linken Hälfte." Die v486-Vorgaben
   galten nur fuer neue Festivals. Geprueft: ein Festival mit altem Stand bekommt beim Oeffnen
   Baelle-Zeile, 10:15, 5 Min., 4 Felder; mit fertigem Plan nur die Baelle-Zeile; eigene
   Feldnamen bleiben; das Vereinsheim sitzt in beiden Skizzen unter der Platzmitte. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [] }), hoehe: 1200 });
  const r = await s.page.evaluate(() => {
    if (typeof fstStandardNachziehen !== "function") return { fehlt: "fstStandardNachziehen" };
    const alt = { config: { art: "festival", start: "10:00", wechsel: 2, felder: [{ form: "f4" }, { form: "funino" }, { form: "funino" }], infos: "⏰ Bitte 30 Minuten vor dem ersten Spiel da sein\n☕ Kaffee und Brötchen stehen bereit" }, plan: [] };
    const a = fstStandardNachziehen(alt);
    const mitPlan = fstStandardNachziehen({ config: { ...alt.config }, plan: [{ runde: 1, a: 0, b: 1 }] });
    const eigen = fstStandardNachziehen({ config: { ...alt.config, start: "11:00", wechsel: 3, felder: [{ form: "f4", name: "Kunstrasen" }, { form: "funino" }, { form: "funino" }], infos: "⚽ Bälle bitte selbst mitbringen" }, plan: [] });
    const mitte = svg => { const platz = /<rect x="(\d+)" y="\d+" width="(\d+)" height="\d+" rx="8" fill="#dcfce7"/.exec(svg); const heim = /<rect x="(\d+)" y="\d+" width="(\d+)" height="22" rx="5" fill="#e2e8f0"/.exec(svg); return platz && heim ? { platz: +platz[1] + platz[2] / 2, heim: +heim[1] + heim[2] / 2 } : null; };
    return {
      infosZeile2: a.config.infos.split("\n")[1], start: a.config.start, pause: a.config.wechsel, felder: a.config.felder.length, was: a.was,
      planFelder: mitPlan.config.felder.length, planStart: mitPlan.config.start, planBaelle: /Bälle/.test(mitPlan.config.infos),
      eigenGeaendert: eigen.geaendert,
      felderSkizze: mitte(fstSkizzeFelder(FST_STANDARD_FELDER)), parkenSkizze: mitte(fstSkizzeParken())
    };
  });
  const fehler = s.fehler(); await s.schliessen();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt`); return h.ergebnis("Festival-Standard nachziehen", false, probleme); }
  if (!/Bälle/.test(r.infosZeile2 || "")) probleme.push(`Bälle-Zeile fehlt oder steht falsch: „${r.infosZeile2}“`);
  if (r.start !== "10:15" || r.pause !== 5 || r.felder !== 4) probleme.push(`alter Stand nicht nachgezogen: ${r.start}/${r.pause}/${r.felder} Felder`);
  if (r.planFelder !== 3 || r.planStart !== "10:00" || !r.planBaelle) probleme.push(`mit fertigem Plan: Felder ${r.planFelder}, Beginn ${r.planStart}, Bälle ${r.planBaelle} – nur die Bälle-Zeile darf dazukommen`);
  if (r.eigenGeaendert) probleme.push("bewusste Änderungen des Trainers wurden überschrieben");
  [["Felder", r.felderSkizze], ["Parken", r.parkenSkizze]].forEach(([n, m]) => { if (!m) probleme.push(`${n}-Skizze: Platz oder Vereinsheim nicht gefunden`); else if (Math.abs(m.platz - m.heim) > 1) probleme.push(`${n}-Skizze: Vereinsheim bei ${m.heim}, Platzmitte bei ${m.platz}`); });
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Alter Stand → ${r.was.join(", ")} · mit Plan nur Bälle ${r.planBaelle && r.planFelder === 3} · eigene Werte unangetastet ${!r.eigenGeaendert}`);
  zeilen.push(`Vereinsheim mittig: Felder ${JSON.stringify(r.felderSkizze)} · Parken ${JSON.stringify(r.parkenSkizze)}`);
  return h.ergebnis("Festival-Standard nachziehen: Bälle, 10:15, 5 Min., 4 Felder – Vereinsheim mittig", !probleme.length, zeilen.concat(probleme));
};
