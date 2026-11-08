#!/usr/bin/env node
/* v804 · Nächtlicher, lesender Export für den Claude-Projekt-Chat (Charles 08.11.2026).
   Dieses Skript liegt im öffentlichen Repo und enthält KEINE Daten. Es läuft als GitHub Action im PRIVATEN Repo adler-u9-wissen
   (.github/workflows/export.yml) und schreibt nach export/: tagebuch.md, einheiten.md, uebungen.md, plaene.md und stand.json.

   Verbindung: Umgebungsvariable EXPORT_DB_URL (GitHub Secret im privaten Repo) – Zugang der Rolle adler_export_lese: nur SELECT auf die
   Whitelist-Views im Schema export (Migration 20261111_v804_export_lese.sql), mit Aliassen statt Klarnamen. Die Spaltenauswahl steht hier
   NOCHMAL als feste Whitelist: Kommt in einer View eine neue Spalte dazu, geht sie nicht ungeprüft hinaus.
   Die Verbindungsadresse wird nie ausgegeben, auch nicht bei Fehlern.
   Aufruf: EXPORT_DB_URL=… node tools/export-tagebuch.mjs [Ausgabeordner] */
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const SKRIPT_VERSION = 2;   // v808: namen_auto in stand.json
export const PROJEKT_REF = "wgbcibqcqidudoksfkcv";
export const WHITELIST = {
  tagebuch_eintrag: ["id", "datum", "quelle", "anlass", "baustein", "status", "ki_vorschlag", "bestaetigt", "autor", "ausloeser", "beobachtung", "aha", "konsequenz", "konsequenz_bis", "konsequenz_erledigt_am", "beleg", "anschluss", "schlagworte", "durchgefuehrt", "anwesend_alias", "termin_id"],
  tagebuch_punkt: ["id", "eintrag_id", "termin_id", "datum", "art", "text", "bis", "zustaendig", "autor", "herkunft", "erledigt_am", "erledigt_von", "dauerhaft", "wirkung", "wirkung_am"],
  einheit_bewertung: ["datum", "autor", "spass", "umsetzung", "erfolg", "notiz"],
  termine: ["id", "typ", "datum", "titel", "gegner", "spielform", "heim", "ergebnis", "notiz", "saison"],
  event_bewertung: ["termin_id", "datum", "typ", "titel", "autor", "teams", "gaeste", "getragen", "arbeiten", "orga"],
  trainingsplan: ["datum", "plan", "slots", "kopf"],
  trainings_eval: ["datum", "data"],
  anwesenheit: ["datum", "termin_id", "data"],
  trainingsformen: ["id", "name", "kat", "kurz", "ablauf", "varianten", "coaching", "spieler", "feld", "dauer", "spass", "diff", "custom", "focus", "dims", "tags", "spieler_min", "spieler_max", "mit_torwart"],
  trainingsvorlagen: ["id", "name", "leitfrage", "folge_nr", "tags", "dauer_min", "netto_spielform_min", "skalierung", "beobachtung", "bloecke", "stand", "ordnung", "ziel_kinder"],
  trainingsblock: ["id", "leitfrage", "ziel", "von", "bis", "vorlagen"],
};
const ORDER = { tagebuch_eintrag: "datum, id", tagebuch_punkt: "datum, id", einheit_bewertung: "datum, autor", termine: "datum, id", event_bewertung: "datum, termin_id", trainingsplan: "datum", trainings_eval: "datum", anwesenheit: "datum", trainingsformen: "id", trainingsvorlagen: "id", trainingsblock: "id" };

const tag = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d ?? "").slice(0, 10));
const de = (d) => { const s = tag(d); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s.slice(8)}.${s.slice(5, 7)}.${s.slice(0, 4)}` : "–"; };
const text = (v) => (v == null || String(v).trim() === "" ? "–" : String(v).trim());
const zitat = (v) => text(v).split("\n").map((z) => "> " + z).join("\n");
const json = (v) => (v == null ? "–" : "`" + JSON.stringify(v) + "`");
const BAUSTEIN = { ich: "Ich", spiel_spieler: "Spiel und Spieler", organisation: "Organisation", system_fussball: "System Fußball" };

export function spaltenAuswahl(view) {
  const cols = WHITELIST[view];
  if (!cols) throw new Error("Keine Whitelist für " + view);
  return `select ${cols.map((c) => '"' + c + '"').join(", ")} from export."${view}" order by ${ORDER[view]}`;
}
const kopf = (titel, stand, quelle) => `# ${titel}\n\nStand: ${stand} · Quelle: ${quelle}\n\n> Kinder stehen nur als Aliase („Kind C“, derselbe Buchstabe = dasselbe Kind). Rohdiktate, Kontaktdaten, Klarnamen und Elternangaben sind nicht Teil dieses Exports.\n\n`;

export function renderTagebuch(d, stand, verdacht = []) {
  const punkte = d.tagebuch_punkt || [];
  const warn = new Set(verdacht.filter((v) => v.tabelle === "tagebuch_eintrag").map((v) => String(v.id)));
  let o = kopf("Trainertagebuch", stand, "App-Datenbank (Export-Rolle)");
  o += `## Einträge (${d.tagebuch_eintrag.length})\n\n`;
  for (const e of d.tagebuch_eintrag) {
    const status = e.status === "fertig" ? "FERTIG" : `ENTWURF/SEED („keim“${e.ki_vorschlag ? ", KI-Vorschlag" : ""}${e.bestaetigt ? ", bestätigt" : ", noch nicht bestätigt"})`;
    o += `### ${de(e.datum)} · ${BAUSTEIN[e.baustein] || e.baustein} · ${status}\n\n- **Eintrag-Nr.:** ${e.id}\n- **Anlass:** ${e.anlass || "–"} (Quelle: ${e.quelle}) · **Autor:** ${e.autor || "–"}\n`;
    if (warn.has(String(e.id))) o += "- ⚠ **Prüfen:** Ein Wort im Freitext ähnelt einem Kindernamen und wurde nicht ersetzt (siehe stand.json).\n";
    o += `- **Auslöser:** ${text(e.ausloeser)}\n- **Beobachtung:** ${text(e.beobachtung)}\n- **Aha:** ${text(e.aha)}\n- **Konsequenz:** ${text(e.konsequenz)}${e.konsequenz_bis ? ` (Frist: ${de(e.konsequenz_bis)})` : ""}${e.konsequenz_erledigt_am ? ` – erledigt am ${de(e.konsequenz_erledigt_am)}` : ""}\n`;
    o += `- **Beleg:** ${text(e.beleg)}\n- **Anschluss:** ${text(e.anschluss)}\n- **Schlagworte:** ${(e.schlagworte || []).join(", ") || "–"}\n`;
    const du = Array.isArray(e.durchgefuehrt) ? e.durchgefuehrt : [];
    if (du.length) o += `- **Durchgeführt:** ${du.map((x) => x.name + (x.block ? ` (${x.block})` : "")).join(" · ")}\n`;
    if ((e.anwesend_alias || []).length) o += `- **Dabei (${e.anwesend_alias.length}):** ${e.anwesend_alias.join(", ")}\n`;
    const ps = punkte.filter((p) => String(p.eintrag_id) === String(e.id));
    o += `- **Einzelpunkte:**${ps.length ? "" : " –"}\n`;
    for (const p of ps) o += `  - [${p.art}] ${text(p.text)} — Frist: ${p.bis ? de(p.bis) : p.dauerhaft ? "dauerhaft" : "keine"} — ${p.erledigt_am ? "erledigt am " + de(p.erledigt_am) : "offen"}${p.wirkung ? ` — Wirkung: ${p.wirkung}` : ""}\n`;
    o += "\n";
  }
  const ids = new Set(d.tagebuch_eintrag.map((e) => String(e.id)));
  const lose = punkte.filter((p) => !ids.has(String(p.eintrag_id)));
  if (lose.length) {
    o += `## Weitere Punkte ohne Eintrag (${lose.length})\n\n`;
    for (const p of lose) o += `- [${p.art}] ${de(p.datum)}: ${text(p.text)} — Frist: ${p.bis ? de(p.bis) : "keine"} — ${p.erledigt_am ? "erledigt am " + de(p.erledigt_am) : "offen"}\n`;
  }
  return o;
}
export function renderEinheiten(d, stand) {
  let o = kopf("Bewertungen von Einheiten und Spieltagen", stand, "App-Datenbank (Export-Rolle)");
  o += `## Trainingseinheiten (${d.einheit_bewertung.length})\n\n`;
  const nr = {};
  for (const b of d.einheit_bewertung) {
    const k = tag(b.datum); nr[k] = (nr[k] || 0) + 1;
    const n = String(b.notiz || "").trim().length;
    const abg = /\[gekürzt\]\s*$/.test(String(b.notiz || "")) || (n >= 780 && !/[.!?…”“")]\s*$/.test(String(b.notiz || "").trimEnd()));
    o += `### ${de(b.datum)} · Training · ${b.autor || "–"} (${nr[k]})\n\n- **Spaß:** ${b.spass ?? "–"} von 5 · **Umsetzung:** ${b.umsetzung ?? "–"} von 5 · **Erfolg:** ${b.erfolg ?? "–"} von 5\n- **Notiz** (${n} Zeichen${abg ? "; **möglicherweise abgeschnitten**" : ""}):\n\n${zitat(b.notiz)}\n\n`;
  }
  o += `## Spiele und Turniere (${d.event_bewertung.length})\n\n`;
  for (const b of d.event_bewertung) {
    o += `### ${de(b.datum)} · ${b.typ === "turnier" ? "Festival" : "Spiel"} „${text(b.titel)}“ · ${b.autor || "–"}\n\n`;
    const teams = b.teams && typeof b.teams === "object" ? Object.entries(b.teams).sort() : [];
    if (teams.length) o += `- **Mannschaften:** ${teams.map(([n, t]) => `Mannschaft ${n}: Ordnung ${t.ordnung ?? "–"} · Pass ${t.pass ?? "–"} · Zweikampf ${t.zweikampf ?? "–"} · Spaß ${t.spass ?? "–"} (je von 3)`).join("; ")}\n`;
    o += `- **Gegner/Gäste:** ${json(b.gaeste)}\n- **Organisation:** ${json(b.orga)}\n- **Das hat getragen:** ${text(b.getragen)}\n- **Daran arbeiten wir:** ${text(b.arbeiten)}\n\n`;
  }
  o += `## Termine (${d.termine.length})\n\n| Datum | Art | Titel | Gegner | Spielform | Ergebnis |\n|---|---|---|---|---|---|\n`;
  for (const t of d.termine) o += `| ${de(t.datum)} | ${t.typ} | ${text(t.titel)} | ${text(t.gegner)} | ${text(t.spielform)} | ${text(t.ergebnis)} |\n`;
  return o;
}
export function renderUebungen(d, stand) {
  let o = kopf("Übungen, Vorlagen und Trainingsblöcke", stand, "App-Datenbank (Export-Rolle); die Standard-Bibliothek steht im Repo u9-app unter uebungen/bibliothek.json");
  const eigene = d.trainingsformen.filter((f) => f.custom);
  o += `## Eigene Übungen (${eigene.length})\n\n`;
  for (const f of eigene) o += `### ${text(f.name)} (${f.kat || "–"})\n\n- **Kurz:** ${text(f.kurz)}\n- **Ablauf:** ${text(f.ablauf)}\n- **Varianten:** ${text(f.varianten)}\n- **Coaching:** ${text(f.coaching)}\n- **Spieler:** ${text(f.spieler)} · **Feld:** ${text(f.feld)} · **Dauer:** ${text(f.dauer)}\n\n`;
  o += `## Vorlagen (${d.trainingsvorlagen.length})\n\n`;
  for (const v of d.trainingsvorlagen) o += `### ${text(v.name)}\n\n- **Leitfrage:** ${text(v.leitfrage)} · **Dauer:** ${v.dauer_min ?? "–"} Min. · **Stand:** ${text(v.stand)}\n- **Beobachtung:** ${text(v.beobachtung)}\n- **Blöcke:** ${json(v.bloecke)}\n\n`;
  o += `## Trainingsblöcke (${d.trainingsblock.length})\n\n`;
  for (const b of d.trainingsblock) o += `- ${de(b.von)}–${de(b.bis)}: ${text(b.leitfrage)} — ${text(b.ziel)}\n`;
  return o;
}
export function renderPlaene(d, stand) {
  let o = kopf("Trainingspläne, Übungsbewertungen und Anwesenheit", stand, "App-Datenbank (Export-Rolle)");
  o += `## Trainingspläne (${d.trainingsplan.length})\n\n`;
  for (const p of d.trainingsplan) o += `### ${de(p.datum)}\n\n- **Kopf:** ${json(p.kopf)}\n- **Plan:** ${json(p.plan)}\n- **Blöcke:** ${json(p.slots)}\n\n`;
  o += `## Bewertung je Übung (${d.trainings_eval.length})\n\n`;
  for (const e of d.trainings_eval) o += `- ${de(e.datum)}: ${json(e.data)}\n`;
  o += `\n## Anwesenheit (${d.anwesenheit.length})\n\n`;
  for (const a of d.anwesenheit) o += `- ${de(a.datum)}${a.termin_id ? ` (Termin ${a.termin_id})` : ""}: ${json(a.data)}\n`;
  return o;
}
export function baueStand(d, verdacht, jetzt = new Date(), auto = []) {
  return { erzeugt: jetzt.toISOString(), projekt: PROJEKT_REF, skript_version: SKRIPT_VERSION, zeilen: Object.fromEntries(Object.keys(WHITELIST).map((k) => [k, (d[k] || []).length])),
    namens_verdacht: verdacht.map((v) => ({ tabelle: v.tabelle, id: v.id, feld: v.feld, anzahl: v.anzahl })),
    // v808: Wörter, die die strenge Regel (gleicher Kölner Code, höchstens ein Buchstabe Abstand) als Namen ersetzt hat – nur Zahl, nie das Wort
    namen_auto: auto.map((v) => ({ tabelle: v.tabelle, id: v.id, feld: v.feld, anzahl: v.anzahl })),
    hinweis: namensHinweis(verdacht) };
}
export const namensHinweis = (v) => v.length ? `${v.length} Stelle(n) mit einem Wort, das einem Kindernamen ähnelt und nicht ersetzt wurde. Prüfen; gewöhnliche Wörter in export.wort_erlaubt, Schreibvarianten in export.name_variante eintragen.` : "Keine verdächtigen Wörter gefunden.";

export async function lade(client) {
  const d = {};
  for (const v of Object.keys(WHITELIST)) d[v] = (await client.query(spaltenAuswahl(v))).rows;
  const verdacht = (await client.query('select tabelle, id, feld, anzahl from export."namen_verdacht" order by 1, 2, 3')).rows;
  let auto = [];
  try { auto = (await client.query('select tabelle, id, feld, anzahl from export."namen_auto" order by 1, 2, 3')).rows; } catch { auto = []; }   // vor Migration v808
  return { d, verdacht, auto };
}
export async function schreibe(ordner, d, verdacht, jetzt = new Date(), auto = []) {
  const stand = tag(jetzt);
  await mkdir(ordner, { recursive: true });
  const dateien = { "tagebuch.md": renderTagebuch(d, stand, verdacht), "einheiten.md": renderEinheiten(d, stand), "uebungen.md": renderUebungen(d, stand), "plaene.md": renderPlaene(d, stand), "stand.json": JSON.stringify(baueStand(d, verdacht, jetzt, auto), null, 2) + "\n" };
  for (const [n, inhalt] of Object.entries(dateien)) await writeFile(`${ordner}/${n}`, inhalt, "utf8");
  return Object.keys(dateien);
}

async function main() {
  const url = process.env.EXPORT_DB_URL;
  if (!url) { console.error("EXPORT_DB_URL fehlt (GitHub Secret im privaten Repo)."); process.exit(2); }
  const ordner = process.argv[2] || process.env.EXPORT_AUSGABE || "export";
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false }, application_name: "adler-export" });
  try {
    await client.connect();
    const { d, verdacht, auto } = await lade(client);
    const dateien = await schreibe(ordner, d, verdacht, new Date(), auto);
    console.log(`Export geschrieben: ${dateien.join(", ")}`);
    console.log(Object.entries(baueStand(d, verdacht).zeilen).map(([k, n]) => `${k}=${n}`).join(" "));
    console.log(namensHinweis(verdacht));
  } catch (e) {
    console.error("Export fehlgeschlagen:", e && e.code ? `${e.code} ${String(e.message).replace(url, "***").slice(0, 160)}` : "Verbindung oder Abfrage (Adresse wird nicht ausgegeben)");
    process.exit(1);
  } finally { try { await client.end(); } catch { /* ignorieren */ } }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
