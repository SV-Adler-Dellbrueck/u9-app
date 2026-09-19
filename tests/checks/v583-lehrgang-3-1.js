/* v583 – Lehrgangsabgabe 3.1: „Raute mit Torwart – Angriff über den anderen Flügel".

   Auftragspaket `doku/auftrag-lehrgang-3-1/`. Abgabe 3.1 im DFB-Basis-Coach verlangt eine
   Trainingsform von (TW +) 1 gegen 1 bis (TW +) 3 gegen 3 mit Grafik, und die Grafik soll
   wie bei 2.1 und 2.2 in der App entstehen. Die Übung ist deshalb kein Sonderfall, sondern
   ein gewöhnlicher Eintrag der Bibliothek — sie muss sich auch so verhalten.

   Fälle:
   a) Der Abgleich legt die Übung an und lässt die 27 bestehenden unberührt; ein zweiter
      Lauf tut nichts mehr.
   b) Beide Bilder rendern — hochkant, mit allem, was die Beschreibung nennt.
   c) Kein Spielerkreis näher als 24 Punkte an einem anderen, und kein Nummernkreis liegt
      auf einem Spieler, einem Gerät oder dem Ball. Die Nummer sitzt sieben Punkte vor dem
      Pfeilanfang; wer das übersieht, versteckt sie hinter einem Spielerkreis (das ist im
      ersten Entwurf dieses Pakets viermal passiert).
   d) Die Materialliste nennt genau, was der Aufbau braucht: 2 Jugendtore, 10 Teller,
      2 Dummys, 1 Ball — und NICHT den Trainer. Er steht auf dem Platz, aber nicht im
      Schrank.
   e) Die Übungsart ist als Spielform vorgeschlagen (Charles' Entscheidung 19.09.2026).
      Der Schlüssel heißt im Code `spiel`; ein Eintrag `spielform` fiele still durch.
   f) Kein Kindername in der Übung — das Repo ist öffentlich. */
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const NAME = "Raute mit Torwart – Angriff über den anderen Flügel";
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const roh = fs.readFileSync(path.join(h.REPO, "doku/auftrag-lehrgang-3-1/nachtrag.json"), "utf8");

  let angelegt = [], stand = null;
  const s = await h.starten({
    breite: 900, hoehe: 1000, warten: 400,
    bibliothek: true,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(),
      trainingsformen: (u, req) => {
        if (req.method() === "POST") { try { angelegt.push(JSON.parse(req.postData() || "null")); } catch (e) { } return { status: 201, body: "[]" }; }
        return [];
      },
      team_config: (u, req) => {
        if (req.method() !== "GET") { try { stand = JSON.parse(req.postData() || "null"); } catch (e) { } return { status: 201, body: "[]" }; }
        return [];
      }
    })
  });

  const r = await s.page.evaluate(async ({ roh, NAME }) => {
    const out = { fehlt: [] };
    for (const n of ["_euPruefung", "_eiSkizzeFehler", "skzMaterial", "_skz", "bibliothekAbgleich"])
      if (typeof window[n] !== "function") out.fehlt.push(n);
    if (out.fehlt.length) return out;
    const spec = JSON.parse(roh).uebungen[0].skizze;

    // a) Prüfungen der App über den Nachtrag
    out.euPruefung = _euPruefung(roh).fehler;
    out.skizzePruefung = _eiSkizzeFehler(spec);

    // b) beide Bilder
    const bilder = [];
    for (let n = 0; n < skzBildZahl(spec); n++) {
      const d = document.createElement("div"); d.innerHTML = _skz(spec, n ? { bild: n } : undefined);
      const svg = d.querySelector("svg");
      bilder.push({
        viewBox: svg.getAttribute("viewBox"),
        spieler: d.querySelectorAll('circle[r="8"]').length,
        pfeile: d.querySelectorAll("line[marker-end]").length + d.querySelectorAll("path[marker-end]").length,
        text: (d.querySelector("text[font-size='9']") || {}).textContent || ""
      });
    }
    out.bilder = bilder;

    // c) Abstände und Nummernkreise
    const eng = [], kollisionen = [];
    (spec.s || []).forEach((a, i) => (spec.s || []).forEach((b, j) => {
      if (j > i && Math.hypot(a[0] - b[0], a[1] - b[1]) < 24) eng.push(a[3] + "↔" + b[3]);
    }));
    for (let n = 0; n < skzBildZahl(spec); n++) {
      const b = _skzBild(spec, n);
      (b.p || []).forEach(p => {
        const nr = Number(p[5]); if (!isFinite(nr) || nr < 1) return;
        const dx = p[2] - p[0], dy = p[3] - p[1], len = Math.hypot(dx, dy) || 1;
        const kx = p[0] - dx / len * 7, ky = p[1] - dy / len * 7;
        (b.s || []).forEach(sp => { if (Math.hypot(kx - sp[0], ky - sp[1]) < 13.5) kollisionen.push(`Bild ${n + 1}: Nummer ${nr} auf Spieler ${sp[3]}`); });
        (b.ger || []).forEach(g => { if (Math.hypot(kx - g[0], ky - g[1]) < 11) kollisionen.push(`Bild ${n + 1}: Nummer ${nr} auf ${g[2]}`); });
        (b.b || []).forEach(ba => { if (Math.hypot(kx - ba[0], ky - ba[1]) < 9.5) kollisionen.push(`Bild ${n + 1}: Nummer ${nr} auf dem Ball`); });
      });
    }
    out.eng = eng; out.kollisionen = kollisionen;

    // d) Material
    out.material = skzMaterial(spec).map(x => `${x.anzahl} ${x.was}`);
    out.materialSchluessel = skzMaterial(spec).map(x => x.schluessel);

    // e) Übungsart
    out.artVorschlag = (typeof UEBUNG_ART_VORSCHLAG !== "undefined") ? UEBUNG_ART_VORSCHLAG[NAME] : "";
    out.artAufgeloest = (typeof _tpArtVorschlag === "function") ? _tpArtVorschlag({ name: NAME }) : "";
    out.artLabel = (typeof UEBUNG_ART !== "undefined" && UEBUNG_ART[out.artVorschlag]) ? UEBUNG_ART[out.artVorschlag].kurz : "";

    // a) Abgleich gegen eine leere Datenbank
    /* Der Abgleich braucht eine Sitzung (ohne Token sagt er still nein) und einen Stand,
       den er noch nicht kennt. Beides wird hier hergestellt, sonst prüfte der Fall nichts. */
    try { localStorage.removeItem(BIB_STAND_KEY); } catch (e) { }
    out.abgleich = await bibliothekAbgleich();
    out.zweiter = await bibliothekAbgleich();
    return out;
  }, { roh, NAME });

  const fehler = s.fehler();
  await s.schliessen();
  if (r.fehlt.length) return h.ergebnis("Lehrgang 3.1: Raute mit Torwart", false, [r.fehlt.join(", ") + " fehlt"]);

  const u = bib.uebungen.find(x => x.name === NAME);
  // a)
  if (!u) probleme.push("Die Übung steht nicht in der Bibliothek");
  if (bib.uebungen.length !== 28) probleme.push(`${bib.uebungen.length} Übungen in der Bibliothek statt 28`);
  if (bib.stand === "2026-09-16-1") probleme.push("Der Stand wurde nicht hochgesetzt – ohne neuen Stand holt der Abgleich die Datei nicht");
  if (r.euPruefung.length) probleme.push("_euPruefung: " + r.euPruefung.join(" · "));
  if (r.skizzePruefung.length) probleme.push("_eiSkizzeFehler: " + r.skizzePruefung.join(" · "));
  if (r.abgleich && r.abgleich.angelegt !== 28) probleme.push(`Der Abgleich hat ${r.abgleich && r.abgleich.angelegt} von 28 Übungen angelegt`);
  if (r.zweiter !== null && r.zweiter !== undefined) probleme.push("Der zweite Lauf hat trotz gleichem Stand gearbeitet");
  // b)
  const b = r.bilder || [];
  if (b.length !== 2) probleme.push(`${b.length} Bilder statt zwei`);
  else {
    b.forEach((x, i) => {
      if (x.viewBox !== "0 0 180 280") probleme.push(`Bild ${i + 1} steht auf „${x.viewBox}“ statt hochkant`);
      if (x.spieler !== 4) probleme.push(`Bild ${i + 1} zeigt ${x.spieler} Spieler statt vier`);
      if (!x.text) probleme.push(`Bild ${i + 1} trägt keine Beschriftung`);
    });
    if (b[0].pfeile !== 4) probleme.push(`Bild 1 zeigt ${b[0].pfeile} Wege statt vier`);
    if (b[1].pfeile !== 7) probleme.push(`Bild 2 zeigt ${b[1].pfeile} Wege statt sieben`);
    if (b[0].text === b[1].text) probleme.push("Beide Bilder tragen dieselbe Beschriftung");
  }
  // c)
  if (r.eng.length) probleme.push(`Spieler zu eng beieinander: ${r.eng.join(", ")}`);
  if (r.kollisionen.length) probleme.push(`Nummernkreise verdeckt: ${r.kollisionen.join(" · ")}`);
  // d)
  const sollMaterial = ["2 Jugendtore", "10 Markierungsteller", "2 Freistoß-Dummys", "1 Ball"];
  sollMaterial.forEach(m => { if (!r.material.includes(m)) probleme.push(`In der Materialliste fehlt „${m}“ – gezählt: ${r.material.join(", ")}`); });
  if (r.materialSchluessel.includes("trainer")) probleme.push("Der Trainer steht in der Materialliste – er kommt nicht aus dem Schrank");
  if (r.material.length !== 4) probleme.push(`Die Materialliste nennt ${r.material.length} Posten statt vier: ${r.material.join(", ")}`);
  // e)
  if (r.artVorschlag !== "spiel") probleme.push(`Übungsart „${r.artVorschlag}“ statt „spiel“ – „spielform“ kennt UEBUNG_ART nicht und fiele still durch`);
  if (r.artAufgeloest !== "spiel") probleme.push(`_tpArtVorschlag löst die Übung als „${r.artAufgeloest}“ auf`);
  if (r.artLabel !== "Spielform") probleme.push(`Angezeigt würde „${r.artLabel}“ statt Spielform`);
  // f)
  if (u) {
    const text = JSON.stringify(u);
    const treffer = h.KINDER.filter(n => text.includes(n));
    if (treffer.length) probleme.push(`Kindername in der Übung: ${treffer.join(", ")}`);
  }
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);

  if (!probleme.length) {
    zeilen.push(`Bibliothek: 28 Übungen, Stand ${bib.stand} · Abgleich legt 28 an, der zweite Lauf tut nichts`);
    zeilen.push(`Beide Bilder hochkant (${b[0].viewBox}), vier Spieler, ${b[0].pfeile} und ${b[1].pfeile} Wege, je eigene Beschriftung`);
    zeilen.push(`Kein Spielerabstand unter 24, kein Nummernkreis auf Spieler, Gerät oder Ball`);
    zeilen.push(`Material: ${r.material.join(" · ")} – der Trainer nicht mitgezählt`);
    zeilen.push(`Übungsart „${r.artVorschlag}“ → „${r.artLabel}“ · keine Kindernamen`);
  }
  return h.ergebnis("Lehrgang 3.1: Raute mit Torwart", !probleme.length, zeilen.concat(probleme));
};
