/* v921 · Charles 21.11. (Bild): „Nach KI-Auswertung fehlt ein klarer Hinweis, dass es ausgewertet wurde und man den
   nächsten Schritt geht … maximale Usability.“ – Bild freigegeben, Kinder „nur Ausreißer“.
   a) Kleines Feld im Bogen: Knopf „Fertig – auswerten“; danach wird gespeichert (einheit_bewertung) und eine Karte
      „✅ Ausgewertet und gespeichert“ mit der Zusammenfassung geht auf – der Bogen ist zu (wie die Vollansicht).
   b) Kinder: zwei Reihen „★★★ Heute besonders stark“ und „★ Potenzial heute nicht entfaltet“ mit allen anwesenden Kindern;
      vorausgewählt ist, was die KI eingetragen hat (Kind A ★★★). Ein Tipp auf Kind E in der unteren Reihe setzt ★ für den
      eigenen Namen (qual_von), ein zweiter Tipp nimmt ihn zurück. Kinder ohne Tipp bleiben ohne Wertung.
   c) Mit Tagebuch-Vorschlag steht dasselbe Ergebnis oben in der Prüfkarte, darunter der Vorschlag mit „Passt so“.
   d) awQualSetzen ist der eine Speicherweg (Bogen und Karte). */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v921 Nachbewertung: „Fertig – auswerten“, Ergebniskarte, Kinder nur wer heraussticht";
  const probleme = [], zeilen = [];
  const gestern = h.tagePlus(-1);
  const lauf = async (mitTagebuch) => {
    /* Tagebuch: POST liefert die Zeile mit id zurück, GET findet sie wieder (wie Supabase mit return=representation). */
    const tb = []; let nr = 70;
    const tbTabelle = (u, req) => {
      if (req.method() === "POST") { let b = null; try { b = JSON.parse(req.postData() || "null"); } catch (e) {} const neu = (Array.isArray(b) ? b : [b]).map(x => ({ id: nr++, ...x })); tb.push(...neu); return { status: 201, body: JSON.stringify(neu) }; }
      if (req.method() === "PATCH") return { status: 204, body: "" };
      const id = (u.searchParams.get("id") || "").replace("eq.", ""); return id ? tb.filter(x => String(x.id) === id) : tb;
    };
    const s = await h.starten({ hoehe: 1600, supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(), profiles: [{ name: "Charles", rolle: "trainer" }], anwesenheit: [], einheit_bewertung: [], trainings_eval: [], tagebuch_eintrag: tbTabelle, tagebuch_punkt: [],
      trainingsplan: [{ datum: gestern, plan: [{ formIdx: 1, formName: "Dribbel Quadrat", trainer: "Alle", slotLabel: "Warm up" }], kopf: {} }],
      funktionen: { "ki-nachbereitung": () => ({ art: "training", ergebnis: { einheit: { spass: 4, umsetzung: 3, erfolg: 3, notiz: "Viel über Fragen gecoacht." },
        uebungen: [], kinder: [{ kind: "Kind 1", sterne: 3 }],
        tagebuch: mitTagebuch ? { baustein: "ich", beobachtung: "Coaching über Fragen.", aha: null, konsequenz: null, schlagworte: [] } : null } }) } }) });
    const r = await s.page.evaluate(async ({ gestern, mitTagebuch }) => {
      const w = ms => new Promise(x => setTimeout(x, ms));
      window.trainerMe = async () => "Charles";
      if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
      document.getElementById("pin-gate")?.remove();
      await loadKader(); BEW_AB = "2026-01-01";
      AW_DATA[gestern] = { "Kind A": { da: true }, "Kind C": { da: true }, "Kind E": { da: true } };
      await einheitBewertenOpen(); await einheitDetailOpen(gestern);
      for (let i = 0; i < 40 && !document.getElementById("nb-los"); i++) await w(50);
      const out = { knopf: (document.getElementById("nb-los") || {}).textContent?.trim() };
      document.getElementById("nb-text").value = _nbText = "Heute viel über Fragen gecoacht, Kind A war richtig stark, die Gruppe hat gut mitgemacht.";
      await nbAuswerten("training");
      const ziel = mitTagebuch ? "tb-pruefen" : "nb-ergebnis";
      for (let i = 0; i < 60 && !document.getElementById(ziel); i++) await w(100);
      await w(300);
      const k = document.getElementById(ziel);
      out.karte = !!k; out.bogenZu = !document.getElementById("eb-modal");
      out.text = k ? k.textContent.replace(/\s+/g, " ") : "";
      const reihe = cls => [...(k ? k.querySelectorAll(".nb-erg-chip" + cls) : [])].map(b => b.textContent.trim() + ":" + b.getAttribute("aria-pressed"));
      out.stark = reihe(":not(.schwach)"); out.schwach = reihe(".schwach");
      const e = k && [...k.querySelectorAll(".nb-erg-chip.schwach")].find(b => /Kind E/.test(b.textContent));
      if (e) { e.click(); await w(400); }
      out.nachTipp = JSON.parse(JSON.stringify(AW_DATA[gestern]["Kind E"] || {}));
      const e2 = document.querySelector(`#${ziel} .nb-erg-chip.schwach[aria-pressed="true"]`);
      out.gedrueckt = e2 ? e2.textContent.trim() : "";
      if (e2) { e2.click(); await w(400); }
      out.zurueck = JSON.parse(JSON.stringify(AW_DATA[gestern]["Kind E"] || {}));
      out.kindC = JSON.parse(JSON.stringify(AW_DATA[gestern]["Kind C"] || {}));
      out.passt = !!document.getElementById("tbp-passt");
      return out;
    }, { gestern, mitTagebuch });
    const gesendet = s.gesendet.map(g => g.methode + " " + g.pfad.split("/").pop());
    const fe = s.fehler(); await s.schliessen();
    return { r, gesendet, fe };
  };
  const ohne = await lauf(false), mit = await lauf(true);
  const o = ohne.r;
  if (o.knopf !== "Fertig – auswerten") probleme.push(`a) Knopf „${o.knopf}“`);
  if (!ohne.gesendet.some(x => /einheit_bewertung/.test(x))) probleme.push("a) nicht gespeichert (einheit_bewertung)");
  if (!o.karte || !o.bogenZu || !/✅ Ausgewertet und gespeichert/.test(o.text)) probleme.push(`a) Ergebniskarte ${o.karte}, Bogen zu ${o.bogenZu}: „${o.text.slice(0, 120)}“`);
  if (!/Spaß/.test(o.text)) probleme.push("a) Zusammenfassung fehlt");
  if (o.stark.length !== 3 || o.stark.filter(x => /:true$/.test(x)).length !== 1 || o.schwach.some(x => /:true$/.test(x))) probleme.push(`b) Reihen: stark ${o.stark.join(" ")} · schwach ${o.schwach.join(" ")}`);
  if (o.nachTipp.qual !== 1 || !o.nachTipp.qual_von || o.nachTipp.qual_von.Charles !== 1 || o.gedrueckt !== "Kind E ✓") probleme.push(`b) Tipp auf Kind E: ${JSON.stringify(o.nachTipp)}, gedrückt „${o.gedrueckt}“`);
  if (o.zurueck.qual || (o.zurueck.qual_von && o.zurueck.qual_von.Charles)) probleme.push(`b) zweiter Tipp nimmt nicht zurück: ${JSON.stringify(o.zurueck)}`);
  if (o.kindC.qual) probleme.push(`b) Kind C ohne Tipp hat eine Wertung: ${JSON.stringify(o.kindC)}`);
  const m = mit.r;
  if (!m.karte || !/✅ Ausgewertet und gespeichert/.test(m.text) || !/Tagebuch-Vorschlag/.test(m.text) || !m.passt || m.stark.length !== 3) probleme.push(`c) Prüfkarte: ${m.karte}, Passt so ${m.passt}, Reihen ${m.stark.length}: „${m.text.slice(0, 120)}“`);
  const views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  if (!/async function awQualSetzen\(datum,eigene\)/.test(views) || !/await awQualSetzen\(datum,eigene\)/.test(views)) probleme.push("d) einheitSave nutzt awQualSetzen nicht");
  zeilen.push(`a) „${o.knopf}“ → gespeichert, Karte „Ausgewertet und gespeichert“, Bogen zu · b) Kind A vorausgewählt, Kind E ★ und zurück, Kind C ohne Wertung · c) mit Vorschlag oben in der Prüfkarte`);
  const fe = ohne.fe.concat(mit.fe); if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
