/* v962 · Charles 24.11.: „Wenn die Kinder aus der Akademie zurück in die Kabine gehen, kommt kurz die Ansicht mit der Code-Eingabe.
   … Der Aufbau der Kabine muss besser werden. Die Akademie sollte präsenter sein … In der Akademie sollte der Platz besser genutzt
   werden. Die untere Hälfte ist komplett leer. Die Audiodateien der einzelnen Praxis-Übungen sind noch nicht mit Lennarts Stimme.
   Die ganze Akademie auch in Kindersprache.“ Dazu: „Die Kinder sollten es in der Kinder-App als erledigt markieren … und dann muss es
   eine Nachricht ganz oben in der Eltern-App geben … Bitte gib es frei.“ Bilder freigegeben.
   a) Eltern- und Kinder-Einstieg: das PIN-Feld der Trainer ist in keinem Moment sichtbar (vorher 0,1–0,3 s nach jedem Laden).
   b) Kabine: Akademie-Karte vor dem Team-Level, mit „Unterricht“ und „Trainingsplatz“ direkt; Abzeichen-Stand auf der Karte.
   c) Akademie-Start: zwei Kacheln, „Als Nächstes für dich“ (Stunde + nächstes Abzeichen), Zeugnis mit zwei Balken;
      aus der Kabine öffnet mode=praxis direkt den Trainingsplatz.
   d) Kindersprache: jedes Abzeichen hat Schritte und Tipp, kein „×“, kein Satz über 14 Wörter.
   e) Kind meldet „Ich hab's geschafft!“ → Zeile in abzeichen_meldung; in der Liste „⏳ wartet“.
   f) Eltern: Karte ganz vorn in „Für euch“; „Ja, geschafft“ vergibt Federn (xp_award_event) und löscht die Meldung, „Noch nicht“ löscht nur.
   g) Lennart: die 19 Abzeichen stehen in der Sprechtext-Liste; Vorlesen spielt audio/schule/<hash>.mp3.
   h) Migration: Tabelle mit RLS, Kindergerät nur mit Appzeit, löschen nur Eltern und Trainer. */
"use strict";
const fs = require("fs"), path = require("path"), { spawnSync } = require("child_process");
module.exports = async function (h) {
  const titel = "v962 Akademie präsent, Platz genutzt, Kindersprache, Kinder melden „geschafft“, Eltern geben frei, kein PIN-Blitz";
  const probleme = [], zeilen = [];
  const bronze7 = ["ab_jonglier", "ab_beidfuss", "ab_slalom", "ab_innenseite", "ab_sohle", "ab_torschuss", "ab_ausdauer"];
  const xpRpc = (u, req) => { let b = {}; try { b = JSON.parse(req.postData() || "{}"); } catch (e) {} return b.p_quelle === "abzeichen" ? bronze7 : []; };

  // ── a) PIN-Feld blitzt nicht auf ───────────────────────────────────────────────
  for (const start of ["/eltern/index.html?portal", "/kinder/index.html"]) {
    const s = await h.starten({ start, warten: 200, angemeldet: false, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
    const p = s.page;
    /* Jedes Bild ab dem ersten Byte messen: ein Init-Skript prüft per requestAnimationFrame, ob das PIN-Feld zu sehen ist. */
    await p.addInitScript(() => { window.__pin = { gesehen: 0, sichtbar: 0 }; const f = () => { const g = document.getElementById("pin-gate");
      if (g) { window.__pin.gesehen++; const r = g.getBoundingClientRect(), cs = getComputedStyle(g); if (cs.display !== "none" && cs.visibility !== "hidden" && r.width > 0 && r.height > 0) window.__pin.sichtbar++; }
      if (performance.now() < 4000) requestAnimationFrame(f); }; requestAnimationFrame(f); });
    await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(800);
    const pin = await p.evaluate(() => window.__pin).catch(() => ({ gesehen: 0, sichtbar: 0 }));
    const nav = null, sichtbar = pin.sichtbar, gesehen = pin.gesehen;
    await s.schliessen();
    if (sichtbar) probleme.push(`a) ${start}: PIN-Feld ${sichtbar}-mal sichtbar`);
    zeilen.push(`a) ${start}: PIN-Feld im DOM ${gesehen}-mal gemessen, sichtbar ${sichtbar}-mal`);
  }

  // ── b) Kabine ───────────────────────────────────────────────────────────────────
  {
    const KIND = { ok: true, spieler_id: 1, name: "Kind A", nr: 1, tw: false, geraet: "Tablet", limit_min: 60, rest_min: 60 };
    const s = await h.starten({ start: "/kinder/index.html", warten: 500, angemeldet: false, breite: 390, hoehe: 844,
      supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [], team_config: [{ id: 1 }], abzeichen_meldung: [],
        rpc: { kind_status: KIND, kader_namen: [], team_gallery_kind: [], team_federn_total: 0, team_meilensteine: [], meine_rollen: { games: 0 }, meine_ziele: [], xp_events_for: xpRpc } }) });
    await s.page.evaluate(() => { localStorage.setItem("adler_sb_auth_kind", JSON.stringify({ access_token: "kind.x.y", refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); localStorage.setItem("adler_kinder_tour", "1"); });
    await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(1800);
    const r = await s.page.evaluate(() => {
      const ak = document.getElementById("kab-akademie"), lv = document.getElementById("kab-level");
      return { da: !!ak, vorLevel: !!(ak && lv && (ak.compareDocumentPosition(lv) & Node.DOCUMENT_POSITION_FOLLOWING)),
        wege: ak ? [...ak.querySelectorAll("button")].map(b => b.getAttribute("onclick")) : [], stand: (document.getElementById("kab-ak-stand") || {}).textContent || "",
        hoehe: ak ? Math.round(ak.getBoundingClientRect().top) : -1 };
    }).catch(x => ({ fehler: String(x) }));
    await s.schliessen();
    if (r.fehler || !r.da || !r.vorLevel || !r.wege.includes("kabineQuiz('theorie')") || !r.wege.includes("kabineQuiz('praxis')") || !/7\/9/.test(r.stand))
      probleme.push("b) Kabine " + JSON.stringify(r).slice(0, 300));
    zeilen.push(`b) Akademie-Karte ${r.hoehe}px von oben, vor dem Team-Level: ${r.vorLevel} · Stand „${r.stand}“`);
  }

  // ── c) d) e) g) Akademie als Kind ──────────────────────────────────────────────────
  {
    const s = await h.starten({ start: "/kinder/index.html?quiz", breite: 390, hoehe: 900, warten: 2500, bibliothek: true,
      supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), abzeichen_meldung: [{ abzeichen: "ab_stoppen" }], rpc: { xp_events_for: xpRpc } }) });
    const r = await s.page.evaluate(async () => {
      const w = ms => new Promise(x => setTimeout(x, ms)), txt = e => e ? e.textContent.replace(/\s+/g, " ").trim() : "";
      for (let i = 0; i < 50 && typeof akademieStartHtml !== "function"; i++) await w(100);
      if (typeof abzeichenMelden !== "function") return { alt: true };
      document.querySelectorAll("[role=dialog]").forEach(d => d.remove());
      localStorage.setItem("adler_quiz_tutorial_done", "1");
      const out = {};
      tqPlayer = "Kind A"; _akBereich = null; tqStart(); await w(700);
      out.c = { kacheln: document.querySelectorAll(".ak-zwei .ak-bereich").length, stunde: txt(document.getElementById("ak-naechst-theorie")),
        abz: txt(document.getElementById("ak-naechst-praxis")), balken: document.querySelectorAll(".ak-zeugnis .ak-balken").length,
        frei: Math.round(innerHeight - (document.querySelector(".ak-zeugnis") || { getBoundingClientRect: () => ({ bottom: 0 }) }).getBoundingClientRect().bottom) };
      // d) Kindersprache
      const alle = ABZ_STUFEN.flatMap(st => st.liste());
      const saetze = alle.flatMap(a => [a.desc, ...(a.schritte || []), a.tipp || ""]).join(" ").split(/(?<=[.!?])\s+/);
      out.d = { ohne: alle.filter(a => !(a.schritte && a.schritte.length >= 2 && a.tipp)).map(a => a.id), mal: alle.filter(a => /×/.test(a.desc + (a.schritte || []).join(""))).map(a => a.id),
        lang: saetze.filter(x => x.split(/\s+/).filter(Boolean).length > 14) };
      // e) melden
      window._quizMode = "praxis"; _akBereich = null;
      const m = window._quizMode; window._quizMode = null; if (m === "praxis") { _akBereich = m; tqStart(); } await w(700);
      const liste = document.getElementById("abzeichen-list");
      out.e = { praxis: _akBereich, wartet: txt([...(liste ? liste.querySelectorAll(".abz-zeile") : [])].find(z => /Ball-Stopper/.test(z.textContent))) };
      abzeichenDetail("ab_trick", _akKindId(), 1); await w(200);
      const det = document.getElementById("abz-detail"), knopf = det && det.querySelector(".abz-melden");
      out.e.knopf = txt(knopf);
      // g) Vorlesen spielt die Aufnahme
      const echtAudio = window.Audio; let url = null; window.Audio = function (u) { url = u; return { play: () => Promise.resolve(), pause() {}, set onended(f) {}, set onerror(f) {} }; };
      det && det.querySelector(".abz-vorlesen") && det.querySelector(".abz-vorlesen").click(); await w(50);
      window.Audio = echtAudio; if (typeof kfStopp === "function") kfStopp();
      out.g = { url };
      knopf && knopf.click(); await w(500);
      out.e.danach = !document.getElementById("abz-detail");
      return out;
    }).catch(x => ({ fehler: String(x) }));
    const post = s.gesendet.filter(g => /abzeichen_meldung/.test(g.pfad) && g.methode === "POST").map(g => { try { return JSON.parse(g.body); } catch (e) { return g.body; } });
    const fe = s.fehler(); await s.schliessen();
    if (r.alt) return h.ergebnis(titel, false, probleme.concat(["Melden fehlt (Stand vor v962)"]));
    if (r.fehler) return h.ergebnis(titel, false, probleme.concat(["Fehler im Ablauf: " + r.fehler]));
    if (r.c.kacheln !== 2 || !/1\. Stunde/.test(r.c.stunde) || !/Üben: Trick-Meister/.test(r.c.abz) || r.c.balken !== 2) probleme.push("c) Start " + JSON.stringify(r.c));
    if (r.d.ohne.length || r.d.mal.length || r.d.lang.length) probleme.push("d) Kindersprache " + JSON.stringify(r.d).slice(0, 300));
    if (r.e.praxis !== "praxis" || !/wartet/.test(r.e.wartet) || !/Ich hab's geschafft/.test(r.e.knopf) || !r.e.danach) probleme.push("e) Melden " + JSON.stringify(r.e));
    if (post.length !== 1 || post[0].abzeichen !== "ab_trick" || post[0].quelle !== "abzeichen" || post[0].spieler_id == null) probleme.push("e) gesendet " + JSON.stringify(post));
    if (!/audio\/schule\/[0-9a-f]{8}\.mp3$/.test(r.g.url || "")) probleme.push("g) Vorlesen ohne Aufnahme: " + r.g.url);
    const f2 = fe.filter(x => !/Failed to load resource/.test(x)); if (f2.length) probleme.push("Konsole (Kind): " + f2.slice(0, 2).join(" | "));
    zeilen.push(`c) ${r.c.kacheln} Kacheln, „${r.c.stunde.slice(0, 40)}“, „${r.c.abz.slice(0, 40)}“, Zeugnis ${r.c.balken} Balken, unten frei ${r.c.frei}px · d) längster Satz ok · e) ${JSON.stringify(post[0] || {})} · g) ${String(r.g.url).split("/").slice(-2).join("/")}`);
  }

  // ── f) Eltern geben frei ─────────────────────────────────────────────────────────────
  {
    const T = (id, tp) => ({ id, datum: h.tagePlus(tp), typ: "training", titel: "Training", gegner: "Training", uhrzeit: "16:45:00", uhrzeit_ende: null, heim: true, ort: "Sportplatz", trainer_status: {} });
    const TOKEN = "x." + Buffer.from(JSON.stringify({ sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600, email: "eltern@example.org" })).toString("base64url") + ".y";
    const e = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1500, breite: 390, hoehe: 844,
      supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
        eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 6 } }], termine: () => [T(1, 2)], rueckmeldungen: [], kind_fanfacts: [], kind_foto: [],
        abzeichen_meldung: [{ id: 5, spieler_id: 1, abzeichen: "ab_trick", quelle: "abzeichen", created_at: new Date().toISOString() },
          { id: 6, spieler_id: 1, abzeichen: "ab2_tennis", quelle: "abzeichen_silber", created_at: new Date().toISOString() }],
        rpc: { xp_award_event: 10, xp_events_for: [] } }) });
    await e.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
    await e.page.reload({ waitUntil: "networkidle" }); await e.page.waitForTimeout(2200);
    const r = await e.page.evaluate(async () => {
      const w = ms => new Promise(x => setTimeout(x, ms)), txt = el => el ? el.textContent.replace(/\s+/g, " ").trim() : "";
      const karten = [...document.querySelectorAll("#fe-bahn .ak-melde")];
      const vorn = (typeof fuerEuchKarten === "function") ? fuerEuchKarten()[0] : null;
      const out = { n: karten.length, erste: txt(karten[0]), zweite: txt(karten[1]), vorn: !!(vorn && vorn.classList.contains("ak-melde")) };
      karten[0] && [...karten[0].querySelectorAll("button")].find(b => /Ja, geschafft/.test(b.textContent))?.click(); await w(600);
      karten[1] && [...karten[1].querySelectorAll("button")].find(b => /Noch nicht/.test(b.textContent))?.click(); await w(400);
      out.rest = document.querySelectorAll("#fe-bahn .ak-melde").length;
      return out;
    }).catch(x => ({ fehler: String(x) }));
    const g = e.gesendet.filter(x => /xp_award_event|abzeichen_meldung/.test(x.pfad)).map(x => ({ m: x.methode, p: x.pfad.split("/").pop(), s: x.suche || "", b: typeof x.body === "string" ? x.body : JSON.stringify(x.body || "") }));
    await e.schliessen();
    const award = g.filter(x => /xp_award_event/.test(x.p)), del = g.filter(x => x.m === "DELETE");
    if (r.fehler || r.n !== 2 || !r.vorn || !/Kind A hat geübt: ✨ Trick-Meister/.test(r.erste) || !/20 Adler-Federn/.test(r.zweite) || r.rest !== 0) probleme.push("f) Karten " + JSON.stringify(r).slice(0, 300));
    if (award.length !== 1 || !/"p_quelle":"abzeichen"/.test(award[0].b) || !/"p_quelle_id":"ab_trick"/.test(award[0].b)) probleme.push("f) Federn " + JSON.stringify(award));
    if (del.length !== 2 || !del.some(x => /ab_trick/.test(x.s)) || !del.some(x => /ab2_tennis/.test(x.s))) probleme.push("f) Meldungen gelöscht " + JSON.stringify(del));
    zeilen.push(`f) ${r.n} Karten, vorn in „Für euch“: ${r.vorn} · Federn ${award.length}× · gelöscht ${del.map(x => x.s.match(/ab2?_[a-z]+/) || "?").join(", ")}`);
  }

  // ── g) h) Liste und Migration ────────────────────────────────────────────────────────
  const j = spawnSync(process.execPath, [path.join(h.REPO, "tools", "quiz-audio-namen.js"), "--json"], { encoding: "utf8", maxBuffer: 64 << 20 });
  let platz = []; try { platz = JSON.parse(j.stdout || "[]").filter(x => /^Trainingsplatz: /.test(x.quelle)); } catch (e) {}
  if (platz.length !== 19 || platz.some(x => x.ordner !== "audio/schule")) probleme.push("g) Sprechtexte Trainingsplatz: " + platz.length);
  const migPfad = path.join(h.REPO, "supabase/migrations/20261124_v962_abzeichen_meldung.sql");
  const mig = fs.existsSync(migPfad) ? fs.readFileSync(migPfad, "utf8") : "";
  if (!/enable row level security/.test(mig) || !/is_kind_selbst\(spieler_id\) and public\.kind_zeit_uebrig\(\)/.test(mig) || !/for delete to authenticated\s+using \(public\.is_trainer\(\) or public\.is_parent_of\(spieler_id\)\)/.test(mig))
    probleme.push("h) Migration");
  zeilen.push(`g) ${platz.length} Abzeichen-Texte für Lennart · h) Migration mit RLS`);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
