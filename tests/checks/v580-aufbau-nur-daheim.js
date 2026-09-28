/* v580 – Beim Auswärtsspiel baut niemand auf.

   PO am 19.09., mit Bildschirmfoto aus dem Eltern-Bereich: „Bei Auswärtsspielen ist im
   Eltern-Zugang der Punkt beim Aufbauen helfen nicht relevant."

   v662 (PO 28.09.): Eltern sehen nur noch Aufgaben, die der Trainer am Termin freigibt. Die
   Regel von v580 wandert deshalb in den Freigabe-Block des Trainers:
   a) Auswärts (`heim === false`): der Aufbau wird gar nicht erst angeboten – beim Spiel wie
      beim Turnier. Betreuung, Live-Ticker, Fotos und Abbau bleiben wählbar.
   b) Daheim und solange Heim/Auswärts offen ist: Aufbau wählbar.
   c) Wer sich vorher eingetragen hatte, sieht seinen Eintrag im Termin-Detail weiter und kann
      ihn entfernen – auch ohne Freigabe. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const datum = h.tagePlus(3);
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  await s.page.waitForTimeout(3500);
  const r = await s.page.evaluate(({ datum }) => {
    if (typeof tmHelferFreigabeHtml !== "function") return { fehlt: "tmHelferFreigabeHtml" };
    const angebot = t => { const d = document.createElement("div"); d.innerHTML = tmHelferFreigabeHtml(t); return [...d.querySelectorAll(".te-hf-an")].map(c => c.dataset.t); };
    const termin = (typ, heim) => Object.assign({ id: 88, typ, datum, uhrzeit: "13:00" }, heim === undefined ? {} : { heim });
    return { ausSpiel: angebot(termin("spiel", false)), ausTurnier: angebot(termin("turnier", false)),
      heim: angebot(termin("spiel", true)), offen: angebot(termin("spiel", undefined)) };
  }, { datum });
  await s.schliessen();
  if (r.fehlt) return h.ergebnis("Aufbau nur daheim", false, [r.fehlt + " fehlt"]);
  const aufbau = l => l.some(x => /Aufbau/.test(x));
  if (aufbau(r.ausSpiel)) probleme.push("a) Auswärtsspiel bietet den Aufbau an");
  if (aufbau(r.ausTurnier)) probleme.push("a) Auswärtsturnier bietet den Aufbau an");
  ["Betreuung", "Live-Ticker", "Fotografieren", "Abbau"].forEach(w => { if (!r.ausSpiel.some(x => x.includes(w))) probleme.push(`a) Auswärts fehlt „${w}“`); });
  if (!aufbau(r.heim)) probleme.push("b) Heimspiel bietet keinen Aufbau an");
  if (!aufbau(r.offen)) probleme.push("b) Offenes Heimrecht bietet keinen Aufbau an");
  zeilen.push(`a/b) auswärts: ${r.ausSpiel.join(" · ")} · daheim: ${r.heim.join(" · ")}`);

  const s2 = await h.starten({ start: "/eltern/index.html", warten: 1200,
    supabase: h.supabaseAttrappe({ event_helfer: [{ id: 7, name: "Kind A Familie", aufgabe: "🛠️ Aufbau", user_id: "wer-anders" }] }) });
  const c = await s2.page.evaluate(async ({ datum }) => {
    const box = document.createElement("div"); box.id = "td-helfer"; document.body.appendChild(box);
    await tdHelferLoad({ id: 88, typ: "spiel", datum, heim: false, uhrzeit: "13:00" });
    await new Promise(x => setTimeout(x, 150));
    return /Kind A Familie/.test(box.textContent || "");
  }, { datum });
  const f = s2.fehler(); await s2.schliessen();
  if (!c) probleme.push("c) Alter Eintrag ohne Freigabe nicht mehr sichtbar");
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  zeilen.push(`c) alter Eintrag sichtbar: ${c}`);
  return h.ergebnis("Aufbau nur daheim", !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
