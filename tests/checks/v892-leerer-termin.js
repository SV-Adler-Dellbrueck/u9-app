/* v892 · Bestandsaufnahme 4.8, Schritt 9 – Fehlerbild 6: Termin ohne gespeicherten Plan.

   Bis v891 übernahm ein Termin ohne gespeicherten Plan die Struktur des zuvor geöffneten Termins –
   Blöcke, Trainer, Torwart-Haken, Einzelkind und Marken – und speicherte sie bei der ersten
   Änderung (Golden G5, Termin B). Seit v892 startet er mit dem Grundgerüst (TP_PHASEN), Beschluss
   Charles 19.11.

   a) Termin A (Altbestand mit Torwart- und Einzelblock) öffnen, dann Termin B ohne Plan: Blöcke =
      Grundgerüst, keine Übung, keine Haken/kein Kind im Zustand, kein Trainer am Torwart-/Einzelblock.
   b) Auf Termin B einen Block anlegen und Termin B erneut öffnen (wie nach „Gruppen fertig“): die
      Struktur, an der gerade geplant wird, bleibt.
   c) Zurück zu Termin A: dessen gespeicherte Struktur kommt wieder. Gegen v891 ist a) rot. */
"use strict";
const golden = require("./v877-trainingsplan-golden.js").intern;

module.exports = async function (h) {
  const titel = "4.8 Schritt 9 · Fehlerbild 6: Termin ohne gespeicherten Plan startet mit dem Grundgerüst";
  const zeilen = []; let ok = true;
  const pruef = (bed, text) => { zeilen.push((bed ? "✓ " : "✗ ") + text); if (!bed) ok = false; };
  const g5 = golden.SZENARIEN.find(x => x.id === "G5-oeffnen-aus-der-db");
  const s = await golden.seite(h, g5);
  const p = s.page;
  const oeffnen = d => p.evaluate(async d => {
    const f = document.getElementById("tp-date"); f.value = d;
    await tpTrainerRsvpLaden(d); await tpPlanRestore(d);
    return { labels: tpSlots.map(x => x.label), wahl: Object.keys(TP_ZUSTAND.wahl).length, tw: JSON.stringify(TP_ZUSTAND.tw), kind: JSON.stringify(TP_ZUSTAND.kind),
      grund: TP_PHASEN.map(x => x.label), farbeGleich: tpSlots[0] !== TP_PHASEN[0] };
  }, d);
  try {
    const a0 = await oeffnen("2030-03-05");
    pruef(a0.labels.includes("Torwart") && a0.labels.includes("Einzel") && a0.wahl > 0 && a0.kind !== "{}",
      `Termin A geöffnet: ${a0.labels.join(", ")} · ${a0.wahl} Felder gewählt, Kind ${a0.kind}`);
    const b = await oeffnen("2030-03-07");
    pruef(JSON.stringify(b.labels) === JSON.stringify(b.grund), `a) Termin B: Grundgerüst ${JSON.stringify(b.labels)}`);
    pruef(b.wahl === 0 && b.tw === "{}" && b.kind === "{}", `a) Termin B: keine Übung, keine Torwart-Haken, kein Kind (wahl ${b.wahl}, tw ${b.tw}, kind ${b.kind})`);
    pruef(b.farbeGleich, "a) das Grundgerüst ist eine Kopie – Änderungen am Termin ändern TP_PHASEN nicht");
    const b2 = await p.evaluate(async () => {
      tpDoAddSlot("tw"); const vor = tpSlots.map(x => x.label);
      await tpPlanRestore("2030-03-07");
      return { vor, nach: tpSlots.map(x => x.label) };
    });
    pruef(b2.vor.includes("Torwart") || b2.vor.length === b.labels.length + 1, `b) Block angelegt: ${JSON.stringify(b2.vor)}`);
    pruef(JSON.stringify(b2.nach) === JSON.stringify(b2.vor), `b) derselbe Termin erneut geöffnet: Struktur bleibt ${JSON.stringify(b2.nach)}`);
    const c = await oeffnen("2030-03-05");
    pruef(JSON.stringify(c.labels) === JSON.stringify(a0.labels), `c) zurück zu Termin A: ${c.labels.join(", ")}`);
    const fe = s.fehler(); pruef(!fe.length, `keine Fehler in der Konsole${fe.length ? " · " + fe[0] : ""}`);
  } catch (e) {
    pruef(false, "Abbruch – " + String(e.message || e).split("\n")[0]);
  } finally { await s.schliessen(); }
  return h.ergebnis(titel, ok, zeilen);
};
