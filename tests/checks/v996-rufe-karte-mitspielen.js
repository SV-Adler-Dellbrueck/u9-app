/* v996 · Charles 28.11.2026 (Bildschirmfoto Termin-Karte im Chat): „Bei der Zusage geht es ja nicht um das Kind, sondern um das
   Elternteil, das zugesagt hat.“ Gewählt: „Kind und Elternteil“.
   a) Eltern, Kinder-Eltern-Turnier: Zeile je Kind bleibt; darunter „Du · spielst du mit?“ mit „⚽ Ich spiele mit“ und
      „Weitere eintragen ›“ (beide ≥ 44 px); unten „✓ 10 Kinder dabei … · ⚽ 2 Erwachsene“
   b) Tipp auf „Ich spiele mit“ trägt das Elternteil ein (POST event_mitspieler, selbst true); ist es schon eingetragen,
      steht „⚽ spielst mit“ und der Knopf ist gedrückt
   c) „Weitere eintragen ›“ öffnet den Termin
   d) anderes Event ohne Haken: keine Elternteil-Zeile, Zählzeile unverändert; Trainer: Zählzeile mit Erwachsenen, keine Knöpfe */
"use strict";
module.exports = async function (h) {
  const titel = "v996 Termin-Karte im Chat: beim Kinder-Eltern-Turnier sagt das Elternteil selbst zu";
  const probleme = [], zeilen = [];
  const tok = sub => "x." + Buffer.from(JSON.stringify({ sub })).toString("base64") + ".y";
  const s = await h.starten({ start: "/eltern/index.html", warten: 1000, breite: 390, hoehe: 900, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), event_mitspieler: [] }) });
  const r = await s.page.evaluate(async t => {
    const w = ms => new Promise(x => setTimeout(x, ms)), txt = e => e ? e.textContent.replace(/\s+/g, " ").trim() : "";
    const tag = d => { const x = new Date(Date.now() + d * 864e5); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); };
    for (let i = 0; i < 60 && (typeof rufeTerminKarteHtml !== "function" || typeof mitspielerIch !== "function"); i++) await w(100);
    if (typeof rufeTerminMitspielen !== "function") return { alt: true };
    window.sbToken = () => t;
    document.querySelectorAll("[role=dialog]").forEach(d => d.remove());
    const KET = { id: 142, typ: "event", titel: "Kinder Eltern Weihnachtsturnier", datum: tag(9), uhrzeit: "17:00:00", ort: "Platz", heim: true, eltern_turnier: true };
    const FEIER = { id: 143, typ: "event", titel: "Weihnachtsfeier", datum: tag(12), uhrzeit: "17:00:00", ort: "Halle", heim: true };
    const stand = { dabei: 10, abgesagt: 0, offen: 3, autos: 0, frei: 0 };
    window._elternKids = [{ spieler_id: 2, kader: { id: 2, name: "Kind B" } }];
    _rf = { trainer: false, uid: "u-e", termine: { 142: KET, 143: FEIER }, tstand: { 142: stand, 143: stand }, tmein: [{ termin_id: 142, spieler_id: 2, status: "zugesagt" }],
      tmit: { 142: { erw: 2, ich: false } } };
    const o = {};
    const box = document.createElement("div"); box.style.cssText = "position:fixed;inset:0;z-index:10003;background:#fff;width:390px";
    document.body.appendChild(box);
    box.innerHTML = rufeTerminKarteHtml(142);
    o.karte = txt(box);
    o.zeilen = [...box.querySelectorAll(".rf-t-zeile")].map(txt);
    const ich = [...box.querySelectorAll("button")].find(b => /Ich spiele mit/.test(b.textContent));
    const mehr = [...box.querySelectorAll("button")].find(b => /Weitere eintragen/.test(b.textContent));
    o.hoehen = [ich, mehr].map(b => b ? Math.round(b.getBoundingClientRect().height) : 0);
    // b) eintragen – Neuladen des Chats abfangen
    window.rufeLaden = async () => { o.neuGeladen = true; };
    ich && ich.click(); await w(600);
    _rf.tmit[142].ich = true; box.innerHTML = rufeTerminKarteHtml(142);
    o.danach = txt(box.querySelector(".rf-t-ich")); o.gedrueckt = box.querySelector(".rf-t-ich button")?.getAttribute("aria-pressed");
    // c)
    const auf = []; window.rufeTerminOeffnen = id => auf.push(id);
    [...box.querySelectorAll("button")].find(b => /Weitere eintragen/.test(b.textContent))?.click(); o.auf = auf;
    // d)
    box.innerHTML = rufeTerminKarteHtml(143); o.feier = txt(box);
    _rf.trainer = true; box.innerHTML = rufeTerminKarteHtml(142); o.trainer = txt(box); o.trainerKnoepfe = box.querySelectorAll(".rf-t-ich").length;
    return o;
  }, tok("u-e")).catch(x => ({ fehler: String(x) }));
  const g = s.gesendet.slice(), fe = s.fehler(); await s.schliessen();
  if (r.alt) return h.ergebnis(titel, false, ["Elternteil-Zeile fehlt (Stand vor v996)"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Ablauf: " + r.fehler]);
  if (!r.zeilen.some(z => /Kind B · ✓ dabei/.test(z)) || !r.zeilen.some(z => /^Du · spielst du mit\?/.test(z)) || r.hoehen.some(x => x < 44)
      || !/✓ 10 Kinder dabei · ✗ 0 abgesagt · 3 offen · ⚽ 2 Erwachsene/.test(r.karte))
    probleme.push("a) " + JSON.stringify({ zeilen: r.zeilen, hoehen: r.hoehen, karte: r.karte }));
  else zeilen.push(`a) Kind-Zeile bleibt, darunter „Du · spielst du mit?“ (Knöpfe ${r.hoehen.join("/")} px), unten „⚽ 2 Erwachsene“`);
  const post = g.filter(x => /event_mitspieler$/.test(x.pfad) && x.methode === "POST").map(x => x.body);
  if (!post.some(p => p && p.termin_id === 142 && p.selbst === true) || !r.neuGeladen || !/⚽ spielst mit/.test(r.danach) || r.gedrueckt !== "true")
    probleme.push("b) " + JSON.stringify({ post, neu: r.neuGeladen, danach: r.danach, gedrueckt: r.gedrueckt }));
  else zeilen.push("b) „Ich spiele mit“ trägt das Elternteil ein (selbst true), danach „⚽ spielst mit“, Knopf gedrückt");
  if (!(r.auf || []).includes(142)) probleme.push("c) „Weitere eintragen“ öffnet den Termin nicht");
  else zeilen.push("c) „Weitere eintragen ›“ öffnet den Termin");
  if (/spielst|Erwachsene|Kinder dabei/.test(r.feier) || !/⚽ 2 Erwachsene/.test(r.trainer) || r.trainerKnoepfe) probleme.push("d) " + JSON.stringify({ feier: r.feier, trainer: r.trainer, knoepfe: r.trainerKnoepfe }));
  else zeilen.push("d) Weihnachtsfeier ohne Elternteil-Zeile; Trainer sieht die Erwachsenen, ohne Knöpfe");
  const f = fe.filter(x => !/youtube|Failed to load resource/i.test(x));
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
