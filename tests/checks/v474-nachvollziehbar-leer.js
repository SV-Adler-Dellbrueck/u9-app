/* v474 – Rundgang, Paket „Nachvollziehbar & leer": Zahlen ohne Quelle („3 zugesagt" –
   woher?), „Neuer Termin" sah aus wie eine Ueberschrift, die Leerzustaende von Analyse
   (15 Balken „0 Spiele"), Aufstellung (zwei Erklaerkaesten ueber einem Algorithmus ohne
   Daten) und Bewerten (drei leere Kaesten) und Rot-Chips, die jede Woche rot waren.
   Geprueft: Quellenzeile, Quelle an „Kinder erwartet", Knopf-Klasse, ein Satz + Aktion in
   allen drei Leerzustaenden, Rot erst ab drei Tagen vor dem Termin.
   v871: Die alte Seite „Aufstellung“ ist entfernt – ihr Teil entfällt. */
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const nah = h.tagePlus(2), fern = h.tagePlus(5);
  const termine = [
    { id: 1, datum: nah, typ: "training", uhrzeit: "16:45", trainer_status: {} },
    { id: 2, datum: fern, typ: "training", uhrzeit: "16:45", trainer_status: {} }
  ];
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, blitz_ratings: [], profiles: [{ name: "Charles", rolle: "trainer" }], team_einstellungen: [{ id: 1, bewertung_ab: "2026-01-01" }] }), hoehe: 1800 });
  await h.sichtbarMachen(s.page, "#home-content");
  const r = await s.page.evaluate(async ({ K, nah, fern }) => {
    await loadKader(); window.trainerMe = async () => "Charles";
    document.getElementById("pin-gate")?.remove();
    const m = document.getElementById("main-app"); if (m) { m.style.display = ""; if (getComputedStyle(m).display === "none") m.style.display = "block"; }
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const sichtbar = el => !!el && getComputedStyle(el).display !== "none";
    // 1) Diese Woche: Quellenzeile + Rot nur beim nahen Termin
    /* v890: statt fester Zeiten nach go() auf das jeweils Gemessene warten (Obergrenze je 8 s; kommt es nie, wird es rot) */
    const bis = async f => { for (let i = 0; i < 160 && !f(); i++) await warte(50); };
    go("home"); await bis(() => document.querySelectorAll("#home-woche .woche-zeile").length >= 2
      && /kein Trainer/.test(document.querySelector("#home-woche .woche-zeile")?.textContent || ""));
    /* v939: Die Quellenzeile unter der Karte ist entfallen (Charles 22.11.); die Quellen stehen in der Hilfe zu „Diese Woche“. */
    const quelle = ((typeof HELP !== "undefined" ? HELP : []).flatMap(g => g.items || g.eintraege || [g]).find(x => x && x.t === "Diese Woche")?.d || "") + (document.querySelector("#home-woche .woche-quelle") ? " ALTE-QUELLENZEILE" : "");
    const zeilenEl = [...document.querySelectorAll("#home-woche .woche-zeile")];
    const chipRot = z => [...z.querySelectorAll("span")].filter(c => /zugesagt| dabei/.test(c.textContent)).map(c => /--red-bg/.test(c.getAttribute("style") || "") ? "rot" : "nicht rot");
    const zusage = zeilenEl.map(z => ({ text: z.textContent.replace(/\s+/g, " ").slice(0, 40), zugesagt: chipRot(z)[0], trainerRot: /--red-bg/.test([...z.querySelectorAll("span")].find(c => /kein Trainer/.test(c.textContent))?.getAttribute("style") || "") }));
    // 2) Termine: „Neuer Termin" ist ein Knopf
    go("termine"); await warte(500);
    const neu = document.getElementById("tm-neu-toggle");
    const neuBtn = !!neu && neu.classList.contains("btn");
    const neuH = neu ? parseInt(getComputedStyle(neu).minHeight) : 0;
    // 3) Trainingsplan: „Kinder erwartet" nennt die Quelle
    go("planung"); await bis(() => /\d+ (dabei|zugesagt|im Kader)/.test(document.getElementById("tp-prognose")?.textContent || ""));
    const prog = document.getElementById("tp-prognose")?.textContent.replace(/\s+/g, " ").trim() || "";
    // 4) Analyse: kein einziges Blitz-Rating → ein Satz + Aktion, keine Nullbalken
    go("analyse"); await bis(() => { const t = (document.getElementById("an-fairness")?.textContent || "").trim(); return t && !/Lade/.test(t); });
    const fair = document.getElementById("an-fairness");
    const fairText = fair?.textContent.replace(/\s+/g, " ").trim() || "";
    const fairNull = (fairText.match(/0 Spiele/g) || []).length;
    const fairBtn = !!fair?.querySelector("button");
    // 5) Aufstellung: v871 entfallen – die alte Seite gibt es nicht mehr (Mini-Feld am Spieltag, v858)
    // 6) Bewerten: Kaesten erst mit gewaehltem Kind
    // v648: Bewerten ist erst ab dem Startdatum offen – hier liegt es in der Vergangenheit
    BEW_AB = "2026-01-01"; go("bew"); if (typeof bewSperreAnwenden === "function") bewSperreAnwenden(); await warte(400);
    const leerVor = sichtbar(document.getElementById("bew-leer")), panelVor = sichtbar(document.getElementById("bew-live-panel")), fboxVor = sichtbar(document.getElementById("bew-fbox"));
    /* Das Live-Radar (Chart.js) laesst den kopflosen Browser nach dem Zeichnen stehen –
       kein Timer, kein Frame mehr (auch vor v474 so, nur nie in einer Pruefung beruehrt).
       Hier geht es um die Sichtbarkeit der Kaesten, nicht um das Diagramm: Attrappe. */
    window.Chart = class { constructor() { this.data = { datasets: [{}] }; } destroy() {} update() {} };
    const sel = document.getElementById("p-name");
    if (sel && ![...sel.options].some(o => o.value === K[0])) { const o = document.createElement("option"); o.value = o.textContent = K[0]; sel.appendChild(o); }
    if (sel) { sel.value = K[0]; if (typeof onPlayerSelect === "function") onPlayerSelect(); }
    await warte(300);
    const leerNach = sichtbar(document.getElementById("bew-leer")), panelNach = sichtbar(document.getElementById("bew-live-panel")), fboxNach = sichtbar(document.getElementById("bew-fbox"));
    return { quelle, zusage, neuBtn, neuH, prog, fairNull, fairBtn, fairText: fairText.slice(0, 80), leerVor, panelVor, fboxVor, leerNach, panelNach, fboxNach };
  }, { K, nah, fern });
  const fehler = s.fehler(); await s.schliessen();
  if (!/Rückmeldungen/.test(r.quelle) || /ALTE-QUELLENZEILE/.test(r.quelle)) probleme.push(`Hilfe zu „Diese Woche“ nennt keine Quelle (oder die alte Zeile steht noch da): „${r.quelle.slice(0, 80)}“`);
  if (r.zusage.length < 2) probleme.push(`nur ${r.zusage.length} Wochenzeilen`);
  else {
    /* v609: Beim Training zählt „N dabei“ (gilt als zugesagt) – der Kinder-Chip hat keinen
       Grund mehr, rot zu werden. Die Drei-Tage-Regel prüft jetzt der Trainer-Chip allein. */
    if (r.zusage[0].zugesagt === "rot" || !r.zusage[0].trainerRot) probleme.push(`Termin in 2 Tagen: Trainer nicht rot oder Kinder-Chip rot: ${JSON.stringify(r.zusage[0])}`);
    if (r.zusage[1].zugesagt === "rot" || r.zusage[1].trainerRot) probleme.push(`Termin in 5 Tagen ist schon rot: ${JSON.stringify(r.zusage[1])}`);
  }
  if (!r.neuBtn) probleme.push("„Neuer Termin“ ist kein Knopf (Klasse btn fehlt)");
  if (r.neuH < 44) probleme.push(`„Neuer Termin“ nur ${r.neuH}px`);
  /* v605: Der Chip schätzt nicht mehr („~N erwartet“), er zählt („N dabei · M fehlen“) –
     auf Wunsch des PO. Die Regel dieser Prüfung bleibt: keine Zahl ohne Quelle in Klammern. */
  if (!/\d+ (dabei|zugesagt|im Kader).*\(.+\)/.test(r.prog)) probleme.push(`Kinderzahl ohne Quelle: „${r.prog}“`);
  if (r.fairNull) probleme.push(`Einsatz-Fairness zeigt ${r.fairNull}× „0 Spiele“ statt eines Satzes`);
  if (!r.fairBtn) probleme.push("Einsatz-Fairness leer ohne Aktion");
  if (!r.leerVor || r.panelVor || r.fboxVor) probleme.push(`Bewerten ohne Kind: Satz ${r.leerVor}, Live-Profil ${r.panelVor}, Förderplan ${r.fboxVor}`);
  if (r.leerNach || !r.panelNach || !r.fboxNach) probleme.push(`Bewerten mit Kind: Satz ${r.leerNach}, Live-Profil ${r.panelNach}, Förderplan ${r.fboxNach}`);
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Woche: Quelle „${r.quelle.slice(0, 40)}…“ · ${r.zusage.map(z => `${z.text.slice(0, 12)}: ${z.zugesagt}${z.trainerRot ? "/Trainer rot" : ""}`).join(" · ")}`);
  zeilen.push(`Neuer Termin: btn ${r.neuBtn} ${r.neuH}px · Prognose „${r.prog}“`);
  zeilen.push(`Fairness: „${r.fairText}“ (0-Spiele ${r.fairNull}, Aktion ${r.fairBtn})`);
  zeilen.push(`Bewerten ohne Kind: ${r.leerVor}/${r.panelVor}/${r.fboxVor} · mit Kind: ${r.leerNach}/${r.panelNach}/${r.fboxNach}`);
  return h.ergebnis("Nachvollziehbar & leer: Quellen, Knopf, ein Satz + Aktion, Rot erst ab drei Tagen", !probleme.length, zeilen.concat(probleme));
};
