/* v886 · Bestandsaufnahme 4.8, Schritt 6: Torwart-Haken und Einzelkind liegen im Zustand
   (TP_ZUSTAND.tw: Blockindex → angehakte Namen, undefined = alle angebotenen; TP_ZUSTAND.kind:
   Blockindex → Name oder ""). Setter tpTwSetzen/tpKindSetzen, Projektion _tpTwKindAufSeite,
   Brücke _tpTwKindNachziehen (eigener Zähler _tpBrueckeTwZahl, bis Schritt 8).

   A) Quelltext: kein Merk-Weg (merk.tw/merk.ind) mehr; kein `.checked=` und kein `.value=` in
      Funktionen, die Torwart-Haken oder Einzelkind-Auswahl anfassen – außer Projektion und Brücke.
   B) G6 nachgespielt wie ein Trainer (Haken per Ereignis abgewählt, Kind per Ereignis gewählt),
      dann Neuzeichnen und Speichern: gespeicherter Körper = Sollwert G6 „Plan speichern“;
      tpZustandPruefen({fremd:true}) leer nach jedem Schritt; keine Brücken-Übernahme.
      Danach Einzelblock löschen und Rückgängig: das Kind kommt zurück (wie bisher).
   C) G10 nachgespielt mit Ereignissen: Körper nach Rückgängig = Sollwert G10 – Fehlerbild 2 bleibt
      bewusst (die abgewählten Haken kommen NICHT zurück, tw [1,2]); hier stehen zwei Torhüter im
      Körper, die Reihenfolge (tpTwAngebot) zählt.
   D) Die zehn Golden-Abläufe (ohne Sollwerte): tpZustandPruefen() leer nach jedem Schritt, die
      Brücke der Übungswahl 0×, die Brücke für Haken/Kind genau an den fremden Eingriffen der
      Abläufe selbst (G6: Haken und Auswahl ohne Ereignis, G10: Haken ohne Ereignis). */
"use strict";
const fs = require("fs"), path = require("path");
const golden = require("./v877-trainingsplan-golden.js").intern;
const ORDNER = path.join(__dirname, "..", "golden", "trainingsplan");

const ohneKommentar = t => t.replace(/\/\*[\s\S]*?\*\//g, k => k.replace(/[^\n]/g, " ")).replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
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
const koerper = b => JSON.stringify(ketten({ datum: b.datum, plan: b.plan, slots: b.slots }));
function sollKoerper(id, schritt) {
  const soll = JSON.parse(fs.readFileSync(path.join(ORDNER, id + ".json"), "utf8"));
  const st = soll.schritte.filter(x => x.schritt === schritt).pop();
  const g = st && st.gesendet.filter(x => x.methode === "POST").pop();
  return g ? koerper(g.body) : null;
}
const abweichung = (ist, soll) => { let i = 0; while (ist[i] === soll[i]) i++; return ` · ab Zeichen ${i}: soll „${soll.slice(Math.max(0, i - 40), i + 60)}“ · ist „${ist.slice(Math.max(0, i - 40), i + 60)}“`; };
const tpPosts = s => s.gesendet.filter(g => /\/rest\/v1\/trainingsplan$/.test(g.pfad) && g.methode === "POST");

/* Ein nachgespielter Ablauf: nach jedem Schritt Ruhe, strenge Prüfung, Brücken-Zähler. */
async function nachspielen(h, schritte) {
  const s = await golden.seite(h, { id: "v886" });
  const p = s.page, zeilen = [];
  let bw = 0, btw = 0;
  try {
    for (const [name, tun] of schritte) {
      const vor = await p.evaluate(() => ({ w: _tpBrueckeZahl, t: _tpBrueckeTwZahl }));
      const r = await tun(p);
      await golden.ruhe(s);
      const n = await p.evaluate(() => ({ w: _tpBrueckeZahl, t: _tpBrueckeTwZahl, log: _tpBrueckeTwLog.slice(-3), pruefen: tpZustandPruefen({ fremd: true }) }));
      bw += n.w - vor.w; btw += n.t - vor.t;
      if (n.w - vor.w) zeilen.push(`nach „${name}“: Brücke Übungswahl ${n.w - vor.w}×`);
      if (n.t - vor.t) zeilen.push(`nach „${name}“: Brücke Haken/Kind ${n.t - vor.t}× (${n.log.join(", ")})`);
      n.pruefen.forEach(x => zeilen.push(`nach „${name}“: ${x}`));
      if (r && r.fehler) zeilen.push(`„${name}“: ${r.fehler}`);
    }
    const posts = tpPosts(s);
    const zustand = await p.evaluate(() => ({ tw: JSON.parse(JSON.stringify(TP_ZUSTAND.tw)), kind: JSON.parse(JSON.stringify(TP_ZUSTAND.kind)) }));
    return { s, zeilen, bw, btw, posts, zustand };
  } catch (e) {
    zeilen.push("Abbruch – " + String(e.message || e).split("\n")[0]);
    return { s, zeilen, bw, btw, posts: tpPosts(s), zustand: null };
  }
}

/* Gemeinsame Griffe (wie ein Trainer: Ereignisse statt fremder Eingriffe) */
const fuellen = ["Training füllen", p => p.evaluate(async () => { await tpGenerate(); })];
const twAnlegen = parallel => ["Torwart-Block anlegen" + (parallel ? ", parallel zu Hauptteil 1" : "") + ", Kind B per Ereignis abwählen", p => p.evaluate(par => {
  tpDoAddSlot("tw"); const tw = tpSlots.findIndex(s => s.typ === "tw");
  if (par) {
    const ziel = tpSlots.findIndex(s => /^Hauptteil 1$/.test(s.label || ""));
    const ps = document.querySelector(`.tp-slot[data-si="${tw}"] select[onchange*="parallelZu"]`);
    ps.value = String(ziel); ps.dispatchEvent(new Event("change"));
  }
  const b = document.querySelector(`.tp-tw-player[data-slot="${tw}"][value="Kind B"]`);
  if (!b) return { fehler: "kein Haken für Kind B" };
  b.checked = false; b.dispatchEvent(new Event("change"));
  const an = tpTwAn(tw);
  return an.length === 1 && an[0] === "Kind A" ? null : { fehler: "Zustand nach dem Abwählen: " + JSON.stringify(an) };
}, parallel)];
const twTrainer = ["Trainer an den Torwart-Block", p => p.evaluate(() => { const tw = tpSlots.findIndex(s => s.typ === "tw"); tpSetCoach(`tp-form-${tw}-0`, "Kenneth"); })];

module.exports = async function (h) {
  const titel = "4.8 Schritt 6 · Torwart-Haken und Einzelkind im Zustand: Quelltext, G6/G10 mit Ereignissen = Sollwert, Seite = Zustand, Brücke";
  const zeilen = []; let ok = true;
  const pruef = (bed, text) => { zeilen.push((bed ? "✓ " : "✗ ") + text); if (!bed) ok = false; };

  /* ── A: Quelltext ── */
  {
    const text = fs.readFileSync(path.join(h.REPO, "boot.js"), "utf8");
    const ohne = ohneKommentar(text);
    const ERLAUBT = ["_tpTwKindAufSeite", "_tpTwKindNachziehen"];
    const namen = [...ohne.matchAll(/(?:^|\n)(?:async\s+)?function\s+([\w$]+)\s*\(/g)].map(m => m[1]);
    const anfassen = [], funde = [];
    namen.forEach(n => {
      const r = rumpf(ohne, n); if (!r) return;
      if (!/tp-tw-player|tp-ind-player|TP_ZUSTAND\.(tw|kind)\b|\btpTwAn\(|\btpKindVon\(|\b_tpTwKindLaden\(/.test(r)) return;
      anfassen.push(n);
      if (ERLAUBT.includes(n)) return;
      r.split("\n").forEach((z, i) => {
        if (/\.checked\s*=(?!=)/.test(z)) funde.push(`${n}, Zeile ${i + 1}: .checked= – ${z.trim().slice(0, 80)}`);
        if (/\.value\s*=(?!=)/.test(z) && /tp-tw-player|tp-ind-player|\bsel\b|\bs\.value|\bel\.value|\bc\.value/.test(z)) funde.push(`${n}, Zeile ${i + 1}: .value= – ${z.trim().slice(0, 80)}`);
      });
    });
    const merk = /merk\.(tw|ind)\b/.test(ohne);
    const muss = ["_tpZustandAusDom", "stTimerStations", "_tlSnapshot", "tpRemoveSlot", "_tpRenderTimelineIntern", "tpSlotsNeuOrdnen", "tpZustandLaden"].filter(n => !anfassen.includes(n));
    pruef(anfassen.length >= 8 && !muss.length,
      `Quelltext: ${anfassen.length} Funktionen fassen Haken/Kind an, darunter Serialisierer, Stationstimer, Trainingsstart, Löschen, Zeichnen, Neuordnen, Öffnen${muss.length ? " · nicht gefunden: " + muss.join(", ") : ""}`);
    pruef(!funde.length, `Quelltext: kein .checked=/.value= auf Haken oder Einzelkind außerhalb von Projektion und Brücke${funde.length ? " · " + funde.slice(0, 4).join(" | ") : ""}`);
    pruef(!merk, `Quelltext: Merk-Weg merk.tw/merk.ind entfernt${merk ? " · noch vorhanden" : ""}`);
    const ser = rumpf(ohne, "_tpZustandAusDom") || "";
    pruef(/tpTwAn\(/.test(ser) && !/querySelector/.test(ser.replace(/_tpDomNachziehen\(\);/, "")),
      "Quelltext: der Serialisierer liest Haken (tpTwAn, Reihenfolge von tpTwAngebot) und Kind aus dem Zustand, nicht aus der Seite");
  }

  /* ── B: G6 mit Ereignissen ── */
  {
    const r = await nachspielen(h, [
      fuellen, twAnlegen(true), twTrainer,
      ["Torwart-Übung wählen", p => p.evaluate(() => { const tw = tpSlots.findIndex(s => s.typ === "tw"); const sel = document.getElementById(`tp-form-${tw}-0`); const v = [...sel.options].map(o => o.value).find(x => x !== ""); tpPickerOpen(sel.id); tpPickerSet(Number(v)); })],
      ["Einzeltraining, Kind E per Ereignis", p => p.evaluate(() => {
        tpDoAddSlot("individual"); const ind = tpSlots.findIndex(s => s.typ === "individual");
        const sel = document.getElementById(`tp-ind-player-${ind}`); sel.value = "Kind E"; sel.dispatchEvent(new Event("change"));
        const reco = (document.getElementById(`tp-ind-reco-${ind}`) || {}).innerHTML || "";
        return tpKindVon(ind) === "Kind E" && reco ? null : { fehler: `Zustand „${tpKindVon(ind)}“, Empfehlung ${reco ? "da" : "leer"}` };
      })],
      ["Neuzeichnen", p => p.evaluate(() => { tpRenderTimeline(); })],
      ["Plan speichern", p => p.evaluate(async () => { await tpPlanSave(true); })]
    ]);
    const soll = sollKoerper("G6-torwart-parallel", "Plan speichern"), letzt = r.posts[r.posts.length - 1];
    const ist = letzt ? koerper(letzt.body) : "";
    pruef(!!soll && ist === soll, `G6 mit Ereignissen: gespeicherter Körper = Sollwert G6 „Plan speichern“${soll && ist !== soll ? abweichung(ist, soll) : ""}`);
    pruef(!r.zeilen.length && r.bw === 0 && r.btw === 0, `G6 mit Ereignissen: Seite = Zustand nach jedem Schritt, Brücke 0× (Übungswahl ${r.bw}, Haken/Kind ${r.btw})${r.zeilen.length ? " · " + r.zeilen.slice(0, 3).join(" | ") : ""}`);
    const z = r.zustand || { tw: {}, kind: {} };
    pruef(Object.values(z.tw).some(l => JSON.stringify(l) === '["Kind A"]') && Object.values(z.kind).includes("Kind E"), `G6: Zustand tw ${JSON.stringify(z.tw)}, kind ${JSON.stringify(z.kind)}`);
    /* Einzelblock löschen und Rückgängig: das Kind kommt zurück, wie bisher über die Auswahl */
    try {
      const d = await r.s.page.evaluate(() => {
        const ind = tpSlots.findIndex(s => s.typ === "individual");
        tpRemoveSlot(ind);
        const weg = tpSlots.every(s => s.typ !== "individual") && !Object.values(TP_ZUSTAND.kind).includes("Kind E");
        const k = [...document.querySelectorAll("#undo-toast button")].find(x => /Rückgängig/.test(x.textContent)); if (k) k.click();
        const ind2 = tpSlots.findIndex(s => s.typ === "individual");
        return { weg, ind, ind2, kind: tpKindVon(ind2), seite: (document.getElementById(`tp-ind-player-${ind2}`) || {}).value, pruefen: tpZustandPruefen({ fremd: true }), tw: tpTwAn(tpSlots.findIndex(s => s.typ === "tw")) };
      });
      pruef(d.weg && d.ind2 === d.ind && d.kind === "Kind E" && d.seite === "Kind E" && !d.pruefen.length,
        `Einzelblock löschen → Rückgängig: Block wieder an Stelle ${d.ind2}, Kind „${d.kind}“ (Seite „${d.seite}“), Torwart-Haken unberührt ${JSON.stringify(d.tw)}${d.pruefen.length ? " · " + d.pruefen[0] : ""}`);
    } catch (e) { pruef(false, "Einzelblock Rückgängig: Abbruch – " + String(e.message || e).split("\n")[0]); }
    const fe = r.s.fehler(); pruef(!fe.length, `B: keine Fehler in der Konsole${fe.length ? " · " + fe[0] : ""}`);
    await r.s.schliessen();
  }

  /* ── C: G10 mit Ereignissen (Fehlerbild 2 bleibt) ── */
  {
    const r = await nachspielen(h, [
      ["Training füllen, Torwart-Block, Kind B per Ereignis ab, Trainer, speichern", async p => {
        await p.evaluate(async () => { await tpGenerate(); });
        const a = await twAnlegen(false)[1](p); if (a && a.fehler) return a;
        await twTrainer[1](p);
        await p.evaluate(async () => { await tpPlanSave(true); });
      }],
      ["Torwart-Block löschen", p => p.evaluate(() => { tpRemoveSlot(tpSlots.findIndex(s => s.typ === "tw")); })],
      ["Rückgängig", p => p.evaluate(() => {
        const k = [...document.querySelectorAll("#undo-toast button")].find(x => /Rückgängig/.test(x.textContent)); if (k) k.click();
        const tw = tpSlots.findIndex(s => s.typ === "tw");
        return JSON.stringify(tpTwAn(tw)) === '["Kind A","Kind B"]' && TP_ZUSTAND.tw[tw] === undefined ? null : { fehler: "Haken nach Rückgängig " + JSON.stringify(tpTwAn(tw)) };
      })],
      ["Plan speichern", p => p.evaluate(async () => { await tpPlanSave(true); })]
    ]);
    const soll1 = sollKoerper("G10-loeschen-rueckgaengig", "Training füllen, Torwart-Block mit Kind B abgewählt, speichern");
    const soll = sollKoerper("G10-loeschen-rueckgaengig", "Plan speichern");
    const ist1 = r.posts[0] ? koerper(r.posts[0].body) : "", ist = r.posts.length ? koerper(r.posts[r.posts.length - 1].body) : "";
    pruef(!!soll1 && r.posts.some(x => koerper(x.body) === soll1), `G10 mit Ereignissen: erster gespeicherter Körper (Kind B abgewählt) = Sollwert${soll1 && !r.posts.some(x => koerper(x.body) === soll1) ? abweichung(ist1, soll1) : ""}`);
    pruef(!!soll && ist === soll, `G10 mit Ereignissen: Körper nach Rückgängig = Sollwert (Fehlerbild 2 bleibt: beide Haken wieder an)${soll && ist !== soll ? abweichung(ist, soll) : ""}`);
    pruef(!r.zeilen.length && r.bw === 0 && r.btw === 0, `G10 mit Ereignissen: Seite = Zustand nach jedem Schritt, Brücke 0× (Übungswahl ${r.bw}, Haken/Kind ${r.btw})${r.zeilen.length ? " · " + r.zeilen.slice(0, 3).join(" | ") : ""}`);
    const fe = r.s.fehler(); pruef(!fe.length, `C: keine Fehler in der Konsole${fe.length ? " · " + fe[0] : ""}`);
    await r.s.schliessen();
  }

  /* ── D: die zehn Golden-Abläufe ── */
  const ERWARTET_TW = { "G6-torwart-parallel": 2, "G10-loeschen-rueckgaengig": 1 };
  const liste = golden.SZENARIEN, erg = new Array(liste.length);
  let naechstes = 0;
  const ablauf = async def => {
    const s = await golden.seite(h, def);
    const p = s.page, z = [];
    let bw = 0, btw = 0;
    try {
      const st = await p.evaluate(() => ({ w: _tpBrueckeZahl, t: _tpBrueckeTwZahl, pruefen: tpZustandPruefen() }));
      bw += st.w; btw += st.t; st.pruefen.forEach(x => z.push(`Aufbau: ${x}`));
      for (const [name, tun] of def.schritte) {
        const vor = await p.evaluate(() => ({ w: _tpBrueckeZahl, t: _tpBrueckeTwZahl }));
        await tun(p, s); await golden.ruhe(s);
        const n = await p.evaluate(() => ({ w: _tpBrueckeZahl, t: _tpBrueckeTwZahl, pruefen: tpZustandPruefen() }));
        bw += n.w - vor.w; btw += n.t - vor.t;
        n.pruefen.forEach(x => z.push(`nach „${name}“: ${x}`));
      }
      const strengEnde = await p.evaluate(() => { _tpDomNachziehen(); return tpZustandPruefen({ fremd: true }); });
      strengEnde.forEach(x => z.push(`am Ende (nach der Brücke): ${x}`));
    } catch (e) { z.push("Abbruch – " + String(e.message || e).split("\n")[0]); }
    const fe = s.fehler(); await s.schliessen();
    return { id: def.id, z, bw, btw, fe };
  };
  const arbeiter = async () => { for (;;) { const i = naechstes++; if (i >= liste.length) return; erg[i] = await ablauf(liste[i]); } };
  await Promise.all(Array.from({ length: Math.max(1, Number(process.env.GOLDEN_PARALLEL) || 3) }, arbeiter));
  let summeW = 0;
  erg.forEach(r => {
    summeW += r.bw;
    const sollTw = ERWARTET_TW[r.id] || 0;
    pruef(!r.z.length && r.btw === sollTw, `${r.id}: Seite = Zustand nach jedem Schritt; Brücke Haken/Kind ${r.btw}× (erwartet ${sollTw}${sollTw ? ", fremde Eingriffe des Ablaufs" : ""})${r.z.length ? " · " + r.z.slice(0, 3).join(" | ") : ""}`);
    if (r.fe.length) pruef(false, `${r.id}: Fehler in der Konsole · ${r.fe[0]}`);
  });
  pruef(summeW === 0, `Brücke der Übungswahl in allen zehn Abläufen: ${summeW} Übernahmen (erwartet 0)`);
  return h.ergebnis(titel, ok, zeilen);
};
