/* v916 · Bestandsaufnahme 5.10, Feld- und Spielerformate: eine Schreibweise in Bibliothek und Grundübungen.
   a) Feldmaß „L × B m“ – Malzeichen mit Leerzeichen, Einheit mit Leerzeichen (vorher „25×20m“, „20 x 20 m“, „30x20m“).
   b) Spannen der Spielerzahl mit Halbgeviertstrich „6–10“ (vorher teils „6-10“).
   c) Die Spanne liest die Planung weiter richtig (tpSpielerAusText), der Bibliotheks-Stand ist hochgesetzt. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v916 Feld- und Spielerformate einheitlich (L × B m, 6–10)";
  const probleme = [], zeilen = [];
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const data = fs.readFileSync(path.join(h.REPO, "data.js"), "utf8");
  const tf = []; data.replace(/\b(feld|spieler):(['"])([^'"]*)\2/g, (_, k, q, v) => { tf.push([k, v]); return _; });
  const alle = bib.uebungen.flatMap(u => [["feld", String(u.feld || "")], ["spieler", String(u.spieler || "")]]).concat(tf);
  const feldFalsch = alle.filter(([k, v]) => k === "feld" && (/\d\s*[x]\s*\d/.test(v) || /\d×|×\d/.test(v) || /(?<![\d,])\d+(?:,\d+)?m\b/.test(v)));
  const spFalsch = alle.filter(([k, v]) => k === "spieler" && /\d\s*-\s*\d/.test(v));
  if (feldFalsch.length) probleme.push(`a) ${feldFalsch.length} Feldangaben in alter Form: ${feldFalsch.slice(0, 4).map(x => "„" + x[1] + "“").join(", ")}`);
  if (spFalsch.length) probleme.push(`b) ${spFalsch.length} Spielerangaben mit Bindestrich: ${spFalsch.slice(0, 4).map(x => "„" + x[1] + "“").join(", ")}`);
  if (String(bib.stand) <= "2026-11-20-1") probleme.push(`c) Bibliotheks-Stand „${bib.stand}“ nicht hochgesetzt`);
  const t = await h.starten({ warten: 800, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await t.page.evaluate(() => typeof tpSpielerAusText === "function" ? [tpSpielerAusText("6–10"), tpSpielerAusText("8–14 plus Torhüter")].map(x => x.min + "/" + x.max) : null);
  await t.schliessen();
  if (!r || r[0] !== "6/10" || r[1] !== "9/15") probleme.push(`c) Planung liest die Spanne nicht: ${JSON.stringify(r)}`);
  zeilen.push(`a) ${alle.filter(x => x[0] === "feld").length} Feldangaben · b) ${alle.filter(x => x[0] === "spieler").length} Spielerangaben · c) „6–10“ → ${r && r[0]}, Stand ${bib.stand}`);
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
