/* v569 – Die Skalierungszeile liest ihre Stärken aus der Vorlage, nicht aus einer festen Liste.

   Befund aus dem Paket vom 18.09. (Aufstellungen 3+1 und FUNiño): Der Kader der U9 I hat
   höchstens 14 Kinder, die neun Spieltags-Einheiten skalieren deshalb über 8/10/12/14. Die
   Anzeige in md-einheit-import.js las bis v568 an ZWEI Stellen die fest verdrahtete Liste
   ["8","12","16"] – Vorschau im Fenster „Vorlage übernehmen“ und Steckbrief in „Vorlagen
   ansehen“. Die Werte 10 und 14 wären stillschweigend aus der Anzeige gefallen: die Vorlage
   nennt sie, der Trainer sieht sie nie, und nichts wird rot.

   Fälle:
   a) Die Schlüsselliste kommt aus dem Objekt: 8/10/12/14 ergibt vier Zeilen, 8/12/16 drei.
      Numerisch sortiert – alphabetisch stünde „10“ vor „8“. Leere Werte und Schlüssel ohne
      Ziffern zählen nicht.
   b) Vorschau im Übernehmen-Fenster: eine Spieltags-Einheit zeigt alle vier Stärken in der
      Reihenfolge 8, 10, 12, 14; eine Konzept-Einheit unverändert ihre drei.
   c) Steckbrief in „Vorlagen ansehen“: dasselbe.
   d) Die Datei: die neun Spieltags-Einheiten tragen genau 8/10/12/14, die 21 anderen 8/12/16. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");

  // d) Datei
  const vor = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8"));
  const keys = v => Object.keys(v.skalierung || {}).sort((a, b) => a - b).join("/");
  const spieltag = (vor.vorlagen || []).filter(v => /^L(4-[678]|5-[456]|6-[345]) /.test(String(v.name)));
  const konzept = (vor.vorlagen || []).filter(v => !spieltag.includes(v));
  const falschNeu = spieltag.filter(v => keys(v) !== "8/10/12/14").map(v => `${v.name} (${keys(v)})`);
  const falschAlt = konzept.filter(v => keys(v) !== "8/12/16").map(v => `${v.name} (${keys(v)})`);
  if (spieltag.length !== 9) probleme.push(`${spieltag.length} Spieltags-Einheiten in der Datei, erwartet 9`);
  if (falschNeu.length) probleme.push("Spieltags-Einheit ohne 8/10/12/14: " + falschNeu.join(", "));
  if (falschAlt.length) probleme.push("Konzept-Einheit ohne 8/12/16: " + falschAlt.join(", "));

  /* Die Attrappe liefert die Vorlagen der Datei fertig aus der Datenbank – ohne Abgleich, denn
     geprüft wird hier nur die Anzeige. */
  const rows = (vor.vorlagen || []).map((v, i) => ({ ...v, id: 500 + i }));
  const datum = h.tagePlus(3);
  const s = await h.starten({
    hoehe: 2400, supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(),
      termine: [{ id: 7, datum, typ: "training", trainer_status: { Charles: "ja", Finn: "ja" } }],
      trainingsvorlagen: rows
    })
  });
  const r = await s.page.evaluate(async ({ datum }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = { fehlt: [] };
    for (const n of ["_evSkalierungSchluessel", "vorlageUebernehmenOpen", "vorlagenAnsichtOpen", "_vaSteckbrief"]) if (typeof window[n] !== "function") out.fehlt.push(n);
    if (out.fehlt.length) return out;
    // a) die Rechnung
    out.vier = _evSkalierungSchluessel({ "14": "d", "8": "a", "10": "b", "12": "c" });
    out.drei = _evSkalierungSchluessel({ "8": "a", "12": "b", "16": "c" });
    out.leer = _evSkalierungSchluessel({ "8": "a", "10": "", "12": "c", "x": "y" });
    out.nichts = _evSkalierungSchluessel(null);
    // b) Vorschau im Übernehmen-Fenster
    const feld = document.getElementById("tp-date");
    if (feld && ![...feld.options].some(o => o.value === datum)) feld.add(new Option(datum, datum));
    if (feld) feld.value = datum;
    await vorlageUebernehmenOpen(); await warte(120);
    const staerken = () => [...document.querySelectorAll("#vu-inhalt b, #va-inhalt b")].map(b => (b.textContent.match(/^(\d+) Kinder:$/) || [])[1]).filter(Boolean);
    const idVon = pfx => String((VORLAGEN.find(v => String(v.name).startsWith(pfx + " ")) || {}).id);
    vuWaehlen(idVon("L4-6")); await warte(80); out.vorschauNeu = staerken();
    vuWaehlen(idVon("L4-6")); vuWaehlen(idVon("L1-1")); await warte(80); out.vorschauAlt = staerken();
    vorlageUebernehmenClose();
    // c) Steckbrief in „Vorlagen ansehen“
    await vorlagenAnsichtOpen(); await warte(120);
    vaToggle(idVon("L4-8")); await warte(80); out.steckbriefNeu = staerken();
    vaToggle(idVon("L4-8")); vaToggle(idVon("L5-1")); await warte(80); out.steckbriefAlt = staerken();
    vorlagenAnsichtClose();
    return out;
  }, { datum });
  const fehler = s.fehler();
  await s.schliessen();
  if (r.fehlt.length) return h.ergebnis("Skalierungszeile: Stärken aus der Vorlage, numerisch sortiert", false, [r.fehlt.join(", ") + " fehlt"]);

  // a)
  if (String(r.vier) !== "8,10,12,14") probleme.push(`Vier Stärken kommen als ${JSON.stringify(r.vier)} statt 8,10,12,14 (numerisch, nicht alphabetisch)`);
  if (String(r.drei) !== "8,12,16") probleme.push(`Drei Stärken kommen als ${JSON.stringify(r.drei)} statt 8,12,16`);
  if (String(r.leer) !== "8,12") probleme.push(`Leerer Wert oder Schlüssel ohne Ziffern zählt mit: ${JSON.stringify(r.leer)}`);
  if (String(r.nichts) !== "") probleme.push(`Ohne Skalierung kommt ${JSON.stringify(r.nichts)} statt einer leeren Liste`);
  // b) + c)
  if (String(r.vorschauNeu) !== "8,10,12,14") probleme.push(`Vorschau L4-6 zeigt die Stärken ${JSON.stringify(r.vorschauNeu)} statt 8, 10, 12, 14`);
  if (String(r.vorschauAlt) !== "8,12,16") probleme.push(`Vorschau L1-1 zeigt die Stärken ${JSON.stringify(r.vorschauAlt)} statt 8, 12, 16`);
  if (String(r.steckbriefNeu) !== "8,10,12,14") probleme.push(`Steckbrief L4-8 zeigt die Stärken ${JSON.stringify(r.steckbriefNeu)} statt 8, 10, 12, 14`);
  if (String(r.steckbriefAlt) !== "8,12,16") probleme.push(`Steckbrief L5-1 zeigt die Stärken ${JSON.stringify(r.steckbriefAlt)} statt 8, 12, 16`);
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);
  if (!probleme.length) {
    zeilen.push("Rechnung: 8/10/12/14 → vier Zeilen numerisch, 8/12/16 → drei, leere Werte und fremde Schlüssel fallen weg");
    zeilen.push(`Vorschau: L4-6 ${r.vorschauNeu.join("/")} · L1-1 ${r.vorschauAlt.join("/")} · Steckbrief: L4-8 ${r.steckbriefNeu.join("/")} · L5-1 ${r.steckbriefAlt.join("/")}`);
    zeilen.push(`Datei: ${spieltag.length} Spieltags-Einheiten mit 8/10/12/14, ${konzept.length} Konzept-Einheiten mit 8/12/16`);
  }
  return h.ergebnis("Skalierungszeile: Stärken aus der Vorlage, numerisch sortiert", !probleme.length, zeilen.concat(probleme));
};
