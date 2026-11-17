/* v448 – „wie kann ich ein Kind entfernen?": Haken „Im Kader" im Editor. Entscheidend:
   wird `aktiv` beim Speichern wirklich mitgeschickt, stehen Ausgetragene hinten?
   Dazu die Trainer-Rueckmeldung im Trainingsplan: sie muss vom TRAINING des Tages
   kommen, nicht vom fruehesten Termin (Spiel am Vormittag ohne Rückmeldungen). */
module.exports = async function (h) {
  const RAUS = h.KINDER[3], NEU_RAUS = h.KINDER[0];
  const probleme = [], zeilen = [];
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen({ inaktiv: [RAUS] }) }), hoehe: 1600 });
  const r = await s.page.evaluate(async ({ NEU_RAUS }) => {
    await loadKader(); kaderEditOpen(); await new Promise(r => setTimeout(r, 300));
    const rows = () => [...document.querySelectorAll(".kader-edit-row")];
    const reihenfolge = rows().map(z => ({ name: z.querySelector(".ke-name").value, haken: z.querySelector(".ke-aktiv")?.checked, hinweis: z.querySelector(".ke-raus-hinweis")?.style.display !== "none" }));
    const z = rows().find(x => x.querySelector(".ke-name").value === NEU_RAUS);
    const cb = z.querySelector(".ke-aktiv"); cb.checked = false; cb.dispatchEvent(new Event("change"));
    const hinweisDanach = z.querySelector(".ke-raus-hinweis")?.style.display !== "none";
    await kaderSaveAll(null); await new Promise(r => setTimeout(r, 300));
    return { reihenfolge, hinweisDanach };
  }, { NEU_RAUS });
  const post = s.gesendet.find(g => /\/kader$/.test(g.pfad) && g.methode === "POST");
  await s.schliessen();
  const letzte = r.reihenfolge[r.reihenfolge.length - 1];
  if (!letzte || letzte.name !== RAUS || letzte.haken !== false || !letzte.hinweis) probleme.push(`Ausgetragenes Kind steht nicht hinten/ohne Haken/mit Hinweis: ${JSON.stringify(letzte)}`);
  if (!r.hinweisDanach) probleme.push("nach dem Abwaehlen erscheint kein Hinweis");
  const rows = post ? [].concat(post.body) : [];
  if (!post) probleme.push("kein POST an kader");
  else {
    if (rows.find(x => x.name === NEU_RAUS)?.aktiv !== false) probleme.push("abgewaehltes Kind wird nicht mit aktiv=false gespeichert");
    if (rows.find(x => x.name === RAUS)?.aktiv !== false) probleme.push("bereits ausgetragenes Kind wird beim Speichern reaktiviert");
    if (!rows.filter(x => x.name !== NEU_RAUS && x.name !== RAUS).every(x => x.aktiv === true)) probleme.push("uebrige Kinder verlieren aktiv=true");
    if (rows.some(x => !("aktiv" in x))) probleme.push("aktiv fehlt in mindestens einer gesendeten Zeile");
  }
  zeilen.push(`Editor: ${r.reihenfolge.length} Zeilen, letzte „${letzte && letzte.name}“ · gesendet ${rows.length} Zeilen, aktiv=false bei ${rows.filter(x => x.aktiv === false).length}`);

  // Trainer-Rueckmeldung: Spiel (frueher, ohne Rückmeldungen) und Training (spaeter, mit) am selben Tag
  const TERMIN = h.tagePlus(2);
  let STATUS = {};                                     // wird unten aus TRAINER der App gefuellt
  const t = await h.starten({ supabase: h.supabaseAttrappe({ termine: u => {
    const zeilen = [{ typ: "spiel", uhrzeit: "10:45", trainer_status: {} }, { typ: "training", uhrzeit: "16:45", trainer_status: STATUS }];
    const typ = (u.searchParams.get("typ") || "").replace("eq.", "");
    return (typ ? zeilen.filter(z => z.typ === typ) : zeilen).slice(0, parseInt(u.searchParams.get("limit") || "99"));
  } }), hoehe: 1600 });
  // Status aus TRAINER der App ableiten – keine Namen im Test
  const status = STATUS = await t.page.evaluate(() => { const st = {}; TRAINER.slice(0, 4).forEach((n, i) => st[n] = ["ja", "ja", "nein", "unsicher"][i]); return st; });
  await h.sichtbarMachen(t.page, "#tp-timeline"); await h.terminSetzen(t.page, TERMIN);
  const e = await t.page.evaluate(async d => { await tpTrainerRsvpLaden(d); tpRenderTimeline(); await new Promise(r => setTimeout(r, 200));
    return { rsvp: TP_RSVP, an: [...document.querySelectorAll("#tp-trainer-checks input")].filter(x => x.checked).map(x => x.value), gecheckt: tpGetCheckedTrainers() }; }, TERMIN);
  await t.schliessen();
  const ja = Object.keys(status).filter(n => status[n] === "ja").sort();
  if (JSON.stringify(e.rsvp) !== JSON.stringify(status)) probleme.push(`geladen wurde nicht der Status des Trainings: ${JSON.stringify(e.rsvp)}`);
  if (JSON.stringify(e.an.slice().sort()) !== JSON.stringify(ja)) probleme.push(`angehakt ${JSON.stringify(e.an)}, erwartet die Zusagen ${JSON.stringify(ja)}`);
  zeilen.push(`Rueckmeldung: ${Object.keys(e.rsvp).length} Antworten geladen, ${e.an.length} angehakt (Zusagen ${ja.length})`);
  return h.ergebnis("Kader-Editor „Im Kader“ und Trainer-Rueckmeldung vom Training des Tages", !probleme.length, zeilen.concat(probleme));
};
