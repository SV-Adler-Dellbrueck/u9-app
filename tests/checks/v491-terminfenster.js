/* v491 – PO: „Diese Kachel, wenn ich von der Startseite auf einen Termin klicke, ist total
   unübersichtlich und nicht gut strukturell aufgebaut. Hier wäre auch ein Absprung zur
   Festival-Planung oder ins Match sinnvoll. Optimiere diese Seite optisch, strukturell und
   inhaltlich." Geprueft: klare Abschnitte in fester Reihenfolge, zwei grosse Wege (Planer und
   Match) je nach Termintyp und Tag, Ergebnis erst wenn der Termin da ist, Seltenes zugeklappt
   (Platz-Status bei Absage sichtbar – seit v741 oben im Termin statt aufgeklappt), 44-px-Ziele, und der Sprung in den Planer
   schliesst das Fenster. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const morgen = h.tagePlus(1), heute = h.heute(), gestern = h.tagePlus(-1);
  const termine = [
    { id: 1, datum: morgen, typ: "turnier", titel: "Kinderfestival", heim: true, uhrzeit: "10:15", ort: "Thurner Kamp 97", platz: "links + Käfig", trainer_status: {} },
    { id: 2, datum: heute, typ: "turnier", titel: "Kinderfestival", heim: true, uhrzeit: "10:15", trainer_status: {} },
    { id: 3, datum: morgen, typ: "spiel", titel: "", heim: false, gegner: "SV Rath-Heumar", uhrzeit: "11:00", trainer_status: {} },
    { id: 4, datum: morgen, typ: "training", titel: "", uhrzeit: "16:45", trainer_status: {} },
    { id: 5, datum: gestern, typ: "spiel", titel: "", heim: true, uhrzeit: "11:00", ergebnis: "3:2", trainer_status: {} },
    { id: 6, datum: morgen, typ: "turnier", titel: "Abgesagt", heim: true, uhrzeit: "10:15", platz_status: "abgesagt", platz_status_note: "Platz gesperrt", trainer_status: {} }
  ];
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, nominierungen: [] }), hoehe: 1600 });
  const r = await s.page.evaluate(async (termine) => {
    if (typeof _tmdKarte !== "function") return { fehlt: "_tmdKarte" };
    await loadKader();
    document.getElementById("tm-upcoming")?.remove(); document.getElementById("tm-past")?.remove();
    TM_TERMINE = termine;
    /* v937: Das Fenster hat zwei Ansichten – „sport“ (Standard, von der Startseite) und „orga“ („Termin verwalten“). */
    const lies = (id, modus) => {
      document.getElementById("tmd-modal")?.remove();
      tmDetailOpen(id, modus);
      const mo = document.getElementById("tmd-modal");
      const txt = mo.textContent.replace(/\s+/g, " ");
      const gross = [...mo.querySelectorAll("button")].filter(b => Math.round(b.getBoundingClientRect().height) >= 50 && /Planen|planen|Zum Spieltag|Trainingsplan|Anwesenheit|Wer kommt|Mitbringliste|Turnier-Modus/.test(b.textContent));
      const abschnitte = [...mo.querySelectorAll("div")].map(d => d.children.length === 0 ? d.textContent.trim() : "").filter(x => ["Fürs Training", "Für den Spieltag", "Auswärts", "Welche Trainer sind dabei?", "Am Platz", "Termin verwalten", "Was du hier tust", "Nach dem Termin"].includes(x));
      const det = [...mo.querySelectorAll("details")].map(x => ({ s: x.querySelector("summary").textContent.trim(), offen: x.open }));
      return {
        modus: (mo.querySelector(".tmd-karte") || { dataset: {} }).dataset.modus, wechsel: (document.getElementById("tmd-wechsel") || {}).textContent || "",
        kacheln: [...mo.querySelectorAll(".tmd-kachel")].map(b => b.querySelector("span").textContent.trim()),
        txt, gross: gross.map(b => ({ l: b.textContent.trim(), p: b.classList.contains("btn-p"), h: Math.round(b.getBoundingClientRect().height) })),
        abschnitte, det, ergebnis: !!mo.querySelector('input[placeholder="z. B. 3:2"]'),
        chips: [...mo.querySelectorAll("button")].filter(b => /^(Charles|Finn|Kenneth|Peter|Markus)/.test(b.textContent.trim())).map(b => Math.round(b.getBoundingClientRect().height)),
        ampel: !!mo.querySelector("button") && /Fällt aus/.test(txt), antworten: !!mo.querySelector('button[onclick^="rsvpOverviewOpen"]'),   // v846: der Knopf heißt „Rückmeldungen“
        stattfinden: (() => { const el = mo.querySelector('[id^="tm-stattfinden-"]'); return el ? { sichtbar: !el.closest("details") && el.offsetParent !== null } : null; })()
      };
    };
    const fest = lies(1), festHeute = lies(2), aus = lies(3), tr = lies(4), alt = lies(5), ab = lies(6), orga = lies(1, "orga");
    // Sprung in den Planer schliesst das Fenster
    let planerRuf = null; window.htOpen = (d, n, a) => { planerRuf = { d, n, a }; };
    lies(1);
    [...document.querySelectorAll("#tmd-modal button")].find(b => /Festival planen/.test(b.textContent))?.click();
    const zu = !document.getElementById("tmd-modal");
    return { fest, festHeute, aus, tr, alt, ab, orga, planerRuf, zu };
  }, termine);
  const fehler = s.fehler(); await s.schliessen();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt`); return h.ergebnis("Termin-Fenster", false, probleme); }
  const L = x => x.gross.map(g => (g.p ? "▶" : "") + g.l).join(" | ");
  if (r.fest.gross.length !== 2 || !/^▶Festival planen/.test(L(r.fest)) || !/Zum Spieltag/.test(L(r.fest))) probleme.push(`Heimturnier morgen: ${L(r.fest)} – erwartet „Festival planen" (primär) und „Zum Spieltag" (v702)`);
  if (!/^▶Zum Spieltag/.test(L(r.festHeute))) probleme.push(`Am Termintag muss das Match vorn stehen: ${L(r.festHeute)}`);
  if (r.aus.gross.length !== 1 || !/Zum Spieltag/.test(L(r.aus))) probleme.push(`Auswärtsspiel: ${L(r.aus)} – kein Planer, nur das Match`);
  if (!/Trainingsplan/.test(L(r.tr)) || !/Wer kommt\?/.test(L(r.tr))) probleme.push(`Training: ${L(r.tr)}`);   // v937: vor dem Trainingstag „Wer kommt?“ statt „Anwesenheit“
  if (r.fest.gross.some(g => g.h < 50)) probleme.push(`große Knöpfe nur ${JSON.stringify(r.fest.gross.map(g => g.h))} px hoch`);
  const soll = ["Für den Spieltag", "Welche Trainer sind dabei?", "Am Platz"];   // v937: Sport-Ansicht
  if (r.fest.abschnitte.join("|") !== soll.join("|")) probleme.push(`Abschnitte ${JSON.stringify(r.fest.abschnitte)} statt ${JSON.stringify(soll)}`);
  if (r.alt.abschnitte[r.alt.abschnitte.length - 1] !== "Nach dem Termin") probleme.push(`Beim vergangenen Spiel fehlt „Nach dem Termin": ${JSON.stringify(r.alt.abschnitte)}`);
  if (r.fest.ergebnis) probleme.push("Ergebnisfeld steht schon vor dem Spiel da");
  if (!r.alt.ergebnis) probleme.push("Beim vergangenen Spiel fehlt das Ergebnisfeld");
  /* v937: Seltenes ist nicht mehr zugeklappt, sondern steht in der zweiten Ansicht „Termin verwalten“. */
  if (r.fest.modus !== "sport" || r.fest.det.length || !/Termin verwalten/.test(r.fest.wechsel) || /Bearbeiten|Eltern-Info|Kalender|Termin löschen/.test(r.fest.txt)) probleme.push(`Sport-Ansicht trägt Orga-Themen oder keinen Link: ${JSON.stringify([r.fest.modus, r.fest.det.length, r.fest.wechsel])}`);
  if (r.orga.modus !== "orga" || !["Bearbeiten", "Eltern-Info", "Rückmeldungen", "Kalender", "Fotos"].every(x => r.orga.kacheln.includes(x)) || !/Termin löschen/.test(r.orga.txt) || !/Zum Spieltag/.test(r.orga.wechsel)) probleme.push(`„Termin verwalten“: ${JSON.stringify([r.orga.modus, r.orga.kacheln, r.orga.wechsel])}`);
  // v741 (PO 04.10.): Der Platz-Status steht nicht mehr unter „Für die Eltern“, sondern oben im Termin –
  // bei einer Absage also ohne Aufklappen sichtbar (vorher klappte sich der Block dafür auf).
  if (!r.ab.stattfinden || !r.ab.stattfinden.sichtbar) probleme.push("Bei einer Absage ist der Platz-Status nicht ohne Aufklappen sichtbar");
  if (!/Fällt aus – Platz gesperrt/.test(r.ab.txt)) probleme.push("Die Absage steht nicht oben im Fenster");
  if (!r.fest.ampel || !r.orga.antworten) probleme.push(`Platz-Ampel ${r.fest.ampel}, Rückmeldungen unter „Termin verwalten“ ${r.orga.antworten}`);
  if (r.fest.chips.some(hh => hh < 44)) probleme.push(`Trainer-Chips nur ${JSON.stringify(r.fest.chips)} px hoch`);
  if (!r.planerRuf || r.planerRuf.a !== "festival") probleme.push(`Planer-Sprung: ${JSON.stringify(r.planerRuf)}`);
  if (!r.zu) probleme.push("Das Termin-Fenster bleibt beim Sprung in den Planer offen");
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Heimturnier morgen: ${L(r.fest)} · am Termintag: ${L(r.festHeute)}`);
  zeilen.push(`Auswärts: ${L(r.aus)} · Training: ${L(r.tr)} · Abschnitte ${JSON.stringify(r.fest.abschnitte)}`);
  zeilen.push(`Zugeklappt ${r.fest.det.map(d => d.s.slice(0, 18)).join(", ")} · Absage-Status oben ${!!(r.ab.stattfinden && r.ab.stattfinden.sichtbar)} · Ergebnis vorher ${r.fest.ergebnis}/nachher ${r.alt.ergebnis} · Chips ${r.fest.chips[0]}px`);
  return h.ergebnis("Termin-Fenster: klare Abschnitte, zwei große Wege, Seltenes zugeklappt", !probleme.length, zeilen.concat(probleme));
};
