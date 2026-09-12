/* v521 – PO mit Bildschirmfoto der Startseite: „Kann die To Do kachel nicht anklicken."

   Befund: Der Ausdruck fuer den Knopf wurde mit doppelten Anfuehrungszeichen gebaut

     act: `(typeof tmDetailOpen==="function"?tmDetailOpen(77):go("termine"))`

   und landete unveraendert in onclick="…". Das erste " im Wert beendete das Attribut:
   der Browser las onclick als `(typeof tmDetailOpen==` und machte aus dem Rest eigene,
   sinnlose Attribute. Der Knopf tat nichts. Der Haken daneben (todoOhneErgebnis(77), ohne
   Anfuehrungszeichen) funktionierte weiter – deshalb sah die Kachel heil aus.

   Warum v471 das nicht gefangen hat: die Pruefung dort liest das onclick-Attribut und sucht
   darin „tmDetailOpen". Das stand auch in der abgeschnittenen Fassung – der Text stimmte,
   die Wirkung nicht. Diese Pruefung KLICKT deshalb und sieht nach, ob der Aufruf ankommt.

   Lehre: ein Attributwert, der aus einem Ausdruck kommt, darf das Zeichen nicht enthalten,
   das ihn umschliesst – und eine Pruefung, die nur den Attributtext liest, merkt davon
   nichts. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const gestern = h.tagePlus(-1);
  const spiel = { id: 77, datum: gestern, typ: "spiel", titel: "Sommer Cup", gegner: "VFB05",
                  uhrzeit_ende: "12:00", ergebnis: "", ohne_ergebnis: false };

  const s = await h.starten({ supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    profiles: [{ name: "Charles", rolle: "trainer" }],
    termine: u => (/spiel|turnier/.test(u.searchParams.get("typ") || "") ? [spiel] : [])
  }), hoehe: 1600 });

  const r = await s.page.evaluate(async () => {
    let slot = document.getElementById("trainer-todo-slot");
    if (!slot) { slot = document.createElement("div"); slot.id = "trainer-todo-slot"; document.body.appendChild(slot); }
    window.trainerMe = async () => "Charles";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    await trainerTodoLoad();

    const knoepfe = [...slot.querySelectorAll("button")];
    const haupt = knoepfe.find(b => /nachtragen/.test(b.textContent || ""));
    if (!haupt) return { fehlt: true };

    /* Der verraeterische Rest: bei abgeschnittenem Attribut haengen am Knopf zusaetzliche
       Attribute, die aus den Bruchstuecken des Ausdrucks entstanden sind. */
    const attribute = haupt.getAttributeNames();
    const onclick = haupt.getAttribute("onclick") || "";

    /* Der eigentliche Beweis: klicken und sehen, ob der Aufruf ankommt. */
    window.__todoRuf = [];
    window.tmDetailOpen = id => window.__todoRuf.push(id);
    haupt.click();

    return { fehlt: false, attribute, onclick, gerufen: window.__todoRuf.slice() };
  });

  const fehler = s.fehler(); await s.schliessen();

  if (r.fehlt) { probleme.push("Das To-Do „nachtragen“ steht gar nicht in der Kachel"); return h.ergebnis("To-Do lässt sich antippen", false, probleme); }

  if (r.gerufen.length !== 1) probleme.push(`Antippen ruft tmDetailOpen ${r.gerufen.length}× auf statt einmal – der Knopf ist tot`);
  else if (r.gerufen[0] !== 77) probleme.push(`Antippen öffnet Termin ${r.gerufen[0]} statt 77`);

  /* Gegen die Ursache, nicht nur gegen das Symptom. */
  if (/"/.test(r.onclick)) probleme.push(`onclick enthält ein doppeltes Anführungszeichen: ${r.onclick}`);
  if (!/\)$/.test(r.onclick.trim())) probleme.push(`onclick ist abgeschnitten: ${r.onclick}`);
  const fremd = r.attribute.filter(a => !["onclick", "style", "class", "title", "aria-label", "type"].includes(a));
  if (fremd.length) probleme.push(`Am Knopf hängen Bruchstücke als Attribute: ${fremd.join(", ")}`);
  if (fehler.length) probleme.push(...fehler.slice(0, 2));

  zeilen.push(`Klick ruft tmDetailOpen(${r.gerufen.join(",") || "–"})`);
  zeilen.push(`onclick: ${r.onclick}`);
  zeilen.push(`Attribute am Knopf: ${r.attribute.join(", ")}`);
  return h.ergebnis("To-Do lässt sich antippen und öffnet den Termin", !probleme.length, zeilen.concat(probleme));
};
