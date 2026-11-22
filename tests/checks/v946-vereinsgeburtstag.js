/* v946 · Charles 22.11.: „09.04.1922 Palmsonntag“ – Gründungstag des SV Adler Dellbrück für den Saison-Gruß (v944).
   a) Am 09.04. steht der Vereinsgeburtstag mit Partyhut-Adler und dem richtigen Alter (2027: 105 Jahre).
   b) Er geht allem vor: auch an einem Ostersonntag auf dem 09.04. (2023) und an einem Spieltag – dort mit „und heute ist Spieltag“.
   c) Tags davor und danach wieder die Jahreszeit bzw. Ostern; ein abgesagtes Spiel ergänzt nichts. */
"use strict";
module.exports = async function (h) {
  const titel = "v946 Vereinsgeburtstag im Saison-Gruß: 09.04.1922, geht allem vor";
  const probleme = [], zeilen = [];
  const e = await h.starten({ start: "/eltern/index.html", angemeldet: false, warten: 900 });
  const r = await e.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 60 && typeof saisonFuer !== "function"; i++) await w(100);
    const f = (d, th) => { const s = saisonFuer(d, th || [], []); return { id: s.id, adler: s.adler, text: s.text }; };
    return { g27: f("2027-04-09"), g23: f("2023-04-09"), sp: f("2027-04-09", [{ typ: "spiel" }]), ab: f("2027-04-09", [{ typ: "spiel", platz_status: "abgesagt" }]),
      vor: f("2027-04-08"), nach: f("2027-04-10"), ost23: f("2023-04-10"), konst: typeof VEREIN_GEBURTSTAG === "string" ? VEREIN_GEBURTSTAG : "" };
  }).catch(x => ({ fehler: String(x) }));
  const fe = e.fehler(); await e.schliessen();
  if (r.fehler) probleme.push(r.fehler);
  else {
    if (r.konst !== "1922-04-09") probleme.push("Konstante " + r.konst);
    if (r.g27.id !== "vereinsgeburtstag" || r.g27.adler !== "partyhut" || !/vor 105 Jahren/.test(r.g27.text) || /Spieltag/.test(r.g27.text)) probleme.push("a) " + JSON.stringify(r.g27));
    if (r.g23.id !== "vereinsgeburtstag" || !/vor 101 Jahren/.test(r.g23.text)) probleme.push("b) Ostersonntag 2023: " + JSON.stringify(r.g23));
    if (!/und heute ist Spieltag/.test(r.sp.text) || r.sp.id !== "vereinsgeburtstag") probleme.push("b) Spieltag: " + r.sp.text);
    if (/Spieltag/.test(r.ab.text)) probleme.push("c) abgesagtes Spiel: " + r.ab.text);
    if (r.vor.id !== "fruehling" || r.nach.id !== "fruehling" || r.ost23.id !== "ostern") probleme.push(`c) ${r.vor.id} / ${r.nach.id} / ${r.ost23.id}`);
  }
  const fehler = fe.filter(x => !/Failed to load resource/.test(x)); if (fehler.length) probleme.push("Konsole: " + fehler.slice(0, 2).join(" | "));
  zeilen.push(`a) „${(r.g27 || {}).text}“ · b) 2023 (Ostersonntag) ${(r.g23 || {}).id}, Spieltag ergänzt · c) 08./10.04. ${(r.vor || {}).id}, Ostermontag 2023 ${(r.ost23 || {}).id}`);
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
