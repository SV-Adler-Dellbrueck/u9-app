/* v526 – Auftragspaket „Tagebuch" (doku/auftrag-tagebuch/Auftragspaket_Tagebuch.md).
   Aus einer vorhandenen Nachbereitung wird ein vorausgefüllter Tagebucheintrag; die
   Erkenntnis bleibt Handarbeit.

   Geprüft werden die Zusagen des Pakets, nicht die Optik:
   a) Das Modul lebt (MODUL_WACHE greift).
   b) Vorbefüllung aus einer Einheit: Auslöser und Beobachtung stehen, Aha ist leer.
   c) Pflichtfelder: Speichern ohne Aha schickt NICHTS an Supabase, der Text bleibt stehen.
   d) Alias: Rang über die Kader-IDs, stabil über zwei Aufrufe.
   e) Namensprüfung: ein Kader-Name im Text setzt den Hinweis, ein Text ohne nicht.
   f) Export: alle sechs Feldnamen in der festgelegten Reihenfolge, Umlaute und
      typografische Anführungszeichen unverfälscht.
   g) Knopfhöhen am gerenderten DOM: Hauptaktion 56, übrige Bedienelemente mindestens 48
      (Listenzeilen-Knöpfe 36 laut cockpit-ui ausgenommen).

   Die RLS-Gegenprobe (Abnahme 9) steht NICHT hier: in dieser Prüfung ist Supabase eine
   Attrappe, die jede Regel bestätigen würde, die man ihr vorgibt. Sie ist direkt auf der
   Datenbank gefahren und in der PR belegt. */
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const gestern = h.tagePlus(-1);

  const s = await h.starten({ supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    profiles: [{ name: "Charles", rolle: "trainer" }],
    einheit_bewertung: [{ datum: gestern, spass: 4, umsetzung: 3, erfolg: 5,
                          notiz: "Die Gruppe war nach dem Regen schwer zu bändigen." }],
    trainingsplan: [{ datum: gestern, kopf: { schwerpunkt: "Anspielbar werden",
                                              beobachtung: "Viele Bälle gingen ins Leere." } }],
    tagebuch_eintrag: []
  }), hoehe: 2000 });

  const r = await s.page.evaluate(async ({ gestern }) => {
    window.trainerMe = async () => "Charles";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    const out = {};

    // a) Modul da?
    out.modulDa = typeof tagebuchModulDa === "function";
    if (!out.modulDa) return out;
    await loadKader();

    // d) Alias – zweimal aufgerufen, muss gleich bleiben
    out.alias1 = KADER.slice(0, 3).map(k => tbAlias(k.name));
    out.alias2 = KADER.slice(0, 3).map(k => tbAlias(k.name));
    /* Der Rang zählt über ALLE Zeilen, auch inaktive: sonst rutschen die Buchstaben,
       sobald ein Kind ausscheidet, und ein alter Eintrag meint ein anderes Kind. */
    out.aliasVonId = KADER.slice().sort((a, b) => a.id - b.id).slice(0, 2).map(k => tbAlias(k.name));

    // e) Namensprüfung
    out.fundMitName  = tbNamensfund("Heute war " + KADER[0].name.split(" ")[0] + " stark am Ball");
    out.fundOhneName = tbNamensfund("Heute war die Gruppe stark am Ball");

    // b) Vorbefüllung aus der Einheit
    await tagebuchAusEinheit(gestern);
    for (let i = 0; i < 40 && !document.getElementById("tb-card"); i++) await new Promise(r => setTimeout(r, 50));
    const card = document.getElementById("tb-card");
    if (!card) { out.fensterFehlt = true; return out; }
    out.ausloeser   = (document.getElementById("tb-ausloeser") || {}).value || "";
    out.beobachtung = (document.getElementById("tb-beobachtung") || {}).value || "";
    out.aha         = (document.getElementById("tb-aha") || {}).value || "";

    // g) Knopfhöhen
    const h = el => Math.round(parseFloat(getComputedStyle(el).minHeight) || 0);
    const knoepfe = [...card.querySelectorAll("button")];
    out.haupt  = knoepfe.filter(b => /Eintrag erfassen/.test(b.textContent || "")).map(h);
    /* Die Kind-Chips sind Listenzeilen-Knöpfe (36 px laut cockpit-ui) – sie stehen dicht
       an dicht in einer Leiste und sind nie die einzige Aktion des Bildschirms. */
    out.klein  = knoepfe.filter(b => /^tbKindEinfuegen/.test(b.getAttribute("onclick") || "")).map(h);
    /* Der ×-Knopf aus mdlHead (core.js) ist gemeinsames Beiwerk JEDES Dialogs der App –
       ein transparenter Icon-Knopf, den die CLAUDE.md ausdruecklich von der Hoehenregel
       ausnimmt. Ihn hier auf 48 zu ziehen hiesse, ihn ueberall zu aendern. */
    out.normal = knoepfe.filter(b => !/Eintrag erfassen/.test(b.textContent || "")
                                  && !/^tbKindEinfuegen/.test(b.getAttribute("onclick") || "")
                                  && b.getAttribute("aria-label") !== "Schließen").map(h);
    out.felder = [...card.querySelectorAll("textarea,input")].map(h);

    // Aliasleiste: Antippen schreibt den Decknamen, nicht den Namen
    const chip = knoepfe.find(b => /^tbKindEinfuegen/.test(b.getAttribute("onclick") || ""));
    document.getElementById("tb-aha").focus();
    tbFokus("aha");
    if (chip) chip.click();
    out.nachChip = (document.getElementById("tb-aha") || {}).value || "";
    out.chipName = chip ? chip.textContent.trim() : "";
    out.chipAlias = chip ? tbAlias(out.chipName) : "";

    /* Die Attrappe nennt ihre Kinder „Kind A" bis „Kind O" (CLAUDE.md: keine echten Namen
       im Repo) – dort fallen Name und Deckname zusammen, der Beweis „schreibt NICHT den
       Namen" ginge also ins Leere. Deshalb eine erfundene Zeile mit hoher ID: hoch, damit
       die Raenge der anderen sich nicht verschieben. */
    const ERFUNDEN = "Zacharias Beispielmann";
    KADER.push({ id: 999999, name: ERFUNDEN, aktiv: true });
    out.aliasErfunden = tbAlias(ERFUNDEN);
    document.getElementById("tb-aha").value = "";
    tbFokus("aha");
    tbKindEinfuegen(ERFUNDEN);
    out.nachErfunden = (document.getElementById("tb-aha") || {}).value || "";
    out.fundErfunden = tbNamensfund("Heute war Zacharias auffaellig");
    KADER.pop();

    // c) Pflichtfelder: erst Aha leeren, dann speichern
    document.getElementById("tb-aha").value = "";
    document.getElementById("tb-konsequenz").value = "Nächstes Mal kleinere Gruppen";
    await tagebuchSpeichern();
    await new Promise(r => setTimeout(r, 200));
    out.nachAblehnung = (document.getElementById("tb-konsequenz") || {}).value || "";
    out.meldung = (document.getElementById("tb-meldung") || {}).textContent || "";
    return out;
  }, { gestern });

  await s.page.waitForTimeout(200);
  const gesendet = s.gesendet.filter(g => /tagebuch_eintrag/.test(g.pfad || ""));

  // f) Export – reine Textfunktion, ohne DOM
  const md = await s.page.evaluate(() => {
    /* _TB_LISTE ist ein let-Binding auf oberster Ebene – das steht NICHT auf window.
       Eine Zuweisung an window._TB_LISTE legte nur eine zweite, unbenutzte Variable an.
       Also das vorhandene Array befüllen. */
    _TB_LISTE.length = 0;
    _TB_LISTE.push({ id: 1, datum: "2026-09-18", baustein: "spiel_spieler",
      ausloeser: "Training U9 I, Leitfrage „Wie kriege ich den Ball zu einem, der frei ist?“",
      beobachtung: "Drei Kinder standen dauerhaft im Rücken des Gegners.",
      aha: "Anspielbar heißt Blickfeld, nicht Laufweg.", konsequenz: "Erst den Kopf, dann den Fuß üben",
      konsequenz_bis: "2026-09-25", beleg: "Foto vom Feld", anschluss: "Übung „Drei Tore“" });
    return tagebuchExport(1);
  });

  const fehler = s.fehler(); await s.schliessen();

  if (!r.modulDa) { probleme.push("tagebuchModulDa fehlt – das Modul wurde nicht geladen"); return h.ergebnis("Tagebuch", false, probleme); }
  if (r.fensterFehlt) { probleme.push("tagebuchAusEinheit öffnet kein Fenster"); return h.ergebnis("Tagebuch", false, probleme); }

  // b) Vorbefüllung
  if (!/Anspielbar werden/.test(r.ausloeser)) probleme.push(`Auslöser ohne Schwerpunkt des Tages: ${JSON.stringify(r.ausloeser)}`);
  if (!r.beobachtung.trim()) probleme.push("Beobachtung ist leer, obwohl Notiz und Sterne vorliegen");
  if (!/Spaß 4\/5/.test(r.beobachtung)) probleme.push(`Sternwerte fehlen in der Beobachtung: ${JSON.stringify(r.beobachtung.slice(0, 120))}`);
  if (r.aha.trim()) probleme.push(`Aha ist vorausgefüllt (${JSON.stringify(r.aha)}) – die Erkenntnis bleibt Handarbeit`);

  // d) Alias
  if (r.alias1.join(",") !== r.alias2.join(",")) probleme.push(`Alias ändert sich zwischen zwei Aufrufen: ${r.alias1} / ${r.alias2}`);
  if (r.aliasVonId.join(",") !== "Kind A,Kind B") probleme.push(`Die zwei kleinsten Kader-IDs ergeben ${r.aliasVonId} statt Kind A, Kind B`);
  if (r.nachChip.trim() !== r.chipAlias) probleme.push(`Antippen schreibt ${JSON.stringify(r.nachChip)} statt des Decknamens ${JSON.stringify(r.chipAlias)}`);
  if (!/^Kind [A-Z]+$/.test(r.aliasErfunden || "")) probleme.push(`Ein alias-fremder Name bekommt ${JSON.stringify(r.aliasErfunden)} statt eines Decknamens`);
  if (r.nachErfunden.includes("Zacharias")) probleme.push(`Der echte Name steht im Textfeld: ${JSON.stringify(r.nachErfunden)}`);
  if (r.nachErfunden.trim() !== r.aliasErfunden) probleme.push(`Antippen schreibt ${JSON.stringify(r.nachErfunden)} statt ${JSON.stringify(r.aliasErfunden)}`);
  if (r.fundErfunden !== "Zacharias") probleme.push(`Der Vorname „Zacharias" wird beim Erfassen nicht erkannt (${JSON.stringify(r.fundErfunden)})`);

  // e) Namensprüfung
  if (!r.fundMitName) probleme.push("Ein Kader-Name im Text löst keinen Hinweis aus");
  if (r.fundOhneName) probleme.push(`Text ohne Kader-Namen schlägt trotzdem an: ${r.fundOhneName}`);

  // c) Pflichtfelder
  if (gesendet.length) probleme.push(`Ohne Aha wurde trotzdem gesendet: ${JSON.stringify((gesendet[0] || {}).body || {}).slice(0, 120)}`);
  if (!/Aha/.test(r.meldung)) probleme.push(`Keine Meldung zum fehlenden Pflichtfeld: ${JSON.stringify(r.meldung.slice(0, 80))}`);
  if (!/kleinere Gruppen/.test(r.nachAblehnung)) probleme.push("Der bereits getippte Text ist nach der Ablehnung weg");

  // f) Export
  const reihenfolge = ["Auslöser", "Beobachtung", "Aha", "Konsequenz", "Beleg", "Anschluss"];
  let pos = -1;
  reihenfolge.forEach(f => {
    const i = md.indexOf("**" + f + ":**");
    if (i < 0) probleme.push(`Im Export fehlt „${f}"`);
    else if (i < pos) probleme.push(`„${f}" steht im Export an der falschen Stelle`);
    else pos = i;
  });
  if (!/^### 18\.09\.2026 — SPIEL & SPIELER$/m.test(md)) probleme.push(`Export-Überschrift weicht ab: ${JSON.stringify(md.split("\n")[0])}`);
  if (!/Wie kriege ich den Ball zu einem, der frei ist\?“/.test(md)) probleme.push("Typografische Anführungszeichen im Export verfälscht");
  if (!/heißt/.test(md) || !/Fuß/.test(md)) probleme.push("Umlaute oder ß im Export verfälscht");
  if (!/\(bis 25\.09\.2026\)/.test(md)) probleme.push("Das Datum der Konsequenz fehlt im Export");

  // g) Höhen
  if (r.haupt[0] !== 56) probleme.push(`Hauptaktion ist ${r.haupt[0]} px hoch statt 56`);
  if (r.haupt.length !== 1) probleme.push(`${r.haupt.length} Hauptaktionen auf einem Bildschirm – erlaubt ist genau eine`);
  const zuFlach = r.normal.filter(x => x < 48);
  if (zuFlach.length) probleme.push(`${zuFlach.length} Bedienelement(e) unter 48 px: ${zuFlach}`);
  const chipsFalsch = r.klein.filter(x => x < 36);
  if (chipsFalsch.length) probleme.push(`Kind-Chips unter 36 px: ${chipsFalsch}`);
  const felderFlach = r.felder.filter(x => x < 48);
  if (felderFlach.length) probleme.push(`${felderFlach.length} Eingabefeld(er) unter 48 px: ${felderFlach}`);
  if (fehler.length) probleme.push(...fehler.slice(0, 2));

  zeilen.push(`Auslöser: ${r.ausloeser}`);
  zeilen.push(`Beobachtung: ${r.beobachtung.replace(/\n/g, " · ").slice(0, 110)}`);
  zeilen.push(`Alias ${JSON.stringify(r.aliasVonId)} · Chip schreibt ${JSON.stringify(r.nachChip.trim())} · erfundener Name → ${JSON.stringify(r.aliasErfunden)} · Namensfund ${JSON.stringify(r.fundErfunden)}`);
  zeilen.push(`Ohne Aha gesendet: ${gesendet.length} · Hauptaktion ${r.haupt} px · übrige ${JSON.stringify(r.normal)} · Chips ${JSON.stringify(r.klein)}`);

  /* Zweiter Durchgang, eigene Attrappe: derselbe Weg aus dem Fazit eines Festivals
     (Abnahme 3), der freie Eintrag ohne Termin (Abnahme 4) und die Ansicht mit
     Gruppierung und Lückenhinweis (Abnahme 8). */
  const alt = h.tagePlus(-40);
  const s2 = await h.starten({ supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    profiles: [{ name: "Charles", rolle: "trainer" }],
    termine: [{ id: 77, datum: gestern, typ: "turnier", titel: "Kinderfestival · Heim", heim: true, trainer_status: {} }],
    event_bewertung: [{ termin_id: 77, autor: "Charles", teams: {}, gaeste: {},
                        getragen: "Die Kleinen haben sich getraut.", arbeiten: "Abstände im Raum" }],
    tagebuch_eintrag: [
      { id: 1, autor: "Charles", datum: gestern, quelle: "event", baustein: "organisation",
        ausloeser: "Festival", aha: "a", konsequenz: "k" },
      { id: 2, autor: "Charles", datum: alt, quelle: "frei", baustein: "ich",
        ausloeser: "Präsenztag", aha: "a", konsequenz: "k" }
    ]
  }), hoehe: 2000 });

  const r2 = await s2.page.evaluate(async () => {
    window.trainerMe = async () => "Charles";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    await loadKader();
    const out = {};

    // Abnahme 3 – aus dem Fazit eines Festivals
    await tagebuchAusEvent(77);
    for (let i = 0; i < 40 && !document.getElementById("tb-card"); i++) await new Promise(r => setTimeout(r, 50));
    out.eventAusloeser = (document.getElementById("tb-ausloeser") || {}).value || "";
    out.eventBeob      = (document.getElementById("tb-beobachtung") || {}).value || "";
    out.eventAha       = (document.getElementById("tb-aha") || {}).value || "";
    out.eventBaustein  = _TB ? _TB.werte.baustein : null;
    out.eventTerminId  = _TB ? _TB.terminId : null;
    tagebuchSchliessen();

    // Abnahme 4 – freier Eintrag ohne Termin
    tagebuchNeu();
    out.freiOffen    = !!document.getElementById("tb-card");
    out.freiQuelle   = _TB ? _TB.quelle : null;
    out.freiTerminId = _TB ? _TB.terminId : null;
    out.freiAusloeser= (document.getElementById("tb-ausloeser") || {}).value || "";
    tagebuchSchliessen();

    // Abnahme 8 – Ansicht: Gruppierung und Lückenhinweis
    let host = document.getElementById("tb-liste");
    if (!host) { host = document.createElement("div"); host.id = "tb-liste"; document.body.appendChild(host); }
    await tagebuchListe();
    await new Promise(r => setTimeout(r, 200));
    out.listeText = host.textContent.replace(/\s+/g, " ").trim();
    return out;
  });
  const fehler2 = s2.fehler(); await s2.schliessen();

  if (!/Kinderfestival/.test(r2.eventAusloeser)) probleme.push(`Fazit-Weg: Auslöser ohne Termin-Titel: ${JSON.stringify(r2.eventAusloeser)}`);
  if (!/getragen/.test(r2.eventBeob) || !/Abstände/.test(r2.eventBeob)) probleme.push(`Fazit-Weg: Beobachtung ohne die beiden Sätze: ${JSON.stringify(r2.eventBeob)}`);
  if (r2.eventAha.trim()) probleme.push("Fazit-Weg: Aha ist vorausgefüllt");
  if (r2.eventBaustein !== "organisation") probleme.push(`Fazit-Weg: Baustein ${r2.eventBaustein} statt organisation`);
  if (Number(r2.eventTerminId) !== 77) probleme.push(`Fazit-Weg: termin_id ${r2.eventTerminId} statt 77`);
  if (!r2.freiOffen) probleme.push("Freier Eintrag lässt sich nicht öffnen");
  if (r2.freiQuelle !== "frei") probleme.push(`Freier Eintrag hat quelle ${r2.freiQuelle}`);
  if (r2.freiTerminId != null) probleme.push(`Freier Eintrag trägt termin_id ${r2.freiTerminId}`);
  if (r2.freiAusloeser.trim()) probleme.push("Freier Eintrag ist vorausgefüllt, obwohl es keine Quelle gibt");
  ["Ich als Trainer", "Spiel & Spieler", "Organisation", "System Fußball"].forEach(b => {
    if (!r2.listeText.includes(b)) probleme.push(`Die Ansicht gruppiert nicht nach „${b}"`);
  });
  if (!/Seit dem \d{2}\.\d{2}\.\d{4} nichts notiert/.test(r2.listeText)) probleme.push(`Kein Lückenhinweis für den 40 Tage alten Baustein: ${r2.listeText.slice(0, 160)}`);
  if (!/Noch nichts notiert/.test(r2.listeText)) probleme.push("Kein Hinweis für einen Baustein ganz ohne Eintrag");
  if (fehler2.length) probleme.push(...fehler2.slice(0, 2));

  zeilen.push(`Fazit-Weg: ${r2.eventAusloeser} · Baustein ${r2.eventBaustein} · Termin ${r2.eventTerminId}`);
  zeilen.push(`Frei: quelle ${r2.freiQuelle}, Termin ${r2.freiTerminId}`);
  zeilen.push(`Ansicht: ${r2.listeText.slice(0, 150)}`);
  return h.ergebnis("Tagebuch: Vorbefüllung, Pflichtfelder, Deckname, Export, Ansicht", !probleme.length, zeilen.concat(probleme));
};
