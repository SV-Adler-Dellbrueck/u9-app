/* v734 · Spielerkarten mit Zahlen (PO 04.10.: „Alle Karten mit Zahlen“ – hebt die v636-Regel auf)
   Zählung und Rechte prüft tests/sql/v734-karten-zahlen.sql gegen ein echtes Postgres; hier geht es um die Karte.
   a) Team-Galerie (Kabine, Eltern): Trainings und Spiele aus team_gallery_kind stehen auf jeder Karte –
      auch auf fremden; fehlt eine Zahl (Datenbank vor v734), steht „–“ (null) statt einer falschen 0
   b) Trainer-Karte: adlerCardStats nimmt Spiele und Trainings aus kind_spiele_saison / kind_trainings_saison
      und zählt nicht mehr selbst über alle Anwesenheitszeilen (sonst zählen Spieltage und Vorsaison mit) */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];

  // a) Kabine
  {
    const s = await h.starten({ start: "/kinder/index.html", warten: 400, angemeldet: false,
      supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), team_config: [{ id: 1 }], termine: [], rpc: { team_gallery_kind: [] } }) });
    const r = await s.page.evaluate(async () => {
      for (let i = 0; i < 50 && typeof galleryCardData !== "function"; i++) await new Promise(x => setTimeout(x, 100));
      if (typeof galleryCardData !== "function") return { fehlt: true };
      const fremd = galleryCardData({ name: "Kind B", nr: 2, tw: false, staerken: null, trainings: 6, spiele: 3 });
      const alt = galleryCardData({ name: "Kind C", nr: 3, tw: false, staerken: null });
      const null0 = galleryCardData({ name: "Kind D", nr: 4, tw: false, staerken: null, trainings: 0, spiele: 0 });
      return { fremd: fremd.counts, alt: alt.counts, null0: null0.counts };
    });
    if (r.fehlt) probleme.push("a) galleryCardData fehlt in der Kabine");
    else {
      zeilen.push(`a) fremde Karte: ${r.fremd.trainings} Trainings · ${r.fremd.spiele} Spiele · ohne Zahl: ${r.alt.trainings}/${r.alt.spiele}`);
      if (r.fremd.trainings !== 6) probleme.push("a) fremde Karte zeigt " + r.fremd.trainings + " statt 6 Trainings");
      if (r.fremd.spiele !== 3) probleme.push("a) fremde Karte zeigt " + r.fremd.spiele + " statt 3 Spiele");
      if (r.alt.trainings !== null || r.alt.spiele !== null) probleme.push("a) ohne Zahl aus der Datenbank steht " + r.alt.trainings + "/" + r.alt.spiele + " statt „–“");
      if (r.null0.trainings !== 0 || r.null0.spiele !== 0) probleme.push("a) eine echte 0 geht verloren");
    }
    await s.schliessen();
  }

  // b) Trainer
  {
    const rufe = [];
    const s = await h.starten({ start: "/trainer/index.html", warten: 1500,
      supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), match_actions: [], quiz_progress: [],
        anwesenheit: [{ datum: "2026-06-01", data: { "Kind A": { da: true } } }, { datum: "2026-09-01", data: { "Kind A": { da: true } } }],
        nominierungen: [],
        rpc: { kind_spiele_saison: (u, req) => { rufe.push("spiele " + (req.postData() || "")); return 5; },
               kind_trainings_saison: (u, req) => { rufe.push("trainings " + (req.postData() || "")); return 8; } } }) });
    const r = await s.page.evaluate(async () => {
      for (let i = 0; i < 50 && typeof adlerCardStats !== "function"; i++) await new Promise(x => setTimeout(x, 100));
      if (typeof adlerCardStats !== "function") return { fehlt: true };
      return await adlerCardStats("Kind A");
    }).catch(e => ({ fehler: String(e) }));
    if (r.fehlt || r.fehler) probleme.push("b) adlerCardStats nicht aufrufbar: " + (r.fehler || "fehlt"));
    else {
      zeilen.push(`b) Trainer-Karte: ${r.trainings} Trainings · ${r.spiele} Spiele · Aufrufe: ${rufe.length}`);
      if (r.spiele !== 5) probleme.push("b) Spiele " + r.spiele + " statt 5 aus kind_spiele_saison");
      if (r.trainings !== 8) probleme.push("b) Trainings " + r.trainings + " statt 8 aus kind_trainings_saison (selbst gezählt?)");
      if (!rufe.some(x => /p_name.*Kind A/.test(x))) probleme.push("b) die Zählfunktionen bekommen den Namen nicht");
    }
    await s.schliessen();
  }
  return h.ergebnis("v734 Spielerkarten: Trainings und Spiele der Saison auf jeder Karte", !probleme.length, zeilen.concat(probleme));
};
