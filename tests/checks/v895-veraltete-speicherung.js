/* v895 (Nachtrag) · Eine veraltete automatische Speicherung überschreibt keine übernommene Vorlage.

   Gefunden über v568 im ganzen Lauf unter Last („L4-8 drei Feldtrainer“: in allen Hauptteilen
   „Dreieckspassen mit Abschluss | Spiegeldribbling | Ball-Staffel Paare“): Die verzögerte Speicherung
   des vorigen Plans (nach „Training füllen“) nahm Plan und Slots auf und wartete dann auf Abgleich und
   Trainernamen. In dieser Zeit schrieb „Vorlage übernehmen“ die Vorlage; danach kam der alte Plan an und
   überschrieb sie. Das Öffnen las so die Struktur der Vorlage mit den Übungen des alten Plans, und
   „Training füllen“ baute den Plan neu. Der Fehler ist älter als 4.8 Schritt 9, trat aber selten auf.

   Hier deterministisch, ohne Last: trainerMe antwortet für die automatische Speicherung künstlich spät
   (1,5 s). Erwartet: nach der Übernahme kommt kein Schreibvorgang mit dem alten Plan mehr, die Datenbank
   trägt die Struktur der Vorlage, „Plan speichern“ während eines neuen Öffnens schreibt nichts Veraltetes.
   Gegen den Stand vor dem Nachtrag rot. */
"use strict";
const golden = require("./v877-trainingsplan-golden.js").intern;
const tpPosts = s => s.gesendet.filter(g => /\/rest\/v1\/trainingsplan$/.test(g.pfad) && g.methode === "POST");

module.exports = async function (h) {
  const titel = "v895 Nachtrag · veraltete automatische Speicherung überschreibt keine übernommene Vorlage";
  const zeilen = []; let ok = true;
  const pruef = (bed, text) => { zeilen.push((bed ? "✓ " : "✗ ") + text); if (!bed) ok = false; };
  const s = await golden.seite(h, { id: "v895-veraltet" });
  const p = s.page;
  try {
    await p.evaluate(async () => { await tpGenerate(); });
    await golden.ruhe(s);
    /* Eine Änderung von Hand – die verzögerte Speicherung startet nach 1,2 s und hängt dann an trainerMe. */
    const alt = await p.evaluate(async () => {
      const echt = window.trainerMe; let einmal = true;
      window.trainerMe = async () => { if (einmal) { einmal = false; await new Promise(r => setTimeout(r, 1500)); } return echt ? echt() : null; };
      const si = tpSlots.findIndex(x => /^Hauptteil 1$/.test(x.label || ""));
      tpSetCoach(`tp-form-${si}-0`, "Kenneth");
      await new Promise(r => setTimeout(r, 1400));       // die Speicherung läuft schon und wartet
      return JSON.stringify(tpPlanEntries());
    });
    const n0 = tpPosts(s).length;
    await p.evaluate(async () => { _vuAuswahl = 700; await vorlageUebernehmenSetzen(); });
    await new Promise(r => setTimeout(r, 2000));
    await golden.ruhe(s);
    const nach = tpPosts(s).slice(n0);
    const iV = nach.findIndex(x => /return=minimal/.test((x.header || {})["prefer"] || "") || (x.body && x.body.plan && x.body.plan.some(e => e.station != null || e.alleFelder)));
    const veraltet = nach.slice(Math.max(0, iV)).filter(x => x.body && JSON.stringify(x.body.plan) === alt);
    const seite = await p.evaluate(() => tpSlots.map(x => x.label));
    const db = s.plan.db["2030-03-05"] || {};
    pruef(iV >= 0, `Vorlage übernommen (${nach.length} Schreibvorgänge danach, Vorlage an Stelle ${iV + 1})`);
    pruef(!veraltet.length, `kein Schreibvorgang mit dem alten Plan nach der Vorlage (${veraltet.length})`);
    pruef(JSON.stringify((db.slots || []).map(x => x.label)) === JSON.stringify(seite),
      `Datenbank trägt die Struktur, die die Seite zeigt (${(db.slots || []).length} Blöcke, erster Hauptteil „${String(((db.slots || []).find(x => /Hauptteil/.test(x.label || "")) || {}).label || "").slice(0, 40)}“)`);

    /* „Plan speichern“, während der Plan neu geöffnet wird: das Aufgenommene ist veraltet und wird nicht geschrieben. */
    const n1 = tpPosts(s).length;
    const knopf = await p.evaluate(async () => {
      const echt = window.trainerMe; let einmal = true;
      window.trainerMe = async () => { if (einmal) { einmal = false; await new Promise(r => setTimeout(r, 800)); } return echt ? echt() : null; };
      const sp = tpPlanSave(true);
      await new Promise(r => setTimeout(r, 100));
      const op = tpPlanRestore("2030-03-05");
      await Promise.all([sp, op]);
      return [...document.querySelectorAll("#toast, .toast")].map(t => t.textContent).join(" ");
    });
    await golden.ruhe(s);
    pruef(tpPosts(s).length === n1, `„Plan speichern“ während des Öffnens schreibt nichts Veraltetes (${tpPosts(s).length - n1} Schreibvorgänge)`);
    const fe = s.fehler(); pruef(!fe.length, `keine Fehler in der Konsole${fe.length ? " · " + fe[0] : ""}`);
  } catch (e) {
    pruef(false, "Abbruch – " + String(e.message || e).split("\n")[0]);
  } finally { await s.schliessen(); }
  return h.ergebnis(titel, ok, zeilen);
};
