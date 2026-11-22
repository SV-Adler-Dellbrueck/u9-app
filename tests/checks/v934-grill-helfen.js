/* v934 · „🔥 Grillhütte & Helfen“ für Eltern (Charles 21.11.2026: Bild freigegeben, „Mit Namen und Zählung“).
   a) Unter „Fürs Team“ steht die breite Kachel „Grillhütte & Helfen“.
   b) Kommende Heimspiele mit der Familie: eigene grün mit „🔥 Ihr seid dran“ und „Ersatz suchen“; „Ersatz gesucht“ mit
      „Übernehmen“; ohne Einteilung „wird ab TT.MM. eingeteilt“.
   c) Tabelle je Familie: alphabetisch (keine Rangliste), eigene Zeile markiert, Summe fürs Team, Spalten Grillhütte,
      Tee, Aufbau, Abbau, Betreuung – mit Beschriftung auch ohne Emoji (Vorleser).
   d) Im Termin steht der Name der Familie statt „eine andere Familie“.
   e) 360 px: nichts ragt über den Rand, Knöpfe ≥ 44 px; dunkel lesbar.
   g) Heimspiele ab Februar 2027 tragen „vorläufig“, oben steht der Hinweis (Spielplan der Rückrunde noch nicht final).
   f) Migration: Funktion helfer_uebersicht nur für angemeldete Eltern/Trainer, keine Mail- oder Telefondaten im Ergebnis. */
module.exports = async function (h) {
  const fs = require("fs"), path = require("path");
  const probleme = [], zeilen = [];
  const D = {
    saison_ab: "2026-07-01",
    heimspiele: [
      { termin_id: 1, datum: h.tagePlus(5), uhrzeit: "10:15:00", gegner: "Gast A", plaetze: 2, dienste: [
        { dienst_id: 11, platz: 1, status: "eingeteilt", familie: "Kind C", eigene: true, kann_uebernehmen: false },
        { dienst_id: 12, platz: 2, status: "freigegeben", familie: "Kind F", eigene: false, kann_uebernehmen: true }] },
      { termin_id: 2, datum: h.tagePlus(20), uhrzeit: "10:15:00", gegner: "Gast B", plaetze: 1, dienste: [
        { dienst_id: 13, platz: 1, status: "eingeteilt", familie: "Kind H", eigene: false, kann_uebernehmen: false }] },
      { termin_id: 3, datum: "2027-03-06", uhrzeit: null, gegner: "Gast C", plaetze: 1, dienste: [] }],
    familien: [
      { familie: "Kind A", eigene: false, grill: 1, tee: 0, aufbau: 1, abbau: 0, betreuung: 3 },
      { familie: "Kind B", eigene: false, grill: 0, tee: 1, aufbau: 0, abbau: 1, betreuung: 2 },
      { familie: "Kind C", eigene: true, grill: 1, tee: 2, aufbau: 0, abbau: 0, betreuung: 4 }]
  };
  const lauf = async (scheme) => {
    const s = await h.starten({ start: "/eltern/index.html", breite: 360, hoehe: 780, scheme, warten: 1500, supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(), rpc: { helfer_uebersicht: D, dienste_public: [{ termin_id: 2, datum: h.tagePlus(20), dienst_id: 13, status: "eingeteilt", name: null, eigene: false, kann_uebernehmen: false, platz: 1, plaetze: 1 }] } }) });
    await s.page.evaluate(h.kontrastHelfer);
    const r = await s.page.evaluate(async () => {
      const w = ms => new Promise(x => setTimeout(x, ms));
      for (let i = 0; i < 40 && typeof elternHelfenOpen !== "function"; i++) await w(100);
      if (typeof elternHelfenOpen !== "function") return { fehlt: "elternHelfenOpen" };
      const out = {};
      await elternHelfenOpen(); await w(200);
      const f = document.getElementById("helfen-fenster");
      out.dialog = !!f && f.getAttribute("role") === "dialog";
      const heim = [...f.querySelectorAll(".hf-heim")];
      out.heim = heim.map(x => ({ text: x.textContent.replace(/\s+/g, " ").trim(), eigen: x.classList.contains("hf-eigen"), knoepfe: [...x.querySelectorAll("button")].map(b => b.textContent.trim()) }));
      out.hinweis = (f.querySelector(".hf-hinweis") || {}).textContent || "";
      out.vorl = [...f.querySelectorAll(".hf-heim")].map(x => !!x.querySelector(".hf-vorl"));
      out.zeilen = [...f.querySelectorAll(".hf-tabelle tbody tr")].map(tr => [...tr.children].map(c => c.textContent.trim()));
      out.ihr = [...f.querySelectorAll(".hf-tabelle tr.hf-ihr")].length;
      out.kopf = [...f.querySelectorAll(".hf-tabelle thead th")].map(t => t.getAttribute("title") || t.textContent.trim());
      const W = innerWidth;
      out.breit = [...f.querySelectorAll("*")].filter(e => e.getBoundingClientRect().right > W + 1).map(e => e.className || e.tagName).slice(0, 3);
      out.knopfMin = Math.min(...[...f.querySelectorAll("button")].map(b => b.getBoundingClientRect().height));
      out.kontrast = Math.min(...[...f.querySelectorAll(".hf-tabelle th, .hf-tabelle td, .hf-heim b")].slice(0, 30).map(e => window.__kontrastVon(e)));
      f.remove();
      // d) Termin-Zeile
      window._tdTermin = { id: 2 };
      const box = document.createElement("div"); box.id = "td-buedchen"; document.body.appendChild(box);
      await tdBuedchenLoad({ id: 2 }); await w(100);
      out.termin = box.textContent.replace(/\s+/g, " ").trim();
      return out;
    });
    const fe = s.fehler(); await s.schliessen();
    return { r, fe };
  };
  const hell = await lauf("light"), dunkel = await lauf("dark");
  const r = hell.r;
  if (r.fehlt) return h.ergebnis("v934 Grillhütte & Helfen", false, [r.fehlt + " fehlt"]);
  // a)
  const ep = fs.readFileSync(path.join(h.REPO, "md-eltern-portal.js"), "utf8");
  const team = ep.slice(ep.indexOf('sec("👥 Fürs Team")'), ep.indexOf("// Versionszeile", ep.indexOf('sec("👥 Fürs Team")')));
  if (!/id="helfen-kachel"[\s\S]*Grillhütte &amp; Helfen/.test(team) || !/el-breit/.test(team.slice(team.indexOf("helfen-kachel") - 200, team.indexOf("helfen-kachel") + 300))) probleme.push("a) Kachel „Grillhütte & Helfen“ fehlt unter „Fürs Team“ oder ist nicht breit");
  // b)
  if (!r.dialog) probleme.push("b) Fenster ist kein Dialog");
  const [h1, h2, h3] = r.heim;
  if (!h1 || !h1.eigen || !/Familie Kind C/.test(h1.text) || !/Ihr seid dran/.test(h1.text) || !h1.knoepfe.includes("Ersatz suchen") || !h1.knoepfe.includes("Übernehmen") || !/Familie Kind F.*Ersatz gesucht/.test(h1.text))
    probleme.push(`b) erstes Heimspiel: ${JSON.stringify(h1).slice(0, 220)}`);
  if (!h2 || h2.eigen || !/Familie Kind H/.test(h2.text) || !/vergeben/.test(h2.text) || h2.knoepfe.length) probleme.push(`b) zweites Heimspiel: ${JSON.stringify(h2).slice(0, 200)}`);
  if (!h3 || !/wird gerade eingeteilt/.test(h3.text))   /* v951: ganze Saison – kein „wird ab …“ mehr */ probleme.push(`b) Heimspiel ohne Einteilung: ${JSON.stringify(h3).slice(0, 160)}`);
  // g) Rückrunde ab Februar 2027 noch nicht final (Charles 21.11.)
  if (!/Rückrunde ab Februar 2027 ist noch nicht endgültig/.test(r.hinweis)) probleme.push("g) Hinweis „Spielplan der Rückrunde noch nicht endgültig“ fehlt");
  if (String(r.vorl) !== "false,false,true") probleme.push(`g) „vorläufig“ steht an ${JSON.stringify(r.vorl)} statt nur am Heimspiel im März 2027`);
  // c)
  const namen = r.zeilen.slice(0, -1).map(z => z[0].replace(/ · ihr$/, ""));
  if (String(namen) !== String([...namen].sort((a, b) => a.localeCompare(b, "de")))) probleme.push(`c) nicht alphabetisch: ${namen}`);
  if (r.ihr !== 1 || !/Kind C · ihr/.test(r.zeilen.map(z => z[0]).join("|"))) probleme.push("c) eigene Zeile nicht markiert");
  const summe = r.zeilen[r.zeilen.length - 1];
  if (!summe || summe[0] !== "Team" || summe.slice(1).join(",") !== "2,3,1,1,9") probleme.push(`c) Summe: ${JSON.stringify(summe)}`);
  if (String(r.kopf.slice(1).map(t => t.split(" ")[0])) !== "Grillhütte,Tee,Aufgebaut,Abgebaut,Betreut") probleme.push(`c) Spalten: ${r.kopf}`);
  // d)
  if (!/Familie Kind H ist dran/.test(r.termin)) probleme.push(`d) Termin zeigt „${r.termin.slice(0, 120)}“`);
  // e)
  for (const [n, x] of [["hell", hell.r], ["dunkel", dunkel.r]]) {
    if (x.breit && x.breit.length) probleme.push(`e) ${n}: ragt über den Rand – ${x.breit.join(", ")}`);
    if (x.knopfMin < 44) probleme.push(`e) ${n}: Knopf ${x.knopfMin} px`);
    if (x.kontrast < 4.5) probleme.push(`e) ${n}: Kontrast ${x.kontrast.toFixed(1)}`);
  }
  // f)
  const sql = fs.readFileSync(path.join(h.REPO, "supabase", "migrations", "20261121_v934_helfer_uebersicht.sql"), "utf8");
  if (!/revoke all on function public\.helfer_uebersicht\(\) from public, anon/.test(sql) || !/sitzung_gueltig\(\) or public\.ist_anonym\(\)/.test(sql)) probleme.push("f) Zugriff der Funktion nicht auf Angemeldete beschränkt");
  // ausgegeben wird nur, was in json_build_object steht – dort keine Mail, kein Telefon, keine Eltern-Namen
  const ausgabe = (sql.match(/json_build_object\([^;]*?\)/g) || []).join(" ");
  if (/'(email|telefon|phone|anzeigename)'/i.test(ausgabe) || /\b(u|p)\.(email|anzeigename)\b/.test(ausgabe)) probleme.push("f) Mail, Telefon oder Elternname im Ergebnis");
  [...hell.fe, ...dunkel.fe].slice(0, 2).forEach(x => probleme.push("Konsole: " + x));
  if (!probleme.length) zeilen.push(`Kachel unter „Fürs Team“ · ${r.heim.length} Heimspiele (eigenes grün mit Ersatz suchen, Ersatz gesucht mit Übernehmen, „wird gerade eingeteilt“) · Tabelle alphabetisch, „ihr“ markiert, Team ${summe.slice(1).join("/")} · Termin „Familie Kind H ist dran“ · 360 px ohne Überstand, Kontrast hell ${hell.r.kontrast.toFixed(1)} / dunkel ${dunkel.r.kontrast.toFixed(1)}`);
  return h.ergebnis("v934 Grillhütte & Helfen: Heimspiele mit Familie, Zählung je Familie", !probleme.length, zeilen.concat(probleme));
};
