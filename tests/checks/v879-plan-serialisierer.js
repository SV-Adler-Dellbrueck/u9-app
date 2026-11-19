/* v879 · Bestandsaufnahme 4.8, Schritt 2: reiner Serialisierer des Trainingsplans.

   tpPlanAusZustand(z) und tpSlotsAusZustand(z) rechnen den gespeicherten Plan aus einem
   Zustandsobjekt – ohne DOM. _tpZustandAusDom() liest den Zustand vorerst aus der Seite (Brücke).

   A) Von Hand gebauter Zustand, keine gezeichnete Zeitleiste, DOM während des Aufrufs gesperrt
      (querySelector*, getElementById werfen): ein Torwart-Block (Slot 4) läuft parallel zu
      Hauptteil 1 und steht in der Dokumentreihenfolge direkt darunter, ein Einzelblock (Slot 5)
      unter Hauptteil 2; ein Feld mit Station, zwei mit alleFelder, ein leeres Feld, ein Einzelkind.
      Verglichen wird als Zeichenkette (Reihenfolge der Einträge und der Schlüssel zählt), dazu
      Schlüsselreihenfolge, coaches, tw und kind einzeln.
   B) Gezeichneter Plan (Vorlage mit Torwart-Station, Torwart-Block mit abgewähltem Haken,
      Einzeltraining mit Kind, Trainer je Feld, Vorlagen-Marken an zwei Feldern): die neue
      Implementierung liefert als Zeichenkette genau das, was die alte (Kopie unten, Stand v877)
      geliefert hätte – in mehreren Zuständen. */
"use strict";
const fs = require("fs"), path = require("path");

const DATUM = "2030-03-05", JETZT = "2030-03-01T09:00:00";
const TRAINER3 = ["Charles", "Finn", "Kenneth"];

/* ── Die alte Implementierung (boot.js v877), wörtlich – nur als Vergleich ── */
function altPlanEntries(){
  const allForms=tpAllForms();
  const trainers=tpGetCheckedTrainers();
  const entries=[];
  document.querySelectorAll(".tp-form-sel").forEach(s=>{
    if(!s.value)return;
    const match=s.id.match(/tp-form-(\d+)-(\d+)/);
    if(!match)return;
    const slotIdx=parseInt(match[1]);
    const groupIdx=parseInt(match[2]);
    const slot=tpSlots[slotIdx];
    const typ=slot?.typ||"main";
    const noGrp=typ==="warmup"||typ==="abschluss"||typ==="turnier"||typ==="tw";
    const trainer=noGrp?"Alle":(tpCoaches[s.id]||trainers[groupIdx]||`Trainer ${groupIdx+1}`);
    const formIdx=parseInt(s.value);
    const formName=allForms[formIdx]?.name||"?";
    const eintrag={formIdx,formName,trainer,slotLabel:slot?.label||"",key:`${formIdx}-${trainer}`,block:slotIdx,feld:groupIdx};
    if(s.dataset.station!=null&&s.dataset.station!=="")eintrag.station=Number(s.dataset.station);
    if(s.dataset.alle==="1")eintrag.alleFelder=true;
    entries.push(eintrag);
  });
  return entries;
}
function altSlotsMitZuordnung(){
  const ids=arr=>(typeof kidListToIds==="function")?kidListToIds(arr):arr;
  const id=n=>{const k=(typeof kidId==="function")?kidId(n):null; return k!=null?k:n;};
  return tpSlots.map((s,si)=>{
    const o={...s}; delete o.coaches; delete o.trainer; delete o.tw; delete o.kind;
    const typ=s.typ||"main";
    if(tpKannParallel(typ)){
      const t=tpCoaches[`tp-form-${si}-0`]; if(t)o.trainer=t;
      if(typ==="tw"){const an=[...document.querySelectorAll(`.tp-tw-player[data-slot="${si}"]`)]; if(an.length)o.tw=ids(an.filter(c=>c.checked).map(c=>c.value));}
      else{const k=document.getElementById(`tp-ind-player-${si}`)?.value; if(k)o.kind=id(k);}
    }else if(tpIstHauptteil(typ)){
      const c=[]; document.querySelectorAll(`.tp-form-sel[id^="tp-form-${si}-"]`).forEach((sel,p)=>{c[p]=tpCoaches[sel.id]||"";});
      if(c.some(Boolean))o.coaches=c;
    }
    return o;
  });
}

/* ── A: von Hand gebauter Zustand und was herauskommen muss ── */
const ZUSTAND = {
  slots: [
    { label: "Aufwärmen", dauer: 10, typ: "warmup" },
    { label: "Hauptteil 1", dauer: 12, typ: "main", coaches: ["alt"] },
    { label: "Hauptteil 2", dauer: 12, typ: "main", coaches: ["alt", "alt"] },
    { label: "Abschluss", dauer: 10, typ: "abschluss" },
    { label: "Torwart", dauer: 12, typ: "tw", parallelZu: 1, trainer: "alt", tw: [9], kind: 9 },
    { label: "Einzel", dauer: 12, typ: "individual", parallelZu: 2 }
  ],
  coaches: { "tp-form-1-0": "Finn", "tp-form-1-2": "Kenneth", "tp-form-4-0": "Kenneth", "tp-form-5-0": "Charles" },
  trainer: ["Charles"],
  formen: [{ name: "Übung 0" }, { name: "Übung 1" }, { name: "Übung 2" }, { name: "Übung 3" }, { name: "Übung 4" }, { name: "Übung 5" }, { name: "Übung 6" }],
  felder: [                                                     // Dokumentreihenfolge: parallele Blöcke unter ihrem Hauptteil
    { id: "tp-form-0-0", wert: "0" },
    { id: "tp-form-1-0", wert: "1" },
    { id: "tp-form-1-1", wert: "2", station: "1" },
    { id: "tp-form-1-2", wert: "" },
    { id: "tp-form-4-0", wert: "3" },
    { id: "tp-form-2-0", wert: "4", alle: "1" },
    { id: "tp-form-2-1", wert: "4", alle: "1" },
    { id: "tp-form-5-0", wert: "5" },
    { id: "tp-form-3-0", wert: "99" }
  ],
  tw: { 4: ["Kind A"] },
  kind: { 5: "Kind E" }
};
const SOLL_PLAN = [
  { formIdx: 0, formName: "Übung 0", trainer: "Alle", slotLabel: "Aufwärmen", key: "0-Alle", block: 0, feld: 0 },
  { formIdx: 1, formName: "Übung 1", trainer: "Finn", slotLabel: "Hauptteil 1", key: "1-Finn", block: 1, feld: 0 },
  { formIdx: 2, formName: "Übung 2", trainer: "Trainer 2", slotLabel: "Hauptteil 1", key: "2-Trainer 2", block: 1, feld: 1, station: 1 },
  { formIdx: 3, formName: "Übung 3", trainer: "Alle", slotLabel: "Torwart", key: "3-Alle", block: 4, feld: 0 },
  { formIdx: 4, formName: "Übung 4", trainer: "Charles", slotLabel: "Hauptteil 2", key: "4-Charles", block: 2, feld: 0, alleFelder: true },
  { formIdx: 4, formName: "Übung 4", trainer: "Trainer 2", slotLabel: "Hauptteil 2", key: "4-Trainer 2", block: 2, feld: 1, alleFelder: true },
  { formIdx: 5, formName: "Übung 5", trainer: "Charles", slotLabel: "Einzel", key: "5-Charles", block: 5, feld: 0 },
  { formIdx: 99, formName: "?", trainer: "Alle", slotLabel: "Abschluss", key: "99-Alle", block: 3, feld: 0 }
];
const SOLL_SLOTS = [
  { label: "Aufwärmen", dauer: 10, typ: "warmup" },
  { label: "Hauptteil 1", dauer: 12, typ: "main", coaches: ["Finn", "", "Kenneth"] },
  { label: "Hauptteil 2", dauer: 12, typ: "main" },
  { label: "Abschluss", dauer: 10, typ: "abschluss" },
  { label: "Torwart", dauer: 12, typ: "tw", parallelZu: 1, trainer: "Kenneth", tw: [1] },
  { label: "Einzel", dauer: 12, typ: "individual", parallelZu: 2, trainer: "Charles", kind: 5 }
];

const BIB = REPO => JSON.parse(fs.readFileSync(path.join(REPO, "uebungen/bibliothek.json"), "utf8"));
const VOR = REPO => JSON.parse(fs.readFileSync(path.join(REPO, "uebungen/vorlagen.json"), "utf8"));
function testVorlage(REPO) {
  const l48 = (VOR(REPO).vorlagen || []).find(v => String(v.name || "").startsWith("L4-8"));
  const v = JSON.parse(JSON.stringify(l48));
  v.name = "Prüffall – drei Felder mit Torwart-Station"; v.id = 702;
  const h1 = v.bloecke.find(b => Array.isArray(b.stationen));
  h1.stationen = h1.stationen.concat([{ rolle: "tw", uebung_name: "Adler TW – Einlaufen" }]);
  return v;
}

module.exports = async function (h) {
  const REPO = h.REPO;
  const titel = "4.8 Schritt 2 · Trainingsplan speichert aus einem Zustand (reiner Serialisierer, zeichengleich zur alten Fassung)";
  const zeilen = []; let ok = true;
  const pruef = (bed, text) => { zeilen.push((bed ? "✓ " : "✗ ") + text); if (!bed) ok = false; };

  const kader = h.kaderZeilen(); kader[1].tw = true;
  const termin = { id: 1, datum: DATUM, typ: "training", uhrzeit: "17:00", uhrzeit_ende: "18:15", trainer_status: Object.fromEntries(TRAINER3.map(t => [t, "ja"])) };
  const s = await h.starten({ jetzt: JETZT, hoehe: 2400, warten: 1500, supabase: h.supabaseAttrappe({
    kader, nominierungen: [], anwesenheit: [], rueckmeldungen: [], periodisierung: [],
    termine: [termin],
    trainingsformen: (BIB(REPO).uebungen || []).map((u, i) => ({ ...u, id: 6000 + i, custom: true })),
    trainingsvorlagen: [testVorlage(REPO)],
    trainingsgruppen: [], trainingsplan: []
  }) });
  try {
    const p = s.page;
    await p.waitForFunction(() => typeof loadKader === "function" && typeof tpPlanRestore === "function", null, { timeout: 30000 });
    const da = await p.evaluate(() => ({ plan: typeof tpPlanAusZustand, slots: typeof tpSlotsAusZustand, dom: typeof _tpZustandAusDom }));
    pruef(da.plan === "function" && da.slots === "function" && da.dom === "function", `tpPlanAusZustand/tpSlotsAusZustand/_tpZustandAusDom vorhanden (${da.plan}/${da.slots}/${da.dom})`);
    await p.evaluate(async () => { await loadKader(); });

    /* ── A ── */
    const a = await p.evaluate(z => {
      const zellen = document.querySelectorAll(".tp-form-sel").length;
      const orig = { qs: document.querySelector, qsa: document.querySelectorAll, gid: document.getElementById };
      let zugriff = 0;
      const sperre = function () { zugriff++; throw new Error("DOM-Zugriff im Serialisierer"); };
      let plan, slots, fehler = null;
      document.querySelector = document.querySelectorAll = document.getElementById = sperre;
      try { plan = tpPlanAusZustand(z); slots = tpSlotsAusZustand(z); } catch (e) { fehler = String(e.message || e); }
      finally { document.querySelector = orig.qs; document.querySelectorAll = orig.qsa; document.getElementById = orig.gid; }
      return { zellen, zugriff, fehler, plan: JSON.stringify(plan), slots: JSON.stringify(slots),
        schluessel: (plan || []).map(e => Object.keys(e).join(",")), slotSchluessel: (slots || []).map(o => Object.keys(o).join(",")),
        unveraendert: JSON.stringify(z.slots[4]) };
    }, ZUSTAND);
    pruef(a.zellen === 0, `A: keine gezeichnete Zeitleiste (${a.zellen} Auswahlfelder)`);
    pruef(!a.fehler && a.zugriff === 0, `A: kein DOM-Zugriff während der Serialisierung (${a.zugriff} Zugriffe${a.fehler ? ", " + a.fehler : ""})`);
    pruef(a.plan === JSON.stringify(SOLL_PLAN), `A: Plan zeichengleich zum Soll (Reihenfolge 0,1,1,4,2,2,5,3 – Torwart direkt unter Hauptteil 1)${a.plan === JSON.stringify(SOLL_PLAN) ? "" : " · ist " + a.plan}`);
    const sollKeys = "formIdx,formName,trainer,slotLabel,key,block,feld";
    pruef(a.schluessel.length === 8 && a.schluessel.every((k, i) => k === sollKeys + (i === 2 ? ",station" : (i === 4 || i === 5) ? ",alleFelder" : "")),
      `A: Schlüsselreihenfolge ${sollKeys}[,station][,alleFelder]`);
    pruef(a.slots === JSON.stringify(SOLL_SLOTS), `A: Slots zeichengleich (coaches ["Finn","","Kenneth"] in Länge der Felderzahl, alte coaches entfernt, tw [1], kind 5)${a.slots === JSON.stringify(SOLL_SLOTS) ? "" : " · ist " + a.slots}`);
    pruef(a.slotSchluessel[4] === "label,dauer,typ,parallelZu,trainer,tw" && a.slotSchluessel[5] === "label,dauer,typ,parallelZu,trainer,kind",
      `A: Anhängereihenfolge trainer, dann tw bzw. kind (${a.slotSchluessel[4]} · ${a.slotSchluessel[5]})`);
    pruef(a.unveraendert === JSON.stringify(ZUSTAND.slots[4]), "A: Zustand selbst bleibt unverändert");

    /* ── B: gezeichneter Plan ── */
    await h.sichtbarMachen(p, "#train-sub-planung"); await h.sichtbarMachen(p, "#tp-timeline");
    await p.evaluate(async d => {
      if (typeof loadCustomForms === "function") await loadCustomForms();
      if (typeof vorlagenLaden === "function") await vorlagenLaden();
      const f = document.getElementById("tp-date");
      if (![...f.options].some(o => o.value === d)) f.add(new Option(d, d));
      f.value = d;
      await tpTrainerRsvpLaden(d); await tpPlanRestore(d);
    }, DATUM);
    const vergleich = async name => {
      const r = await p.evaluate(({ ap, as }) => {
        const altP = (0, eval)("(" + ap + ")"), altS = (0, eval)("(" + as + ")");
        const z = _tpZustandAusDom();
        const neuP = JSON.stringify(tpPlanAusZustand(z)), neuS = JSON.stringify(tpSlotsAusZustand(z));
        return { gleichP: neuP === JSON.stringify(altP()), gleichS: neuS === JSON.stringify(altS()),
          gleichWrapper: JSON.stringify(tpPlanEntries()) === neuP && JSON.stringify(tpSlotsMitZuordnung()) === neuS,
          n: JSON.parse(neuP).length, station: neuP.includes('"station":'), alle: neuP.includes('"alleFelder":true'),
          tw: /"tw":\[/.test(neuS), kind: /"kind":/.test(neuS), coaches: /"coaches":\[/.test(neuS), neuP, altP: JSON.stringify(altP()) };
      }, { ap: altPlanEntries.toString(), as: altSlotsMitZuordnung.toString() });
      pruef(r.gleichP && r.gleichS && r.gleichWrapper, `B ${name}: neu = alt als Zeichenkette (Plan ${r.n} Einträge${r.station ? ", station" : ""}${r.alle ? ", alleFelder" : ""}; Slots${r.coaches ? " coaches" : ""}${r.tw ? " tw" : ""}${r.kind ? " kind" : ""})${r.gleichP ? "" : " · neu " + r.neuP.slice(0, 200) + " · alt " + r.altP.slice(0, 200)}`);
      return r;
    };
    await p.evaluate(async () => { _vuAuswahl = 702; await vorlageUebernehmenSetzen(); });
    await p.waitForFunction(() => document.querySelectorAll(".tp-form-sel").length > 3, null, { timeout: 15000 });
    await vergleich("nach Vorlage mit Torwart-Station");
    const r2 = await (async () => {
      await p.evaluate(() => {
        const h1 = tpSlots.findIndex(s => tpIstHauptteil(s.typ));
        tpSetCoach(`tp-form-${h1}-0`, "Finn"); tpSetCoach(`tp-form-${h1}-2`, "Kenneth");
        tpDoAddSlot("tw"); const tw = tpSlots.findIndex(s => s.typ === "tw");
        const ps = document.querySelector(`.tp-slot[data-si="${tw}"] select[onchange*="parallelZu"]`);
        if (ps) { ps.value = String(h1); ps.dispatchEvent(new Event("change")); }
        const b = document.querySelector(`.tp-tw-player[data-slot="${tw}"][value="Kind B"]`); if (b) b.checked = false;
        tpSetCoach(`tp-form-${tw}-0`, "Kenneth");
        tpDoAddSlot("individual"); const ind = tpSlots.findIndex(s => s.typ === "individual");
        const sel = document.getElementById(`tp-ind-player-${ind}`); sel.value = "Kind E"; tpIndPlayerChange(ind);
        /* Vorlagen-Marken an zwei Feldern, wie sie das Öffnen eines Vorlagen-Plans setzt */
        const felder = [...document.querySelectorAll(".tp-form-sel")].filter(x => x.value);
        if (felder[1]) felder[1].dataset.station = "2";
        if (felder[2]) felder[2].dataset.alle = "1";
      });
      return vergleich("mit Torwart-Block (Haken ab), Einzelkind, Trainern, Marken");
    })();
    pruef(r2.station && r2.alle && r2.tw && r2.kind && r2.coaches, "B: der Vergleich deckt station, alleFelder, coaches, tw und kind ab");
    await p.evaluate(async () => { await tpGenerate(); });
    await p.waitForFunction(() => typeof _tpRestoring === "undefined" || _tpRestoring === false, null, { timeout: 10000 }).catch(() => {});
    await vergleich("nach „Training füllen“");
    const fehler = s.fehler();
    pruef(!fehler.length, `keine Fehler in der Konsole${fehler.length ? " · " + fehler[0] : ""}`);
  } catch (e) {
    pruef(false, "Abbruch – " + String(e.message || e).split("\n")[0]);
  } finally {
    await s.schliessen();
  }
  return h.ergebnis(titel, ok, zeilen);
};
