/* v638 · PO nach dem ersten Diktat am Handy (Screenshot Nachbereitung):
   „… die Kachel KI-Auswertung etwas verrutscht … Punktsetzung, die automatisch gemacht wird, obwohl
   ich gar nicht mit dem Satz zu Ende bin … wenn ich dann wieder KI-Auswertung anklicke, setzt er
   einfach den gleichen Text oder einen weiteren Auswertungstext in das große Textfeld … für mein
   eigenes Tagebuch innerhalb der App die Klarnamen … eine Version für die Trainerlehrgänge … mit dem
   Hinweis, dass die tatsächlichen Namen durch Buchstaben ersetzt werden.“

   a) Satzgrenze nur nach langer Pause: kurz → weiter mit Leerzeichen, lang → Punkt und Großbuchstabe.
   b) Knopfreihe im kleinen Kasten bleibt im Kasten, Knopf heißt „KI-Auswertung“.
   c) Eine zweite Auswertung ersetzt den KI-Teil eines Notizfelds, der selbst getippte Teil bleibt.
   d) „Korrektur einsprechen“ hängt eine Zeile „Korrektur: “ an und öffnet die Vollansicht.
   e) Tagebuch in der App mit Vornamen (KI-Vorschlag und Einfügen), nach außen Buchstaben + Hinweis.
   f) Eine zweite KI-Beobachtung im Tagebuch ersetzt die erste, statt sich davorzusetzen. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const gestern = h.tagePlus(-1);
  const s = await h.starten({ hoehe: 1400, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), profiles: [{ name: "Charles", rolle: "trainer" }], anwesenheit: [], einheit_bewertung: [], trainings_eval: [], tagebuch_eintrag: [],
    trainingsplan: [{ datum: gestern, plan: [{ formIdx: 1, formName: "Dribbel Quadrat", trainer: "Alle", slotLabel: "Warm up" }], kopf: {} }],
    funktionen: { "ki-nachbereitung": () => ({ art: "training", ergebnis: { einheit: { spass: 4, umsetzung: null, erfolg: null, notiz: "Die Gruppe war unruhig." },
      uebungen: [], kinder: [], tagebuch: null } }) } }) });
  const r = await s.page.evaluate(async ({ gestern }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    window.trainerMe = async () => "Charles";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    window.SpeechRecognition = function () { this.start = () => {}; this.stop = () => {}; this.abort = () => {}; };
    window.webkitSpeechRecognition = window.SpeechRecognition;
    const out = {};
    // a) Satzgrenzen
    out.a = { kurz: _dkAnhaengen("Heute war es gut", "die Kinder hatten Spaß", false),
              lang: _dkAnhaengen("Heute war es gut", "die Kinder hatten Spaß", true),
              leer: _dkAnhaengen("", "heute war es gut", false),
              pause: typeof DK_SATZPAUSE_MS === "number" ? DK_SATZPAUSE_MS : null };
    await loadKader();
    await einheitBewertenOpen(); await einheitDetailOpen(gestern);
    for (let i = 0; i < 40 && !document.getElementById("nb-los"); i++) await warte(50);
    // b) Knopfreihe
    const box = document.getElementById("nb-box").getBoundingClientRect(), los = document.getElementById("nb-los");
    const lr = los.getBoundingClientRect();
    out.b = { imKasten: lr.right <= box.right + 0.5 && lr.left >= box.left - 0.5, text: los.textContent.trim(), hoch: Math.round(lr.height) };
    // c) Zweimal auswerten
    const notiz = document.getElementById("eb-notiz");
    notiz.value = "Selbst getippt.";
    document.getElementById("nb-text").value = _nbText = "Heute war die Gruppe unruhig und hat nicht zugehört.";
    await nbAuswerten("training"); await warte(50);
    out.c = { erst: notiz.value };
    await nbAuswerten("training"); await warte(50);
    out.c.zweit = notiz.value;
    out.c.status = document.getElementById("nb-status").textContent;
    // d) Korrektur einsprechen
    const korr = [...document.querySelectorAll("#nb-status button")].find(b => /Korrektur einsprechen/.test(b.textContent));
    if (korr) korr.click(); await warte(50);
    out.d = { knopf: !!korr, ov: !!document.getElementById("nb-gross-ov"), text: (document.getElementById("nb-gross-text") || {}).value || "" };
    if (typeof _dk !== "undefined" && _dk) diktatStop();
    nbGrossZu(); document.getElementById("eb-modal")?.remove();
    // e) Tagebuch mit Vornamen innen, Buchstaben außen
    const ERF = "Zacharias Beispielmann";
    KADER.push({ id: 999999, _id: 999999, name: ERF, aktiv: true });
    const tb = nbTbDecknamen({ baustein: "ich", beobachtung: "Kind 1 hat sich zurückgezogen.", aha: null, konsequenz: null, schlagworte: [] }, { zurueck: { "Kind 1": ERF } });
    out.e = { ki: tb.beobachtung, alias: tbAlias(ERF), aussen: tbPseudonym("Zacharias und " + ERF + " spielten."), vorname: tbVorname(ERF) };
    _TB_LISTE.length = 0;
    _TB_LISTE.push({ id: 5, datum: "2026-09-27", baustein: "ich", ausloeser: "Training", beobachtung: "Zacharias war heute still.", aha: "Zacharias braucht Ruhe.", konsequenz: "Mit Zacharias allein sprechen." });
    out.e.export = tagebuchExport(5);
    out.e.monat = tagebuchMonatMarkdown("2026-09");
    // f) KI-Beobachtung ersetzt sich
    tagebuchNeu(); await warte(30);
    tbKiAnwenden({ beobachtung: "Erste Auswertung.", schlagworte: [] });
    tbKiAnwenden({ beobachtung: "Zweite Auswertung.", schlagworte: [] });
    out.f = _TB ? _TB.werte.beobachtung : "";
    tagebuchSchliessen();
    KADER.pop();
    return out;
  }, { gestern });
  const fe = s.fehler(); await s.schliessen();

  const a = r.a;
  if (a.kurz !== "Heute war es gut die Kinder hatten Spaß") probleme.push(`a) kurze Pause setzt Satzzeichen: „${a.kurz}“`);
  if (a.lang !== "Heute war es gut. Die Kinder hatten Spaß") probleme.push(`a) lange Pause beginnt keinen Satz: „${a.lang}“`);
  if (a.leer !== "Heute war es gut") probleme.push(`a) Anfang nicht großgeschrieben: „${a.leer}“`);
  if (!(a.pause >= 2500)) probleme.push("a) Satzpause fehlt oder ist zu kurz: " + a.pause);
  if (!r.b.imKasten || r.b.text !== "KI-Auswertung" || r.b.hoch < 44) probleme.push("b) Knopfreihe: " + JSON.stringify(r.b));
  if (r.c.erst !== "Selbst getippt.\nDie Gruppe war unruhig." || r.c.zweit !== r.c.erst) probleme.push("c) zweite Auswertung: " + JSON.stringify(r.c));
  if (!r.d.knopf || !r.d.ov || !/Korrektur: $/.test(r.d.text)) probleme.push("d) Korrektur: " + JSON.stringify(r.d));
  const e = r.e;
  if (e.ki !== "Zacharias hat sich zurückgezogen.") probleme.push(`e) KI-Vorschlag ohne Vornamen: „${e.ki}“`);
  if (e.vorname !== "Zacharias") probleme.push("e) Vorname: " + e.vorname);
  if (e.aussen !== `${e.alias} und ${e.alias} spielten.`) probleme.push(`e) nach außen: „${e.aussen}“`);
  if (/Zacharias/.test(e.export) || !e.export.includes(e.alias) || !/Aus Datenschutzgründen sind die Namen der Kinder durch Buchstaben ersetzt/.test(e.export)) probleme.push("e) Einzelexport: " + e.export.slice(0, 200));
  if (/Zacharias/.test(e.monat) || !/Aus Datenschutzgründen/.test(e.monat)) probleme.push("e) Monatsexport: " + e.monat.slice(0, 200));
  if (r.f !== "Zweite Auswertung.") probleme.push(`f) Tagebuch-Beobachtung: „${r.f}“`);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`kurz „${a.kurz}“ · lang „${a.lang}“`, `Notiz nach zwei Auswertungen: ${JSON.stringify(r.c.zweit)}`, `innen „${e.ki}“ · außen „${e.aussen}“`);
  return h.ergebnis("v638 Diktat ohne Pausen-Punkte, KI-Auswertung direkt und ohne Doppelungen, Tagebuch mit Vornamen", !probleme.length, probleme.concat(zeilen));
};
