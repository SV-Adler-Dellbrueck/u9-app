/* v745 · Sonderkarten für alle Kinder sichtbar
   PO 04.10.: „Die Sonderkarten sollen für alle Kinder sichtbar sein“ (Kachel „So bauen“). Die Datenbank liefert die
   Karten jedem Team-Konto, Fotos fremder Kinder nur mit Freigabe (tests/sql/v745-sonderkarten-alle.sql).
   a) Team-Galerie (Kabine): unter der Karte eines fremden Kindes ein Streifen mit dessen Sonderkarten
   b) Groß ansehen ja, „Als Bild speichern“ nein – auch außerhalb des Kindermodus (Eltern in der Galerie)
   c) Eigenes Kind in der Galerie: Speichern bleibt (außerhalb des Kindermodus)
   d) Blättern lädt den Streifen des nächsten Kindes, keine doppelten Streifen
   e) Sticker-Album (PO: „im Sticker-Album zu ziehen, aber mit höherer Seltenheit“, Kachel: alle drei Arten, zwischen
      Episch und Legendär, eigene geschenkt): Spieltags-, Kapitäns- und Momentkarten aller Kinder als Seltenheit
      „SONDER“ mit Gewicht zwischen Legendär und Matchday/Episch, stabile Schlüssel, eigener Abschnitt; eigene Karten
      werden beim Öffnen des Albums geschenkt (album_kind), fremde nicht */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const karte = (id, name, art) => ({ art, datum: "2026-09-26", titel: "Kinderfestival", ort: "Thurner Kamp", team: 1, spielform: "4+1", mal: 1, foto_path: null, nr: id, name });
  const alle = [Object.assign(karte(1, "Kind A", "spieltag"), { spieler_id: 1 }), Object.assign(karte(2, "Kind B", "kapitaen"), { spieler_id: 2, datum: "2026-10-03", team: 2 }),
    { art: "moment", id: 9, datum: "2026-10-03", titel: "Zurück nach Verletzung", spieler_id: 2, name: "Kind B", nr: 7, foto_path: null }];
  let gespeichert = null;
  const sb = h.supabaseAttrappe({
    album_kind: (u, req) => { if (req.method() === "POST") { gespeichert = JSON.parse(req.postData() || "{}"); return { status: 201, body: "" }; } return [{ spieler_id: 1, sticker: {}, tueten: 0 }]; },
    album_fotos: [],
    termine: [],
    rpc: { kader_namen: [{ id: 1, name: "Kind A", nr: 6 }, { id: 2, name: "Kind B", nr: 7 }], sonderkarten_alle: alle, xp_award_event: 0,
      sonderkarten_kind: (u, req) => { const b = JSON.parse(req.postData() || "{}"); return b.p_spieler === 2 ? [karte(2, "Kind B", "spieltag"), karte(2, "Kind B", "kapitaen")] : [karte(1, "Kind A", "spieltag")]; } }
  });
  const e = await h.starten({ start: "/eltern/index.html", warten: 1000, breite: 390, hoehe: 844, supabase: sb });
  const r = await e.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)), out = {};
    for (let i = 0; i < 40 && typeof kabineRenderGallery !== "function"; i++) await w(100);
    if (typeof sonderkartenStreifen !== "function" || typeof kabineRenderGallery !== "function") return { fehlt: true };
    window._elternKids = [{ spieler_id: 1, kader: { id: 1, name: "Kind A" } }];
    const body = document.createElement("div"); body.id = "kabine-body"; body.style.cssText = "display:flex;flex-direction:column;min-height:600px;background:#0f172a;color:#fff"; document.body.appendChild(body);
    kabineGalleryData = [{ spieler_id: 2, name: "Kind B", nr: 7, staerken: [], trainings: 3, spiele: 1 }, { spieler_id: 1, name: "Kind A", nr: 6, staerken: [], trainings: 4, spiele: 2 }];
    kabineIdx = 0; isKidsMode = false; kabineRenderGallery(); await w(500);
    const st = () => document.querySelectorAll("#kabine-body #sk-streifen");
    out.a = { streifen: st().length, karten: [...document.querySelectorAll("#kabine-body .sk-karte canvas")].map(c => c.getAttribute("aria-label")) };
    document.querySelector("#kabine-body .sk-karte").click(); await w(200);
    out.b = { gross: !!document.getElementById("sk-gross"), speichern: !!document.getElementById("sk-teilen") };
    document.getElementById("sk-gross")?.remove();
    kabineGalleryNav(1); await w(500);
    out.d = { streifen: st().length, karten: document.querySelectorAll("#kabine-body .sk-karte").length };
    document.querySelector("#kabine-body .sk-karte")?.click(); await w(200);
    out.c = { gross: !!document.getElementById("sk-gross"), speichern: !!document.getElementById("sk-teilen") };
    document.getElementById("sk-gross")?.remove();
    // e) Sticker-Album
    const pool = await _albumPool();
    const so = pool.filter(p => p.rar === "sonder");
    out.e = { keys: so.map(p => p.key), subs: so.map(p => p.sub), w: KAB_RAR.sonder && KAB_RAR.sonder.w, wl: KAB_RAR.legendaer.w, wm: KAB_RAR.matchday.w, we: KAB_RAR.episch.w, lbl: KAB_RAR.sonder && KAB_RAR.sonder.lbl };
    window._albSonder = null;
    await kabineAlbumFor(1, "Kind A"); await w(400);
    out.e.abschnitt = /Sonderkarten – Spieltag, Kapitän, Moment/.test(document.getElementById("kabine-body").textContent);
    return out;
  }).catch(err => ({ fehler: String(err) }));
  const f = e.fehler(); await e.schliessen();
  if (r.fehlt || r.fehler) return h.ergebnis("v745 Sonderkarten für alle", false, [r.fehler || "Funktion fehlt"]);
  if (r.a.streifen !== 1 || r.a.karten.join("|") !== "Spieltagskarte vom 26.09.|Kapitänskarte vom 26.09.") probleme.push(`a) fremdes Kind: ${JSON.stringify(r.a)}`);
  zeilen.push(`a) Galerie, fremdes Kind: ${r.a.karten.join(", ")}`);
  if (!r.b.gross || r.b.speichern) probleme.push(`b) fremd groß: ${JSON.stringify(r.b)}`);
  zeilen.push("b) fremde Karte groß ansehen, ohne „Als Bild speichern“");
  if (!r.c.gross || !r.c.speichern) probleme.push(`c) eigenes Kind: ${JSON.stringify(r.c)}`);
  zeilen.push("c) eigenes Kind: Speichern bleibt");
  if (r.d.streifen !== 1 || r.d.karten !== 1) probleme.push(`d) Blättern: ${JSON.stringify(r.d)}`);
  zeilen.push("d) Blättern lädt den Streifen des nächsten Kindes, kein doppelter Streifen");
  const ee = r.e || {};
  if (ee.keys.join("|") !== "sk_st_1_2026-09-26|sk_ka_2_2026-10-03_2|sk_mo_9" || ee.subs.join("|") !== "Spieltag 26.09.|Kapitän 03.10.|Zurück nach Verletzung"
    || !(ee.w > ee.wl && ee.w < ee.wm && ee.w < ee.we) || ee.lbl !== "SONDER" || !ee.abschnitt) probleme.push(`e) Album: ${JSON.stringify(ee)}`);
  const geschenkt = gespeichert && gespeichert.sticker ? Object.keys(gespeichert.sticker) : [];
  if (geschenkt.join("|") !== "sk_st_1_2026-09-26") probleme.push(`e) geschenkt: ${JSON.stringify(gespeichert)}`);
  zeilen.push(`e) Album: ${ee.keys && ee.keys.length} Sonderkarten als „SONDER“ (Gewicht ${ee.w}: Legendär ${ee.wl} < SONDER < Matchday ${ee.wm} / Episch ${ee.we}), eigener Abschnitt; geschenkt: ${geschenkt.join(", ")}`);
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  return h.ergebnis("v745 Sonderkarten für alle", !probleme.length, zeilen.concat(probleme));
};
