/* v508 – PO: „Den Link für die Externen umbenennen, aktuell heißt er Helfer-Link, das passt
   nicht." Und auf die Rückfrage: „Wir würden es ja auch unseren Eltern weiterleiten evtl.
   Das müsste dann auch passen."
   Hinter dem Namen steckte ein Fehler: Der grosse Knopf hiess „Plan teilen – für Trainer und
   Eltern", rief aber htShareHelfer(), sobald ein Schreib-Code existierte. Wer ihn benutzte,
   verschickte den Link, mit dem JEDER Ergebnisse eintragen kann – an alle Eltern. Der Name
   „Helfer-Link" tauchte dann im Teilen-Blatt auf; daher der Befund.
   Jetzt zwei Wege mit zwei Namen: „Spielplan-Link" fuer alle (ohne Code), „Ergebnis-Link"
   fuer den Anzeigetisch (mit Code). Geprueft wird, was die Knoepfe wirklich in die
   Zwischenablage legen – nicht, wie sie beschriftet sind. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");
  const heute = h.heute();
  const s = await h.starten({
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [], heimturnier: (u, req) => req.method() === "GET" ? [] : { status: 204, body: "" } }),
    hoehe: 1600
  });
  const r = await s.page.evaluate(async ({ heute }) => {
    if (typeof htShare !== "function") return { fehlt: "htShare" };
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const kopiert = [];
    navigator.clipboard.writeText = t => { kopiert.push(t); return Promise.resolve(); };
    delete navigator.share;                       // Fallback-Weg: Zwischenablage
    const F = (...a) => a.map(x => ({ form: x }));
    const vereine = [{ name: "SV Adler Dellbrück", kinder: 10, teams: 2 }, { name: "SC Wahn Grengel", kinder: 10, teams: 2 }];
    const teams = fstTeamsBauen(vereine);
    const cfg = { art: "festival", format: "festival", start: "10:15", dauer: 60, spieldauer: 8, wechsel: 5, felder: F("f4", "funino", "funino"), vereine, infos: "" };
    _HT = { id: 7, slug: "kinderfestival-12-09", name: "Kinderfestival", datum: heute, edit_code: "GEHEIM7", config: cfg, teams: teams.map(t => t.name), plan: fstPlanBauen(teams, cfg) };
    const body = document.createElement("div"); body.id = "ht-body"; document.body.appendChild(body);
    fstRender(); await warte(120);
    const knopf = t => [...document.querySelectorAll("button")].find(b => new RegExp(t).test(b.textContent));
    const planKnopf = knopf("Spielplan-Link teilen"), ergKnopf = knopf("Ergebnis-Link");
    if (planKnopf) planKnopf.click(); await warte(60);
    const planLink = kopiert.pop() || "";
    if (ergKnopf) ergKnopf.click(); await warte(60);
    const ergLink = kopiert.pop() || "";
    const planerText = (document.getElementById("fst-body") || document.body).textContent;
    body.remove();
    return {
      planKnopf: !!planKnopf, ergKnopf: !!ergKnopf, planLink, ergLink,
      helferWeiche: typeof htShareHelfer === "function" && typeof htShareErgebnis === "function",
      warnung: /nicht in die Eltern-Gruppe/.test(planerText),
      fuerAlle: /Gast-Trainer|unsere Eltern/.test(planerText)
    };
  }, { heute });
  const fehler = s.fehler(); await s.schliessen();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt`); return h.ergebnis("Spielplan-Link statt Helfer-Link", false, probleme); }

  if (!r.planKnopf) probleme.push("Der Knopf „Spielplan-Link teilen“ fehlt im Festival-Planer");
  if (!r.ergKnopf) probleme.push("Der Knopf „Ergebnis-Link“ fehlt im Festival-Planer");
  if (!r.planLink) probleme.push("„Spielplan-Link teilen“ hat nichts in die Zwischenablage gelegt");
  else if (/[?&]code=/.test(r.planLink)) probleme.push(`Der Spielplan-Link trägt den Schreib-Code: ${r.planLink}`);
  if (!r.ergLink) probleme.push("„Ergebnis-Link“ hat nichts in die Zwischenablage gelegt");
  else if (!/[?&]code=GEHEIM7/.test(r.ergLink)) probleme.push(`Der Ergebnis-Link trägt den Schreib-Code nicht: ${r.ergLink}`);
  if (!r.helferWeiche) probleme.push("htShareErgebnis fehlt (oder der alte Name htShareHelfer zeigt nicht darauf)");
  if (!r.warnung) probleme.push("Beim Ergebnis-Link fehlt die Warnung „nicht in die Eltern-Gruppe“");
  if (!r.fuerAlle) probleme.push("Beim Spielplan-Link steht nicht, dass er für alle ist");

  /* Kein „Helfer-Link" mehr in dem, was der Trainer oder ein Gast liest. Kommentare duerfen
     den alten Namen nennen – sie erklaeren ja gerade, warum er weg ist –, deshalb werden sie
     vorher entfernt. Ein einfacher Abtaster genuegt: Zeichenketten bleiben stehen. */
  const ohneKommentar = q => {
    let out = "", i = 0, im = null;
    while (i < q.length) {
      const c = q[i], d = q[i + 1];
      if (im) { out += c; if (c === "\\") { out += d || ""; i += 2; continue; } if (c === im) im = null; i++; continue; }
      if (c === "/" && d === "*") { const e = q.indexOf("*/", i + 2); i = e < 0 ? q.length : e + 2; continue; }
      if (c === "/" && d === "/") { const e = q.indexOf("\n", i); i = e < 0 ? q.length : e; continue; }
      if (c === '"' || c === "'" || c === "`") im = c;
      out += c; i++;
    }
    return out;
  };
  const tp = ohneKommentar(fs.readFileSync(path.join(h.REPO, "md-turnierplan.js"), "utf8"));
  const sichtbar = tp.split("\n").filter(z => /Helfer-Link|Helfer-Modus|Helfer-Code/.test(z));
  if (sichtbar.length) probleme.push(`„Helfer-…“ steht noch in sichtbarem Text: ${sichtbar.slice(0, 2).map(z => z.trim().slice(0, 70)).join(" · ")}`);
  const hilfe = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  if (!/Spielplan-Link/.test(hilfe)) probleme.push("Die Hilfe kennt den Spielplan-Link nicht");
  if (/nur der Helfer-Link/.test(hilfe)) probleme.push("In der Hilfe steht noch „nur der Helfer-Link“");
  if (fehler.length) probleme.push(...fehler.slice(0, 3));

  zeilen.push(`Spielplan-Link: ${r.planLink.replace(/^https?:\/\/[^/]+/, "…")} · Ergebnis-Link: ${r.ergLink.replace(/^https?:\/\/[^/]+/, "…")}`);
  zeilen.push(`Warnung „nicht in die Eltern-Gruppe“ ${r.warnung} · Hinweis „für alle“ ${r.fuerAlle} · alter Name zeigt weiter ${r.helferWeiche}`);
  return h.ergebnis("Spielplan-Link für alle, Ergebnis-Link für den Anzeigetisch", !probleme.length, zeilen.concat(probleme));
};
