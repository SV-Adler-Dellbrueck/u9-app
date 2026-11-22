/* v942 · Kleine Freuden in Trainer- und Eltern-App (Charles 22.11.2026: Trainer-Geburtstag, Adler fliegt durch, Meilensteine;
   „sollten wir auch in der Eltern-App umsetzen“: Eltern-Geburtstag, Herz bei Zusage, Adler, Eltern-Meilensteine).

   a) Trainer: am eigenen Geburtstag (profiles.geburtstag) Konfetti und „Alles Gute zum Geburtstag, Vorname!“ – einmal am Tag.
   b) Trainer-Meilenstein: 26 gespeicherte Pläne → „Dein 25. geplantes Training“, beim zweiten Mal nicht erneut.
   c) Eltern: Geburtstag aus eltern_angaben; Meilenstein 11 Antworten → „10 Antworten auf Termine“; Herz nach einer Zusage.
   d) Fünfmal schnell aufs Wappen: der Adler fliegt; viermal nicht.
   e) „Weniger Bewegung“: kein Konfetti, der Gruß kommt trotzdem. Kein Kindername in den Texten. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const heute = h.heute ? h.heute() : new Date().toISOString().slice(0, 10);
  const geb = "1980-" + heute.slice(5);
  const plaene = Array.from({ length: 26 }, (_, i) => ({ datum: h.tagePlus(-i) }));
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(),
    profiles: u => /select=geburtstag/.test(u.search) ? [{ geburtstag: geb }] : [{ anzeigename: "Trainer A" }],
    trainingsplan: u => /gespeichert_von/.test(u.search) ? plaene : [] }) });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)); const txt = id => (document.getElementById(id) || {}).textContent || "";
    window.sbUserId = () => "uid-trainer"; window.trainerMe = async () => "Trainer A"; localStorage.clear(); _frGestartet = {};
    const out = {};
    await freudeStart("trainer"); await w(100);
    out.geb = txt("fr-geburtstag"); out.konfetti = !!document.querySelector(".fr-konfetti");
    _frGestartet = {}; document.getElementById("fr-geburtstag")?.classList.add("x"); const vor = document.getElementById("fr-geburtstag"); vor && vor.parentNode.removeChild(vor);
    await freudeStart("trainer"); await w(100); out.gebNochmal = !!document.getElementById("fr-geburtstag");
    await freudeMeilenstein("trainer", "Trainer A"); await w(50); out.ms = txt("fr-pokal");
    const p = document.getElementById("fr-pokal"); p && p.parentNode.removeChild(p);
    await freudeMeilenstein("trainer", "Trainer A"); await w(50); out.msNochmal = !!document.getElementById("fr-pokal");
    // d) Wappen
    const logo = document.createElement("img"); logo.src = "logo.png"; logo.id = "test-logo"; document.body.appendChild(logo);
    for (let i = 0; i < 4; i++) logo.click(); await w(50); out.vier = !!document.getElementById("fr-adler");
    logo.click(); await w(50); out.fuenf = !!document.getElementById("fr-adler"); out.adlerSrc = (document.getElementById("fr-adler") || {}).src || "";
    freudeHerz("Danke! Das Team freut sich."); out.herz = txt("fr-herz");
    return out;
  }).catch(e => ({ fehler: String(e) }));
  const f1 = s.fehler(); await s.schliessen();
  // c) Eltern-App
  const antworten = Array.from({ length: 11 }, (_, i) => ({ id: i + 1 }));
  const e = await h.starten({ start: "/eltern/index.html", supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(),
    eltern_angaben: [{ vorname: "Elter", geburtstag: geb }], rueckmeldungen: u => /updated_by/.test(u.search) ? antworten : [] }) });
  const re = await e.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)); const txt = id => (document.getElementById(id) || {}).textContent || "";
    for (let i = 0; i < 60 && typeof freudeStart !== "function"; i++) await w(50);
    window.sbUserId = () => "uid-eltern"; localStorage.clear(); _frGestartet = {};
    const out = {};
    await freudeStart("eltern"); await w(100); out.geb = txt("fr-geburtstag");
    await freudeMeilenstein("eltern"); await w(50); out.ms = txt("fr-pokal");
    // e) weniger Bewegung
    window.matchMedia = q => ({ matches: /reduced-motion/.test(q), addEventListener() {}, removeEventListener() {} });
    document.querySelectorAll(".fr-konfetti").forEach(x => x.parentNode.removeChild(x));
    localStorage.clear(); _frGestartet = {}; await freudeStart("eltern"); await w(100);
    out.ruhigKonfetti = !!document.querySelector(".fr-konfetti"); out.ruhigGruss = !!document.getElementById("fr-geburtstag");
    return out;
  }).catch(x => ({ fehler: String(x) }));
  const f2 = e.fehler(); await e.schliessen();
  if (r.fehler) probleme.push("Trainer: " + r.fehler);
  else {
    if (!/Alles Gute zum Geburtstag, Trainer!/.test(r.geb) || !/Trainerteam gratuliert/.test(r.geb) || !r.konfetti || r.gebNochmal) probleme.push(`a) ${JSON.stringify({ geb: r.geb, konfetti: r.konfetti, nochmal: r.gebNochmal })}`);
    if (!/Dein 25\. geplantes Training – danke, Trainer!/.test(r.ms) || r.msNochmal) probleme.push(`b) „${r.ms}“, nochmal ${r.msNochmal}`);
    if (r.vier || !r.fuenf || !/Maskottchen\//.test(r.adlerSrc)) probleme.push(`d) Wappen: vier ${r.vier}, fünf ${r.fuenf}, ${r.adlerSrc}`);
    if (!/Danke! Das Team freut sich/.test(r.herz)) probleme.push("c) Herz fehlt");
  }
  if (re.fehler) probleme.push("Eltern: " + re.fehler);
  else {
    if (!/Alles Gute zum Geburtstag, Elter!/.test(re.geb) || !/ganze Team/.test(re.geb)) probleme.push(`c) Eltern-Geburtstag „${re.geb}“`);
    if (!/10 Antworten auf Termine/.test(re.ms)) probleme.push(`c) Eltern-Meilenstein „${re.ms}“`);
    if (re.ruhigKonfetti || !re.ruhigGruss) probleme.push(`e) weniger Bewegung: Konfetti ${re.ruhigKonfetti}, Gruß ${re.ruhigGruss}`);
  }
  if (/Kind [A-O]/.test(JSON.stringify([r, re]))) probleme.push("e) Kindername in einem Text");
  const fehler = f1.concat(f2).filter(x => !/Failed to load resource/.test(x)); if (fehler.length) probleme.push("Konsole: " + fehler.slice(0, 2).join(" | "));
  zeilen.push(`a) „${String(r.geb || "").trim().slice(0, 50)}“ · b) „${String(r.ms || "").trim().slice(0, 50)}“ · c) „${String(re.ms || "").trim().slice(0, 50)}“ · d) Adler nach fünf Tipps · e) ruhig ohne Konfetti`);
  return h.ergebnis("v942 Kleine Freuden: Geburtstag, Meilensteine, Herz, fliegender Adler – Trainer und Eltern", !probleme.length, zeilen.concat(probleme));
};
