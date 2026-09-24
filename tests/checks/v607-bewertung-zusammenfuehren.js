/* v607 · „Einheit bewerten" löscht nicht mehr die Bewertungen der Kollegen.

   Befund der App-Prüfung vom 24.09.: Jeder Trainer sieht in „Einheit bewerten" nur SEINE
   Übungen (P3), gespeichert wurde aber die Liste des ganzen Tages – `EVAL_DATA[datum]=evals`.
   Wer als Zweiter bewertete, überschrieb Sterne und Kommentare des Ersten, lokal und über
   den Upsert auf `trainings_eval` auch auf dem Server.

   Gemessen:
   a) Ein Kollege hat seine Übung schon bewertet (steht auf dem Server). Speichert der zweite
      Trainer seine eigene, stehen danach BEIDE im Speicher – mit dem Kommentar des Kollegen.
   b) Was an den Server geht, enthält ebenfalls beide.
   c) Bewertet derselbe Trainer dieselbe Übung ein zweites Mal, ersetzt das seinen alten
      Eintrag – es entsteht keine Dublette. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const heute = h.heute();
  const jetzt = new Date(); const hh = n => String(n).padStart(2, "0");
  const ende = `${hh(Math.max(0, jetzt.getHours() - 1))}:00`;
  const KOLLEGE = { name: "Übung des Kollegen", trainer: "Finn", formIdx: 3, notiz: "Kollege hat zuerst bewertet", skipped: false, spass: 4 };
  const termine = [{ id: 1, datum: heute, typ: "training", uhrzeit: "10:00", uhrzeit_ende: ende, trainer_status: {} }];
  const s = await h.starten({ supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), termine,
    trainingsplan: [{ datum: heute, plan: [
      { formIdx: 15, slotLabel: "Hauptteil", formName: "4gg2 Ballbesitz", trainer: "Charles" },
      { formIdx: 3, slotLabel: "Hauptteil", formName: KOLLEGE.name, trainer: "Finn" }
    ], slots: [] }],
    trainings_eval: (u, req) => req.method() === "GET" ? [{ data: [KOLLEGE] }] : { status: 201, body: "[]" },
    einheit_bewertung: [], anwesenheit: [], profiles: [{ name: "Charles", rolle: "trainer" }]
  }), hoehe: 1800 });
  await h.sichtbarMachen(s.page, "#train-sub-planung");
  const r = await s.page.evaluate(async ({ heute }) => {
    await loadKader(); window.trainerMe = async () => "Charles";
    const warte = ms => new Promise(r => setTimeout(r, ms));
    document.getElementById("pin-gate")?.remove();
    Object.keys(EVAL_DATA).forEach(k => delete EVAL_DATA[k]);   // das Gerät kennt die Bewertung des Kollegen NICHT
    await einheitNachbereiten(heute); await warte(600);
    const sichtbar = EB_PLAN.map(p => p.trainer);
    const feld = document.getElementById("eb-ue-notiz-0"); if (feld) feld.value = "Eigener Kommentar";
    await einheitSave(); await warte(1800);
    const nachErst = (EVAL_DATA[heute] || []).map(e => `${e.trainer}:${e.notiz}`);
    // c) dieselbe Übung noch einmal
    await einheitNachbereiten(heute); await warte(600);
    const f2 = document.getElementById("eb-ue-notiz-0"); if (f2) f2.value = "Eigener Kommentar, geändert";
    await einheitSave(); await warte(1800);
    const nachZweit = (EVAL_DATA[heute] || []).map(e => `${e.trainer}:${e.notiz}`);
    return { sichtbar, nachErst, nachZweit };
  }, { heute });
  const posts = s.gesendet.filter(g => g.methode === "POST" && /trainings_eval$/.test(g.pfad));
  const f = s.fehler();
  await s.schliessen();

  if (r.sichtbar.includes("Finn")) probleme.push("Voraussetzung verfehlt: der zweite Trainer sieht die Übung des Kollegen – dann prüft dieser Fall nichts");
  if (!r.nachErst.includes("Finn:Kollege hat zuerst bewertet")) probleme.push("a) die Bewertung des Kollegen ist nach dem Speichern weg: " + JSON.stringify(r.nachErst));
  if (!r.nachErst.some(x => x === "Charles:Eigener Kommentar")) probleme.push("a) die eigene Bewertung fehlt: " + JSON.stringify(r.nachErst));
  const letzter = posts.length ? posts[posts.length - 1].body : null;
  const anServer = letzter && Array.isArray(letzter.data) ? letzter.data.map(e => e.trainer) : [];
  if (!anServer.includes("Finn") || !anServer.includes("Charles")) probleme.push("b) an den Server geht nicht beides: " + JSON.stringify(anServer));
  const eigene = r.nachZweit.filter(x => x.startsWith("Charles:"));
  if (eigene.length !== 1 || eigene[0] !== "Charles:Eigener Kommentar, geändert") probleme.push("c) zweites Speichern ersetzt nicht, sondern verdoppelt: " + JSON.stringify(r.nachZweit));
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  zeilen.push(`sichtbar für den zweiten Trainer: ${r.sichtbar.join(", ")} · nach dem Speichern: ${r.nachErst.length} Einträge · an den Server: ${anServer.join(" + ")} · nach erneutem Speichern: ${r.nachZweit.length} Einträge`);
  return h.ergebnis("v607 Einheit bewerten: die Bewertung der Kollegen bleibt stehen", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
