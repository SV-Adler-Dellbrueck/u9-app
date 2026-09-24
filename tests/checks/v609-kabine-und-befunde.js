/* v609 · Rest von Paket A aus der App-Prüfung vom 24.09.

   a) Kabinen-Zeit vorbei: Das Handy landet NICHT im offenen Eltern-Bereich, sondern auf einer
      Sperre, die auch ein Neuladen übersteht und nur mit dem Code aufgeht.
   b) Der Foto-Hinweis in der Kinder-Galerie steht nur beim eigenen Kind – bei fremden Karten
      verriete er, welche Familie keine Foto-Freigabe gegeben hat.
   c) In der Kabine kein „Karte teilen“ (öffnet WhatsApp und die Kontakte der Eltern).
   d) Skill-Video: YouTube eingebettet (youtube-nocookie), kein Sprung nach draußen.
   e) Kein prompt() mehr im Eltern-Bereich (Fundbüro, Fan-Link) – eigenes Fenster.
   f) Eltern-Tour ohne HTML-Reste („<b>“, „&amp;“).
   g) Stationstimer: Torwart-/Einzeltraining laufen parallel, nicht als eigene Station danach.
   h) Die Anwesenheit eines Termins kommt frisch vom Server, bevor die Gruppen abgeglichen werden. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];

  // ── a–d, f: Eltern-Bereich ─────────────────────────────────────────────────
  {
    const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1500,
      supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }] }) });
    const r = await s.page.evaluate(async () => {
      const out = {}, warte = ms => new Promise(r => setTimeout(r, ms));
      let dash = 0; const orig = window.elternDashLoad; window.elternDashLoad = () => { dash++; };
      // a) Zeitende im Eltern-Bereich
      isKidsMode = true; kabineZeitEnde();
      out.sperre = !!document.getElementById("kabine-sperre");
      out.flag = localStorage.getItem("adler_kabine_gesperrt");
      out.dashNachEnde = dash;
      // Code eingeben
      window.kabineCodeHash = async () => hashPin("2468");
      kabineExit(); for (const z of "2468") await kabineCodeTip(z);
      await warte(100);
      out.sperreNachCode = !!document.getElementById("kabine-sperre");
      out.flagNachCode = localStorage.getItem("adler_kabine_gesperrt");
      out.dashNachCode = dash;
      window.elternDashLoad = orig;
      // b) Galerie
      window._elternKids = [{ spieler_id: 1, kader: { id: 1, name: "Kind A" } }];
      isKidsMode = true;
      let k = document.getElementById("kabine"); if (!k) { k = document.createElement("div"); k.id = "kabine"; k.innerHTML = '<div id="kabine-body"></div>'; document.body.appendChild(k); }
      kabineGalleryData = [{ name: "Kind A", foto_path: null }, { name: "Kind B", foto_path: null }];
      kabineIdx = 0; kabineRenderGallery(); out.hinweisEigen = /fehlt noch ein Foto/.test(document.getElementById("kabine-body").textContent);
      kabineIdx = 1; kabineRenderGallery(); out.hinweisFremd = /fehlt noch ein Foto/.test(document.getElementById("kabine-body").textContent);
      // c) Karte in der Kabine
      try { const dk = adlerCardDataFromChild({ name: "Kind A", nr: 1, counts: {} }); await elternCardShow(dk); } catch (e) { out.cardFehler = String(e.message); }
      const cm = document.getElementById("adler-card-modal");
      out.teilenInKabine = cm ? /Karte teilen/.test(cm.textContent) : null;
      cm?.remove();
      // d) Video
      const yt = typeof kabineYoutubeEmbed === "function" ? kabineYoutubeEmbed : () => "(fehlt)";
      out.embed = yt("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      out.fremd = yt("https://example.org/video.mp4");
      // f) Tour
      out.tour = ELTERN_TOUR.map(t => t.d).join(" ");
      elternTourIdx = 0; elternTourRender();
      const ov = document.getElementById("eltern-tour-ov"); out.tourText = ov ? ov.textContent : "";
      ov?.remove(); isKidsMode = false;
      return out;
    });
    // nach Neuladen: Sperre bleibt, wenn das Flag gesetzt ist
    await s.page.evaluate(() => localStorage.setItem("adler_kabine_gesperrt", "1"));
    await s.page.evaluate(() => { try { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: "e.x.y", refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); } catch (e) {} });
    await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(1800);
    const nachReload = await s.page.evaluate(() => !!document.getElementById("kabine-sperre"));
    const f = s.fehler().filter(x => !/youtube/i.test(x));
    await s.schliessen();

    if (!r.sperre) probleme.push("a) nach Ablauf der Kabinen-Zeit erscheint keine Sperre");
    if (r.dashNachEnde) probleme.push("a) nach Ablauf der Kabinen-Zeit öffnet sich der Eltern-Bereich");
    if (r.flag !== "1") probleme.push("a) die Sperre wird nicht gemerkt – ein Neuladen hebt sie auf");
    if (r.sperreNachCode || r.flagNachCode) probleme.push("a) der richtige Code hebt die Sperre nicht auf");
    if (r.dashNachCode !== 1) probleme.push("a) nach dem Code lädt der Eltern-Bereich nicht");
    if (!nachReload) probleme.push("a) nach dem Neuladen ist die Sperre weg");
    if (!r.hinweisEigen) probleme.push("b) beim eigenen Kind fehlt der Foto-Hinweis");
    if (r.hinweisFremd) probleme.push("b) der Foto-Hinweis steht bei einem fremden Kind");
    if (r.teilenInKabine !== false) probleme.push(`c) „Karte teilen“ in der Kabine: ${r.teilenInKabine}${r.cardFehler ? " (" + r.cardFehler + ")" : ""}`);
    if (!/youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/.test(r.embed) || r.fremd) probleme.push(`d) Einbettung: ${r.embed} / ${r.fremd}`);
    if (/<b>|&amp;/.test(r.tour) || /<b>|&amp;/.test(r.tourText)) probleme.push("f) HTML-Reste in der Eltern-Tour");
    if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
    zeilen.push(`a) Sperre ${r.sperre ? "da" : "fehlt"}, Eltern-Bereich erst nach Code (${r.dashNachEnde}→${r.dashNachCode}), nach Neuladen ${nachReload ? "gesperrt" : "offen"}`);
    zeilen.push(`b) Foto-Hinweis eigenes Kind ${r.hinweisEigen ? "ja" : "nein"}, fremdes ${r.hinweisFremd ? "ja" : "nein"} · c) Teilen in der Kabine: ${r.teilenInKabine ? "ja" : "nein"} · d) ${r.embed}`);
  }

  // ── e: kein prompt() im Eltern-Bereich ─────────────────────────────────────
  {
    const rot = [];
    for (const d of ["md-fundbuero.js", "md-kasse.js", "md-eltern-portal.js", "md-kabine.js", "md-carpool.js", "md-galerie.js"]) {
      const src = fs.readFileSync(path.join(h.REPO, d), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      const n = (src.match(/(^|[^.\w])prompt\(/g) || []).length;
      if (n) rot.push(`${d}: ${n}×`);
    }
    if (rot.length) probleme.push("e) prompt() im Eltern-/Kinderbereich: " + rot.join(", "));
    zeilen.push(`e) prompt() im Eltern-/Kinderbereich: ${rot.length ? rot.join(", ") : "keins"}`);
  }

  // ── g, h: Trainer ─────────────────────────────────────────────────────────
  {
    const datum = h.tagePlus(2);
    const s = await h.starten({ hoehe: 2000, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(),
      anwesenheit: (u) => /datum=eq\./.test(u.search) ? [{ data: { 3: { da: false, qual: 0 } }, updated_at: new Date(Date.now() + 60000).toISOString() }] : [] }) });
    await h.sichtbarMachen(s.page, "#tp-timeline");
    const r = await s.page.evaluate(async ({ datum }) => {
      await loadKader();
      tpSlots.length = 0; tpCoaches = {};
      tpSlots.push({ label: "Hauptteil", dauer: 20, farbe: "#1a56db", typ: "main" });
      tpSlots.push({ label: "Torwart", dauer: 20, farbe: "#854d0e", typ: "tw", parallelZu: 0 });
      tpRenderTimeline();
      const st = stTimerStations();
      const out = { stationen: st.map(x => x.label), dauer: st.reduce((a, x) => a + x.dauer, 0), zeilen: st[0] ? st[0].gruppen : [] };
      AW_DATA[datum] = { "Kind C": { da: true, qual: 0 } };
      if (typeof awFrischLaden === "function") await awFrischLaden(datum);
      out.nachFrisch = AW_DATA[datum] && AW_DATA[datum]["Kind C"] ? AW_DATA[datum]["Kind C"].da : "fehlt";
      return out;
    }, { datum });
    await s.schliessen();
    if (r.stationen.length !== 1) probleme.push(`g) Stationstimer: ${r.stationen.length} Stationen (${r.stationen.join(" | ")}) statt 1`);
    if (r.dauer !== 20) probleme.push(`g) Stationstimer dauert ${r.dauer} statt 20 Min.`);
    if (!r.zeilen.some(z => /Torwart/.test(z))) probleme.push("g) der Torwart-Block fehlt als Zeile beim Hauptteil");
    if (r.nachFrisch !== false) probleme.push(`h) die Anwesenheit vom Server kommt nicht an (${r.nachFrisch})`);
    zeilen.push(`g) Timer: ${r.stationen.join(" | ")} · ${r.dauer} Min. · ${r.zeilen.filter(z => /Torwart/.test(z)).join("")} · h) nach frischem Laden: da=${r.nachFrisch}`);
  }
  // ── i: „Diese Woche" – Training zählt Absagen, keine doppelte Stecknadel ─────
  {
    const t = h.tagePlus(1);
    const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(),
      termine: [{ id: 5, datum: t, typ: "training", uhrzeit: "16:45", uhrzeit_ende: "18:00", ort: "Sportplatz", trainer_status: {} }],
      rueckmeldungen: [{ termin_id: 5, spieler_id: 2, status: "abgesagt" }] }) });
    const r = await s.page.evaluate(async () => {
      let slot = document.getElementById("home-woche"); if (!slot) { slot = document.createElement("div"); slot.id = "home-woche"; document.body.appendChild(slot); }
      await homeWocheLoad();
      return slot.textContent.replace(/\s+/g, " ");
    });
    await s.schliessen();
    if (/0 zugesagt/.test(r)) probleme.push("i) beim Training steht weiter „0 zugesagt“");
    if (!/\d+ dabei/.test(r)) probleme.push("i) beim Training fehlt „N dabei“: " + r.slice(0, 160));
    if (/📍\s*📍/.test(r)) probleme.push("i) doppelte Stecknadel beim Ort");
    zeilen.push("i) Diese Woche: " + (r.match(/\d+ dabei[^·]*·?\s*\d* ?(abgesagt)?/) || [""])[0].trim() + (/📍\s*📍/.test(r) ? " · 📍📍" : " · eine 📍"));
  }
  return h.ergebnis("v609 Kabine sicher, Timer parallel, kein prompt(), Tour ohne HTML-Reste, Anwesenheit frisch", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
