/* v593 · Die Kabine im Kind-Modus
   Gemessen an der ECHTEN kinder/index.html mit einer gekoppelten Attrappen-Sitzung:
   - die Appzeit zaehlt der Server: kind_tick() bestimmt die Restzeit, nicht localStorage
   - bei null Minuten der Schluss-Bildschirm, ohne Bedienelement, und die Kabine ist weg
   - ein Neustart hilft nicht: kind_status() mit rest_min 0 fuehrt direkt dorthin
   - die Team-Galerie kommt aus team_gallery_kind und zeichnet aus `staerken`,
     nicht aus Bewertungswerten
   - der Countdown fragt kind_abgesagt, nicht rueckmeldungen
   - die eigene Karte kommt aus my_child_card_kind, nicht aus my_child_card
   - das Quiz kennt genau EIN Kind (sonst spielte ein Kind unter fremdem Namen)
   Die Tabellenliste wird gegen `abgefragt` geprueft, nicht gegen `gesendet`: Lesezugriffe
   sind GETs und standen in `gesendet` nie drin. */
"use strict";

const VERBOTEN = ["rueckmeldungen", "eltern_kinder", "spielerprofile", "blitz_ratings", "nominierungen", "kind_notfall"];
const VERBOTENE_RPC = ["team_gallery", "my_child_card"];

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const KIND = n => ({ ok: true, spieler_id: 1, name: "Kind A", nr: 1, tw: false, geraet: "Tablet", limit_min: 60, rest_min: n });
  const GALERIE = [
    { spieler_id: 1, name: "Kind A", nr: 1, tw: false, spitzname: null, lieblingsverein: null,
      staerken: ["f_pass", "f_abschluss", "f_tempo"], foto_path: null, trainings: 4 },
    { spieler_id: 2, name: "Kind B", nr: 2, tw: false, spitzname: null, lieblingsverein: null,
      staerken: [], foto_path: null, trainings: 1 }
  ];

  function attrappe(extra) {
    const rest = Object.assign({}, extra || {}); delete rest.rpc;   // rpc wird gemischt, nicht ersetzt
    return h.supabaseAttrappe(Object.assign({
      kader: h.kaderZeilen(), team_config: [{ id: 1 }],
      termine: [{ id: 7, datum: h.tagePlus(3), typ: "spiel", gegner: "SV Testheim", titel: null }],
      auth: { signup: { access_token: "kind.eyJzdWIiOiJraW5kLXVpZCJ9.x", refresh_token: "r", expires_in: 3600 } },
      rpc: Object.assign({
        kader_namen: [], team_gallery_kind: GALERIE, team_federn_total: 0, team_meilensteine: [],
        meine_rollen: { games: 0 }, meine_ziele: [], kind_abgesagt: [], wq_done: []
      }, (extra || {}).rpc || {})
    }, rest));
  }
  // Gekoppeltes Geraet: Ausweis ins Kind-Fach, dann die Route fahren.
  async function gekoppelt(extra) {
    const s = await h.starten({ start: "/kinder/index.html", warten: 400, angemeldet: false, supabase: attrappe(extra) });
    await s.page.evaluate(() => localStorage.setItem("adler_sb_auth_kind",
      JSON.stringify({ access_token: "kind.x.y", refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })));
    await s.page.reload({ waitUntil: "networkidle" });
    await s.page.waitForTimeout(1500);
    return s;
  }

  // ── a) offene Kabine: Server-Uhr, richtige Quellen ───────────────────────────
  {
    const s = await gekoppelt({ rpc: { kind_status: KIND(42) } });
    const r = await s.page.evaluate(() => ({
      kabine: !!document.getElementById("kabine"),
      schluss: !!document.getElementById("kg-schluss"),
      kindModus: typeof kabineKindModus === "function" ? kabineKindModus() : null,
      rest: typeof kabineZeitRestMin === "function" ? kabineZeitRestMin() : null,
      // Der Startzeitpunkt der Eltern-Kabine darf auf dem Kindergeraet gar nicht entstehen
      startKey: localStorage.getItem("adler_kabine_start")
    }));
    const rpcRufe = p => s.abgefragt.filter(x => x.pfad.endsWith("/rpc/" + p)).length;
    const tabellen = VERBOTEN.filter(t => s.abgefragt.some(x => x.pfad.endsWith("/" + t)));
    const rpcs = VERBOTENE_RPC.filter(p => rpcRufe(p) > 0);
    zeilen.push(`a) Kabine offen · Restzeit ${r.rest} Min aus kind_status · team_gallery_kind ${rpcRufe("team_gallery_kind")}× · kind_abgesagt ${rpcRufe("kind_abgesagt")}×`);
    if (!r.kabine) probleme.push("a) die Kabine öffnet nicht");
    if (r.schluss) probleme.push("a) der Schluss-Bildschirm liegt davor, obwohl 42 Minuten übrig sind");
    if (r.kindModus !== true) probleme.push("a) kabineKindModus() ist nicht true");
    if (r.rest !== 42) probleme.push(`a) Restzeit ${r.rest} statt 42 – die Uhr kommt nicht vom Server`);
    if (r.startKey) probleme.push("a) das Kindergerät legt adler_kabine_start an – die Uhr liefe lokal weiter");
    if (rpcRufe("team_gallery_kind") < 1) probleme.push("a) team_gallery_kind wurde nicht gerufen");
    if (rpcRufe("kind_abgesagt") < 1) probleme.push("a) der Countdown fragt kind_abgesagt nicht");
    if (tabellen.length) probleme.push("a) fremde Tabellen abgefragt: " + tabellen.join(", "));
    if (rpcs.length) probleme.push("a) alte RPCs gerufen: " + rpcs.join(", "));
    const fehler = s.fehler(); if (fehler.length) probleme.push("a) Konsole: " + fehler.slice(0, 2).join(" | "));
    await s.schliessen();
  }

  // ── b) die Karte und das Quiz kennen genau dieses eine Kind ──────────────────
  {
    const s = await gekoppelt({ rpc: { kind_status: KIND(42), my_child_card_kind: {
      name: "Kind A", nr: 1, tw: false, geb: null, foto_path: null, staerken: ["f_team", "f_einsatz"],
      stats: { tore: 2, trainings: 4 } } } });
    const r = await s.page.evaluate(async () => {
      const eigene = await tqEigeneKinder();
      // Die Karte oeffnen und nachsehen, was gezeichnet wurde
      await elternCardOpen(1);
      await new Promise(r => setTimeout(r, 400));
      return { eigene, karte: !!document.querySelector("canvas"),
               fehlertext: /nicht geladen/.test(document.body.innerText || "") };
    });
    const kartenRuf = s.abgefragt.filter(x => /\/rpc\/my_child_card(_kind)?$/.test(x.pfad)).map(x => x.pfad.split("/").pop());
    zeilen.push(`b) Quiz kennt ${JSON.stringify(r.eigene)} · Karte über ${kartenRuf.join(",") || "gar nichts"}`);
    if (!Array.isArray(r.eigene) || r.eigene.length !== 1 || r.eigene[0] !== "Kind A")
      probleme.push("b) tqEigeneKinder liefert nicht genau das gekoppelte Kind: " + JSON.stringify(r.eigene));
    if (!kartenRuf.includes("my_child_card_kind")) probleme.push("b) die Karte kommt nicht aus my_child_card_kind");
    if (kartenRuf.includes("my_child_card")) probleme.push("b) die Karte ruft weiterhin my_child_card (liefert Bewertungswerte)");
    if (r.fehlertext) probleme.push("b) die Karte meldet „konnte nicht geladen werden“");
    await s.schliessen();
  }

  // ── c) die Galerie zeichnet aus staerken, nicht aus Zahlen ───────────────────
  {
    const s = await gekoppelt({ rpc: { kind_status: KIND(42) } });
    const r = await s.page.evaluate(() => {
      const mit = galleryCardData({ name: "Kind A", nr: 1, tw: false, staerken: ["f_pass", "f_abschluss", "f_tempo"], trainings: 4 });
      const ohne = galleryCardData({ name: "Kind B", nr: 2, tw: false, staerken: [], trainings: 1 });
      const tw = galleryCardData({ name: "Kind C", nr: 3, tw: true, staerken: ["f_pass"], trainings: 1 });
      return {
        badges: mit.badges.map(b => b && b.label), thema: mit.theme && mit.theme.name,
        ohneBadges: ohne.badges.length, ohneThema: ohne.theme && ohne.theme.name,
        twThema: tw.theme && tw.theme.name,
        dim: typeof feldDimVon === "function" ? feldDimVon("f_pass") : null
      };
    });
    zeilen.push(`c) Galerie: ${r.badges.join(", ")} · Thema ${r.thema} · ohne Bewertung ${r.ohneBadges} Abzeichen, Thema ${r.ohneThema}`);
    if (r.dim !== "tech") probleme.push("c) feldDimVon('f_pass') liefert " + r.dim + " statt tech");
    if (r.thema !== "TECHNIK") probleme.push("c) Thema " + r.thema + " statt TECHNIK (stärkstes Merkmal f_pass)");
    if (r.badges.length !== 3 || !r.badges.includes("Pass-Meister")) probleme.push("c) die drei Abzeichen stimmen nicht: " + r.badges.join(", "));
    if (r.ohneBadges !== 0) probleme.push("c) ohne Bewertung werden trotzdem Stärken behauptet");
    if (r.ohneThema !== "NEUE SAISON") probleme.push("c) ohne Bewertung steht „" + r.ohneThema + "“ auf der Karte");
    if (r.twThema !== "TORWART") probleme.push("c) der Torwart bekommt nicht sein Thema: " + r.twThema);
    await s.schliessen();
  }

  // ── d) Appzeit auf: Schluss-Bildschirm, und er bleibt ────────────────────────
  {
    const s = await gekoppelt({ rpc: { kind_status: KIND(1), kind_tick: { ok: true, limit_min: 60, rest_min: 0 } } });
    const r = await s.page.evaluate(async () => {
      await kabineZeitTick();                       // die Minute, die das Budget aufbraucht
      await new Promise(r => setTimeout(r, 300));
      const m = document.getElementById("kg-schluss");
      return {
        schluss: !!m, kabine: !!document.getElementById("kabine"),
        knoepfe: m ? m.querySelectorAll("button,a,input,select").length : -1,
        text: m ? (m.innerText || "").replace(/\s+/g, " ").slice(0, 80) : "",
        zurueck: typeof elternDashLoad === "function" && !!document.getElementById("eltern-root")
      };
    });
    zeilen.push(`d) Appzeit auf: „${r.text}“ · ${r.knoepfe} Bedienelemente`);
    if (!r.schluss) probleme.push("d) kein Schluss-Bildschirm nach kind_tick mit 0 Minuten");
    if (r.kabine) probleme.push("d) die Kabine steht noch offen");
    if (r.knoepfe > 0) probleme.push(`d) der Schluss-Bildschirm hat ${r.knoepfe} Bedienelemente – er soll keins haben`);
    if (!/bis morgen/.test(r.text)) probleme.push("d) der Text des Auftragspakets fehlt: " + r.text);
    if (r.zurueck) probleme.push("d) auf dem Kindergerät wird der Eltern-Bereich nachgeladen");
    await s.schliessen();
  }

  // ── e) Neustart hilft nicht: rest_min 0 gleich beim Start ────────────────────
  {
    const s = await gekoppelt({ rpc: { kind_status: KIND(0) } });
    const r = await s.page.evaluate(() => ({
      schluss: !!document.getElementById("kg-schluss"),
      kabine: !!document.getElementById("kabine"),
      kopplung: !!document.getElementById("kg-kopplung")
    }));
    zeilen.push(`e) Neustart mit 0 Minuten: Schluss ${r.schluss ? "da" : "fehlt"} · Kabine ${r.kabine ? "offen" : "zu"}`);
    if (!r.schluss) probleme.push("e) nach dem Neustart öffnet die Kabine trotz aufgebrauchter Appzeit");
    if (r.kabine) probleme.push("e) die Kabine ist offen, obwohl keine Appzeit übrig ist");
    if (r.kopplung) probleme.push("e) das gekoppelte Gerät fragt wieder nach einem Code");
    await s.schliessen();
  }

  return h.ergebnis("Kinder-App: die Kabine im Kind-Modus", probleme.length === 0, zeilen.concat(probleme));
};
