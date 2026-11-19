/* v887 · Bestandsaufnahme 4.8, Schritt 7: ein Änderungsweg. Jede Änderung am Trainingsplan endet in
   tpGeaendert({speichern:"verzoegert"|"sofort"|"nein", zeichnen}) – neu zeichnen (wo bisher gezeichnet
   wurde), Materialzeile sofort nachziehen, speichern nach der Regel, die die Stelle schon in v886 hatte.

   A) Quelltext: die Setter enden in tpGeaendert mit genau ihrer Speicherregel (oder über einen Setter,
      der das tut) und rufen weder tpRenderTimeline noch tpPlanSave/tpPlanSaveDebounced selbst; die
      entfallenen Zeitgeber (60 ms in tpGenerate/tpAnpassenUebernehmen, setTimeout(tpMaterialRender,0),
      der Durchgangs-Umbau im Zeichnen) stehen nicht mehr im Code.
   B) Nach `await tpGenerate()` ohne Warten ist die Wahl im Zustand gefüllt und die Materialzeile zeigt,
      was der Zustand ergibt; ebenso direkt nach einer einzelnen Wahl (vorher erst nach setTimeout 0).
   C) Speicherregel je Setter, gemessen an den Aufrufen von tpPlanSave/tpPlanSaveDebounced, gegen die
      Tabelle REGEL (festgehalten an v886: `REPO=<v886> node tests/run.js v887` – dort ist nur A rot).
   D) Die zehn Golden-Abläufe: tpZustandPruefen() leer nach jedem Schritt (Zustand = Seite). Die Zahl der
      Schreibvorgänge je Schritt prüft der Golden-Master selbst (v877). */
"use strict";
const fs = require("fs"), path = require("path");
const golden = require("./v877-trainingsplan-golden.js").intern;

const ohneKommentar = t => t.replace(/\/\*[\s\S]*?\*\//g, k => k.replace(/[^\n]/g, " ")).replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
function rumpf(text, name) {
  const m = new RegExp(`(?:^|\\n)(?:async\\s+)?function\\s+${name}\\s*\\(`).exec(text);
  if (!m) return null;
  let i = text.indexOf("{", m.index + m[0].length), tiefe = 0;
  for (let j = i; j < text.length; j++) {
    const c = text[j];
    if (c === "{") tiefe++;
    else if (c === "}") { tiefe--; if (!tiefe) return text.slice(m.index, j + 1); }
  }
  return null;
}

/* Die Speicherregel je Änderungsstelle – so in v886 gemessen (Teil C) und unverändert Pflicht.
   „nein“ ist Fehlerbild 7 (behoben erst ab Schritt 9). */
const REGEL = {
  "tpGenerate (leerer Plan)": "verzoegert",
  "tpSetDauer": "nein",
  "tpDoAddSlot (Torwart)": "nein",
  "Läuft parallel zu": "nein",
  "Torwart-Haken": "nein",
  "tpDoAddSlot (Einzel)": "nein",
  "Einzelkind": "nein",
  "Ziel-Dauer": "nein",
  "tpSetCoach": "verzoegert",
  "tpVersatzSetzen": "sofort",
  "tpVersatzZurueck": "sofort",
  "tpFeldWeglassen": "verzoegert",
  "tpFeldZurueck": "verzoegert",
  "tpDurchgaengeSetzen": "verzoegert",
  "tpWarmPlus": "verzoegert",
  "tpWarmMinus": "verzoegert",
  "tpRegelWeg": "verzoegert",
  "tpSlotVerschieben": "verzoegert",
  "tpWahlWaehlen": "verzoegert",
  "tpOnSelectChange": "verzoegert",
  "tpRemoveSlot": "verzoegert",
  "Rückgängig": "verzoegert",
  "tpAnpassenUebernehmen": "verzoegert"
};

/* Quelltext: Funktion → erwartete Speicherregel im eigenen tpGeaendert, oder der Setter, über den sie endet. */
const QUELLE = {
  tpSetDauer: "nein", tpDoAddSlot: "nein",
  tpSlotsNeuOrdnen: "verzoegert", tpVersatzSetzen: "sofort", tpVersatzZurueck: "sofort",
  tpFeldWeglassen: "verzoegert", tpFeldZurueck: "verzoegert", tpDurchgaengeSetzen: "verzoegert",
  tpWarmPlus: "verzoegert", tpWarmMinus: "verzoegert", tpSetCoach: "verzoegert", tpRegelWeg: "verzoegert",
  _tpWahlFolgen: "verzoegert", tpGenerate: "verzoegert", tpAnpassenUebernehmen: "verzoegert",
  tpRemoveSlot: "→tpSlotsNeuOrdnen", tpSlotVerschieben: "→tpSlotsNeuOrdnen",
  tpWahlWaehlen: "→_tpWahlFolgen", tpOnSelectChange: "→_tpWahlFolgen"
};

module.exports = async function (h) {
  const titel = "4.8 Schritt 7 · Ein Änderungsweg tpGeaendert: Quelltext, ohne Warten, Speicherregel je Setter wie v886, Zustand = Seite";
  const zeilen = []; let ok = true;
  const pruef = (bed, text) => { zeilen.push((bed ? "✓ " : "✗ ") + text); if (!bed) ok = false; };

  /* ── A: Quelltext ── */
  {
    const ohne = ohneKommentar(fs.readFileSync(path.join(h.REPO, "boot.js"), "utf8"));
    const def = rumpf(ohne, "tpGeaendert") || "";
    pruef(/tpRenderTimeline\(\)/.test(def) && /tpMaterialRender\(\)/.test(def) && /tpPlanSave\(\)/.test(def) && /tpPlanSaveDebounced\(\)/.test(def),
      "Quelltext: tpGeaendert zeichnet, zieht die Materialzeile nach und speichert sofort oder verzögert" + (def ? "" : " · nicht gefunden"));
    const funde = [];
    Object.keys(QUELLE).forEach(n => {
      const r = rumpf(ohne, n);
      if (!r) { funde.push(`${n} fehlt`); return; }
      const soll = QUELLE[n];
      if (soll.startsWith("→")) { if (!new RegExp(`\\b${soll.slice(1)}\\(`).test(r)) funde.push(`${n} endet nicht über ${soll.slice(1)}`); }
      else {
        const arten = [...r.matchAll(/tpGeaendert\(\{[^}]*speichern:\s*["']([a-z]+)["']/g)].map(m => m[1]);
        if (!arten.length) funde.push(`${n} ruft tpGeaendert nicht`);
        else if (!arten.includes(soll)) funde.push(`${n}: speichern ${arten.join("/")} statt ${soll}`);
        if (arten.includes("sofort") && soll !== "sofort") funde.push(`${n} speichert sofort`);
      }
      /* Neben tpGeaendert kein eigenes Zeichnen oder Speichern – außer dem Zwischenzeichnen beim Rückgängig
         (tpRemoveSlot braucht die Felder des wieder eingefügten Blocks, bevor es die Wahl zurücksetzt). */
      const rest = n === "tpRemoveSlot" ? r.replace(/tpSlots\.push\(kopie\);[\s\S]*?tpRenderTimeline\(\);/, "") : r;
      if (/\btpRenderTimeline\(/.test(rest)) funde.push(`${n} zeichnet selbst`);
      if (/\btpPlanSave(Debounced)?\(/.test(r)) funde.push(`${n} speichert selbst`);
    });
    pruef(!funde.length, `Quelltext: ${Object.keys(QUELLE).length} Änderungsstellen enden in tpGeaendert mit ihrer Speicherregel${funde.length ? " · " + funde.join(" | ") : ""}`);
    const inl = [
      ["Läuft parallel zu", /parallelZu=Number\(this\.value\);tpGeaendert\(\{speichern:'nein'\}\)/],
      ["Ziel-Dauer", /id="tp-dauer" onchange="tpGeaendert\(\{speichern:'nein'\}\)"/],
      ["Torwart-Haken", /tpTwSetzen\([^"]*\);tpGeaendert\(\{zeichnen:false,speichern:'nein'\}\)/],
      ["Einzelkind", /tpKindSetzen\([^"]*tpGeaendert\(\{zeichnen:false,speichern:'nein'\}\)/]
    ].filter(([, re]) => !re.test(ohne)).map(([n]) => n);
    pruef(!inl.length, `Quelltext: „läuft parallel zu“, Ziel-Dauer, Torwart-Haken und Einzelkind enden in tpGeaendert ohne Speichern${inl.length ? " · fehlt: " + inl.join(", ") : ""}`);
    const zeit = [];
    if (/setTimeout\(\s*(\(\)\s*=>\s*\{?\s*(try\s*\{\s*)?)?tpMaterialRender/.test(ohne)) zeit.push("setTimeout(tpMaterialRender,0)");
    ["tpGenerate", "tpAnpassenUebernehmen"].forEach(n => { if (/setTimeout\(\s*r\s*,\s*60\s*\)/.test(rumpf(ohne, n) || "")) zeit.push(`60 ms in ${n}`); });
    const zi = rumpf(ohne, "_tpRenderTimelineIntern") || "";
    if (/\.durchgaenge\b|setTimeout\(\s*\(\)\s*=>\s*tpDurchgaengeSetzen/.test(zi)) zeit.push("Durchgangs-Umbau im Zeichnen");
    pruef(!zeit.length, `Quelltext: entfallene Zeitgeber stehen nicht mehr im Code${zeit.length ? " · noch da: " + zeit.join(", ") : ""}`);
  }

  /* ── B + C: eine Seite, alle Setter nacheinander ── */
  {
    const s = await golden.seite(h, { id: "v887" });
    const p = s.page;
    try {
      /* Spione: wer speichert wie? (gemessen, nicht gespeichert – die Schreibzahl prüft der Golden-Master) */
      await p.evaluate(() => {
        window.__sp = [];
        const deb = window.tpPlanSaveDebounced, sof = window.tpPlanSave;
        window.__spEcht = { deb, sof };
        window.tpPlanSaveDebounced = function () { window.__sp.push("verzoegert"); };
        window.tpPlanSave = function (erzwungen) { window.__sp.push(erzwungen === false ? "verzoegert-lauf" : "sofort"); return Promise.resolve(); };
        window.__regel = () => { const a = window.__sp.splice(0); return a.includes("sofort") ? "sofort" : a.includes("verzoegert") ? "verzoegert" : "nein"; };
      });
      const b = await p.evaluate(async () => {
        __sp.length = 0;
        await tpGenerate();
        const regel = __regel();
        const haupt = tpSlots.map((x, i) => i).filter(i => tpIstHauptteil(tpSlots[i].typ));
        const gefuellt = haupt.filter(i => tpWahlIdx(`tp-form-${i}-0`) != null).length;
        const box = document.getElementById("tp-material");
        const text = el => (el ? el.textContent : "").replace(/\s+/g, " ").trim();
        const soll = tpMaterialText(tpMaterialZaehlen());
        const nachGen = { gefuellt, haupt: haupt.length, material: text(box), soll };
        /* Eine einzelne Wahl: die Materialzeile ändert sich sofort (vorher erst nach setTimeout 0) */
        const si = haupt[0], id = `tp-form-${si}-0`, alle = tpAllForms();
        const anders = alle.map((f, i) => i).find(i => i !== tpWahlIdx(id) && tpWahlZulaessig(si, i) && (() => { const alt = tpWahlIdx(id); TP_ZUSTAND.wahl[id].i = i; const t = tpMaterialText(tpMaterialZaehlen()); TP_ZUSTAND.wahl[id].i = alt; return t !== soll; })());
        let einzeln = null;
        if (anders != null) { tpWahlWaehlen(id, anders); einzeln = { material: text(box), soll: tpMaterialText(tpMaterialZaehlen()), vorher: soll }; __sp.length = 0; }
        return { regel, nachGen, einzeln };
      });
      pruef(b.nachGen.haupt > 0 && b.nachGen.gefuellt === b.nachGen.haupt, `nach await tpGenerate() ohne Warten: ${b.nachGen.gefuellt} von ${b.nachGen.haupt} Hauptteilen im Zustand gefüllt (tpWahlIdx)`);
      pruef(!!b.nachGen.soll && b.nachGen.material.includes(b.nachGen.soll), `nach await tpGenerate() ohne Warten: Materialzeile aktuell („${b.nachGen.soll}“)${b.nachGen.material.includes(b.nachGen.soll) ? "" : " · steht da: „" + b.nachGen.material.slice(0, 120) + "“"}`);
      pruef(!!b.einzeln && b.einzeln.material.includes(b.einzeln.soll) && b.einzeln.soll !== b.einzeln.vorher, b.einzeln ? `direkt nach einer einzelnen Wahl (ohne Warten): Materialzeile „${b.einzeln.soll}“ (vorher „${b.einzeln.vorher}“)${b.einzeln.material.includes(b.einzeln.soll) ? "" : " · steht da: „" + b.einzeln.material.slice(0, 120) + "“"}` : "einzelne Wahl: keine Übung mit anderem Material gefunden");

      /* C: Speicherregel je Setter */
      const ist = { "tpGenerate (leerer Plan)": b.regel };
      const schritt = async (name, fn, arg) => {
        const r = await p.evaluate(async ({ code, arg }) => { __sp.length = 0; const f = eval(code); let e; try { e = await f(arg); } catch (x) { e = { fehler: "Abbruch – " + String(x.message || x) }; } return { regel: __regel(), e: e || null }; }, { code: fn.toString(), arg });
        ist[name] = r.regel; if (r.e && r.e.fehler) { ist[name] = "Fehler"; zeilen.push(`✗ ${name}: ${r.e.fehler}`); ok = false; }
      };
      await schritt("tpSetDauer", () => { tpSetDauer(tpSlots.findIndex(s => s.typ === "abschluss"), 15); });
      await schritt("tpDoAddSlot (Torwart)", () => { tpDoAddSlot("tw"); });
      await schritt("Läuft parallel zu", () => {
        const tw = tpSlots.findIndex(s => s.typ === "tw"), ziel = tpSlots.findIndex(s => /^Hauptteil 1$/.test(s.label || ""));
        const ps = document.querySelector(`.tp-slot[data-si="${tw}"] select[onchange*="parallelZu"]`);
        if (!ps) return { fehler: "keine Auswahl „läuft parallel zu“" };
        ps.value = String(ziel); ps.dispatchEvent(new Event("change"));
      });
      await schritt("Torwart-Haken", () => {
        const tw = tpSlots.findIndex(s => s.typ === "tw"), c = document.querySelector(`.tp-tw-player[data-slot="${tw}"][value="Kind B"]`);
        if (!c) return { fehler: "kein Haken" };
        c.checked = false; c.dispatchEvent(new Event("change"));
      });
      await schritt("tpDoAddSlot (Einzel)", () => { tpDoAddSlot("individual"); });
      await schritt("Einzelkind", () => {
        const ind = tpSlots.findIndex(s => s.typ === "individual"), sel = document.getElementById(`tp-ind-player-${ind}`);
        if (!sel) return { fehler: "keine Auswahl Einzelkind" };
        sel.value = "Kind E"; sel.dispatchEvent(new Event("change"));
      });
      await schritt("Ziel-Dauer", () => { const d = document.getElementById("tp-dauer"); d.value = "90"; d.dispatchEvent(new Event("change")); });
      await schritt("tpSetCoach", () => { const tw = tpSlots.findIndex(s => s.typ === "tw"); tpSetCoach(`tp-form-${tw}-0`, "Kenneth"); });
      await schritt("tpVersatzSetzen", () => { tpVersatzSetzen(tpSlots.findIndex(s => /^Hauptteil 2$/.test(s.label || "")), 1); });
      await schritt("tpVersatzZurueck", () => { tpVersatzZurueck(tpSlots.findIndex(s => /^Hauptteil 2$/.test(s.label || ""))); });
      await schritt("tpFeldWeglassen", () => {
        const si = tpSlots.findIndex(s => /^Hauptteil 1$/.test(s.label || ""));
        ["Charles", "Finn", "Kenneth"].forEach((t, q) => { tpCoaches[`tp-form-${si}-${q}`] = t; });
        tpRenderTimeline(); __sp.length = 0;
        if (tpFelderZahl(si) < 2) return { fehler: "nur ein Feld" };
        tpFeldWeglassen(si, 1);
      });
      await schritt("tpFeldZurueck", () => { tpFeldZurueck(tpSlots.findIndex(s => /^Hauptteil 1$/.test(s.label || ""))); });
      await schritt("tpDurchgaengeSetzen", () => { tpDurchgaengeSetzen(tpSlots.findIndex(s => /^Hauptteil 1$/.test(s.label || "")), 2); });
      await schritt("tpWarmPlus", () => { tpWarmPlus(tpSlots.findIndex(s => s.typ === "warmup")); });
      await schritt("tpWarmMinus", () => { tpWarmMinus(tpSlots.findIndex(s => s.typ === "warmup")); });
      await schritt("tpRegelWeg", () => {
        const si = tpSlots.findIndex(s => tpIstHauptteil(s.typ));
        if (!tpSlots[si].regel) { const r = tpAllForms().find(f => tpIstZusatzregel(f)); if (!r) return { fehler: "keine Zusatzregel" }; tpSlots[si].regel = r.name; }
        tpRegelWeg(si);
      });
      await schritt("tpSlotVerschieben", () => { const k = _tpKette(), si = k[1]; tpSlotVerschieben(si, 2); });
      await schritt("tpWahlWaehlen", () => {
        const sel = document.querySelector(".tp-form-sel"); if (!sel) return { fehler: "kein Auswahlfeld" };
        const id = sel.id, si = +id.split("-")[2];
        const i = tpAllForms().map((f, j) => j).find(j => j !== tpWahlIdx(id) && tpWahlZulaessig(si, j));
        tpWahlWaehlen(id, i);
      });
      await schritt("tpOnSelectChange", () => {
        const sel = [...document.querySelectorAll(".tp-form-sel")].find(x => [...x.options].some(o => o.value !== "" && o.value !== x.value));
        if (!sel) return { fehler: "kein Auswahlfeld mit Alternative" };
        const v = [...sel.options].map(o => o.value).find(x => x !== "" && x !== sel.value);
        sel.value = v; sel.dispatchEvent(new Event("change"));
      });
      await schritt("tpRemoveSlot", () => { tpRemoveSlot(tpSlots.findIndex(s => s.typ === "tw")); });
      await schritt("Rückgängig", () => { const k = [...document.querySelectorAll("#undo-toast button")].find(x => /Rückgängig/.test(x.textContent)); if (!k) return { fehler: "kein Rückgängig" }; k.click(); });
      await schritt("tpAnpassenUebernehmen", async () => {
        const v = await tpAnpassen(); document.getElementById("tp-anpassen-modal")?.remove();
        if (!window._tpAnpassen) return { fehler: "kein Vorschlag" + (v && v.fehler ? ": " + v.fehler : "") };
        __sp.length = 0;
        await tpAnpassenUebernehmen();
      });
      const ab = Object.keys(REGEL).filter(n => ist[n] !== REGEL[n]);
      pruef(!ab.length, `Speicherregel je Setter wie v886 (${Object.keys(REGEL).length} Stellen: ${["verzoegert", "sofort", "nein"].map(a => `${Object.values(REGEL).filter(x => x === a).length}× ${a}`).join(", ")})${ab.length ? " · abweichend: " + ab.map(n => `${n} ${ist[n]} statt ${REGEL[n]}`).join(" | ") : ""}`);
      const pr = await p.evaluate(() => { tpPlanSaveDebounced = __spEcht.deb; tpPlanSave = __spEcht.sof; return tpZustandPruefen(); });
      pruef(!pr.length, `nach allen Settern: Zustand = Seite${pr.length ? " · " + pr.slice(0, 2).join(" | ") : ""}`);
    } catch (e) { pruef(false, "B/C: Abbruch – " + String(e.message || e).split("\n")[0]); }
    const fe = s.fehler(); pruef(!fe.length, `B/C: keine Fehler in der Konsole${fe.length ? " · " + fe[0] : ""}`);
    await s.schliessen();
  }

  /* ── D: die zehn Golden-Abläufe – Zustand = Seite nach jedem Schritt ── */
  {
    const liste = golden.SZENARIEN, erg = new Array(liste.length);
    let naechstes = 0;
    const ablauf = async def => {
      const s = await golden.seite(h, def);
      const p = s.page, z = [];
      try {
        for (const [name, tun] of def.schritte) {
          await tun(p, s); await golden.ruhe(s);
          (await p.evaluate(() => tpZustandPruefen())).forEach(x => z.push(`nach „${name}“: ${x}`));
        }
      } catch (e) { z.push("Abbruch – " + String(e.message || e).split("\n")[0]); }
      const fe = s.fehler(); await s.schliessen();
      return { id: def.id, z, fe, n: def.schritte.length };
    };
    const arbeiter = async () => { for (;;) { const i = naechstes++; if (i >= liste.length) return; erg[i] = await ablauf(liste[i]); } };
    await Promise.all(Array.from({ length: Math.max(1, Number(process.env.GOLDEN_PARALLEL) || 3) }, arbeiter));
    erg.forEach(r => {
      pruef(!r.z.length && !r.fe.length, `${r.id}: Zustand = Seite nach jedem der ${r.n} Schritte${r.z.length ? " · " + r.z.slice(0, 2).join(" | ") : ""}${r.fe.length ? " · Konsole: " + r.fe[0] : ""}`);
    });
  }
  return h.ergebnis(titel, ok, zeilen);
};
