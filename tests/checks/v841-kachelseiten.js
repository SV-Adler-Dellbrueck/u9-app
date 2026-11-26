/* v841 · Kachelseiten: selten Gebrauchtes klappt zu (Bestandsaufnahme November 2026, 4.1; Bilder von Charles gesehen am 17.11.).
   a) „Eltern & Kinder“: offen stehen „Nachrichten“ und „Kinder belohnen“ (je drei Kacheln); „Eltern verwalten“,
      „Kabine gestalten“ und „Inhalte“ sind Klappen mit Überschrift und Anzahl. Zugeklappt sind ihre Kacheln nicht im Bild.
   b) „Orga“: „Termine“, „Notizen“, „Team-Orga“ offen; „Einstellungen“ ist eine Klappe; der Benachrichtigungs-Slot steht außerhalb.
   c) Eine Klappe ist per Tipp und per Tastatur bedienbar (summary, ≥ 56 px), öffnet ihre Kacheln, und das Gerät merkt sich den Stand.
   d) Es fehlt keine Kachel: jede Funktion der alten Seiten ist weiter erreichbar. */
"use strict";
module.exports = async function (h) {
  const titel = "v841 Kachelseiten: Tägliches offen, Seltenes in Klappen – nichts fällt weg";
  const probleme = [], zeilen = [];
  const s = await h.starten({ warten: 2000, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  await h.sichtbarMachen(s.page, "#main-app");
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    if (typeof kKlappe !== "function") return { alt: true };
    try { Object.keys(localStorage).filter(k => k.startsWith("adler_klappe_")).forEach(k => localStorage.removeItem(k)); } catch (e) {}
    const out = {};
    const lies = key => {
      const el = document.getElementById("view-ue-" + key);
      const imBild = b => { const q = b.getBoundingClientRect(); return q.height > 0 && !b.closest("details:not([open])"); };
      const kn = [...el.querySelectorAll('button[onclick^="kachelRun"]')];
      return { alle: kn.map(b => b.getAttribute("onclick").match(/kachelRun\('([^']+)'/)[1]), offen: kn.filter(imBild).length,
        klappen: [...el.querySelectorAll("details.k-klappe")].map(d => ({ id: d.dataset.klappe, text: d.querySelector("summary").textContent.replace(/\s+/g, " ").trim(), h: Math.round(d.querySelector("summary").getBoundingClientRect().height), offen: d.open })),
        pushAussen: !!el.querySelector("#push-slot-trainer") && !el.querySelector("details #push-slot-trainer") };
    };
    openTab("elki"); await w(700); out.elki = lies("elki");
    openTab("orga"); await w(700); out.orga = lies("orga");
    // c)
    const d = document.querySelector('#view-ue-orga details[data-klappe="orga-einstellungen"]');
    d.querySelector("summary").click(); await w(150);
    out.c = { offen: d.open, kacheln: [...d.querySelectorAll("button")].filter(b => b.getBoundingClientRect().height >= 44).length, gemerkt: localStorage.getItem("adler_klappe_orga-einstellungen") };
    openTab("home"); await w(300); openTab("orga"); await w(700);
    out.c.nachWechsel = document.querySelector('#view-ue-orga details[data-klappe="orga-einstellungen"]').open;
    return out;
  }).catch(e => ({ fehler: String(e) }));
  const fe = s.fehler(); await s.schliessen();
  if (r.alt) return h.ergebnis(titel, false, ["kKlappe fehlt (Stand vor v841)"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  const ek = r.elki.klappen.map(k => k.id).join(","), ok = r.orga.klappen.map(k => k.id).join(",");
  if (ek !== "elki-eltern,elki-kabine,elki-inhalte" || r.elki.offen !== 6) probleme.push(`a) Eltern & Kinder: Klappen ${ek}, ${r.elki.offen} Kacheln offen (erwartet 6)`);
  else zeilen.push(`a) Eltern & Kinder: 6 Kacheln offen, Klappen ${r.elki.klappen.map(k => "„" + k.text + "“").join(" · ")}`);
  if (ok !== "orga-einstellungen" || !r.orga.pushAussen || r.orga.offen < 10) probleme.push(`b) Orga: Klappen ${ok}, ${r.orga.offen} Kacheln offen, Benachrichtigungen außerhalb ${r.orga.pushAussen}`);
  else zeilen.push(`b) Orga: ${r.orga.offen} Kacheln offen, „Einstellungen“ als Klappe, Benachrichtigungen außerhalb`);
  const klein = r.elki.klappen.concat(r.orga.klappen).filter(k => k.h < 56 || !/\d+ Eintr/.test(k.text));
  if (klein.length) probleme.push("c) Klappe unter 56 px oder ohne Anzahl: " + JSON.stringify(klein));
  if (!r.c.offen || r.c.kacheln !== 6 /* v939: + Mein Geburtstag, v974: + Timer an die Uhr */ || r.c.gemerkt !== "1" || !r.c.nachWechsel) probleme.push("c) Öffnen und Merken: " + JSON.stringify(r.c));
  else zeilen.push("c) Tipp öffnet fünf Kacheln; nach dem Wechsel der Seite ist die Klappe noch offen");
  const SOLL_ELKI = ["rufeEinstieg", "ansageTrainerOpen", "epollTrainerOpen", "einladungskartenOpen", "rueckmeldeStatistikOpen", "pushAbdeckungOpen", "elternTeamEditOpen", "federnVergebenOpen", "questEditorOpen", "urkundenOpen", "adlerWeltOpen", "codexKinderEditOpen", "wahlTrainerOpen", "albumFotosOpen", "go", "nestEditorOpen", "stadionheftOpen"];
  const SOLL_ORGA = ["trainerPlanOpen", "trainerMeetingOpen", "tagebuchGedanke", "mitbringTrainerOpen", "kasseOpen", "materialOpen", "fundbueroOpen", "setupTrainerOpen", "pwChangeOpen", "trainerGeburtstagOpen", "nutzungOpen", "backupExport"];
  const fehltE = SOLL_ELKI.filter(f => !r.elki.alle.includes(f)), fehltO = SOLL_ORGA.filter(f => !r.orga.alle.includes(f));
  if (fehltE.length || fehltO.length) probleme.push("d) Kachel fehlt: " + fehltE.concat(fehltO).join(", "));
  else zeilen.push(`d) alle Funktionen erreichbar (${r.elki.alle.length} in Eltern & Kinder, ${r.orga.alle.length} in Orga)`);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
