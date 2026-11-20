/* v909 · WhatsApp-Vorschau (Charles 20.11.: „Ist es möglich, dass der WhatsApp-Link schöner aussieht? Mit Logo oder
   Bild oder mit Text?“).
   a) index.html und eltern/index.html tragen Open-Graph-Angaben: Titel, Beschreibung, Bild mit absoluter https-Adresse
      unter sv-adler-dellbrueck.github.io/u9-app/, Größe 1200 × 630, Alternativtext; twitter:card summary_large_image.
   b) og-vorschau.jpg liegt im Repo, ist ein JPEG 1200 × 630 und kleiner als 300 KB (WhatsApp lädt große Bilder nicht).
   c) Teilen-Text je Turnier (htTeilenText): Name, Tag mit „ab hh:mm Uhr“, Ort, eine Zeile mit dem Nutzen, der Link
      allein in der letzten Zeile; beim Festival die Startzeit nach verschobenem Beginn.
   d) Der WhatsApp-Knopf im Planer schickt genau diesen Text. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v909 WhatsApp-Vorschau: Bild für alle Links, Text je Turnier";
  const probleme = [], zeilen = [];
  for (const f of ["index.html", "eltern/index.html"]) {
    const t = fs.readFileSync(path.join(h.REPO, f), "utf8");
    const meta = k => (t.match(new RegExp('<meta (?:property|name)="' + k + '" content="([^"]*)"')) || [])[1];
    const bild = meta("og:image");
    if (!meta("og:title") || !meta("og:description")) probleme.push(`a) ${f}: og:title/og:description fehlen`);
    if (!/^https:\/\/sv-adler-dellbrueck\.github\.io\/u9-app\/og-vorschau-2\.jpg$/.test(bild || "")) probleme.push(`a) ${f}: og:image „${bild}“`);
    if (meta("og:image:width") !== "1200" || meta("og:image:height") !== "630" || !meta("og:image:alt")) probleme.push(`a) ${f}: Größe oder Alternativtext fehlt`);
    if (meta("twitter:card") !== "summary_large_image") probleme.push(`a) ${f}: twitter:card`);
  }
  const jpg = fs.readFileSync(path.join(h.REPO, "og-vorschau-2.jpg"));
  let w = 0, hh = 0;
  for (let i = 2; i < jpg.length - 9;) {
    if (jpg[i] !== 0xff) { i++; continue; }
    const m = jpg[i + 1], len = jpg.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xc2) { hh = jpg.readUInt16BE(i + 5); w = jpg.readUInt16BE(i + 7); break; }
    i += 2 + len;
  }
  if (jpg[0] !== 0xff || jpg[1] !== 0xd8 || w !== 1200 || hh !== 630) probleme.push(`b) og-vorschau-2.jpg: ${w} × ${hh}`);
  if (jpg.length > 300 * 1024) probleme.push(`b) og-vorschau.jpg ${Math.round(jpg.length / 1024)} KB`);
  zeilen.push(`a) Open Graph in beiden Einstiegen · b) Bild ${w} × ${hh}, ${Math.round(jpg.length / 1024)} KB`);

  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [], heimturnier: (u, req) => req.method() === "PATCH" ? { status: 204, body: "" } : [] }) });
  const r = await s.page.evaluate(async () => {
    for (let i = 0; i < 40 && typeof htTeilenText !== "function"; i++) await new Promise(x => setTimeout(x, 100));
    const fest = { name: "Kinderfestival 21.11.", datum: "2026-11-21", ort: "Thurner Kamp 97, 51069 Köln", config: { art: "festival", start: "10:15", startIst: "10:20" }, plan: [] };
    const liga = { name: "Herbstcup", datum: "2026-11-22", ort: "Sportplatz", config: { format: "liga", start: "10:00" }, plan: [] };
    return { fest: htTeilenText(fest, "https://x.test/?turnier=a"), liga: htTeilenText(liga, "https://x.test/?turnier=b") };
  });
  await s.schliessen();
  const fz = r.fest.split("\n");
  if (fz[0] !== "🏆 Kinderfestival 21.11." || !/^📅 Samstag, 21\.11\. · ab 10:20 Uhr$/.test(fz[1]) || fz[2] !== "📍 Thurner Kamp 97, 51069 Köln" || !/^👉 /.test(fz[3]) || fz[4] !== "https://x.test/?turnier=a" || fz.length !== 5)
    probleme.push(`c) Festival-Text: ${JSON.stringify(fz)}`);
  if (/Wappen/.test(r.fest + r.liga)) probleme.push("c) „mit eurem Wappen“ steht noch im Text (v911)");
  if (!/Regeln/.test(r.fest) || !/Spielfeldrand/.test(r.fest)) probleme.push(`c) Festival-Text ohne Regeln/Spielfeldrand: ${JSON.stringify(r.fest)}`);
  if (!/ab 10:00 Uhr/.test(r.liga) || !/Regeln/.test(r.liga) || !/\nhttps:\/\/x\.test\/\?turnier=b$/.test(r.liga)) probleme.push(`c) Liga-Text: ${JSON.stringify(r.liga)}`);
  zeilen.push(`c) ${fz.length} Zeilen: ${fz.slice(0, 2).join(" | ")}`);
  const src = fs.readFileSync(path.join(h.REPO, "md-turnierplan.js"), "utf8");
  if (!/wa\.me\/\?text=\$\{encodeURIComponent\(htTeilenText\(_HT,url\)\)\}/.test(src)) probleme.push("d) WhatsApp-Knopf nutzt htTeilenText nicht");
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
