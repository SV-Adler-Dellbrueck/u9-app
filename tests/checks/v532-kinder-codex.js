/* v532 – Paket 2 „Unsere Regeln" (doku/auftrag-adler-luecken).
   Der Fairplay-Codex spricht die Eltern an; für die Kinder gab es nichts Vergleichbares.
   Jetzt steht in der Kabine, wofür diese Mannschaft steht – sechs Sätze, die ein
   Achtjähriger aufsagen kann.

   Geprüft werden die Zusagen des Pakets, nicht die Optik:
   a) Kachel „Unsere Regeln" in der Kabine, in der Gruppe Team & Spaß.
   b) Ohne Netz stehen die sechs Sätze trotzdem – und wortgleich mit dem Startinhalt
      der Migration (sonst sehen Kinder offline etwas anderes als online).
   c) Aus der Datenbank gewinnen die Sätze des Trainers; inaktive bleiben draußen,
      ein siebter wird abgeschnitten.
   d) Der Editor schreibt ALLE Spalten zurück – nr, satz UND aktiv (CLAUDE.md-Falle:
      eine fehlende Spalte wäre nach dem Speichern für alle Zeilen leer).
   e) Höchstens sechs aktive Sätze: der siebte wird mit einem HINWEIS abgelehnt, nicht
      mit einer Fehlermeldung, und der Knopf ist dann aus.
   f) Lesbar für ein Kind: Schriftgröße und Zeilenabstand der Sätze in der Kabine.

   Die RLS-Gegenprobe (Abnahme 4) steht NICHT hier: Supabase ist in dieser Prüfung eine
   Attrappe, die jede Regel bestätigen würde, die man ihr vorgibt. Sie ist direkt auf der
   Datenbank gefahren (anon liest, anon schreibt nicht) und in der PR belegt. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];

  // ── Kabine: Kachel, Fallback, Datenbank-Sätze ──────────────────────────────────
  async function kabine(tabellen) {
    const s = await h.starten({ start: "/eltern/index.html", warten: 900, breite: 390,
      supabase: h.supabaseAttrappe(tabellen) });
    const r = await s.page.evaluate(async () => {
      const out = { fehlt: typeof kabineCodex !== "function" };
      if (out.fehlt) return out;
      out.fallback = (typeof KINDER_CODEX !== "undefined") ? KINDER_CODEX.slice() : null;
      out.max = (typeof KINDER_CODEX_MAX !== "undefined") ? KINDER_CODEX_MAX : null;

      // a) Kachel in der Kabine
      if (typeof kabineOpen === "function") kabineOpen();
      for (let i = 0; i < 40 && !document.getElementById("kabine-body"); i++) await new Promise(r => setTimeout(r, 50));
      const wrap = document.getElementById("kabine-body");
      out.kabineDa = !!wrap;
      if (wrap) {
        const k = [...wrap.querySelectorAll("button")].find(b => /kabineCodex/.test(b.getAttribute("onclick") || ""));
        out.kachel = k ? k.textContent.replace(/\s+/g, " ").trim() : "";
        // Steht sie in der Gruppe „Team & Spaß"? Die Überschrift davor zählt.
        if (k) {
          let e = k.previousElementSibling, gruppe = "";
          while (e && !gruppe) { const t = (e.textContent || "").trim(); if (/^[A-ZÄÖÜ][^<]{2,24}$/.test(t) && e.tagName === "DIV") gruppe = t; e = e.previousElementSibling; }
          out.gruppe = gruppe;
        }
      }

      // Ansicht öffnen und die Sätze lesen
      await kabineCodex();
      const b = document.getElementById("kabine-body");
      const karten = b ? [...b.querySelectorAll("div[style*='font-size:21px']")] : [];
      out.saetze = karten.map(e => e.textContent.trim());
      if (karten[0]) {
        const cs = getComputedStyle(karten[0]);
        out.groesse = Math.round(parseFloat(cs.fontSize) || 0);
        out.zeile = Math.round((parseFloat(cs.lineHeight) || 0) * 10) / 10;
        out.ueberlauf = Math.max(0, karten[0].scrollWidth - karten[0].clientWidth);
      }
      out.zurueck = b ? [...b.querySelectorAll("button")].some(x => /kabineHome/.test(x.getAttribute("onclick") || "")) : false;
      return out;
    });
    const fehler = s.fehler(); await s.schliessen();
    return { ...r, fehler };
  }

  // b) ohne Netz: die Tabelle antwortet wie nicht vorhanden
  const offline = await kabine({});
  if (offline.fehlt) {
    probleme.push("kabineCodex gibt es nicht – die Kabinen-Ansicht fehlt ganz");
    return h.ergebnis("Unsere Regeln (Codex in Kindersprache)", false, probleme);
  }
  if (!offline.kabineDa) probleme.push("die Kabine ließ sich nicht öffnen – Kachel nicht prüfbar");
  if (!/Unsere Regeln/.test(offline.kachel || "")) probleme.push(`Kachel fehlt oder heißt anders: „${offline.kachel}“`);
  if (!/🤝/.test(offline.kachel || "")) probleme.push("Kachel ohne das vereinbarte Zeichen 🤝");
  if (!/Team & Spaß/.test(offline.gruppe || "")) probleme.push(`Kachel steht in der Gruppe „${offline.gruppe}“ (erwartet „Team & Spaß“)`);
  if (offline.saetze.length !== 6) probleme.push(`ohne Netz stehen ${offline.saetze.length} Sätze da (erwartet 6 aus dem Fallback)`);
  if (!offline.zurueck) probleme.push("kein Zurück-Knopf in der Ansicht");
  if (offline.max !== 6) probleme.push(`KINDER_CODEX_MAX ist ${offline.max} (erwartet 6)`);

  // b) Fallback wortgleich mit der Migration
  const fs = require("fs"), path = require("path");
  /* v566: der Schiri-Satz wurde per Nachtrag ersetzt – gelesen wird die Erstanlage samt allen
     späteren Nachträgen, die den Codex ändern. */
  const sql = ["20260913_kinder_codex.sql", "20260915_mitbringen_und_ohne_schiri.sql"]
    .map(n => { try { return fs.readFileSync(path.join(h.REPO, "supabase/migrations", n), "utf8"); } catch (e) { return ""; } }).join("\n");
  (offline.fallback || []).forEach(satz => {
    // In SQL stehen einfache Anführungszeichen verdoppelt.
    if (!sql.includes(satz.replace(/'/g, "''"))) probleme.push(`Fallback-Satz steht nicht in der Migration: „${satz}“`);
  });

  // f) lesbar für ein Kind
  if ((offline.groesse || 0) < 18) probleme.push(`Schriftgröße der Sätze ${offline.groesse} px (zu klein für ein Kind, das lesen lernt)`);
  if ((offline.zeile || 0) < offline.groesse * 1.25) probleme.push(`Zeilenabstand ${offline.zeile} px bei ${offline.groesse} px Schrift – zu eng`);
  if ((offline.ueberlauf || 0) > 1) probleme.push(`Satz läuft bei 390 px um ${offline.ueberlauf} px heraus`);

  // c) Datenbank gewinnt, inaktive raus, siebter abgeschnitten
  const db = await kabine({ kinder_codex: (u) => {
    // Die App fragt bereits mit aktiv=is.true – inaktive kämen gar nicht mit.
    const nurAktive = /aktiv=is\.true/.test(u.search);
    const alle = [
      { nr: 0, satz: "Wir sind ein Team.",        aktiv: true },
      { nr: 1, satz: "Wir hören einander zu.",    aktiv: true },
      { nr: 2, satz: "Ausgeblendeter Satz",       aktiv: false },
      { nr: 3, satz: "Satz drei",  aktiv: true }, { nr: 4, satz: "Satz vier", aktiv: true },
      { nr: 5, satz: "Satz fünf",  aktiv: true }, { nr: 6, satz: "Satz sechs", aktiv: true },
      { nr: 7, satz: "Der siebte darf nicht stehen", aktiv: true }
    ];
    return nurAktive ? alle.filter(x => x.aktiv) : alle;
  } });
  if (db.saetze[0] !== "Wir sind ein Team.") probleme.push(`aus der Datenbank kam nicht der erste Satz, sondern „${db.saetze[0]}“`);
  if (db.saetze.length !== 6) probleme.push(`aus der Datenbank stehen ${db.saetze.length} Sätze da (erwartet 6 – der siebte muss wegfallen)`);
  if (db.saetze.includes("Ausgeblendeter Satz")) probleme.push("ein ausgeblendeter Satz steht in der Kabine");
  if (db.saetze.includes("Der siebte darf nicht stehen")) probleme.push("der siebte Satz steht in der Kabine");

  // ── Trainer-Editor: alle Spalten, Grenze mit Hinweis ───────────────────────────
  const t = await h.starten({ warten: 900, supabase: h.supabaseAttrappe({
    kinder_codex: [{ nr: 0, satz: "Jeder spielt.", aktiv: true },
                   { nr: 1, satz: "Der Schiri hat recht.", aktiv: true },
                   { nr: 2, satz: "Ein ausgeblendeter", aktiv: false }]
  }) });
  const te = await t.page.evaluate(async () => {
    const out = { fehlt: typeof codexKinderEditOpen !== "function" };
    if (out.fehlt) return out;
    window.sbToken = () => "t";
    await codexKinderEditOpen();
    for (let i = 0; i < 40 && !document.getElementById("kce-card"); i++) await new Promise(r => setTimeout(r, 50));
    const c = document.getElementById("kce-card");
    if (!c) { out.fensterFehlt = true; return out; }
    out.zeilen = c.querySelectorAll("textarea").length;
    out.dialog = document.getElementById("kce-modal")?.getAttribute("aria-modal") === "true";

    // e) Grenze: auf sechs auffüllen, dann den siebten versuchen
    /* Auf sechs auffüllen. Die Schleife hat eine harte Obergrenze: griffe die Grenze
       im Editor nicht, liefe sie sonst endlos statt einen Befund zu melden. */
    let schutz = 0;
    while (codexKinderAktive() < 6 && schutz++ < 20) codexKinderEditAdd();
    out.aufgefuellt = schutz < 20;
    codexKinderEditRender();
    out.beiSechs = codexKinderAktive();
    const vorher = KC_EDIT.length;
    codexKinderEditAdd();                       // muss abgelehnt werden
    out.nachSiebtem = KC_EDIT.length;
    out.abgelehnt = KC_EDIT.length === vorher;
    out.hinweis = (document.querySelector(".toast, #toast, [class*=toast]") || {}).textContent || "";
    const add = [...c.querySelectorAll("button")].find(b => /codexKinderEditAdd/.test(b.getAttribute("onclick") || ""));
    out.knopfAus = add ? add.disabled : null;

    // d) Speichern: alle Spalten zurückschreiben – einer bewusst aus
    KC_EDIT.length = 0;
    KC_EDIT.push({ satz: "Jeder spielt.", aktiv: true },
                 { satz: "Wir räumen gemeinsam auf.", aktiv: true },
                 { satz: "Vorerst aus", aktiv: false },
                 { satz: "   ", aktiv: true });         // leer → muss verworfen werden
    codexKinderEditRender();
    await codexKinderEditSave();
    await new Promise(r => setTimeout(r, 200));
    return out;
  });
  await t.page.waitForTimeout(200);
  const gesendet = t.gesendet.filter(g => /kinder_codex/.test(g.pfad || ""));
  const fehlerT = t.fehler(); await t.schliessen();

  if (te.fehlt) probleme.push("codexKinderEditOpen gibt es nicht – der Trainer kann die Sätze nicht pflegen");
  else {
    if (te.fensterFehlt) probleme.push("der Editor öffnet kein Fenster");
    if (!te.dialog) probleme.push("Editor ohne aria-modal=\"true\"");
    if (te.zeilen !== 3) probleme.push(`Editor zeigt ${te.zeilen} Sätze (erwartet 3 – auch den ausgeblendeten)`);
    if (te.aufgefuellt === false) probleme.push("der Editor ließ sich nicht auf sechs auffüllen – die Grenze zählt leere Zeilen nicht mit");
    if (te.beiSechs !== 6) probleme.push(`nach dem Auffüllen sind ${te.beiSechs} Sätze an (erwartet 6)`);
    if (!te.abgelehnt) probleme.push(`der siebte Satz ließ sich anlegen (${te.nachSiebtem} Zeilen)`);
    if (!/genug/i.test(te.hinweis || "")) probleme.push(`kein Hinweis beim siebten Satz: „${(te.hinweis || "").slice(0, 60)}“`);
    if (/fehler|error/i.test(te.hinweis || "")) probleme.push("die Grenze meldet sich als Fehler statt als Hinweis");
    if (te.knopfAus !== true) probleme.push("„Satz hinzufügen“ ist bei sechs aktiven Sätzen nicht ausgegraut");

    const del = gesendet.find(g => g.methode === "DELETE");
    const post = gesendet.find(g => g.methode === "POST");
    if (!del) probleme.push("beim Speichern wird die alte Liste nicht gelöscht");
    if (!post) probleme.push("beim Speichern wird nichts geschrieben");
    if (post) {
      const rows = Array.isArray(post.body) ? post.body : [post.body];
      const spalten = Object.keys(rows[0] || {}).sort().join(",");
      if (spalten !== "aktiv,nr,satz") probleme.push(`geschrieben werden die Spalten [${spalten}] – erwartet aktiv,nr,satz (fehlt eine, ist sie danach für alle Zeilen leer)`);
      if (rows.length !== 3) probleme.push(`${rows.length} Zeilen geschrieben (erwartet 3 – der leere Satz fällt weg)`);
      if (!rows.some(r => r.aktiv === false)) probleme.push("der ausgeblendete Satz wurde als aktiv geschrieben – das Ausblenden ginge verloren");
      if (rows.map(r => r.nr).join(",") !== "0,1,2") probleme.push(`Reihenfolge nr=[${rows.map(r => r.nr)}] (erwartet 0,1,2)`);
    }
  }

  if (offline.fehler.length) probleme.push(...offline.fehler.slice(0, 2));
  if (db.fehler.length) probleme.push(...db.fehler.slice(0, 2));
  if (fehlerT.length) probleme.push(...fehlerT.slice(0, 2));

  zeilen.push(`Kachel: „${offline.kachel}“ in Gruppe „${offline.gruppe}“`);
  zeilen.push(`ohne Netz: ${offline.saetze.length} Sätze · ${offline.groesse} px / Zeile ${offline.zeile} px · Überlauf ${offline.ueberlauf} px`);
  zeilen.push(`aus der Datenbank: ${db.saetze.length} Sätze, erster „${db.saetze[0]}“ · inaktiv und siebter draußen`);
  const post = gesendet.find(g => g.methode === "POST");
  zeilen.push(`Editor speichert Spalten [${post ? Object.keys((Array.isArray(post.body) ? post.body[0] : post.body) || {}).sort().join(",") : "–"}] · Grenze mit Hinweis ${te.abgelehnt === true}`);

  return h.ergebnis("Unsere Regeln: Kachel, Fallback, sechs Sätze, alle Spalten", !probleme.length, zeilen.concat(probleme));
};
