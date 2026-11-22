/* v937 · Termine in der Trainer-App: Kacheln zum Wischen, getrennte Ansichten (Charles 21.11.2026, Entwurf freigegeben:
   „Kachel + Liste“, „Ja, so trennen“, „Nächste 5 Termine“).

   Vorher: Unter der grünen Kachel standen „Anwesenheit“ und „Plan“ (verschieden breit), ein Tipp auf die Kachel öffnete
   ein Fenster mit denselben beiden Knöpfen und dazu aller Orga (Eltern-Info, Ansage, Kalender, Vertretung, Löschen).
   „＋ Termin“ und die Adresse standen auf der Startseite.

   a) Startseite: Bahn „Nächste Termine“ mit höchstens fünf Kacheln, jede mit Band; in der Kachel kein Knopf, kein
      „Termin“-Knopf auf der Startseite; darunter die Liste „Diese Woche“ nur mit Terminen der nächsten sieben Tage.
   b) Ort: Training „Platz · vorne links“ bzw. „Halle“, Heimtermin „Heim“, auswärts „Auswärts · bei …“ – die Adresse
      steht nur in der Auswärts-Kachel.
   c) Status: Trainer mit Namen, Training „Plan fehlt noch“, Spiel „Teams noch offen“.
   d) Tipp auf die Trainings-Kachel: Ansicht „sport“ mit genau zwei gleich großen Kacheln (Trainingsplan und – vor dem
      Trainingstag – „Wer kommt?“ mit dem Stand der Rückmeldungen, am Tag selbst „Anwesenheit eintragen“),
      Trainern und „Findet statt“; kein Bearbeiten, Eltern-Info, Kalender, Vertretung, Löschen. Link „Termin verwalten“.
   e) „Termin verwalten“: Bearbeiten, Eltern-Info, Rückmeldungen, Vertretung, Kalender, Fotos, Löschen – kein Trainingsplan;
      Link zurück „Zum Training“.
   f) Auswärtstermin: Adresse, Route und Spielplan in der Sport-Ansicht.
   g) Orga: „Neuer Termin“ oben, dieselbe Kachelbahn; ein Tipp öffnet „Termin verwalten“.
   i) Bereiche Training und Spieltag: dieselbe Kachelbahn, gefiltert („Nächste Trainings“ 3, „Nächste Spieltage“ 2);
      die Heimspiel-Karte steht nicht mehr in „Für dich“; Orga hat genau einen Weg zur ganzen Terminliste (Kachel „Termine“).
   j) Kein leerer Raum unter der Kachel: die Bahn ist so hoch wie die sichtbare Kachel (auch wenn eine spätere höher ist);
      Kacheln tragen einen Schatten, das Termin-Fenster erscheint mit der Bewegung „tmdEin“ (Charles 22.11.).
   k) 3D-Kacheln in beiden Apps: Lichtrand oben, Kante unten, tiefer Schatten; mit „Bewegung reduzieren“ ohne Bewegung.
   h) 360 px: kein Überlauf der Seite, Kacheln im Fenster ≥ 96 px hoch, im Fenster keine Schrift unter der Lesegröße der App (13 px, --s-text), Zähler zählt beim Wischen mit. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const termine = [
    { id: 1, datum: h.tagePlus(2), uhrzeit: "16:45", typ: "training", titel: "", ort: "Sportplatz 1, 51069 Köln", platz: "vorne links", trainer_status: { "Trainer 1": "ja", "Trainer 2": "ja" } },
    { id: 2, datum: h.tagePlus(5), uhrzeit: "16:45", typ: "training", titel: "", ort: "Sportplatz 1, 51069 Köln", platz: "Halle", trainer_status: {} },
    { id: 3, datum: h.tagePlus(6), uhrzeit: "11:30", typ: "turnier", titel: "Kinderfestival", heim: true, ort: "Sportplatz 1, 51069 Köln", trainer_status: {} },
    { id: 4, datum: h.tagePlus(14), uhrzeit: "10:00", typ: "turnier", titel: "Festival", gegner: "Verein X", heim: false, ort: "Musterstraße 1, 50000 Köln", trainer_status: { "Trainer 1": "ja" } },
    { id: 5, datum: h.tagePlus(20), uhrzeit: "17:00", typ: "event", titel: "Feier", trainer_status: {} },
    { id: 6, datum: h.tagePlus(25), uhrzeit: "16:45", typ: "training", titel: "", platz: "vorne links", trainer_status: {} }];
  const s = await h.starten({ breite: 360, hoehe: 780, warten: 1500,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, rueckmeldungen: [], trainingsplan: [], trainingsgruppen: [], nominierungen: [], anwesenheit: [], periodisierung: [], trainingsbloecke: [] }) });
  await h.sichtbarMachen(s.page, "#main-app");
  const r = await s.page.evaluate(async (termine) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const txt = e => e ? e.textContent.replace(/\s+/g, " ").trim() : "";
    await loadKader(); go("home"); await w(2200);
    const out = {};
    const bahn = document.querySelector("#home-termine .tk-bahn");
    const k = bahn ? [...bahn.querySelectorAll(".termin-kachel")] : [];
    out.a = { kacheln: k.length, baender: k.filter(x => x.querySelector(".tk-band")).length, knoepfe: k.reduce((n, x) => n + x.querySelectorAll("button").length, 0),
      terminKnopf: !!document.querySelector('#home-woche [onclick*="homeTerminNeu"]'), liste: [...document.querySelectorAll("#home-woche .woche-zeile")].length,
      ueber: document.documentElement.scrollWidth - innerWidth };
    out.b = k.map(x => txt(x.querySelector(".tk-titel")));
    out.adresse = k.map(x => /Musterstraße|Sportplatz 1/.test(x.textContent));
    out.c = k.map(x => [...x.querySelectorAll(".tk-status")].map(txt));
    await w(500);
    out.j = { bahn: Math.round(bahn.getBoundingClientRect().height), erste: Math.round(k[0].getBoundingClientRect().height), hoechste: Math.max(...k.map(x => Math.round(x.getBoundingClientRect().height))),
      schatten: getComputedStyle(k[0]).boxShadow !== "none" };
    out.pos1 = txt(document.querySelector("#home-termine .tk-pos"));
    if (bahn) { bahn.scrollLeft = bahn.scrollWidth; await w(250); }
    out.pos2 = txt(document.querySelector("#home-termine .tk-pos"));
    TM_TERMINE = termine;
    const fenster = async (fn) => { await fn(); await w(500); const m = document.getElementById("tmd-modal"); if (!m) return null;
      const ka = [...m.querySelectorAll(".tmd-kachel")];
      const schrift = [...m.querySelectorAll(".tmd-karte *")].filter(e => !e.closest(".tk-band") && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && e.getClientRects().length).map(e => parseFloat(getComputedStyle(e).fontSize));
      return { modus: (m.querySelector(".tmd-karte") || {}).dataset.modus, kacheln: ka.map(x => txt(x.querySelector("span"))), h: ka.map(x => Math.round(x.getBoundingClientRect().height)), b: ka.map(x => Math.round(x.getBoundingClientRect().width)),
        text: txt(m), wechsel: txt(document.getElementById("tmd-wechsel")), haupt: m.querySelectorAll(".btn-p").length, minSchrift: Math.min(...schrift) }; };
    out.d = await fenster(async () => k[0].click());
    out.j.bewegung = getComputedStyle(document.getElementById("tmd-inhalt")).animationName;
    out.e = await fenster(async () => document.getElementById("tmd-wechsel").click());
    out.eZurueck = await fenster(async () => document.getElementById("tmd-wechsel").click());
    out.f = await fenster(async () => tmDetailOpen(4));
    document.getElementById("tmd-modal")?.remove();
    go("ue-orga"); await w(2200);
    const ok = [...document.querySelectorAll("#orga-termine .termin-kachel")];
    out.g = { neu: !!document.getElementById("orga-termin-neu"), kacheln: ok.length };
    if (ok[0]) { ok[0].click(); await w(500); out.g.modus = (document.querySelector("#tmd-modal .tmd-karte") || { dataset: {} }).dataset.modus; }
    document.getElementById("tmd-modal")?.remove();
    out.k3 = (() => { const b = document.querySelector("#view-ue-orga .k-raster > button"); return b ? getComputedStyle(b).boxShadow : ""; })();
    out.i = { orgaKachelTermine: [...document.querySelectorAll("#view-ue-orga button")].filter(b => /go\('termine'\)|kachelRun\('go','termine'\)/.test(b.getAttribute("onclick") || "")).length !== 1 };
    go("ue-training"); await w(2000);
    out.i.training = [...document.querySelectorAll("#training-termine .termin-kachel")].map(x => txt(x.querySelector(".tk-titel")));
    out.i.trTitel = txt(document.querySelector("#training-termine section > div > div"));
    go("ue-spieltag"); await w(2000);
    out.i.spieltag = [...document.querySelectorAll("#spieltag-termine .termin-kachel")].map(x => txt(x.querySelector(".tk-titel")));
    out.i.heimKarte = !!document.getElementById("home-heimspiel-karte");
    return out;
  }, termine).catch(e => ({ fehler: String(e) }));
  const f = s.fehler(); await s.schliessen();
  if (r.fehler) return h.ergebnis("v937 Termin-Kacheln", false, [r.fehler]);
  if (r.a.kacheln !== 5 || r.a.baender !== 5) probleme.push(`a) ${r.a.kacheln} Kacheln, ${r.a.baender} Bänder (erwartet 5)`);
  if (r.a.knoepfe) probleme.push(`a) ${r.a.knoepfe} Knöpfe in den Kacheln`);
  if (r.a.terminKnopf) probleme.push("a) „Termin“-Knopf steht noch auf der Startseite");
  if (r.a.liste !== 3) probleme.push(`a) Liste der Woche zeigt ${r.a.liste} Zeilen statt 3`);
  if (r.a.ueber > 0) probleme.push(`h) Seite läuft ${r.a.ueber} px über`);
  if (!/Platz · vorne links/.test(r.b[0]) || !/Halle/.test(r.b[1]) || /Platz ·/.test(r.b[1]) || !/Heim/.test(r.b[2]) || !/Auswärts · bei Verein X/.test(r.b[3])) probleme.push(`b) Ort: ${JSON.stringify(r.b)}`);
  if (r.adresse.join() !== "false,false,false,true,false") probleme.push(`b) Adresse in den Kacheln: ${r.adresse.join()}`);
  if (!/Trainer 1 ✓ · Trainer 2 ✓/.test(r.c[0][0]) || !/Plan fehlt noch/.test(r.c[0][1]) || !/Noch kein Trainer zugesagt/.test(r.c[1][0]) || !/Teams noch offen/.test(r.c[2][1])) probleme.push(`c) Status: ${JSON.stringify(r.c.slice(0, 3))}`);
  if (!/^1 von 5/.test(r.pos1) || !/^5 von 5/.test(r.pos2)) probleme.push(`h) Zähler: „${r.pos1}“ → „${r.pos2}“`);
  if (r.j.bahn > r.j.erste + 30 || !(r.j.hoechste > r.j.erste)) probleme.push(`j) Bahn ${r.j.bahn} px, erste Kachel ${r.j.erste} px, höchste ${r.j.hoechste} px`);
  if (!r.j.schatten || r.j.bewegung !== "tmdEin") probleme.push(`j) Schatten ${r.j.schatten}, Bewegung „${r.j.bewegung}“`);
  const d = r.d, e = r.e;
  if (!d || d.modus !== "sport" || d.kacheln.join() !== "Trainingsplan,Wer kommt?") probleme.push(`d) Sport-Ansicht: ${JSON.stringify(d && [d.modus, d.kacheln])}`);
  else {
    if (Math.abs(d.h[0] - d.h[1]) > 1 || Math.abs(d.b[0] - d.b[1]) > 1 || d.h[0] < 96) probleme.push(`d) Kacheln ungleich oder zu klein: ${d.b.join("/")} × ${d.h.join("/")}`);
    if (/Bearbeiten|Eltern-Info|Kalender|Vertretung|Termin löschen|Ansage/.test(d.text)) probleme.push("d) Orga-Themen in der Sport-Ansicht");
    if (!/Welche Trainer sind dabei\?/.test(d.text) || !/Findet statt/.test(d.text)) probleme.push("d) Trainer oder „Findet statt“ fehlen");
    if (!/Termin verwalten/.test(d.wechsel)) probleme.push(`d) Link: „${d.wechsel}“`);
    if (d.haupt > 1) probleme.push(`d) ${d.haupt} Hauptaktionen`);
    if (d.minSchrift < 13) probleme.push(`h) Schrift ${d.minSchrift} px in der Sport-Ansicht`);
  }
  if (!e || e.modus !== "orga" || !["Bearbeiten", "Eltern-Info", "Rückmeldungen", "Vertretung", "Kalender", "Fotos"].every(x => e.kacheln.includes(x))) probleme.push(`e) Verwalten: ${JSON.stringify(e && [e.modus, e.kacheln])}`);
  else {
    if (e.kacheln.includes("Trainingsplan") || !/Termin löschen/.test(e.text) || !/Zum Training/.test(e.wechsel)) probleme.push(`e) Inhalt: Link „${e.wechsel}“`);
    if (e.h.some(x => x < 96)) probleme.push(`h) Kachel unter 96 px: ${e.h.join("/")}`);
    if (e.minSchrift < 13) probleme.push(`h) Schrift ${e.minSchrift} px in „Termin verwalten“`);
  }
  if (!r.eZurueck || r.eZurueck.modus !== "sport") probleme.push("e) Link zurück führt nicht in die Sport-Ansicht");
  if (!r.f || !/Musterstraße 1/.test(r.f.text) || !r.f.kacheln.includes("Route") || !r.f.kacheln.includes("Spielplan") || !r.f.kacheln.includes("Zum Spieltag")) probleme.push(`f) Auswärts: ${JSON.stringify(r.f && r.f.kacheln)}`);
  if (!r.g.neu || r.g.kacheln !== 5 || r.g.modus !== "orga") probleme.push(`g) Orga: ${JSON.stringify(r.g)}`);
  if (r.i.training.length !== 3 || !r.i.training.every(x => /Training/.test(x)) || !/Nächste Trainings/.test(r.i.trTitel)) probleme.push(`i) Training: „${r.i.trTitel}“ ${JSON.stringify(r.i.training)}`);
  if (r.i.spieltag.length !== 2 || r.i.spieltag.some(x => /Training|Feier/.test(x))) probleme.push(`i) Spieltag: ${JSON.stringify(r.i.spieltag)}`);
  if (r.i.heimKarte) probleme.push("i) Heimspiel-Karte steht noch in „Für dich“");
  if (r.i.orgaKachelTermine) probleme.push("i) Orga: genau ein Weg zur ganzen Terminliste erwartet");
  /* k) 3D-Kacheln in beiden Apps (Charles 22.11.): Lichtrand und Kante als inset-Schatten, in styles.css auch für die Eltern-Kacheln. */
  const css = require("fs").readFileSync(require("path").join(h.REPO, "styles.css"), "utf8");
  if (!/inset/.test(r.k3) || !/\.el-gitter>\.btn\.btn-zeile,#termin-card\{\s*box-shadow:inset/.test(css) || !/prefers-reduced-motion:reduce\)\{\s*\.termin-kachel/.test(css)) probleme.push(`k) 3D-Kacheln: Orga-Kachel „${r.k3.slice(0, 60)}“ oder Eltern-Regel/Bewegungs-Ausnahme fehlt`);
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  zeilen.push(`a) ${r.a.kacheln} Kacheln, Liste ${r.a.liste} Zeilen · b) ${r.b.slice(0, 4).join(" | ")}`);
  zeilen.push(`d) ${d && d.kacheln.join(" + ")} je ${d && d.b[0]}×${d && d.h[0]} px · e) ${e && e.kacheln.length} Kacheln in „Termin verwalten“ · g) Orga mit „Neuer Termin“ · h) ${r.pos1} → ${r.pos2}`);
  return h.ergebnis("v937 Termin-Kacheln zum Wischen, Sport- und Orga-Ansicht getrennt", !probleme.length, zeilen.concat(probleme));
};
