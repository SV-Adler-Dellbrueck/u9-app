/* v665 · „Wer ist dabei?“ mit den Eltern-Rückmeldungen direkt auf der Spieltag-Seite
   PO 28.09. (Bildschirmfotos): „Die Meldung der Anwesenheit an Spieltagen ist zu versteckt.
   Auf der Startkachel ‚Wer ist dabei‘ müssen direkt die Rückmeldungen der Eltern angezeigt
   werden. Parallel müssen unter Match daraus die Teams gebaut werden. Trainer können händisch
   noch ändern bei Bedarf die Anwesenheit.“ Auf dem Foto: 4 von 14 dabei, aber 10 Kinder in den
   Team-Kacheln – eine alte Einteilung hielt Kinder fest, die gar nicht zugesagt hatten.
   a) Spieltag-Seite: Karte mit Datum, Zählung (zugesagt/abgesagt/krank/ohne Antwort) und den
      Namen je Gruppe; Knopf „Anwesenheit anpassen …“ mindestens 56 px
   b) Teams: wer nicht auf „Dabei“ steht, fliegt aus einer gespeicherten Einteilung;
      wer dabei ist und kein Team hat, kommt hinein
   c) Handänderung bleibt möglich: „Nicht“ nimmt ein Kind aus dem Team, „Dabei“ setzt es hinein */
"use strict";
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const rows = h.kaderZeilen();
  const datum = h.tagePlus(3);
  const s = await h.starten({ start: "/trainer/index.html", warten: 1200, hoehe: 2400,
    supabase: h.supabaseAttrappe({ kader: rows,
      termine: [{ id: 3, datum, typ: "spiel", gegner: "Gegner B", uhrzeit: "10:00:00" }],
      rueckmeldungen: [{ spieler_id: 1, status: "zugesagt" }, { spieler_id: 2, status: "zugesagt" }, { spieler_id: 3, status: "abgesagt" }, { spieler_id: 4, status: "krank" }] }) });
  const r = await s.page.evaluate(async ({ K }) => {
    await loadKader();
    const box = document.createElement("div"); box.innerHTML = _kachelInhalt("spieltag"); document.body.appendChild(box);
    await spieltagDabeiKarteLoad();
    const karte = document.getElementById("st-dabei");
    const knopf = document.getElementById("st-dabei-anpassen");
    const out = { text: karte ? karte.textContent.replace(/\s+/g, " ") : "", knopf: knopf ? Math.round(knopf.getBoundingClientRect().height) : 0,
      alteKachel: /kachelRun\('spieltagAnwesenheitOpen'/.test(box.innerHTML) };
    // b) gespeicherte Einteilung mit Kindern, die nicht dabei sind
    nomStatus = {}; KADER.forEach(k => nomStatus[k.name] = "offen");
    nomStatus[K[0]] = "dabei"; nomStatus[K[1]] = "dabei"; nomStatus[K[2]] = "nicht";
    TEAM_ANZAHL = 2; TEAM_LEIH = {}; TEAMS = {}; TEAMS[K[0]] = 1; TEAMS[K[2]] = 1; TEAMS[K[5]] = 2; TEAMS[K[6]] = 2;
    teamsNachziehen();
    out.teams = Object.keys(TEAMS).sort();
    // c) von Hand
    let nb = document.getElementById("nom-panel"); if (!nb) { nb = document.createElement("div"); nb.id = "nom-panel"; document.body.appendChild(nb); }
    nomSet(K[1], "nicht"); out.nachNicht = !TEAMS[K[1]];
    nomSet(K[5], "dabei"); out.nachDabei = !!TEAMS[K[5]];
    return out;
  }, { K });
  const f = s.fehler(); await s.schliessen();
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  if (r.alteKachel) probleme.push("a) Die alte Sprung-Kachel steht noch da");
  for (const w of ["Wer ist dabei?", "gegen Gegner B", "✅ 2 zugesagt", "❌ 1 abgesagt", "🤒 1 krank", "ohne Antwort", K[0], K[1], K[2], K[3]])
    if (!r.text.includes(w)) probleme.push(`a) „${w}“ fehlt in der Karte`);
  if (r.knopf < 56) probleme.push(`a) Knopf nur ${r.knopf} px`);
  const soll = [K[0], K[1]].sort();
  if (JSON.stringify(r.teams) !== JSON.stringify(soll)) probleme.push("b) Teams nach Abgleich: " + r.teams.join(", ") + " – erwartet " + soll.join(", "));
  if (!r.nachNicht) probleme.push("c) „Nicht“ nimmt das Kind nicht aus dem Team");
  if (!r.nachDabei) probleme.push("c) „Dabei“ setzt das Kind nicht ins Team");
  zeilen.push(`a) ${r.text.slice(0, 150)}… · Knopf ${r.knopf} px`);
  zeilen.push(`b) nach Abgleich im Team: ${r.teams.join(", ")} · c) Nicht → raus ${r.nachNicht}, Dabei → rein ${r.nachDabei}`);
  return h.ergebnis("v665 Wer ist dabei? auf der Spieltag-Seite, Teams aus der Anwesenheit", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
