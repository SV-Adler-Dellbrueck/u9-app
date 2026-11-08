// v804 · App-Stand für den Claude-Projekt-Chat: Funktionsübersicht, Änderungsliste, App-Version.
// Läuft in der Action des PRIVATEN Repos nach export-tagebuch.mjs. Liest nur dieses (öffentliche) Repo – keine Datenbank, keine Personendaten.
// Aufruf: node export-appstand.mjs <Pfad zu u9-app> <Ausgabeordner, z. B. export>
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export function appVersion(sw) { const m = /const CACHE\s*=\s*["']u9i-adler-(v\d+)["']/.exec(sw); return m ? m[1] : null; }
export function uebersichtStand(md) { const m = /\*\*Stand:\*\*\s*App-Version\s+(v\d+)/.exec(md); return m ? m[1] : null; }

// zeilen: [{ datum: "2026-11-08", betreff: "v803: … (#393)" }] – neueste zuerst
export function baueAenderungen(zeilen, version, max = 80) {
  let o = "# Änderungen an der Adler-App (neueste zuerst)\n\n";
  o += `Aktuelle App-Version: **${version || "unbekannt"}**. Diese Liste entsteht jede Nacht aus den Titeln der zusammengeführten Änderungen im öffentlichen Repo u9-app; sie sagt, **was** gebaut wurde, nicht **warum** (das steht in der Entscheidungsliste). Die vollständige Beschreibung aller Funktionen steht in \`app-stand.md\`.\n\n`;
  let tag = "";
  for (const z of zeilen.slice(0, max)) {
    if (z.datum !== tag) { tag = z.datum; o += `\n## ${tag.slice(8, 10)}.${tag.slice(5, 7)}.${tag.slice(0, 4)}\n\n`; }
    o += `- ${String(z.betreff).replace(/\s+/g, " ").trim().slice(0, 300)}\n`;
  }
  return o;
}

export function ergaenzeStand(stand, version, uebersicht) {
  return { ...stand, app: { version, uebersicht_stand: uebersicht, uebersicht_passt: !!version && version === uebersicht } };
}

function main() {
  const [app, out] = process.argv.slice(2);
  if (!app || !out) { console.error("Aufruf: node export-appstand.mjs <u9-app> <Ausgabeordner>"); process.exit(2); }
  const sw = fs.readFileSync(path.join(app, "sw.js"), "utf8");
  const md = fs.readFileSync(path.join(app, "doku/Uebersicht_Funktionen-Adler-App_v1.md"), "utf8");
  const version = appVersion(sw), stand = uebersichtStand(md);
  if (!version || !stand) { console.error("App-Version oder Stand der Übersicht nicht lesbar."); process.exit(1); }
  const log = execFileSync("git", ["-C", app, "log", "-n", "120", "--date=short", "--format=%ad%x09%s"], { encoding: "utf8" });
  const zeilen = log.split("\n").filter(Boolean).map(l => { const [datum, ...r] = l.split("\t"); return { datum, betreff: r.join("\t") }; });
  fs.mkdirSync(out, { recursive: true });
  const kopf = `<!-- Kopie von doku/Uebersicht_Funktionen-Adler-App_v1.md aus dem Repo u9-app, Stand ${stand}. Nicht von Hand bearbeiten. -->\n\n`;
  fs.writeFileSync(path.join(out, "app-stand.md"), kopf + md);
  fs.writeFileSync(path.join(out, "aenderungen.md"), baueAenderungen(zeilen, version));
  const sf = path.join(out, "stand.json");
  const alt = fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf, "utf8")) : {};
  fs.writeFileSync(sf, JSON.stringify(ergaenzeStand(alt, version, stand), null, 2) + "\n");
  console.log(`app=${version} uebersicht=${stand} aenderungen=${Math.min(zeilen.length, 80)}`);
  if (version !== stand) console.log("Hinweis: Übersicht und App-Version weichen ab.");
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
