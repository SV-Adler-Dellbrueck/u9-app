/* v525 – PO: „Gibt es eine Bewertungsmöglichkeit? Spieler und auch Gesamteindruck? … nicht
   nur die Spieler bewerten sondern auch andere Kriterien rund um das Festival." Und zur
   Aufteilung: „Wichtig sind sportlich die Positionen im Spiel eingehalten, Passspiel,
   teamverhalten, Zweikampf. Müssen überlegen was eher auf spieler Ebene passt und was auf
   Mannschaft. Darf auch nicht zu umfangreich werden."

   Vorher gab es nach einem Festival nur das Blitz-Rating je KIND, das Ergebnisfeld und den
   Eltern-Puls. Wie die MANNSCHAFT gespielt hat, stand nirgends – dabei ist genau das die
   Ebene, auf der „Positionen eingehalten" überhaupt beobachtbar ist.

   Geprüft wird die Entscheidung, nicht die Optik:
   a) Das Fenster öffnet sich zu einem vergangenen Festival und bringt je Team die vier
      Mannschaftsreihen mit – je Team, nicht einmal für den Tag (PO-Entscheidung: zwei
      Teams spielen oft verschiedene Formen gegen verschiedene Gäste).
   b) Die Gäste stehen drin, sportlich einschätzbar.
   c) Gespeichert wird als EINE Zeile je Trainer und Termin (upsert termin_id,autor) – nicht
      angefügt wie bis v471 beim Blitz-Rating, wo ein zweiter Durchgang alles verdoppelte.
   d) Die Spielerebene bleibt unangetastet: das Fenster bietet keine Kinderbewertung an,
      sonst stünden zwei Kriterienraster nebeneinander und niemand pflegte beide. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const gestern = h.tagePlus(-1);
  const fest = { id: 77, datum: gestern, typ: "turnier", titel: "Kinderfestival · Heim", heim: true,
                 uhrzeit: "10:15", uhrzeit_ende: "12:00", spielform: "FUNiño", ergebnis: "4:2",
                 ohne_ergebnis: false, trainer_status: {} };

  const s = await h.starten({ supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    profiles: [{ name: "Charles", rolle: "trainer" }],
    termine: u => (/id=eq\.77/.test(u.search) || /spiel|turnier/.test(u.searchParams.get("typ") || "")) ? [fest] : [],
    /* Die Einteilung des Tages: zwei Teams, verschiedene Spielformen – genau der Fall, für
       den je Team bewertet wird. */
    nominierungen: [{ datum: gestern + "__teams",
                      data: { "1": 1, "2": 1, "3": 2, "4": 2, _form: { "1": "4+1", "2": "funino" } } }],
    heimturnier: [{ teams: ["SV Adler Dellbrück 1", "SV Adler Dellbrück 2", "VFB 05", "TuS Beispiel"] }],
    event_bewertung: []
  }), hoehe: 1800 });

  const r = await s.page.evaluate(async () => {
    window.trainerMe = async () => "Charles";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    if (typeof fazitOpen !== "function") return { fehlt: "fazitOpen" };
    await fazitOpen(77);
    for (let i = 0; i < 40 && !document.getElementById("fz-card"); i++) await new Promise(r => setTimeout(r, 50));
    const card = document.getElementById("fz-card");
    if (!card) return { fehlt: "Fenster" };
    const txt = card.textContent.replace(/\s+/g, " ").trim();

    /* Je Team vier Reihen: die Knöpfe tragen die Team-Nummer im Aufruf. */
    const reihen = ["ordnung", "pass", "zweikampf", "spass"];
    const proTeam = {};
    [...card.querySelectorAll("button[onclick^=\"fazitSet('teams'\"]")].forEach(b => {
      const m = /fazitSet\('teams','(\d+):(\w+)'/.exec(b.getAttribute("onclick") || "");
      if (m) { (proTeam[m[1]] = proTeam[m[1]] || new Set()).add(m[2]); }
    });
    const gastKn = [...card.querySelectorAll("button[onclick^=\"fazitSet('gaeste'\"]")]
      .map(b => (/fazitSet\('gaeste','([^']+)'/.exec(b.getAttribute("onclick") || "") || [])[1]).filter(Boolean);

    /* Eine Antwort setzen, eine zweite, dann speichern – und sehen, was rausgeht. */
    fazitSet("teams", "1:ordnung", "3");
    fazitSet("teams", "2:pass", "1");
    fazitSet("gaeste", "VFB 05", "zu_stark");
    const feld = document.getElementById("fz-arbeiten"); if (feld) feld.value = "Abstände im Raum";
    await fazitSpeichern();
    await new Promise(r => setTimeout(r, 300));

    return { fehlt: null, txt: txt.slice(0, 300), teams: Object.keys(proTeam).sort(),
             reihenProTeam: Object.keys(proTeam).sort().map(k => reihen.filter(x => proTeam[k].has(x)).length),
             gaeste: [...new Set(gastKn)],
             kinderKnopf: /Kind [A-O]/.test(txt) };
  });

  await s.page.waitForTimeout(200);
  const gesendet = s.gesendet.filter(g => /event_bewertung/.test(g.pfad || ""));
  const fehler = s.fehler();
  await s.schliessen();

  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt`); return h.ergebnis("Festival nachbereiten", false, probleme); }

  // a) je Team die vier Reihen
  if (r.teams.join(",") !== "1,2") probleme.push(`Mannschaftsreihen für Teams [${r.teams}] statt für 1 und 2 – je Team bewerten war die Entscheidung`);
  r.reihenProTeam.forEach((n, i) => { if (n !== 4) probleme.push(`Team ${r.teams[i]} hat ${n} von 4 Reihen (Ordnung, Passspiel, Zweikämpfe, Spaß)`); });
  // b) Gäste, ohne unsere eigenen Mannschaften
  if (!r.gaeste.includes("VFB 05") || !r.gaeste.includes("TuS Beispiel")) probleme.push(`Gäste fehlen: ${JSON.stringify(r.gaeste)}`);
  if (r.gaeste.some(g => /adler/i.test(g))) probleme.push(`Unsere eigene Mannschaft steht in der Gästeliste: ${JSON.stringify(r.gaeste)}`);
  // c) eine Zeile je Trainer und Termin
  const p = gesendet[0];
  if (!p) probleme.push("Speichern schickt nichts an event_bewertung");
  else {
    if (!/on_conflict=termin_id,autor/.test((p.pfad || "") + (p.suche || ""))) probleme.push(`Speichern fügt an statt zu ersetzen: ${p.pfad}${p.suche || ""}`);
    const b = p.body || {};
    if (Number(b.termin_id) !== 77) probleme.push(`gespeichert zu Termin ${b.termin_id} statt 77`);
    if (((b.teams || {})["1"] || {}).ordnung !== 3) probleme.push(`Team 1 Ordnung kommt als ${JSON.stringify((b.teams || {})["1"])} an`);
    if (((b.teams || {})["2"] || {}).pass !== 1) probleme.push(`Team 2 Passspiel kommt als ${JSON.stringify((b.teams || {})["2"])} an`);
    if ((b.gaeste || {})["VFB 05"] !== "zu_stark") probleme.push(`Gast-Einschätzung kommt als ${JSON.stringify(b.gaeste)} an`);
    if (!/Abstände/.test(b.arbeiten || "")) probleme.push(`„Daran arbeiten wir" geht verloren: ${JSON.stringify(b.arbeiten)}`);
  }
  // d) keine zweite Spielerebene
  if (r.kinderKnopf) probleme.push("Im Fenster stehen Kindernamen – die Spielerebene gehört ins Blitz-Rating, nicht zweimal in die App");
  if (fehler.length) probleme.push(...fehler.slice(0, 2));

  zeilen.push(`Teams ${JSON.stringify(r.teams)} · Reihen je Team ${JSON.stringify(r.reihenProTeam)}`);
  zeilen.push(`Gäste ${JSON.stringify(r.gaeste)}`);
  zeilen.push(`Gespeichert an ${(p || {}).pfad}${(p || {}).suche || ""} · ${JSON.stringify((p || {}).body || {}).slice(0, 200)}`);
  return h.ergebnis("Festival nachbereiten: Mannschaft je Team, Gäste, eine Zeile je Trainer", !probleme.length, zeilen.concat(probleme));
};
