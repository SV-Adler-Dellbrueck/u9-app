/* v875 · Systemdialoge, Pakete 2 und 3 (Bestandsaufnahme November 2026, 4.5;
   Liste: doku/bestandsaufnahme-2026-11/systemdialoge.md).
   a) Quelltext: in jeder der 36 Funktionen des übrigen Trainerbereichs steht kein prompt(),
      confirm() oder alert() mehr, dafür frageJaNein (core.js) bzw. frageText (views.js).
   b) _sitName (Taktikboard) und _blzPlanVerwerfen (Blitzturnier) gaben ihren Wert synchron
      zurück und sind jetzt async: jede Stelle, die sie (oder blzAnzahl, das selbst wartet)
      aufruft, steht in einer async-Funktion und wartet mit await – sonst bekäme ein Aufrufer
      ein Promise statt true/false bzw. statt des Namens, und ein Promise ist immer „wahr“.
   c) Gesamtprüfung: in keiner JS- oder HTML-Datei der App steht außerhalb von Kommentaren
      noch ein Systemdialog – bis auf die vier Rückfallzweige `typeof frageJaNein==="function"
      ? … : confirm(…)` (boot.js _tlFrage und tgRename, md-kindtraining.js, views.js bewRundeStop).
   d) Paket 3: der tote Eltern-Block edLoad/edSignup/fgLoad/fgOffer/fgJoin (Tabellen
      eltern_dabei und fahrgemeinschaft, die es nicht gibt) ist gelöscht.
   e) Gerendert aus vier Bereichen – Blitzturnier (Team umbenennen über das einzeilige Feld;
      Spielplan verwerfen über den async gewordenen Weg), Gegner löschen, Taktikboard
      (Situation benennen über das async gewordene _sitName, Umbenennen): role="dialog",
      aria-modal, Knöpfe ≥ 44 px; „Abbrechen“ schreibt nichts, Bestätigen schreibt genau einmal
      (Zähler auf fetch in der Seite). */
"use strict";
const fs = require("fs"), path = require("path");
const STELLEN = [
  ["md-fundbuero.js", "fundbueroDelete", "frageJaNein"],
  ["md-gegner.js", "gegnerDelete", "frageJaNein"],
  ["md-nest.js", "nestLinkKopieren", "frageText"], ["md-nest.js", "nestLinkZurueckziehen", "frageJaNein"],
  ["md-taktikboard.js", "_sitName", "frageText"], ["md-taktikboard.js", "sitUmbenennen", "frageText"], ["md-taktikboard.js", "sitLoeschen", "frageJaNein"],
  ["md-turnierplan.js", "_blzPlanVerwerfen", "frageJaNein"], ["md-turnierplan.js", "blzTeamPlus", "frageText"], ["md-turnierplan.js", "blzRename", "frageText"],
  ["md-turnierplan.js", "blzStart", "frageJaNein"], ["md-turnierplan.js", "blzEnde", "frageJaNein"], ["md-turnierplan.js", "blzReset", "frageJaNein"],
  ["md-turnierplan.js", "htRegelnVorlage", "frageJaNein"], ["md-turnierplan.js", "htTeamWeg", "frageJaNein"], ["md-turnierplan.js", "htGenerieren", "frageJaNein"],
  ["md-turnierplan.js", "htFinalsFill", "frageJaNein"], ["md-turnierplan.js", "htShare", "frageText"], ["md-turnierplan.js", "htShareErgebnis", "frageText"],
  ["md-turnierplan.js", "htDelete", "frageJaNein"], ["md-turnierplan.js", "fstPlanErstellen", "frageJaNein"],
  ["views.js", "kaderEditDelete", "frageJaNein"], ["views.js", "kontakteDelEmail", "frageJaNein"], ["views.js", "kontakteDelPhone", "frageJaNein"],
  ["views.js", "kindLinkShare", "frageText"], ["views.js", "zieleDelete", "frageJaNein"], ["views.js", "delPlayer", "frageJaNein"],
  ["views.js", "delSnapshot", "frageJaNein"], ["views.js", "kindVollstaendigLoeschen", "frageJaNein"], ["views.js", "tpollDelete", "frageJaNein"],
  ["views.js", "wahlDelete", "frageJaNein"], ["views.js", "probeDelete", "frageJaNein"], ["views.js", "albumFotoDelete", "frageJaNein"],
  ["views.js", "kabineCodeSave", "frageJaNein"], ["views.js", "nutzungAufraeumen", "frageJaNein"], ["views.js", "heftReporterDelete", "frageJaNein"],
];
const TOT = ["edLoad", "edSignup", "fgLoad", "fgOffer", "fgJoin"];
// Die vier dokumentierten Rückfallzweige: Datei → Anzahl
const RUECKFALL = { "boot.js": 2, "md-kindtraining.js": 1, "views.js": 1 };
const SYS = /(^|[^\w.$])(window\.)?(prompt|confirm|alert)\s*\(/;

function rumpfVon(q, fn) {
  const start = q.search(new RegExp(`(^|\\n)(async\\s+)?function\\s+${fn}\\s*\\(`));
  if (start < 0) return null;
  const rest = q.slice(start + 1);
  const ende = rest.search(/\n(async\s+)?function\s/);
  return ende < 0 ? rest : rest.slice(0, ende);
}

module.exports = async function (h) {
  const titel = "v875 Systemdialoge Pakete 2+3: übriger Trainerbereich als Fenster der App, toter Eltern-Code weg";
  const probleme = [], zeilen = [];
  const lies = d => fs.readFileSync(path.join(h.REPO, d), "utf8");

  // a) Quelltext der 36 Stellen
  if (STELLEN.length !== 36) probleme.push(`a) Liste hat ${STELLEN.length} statt 36 Stellen`);
  for (const [datei, fn, ersatz] of STELLEN) {
    const rumpf = rumpfVon(lies(datei), fn);
    if (rumpf == null) { probleme.push(`a) ${datei}: ${fn} fehlt`); continue; }
    if (SYS.test(rumpf)) probleme.push(`a) ${datei}: ${fn} ruft noch einen Systemdialog auf`);
    if (!rumpf.includes(ersatz + "(")) probleme.push(`a) ${datei}: ${fn} nutzt ${ersatz} nicht`);
  }
  if (!probleme.length) zeilen.push(`a) ${STELLEN.length} Stellen ohne prompt/confirm/alert`);

  // b) Aufrufketten der async gewordenen Rückgabewerte
  {
    const vorher = probleme.length;
    const quellen = fs.readdirSync(h.REPO).filter(f => f.endsWith(".js"));
    let aufrufe = 0;
    for (const datei of quellen) {
      const q = lies(datei);
      for (const fn of ["_sitName", "_blzPlanVerwerfen", "blzAnzahl", "_abschlussAnpassen"]) {
        const re = new RegExp(`(^|[^\\w.$])${fn}\\s*\\(`, "g"); let m;
        while ((m = re.exec(q))) {
          const pos = m.index + m[1].length;
          const zeile = q.slice(q.lastIndexOf("\n", pos) + 1, pos);
          if (/(^|\s)function\s+$/.test(zeile)) continue;                    // die Definition selbst
          if (/^\s*(\/\*|\*|\/\/)/.test(zeile)) continue;                     // Kommentar
          if (q.lastIndexOf("/*", pos) > q.lastIndexOf("*/", pos)) continue;  // Blockkommentar
          if (/["'`]\s*$/.test(zeile)) continue;   // Aufruf als Text im HTML (onclick="…") – der Klick braucht keinen Wert
          aufrufe++;
          if (!/await\s+$/.test(zeile)) { probleme.push(`b) ${datei}:${q.slice(0, pos).split("\n").length}: ${fn}() ohne await`); continue; }
          const davor = q.slice(0, pos), def = davor.lastIndexOf("\nasync function "), sync = davor.lastIndexOf("\nfunction ");
          if (sync > def) probleme.push(`b) ${datei}:${davor.split("\n").length}: ${fn}() in einer Funktion, die nicht async ist`);
        }
      }
    }
    const tp = lies("md-turnierplan.js"), tb = lies("md-taktikboard.js");
    for (const fn of ["_blzPlanVerwerfen", "blzAnzahl", "blzModus", "blzElternAnzahl", "blzTeamPlus", "blzTeamWeg", "abschlussGruppen", "_abschlussAnpassen", "abschlussWunsch", "abschlussTrainer", "abschlussSpielform"])
      if (!new RegExp(`\\nasync function ${fn}\\(`).test(tp)) probleme.push(`b) md-turnierplan.js: ${fn} ist nicht async`);
    for (const fn of ["_sitName", "sitErfassen"])
      if (!new RegExp(`\\nasync function ${fn}\\(`).test(tb)) probleme.push(`b) md-taktikboard.js: ${fn} ist nicht async`);
    if (probleme.length === vorher) zeilen.push(`b) _sitName, _blzPlanVerwerfen, blzAnzahl, _abschlussAnpassen: ${aufrufe} Aufrufe, alle mit await in async-Funktionen`);
  }

  // c) Gesamtprüfung über alle JS- und HTML-Dateien der App
  {
    const dateien = fs.readdirSync(h.REPO).filter(f => /\.(js|html)$/.test(f))
      .concat(["trainer", "eltern", "kinder"].flatMap(d => fs.existsSync(path.join(h.REPO, d))
        ? fs.readdirSync(path.join(h.REPO, d)).filter(f => /\.(js|html)$/.test(f)).map(f => d + "/" + f) : []));
    const re = new RegExp(SYS.source, "g"), rueck = {}, fremd = [];
    for (const datei of dateien) {
      const q = lies(datei); let m; re.lastIndex = 0;
      while ((m = re.exec(q))) {
        const pos = m.index + m[1].length, ls = q.lastIndexOf("\n", pos) + 1, le = q.indexOf("\n", pos);
        const zeile = q.slice(ls, le < 0 ? q.length : le), vor = q.slice(ls, pos);
        const kommentar = /^\s*(\/\*|\*|\/\/)/.test(zeile) || /\/\*|\/\/\s/.test(vor) || q.lastIndexOf("/*", pos) > q.lastIndexOf("*/", pos);
        if (kommentar) continue;
        if (/typeof\s+frage(JaNein|Text)\s*[!=]==\s*["']function["']/.test(zeile)) { rueck[datei] = (rueck[datei] || 0) + 1; continue; }
        fremd.push(`${datei}:${q.slice(0, pos).split("\n").length} ${zeile.trim().slice(0, 70)}`);
      }
    }
    if (fremd.length) probleme.push(`c) ${fremd.length} Systemdialog(e) außerhalb der Rückfallzweige: ` + fremd.slice(0, 6).join(" · "));
    if (JSON.stringify(rueck) !== JSON.stringify(RUECKFALL)) probleme.push("c) Rückfallzweige: " + JSON.stringify(rueck) + " statt " + JSON.stringify(RUECKFALL));
    if (!fremd.length) zeilen.push(`c) ${dateien.length} Dateien: kein prompt/confirm/alert außer den vier Rückfallzweigen ${JSON.stringify(rueck)}`);
  }

  // d) Paket 3 statisch
  {
    const alle = fs.readdirSync(h.REPO).filter(f => f.endsWith(".js")).map(f => [f, lies(f)]);
    const noch = [];
    for (const fn of TOT) for (const [f, q] of alle) if (new RegExp(`(^|\\n)\\s*(async\\s+)?function\\s+${fn}\\s*\\(|[^\\w.$]${fn}\\s*\\(`).test(q.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, ""))) noch.push(`${fn} in ${f}`);
    if (noch.length) probleme.push("d) toter Eltern-Code noch da: " + noch.join(", "));
    if (/rest\/v1\/(eltern_dabei|fahrgemeinschaft)\b/.test(alle.map(x => x[1]).join("\n"))) probleme.push("d) Code spricht eltern_dabei/fahrgemeinschaft noch an");
  }

  // e) gerendert
  const s = await h.starten({ warten: 1500, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), gegner: [{ id: 3, name: "Gegner A", verein: "Gegner A" }],
    taktik_templates: (u, req) => (req.method() === "GET" ? [] : { status: 201, body: "[]" }) }) });
  await h.sichtbarMachen(s.page, "#main-app");
  const r = await s.page.evaluate(async TOT => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const out = { system: [] };
    window.confirm = t => { out.system.push("confirm: " + String(t).slice(0, 40)); return false; };
    window.prompt = t => { out.system.push("prompt: " + String(t).slice(0, 40)); return null; };
    window.alert = t => { out.system.push("alert: " + String(t).slice(0, 40)); };
    const log = [], echt = window.fetch;
    window.fetch = (u, o) => { log.push([((o && o.method) || "GET").toUpperCase(), String(u), o && o.body]); return echt(u, o); };
    const zaehl = (m, t) => log.filter(([mm, uu]) => mm === m && new RegExp("/rest/v1/" + t + "(\\?|$)").test(uu)).length;
    const fenster = id => document.getElementById(id);
    const art = el => el ? { dialog: el.getAttribute("role") === "dialog", modal: el.getAttribute("aria-modal") === "true",
      text: el.textContent.replace(/\s+/g, " ").slice(0, 200),
      klein: [...el.querySelectorAll("button")].filter(b => b.getBoundingClientRect().height > 0 && b.getBoundingClientRect().height < 43.5).length } : null;
    const warteAuf = async id => { for (let i = 0; i < 60 && !fenster(id); i++) await w(25); return fenster(id); };
    await loadKader();
    out.tot = TOT.filter(fn => typeof window[fn] !== "undefined");

    // 1) Blitzturnier: Team umbenennen (frageText, einzeilig)
    blitzOpen(); await w(1600);   // blitzOpen speichert selbst einmal (gebündelt nach 1,2 s) – das ist die Grundlinie
    out.blz = {};
    const basis = zaehl("POST", "trainingsturnier");
    const team = BLZ.teams[0], alt = team.name;
    let p = blzRename(0); const ft = await warteAuf("frage-text-modal");
    out.blz.ab = art(ft);
    out.blz.feld = (ft?.querySelector("#frage-text-feld") || {}).tagName;
    out.blz.wert = (ft?.querySelector("#frage-text-feld") || {}).value;
    ft?.querySelector("#frage-text-ab").click(); await p; await w(1500);
    out.blz.nameNachAb = team.name === alt; out.blz.nachAb = zaehl("POST", "trainingsturnier") - basis;
    p = blzRename(0); const ft2 = await warteAuf("frage-text-modal");
    if (ft2) { ft2.querySelector("#frage-text-feld").value = "Die Blauen"; ft2.querySelector("#frage-text-ok").click(); }
    await p; await w(1600);
    out.blz.name = team.name; out.blz.nachOk = zaehl("POST", "trainingsturnier") - basis;

    // 2) Blitzturnier: Spielplan mit Ergebnis verwerfen – über blzAnzahl → _blzPlanVerwerfen (async)
    out.vw = {};
    const n0 = BLZ.anzahl, n1 = n0 === 3 ? 4 : 3;
    BLZ.plan = [{ a: 0, b: 1, ta: 1, tb: 0, phase: "runde" }];
    p = blzAnzahl(n1); const fv = await warteAuf("frage-modal");
    out.vw.ab = art(fv); out.vw.ja = (fv?.querySelector("#frage-ja") || {}).textContent;
    fv?.querySelector("#frage-nein").click(); out.vw.wert = await p;
    out.vw.nachAb = { plan: BLZ.plan.length, anzahl: BLZ.anzahl === n0 };
    p = blzAnzahl(n1); const fv2 = await warteAuf("frage-modal");
    fv2?.querySelector("#frage-ja").click(); await p;
    out.vw.nachOk = { plan: BLZ.plan.length, anzahl: BLZ.anzahl === n1 };
    document.getElementById("blitz-modal")?.remove(); await w(100);

    // 3) Gegner löschen
    out.gg = {};
    await gegnerLoad(true);
    p = gegnerDelete(3); const fg = await warteAuf("frage-modal");
    out.gg.ab = art(fg); out.gg.ja = (fg?.querySelector("#frage-ja") || {}).textContent;
    fg?.querySelector("#frage-nein").click(); await p; await w(150);
    out.gg.nachAb = zaehl("DELETE", "gegner");
    p = gegnerDelete(3); const fg2 = await warteAuf("frage-modal");
    fg2?.querySelector("#frage-ja").click(); await p; await w(200);
    out.gg.nachOk = zaehl("DELETE", "gegner");

    // 4) Taktikboard: Situation erfassen → Name über das async gewordene _sitName
    out.sit = {};
    p = sitErfassen({ hoch: true, s: [[90, 200, "g", "A"]], b: [[90, 190]] }, "4+1"); const fs1 = await warteAuf("frage-text-modal");
    out.sit.ab = art(fs1);
    out.sit.feld = (fs1?.querySelector("#frage-text-feld") || {}).tagName;
    out.sit.vorschlag = (fs1?.querySelector("#frage-text-feld") || {}).value;
    out.sit.vorDemNamen = zaehl("POST", "taktik_templates");   // es darf erst nach dem Namen gespeichert werden
    if (fs1) { fs1.querySelector("#frage-text-feld").value = "Prüf-Situation"; fs1.querySelector("#frage-text-ok").click(); }
    await p; await w(200);
    const posts = log.filter(([m, u]) => m === "POST" && /\/rest\/v1\/taktik_templates/.test(u));
    out.sit.posts = posts.length;
    try { out.sit.name = JSON.parse(posts[0][2]).name; } catch (e) { out.sit.name = "?" + e; }
    // Umbenennen: Abbrechen schreibt nichts, Übernehmen genau einmal
    _sitListe = [{ id: 41, name: "Konter über links", created_at: "2026-09-20T10:00:00Z", data: { typ: "skizze", spec: { s: [] } } }];
    p = sitUmbenennen(41); const fs2 = await warteAuf("frage-text-modal");
    out.sit.umAb = art(fs2);
    fs2?.querySelector("#frage-text-ab").click(); await p; await w(150);
    out.sit.umNachAb = zaehl("PATCH", "taktik_templates");
    _sitListe = [{ id: 41, name: "Konter über links", created_at: "2026-09-20T10:00:00Z", data: { typ: "skizze", spec: { s: [] } } }];
    p = sitUmbenennen(41); const fs3 = await warteAuf("frage-text-modal");
    if (fs3) { fs3.querySelector("#frage-text-feld").value = "Konter über rechts"; fs3.querySelector("#frage-text-ok").click(); }
    await p; await w(200);
    out.sit.umNachOk = zaehl("PATCH", "taktik_templates");
    return out;
  }, TOT).catch(e => ({ fehler: String(e) }));
  const fe = s.fehler(); await s.schliessen();
  if (r.fehler) return h.ergebnis(titel, false, probleme.concat(["Fehler im Ablauf: " + r.fehler]));
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  if (r.system.length) probleme.push("Systemdialog aufgerufen: " + r.system.join(" · "));
  if (r.tot.length) probleme.push("d) im Browser noch definiert: " + r.tot.join(", "));
  else zeilen.push(`d) ${TOT.join(", ")}: weder im Quelltext noch im Browser`);
  const fensterOk = (x, wo) => {
    if (!x) { probleme.push(`${wo}: kein Fenster der App`); return false; }
    if (!x.dialog || !x.modal) { probleme.push(`${wo}: Fenster ohne role="dialog"/aria-modal`); return false; }
    if (x.klein) { probleme.push(`${wo}: ${x.klein} Knöpfe unter 44 px`); return false; }
    return true;
  };
  const b = r.blz;
  if (fensterOk(b.ab, "e1) Blitzturnier Team umbenennen")) {
    if (b.feld !== "INPUT") probleme.push("e1) Team umbenennen: kein einzeiliges Feld (" + b.feld + ")");
    else if (!b.wert) probleme.push("e1) Team umbenennen: alter Name steht nicht im Feld");
    else if (!b.nameNachAb || b.nachAb !== 0) probleme.push("e1) „Abbrechen“ hat trotzdem geändert/gespeichert: " + JSON.stringify(b));
    else if (b.name !== "Die Blauen" || b.nachOk !== 1) probleme.push("e1) „Übernehmen“: " + JSON.stringify({ name: b.name, gespeichert: b.nachOk }));
    else zeilen.push("e1) Blitzturnier · Team umbenennen: einzeiliges Feld mit altem Namen, Abbrechen ändert nichts, Übernehmen speichert einmal");
  }
  const v = r.vw;
  if (fensterOk(v.ab, "e2) Blitzturnier Spielplan verwerfen")) {
    if (v.wert !== undefined) probleme.push("e2) blzAnzahl liefert einen Wert: " + JSON.stringify(v.wert));
    if (v.ja !== "Verwerfen" || !/Ergebnisse/.test(v.ab.text)) probleme.push("e2) Text/Knopf: " + JSON.stringify([v.ja, v.ab.text.slice(0, 80)]));
    else if (v.nachAb.plan !== 1 || !v.nachAb.anzahl) probleme.push("e2) „Abbrechen“ hat den Plan trotzdem verworfen: " + JSON.stringify(v.nachAb));
    else if (v.nachOk.plan !== 0 || !v.nachOk.anzahl) probleme.push("e2) „Verwerfen“ hat nicht verworfen: " + JSON.stringify(v.nachOk));
    else zeilen.push("e2) Blitzturnier · Team-Anzahl bei Ergebnissen: Abbrechen behält Plan und Anzahl, „Verwerfen“ verwirft (await durch blzAnzahl → _blzPlanVerwerfen)");
  }
  const g = r.gg;
  if (fensterOk(g.ab, "e3) Gegner löschen")) {
    if (g.ja !== "Löschen" || !/Gegner A/.test(g.ab.text)) probleme.push("e3) Text/Knopf: " + JSON.stringify([g.ja, g.ab.text.slice(0, 80)]));
    else if (g.nachAb !== 0 || g.nachOk !== 1) probleme.push("e3) Gegner: " + JSON.stringify({ nachAb: g.nachAb, nachOk: g.nachOk }));
    else zeilen.push("e3) Gegner löschen: Abbrechen löscht nichts, „Löschen“ löscht einmal");
  }
  const t = r.sit;
  if (fensterOk(t.ab, "e4) Taktikboard Situation benennen")) {
    if (t.feld !== "INPUT" || !/^4\+1 · /.test(t.vorschlag || "")) probleme.push("e4) Name: Feld/Vorschlag " + JSON.stringify([t.feld, t.vorschlag]));
    else if (t.vorDemNamen !== 0) probleme.push("e4) gespeichert, bevor der Name feststand");
    else if (t.posts !== 1 || t.name !== "Prüf-Situation") probleme.push("e4) erfasst: " + JSON.stringify({ posts: t.posts, name: t.name }));
    else zeilen.push("e4) Taktikboard · Situation erfassen: wartet auf den Namen aus dem Fenster, speichert ihn einmal als Text");
  }
  if (fensterOk(t.umAb, "e5) Taktikboard Umbenennen")) {
    if (t.umNachAb !== 0 || t.umNachOk !== 1) probleme.push("e5) Umbenennen: " + JSON.stringify({ nachAb: t.umNachAb, nachOk: t.umNachOk }));
    else zeilen.push("e5) Taktikboard · Umbenennen: Abbrechen speichert nichts, Übernehmen einmal");
  }
  const post = s.gesendet.find(x => x.methode === "POST" && /taktik_templates$/.test(x.pfad));
  if (post && (typeof post.body.name !== "string")) probleme.push("e4) Name ist kein Text: " + JSON.stringify(post.body.name));
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
