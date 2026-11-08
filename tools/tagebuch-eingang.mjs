#!/usr/bin/env node
/* v804 · Rückweg vom Claude-Projekt-Chat in die App: Entwürfe über einen Eingangsordner (Charles 08.11.2026).
   Das Projekt hat KEIN Schreibrecht auf die Datenbank. Es legt Entwürfe als Markdown-Datei im PRIVATEN Repo adler-u9-wissen unter
   eingang/tagebuch/ ab (Format: eingang/tagebuch/README.md). Dieses Skript prüft eine solche Datei und macht daraus eine SQL-Anweisung,
   die Claude Code NUR auf ausdrücklichen Auftrag von Charles ausführt. Der Eintrag entsteht als ENTWURF (status „keim“,
   ki_vorschlag, nicht bestätigt) und erscheint in der App unter „Noch zu bestätigen“ – Charles prüft und bestätigt dort.
   Aliase („Kind C“) werden beim Import in die Vornamen zurückverwandelt, denn die App zeigt dem Trainerteam Vornamen.
   Aufruf:  node tools/tagebuch-eingang.mjs pruefen <datei>     – nur prüfen, Ausgabe: OK oder die Fehler
            node tools/tagebuch-eingang.mjs sql <datei>         – prüfen und die INSERT-Anweisung ausgeben (kein Datenbankzugriff) */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const BAUSTEINE = ["ich", "spiel_spieler", "organisation", "system_fussball"];
export const ANLAESSE = ["einheit", "spieltag", "lehrgang", "gedanke"];
export const TRAINER = ["Charles", "Finn", "Kenneth", "Peter", "Markus"];
const ABSCHNITTE = { "Auslöser": "ausloeser", "Beobachtung": "beobachtung", "Aha": "aha", "Konsequenz": "konsequenz", "Beleg": "beleg", "Anschluss": "anschluss" };
const GRENZE = { ausloeser: 600, beobachtung: 8000, aha: 3000, konsequenz: 3000, beleg: 3000, anschluss: 3000 };

export function lese(md) {
  const m = String(md).replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fehler: ["Kopf zwischen --- und --- fehlt"] };
  const kopf = {};
  for (const z of m[1].split("\n")) { const k = z.replace(/#.*$/, "").match(/^\s*([a-z_]+)\s*:\s*(.*?)\s*$/); if (k) kopf[k[1]] = k[2]; }
  const felder = {}; let aktuell = null;
  for (const z of m[2].split("\n")) {
    const h = z.match(/^##\s+(.+?)\s*$/);
    if (h) { aktuell = ABSCHNITTE[h[1]] || null; if (aktuell && !(aktuell in felder)) felder[aktuell] = []; continue; }
    if (aktuell) felder[aktuell].push(z);
  }
  for (const k of Object.keys(felder)) { const t = felder[k].join("\n").trim(); felder[k] = t === "" || t === "–" ? null : t; }
  return { kopf, felder, fehler: [] };
}

export function pruefe(md) {
  const r = lese(md);
  if (r.fehler.length) return r;
  const f = [], { kopf, felder } = r;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(kopf.datum || "") || Number.isNaN(Date.parse(kopf.datum))) f.push("datum fehlt oder ist kein Datum (JJJJ-MM-TT)");
  if (!TRAINER.includes(kopf.autor)) f.push(`autor muss ein Trainer sein (${TRAINER.join(", ")})`);
  if (!BAUSTEINE.includes(kopf.baustein)) f.push(`baustein muss einer von ${BAUSTEINE.join(", ")} sein`);
  if (!ANLAESSE.includes(kopf.anlass)) f.push(`anlass muss einer von ${ANLAESSE.join(", ")} sein`);
  if (kopf.konsequenz_bis && !/^\d{4}-\d{2}-\d{2}$/.test(kopf.konsequenz_bis)) f.push("konsequenz_bis ist kein Datum (JJJJ-MM-TT)");
  const kinder = (kopf.kinder || "").split(",").map((s) => s.trim()).filter(Boolean);
  for (const k of kinder) if (!/^[A-O]$/.test(k)) f.push(`kinder: „${k}“ ist kein Alias (A bis O)`);
  if (!Object.values(felder).some(Boolean) || !(felder.beobachtung || felder.aha || felder.konsequenz)) f.push("mindestens Beobachtung, Aha oder Konsequenz muss Text haben");
  for (const [k, max] of Object.entries(GRENZE)) if (felder[k] && felder[k].length > max) f.push(`${k} ist länger als ${max} Zeichen`);
  const alle = Object.values(felder).filter(Boolean).join("\n");
  for (const a of alle.matchAll(/\bKind\s+([A-Za-z])\b/g)) if (!/^[A-O]$/.test(a[1])) f.push(`„Kind ${a[1]}“ ist kein Alias (A bis O)`);
  if (/(https?:\/\/|@[A-Za-z0-9.-]+\.[a-z]{2,}|\b\d{3,}\s?\d{4,}\b)/i.test(alle)) f.push("Link, E-Mail-Adresse oder Telefonnummer im Text – nicht erlaubt");
  const bew = alle.match(/\b[1-5]\s*(?:von|\/)\s*[35]\b|\b[1-5]\s*Sterne?\b/i);
  if (bew) f.push("Bewertungszahl je Kind im Text („" + bew[0] + "“) – Kinder werden nicht mit Zahlen bewertet");
  const schlag = (kopf.schlagworte || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (schlag.length > 8) f.push("höchstens 8 Schlagworte");
  return { kopf, felder, kinder, schlag, fehler: f };
}

const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
/* Aliase im Text („Kind C“) → Vorname aus dem Kader, direkt in der Datenbank (kein Name steht in der Datei oder im Repo). */
export function sqlText(txt, kinderImText) {
  if (txt == null) return "null";
  let ausdruck = q(txt);
  for (const a of kinderImText) ausdruck = `regexp_replace(${ausdruck}, 'Kind ${a}\\M', (select name from kader where alias = '${a}'), 'g')`;
  return ausdruck;
}
export function baueSql(r) {
  const { kopf, felder, kinder, schlag } = r;
  const imText = [...new Set([...Object.values(felder).filter(Boolean).join("\n").matchAll(/\bKind\s+([A-O])\b/g)].map((m) => m[1]).concat(kinder))].sort();
  const sp = (k) => sqlText(felder[k] ?? null, imText);
  const anwesend = kinder.length ? `array(select id from kader where alias in (${kinder.map(q).join(", ")}) order by id)` : "'{}'::bigint[]";
  return `insert into tagebuch_eintrag (autor, datum, quelle, baustein, ausloeser, beobachtung, aha, konsequenz, konsequenz_bis, beleg, anschluss, schlagworte, ki_vorschlag, bestaetigt_am, anlass, status, anwesend)
values (${q(kopf.autor)}, ${q(kopf.datum)}, 'frei', ${q(kopf.baustein)}, ${sp("ausloeser")}, ${sp("beobachtung")}, ${sp("aha")}, ${sp("konsequenz")}, ${kopf.konsequenz_bis ? q(kopf.konsequenz_bis) : "null"}, ${sp("beleg")}, ${sp("anschluss")}, ${schlag.length ? `array[${schlag.map(q).join(", ")}]::text[]` : "'{}'::text[]"}, true, null, ${q(kopf.anlass)}, 'keim', ${anwesend})
returning id, datum, status;`;
}

async function main() {
  const [befehl, datei] = process.argv.slice(2);
  if (!["pruefen", "sql"].includes(befehl) || !datei) { console.error("Aufruf: node tools/tagebuch-eingang.mjs pruefen|sql <datei>"); process.exit(2); }
  const r = pruefe(await readFile(datei, "utf8"));
  if (r.fehler.length) { console.error("Entwurf nicht in Ordnung:\n- " + r.fehler.join("\n- ")); process.exit(1); }
  console.log(befehl === "pruefen" ? "OK – Format und Aliase stimmen." : baueSql(r));
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
