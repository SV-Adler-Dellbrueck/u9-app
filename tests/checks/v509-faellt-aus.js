/* v509 – PO: „Den 14.09. habe ich als ‚findet nicht statt' markiert. Wäre schön, wenn das in
   der Startseiten-Ansicht auch ersichtlich wäre und auch in allen anderen Ansichten, die es
   betrifft."
   Die Absage lag längst in der Datenbank (termine.platz_status='abgesagt', gesetzt über die
   Platz-Ampel) – die Startseite fragte die Spalte aber gar nicht erst ab. Sie konnte es also
   nicht wissen, egal wie oft man hinsah. Genau das prueft die erste Zusicherung: die ABFRAGE
   holt das Feld. Danach: Schild in „Diese Woche", keine Knoepfe fuer einen Termin, den es
   nicht gibt, keine „Bist du dabei?"-Frage, und die Kachel springt zum naechsten echten
   Termin. Dazu die Terminliste: Schild oben auf der Karte, Hauptaktion weg. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const morgen = h.tagePlus(1), uebermorgen = h.tagePlus(2);
  const termine = [
    { id: 1, datum: morgen, uhrzeit: "16:45:00", typ: "training", titel: "Training", ort: "Thurner Kamp 97", platz: "vorne links", trainer_status: { "Charles": "ja" }, platz_status: "abgesagt", platz_status_note: "Platz gesperrt" },
    { id: 2, datum: uebermorgen, uhrzeit: "10:15:00", typ: "training", titel: "Training", ort: "Thurner Kamp 97", trainer_status: {}, platz_status: "normal" }
  ];
  const abfragen = [];
  const s = await h.starten({
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(),
      termine: u => { abfragen.push(u.search); return termine; },
      rueckmeldungen: [], trainingsplan: [], trainingsgruppen: [], nominierungen: []
    }), hoehe: 1800
  });
  const r = await s.page.evaluate(async ({ morgen, t1 }) => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    if (typeof terminFaelltAus !== "function") return { fehlt: "terminFaelltAus" };
    const funktion = {
      ja: terminFaelltAus({ platz_status: "abgesagt" }),
      nein: terminFaelltAus({ platz_status: "normal" }),
      leer: terminFaelltAus(null),
      grund: terminAbsageGrund({ platz_status: "abgesagt", platz_status_note: "Platz gesperrt" }),
      chip: /Fällt aus/.test(terminAbsageChip({ platz_status: "abgesagt" }))
    };
    // „Diese Woche" auf der Startseite
    let slot = document.getElementById("home-woche");
    if (!slot) { slot = document.createElement("div"); slot.id = "home-woche"; document.body.appendChild(slot); }
    await homeWocheLoad(); await warte(250);
    const zeile = slot.querySelector(".woche-zeile");
    const woche = {
      schild: !!zeile && /Fällt aus/.test(zeile.textContent),
      grund: !!zeile && /Platz gesperrt/.test(zeile.textContent),
      knoepfe: zeile ? [...zeile.querySelectorAll("button")].map(b => b.textContent.trim()) : null,
      zweite: slot.querySelectorAll(".woche-zeile").length
    };
    // Terminliste: Karte und Kurzzeile
    const kartenHtml = tmCard(t1);
    const zeilenHtml = tmRow(t1);
    const box = document.createElement("div"); box.innerHTML = kartenHtml; document.body.appendChild(box);
    const liste = {
      banner: /Fällt aus/.test(box.textContent),
      grund: /Platz gesperrt/.test(box.textContent),
      haupt: [...box.querySelectorAll("button")].map(b => b.textContent.trim()).filter(t => /^Plan$|Teams festlegen|Mitbringliste|Antworten/.test(t)),
      kurz: /Fällt aus/.test(zeilenHtml)
    };
    box.remove();
    // „Bist du dabei?" fragt nicht mehr nach einem abgesagten Termin
    _trsvpRows = [{ id: 1, datum: morgen, typ: "training", titel: "Training", trainer_status: {}, platz_status: "abgesagt" },
                  { id: 2, datum: morgen, typ: "training", titel: "Training 2", trainer_status: {} }];
    _trsvpMe = "Charles";
    const offen = _trhomeOffeneImFenster().map(t => t.id);
    const rowHtml = _trsvpRowHtml(_trsvpRows[0], "Charles", "x");
    return { funktion, woche, liste, offen, rowSchild: /Fällt aus/.test(rowHtml), rowKnoepfe: (rowHtml.match(/<button/g) || []).length };
  }, { morgen, t1: termine[0] });
  const fs = require("fs"), path = require("path");
  const quelle = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  const fehler = s.fehler(); await s.schliessen();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt – die Absage hat keine gemeinsame Quelle`); return h.ergebnis("Fällt aus", false, probleme); }

  if (!abfragen.some(q => /platz_status/.test(q))) probleme.push("Die Startseite fragt platz_status gar nicht erst ab – sie kann die Absage nicht kennen");
  const f = r.funktion;
  if (!f.ja || f.nein || f.leer) probleme.push(`terminFaelltAus antwortet falsch: abgesagt ${f.ja}, normal ${f.nein}, leer ${f.leer}`);
  if (f.grund !== "Platz gesperrt") probleme.push(`Der Grund kommt nicht durch: „${f.grund}“`);
  if (!f.chip) probleme.push("terminAbsageChip sagt nicht „Fällt aus“");
  if (!r.woche.schild) probleme.push("In „Diese Woche“ steht kein Schild „Fällt aus“");
  if (!r.woche.grund) probleme.push("In „Diese Woche“ fehlt der Grund der Absage");
  if (r.woche.knoepfe && r.woche.knoepfe.length) probleme.push(`Der abgesagte Termin hat in „Diese Woche“ noch Knöpfe: ${r.woche.knoepfe.join(" · ")}`);
  if (r.woche.zweite < 2) probleme.push("Der zweite (stattfindende) Termin fehlt in „Diese Woche“");
  if (!r.liste.banner) probleme.push("Auf der Terminkarte fehlt das Schild „Fällt aus“");
  if (!r.liste.grund) probleme.push("Auf der Terminkarte fehlt der Grund");
  if (r.liste.haupt.length) probleme.push(`Die Terminkarte bietet noch Planung an: ${r.liste.haupt.join(" · ")}`);
  if (!r.liste.kurz) probleme.push("Die kompakte Terminzeile zeigt die Absage nicht");
  if (r.offen.join(",") !== "2") probleme.push(`„Bist du dabei?“ fragt nach ${r.offen.join(",") || "keinem"} statt nur nach Termin 2`);
  if (!r.rowSchild || r.rowKnoepfe) probleme.push(`Die Antwort-Zeile zeigt Schild ${r.rowSchild} und ${r.rowKnoepfe} Knöpfe (erwartet: Schild, keine Knöpfe)`);
  /* Die Marke auf der Kachel („Training · Fr 16:45") entsteht inline in renderHome und ist
     ohne die halbe Startseite nicht aufrufbar – hier deshalb an der Quelle belegt. */
  const kachel = ["kb-training", "kb-spieltag"].every(id => {
    const z = quelle.split("\n").find(x => x.includes(`setB("${id}"`));
    return !!z && /echt\(x\)/.test(z);
  });
  if (!kachel) probleme.push("Die Kachel-Marke nimmt weiter den nächsten Termin, auch wenn er abgesagt ist");
  if (fehler.length) probleme.push(...fehler.slice(0, 3));

  zeilen.push(`Abfrage holt platz_status: ${abfragen.some(q => /platz_status/.test(q))} · Chip „Fällt aus · Platz gesperrt“ ${f.chip}`);
  zeilen.push(`Diese Woche: Schild ${r.woche.schild}, Grund ${r.woche.grund}, Knöpfe ${JSON.stringify(r.woche.knoepfe)} · Terminkarte: Schild ${r.liste.banner}, Planung ${JSON.stringify(r.liste.haupt)}`);
  zeilen.push(`„Bist du dabei?“ fragt nur noch nach Termin ${r.offen.join(",")} · Antwort-Zeile ohne Knöpfe ${!r.rowKnoepfe}`);
  return h.ergebnis("Fällt aus – überall sichtbar, nirgends mehr planbar", !probleme.length, zeilen.concat(probleme));
};
