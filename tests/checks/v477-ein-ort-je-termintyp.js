/* v477 – PO: „Die Reiter Trainingsplan und Übungen sind immer noch da, obwohl es kein
   Training ist. Und das Turnier läuft unter dem Reiter Training. Auch die Anwesenheit der
   Kinder am Spieltag wird nur teilweise übernommen." Befund: fuer Spiel/Turnier gab es zwei
   Eingabeorte (Training → Anwesenheit, Spieltag → Teams festlegen), die sich nicht kannten;
   alles am Spieltag liest die Nominierung. Entscheidung (Kacheln): ein Ort je Termintyp.
   Geprueft: die Anwesenheits-Auswahl bietet nur Trainings; „Teams festlegen" nennt seine
   Quelle und dass „Dabei" die Anwesenheit ist; Kinder ohne Antwort bleiben offen und
   lassen sich mit einem Knopf auf Dabei setzen (Upsert der Nominierung). */
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const t1 = h.tagePlus(1), t2 = h.tagePlus(2), t3 = h.tagePlus(3);
  const termine = [
    { id: 1, datum: t1, typ: "training", uhrzeit: "16:45", trainer_status: {} },
    { id: 2, datum: t2, typ: "turnier", titel: "Kinderfestival · Heim", heim: true, uhrzeit: "10:15", trainer_status: {} },
    { id: 3, datum: t3, typ: "event", titel: "Saisonfeier", uhrzeit: "15:00", trainer_status: {} }
  ];
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, nominierungen: [] }), hoehe: 1600 });
  await h.sichtbarMachen(s.page, "#train-sub-anwesenheit");
  const r = await s.page.evaluate(async ({ K, t2 }) => {
    await loadKader();
    const warte = ms => new Promise(r => setTimeout(r, ms));
    // 1) Anwesenheit: nur Trainings in der Auswahl
    if (typeof awDatesLoad === "function") await awDatesLoad();
    await warte(300);
    const optionen = [...(document.getElementById("aw-date")?.options || [])].map(o => o.textContent.trim());
    // 2) Teams festlegen: Quelle + Offene
    if (typeof nomRender !== "function") return { optionen, fehlt: "nomRender" };
    let sd = document.getElementById("spieltag-date"); if (!sd) { sd = document.createElement("select"); sd.id = "spieltag-date"; document.body.appendChild(sd); }
    sd.innerHTML = `<option value="${t2}" selected>${t2}</option>`; sd.value = t2;
    let panel = document.getElementById("nom-panel"); if (!panel) { panel = document.createElement("div"); panel.id = "nom-panel"; document.body.appendChild(panel); }
    Object.keys(nomStatus).forEach(k => delete nomStatus[k]);
    KADER.forEach((k, i) => { nomStatus[k.name] = i === 0 ? "dabei" : i === 1 ? "nicht" : "offen"; });
    nomRender();
    const quelle = document.getElementById("nom-quelle")?.textContent.replace(/\s+/g, " ").trim() || "";
    const knopf = document.getElementById("nom-offene-dabei")?.textContent.trim() || "";
    const offenVor = KADER.filter(k => nomStatus[k.name] === "offen").length;
    if (typeof nomOffeneDabei === "function") nomOffeneDabei();
    await warte(300);
    const offenNach = KADER.filter(k => nomStatus[k.name] === "offen").length;
    const dabeiNach = KADER.filter(k => nomStatus[k.name] === "dabei").length;
    const nichtNach = KADER.filter(k => nomStatus[k.name] === "nicht").length;
    const knopfNach = !!document.getElementById("nom-offene-dabei");
    return { optionen, quelle, knopf, offenVor, offenNach, dabeiNach, nichtNach, knopfNach };
  }, { K, t2 });
  const fehler = s.fehler();
  const posts = s.gesendet.filter(g => g.methode === "POST" && /nominierungen$/.test(g.pfad) && /on_conflict=datum/.test(g.suche || ""));
  await s.schliessen();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt`); return h.ergebnis("Ein Ort je Termintyp", false, probleme); }
  const fremd = r.optionen.filter(o => /🏆|🎉|⚽|Kinderfestival|Saisonfeier/.test(o));
  if (!r.optionen.length) probleme.push("Anwesenheits-Auswahl ist leer");
  if (fremd.length) probleme.push(`Anwesenheits-Auswahl bietet Nicht-Trainings an: ${JSON.stringify(fremd)}`);
  if (!/Rückmeldungen/.test(r.quelle) || !/Anwesenheit/.test(r.quelle)) probleme.push(`„Teams festlegen“ nennt Quelle/Anwesenheit nicht: „${r.quelle}“`);
  if (!/Offene/.test(r.knopf)) probleme.push(`kein Knopf für die Offenen (gefunden: „${r.knopf}“)`);
  if (r.offenVor !== K.length - 2) probleme.push(`vorher ${r.offenVor} offen statt ${K.length - 2}`);
  if (r.offenNach !== 0 || r.dabeiNach !== K.length - 1 || r.nichtNach !== 1) probleme.push(`nach dem Knopf: offen ${r.offenNach}, dabei ${r.dabeiNach}, nicht ${r.nichtNach}`);
  if (r.knopfNach) probleme.push("Knopf bleibt stehen, obwohl niemand mehr offen ist");
  if (!posts.length) probleme.push("Nominierung wurde nicht per Upsert gespeichert");
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Anwesenheits-Auswahl: ${JSON.stringify(r.optionen)}`);
  zeilen.push(`Teams festlegen: „${r.quelle.slice(0, 70)}…“ · Knopf „${r.knopf}“`);
  zeilen.push(`Offene ${r.offenVor} → ${r.offenNach} · dabei ${r.dabeiNach} · nicht ${r.nichtNach} · Upserts ${posts.length}`);
  return h.ergebnis("Ein Ort je Termintyp: Anwesenheit nur Trainings, „Dabei“ ist die Anwesenheit am Spieltag", !probleme.length, zeilen.concat(probleme));
};
