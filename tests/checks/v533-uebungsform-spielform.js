/* v533 – Paket 3: Übungsform gegen Spielform (doku/auftrag-adler-luecken, „Kleinigkeit").

   Die Unterscheidung liegt hier an der ÜBUNG: welche Übung ist eine Spielform, welche
   eine Übungsform. Am BLOCK hängt sie seit v534 (Paket 3) zusätzlich.

   Abschnitt a) hält fest, dass ein UNBEKANNTER Blocktyp weiterhin nicht getragen wird:
   er wird gezeichnet, verliert beim Speichern aber still seine Trainerzuordnung,
   während der Plan die Übung trotzdem einem Trainer zurechnet. Für „spielform" und
   „uebungsform" ist genau das in v534 behoben – die prüft v534 selbst. Diese Prüfung
   bewacht die Grenze: ein frei erfundener Typ bleibt gefährlich.

   Geprüft:
   a) Der Befund: ein Block mit unbekanntem Typ verliert beim Speichern seine
      Trainerzuordnung, während der Plan die Übung trotzdem einem Trainer zurechnet.
   b) Drei Zustände, und „noch nicht eingeordnet" wird nie geraten.
   c) Antippen ordnet ein: offen → Spielform → Übungsform → offen, und schreibt
      team_config.uebung_art (nicht uebung_meta – die Sterne bleiben unberührt).
   d) Die Kennzeichnung steht an der Übung, ohne eigene Farbe.
   e) Zusammenspiel mit v534 (Paket 3): über die Nettozeit entscheidet der BLOCKTYP.
      Die Einordnung der Übung rechnet NICHT mit – sie widerspricht nur, wenn ein als
      Spielform gezählter Block eine als Übungsform eingeordnete Übung trägt. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];

  const s = await h.starten({ warten: 900, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    team_config: [{ id: 1, uebung_meta: { "Korridor-Funino": 3 }, uebung_art: {} }]
  }) });

  const r = await s.page.evaluate(async () => {
    const out = {};

    // ── a) Der Befund, der die Bauweise begründet ────────────────────────────────
    tpSlots.length = 0;
    tpSlots.push({ label: "Übungsform", dauer: 20, farbe: "#1a56db", typ: "uebung" });
    tpSlots.push({ label: "Spielform",  dauer: 20, farbe: "#1a56db", typ: "main" });
    document.querySelectorAll("#tp-trainer-checks input").forEach((c, i) => { if (i < 2) c.checked = true; });
    tpRenderTimeline();
    const slots = [...document.querySelectorAll(".tp-slot")];
    slots.forEach(sl => sl.querySelectorAll("select.tp-form-sel").forEach(sel => { tpCoaches[sel.id] = "Charles"; sel.value = "0"; }));
    const z = tpSlotsMitZuordnung();
    out.zuordnungUnbekannt = !!(z[0] && z[0].coaches);   // erwartet: false – geht verloren
    out.zuordnungMain      = !!(z[1] && z[1].coaches);   // erwartet: true
    out.planRechnetZu = tpPlanEntries().some(e => e.slotLabel === "Übungsform" && e.trainer && e.trainer !== "Alle");
    out.imHinzufuegenDialog = TP_ADD_OPTS.some(o => o.typ === "uebung");
    out.importKenntTyp = (typeof EI_TYPEN !== "undefined") && EI_TYPEN.includes("uebung");

    // ── b/c) Drei Zustände am Namen der Übung ────────────────────────────────────
    await uebungMetaLoad();
    const f = tpAllForms()[0];
    out.name = f && f.name;
    out.artAmAnfang = _tpArt(f);                       // erwartet: "" – nichts geraten
    out.chipOffen   = tpArtChip(f, true);
    await tpArtTipp(out.name); out.nach1 = _tpArt(f);
    await tpArtTipp(out.name); out.nach2 = _tpArt(f);
    await tpArtTipp(out.name); out.nach3 = _tpArt(f);
    /* v541: Der Kreis hat einen VIERTEN Zustand bekommen – „weder noch", für
       Koordinationsleiter, Fallschule und Rituale, die fachlich keines von beidem sind.
       Nach drei Tipps steht deshalb nicht mehr „offen", sondern „weder noch"; erst der
       vierte führt zurück. Für die Netto-Rechnung unten wird jetzt gezielt auf
       Übungsform gestellt statt blind zweimal zu tippen – sonst hängt diese Prüfung
       an der Länge des Kreises. */
    for (let i = 0; i < 6 && _tpArt(f) !== "uebung"; i++) await tpArtTipp(out.name);
    out.artFinal = _tpArt(f);
    out.sterneUnberuehrt = (window._uebungMeta || {})["Korridor-Funino"];

    // d) Kennzeichnung an der Übung, ohne eigene Farbe
    out.chipEingeordnet = tpArtChip(f, false);

    // ── e) Netto-Spielzeit der Vorlagen ──────────────────────────────────────────
    const zweite = tpAllForms().find(x => x.name !== out.name && !["aufwaermen", "torwart", "individual"].includes(x.kat));
    out.zweite = zweite && zweite.name;
    const bloecke = [
      { label: "Aufwärmen",  typ: "warmup",    dauer: 10 },
      { label: "Hauptteil 1", typ: "main",     dauer: 20, uebung_name: out.name },    // Übungsform
      { label: "Hauptteil 2", typ: "main",     dauer: 20, uebung_name: out.zweite },  // nicht eingeordnet
      { label: "Abschluss",   typ: "abschluss", dauer: 20 }                            // freies Spiel
    ];
    /* v534 (Paket 3) hat die Rechnung umgestellt: über die Nettozeit entscheidet jetzt
       der BLOCKTYP, nicht mehr die Einordnung der Übung – sonst gäbe es zwei Wahrheiten
       für dieselbe Zahl. Die Einordnung rechnet nicht mehr mit, sie WIDERSPRICHT nur:
       ein Block, der als Spielform zählt, dessen Übung aber als Übungsform eingeordnet
       ist, wird benannt. Genau das wird hier geprüft. */
    out.summe = _evSpielformSumme(bloecke);            // erwartet 60: beide main-Blöcke + Abschluss
    out.unstimmig = _evUnstimmigeBloecke(bloecke);
    out.hinweis = _evNettoHinweis({ netto_spielform_min: 10, bloecke });
    return out;
  });

  await s.page.waitForTimeout(200);
  const geschrieben = s.gesendet.filter(g => /team_config/.test(g.pfad || ""));
  const fehler = s.fehler();
  await s.schliessen();

  // a) Befund
  if (r.zuordnungUnbekannt) probleme.push("ein Block mit FREI ERFUNDENEM Typ speichert seine Trainerzuordnung – dann führt auch ein Tippfehler im Import zu einem halb funktionierenden Block");
  if (!r.zuordnungMain) probleme.push("ein Hauptteil speichert seine Trainerzuordnung nicht – Gegenprobe kaputt");
  if (!r.planRechnetZu) probleme.push("der Plan rechnet dem unbekannten Blocktyp keinen Trainer zu – Gegenprobe kaputt");
  if (r.imHinzufuegenDialog) probleme.push("„uebung“ steht im Hinzufügen-Dialog – der Typ heißt „uebungsform“, nicht „uebung“");
  if (r.importKenntTyp) probleme.push("der Import kennt den Typ „uebung“ – er heißt „uebungsform“; zwei Schreibweisen für dasselbe wären eine Falle");

  // b/c) drei Zustände
  if (r.artAmAnfang !== "") probleme.push(`ohne Einordnung steht „${r.artAmAnfang}“ – es darf nichts geraten werden`);
  /* v562: Der Marker ist ein Punkt, kein Satz – die Worte stehen im aria-label des Knopfes,
     in dem er sitzt (unten geprüft). Hier zählt nur, dass überhaupt etwas dasteht und dass
     die Bedeutung nicht allein an der Farbe hängt: das Fragezeichen trägt sie mit. */
  if (!/\?/.test(r.chipOffen || "")) probleme.push(`nicht eingeordnet wird nicht gekennzeichnet: „${r.chipOffen}“`);
  const folge = [r.nach1, r.nach2, r.nach3].join(",");
  // v541: vier Zustände im Kreis – offen, Spielform, Übungsform, weder noch.
  if (folge !== "spiel,uebung,weder") probleme.push(`Antipp-Folge ist [${folge}] – erwartet spiel, uebung, weder noch`);
  if (r.sterneUnberuehrt !== 3) probleme.push(`die ⭐-Einstufung wurde mitverändert (${r.sterneUnberuehrt}) – Einordnung und Sterne müssen getrennt bleiben`);
  const art = geschrieben.filter(g => g.body && g.body.uebung_art);
  if (!art.length) probleme.push("es wird kein uebung_art nach team_config geschrieben");
  if (geschrieben.some(g => g.body && g.body.uebung_meta)) probleme.push("beim Einordnen wird auch uebung_meta geschrieben – die Sterne dürfen nicht mitfahren");

  // d) schlichte Kennzeichnung
  if (!/Übungsform/.test(r.chipEingeordnet || "")) probleme.push(`Kennzeichnung fehlt oder heißt anders: „${r.chipEingeordnet}“`);
  if (/background:#[0-9a-f]{3,6}/i.test(r.chipEingeordnet || "")) probleme.push("die Kennzeichnung trägt eine eigene Farbe – das Paket verlangt eine schlichte");

  // e) Netto-Rechnung
  if (r.summe !== 60) probleme.push(`Spielform-Summe ${r.summe} Min. (erwartet 60 – beide main-Blöcke und das Abschlussspiel, nicht das Warm-up)`);
  if (!r.unstimmig.includes(r.name)) probleme.push(`der Widerspruch wird nicht benannt: [${r.unstimmig}] – erwartet „${r.name}“`);
  if (!/die Übung ist aber als Übungsform eingeordnet/.test(r.hinweis || "")) probleme.push(`der Hinweis verschweigt den Widerspruch: „${(r.hinweis || "").slice(0, 140)}“`);

  if (fehler.length) probleme.push(...fehler.slice(0, 2));

  zeilen.push(`Erfundener Blocktyp: Zuordnung gespeichert ${r.zuordnungUnbekannt} (Hauptteil ${r.zuordnungMain}) · Plan rechnet trotzdem zu ${r.planRechnetZu}`);
  zeilen.push(`Einordnung „${r.name}“: offen → ${[r.nach1, r.nach2, r.nach3].map(x => x || "offen").join(" → ")} · Sterne unberührt ${r.sterneUnberuehrt === 3}`);
  zeilen.push(`Netto: Summe ${r.summe} Min. (Blocktyp entscheidet) · Widerspruch benannt [${r.unstimmig}]`);

  return h.ergebnis("Übungsform gegen Spielform: an der Übung, drei Zustände, Netto-Rechnung folgt", !probleme.length, zeilen.concat(probleme));
};
