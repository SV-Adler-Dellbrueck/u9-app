/* v969 · Tee-Staffel (Charles 26.11.2026): zwei Pumpkannen, eigene Becher.
   a) Termin davor (Training): Box „Für den nächsten Tee“ mit je Kanne einer Zeile (Wort, nicht nur Farbe) und „Ich nehme eine Kanne mit“;
      der Knopf trägt am NÄCHSTEN Termin ein (event_helfer, aufgabe „🫖 Tee mitbringen“), gezeichnet wird weiter der offene Termin
   b) Ist man eingetragen: „✓ Du nimmst eine Kanne mit · austragen“; sind alle Kannen vergeben: kein Knopf
   c) Die Tee-Aufgabe am Termin mit Tee nennt den Termin davor („Am Dienstag … nach dem Training … Pumpkannen“);
      liegt der Termin davor schon zurück: „beim Trainerteam“
   d) Becher-Hinweis bei Training/Spiel/Turnier, nicht bei sonstigen Terminen; ausgefallene Termine überspringt die Staffel
   e) Trainer-Termindetail: „Kannen für den Tee am …“ mit „frei: n“
   g) Freiwillig (Charles 26.11.): kein „fehlt“, Bitte statt Pflicht
   f) push-cron kennt Erinnerung und Nachfrage (Teil 2b), fragt Eingetragene nicht und liest platz_status */
"use strict";
const fs = require("fs"), path = require("path");
const TEE = "🫖 Tee mitbringen";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  // Dienstag in einer Woche als Termin davor, Freitag danach als Tee-Termin; dazwischen ein ausgefallenes Training (Donnerstag)
  const d = new Date(); d.setDate(d.getDate() + ((2 - d.getDay() + 7) % 7) + 7);
  const iso = x => x.toISOString().slice(0, 10), plus = n => { const y = new Date(d); y.setDate(y.getDate() + n); return iso(y); };
  const DI = iso(d), DO = plus(2), FR = plus(3), DI2 = plus(7);
  const termine = [
    { id: 501, typ: "training", datum: DI, uhrzeit: "17:00:00" },
    { id: 502, typ: "training", datum: DO, uhrzeit: "17:00:00", platz_status: "abgesagt" },
    { id: 503, typ: "training", datum: FR, uhrzeit: "17:00:00" },
    { id: 504, typ: "event", datum: FR, uhrzeit: "19:00:00", titel: "Feier" },
    { id: 505, typ: "training", datum: DI2, uhrzeit: "17:00:00" }
  ];
  let helfer = [{ id: 1, termin_id: 503, name: "Kind As Familie", aufgabe: TEE, user_id: "u-a" }];
  const posts = [], deletes = [];
  const filt = (u) => {
    let r = termine.slice();
    const typ = u.searchParams.get("typ"); if (typ && typ.startsWith("in.(")) { const l = typ.slice(4, -1).split(","); r = r.filter(t => l.includes(t.typ)); }
    const dat = u.searchParams.get("datum") || "";
    if (dat.startsWith("gte.")) r = r.filter(t => t.datum >= dat.slice(4)); else if (dat.startsWith("lte.")) r = r.filter(t => t.datum <= dat.slice(4)); else if (dat.startsWith("eq.")) r = r.filter(t => t.datum === dat.slice(3));
    const desc = /datum\.desc/.test(u.searchParams.get("order") || "");
    r.sort((a, b) => (a.datum + a.uhrzeit).localeCompare(b.datum + b.uhrzeit) * (desc ? -1 : 1));
    return r;
  };
  const s = await h.starten({ start: "/eltern/index.html", warten: 900, supabase: h.supabaseAttrappe({
    termine: filt,
    event_helfer: (u, req) => {
      if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); posts.push(b); helfer.push(Object.assign({ id: 100 + posts.length, user_id: "ich" }, b)); return { status: 201, body: "[]" }; }
      if (req.method() === "DELETE") { deletes.push(u.search); const tid = Number((u.searchParams.get("termin_id") || "").replace("eq.", "")); helfer = helfer.filter(x => !(x.termin_id === tid && x.user_id === "ich")); return { status: 204, body: "" }; }
      const tid = Number((u.searchParams.get("termin_id") || "").replace("eq.", "")), auf = u.searchParams.get("aufgabe");
      return helfer.filter(x => x.termin_id === tid && (!auf || x.aufgabe === auf.replace(/^eq\./, "")));
    } }) });
  const r = await s.page.evaluate(async ({ termine, TEE }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 60 && typeof teeStaffelHtml !== "function"; i++) await w(100);
    if (typeof teeStaffelHtml !== "function") return { fehlt: true };
    window._sbUid = () => "ich";
    window.ELTERN_TERMINE = termine;
    const box = id => { let b = document.getElementById(id); if (!b) { b = document.createElement("div"); b.id = id; document.body.appendChild(b); } return b; };
    const td = box("td-helfer"), T = id => termine.find(x => x.id === id);
    const out = {};
    await tdHelferLoad(T(501)); await w(50);
    const st = () => document.getElementById("td-tee-staffel");
    const kn = () => [...(st() ? st().querySelectorAll("button") : [])].map(b => ({ t: b.textContent.trim(), h: b.getBoundingClientRect().height }));
    out.a = { da: !!st(), text: st() ? st().textContent.replace(/\s+/g, " ") : "", zeilen: st() ? st().querySelectorAll(".tee-kanne").length : 0, knopf: kn() };
    const b1 = st() && st().querySelector("button"); if (b1) b1.click(); await w(400);
    out.b = { text: st() ? st().textContent.replace(/\s+/g, " ") : "", knopf: kn() };
    const b2 = st() && st().querySelector("button"); if (b2) b2.click(); await w(400);
    out.b2 = { knopf: kn() };
    await tdHelferLoad(T(503)); await w(50);
    out.c = td.textContent.replace(/\s+/g, " ");
    const vorbei = Object.assign({}, T(503), { _teeVorher: { id: 9, typ: "training", datum: "2020-01-07", uhrzeit: "17:00:00" } });
    out.c2 = teeBeschreibung(vorbei);
    out.d = ["training", "spiel", "turnier", "event"].map(typ => /eigenen Becher/.test(tdDetailOben(Object.assign({}, T(501), { typ })))) ;
    out.d2 = /eigenen Becher/.test(tdDetailOben(T(502)));
    // e) Trainer-Ansicht
    if (typeof helferTrainerFill === "function") { box("helfer-tm-501"); await helferTrainerFill(T(501)); await w(50); out.e = document.getElementById("helfer-tm-501").textContent.replace(/\s+/g, " "); }
    return out;
  }, { termine, TEE });
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) probleme.push("teeStaffelHtml fehlt");
  else {
    if (!r.a.da || r.a.zeilen !== 2 || !/Für den nächsten Tee/.test(r.a.text) || !/Kind As Familie/.test(r.a.text) || !/✓ steht/.test(r.a.text) || !/frei/.test(r.a.text) || /fehlt/.test(r.a.text) || !/freiwillig/.test(r.a.text) || !r.a.knopf.length || r.a.knopf[0].t !== "Ich nehme eine Kanne mit" || r.a.knopf[0].h < 44)
      probleme.push("a) " + JSON.stringify(r.a).slice(0, 300));
    else zeilen.push(`a) Termin davor: zwei Kannen-Zeilen („✓ steht“/„frei“, „freiwillig“), Knopf „${r.a.knopf[0].t}“ ${Math.round(r.a.knopf[0].h)} px`);
    const p = posts[0] || {};
    if (p.termin_id !== 503 || p.aufgabe !== TEE) probleme.push("a) Eintrag nicht am nächsten Termin: " + JSON.stringify(posts));
    if (!r.b.knopf.length || !/Du nimmst eine Kanne mit/.test(r.b.knopf[0].t) || !/Für den nächsten Tee/.test(r.b.text)) probleme.push("b) nach dem Eintragen: " + JSON.stringify(r.b).slice(0, 300));
    if (!deletes.some(q => /termin_id=eq\.503/.test(q))) probleme.push("b) Austragen nicht am nächsten Termin: " + JSON.stringify(deletes));
    if (!probleme.length) zeilen.push("a/b) Eintragen und Austragen am nächsten Termin (503), angezeigt bleibt der offene Termin");
    if (!/Am Dienstag, .* nach dem Training eine der Pumpkannen mitnehmen/.test(r.c)) probleme.push("c) Beschreibung ohne Termin davor: " + r.c.slice(0, 260));
    if (!/beim Trainerteam/.test(r.c2)) probleme.push("c) Termin davor vorbei: " + r.c2);
    if (!probleme.some(x => x.startsWith("c)"))) zeilen.push("c) Tee-Aufgabe nennt den Termin davor (Dienstag, ausgefallener Donnerstag übersprungen), sonst „beim Trainerteam“");
    if (r.d.join() !== "true,true,true,false" || r.d2) probleme.push("d) Becher: " + JSON.stringify([r.d, r.d2]));
    else zeilen.push("d) Becher-Hinweis bei Training, Spiel, Turnier – nicht bei sonstigen und ausgefallenen Terminen");
    if (!r.e || !/Kannen für den Tee am Freitag/.test(r.e) || !/frei: 1/.test(r.e)) probleme.push("e) Trainer: " + r.e);
    else zeilen.push("e) Trainer: „" + r.e.match(/🫖[^·]*·[^·]*$/)?.[0]?.trim() + "“");
  }
  const pc = fs.readFileSync(path.join(h.REPO, "supabase/functions/push-cron/index.ts"), "utf8");
  if (!/Teil 2b \(v969\): Tee-Staffel/.test(pc) || !/Morgen eine Teekanne mitnehmen/.test(pc) || !/Mag jemand den Tee übernehmen\?/.test(pc) || !/freiwillig/.test(pc) || !/ohne && ohne\.has/.test(pc) || !/uhrzeit,platz_status"\)/.test(pc)) probleme.push("f) push-cron ohne Tee-Staffel");
  else zeilen.push("f) push-cron: Erinnerung an Eingetragene, Nachfrage an kommende Familien ohne die Eingetragenen, Ausfälle zählen nicht");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v969 Tee-Staffel: Kannen am Termin davor, eigene Becher", !probleme.length, zeilen.concat(probleme));
};
