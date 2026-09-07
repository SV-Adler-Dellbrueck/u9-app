/* v476 – PO (Screenshot Anwesenheit, Kinderfestival · Heim): „Bei einem Spiel oder Turnier
   braucht es keinen Trainingsplan oder Übungen. Hier könnte dann eher die Turnierplanung
   erscheinen." Dazu der Nebenbefund: Anwesenheit und Plan fragten die Rueckmeldung nur bei
   typ=training ab – an einem Turniertag blieben die Trainer-Chips leer, ein Tipp ging ins
   Leere. Geprueft: Karte mit „Heimturnier planen" beim Heimturnier, „Zum Spieltag" beim
   Spiel, keine Karte beim Training; Trainer-Haken aus der Rueckmeldung des Turnier-Termins;
   Abhaken schreibt an den Turnier-Termin (PATCH id=69). */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const morgen = h.tagePlus(1), uebermorgen = h.tagePlus(2), in3 = h.tagePlus(3);
  const termine = [
    { id: 38, datum: morgen, typ: "training", uhrzeit: "16:45", trainer_status: { Markus: "ja" } },
    { id: 69, datum: uebermorgen, typ: "turnier", titel: "Kinderfestival · Heim", heim: true, uhrzeit: "10:15", trainer_status: { Finn: "ja", Charles: "ja", Peter: "nein" } },
    { id: 70, datum: in3, typ: "spiel", gegner: "Testgegner", uhrzeit: "13:30", trainer_status: { Peter: "ja" } }
  ];
  const termineGefiltert = u => termine.filter(t => {
    const d = (u.searchParams.get("datum") || "").replace(/^eq\./, ""), id = (u.searchParams.get("id") || "").replace(/^eq\./, "");
    return (!d || t.datum === d) && (!id || String(t.id) === id);
  });
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: termineGefiltert, heimturnier: [] }), hoehe: 1800 });
  const r = await s.page.evaluate(async ({ morgen, uebermorgen, in3 }) => {
    if (typeof awTerminKarte !== "function" || typeof terminDesTages !== "function") return { fehlt: "awTerminKarte/terminDesTages" };
    await loadKader();
    const warte = ms => new Promise(r => setTimeout(r, ms));
    Object.keys(AW_DATA).forEach(k => delete AW_DATA[k]);
    const mk = (id, tag) => { let el = document.getElementById(id); if (!el) { el = document.createElement(tag || "div"); el.id = id; document.body.appendChild(el); } return el; };
    mk("aw-termin-karte"); mk("aw-trainer-quelle"); mk("aw-list");
    const sel = mk("aw-date", "select");
    sel.innerHTML = `<option value="${morgen}">Mo · 🏃 Training</option><option value="${uebermorgen}">Sa · 🏆 Kinderfestival · Heim</option><option value="${in3}">So · ⚽ Testgegner</option>`;
    const awBox = mk("aw-trainer-checks");
    awBox.innerHTML = (TRAINER || []).map(t => `<label><input type="checkbox" value="${t}" onchange="awTrainerToggle(this)"><span>${t}</span></label>`).join("");
    const haken = () => [...awBox.querySelectorAll("input")].filter(i => i.checked).map(i => i.value).sort();
    const karte = () => document.getElementById("aw-termin-karte").textContent.replace(/\s+/g, " ").trim();
    const knopf = () => [...document.querySelectorAll("#aw-termin-karte button")].map(b => b.textContent.trim());
    const lauf = async d => { sel.value = d; awLoad(); await warte(500); return { haken: haken(), karte: karte(), knopf: knopf() }; };
    const training = await lauf(morgen);
    const turnier = await lauf(uebermorgen);
    // Charles im Turnier abhaken → Rueckmeldung „nein" am Termin 69
    const cb = [...awBox.querySelectorAll("input")].find(i => i.value === "Charles");
    if (cb) { cb.checked = false; await awTrainerToggle(cb); }
    await warte(200);
    const spiel = await lauf(in3);
    return { training, turnier, spiel };
  }, { morgen, uebermorgen, in3 });
  const fehler = s.fehler();
  const patches = s.gesendet.filter(g => g.methode === "PATCH" && /termine/.test(g.pfad));
  await s.schliessen();
  if (r.fehlt) { probleme.push(`Funktion ${r.fehlt} fehlt`); return h.ergebnis("Der Termin bestimmt das Werkzeug", false, probleme); }
  if (r.training.karte) probleme.push(`beim Training steht eine Karte: „${r.training.karte}“`);
  if (JSON.stringify(r.training.haken) !== JSON.stringify(["Markus"])) probleme.push(`Training: Haken ${JSON.stringify(r.training.haken)}`);
  if (!/Heimturnier planen/.test(r.turnier.knopf.join("|"))) probleme.push(`Heimturnier: kein Knopf „Heimturnier planen“ (${JSON.stringify(r.turnier.knopf)}, Karte „${r.turnier.karte.slice(0, 60)}“)`);
  if (JSON.stringify(r.turnier.haken) !== JSON.stringify(["Charles", "Finn"])) probleme.push(`Turnier: Haken ${JSON.stringify(r.turnier.haken)} statt der Rückmeldung des Turnier-Termins`);
  const p = patches.find(x => /id=eq\.69/.test(x.suche || "") && x.body && x.body.trainer_status && x.body.trainer_status.Charles === "nein");
  if (!p) probleme.push(`Abhaken am Turniertag schreibt nicht an Termin 69 (${JSON.stringify(patches.map(x => [x.suche, x.body && x.body.trainer_status]))})`);
  if (!/Zum Spieltag/.test(r.spiel.knopf.join("|"))) probleme.push(`Spiel: kein Knopf „Zum Spieltag“ (${JSON.stringify(r.spiel.knopf)})`);
  if (JSON.stringify(r.spiel.haken) !== JSON.stringify(["Peter"])) probleme.push(`Spiel: Haken ${JSON.stringify(r.spiel.haken)}`);
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Training: Karte „${r.training.karte || "–"}“ · Haken ${JSON.stringify(r.training.haken)}`);
  zeilen.push(`Heimturnier: ${JSON.stringify(r.turnier.knopf)} · Haken ${JSON.stringify(r.turnier.haken)} · PATCHes ${patches.length}`);
  zeilen.push(`Spiel: ${JSON.stringify(r.spiel.knopf)} · Haken ${JSON.stringify(r.spiel.haken)}`);
  return h.ergebnis("Der Termin bestimmt das Werkzeug: Turnier-/Spieltag-Karte in der Anwesenheit, Rückmeldung auch an Spiel- und Turniertagen", !probleme.length, zeilen.concat(probleme));
};
