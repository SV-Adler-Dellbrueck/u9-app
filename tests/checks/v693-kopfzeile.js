/* v693 · Kopfzeile ohne „Nächstes …“
   PO 30.09. (Bildschirmfoto, Kachel „Trainerstab · U9 I“): „Oben links ist noch der nächste Termin
   drin, aber abgeschnitten. Macht der da Sinn?“ Er stand doppelt zur Training-Kachel und zu
   „Diese Woche“ und war am Handy nach vier Zeichen abgeschnitten.
   a) Nach dem Start mit einem kommenden Training steht unter dem Vereinsnamen „Trainerstab · U9 I“
   b) die Zeile passt in ihre Breite (nichts abgeschnitten)
   c) der nächste Termin bleibt auf der Startseite sichtbar (Training-Kachel) */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const termine = [{ id: 1, datum: h.tagePlus(1), uhrzeit: "16:45", uhrzeit_ende: "18:00", typ: "training", titel: "Training", platz: "vorne links", trainer_status: {} }];
  const s = await h.starten({ breite: 390, hoehe: 844, warten: 1500, angemeldet: true, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, anwesenheit: [] }) });
  await h.sichtbarMachen(s.page, "#main-app");
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    await loadKader(); go("home"); await w(1500);
    // Bis v692 füllte diese Funktion die Kopfzeile (nach Anmeldung / Token-Erneuerung) – gibt es sie noch, läuft sie hier
    if (typeof topbarNaechsterTermin === "function") { await topbarNaechsterTermin(); await w(200); }
    const el = document.getElementById("topbar-sub");
    const home = (document.getElementById("home-content") || document.body).innerText.replace(/\s+/g, " ");
    /* Bis v818 stand die Uhrzeit in der Training-Kachel. Seit v819 gibt es die Kacheln nicht mehr;
       der nächste Termin steht mit Uhrzeit in „Diese Woche“ – dort wird jetzt gemessen. */
    const woche = (document.getElementById("home-woche") || { innerText: "" }).innerText.replace(/\s+/g, " ");
    const kachel = (home.match(/Training (Mo|Di|Mi|Do|Fr|Sa|So) \d{1,2}:\d{2}/) || woche.match(/\d{1,2}:\d{2}[^:]{0,40}Training/) || woche.match(/Training[^:]{0,40}\d{1,2}:\d{2}/) /* seit v821 steht die Uhrzeit im Band unter dem Titel */ || [""])[0];
    return { text: el.textContent.trim(), passt: el.scrollWidth <= el.clientWidth + 1, kachel };
  });
  const f = s.fehler(); await s.schliessen();
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  if (r.text !== "Trainerstab · U9 I") probleme.push(`a) Kopfzeile: „${r.text}“`);
  if (!r.passt) probleme.push("b) Die Kopfzeile ist abgeschnitten");
  if (!/\d{1,2}:\d{2}/.test(r.kachel)) probleme.push(`c) Nächstes Training ohne Uhrzeit auf der Startseite: „${r.kachel}“`);
  zeilen.push(`Kopfzeile „${r.text}“ · nächstes Training „${r.kachel}“`);
  return h.ergebnis("Kopfzeile fest „Trainerstab · U9 I“, Termin steht in der Kachel", !probleme.length, zeilen.concat(probleme));
};
