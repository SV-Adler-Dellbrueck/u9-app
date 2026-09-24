/* v603 · Befunde aus der App-Prüfung vom 24.09.2026

   a) DIE SICHERUNG KENNT JEDE TABELLE, DIE DIE APP ANSPRICHT – ODER NENNT DEN GRUND.
      Bis v602 sicherte backupExport 29 von rund hundert Tabellen. Das Projekt läuft im
      kostenlosen Supabase-Plan, der selbst keine Sicherungen anlegt; die Datei aus der
      App ist die einzige. Es fehlten u. a. die Einwilligungen (dsgvo_consent,
      foto_consent) und die Eltern-Zuordnung (eltern_kinder). Pflicht 3 aus CLAUDE.md
      wurde bis hierher nie geprüft, jede Ergänzung kam erst nach einer Lücke.
      Geprüft wird deshalb die Regel, nicht die Liste: Jeder Tabellenname hinter
      `rest/v1/` im Code steht in der Sicherung ODER in SICHERUNG_AUSNAHMEN, mit Grund.
      Eine neue Tabelle ohne Eintrag macht diesen Lauf rot.

   b) Die Sicherung holt wirklich jede Tabelle ihrer Liste – gemessen an den Anfragen,
      die backupExport im Browser stellt – und schreibt die Ausnahmen samt Grund in die
      Datei, damit eine bewusste Lücke nicht für einen Fehler gehalten wird.

   c) ÜBUNGSNAMEN WERDEN MASKIERT. Die Edge Function ki-uebung kürzt den Titel, entfernt
      aber kein Markup, und der Titel landet als `trainingsformen.name`. An zwei Stellen
      des Trainingsplans lief er ungefiltert ins HTML: in die Übungsauswahl
      (tpOnCatChange) und in die Einzelspieler-Empfehlung (tpIndPlayerChange), dort als
      Knopfinhalt. Die eigene Regel (v581): was von außen kommt, wird geprüft – auch
      Antworten der eigenen KI.

   d) DER ELTERN-EINSTIEG STARTET OHNE FEHLER. loadDB griff ungeschützt auf die
      Statusanzeige #cdot/#clbl zu, die es nur in der Trainer-Oberfläche gibt. Der
      Fehlerzweig tat dasselbe, warf also auch – `_dbLoaded` blieb ungesetzt.

   e) DIE PIN-FELDER HABEN EINEN NAMEN. axe-core meldete sie als kritischen Verstoß: ein
      Screenreader las viermal „Eingabefeld“, ohne zu sagen, wofür.

   f) staerken_von IST KEIN ENDPUNKT. Die Migration entzieht anon und authenticated das
      Aufrufrecht, und der Browser ruft die Funktion nirgends auf – sonst bräche er mit der
      Migration. */
"use strict";

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");
  const jsDateien = fs.readdirSync(h.REPO).filter(f => f.endsWith(".js"));
  const code = jsDateien.map(f => fs.readFileSync(path.join(h.REPO, f), "utf8")).join("\n");
  const views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");

  // ── a) Jede angesprochene Tabelle ist gesichert oder begründet ausgenommen ────
  let liste = [], ausnahmen = {};
  {
    const m = views.match(/async function backupExport\(\)[\s\S]*?const tables=\[([\s\S]*?)\];/);
    if (!m) probleme.push("a) Die Tabellenliste von backupExport nicht gefunden");
    else liste = [...m[1].replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")
                        .matchAll(/"([a-z_]+)"/g)].map(x => x[1]);
    const doppelt = liste.filter((t, i) => liste.indexOf(t) !== i);
    if (doppelt.length) probleme.push("a) Doppelt in der Sicherung: " + [...new Set(doppelt)].join(", "));

    const a = views.match(/const SICHERUNG_AUSNAHMEN=\{([\s\S]*?)\n\};/);
    if (!a) probleme.push("a) SICHERUNG_AUSNAHMEN nicht gefunden");
    else for (const x of a[1].matchAll(/^\s*([a-z_]+):"([^"]*)"/gm)) ausnahmen[x[1]] = x[2];

    const imCode = [...new Set([...code.matchAll(/rest\/v1\/([a-z_]+)/g)].map(x => x[1]))].filter(t => t !== "rpc");
    const offen = imCode.filter(t => !liste.includes(t) && !(t in ausnahmen));
    if (offen.length) probleme.push(`a) ${offen.length} Tabelle(n) spricht die App an, ohne dass sie gesichert oder begründet ausgenommen sind: ${offen.join(", ")}`);
    const beides = Object.keys(ausnahmen).filter(t => liste.includes(t));
    if (beides.length) probleme.push("a) Zugleich gesichert und ausgenommen: " + beides.join(", "));
    const ohneGrund = Object.entries(ausnahmen).filter(([, g]) => g.trim().length < 20).map(([t]) => t);
    if (ohneGrund.length) probleme.push("a) Ausnahme ohne erkennbaren Grund: " + ohneGrund.join(", "));
    for (const pflicht of ["dsgvo_consent", "foto_consent", "eltern_kinder", "profiles", "punkte_log", "rueckmeldungen", "gegner", "trainingsplan"])
      if (!liste.includes(pflicht)) probleme.push(`a) „${pflicht}“ fehlt in der Sicherung`);
    zeilen.push(`a) ${imCode.length} Tabellen im Code: ${imCode.filter(t => liste.includes(t)).length} gesichert, ${imCode.filter(t => t in ausnahmen).length} begründet ausgenommen (${Object.keys(ausnahmen).join(", ")}); Liste insgesamt ${liste.length}`);
  }

  // ── b) backupExport holt jede Tabelle und schreibt die Ausnahmen in die Datei ──
  {
    const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
    const r = await s.page.evaluate(async () => {
      const geholt = [];
      const echt = window.fetch;
      window.fetch = function (u, o) { const m = String(u).match(/rest\/v1\/([a-z_]+)\?select=\*/); if (m) geholt.push(m[1]); return echt.apply(this, arguments); };
      let datei = null;
      const echtURL = URL.createObjectURL;
      URL.createObjectURL = b => { datei = b; return "blob:pruef"; };
      const echtToken = window.sbToken; window.sbToken = () => "pruef-token";
      const echtClick = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () {};
      try { await backupExport(); } finally {
        window.fetch = echt; URL.createObjectURL = echtURL; window.sbToken = echtToken; HTMLAnchorElement.prototype.click = echtClick;
      }
      const inhalt = datei ? JSON.parse(await datei.text()) : null;
      return { geholt, meta: inhalt && inhalt._meta, schluessel: inhalt ? Object.keys(inhalt).length : 0 };
    });
    const fehlt = liste.filter(t => !r.geholt.includes(t));
    if (!r.meta) probleme.push("b) backupExport hat keine Datei erzeugt");
    else {
      if (fehlt.length) probleme.push("b) Nicht abgefragt: " + fehlt.join(", "));
      const ns = r.meta.nicht_gesichert || {};
      if (!Object.keys(ausnahmen).every(t => ns[t])) probleme.push("b) Die Ausnahmen samt Grund fehlen in der Sicherungsdatei (_meta.nicht_gesichert)");
      zeilen.push(`b) ${r.geholt.length} Tabellen abgefragt, Datei mit ${r.schluessel - 1} Tabellen und ${Object.keys(ns).length} benannten Ausnahmen`);
    }
    const f = s.fehler();
    if (f.length) probleme.push("Konsole (b): " + f.join(" | "));
    await s.schliessen();
  }

  // ── c) Übungsnamen und Kindernamen kommen als Text, nicht als Markup ──────────
  {
    const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
    const r = await s.page.evaluate(() => {
      const boese = '<img src=x onerror="window.__xss=1">Probe<b>fett</b>';
      CUSTOM_FORMS.push({ name: boese, kat: "individual", deficit: "f_pass", dauer: '<i>5</i> Min', beschreibung: "", tags: "KI" });
      CUSTOM_FORMS.push({ name: boese + " 2", kat: "passspiel", dauer: '<i>7</i> Min', beschreibung: "", tags: "KI" });
      const out = {};
      // Übungsauswahl
      const cat = document.createElement("select"); cat.id = "tp-cat-97-0"; cat.innerHTML = '<option value="">alle</option>';
      const sel = document.createElement("select"); sel.id = "tp-pruef-97";
      document.body.append(cat, sel);
      tpOnCatChange("tp-pruef-97", 97, 0);
      const opt = [...sel.options].find(o => o.textContent.includes("Probe"));
      out.optionText = opt ? opt.textContent : null;
      // Einzelspieler-Empfehlung
      localStorage.setItem("adler_player_Kind <b>A</b>", JSON.stringify({ f_pass: 1 }));
      const ps = document.createElement("select"); ps.id = "tp-ind-player-97";
      const o = document.createElement("option"); o.value = "Kind <b>A</b>"; o.textContent = "Kind A"; ps.append(o); ps.value = o.value;
      const reco = document.createElement("div"); reco.id = "tp-ind-reco-97";
      document.body.append(ps, reco);
      tpIndPlayerChange(97);
      out.recoImg = reco.querySelectorAll("img").length;
      out.recoB = reco.querySelectorAll("b").length;
      out.recoText = reco.textContent;
      return out;
    });
    await s.page.waitForTimeout(300);
    const xss = await s.page.evaluate(() => window.__xss === 1);
    if (!r.optionText || !r.optionText.includes("<b>fett</b>") || !r.optionText.includes("<i>7</i>"))
      probleme.push(`c) Übungsauswahl zeigt den Namen nicht als Text (Option: ${JSON.stringify(r.optionText)})`);
    if (r.recoImg || r.recoB || !r.recoText.includes("<img"))
      probleme.push(`c) Empfehlung setzt Markup aus Übungs- oder Kindernamen um (img ${r.recoImg}, b ${r.recoB})`);
    if (xss) probleme.push("c) Ein onerror aus einem Übungsnamen wurde ausgeführt");
    if (!probleme.some(p => p.startsWith("c)"))) zeilen.push("c) Übungsname mit <img onerror> und <b>: in Auswahl und Empfehlung als Text, nichts ausgeführt");
    await s.schliessen();
  }

  // ── d) Eltern-Einstieg ohne Fehler, _dbLoaded gesetzt ───────────────────────
  {
    const s = await h.starten({ start: "/eltern/index.html", supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
    await s.page.waitForTimeout(1500);
    const r = await s.page.evaluate(async () => {
      if (typeof loadDB === "function") { try { await loadDB(); } catch (e) { return { wurf: String(e && e.message) }; } }
      return { geladen: window._dbLoaded === true, cdot: !!document.getElementById("cdot") };
    });
    const f = s.fehler().filter(x => /cdot|clbl|className/.test(x));
    if (r.wurf) probleme.push("d) loadDB wirft im Eltern-Einstieg: " + r.wurf);
    if (f.length) probleme.push("d) Fehler beim Start des Eltern-Einstiegs: " + f.join(" | "));
    if (!r.geladen) probleme.push("d) _dbLoaded bleibt im Eltern-Einstieg ungesetzt");
    else zeilen.push(`d) Eltern-Einstieg ohne Statusanzeige (#cdot ${r.cdot ? "da" : "fehlt"}): loadDB läuft durch, _dbLoaded gesetzt`);
    await s.schliessen();
  }

  // ── e) PIN-Felder tragen einen zugänglichen Namen ───────────────────────────
  {
    const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
    const namen = [];
    for (let i = 1; i <= 4; i++) {
      const loc = s.page.locator("#pin" + i);
      const name = await loc.evaluate(el => el.getAttribute("aria-label") || (el.labels && el.labels[0] && el.labels[0].textContent) || "");
      namen.push(name);
    }
    const leer = namen.map((n, i) => n.trim() ? null : i + 1).filter(Boolean);
    if (leer.length) probleme.push("e) PIN-Feld ohne Namen: " + leer.join(", "));
    else zeilen.push("e) PIN-Felder: " + namen.join(" · "));
    await s.schliessen();
  }

  // ── f) staerken_von: gesperrt und vom Browser nicht gebraucht ───────────────
  {
    if (/rpc\/staerken_von/.test(code)) probleme.push("f) Der Browser ruft staerken_von direkt auf – die Migration würde das brechen");
    const mig = path.join(h.REPO, "supabase/migrations/20260924_staerken_von_sperren.sql");
    const sql = fs.existsSync(mig) ? fs.readFileSync(mig, "utf8") : "";
    for (const rolle of ["public", "anon", "authenticated"])
      if (!new RegExp(`revoke execute on function public\\.staerken_von\\(text\\) from ${rolle};`).test(sql))
        probleme.push(`f) Migration entzieht ${rolle} das Aufrufrecht nicht`);
    if (!probleme.some(p => p.startsWith("f)"))) zeilen.push("f) staerken_von: kein Aufruf im Browser, Migration entzieht public/anon/authenticated");
  }

  return h.ergebnis("v603 · Sicherung vollständig, Namen maskiert, Eltern-Start, PIN-Namen, staerken_von", !probleme.length, probleme.length ? probleme : zeilen);
};
