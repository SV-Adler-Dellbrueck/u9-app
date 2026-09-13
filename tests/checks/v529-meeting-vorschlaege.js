/* v529 – PO mit zwei Bildschirmfotos: „Das Fenster ist nicht vollständig. Einige Kacheln
   haben keine Überschrift. Und ich lege jetzt einen Termin fest, um dann eine Abstimmung
   über einen neuen Termin zu machen? Ist das logisch?"

   Nein, war es nicht. Drei Befunde:
   a) Der Hauptknopf „Termin anlegen" war beim Meeting UNSICHTBAR: die Akzentfarbe hängt am
      data-typ der Karte, und für trainermeeting gab es keine Regel. background:var(--x)
      mit undefiniertem x ist am Ende ungültig und fällt auf den Anfangswert – transparent.
      Weiß auf weiß. Dazu passte der fünfte Typ-Knopf nicht mehr in die Reihe.
   b) Das Formular fragte nach EINEM Datum, als stünde es fest; erst das Fenster danach
      sprach von Vorschlägen. Jetzt heißt das Datum „Vorschlag 1", zwei weitere stehen
      darunter, und alle landen in der Abstimmung, bevor das Fenster aufgeht.
   c) Im Fenster stand unter der laufenden Abstimmung ein Block „Neues Meeting" mit vier
      unbeschrifteten Feldern. Im Termin gibt es die Abstimmung schon – dort fehlt höchstens
      ein weiterer Vorschlag. Und der Kopf nannte das vorläufige Datum wie ein festes.

   Die Farbe des Knopfes lässt sich hier NICHT über getComputedStyle().backgroundColor
   messen – bei background:var(--…) liefert der Harness auch für Training transparent.
   Gemessen wird deshalb die Ursache: dass die Karte für das Meeting eine Akzentfarbe
   bekommt, und dass sie nicht leer ist. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const tagA = h.tagePlus(14), tagB = h.tagePlus(21), tagC = h.tagePlus(28);
  const meeting = { id: 92, datum: tagA, typ: "trainermeeting", titel: "Saisonplanung", uhrzeit: "20:00", trainer_status: {} };
  let poll = null;

  const s = await h.starten({ supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    profiles: [{ id: "11111111-1111-1111-1111-111111111111", anzeigename: "Charles" }],
    termine: [meeting],
    trainer_poll: (u, req) => {
      if (req.method() === "POST") {
        const body = JSON.parse(req.postData() || "{}");
        poll = { id: 8, titel: body.titel, status: "offen", decided_slot_id: null, termin_id: body.termin_id };
        return { status: 201, body: JSON.stringify([poll]) };
      }
      return poll ? [poll] : [];
    },
    trainer_poll_slot: [], trainer_poll_vote: [], trainer_poll_thema: []
  }), hoehe: 2000 });
  await h.sichtbarMachen(s.page, "#train-sub-termine");

  const r = await s.page.evaluate(async ({ tagB, tagC }) => {
    window.trainerMe = async () => "Charles";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    const out = {};
    if (typeof tmNeuToggle === "function") tmNeuToggle(true);
    const sicht = id => { const el = document.getElementById(id); return el ? getComputedStyle(el).display !== "none" : null; };

    // a) Akzentfarbe und Typ-Reihe
    tmSetTyp("trainermeeting", null);
    const karte = document.getElementById("tm-karte");
    out.akzent = getComputedStyle(karte).getPropertyValue("--tm-akzent").trim();
    const seg = document.getElementById("tm-typ-seg");
    const segBox = seg.getBoundingClientRect();
    out.knoepfe = [...seg.querySelectorAll(".seg-btn")].map(b => { const r = b.getBoundingClientRect(); return { t: b.textContent.trim(), rechts: Math.round(r.right), h: Math.round(r.height) }; });
    out.segRechts = Math.round(segBox.right);

    // b) Formular fragt nach Vorschlägen
    out.datumLbl = (document.getElementById("tm-datum-lbl") || {}).textContent || "";
    out.vorschlaegeDa = sicht("tm-vorschlaege");
    tmSetTyp("training", null);
    out.datumLblTraining = (document.getElementById("tm-datum-lbl") || {}).textContent || "";
    out.vorschlaegeBeimTraining = sicht("tm-vorschlaege");
    tmSetTyp("trainermeeting", null);

    // Vorschlag 2 und 3 wandern beim Anlegen in die Abstimmung
    document.getElementById("tm-v2-datum").value = tagB; document.getElementById("tm-v2-zeit").value = "19:30";
    document.getElementById("tm-v3-datum").value = tagC;
    if (typeof TM_TERMINE !== "undefined") TM_TERMINE.length = 0;
    await tpollSicherstellen(92, [{ datum: tagB, uhrzeit: "19:30" }, { datum: tagC, uhrzeit: null }]);

    // c) Fenster aus dem Termin
    await tmMeetingOeffnen(92);
    for (let i = 0; i < 60 && !document.getElementById("tm-meet-card"); i++) await new Promise(r => setTimeout(r, 50));
    await new Promise(r => setTimeout(r, 400));
    const card = document.getElementById("tm-meet-card");
    out.fenster = card ? card.textContent.replace(/\s+/g, " ").trim() : "";
    out.neuesMeetingBlock = !!document.getElementById("tpoll-titel");
    out.weitererVorschlag = !!document.getElementById("tpoll-neu-d");
    out.unbeschriftet = card ? [...card.querySelectorAll("input")].filter(i => !i.closest("label") && !i.getAttribute("aria-label") && !i.placeholder).length : -1;
    return out;
  }, { tagB, tagC });

  await s.page.waitForTimeout(200);
  const slotPosts = s.gesendet.filter(g => /trainer_poll_slot/.test(g.pfad || "") && g.methode === "POST");
  const fehler = s.fehler(); await s.schliessen();

  // a)
  if (!r.akzent) probleme.push("Die Meeting-Karte hat keine Akzentfarbe – der Hauptknopf wäre wieder unsichtbar");
  const abgeschnitten = r.knoepfe.filter(k => k.rechts > r.segRechts + 1);
  if (abgeschnitten.length) probleme.push(`Typ-Knöpfe ragen aus der Reihe: ${abgeschnitten.map(k => k.t).join(", ")}`);
  const flach = r.knoepfe.filter(k => k.h < 44);
  if (flach.length) probleme.push(`Typ-Knöpfe unter 44 px: ${flach.map(k => k.t + " " + k.h).join(", ")}`);
  if (!r.knoepfe.some(k => /Meeting/.test(k.t))) probleme.push("Der Meeting-Knopf fehlt in der Typ-Reihe");
  // b)
  if (!/Vorschlag 1/.test(r.datumLbl)) probleme.push(`Beim Meeting heißt das Datum „${r.datumLbl}“ statt „Vorschlag 1“`);
  if (!r.vorschlaegeDa) probleme.push("Vorschlag 2 und 3 fehlen im Meeting-Formular");
  if (r.datumLblTraining !== "Datum") probleme.push(`Beim Training heißt das Datum jetzt „${r.datumLblTraining}“`);
  if (r.vorschlaegeBeimTraining) probleme.push("Die Vorschlagszeilen stehen auch beim Training");
  const slots = [].concat((slotPosts[0] || {}).body || []);
  if (slots.length !== 3) probleme.push(`${slots.length} Vorschläge in der Abstimmung statt 3 (Termin + zwei aus dem Formular)`);
  else {
    if (slots[0].datum !== tagA) probleme.push(`Vorschlag 1 ist ${slots[0].datum} statt des Termindatums`);
    if (slots[1].datum !== tagB || slots[1].uhrzeit !== "19:30") probleme.push(`Vorschlag 2 kommt als ${JSON.stringify(slots[1])} an`);
    if (slots[2].datum !== tagC) probleme.push(`Vorschlag 3 kommt als ${JSON.stringify(slots[2])} an`);
  }
  // c)
  if (r.neuesMeetingBlock) probleme.push("Im Termin-Fenster steht weiter der Block „Neues Meeting“, obwohl die Abstimmung läuft");
  if (!r.weitererVorschlag) probleme.push("Im Termin-Fenster fehlt „Weiteren Vorschlag hinzufügen“");
  if (r.unbeschriftet > 0) probleme.push(`${r.unbeschriftet} Eingabefeld(er) ohne Beschriftung im Fenster`);
  if (!/Vorschlag 1:/.test(r.fenster) || !/Termin steht noch nicht/.test(r.fenster)) probleme.push(`Der Kopf nennt das vorläufige Datum nicht als Vorschlag: ${r.fenster.slice(0, 120)}`);
  if (fehler.length) probleme.push(...fehler.slice(0, 2));

  zeilen.push(`Akzent ${r.akzent || "–"} · Typ-Reihe: ${r.knoepfe.map(k => k.t).join(" | ")} · alle in der Reihe ${!abgeschnitten.length}`);
  zeilen.push(`Formular: „${r.datumLbl}“ · Vorschlag 2/3 ${r.vorschlaegeDa} (Training: „${r.datumLblTraining}“, ${r.vorschlaegeBeimTraining})`);
  zeilen.push(`Abstimmung: ${slots.length} Vorschläge · Fenster: Neues Meeting ${r.neuesMeetingBlock} · weiterer Vorschlag ${r.weitererVorschlag} · unbeschriftet ${r.unbeschriftet}`);
  zeilen.push(`Kopf: ${r.fenster.slice(0, 90)}`);
  return h.ergebnis("Meeting: Vorschläge statt festem Datum, sichtbarer Knopf, vollständiges Fenster", !probleme.length, zeilen.concat(probleme));
};
