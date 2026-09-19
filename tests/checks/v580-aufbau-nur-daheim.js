/* v580 – Beim Auswärtsspiel baut niemand auf.

   PO am 19.09., mit Bildschirmfoto aus dem Eltern-Bereich: „Bei Auswärtsspielen ist im
   Eltern-Zugang der Punkt beim Aufbauen helfen nicht relevant."

   Stimmt: Aufgebaut wird beim Gastgeber. Wer auswärts spielt, kommt an ein fertiges Feld –
   die Zeile „🛠️ Aufbau ab 12:30 Uhr" fragte dort nach Hilfe für etwas, das es nicht gibt.

   Fälle:
   a) Auswärts (`heim === false`): keine Aufbau-Zeile – beim Spiel wie beim Turnier. Alles
      andere bleibt: Betreuung, Live-Ticker, Fotos sind auswärts genauso nötig.
   b) Daheim (`heim === true`): unverändert mit Aufbau.
   c) Noch nicht eingetragen (`heim` fehlt): die Zeile bleibt stehen. Eine Aufgabe zu früh
      wegzulassen kostet Helfer, eine zu viel kostet einen Blick.
   d) Beim Event bleibt der Aufbau: `heim` wird dort nicht gesetzt (der Kalender schreibt
      es nur bei Spielen), und ein Sommerfest baut man selbst auf. Trägt jemand dort
      ausdrücklich „auswärts" ein, entfällt der Aufbau – dann ist es auch ein fremder Platz.
   e) Ohne Termin (der Notnagel nach dem Eintragen) greift nur der Typ-Filter, wie bisher.
   f) Wer sich vorher eingetragen hatte, sieht seinen Eintrag weiter und kann ihn entfernen –
      sonst hinge eine Zusage fest, die niemand mehr sieht. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const datum = h.tagePlus(3);

  const s = await h.starten({
    start: "/eltern/index.html",
    warten: 1200,
    hoehe: 1600,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(),
      event_helfer: [{ id: 7, name: "Kind A Familie", aufgabe: "🛠️ Aufbau", user_id: "wer-anders" }]
    })
  });

  const r = await s.page.evaluate(({ datum }) => {
    if (typeof helferTasksFuer !== "function") return { fehlt: "helferTasksFuer" };
    const namen = t => t.map(a => a.t);
    const termin = (typ, heim) => Object.assign({ id: 88, typ, datum, uhrzeit: "13:00", treffzeit: "12:30" },
      heim === undefined ? {} : { heim });
    const out = {};
    out.auswaertsSpiel = namen(helferTasksFuer("spiel", termin("spiel", false)));
    out.auswaertsTurnier = namen(helferTasksFuer("turnier", termin("turnier", false)));
    out.heimSpiel = namen(helferTasksFuer("spiel", termin("spiel", true)));
    out.offen = namen(helferTasksFuer("spiel", termin("spiel", undefined)));
    out.event = namen(helferTasksFuer("event", termin("event", undefined)));
    out.eventAuswaerts = namen(helferTasksFuer("event", termin("event", false)));
    out.ohneTermin = namen(helferTasksFuer("spiel", null));
    out.training = namen(helferTasksFuer("training", termin("training", undefined)));
    return out;
  }, { datum });

  if (r.fehlt) { await s.schliessen(); return h.ergebnis("Aufbau nur daheim", false, [r.fehlt + " fehlt"]); }

  /* f) Die Liste der Eingetragenen wird aus der Datenbank gezeichnet, nicht aus der
     Aufgabenliste – ein alter Aufbau-Eintrag bleibt deshalb sichtbar. Geprüft am echten
     Termin-Detail. */
  const sichtbar = await s.page.evaluate(async ({ datum }) => {
    const box = document.createElement("div"); box.id = "td-helfer"; document.body.appendChild(box);
    if (typeof tdHelferLoad !== "function") return null;
    await tdHelferLoad({ id: 88, typ: "spiel", datum, heim: false, uhrzeit: "13:00", treffzeit: "12:30" });
    await new Promise(x => setTimeout(x, 150));
    const text = box.textContent || "";
    return {
      eintragSichtbar: /Kind A Familie/.test(text),
      knopfWeg: ![...box.querySelectorAll("button")].some(b => /Aufbau/.test(b.textContent || "")),
      andere: [...box.querySelectorAll("button")].filter(b => /Betreuung|Live-Ticker|Fotos/.test(b.textContent || "")).length
    };
  }, { datum });

  const fehler = s.fehler();
  await s.schliessen();

  const hatAufbau = liste => liste.some(x => /Aufbau/.test(x));
  // a)
  if (hatAufbau(r.auswaertsSpiel)) probleme.push(`Auswärtsspiel bietet weiterhin den Aufbau an: ${r.auswaertsSpiel.join(" · ")}`);
  if (hatAufbau(r.auswaertsTurnier)) probleme.push(`Auswärtsturnier bietet weiterhin den Aufbau an: ${r.auswaertsTurnier.join(" · ")}`);
  ["Betreuung", "Live-Ticker", "Fotografieren"].forEach(w => {
    if (!r.auswaertsSpiel.some(x => x.includes(w))) probleme.push(`Auswärts fehlt außerdem „${w}“ – nur der Aufbau entfällt`);
  });
  // b) + c) + d) + e)
  if (!hatAufbau(r.heimSpiel)) probleme.push("Beim Heimspiel fehlt der Aufbau");
  if (r.heimSpiel.length !== 4) probleme.push(`Heimspiel zeigt ${r.heimSpiel.length} Aufgaben statt vier`);
  if (!hatAufbau(r.offen)) probleme.push("Solange Heim/Auswärts nicht eingetragen ist, darf der Aufbau nicht verschwinden");
  if (!hatAufbau(r.event)) probleme.push("Beim Event entfällt der Aufbau – ein Sommerfest baut man selbst auf");
  if (hatAufbau(r.eventAuswaerts)) probleme.push("Ein ausdrücklich auswärtiges Event fragt trotzdem nach Aufbau-Hilfe");
  if (!hatAufbau(r.ohneTermin)) probleme.push("Ohne Termin verschwindet der Aufbau – der Notnagel kennt das Heimrecht nicht");
  if (r.training.some(x => /Aufbau/.test(x))) probleme.push("Beim Training steht plötzlich ein Aufbau");
  // f)
  if (!sichtbar) probleme.push("tdHelferLoad fehlt");
  else {
    if (!sichtbar.eintragSichtbar) probleme.push("Ein vorhandener Aufbau-Eintrag ist auswärts nicht mehr zu sehen – niemand könnte ihn entfernen");
    if (!sichtbar.knopfWeg) probleme.push("Im Termin-Detail steht auswärts weiterhin ein Aufbau-Knopf");
    if (sichtbar.andere !== 3) probleme.push(`Im Termin-Detail stehen ${sichtbar.andere} der drei übrigen Aufgaben`);
  }
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);

  if (!probleme.length) {
    zeilen.push(`Auswärts: ${r.auswaertsSpiel.join(" · ")} – der Aufbau entfällt, der Rest bleibt`);
    zeilen.push(`Daheim: ${r.heimSpiel.join(" · ")} · noch offen: ${r.offen.length} Aufgaben (Aufbau bleibt) · Event ohne Heimrecht: Aufbau bleibt, ausdrücklich auswärts: entfällt`);
    zeilen.push("Termin-Detail auswärts: kein Aufbau-Knopf, die drei übrigen da, ein alter Eintrag bleibt sichtbar");
  }
  return h.ergebnis("Aufbau nur daheim", !probleme.length, zeilen.concat(probleme));
};
