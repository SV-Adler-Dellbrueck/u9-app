/* v682 · Startseite, ein Muster für Unterseiten, Taktik direkt, Übungen aufgeräumt
   PO 29.09.: „Es gibt keine Tabus bei der Überarbeitung … Verhalte dich wie ein absoluter
   Profi, App-Entwickler mit einem Schwerpunkt auf Usability und Anwenderfreundlichkeit.“
   a) Startseite: die sechs Bereichs-Kacheln stehen VOR „Diese Woche“; die drei Startschritte
      erscheinen nicht, sobald es einen Kader gibt
   b) Kopfzeile: alle vier Knöpfe mindestens 44 × 44 px
   c) Eine Seite, ein Titel: unter dem Zurück-Kopf steht der Seitenname nicht noch einmal
      (Kader, Anwesenheit, Trainingsplan, Übungen, Tagebuch); „Team-Übersicht“ auf der Pinnwand bleibt
   d) Abschnitts-Überschriften nicht in Versalien und mindestens 13 px; kleinste Stufe 12 px
   e) Taktik: der Knopf führt direkt aufs Brett, ohne Zwischenseite mit einer einzigen Kachel
   f) Übungen: kein „Trainingsblock anlegen“ und kein Themenplan-Hinweis über der Suche,
      „Vorlagen“ unter Werkzeuge, das DFB-Regal nur nach Tipp auf seine Kachel */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const termine = [{ id: 1, datum: h.tagePlus(1), uhrzeit: "17:00", uhrzeit_ende: "18:15", typ: "training", titel: "Training", trainer_status: {} }];
  const s = await h.starten({ breite: 390, hoehe: 844, warten: 1500,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, nominierungen: [], anwesenheit: [], periodisierung: [], trainingsbloecke: [] }) });
  await h.sichtbarMachen(s.page, "#main-app");
  const r = await s.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    try { localStorage.removeItem("adler_onboarded"); } catch (e) {}
    await loadKader();
    const out = {};
    go("home"); await warte(900);
    const home = document.getElementById("home-content");
    const pos = id => { const el = document.getElementById(id); return el ? [...home.querySelectorAll("*")].indexOf(el) : -1; };
    out.home = { bereiche: pos("home-bereiche"), woche: pos("home-woche"), onboard: !!document.getElementById("onboard-card") };
    out.kopf = ["#rufe-kopf", "#help-btn", ".schrift-toggle", "#theme-toggle"].map(sel => { const b = document.querySelector(sel); if (!b) return sel + ":fehlt"; const r = b.getBoundingClientRect(); return Math.round(Math.min(r.width, r.height)); });
    out.titel = {};
    for (const k of ["kader", "anwesenheit", "planung", "formen", "tagebuch", "team"]) {
      go(k); await warte(500);
      const box = document.getElementById(SECS[k].cid);
      const titel = (document.querySelector("#tab-subbar .seiten-titel") || {}).textContent || "";
      const ersteSl = [...box.querySelectorAll(".sl")].find(e => e.getBoundingClientRect().height > 0);
      out.titel[k] = { titel: titel.trim(), erste: ersteSl ? ersteSl.textContent.trim() : "" };
    }
    go("kader"); await warte(300);
    const sl = [...document.querySelectorAll("#view-kader .sl, #view-kader .rbox-title")].filter(e => e.getBoundingClientRect().height > 0);
    out.sl = sl.map(e => ({ px: parseFloat(getComputedStyle(e).fontSize), tt: getComputedStyle(e).textTransform }));
    out.klein = getComputedStyle(document.documentElement).getPropertyValue("--s-klein").trim();
    openTab("taktik"); await warte(300);
    out.taktik = document.querySelector(".view.active")?.id || "";
    go("formen"); await warte(900);
    const f = document.getElementById("train-sub-formen");
    const sichtbar = el => el && el.getBoundingClientRect().height > 0;
    out.formen = {
      block: [...f.querySelectorAll("button")].filter(sichtbar).some(b => /Trainingsblock anlegen/.test(b.textContent)),
      period: sichtbar(document.getElementById("period-banner")),
      vorlagen: [...f.querySelectorAll("button")].filter(sichtbar).map(b => b.textContent.trim()).filter(t => /Vorlagen/.test(t)),
      dfbZu: !sichtbar(document.getElementById("dfb-regal"))
    };
    const dfbKnopf = [...f.querySelectorAll("button")].find(b => /DFB-Regal/.test(b.textContent));
    if (dfbKnopf) { dfbKnopf.click(); await warte(200); }
    out.formen.dfbAuf = sichtbar(document.getElementById("dfb-regal"));
    return out;
  });
  const fe = s.fehler(); await s.schliessen();
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  // a)
  if (r.home.bereiche < 0 || r.home.woche < 0) probleme.push(`a) Bereiche ${r.home.bereiche} / Woche ${r.home.woche} nicht gefunden`);
  else if (r.home.bereiche > r.home.woche) probleme.push("a) Die Bereichs-Kacheln stehen erst nach „Diese Woche“");
  if (r.home.onboard) probleme.push("a) „Willkommen – in 3 Schritten“ steht trotz Kader da");
  // b)
  r.kopf.forEach((x, i) => { if (typeof x !== "number" || x < 44) probleme.push(`b) Kopf-Knopf ${i + 1}: ${x}`); });
  // c)
  for (const k in r.titel) {
    const x = r.titel[k], a = x.erste.toLowerCase(), b = x.titel.toLowerCase();
    // v683: die Pinnwand beginnt mit „Team-Notizen“ – ein Abschnitt, kein Titel, und bleibt
    if (k === "team") { if (!/team-notizen/i.test(x.erste)) probleme.push(`c) Pinnwand: erste Überschrift „${x.erste}“ – „Team-Notizen“ ist ein Abschnitt und muss bleiben`); continue; }
    if (a && (a === b || a === "trainer" + b)) probleme.push(`c) ${k}: „${x.erste}“ wiederholt den Seitennamen`);
  }
  // d)
  if (!r.sl.length) probleme.push("d) keine Überschrift im Kader gemessen");
  r.sl.forEach((x, i) => { if (x.px < 13 || x.tt === "uppercase") probleme.push(`d) Überschrift ${i + 1}: ${x.px}px ${x.tt}`); });
  if (r.klein !== "12px") probleme.push(`d) --s-klein ist ${r.klein}`);
  // e)
  if (r.taktik !== "view-taktik") probleme.push(`e) Taktik öffnet ${r.taktik}`);
  // f)
  if (r.formen.block) probleme.push("f) „Trainingsblock anlegen“ steht unter Übungen");
  if (r.formen.period) probleme.push("f) Themenplan-Hinweis steht ohne Schwerpunkt über der Suche");
  if (!r.formen.vorlagen.length) probleme.push("f) Kachel „Vorlagen“ fehlt");
  if (!r.formen.dfbZu) probleme.push("f) DFB-Regal steht offen zusätzlich zur Kachel");
  if (!r.formen.dfbAuf) probleme.push("f) Die Kachel „DFB-Regal“ öffnet das Regal nicht");
  zeilen.push(`Start: Bereiche @${r.home.bereiche} vor Woche @${r.home.woche}, Startschritte ${r.home.onboard ? "da" : "weg"} · Kopf ${r.kopf.join("/")} px · Taktik → ${r.taktik}`);
  zeilen.push(`Titel: ${Object.entries(r.titel).map(([k, x]) => `${k} „${x.erste}“`).join(" · ")} · Überschriften ${r.sl.map(x => x.px).join("/")} px`);
  return h.ergebnis("Startseite, ein Muster für Unterseiten, Taktik direkt, Übungen aufgeräumt", !probleme.length, zeilen.concat(probleme));
};
