/* v541 – Spielform, Übungsform oder keines von beidem: Vorschlag zum Durchsehen.

   Die Einordnung gehört dem Trainer und liegt in team_config.uebung_art (v533). Bis
   hierher war sie für fast alle Übungen leer, und leer heißt für die Nettospielzeit
   „zählt mit, könnte aber falsch sein".

   Der wichtigste Fall ist c): Der Vorschlag aus data.js darf NIE still angewendet
   werden. Solange nichts übernommen wurde, gilt eine Übung als nicht eingeordnet, und
   es geht kein einziger Schreibzugriff an Supabase.

   Fälle:
   a) Der Vorschlag deckt alle mitgelieferten Übungen ab und kennt nur die drei Werte.
   b) Der dritte Wert „weder noch" ist im Kreis des Chips enthalten.
   c) Das Öffnen der Durchsicht schreibt nichts; _tpArt bleibt leer.
   d) Ein Tipp in der Durchsicht ändert nur die Anzeige, nicht die Datenbank.
   e) „Einordnung übernehmen" schreibt EINMAL, mit allen Werten in einem PATCH.
   f) Danach ist die Arbeitsmenge leer und der Einstiegsknopf verschwindet.
   g) Eine schon von Hand eingeordnete Übung wird vom Vorschlag nicht überschrieben.
   h) Knopfhöhen: Hauptaktion 56, übrige mindestens 48 (cockpit-ui). */
module.exports = async function (h) {
  const probleme = [], zeilen = [];

  // Eine Übung ist schon von Hand eingeordnet – und zwar ANDERS als der Vorschlag.
  const vorhanden = { "Korridor-Funino": "uebung" };

  const s = await h.starten({
    hoehe: 3000, supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(),
      team_config: [{ id: 1, uebung_meta: {}, uebung_art: vorhanden, netto_richtwert: 48 }]
    })
  });
  await h.sichtbarMachen(s.page, "#tf-art-einstieg");

  const r = await s.page.evaluate(async () => {
    await loadKader();
    const warte = ms => new Promise(r => setTimeout(r, ms));
    await uebungMetaLoad();
    renderTraining();
    await warte(150);
    const out = {};

    // a) Vollständigkeit und erlaubte Werte
    const werte = new Set(Object.values(UEBUNG_ART_VORSCHLAG));
    out.werte = [...werte].sort();
    out.ohneVorschlag = TRAININGSFORMEN.filter(f => !UEBUNG_ART_VORSCHLAG[f.name]).map(f => f.name);
    out.zahlVorschlag = Object.keys(UEBUNG_ART_VORSCHLAG).length;
    out.verteilung = {};
    Object.values(UEBUNG_ART_VORSCHLAG).forEach(v => out.verteilung[v] = (out.verteilung[v] || 0) + 1);

    // b) Der Kreis des Chips
    out.artSchluessel = Object.keys(UEBUNG_ART);

    // g) Die von Hand eingeordnete Übung steht nicht in der Arbeitsmenge
    const offenNamen = artDurchsichtOffen().map(f => f.name);
    out.handschonDrin = offenNamen.includes("Korridor-Funino");
    out.offenVorher = offenNamen.length;

    // Einstiegsknopf da und beschriftet?
    // Seit v631 steht im selben Behälter auch der Betreuungs-Einstieg – gemessen wird nur der Art-Knopf.
    const ein = document.querySelector('#tf-art-einstieg button[onclick^="artDurchsichtOpen"]');
    out.einstieg = ein ? (ein.textContent || "").trim() : "";

    // c) Öffnen schreibt nichts
    artDurchsichtOpen();
    await warte(150);
    out.fenster = !!document.getElementById("ad-inhalt");
    out.artNachOeffnen = _tpArt(tpAllForms().find(f => f.name === "Hai & Fische"));

    const box = document.getElementById("ad-inhalt");
    out.hoehen = [...box.querySelectorAll("button")].map(b => Math.round(b.getBoundingClientRect().height));
    out.gruppen = [...box.children].filter(e => /text-transform:uppercase/.test(e.getAttribute("style") || ""))
      .map(e => e.textContent.trim());

    // d) Ein Tipp ändert nur die Anzeige
    const knopf = [...box.querySelectorAll("button[aria-label]")][0];
    out.vorTipp = knopf.textContent.trim();
    knopf.click(); await warte(120);
    const knopf2 = [...document.querySelectorAll("#ad-inhalt button[aria-label]")]
      .find(b => b.getAttribute("aria-label").startsWith(knopf.getAttribute("aria-label").split(":")[0]));
    out.nachTipp = knopf2 ? knopf2.textContent.trim() : "";
    out.artNachTipp = _tpArt(tpAllForms().find(f => f.name === knopf.getAttribute("aria-label").split(":")[0]));
    return out;
  });

  // a)
  if (String(r.werte) !== "spiel,uebung,weder") probleme.push(`Vorschlag kennt die Werte ${JSON.stringify(r.werte)}`);
  else if (r.ohneVorschlag.length) probleme.push(`${r.ohneVorschlag.length} mitgelieferte Übungen ohne Vorschlag: ${r.ohneVorschlag.slice(0, 3).join(", ")}`);
  else zeilen.push(`Vorschlag: ${r.zahlVorschlag} Übungen · Spielform ${r.verteilung.spiel} · Übungsform ${r.verteilung.uebung} · weder noch ${r.verteilung.weder}`);

  // b)
  if (!r.artSchluessel.includes("weder")) probleme.push("UEBUNG_ART kennt „weder noch“ nicht");

  // g)
  if (r.handschonDrin) probleme.push("Eine von Hand eingeordnete Übung steht trotzdem in der Durchsicht");
  else zeilen.push(`Arbeitsmenge: ${r.offenVorher} offen (die von Hand eingeordnete bleibt außen vor) · Einstieg „${r.einstieg}“`);

  // c) + d)
  if (!r.fenster) probleme.push("artDurchsichtOpen öffnet kein Fenster");
  if (r.artNachOeffnen) probleme.push(`Das Öffnen hat eingeordnet: „${r.artNachOeffnen}“ – der Vorschlag soll nur angezeigt werden`);
  if (r.artNachTipp) probleme.push(`Ein Tipp hat sofort eingeordnet: „${r.artNachTipp}“ – gespeichert wird erst über den Knopf`);
  if (r.vorTipp === r.nachTipp) probleme.push(`Der Tipp ändert die Anzeige nicht (bleibt „${r.vorTipp}“)`);
  else zeilen.push(`Tipp: „${r.vorTipp}“ → „${r.nachTipp}“, Datenbank unberührt`);

  if (String(r.gruppen.map(x => x.split(" ·")[0])) !== "Spielform,Übungsform,Weder noch")
    probleme.push(`Gruppen: ${JSON.stringify(r.gruppen)}`);

  // h)
  const haupt = r.hoehen.filter(x => x >= 56).length;
  const zuKlein = r.hoehen.filter(x => x > 0 && x < 48);
  if (!haupt) probleme.push("Keine Hauptaktion mit 56 px in der Durchsicht");
  if (zuKlein.length) probleme.push(`Knöpfe unter 48 px: ${[...new Set(zuKlein)].join(", ")}`);

  // Bis hierher: kein einziger Schreibzugriff
  const vorSpeichern = s.gesendet.filter(g => /team_config/.test(g.pfad || ""));
  if (vorSpeichern.length) probleme.push(`${vorSpeichern.length} Schreibzugriffe VOR dem Übernehmen`);
  else zeilen.push("Vor dem Übernehmen: kein Schreibzugriff");

  // e) + f) Übernehmen
  const r2 = await s.page.evaluate(async () => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const haupt = [...document.querySelectorAll("#ad-inhalt button")].find(b => /Einordnung übernehmen/.test(b.textContent));
    haupt.click();
    await warte(500);
    renderTraining(); await warte(150);
    return {
      offenNachher: artDurchsichtOffen().length,
      einstieg: ((document.querySelector('#tf-art-einstieg button[onclick^="artDurchsichtOpen"]') || {}).textContent || "").trim(),
      handUnberuehrt: _tpArt(tpAllForms().find(f => f.name === "Korridor-Funino")),
      beispiel: _tpArt(tpAllForms().find(f => f.name === "Hai & Fische")),
      fensterZu: !document.getElementById("ad-modal")
    };
  });

  const patches = s.gesendet.filter(g => /team_config/.test(g.pfad || ""));
  if (patches.length !== 1) probleme.push(`${patches.length} Schreibzugriffe statt genau einem`);
  else {
    const body = patches[0].body || {};
    const art = body.uebung_art || {};
    const zahl = Object.keys(art).length;
    if (zahl < 100) probleme.push(`Der PATCH trägt nur ${zahl} Einordnungen`);
    else if (art["Korridor-Funino"] !== "uebung") probleme.push(`Die Handeinordnung wurde überschrieben: „${art["Korridor-Funino"]}“`);
    else zeilen.push(`Übernehmen: ein PATCH mit ${zahl} Einordnungen, die Handeinordnung unverändert`);
  }

  if (r2.offenNachher) probleme.push(`Nach dem Übernehmen sind noch ${r2.offenNachher} offen`);
  else if (r2.einstieg) probleme.push(`Der Einstiegsknopf steht noch da: „${r2.einstieg}“`);
  else if (!r2.fensterZu) probleme.push("Das Fenster bleibt nach dem Übernehmen offen");
  else zeilen.push(`Danach: nichts mehr offen, Einstieg verschwunden · „Hai & Fische“ = ${r2.beispiel}`);

  if (r2.handUnberuehrt !== "uebung") probleme.push(`Die Handeinordnung ist jetzt „${r2.handUnberuehrt}“ statt „uebung“`);

  const f = s.fehler();
  if (f.length) probleme.push("Konsole: " + f[0]);
  await s.schliessen();

  return h.ergebnis("Übungen einordnen: Vorschlag zum Durchsehen, drei Werte", !probleme.length, zeilen.concat(probleme));
};
