/* v553 – Ein Bereich, ein Bild: die Kachel-Ebene ist eine Seite.

   Befund vom 14.09. (PO, mit Bildschirmfoto): „Finde ich nicht.“ Gesucht war die Kachel
   „Ausstattung“. Sie stand im Kachel-FENSTER des Bereichs Team, das nur der Weg über die
   Startseite öffnete. Die untere Leiste dagegen sprang unmittelbar in eine Detailseite –
   derselbe Name „Team“, zwei verschiedene Bilder, und die neue Kachel nur auf einem davon.

   Dazu kam, dass die Leiste sich merkte, wo man zuletzt war: derselbe Knopf führte je nach
   Vorgeschichte woanders hin. Ein Navigationsziel, das sich merkt, wo man war, ist keins.

   Fälle:
   a) Jeder Bereich startet auf seiner Kachel-Ebene – auch beim zweiten Tipp, nachdem man
      zwischendurch in einem Detail war. Genau das war die Beschwerde.
   b) Die Ebene zeigt dieselben Kacheln wie der Weg über die Startseite; „Ausstattung“ ist
      unter Team erreichbar, „Material“ unter Orga.
   c) Ein Tipp auf eine Kachel führt ins Detail, die Reiterzeile markiert es.
   d) Es gibt kein Kachel-Fenster mehr – nichts, was über einer fremden Seite hängen bleibt.
   e) „Eltern & Kinder“ ist kein Sonderfall mehr: der Knopf navigiert wie die anderen sechs,
      und die Leiste markiert ihn als aktiv. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];

  const s = await h.starten({
    hoehe: 1600,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [], nominierungen: [] })
  });
  await s.page.evaluate(async () => {
    await loadKader(); window.trainerMe = async () => "Charles";
    document.getElementById("pin-gate")?.remove();
    const a = document.getElementById("main-app"); if (a) a.style.display = "block";
  });

  const r = await s.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const sichtbar = () => [...document.querySelectorAll(".view.active")].map(v => v.id);
    const kacheln = () => [...document.querySelectorAll(".view.active button")]
      .map(b => b.textContent.replace(/\s+/g, " ").trim()).filter(Boolean);
    const aktiverKnopf = () => (document.querySelector("#main-nav .nb.active") || {}).id || "";
    const out = { bereiche: {} };

    for (const key of ["team", "training", "spieltag", "taktik", "elki", "orga"]) {
      openTab(key); await warte(120);
      out.bereiche[key] = { sicht: sichtbar(), knopf: aktiverKnopf(), kacheln: kacheln() };
    }

    // a) Nach einem Ausflug ins Detail führt derselbe Knopf wieder auf die Kachel-Ebene
    openTab("team"); await warte(120);
    go("kader"); await warte(120);
    out.imDetail = sichtbar();
    openTab("team"); await warte(120);
    out.zurueck = sichtbar();

    // c) Ein Tipp auf eine Kachel führt ins Detail – über denselben Weg wie die Kachel selbst
    kachelRun("go", "bew"); await warte(150);
    out.nachKachel = sichtbar();
    out.subbarAktiv = ([...document.querySelectorAll("#tab-subbar .sub-tab.active")]
      .map(b => b.textContent.replace(/\s+/g, " ").trim())[0]) || "";

    // d) Kein Fenster mehr
    kachelOpen("orga"); await warte(150);
    out.fensterDa = !!document.getElementById("kachel-modal");
    out.nachKachelOpen = sichtbar();
    return out;
  });

  // b) Jeder Bereich landet auf seiner eigenen Hülle und markiert seinen Knopf
  Object.keys(r.bereiche).forEach(key => {
    const b = r.bereiche[key];
    if (String(b.sicht) !== "view-ue-" + key)
      probleme.push(`„${key}“ öffnet ${JSON.stringify(b.sicht)} statt der Kachel-Ebene view-ue-${key}`);
    if (b.knopf !== "nb-" + key)
      probleme.push(`„${key}“: die Leiste markiert ${b.knopf || "nichts"} statt nb-${key}`);
    if (!b.kacheln.length) probleme.push(`„${key}“: die Kachel-Ebene ist leer`);
  });

  const hat = (key, label) => (r.bereiche[key].kacheln || []).some(t => t.includes(label));
  if (!hat("team", "Ausstattung")) probleme.push("„Ausstattung“ fehlt auf der Kachel-Ebene von Team – genau das war nicht zu finden");
  if (!hat("orga", "Material")) probleme.push("„Material“ fehlt auf der Kachel-Ebene von Orga");
  if (!hat("team", "Kader")) probleme.push("„Kader“ fehlt auf der Kachel-Ebene von Team");

  // a)
  if (String(r.imDetail) !== "view-kader") probleme.push(`Der Sprung ins Detail landet auf ${JSON.stringify(r.imDetail)}`);
  else if (String(r.zurueck) !== "view-ue-team")
    probleme.push(`Zweiter Tipp auf „Team“ führt nach ${JSON.stringify(r.zurueck)} statt zurück auf die Kachel-Ebene – die Leiste merkt sich wieder, wo man war`);
  else zeilen.push("Zweiter Tipp: wieder die Kachel-Ebene, nicht die zuletzt besuchte Detailseite");

  // c)
  if (String(r.nachKachel) !== "view-bew") probleme.push(`Der Tipp auf eine Kachel landet auf ${JSON.stringify(r.nachKachel)} statt im Detail`);
  else if (!/Bewerten/.test(r.subbarAktiv)) probleme.push(`Die Reiterzeile markiert „${r.subbarAktiv}“ statt Bewerten`);
  else zeilen.push("Kachel → Detail, und die Reiterzeile zeigt, wo man steht");

  // d)
  if (r.fensterDa) probleme.push("Es liegt wieder ein Kachel-Fenster über der Seite");
  else if (String(r.nachKachelOpen) !== "view-ue-orga") probleme.push(`kachelOpen führt nach ${JSON.stringify(r.nachKachelOpen)}`);
  else zeilen.push("kachelOpen navigiert, statt ein Fenster aufzulegen");

  if (!probleme.length)
    zeilen.unshift("Alle sechs Bereiche starten auf ihrer Kachel-Ebene und markieren ihren Knopf – „Eltern & Kinder“ eingeschlossen");

  const f = s.fehler();
  if (f.length) probleme.push("Konsole: " + f[0]);
  await s.schliessen();

  return h.ergebnis("Navigation: jeder Bereich beginnt bei seinen Kacheln", !probleme.length, zeilen.concat(probleme));
};
