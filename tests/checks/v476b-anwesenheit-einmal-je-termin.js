/* v476b – PO: „bitte nochmal checken, dass wenn ich einen Trainingsplan oder einen Spielplan
   speicher, die Anwesenheit der einzelnen Spieler nicht automatisch mehrfach gespeichert wird,
   obwohl es der gleiche Termin ist … dass es dann nicht doppelt oder dreifach gezählt wird."
   In der Datenbank ist das durch die Schluessel gesichert (anwesenheit, trainingsplan,
   nominierungen, trainingsgruppen: PRIMARY KEY datum; rueckmeldungen: UNIQUE termin_id,
   spieler_id). Hier wird festgehalten, dass die App diesen Weg auch nimmt: zweimal speichern
   am selben Tag = zweimal Upsert (on_conflict=datum, merge-duplicates), ein Tag im Speicher,
   der zweite Stand ersetzt den ersten – kein Anfuegen. */
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const heute = h.heute();
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [{ id: 1, datum: heute, typ: "training", uhrzeit: "16:45", trainer_status: {} }] }), hoehe: 1600 });
  await h.sichtbarMachen(s.page, "#train-sub-anwesenheit");
  const r = await s.page.evaluate(async ({ K, heute }) => {
    await loadKader();
    const warte = ms => new Promise(r => setTimeout(r, ms));
    Object.keys(AW_DATA).forEach(k => delete AW_DATA[k]);
    const sel = document.getElementById("aw-date"); sel.innerHTML = `<option value="${heute}">${heute}</option>`; sel.value = heute;
    if (typeof awRenderList === "function") awRenderList();
    const kachel = () => document.querySelector(`#aw-list .aw-tile[data-player="${K[0]}"]`);
    if (!kachel()) return { fehlt: "Kachel " + K[0] };
    // 1. Speichern: Kind A da
    kachel().classList.add("on"); awSave(); await warte(1800);
    const nach1 = { da: !!(AW_DATA[heute] && AW_DATA[heute][K[0]] && AW_DATA[heute][K[0]].da), tage: Object.keys(AW_DATA).length };
    // 2. Speichern: Kind A doch nicht da (Zusage zurueckgezogen)
    kachel().classList.remove("on"); awSave(); await warte(1800);
    const nach2 = { da: !!(AW_DATA[heute] && AW_DATA[heute][K[0]] && AW_DATA[heute][K[0]].da), tage: Object.keys(AW_DATA).length };
    return { nach1, nach2 };
  }, { K, heute });
  const fehler = s.fehler();
  const posts = s.gesendet.filter(g => g.methode === "POST" && /\/anwesenheit$/.test(g.pfad));
  await s.schliessen();
  if (r.fehlt) { probleme.push(r.fehlt + " fehlt"); return h.ergebnis("Anwesenheit: einmal je Termin", false, probleme); }
  if (posts.length !== 2) probleme.push(`${posts.length} Speichervorgänge statt 2`);
  posts.forEach((p, i) => {
    if (!/on_conflict=datum/.test(p.suche || "")) probleme.push(`Speichern ${i + 1} ist kein Upsert (${p.suche})`);
    if (!p.body || p.body.datum !== heute) probleme.push(`Speichern ${i + 1} trägt nicht das Datum ${heute}`);
  });
  if (!r.nach1.da) probleme.push("nach dem 1. Speichern ist Kind A nicht als da gemerkt");
  if (r.nach2.da) probleme.push("nach dem 2. Speichern zählt Kind A weiter als da – der alte Stand wurde nicht ersetzt");
  if (r.nach1.tage !== 1 || r.nach2.tage !== 1) probleme.push(`Tage im Speicher: ${r.nach1.tage} → ${r.nach2.tage} (erwartet 1 → 1)`);
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`2× gespeichert → ${posts.length} Upserts (${posts.map(p => (p.suche || "").replace(/^\?/, "")).join(" · ")})`);
  zeilen.push(`Kind A: da ${r.nach1.da} → ${r.nach2.da} · Tage im Speicher ${r.nach1.tage} → ${r.nach2.tage}`);
  return h.ergebnis("Anwesenheit: zweimal speichern am selben Termin ersetzt, fügt nicht an", !probleme.length, zeilen.concat(probleme));
};
