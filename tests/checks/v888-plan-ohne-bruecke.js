/* v888 · Bestandsaufnahme 4.8, Schritt 8: Die Übergangsbrücke ist entfernt – der Zustand führt allein.

   Bis v887 übernahmen _tpDomNachziehen (Übungswahl) und _tpTwKindNachziehen (Torwart-Haken,
   Einzelkind) beim Zeichnen, Speichern und an den Einstiegen per Knopf, was jemand direkt in die
   Seite geschrieben hatte (select.value= / .checked= ohne Ereignis). Seit v888 gilt nur noch, was
   über ein Ereignis (onchange) oder einen Setter kommt.

   a) Quelltext (ohne Kommentare): keine Brückenfunktion, kein Aufruf, keine Zähler; der
      Serialisierer heißt _tpZustandJetzt (nicht mehr _tpZustandAusDom) und liest nichts aus der Seite.
   b) Eingriff von außen ohne Ereignis an Übungs-Auswahlfeld, Torwart-Haken und Einzelkind: der
      gespeicherte Körper bleibt zeichengleich, der Zustand unverändert; tpZustandPruefen({fremd:true})
      meldet alle drei Abweichungen (ohne fremd nur die Übungswahl, wie bisher); das nächste Zeichnen
      setzt die Seite zurück, danach ist die Prüfung leer und der Körper weiter gleich.
   c) Derselbe Eingriff MIT change-Ereignis wird übernommen und gespeichert wie bisher.
   d) Die zehn Golden-Abläufe: Zustand = Seite nach jedem Schritt, streng (tpZustandPruefen({fremd:true})),
      und die Brücke gibt es in der Seite nicht. */
"use strict";
const fs = require("fs"), path = require("path");
const golden = require("./v877-trainingsplan-golden.js").intern;

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
const BRUECKE = ["_tpDomNachziehen", "_tpTwKindNachziehen", "_tpBrueckeZahl", "_tpBrueckeTwZahl", "_tpBrueckeLog", "_tpBrueckeTwLog", "_tpBrueckeMerken", "_tpZustandAusDom"];
const tpPosts = s => s.gesendet.filter(g => /\/rest\/v1\/trainingsplan$/.test(g.pfad) && g.methode === "POST");
const koerper = b => JSON.stringify({ plan: b.plan, slots: b.slots });

module.exports = async function (h) {
  const titel = "4.8 Schritt 8 · Brücke entfernt: der Zustand führt allein (Quelltext, Eingriff ohne/mit Ereignis, Golden-Abläufe)";
  const zeilen = []; let ok = true;
  const pruef = (bed, text) => { zeilen.push((bed ? "✓ " : "✗ ") + text); if (!bed) ok = false; };

  /* ── a: Quelltext ── */
  {
    const funde = [];
    fs.readdirSync(h.REPO).filter(f => f.endsWith(".js")).forEach(f => {
      const ohne = ohneKommentar(fs.readFileSync(path.join(h.REPO, f), "utf8"));
      BRUECKE.forEach(n => { if (new RegExp(`\\b${n}\\b`).test(ohne)) funde.push(`${f}: ${n}`); });
    });
    pruef(!funde.length, `a) keine Brückenfunktion, kein Aufruf, kein Zähler in den App-Dateien (${BRUECKE.length} Namen gesucht)${funde.length ? " · " + funde.slice(0, 5).join(" | ") : ""}`);
    const ohne = ohneKommentar(fs.readFileSync(path.join(h.REPO, "boot.js"), "utf8"));
    const ser = rumpf(ohne, "_tpZustandJetzt") || "";
    pruef(!!ser && !/document\.|querySelector|getElementById|\.value\b|\.checked\b|dataset/.test(ser),
      `a) _tpZustandJetzt stellt den Zustand zusammen, ohne die Seite zu lesen${ser ? "" : " · Funktion fehlt"}`);
    const wrap = ["tpPlanEntries", "tpSlotsMitZuordnung"].filter(n => !/_tpZustandJetzt\(\)/.test(rumpf(ohne, n) || ""));
    pruef(!wrap.length, `a) tpPlanEntries und tpSlotsMitZuordnung rechnen über _tpZustandJetzt${wrap.length ? " · nicht: " + wrap.join(", ") : ""}`);
  }

  /* ── b/c: Eingriff ohne und mit Ereignis ── */
  {
    const s = await golden.seite(h, { id: "v888" });
    const p = s.page;
    const speichern = async () => { const n = tpPosts(s).length; await p.evaluate(async () => { await tpPlanSave(true); }); await golden.ruhe(s); const l = tpPosts(s); return l.length > n ? l[l.length - 1].body : null; };
    try {
      /* Ausgangslage: gefüllter Plan, Torwart-Block (beide Torhüter an), Einzelblock mit Kind E – alles über echte Wege */
      const start = await p.evaluate(async () => {
        await tpGenerate();
        tpDoAddSlot("tw");
        const tw = tpSlots.findIndex(x => x.typ === "tw");
        tpSetCoach(`tp-form-${tw}-0`, "Kenneth");
        tpDoAddSlot("individual");
        const ind = tpSlots.findIndex(x => x.typ === "individual");
        const k = document.querySelector(`.tp-ind-player[data-slot="${ind}"][value="${"Kind E"}"]`); k.checked = true; k.dispatchEvent(new Event("change"));   // v977: Häkchen statt Auswahl
        return { tw, ind };
      });
      await golden.ruhe(s);
      const b0 = await speichern();
      const ziel = await p.evaluate(({ tw, ind }) => {
        const h1 = tpSlots.findIndex(x => /^Hauptteil 1$/.test(x.label || "")), id = `tp-form-${h1}-0`;
        const sel = document.getElementById(id), alt = tpWahlIdx(id);
        const fremd = [...sel.options].map(o => o.value).filter(v => v !== "" && v !== String(alt))[1];
        const kind = [...document.querySelectorAll(`.tp-ind-player[data-slot="${ind}"]`)].map(c => c.value).find(v => v && v !== "Kind E");   // v977
        return { h1, id, alt, fremd: Number(fremd), kind, tw, ind, twVorher: tpTwAn(tw), kindVorher: tpKindVon(ind) };
      }, start);

      /* b) ohne Ereignis */
      const b = await p.evaluate(z => {
        const sel = document.getElementById(z.id), haken = document.querySelector(`.tp-tw-player[data-slot="${z.tw}"][value="Kind B"]`), k = document.querySelector(`.tp-ind-player[data-slot="${z.ind}"][value="${z.kind}"]`);
        sel.value = String(z.fremd); haken.checked = false; k.checked = true;   // v977: ein weiteres Häkchen ohne Ereignis
        const zustand = { wahl: tpWahlIdx(z.id), tw: tpTwAn(z.tw), kind: tpKindVon(z.ind) };
        return { zustand, fremd: tpZustandPruefen({ fremd: true }), normal: tpZustandPruefen(),
          plan: tpPlanEntries().filter(e => e.block === z.h1 && e.feld === 0).map(e => e.formIdx) };
      }, ziel);
      const b1 = await speichern();
      const nachZeichnen = await p.evaluate(z => {
        tpRenderTimeline();
        return { pruefen: tpZustandPruefen({ fremd: true }), feld: document.getElementById(z.id).value, haken: document.querySelector(`.tp-tw-player[data-slot="${z.tw}"][value="Kind B"]`).checked, kind: [...document.querySelectorAll(`.tp-ind-player[data-slot="${z.ind}"]`)].filter(c => c.checked).map(c => c.value).join(", ") };
      }, ziel);
      const b2 = await speichern();
      const zustandGleich = b.zustand.wahl === ziel.alt && JSON.stringify(b.zustand.tw) === JSON.stringify(ziel.twVorher) && b.zustand.kind === ziel.kindVorher;
      pruef(!!b0 && JSON.stringify(ziel.twVorher) === '["Kind A","Kind B"]' && ziel.kindVorher === "Kind E" && ziel.fremd >= 0 && !!ziel.kind,
        `Ausgangslage gespeichert: Hauptteil 1/Feld 1 = ${ziel.alt}, Torwart ${JSON.stringify(ziel.twVorher)}, Einzelkind „${ziel.kindVorher}“; Eingriff: Übung ${ziel.fremd}, Kind B ab, Kind „${ziel.kind}“`);
      pruef(zustandGleich && JSON.stringify(b.plan) === JSON.stringify([ziel.alt]),
        `b) ohne Ereignis: Zustand unverändert (${JSON.stringify(b.zustand)}), Serialisierer weiter ${JSON.stringify(b.plan)}`);
      const drei = ["Seite", "Torwart-Haken", "Einzelkind"].every(w => b.fremd.some(x => x.includes(w)));
      pruef(b.fremd.length === 3 && drei && b.fremd.filter(x => /fremder Eingriff/.test(x)).length === 2 && b.normal.length === 1 && b.normal[0].startsWith(ziel.id),
        `b) tpZustandPruefen({fremd:true}) meldet alle drei Abweichungen, ohne fremd nur die Übungswahl · ${b.fremd.join(" | ")}`);
      pruef(!!b1 && koerper(b1) === koerper(b0), `b) gespeicherter Körper nach dem Eingriff zeichengleich zum Ausgangskörper${b1 && koerper(b1) !== koerper(b0) ? " · weicht ab" : ""}`);
      pruef(!nachZeichnen.pruefen.length && nachZeichnen.feld === String(ziel.alt) && nachZeichnen.haken === true && nachZeichnen.kind === "Kind E" && !!b2 && koerper(b2) === koerper(b0),
        `b) das nächste Zeichnen setzt die Seite auf den Zustand zurück (${JSON.stringify(nachZeichnen)}), Körper weiter gleich`);

      /* c) mit Ereignis */
      const c = await p.evaluate(z => {
        const sel = document.getElementById(z.id), haken = document.querySelector(`.tp-tw-player[data-slot="${z.tw}"][value="Kind B"]`), k = document.querySelector(`.tp-ind-player[data-slot="${z.ind}"][value="${z.kind}"]`), e = document.querySelector(`.tp-ind-player[data-slot="${z.ind}"][value="${"Kind E"}"]`);
        sel.value = String(z.fremd); sel.dispatchEvent(new Event("change"));
        haken.checked = false; haken.dispatchEvent(new Event("change"));
        e.checked = false; e.dispatchEvent(new Event("change")); k.checked = true; k.dispatchEvent(new Event("change"));   // v977: Kind tauschen über zwei Häkchen
        return { wahl: tpWahlIdx(z.id), tw: tpTwAn(z.tw), kind: tpKindVon(z.ind), pruefen: tpZustandPruefen({ fremd: true }),
          twIds: kidListToIds(["Kind A"]), kindId: kidId(z.kind) };
      }, ziel);
      await golden.ruhe(s);
      const c1 = await speichern();
      const eintrag = c1 && c1.plan.find(e => e.block === ziel.h1 && e.feld === 0);
      const twSlot = c1 && c1.slots[ziel.tw], indSlot = c1 && c1.slots[ziel.ind];
      pruef(c.wahl === ziel.fremd && JSON.stringify(c.tw) === '["Kind A"]' && c.kind === ziel.kind && !c.pruefen.length,
        `c) mit change-Ereignis übernommen: Zustand ${JSON.stringify({ wahl: c.wahl, tw: c.tw, kind: c.kind })}, Seite = Zustand`);
      pruef(!!eintrag && eintrag.formIdx === ziel.fremd && !!twSlot && JSON.stringify(twSlot.tw) === JSON.stringify(c.twIds) && !!indSlot && indSlot.kind === c.kindId,
        `c) gespeichert wie bisher: Übung ${eintrag && eintrag.formIdx}, Torwart ${JSON.stringify(twSlot && twSlot.tw)}, Einzelkind ${JSON.stringify(indSlot && indSlot.kind)}`);
      const fe = s.fehler(); pruef(!fe.length, `b/c: keine Fehler in der Konsole${fe.length ? " · " + fe[0] : ""}`);
    } catch (e) {
      pruef(false, "b/c: Abbruch – " + String(e.message || e).split("\n")[0]);
    } finally { await s.schliessen(); }
  }

  /* ── d: die zehn Golden-Abläufe, streng ── */
  const liste = golden.SZENARIEN, erg = new Array(liste.length);
  let naechstes = 0;
  const ablauf = async def => {
    const s = await golden.seite(h, def);
    const p = s.page, z = [];
    let schritte = 0;
    try {
      const da = await p.evaluate(namen => namen.filter(n => { try { return typeof (0, eval)(n) !== "undefined"; } catch (e) { return false; } }), BRUECKE);
      if (da.length) z.push(`Brücke in der Seite: ${da.join(", ")}`);
      (await p.evaluate(() => tpZustandPruefen({ fremd: true }))).forEach(x => z.push(`Aufbau: ${x}`));
      for (const [name, tun] of def.schritte) {
        await tun(p, s); await golden.ruhe(s); schritte++;
        (await p.evaluate(() => tpZustandPruefen({ fremd: true }))).forEach(x => z.push(`nach „${name}“: ${x}`));
      }
    } catch (e) { z.push("Abbruch – " + String(e.message || e).split("\n")[0]); }
    const fe = s.fehler(); await s.schliessen();
    return { id: def.id, z, schritte, fe };
  };
  const arbeiter = async () => { for (;;) { const i = naechstes++; if (i >= liste.length) return; erg[i] = await ablauf(liste[i]); } };
  await Promise.all(Array.from({ length: Math.max(1, Number(process.env.GOLDEN_PARALLEL) || 3) }, arbeiter));
  erg.forEach(r => {
    pruef(!r.z.length, `d) ${r.id}: ${r.schritte} Schritte – Zustand = Seite (streng), keine Brücke${r.z.length ? " · " + r.z.slice(0, 3).join(" | ") : ""}`);
    if (r.fe.length) pruef(false, `d) ${r.id}: Fehler in der Konsole · ${r.fe[0]}`);
  });
  return h.ergebnis(titel, ok, zeilen);
};
