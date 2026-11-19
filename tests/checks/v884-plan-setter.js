/* v884 · Bestandsaufnahme 4.8, Schritt 5: Die Schreibstellen laufen über die Setter.

   A) Quelltext: In den umgestellten Funktionen steht kein direktes `.value=` auf ein
      Übungs-Auswahlfeld und kein direktes Setzen oder Löschen der Marken data-station/-alle/-erbt
      mehr; sie schreiben über tpWahlSetzen, tpWahlWaehlen, tpWahlUmbenennen (Bündel) bzw.
      tpZustandLaden. Ausnahmen: die Projektion _tpWahlAufSeite und die Brücke. Erlaubt bleibt
      `.value=` an Torwart-Haken und Einzelkind (bis Schritt 6 im DOM; Fehlerbild 2 bleibt).
   B) tpZustandLaden rechnet das Öffnen aus G5 (Altbestand: block/feld, Dublette, falscher Typ,
      station, alleFelder, alte `durchgaenge`) OHNE gezeichnete Zeitleiste und bei gesperrtem DOM;
      nach dem anschließenden Zeichnen ergibt der Serialisierer denselben Körper wie der Sollwert G5
      („Plan speichern“).
   C) Die zehn Golden-Abläufe aus v877 (dieselben Schritte, ohne Sollwerte): nach jedem Schritt ist
      tpZustandPruefen() leer, und die Brücke (_tpDomNachziehen) hat nichts übernehmen müssen –
      sie zählt mit (_tpBrueckeZahl), erwartet 0. */
"use strict";
const fs = require("fs"), path = require("path");
const golden = require("./v877-trainingsplan-golden.js").intern;

const UMGESTELLT = {
  "boot.js": ["tpZustandLaden", "_tpPlanRestoreIntern", "tpPlanRestore", "_tpWahlGeladenZeigen", "tpGenerate", "tpAnpassenUebernehmen",
    "_tpKetteNachziehen", "_tpDurchgaengeKern", "tpDurchgaengeSetzen", "tpWarmMinus", "tpRemoveSlot", "tpSlotsNeuOrdnen",
    "_tpReihenfolgeAnwenden", "tpUebungTausch", "tpBetreuungTausch", "tpPickerSet", "tpAddRecoExercise", "tfInPlan",
    "tpIndPlayerChange", "tpOnCatChange", "tpWahlWaehlen", "_tpWahlFolgen"],
  "md-block.js": ["blockUebungenPruefen"]
};
/* Diese schreiben selbst (nicht nur über eine andere umgestellte Funktion) – sie müssen einen Setter nennen. */
const MUSS_SETTER = ["tpZustandLaden", "tpAnpassenUebernehmen", "_tpKetteNachziehen", "_tpDurchgaengeKern", "tpWarmMinus", "tpRemoveSlot",
  "_tpReihenfolgeAnwenden", "tpUebungTausch", "tpBetreuungTausch", "tpPickerSet", "tpAddRecoExercise", "tfInPlan", "tpIndPlayerChange",
  "tpOnCatChange", "tpWahlWaehlen", "tpGenerate", "blockUebungenPruefen"];
const SETTER = /\b(tpWahlSetzen|tpWahlWaehlen|tpWahlUmbenennen|_tpReihenfolgeAnwenden|tpZustandLaden)\(/;
const MARKE = [/dataset\.(station|alle|erbt)\s*=(?!=)/, /delete\s+[\w.$]*dataset\.(station|alle|erbt)/, /setAttribute\(\s*["'`]data-(station|alle|erbt)/, /removeAttribute\(\s*["'`]data-(station|alle|erbt)/];
const WERT = /\.value\s*=(?!=)/;
const WERT_ERLAUBT = /tp-ind-player|tp-tw-player|tw\[i\]/;      // Einzelkind und Torwart-Haken (Schritt 6)

/* Kommentare weg, Zeilen bleiben (Blockkommentare über mehrere Zeilen, Zeilenkommentare). */
const ohneKommentar = t => t.replace(/\/\*[\s\S]*?\*\//g, k => k.replace(/[^\n]/g, " ")).replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
/* Rumpf einer Funktion: von „function name(“ bis zur passenden Klammer (Vorlagen sind ausgeglichen). */
function rumpf(text, name) {
  const m = new RegExp(`(?:^|\\n)(?:async\\s+)?function\\s+${name.replace(/\$/g, "\\$")}\\s*\\(`).exec(text);
  if (!m) return null;
  let i = text.indexOf("{", m.index + m[0].length), tiefe = 0;
  for (let j = i; j < text.length; j++) {
    const c = text[j];
    if (c === "{") tiefe++;
    else if (c === "}") { tiefe--; if (!tiefe) return text.slice(m.index, j + 1); }
  }
  return null;
}

/* ── C: ein Golden-Ablauf mit Zähler der Brücke ── */
async function ablauf(h, def) {
  const s = await golden.seite(h, def);
  const p = s.page, zeilen = [];
  try {
    const start = await p.evaluate(() => ({ zahl: _tpBrueckeZahl, log: _tpBrueckeLog.slice(), pruefen: tpZustandPruefen() }));
    if (start.zahl) zeilen.push(`Aufbau: Brücke ${start.zahl}× (${start.log.slice(-3).join(", ")})`);
    start.pruefen.forEach(x => zeilen.push(`Aufbau: ${x}`));
    let summe = start.zahl;
    for (const [name, tun] of def.schritte) {
      const vor = await p.evaluate(() => _tpBrueckeZahl);
      await tun(p, s);
      await golden.ruhe(s);
      const r = await p.evaluate(() => ({ zahl: _tpBrueckeZahl, log: _tpBrueckeLog.slice(), pruefen: tpZustandPruefen() }));
      const d = r.zahl - vor; summe += d;
      if (d) zeilen.push(`nach „${name}“: Brücke ${d}× (${r.log.slice(-Math.min(d, 3)).join(", ")})`);
      r.pruefen.forEach(x => zeilen.push(`nach „${name}“: ${x}`));
    }
    return { id: def.id, ok: !zeilen.length, schritte: def.schritte.length, bruecke: summe, zeilen, fehler: s.fehler() };
  } catch (e) {
    return { id: def.id, ok: false, schritte: def.schritte.length, bruecke: null, zeilen: zeilen.concat([`Abbruch – ${String(e.message || e).split("\n")[0]}`]), fehler: s.fehler() };
  } finally { await s.schliessen(); }
}

/* Kettenkennungen wie im Golden-Master normalisieren (k1, k2 … in der Reihenfolge des Auftretens). */
function ketten(x, karte = {}) {
  if (Array.isArray(x)) return x.map(y => ketten(y, karte));
  if (x && typeof x === "object") {
    const o = {};
    Object.keys(x).forEach(k => {
      if (k === "kette" && typeof x[k] === "string") { if (!(x[k] in karte)) karte[x[k]] = "k" + (Object.keys(karte).length + 1); o[k] = karte[x[k]]; }
      else o[k] = ketten(x[k], karte);
    });
    return o;
  }
  return x;
}

module.exports = async function (h) {
  const titel = "4.8 Schritt 5 · Schreibstellen über die Setter: Quelltext, Öffnen ohne Seite (G5), Brücke in den Golden-Abläufen ungenutzt";
  const zeilen = []; let ok = true;
  const pruef = (bed, text) => { zeilen.push((bed ? "✓ " : "✗ ") + text); if (!bed) ok = false; };

  /* ── A: Quelltext ── */
  const funde = [], ohneSetter = [], fehlt = [];
  let gezaehlt = 0;
  Object.keys(UMGESTELLT).forEach(datei => {
    const text = fs.readFileSync(path.join(h.REPO, datei), "utf8");
    UMGESTELLT[datei].forEach(name => {
      const r = rumpf(text, name);
      if (!r) { fehlt.push(`${datei}: ${name}`); return; }
      gezaehlt++;
      ohneKommentar(r).split("\n").forEach((z, n) => {
        const code = z;
        if (MARKE.some(re => re.test(code))) funde.push(`${name}, Zeile ${n + 1}: Marke direkt gesetzt – ${code.trim().slice(0, 90)}`);
        if (WERT.test(code) && !WERT_ERLAUBT.test(code)) funde.push(`${name}, Zeile ${n + 1}: .value= – ${code.trim().slice(0, 90)}`);
        if (/\btpOnSelectChange\(/.test(code) && name !== "tpOnSelectChange") funde.push(`${name}, Zeile ${n + 1}: Weg über das Auswahlfeld (tpOnSelectChange)`);
      });
      if (MUSS_SETTER.includes(name) && !SETTER.test(r)) ohneSetter.push(name);
    });
    /* In der ganzen Datei setzt nur die Projektion Marken. */
    const projektion = rumpf(text, "_tpWahlAufSeite") || "";
    const ohneProjektion = text.replace(projektion, "");
    ohneKommentar(ohneProjektion).split("\n").forEach((z, n) => {
      const code = z;
      if (MARKE.some(re => re.test(code)) && !/tp-coach-sel/.test(code)) funde.push(`${datei}: Marke außerhalb der Projektion – ${code.trim().slice(0, 90)}`);
      if (/getElementById\(\s*[`'"]tp-form-[^)]*\)\s*\.value\s*=(?!=)/.test(code)) funde.push(`${datei}: .value= auf ein Auswahlfeld – ${code.trim().slice(0, 90)}`);
    });
  });
  pruef(!fehlt.length && gezaehlt > 20, `Quelltext: ${gezaehlt} umgestellte Funktionen gefunden${fehlt.length ? " · fehlt: " + fehlt.join(", ") : ""}`);
  pruef(!funde.length, `Quelltext: kein .value= auf Übungs-Auswahlfelder, keine Marken außerhalb der Projektion, kein Umweg über tpOnSelectChange${funde.length ? " · " + funde.slice(0, 4).join(" | ") : ""}`);
  pruef(!ohneSetter.length, `Quelltext: die schreibenden Funktionen nennen einen Setter${ohneSetter.length ? " · ohne: " + ohneSetter.join(", ") : ""}`);

  /* ── B: tpZustandLaden ohne Seite, dann zeichnen = G5 ── */
  const g5 = golden.SZENARIEN.find(x => x.id === "G5-oeffnen-aus-der-db");
  const datum = Object.keys(g5.db)[0], alt = g5.db[datum];
  const soll = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "golden", "trainingsplan", "G5-oeffnen-aus-der-db.json"), "utf8"));
  const sollKoerper = ((soll.schritte.find(x => x.schritt === "Plan speichern") || {}).gesendet || [])[0];
  {
    const s = await golden.seite(h, g5);
    try {
      const b = await s.page.evaluate(({ slots, plan }) => {
        const out = {};
        let zeichnungen = 0; const orig = window._tpRenderTimelineIntern;
        window._tpRenderTimelineIntern = function () { zeichnungen++; return orig.apply(this, arguments); };
        /* keine gezeichnete Zeitleiste, kein Zustand vom Aufbau */
        document.getElementById("tp-timeline").innerHTML = "";
        tpSlots.length = 0; tpCoaches = {}; Object.keys(TP_ZUSTAND.wahl).forEach(k => delete TP_ZUSTAND.wahl[k]); _tpWahlOffen.clear();
        const ziele = [[Document.prototype, ["querySelector", "querySelectorAll", "getElementById", "getElementsByClassName", "getElementsByTagName", "getElementsByName", "createElement"]],
          [Element.prototype, ["querySelector", "querySelectorAll", "getElementsByClassName", "getElementsByTagName", "closest", "matches", "insertAdjacentHTML", "appendChild"]]];
        const sicher = []; let zugriff = 0, fehler = null, info = null;
        ziele.forEach(([o, namen]) => namen.forEach(n => { sicher.push([o, n, o[n]]); o[n] = function () { zugriff++; throw new Error("DOM-Zugriff: " + n); }; }));
        /* Gegenprobe der Sperre: das Zeichnen selbst bricht darunter ab */
        let sperreGreift = false; try { _tpAlleFelder(); document.getElementById("tp-timeline"); } catch (e) { sperreGreift = true; }
        const zugriffVorher = zugriff;
        try { info = tpZustandLaden(slots, plan); } catch (e) { fehler = String(e.message || e); }
        finally { sicher.forEach(([o, n, f]) => { o[n] = f; }); }
        out.sperre = sperreGreift; out.zugriff = zugriff - zugriffVorher; out.fehler = fehler;
        out.zeichnungenDabei = zeichnungen;
        out.ohneSeite = { selects: document.querySelectorAll(".tp-form-sel").length, wahl: Object.values(TP_ZUSTAND.wahl).filter(w => w.i != null).length,
          slots: tpSlots.length, kette: tpSlots.filter(x => x.kette).length, durchgaenge: tpSlots.filter(x => x.durchgaenge).length };
        tpRenderTimeline();
        if (info) _tpTwKindAnwenden(slots, info.index);
        out.pruefen = tpZustandPruefen();
        out.koerper = { plan: tpPlanEntries(), slots: tpSlotsMitZuordnung() };
        window._tpRenderTimelineIntern = orig;
        return out;
      }, { slots: alt.slots, plan: alt.plan });
      pruef(b.sperre && !b.fehler && b.zugriff === 0 && b.zeichnungenDabei === 0,
        `tpZustandLaden bei gesperrtem DOM: ${b.zugriff} Zugriffe, ${b.zeichnungenDabei} Zeichnungen${b.fehler ? " · " + b.fehler : ""}${b.sperre ? "" : " · Sperre greift nicht"}`);
      pruef(b.ohneSeite.selects === 0 && b.ohneSeite.wahl > 0 && b.ohneSeite.kette === 2 && !b.ohneSeite.durchgaenge,
        `ohne Zeitleiste gerechnet: ${b.ohneSeite.wahl} Felder gewählt, ${b.ohneSeite.selects} Auswahlfelder, alte Durchgänge → Kette (${b.ohneSeite.kette} Glieder)`);
      const ist = JSON.stringify(ketten(b.koerper)), sollK = sollKoerper ? JSON.stringify(ketten({ plan: sollKoerper.body.plan, slots: sollKoerper.body.slots })) : null;
      let abw = ""; if (sollK && ist !== sollK) { let i = 0; while (ist[i] === sollK[i]) i++; abw = ` · ab Zeichen ${i}: soll „${sollK.slice(Math.max(0, i - 50), i + 70)}“ · ist „${ist.slice(Math.max(0, i - 50), i + 70)}“`; }
      pruef(!!sollK && ist === sollK && !b.pruefen.length,
        `nach dem Zeichnen: Serialisierer = Sollwert G5 „Plan speichern“ (${b.koerper.plan.length} Einträge, ${b.koerper.slots.length} Blöcke)${abw}${b.pruefen.length ? " · " + b.pruefen[0] : ""}`);
      const fe = s.fehler();
      pruef(!fe.length, `B: keine Fehler in der Konsole${fe.length ? " · " + fe[0] : ""}`);
    } catch (e) {
      pruef(false, "B: Abbruch – " + String(e.message || e).split("\n")[0]);
    } finally { await s.schliessen(); }
  }

  /* ── C: die zehn Golden-Abläufe ── */
  const liste = golden.SZENARIEN, erg = new Array(liste.length);
  let naechstes = 0;
  const arbeiter = async () => { for (;;) { const i = naechstes++; if (i >= liste.length) return; erg[i] = await ablauf(h, liste[i]); } };
  await Promise.all(Array.from({ length: Math.max(1, Number(process.env.GOLDEN_PARALLEL) || 3) }, arbeiter));
  let summe = 0;
  erg.forEach(r => {
    summe += r.bruecke || 0;
    pruef(r.ok, `${r.id}: ${r.schritte} Schritte – Seite = Zustand, Brücke ${r.bruecke == null ? "?" : r.bruecke}×${r.zeilen.length ? " · " + r.zeilen.slice(0, 3).join(" | ") : ""}`);
    if (r.fehler && r.fehler.length) pruef(false, `${r.id}: Fehler in der Konsole · ${r.fehler[0]}`);
  });
  pruef(summe === 0, `Brücke in allen zehn Abläufen: ${summe} Übernahmen (erwartet 0)`);
  return h.ergebnis(titel, ok, zeilen);
};
