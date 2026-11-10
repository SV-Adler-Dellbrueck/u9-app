/* v827 · Mehrere Events am selben Tag (Charles 10.11.2026).
   Am 07.12. beginnt ein Kinder-Eltern-Turnier, danach die Weihnachtsfeier – zwei Events am selben Tag. Die Datenbank
   erlaubt das seit der Migration 20261118_v827_mehrere_events.sql (Training, Spiel, Turnier bleiben je Tag einmalig;
   bei Events ist nur derselbe Titel zur selben Uhrzeit doppelt). Die Meldungen der App passen dazu.

   a) Anlegen: Kommt auf ein Event ein 409, nennt die Meldung Tag, Titel und Uhrzeit und sagt „Titel oder Uhrzeit
      ändern“ – nicht mehr „anderes Datum wählen“.
   b) Anlegen: Ein zweites Event am selben Tag mit anderem Titel legt an („Termin angelegt“), und die Anfrage trägt das
      Kennzeichen eltern_turnier.
   c) Bearbeiten: Ein 409 beim Speichern eines Events erklärt, dass Titel und Uhrzeit schon vergeben sind. */
"use strict";
module.exports = async function (h) {
  const titel = "v827 Mehrere Events am Tag: Meldungen beim Anlegen und Bearbeiten";
  const probleme = [], zeilen = [];
  const tag = h.tagePlus(20);
  const vorhanden = [{ id: 112, typ: "event", datum: tag, titel: "Weihnachtsfeier", uhrzeit: "18:15", mitbringen: true, eltern_turnier: false, trainer_status: {} }];
  const lauf = async (antwortPost, antwortPatch, tun) => {
    const s = await h.starten({ breite: 390, hoehe: 844, warten: 1500,
      supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), nominierungen: [], anwesenheit: [], periodisierung: [], trainingsbloecke: [],
        termine: (u, req) => req.method() === "POST" ? antwortPost : (req.method() === "PATCH" ? antwortPatch : vorhanden) }) });
    await h.sichtbarMachen(s.page, "#main-app");
    const r = await s.page.evaluate(tun, { tag });
    const gesendet = s.gesendet.filter(x => /\/termine$/.test(x.pfad) && x.methode === "POST").map(x => x.body);
    const f = s.fehler(); await s.schliessen();
    const echt = f.filter(x => !/409|500|Failed to load/.test(x));
    if (echt.length) probleme.push("Konsole: " + echt.slice(0, 2).join(" | "));
    return { r, gesendet };
  };
  const anlegen = async ({ tag }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    await loadKader(); go("termine"); await w(1500);
    if (typeof TM_TERMINE === "undefined" || !TM_TERMINE.length) return { fehlt: "Terminliste leer" };
    tmSetTyp("event", document.querySelector('.seg-btn[data-val="event"]')); await w(100);
    document.getElementById("tm-datum").value = tag; document.getElementById("tm-titel").value = "Kinder Eltern Weihnachtsturnier";
    document.getElementById("tm-zeit").value = "15:00";
    const et = document.getElementById("tm-elternturnier"); if (et) et.checked = true;
    tmAdd._busy = false; await tmAdd(); await w(300);
    return { text: document.getElementById("app-toast").textContent };
  };
  const a = await lauf({ status: 409, body: JSON.stringify({ code: "23505", message: 'duplicate key value violates unique constraint "termine_event_tag_zeit_titel_uidx"' }) }, { status: 200, body: "[]" }, anlegen);
  if (a.r.fehlt) return h.ergebnis(titel, false, [a.r.fehlt]);
  const d = new Date(tag + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  if (!a.r.text.includes(d) || !/Kinder Eltern Weihnachtsturnier/.test(a.r.text) || !/15:00 Uhr/.test(a.r.text) || !/Titel oder Uhrzeit/.test(a.r.text) || /anderes Datum/.test(a.r.text))
    probleme.push("a) Meldung bei 409 (Event): „" + a.r.text + "“");
  const b = await lauf({ status: 201, body: "[]" }, { status: 200, body: "[]" }, anlegen);
  if (!/Termin angelegt/.test(b.r.text)) probleme.push("b) zweites Event am selben Tag: „" + b.r.text + "“");
  const post = b.gesendet[0] || {};
  if (post.eltern_turnier !== true || post.typ !== "event" || post.datum !== tag || post.titel !== "Kinder Eltern Weihnachtsturnier") probleme.push("b) gesendet: " + JSON.stringify(post));
  const c = await lauf({ status: 201, body: "[]" }, { status: 409, body: JSON.stringify({ code: "23505" }) }, async ({ tag }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    await loadKader(); go("termine"); await w(1500);
    if (typeof TM_TERMINE === "undefined" || !TM_TERMINE.length) return { fehlt: "Terminliste leer" };
    tmEdit(112); await w(300);
    await tmEditSave(112); await w(300);
    return { text: document.getElementById("app-toast").textContent };
  });
  if (c.r.fehlt) probleme.push("c) " + c.r.fehlt);
  else if (!/gleichem Titel und gleicher Uhrzeit/.test(c.r.text)) probleme.push("c) Meldung beim Bearbeiten: „" + c.r.text + "“");
  zeilen.push(`409: „${a.r.text.slice(0, 110)}…“ · zweites Event: „${b.r.text}“ · Bearbeiten 409: „${(c.r.text || "").slice(0, 80)}…“`);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
