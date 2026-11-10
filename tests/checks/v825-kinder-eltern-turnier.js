/* v825 · Kinder-Eltern-Turnier (Charles 10.11.2026).
   Ein Event bekommt beim Anlegen den Haken „Kinder-Eltern-Turnier“. Eltern tragen in ihrer App ein,
   wer von den Erwachsenen mitspielt (ein Tipp für sich selbst, weitere per Namen); der Trainer
   übernimmt die Liste ins Trainingsturnier „Kinder gegen Eltern“.

   a) Formular „Neuer Termin“: der Haken erscheint nur beim Event, und der neue Termin trägt
      eltern_turnier nur, wenn er gesetzt ist (vor der Migration darf kein Feld mitgehen, das es nicht gibt).
   b) Eltern: der Termin zeigt den Block mit Text; „Ich spiele mit“ legt eine Zeile mit selbst=true an,
      ein zweiter Tipp löscht sie; ein Name im Feld legt eine Zeile mit selbst=false an; fremde Zeilen
      haben keinen Lösch-Knopf; alle Bedienelemente mind. 44 px.
   c) Ohne Haken am Termin gibt es den Block nicht.
   d) Trainer: das Fenster nennt die Zahl; „Ins Trainingsturnier übernehmen“ stellt den Modus
      „Kinder gegen Eltern“ ein und verteilt alle Erwachsenen auf Eltern-Teams – keiner landet in
      einem Kinder-Team, auch nicht nach einem Tipp (weiterschieben); doppelte Namen bleiben unterscheidbar. */
"use strict";
module.exports = async function (h) {
  const titel = "v825 Kinder-Eltern-Turnier: Haken am Event, Eltern tragen Mitspieler ein, Übergabe ins Trainingsturnier";
  const probleme = [], zeilen = [];
  const datum = h.tagePlus(5);
  const termin = (et) => ({ id: 70, datum, uhrzeit: "17:00", uhrzeit_ende: "18:30", typ: "event", titel: "Weihnachtsfeier", ort: "Vereinsheim", mitbringen: false, eltern_turnier: et, trainer_status: {} });

  // ── Eltern ──
  const TOKEN = "x." + Buffer.from(JSON.stringify({ sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600, email: "eltern@example.org" })).toString("base64url") + ".y";
  const eltern = async (et) => {
    let zeilenDb = [{ id: 1, name: "Erwachsener A", selbst: true, created_by: "u9", termin_id: 70 }], naechste = 2;
    const tabelle = (u, req) => {
      const m = req.method();
      if (m === "POST") { const b = JSON.parse(req.postData() || "{}"); zeilenDb.push({ id: naechste++, name: b.name, selbst: !!b.selbst, created_by: "u1", termin_id: b.termin_id }); return []; }
      if (m === "DELETE") { const id = Number((String(u.search).match(/id=eq\.(\d+)/) || [])[1]); zeilenDb = zeilenDb.filter(x => x.id !== id); return []; }
      return zeilenDb;
    };
    const e = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1000, breite: 390, hoehe: 844,
      supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
        eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
        termine: [termin(et)], rueckmeldungen: [], event_mitspieler: tabelle, eltern_angaben: [{ vorname: "Erwachsener", nachname: "Beispiel" }] }) });
    await e.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
    await e.page.reload({ waitUntil: "networkidle" }); await e.page.waitForTimeout(4000);
    const r = await e.page.evaluate(async () => {
      const w = ms => new Promise(x => setTimeout(x, ms));
      if (typeof mitspielerLoad !== "function") return { alt: true };
      const box = () => document.getElementById("mitspieler-card");
      if (!box() || !box().querySelector(".ms-block")) return { block: false };
      const out = { block: true, text: /Kinder gegen Eltern/.test(box().innerText), namen0: [...box().querySelectorAll(".ms-zeile b")].map(x => x.textContent) };
      out.klein = [...box().querySelectorAll("button, input")].filter(x => x.getBoundingClientRect().height > 0 && x.getBoundingClientRect().height < 43.5).map(x => (x.textContent || x.placeholder).trim().slice(0, 14));
      out.fremdLoeschbar = [...box().querySelectorAll(".ms-zeile")].some(z => /Erwachsener A/.test(z.textContent) && z.querySelector("button"));
      box().querySelector(".ms-ich").click(); await w(900);
      out.nachIch = { gedrueckt: box().querySelector(".ms-ich").getAttribute("aria-pressed"), namen: [...box().querySelectorAll(".ms-zeile b")].map(x => x.textContent) };
      const feld = box().querySelector("input"); feld.value = "Gast Eins"; feld.nextElementSibling.click(); await w(900);
      out.nachGast = [...box().querySelectorAll(".ms-zeile b")].map(x => x.textContent);
      out.gastLoeschbar = [...box().querySelectorAll(".ms-zeile")].some(z => /Gast Eins/.test(z.textContent) && z.querySelector("button"));
      box().querySelector(".ms-ich").click(); await w(900);
      out.nachZurueck = { gedrueckt: box().querySelector(".ms-ich").getAttribute("aria-pressed"), namen: [...box().querySelectorAll(".ms-zeile b")].map(x => x.textContent) };
      return out;
    });
    const gesendet = e.gesendet.filter(x => /event_mitspieler/.test(x.pfad)).map(x => ({ m: x.methode, b: x.body }));
    const f = e.fehler(); await e.schliessen();
    if (f.length) probleme.push("Konsole (Eltern): " + f.slice(0, 2).join(" | "));
    return { r, gesendet };
  };
  const mit = await eltern(true);
  if (mit.r.alt) return h.ergebnis(titel, false, ["kein Mitspieler-Block (Stand vor v825)"]);
  const b = mit.r;
  if (!b.block || !b.text) probleme.push("b) Block oder Text fehlt: " + JSON.stringify(b));
  else {
    if (b.klein.length) probleme.push("b) unter 44 px: " + b.klein.join(", "));
    if (b.fremdLoeschbar) probleme.push("b) fremde Zeile hat einen Lösch-Knopf");
    if (b.nachIch.gedrueckt !== "true" || b.nachIch.namen.length !== 2) probleme.push("b) „Ich spiele mit“: " + JSON.stringify(b.nachIch));
    if (b.nachGast.indexOf("Gast Eins") < 0 || !b.gastLoeschbar) probleme.push("b) weitere Person: " + JSON.stringify(b.nachGast) + ", löschbar " + b.gastLoeschbar);
    if (b.nachZurueck.gedrueckt !== "false" || b.nachZurueck.namen.length !== 2) probleme.push("b) Zurücknehmen: " + JSON.stringify(b.nachZurueck));
    const posts = mit.gesendet.filter(x => x.m === "POST").map(x => x.b);
    if (posts.length !== 2 || posts[0].selbst !== true || !/^Erwachsener B\.$/.test(posts[0].name) || posts[1].selbst !== false || posts[1].name !== "Gast Eins" || posts.some(p => p.termin_id !== 70 || "created_by" in p))
      probleme.push("b) gesendet: " + JSON.stringify(posts));
    if (mit.gesendet.filter(x => x.m === "DELETE").length !== 1) probleme.push("b) Zurücknehmen löscht nicht genau eine Zeile");
  }
  const ohne = await eltern(false);
  if (ohne.r.block) probleme.push("c) Block steht auch ohne den Haken am Termin");

  // ── Trainer ──
  const namen = ["Erwachsener A", "Erwachsener B", "Gast Eins", "Gast Eins", "Erwachsener C", "Erwachsener D", "Erwachsener E"];
  const s = await h.starten({ breite: 390, hoehe: 844, warten: 2000,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [termin(true)], nominierungen: [], anwesenheit: [], periodisierung: [], trainingsbloecke: [],
      event_mitspieler: namen.map((n, i) => ({ id: i + 1, name: n, selbst: i < 2, created_by: "u" + i, termin_id: 70 })) }) });
  await h.sichtbarMachen(s.page, "#main-app");
  const t = await s.page.evaluate(async (datum) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    await loadKader(); go("termine"); await w(1200);
    const out = {};
    // a) Formular
    const zeile = document.getElementById("tm-elternturnier-row");
    if (typeof tmSetTyp === "function") { tmSetTyp("training", document.querySelector('.seg-btn[data-val="training"]')); await w(100); out.beiTraining = zeile ? getComputedStyle(zeile).display : "fehlt";
      tmSetTyp("event", document.querySelector('.seg-btn[data-val="event"]')); await w(100); out.beiEvent = zeile ? getComputedStyle(zeile).display : "fehlt"; }
    // d) Fenster und Übergabe
    for (let i = 0; i < 60 && typeof elternTurnierOpen !== "function"; i++) await w(100);
    localStorage.removeItem("adler_blitz");
    await elternTurnierOpen(70, datum); await w(800);
    out.anzahl = (document.getElementById("et-anzahl") || {}).textContent || "";
    out.zeilen = document.querySelectorAll("#et-modal .et-zeile").length;
    await elternTurnierUebernehmen(70, datum); await w(600);
    out.modus = BLZ.spielmodus; out.datum = BLZ.datum === datum; out.fenster = !!document.getElementById("blitz-modal") && !document.getElementById("et-modal");
    const et = BLZ.teams.filter(x => x.eltern), kt = BLZ.teams.filter(x => !x.eltern);
    const erw = et.flatMap(x => x.spieler.filter(n => n.indexOf("👤 ") === 0));
    out.elternTeams = et.length; out.verteilt = erw.length; out.eindeutig = new Set(erw).size; out.groessen = et.map(x => x.spieler.length);
    out.inKinderteam = kt.some(x => x.spieler.some(n => n.indexOf("👤 ") === 0));
    out.kinderImElternteam = et.some(x => x.spieler.some(n => n.indexOf("👤 ") !== 0 && n.indexOf("🧢 ") !== 0));
    for (let i = 0; i < BLZ.teams.length + 1; i++) blzCycle(erw[0]);   // einmal rundum schieben
    out.nachSchieben = BLZ.teams.filter(x => !x.eltern).some(x => x.spieler.indexOf(erw[0]) >= 0) ? "Kinderteam" : (BLZ.teams.some(x => x.eltern && x.spieler.indexOf(erw[0]) >= 0) ? "Elternteam" : "weg");
    return out;
  }, datum);
  const f = s.fehler(); await s.schliessen();
  if (f.length) probleme.push("Konsole (Trainer): " + f.slice(0, 2).join(" | "));
  if (t.beiTraining !== "none" || t.beiEvent === "none" || t.beiEvent === "fehlt") probleme.push(`a) Haken: bei Training ${t.beiTraining}, bei Event ${t.beiEvent}`);
  if (!/^7 Erwachsene spielen mit/.test(t.anzahl) || t.zeilen !== 7) probleme.push(`d) Fenster: „${t.anzahl}“, ${t.zeilen} Zeilen`);
  if (t.modus !== "duell" || !t.datum || !t.fenster) probleme.push("d) Übergabe: " + JSON.stringify({ modus: t.modus, datum: t.datum, fenster: t.fenster }));
  if (t.verteilt !== 7 || t.eindeutig !== 7 || t.inKinderteam || t.kinderImElternteam) probleme.push("d) Verteilung: " + JSON.stringify(t));
  if (t.elternTeams < 1 || Math.max(...t.groessen) - Math.min(...t.groessen) > 1) probleme.push("d) Eltern-Teams ungleich: " + t.groessen.join("/"));
  if (t.nachSchieben !== "Elternteam") probleme.push("d) nach dem Weiterschieben steht der Erwachsene im " + t.nachSchieben);

  // a) statisch: das Feld geht nur mit, wenn der Haken gesetzt ist
  const kal = require("fs").readFileSync(require("path").join(h.REPO, "md-kalender.js"), "utf8");
  if (!/if\(tmTyp==="event"&&document\.getElementById\("tm-elternturnier"\)\?\.checked\)body\.eltern_turnier=true;/.test(kal)) probleme.push("a) eltern_turnier wird nicht nur bei gesetztem Haken mitgeschickt");

  zeilen.push(`Eltern: Block mit Text, Ich/Gast/Zurück ok · Trainer: „${t.anzahl}“ → ${t.elternTeams} Eltern-Teams (${t.groessen.join("/")}), Modus ${t.modus}`);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
