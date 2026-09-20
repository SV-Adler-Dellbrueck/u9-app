/* v585 – Der Abgleich wartet, zieht nach und lässt Bearbeitetes in Ruhe.

   Auslöser am 19.09.: Die Lehrgangsübung bekam in v584 vier Bilder statt zwei – und die
   App zeigte weiter zwei. Nicht der Cache: die Datenbank. `_euAnlegen` legte nur an, was
   namentlich fehlte; eine geänderte Bibliotheks-Übung kam auf keinem Gerät je an. Beim
   Nachsehen in der Datenbank fielen zwei weitere Dinge auf:
     · 52 Import-Zeilen für 28 Übungen. Der Abgleich lief beim Start los, bevor
       `loadCustomForms()` geantwortet hatte – die Liste war leer, alles sah „neu" aus.
       Zweimal (14.09. 21:08, 15.09. 12:00) entstanden so je 24 Dubletten.
     · `trainingsformen` fehlte in der Sicherung.

   Was hier geprüft wird:
   a) WARTEN. Solange die Datenbank nicht geantwortet hat, schreibt der Abgleich nichts –
      auch wenn die Liste leer ist und alles neu aussähe. Ist die Antwort ausgeblieben
      (CUSTOM_FORMS_OK=false), tut er gar nichts.
   b) NACHZIEHEN. Eine Import-Zeile, deren Inhalt von der Bibliothek abweicht, wird per
      PATCH nachgezogen – alle Kopien eines Namens in EINEM Aufruf (id=in.(…)), damit die
      Dubletten nicht auseinanderlaufen. Name und Kennzeichen bleiben unangetastet.
   c) BELASSEN. „Import (bearbeitet)" und „Eigene Übung" werden nie angefasst, auch wenn
      sie vom Repo abweichen – die Hilfe-Zusage von v512 gilt weiter.
   d) DER EDITOR KENNZEICHNET. Wer an einer Bibliotheks-Übung eine Skizze zeichnet, macht
      sie zu seiner: der PATCH des Editors stellt `tags` auf „Import (bearbeitet)" um.
   e) DUBLETTEN WERDEN NICHT GEZEIGT – UND NICHT GELÖSCHT. Je Name nur die jüngste Kopie
      in Liste und Auswahl; der Index der gezeigten Karte bleibt ihr echter Index, denn
      Pläne und Bewertungen merken sich Übungen als Index.
   f) SICHERUNG. `trainingsformen` steht in der Tabellenliste von backupExport.
   g) Ein zweiter Lauf mit gleichem Stand tut nichts; die Attrappe wendet PATCHes an, damit
      „nichts mehr zu tun" wirklich gemessen wird und nicht nur behauptet. */
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const RAUTE = "Raute mit Torwart – Angriff über den anderen Flügel";
  const DREIECK = "3 gegen 3 – Dreieck (Grundform)";
  const PASSTOR = "Passtor im Quadrat";
  const WARMUP = "Warm up Adler";
  const ADLER1 = "Adler 1 – Aktivierung";

  // Zeilen so, wie der Abgleich sie geschrieben hätte – dieselbe Formung wie _euForm.
  const zeile = (u, id) => ({
    id, name: u.name, kat: u.kat || "technik", ablauf: u.ablauf || "", varianten: u.varianten || "",
    coaching: u.coaching || "", spieler: u.spieler || "", feld: u.feld || "", dauer: u.dauer != null ? String(u.dauer) : "",
    spass: 5, diff: [1, 2, 3].includes(u.diff) ? u.diff : 2, custom: true, focus: false, tags: "Import",
    kurz: String(u.kurz || u.ablauf || "").slice(0, 80), skizze: u.skizze || null, created_at: "2026-09-15T12:00:00Z"
  });
  const rows = bib.uebungen.map((u, k) => zeile(u, 100 + k));
  const finde = n => rows.find(r => r.name === n);
  // b) Raute mit dem alten Stand (ein Schritt ohne s) – muss nachgezogen werden
  const raute = finde(RAUTE); const sp = raute.skizze;
  raute.skizze = Object.assign({}, sp, { b: [[98, 243]], schritte: [{ b: [[82, 243]], p: sp.schritte[1].p, tx: [[90, 276, "Phase 2"]] }] });
  // b) Dreieck zweimal, beide veraltet (ohne Linien) – EIN PATCH mit beiden ids
  const dreieck = finde(DREIECK); const dreieckAlt = Object.assign({}, dreieck.skizze); delete dreieckAlt.li;
  dreieck.skizze = dreieckAlt;
  rows.push(Object.assign({}, dreieck, { id: 27, created_at: "2026-09-14T21:08:00Z" }));
  // c) Passtor vom Trainer bearbeitet – weicht ab, bleibt aber
  const passtor = finde(PASSTOR); passtor.tags = "Import (bearbeitet)"; passtor.skizze = { s: [[50, 50, "g", "X"]] };
  // e) dazu eine ältere, unbearbeitete Passtor-Kopie: die bearbeitete des Trainers gewinnt, egal wie alt
  rows.push(Object.assign({}, zeile(bib.uebungen.find(u => u.name === PASSTOR), 8), { created_at: "2026-09-10T12:47:00Z" }));
  // c) eine eigene Übung, die zufällig so heißt wie eine der Bibliothek
  rows.push({ id: 5, name: ADLER1, kat: "technik", ablauf: "meine", tags: "Eigene Übung", custom: true, focus: false, skizze: null, kurz: "meine" });
  // e) Warm up doppelt, ältere Kopie mit kleinerer id
  rows.push(Object.assign({}, finde(WARMUP), { id: 7, created_at: "2026-09-10T12:47:00Z" }));

  const posts = [], patches = [];
  const tabellen = {
    kader: h.kaderZeilen(), termine: [], nominierungen: [], anwesenheit: [],
    trainingsformen: (u, req) => {
      if (req.method() === "POST") { posts.push(JSON.parse(req.postData() || "{}")); return { status: 201, body: "[]" }; }
      if (req.method() === "PATCH") {
        const body = JSON.parse(req.postData() || "{}");
        const ids = ((u.searchParams.get("id") || "").match(/^in\.\((.*)\)$/) || [, ""])[1].split(",").map(Number).filter(Boolean);
        const eins = ((u.searchParams.get("id") || "").match(/^eq\.(\d+)$/) || [])[1];
        if (eins) ids.push(Number(eins));
        patches.push({ ids, tags: u.searchParams.get("tags"), body });
        rows.forEach(r => { if (ids.includes(r.id) && (!u.searchParams.get("tags") || r.tags === "Import")) Object.assign(r, body); });
        return { status: 204, body: "" };
      }
      return rows;
    },
    trainingsplan: []
  };
  const s = await h.starten({ supabase: h.supabaseAttrappe(tabellen), bibliothek: true, angemeldet: true, hoehe: 1200 });

  const r = await s.page.evaluate(async ({ RAUTE, DREIECK, PASSTOR, WARMUP, ADLER1 }) => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const out = { fehlt: [] };
    for (const n of ["bibliothekAbgleich", "customFormsGeladen", "tfDublette", "tpFilteredOpts", "_euNachziehen", "uebungSkizzeNachtragen"])
      if (typeof window[n] !== "function") out.fehlt.push(n);
    if (out.fehlt.length) return out;

    // Der Anstoß beim Start läuft womöglich noch – erst ausklingen lassen.
    for (let i = 0; i < 100 && (typeof _bibLaeuft !== "undefined" && _bibLaeuft); i++) await warte(50);
    await customFormsGeladen();
    out.startOk = !!CUSTOM_FORMS_OK;
    out.startZeilen = CUSTOM_FORMS.length;

    /* a) Warten: Liste leer und Antwort ausstehend – nichts darf passieren, bis freigegeben. */
    try { localStorage.removeItem("adler-bibliothek-stand"); } catch (e) {}
    const gesichert = CUSTOM_FORMS;
    let frei; _customFormsLaden = new Promise(res => { frei = res; });
    CUSTOM_FORMS = []; CUSTOM_FORMS_OK = false;
    const lauf = bibliothekAbgleich();
    await warte(400);
    out.waehrendWarten = { laeuft: !!_bibLaeuft };
    CUSTOM_FORMS = gesichert; CUSTOM_FORMS_OK = true; frei();
    out.nachWarten = await lauf;

    /* a2) Antwort ausgeblieben: gar nichts tun – der Stand ist frisch gelöscht, es GÄBE also
       etwas zu tun, und trotzdem darf nichts passieren. */
    try { localStorage.removeItem("adler-bibliothek-stand"); } catch (e) {}
    CUSTOM_FORMS_OK = false;
    out.ohneAntwort = await bibliothekAbgleich();
    CUSTOM_FORMS_OK = true;

    /* g) Jetzt mit Antwort: der Lauf arbeitet (neuer Stand), findet aber nichts mehr zu tun,
       weil die Attrappe die Nachzüge angewendet hat – und merkt sich den Stand. Der Lauf
       danach hat denselben Stand und tut gar nichts. */
    out.nachAntwort = await bibliothekAbgleich();
    out.zweiter = await bibliothekAbgleich();

    /* e) Dubletten */
    const alle = tpAllForms();
    const idxWarm = alle.map((f, i) => (f && f.name === WARMUP) ? i : -1).filter(i => i >= 0);
    out.warm = idxWarm.map(i => ({ i, id: alle[i].id, dublette: tfDublette(i) }));
    out.warmInAuswahl = tpFilteredOpts("warmup").filter(x => x.f.name === WARMUP).map(x => ({ i: x.i, id: x.f.id }));
    out.eigeneNichtDublette = alle.map((f, i) => (f && f.name === ADLER1 && f.tags === "Eigene Übung") ? tfDublette(i) : null).filter(v => v !== null);
    out.passtor = alle.map((f, i) => (f && f.name === PASSTOR) ? { id: f.id, tags: f.tags, dublette: tfDublette(i) } : null).filter(Boolean);

    /* d) Der Editor kennzeichnet */
    const idxAdler = alle.findIndex(f => f && f.name === ADLER1 && f.tags === "Import");
    window.skzEditorOpen = (spec, cb) => { cb({ s: [[20, 20, "g", "A"]] }); };
    window.tpShowExercise = () => {};
    try { await uebungSkizzeNachtragen(idxAdler); } catch (e) { out.editorFehler = String(e && e.message || e); }
    await warte(150);
    out.editorTags = alle[idxAdler].tags;
    return out;
  }, { RAUTE, DREIECK, PASSTOR, WARMUP, ADLER1 });

  const fehler = s.fehler();
  await s.schliessen();
  if (r.fehlt.length) return h.ergebnis("Bibliothek: Abgleich zieht nach", false, [r.fehlt.join(", ") + " fehlt"]);

  const idRaute = 100 + bib.uebungen.findIndex(u => u.name === RAUTE);
  const idDreieck = 100 + bib.uebungen.findIndex(u => u.name === DREIECK);
  const idPasstor = 100 + bib.uebungen.findIndex(u => u.name === PASSTOR);
  const patchesAbgleich = patches.filter(p => p.tags === "eq.Import");
  const patchesEditor = patches.filter(p => p.tags !== "eq.Import");

  // Start + a)
  if (!r.startOk) probleme.push("Nach dem Start steht CUSTOM_FORMS_OK nicht – dann liefe der Abgleich nie");
  if (posts.length) probleme.push(`${posts.length} Übung(en) neu angelegt, obwohl alle 28 schon da waren: ${posts.map(p => p.name).join(", ")}`);
  if (!r.waehrendWarten.laeuft) probleme.push("Während die Datenbank noch nicht geantwortet hatte, war der Abgleich schon fertig – er hat nicht gewartet");
  if (r.ohneAntwort !== null) probleme.push("Ohne Antwort der Datenbank hat der Abgleich trotzdem gearbeitet");
  // b)
  const pRaute = patchesAbgleich.find(p => p.ids.includes(idRaute));
  if (!pRaute) probleme.push("Die veraltete Raute wurde nicht nachgezogen (kein PATCH auf ihre id)");
  else {
    const sk = pRaute.body.skizze || {};
    /* v588: so viele Schritte, wie die Bibliothek der Raute gerade gibt (v584 drei, v588 fünf) – nicht eine feste Zahl. */
    const sollSchritte = ((bib.uebungen.find(u => u.name === RAUTE) || {}).skizze || {}).schritte.length;
    if (!Array.isArray(sk.schritte) || sk.schritte.length !== sollSchritte) probleme.push(`Der PATCH der Raute trägt ${(sk.schritte || []).length} Schritte statt ${sollSchritte}`);
    if ("name" in pRaute.body || "tags" in pRaute.body || "custom" in pRaute.body) probleme.push("Der PATCH schreibt Name oder Kennzeichen mit – die gehören dem Trainer");
    if (!("ablauf" in pRaute.body && "kurz" in pRaute.body && "diff" in pRaute.body)) probleme.push("Der PATCH zieht nur die Skizze nach, nicht die übrigen Felder");
  }
  const pDreieck = patchesAbgleich.find(p => p.ids.includes(idDreieck));
  if (!pDreieck) probleme.push("Die beiden veralteten Dreieck-Kopien wurden nicht nachgezogen");
  else if (!(pDreieck.ids.includes(27) && pDreieck.ids.length === 2)) probleme.push(`Der Dreieck-PATCH trifft die ids ${pDreieck.ids.join(",")} statt beide Kopien (${idDreieck}, 27) in einem Aufruf`);
  const unerwartet = patchesAbgleich.filter(p => !p.ids.includes(idRaute) && !p.ids.includes(idDreieck));
  if (unerwartet.length) probleme.push(`Unerwartete Nachzüge auf ids ${unerwartet.map(p => p.ids.join("/")).join(", ")} – unveränderte Übungen dürfen nicht angefasst werden`);
  // c)
  if (patchesAbgleich.some(p => p.ids.includes(idPasstor))) probleme.push("„Import (bearbeitet)“ wurde überschrieben – die Zusage aus v512 ist gebrochen");
  if (patchesAbgleich.some(p => p.ids.includes(5))) probleme.push("Eine eigene Übung gleichen Namens wurde vom Abgleich angefasst");
  if (patchesAbgleich.some(p => p.ids.includes(8))) probleme.push("Die unveränderte Passtor-Kopie wurde nachgezogen, obwohl sie der Bibliothek gleicht");
  // g)
  if (!r.nachAntwort) probleme.push("Mit Antwort und neuem Stand hat der Abgleich nicht gearbeitet");
  else if ((r.nachAntwort.angelegt || 0) || (r.nachAntwort.aktualisiert || 0))
    probleme.push(`Nach angewendeten Nachzügen findet der Abgleich noch Arbeit: ${r.nachAntwort.angelegt} neu, ${r.nachAntwort.aktualisiert} aktualisiert – der kanonische Vergleich greift nicht`);
  if (r.zweiter !== null) probleme.push("Der zweite Lauf mit gleichem Stand hat gearbeitet");
  if (r.nachWarten && (r.nachWarten.aktualisiert || 0) !== 0 && r.nachWarten.aktualisiert !== 3)
    probleme.push(`Der freigegebene Lauf meldet ${r.nachWarten.aktualisiert} aktualisierte Kopien (erwartet 0, weil der Start schon nachgezogen hatte, oder 3)`);
  // e)
  if (r.warm.length !== 2) probleme.push(`Warm up Adler steht ${r.warm.length}× in tpAllForms statt zweimal`);
  else {
    const alt = r.warm.find(w => w.id === 7), neu = r.warm.find(w => w.id !== 7);
    if (!alt || !alt.dublette) probleme.push("Die ältere Warm-up-Kopie (id 7) gilt nicht als Dublette");
    if (!neu || neu.dublette) probleme.push("Die jüngste Warm-up-Kopie gilt als Dublette – dann verschwände die Übung ganz");
    if (r.warmInAuswahl.length !== 1) probleme.push(`Die Aufwärm-Auswahl zeigt Warm up Adler ${r.warmInAuswahl.length}× statt einmal`);
    else if (neu && r.warmInAuswahl[0].i !== neu.i) probleme.push("Die Auswahl zeigt eine andere Kopie als die jüngste – oder unter falschem Index");
  }
  if (r.eigeneNichtDublette.some(v => v)) probleme.push("Eine eigene Übung gilt als Dublette einer Bibliotheks-Übung gleichen Namens");
  const pBearb = (r.passtor || []).find(x => x.tags === "Import (bearbeitet)"), pAlt = (r.passtor || []).find(x => x.id === 8);
  if (!pBearb || pBearb.dublette) probleme.push("Die vom Trainer bearbeitete Passtor-Kopie wird versteckt – seine Arbeit verschwände aus der Liste");
  if (!pAlt || !pAlt.dublette) probleme.push("Die unbearbeitete Passtor-Kopie steht neben der bearbeiteten – die Liste zeigt die Übung doppelt");
  // d)
  if (r.editorFehler) probleme.push("Editor-Speichern warf: " + r.editorFehler);
  const pe = patchesEditor[patchesEditor.length - 1];
  if (!pe) probleme.push("Der Editor hat keinen PATCH geschickt");
  else {
    if (pe.body.tags !== "Import (bearbeitet)") probleme.push(`Der Editor kennzeichnet die Übung nicht: tags=${JSON.stringify(pe.body.tags)}`);
    if (!pe.body.skizze) probleme.push("Der Editor-PATCH trägt keine Skizze");
  }
  if (r.editorTags !== "Import (bearbeitet)") probleme.push(`Nach dem Speichern trägt die Übung lokal „${r.editorTags}“ – der nächste Abgleich in derselben Sitzung überschriebe sie`);
  // f)
  const views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  const tabellenText = (views.match(/async function backupExport\(\)[\s\S]*?const tables=\[([\s\S]*?)\];/) || [])[1] || "";
  if (!/"trainingsformen"/.test(tabellenText)) probleme.push("trainingsformen fehlt in der Tabellenliste von backupExport");
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);

  if (!probleme.length) {
    zeilen.push(`Start: ${r.startZeilen} Zeilen geladen, ${posts.length} neu angelegt, ${patchesAbgleich.length} Nachzüge (Raute: 1 Kopie, Dreieck: 2 Kopien in einem PATCH)`);
    zeilen.push("Wartet, bis die Datenbank geantwortet hat; ohne Antwort tut er nichts; zweiter Lauf mit gleichem Stand tut nichts");
    zeilen.push("„Import (bearbeitet)“ und „Eigene Übung“ bleiben unangetastet · der Editor stellt beim Zeichnen auf „Import (bearbeitet)“ um");
    zeilen.push(`Dubletten: Warm up Adler einmal in der Auswahl (id ${r.warmInAuswahl[0] && r.warmInAuswahl[0].id}), die ältere Kopie bleibt in der Datenbank · bei Passtor gewinnt die bearbeitete Kopie`);
    zeilen.push("trainingsformen steht in der Sicherung");
  }
  return h.ergebnis("Bibliothek: Abgleich zieht nach", !probleme.length, zeilen.concat(probleme));
};
