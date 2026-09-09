/* v502 – PO: „Die Funktion, den Kader des Teams in der Kachel vor dem Spiel über ‚Einteilung
   ändern' zu ändern, ist überflüssig, weil das unter Teams festlegen schon gemacht wird. Die
   Wahl des Kapitäns legen wir zukünftig auch darüber mit fest, und der bleibt für den ganzen
   Spieltag Kapitän. Die Live-Aktionen und der Ticker sollten eingeklappt sein. Spielbericht und
   Ergebnis-Karte gehören in Nach dem Spiel, das Blitz-Rating ganz am Ende."
   Geprueft: kein Kader-Editor mehr in der Kachel; Kapitän je Team in der Team-Karte, gespeichert
   je Team-Schluessel, Sterne fuer „noch nie"; ① zeigt Kapitän und Aufstellung mit Torwart und
   Fair-Knopf; ② hat Live-Aktionen und Ticker in einem zugeklappten Block; ③ endet mit dem
   Blitz-Rating, davor Ergebnisse und Bericht; die Bericht-Knoepfe haengen nicht mehr am Ticker. */
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const heute = h.heute();
  const termine = [{ id: 1, datum: heute, typ: "spiel", gegner: "Testgegner", uhrzeit: "10:15", trainer_status: {} }];
  const kap = [];
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, nominierungen: [], matchday: [], ticker_events: [],
    match_actions: (u, req) => { if (req.method() === "POST") { kap.push(JSON.parse(req.postData() || "{}")); return { status: 201, body: "[]" }; } if (req.method() === "DELETE") return { status: 204, body: "" }; return []; } }), hoehe: 1800 });
  await h.sichtbarMachen(s.page, "#train-sub-spieltag");
  const r = await s.page.evaluate(async ({ K, heute }) => {
    await loadKader();
    if (typeof kapitaenWahlHtml !== "function") return { fehlt: "kapitaenWahlHtml" };
    if (typeof aufRender !== "function") return { fehlt: "aufRender" };
    const warte = ms => new Promise(r => setTimeout(r, ms));
    let sd = document.getElementById("spieltag-date"); if (!sd) { sd = document.createElement("select"); sd.id = "spieltag-date"; document.body.appendChild(sd); }
    sd.innerHTML = `<option value="${heute}" selected>${heute}</option>`; sd.value = heute;
    // Aufbau der Kachel
    const nom = document.getElementById("mt-phase-nom"), live = document.getElementById("mt-phase-live"), nach = document.getElementById("mt-phase-nach");
    const bau = {
      kaderPanel: !!document.getElementById("team-kader-panel"),
      vor: nom ? [...nom.querySelectorAll("[id$='-panel']")].map(x => x.id) : [],
      mehr: (() => { const d = document.getElementById("mt-live-mehr"); return d ? { zu: !d.open, drin: [...d.querySelectorAll("[id$='-panel']")].map(x => x.id), inLive: !!(live && live.contains(d)) } : null; })(),
      nach: nach ? [...nach.querySelectorAll("[id$='-panel']")].map(x => x.id) : []
    };
    // Kapitän: Auswahl und Speichern je Team
    Object.keys(nomStatus).forEach(k => delete nomStatus[k]);
    K.forEach((n, i) => { nomStatus[n] = i < 8 ? "dabei" : "nicht"; });
    TEAM_ANZAHL = 2; TEAMS = {}; TEAM_FORM = {}; TEAM_FELDER = []; TEAM_LEIH = {}; TEAM_KARTE_OFFEN = 0; TEAM_PLAN = null;
    K.slice(0, 8).forEach((n, i) => { TEAMS[n] = i < 4 ? 1 : 2; });
    KAP_COUNT = { [K[4]]: 2 }; KAP_HEUTE = {}; matchKapitaen = null;
    const html = kapitaenWahlHtml(2, K.slice(4, 8));
    const d = document.createElement("div"); d.innerHTML = html;
    const optionen = [...d.querySelectorAll("option")].filter(o => o.value).map(o => o.textContent.trim());
    spieltagTeam = 2;
    await kapitaenSet(K[5], 2); await warte(150);
    const karte = document.querySelector('.team-karte[data-team="2"]');
    const karteKap = karte ? !!karte.querySelector("select[aria-label='Kapitän Adler 2']") : null;
    const karteWert = karte ? (karte.querySelector("select[aria-label='Kapitän Adler 2']") || {}).value : null;
    const zeile = kapitaenRow();
    // ① Aufstellung und ② Wechseltimer
    tbFormation = "4+1"; rotSeedFromSquad(K.slice(4, 8)); rotRenderControls(); aufRender(); rotRenderLive();
    const auf = document.getElementById("auf-panel"), rot = document.getElementById("rot-panel");
    const aufText = auf ? auf.textContent : "", rotText = rot ? rot.textContent : "";
    // ③ Bericht und Ticker-Knöpfe
    mcTickerOpen = true; tickerRenderControls(); await warte(50);
    const tickerBtns = [...document.getElementById("ticker-panel").querySelectorAll("button")].map(b => b.textContent.trim());
    berichtPanelRender();
    const berichtBtns = [...document.getElementById("bericht-panel").querySelectorAll("button")].map(b => b.textContent.trim());
    TEAM_PLAN = { runde: 1, letzte: 3, status: "", von: {}, spiele: { 2: [{ runde: 1, gegner: "Gast 1", feldName: "Käfig", tore: 2, gegentore: 1 }, { runde: 2, gegner: "Gast 2", feldName: "Funino 1", tore: null, gegentore: null }] } };
    ergPanelRender();
    const ergText = document.getElementById("erg-panel").textContent.replace(/\s+/g, " ");
    return { bau, optionen, karteKap, karteWert, zeile, heute2: KAP_HEUTE[2], aufText, rotText, tickerBtns, berichtBtns, ergText };
  }, { K, heute });
  const fehler = s.fehler(); await s.schliessen();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt`); return h.ergebnis("Kachel in drei Schritten", false, probleme); }
  if (r.bau.kaderPanel) probleme.push("Der Kader-Block mit „Einteilung ändern“ steht noch in der Kachel");
  if (r.bau.vor.join(",") !== "rollen-panel,auf-panel") probleme.push(`① enthält ${r.bau.vor.join(", ")} – erwartet Kapitän und Aufstellung`);
  if (!r.bau.mehr) probleme.push("② hat keinen zugeklappten Block für Live-Aktionen und Ticker");
  else { if (!r.bau.mehr.zu) probleme.push("Live-Aktionen und Ticker stehen offen"); if (r.bau.mehr.drin.join(",") !== "action-panel,ticker-panel") probleme.push(`Im Klappblock: ${r.bau.mehr.drin.join(", ")}`); if (!r.bau.mehr.inLive) probleme.push("Der Klappblock liegt nicht in ②"); }
  if (r.bau.nach.join(",") !== "erg-panel,bericht-panel,blitz-panel") probleme.push(`③ ist ${r.bau.nach.join(", ")} – das Blitz-Rating gehört ans Ende`);
  if (!r.optionen[0] || !/noch nie ⭐/.test(r.optionen[0]) || new RegExp(K[4]).test(r.optionen[0])) probleme.push(`Die Auswahl beginnt mit „${r.optionen[0]}“ – erwartet ein Kind, das noch nie dran war`);
  if (!/2×/.test(r.optionen[r.optionen.length - 1])) probleme.push(`Der zweimalige Kapitän steht nicht am Ende: ${r.optionen.join(" | ")}`);
  const post = kap.find(x => x.aktion === "kapitaen");
  if (!post) probleme.push("Der Kapitän wurde nicht in match_actions geschrieben");
  else if (post.datum !== `${heute}__t2` || post.spieler !== K[5]) probleme.push(`Gespeichert als ${post.datum} / ${post.spieler} – erwartet ${heute}__t2 / ${K[5]}`);
  if (r.heute2 !== K[5]) probleme.push(`KAP_HEUTE[2] = ${r.heute2}`);
  if (r.karteKap === null) probleme.push("Prüfaufbau: keine Team-Karte für Adler 2");
  else { if (!r.karteKap) probleme.push("Die Team-Karte unter „Teams festlegen“ hat keine Kapitänswahl"); if (r.karteWert !== K[5]) probleme.push(`Die Auswahl zeigt „${r.karteWert}“ statt ${K[5]}`); }
  if (!new RegExp("Kapitän: " + K[5]).test(r.zeile)) probleme.push("Die Kachel zeigt den gewählten Kapitän nicht an");
  if (!/Torwart \(Fest\)/.test(r.aufText) || !/fair besetzen/.test(r.aufText) || !/Feld \(/.test(r.aufText)) probleme.push("① Aufstellung ohne Torwart, Fair-Knopf oder Feld");
  if (/fair besetzen/.test(r.rotText) || /Torwart \(Fest\)/.test(r.rotText)) probleme.push("② Wechseltimer trägt noch Fair-Knopf oder Torwart-Zeile");
  if (!/Feld \(/.test(r.rotText) || !/Bank \(/.test(r.rotText)) probleme.push("② Wechseltimer ohne Feld und Bank");
  if (r.tickerBtns.some(b => /Spielbericht|Ergebnis-Karte/.test(b))) probleme.push("Spielbericht und Ergebnis-Karte hängen noch am Ticker");
  if (!r.berichtBtns.some(b => /Spielbericht/.test(b)) || !r.berichtBtns.some(b => /Ergebnis-Karte/.test(b))) probleme.push(`③ Bericht-Block: ${r.berichtBtns.join(" | ")}`);
  if (!/Runde 1.*Gast 1.*2:1/.test(r.ergText) || !/Runde 2.*Gast 2.*–:–/.test(r.ergText)) probleme.push(`③ Ergebnisse: „${r.ergText.slice(0, 120)}“`);
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Kachel: ① ${r.bau.vor.join("+")} · ② Klappblock zu ${r.bau.mehr && r.bau.mehr.zu} (${(r.bau.mehr || {}).drin}) · ③ ${r.bau.nach.join("+")}`);
  zeilen.push(`Kapitän: Auswahl beginnt „${r.optionen[0]}“, gespeichert ${post ? post.datum : "–"}, Karte zeigt ${r.karteWert}, Kachel „${r.zeile.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 40)}“`);
  zeilen.push(`Ticker-Knöpfe: ${r.tickerBtns.join(" | ")} · Bericht-Block: ${r.berichtBtns.join(" | ")}`);
  return h.ergebnis("Die Team-Kachel in drei Schritten, Kapitän unter „Teams festlegen“", !probleme.length, zeilen.concat(probleme));
};
