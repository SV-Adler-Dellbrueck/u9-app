/* v527 – PO: „Wir brauchen unter Orga-Termin eine weitere Terminart, und zwar
   Trainermeeting. Aus dem Termin heraus muss es eine Terminfindung geben … und eine
   Möglichkeit, Themen zu sammeln."

   Terminfindung und Themensammlung gab es schon (trainer_poll, seit v4xx) – sie hingen nur
   an einer eigenen Kachel statt am Termin. Der eigentliche Grund dafür war kein Versäumnis,
   sondern die Leseregel: `termine` darf JEDER lesen, auch ohne Anmeldung (davon leben
   Turnierseite, Stadionheft und Liveticker). Ein Meeting dort wäre öffentlich gewesen.

   Geprüft wird deshalb zuerst die Zusage, die man nicht sehen kann:
   a) Die Terminart existiert und die App fragt die Termine so ab, dass ein Meeting
      mitkommt – im Formular, in der Liste und im Detail.
   b) Aus dem Meeting-Termin führt genau ein Weg in die Terminfindung.
   c) Der Eltern-Block fehlt im Meeting-Termin, und der Hinweis auf die Vertraulichkeit steht da.
   d) „Hier können alle" markiert den Vorschlag ohne ✗ mit den meisten ✓ – und NICHT einen
      mit einer Absage.
   e) Wer noch nicht abgestimmt hat, steht mit Namen da.
   f) Themen lassen sich sammeln, bevor der Termin steht.
   g) Abhaken fragt nach dem Beschluss, hält das Abhaken aber nicht auf.

   Die RLS-Gegenprobe steht NICHT hier: in dieser Prüfung ist Supabase eine Attrappe, die
   jede Regel bestätigen würde, die man ihr vorgibt. Sie ist direkt auf der Datenbank
   gefahren und in der PR belegt. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const bald = h.tagePlus(9), spaeter = h.tagePlus(16);
  const meeting = { id: 90, datum: bald, typ: "trainermeeting", titel: "Saisonplanung",
                    uhrzeit: "20:00", ort: "Vereinsheim", trainer_status: {} };
  const UID_ICH = "11111111-1111-1111-1111-111111111111";
  const UID_ZWEI = "22222222-2222-2222-2222-222222222222";

  const s = await h.starten({ supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    profiles: u => (/role=eq\.trainer/.test(u.search)
      ? [{ id: UID_ICH, anzeigename: "Charles" }, { id: UID_ZWEI, anzeigename: "Kenneth" },
         { id: "33333333-3333-3333-3333-333333333333", anzeigename: "Peter" }]
      : [{ anzeigename: "Charles" }]),
    termine: u => (/id=eq\.90/.test(u.search) || /trainermeeting/.test(u.search)) ? [meeting] : [meeting],
    trainer_poll: [{ id: 5, titel: "Saisonplanung", status: "offen", decided_slot_id: null, termin_id: 90 }],
    trainer_poll_slot: [{ id: 51, poll_id: 5, datum: bald, uhrzeit: "20:00" },
                        { id: 52, poll_id: 5, datum: spaeter, uhrzeit: "20:00" }],
    /* Slot 51 hat eine Absage, Slot 52 zwei Zusagen und keine Absage – die Empfehlung
       muss auf 52 fallen, nicht auf den Vorschlag mit den meisten Stimmen insgesamt. */
    trainer_poll_vote: [{ slot_id: 51, voter: UID_ICH, status: "ja" },
                        { slot_id: 51, voter: UID_ZWEI, status: "nein" },
                        { slot_id: 52, voter: UID_ICH, status: "ja" },
                        { slot_id: 52, voter: UID_ZWEI, status: "ja" }],
    trainer_poll_thema: [{ id: 71, poll_id: 5, text: "Trikots nachbestellen", erledigt: false, beschluss: null }]
  }), hoehe: 2000 });

  const r = await s.page.evaluate(async ({ bald }) => {
    window.trainerMe = async () => "Charles";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    const out = {};

    // a) Terminart im Formular und in den Stammdaten
    out.meta = (typeof TM_META !== "undefined" && TM_META.trainermeeting) ? TM_META.trainermeeting.label : null;
    out.formKnopf = !!document.querySelector('#tm-typ-seg [data-val="trainermeeting"]');
    if (typeof tmSetTyp === "function") {
      tmSetTyp("trainermeeting", null);
      const sicht = id => { const el = document.getElementById(id); return el ? getComputedStyle(el).display !== "none" : null; };
      out.spielformWeg = sicht("tm-spielform-row") === false;
      out.heimWeg = sicht("tm-heim-row") === false;
      out.titelDa = sicht("tm-titel-row") === true;
    }

    // b/c) Termin-Detail
    /* TM_TERMINE ist ein let auf oberster Ebene und steht damit nicht auf window – das
       Array selbst befuellen (dieselbe Falle wie bei _TB_LISTE in v526). */
    if (typeof TM_TERMINE !== "undefined") TM_TERMINE.length = 0;
    await tmDetailOpen(90);
    for (let i = 0; i < 40 && !document.getElementById("tmd-modal"); i++) await new Promise(r => setTimeout(r, 50));
    const detail = document.getElementById("tmd-modal");
    out.detailText = detail ? detail.textContent.replace(/\s+/g, " ").trim() : "";
    out.wegInsMeeting = detail ? [...detail.querySelectorAll("button")]
      .filter(b => /tmMeetingOeffnen/.test(b.getAttribute("onclick") || "")).length : 0;
    out.elternInfo = detail ? /Eltern-Info/.test(out.detailText) : null;
    out.elternAntworten = detail ? /Antworten der Eltern/.test(out.detailText) : null;
    out.hinweis = /nur Trainer/.test(out.detailText);

    // d–f) Terminfindung aus dem Termin heraus
    await tmMeetingOeffnen(90);
    for (let i = 0; i < 60 && !document.getElementById("tm-meet-card"); i++) await new Promise(r => setTimeout(r, 50));
    await new Promise(r => setTimeout(r, 400));
    const card = document.getElementById("tm-meet-card");
    if (!card) { out.pollFehlt = true; return out; }
    out.pollText = card.textContent.replace(/\s+/g, " ").trim();
    /* Der Vorschlag traegt seine Kennung als data-slot – sonst muesste die Pruefung aus
       verschachtelten <div> erraten, welcher Kasten gemeint ist, und griffe die Fusszeile. */
    const k51 = card.querySelector('[data-slot="51"]'), k52 = card.querySelector('[data-slot="52"]');
    out.kaestenDa = !!k51 && !!k52;
    out.empfehlung51 = k51 ? /Hier können alle/.test(k51.textContent) : null;
    out.empfehlung52 = k52 ? /Hier können alle/.test(k52.textContent) : null;
    out.offeneNamen = /offen: Peter/.test(out.pollText);
    out.themenOffen = /Trikots nachbestellen/.test(out.pollText);
    out.sammelnHinweis = /Sammeln geht schon jetzt/.test(out.pollText);

    // g) Abhaken fragt nach dem Beschluss
    const haken = [...card.querySelectorAll("button")].find(b => /tpollThemaToggle\(71,true\)/.test(b.getAttribute("onclick") || ""));
    if (haken) { haken.click(); await new Promise(r => setTimeout(r, 600)); }
    out.beschlussFrage = !!document.getElementById("frage-text-modal");
    const feld = document.getElementById("frage-text-feld");
    out.beschlussFeldHoehe = feld ? Math.round(parseFloat(getComputedStyle(feld).minHeight) || 0) : 0;
    document.getElementById("frage-text-modal")?.remove();
    return out;
  }, { bald });

  await s.page.waitForTimeout(200);
  const gepatcht = s.gesendet.filter(g => /trainer_poll_thema/.test(g.pfad || "") && g.methode === "PATCH");
  const fehler = s.fehler(); await s.schliessen();

  if (r.pollFehlt) probleme.push("Aus dem Termin heraus öffnet sich keine Terminfindung");
  // a) Terminart
  if (r.meta !== "Trainermeeting") probleme.push(`TM_META kennt die Terminart nicht (${r.meta})`);
  if (!r.formKnopf) probleme.push("Im Termin-Formular fehlt die Auswahl „Meeting“");
  if (r.spielformWeg === false) probleme.push("Beim Meeting steht die Spielform im Formular");
  if (r.heimWeg === false) probleme.push("Beim Meeting steht Heim/Auswärts im Formular");
  if (r.titelDa === false) probleme.push("Beim Meeting fehlt das Titelfeld");
  // b/c) Detail
  if (r.wegInsMeeting !== 1) probleme.push(`${r.wegInsMeeting} Wege in die Terminfindung statt genau einem`);
  if (r.elternInfo) probleme.push("Der Meeting-Termin bietet „Eltern-Info“ an");
  if (r.elternAntworten) probleme.push("Der Meeting-Termin zeigt „Antworten der Eltern“");
  if (!r.hinweis) probleme.push("Im Meeting-Termin fehlt der Hinweis, dass ihn nur Trainer sehen");
  // d) Empfehlung
  if (!r.kaestenDa) probleme.push("Die Vorschlags-Kästen tragen keine Kennung (data-slot)");
  if (r.empfehlung51) probleme.push("„Hier können alle“ steht am Vorschlag MIT einer Absage");
  if (!r.empfehlung52) probleme.push("Der Vorschlag ohne Absage ist nicht als „Hier können alle“ markiert");
  // e–g)
  if (!r.offeneNamen) probleme.push(`Wer noch nicht abgestimmt hat, steht nicht mit Namen da: ${r.pollText.slice(0, 200)}`);
  if (!r.themenOffen) probleme.push("Themen stehen nicht da, solange der Termin offen ist");
  if (!r.sammelnHinweis) probleme.push("Kein Hinweis, dass Sammeln schon vor dem Termin geht");
  if (!r.beschlussFrage) probleme.push("Abhaken fragt nicht nach dem Beschluss");
  if (!gepatcht.length) probleme.push("Abhaken wurde nicht gespeichert – die Frage hält es also auf");
  else if ((gepatcht[0].body || {}).erledigt !== true) probleme.push(`Abhaken schickt ${JSON.stringify(gepatcht[0].body)}`);
  if (r.beschlussFeldHoehe && r.beschlussFeldHoehe < 48) probleme.push(`Beschluss-Feld nur ${r.beschlussFeldHoehe} px hoch`);
  if (fehler.length) probleme.push(...fehler.slice(0, 2));

  zeilen.push(`Terminart ${r.meta} · Formularknopf ${r.formKnopf} · Wege ins Meeting ${r.wegInsMeeting}`);
  zeilen.push(`Eltern-Info ${r.elternInfo} · Antworten der Eltern ${r.elternAntworten} · Hinweis ${r.hinweis}`);
  zeilen.push(`Empfehlung: Slot mit Absage ${r.empfehlung51} · Slot ohne Absage ${r.empfehlung52} · offene Namen ${r.offeneNamen}`);
  zeilen.push(`Themen vor dem Termin ${r.themenOffen} · Beschlussfrage ${r.beschlussFrage} · Abhaken gespeichert ${gepatcht.length}`);
  return h.ergebnis("Trainermeeting: eigene Terminart, Terminfindung und Themen am Termin", !probleme.length, zeilen.concat(probleme));
};
