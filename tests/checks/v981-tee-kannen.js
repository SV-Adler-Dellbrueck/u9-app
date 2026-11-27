/* v981 · Tee-Kannen als Gegenstände (Charles 26.11.2026, Bild freigegeben; „nur der Hinweis wenn das Kind für den Termin zugesagt hat“)
   a) Training heute, hat begonnen, Kind kommt (Training ohne Rückmeldung = zugesagt): „Unsere zwei Tee-Kannen“, je Kanne „am Platz“/„unterwegs“
      (Wort, nicht nur Farbe), „Ich nehme Kanne 1 mit“ ruft tee_kanne_nehmen(1, Termin, Familienname); danach „Ihr habt Kanne 1 – danke!“
   b) Kind hat für heute abgesagt: kein Mitnehmen-Knopf; vor Beginn des Termins auch nicht
   c) Familie hat Kanne 1, nächstes Training, Kind kommt: „Ihr habt Kanne 1 … Bringt ihr sie … mit warmem Tee mit?“; „Ja, wir bringen Tee mit“
      ruft tee_kanne_bringen(1, Termin); danach „Ihr bringt Kanne 1 mit warmem Tee mit“ und „Doch nicht – austragen“ → tee_kanne_nicht_bringen
   d) Kein Hinweis, wenn das Kind nicht zugesagt hat (Spiel ohne Rückmeldung, Training mit Absage) und nach „Diesmal nicht“
   e) Andere Eltern sehen „unterwegs“ – kein Familienname im Termin
   f) Startkarte: der Hinweis zum Tee-Mitbringen steht offen (#hk-tee ohne Aufklappen), die bloße Übersicht ist eine Zeile zum Aufklappen
   g) Trainer: Termindetail nennt, bei wem die Kanne ist; Anwesenheit „🫖 Tee-Kannen“ mit „ist zurück“ (erster Tipp fragt, zweiter ruft
      tee_kanne_zurueck)
   h) Datenbank und Erinnerung: Migration mit Tabelle, RLS und Funktionen; tee_kanne im Backup; push-cron Teil 2b (v981) erinnert nur
      die Familie mit Kanne, deren Kind morgen kommt; die alte Nachfrage an alle ist weg */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const pruef = (bed, ok, nein) => bed ? zeilen.push(ok) : probleme.push(nein);
  const lokal = x => { const z = new Date(x.getTime() - x.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); };
  const heute = lokal(new Date()), tag = n => { const y = new Date(); y.setDate(y.getDate() + n); return lokal(y); };
  const T = [
    { id: 701, typ: "training", datum: heute, uhrzeit: "00:00:00" },                 // läuft schon
    { id: 702, typ: "training", datum: tag(3), uhrzeit: "17:00:00" },
    { id: 703, typ: "spiel", datum: tag(5), uhrzeit: "10:00:00", gegner: "Gegner" },
    { id: 704, typ: "training", datum: tag(7), uhrzeit: "17:00:00" },
    { id: 705, typ: "training", datum: heute, uhrzeit: "23:59:00" }                  // heute, noch nicht begonnen
  ];
  const rpc = []; let rueck = [], stand = [];
  const leer = () => [{ nr: 1, frei: true, mein: false, seit: null, name: null, tee_termin_id: null }, { nr: 2, frei: false, mein: false, seit: null, name: null, tee_termin_id: null }];
  const ruf = name => (u, req) => { let b = {}; try { b = req.postDataJSON() || {}; } catch (e) {} rpc.push({ name, b });
    if (name === "tee_kanne_nehmen") stand[0] = { nr: 1, frei: false, mein: true, seit: new Date().toISOString(), name: null, tee_termin_id: null };
    if (name === "tee_kanne_bringen") stand[0] = Object.assign({}, stand[0], { tee_termin_id: b.p_termin_id });
    if (name === "tee_kanne_nicht_bringen") stand[0] = Object.assign({}, stand[0], { tee_termin_id: null });
    return true; };
  const attrappe = () => h.supabaseAttrappe({
    kader: h.kaderZeilen(), termine: () => T, event_helfer: [],
    rueckmeldungen: () => rueck,
    rpc: { tee_kanne_stand: () => stand, tee_kanne_nehmen: ruf("tee_kanne_nehmen"), tee_kanne_bringen: ruf("tee_kanne_bringen"),
      tee_kanne_nicht_bringen: ruf("tee_kanne_nicht_bringen"), tee_kanne_zurueck: ruf("tee_kanne_zurueck"), xp_events_for: [] }
  });

  { const s = await h.starten({ start: "/eltern/index.html", warten: 900, supabase: attrappe() });
    const ctl = async (fn, arg) => s.page.evaluate(fn, arg);
    await ctl(async () => { for (let i = 0; i < 60 && typeof teeKannenHtml !== "function"; i++) await new Promise(x => setTimeout(x, 100));
      window._sbUid = () => "ich"; window._elternKids = [{ spieler_id: 1, kader: { name: "Kind A" } }];
      for (const id of ["td-helfer", "helfer-card"]) { if (!document.getElementById(id)) { const b = document.createElement("div"); b.id = id; document.body.appendChild(b); } } });
    const zeig = async (id, karte) => ctl(async ({ id, karte, T }) => {
      const t = T.find(x => x.id === id); await tdHelferLoad(t); if (karte) await elternHelferKachelLoad(t); await new Promise(x => setTimeout(x, 60));
      const td = document.getElementById("td-helfer"), hk = document.getElementById("hk-tee");
      const tk = td.querySelector(".tee-kannen");
      return { text: td.textContent.replace(/\s+/g, " "), tee: tk ? tk.textContent.replace(/\s+/g, " ") : "", knoepfe: [...td.querySelectorAll(".tee-kannen button")].map(b => b.textContent.trim()), zeilen: td.querySelectorAll(".tee-kanne").length,
        hoehe: Math.min(...[...td.querySelectorAll(".tee-kannen button")].map(b => b.getBoundingClientRect().height), 999),
        hk: hk ? { tag: hk.tagName, text: hk.textContent.replace(/\s+/g, " ") } : null };
    }, { id, karte, T });
    const klick = async txt => ctl(async txt => { const b = [...document.querySelectorAll("#td-helfer .tee-kannen button")].find(x => x.textContent.trim().startsWith(txt)); if (b) b.click(); await new Promise(x => setTimeout(x, 500)); return !!b; }, txt);

    // a)
    stand = [{ nr: 1, frei: true, mein: false }, { nr: 2, frei: false, mein: false }]; rueck = [];
    const a1 = await zeig(701, true);
    const geklickt = await klick("Ich nehme Kanne 1 mit");
    const a2 = await zeig(701);
    const n = rpc.find(x => x.name === "tee_kanne_nehmen");
    pruef(/Unsere zwei Tee-Kannen/.test(a1.text) && a1.zeilen === 2 && /am Platz/.test(a1.text) && /unterwegs/.test(a1.text) && a1.knoepfe.join() === "Ich nehme Kanne 1 mit" && a1.hoehe >= 44
      && geklickt && n && n.b.p_nr === 1 && n.b.p_termin_id === 701 && /Familie/.test(n.b.p_name) && /Ihr habt Kanne 1/.test(a2.text) && /danke/.test(a2.text),
      "a) heute, begonnen, Kind kommt: zwei Kannen („am Platz“/„unterwegs“), „Ich nehme Kanne 1 mit“ → tee_kanne_nehmen(1, 701); danach „Ihr habt Kanne 1 – danke!“",
      "a) " + JSON.stringify({ a1, a2, n }));
    if (a1.hk && a1.hk.tag === "DIV" && /Ich nehme Kanne 1 mit/.test(a1.hk.text)) zeilen.push("f) Startkarte: „Ich nehme Kanne 1 mit“ steht offen"); else probleme.push("f) Startkarte am Termin: " + JSON.stringify(a1.hk));

    // b)
    stand = leer(); rueck = [{ termin_id: 701, spieler_id: 1, status: "abgesagt" }];
    const b1 = await zeig(701); rueck = [];
    const b2 = await zeig(705, true);
    pruef(!b1.knoepfe.length && /Ab Beginn des Termins/.test(b1.text) && !b2.knoepfe.length && b2.hk && b2.hk.tag === "DETAILS" && /Tee-Kannen: 1 unterwegs/.test(b2.hk.text),
      "b) Kind abgesagt oder Termin noch nicht begonnen: kein Mitnehmen-Knopf; Startkarte: „🫖 Tee-Kannen: 1 unterwegs“ zum Aufklappen",
      "b) " + JSON.stringify({ b1, b2 }));

    // c)
    rpc.length = 0; stand = [{ nr: 1, frei: false, mein: true, seit: new Date(Date.now() - 86400000).toISOString(), tee_termin_id: null }, { nr: 2, frei: true, mein: false }];
    const c1 = await zeig(702, true);
    await klick("Ja, wir bringen Tee mit");
    const c2 = await zeig(702);
    await klick("Doch nicht");
    const br = rpc.find(x => x.name === "tee_kanne_bringen"), nb = rpc.find(x => x.name === "tee_kanne_nicht_bringen");
    pruef(/Ihr habt Kanne 1/.test(c1.text) && /Bringt ihr sie am .* mit warmem Tee mit\?/.test(c1.text) && c1.knoepfe.join("|") === "Ja, wir bringen Tee mit|Diesmal nicht"
      && br && br.b.p_nr === 1 && br.b.p_termin_id === 702 && /Ihr bringt Kanne 1 mit warmem Tee mit/.test(c2.text) && c2.knoepfe.join() === "Doch nicht – austragen" && nb && nb.b.p_nr === 1
      && c1.hk && c1.hk.tag === "DIV" && /Bringt ihr sie/.test(c1.hk.text),
      "c) Kanne 1 bei uns, Training in 3 Tagen, Kind kommt: „Bringt ihr sie … mit warmem Tee mit?“ → tee_kanne_bringen(1, 702), danach „Ihr bringt Kanne 1 …“ und austragen; Startkarte offen",
      "c) " + JSON.stringify({ c1, c2, br, nb }));

    // d)
    stand = [{ nr: 1, frei: false, mein: true, seit: new Date().toISOString(), tee_termin_id: null }, { nr: 2, frei: true, mein: false }];
    const d1 = await zeig(703);
    rueck = [{ termin_id: 704, spieler_id: 1, status: "abgesagt" }]; const d2 = await zeig(704); rueck = [];
    const d3a = await zeig(704); await klick("Diesmal nicht"); const d3 = await zeig(704);
    pruef(!d1.tee && !d2.tee && /Bringt ihr sie/.test(d3a.tee) && !d3.tee,
      "d) kein Hinweis beim Spiel ohne Zusage, beim Training mit Absage und nach „Diesmal nicht“",
      "d) " + JSON.stringify({ d1: d1.tee, d2: d2.tee, d3a: d3a.tee, d3: d3.tee }));

    // e)
    stand = [{ nr: 1, frei: false, mein: false, seit: null, name: null }, { nr: 2, frei: true, mein: false }];
    const e1 = await zeig(702);
    pruef(/Kanne 1 unterwegs/.test(e1.tee) && !/Kind \w+ Familie|Kind As/.test(e1.tee), "e) andere Eltern: „unterwegs“ ohne Familiennamen", "e) " + e1.tee.slice(0, 200));
    const fe = s.fehler(); await s.schliessen();
    if (fe.length) probleme.push("Konsole Eltern: " + fe.slice(0, 2).join(" | "));
  }

  // g) Trainer
  { rpc.length = 0; stand = [{ nr: 1, frei: false, mein: false, seit: new Date(Date.now() - 8 * 86400000).toISOString(), name: "Kind As Familie", tee_termin_id: null }, { nr: 2, frei: true, mein: false }];
    const s = await h.starten({ supabase: attrappe(), hoehe: 2000 });
    await h.sichtbarMachen(s.page, "#aw-list");
    const r = await s.page.evaluate(async ({ T }) => {
      const w = ms => new Promise(x => setTimeout(x, ms));
      for (let i = 0; i < 60 && typeof teeAnwesenheitRender !== "function"; i++) await w(100);
      const b = document.createElement("div"); b.id = "helfer-tm-702"; document.body.appendChild(b);
      await helferTrainerFill(T.find(x => x.id === 702));
      awRenderList(); await w(500);
      const sec = document.getElementById("tee-aw"), k = sec && sec.querySelector('button[data-nr="1"]');
      const o = { detail: b.textContent.replace(/\s+/g, " "), aw: sec ? sec.textContent.replace(/\s+/g, " ") : "", hoehe: k ? k.getBoundingClientRect().height : 0 };
      if (k) { k.click(); await w(100); o.nachEins = k.textContent; k.click(); await w(400); }
      return o;
    }, { T });
    const fe = s.fehler(); await s.schliessen();
    const z = rpc.filter(x => x.name === "tee_kanne_zurueck");
    pruef(/Tee-Kannen/.test(r.detail) && /bei Kind As Familie/.test(r.detail) && /2 am Platz/.test(r.detail) && /Kanne 1/.test(r.aw) && /seit 8 Tagen/.test(r.aw) && r.hoehe >= 44
      && /nochmal tippen/.test(r.nachEins || "") && z.length === 1 && z[0].b.p_nr === 1,
      "g) Trainer: Termindetail „bei Kind As Familie“, Anwesenheit „🫖 Tee-Kannen“ (seit 8 Tagen), „ist zurück“: erster Tipp fragt, zweiter → tee_kanne_zurueck(1)",
      "g) " + JSON.stringify({ r, z }));
    if (fe.length) probleme.push("Konsole Trainer: " + fe.slice(0, 2).join(" | "));
  }

  // h)
  const mig = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20261127_v981_tee_kannen.sql"), "utf8");
  const pc = fs.readFileSync(path.join(h.REPO, "supabase/functions/push-cron/index.ts"), "utf8");
  const views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  pruef(/create table if not exists public\.tee_kanne/.test(mig) && /enable row level security/.test(mig) && ["tee_kanne_stand", "tee_kanne_nehmen", "tee_kanne_bringen", "tee_kanne_nicht_bringen", "tee_kanne_zurueck"].every(f => mig.includes("function public." + f))
      && /revoke all on function public\.tee_kanne_stand\(\)[^;]*from public, anon/.test(mig)
      && /"tee_kanne"/.test(views.slice(views.indexOf('const tables=["kader"'), views.indexOf("];", views.indexOf('const tables=["kader"'))))
      && /Teil 2b \(v981\): Tee-Kannen/.test(pc) && /from\("tee_kanne"\)/.test(pc) && /tM\.typ === "training" && !st\[id\]/.test(pc) && !/Mag jemand den Tee übernehmen/.test(pc) && !/Morgen eine Teekanne mitnehmen/.test(pc),
    "h) Migration (Tabelle, RLS, fünf Funktionen, anon ausgeschlossen), tee_kanne im Backup, push-cron Teil 2b nur an die Familie mit Kanne, deren Kind morgen kommt",
    "h) Migration/Backup/push-cron unvollständig");

  return h.ergebnis("v981 Tee-Kannen: mitnehmen, merken, mit Tee zurückbringen", !probleme.length, zeilen.concat(probleme));
};
