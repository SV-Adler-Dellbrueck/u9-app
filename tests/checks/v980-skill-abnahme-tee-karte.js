/* v980 · (Charles 26.11.2026)
   a) Eltern-Startkarte „Nächster Termin“: Becher-Hinweis und Tee-Staffel („Für den nächsten Tee“) stehen jetzt auch hier – vorher nur im
      Termin-Fenster („Seh nichts davon“); „Ich nehme eine Kanne mit“ trägt am nächsten Termin ein
   b) Kind: Beim Skill des Monats heißt der Knopf „Ich kann's – beim Training zeigen“, danach „Zeig es deinem Trainer …“;
      andere Abzeichen melden weiter „Ich hab's geschafft!“ an Mama oder Papa
   c) Eltern-Startseite: Meldung zum Skill des Monats ohne Freigabe-Knöpfe („möchte es beim nächsten Training zeigen“);
      Meldungen zu anderen Abzeichen behalten „Ja, geschafft“
   d) Eltern-Abzeichendetail: kein Abhaken für den Skill des Monats (Hinweis auf den Trainer); im Trainer-Bereich schon
   e) Trainer, Anwesenheit: „Skill des Monats abnehmen“ mit den anwesenden Kindern, gemeldete zuerst; erster Tipp fragt nur, zweiter vergibt
      (xp_award_event mit dem Abzeichen) */
"use strict";
const TEE = "🫖 Tee mitbringen";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const pruef = (bed, ok, nein) => bed ? zeilen.push(ok) : probleme.push(nein);
  const K = h.KINDER;
  const d = new Date(); d.setDate(d.getDate() + ((2 - d.getDay() + 7) % 7) + 7);
  const iso = x => x.toISOString().slice(0, 10), plus = n => { const y = new Date(d); y.setDate(y.getDate() + n); return iso(y); };
  const termine = [{ id: 501, typ: "training", datum: iso(d), uhrzeit: "17:00:00" }, { id: 503, typ: "training", datum: plus(3), uhrzeit: "17:00:00" }];
  let helfer = [{ id: 1, termin_id: 501, name: "Kind As Familie", aufgabe: TEE, user_id: "u-a" }];
  const posts = [], awards = [];
  const filt = (u) => {
    let r = termine.slice(); const dat = u.searchParams.get("datum") || "";
    if (dat.startsWith("gte.")) r = r.filter(t => t.datum >= dat.slice(4)); else if (dat.startsWith("lte.")) r = r.filter(t => t.datum <= dat.slice(4));
    const desc = /datum\.desc/.test(u.searchParams.get("order") || ""); r.sort((a, b) => (a.datum + a.uhrzeit).localeCompare(b.datum + b.uhrzeit) * (desc ? -1 : 1)); return r;
  };
  const skill = [{ id: 2, titel: "Cruyff-Drehung", video_url: "https://www.youtube.com/watch?v=ru0-VpKAEXE", beschreibung: "Dreh dich 5-mal mit dem Ball um und lauf weiter.", abzeichen: "ab2_cruyff", aktiv: true }];
  const meld = [{ id: 11, spieler_id: 1, abzeichen: "ab2_cruyff", quelle: "abzeichen_silber" }, { id: 12, spieler_id: 1, abzeichen: "ab_sohle", quelle: "abzeichen" }, { id: 13, spieler_id: 4, abzeichen: "ab2_cruyff", quelle: "abzeichen_silber" }];
  const attrappe = () => h.supabaseAttrappe({
    kader: h.kaderZeilen(), termine: filt, skill_woche: () => skill,
    abzeichen_meldung: (u) => { const sp = u.searchParams.get("spieler_id") || ""; if (sp.startsWith("eq.")) return meld.filter(m => m.spieler_id === Number(sp.slice(3))); if (sp.startsWith("in.(")) { const l = sp.slice(4, -1).split(",").map(Number); return meld.filter(m => l.includes(m.spieler_id)); } return meld; },
    event_helfer: (u, req) => {
      if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); posts.push(b); helfer.push(Object.assign({ id: 100 + posts.length, user_id: "ich" }, b)); return { status: 201, body: "[]" }; }
      const tid = Number((u.searchParams.get("termin_id") || "").replace("eq.", "")), auf = u.searchParams.get("aufgabe");
      return helfer.filter(x => x.termin_id === tid && (!auf || x.aufgabe === auf.replace(/^eq\./, "")));
    },
    rpc: { xp_events_for: [], xp_award_event: (u, req) => { let b = {}; try { b = req.postDataJSON() || {}; } catch (e) {} awards.push(b); return 20; } }
  });

  // ── Eltern-Seite: a, b, c, d ──
  { const s = await h.starten({ start: "/eltern/index.html", warten: 900, supabase: attrappe() });
    const r = await s.page.evaluate(async ({ termine, K }) => {
      const w = ms => new Promise(x => setTimeout(x, ms));
      for (let i = 0; i < 60 && (typeof elternHelferKachelLoad !== "function" || typeof abzeichenDetail !== "function"); i++) await w(100);
      window._sbUid = () => "ich"; window.ELTERN_TERMINE = termine;
      const box = id => { let b = document.getElementById(id); if (!b) { b = document.createElement("div"); b.id = id; document.body.appendChild(b); } return b; };
      const o = {};
      box("helfer-card"); await elternHelferKachelLoad(termine[0]); await w(50);
      const hk = () => document.getElementById("hk-tee-staffel");
      o.a = { becher: (document.querySelector("#helfer-card .hk-becher") || {}).textContent || "", staffel: hk() ? hk().textContent.replace(/\s+/g, " ") : "", kannen: hk() ? hk().querySelectorAll(".tee-kanne").length : 0, wer: !!document.querySelector("#helfer-card button") };
      const kn = hk() && [...hk().querySelectorAll("button")].find(b => /Ich nehme eine Kanne mit/.test(b.textContent)); if (kn) kn.click(); await w(400);
      o.a.nach = hk() ? hk().textContent.replace(/\s+/g, " ") : "";
      // b) Kind
      await abzeichenStandLaden(2);
      abzeichenDetail("ab2_cruyff", 2, 1); await w(30);
      const det = () => document.getElementById("abz-detail");
      o.b = { skill: det() ? det().textContent.replace(/\s+/g, " ") : "" }; det()?.remove();
      abzeichenDetail("ab_trick", 1, 1); await w(30); o.b.anders = det() ? det().textContent.replace(/\s+/g, " ") : ""; det()?.remove();
      // c) Eltern-Startseite
      box("akademie-melde-slot"); await elternAkademieMeldungen([{ spieler_id: 1, kader: { name: K[0] } }]); await w(30);
      const sk = document.querySelector(".ak-skill"), andere = [...document.querySelectorAll(".ak-melde:not(.ak-skill)")];
      o.c = { skill: sk ? sk.textContent.replace(/\s+/g, " ") : "", skillKnoepfe: sk ? sk.querySelectorAll("button").length : -1, andereJa: andere.some(k => /Ja/.test(k.textContent) && k.querySelector("button")) };
      // d) Eltern-Detail (nicht Kindermodus)
      abzeichenDetail("ab2_cruyff", 1, 0); await w(30);
      o.d = { text: det() ? det().textContent.replace(/\s+/g, " ") : "", abhaken: det() ? [...det().querySelectorAll("button")].some(b => /abzeichenAward/.test(b.getAttribute("onclick") || "")) : null }; det()?.remove();
      return o;
    }, { termine, K });
    const fe = s.fehler(); await s.schliessen();
    pruef(/Becher bringen die Kinder selbst mit/.test(r.a.becher) && /Für den nächsten Tee/.test(r.a.staffel) && r.a.kannen === 2 && posts.some(p => p.termin_id === 503 && p.aufgabe === TEE) && /Du nimmst eine Kanne mit/.test(r.a.nach),
      "a) Startkarte: Becher-Hinweis und „Für den nächsten Tee“ mit 2 Kannen; „Ich nehme eine Kanne mit“ trägt am nächsten Termin ein", "a) " + JSON.stringify({ a: r.a, posts }));
    pruef(/Ich kann's – beim Training zeigen/.test(r.b.skill) && /Trainer/.test(r.b.skill) && /Ich hab's geschafft!/.test(r.b.anders) && /Mama oder Papa/.test(r.b.anders),
      "b) Kind: Skill „Ich kann's – beim Training zeigen“; andere Abzeichen weiter „Ich hab's geschafft!“", "b) " + JSON.stringify(r.b));
    pruef(/möchte es beim nächsten Training zeigen/.test(r.c.skill) && r.c.skillKnoepfe === 0 && r.c.andereJa,
      "c) Eltern-Startseite: Skill-Meldung ohne Freigabe-Knopf, andere Meldungen mit „Ja, geschafft“", "c) " + JSON.stringify(r.c));
    pruef(r.d.abhaken === false && /Abgenommen wird beim Training von einem Trainer/.test(r.d.text),
      "d) Eltern-Detail: kein Abhaken beim Skill des Monats, Hinweis auf den Trainer", "d) " + JSON.stringify(r.d));
    if (fe.length) probleme.push("Konsole Eltern: " + fe.slice(0, 2).join(" | ")); }

  // ── Trainer: e, d ──
  { const s = await h.starten({ supabase: attrappe(), hoehe: 2000 });
    await h.sichtbarMachen(s.page, "#aw-list");
    const r = await s.page.evaluate(async ({ K }) => {
      const w = ms => new Promise(x => setTimeout(x, ms));
      for (let i = 0; i < 60 && typeof skillAbnahmeRender !== "function"; i++) await w(100);
      await loadKader();
      const heute = isoLokal(), de = document.getElementById("aw-date");
      if (de) { if (![...de.options || []].some(o => o.value === heute)) { const o = document.createElement("option"); o.value = heute; o.textContent = heute; de.appendChild(o); } de.value = heute; }
      AW_DATA[heute] = {}; [K[0], K[1], K[3]].forEach(n => AW_DATA[heute][n] = { da: true, qual: 0 });
      awRenderList(); await w(400);
      const sec = () => document.getElementById("skab");
      const namen = () => [...(sec() ? sec().querySelectorAll(".skab-zeile") : [])].map(z => z.textContent.replace(/\s+/g, " ").trim());
      const o = { da: !!sec(), titel: sec() ? sec().textContent.slice(0, 80) : "", reihe: namen(), hoehe: sec() ? Math.min(...[...sec().querySelectorAll(".skab-zeile")].map(b => b.getBoundingClientRect().height)) : 0 };
      const b = sec() && sec().querySelector('button[data-sid="1"]');
      b.click(); await w(100); o.nachEins = (b.textContent || "").replace(/\s+/g, " ");
      b.click(); await w(500);
      abzeichenDetail("ab2_cruyff", 2, 0); await w(30);
      const det = document.getElementById("abz-detail"); o.trainerAbhaken = det ? [...det.querySelectorAll("button")].some(x => /abzeichenAward/.test(x.getAttribute("onclick") || "")) : null; det?.remove();
      return o;
    }, { K });
    const fe = s.fehler(); await s.schliessen();
    const nur3 = r.reihe.length === 3 && /möchte zeigen/.test(r.reihe[0]) && /möchte zeigen/.test(r.reihe[1]) && !/möchte zeigen/.test(r.reihe[2]);
    pruef(r.da && nur3 && r.hoehe >= 44 && /nochmal tippen/.test(r.nachEins) && awards.length === 2 && awards[0].p_quelle === "abzeichen_silber" && awards[0].p_quelle_id === "ab2_cruyff" && Number(awards[0].p_spieler_id) === 1 && awards[1].p_quelle === "skillwoche" && awards[1].p_quelle_id === "2",
      `e) Anwesenheit: „Skill des Monats abnehmen“ mit 3 anwesenden Kindern (gemeldete zuerst, ≥ 44 px); erster Tipp fragt, zweiter vergibt ab2_cruyff und die Skill-Federn`, "e) " + JSON.stringify({ r, awards }));
    pruef(r.trainerAbhaken === true, "d) Trainer-Bereich: Abhaken im Abzeichendetail bleibt möglich", "d) Trainer kann nicht abhaken");
    if (fe.length) probleme.push("Konsole Trainer: " + fe.slice(0, 2).join(" | ")); }

  return h.ergebnis("v980 Skill des Monats beim Training abnehmen; Tee-Staffel und Becher in der Eltern-Startkarte", !probleme.length, zeilen.concat(probleme));
};
