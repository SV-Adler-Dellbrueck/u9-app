/* v637 · PO nach dem Audit: „Nicht gesehen“, Bewertungsrunden, Torschützenkönig raus, Eltern-Einstieg.

   a) Jedes Kriterium hat „Nicht gesehen“ (Wert 0); ein Formular aus Stufen und „Nicht gesehen“ ist vollständig.
   b) „Nicht gesehen“ zählt nicht: eine nicht beobachtete Dimension ist null, der Gesamtwert fällt nicht,
      der Förderplan nennt die Kriterien als „nicht gesehen“ statt als Entwicklungsfeld.
   c) Runde gegen Runde: Bewertungen binnen 21 Tagen sind eine Runde; „gewachsen“ erst ab zwei Stufen.
   d) Rundenstand: 50 Tage nach der letzten Runde ist die nächste fällig (seit v648 ab 49 Tagen und
      erst ab dem Startdatum der Bewertungen – hier liegt es in der Vergangenheit), und das steht über dem Formular.
   e) Meilensteine werten „nicht gesehen“ nicht als Sprung.
   f) Saisonrückblick ohne Torschützenkönig, mit Teamzahl.
   g) Eltern: „Was muss mit?“ je Platz, Rundgang mit fünf Schritten. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const K = h.KINDER;
  const s = await h.starten({ hoehe: 1400, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen({}), spielerprofile: [], team_einstellungen: [{ id: 1, bewertung_ab: "2026-01-01" }] }) });
  const r = await s.page.evaluate(async K => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = {};
    document.getElementById("pin-gate")?.remove(); const m = document.getElementById("main-app"); if (m) m.style.display = "block";
    window.Chart = class { constructor() { this.data = { datasets: [{}] }; } destroy() {} update() {} };
    try { await loadKader(); } catch (e) {}
    go("bew"); await warte(300);
    const sel = document.getElementById("p-name");
    const feld = (KADER.find(k => !k.tw) || {}).name || K[4];   // Feldspieler: das Torwart-Kind hätte zusätzlich sechs TW-Kriterien
    if (![...sel.options].some(o => o.value === feld)) { const o = document.createElement("option"); o.value = o.textContent = feld; sel.appendChild(o); }
    sel.value = feld; onPlayerSelect(); await warte(80);
    out.feldTw = isTWPlayer();
    // a) „Nicht gesehen“ je Kriterium
    const krit = DIMS_FELD.flatMap(d => d.tier.map(t => t.n));
    out.krit = krit.length;
    out.ng = krit.filter(n => document.querySelector(`input[name="${n}"][value="0"]`)).length;
    const tech = DIMS_FELD.find(d => d.id === "tech").tier.map(t => t.n);
    krit.forEach(n => { const x = document.querySelector(`input[name="${n}"][value="${tech.includes(n) ? 0 : 2}"]`); if (x) x.checked = true; });
    onChange();
    out.voll = countFilled() === totalCrit();
    // b) Zählung
    const v = getV();
    const alle2 = {}; krit.forEach(n => { alle2[n] = 2; });
    const sc = calcScores(v, DIMS_FELD), sc2 = calcScores(alle2, DIMS_FELD);
    out.techNull = sc.dims.tech === null; out.total = sc.total; out.total2 = sc2.total;
    const fz = generateFazitFeld(v, { name: K[0], foot: "R", att: "3", trainer: "Trainerteam", date: "2026-09-27" }).text;
    const efTeil = (fz.split("ENTWICKLUNGSFELDER")[1] || "").split("Nicht gesehen")[0];
    const techLabel = DIMS_FELD.find(d => d.id === "tech").tier[0].l;
    out.fzNg = /Nicht gesehen \(zählt nicht mit\)/.test(fz);
    out.techAlsFeld = efTeil.includes(techLabel);
    out.zeileNull = /null%/.test(fz);
    // c) Runde gegen Runde
    DB[K[1]] = [
      { name: K[1], datum: "2026-06-01", radios: { f_pass: 2, f_tempo: 2, f_raum: 3 } },
      { name: K[1], datum: "2026-06-10", radios: { f_pass: 1, f_tempo: 2, f_raum: 3 } },   // Korrektur in derselben Runde
      { name: K[1], datum: "2026-07-20", radios: { f_pass: 3, f_tempo: 3, f_raum: 0 } }
    ];
    out.runden = bewRunden(K[1]).length;
    const vg = bewVergleich(K[1]);
    const lbl = n => DIMS_FELD.flatMap(d => d.tier).find(t => t.n === n).l;
    out.hochPass = vg.hoch.includes(lbl("f_pass")); out.hochTempo = vg.hoch.includes(lbl("f_tempo"));
    out.raumBewegt = vg.hoch.concat(vg.runter).includes(lbl("f_raum"));
    // d) Rundenstand (v648: Startdatum der Bewertungen liegt zurück)
    BEW_AB = "2026-01-01";
    Object.keys(DB).forEach(n => { if (n !== K[1]) delete DB[n]; });
    const alt = new Date(Date.now() - 50 * 864e5).toISOString().slice(0, 10);
    DB[K[0]] = [{ name: K[0], datum: alt, radios: alle2 }];
    DB[K[1]] = [{ name: K[1], datum: alt, radios: alle2 }];
    const st = bewRundenStand(); out.faellig = st.faellig; out.tage = st.tage;
    bewRundeBarRender(); out.zeile = document.getElementById("bew-runden-stand")?.textContent || "";
    // e) Meilensteine
    DB[K[2]] = [{ name: K[2], datum: "2026-05-01", radios: { f_pass: 0 } }, { name: K[2], datum: "2026-09-01", radios: { f_pass: 4 } }];
    out.meilenstein = typeof computeMilestones === "function" ? computeMilestones().filter(x => x.name === K[2]).length : "fehlt";
    // f) Wrapped
    const slides = adlerWrappedSlides({ saison: "2026/27", tore: 9, torschuetzen_anzahl: 4, top_torschuetze: { name: K[5], wert: 5 } }, []);
    const wtxt = slides.map(x => x.html).join(" ");
    out.koenig = /Torschützenkönig/.test(wtxt) || wtxt.includes(K[5]);
    out.teamzahl = /<b>4<\/b> verschiedenen Kindern/.test(wtxt);
    // g) Eltern-Einstieg
    out.tour = typeof ELTERN_TOUR !== "undefined" ? ELTERN_TOUR.length : "fehlt";
    out.packKunst = typeof tdWasMussMit === "function" ? tdWasMussMit({ typ: "training", platz: "Kunstrasen Nord" }) : "fehlt";
    out.packHalle = typeof tdWasMussMit === "function" ? tdWasMussMit({ typ: "turnier", platz: "Sporthalle" }) : "fehlt";
    out.packEvent = typeof tdWasMussMit === "function" ? tdWasMussMit({ typ: "event" }) : "fehlt";
    return out;
  }, K);
  const fe = s.fehler(); await s.schliessen();

  if (r.ng !== r.krit) probleme.push(`a) „Nicht gesehen“ nur bei ${r.ng} von ${r.krit} Kriterien`);
  if (!r.voll) probleme.push("a) Formular mit „Nicht gesehen“ gilt nicht als vollständig");
  if (!r.techNull) probleme.push("b) nicht beobachtete Technik ist nicht null");
  if (r.total !== r.total2) probleme.push(`b) Gesamtwert fällt durch „nicht gesehen“: ${r.total} statt ${r.total2}`);
  if (!r.fzNg) probleme.push("b) Förderplan nennt die nicht gesehenen Kriterien nicht");
  if (r.techAlsFeld) probleme.push("b) nicht gesehenes Kriterium steht als Entwicklungsfeld");
  if (r.zeileNull) probleme.push("b) Förderplan zeigt „null%“");
  if (r.runden !== 2) probleme.push(`c) Runden falsch gezählt: ${r.runden} statt 2`);
  if (!r.hochPass) probleme.push("c) Passspiel 1→3 (zwei Stufen) gilt nicht als gewachsen");
  if (r.hochTempo) probleme.push("c) Tempo 2→3 (eine Stufe, einmal) gilt schon als gewachsen");
  if (r.raumBewegt) probleme.push("c) „nicht gesehen“ beim Raum zählt als Veränderung");
  if (!r.faellig || !/fällig/.test(r.zeile)) probleme.push(`d) Runde nach ${r.tage} Tagen nicht fällig: „${r.zeile}“`);
  if (r.meilenstein !== 0) probleme.push("e) „nicht gesehen“ → 4 wird als Meilenstein gezählt: " + r.meilenstein);
  if (r.koenig) probleme.push("f) Saisonrückblick nennt noch einen Torschützenkönig");
  if (!r.teamzahl) probleme.push("f) Teamzahl der Torschützen fehlt");
  if (r.tour !== 5) probleme.push("g) Rundgang hat " + r.tour + " Schritte statt 5");
  if (!/Kunstrasen/.test(r.packKunst) || !/Schienbeinschoner/.test(r.packKunst)) probleme.push("g) „Was muss mit?“ ohne Kunstrasenschuhe/Schienbeinschoner");
  if (!/Hallenschuhe/.test(r.packHalle) || !/essen/.test(r.packHalle)) probleme.push("g) Turnier in der Halle ohne Hallenschuhe/Verpflegung");
  if (r.packEvent !== "") probleme.push("g) „Was muss mit?“ erscheint auch bei Events");
  if (/Trainerteam kontaktieren/.test(r.packKunst) === false) probleme.push("g) kein Weg zum Trainerteam am Termin");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`„Nicht gesehen“ ${r.ng}/${r.krit} · Gesamt ${r.total} (alles Solide: ${r.total2}) · Technik null ${r.techNull}`,
    `Runden ${r.runden} · Passspiel gewachsen ${r.hochPass} · Tempo ${r.hochTempo}`, `Rundenstand: ${r.zeile}`,
    `Wrapped ohne König ${!r.koenig}, Teamzahl ${r.teamzahl} · Rundgang ${r.tour} Schritte`);
  return h.ergebnis("v637 „Nicht gesehen“, Bewertungsrunden, Wrapped ohne König, Eltern-Einstieg", !probleme.length, probleme.concat(zeilen));
};
