/* v804 · Datenweg für den Claude-Projekt-Chat (Charles 08.11.2026), ohne Datenbank und ohne Browser.
   a) Export-Skript: feste Whitelist ohne Rohdiktat, Klarnamen, Kontakt- und Elternfelder; Abfragen nennen Spalten einzeln (kein „*“);
      die Ausgabe zeigt Entwurf/Seed/fertig, Konsequenzen mit Frist und Erledigt-Status, „möglicherweise abgeschnitten“ bei langen Notizen
      und eine Warnung, wenn die Namensprüfung etwas meldet; stand.json trägt Zeitstempel und Zeilenzahlen; die Adresse steht nirgends.
   b) Eingang (Rückweg): ein guter Entwurf wird zu einem INSERT als Entwurf („keim“, KI-Vorschlag, nicht bestätigt); schlechte scheitern
      (unbekanntes Alias, Bewertungszahl im Text, Link, falscher Autor, leerer Inhalt); Aliase werden in der Datenbank zu Vornamen. */
"use strict";
const fs = require("fs"), path = require("path"), { pathToFileURL } = require("url");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const ex = await import(pathToFileURL(path.join(h.REPO, "tools/export-tagebuch.mjs")).href);
  const ei = await import(pathToFileURL(path.join(h.REPO, "tools/tagebuch-eingang.mjs")).href);
  // a)
  const verboten = ["diktat", "sprachnotiz", "rueckfragen", "name", "geb", "medical", "email", "foto_path", "rsvp_token", "kommentar", "telefon", "adresse"];
  const alleSpalten = Object.entries(ex.WHITELIST).flatMap(([v, cs]) => cs.map(c => ({ v, c })));
  const treffer = alleSpalten.filter(x => verboten.includes(x.c) && !(x.v === "trainingsformen" && x.c === "name") && !(x.v === "trainingsvorlagen" && x.c === "name"));
  if (treffer.length) probleme.push("a) verbotene Spalten in der Whitelist: " + treffer.map(x => x.v + "." + x.c).join(", "));
  const sqls = Object.keys(ex.WHITELIST).map(ex.spaltenAuswahl);
  if (sqls.some(s => /select\s+\*/i.test(s)) || !sqls.every(s => /from export\./.test(s))) probleme.push("a) Abfrage mit * oder nicht aus dem Schema export");
  const d = Object.fromEntries(Object.keys(ex.WHITELIST).map(k => [k, []]));
  const lang = "Satz. ".repeat(140) + "und es geht weiter ohne Ende";
  d.tagebuch_eintrag = [
    { id: 1, datum: "2026-10-05", quelle: "einheit", anlass: "einheit", baustein: "spiel_spieler", status: "keim", ki_vorschlag: true, bestaetigt: true, autor: "Charles", ausloeser: "Training", beobachtung: "Kind C war ruhig.", aha: null, konsequenz: "Üben", konsequenz_bis: "2026-11-20", konsequenz_erledigt_am: null, beleg: null, anschluss: null, schlagworte: ["Ruhe"], durchgefuehrt: [{ name: "Duell", block: "Hauptteil" }], anwesend_alias: ["Kind A", "Kind C"], termin_id: null },
    { id: 2, datum: "2026-11-06", quelle: "frei", anlass: "gedanke", baustein: "ich", status: "fertig", ki_vorschlag: false, bestaetigt: false, autor: "Charles", ausloeser: "x", beobachtung: "y", aha: "z", konsequenz: "k", konsequenz_bis: null, konsequenz_erledigt_am: "2026-11-07", beleg: null, anschluss: null, schlagworte: [], durchgefuehrt: [], anwesend_alias: [], termin_id: null }];
  d.tagebuch_punkt = [{ id: 9, eintrag_id: 1, art: "konsequenz", text: "Üben", bis: "2026-11-20", erledigt_am: null, dauerhaft: false }, { id: 10, eintrag_id: 77, datum: "2026-11-01", art: "todo", text: "Material", bis: null, erledigt_am: "2026-11-02" }];
  d.einheit_bewertung = [{ datum: "2026-10-05", autor: "Charles", spass: 5, umsetzung: 4, erfolg: 4, notiz: lang }, { datum: "2026-11-02", autor: "Charles", spass: 4, umsetzung: 5, erfolg: 4, notiz: "Kurz und ganz." }];
  const t = ex.renderTagebuch(d, "2026-11-08", [{ tabelle: "tagebuch_eintrag", id: "1", feld: "beobachtung", anzahl: 1 }]);
  const pruef = { entwurf: /ENTWURF\/SEED/.test(t), fertig: /FERTIG/.test(t), frist: /Frist: 20\.11\.2026 — offen/.test(t), erledigt: /erledigt am 02\.11\.2026/.test(t), warnung: /⚠ \*\*Prüfen:\*\*/.test(t), dabei: /Dabei \(2\):\*\* Kind A, Kind C/.test(t), lose: /Weitere Punkte ohne Eintrag/.test(t) };
  if (Object.values(pruef).includes(false)) probleme.push("a) Tagebuch-Ausgabe unvollständig: " + Object.entries(pruef).filter(([, v]) => !v).map(([k]) => k).join(", "));
  const e = ex.renderEinheiten(d, "2026-11-08");
  if (!/möglicherweise abgeschnitten/.test(e) || (e.match(/möglicherweise abgeschnitten/g) || []).length !== 1 || !/Spaß:\*\* 5 von 5/.test(e)) probleme.push("a) Einheiten-Ausgabe: Abschneide-Hinweis oder Sterne");
  const st = ex.baueStand(d, [{ tabelle: "x", id: "1", feld: "f", anzahl: 2 }], new Date("2026-11-08T03:00:00Z"));
  if (st.erzeugt !== "2026-11-08T03:00:00.000Z" || st.zeilen.tagebuch_eintrag !== 2 || st.zeilen.einheit_bewertung !== 2 || st.namens_verdacht.length !== 1 || st.projekt !== "wgbcibqcqidudoksfkcv") probleme.push("a) stand.json: " + JSON.stringify(st).slice(0, 200));
  const rohe = ["tools/export-tagebuch.mjs", "tools/tagebuch-eingang.mjs"].map(f => fs.readFileSync(path.join(h.REPO, f), "utf8")).join("\n");
  if (/postgres(ql)?:\/\/[^\s"']+@|eyJ[A-Za-z0-9_-]{20,}|sb_secret|service_role\s*key/i.test(rohe)) probleme.push("a) Skript enthält Adresse, Schlüssel oder Token");
  zeilen.push(`Whitelist (${alleSpalten.length} Spalten, keine verbotene), Abfragen ohne *, Ausgabe mit Status, Fristen, Abschneide-Hinweis, Warnung, stand.json`);
  // b)
  const gut = `---\ndatum: 2026-11-08\nautor: Charles\nbaustein: spiel_spieler\nanlass: einheit\nschlagworte: Ruhe, Regeln\nkinder: C, K\n---\n## Beobachtung\nKind C war ruhig, Kind K half. Es ist O'Brien-Wetter.\n## Konsequenz\nMit Kind K sprechen.\n`;
  const r = ei.pruefe(gut);
  const sql = r.fehler.length ? "" : ei.baueSql(r);
  if (r.fehler.length || !/insert into tagebuch_eintrag/.test(sql) || !/'keim'/.test(sql) || !/, true, null, 'einheit', 'keim'/.test(sql) || !/alias = 'C'/.test(sql) || !/alias = 'K'/.test(sql) || !/O''Brien/.test(sql) || !/alias in \('C', 'K'\)/.test(sql)) probleme.push("b) guter Entwurf: " + JSON.stringify(r.fehler) + " / " + sql.slice(0, 120));
  const schlecht = {
    "Alias Z": gut.replace("Kind C war ruhig", "Kind Z war ruhig"),
    "kinder Z": gut.replace("kinder: C, K", "kinder: C, Z"),
    "Bewertungszahl": gut.replace("war ruhig", "bekam 4 Sterne"),
    "Link": gut.replace("war ruhig", "war ruhig https://example.org"),
    "Autor": gut.replace("autor: Charles", "autor: Unbekannt"),
    "leer": gut.replace(/## Beobachtung[\s\S]*$/, "## Auslöser\nNur ein Auslöser\n"),
    "Kopf fehlt": "## Beobachtung\nText\n",
  };
  for (const [n, md] of Object.entries(schlecht)) if (!ei.pruefe(md).fehler.length) probleme.push("b) wird fälschlich akzeptiert: " + n);
  zeilen.push("Eingang: guter Entwurf → INSERT als „keim“ mit Alias→Vorname in der Datenbank; 7 schlechte (Alias, Zahl, Link, Autor, leer, Kopf) werden abgelehnt");
  // c) App-Stand: Version aus sw.js, Stand der Übersicht, Änderungsliste, Abgleich in stand.json
  const ap = await import(pathToFileURL(path.join(h.REPO, "tools/export-appstand.mjs")).href);
  const swT = fs.readFileSync(path.join(h.REPO, "sw.js"), "utf8"), uebT = fs.readFileSync(path.join(h.REPO, "doku/Uebersicht_Funktionen-Adler-App_v1.md"), "utf8");
  const vC = ap.appVersion(swT), sC = ap.uebersichtStand(uebT);
  if (!vC || vC !== sC) probleme.push("c) App-Version und Stand der Übersicht nicht lesbar oder verschieden: " + vC + " / " + sC);
  const chg = ap.baueAenderungen([{ datum: "2026-11-08", betreff: "v900: Neu\nZeile (#1)" }, { datum: "2026-11-07", betreff: "v899: Alt" }], "v900");
  if (!/\*\*v900\*\*/.test(chg) || !/## 08\.11\.2026\n\n- v900: Neu Zeile \(#1\)/.test(chg) || chg.indexOf("v900: Neu") > chg.indexOf("v899")) probleme.push("c) Änderungsliste: " + chg.slice(0, 200));
  const erg = ap.ergaenzeStand({ zeilen: { a: 1 } }, "v900", "v899");
  if (erg.zeilen.a !== 1 || erg.app.uebersicht_passt !== false || ap.ergaenzeStand({}, "v9", "v9").app.uebersicht_passt !== true) probleme.push("c) Abgleich in stand.json: " + JSON.stringify(erg));
  /* v807: Funktionen in einer View prüft Postgres mit den Rechten des Aufrufers – ohne EXECUTE schlug der erste Lauf der Action fehl. */
  const mig = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20261112_v807_export_execute.sql"), "utf8");
  const ausf = mig.replace(/--.*$/gm, "");
  if (!/grant execute on function export\.ohne_namen\(text\), export\.kind_alias\(bigint\), export\.json_ohne_namen\(jsonb\) to adler_export_lese;/.test(ausf) || /anon|authenticated|public\b/.test(ausf.replace(/export\./g, ""))) probleme.push("c2) Korrektur-Migration v807: EXECUTE für die Rolle fehlt oder geht an andere");
  zeilen.push("Migration v807: EXECUTE auf den drei Maskier-Funktionen nur für adler_export_lese");
  zeilen.push(`App-Stand: Version ${vC} aus sw.js, Übersicht gleich, Änderungsliste neueste zuerst, Abweichung wird in stand.json sichtbar`);
  return h.ergebnis("v804 Datenweg Projekt-Chat (Export, Eingang)", !probleme.length, probleme.length ? probleme : zeilen);
};
