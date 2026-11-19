/* v877 · Bestandsaufnahme 4.8, Schritt 1: Golden-Master des Trainingsplans.

   Zweck: festschreiben, was der Trainingsplan HEUTE (v876) an die Tabelle `trainingsplan`
   schickt – Zeichen für Zeichen. Die Umbauschritte 2 bis 8 (Zustand aus dem DOM lösen) müssen
   bei jedem der zehn Abläufe genau dasselbe speichern; das ist ihre Abnahme. Fehler werden erst
   ab Schritt 9 behoben, jeder sichtbar: dann ändert sich ein Sollwert, mit Begründung im PR.

   Sollwerte: tests/golden/trainingsplan/G*.json (nicht unter checks/ – run.js parst dort jede
   Datei). Neu schreiben: GOLDEN_SCHREIBEN=1 node tests/run.js v877-trainingsplan
   Fehlt eine Sollwert-Datei, ist der Lauf rot.

   Erfasst wird jeder Nicht-GET an trainingsplan (Methode, Abfrage, Körper). Verglichen wird als
   Zeichenkette (JSON.stringify – die Schlüsselreihenfolge zählt). Normalisiert werden nur
   `updated_at`, `gespeichert_von` und die Werte von `kette` (k1, k2 … in der Reihenfolge ihres
   Auftretens). Die Uhr steht fest (starten({jetzt})), tpGenerate ist über das Datum geseedet,
   Math.random ist in der Seite durch einen geseedeten Generator ersetzt.

   Gewartet wird auf Ereignisse: je Schritt auf die erwartete Zahl an Schreibvorgängen (beim
   verzögerten Speichern auf genau diesen POST), danach auf Ruhe – erst die Ruhe zeigt, dass
   kein weiterer Schreibvorgang folgt. */
"use strict";
const fs = require("fs"), path = require("path");

const DATUM = "2030-03-05", DATUM_B = "2030-03-07", JETZT = "2030-03-01T09:00:00";
const TRAINER3 = ["Charles", "Finn", "Kenneth"];
const ORDNER = path.join(__dirname, "..", "golden", "trainingsplan");
const SCHREIBEN = !!process.env.GOLDEN_SCHREIBEN;
const RUHE_MS = 1600;                 // länger als das verzögerte Speichern (1,2 s)
const SCHRITT_MS = 12000;             // Obergrenze, bis ein erwarteter Schreibvorgang da sein muss
const warte = ms => new Promise(r => setTimeout(r, ms));

/* ── Datenbank-Attrappe für trainingsplan: hält einen Stand wie die echte Tabelle ── */
function planTabelle(start) {
  const db = {};
  Object.keys(start || {}).forEach(d => { db[d] = { datum: d, ...start[d] }; });
  const spalten = (zeile, sel) => {
    if (!sel || sel === "*") return { ...zeile };
    const o = {}; sel.split(",").forEach(k => { k = k.trim(); if (k in zeile) o[k] = zeile[k]; else o[k] = null; }); return o;
  };
  const passt = (d, bed) => bed.every(b => {
    if (b.startsWith("eq.")) return d === b.slice(3);
    if (b.startsWith("in.(")) return b.slice(4, -1).split(",").includes(d);
    if (b.startsWith("gte.")) return d >= b.slice(4);
    if (b.startsWith("lte.")) return d <= b.slice(4);
    if (b.startsWith("lt.")) return d < b.slice(3);
    if (b.startsWith("gt.")) return d > b.slice(3);
    return true;
  });
  const fn = (u, req) => {
    const m = req.method(), bed = u.searchParams.getAll("datum");
    if (m === "POST") {
      let b = null; try { b = JSON.parse(req.postData() || "null"); } catch (e) {}
      const liste = Array.isArray(b) ? b : [b];
      const aus = liste.filter(Boolean).map(x => { db[x.datum] = { ...(db[x.datum] || { datum: x.datum }), ...x }; return { ...db[x.datum] }; });
      /* Wie Supabase: mit return=representation kommt die gespeicherte Zeile zurück (nicht []
         – das war die Ursache des v857-Rots), mit return=minimal nichts. */
      const prefer = req.headers()["prefer"] || "";
      return { status: 201, body: /return=representation/.test(prefer) ? JSON.stringify(aus) : "" };
    }
    if (m === "PATCH") {
      let b = null; try { b = JSON.parse(req.postData() || "null"); } catch (e) {}
      Object.keys(db).filter(d => passt(d, bed)).forEach(d => { db[d] = { ...db[d], ...(b || {}) }; });
      return { status: 204, body: "" };
    }
    let zeilen = Object.keys(db).sort().filter(d => passt(d, bed)).map(d => db[d]);
    if (/datum\.desc/.test(u.searchParams.get("order") || "")) zeilen = zeilen.reverse();
    return zeilen.map(z => spalten(z, u.searchParams.get("select")));
  };
  fn.db = db;
  return fn;
}
/* trainingsgruppen: ebenfalls mit Stand, sonst bildete jedes Neuladen die Gruppen neu */
function gruppenTabelle() {
  const db = {};
  return (u, req) => {
    const d = (u.searchParams.get("datum") || "").replace(/^eq\./, "");
    if (req.method() === "POST") { try { const b = JSON.parse(req.postData() || "{}"); db[b.datum] = b; } catch (e) {} return { status: 201, body: "" }; }
    return db[d] ? [db[d]] : [];
  };
}

/* ── Normalisieren und Vergleichen ── */
function normalisieren(saetze) {
  const ketten = {};
  const geh = x => {
    if (Array.isArray(x)) return x.map(geh);
    if (x && typeof x === "object") {
      const o = {};
      Object.keys(x).forEach(k => {
        if (k === "kette" && typeof x[k] === "string") { if (!(x[k] in ketten)) ketten[x[k]] = "k" + (Object.keys(ketten).length + 1); o[k] = ketten[x[k]]; }
        else o[k] = geh(x[k]);
      });
      return o;
    }
    return x;
  };
  return saetze.map(s => {
    const body = (s.body && typeof s.body === "object" && !Array.isArray(s.body)) ? { ...s.body } : s.body;
    if (body && typeof body === "object" && !Array.isArray(body)) {
      if ("updated_at" in body) body.updated_at = "<updated_at>";
      if ("gespeichert_von" in body) body.gespeichert_von = "<gespeichert_von>";
    }
    return { methode: s.methode, suche: s.suche, body };
  }).map(x => ({ ...x, body: geh(x.body) }));
}
function ersteAbweichung(a, b) {
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const zeile = a.slice(0, i).split("\n").length;
  return `ab Zeile ${zeile}: soll „${b.slice(Math.max(0, i - 60), i + 80).replace(/\s+/g, " ")}“ · ist „${a.slice(Math.max(0, i - 60), i + 80).replace(/\s+/g, " ")}“`;
}

/* ── Gemeinsamer Aufbau einer Seite (Übungen und Vorlagen aus der geprüften Fassung, REPO) ── */
let REPO = path.resolve(__dirname, "..", "..");
const BIB = () => JSON.parse(fs.readFileSync(path.join(REPO, "uebungen/bibliothek.json"), "utf8"));
const VOR = () => JSON.parse(fs.readFileSync(path.join(REPO, "uebungen/vorlagen.json"), "utf8"));

function testVorlagen() {
  const alle = VOR().vorlagen || [];
  const nach = k => alle.find(v => String(v.name || "").startsWith(k));
  /* v882: Der Golden-Master hält den Code fest, nicht den Inhalt. Seit dem Beschluss vom 19.11. hat L4-8 eine offene Stufe
     statt des dritten Stationsdurchgangs – geprüft wird deshalb weiter die Fassung des Nachtrags (drei Durchgänge),
     mit Kinderziel und Folge der Datei wie bisher. */
  const l48ist = nach("L4-8"), l11 = nach("L1-1");
  const l48nachtrag = JSON.parse(fs.readFileSync(path.join(REPO, "doku/auftrag-aufstellungen-3plus1-funino/vorlagen-nachtrag-kombi.json"), "utf8")).vorlagen.find(v => /^L4-8 /.test(v.name));
  const l48 = l48ist && l48nachtrag ? { ...l48nachtrag, ziel_kinder: l48ist.ziel_kinder } : l48ist;
  /* Keine Vorlage im Bestand hat eine tw-Station (rolle "tw"). Die dritte ist deshalb L4-8 mit
     einer zusätzlichen Torwart-Station im ersten Hauptteil – der Weg in vuPlanAusVorlage. */
  const tw = JSON.parse(JSON.stringify(l48));
  tw.name = "Prüffall – drei Felder mit Torwart-Station";
  const h1 = tw.bloecke.find(b => Array.isArray(b.stationen));
  h1.stationen = h1.stationen.concat([{ rolle: "tw", uebung_name: "Adler TW – Einlaufen" }]);
  return [l48, l11, tw].map((v, i) => ({ ...v, id: 700 + i }));
}

async function seite(h, opt) {
  const kader = h.kaderZeilen(); kader[1].tw = true;                 // zwei Torhüter: Kind A (Prio 1) und Kind B
  const termin = d => ({ id: d === DATUM ? 1 : 2, datum: d, typ: "training", uhrzeit: "17:00", uhrzeit_ende: "18:15",
    trainer_status: Object.fromEntries(TRAINER3.map(t => [t, "ja"])) });
  const plan = planTabelle(opt.db);
  const s = await h.starten({ jetzt: JETZT, hoehe: 2400, warten: 1500, supabase: h.supabaseAttrappe({
    kader, nominierungen: [], anwesenheit: [], rueckmeldungen: [], periodisierung: [],
    termine: u => { const d = (u.searchParams.get("datum") || "").replace(/^eq\./, ""); return [DATUM, DATUM_B].filter(x => !d || x === d).map(termin); },
    trainingsformen: (BIB().uebungen || []).map((u, i) => ({ ...u, id: 6000 + i, custom: true })),
    trainingsvorlagen: testVorlagen(),
    trainingsgruppen: gruppenTabelle(),
    trainingsplan: plan
  }) });
  s.plan = plan;
  await h.sichtbarMachen(s.page, "#train-sub-planung"); await h.sichtbarMachen(s.page, "#tp-timeline");
  await s.page.waitForFunction(() => typeof vorlageUebernehmenSetzen === "function" && typeof tpPlanRestore === "function", null, { timeout: 30000 });
  await s.page.evaluate(async ({ d, dB }) => {
    /* Ein geseedeter Zufall statt Math.random – nur in der Prüfung, die App bleibt unberührt. */
    let x = 123456789; Math.random = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
    await loadKader(); if (typeof loadCustomForms === "function") await loadCustomForms();
    if (typeof vorlagenLaden === "function") await vorlagenLaden();
    const f = document.getElementById("tp-date");
    [d, dB].forEach(v => { if (![...f.options].some(o => o.value === v)) f.add(new Option(v, v)); });
    f.value = d;
    await tpTrainerRsvpLaden(d); await tpPlanRestore(d);
  }, { d: DATUM, dB: DATUM_B });
  await ruhe(s);
  s.gesendet.length = 0;      // was vor dem ersten Schritt geschah (Gruppen o. Ä.), zählt nicht
  return s;
}
const tp = s => s.gesendet.filter(g => /\/rest\/v1\/trainingsplan$/.test(g.pfad));
async function ruhe(s) {
  await s.page.waitForFunction(() => typeof _tpRestoring === "undefined" || _tpRestoring === false, null, { timeout: SCHRITT_MS }).catch(() => {});
  let n = s.gesendet.length, t = Date.now();
  while (Date.now() - t < RUHE_MS) { await warte(50); if (s.gesendet.length !== n) { n = s.gesendet.length; t = Date.now(); } }
}

/* ── Ein Szenario: Schritte nacheinander, je Schritt die neuen Schreibvorgänge ── */
async function szenario(h, def) {
  const datei = path.join(ORDNER, def.id + ".json");
  let soll = null;
  if (!SCHREIBEN) {
    if (!fs.existsSync(datei)) return { id: def.id, ok: false, zeile: `${def.id}: Sollwert fehlt (${path.relative(process.cwd(), datei)}) – mit GOLDEN_SCHREIBEN=1 anlegen` };
    soll = fs.readFileSync(datei, "utf8");
  }
  const sollJson = soll ? JSON.parse(soll) : null;
  const s = await seite(h, def);
  const schritte = [];
  try {
    for (let i = 0; i < def.schritte.length; i++) {
      const [name, tun] = def.schritte[i];
      const n0 = tp(s).length;
      const dom = await tun(s.page, s);
      const erwartet = sollJson && sollJson.schritte[i] ? sollJson.schritte[i].gesendet.length : 0;
      if (erwartet) { const t = Date.now(); while (tp(s).length - n0 < erwartet && Date.now() - t < SCHRITT_MS) await warte(40); }
      await ruhe(s);
      const eintrag = { schritt: name, gesendet: normalisieren(tp(s).slice(n0)) };
      if (dom !== undefined) eintrag.dom = dom;
      schritte.push(eintrag);
    }
  } catch (e) {
    schritte.push({ schritt: "Abbruch", fehler: String(e.message || e).split("\n")[0] });
  }
  const fehler = s.fehler();
  await s.schliessen();
  const ist = JSON.stringify({ szenario: def.titel, haelt_fest: def.haelt, schritte }, null, 1) + "\n";
  const zahl = schritte.reduce((a, x) => a + (x.gesendet ? x.gesendet.length : 0), 0);
  if (SCHREIBEN) {
    fs.mkdirSync(ORDNER, { recursive: true }); fs.writeFileSync(datei, ist);
    return { id: def.id, ok: !schritte.some(x => x.fehler), zeile: `${def.id}: Sollwert geschrieben (${schritte.length} Schritte, ${zahl} Schreibvorgänge)${fehler.length ? " · Konsole: " + fehler[0] : ""}` };
  }
  if (ist === soll) return { id: def.id, ok: true, zeile: `${def.id}: zeichengleich (${schritte.length} Schritte, ${zahl} Schreibvorgänge)` };
  return { id: def.id, ok: false, zeile: `${def.id} „${def.titel}“ weicht ab – ${ersteAbweichung(ist, soll)}` };
}

/* ═══ Die zehn Abläufe ═══ */
const SZENARIEN = [
  { id: "G1-vorlage-laden", titel: "Vorlage laden: Stationen, alleFelder, tw-Station – Import, Folge-POSTs, Griff von Hand",
    haelt: "Ist-Zustand ohne bekanntes Fehlerbild: der Import schreibt einmal (return=minimal, Plan mit station/alleFelder ohne block/feld); Öffnen und „Training füllen“ danach schreiben nichts, weil alle Felder schon belegt sind; erst der Griff von Hand speichert Feld für Feld (block/feld, Marken weg). Kein Schritt-9-Thema.",
    schritte: [700, 701, 702].flatMap(id => [
      [`Vorlage ${id} übernehmen`, p => p.evaluate(async id => { _vuAuswahl = id; await vorlageUebernehmenSetzen(); }, id)],
      [`Vorlage ${id}: ein Feld von Hand ändern`, p => p.evaluate(() => {
        const si = tpSlots.findIndex(s => tpIstHauptteil(s.typ));
        const sel = document.getElementById(`tp-form-${si}-1`) || document.getElementById(`tp-form-${si}-0`);
        const neu = [...sel.options].map(o => o.value).find(v => v !== "" && v !== sel.value);
        tpPickerOpen(sel.id); tpPickerSet(Number(neu));
        return { feld: sel.id };
      })]
    ]) },

  { id: "G2-uebung-tauschen", titel: "Übung tauschen: Picker, Tausch außerhalb des Typfilters, Dauer, Speichern",
    haelt: "Fehlerbild 4 – behoben in v893: eine getauschte Übung außerhalb des Blocktyps bleibt beim nächsten Neuzeichnen (tpSetDauer) erhalten und steht im gespeicherten Plan (vorher verschwand sie). Seit v895 (Fehlerbild 7) speichert tpSetDauer außerdem verzögert von selbst.",
    schritte: [
      ["Training füllen", p => p.evaluate(async () => { await tpGenerate(); })],
      ["Picker: Hauptteil 1, Feld 1 neu wählen", p => p.evaluate(() => {
        const si = tpSlots.findIndex(s => tpIstHauptteil(s.typ)), sel = document.getElementById(`tp-form-${si}-0`);
        const neu = [...sel.options].map(o => o.value).filter(v => v !== "" && v !== sel.value)[2];
        tpPickerOpen(sel.id); tpPickerSet(Number(neu));
      })],
      ["Tausch gegen eine Torwart-Übung (außerhalb des Typfilters)", p => p.evaluate(() => {
        const si = tpSlots.findIndex(s => tpIstHauptteil(s.typ)), id = `tp-form-${si}-1`;
        const tw = tpAllForms().findIndex(f => f && f.kat === "torwart");
        tpUebungTausch(id, tw);
        return { feld: id, wert: document.getElementById(id).value === String(tw) };
      })],
      ["Dauer ändern (zeichnet neu) und Plan speichern", p => p.evaluate(async () => {
        const si = tpSlots.findIndex(s => tpIstHauptteil(s.typ));
        tpSetDauer(si, 15);
        const sel = document.getElementById(`tp-form-${si}-1`);
        await tpPlanSave(true);
        return { feldNachNeuzeichnen: sel ? sel.value : null };
      })]
    ] },

  { id: "G3-einklappen", titel: "Einklappen: tpKlapp, Alle einklappen, Block verschieben",
    haelt: "Fehlerbild 3 – behoben in v891: der Klappzustand wandert beim Verschieben mit dem Block mit (vorher blieb er am Index, danach war ein anderer Block offen). Der gespeicherte Körper hängt vom Klappen nicht ab.",
    schritte: (() => {
      const bild = () => [...document.querySelectorAll("#tp-timeline .tp-slot")].map(el => ({ si: Number(el.dataset.si), label: tpSlotName((tpSlots[Number(el.dataset.si)] || {}).label || ""),
        zu: el.classList.contains("tp-zu"), kurz: (el.querySelector(":scope > .tp-kurz") || {}).textContent || null }));
      const b = `(${bild.toString()})()`;
      return [
        ["Training füllen", p => p.evaluate(async () => { await tpGenerate(); })],
        ["Speichern (eingeklappt)", p => p.evaluate(async b => { await tpPlanSave(true); return eval(b); }, b)],
        ["Hauptteil 2 aufklappen", p => p.evaluate(b => { const si = tpSlots.findIndex(s => /Hauptteil 2/.test(s.label || "")); tpKlapp(si); return eval(b); }, b)],
        ["Alle aufklappen, dann alle einklappen", p => p.evaluate(b => { document.getElementById("tp-klapp-alle").click(); const a = eval(b); document.getElementById("tp-klapp-alle").click(); return { auf: a, zu: eval(b) }; }, b)],
        ["Speichern (nach dem Klappen)", p => p.evaluate(async () => { await tpPlanSave(true); })],
        ["Hauptteil 1 aufklappen und an die Stelle von Hauptteil 3 schieben", p => p.evaluate(b => {
          const h1 = tpSlots.findIndex(s => /^Hauptteil 1$/.test(s.label || "")), h3 = tpSlots.findIndex(s => /^Hauptteil 3$/.test(s.label || ""));
          tpKlapp(h1); const vor = eval(b);
          tpSlotVerschieben(h1, _tpKette().indexOf(h3));
          return { vor, nach: eval(b) };
        }, b)]
      ];
    })() },

  { id: "G4-weiterruecken", titel: "Weiterrücken: Versatz setzen und zurück, Durchgänge 1 → 3 → 2",
    haelt: "Ist-Zustand: tpVersatzSetzen und tpVersatzZurueck speichern sofort, Durchgänge verzögert; die Kette bekommt eine Zufallskennung (normalisiert).",
    schritte: [
      ["Training füllen", p => p.evaluate(async () => { await tpGenerate(); })],
      ["Hauptteil 2: weiterrücken (+1)", p => p.evaluate(() => { tpVersatzSetzen(tpSlots.findIndex(s => /^Hauptteil 2$/.test(s.label || "")), 1); })],
      ["Hauptteil 2: Versatz zurück", p => p.evaluate(() => { tpVersatzZurueck(tpSlots.findIndex(s => /^Hauptteil 2$/.test(s.label || ""))); })],
      ["Hauptteil 1: drei Durchgänge", p => p.evaluate(() => { tpDurchgaengeSetzen(tpSlots.findIndex(s => /^Hauptteil 1$/.test(s.label || "")), 3); return tpSlots.map(s => s.label); })],
      ["Hauptteil 1: zwei Durchgänge", p => p.evaluate(() => { tpDurchgaengeSetzen(tpSlots.findIndex(s => /^Hauptteil 1$/.test(s.label || "")), 2); return tpSlots.map(s => s.label); })]
    ] },

  { id: "G5-oeffnen-aus-der-db", titel: "Öffnen aus der Datenbank: Altbestand, Speichern; Termin A mit Plan, dann Termin B ohne Plan",
    haelt: "Fehlerbild 5 – behoben in v894: gespeicherte Einträge, die nicht (mehr) passen, bleiben beim Öffnen erhalten und werden wieder gespeichert: die Übung vom falschen Typ bleibt (mit Hinweis am Feld), die Dublette bleibt an ihrem Feld; alte `durchgaenge` binden Hauptteil 2 als Durchgang an, dessen eigene Übung (alleFelder) bleibt (vorher: falscher Typ fiel weg, Dublette rutschte ins nächste freie Feld, Hauptteil 2 bekam die Übung des Kopfes). Öffnen selbst schreibt nichts. Fehlerbild 6 – behoben in v892: ein Termin ohne Plan startet mit dem Grundgerüst (vorher übernahm er die Struktur samt Trainern, Haken und Kind des zuvor geöffneten und speicherte sie bei der ersten Änderung).",
    db: null,         // wird unten aus dem Altbestand gesetzt
    schritte: [
      ["Termin A öffnen (Altbestand)", p => p.evaluate(async d => {
        await tpTrainerRsvpLaden(d); await tpPlanRestore(d);
        return tpSlots.map((s, si) => ({ label: s.label, felder: [...document.querySelectorAll(`.tp-form-sel[id^="tp-form-${si}-"]`)].map(x => x.value === "" ? null : (tpAllForms()[+x.value] || {}).name || "?") }));
      }, DATUM)],
      ["Plan speichern", p => p.evaluate(async () => { await tpPlanSave(true); })],
      ["Termin B ohne Plan öffnen", p => p.evaluate(async d => {
        const f = document.getElementById("tp-date"); f.value = d;
        await tpTrainerRsvpLaden(d); await tpPlanRestore(d);
        return tpSlots.map(s => s.label);
      }, DATUM_B)],
      ["Termin B: Aufwärm-Übung von Hand wählen", p => p.evaluate(() => {
        const si = tpSlots.findIndex(s => s.typ === "warmup" && document.getElementById(`tp-form-${tpSlots.indexOf(s)}-0`));
        const sel = document.getElementById(`tp-form-${si}-0`);
        const neu = [...sel.options].map(o => o.value).find(v => v !== "");
        tpPickerOpen(sel.id); tpPickerSet(Number(neu));
      })]
    ] },

  { id: "G6-torwart-parallel", titel: "Torwart-Block parallel: anlegen, parallelZu, Haken ab, Trainer, Einzeltraining mit Kind",
    haelt: "Fehlerbild 7 (Nebenbefund) – behoben in v895: Block anlegen, „läuft parallel zu“, Torwart-Haken und Einzelkind speichern verzögert von selbst (vorher erst tpPlanSave(true)).",
    schritte: [
      ["Training füllen", p => p.evaluate(async () => { await tpGenerate(); })],
      ["Torwart-Block anlegen, parallel zu Hauptteil 1, Kind B abwählen", p => p.evaluate(() => {
        tpDoAddSlot("tw"); const tw = tpSlots.findIndex(s => s.typ === "tw");
        const ziel = tpSlots.findIndex(s => /^Hauptteil 1$/.test(s.label || ""));
        const ps = document.querySelector(`.tp-slot[data-si="${tw}"] select[onchange*="parallelZu"]`);
        ps.value = String(ziel); ps.dispatchEvent(new Event("change"));
        const haken = [...document.querySelectorAll(`.tp-tw-player[data-slot="${tw}"]`)];
        const b = haken.find(c => c.value === "Kind B"); if (b) { b.checked = false; b.dispatchEvent(new Event("change")); }   // v888: wie ein Trainer – mit Ereignis (die Brücke ist weg)
        return { tw, parallelZu: tpSlots[tw].parallelZu, haken: haken.map(c => c.value + ":" + c.checked) };
      })],
      ["Trainer an den Torwart-Block", p => p.evaluate(() => { const tw = tpSlots.findIndex(s => s.typ === "tw"); tpSetCoach(`tp-form-${tw}-0`, "Kenneth"); })],
      ["Torwart-Übung wählen", p => p.evaluate(() => { const tw = tpSlots.findIndex(s => s.typ === "tw"); const sel = document.getElementById(`tp-form-${tw}-0`); const v = [...sel.options].map(o => o.value).find(x => x !== ""); tpPickerOpen(sel.id); tpPickerSet(Number(v)); })],
      ["Einzeltraining mit Kind E", p => p.evaluate(() => {
        tpDoAddSlot("individual"); const ind = tpSlots.findIndex(s => s.typ === "individual");
        const sel = document.getElementById(`tp-ind-player-${ind}`); sel.value = "Kind E"; sel.dispatchEvent(new Event("change"));   // v888: onchange ruft tpKindSetzen und tpIndPlayerChange
        return { ind, parallelZu: tpSlots[ind].parallelZu };
      })],
      ["Plan speichern", p => p.evaluate(async () => { await tpPlanSave(true); })]
    ] },

  { id: "G7-material", titel: "Material: Zeile nach der Auswahl, eigene Angabe als PATCH auf kopf",
    haelt: "Ist-Zustand der Materialzeile (v867) und des PATCH-Körpers von tpMaterialEigen; kein bekanntes Fehlerbild.",
    schritte: [
      ["Training füllen", p => p.evaluate(async () => { await tpGenerate(); await new Promise(r => setTimeout(r, 0)); return { material: (document.getElementById("tp-material") || {}).textContent.replace(/\s+/g, " ").trim() }; })],
      ["Eigene Angabe eintragen", p => p.evaluate(async () => {
        window.frageText = async () => "2 Tore, 12 Hütchen, Leibchen";      // Attrappe für das Eingabefenster
        await tpMaterialEigen();
        return { material: (document.getElementById("tp-material") || {}).textContent.replace(/\s+/g, " ").trim() };
      })],
      ["Eigene Angabe leeren (Vorschlag zurück)", p => p.evaluate(async () => {
        window.frageText = async () => "";
        await tpMaterialEigen();
        return { material: (document.getElementById("tp-material") || {}).textContent.replace(/\s+/g, " ").trim() };
      })]
    ] },

  { id: "G8-puffer", titel: "Puffer: Gesamtzeile bei frei ≥ 9, 3–8, < 3 Minuten und nach Wechsel der Zieldauer",
    haelt: "Ist-Zustand der Puffer-Zeile (v868). Nebenbefund Fehlerbild 7 – behoben in v895: tpSetDauer und die Ziel-Dauer speichern verzögert von selbst (vorher nicht).",
    schritte: (() => {
      const zeile = () => { const z = [...document.querySelectorAll("#tp-timeline div")].find(d => d.querySelector(":scope > #tp-dauer"));
        return z ? [...z.childNodes].map(n => n.id === "tp-dauer" ? n.value : n.textContent).join("").replace(/\s+/g, " ").trim() : null; };
      const zt = `(${zeile.toString()})()`;
      const dauer = w => p => p.evaluate(({ zt, w }) => { const si = tpSlots.findIndex(s => s.typ === "abschluss"); tpSetDauer(si, w); return { abschluss: w, gesamt: eval(zt) }; }, { zt, w });
      return [
        ["Training füllen", p => p.evaluate(async zt => { await tpGenerate(); return { gesamt: eval(zt) }; }, zt)],
        ["Abschluss 5 Min. (frei ≥ 9)", dauer(5)],
        ["Abschluss 15 Min. (Puffer 3–8)", dauer(15)],
        ["Abschluss 20 Min. (Puffer genau 3)", dauer(20)],
        ["Abschluss 22 Min. (Puffer unter 3)", dauer(22)],
        ["Abschluss 23 Min. (kein Puffer)", dauer(23)],
        ["Zieldauer 90", p => p.evaluate(zt => { const d = document.getElementById("tp-dauer"); d.value = "90"; d.dispatchEvent(new Event("change")); return { gesamt: eval(zt) }; }, zt)],
        ["Plan speichern", p => p.evaluate(async () => { await tpPlanSave(true); })]
      ];
    })() },

  { id: "G9-feld-weglassen", titel: "Mittleres von drei Feldern weglassen",
    haelt: "Fehlerbild 1 – behoben in v889: beim Weglassen des mittleren Feldes rücken Trainer und Übungen gemeinsam nach (vorher nur die Trainer, Trainer und Übung passten danach nicht mehr zusammen).",
    schritte: [
      ["Training füllen", p => p.evaluate(async () => { await tpGenerate(); })],
      ["Hauptteil 1: drei Felder mit drei Trainern", p => p.evaluate(() => {
        const si = tpSlots.findIndex(s => /^Hauptteil 1$/.test(s.label || ""));
        ["Charles", "Finn", "Kenneth"].forEach((t, q) => tpSetCoach(`tp-form-${si}-${q}`, t));
        return [0, 1, 2].map(q => ({ feld: q, trainer: tpCoaches[`tp-form-${si}-${q}`], uebung: (tpAllForms()[+(document.getElementById(`tp-form-${si}-${q}`) || {}).value] || {}).name || null }));
      })],
      ["Feld 2 weglassen", p => p.evaluate(() => {
        const si = tpSlots.findIndex(s => /^Hauptteil 1$/.test(s.label || ""));
        tpFeldWeglassen(si, 1);
        return [0, 1, 2].map(q => ({ feld: q, trainer: tpCoaches[`tp-form-${si}-${q}`] || null, uebung: (tpAllForms()[+(document.getElementById(`tp-form-${si}-${q}`) || { value: "x" }).value] || {}).name || null }));
      })]
    ] },

  { id: "G10-loeschen-rueckgaengig", titel: "Block löschen und Rückgängig (Torwart-Block mit einem abgewählten Haken)",
    haelt: "Fehlerbild 2 – behoben in v890: Rückgängig stellt die Torwart-Haken so her, wie sie vor dem Löschen waren (vorher waren danach wieder alle angehakt).",
    schritte: [
      ["Training füllen, Torwart-Block mit Kind B abgewählt, speichern", p => p.evaluate(async () => {
        await tpGenerate();
        tpDoAddSlot("tw"); const tw = tpSlots.findIndex(s => s.typ === "tw");
        const b = document.querySelector(`.tp-tw-player[data-slot="${tw}"][value="Kind B"]`); if (b) { b.checked = false; b.dispatchEvent(new Event("change")); }   // v888: mit Ereignis
        tpSetCoach(`tp-form-${tw}-0`, "Kenneth");
        await tpPlanSave(true);
        return [...document.querySelectorAll(`.tp-tw-player[data-slot="${tw}"]`)].map(c => c.value + ":" + c.checked);
      })],
      ["Torwart-Block löschen", p => p.evaluate(() => { tpRemoveSlot(tpSlots.findIndex(s => s.typ === "tw")); return tpSlots.map(s => s.label); })],
      ["Rückgängig", p => p.evaluate(() => {
        const k = [...document.querySelectorAll("#undo-toast button")].find(x => /Rückgängig/.test(x.textContent)); if (k) k.click();
        const tw = tpSlots.findIndex(s => s.typ === "tw");
        return { labels: tpSlots.map(s => s.label), haken: [...document.querySelectorAll(`.tp-tw-player[data-slot="${tw}"]`)].map(c => c.value + ":" + c.checked) };
      })],
      ["Plan speichern", p => p.evaluate(async () => { await tpPlanSave(true); })]
    ] }
];

/* G5: Altbestand – Einträge ohne block/feld, mit station, alleFelder, alten durchgaenge, eine
   Dublette, eine Übung vom falschen Typ, Slots mit trainer/coaches/tw/kind. Kinder als kader.id. */
function altbestand() {
  const f = (name, extra) => ({ formIdx: 0, formName: name, trainer: "Alle", ...extra });
  return { [DATUM]: {
    slots: [
      { label: "Aufwärmen", dauer: 10, typ: "warmup" },
      { label: "Hauptteil 1", dauer: 12, typ: "main", durchgaenge: 2, coaches: ["Charles", "Finn", ""] },
      { label: "Hauptteil 2", dauer: 12, typ: "main" },
      { label: "Torwart", dauer: 12, typ: "tw", parallelZu: 2, trainer: "Kenneth", tw: [1] },
      { label: "Stationen", dauer: 15, typ: "spielform", stationen: 2 },
      { label: "Einzel", dauer: 15, typ: "individual", parallelZu: 4, kind: 5 },
      { label: "Abschlussspiel", dauer: 15, typ: "abschluss" }
    ],
    plan: [
      f("Warm up Adler", { slotLabel: "Aufwärmen" }),                                                         // ohne block/feld
      f("Passtor im Quadrat", { trainer: "Charles", slotLabel: "Hauptteil 1", block: 1, feld: 0 }),
      f("Passtor im Quadrat", { trainer: "Charles", slotLabel: "Hauptteil 1", block: 1, feld: 0 }),             // Dublette
      f("Adler TW – Einlaufen", { trainer: "Finn", slotLabel: "Hauptteil 1", block: 1, feld: 1 }),              // falscher Typ
      f("Stangentausch", { slotLabel: "Hauptteil 2", alleFelder: true }),
      f("FUNiño 3 gegen 1 – der Mittlere hat den Ball", { slotLabel: "Stationen", station: 0 }),
      f("Endzone und Fähnchen", { slotLabel: "Stationen", station: 1 }),
      f("Adler TW – Einlaufen", { slotLabel: "Torwart" }),
      f("Dribbling-Meister (1gg0)", { slotLabel: "Einzel" })
    ],
    gespeichert_von: "Charles", updated_at: "2030-02-20T18:00:00.000Z"
  } };
}
SZENARIEN.find(x => x.id === "G5-oeffnen-aus-der-db").db = altbestand();

module.exports = async function (h) {
  REPO = h.REPO;
  const titel = "4.8 Schritt 1 · Golden-Master Trainingsplan: zehn Abläufe speichern zeichengleich" + (SCHREIBEN ? " (Sollwerte neu geschrieben)" : "");
  const ergebnisse = new Array(SZENARIEN.length);
  let naechstes = 0;
  const arbeiter = async () => { for (;;) { const i = naechstes++; if (i >= SZENARIEN.length) return;
    try { ergebnisse[i] = await szenario(h, SZENARIEN[i]); } catch (e) { ergebnisse[i] = { id: SZENARIEN[i].id, ok: false, zeile: `${SZENARIEN[i].id}: Abbruch – ${String(e.message || e).split("\n")[0]}` }; } } };
  await Promise.all(Array.from({ length: Math.max(1, Number(process.env.GOLDEN_PARALLEL) || 3) }, arbeiter));
  return h.ergebnis(titel, ergebnisse.every(r => r && r.ok), ergebnisse.map(r => r ? r.zeile : "keine Meldung"));
};
/* v883: Abläufe und Seitenaufbau für den Prüffall v883-plan-wahl (Zustand = Seite nach jedem
   Schritt) – nur zum Mitbenutzen, die Sollwerte bleiben hier. */
module.exports.intern = { SZENARIEN, seite: (h, def) => { REPO = h.REPO; return seite(h, def); }, ruhe };
