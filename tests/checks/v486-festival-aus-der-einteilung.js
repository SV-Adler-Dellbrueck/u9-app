/* v486 – PO: „Die Anzahl der Kinder für unseren Verein direkt aus der Einteilung übernehmen
   … Standard alle 4 Felder anlegen, beim Planen auf die nötige Zahl kürzen (grundsätzlich
   4+1 oben löschen) … Startseite zeigt 0 Zusagen, obwohl die Teams stehen … Aufstellung aus
   der Terminkarte: „Bitte Datum wählen", Fenster bleibt offen … 5 Minuten Trinkpause …
   Beginn 10:15 … eigene Bälle … Plan von allen Trainern veränderbar (Paarungen tauschen)."
   Geprueft: vier Standardfelder, Kuerzen nach Teams und Teamgroesse, Einteilung fuellt unsere
   Zeile und respektiert Handaenderung, Tausch im Plan wird gespeichert, Startseiten-Chip
   „dabei", Terminkarte springt nach „Teams festlegen" und schliesst sich, Vorlage/Defaults. */
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const spiel = h.tagePlus(2), training = h.tagePlus(4);
  const nomDaten = {}; K.slice(0, 9).forEach(n => { nomDaten[n] = "dabei"; }); nomDaten[K[9]] = "nicht";
  const nominierungen = (u) => {
    const q = u.searchParams.get("datum") || "";
    const rows = [];
    if (q.includes(spiel + "__nom")) rows.push({ datum: spiel + "__nom", data: nomDaten });
    if (q.includes(spiel + "__teams")) rows.push({ datum: spiel + "__teams", data: { _anzahl: 2 } });
    return rows;
  };
  const termine = [
    { id: 1, datum: spiel, typ: "turnier", heim: true, titel: "Kinderfestival", uhrzeit: "10:15", trainer_status: {} },
    { id: 2, datum: training, typ: "training", uhrzeit: "16:45", trainer_status: {} }
  ];
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, nominierungen, rueckmeldungen: [], trainingsplan: [], trainingsgruppen: [], heimturnier: (u, req) => req.method() === "PATCH" ? { status: 204, body: "" } : [], profiles: [{ name: "Charles", rolle: "trainer" }] }), hoehe: 1800 });
  await h.sichtbarMachen(s.page, "#home-content");
  const r = await s.page.evaluate(async ({ spiel }) => {
    if (typeof fstFelderKuerzen !== "function" || typeof fstTausch !== "function" || typeof fstEinteilungSync !== "function") return { fehlt: "fstFelderKuerzen/fstTausch/fstEinteilungSync" };
    await loadKader(); window.trainerMe = async () => "Charles";
    document.getElementById("pin-gate")?.remove();
    const m = document.getElementById("main-app"); if (m) { m.style.display = ""; if (getComputedStyle(m).display === "none") m.style.display = "block"; }
    const warte = ms => new Promise(r => setTimeout(r, ms));
    // 1) Felder
    const std = FST_STANDARD_FELDER.map((_, i) => fstFeldName(FST_STANDARD_FELDER, i));
    const t6klein = Array.from({ length: 6 }, (_, i) => ({ name: "T" + i, kinder: 5 }));
    const t6gross = Array.from({ length: 6 }, (_, i) => ({ name: "T" + i, kinder: 7 }));
    const t8 = Array.from({ length: 8 }, (_, i) => ({ name: "T" + i, kinder: 5 }));
    const nm = f => f.map((_, i) => fstFeldName(f, i)).join(",");
    const k6 = nm(fstFelderKuerzen(FST_STANDARD_FELDER, t6klein)), k6g = nm(fstFelderKuerzen(FST_STANDARD_FELDER, t6gross)), k8 = nm(fstFelderKuerzen(FST_STANDARD_FELDER, t8));
    // 2) Startseite
    go("home"); await warte(900);
    const zeilen = [...document.querySelectorAll("#home-woche .woche-zeile")].map(z => z.textContent.replace(/\s+/g, " "));
    const festZeile = zeilen.find(z => /Kinderfestival|Turnier/.test(z)) || "";
    const trainZeile = zeilen.find(z => /Training/.test(z)) || "";
    const quelle = document.querySelector("#home-woche .woche-quelle")?.textContent || "";
    // 3) Terminkarte
    const t = { id: 1, datum: spiel, typ: "turnier", heim: true, titel: "Kinderfestival", uhrzeit: "10:15", trainer_status: {} };
    if (typeof TM_TERMINE !== "undefined") { TM_TERMINE.length = 0; TM_TERMINE.push(t); }
    const karte = typeof _tmdInhalt === "function" ? _tmdInhalt(t) : "";
    const modal = document.createElement("div"); modal.id = "tmd-modal"; document.body.appendChild(modal);
    tmJump("spieltag", spiel); await warte(700);
    const modalZu = !document.getElementById("tmd-modal");
    // 4) Festival: Einteilung fuellt unsere Zeile
    _HT = { id: 7, name: "Kinderfestival", datum: spiel, config: { art: "festival", felder: FST_STANDARD_FELDER.slice(), vereine: [{ name: "SV Adler Dellbrück", kinder: 14, teams: 2 }, { name: "SV Auweiler-Esch", kinder: 10, teams: 2 }], infos: HT_INFOS_VORLAGE }, teams: [], plan: [] };
    const body = document.createElement("div"); body.id = "ht-body"; document.body.appendChild(body);
    fstRender(); await warte(600);
    const unsere = () => (_HT.config.vereine || []).find(v => /Adler/.test(v.name)) || {};
    const nachSync = { kinder: unsere().kinder, teams: unsere().teams };
    const hinweis = document.getElementById("fst-einteilung")?.textContent || "";
    const pauseLabel = /Trinkpause/.test(body.textContent), startWert = document.getElementById("fst-start")?.value;
    await fstVereinSet(0, "kinder", 12); await warte(600);
    const nachHand = { kinder: unsere().kinder, manuell: unsere().manuell === true };
    // 5) Plan erstellen: kuerzt auf 3 Felder; dann tauschen
    await fstPlanErstellen(); await warte(600);
    const felderNachPlan = (_HT.config.felder || []).map((_, i) => fstFeldName(_HT.config.felder, i)).join(",");
    const plan = _HT.plan || [];
    const vorher = plan.slice(0, 2).map(p => [p.a, p.b]);
    const tasten = body.querySelectorAll("button.fst-tausch").length;
    await fstTausch(0, "a"); await warte(200); await fstTausch(1, "b"); await warte(500);
    const nachher = (_HT.plan || []).slice(0, 2).map(p => [p.a, p.b]);
    return { std, k6, k6g, k8, festZeile, trainZeile, quelle, karte: /Teams festlegen/.test(karte) && !/tmJump\('aufstellung'/.test(karte), modalZu,
      nachSync, hinweis, pauseLabel, startWert, nachHand, felderNachPlan, spiele: plan.length, tasten, vorher, nachher,
      baelle: /Bälle/.test(HT_INFOS_VORLAGE), start: FST_START, pause: FST_PAUSE };
  }, { spiel });
  const fehler = s.fehler(); const gesendet = s.gesendet.slice(); await s.schliessen();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt`); return h.ergebnis("Festival aus der Einteilung", false, probleme); }
  if (r.std.join(",") !== "Käfig,Funino 1,Funino 2,4+1 oben") probleme.push(`Standardfelder ${r.std.join(",")} statt Käfig,Funino 1,Funino 2,4+1 oben`);
  if (r.k6 !== "Käfig,Funino 1,Funino 2") probleme.push(`6 kleine Teams: ${r.k6} – „4+1 oben“ muss zuerst wegfallen`);
  if (r.k6g !== "Käfig,Funino 1,4+1 oben") probleme.push(`6 große Teams (7 Kinder): ${r.k6g} – 4+1 oben sollte bleiben`);
  if (r.k8 !== "Käfig,Funino 1,Funino 2,4+1 oben") probleme.push(`8 Teams: ${r.k8} – alle vier Felder nötig`);
  if (!/9 dabei/.test(r.festZeile) || /zugesagt|nominiert/.test(r.festZeile)) probleme.push(`Startseite Festival-Zeile: „${r.festZeile.slice(0, 90)}“ – erwartet „9 dabei“ ohne Zusagen-Chip`);
  if (!/zugesagt/.test(r.trainZeile)) probleme.push(`Training zeigt keine Zusagen mehr: „${r.trainZeile.slice(0, 60)}“`);
  if (!/Teams festlegen/.test(r.quelle)) probleme.push("Quellenzeile nennt „Teams festlegen“ nicht");
  if (!r.karte) probleme.push("Terminkarte springt nicht nach „Teams festlegen“");
  if (!r.modalZu) probleme.push("Terminfenster bleibt beim Sprung offen");
  if (r.nachSync.kinder !== 9 || r.nachSync.teams !== 2) probleme.push(`Einteilung nicht übernommen: ${JSON.stringify(r.nachSync)} statt 9 Kinder / 2 Teams`);
  if (!/9 dabei/.test(r.hinweis)) probleme.push(`Hinweis nennt die Quelle nicht: „${r.hinweis}“`);
  if (r.nachHand.kinder !== 12 || !r.nachHand.manuell) probleme.push(`Handänderung überschrieben: ${JSON.stringify(r.nachHand)}`);
  if (!r.pauseLabel) probleme.push("Feld „Trinkpause“ fehlt"); if (r.start !== "10:15" || r.pause !== 5) probleme.push(`Defaults ${r.start}/${r.pause} statt 10:15/5`);
  if (!r.baelle) probleme.push("Bälle-Hinweis fehlt in der Vorlage");
  if (r.felderNachPlan !== "Käfig,Funino 1") probleme.push(`4 Teams brauchen 2 Felder (Käfig, Funino 1) – Felder nach Plan: ${r.felderNachPlan}`);
  if (!r.tasten) probleme.push("keine Tausch-Tasten im Plan");
  const getauscht = r.vorher.length === 2 && r.nachher[0][0] === r.vorher[1][1] && r.nachher[1][1] === r.vorher[0][0];
  if (!getauscht) probleme.push(`Tausch wirkt nicht: vorher ${JSON.stringify(r.vorher)} nachher ${JSON.stringify(r.nachher)}`);
  if (!gesendet.some(g => g.methode === "PATCH" && /heimturnier/.test(g.pfad) && g.body && Array.isArray(g.body.plan))) probleme.push("getauschter Plan wurde nicht gespeichert");
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Felder: Standard ${r.std.join(", ")} · 6 kleine Teams → ${r.k6} · 6 große → ${r.k6g} · 8 → ${r.k8}`);
  zeilen.push(`Startseite: „${r.festZeile.slice(0, 70)}“ · Terminkarte → Teams festlegen ${r.karte}, Fenster zu ${r.modalZu}`);
  zeilen.push(`Einteilung: ${JSON.stringify(r.nachSync)} → Hand ${JSON.stringify(r.nachHand)} · Plan ${r.spiele} Spiele auf ${r.felderNachPlan} · Tausch ${getauscht}`);
  return h.ergebnis("Festival aus der Einteilung: 4 Felder mit Kürzen, Kinder aus Teams festlegen, Tausch im Plan, Startseite „dabei“", !probleme.length, zeilen.concat(probleme));
};
