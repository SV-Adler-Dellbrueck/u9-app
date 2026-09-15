/* v562 – Der Marker für „noch nicht eingeordnet" wird ein Punkt.

   In der Übungsliste stand die Auskunft als ganzer Satz in einem Chip mit `nowrap`. Am
   Handy war dieser Chip damit das breiteste Element der Zeile: der Name der Übung wurde
   auf drei Zeilen gequetscht, die Kachel doppelt so hoch — für die unwichtigste Angabe
   darin. Jetzt ein Punkt mit Fragezeichen.

   Die Bedeutung hängt dabei nicht an der Farbe: das Fragezeichen trägt sie mit, und die
   Worte stehen im aria-label des Knopfes, in dem der Punkt sitzt. Wer die Zeile hört,
   bekommt weiterhin „Art der Übung: noch nicht eingeordnet".

   Fälle:
   a) Der Marker ist schmal — höchstens ein Drittel dessen, was der Satz belegte.
   b) Der Name der Übung bekommt dadurch den Platz: er füllt mehr als die halbe Zeile.
   c) Die Worte stehen im aria-label und im title, nicht nur in der Farbe.
   d) Der Knopf bleibt mit 44 px antippbar, auch wenn der Punkt kleiner ist.
   e) Eine eingeordnete Übung zeigt weiterhin ihr Kürzel, keinen Punkt. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];

  const s = await h.starten({ breite: 412, hoehe: 900, warten: 900, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    team_config: [{ id: 1, uebung_meta: {}, uebung_art: {} }]
  }) });

  await h.sichtbarMachen(s.page, "#view-formen");
  const r = await s.page.evaluate(async () => {
    for (const n of ["_tfKarte", "tpAllForms", "tpArtChip"])
      if (typeof window[n] !== "function") return { fehlt: n };
    await uebungMetaLoad();
    const f = tpAllForms()[0];

    const halter = document.createElement("div");
    halter.style.cssText = "width:388px";     // Handybreite abzüglich der Ränder
    halter.innerHTML = _tfKarte({ f, i: 0, gr: "" });
    document.body.appendChild(halter);

    const zeile = halter.firstElementChild;
    const knoepfe = [...zeile.querySelectorAll("button")];
    const artKnopf = knoepfe.find(b => /tpArtTipp/.test(b.getAttribute("onclick") || ""));
    const nameKnopf = knoepfe.find(b => /tpShowExercise/.test(b.getAttribute("onclick") || ""));
    const punkt = artKnopf && artKnopf.firstElementChild;

    const aus = {
      artBreit: artKnopf ? Math.round(artKnopf.getBoundingClientRect().width) : -1,
      artHoch: artKnopf ? Math.round(artKnopf.getBoundingClientRect().height) : -1,
      nameBreit: nameKnopf ? Math.round(nameKnopf.getBoundingClientRect().width) : -1,
      zeileBreit: Math.round(zeile.getBoundingClientRect().width),
      zeileHoch: Math.round(zeile.getBoundingClientRect().height),
      lbl: artKnopf ? (artKnopf.getAttribute("aria-label") || "") : "",
      titel: punkt ? (punkt.getAttribute("title") || "") : "",
      zeichen: punkt ? punkt.textContent.trim() : "",
      nurFarbe: punkt ? !punkt.textContent.trim() : true
    };

    /* e) Eingeordnet: das Kürzel bleibt, der Punkt verschwindet. */
    await tpArtTipp(f.name);
    aus.eingeordnet = tpArtChip(f, true);

    halter.remove();
    return aus;
  });

  if (r.fehlt) probleme.push(r.fehlt + " fehlt");
  else {
    /* Der Satz „noch nicht eingeordnet" belegte bei 10 px Schrift und nowrap rund 120 px.
       Ein Drittel davon ist die Grenze, ab der die Kachel wieder atmet. */
    if (r.artBreit < 0) probleme.push("In der Übungskachel steht kein Knopf zum Einordnen");
    else if (r.artBreit > 40) probleme.push(`Der Marker belegt ${r.artBreit} px – als Punkt sollen es höchstens 40 sein`);
    if (r.artHoch < 44) probleme.push(`Der Knopf ist ${r.artHoch} px hoch – gefordert 44, auch wenn der Punkt kleiner ist`);
    if (r.nameBreit < r.zeileBreit / 2) probleme.push(`Der Name bekommt ${r.nameBreit} von ${r.zeileBreit} px – weniger als die Hälfte der Zeile`);
    if (!/noch nicht eingeordnet/.test(r.lbl)) probleme.push(`Das aria-label sagt nicht, was offen ist: „${r.lbl}“`);
    if (!/noch nicht eingeordnet/.test(r.titel)) probleme.push(`Der title des Punktes sagt nichts: „${r.titel}“`);
    if (r.nurFarbe) probleme.push("Der Marker trägt nur Farbe – Farbe darf nie der einzige Bedeutungsträger sein");
    if (r.zeichen !== "?") probleme.push(`Im Punkt steht „${r.zeichen}“ statt eines Fragezeichens`);
    if (/\?/.test(r.eingeordnet || "") || !/Spielform|Übungsform|weder/.test(r.eingeordnet || ""))
      probleme.push(`Eine eingeordnete Übung zeigt nicht ihr Kürzel: „${r.eingeordnet}“`);
    if (!probleme.length) zeilen.push(`Kachel am Handy: Marker ${r.artBreit} px statt eines Satzes, Name ${r.nameBreit} von ${r.zeileBreit} px, Kachel ${r.zeileHoch} px hoch`);
  }

  const fehler = s.fehler();
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);
  await s.schliessen();

  return h.ergebnis("Übungskachel: ein Punkt statt eines Satzes", !probleme.length, zeilen.concat(probleme));
};
