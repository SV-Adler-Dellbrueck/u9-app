/* v844 · „Wie war's?“ auch für Trainer, die nicht zugesagt hatten, aber da waren (Bestandsaufnahme November 2026, 2.9).
   Vorher kam die Karte nur bei trainer_status[ich] === "ja".
   a) Training gestern, keine Antwort auf „Bist du dabei?“, aber in der gespeicherten Anwesenheit als Trainer geführt → Karte.
   b) Keine Antwort und nicht in der Anwesenheit → keine Karte (wer nicht da war, wird nicht gefragt).
   c) Zugesagt, ohne Anwesenheit → Karte wie bisher.
   d) Gelesen wird nur die Trainerliste (select mit data->_trainers), nicht der ganze Anwesenheits-Datensatz. */
"use strict";
module.exports = async function (h) {
  const titel = "v844 „Wie war's?“ kommt auch nach gespeicherter Trainer-Anwesenheit, ohne vorherige Zusage";
  const probleme = [], zeilen = [];
  const gestern = h.tagePlus(-1);
  const st = { status: {}, trainer: ["Kenneth"] };
  const s = await h.starten({ warten: 1800, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(),
    termine: () => [{ id: 7, datum: gestern, uhrzeit: "16:45", uhrzeit_ende: "18:00", typ: "training", titel: "", trainer_status: st.status, platz_status: null }],
    anwesenheit: (u) => /_trainers/.test(decodeURIComponent(u.search)) ? [{ datum: gestern, trainer: st.trainer }] : [],
    einheit_bewertung: [], event_bewertung: [], tagebuch_eintrag: [] }) });
  await h.sichtbarMachen(s.page, "#main-app");
  await s.page.exposeFunction("__setze", (status, trainer) => { st.status = status; st.trainer = trainer; });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    window.trainerMe = async () => "Charles";
    if (typeof nbVerzichtLaden === "function") window.nbVerzichtLaden = async () => new Set();
    if (typeof nbAltbestand === "function") window.nbAltbestand = () => false;
    let slot = document.getElementById("home-wiewars"); if (!slot) { slot = document.createElement("div"); slot.id = "home-wiewars"; document.getElementById("main-app").appendChild(slot); }
    const fall = async (status, trainer) => { await window.__setze(status, trainer); slot.innerHTML = ""; await wieWarsKarte(); await w(150); return /Wie war/.test(slot.textContent); };
    const quelle = String(wieWarsKarte);
    return { neu: /warDa/.test(quelle), a: await fall({}, ["Kenneth", "Charles"]), b: await fall({}, ["Kenneth"]), c: await fall({ Charles: "ja" }, []), nein: await fall({ Charles: "nein" }, ["Charles"]) };
  }).catch(e => ({ fehler: String(e) }));
  const abfragen = s.abgefragt.filter(x => /\/anwesenheit$/.test(x.pfad)).map(x => decodeURIComponent(x.suche));
  const fe = s.fehler(); await s.schliessen();
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  if (!r.neu) return h.ergebnis(titel, false, ["wieWarsKarte kennt die Anwesenheit nicht (Stand vor v844)"]);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  if (!r.a) probleme.push("a) keine Karte, obwohl der Trainer in der Anwesenheit steht");
  if (r.b) probleme.push("b) Karte, obwohl der Trainer weder zugesagt hat noch in der Anwesenheit steht");
  if (!r.c) probleme.push("c) keine Karte trotz Zusage");
  if (!r.nein) probleme.push("a) „nein“ gesagt, aber laut Anwesenheit da gewesen → Karte erwartet");
  const schmal = abfragen.filter(q => /wieWars|_trainers/.test(q) || /select=datum,trainer:data->_trainers/.test(q));
  if (!schmal.length || schmal.some(q => /select=\*|select=data\b/.test(q))) probleme.push("d) Abfrage der Anwesenheit: " + abfragen.slice(0, 2).join(" | "));
  if (!probleme.length) zeilen.push("ohne Zusage, aber als Trainer in der Anwesenheit → Karte · weder noch → keine · Zusage → Karte · gelesen wird nur data->_trainers");
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
