/* v478 – PO: „Die Haken oder Kreuze hinter den Namen der Anwesenheit stimmen irgendwie nicht,
   und die Anwesenheiten werden immer noch nicht überall sauber übernommen." Befund: der
   Anwesenheits-Upsert schickte kein updated_at, die Tabellen hatten keinen Trigger – der
   Server blieb auf dem Zeitstempel des ersten Anlegens, die Konfliktregel „juengerer
   updated_at gewinnt" hielt jede lokale Kopie fuer juenger, zwei Handys ueberschrieben sich.
   Dazu: „Charles ✕" auf gruenem Chip (Rueckmeldung neben Tatsache), und der Plan stand um
   22 Uhr noch auf dem beendeten Training. Geprueft: Upsert traegt updated_at; juengerer
   Server-Stand ersetzt die lokale Kopie, aelterer nicht; am Tatsache-Tag keine Zeichen;
   der Plan springt ueber ein beendetes Training von heute. */
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const heute = h.heute(), morgen = h.tagePlus(1), gestern = h.tagePlus(-1);
  const jetzt = new Date(); const hh = n => String(n).padStart(2, "0");
  const vorbeiEnde = `${hh((jetzt.getHours() + 23) % 24)}:00`;   // Training heute, seit einer Stunde vorbei
  const serverRows = [
    { datum: heute, data: { "1": { da: true }, _trainers: ["Finn", "Kenneth", "Markus"] }, updated_at: new Date(Date.now() + 60000).toISOString() },   // Server juenger
    { datum: gestern, data: { "1": { da: false }, _trainers: ["Peter"] }, updated_at: new Date(Date.now() - 7200000).toISOString() }              // Server aelter
  ];
  const termine = [
    { id: 1, datum: heute, typ: "training", uhrzeit: "16:45", uhrzeit_ende: vorbeiEnde, trainer_status: { Charles: "nein", Kenneth: "ja" } },
    { id: 2, datum: morgen, typ: "training", uhrzeit: "16:45", uhrzeit_ende: "18:00", trainer_status: {} }
  ];
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, anwesenheit: serverRows }), hoehe: 1600 });
  await h.sichtbarMachen(s.page, "#train-sub-anwesenheit");
  const r = await s.page.evaluate(async ({ K, heute, gestern, morgen }) => {
    await loadKader();
    const warte = ms => new Promise(r => setTimeout(r, ms));
    // 1) Konfliktregel: lokal beide Tage aelter/juenger als der Server
    Object.keys(AW_DATA).forEach(k => delete AW_DATA[k]);
    AW_DATA[heute] = { [K[0]]: { da: false }, _trainers: ["Charles", "Peter"] };     // lokal veraltet
    AW_DATA[gestern] = { [K[0]]: { da: true }, _trainers: ["Finn"] };               // lokal juenger
    const ts = {}; ts[heute] = new Date().toISOString(); ts[gestern] = new Date().toISOString();
    localStorage.setItem(AW_TS_KEY, JSON.stringify(ts));
    if (typeof teamSyncLoad === "function") await teamSyncLoad();
    await warte(300);
    const heuteTrainer = (AW_DATA[heute] || {})._trainers || [], gesternTrainer = (AW_DATA[gestern] || {})._trainers || [];
    // 2) Upsert traegt updated_at
    const sel = document.getElementById("aw-date"); sel.innerHTML = `<option value="${heute}">${heute}</option>`; sel.value = heute;
    if (typeof awRenderList === "function") awRenderList();
    document.querySelectorAll("#aw-trainer-checks input").forEach(cb => { cb.checked = ["Finn", "Kenneth", "Markus"].includes(cb.value); });
    awSave(); await warte(1800);
    // 3) Plan-Chips am Tatsache-Tag: keine Zeichen
    const mk = (id, tag) => { let el = document.getElementById(id); if (!el) { el = document.createElement(tag || "div"); el.id = id; document.body.appendChild(el); } return el; };
    mk("tp-trainer-checks"); mk("tp-trainer-quelle");
    const d = mk("tp-date", "select"); d.innerHTML = `<option value="${heute}">${heute}</option>`; d.value = heute;
    if (typeof tpTrainerRsvpLaden === "function") await tpTrainerRsvpLaden(heute);
    const chips = [...document.querySelectorAll("#tp-trainer-checks label")].map(l => l.textContent.replace(/\s+/g, " ").trim());
    const haken = [...document.querySelectorAll("#tp-trainer-checks input")].filter(i => i.checked).map(i => i.value).sort();
    // 4) Plan-Auswahl: beendetes Training von heute wird uebersprungen
    d.innerHTML = "<option>Lade…</option>";
    if (typeof terminSelectFill === "function") await terminSelectFill("tp-date", { types: ["training"], future: true, vorbeiUeberspringen: true });
    const planDatum = d.value;
    let aw = null;
    if (typeof terminSelectFill === "function") { await terminSelectFill("aw-date", { types: ["training"], future: true }); aw = sel.value; }
    return { heuteTrainer, gesternTrainer, chips, haken, planDatum, awDatum: aw };
  }, { K, heute, gestern, morgen });
  const fehler = s.fehler();
  const posts = s.gesendet.filter(g => g.methode === "POST" && /\/anwesenheit$/.test(g.pfad));
  await s.schliessen();
  if (JSON.stringify(r.heuteTrainer.slice().sort()) !== JSON.stringify(["Finn", "Kenneth", "Markus"])) probleme.push(`jüngerer Server-Stand ersetzt die lokale Kopie nicht: ${JSON.stringify(r.heuteTrainer)}`);
  if (JSON.stringify(r.gesternTrainer) !== JSON.stringify(["Finn"])) probleme.push(`älterer Server-Stand überschreibt die jüngere lokale Kopie: ${JSON.stringify(r.gesternTrainer)}`);
  const ohneTs = posts.filter(p => !(p.body && p.body.updated_at));
  if (!posts.length) probleme.push("kein Anwesenheits-Upsert gesendet");
  if (ohneTs.length) probleme.push(`${ohneTs.length} Upsert(s) ohne updated_at`);
  const zeichen = r.chips.filter(c => /[✓✕?🤔]/.test(c));
  if (zeichen.length) probleme.push(`am Tatsache-Tag tragen Chips Rückmelde-Zeichen: ${JSON.stringify(zeichen)}`);
  if (JSON.stringify(r.haken) !== JSON.stringify(["Finn", "Kenneth", "Markus"])) probleme.push(`Plan-Haken ${JSON.stringify(r.haken)} statt der Anwesenheit`);
  if (r.planDatum !== morgen) probleme.push(`Plan steht auf ${r.planDatum} statt auf morgen (heutiges Training ist vorbei)`);
  if (r.awDatum !== heute) probleme.push(`Anwesenheit steht auf ${r.awDatum} statt auf heute (Nachtragen)`);
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Merge: heute ${JSON.stringify(r.heuteTrainer)} (Server jünger) · gestern ${JSON.stringify(r.gesternTrainer)} (lokal jünger)`);
  zeilen.push(`Upserts ${posts.length}, ohne updated_at ${ohneTs.length} · Chips ${JSON.stringify(r.chips)}`);
  zeilen.push(`Plan-Datum ${r.planDatum} · Anwesenheits-Datum ${r.awDatum}`);
  return h.ergebnis("Jüngster Stand gewinnt – wirklich: updated_at im Upsert, Merge-Richtung, Chips ohne Zeichen, Plan auf morgen", !probleme.length, zeilen.concat(probleme));
};
