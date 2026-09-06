/* v470 – PO: „Check mal die Anwesenheiten der Trainer bezogen auf Trainingsplan und
   Anwesenheit. Die scheinen sich nicht abzugleichen." Taten sie nicht: der Plan las
   `termine.trainer_status` (Vorhersage aus „Bist du dabei?"), die Anwesenheitsliste
   `anwesenheit.data._trainers` (Tatsache). Wer nie geantwortet, aber angehakt war, fehlte
   im Plan – und aus der Trainerzahl folgen Felder und Gruppen. Geprueft: erfasste
   Anwesenheit gewinnt, ohne Anwesenheit gelten weiter die Rueckmeldungen, und die
   Chip-Zeile bricht um statt zu wischen. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const datum = h.tagePlus(1);
  // Genau die Lage vom 07.09.: Finn hat nie geantwortet, war aber da.
  const rsvp = { Peter: "nein", Markus: "ja", Charles: "nein", Kenneth: "ja" };

  async function lauf(mitAnwesenheit) {
    const s = await h.starten({ supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(),
      termine: [{ id: 1, datum, typ: "training", uhrzeit: "16:45", trainer_status: rsvp }]
    }), hoehe: 1600 });
    const r = await s.page.evaluate(async ({ datum, mitAnwesenheit }) => {
      await loadKader();
      // AW_DATA ist eine globale let-Bindung – vorhandenes Objekt fuellen, nicht ersetzen.
      Object.keys(AW_DATA).forEach(k => delete AW_DATA[k]);
      if (mitAnwesenheit) AW_DATA[datum] = { _trainers: ["Finn", "Kenneth", "Markus"] };
      let box = document.getElementById("tp-trainer-checks");
      if (!box) { box = document.createElement("div"); box.id = "tp-trainer-checks"; document.body.appendChild(box); }
      let q = document.getElementById("tp-trainer-quelle");
      if (!q) { q = document.createElement("div"); q.id = "tp-trainer-quelle"; document.body.appendChild(q); }
      const d = document.getElementById("tp-date");
      if (d) { d.innerHTML = `<option value="${datum}" selected>${datum}</option>`; d.value = datum; }
      await tpTrainerRsvpLaden(datum);
      const haken = [...box.querySelectorAll("input")].filter(i => i.checked).map(i => i.value).sort();
      const alle = [...box.querySelectorAll("input")].map(i => i.value);
      const cs = getComputedStyle(box);
      return { haken, alle, quelle: q.textContent.replace(/\s+/g, " ").trim(),
        wrap: cs.flexWrap, overflow: cs.overflowX };
    }, { datum, mitAnwesenheit });
    const fehler = s.fehler(); await s.schliessen();
    return { ...r, fehler };
  }

  const mit = await lauf(true);
  const ohne = await lauf(false);

  const erwartetMit = ["Finn", "Kenneth", "Markus"];
  if (JSON.stringify(mit.haken) !== JSON.stringify(erwartetMit))
    probleme.push(`mit Anwesenheit angehakt ${JSON.stringify(mit.haken)}, erwartet ${JSON.stringify(erwartetMit)} – Finn hat nie geantwortet, war aber da`);
  if (!/Anwesenheit/.test(mit.quelle)) probleme.push(`Quellenhinweis „${mit.quelle}“ nennt die Anwesenheit nicht`);
  // Ohne erfasste Anwesenheit bleibt es bei den Rueckmeldungen (nur „ja")
  const erwartetOhne = ["Kenneth", "Markus"];
  if (JSON.stringify(ohne.haken) !== JSON.stringify(erwartetOhne))
    probleme.push(`ohne Anwesenheit angehakt ${JSON.stringify(ohne.haken)}, erwartet ${JSON.stringify(erwartetOhne)}`);
  if (!/Rückmeldung/.test(ohne.quelle)) probleme.push(`Quellenhinweis „${ohne.quelle}“ nennt die Rückmeldungen nicht`);
  if (mit.wrap !== "wrap") probleme.push(`Chip-Zeile bricht nicht um (flex-wrap: ${mit.wrap}) – bei fünf Trainern liegen zwei außerhalb des Bildes`);
  if (mit.fehler.length) probleme.push(...mit.fehler.slice(0, 2));
  if (ohne.fehler.length) probleme.push(...ohne.fehler.slice(0, 2));
  zeilen.push(`mit Anwesenheit: ${JSON.stringify(mit.haken)} · „${mit.quelle}“`);
  zeilen.push(`ohne Anwesenheit: ${JSON.stringify(ohne.haken)} · „${ohne.quelle}“`);
  zeilen.push(`Chip-Zeile: flex-wrap ${mit.wrap}, ${mit.alle.length} Trainer sichtbar`);
  return h.ergebnis("Trainingsplan folgt der erfassten Anwesenheit, sonst den Rückmeldungen", !probleme.length, zeilen.concat(probleme));
};
