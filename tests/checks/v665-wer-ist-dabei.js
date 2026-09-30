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
   c) Handänderung bleibt möglich: „Nicht“ nimmt ein Kind aus dem Team, „Dabei“ setzt es hinein
   Dazu PO 28.09. (zwei Bildschirmfotos): „Pass die neue Kachel optisch den anderen an.“ und
   „Betreuung vor Ort ist ja nicht das Kind, sondern der Name des Elternteils.“
   d) „Ansprechpartner im Team“ wie die Zeilen darunter: Rand links, Zeichen links
   e) Betreuung: die Zeile merkt sich das Konto, die Liste zeigt den Vornamen des Elternteils */
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
  /* v702 PO: „kann auch die Ansicht ‚wer ist dabei‘ zugeklappt haben oder vielleicht ganz weg?“ Die
     Karte trägt nur noch den Stand; die Namen stehen im Schritt „Wer kommt?“, wo man sie ändern kann. */
  for (const w of ["Nächster Spieltag", "gegen Gegner B", "2 zugesagt", "❌ 1 abgesagt", "🤒 1 krank", "ohne Antwort", "Wer kommt?"])
    if (!r.text.includes(w)) probleme.push(`a) „${w}“ fehlt in der Karte`);
  for (const w of [K[0], K[1], K[2], K[3]]) if (r.text.includes(w)) probleme.push(`a) Name „${w}“ steht noch in der Karte (Doppelung)`);
  if (r.knopf < 56) probleme.push(`a) Knopf nur ${r.knopf} px`);
  const soll = [K[0], K[1]].sort();
  if (JSON.stringify(r.teams) !== JSON.stringify(soll)) probleme.push("b) Teams nach Abgleich: " + r.teams.join(", ") + " – erwartet " + soll.join(", "));
  if (!r.nachNicht) probleme.push("c) „Nicht“ nimmt das Kind nicht aus dem Team");
  if (!r.nachDabei) probleme.push("c) „Dabei“ setzt das Kind nicht ins Team");
  zeilen.push(`a) ${r.text.slice(0, 150)}… · Knopf ${r.knopf} px`);
  zeilen.push(`b) nach Abgleich im Team: ${r.teams.join(", ")} · c) Nicht → raus ${r.nachNicht}, Dabei → rein ${r.nachDabei}`);
  // d) Karte im Stil der Zeilen
  {
    const s2 = await h.starten({ start: "/eltern/index.html", warten: 1000,
      supabase: h.supabaseAttrappe({ team_config: [{ eltern_team: { rollen: [{ rolle: "Elternbeirat", name: "Elternteil von Kind A" }], kasse_beitrag: "40 € pro Saison" } }] }) });
    const d = await s2.page.evaluate(async () => {
      const slot = document.createElement("div"); slot.id = "team-ansprech-slot"; document.body.appendChild(slot);
      await elternTeamAnsprechLoad();
      const k = document.getElementById("team-ansprech"); if (!k) return null;
      const cs = getComputedStyle(k);
      return { links: parseFloat(cs.borderLeftWidth), oben: parseFloat(cs.borderTopWidth), text: k.textContent.replace(/\s+/g, " ").trim() };
    });
    await s2.schliessen();
    if (!d) probleme.push("d) Karte „Ansprechpartner im Team“ fehlt");
    else {
      if (!(d.links >= 4 && d.oben <= 1.5)) probleme.push(`d) Rand wie die Zeilen erwartet (links 4 px, sonst 1 px): links ${d.links}, oben ${d.oben}`);
      if (!/Elternbeirat: Elternteil von Kind A/.test(d.text) || !/Mannschaftskasse: 40 € pro Saison/.test(d.text)) probleme.push("d) Inhalt fehlt: " + d.text);
      zeilen.push(`d) ${d.text} · Rand links ${d.links} px`);
    }
  }
  // e) Betreuung: Name des Elternteils
  const fs = require("fs"), path = require("path");
  const mig = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20260928_v665_betreuung_eltern.sql"), "utf8");
  if (!/new\.user_id := auth\.uid\(\)/.test(mig)) probleme.push("e) Betreuung merkt sich das Konto nicht");
  if (!/ea\.vorname[\s\S]*'Elternteil von ' \|\| k\.name/.test(mig)) probleme.push("e) Liste zeigt nicht den Vornamen des Elternteils");
  if (/select k\.name\s*\n\s*from public\.betreuung/.test(mig)) probleme.push("e) Liste zeigt weiter den Namen des Kindes");
  zeilen.push("e) betreuung.user_id per Trigger, Liste: Vorname aus „Meine Angaben“ → Anzeigename → „Elternteil von …“");
  return h.ergebnis("v665 Wer ist dabei? auf der Spieltag-Seite, Teams aus der Anwesenheit", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
