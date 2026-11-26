/* v881 · Bestandsaufnahme 4.8, Schritt 3: Felderzahl, Reihenfolge und Torwart-Angebot aus dem Modell.

   tpFelderZahl(si), _tpRenderReihe() und tpTwAngebot(si) rechnen ohne DOM; das Zeichnen nutzt sie
   selbst. Geprüft wird NACH JEDEM ZEICHNEN (die Prüfung hängt sich an _tpRenderTimelineIntern):
     – tpFelderZahl(si) = Zahl der Auswahlfelder tp-form-<si>-<p> auf der Seite, für jeden Block
     – _tpRenderReihe() = Reihenfolge der Blöcke (.tp-slot[data-si]) auf der Seite
     – tpTwAngebot(si)  = angebotene Torwart-Haken (.tp-tw-player[data-slot=si]) in Reihenfolge
     – dieselben drei Ergebnisse bei gesperrtem DOM (alle Abfragefunktionen werfen)
   Situationen auf zwei Seiten: „viele Kinder“ (15 Kinder, drei Trainer, zwei Torhüter und ein
   ausgetragener) mit drei Vorlagen (freies Fenster, Torwart-Block in der Vorlage, Torwart-Station),
   „Training füllen“, Torwart-Block parallel mit Trainer, Einzeltraining mit Kind, Feld weglassen,
   weiterrücken, Durchgänge, vier Gruppen bei drei Trainern, Block verschieben, löschen und
   Rückgängig; „wenige Kinder“ (vier Kinder, ein Trainer) mit festen Sollwerten, damit die Prüfung
   nicht nur Seite gegen Funktion vergleicht, die das Zeichnen selbst benutzt. */
"use strict";
const fs = require("fs"), path = require("path");

const DATUM = "2030-03-05", JETZT = "2030-03-01T09:00:00";

const BIB = REPO => JSON.parse(fs.readFileSync(path.join(REPO, "uebungen/bibliothek.json"), "utf8"));
const VOR = REPO => JSON.parse(fs.readFileSync(path.join(REPO, "uebungen/vorlagen.json"), "utf8"));
function testVorlagen(REPO) {
  const alle = VOR(REPO).vorlagen || [];
  const nach = k => JSON.parse(JSON.stringify(alle.find(v => String(v.name || "").startsWith(k))));
  const tw = nach("L4-8");
  tw.name = "Prüffall – drei Felder mit Torwart-Station";
  const h1 = tw.bloecke.find(b => Array.isArray(b.stationen));
  h1.stationen = h1.stationen.concat([{ rolle: "tw", uebung_name: "Adler TW – Einlaufen" }]);
  return [nach("L1-1"), nach("L3-1"), tw].map((v, i) => ({ ...v, id: 800 + i }));
}

/* Läuft in der Seite: hängt die Prüfung an jedes Zeichnen. */
function haken() {
  const aufnahme = () => {
    const tl = document.getElementById("tp-timeline");
    const reihe = [...tl.querySelectorAll(".tp-slot")].map(el => Number(el.dataset.si));
    const felder = tpSlots.map((s, si) => [...tl.querySelectorAll(".tp-form-sel")].filter(x => new RegExp(`^tp-form-${si}-\\d+$`).test(x.id)).length);
    const tw = tpSlots.map((s, si) => [...tl.querySelectorAll(".tp-tw-player")].filter(c => c.dataset.slot === String(si)).map(c => c.value));
    return { reihe, felder, tw };
  };
  const modell = () => ({ reihe: _tpRenderReihe(), felder: tpSlots.map((s, si) => tpFelderZahl(si)), tw: tpSlots.map((s, si) => tpTwAngebot(si).map(k => k.name)) });
  const gesperrt = () => {
    const ziele = [[Document.prototype, ["querySelector", "querySelectorAll", "getElementById", "getElementsByClassName", "getElementsByTagName", "getElementsByName"]],
      [Element.prototype, ["querySelector", "querySelectorAll", "getElementsByClassName", "getElementsByTagName", "closest", "matches"]]];
    const alt = []; let zugriff = 0, fehler = null, m = null;
    ziele.forEach(([o, namen]) => namen.forEach(n => { alt.push([o, n, o[n]]); o[n] = function () { zugriff++; throw new Error("DOM-Zugriff: " + n); }; }));
    try { m = modell(); } catch (e) { fehler = String(e.message || e); }
    finally { alt.forEach(([o, n, f]) => { o[n] = f; }); }
    return { m, zugriff, fehler };
  };
  window.__v881 = { zeichnungen: 0, abweichungen: [], gesperrt: [], letzte: null };
  const orig = window._tpRenderTimelineIntern;
  window._tpRenderTimelineIntern = function () {
    const r = orig.apply(this, arguments);
    const w = window.__v881; w.zeichnungen++;
    try {
      const a = aufnahme(), m = modell(), g = gesperrt();
      w.letzte = { a, m };
      ["reihe", "felder", "tw"].forEach(k => { if (JSON.stringify(a[k]) !== JSON.stringify(m[k])) w.abweichungen.push(`Zeichnung ${w.zeichnungen} (${w.situation || "Start"}), ${k}: Seite ${JSON.stringify(a[k])} · Modell ${JSON.stringify(m[k])}`); });
      if (g.fehler || g.zugriff || JSON.stringify(g.m) !== JSON.stringify(m)) w.gesperrt.push(`Zeichnung ${w.zeichnungen} (${w.situation || "Start"}): ${g.zugriff} Zugriffe${g.fehler ? ", " + g.fehler : ""}${g.m && JSON.stringify(g.m) !== JSON.stringify(m) ? ", anderes Ergebnis" : ""}`);
    } catch (e) { w.abweichungen.push(`Zeichnung ${w.zeichnungen}: Abbruch der Prüfung – ${e.message}`); }
    return r;
  };
}

async function seite(h, { kader, trainer }) {
  const termin = { id: 1, datum: DATUM, typ: "training", uhrzeit: "17:00", uhrzeit_ende: "18:15", trainer_status: Object.fromEntries(trainer.map(t => [t, "ja"])) };
  const s = await h.starten({ jetzt: JETZT, hoehe: 2400, warten: 1500, supabase: h.supabaseAttrappe({
    kader, nominierungen: [], anwesenheit: [], rueckmeldungen: [], periodisierung: [],
    termine: [termin],
    trainingsformen: (BIB(h.REPO).uebungen || []).map((u, i) => ({ ...u, id: 6000 + i, custom: true })),
    trainingsvorlagen: testVorlagen(h.REPO),
    trainingsgruppen: [], trainingsplan: []
  }) });
  const p = s.page;
  await p.waitForFunction(() => typeof vorlageUebernehmenSetzen === "function" && typeof tpPlanRestore === "function" && typeof tpFelderZahl === "function", null, { timeout: 30000 });
  await h.sichtbarMachen(p, "#train-sub-planung"); await h.sichtbarMachen(p, "#tp-timeline");
  await p.evaluate(`(${haken.toString()})()`);
  await p.evaluate(async d => {
    await loadKader(); if (typeof loadCustomForms === "function") await loadCustomForms();
    if (typeof vorlagenLaden === "function") await vorlagenLaden();
    const f = document.getElementById("tp-date");
    if (![...f.options].some(o => o.value === d)) f.add(new Option(d, d));
    f.value = d;
    await tpTrainerRsvpLaden(d); await tpPlanRestore(d);
  }, DATUM);
  return s;
}
/* Eine Situation: herstellen, auf Ruhe warten (keine laufende Wiederherstellung, Zeichenzahl steht). */
async function situation(p, name, tun) {
  await p.evaluate(n => { window.__v881.situation = n; }, name);
  const vor = await p.evaluate(() => window.__v881.zeichnungen);
  const extra = await tun();
  await p.waitForFunction(() => typeof _tpRestoring === "undefined" || _tpRestoring === false, null, { timeout: 15000 }).catch(() => {});
  /* Ruhe: 400 ms lang keine weitere Zeichnung (Gruppen, Durchgänge zeichnen verzögert nach) */
  let n = -1, seit = Date.now();
  for (;;) {
    const z = await p.evaluate(() => window.__v881.zeichnungen);
    if (z !== n) { n = z; seit = Date.now(); }
    else if (Date.now() - seit >= 400) break;
    await new Promise(r => setTimeout(r, 50));
  }
  return { zeichnungen: n - vor, extra };
}

module.exports = async function (h) {
  const titel = "4.8 Schritt 3 · Felderzahl, Reihenfolge und Torwart-Angebot aus dem Modell (nach jedem Zeichnen gleich der Seite, ohne DOM)";
  const zeilen = []; let ok = true;
  const pruef = (bed, text) => { zeilen.push((bed ? "✓ " : "✗ ") + text); if (!bed) ok = false; };

  /* ── Seite 1: viele Kinder ── */
  {
    const kader = h.kaderZeilen({ inaktiv: ["Kind O"] }); kader[1].tw = true; kader[14].tw = true;   // Kind O: Torhüter, ausgetragen
    const s = await seite(h, { kader, trainer: ["Charles", "Finn", "Kenneth"] });
    const p = s.page;
    try {
      const gelaufen = [];
      const sit = async (name, fn, arg) => { const r = await situation(p, name, () => p.evaluate(fn, arg)); gelaufen.push(`${name} (${r.zeichnungen}×)`); return r; };
      await sit("Vorlage 800 (freies Fenster)", async () => { _vuAuswahl = 800; await vorlageUebernehmenSetzen(); });
      const frei2 = await p.evaluate(() => { const si = tpSlots.findIndex(s => tpFreiesFenster(s)); const ab = tpSlots.findIndex(s => s.typ === "abschluss");
        return { si, n: si >= 0 ? tpFelderZahl(si) : null, ab, nAb: ab >= 0 ? tpFelderZahl(ab) : null }; });
      pruef(frei2.si >= 0 && frei2.n === 0 && frei2.ab >= 0 && frei2.nAb === 0, `freies Fenster und Abschluss: 0 Felder (Fenster ${frei2.si}: ${frei2.n}, Abschluss ${frei2.ab}: ${frei2.nAb})`);
      await sit("Vorlage 801 (Block „Torhüter“ in der Vorlage)", async () => { _vuAuswahl = 801; await vorlageUebernehmenSetzen(); });
      await sit("Training füllen", async () => { await tpGenerate(); });
      await sit("Vorlage 802 (Torwart-Station)", async () => { _vuAuswahl = 802; await vorlageUebernehmenSetzen(); });
      const tw = await sit("Torwart-Block parallel zu Hauptteil 1, Trainer Kenneth", () => {
        tpDoAddSlot("tw"); const tw = tpSlots.findIndex(s => s.typ === "tw");
        const h1 = tpSlots.findIndex(s => tpIstHauptteil(s.typ));
        const ps = document.querySelector(`.tp-slot[data-si="${tw}"] select[onchange*="parallelZu"]`);
        if (ps) { ps.value = String(h1); ps.dispatchEvent(new Event("change")); }
        tpSetCoach(`tp-form-${tw}-0`, "Kenneth");
        return { tw, h1 };
      });
      const twV = await p.evaluate(() => { const si = tpSlots.findIndex(s => s.typ === "tw"); return { si, angebot: si >= 0 ? tpTwAngebot(si).map(k => k.name) : null, n: si >= 0 ? tpFelderZahl(si) : null }; });
      pruef(twV.si >= 0 && twV.n === 1 && JSON.stringify(twV.angebot) === JSON.stringify(["Kind A", "Kind B"]), `Torwart-Block: ein Feld, Angebot Kind A, Kind B – ausgetragener Torhüter fehlt (${JSON.stringify(twV)})`);
      const gebunden = await p.evaluate(({ h1 }) => ({ n: tpFelderZahl(h1), weg: (tpSlots[h1].weg || []).length, trainer: tpGetCheckedTrainers().length,
        reihe: _tpRenderReihe(), tw: tpSlots.findIndex(s => s.typ === "tw") }), tw.extra);
      pruef(gebunden.n === Math.max(1, Math.min(gebunden.trainer - 1, 5) - gebunden.weg), `Hauptteil mit Trainer am Torwart-Block: ${gebunden.n} Felder (${gebunden.trainer} Trainer, einer gebunden)`);
      pruef(gebunden.reihe.indexOf(gebunden.tw) === gebunden.reihe.indexOf(tw.extra.h1) + 1, `Torwart-Block steht in der Reihenfolge direkt unter seinem Hauptteil (${JSON.stringify(gebunden.reihe)})`);
      await sit("Einzeltraining mit Kind E", () => {
        tpDoAddSlot("individual"); const ind = tpSlots.findIndex(s => s.typ === "individual");
        const sel = document.querySelector(`.tp-ind-player[data-slot="${ind}"][value="${"Kind E"}"]`); sel.checked = true; sel.dispatchEvent(new Event("change"));   // v977: Häkchen   // v888: mit Ereignis
      });
      await sit("Vier Gruppen bei drei Trainern", () => { tgBilden(4); tpRenderTimeline(); });
      const vier = await p.evaluate(() => tpSlots.map((s, si) => ({ si, h: tpIstHauptteil(s.typ), geb: tpIstHauptteil(s.typ) ? tpParallelTrainer(si).size : 0, weg: (s.weg || []).length, frei: tpFreiesFenster(s), n: tpFelderZahl(si) }))
        .filter(x => x.h && !x.geb && !x.weg && !x.frei));
      pruef(vier.length > 0 && vier.every(x => x.n === 4), `Hauptteile ohne gebundenen Trainer: so viele Felder wie Gruppen (4) – ${JSON.stringify(vier.map(x => x.si + ":" + x.n))}`);
      const weg = await sit("Feld 2 im zweiten Hauptteil weglassen", () => {
        const hs = tpSlots.map((s, i) => i).filter(i => tpIstHauptteil(tpSlots[i].typ) && !tpFreiesFenster(tpSlots[i]));
        const si = hs.find(i => tpFelderZahl(i) >= 3 && !tpParallelTrainer(i).size) ?? hs[1];
        const vor = tpFelderZahl(si); tpFeldWeglassen(si, 1); return { si, vor };
      });
      const nachWeg = await p.evaluate(si => tpFelderZahl(si), weg.extra.si);
      pruef(nachWeg === weg.extra.vor - 1, `Feld weglassen: ${weg.extra.vor} → ${nachWeg} Felder`);
      await sit("Weiterrücken (+1) im ersten Hauptteil", () => { tpVersatzSetzen(tpSlots.findIndex(s => tpIstHauptteil(s.typ) && !tpFreiesFenster(s)), 1); });
      await sit("Drei Durchgänge im ersten Hauptteil", () => { tpDurchgaengeSetzen(tpSlots.findIndex(s => tpIstHauptteil(s.typ) && !tpFreiesFenster(s)), 3); });
      await sit("Aufwärmen: eine Übung mehr", () => { const si = tpSlots.findIndex(s => s.typ === "warmup" && !tpFreiesFenster(s)); if (si >= 0) tpWarmPlus(si); });
      await sit("Ersten Hauptteil ans Ende der Kette schieben", () => { const si = tpSlots.findIndex(s => tpIstHauptteil(s.typ) && !tpFreiesFenster(s)); tpSlotVerschieben(si, _tpKette().length - 1); });
      await sit("Torwart-Block löschen", () => { tpRemoveSlot(tpSlots.findIndex(s => s.typ === "tw")); });
      await sit("Rückgängig", () => { const k = [...document.querySelectorAll("#undo-toast button")].find(x => /Rückgängig/.test(x.textContent)); if (k) k.click(); });
      await sit("Trainer Finn abwählen (ohne Termin-Rückmeldung: nur dieser Plan)", async () => { TP_TERMIN_ID = null; TP_ANWESEND = null; await tpTrainerManuell("Finn", false); });
      const w = await p.evaluate(() => window.__v881);
      pruef(w.zeichnungen >= 15, `viele Kinder: ${w.zeichnungen} Zeichnungen geprüft · ${gelaufen.join(" · ")}`);
      pruef(!w.abweichungen.length, `viele Kinder: nach jedem Zeichnen Felderzahl, Reihenfolge und Torwart-Angebot gleich der Seite${w.abweichungen.length ? " · " + w.abweichungen.slice(0, 3).join(" | ") : ""}`);
      pruef(!w.gesperrt.length, `viele Kinder: bei gesperrtem DOM fehlerfrei und gleich${w.gesperrt.length ? " · " + w.gesperrt.slice(0, 2).join(" | ") : ""}`);
      const l = w.letzte ? w.letzte.m : null;
      pruef(!!l && l.felder.some(n => n === 0) && l.felder.some(n => n === 1) && l.felder.some(n => n >= 2) && l.tw.some(x => x.length === 2),
        `abgedeckt: Blöcke mit 0, 1 und mehreren Feldern, ein Torwart-Angebot (${l ? JSON.stringify(l.felder) : "–"})`);
      const fehler = s.fehler();
      pruef(!fehler.length, `viele Kinder: keine Fehler in der Konsole${fehler.length ? " · " + fehler[0] : ""}`);
    } catch (e) {
      pruef(false, "viele Kinder: Abbruch – " + String(e.message || e).split("\n")[0]);
    } finally { await s.schliessen(); }
  }

  /* ── Seite 2: wenige Kinder, ein Trainer – feste Sollwerte ── */
  {
    const kader = h.kaderZeilen().slice(0, 4);
    const s = await seite(h, { kader, trainer: ["Charles"] });
    const p = s.page;
    try {
      await situation(p, "Training füllen", () => p.evaluate(async () => { await tpGenerate(); }));
      const soll = await p.evaluate(() => tpSlots.map((s, si) => ({ typ: s.typ, frei: tpFreiesFenster(s), n: tpFelderZahl(si) })));
      const erwartet = x => (x.frei || x.typ === "abschluss" || x.typ === "turnier") ? 0 : 1;
      pruef(soll.length > 2 && soll.every(x => x.n === erwartet(x)), `ein Trainer, keine Gruppen: jeder Block 1 Feld, Abschluss 0 (${soll.map(x => x.typ + ":" + x.n).join(", ")})`);
      await situation(p, "Aufwärmen: eine Übung mehr", () => p.evaluate(() => { tpWarmPlus(tpSlots.findIndex(s => s.typ === "warmup" && !tpFreiesFenster(s))); }));
      await situation(p, "Torwart-Block", () => p.evaluate(() => { tpDoAddSlot("tw"); }));
      const nach = await p.evaluate(() => ({ warm: tpFelderZahl(tpSlots.findIndex(s => s.typ === "warmup" && !tpFreiesFenster(s))), tw: tpFelderZahl(tpSlots.findIndex(s => s.typ === "tw")),
        angebot: tpTwAngebot(tpSlots.findIndex(s => s.typ === "tw")).map(k => k.name), keinTw: tpTwAngebot(0).length, ausserhalb: tpFelderZahl(tpSlots.length + 3) }));
      pruef(nach.warm === 2 && nach.tw === 1 && JSON.stringify(nach.angebot) === '["Kind A"]' && nach.keinTw === 0 && nach.ausserhalb === 0,
        `Aufwärmen mit zwei Übungen: 2 Felder; Torwart-Block 1 Feld, Angebot Kind A; andere Blöcke kein Angebot; Block außerhalb 0 (${JSON.stringify(nach)})`);
      const w = await p.evaluate(() => window.__v881);
      pruef(w.zeichnungen >= 3 && !w.abweichungen.length && !w.gesperrt.length, `wenige Kinder: ${w.zeichnungen} Zeichnungen, Seite = Modell, gesperrtes DOM fehlerfrei${w.abweichungen.concat(w.gesperrt).length ? " · " + w.abweichungen.concat(w.gesperrt).slice(0, 3).join(" | ") : ""}`);
      const fehler = s.fehler();
      pruef(!fehler.length, `wenige Kinder: keine Fehler in der Konsole${fehler.length ? " · " + fehler[0] : ""}`);
    } catch (e) {
      pruef(false, "wenige Kinder: Abbruch – " + String(e.message || e).split("\n")[0]);
    } finally { await s.schliessen(); }
  }
  return h.ergebnis(titel, ok, zeilen);
};
