/* v963 · Charles 24.11.: „Ist es technisch machbar, ein YouTube-Video in die Akademie einzubinden? … den Skill des Monats dort auch
   integrieren … die Kinder haben das zum Nachschauen, können es zu Hause nachmachen und wir würden es dann auch im Training live
   trainieren.“ Freigegeben: Player-Fläche mit einem Tipp (vorher keine Verbindung zu Google), eigene Clips direkt, Abzeichen verknüpft.
   a) Akademie-Start: „Skill des Monats: …“ als erste Zeile in „Als Nächstes“.
   b) Trainingsplatz: Karte oben; vor dem Tipp kein iframe und keine Anfrage an YouTube; ein Tipp → genau ein iframe
      (youtube-nocookie, autoplay=1, rel=0); „So geht's“ öffnet das verknüpfte Abzeichen.
   c) Eigener Clip (video/…mp4): direkt ein <video> mit Steuerung, kein iframe.
   d) Eltern: Freigabe des verknüpften Abzeichens gibt zusätzlich skillwoche-Federn (quelle_id = Skill).
      Seit v980 nimmt das ein Trainer beim Training ab (v980-skill-abnahme-tee-karte.js): die Eltern-Meldung hat keinen Knopf mehr, es geht nichts hinaus.
   e) Kabine: keine Kachel „Skill der Woche“ mehr; Trainer-Eingabe nimmt video/…mp4 und ein Abzeichen; Migration. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v963 Skill des Monats: oben in der Akademie, Video erst beim Tipp, eigener Clip direkt, mit Abzeichen";
  const probleme = [], zeilen = [];
  const b8 = ["ab_jonglier", "ab_beidfuss", "ab_slalom", "ab_innenseite", "ab_sohle", "ab_torschuss", "ab_ausdauer", "ab_trick"];
  const xp = (u, req) => { let b = {}; try { b = JSON.parse(req.postData() || "{}"); } catch (e) {} return b.p_quelle === "abzeichen" ? b8 : []; };
  const SK = { id: 7, titel: "Cruyff-Drehung", beschreibung: "Täusch einen Schuss an.", video_url: "https://youtu.be/abcdefghijk", abzeichen: "ab2_cruyff", aktiv: true };

  // ── a) b) c) Akademie ───────────────────────────────────────────────────────────
  for (const fall of ["youtube", "clip"]) {
    const sk = fall === "clip" ? { ...SK, video_url: "video/skill-cruyff.mp4" } : SK;
    const s = await h.starten({ start: "/kinder/index.html?quiz", breite: 390, hoehe: 900, warten: 2500,
      supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), skill_woche: [sk], abzeichen_meldung: [], rpc: { xp_events_for: xp } }) });
    const yt = []; s.page.on("request", q => { if (/youtube|ytimg|googlevideo/.test(q.url())) yt.push(q.url()); });
    const r = await s.page.evaluate(async (fall) => {
      const w = ms => new Promise(x => setTimeout(x, ms)), txt = e => e ? e.textContent.replace(/\s+/g, " ").trim() : "";
      for (let i = 0; i < 50 && typeof akademieStartHtml !== "function"; i++) await w(100);
      if (typeof skillMonatLaden !== "function") return { alt: true };
      document.querySelectorAll("[role=dialog]").forEach(d => d.remove());
      localStorage.setItem("adler_quiz_tutorial_done", "1");
      const out = {};
      tqPlayer = "Kind A"; _akBereich = null; tqStart(); await w(800);
      const erste = document.querySelector("#ak-naechst-skill .ak-naechst, .ak-naechst");
      out.a = txt(erste);
      _akBereich = "praxis"; tqStart(); await w(900);
      const karte = document.getElementById("skm-karte");
      out.b = { da: !!karte, oben: !!(karte && document.getElementById("abzeichen-list") && (karte.compareDocumentPosition(document.getElementById("abzeichen-list")) & Node.DOCUMENT_POSITION_FOLLOWING)),
        iframeVor: document.querySelectorAll("iframe").length, video: document.querySelectorAll("#skm-karte video").length };
      if (fall === "youtube") {
        const p = karte && karte.querySelector(".skm-player");
        out.b.player = p ? Math.round(p.getBoundingClientRect().height) : 0;
        p && p.click(); await w(200);
        const f = [...document.querySelectorAll("#skm-karte iframe")];
        out.b.iframeNach = f.length; out.b.src = f[0] ? f[0].src : ""; out.b.allow = f[0] ? f[0].getAttribute("allow") : "";
      }
      const abz = karte && karte.querySelector(".skm-abz"); abz && abz.click(); await w(200);
      out.b.detail = txt(document.querySelector("#abz-detail .mdl-titel, #abz-detail h2, #abz-detail")).slice(0, 40);
      out.b.melden = !!document.querySelector("#abz-detail .abz-melden");
      return out;
    }, fall).catch(x => ({ fehler: String(x) }));
    const vorTipp = yt.length; await s.schliessen();
    if (r.alt) return h.ergebnis(titel, false, ["Skill des Monats fehlt (Stand vor v963)"]);
    if (r.fehler) { probleme.push(`${fall}: Fehler im Ablauf: ${r.fehler}`); continue; }
    if (!/Skill des Monats: Cruyff-Drehung/.test(r.a)) probleme.push(`a) ${fall}: erste Zeile „${r.a}“`);
    if (!r.b.da || !r.b.oben || r.b.iframeVor !== 0) probleme.push(`b) ${fall}: Karte ${JSON.stringify(r.b)}`);
    if (!/Cruyff/.test(r.b.detail) || !r.b.melden) probleme.push(`b) ${fall}: „So geht's“ öffnet nicht das Abzeichen mit Melden (${r.b.detail})`);
    if (fall === "youtube") {
      if (r.b.player < 150 || r.b.iframeNach !== 1 || !/^https:\/\/www\.youtube-nocookie\.com\/embed\/abcdefghijk\?.*rel=0.*autoplay=1/.test(r.b.src) || !/autoplay/.test(r.b.allow))
        probleme.push("b) Player " + JSON.stringify(r.b));
      zeilen.push(`b) YouTube: Fläche ${r.b.player}px, vor dem Tipp 0 iframes, nach dem Tipp ${r.b.iframeNach} (autoplay) · Anfragen an YouTube gesamt ${vorTipp} (erst nach Tipp)`);
    } else {
      if (r.b.video !== 1) probleme.push("c) Clip nicht direkt eingebettet: " + JSON.stringify(r.b));
      if (vorTipp) probleme.push("c) Clip fragt YouTube an");
      zeilen.push(`c) eigener Clip: ${r.b.video} <video>, 0 iframes, 0 Anfragen an YouTube`);
    }
    if (fall === "youtube") zeilen.push(`a) „${r.a.slice(0, 50)}“`);
  }

  // ── d) Eltern: Freigabe gibt die Skill-Federn dazu ─────────────────────────────────
  {
    const T = (id, tp) => ({ id, datum: h.tagePlus(tp), typ: "training", titel: "Training", gegner: "Training", uhrzeit: "16:45:00", uhrzeit_ende: null, heim: true, ort: "Sportplatz", trainer_status: {} });
    const TOKEN = "x." + Buffer.from(JSON.stringify({ sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600, email: "eltern@example.org" })).toString("base64url") + ".y";
    const e = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1500, breite: 390, hoehe: 844,
      supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
        eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 6 } }], termine: () => [T(1, 2)], rueckmeldungen: [], kind_fanfacts: [], kind_foto: [],
        skill_woche: [SK], abzeichen_meldung: [{ id: 5, spieler_id: 1, abzeichen: "ab2_cruyff", quelle: "abzeichen_silber", created_at: new Date().toISOString() }],
        rpc: { xp_award_event: 20, xp_events_for: [] } }) });
    await e.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
    await e.page.reload({ waitUntil: "networkidle" }); await e.page.waitForTimeout(2200);
    const r = await e.page.evaluate(async () => {
      const w = ms => new Promise(x => setTimeout(x, ms));
      const k = document.querySelector("#fe-bahn .ak-melde");
      const ohneKnopf = !!k && k.classList.contains("ak-skill") && !k.querySelector("button");
      k && [...k.querySelectorAll("button")].find(b => /Ja, geschafft/.test(b.textContent))?.click(); await w(800);
      const slot = document.getElementById("skill-slot");
      return { karte: !!k, ohneKnopf, slot: slot ? slot.textContent.replace(/\s+/g, " ").trim().slice(0, 160) : "", knoepfe: slot ? slot.querySelectorAll("button[onclick^='skillGeschafft']").length : -1 };
    }).catch(x => ({ fehler: String(x) }));
    const award = e.gesendet.filter(x => /xp_award_event/.test(x.pfad)).map(x => typeof x.body === "string" ? x.body : JSON.stringify(x.body));
    await e.schliessen();
    if (r.fehler || !r.karte) probleme.push("d) Eltern " + JSON.stringify(r));
    if (award.length || !r.ohneKnopf)
      probleme.push("d) Federn " + JSON.stringify(award));
    if (r.knoepfe !== 0 || !/Skill des Monats/.test(r.slot)) probleme.push("d) Eltern-Karte des Skills: " + JSON.stringify(r));
    zeilen.push(`d) seit v980: Eltern-Meldung ohne Freigabe-Knopf, ${award.length} Federn-Aufrufe · Eltern-Karte ohne eigene Knöpfe`);
  }

  // ── e) Quelltext ─────────────────────────────────────────────────────────────────────
  const R = h.REPO, lies = f => fs.readFileSync(path.join(R, f), "utf8");
  if (/tile\("kabineSkillWoche\(\)"/.test(lies("md-kabine.js"))) probleme.push("e) Kabine hat noch die Kachel „Skill der Woche“");
  const kasse = lies("md-kasse.js");
  if (!/skw-abz/.test(kasse) || !/video\\\/\[A-Za-z0-9\._-\]\+\\\.mp4/.test(kasse) || !/abzeichen:abz/.test(kasse)) probleme.push("e) Trainer-Eingabe ohne Clip oder Abzeichen");
  const mp = path.join(R, "supabase/migrations/20261124_v963_skill_des_monats.sql");
  const mig = fs.existsSync(mp) ? fs.readFileSync(mp, "utf8") : "";
  if (!/add column if not exists abzeichen text/.test(mig) || !/\^video\//.test(mig)) probleme.push("e) Migration");
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
