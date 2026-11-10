/* v826 · „Fehler beim Anlegen“ (Charles 10.11.2026, Bildschirmfoto).
   Die Datenbank lässt je Tag nur einen Termin derselben Art zu (Index termine_datum_typ_uidx; seit v827 gilt das für
   Events nicht mehr – deren Meldung prüft v827-mehrere-events.js). Wer ein zweites Training am selben Tag anlegte, bekam
   nur „Fehler beim Anlegen“ und konnte nicht erkennen, warum.

   a) Kommt auf das Anlegen ein 409, nennt die Meldung Tag, Art und Titel des Termins, der den Tag belegt, und was zu tun
      ist („Bearbeiten“ oder anderes Datum). Sie bleibt lang genug stehen, um gelesen zu werden (mind. 6 s).
   b) Jede andere Ablehnung (hier 500) sagt weiter „Fehler beim Anlegen“ – die klare Meldung gilt nur für den belegten Tag.
   c) Ein freier Tag legt den Termin an („Termin angelegt“), auch mit dem Haken „Kinder-Eltern-Turnier“. */
"use strict";
module.exports = async function (h) {
  const titel = "v826 Termin anlegen: belegter Tag wird benannt";
  const probleme = [], zeilen = [];
  const tag = h.tagePlus(20);
  const vorhanden = [{ id: 112, typ: "training", datum: tag, titel: "Training", uhrzeit: "17:00", trainer_status: {} }];
  const lauf = async (antwortPost, datum) => {
    const s = await h.starten({ breite: 390, hoehe: 844, warten: 1500,
      supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), nominierungen: [], anwesenheit: [], periodisierung: [], trainingsbloecke: [],
        termine: (u, req) => req.method() === "POST" ? antwortPost : vorhanden }) });
    await h.sichtbarMachen(s.page, "#main-app");
    const r = await s.page.evaluate(async ({ datum }) => {
      const w = ms => new Promise(x => setTimeout(x, ms));
      await loadKader(); go("termine"); await w(1500);
      if (typeof TM_TERMINE === "undefined" || !TM_TERMINE.length) return { fehlt: "Terminliste leer" };
      tmSetTyp("training", document.querySelector('.seg-btn[data-val="training"]')); await w(100);
      document.getElementById("tm-datum").value = datum; document.getElementById("tm-titel").value = "Training";
      tmAdd._busy = false; await tmAdd(); await w(300);
      const t = document.getElementById("app-toast");
      const sichtbar1 = t.classList.contains("show"), text = t.textContent;
      await w(4500);
      return { text, art: t.className, nochDa: t.classList.contains("show"), sichtbar1 };
    }, { datum });
    const f = s.fehler(); await s.schliessen();
    if (f.length) probleme.push("Konsole: " + f.filter(x => !/409|500|Failed to load/.test(x)).slice(0, 2).join(" | "));
    return r;
  };
  const a = await lauf({ status: 409, body: JSON.stringify({ code: "23505", message: 'duplicate key value violates unique constraint "termine_datum_typ_uidx"' }) }, tag);
  if (a.fehlt) return h.ergebnis(titel, false, [a.fehlt]);
  const d = new Date(tag + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  if (!a.text.includes(d) || !/Training/.test(a.text) || !/Bearbeiten/.test(a.text) || !/anderes Datum/.test(a.text)) probleme.push("a) Meldung bei 409: „" + a.text + "“");
  if (!/toast-err/.test(a.art)) probleme.push("a) Meldung bei 409 ist keine Fehlermeldung");
  if (!a.nochDa) probleme.push("a) Meldung nach 4,8 s schon weg");
  const b = await lauf({ status: 500, body: JSON.stringify({ code: "XX000", message: "irgendein Fehler" }) }, tag);
  if (b.text !== "Fehler beim Anlegen") probleme.push("b) andere Ablehnung: „" + b.text + "“");
  const c = await lauf({ status: 201, body: "[]" }, h.tagePlus(21));
  if (!/Termin angelegt/.test(c.text)) probleme.push("c) freier Tag: „" + c.text + "“");
  zeilen.push(`409: „${a.text.slice(0, 120)}…“ · 500: „${b.text}“ · frei: „${c.text}“`);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
