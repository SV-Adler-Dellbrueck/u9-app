/* v452 – „Diese Woche" auf der Trainer-Startseite: je Termin der naechsten 7 Tage eine
   Zeile mit dem Stand (Zusagen, Trainer, Plan, Aufstellung). Geprueft am DOM: Zeilen,
   Chip-Texte, Vergangenes gefiltert, Leerzustand, 44 px, Kontrast der Chips hell/dunkel. */
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const T1 = h.tagePlus(1), T3 = h.tagePlus(3), T5 = h.tagePlus(5), T9 = h.tagePlus(9), HEUTE = h.heute();
  /* Der beendete Termin von heute muss relativ zur echten Uhr enden: mit fest „06:30" war
     diese Pruefung nur nach 06:30 gruen (Lehre aus v482 – die Uhrzeit ist eine Testbedingung).
     Eine Minute vor jetzt ist immer vorbei, ausser genau um Mitternacht. */
  const _j = new Date(), _p = n => String(n).padStart(2, "0");
  const VORBEI = _p(Math.floor(Math.max(1, _j.getHours() * 60 + _j.getMinutes() - 1) / 60)) + ":" + _p(Math.max(1, _j.getHours() * 60 + _j.getMinutes() - 1) % 60) + ":00";
  const termine = [
    { id: 1, datum: HEUTE, uhrzeit: "00:00:00", uhrzeit_ende: VORBEI, typ: "training", trainer_status: {} },                // heute, schon vorbei
    { id: 2, datum: T1, uhrzeit: "16:45:00", typ: "training", trainer_status: { A: "ja", B: "ja", C: "nein" } },
    { id: 3, datum: T3, uhrzeit: "13:30:00", typ: "turnier", titel: "Cup", ort: "Sportplatz", trainer_status: {} },
    { id: 4, datum: T5, uhrzeit: "16:45:00", typ: "training", trainer_status: { A: "ja" } },
    { id: 5, datum: T9, uhrzeit: "16:45:00", typ: "training", trainer_status: {} }                                        // ausserhalb der 7 Tage
  ];
  const rsvp = [];
  for (let i = 0; i < 9; i++) rsvp.push({ termin_id: 2, spieler_id: i + 1, status: "zugesagt" });
  rsvp.push({ termin_id: 2, spieler_id: 10, status: "abgesagt" }, { termin_id: 3, spieler_id: 1, status: "zugesagt" }, { termin_id: 3, spieler_id: 2, status: "zugesagt" });
  const supabase = h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    termine: u => { const f = u.searchParams.getAll("datum"); return termine.filter(t => f.every(g => g.startsWith("gte.") ? t.datum >= g.slice(4) : g.startsWith("lt.") ? t.datum < g.slice(3) : true)); },
    rueckmeldungen: rsvp,
    trainingsplan: [{ datum: T1, plan: [{ formIdx: 1 }] }],
    trainingsgruppen: [{ datum: T1 }],
    nominierungen: []
  });
  const lauf = async (scheme, leer) => {
    const s = await h.starten({ supabase: leer ? h.supabaseAttrappe({ kader: h.kaderZeilen() }) : supabase, scheme, hoehe: 1600 });
    await h.sichtbarMachen(s.page, "#home-content");
    const r = await s.page.evaluate(async helfer => {
      await loadKader();
      let slot = document.getElementById("home-woche"); if (!slot) { slot = document.createElement("div"); slot.id = "home-woche"; document.getElementById("home-content").appendChild(slot); }
      await homeWocheLoad();
      eval(helfer);
      const rows = [...slot.querySelectorAll(".woche-zeile")];
      return {
        text: slot.textContent.replace(/\s+/g, " ").trim(),
        zeilen: rows.map(z => ({ text: z.textContent.replace(/\s+/g, " ").trim(), hoehe: Math.round(z.getBoundingClientRect().height), rolle: z.getAttribute("role"), tab: z.getAttribute("tabindex") })),
        chips: rows.flatMap(z => [...z.querySelectorAll("span")].filter(x => /zugesagt|Trainer|Plan steht|kein Plan|Aufstellung|nominiert|dabei|offen|abgesagt|Gruppen/.test(x.textContent) && !x.closest(".woche-erweitert")).map(x => ({ t: x.textContent.trim(), k: window.__kontrastVon(x) }))),
        // v458: die erste Zeile traegt Sprungknopf, Wetterplatz und Adresse – die anderen nicht
        erweitert: rows.map(z => !!z.querySelector(".woche-erweitert")),
        // v473: die erste Zeile traegt bei einem Training ZWEI Spruenge – Anwesenheit und Plan
        knopf: [...(rows[0] ? rows[0].querySelectorAll(".woche-erweitert button") : [])].map(b => b.textContent.trim()).join(" · "),
        wetterPlatz: !!(rows[0] && rows[0].querySelector("#wetter-home")),
        alteKarte: (document.getElementById("home-next") || {}).textContent || ""
      };
    }, h.kontrastHelfer);
    const fehler = s.fehler(); await s.schliessen();
    return { r, fehler };
  };
  const { r, fehler } = await lauf("light", false);
  if (r.zeilen.length !== 3) probleme.push(`${r.zeilen.length} Zeilen statt 3 (heute-vorbei und Tag 9 muessen fehlen)`);
  const z = (i, re) => { if (!r.zeilen[i] || !re.test(r.zeilen[i].text)) probleme.push(`Zeile ${i + 1}: „${r.zeilen[i] && r.zeilen[i].text}“ passt nicht zu ${re}`); };
  z(0, /9 zugesagt/); z(0, /1 abgesagt/); z(0, /5 offen/); z(0, /2 Trainer/); z(0, /Plan steht/); z(0, /Gruppen/);
  z(1, /Cup/); z(1, /Sportplatz/); z(1, /2 zugesagt/); z(1, /kein Trainer/); z(1, /Teams offen/);
  z(2, /0 zugesagt/); z(2, /1 Trainer/); z(2, /kein Plan/);
  r.zeilen.forEach((x, i) => { if (x.hoehe < 44) probleme.push(`Zeile ${i + 1} nur ${x.hoehe} px hoch`); if (x.rolle !== "button" || x.tab !== "0") probleme.push(`Zeile ${i + 1} nicht per Tastatur erreichbar`); });
  if (JSON.stringify(r.erweitert) !== JSON.stringify([true, false, false])) probleme.push("nur die erste Zeile darf erweitert sein: " + JSON.stringify(r.erweitert));
  if (!/Anwesenheit/.test(r.knopf) || !/Plan/.test(r.knopf) || !r.wetterPlatz) probleme.push(`erste Zeile: Knöpfe „${r.knopf.trim()}“ (erwartet Anwesenheit und Plan), Wetterplatz ${r.wetterPlatz}`);
  if (r.alteKarte.trim()) probleme.push("die alte Karte „Nächster Termin“ steht noch da: " + r.alteKarte.slice(0, 60));
  const min = Math.min(...r.chips.map(c => c.k));
  r.chips.filter(c => c.k < 4.5).forEach(c => probleme.push(`hell: Chip „${c.t}“ nur ${c.k}:1`));
  const dunkel = await lauf("dark", false);
  const minD = Math.min(...dunkel.r.chips.map(c => c.k));
  dunkel.r.chips.filter(c => c.k < 4.5).forEach(c => probleme.push(`dunkel: Chip „${c.t}“ nur ${c.k}:1`));
  const leer = await lauf("light", true);
  if (!/Kein Termin/.test(leer.r.text) || !/erfassen/.test(leer.r.text)) probleme.push("Leerzustand: „" + leer.r.text + "“");
  // Ferien: nichts in 7 Tagen, aber ein Termin am Tag 9 → „Als Nächstes" mit genau dieser Zeile
  const f = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: u => { const g = u.searchParams.getAll("datum"); return termine.filter(t => t.datum === T9 && g.every(x => x.startsWith("gte.") ? t.datum >= x.slice(4) : x.startsWith("lt.") ? t.datum < x.slice(3) : true)); } }), hoehe: 1600 });
  await h.sichtbarMachen(f.page, "#home-content");
  const fern = await f.page.evaluate(async () => { await loadKader(); let slot = document.getElementById("home-woche"); if (!slot) { slot = document.createElement("div"); slot.id = "home-woche"; document.getElementById("home-content").appendChild(slot); } await homeWocheLoad(); return { text: slot.textContent.replace(/\s+/g, " ").trim(), zeilen: slot.querySelectorAll(".woche-zeile").length, erweitert: !!slot.querySelector(".woche-erweitert") }; });
  await f.schliessen();
  if (fern.zeilen !== 1 || !/Als Nächstes/.test(fern.text) || !fern.erweitert) probleme.push("Ferien-Fall: " + JSON.stringify(fern));
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`${r.zeilen.length} Zeilen · ${r.chips.length} Chips · Kontrast min. hell ${min}:1, dunkel ${minD}:1 · leer: „${leer.r.text.slice(0, 40)}…“ · Ferien: ${fern.zeilen} Zeile`);
  return h.ergebnis("Diese Woche: Stand je Termin, Vergangenes raus, Leerzustand, Kontrast", !probleme.length, zeilen.concat(probleme));
};
