/* v528 – PO mit Bildschirmfoto des Anlege-Formulars: „Helfer brauchen wir keine beim
   Meeting. Und es fehlt die Möglichkeit Themen zu sammeln. Und wo finde ich die Möglichkeit
   für einen Termin abstimmen zu lassen?"

   Drei Befunde aus v527, dazu einer, den erst diese Frage sichtbar gemacht hat:

   a) Der Block „Wer hilft" stand auch beim Meeting im Formular. Beim Ausblenden waren
      Spielform, Heim und Platz erwischt, der Helfer-Block nicht.
   b) Themen ließen sich nicht sammeln, solange keine Abstimmung existierte – und die
      entstand erst, wenn jemand von Hand einen Vorschlag eintrug. Wer nur Themen sammeln
      wollte, stand vor einem leeren Fenster. Jetzt legt das Öffnen die Abstimmung an, mit
      dem Termin selbst als erstem Vorschlag.
   c) Der Weg zur Abstimmung lag hinter „speichern → Liste → Termin antippen" und wurde
      nirgends genannt. Jetzt steht ein Satz im Formular, und nach dem Anlegen geht es
      direkt weiter.
   d) DER ERNSTE: Ein festgelegter Vorschlag verschob den Termin nicht. Der Kalender hätte
      weiter den Tag gezeigt, an dem der Termin angelegt wurde, während das Meeting an einem
      anderen stattfindet – zwei Wahrheiten für dieselbe Sache, und die im Kalender ist die,
      die alle sehen. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const tagA = h.tagePlus(14), tagB = h.tagePlus(21);
  const meeting = { id: 91, datum: tagA, typ: "trainermeeting", titel: "Saisonplanung",
                    uhrzeit: "20:00", trainer_status: {} };
  let pollAngelegt = null;

  const s = await h.starten({ supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    profiles: [{ id: "11111111-1111-1111-1111-111111111111", anzeigename: "Charles" }],
    termine: [meeting],
    /* Wie die echte Tabelle: erst gibt es keine Abstimmung zu diesem Termin; ein POST legt
       eine an und antwortet mit der Zeile (die App fragt mit Prefer: return=representation
       und braucht die id). Das gehört in die Attrappe und NICHT in eine eigene page.route –
       eine zweite Route fängt die Anfrage ab, bevor der Harness sie aufzeichnet, und dann
       misst die Prüfung ihre eigene Abkürzung statt der App. */
    trainer_poll: (u, req) => {
      if (req.method() === "POST") {
        const body = JSON.parse(req.postData() || "{}");
        pollAngelegt = { id: 8, titel: body.titel, status: "offen", decided_slot_id: null, termin_id: body.termin_id };
        return { status: 201, body: JSON.stringify([pollAngelegt]) };
      }
      return pollAngelegt ? [pollAngelegt] : [];
    },
    trainer_poll_slot: [],
    trainer_poll_vote: [],
    trainer_poll_thema: []
  }), hoehe: 2000 });

  const r = await s.page.evaluate(async () => {
    window.trainerMe = async () => "Charles";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    const out = {};
    const sicht = id => { const el = document.getElementById(id); return el ? getComputedStyle(el).display !== "none" : null; };

    // a) Helfer-Block und c) Hinweis im Formular
    tmSetTyp("trainermeeting", null);
    out.helferWeg = sicht("tm-block-helfen") === false;
    out.hinweisDa = sicht("tm-meeting-hinweis") === true;
    const hh = document.getElementById("tm-helfer-hinweis");
    if (hh) hh.value = "Reste vom letzten Termin";
    tmSetTyp("training", null); tmSetTyp("trainermeeting", null);
    out.helferGeleert = hh ? hh.value === "" : null;
    out.helferBeimTraining = (tmSetTyp("training", null), sicht("tm-block-helfen"));
    tmSetTyp("trainermeeting", null);

    // b) Öffnen legt die Abstimmung an, Themen sind sofort da
    if (typeof TM_TERMINE !== "undefined") TM_TERMINE.length = 0;
    await tmMeetingOeffnen(91);
    for (let i = 0; i < 60 && !document.getElementById("tm-meet-card"); i++) await new Promise(r => setTimeout(r, 50));
    await new Promise(r => setTimeout(r, 500));
    const card = document.getElementById("tm-meet-card");
    out.fensterDa = !!card;
    out.pollText = card ? card.textContent.replace(/\s+/g, " ").trim() : "";
    out.themenfeldDa = !!document.querySelector('[id^="tpoll-thema-"]');
    return out;
  });

  await s.page.waitForTimeout(300);
  const pollPosts = s.gesendet.filter(g => /trainer_poll$/.test((g.pfad || "").replace(/\?.*$/, "")) && g.methode === "POST");
  const slotPosts = s.gesendet.filter(g => /trainer_poll_slot/.test(g.pfad || "") && g.methode === "POST");

  // d) Festlegen verschiebt den Termin
  const r2 = await s.page.evaluate(async ({ tagB }) => {
    window.__slot = { id: 62, poll_id: 8, datum: tagB, uhrzeit: "19:30" };
    const echtesFetch = window.fetch;
    window.fetch = (u, o) => {
      const url = String(u);
      if (/trainer_poll\?id=eq\.8&select=termin_id/.test(url))
        return Promise.resolve(new Response(JSON.stringify([{ termin_id: 91 }]), { status: 200, headers: { "Content-Type": "application/json" } }));
      if (/trainer_poll_slot\?id=eq\.62/.test(url))
        return Promise.resolve(new Response(JSON.stringify([{ datum: window.__slot.datum, uhrzeit: window.__slot.uhrzeit }]), { status: 200, headers: { "Content-Type": "application/json" } }));
      return echtesFetch(u, o);
    };
    await tpollDecide(8, 62);
    await new Promise(r => setTimeout(r, 300));
    window.fetch = echtesFetch;
    return { ok: true };
  }, { tagB });

  await s.page.waitForTimeout(200);
  const terminPatch = s.gesendet.filter(g => /termine\?id=eq\.91/.test((g.pfad || "") + (g.suche || "")) && g.methode === "PATCH");
  const fehler = s.fehler(); await s.schliessen();

  // a)
  if (!r.helferWeg) probleme.push("Der Block „Wer hilft“ steht beim Meeting im Formular");
  if (r.helferBeimTraining === false) probleme.push("Der Helfer-Block fehlt jetzt auch beim Training");
  if (!r.helferGeleert) probleme.push("Der Helfer-Hinweis wandert aus dem letzten Termin ins Meeting");
  // c)
  if (!r.hinweisDa) probleme.push("Im Formular steht nicht, wo Abstimmung und Themen zu finden sind");
  // b)
  if (!r.fensterDa) probleme.push("Aus dem Termin heraus öffnet sich kein Fenster");
  if (!pollPosts.length) probleme.push("Ohne vorhandene Abstimmung wird keine angelegt – Themen bleiben unerreichbar");
  else if (Number((pollPosts[0].body || {}).termin_id) !== 91) probleme.push(`Die angelegte Abstimmung hängt an Termin ${(pollPosts[0].body || {}).termin_id} statt an 91`);
  if (!slotPosts.length) probleme.push("Der Termin selbst wird nicht als erster Vorschlag eingetragen");
  else {
    const slot = [].concat(slotPosts[0].body || [])[0] || {};
    if (slot.datum !== tagA) probleme.push(`Erster Vorschlag ist ${slot.datum} statt des Termindatums ${tagA}`);
  }
  if (!r.themenfeldDa) probleme.push("Es gibt kein Feld, um ein Thema einzutragen");
  // d)
  if (!terminPatch.length) probleme.push("Ein festgelegter Vorschlag verschiebt den Termin nicht – Kalender und Meeting laufen auseinander");
  else {
    const b = terminPatch[0].body || {};
    if (b.datum !== tagB) probleme.push(`Der Termin wird auf ${b.datum} statt auf ${tagB} geschoben`);
    if (String(b.uhrzeit || "") !== "19:30") probleme.push(`Die Uhrzeit wandert als ${JSON.stringify(b.uhrzeit)} mit`);
  }
  if (fehler.length) probleme.push(...fehler.slice(0, 2));

  zeilen.push(`Helfer-Block: Meeting ${r.helferWeg ? "weg" : "DA"} · Training ${r.helferBeimTraining} · Hinweis im Formular ${r.hinweisDa}`);
  zeilen.push(`Abstimmung angelegt: ${pollPosts.length} · erster Vorschlag ${slotPosts.length ? JSON.stringify([].concat(slotPosts[0].body)[0]) : "–"}`);
  zeilen.push(`Themenfeld da: ${r.themenfeldDa}`);
  zeilen.push(`Termin nachgezogen: ${terminPatch.length ? JSON.stringify(terminPatch[0].body) : "nein"}`);

  /* e) PO: „Kann ich einen Meeting-Termin anlegen ohne festes Datum?" Nein – datum ist
     Pflicht. Der empfohlene Weg ist ein vorläufiges Datum, das sich beim Festlegen von
     selbst verschiebt. Damit das nicht nur für den ehrlich ist, der den Termin angelegt
     hat, sagt der Termin es auch: solange die Abstimmung läuft, steht „Termin steht noch
     nicht" in Liste und Fenster – und danach nicht mehr. */
  for (const fall of [{ status: "offen", erwartet: true }, { status: "entschieden", erwartet: false }]) {
    const s3 = await h.starten({ supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(),
      profiles: [{ anzeigename: "Charles" }],
      termine: [meeting],
      trainer_poll: [{ id: 9, titel: "Saisonplanung", status: fall.status, decided_slot_id: null, termin_id: 91 }],
      trainer_poll_slot: [], trainer_poll_vote: [], trainer_poll_thema: []
    }), hoehe: 1600 });
    const r3 = await s3.page.evaluate(async () => {
      window.trainerMe = async () => "Charles";
      if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
      await h_tmInit();
      async function h_tmInit() {
        let up = document.getElementById("tm-upcoming"), pa = document.getElementById("tm-past");
        if (!up) { up = document.createElement("div"); up.id = "tm-upcoming"; document.body.appendChild(up); }
        if (!pa) { pa = document.createElement("div"); pa.id = "tm-past"; document.body.appendChild(pa); }
        await tmLoad();
      }
      await new Promise(r => setTimeout(r, 300));
      const liste = (document.getElementById("tm-upcoming") || {}).textContent || "";
      await tmDetailOpen(91);
      for (let i = 0; i < 40 && !document.getElementById("tmd-modal"); i++) await new Promise(r => setTimeout(r, 50));
      await new Promise(r => setTimeout(r, 400));
      const fenster = (document.getElementById("tmd-modal") || {}).textContent || "";
      return { liste: liste.replace(/\s+/g, " ").trim(), fenster: fenster.replace(/\s+/g, " ").trim() };
    });
    const fehler3 = s3.fehler(); await s3.schliessen();
    const inListe = /Termin steht noch nicht/.test(r3.liste);
    const imFenster = /Termin steht noch nicht/.test(r3.fenster);
    if (inListe !== fall.erwartet) probleme.push(`Abstimmung ${fall.status}: in der Liste ${inListe ? "steht" : "fehlt"} „Termin steht noch nicht“`);
    if (imFenster !== fall.erwartet) probleme.push(`Abstimmung ${fall.status}: im Termin-Fenster ${imFenster ? "steht" : "fehlt"} „Termin steht noch nicht“`);
    if (fehler3.length) probleme.push(...fehler3.slice(0, 1));
    zeilen.push(`Abstimmung ${fall.status}: Liste ${inListe} · Fenster ${imFenster} (erwartet ${fall.erwartet})`);
  }

  return h.ergebnis("Meeting: kein Helfer-Block, Themen sofort, Termin wandert mit, vorläufiges Datum erkennbar", !probleme.length, zeilen.concat(probleme));
};
