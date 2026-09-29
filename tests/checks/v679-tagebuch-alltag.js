/* v679 · Tagebuch als Arbeitsmittel + Vorschlag sortiert statt geschrieben
   Aufträge: doku/auftrag-tagebuch-alltag/README.md, doku/auftrag-tagebuch-ki-sortieren/ (README,
   nachtrag-2026-09-28 – geht vor –, prozess-nacherfassung, fehlerbild-abgeschnitten).
   PO 29.09.: „ja baue das alles“ – mit den drei vorher genannten Speicherformen (Punkte-Liste mit Datum
   je Punkt, Tabelle der vergebenen Buchstaben, Spanne statt Mittelwert).

   a) Gedanke: ein Feld, ein Knopf → anlass 'gedanke', status 'keim', Baustein leer
   b) Keim: keine Warnung, kein Lückenhinweis; die Übersicht sagt „N Gedanken warten …“;
      Ausarbeiten mit Baustein, Aha, Konsequenz → status 'fertig', bestätigt
   c) Wiedervorlage: Frist gestern, offen → „überfällig“; abgehakt → verschwindet, bleibt im Eintrag
   d) Sicht je Kind: ein Eintrag mit zwei Kindern steht bei beiden; kopiert nur mit Buchstaben
   e) Ausgaben: Lehrgang ohne Keim, ohne Schlagworte, ohne Status, ohne Klarnamen, nur bestätigt;
      Arbeitsfassung mit Keim und Buchstaben
   f) Feste Buchstaben: tbAlias liest kader.alias; ein gelöschtes Kind verschiebt niemanden
   g) Vorschlag sichern: ein Eintrag je Autor und Termin (Korrektur ersetzt), diktat mit Vornamen,
      höchstens zwei Konsequenzen, To-do gegen offenes abgeglichen (ergänzt statt doppelt)
   h) Prüfkarte: Rückfrage wörtlich ins Aha, Datum per Tipp auf einen eigenen Termin, „Passt so“
      bestätigt – mit Datum fertig
   i) „Wie war's?“: Karte nach einem Termin mit Zusage; drei Tipps bis gespeichert (Erzählen,
      KI-Auswertung, Passt so); die KI-Anfrage nennt den Termin (fuer) und keinen Namen. Getippt wird
      bei laufendem App-Mikrofon – beim Bau fiel auf, dass das Anhalten den Text überschrieb.
   j) Kürzen: nie mitten im Wort; Sprachnotiz und Spiel-Sätze ohne 4000/300-Grenze
   k) Zwei Trainer: Spanne statt Mittelwert; Kinder-Sterne des Kollegen bleiben beim Speichern
   l) Knopfhöhen: Hauptaktionen 56 px, übrige Bedienelemente mindestens 44 px */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const K = h.KINDER;
  const heute = h.heute(), gestern = h.tagePlus(-1), morgen = h.tagePlus(1), inDrei = h.tagePlus(3), vorVierzig = h.tagePlus(-40);

  /* Kleine Tabelle mit Zustand: versteht id=eq, eintrag_id=eq, erledigt_am=is.null, POST (mit
     return=representation), PATCH und DELETE. Die gemeinsame Attrappe gibt sonst jede Zeile zurück. */
  const db = { tagebuch_eintrag: [], tagebuch_punkt: [], tagebuch_kind: [], einheit_bewertung: [],
    /* k) Der Kollege hat Kind B schon zwei Sterne gegeben – auf dem Server, nicht auf diesem Gerät. */
    anwesenheit: [{ datum: gestern, data: { [K[0]]: { da: true }, [K[1]]: { da: true, qual: 2, qual_von: { Peter: 2 } } } }] };
  let naechste = 100;
  const passt = (zeile, q) => {
    for (const [k, v] of q.entries()) {
      if (["select", "order", "limit", "on_conflict"].includes(k)) continue;
      const w = zeile[k];
      if (v.startsWith("eq.") && String(w) !== decodeURIComponent(v.slice(3))) return false;
      if (v === "is.null" && w != null) return false;
      if (v === "is.true" && w !== true) return false;
      if (v.startsWith("in.(")) { const l = v.slice(4, -1).split(","); if (!l.includes(String(w))) return false; }
    }
    return true;
  };
  const tabelle = name => (u, req) => {
    const q = u.searchParams, m = req.method();
    if (m === "GET") return db[name].filter(z => passt(z, q));
    const body = (() => { try { return JSON.parse(req.postData() || "null"); } catch (e) { return null; } })();
    if (m === "POST") {
      const neu = (Array.isArray(body) ? body : [body]).map(b => ({ id: naechste++, ...b }));
      if (name === "einheit_bewertung" || name === "anwesenheit") {   // Upsert
        neu.forEach(n => { const i = db[name].findIndex(z => z.datum === n.datum && (name === "anwesenheit" || z.autor === n.autor)); if (i >= 0) db[name][i] = n; else db[name].push(n); });
      } else db[name].push(...neu);
      return { status: 201, body: JSON.stringify(neu) };
    }
    if (m === "PATCH") { db[name].filter(z => passt(z, q)).forEach(z => Object.assign(z, body)); return { status: 204, body: "" }; }
    if (m === "DELETE") { db[name] = db[name].filter(z => !passt(z, q)); return { status: 204, body: "" }; }
    return [];
  };
  const kiAnfragen = [];
  const kiAntwort = {
    einheit: { spass: 4, umsetzung: 3, erfolg: null, notiz: "Kind 1 war heute sehr ruhig." }, uebungen: [], kinder: [{ kind: "Kind 1", sterne: 3 }],
    tagebuch: { baustein: "spiel_spieler", beobachtung: "Ich war früher da. Kind 1 hat viel gefragt.", aha: null,
      konsequenzen: ["Ich erkläre die Regeln mit einem Bild.", "Ich frage Kind 1 nach der Einheit."], konsequenz: "x",
      rueckfragen: [{ frage: "Was wurde dir dabei klar?", feld: "aha" }],
      todos: [{ text: "Hütchen nachkaufen, es reichen nicht", zustaendig: "organisation" }, { text: "Platzübergabe mit der U8 klären", zustaendig: "organisation" }],
      schlagworte: ["Regeln", "Material"] } };
  const kader = h.kaderZeilen().map((z, i) => ({ ...z, alias: String.fromCharCode(65 + i) }));
  const plan = [{ formIdx: 1, formName: "Dribbel Quadrat", trainer: "Alle", slotLabel: "Hauptteil" }];
  const s = await h.starten({ hoehe: 1600, supabase: h.supabaseAttrappe({
    kader, profiles: [{ name: "Charles", rolle: "trainer" }], trainings_eval: [], team_einstellungen: [{ id: 1, bewertung_ab: null }],
    trainingsplan: [{ datum: gestern, plan, kopf: { schwerpunkt: "Anspielbar werden" } }],
    termine: (u) => {
      const alle = [
        { id: 41, datum: gestern, uhrzeit: "17:00", uhrzeit_ende: "18:30", typ: "training", trainer_status: { Charles: "ja" } },
        { id: 42, datum: morgen, uhrzeit: "17:00", typ: "training", trainer_status: { Charles: "ja" } },
        { id: 43, datum: inDrei, uhrzeit: "10:00", typ: "turnier", titel: "Festival", trainer_status: { Charles: "ja" } },
        { id: 44, datum: h.tagePlus(5), uhrzeit: "17:00", typ: "training", trainer_status: { Charles: "nein" } },
        { id: 45, datum: h.tagePlus(8), uhrzeit: "17:00", typ: "training", trainer_status: { Charles: "ja" } },
        { id: 46, datum: h.tagePlus(10), uhrzeit: "17:00", typ: "training", trainer_status: { Charles: "ja" } } ];
      const ab = (u.searchParams.getAll("datum").find(x => x.startsWith("gte.")) || "gte.0000").slice(4);
      const bis = (u.searchParams.getAll("datum").find(x => x.startsWith("lte.")) || "lte.9999").slice(4);
      const id = u.searchParams.get("id");
      return alle.filter(t => t.datum >= ab && t.datum <= bis && (!id || "eq." + t.id === id));
    },
    tagebuch_eintrag: tabelle("tagebuch_eintrag"), tagebuch_punkt: tabelle("tagebuch_punkt"), tagebuch_kind: tabelle("tagebuch_kind"),
    einheit_bewertung: tabelle("einheit_bewertung"), anwesenheit: tabelle("anwesenheit"), event_bewertung: [],
    funktionen: { "ki-nachbereitung": (u, req) => { kiAnfragen.push(JSON.parse(req.postData() || "{}")); return { art: "training", ergebnis: kiAntwort }; } }
  }) });

  const r = await s.page.evaluate(async ({ K, heute, gestern, morgen, vorVierzig, kiTb }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const bis = async (f, n) => { for (let i = 0; i < (n || 60) && !f(); i++) await warte(50); return f(); };
    window.trainerMe = async () => "Charles";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    if (typeof tagebuchGedanke !== "function" || typeof tbPruefenOpen !== "function" || typeof wieWarsKarte !== "function") return { fehlt: true };
    await loadKader();
    const out = {};
    const hoehe = el => Math.round(parseFloat(getComputedStyle(el).minHeight) || el.getBoundingClientRect().height);

    // a) Gedanke
    tagebuchGedanke();
    out.gedankeKnopf = hoehe(document.getElementById("tb-gedanke-los"));
    document.getElementById("tb-gedanke-text").value = "Die Pausen sind der beste Moment zum Coachen – mit " + K[2] + " ausprobieren.";
    await tagebuchGedankeSpeichern(); await warte(50);
    out.gedankeZu = !document.getElementById("tb-gedanke");

    // b) Liste mit Keim; Lückenhinweis rechnet nicht mit Keimen
    let box = document.getElementById("tb-liste"); if (!box) { box = document.createElement("div"); box.id = "tb-liste"; document.body.appendChild(box); }
    await tagebuchListe(); await warte(50);
    out.listeKeim = box.textContent.replace(/\s+/g, " ");
    // Keim ausarbeiten
    const keim = _TB_LISTE.find(e => e.status === "keim");
    tagebuchBearbeiten(keim.id); await warte(30);
    tbBaustein("ich");
    document.getElementById("tb-ausloeser").value = "Gedanke nach dem Training";
    document.getElementById("tb-aha").value = "Pausen sind Lernzeit.";
    document.getElementById("tb-konsequenz").value = "Jede Pause mit einer Frage beginnen.";
    document.getElementById("tb-konsequenz_bis").value = gestern;
    tbFelderLesen(); tbKindUmschalten(kaderIdVon(KADER[2])); tbKindUmschalten(kaderIdVon(KADER[4]));
    await tagebuchSpeichern(); await warte(80);

    // c) Wiedervorlage
    await tagebuchListe(); await warte(50);
    tbSicht("wiedervorlage"); await warte(20);
    out.wvVorher = [...box.querySelectorAll('.tb-wv-gruppe[data-gruppe="ueberfaellig"] .tb-wv-zeile')].map(z => z.textContent.replace(/\s+/g, " ").trim());
    const pid = Number((box.querySelector('.tb-wv-gruppe[data-gruppe="ueberfaellig"] .tb-wv-zeile') || { dataset: {} }).dataset.id);
    if (pid) { await tbPunktErledigt(pid); await warte(30); }
    out.wvNachher = box.querySelectorAll('.tb-wv-gruppe[data-gruppe="ueberfaellig"] .tb-wv-zeile').length;
    tbSicht("eintraege"); await warte(20);
    out.eintragNachAbhaken = (box.querySelector(`.tb-zeile[data-id="${keim.id}"]`) || {}).textContent || "";

    // d) Sicht je Kind
    tbSicht("kind"); tbSichtKind(kaderIdVon(KADER[2])); await warte(20);
    out.kindC = box.querySelectorAll(".tb-zeile").length;
    tbSichtKind(kaderIdVon(KADER[4])); await warte(20);
    out.kindE = box.querySelectorAll(".tb-zeile").length;
    let kopiert = ""; navigator.clipboard.writeText = async t => { kopiert = t; };
    tagebuchKindKopieren(); await warte(20);
    out.kindKopie = kopiert;
    tbSicht("eintraege");

    // e) Ausgaben – ein zweiter Keim, ein unbestätigter Vorschlag
    _TB_LISTE.push({ id: 900, autor: "Charles", datum: heute, status: "keim", beobachtung: "Noch ein Gedanke zu " + K[5] + ".", schlagworte: [] },
                   { id: 901, autor: "Charles", datum: heute, status: "fertig", baustein: "organisation", ausloeser: "Spiel", aha: "a", konsequenz: "k", ki_vorschlag: true, bestaetigt_am: null, schlagworte: ["Zeitplan"] });
    const monat = heute.slice(0, 7);
    out.lehrgang = tagebuchMonatMarkdown(monat, "lehrgang");
    out.arbeit = tagebuchMonatMarkdown(monat, "arbeit");
    out.keimEinzeln = tagebuchExport(900, "lehrgang");
    _TB_LISTE.splice(-2, 2);

    // f) feste Buchstaben
    out.aliasC = tbAlias(K[2]);
    const weg = KADER.splice(1, 1)[0];                  // Kind B wird gelöscht
    out.aliasCNachLoeschen = tbAlias(K[2]);
    KADER.splice(1, 0, weg);

    // g) Vorschlag sichern (zweimal – Korrektur ersetzt), mit einem schon offenen To-do
    await fetch(SB_URL + "/rest/v1/tagebuch_punkt", { method: "POST", headers: sbAuthHeaders(), body: JSON.stringify({ art: "todo", text: "Hütchen nachkaufen – reichen nicht", autor: "Peter", herkunft: "Festival" }) });
    const m = nbMaske([K[0]]);
    const v = nbTbDecknamen(Object.assign({}, kiTb), m);
    const diktat = "Ich war früher da. " + K[0] + " hat viel gefragt.";
    const id1 = await tbVorschlagSichern({ fuer: "d" + gestern, art: "training", v, diktat });
    const id2 = await tbVorschlagSichern({ fuer: "d" + gestern, art: "training", v, diktat });
    out.g = { id1, id2 };

    // h) Prüfkarte
    await tbPruefenOpen(id2, { bewertung: ["Einheit: Spaß ★★★★"] }); await warte(30);
    out.h = { karte: !!document.getElementById("tb-pruefen"), text: document.getElementById("tb-pruefen").textContent.replace(/\s+/g, " ") };
    out.h.chips = [...document.querySelectorAll("#tb-pruefen button")].filter(b => /^tbpDatum\('kons',0,/.test(b.getAttribute("onclick") || "")).map(b => b.getAttribute("onclick"));
    const antwort = "Mir ist klar geworden, dass Fragen mehr bringen als Ansagen.";
    document.getElementById("tbp-frage-0").value = antwort;
    const c0 = document.querySelector(`#tb-pruefen button[onclick="tbpDatum('kons',0,'${morgen}')"]`); c0 && c0.click();
    const c1 = document.querySelector(`#tb-pruefen button[onclick="tbpDatum('kons',1,'${morgen}')"]`); c1 && c1.click();
    out.h.passt = hoehe(document.getElementById("tbp-passt"));
    out.h.klein = [...document.querySelectorAll("#tb-pruefen button, #tb-pruefen textarea, #tb-pruefen input")].filter(b => b.getAttribute("aria-label") !== "Schließen").map(hoehe).filter(x => x < 44);
    await tbPasstSo(); await warte(80);
    out.h.zu = !document.getElementById("tb-pruefen");

    // i) Wie war's? – eigene Karte, drei Tipps
    let slot = document.getElementById("home-wiewars"); if (!slot) { slot = document.createElement("div"); slot.id = "home-wiewars"; document.body.prepend(slot); }
    _TB_VORSCHLAG = {};
    await wieWarsKarte(); await warte(30);
    out.i = { karte: slot.textContent.replace(/\s+/g, " ").trim() };
    const erz = [...slot.querySelectorAll("button")].find(b => /Erzählen/.test(b.textContent));
    out.i.erzaehlen = erz ? hoehe(erz) : 0;
    AW_DATA[gestern] = { [K[0]]: { da: true }, [K[1]]: { da: true } };
    let tipps = 0;
    if (erz) { erz.click(); tipps++; }
    await bis(() => document.getElementById("nb-gross-text"));
    document.getElementById("nb-gross-text").value = "Ich war früher da. " + K[0] + " hat viel gefragt. Ich erkläre die Regeln künftig mit einem Bild.";
    nbGrossSync(document.getElementById("nb-gross-text").value);
    const los = document.getElementById("nb-gross-los");
    if (los) { los.click(); tipps++; }
    await bis(() => document.getElementById("tbp-passt"), 100);
    const passtKnopf = document.getElementById("tbp-passt");
    if (passtKnopf) { passtKnopf.click(); tipps++; }
    await bis(() => !document.getElementById("tb-pruefen"), 60);
    out.i.tipps = tipps; out.i.fertig = !document.getElementById("tb-pruefen") && !document.getElementById("eb-modal");
    const tag = AW_DATA[gestern] || {};
    out.k0 = { a: tag[K[0]] && tag[K[0]].qual, aVon: tag[K[0]] && tag[K[0]].qual_von, b: tag[K[1]] && tag[K[1]].qual };

    // j) Kürzen
    const lang = "Das ist ein Satz. ".repeat(30) + "Ein letzter Satz ohne Punkt der weitergeht";
    out.j = { k: nbKuerzen(lang, 200), w: nbKuerzen("Wort ".repeat(80), 60) };
    _nbFuer = "x"; _nbText = "A".repeat(20) + " " + "b".repeat(5000);
    out.j.notiz = (nbSprachnotizFuer("x") || "").length;

    // k) Zwei Trainer
    out.k = { spanne: ebSpanneHtml([{ spass: 3, umsetzung: 4 }, { spass: 4, umsetzung: 4 }]).replace(/<[^>]+>/g, "") };
    return out;
  }, { K, heute, gestern, morgen, vorVierzig, kiTb: kiAntwort.tagebuch }).catch(e => ({ fehler: String(e) }));
  const fe = s.fehler(); await s.schliessen();

  if (r.fehlt) return h.ergebnis("v679 Tagebuch als Arbeitsmittel", false, ["Funktionen fehlen (tagebuchGedanke/tbPruefenOpen/wieWarsKarte)"]);
  if (r.fehler) return h.ergebnis("v679 Tagebuch als Arbeitsmittel", false, ["Abbruch: " + r.fehler]);
  const E = db.tagebuch_eintrag, P = db.tagebuch_punkt;

  // a)
  const g = E[0] || {};
  // a) Der Zustand beim Erfassen – das Zeilenobjekt ist danach ausgearbeitet worden
  const g0 = (s.gesendet.find(x => /tagebuch_eintrag$/.test(x.pfad) && x.methode === "POST" && x.body && x.body.anlass === "gedanke") || {}).body || {};
  if (g0.status !== "keim" || g0.baustein != null || !/Pausen/.test(g0.beobachtung || "")) probleme.push("a) Gedanke: " + JSON.stringify({ a: g0.anlass, s: g0.status, b: g0.baustein }));
  if (r.gedankeKnopf !== 56 || !r.gedankeZu) probleme.push(`a) Knopf ${r.gedankeKnopf} px, Fenster zu ${r.gedankeZu}`);
  // b)
  if (!/1 Gedanke wartet auf eine Konsequenz/.test(r.listeKeim)) probleme.push("b) Zahl der Keime fehlt: " + r.listeKeim.slice(0, 200));
  if (/Ohne .* wird nicht erfasst/.test(r.listeKeim)) probleme.push("b) Warnung beim Keim");
  if (g.status !== "fertig" || g.baustein !== "ich" || !g.bestaetigt_am || g.konsequenz_bis !== gestern) probleme.push("b) Ausarbeiten: " + JSON.stringify({ s: g.status, b: g.baustein, best: !!g.bestaetigt_am, bis: g.konsequenz_bis }));
  // c)
  if (r.wvVorher.length !== 1 || !/Jede Pause mit einer Frage/.test(r.wvVorher[0] || "")) probleme.push("c) überfällig vorher: " + JSON.stringify(r.wvVorher));
  if (r.wvNachher !== 0) probleme.push("c) abgehakt, aber noch überfällig");
  if (!/Jede Pause mit einer Frage/.test(r.eintragNachAbhaken) || !/✓/.test(r.eintragNachAbhaken)) probleme.push("c) Konsequenz im Eintrag nach dem Abhaken: " + r.eintragNachAbhaken.slice(0, 200));
  if (P.some(p => /Jede Pause/.test(p.text) && !p.erledigt_am)) probleme.push("c) erledigt_am nicht gesetzt");
  // d)
  if (r.kindC !== 1 || r.kindE !== 1) probleme.push(`d) Sicht je Kind: C ${r.kindC}, E ${r.kindE}`);
  if (!/Kind C/.test(r.kindKopie) || !/Hinweis: Aus Datenschutzgründen/.test(r.kindKopie)) probleme.push("d) Kopie ohne Buchstaben oder Hinweis: " + r.kindKopie.slice(0, 200));
  if (db.tagebuch_kind.length !== 2) probleme.push("d) tagebuch_kind: " + JSON.stringify(db.tagebuch_kind));
  // e)
  if (/Noch ein Gedanke/.test(r.lehrgang) || /Schlagworte/.test(r.lehrgang) || /Status/.test(r.lehrgang) || /### .* — ORGANISATION/.test(r.lehrgang)) probleme.push("e) Lehrgang enthält Keim/Schlagworte/Status/Unbestätigtes: " + r.lehrgang.slice(0, 300));
  if (!/Noch ein Gedanke zu Kind F/.test(r.arbeit) || !/Status/.test(r.arbeit)) probleme.push("e) Arbeitsfassung ohne Keim oder Buchstaben: " + r.arbeit.slice(0, 300));
  if (/### .* — GEDANKE/.test(r.keimEinzeln) === false && !/Keim/.test(r.keimEinzeln)) probleme.push("e) Ein Keim als Lehrgangstext: " + r.keimEinzeln.slice(0, 160));
  // f)
  if (r.aliasC !== "Kind C" || r.aliasCNachLoeschen !== "Kind C") probleme.push(`f) Buchstabe: ${r.aliasC} → nach Löschen ${r.aliasCNachLoeschen}`);
  // g)
  const vs = E.filter(e => e.ki_vorschlag);
  const v = vs[0] || {};
  if (r.g.id1 !== r.g.id2 || vs.length < 1) probleme.push("g) Korrektur legte einen zweiten Vorschlag an: " + JSON.stringify(r.g));
  if (!String(v.diktat || "").includes(K[0])) probleme.push("g) diktat ohne Vorname: " + v.diktat);
  if (/Kind \d/.test(JSON.stringify(v))) probleme.push("g) „Kind n“ im gespeicherten Vorschlag");
  // h) – nach „Passt so“
  if (v.aha !== "Mir ist klar geworden, dass Fragen mehr bringen als Ansagen.") probleme.push("h) Antwort nicht wörtlich im Aha: " + v.aha);
  if (!v.bestaetigt_am || v.status !== "fertig" || v.konsequenz_bis !== morgen) probleme.push("h) Passt so: " + JSON.stringify({ best: !!v.bestaetigt_am, s: v.status, bis: v.konsequenz_bis }));
  if (r.h.chips.length !== 3 || !r.h.chips.some(c => c.includes(morgen)) || r.h.chips.some(c => c.includes(h.tagePlus(5)))) probleme.push("h) Datums-Chips nicht die nächsten drei eigenen Termine: " + JSON.stringify(r.h.chips));
  if (r.h.passt !== 56 || r.h.klein.length) probleme.push(`h) Höhen: Passt so ${r.h.passt}, zu klein ${JSON.stringify(r.h.klein)}`);
  const kons = P.filter(p => p.eintrag_id === v.id && p.art === "konsequenz");
  if (kons.length !== 2) probleme.push("h) Konsequenzen am Vorschlag: " + kons.length);
  const todos = P.filter(p => p.art === "todo");
  const huetchen = todos.filter(p => /Hütchen/.test(p.text));
  if (huetchen.length !== 1 || !/Training U9 vom/.test(huetchen[0].herkunft || "")) probleme.push("g) To-do doppelt oder nicht ergänzt: " + JSON.stringify(huetchen));
  if (!todos.some(p => /Platzübergabe/.test(p.text) && p.zustaendig === "organisation")) probleme.push("g) To-do mit Zuständigkeitsvorschlag fehlt");
  // i)
  if (!/Wie war's\?/.test(r.i.karte) || r.i.erzaehlen !== 56) probleme.push("i) Karte: " + JSON.stringify(r.i));
  if (r.i.tipps !== 3 || !r.i.fertig) probleme.push(`i) Tipps ${r.i.tipps}, fertig ${r.i.fertig}`);
  const anfrage = kiAnfragen[kiAnfragen.length - 1] || {};
  if (anfrage.fuer !== "d" + gestern || K.some(n => (anfrage.text || "").includes(n))) probleme.push("i) KI-Anfrage: " + JSON.stringify({ fuer: anfrage.fuer, text: (anfrage.text || "").slice(0, 80) }));
  if (kiAnfragen.some(a => a.art === "tagebuch")) probleme.push("i) zweiter KI-Weg art „tagebuch“");
  if (!db.einheit_bewertung.some(b => b.datum === gestern && b.autor === "Charles" && /früher da/.test(b.sprachnotiz || ""))) probleme.push("i) Bewertung ohne Sprachnotiz gespeichert (v679: Anhalten des Mikrofons überschrieb getippten Text): " + JSON.stringify(s.gesendet.filter(x => /einheit_bewertung/.test(x.pfad)).map(x => ({ q: x.suche, sn: (x.body || {}).sprachnotiz }))).slice(0, 400));
  // j)
  if (!/\[gekürzt\]$/.test(r.j.k) || !/\. \[gekürzt\]$/.test(r.j.k) || r.j.k.length > 200) probleme.push("j) Kürzung am Satzende: " + r.j.k.slice(-40));
  if (!/Wort … \[gekürzt\]$/.test(r.j.w)) probleme.push("j) Kürzung an der Wortgrenze: " + r.j.w.slice(-30));
  if (r.j.notiz !== 5021) probleme.push("j) Sprachnotiz gekürzt: " + r.j.notiz);
  const ohneKommentar = t => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const fazit = ohneKommentar(fs.readFileSync(path.join(h.REPO, "md-fazit.js"), "utf8"));
  if (/\.slice\(0,\s*300\)/.test(fazit) || /\.slice\(0,\s*4000\)/.test(fazit)) probleme.push("j) md-fazit.js kappt noch bei 300 oder 4000 Zeichen");
  const kiRoh = fs.readFileSync(path.join(h.REPO, "supabase/functions/ki-nachbereitung/index.ts"), "utf8"), ki = ohneKommentar(kiRoh);
  if (/s\.slice\(0, max\)/.test(ki) || !/\[gekürzt\]/.test(ki) || /art === "tagebuch"\)\s*\{/.test(ki)) probleme.push("j) Edge Function kürzt noch im Wort oder kennt art „tagebuch“");
  if (!/Du SORTIERST die Worte des Trainers/.test(kiRoh) || !/Niemals „der Trainer“/.test(kiRoh)) probleme.push("j) FORM_TAGEBUCH nicht umgestellt");
  // k)
  if (!/Spaß ★3–4/.test(r.k.spanne) || !/Umsetzung ★4/.test(r.k.spanne) || /3,5/.test(r.k.spanne)) probleme.push("k) Spanne: " + r.k.spanne);
  if (r.k0.a !== 3 || !r.k0.aVon || r.k0.aVon.Charles !== 3 || r.k0.b !== 2) probleme.push("k) Kinder-Sterne: eigener Wert oder der des Kollegen fehlt: " + JSON.stringify(r.k0));
  // Migration und Sicherung
  const mig = fs.readdirSync(path.join(h.REPO, "supabase/migrations")).find(f => /v679/.test(f));
  const sql = mig ? fs.readFileSync(path.join(h.REPO, "supabase/migrations", mig), "utf8") : "";
  ["tagebuch_punkt", "tagebuch_kind", "kader_alias_vergeben", "ki_nachbereitung_lauf"].forEach(t => {
    if (!new RegExp("create table if not exists public\\." + t).test(sql) || !new RegExp("alter table public\\." + t + " enable row level security").test(sql)) probleme.push("Migration/RLS fehlt: " + t);
  });
  const views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  ["tagebuch_punkt", "tagebuch_kind", "kader_alias_vergeben"].forEach(t => { if (!views.includes('"' + t + '"')) probleme.push("Sicherung ohne " + t); });
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));

  zeilen.push(`a) Gedanke → ${g.anlass}/keim · b) „1 Gedanke wartet …“, ausgearbeitet ${g.status} · c) überfällig 1 → abgehakt 0 · d) je Kind C ${r.kindC}, E ${r.kindE}`);
  zeilen.push(`e) Lehrgang ohne Keim/Tags · f) ${r.aliasC} bleibt nach Löschen · g) ein Vorschlag, To-do ergänzt · h) Aha wörtlich, Datum ${v.konsequenz_bis}, ${v.status}`);
  zeilen.push(`i) Wie war's: ${r.i.tipps} Tipps, KI fuer=${anfrage.fuer} · j) Kürzung „…${r.j.k.slice(-24)}“ · k) ${r.k.spanne.trim()}`);
  return h.ergebnis("v679 Tagebuch als Arbeitsmittel, Vorschlag sortiert, „Wie war's?“ in drei Tipps", !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
