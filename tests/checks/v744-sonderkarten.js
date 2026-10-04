/* v744 · Spielerkarten Stufe 3: Sonderkarten (Spieltag, Kapitän, Moment)
   PO 04.10.: Entwurf A/B/C freigegeben („alle drei“), sichtbar in Kabine und Eltern-Portal, nicht in der Team-Galerie.
   Die Datenlage (dabei, Team, Spielform, Kapitänsbinde, „1. Mal“, wer sieht was) prüft tests/sql/v744-sonderkarten.sql.
   a) Eltern: unter der eigenen Adler-Karte ein Streifen „Sonderkarten · 3“ mit einer Karte je Art, jede als Bild mit
      sprechender Beschriftung; Tipp öffnet die große Karte mit „Als Bild speichern“
   b) Kabine (Kindergerät): dieselben Karten, aber ohne Speichern/Teilen
   c) Zeichnen: alle drei Arten ohne Fehler, Spieltag ohne Ergebnis, Kapitän mit dem Kapitäns-Satz
   d) Trainer: Kinderprofil → „Sonderkarten“: Satz zum Spieltag ergänzen (POST), Momentkarte vergeben (POST mit Titel,
      Datum, Satz), Momentkarte entfernen (fragt nach, DELETE); ohne Titel kein Aufruf */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const kader = h.kaderZeilen(), id = kader[0].id;
  const karten = [
    { art: "moment", id: 5, datum: "2026-10-03", titel: "Erster Spieltag im Adler-Trikot", satz: null, foto_path: null, nr: 6, name: "Kind A" },
    { art: "kapitaen", datum: "2026-10-03", team: 1, mal: 2, foto_path: null, nr: 6, name: "Kind A" },
    { art: "spieltag", datum: "2026-09-26", titel: "Kinderfestival", ort: "Thurner Kamp", team: 2, spielform: "funino,3+1", satz: null, foto_path: null, nr: 6, name: "Kind A" }];
  const sb = () => h.supabaseAttrappe({
    kader, sonderkarte: (u, req) => req.method() === "GET" ? [] : { status: req.method() === "POST" ? 201 : 204, body: "" },
    kind_foto: [], kind_fanfacts: [], foto_consent: [],
    rpc: { sonderkarten_kind: karten, my_child_card_kind: { name: "Kind A", nr: 6, tw: false, staerken: [], stats: {} }, xp_total: 0 }
  });
  // ── Eltern und Kabine
  const e = await h.starten({ start: "/eltern/index.html", warten: 1000, breite: 390, hoehe: 844, supabase: sb() });
  const re = await e.page.evaluate(async id => {
    const w = ms => new Promise(x => setTimeout(x, ms)), out = {};
    for (let i = 0; i < 40 && (typeof sonderkartenStreifen !== "function" || typeof elternCardOpen !== "function"); i++) await w(100);
    if (typeof sonderkartenStreifen !== "function") return { fehlt: true };
    window.__k = await sonderkartenLaden(id);
    await elternCardOpen(id); await w(800);
    const st = document.getElementById("sk-streifen");
    out.a = st ? { kopf: st.firstElementChild.textContent.trim(), karten: [...st.querySelectorAll(".sk-karte canvas")].map(c => c.getAttribute("aria-label")),
      hoehe: [...st.querySelectorAll(".sk-karte")].map(b => Math.round(b.getBoundingClientRect().height)) } : null;
    st && st.querySelector(".sk-karte").click(); await w(200);
    out.gross = { da: !!document.getElementById("sk-gross"), speichern: !!document.getElementById("sk-teilen") };
    document.getElementById("sk-gross")?.remove(); document.getElementById("adler-card-modal")?.remove();
    // b) Kabine
    window.isKidsMode = true; isKidsMode = true;
    await elternCardOpen(id); await w(800);
    document.querySelector("#sk-streifen .sk-karte")?.click(); await w(200);
    out.b = { karten: document.querySelectorAll("#sk-streifen .sk-karte").length, gross: !!document.getElementById("sk-gross"), speichern: !!document.getElementById("sk-teilen") };
    isKidsMode = false;
    // c) Zeichnen: Texte abfangen
    const texte = []; const cv = document.createElement("canvas"); cv.width = 520; cv.height = 800; const ctx = cv.getContext("2d");
    const ft = ctx.fillText.bind(ctx); ctx.fillText = (t, x, y) => { texte.push(String(t)); ft(t, x, y); };
    out.c = {};
    ["spieltag", "kapitaen", "moment"].forEach(a => { texte.length = 0; try { sonderkarteDraw(ctx, 520, 800, Object.assign({}, window.__k.find(k => k.art === a)), null); out.c[a] = texte.join(" | "); } catch (err) { out.c[a] = "FEHLER " + err; } });
    return out;
  }, id).catch(err => ({ fehler: String(err) }));
  const fe = e.fehler(); await e.schliessen();
  if (re.fehlt || re.fehler) return h.ergebnis("v744 Sonderkarten", false, [re.fehler || "sonderkartenStreifen fehlt"]);
  const a = re.a || {};
  if (a.kopf !== "🃏 Sonderkarten · 3" || a.karten.join("|") !== "Momentkarte vom 03.10.|Kapitänskarte vom 03.10.|Spieltagskarte vom 26.09." || a.hoehe.some(x => x < 44) || !re.gross.da || !re.gross.speichern)
    probleme.push(`a) Eltern: ${JSON.stringify({ a, gross: re.gross })}`);
  zeilen.push(`a) Eltern: „${a.kopf}“ – ${a.karten && a.karten.join(", ")}; groß mit „Als Bild speichern“`);
  if (!re.b || re.b.karten !== 3 || !re.b.gross || re.b.speichern) probleme.push(`b) Kabine: ${JSON.stringify(re.b)}`);
  zeilen.push("b) Kabine: dieselben 3 Karten, groß ohne Speichern/Teilen");
  zeilen.push(`c) ${JSON.stringify(re.c).slice(0, 10)}…`);
  zeilen.pop();
  const c = re.c || {};
  if (!/SPIELTAG · SA 26\.09\./.test(c.spieltag || "") || !/DABEI/.test(c.spieltag) || !/Kinderfestival · Thurner Kamp ·( \| )? ?Adler 2/.test(c.spieltag) || !/FUNiño & 3\+1/.test(c.spieltag) || /:\d/.test((c.spieltag || "").replace(/SA 26\.09\./, ""))
    || !/KAPITÄN/.test(c.kapitaen || "") || !/2\. Mal Kapitän/.test(c.kapitaen) || !/Kapitän von Adler 1/.test(c.kapitaen) || !/begrüßen den Gegner/.test(c.kapitaen)
    || !/MOMENT/.test(c.moment || "") || !/Erster Spieltag im Adler-Trikot/.test(c.moment))
    probleme.push(`c) Zeichnen: ${JSON.stringify(c)}`);
  zeilen.push("c) Spieltag „DABEI · Kinderfestival · Thurner Kamp · Adler 2 · FUNiño & 3+1“ ohne Ergebnis, Kapitän „2. Mal“ mit Kapitäns-Satz, Moment mit Titel");
  // ── Trainer
  const t = await h.starten({ warten: 1200, breite: 390, hoehe: 844, supabase: sb() });
  const rt = await t.page.evaluate(async id => {
    const w = ms => new Promise(x => setTimeout(x, ms)), out = {};
    for (let i = 0; i < 40 && typeof sonderkartenTrainerOpen !== "function"; i++) await w(100);
    window.__k = await sonderkartenLaden(id);
    await loadKader(); await kinderProfilOpen(id); await w(600);
    out.knopf = [...document.querySelectorAll("#kp-modal button")].some(b => /Sonderkarten/.test(b.textContent));
    await sonderkartenTrainerOpen(id); await w(600);
    const m = document.getElementById("sk-trainer");
    out.liste = { karten: m.querySelectorAll(".sk-zeile").length, satz: m.querySelectorAll(".sk-satz").length, weg: m.querySelectorAll(".sk-weg").length, role: m.getAttribute("role") };
    // ohne Titel kein Aufruf
    await sonderkarteMomentVergeben(id); await w(100);
    document.getElementById("sk-titel").value = "Erstes Mal im Tor"; document.getElementById("sk-datum").value = "2026-10-04"; document.getElementById("sk-satz").value = "Mutig!";
    await sonderkarteMomentVergeben(id); await w(300);
    // Satz zum Spieltag
    const p = sonderkarteSatz(id, window.__k.find(k => k.art === "spieltag")); await w(200);
    document.getElementById("sk-frage-text").value = "Hat in jeder Runde den Kopf gehoben."; document.getElementById("sk-frage-ja").click(); await p; await w(300);
    // Moment entfernen
    const q = sonderkarteMomentLoeschen(id, window.__k.find(k => k.art === "moment")); await w(200);
    out.frage = !!document.getElementById("frage-modal"); document.getElementById("frage-ja")?.click(); await q; await w(300);
    return out;
  }, id).catch(err => ({ fehler: String(err) }));
  const gesendet = t.gesendet.filter(x => /\/rest\/v1\/sonderkarte$/.test(x.pfad) && x.methode !== "GET").map(x => x.methode + " " + JSON.stringify(x.body || ""));
  const ft = t.fehler(); await t.schliessen();
  if (rt.fehler) probleme.push("d) " + rt.fehler);
  else {
    if (!rt.knopf || rt.liste.karten !== 3 || rt.liste.satz !== 1 || rt.liste.weg !== 1 || rt.liste.role !== "dialog") probleme.push(`d) Liste: ${JSON.stringify(rt)}`);
    const erw = [`POST {"spieler_id":${id},"art":"moment","datum":"2026-10-04","titel":"Erstes Mal im Tor","satz":"Mutig!"}`,
      `POST {"spieler_id":${id},"art":"spieltag","datum":"2026-09-26","satz":"Hat in jeder Runde den Kopf gehoben."}`, `DELETE ""`];
    if (gesendet.join("\n") !== erw.join("\n") || !rt.frage) probleme.push(`d) Schreiben: ${JSON.stringify(gesendet)} · frage ${rt.frage}`);
  }
  zeilen.push("d) Trainer: Profil → „Sonderkarten“, Satz zum Spieltag, Momentkarte vergeben (ohne Titel kein Aufruf), Entfernen mit Rückfrage");
  const f = fe.concat(ft); if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  return h.ergebnis("v744 Sonderkarten", !probleme.length, zeilen.concat(probleme));
};
