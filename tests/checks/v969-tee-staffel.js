/* v969 · Tee-Staffel (Charles 26.11.2026): zwei Pumpkannen, eigene Becher.
   Seit v981 (Beschluss 26.11.2026, Bild freigegeben) sind die Kannen Gegenstände: Familien tragen sich fürs Mitnehmen ein, die App
   merkt sich, wer welche Kanne hat. Die Ableitung „Eintrag am nächsten Termin ⇒ Kanne am Termin davor“ (a, b, c, e, f dieser Datei)
   gibt es nicht mehr; geprüft wird das Neue in v981-tee-kannen.js. Hier bleibt, was weiter gilt:
   d) Becher-Hinweis bei Training/Spiel/Turnier, nicht bei sonstigen Terminen und nicht bei ausgefallenen
   c) Die Tee-Aufgabe beschreibt die Kanne ohne festen Termin davor und nennt die Becher */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const d = new Date(); d.setDate(d.getDate() + ((2 - d.getDay() + 7) % 7) + 7);
  const iso = x => x.toISOString().slice(0, 10), plus = n => { const y = new Date(d); y.setDate(y.getDate() + n); return iso(y); };
  const termine = [
    { id: 501, typ: "training", datum: iso(d), uhrzeit: "17:00:00" },
    { id: 502, typ: "training", datum: plus(2), uhrzeit: "17:00:00", platz_status: "abgesagt" }
  ];
  const s = await h.starten({ start: "/eltern/index.html", warten: 900, supabase: h.supabaseAttrappe({ termine: () => termine }) });
  const r = await s.page.evaluate(async ({ termine }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 60 && typeof tdDetailOben !== "function"; i++) await w(100);
    const T = id => termine.find(x => x.id === id);
    return { d: ["training", "spiel", "turnier", "event"].map(typ => /eigenen Becher/.test(tdDetailOben(Object.assign({}, T(501), { typ })))),
      d2: /eigenen Becher/.test(tdDetailOben(T(502))), c: typeof teeBeschreibung === "function" ? teeBeschreibung(T(501)) : "" };
  }, { termine });
  const fe = s.fehler(); await s.schliessen();
  if (r.d.join() !== "true,true,true,false" || r.d2) probleme.push("d) Becher: " + JSON.stringify([r.d, r.d2]));
  else zeilen.push("d) Becher-Hinweis bei Training, Spiel, Turnier – nicht bei sonstigen und ausgefallenen Terminen");
  if (!/Pumpkannen/.test(r.c) || !/Becher bringen die Kinder selbst mit/.test(r.c) || /Am Dienstag|beim Trainerteam/.test(r.c)) probleme.push("c) Beschreibung: " + r.c);
  else zeilen.push("c) Tee-Aufgabe: Kanne ohne festen Termin davor, mit Becher-Hinweis (seit v981)");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v969 Tee-Staffel: eigene Becher (Kannen seit v981 in v981-tee-kannen.js)", !probleme.length, zeilen.concat(probleme));
};
