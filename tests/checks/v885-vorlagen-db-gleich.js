/* v885 · Abgleich Lieferdatei ↔ Datenbankstand der Vorlagen (19.11.2026).

   Der Datenbankstand nach v882 trägt in den Stationen-Vorlagen (Hauptteil 1 und 2) noch den Zusatz
   „3 Min frei, dann eng“ im Label, die Datei nicht. Die Funktionsübersicht (Übungsdatenbank, v623)
   und boot.js (tpOhneFreiEng) sagen, welche Seite gilt: Der Hinweis fiel in v623 auf Wunsch des
   Auftraggebers weg, die Vorlagen tragen ihn nicht mehr, gespeicherte Labels alter Art verlieren
   ihn beim Zeichnen. Die Datenbank hat ihn behalten, weil der Abgleich beim Öffnen nur skalierung
   und ziel_kinder nachzieht – die Datei ist hier die neuere Fassung und wird NICHT angeglichen.

   a) vorlagen.json ist gültig: JSON, Schema, Stand im Muster JJJJ-MM-TT-n, eindeutige Namen,
      _evPruefung der App ohne Fehler.
   b) Regel der Funktionsübersicht: Keine Stationen-Vorlage trägt in Hauptteil 1 oder 2 den Zusatz
      „3 Min frei, dann eng“ (es müssen mindestens zehn solcher Vorlagen gefunden werden, sonst
      prüft die Regel nichts).
   c) Der Unterschied zur Datenbank ist für die Anzeige folgenlos: Für jedes Stationen-Label wird
      die Datenbankform gebildet (Zusatz vor dem ersten Doppelpunkt); tpOhneFreiEng macht daraus
      wieder genau das Label der Datei, und der Blockkopf (tpSlotKopfText) ist für beide gleich. */
"use strict";
module.exports = async function (h) {
  const fs = require("fs"), path = require("path");
  const probleme = [], zeilen = [];
  const vorTxt = fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8");

  // a) statisch
  let vor = null;
  try { vor = JSON.parse(vorTxt); } catch (e) { probleme.push("a) vorlagen.json ist kein gültiges JSON: " + e.message); }
  const stationen = [];
  if (vor) {
    if (vor.schema !== "adler-vorlagen/1") probleme.push(`a) Schema „${vor.schema}“`);
    if (!/^\d{4}-\d{2}-\d{2}-\d+$/.test(String(vor.stand || ""))) probleme.push(`a) Stand „${vor.stand}“ folgt nicht dem Muster JJJJ-MM-TT-n`);
    const namen = (vor.vorlagen || []).map(v => v.name);
    const doppelt = namen.filter((n, i) => namen.indexOf(n) !== i);
    if (doppelt.length) probleme.push("a) doppelte Namen: " + doppelt.join(", "));
    // b) Regel
    for (const v of vor.vorlagen || []) {
      (v.bloecke || []).forEach((b, i) => {
        const lab = String(b.label || "");
        if (!/^Hauptteil [12] – (?:(?:drei )?Stationen|Gruppen wechseln die Station)\b/.test(lab)) return;
        stationen.push({ name: v.name, i, lab });
        if (/Min\.? frei,? dann eng/.test(lab)) probleme.push(`b) ${v.name.split(" ")[0]} bloecke[${i}] trägt „3 Min frei, dann eng“`);
      });
    }
    const nVorl = new Set(stationen.map(x => x.name)).size;
    if (nVorl < 10) probleme.push(`b) nur ${nVorl} Stationen-Vorlagen gefunden – die Regel prüft so nichts`);
    zeilen.push(`a) ${namen.length} Vorlagen, Stand ${vor.stand} · b) ${stationen.length} Stationen-Labels in ${nVorl} Vorlagen ohne Zusatz`);
  }

  // a) und c) in der Seite
  /* Die Attrappe kennt alle Übungen der Bibliothek und alle Vorlagen der Datei (wie v568) – so prüft
     _evPruefung die Verweise auf Übungen gegen den vollen Bestand. */
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const custom = (bib.uebungen || []).map((u, i) => ({ ...u, id: 6000 + i, custom: true }));
  const vorhanden = ((vor && vor.vorlagen) || []).map((v, i) => ({ ...v, id: 900 + i }));
  const s = await h.starten({
    bibliothek: true, hoehe: 1800,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(),
      trainingsformen: (u, req) => req.method() === "GET" ? custom : { status: 201, body: "[]" },
      trainingsvorlagen: (u, req) => req.method() === "GET" ? vorhanden : { status: 201, body: "[]" }
    })
  });
  await h.sichtbarMachen(s.page, "#train-sub-planung");
  const r = await s.page.evaluate(async ({ vorTxt, stationen }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = { ev: null, abw: [] };
    /* Erst der Abgleich beim Öffnen – danach kennt tpAllForms() die Übungen, auf die die Vorlagen verweisen (wie v568). */
    if (typeof _bibLaeuft !== "undefined") {
      for (let i = 0; i < 100; i++) { if (!_bibLaeuft && typeof VORLAGEN !== "undefined" && VORLAGEN.length >= 30) break; await warte(100); }
      while (_bibLaeuft) await warte(50);
    }
    out.ev = typeof _evPruefung === "function" ? _evPruefung(vorTxt).fehler : ["_evPruefung fehlt"];
    if (typeof tpOhneFreiEng !== "function" || typeof tpSlotKopfText !== "function") { out.fehlt = true; return out; }
    for (const x of stationen) {
      const db = x.lab.replace(/^([^:|]*?):/, "$1, 3 Min frei, dann eng:");
      if (db === x.lab) { out.abw.push(`${x.name.split(" ")[0]} bloecke[${x.i}]: kein Doppelpunkt für die Datenbankform`); continue; }
      if (tpOhneFreiEng(db) !== x.lab) out.abw.push(`${x.name.split(" ")[0]} bloecke[${x.i}]: tpOhneFreiEng ergibt „${tpOhneFreiEng(db)}“`);
      if (tpSlotKopfText(db) !== tpSlotKopfText(x.lab)) out.abw.push(`${x.name.split(" ")[0]} bloecke[${x.i}]: Kopf „${tpSlotKopfText(db)}“ statt „${tpSlotKopfText(x.lab)}“`);
    }
    return out;
  }, { vorTxt, stationen }).catch(e => ({ err: String(e) }));
  const fe = s.fehler();
  await s.schliessen();

  if (r.err) probleme.push("Seite: " + r.err);
  else {
    if (r.ev.length) probleme.push("a) _evPruefung: " + r.ev.slice(0, 3).join(" · "));
    if (r.fehlt) probleme.push("c) tpOhneFreiEng oder tpSlotKopfText fehlt");
    r.abw.forEach(x => probleme.push("c) " + x));
    zeilen.push(`c) ${stationen.length} Labels in Datenbankform zeigen denselben Blockkopf wie die Datei`);
  }
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v885 Vorlagen: Datei gültig, kein „3 Min frei, dann eng“, Datenbankform zeigt dasselbe", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
