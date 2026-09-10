/* v512 – Auftragspaket „Übungen kommen von selbst, Skizzen werden lesbar".
   Teil 1: Beim Öffnen holt die App `uebungen/bibliothek.json` aus dem Repo und legt still
   an, was neu ist. Drei Dinge müssen dabei stimmen, und alle drei sind Fallen:
     · Der Abgleich schreibt NICHTS in `trainingsplan` – er füllt nur die Formen-Datenbank.
     · Vorhandene Namen werden übersprungen, nie überschrieben: eine Skizze, die hier
       gezeichnet wurde, darf ein späterer Push nicht plattmachen.
     · Ohne Sitzung läuft er gar nicht erst an – die RLS lehnte den Schreibvorgang ohnehin
       ab, und ein stiller Fehlschlag beim Start ist schlimmer als gar kein Versuch.
   Dazu: der `stand` verhindert den zweiten Lauf, und der Service Worker darf die Datei
   nicht cachen (`ignoreSearch` macht jedes ?cb=… wirkungslos – die Falle aus CLAUDE.md).
   Teil 2: die vier Pfeil-Typen haben eigene Farben, jede mit mindestens 3:1 gegen den
   Rasen, und behalten ihr Strichmuster – Farbe ist nie der einzige Bedeutungsträger. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");

  // ── Die Datei im Repo ist selbst ein Prüfgegenstand ───────────────────────
  const datei = path.join(h.REPO, "uebungen", "bibliothek.json");
  let bib = null;
  try { bib = JSON.parse(fs.readFileSync(datei, "utf8")); }
  catch (e) { probleme.push(`uebungen/bibliothek.json fehlt oder ist kein gültiges JSON: ${e.message}`); }
  if (!bib) return h.ergebnis("Bibliotheks-Abgleich", false, probleme);
  if (bib.schema !== "adler-uebungen/1") probleme.push(`Die Bibliothek hat das Schema „${bib.schema}“ statt „adler-uebungen/1“`);
  if (!String(bib.stand || "").trim()) probleme.push("Der Bibliothek fehlt das Feld „stand“ – ohne das läuft der Abgleich bei jedem Öffnen neu");
  const namen = (bib.uebungen || []).map(u => u.name);

  const sw = fs.readFileSync(path.join(h.REPO, "sw.js"), "utf8");
  /* Die Ausnahme muss VOR der Cache-Weiche stehen und ein `return` auslösen – sonst
     matcht der Handler mit ignoreSearch und liefert für immer die alte Fassung. */
  const swAusnahme = sw.split("\n").some(z => z.includes("bibliothek") && /return/.test(z));
  if (!swAusnahme) probleme.push("sw.js nimmt uebungen/bibliothek.json nicht vom Cache aus – die App läse für immer die Fassung der Installation");
  const swPrecache = sw.slice(0, sw.indexOf("addEventListener")).includes("bibliothek.json");
  if (swPrecache) probleme.push("uebungen/bibliothek.json steht im PRECACHE – genau das darf sie nicht");

  // ── 1) Erster Start mit Sitzung: legt an, schreibt keinen Plan ────────────
  const custom = [], plaene = {};
  const tabellen = {
    kader: h.kaderZeilen(), termine: [], nominierungen: [], anwesenheit: [],
    trainingsformen: (u, req) => {
      if (req.method() === "POST") { custom.push(JSON.parse(req.postData() || "{}")); return { status: 201, body: "[]" }; }
      return custom;
    },
    trainingsplan: (u, req) => {
      if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); plaene[b.datum] = b; return { status: 201, body: "[]" }; }
      return [];
    }
  };
  const s = await h.starten({ supabase: h.supabaseAttrappe(tabellen), bibliothek: true, hoehe: 1200 });
  const eins = await s.page.evaluate(async () => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    if (typeof bibliothekAbgleich !== "function") return { fehlt: "bibliothekAbgleich" };
    try { localStorage.removeItem("adler-bibliothek-stand"); } catch (e) {}
    const e = await bibliothekAbgleich(); await warte(150);
    let stand = null; try { stand = localStorage.getItem("adler-bibliothek-stand"); } catch (x) {}
    return { e, stand, formen: tpAllForms().length, warmup: tpFilteredOpts("warmup").map(x => x.f.name), tw: tpFilteredOpts("tw").map(x => x.f.name) };
  });
  if (eins.fehlt) { probleme.push(`${eins.fehlt} fehlt`); await s.schliessen(); return h.ergebnis("Bibliotheks-Abgleich", false, probleme); }

  // ── 2) Zweiter Lauf: derselbe stand, also nichts ──────────────────────────
  const vorZweitem = custom.length;
  const zwei = await s.page.evaluate(async () => await bibliothekAbgleich());

  // ── 3) Eine Übung liegt schon da: wird übersprungen, nicht überschrieben ──
  const vorDrittem = custom.length;
  const drei = await s.page.evaluate(async () => {
    try { localStorage.removeItem("adler-bibliothek-stand"); } catch (e) {}
    return await bibliothekAbgleich();
  });
  const fehler = s.fehler(); await s.schliessen();

  // ── 4) Ohne Sitzung: gar kein Versuch ─────────────────────────────────────
  const ohne = [];
  const t = await h.starten({
    supabase: h.supabaseAttrappe({ ...tabellen, trainingsformen: (u, req) => { if (req.method() === "POST") ohne.push(1); return []; } }),
    bibliothek: true, angemeldet: false, hoehe: 900
  });
  const abgemeldet = await t.page.evaluate(async () => {
    try { localStorage.removeItem("adler-bibliothek-stand"); } catch (e) {}
    window.sbToken = () => null;
    const e = await bibliothekAbgleich();
    let stand = null; try { stand = localStorage.getItem("adler-bibliothek-stand"); } catch (x) {}
    return { e, stand };
  });
  await t.schliessen();

  // ── 5) Farben und Legende (Teil 2) ────────────────────────────────────────
  const p = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }), hoehe: 900 });
  const farben = await p.page.evaluate(() => {
    const lum = c => { const v = c.map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
    const hex = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
    const kontrast = (a, b) => { const [x, y] = [lum(hex(a)), lum(hex(b))].sort((p, q) => q - p); return +(((x + .05) / (y + .05)).toFixed(2)); };
    const svg = _skz({ p: [[10, 10, 50, 50, "p"], [10, 20, 50, 60, "l"], [10, 30, 50, 70, "s"], [10, 40, 50, 80, "d"]] });
    const d = document.createElement("div"); d.innerHTML = svg;
    const linien = [...d.querySelectorAll("line")].map(l => ({ farbe: l.getAttribute("stroke"), dash: l.getAttribute("stroke-dasharray") || "", breite: l.getAttribute("stroke-width"), marker: l.getAttribute("marker-end") }));
    const marker = [...d.querySelectorAll("marker")].map(m => ({ id: m.id, fill: m.querySelector("path").getAttribute("fill") }));
    return {
      typen: Object.keys(SKZ_PFEIL), kontraste: Object.keys(SKZ_PFEIL).map(k => [k, kontrast(SKZ_PFEIL[k], "#2d6a2d")]),
      linien, marker, legende: typeof skzLegende === "function" ? skzLegende() : ""
    };
  });
  const pFehler = p.fehler(); await p.schliessen();

  // ── Auswertung ────────────────────────────────────────────────────────────
  if (eins.e === null) probleme.push("Der Abgleich lief mit Sitzung gar nicht erst an");
  else {
    if (eins.e.angelegt !== namen.length) probleme.push(`Der Abgleich hat ${eins.e.angelegt} von ${namen.length} Übungen angelegt`);
    if (eins.e.fehler) probleme.push(`Der Abgleich meldet einen Fehler: ${eins.e.fehler}`);
  }
  if (Object.keys(plaene).length) probleme.push(`Der Abgleich hat in trainingsplan geschrieben: ${Object.keys(plaene).join(", ")}`);
  if (custom.length !== namen.length) probleme.push(`In trainingsformen stehen ${custom.length} Zeilen statt ${namen.length}`);
  const ohneSkizze = custom.filter(f => (bib.uebungen.find(u => u.name === f.name) || {}).skizze && !f.skizze);
  if (ohneSkizze.length) probleme.push(`Bei ${ohneSkizze.length} Übungen ging die Zeichnung verloren`);
  if (eins.stand !== String(bib.stand)) probleme.push(`Der Stand wurde als „${eins.stand}“ gemerkt statt als „${bib.stand}“`);
  const warmupSoll = bib.uebungen.filter(u => u.kat === "aufwaermen").map(u => u.name);
  const fehltImWarmup = warmupSoll.filter(n => !eins.warmup.includes(n));
  if (fehltImWarmup.length) probleme.push(`Nach dem Abgleich fehlen in der Aufwärm-Auswahl: ${fehltImWarmup.join(", ")}`);

  if (zwei !== null) probleme.push("Der zweite Lauf hat trotz gleichem Stand gearbeitet");
  if (custom.length !== vorZweitem) probleme.push(`Der zweite Lauf hat ${custom.length - vorZweitem} Zeilen geschrieben`);
  if (!drei || drei.angelegt !== 0) probleme.push(`Nach dem Zurücksetzen des Stands wurden ${drei && drei.angelegt} Übungen erneut angelegt – vorhandene Namen müssen übersprungen werden`);
  if (drei && drei.uebersprungen !== namen.length) probleme.push(`Übersprungen wurden ${drei && drei.uebersprungen} statt ${namen.length}`);
  if (custom.length !== vorDrittem) probleme.push("Ein Lauf mit lauter bekannten Namen hat trotzdem geschrieben");

  if (abgemeldet.e !== null) probleme.push("Ohne Sitzung läuft der Abgleich trotzdem an");
  if (ohne.length) probleme.push(`Ohne Sitzung wurden ${ohne.length} Schreibversuche gestartet`);
  if (abgemeldet.stand) probleme.push("Ohne Sitzung wurde der Stand gemerkt – der Abgleich liefe danach nie mehr");

  const schwach = farben.kontraste.filter(([, v]) => v < 3);
  if (schwach.length) probleme.push(`Pfeil-Farben mit zu wenig Kontrast gegen den Rasen: ${schwach.map(([k, v]) => k + " " + v).join(", ")}`);
  const muster = farben.linien.map(l => l.dash + "|" + l.breite).join(" ");
  if (muster !== "|1.5 5,3|1.5 |3 2,3|1.5") probleme.push(`Die Strichmuster haben sich verändert: ${muster}`);
  if (new Set(farben.linien.map(l => l.farbe)).size !== 4) probleme.push(`Die vier Pfeil-Typen haben ${new Set(farben.linien.map(l => l.farbe)).size} verschiedene Farben`);
  farben.linien.forEach((l, i) => {
    const m = farben.marker.find(x => "url(#" + x.id + ")" === l.marker);
    if (!m) probleme.push(`Linie ${i + 1} zeigt auf einen Marker, den es nicht gibt: ${l.marker}`);
    else if (m.fill !== l.farbe) probleme.push(`Der Pfeilkopf von Linie ${i + 1} ist ${m.fill} statt ${l.farbe}`);
  });
  ["Pass", "Laufweg", "Schuss", "Dribbling"].forEach(w => { if (!farben.legende.includes(w)) probleme.push(`In der Legende fehlt „${w}“`); });

  const ei = fs.readFileSync(path.join(h.REPO, "md-einheit-import.js"), "utf8");
  if (!/skzLegende\(\)/.test(ei)) probleme.push("Die Vorschau des Übungs-Imports zeigt keine Strich-Legende");
  const skz = fs.readFileSync(path.join(h.REPO, "md-skizze.js"), "utf8");
  if (!/skzLegende\(\)/.test(skz)) probleme.push("Der Skizzen-Editor zeigt keine Strich-Legende");
  const cl = fs.readFileSync(path.join(h.REPO, "CLAUDE.md"), "utf8");
  if (!/gemeint ist die Laufzeit/i.test(cl)) probleme.push("CLAUDE.md sagt nicht, dass die SQL-Regel die Laufzeit meint");
  if (!/uebungen\/bibliothek\.json/.test(cl)) probleme.push("CLAUDE.md erwähnt die Bibliothek und ihre Cache-Ausnahme nicht");
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  if (pFehler.length) probleme.push(...pFehler.slice(0, 2));

  zeilen.push(`Bibliothek: ${namen.length} Übungen, Stand „${bib.stand}“ · angelegt ${eins.e && eins.e.angelegt}, Pläne geschrieben ${Object.keys(plaene).length} · Stand gemerkt „${eins.stand}“`);
  zeilen.push(`Zweiter Lauf: ${zwei === null ? "nichts getan" : "gearbeitet"} · nach Zurücksetzen: ${drei && drei.angelegt} angelegt, ${drei && drei.uebersprungen} übersprungen · ohne Sitzung: ${abgemeldet.e === null ? "kein Versuch" : "gelaufen"}`);
  zeilen.push(`Pfeile: ${farben.kontraste.map(([k, v]) => k + " " + v + ":1").join(" · ")} · Muster unverändert · Pfeilköpfe farbgleich`);
  return h.ergebnis("Bibliothek kommt von selbst, Skizzen mit Farbe", !probleme.length, zeilen.concat(probleme));
};
