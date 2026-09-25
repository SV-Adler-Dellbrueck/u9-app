/* v625 · Paket C, Rest: fünf Schriftgrößen und Farbvariablen im Trainer-Bereich.
   PO-Kacheln: „Beides nacheinander“ → „Nur Trainer-Bereich“ → „11 / 13 / 15 / 18 / 22 px“.

   a) styles.css definiert --s-klein/-text/-karte/-teil/-seite mit 11/13/15/18/22 px.
   b) In views.js, boot.js und core.js steht keine feste Schriftgröße unter 26 px mehr – außer
      in Funktionen, die drucken, auf Canvas zeichnen oder SVG bauen (dort bleibt sie fest).
   c) Das Umstellungs-Werkzeug findet nichts mehr (idempotent) – neue feste Größen fallen auf.
   d) Am echten DOM: die Stufen kommen an (ein Trainingsplan-Kopf hat 11 px statt 10/10,5). */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const css = fs.readFileSync(path.join(h.REPO, "styles.css"), "utf8");
  const soll = { "--s-klein": "11px", "--s-text": "13px", "--s-karte": "15px", "--s-teil": "18px", "--s-seite": "22px" };
  for (const [k, v] of Object.entries(soll)) if (!new RegExp(k + ":" + v).test(css)) probleme.push(`a) ${k} fehlt oder ist nicht ${v}`);
  const SPERRE = /window\.print\(|getContext\(|<svg|createElementNS|\.fillStyle|\.strokeStyle/;
  let fest = 0; const beispiele = [];
  for (const datei of ["views.js", "boot.js", "core.js"]) {
    const z = fs.readFileSync(path.join(h.REPO, datei), "utf8").split("\n");
    const starts = []; z.forEach((l, i) => { if (/^(async\s+)?function\s/.test(l)) starts.push(i); }); starts.push(z.length);
    const gesperrt = new Set();
    for (let k = 0; k < starts.length - 1; k++) if (z.slice(starts[k], starts[k + 1]).some(l => SPERRE.test(l))) for (let i = starts[k]; i < starts[k + 1]; i++) gesperrt.add(i);
    z.forEach((l, i) => { if (gesperrt.has(i)) return; for (const m of l.matchAll(/font-size:\s*([0-9.]+)px/g)) if (Number(m[1]) < 26) { fest++; if (beispiele.length < 3) beispiele.push(`${datei}:${i + 1} ${m[0]}`); } });
  }
  if (fest) probleme.push(`b) ${fest} feste Schriftgrößen unter 26 px: ${beispiele.join(" · ")}`);
  const werkzeug = require("child_process").execFileSync("node", [path.join(h.REPO, "tools", "farben-variablen.js")], { encoding: "utf8", env: { ...process.env } });
  if (!/Gesamt: 0/.test(werkzeug) || !/Schriftgrößen gesamt: 0/.test(werkzeug)) probleme.push("c) Das Werkzeug fände noch etwas: " + werkzeug.replace(/\n/g, " · "));
  const s = await h.starten({ warten: 2000, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [] }) });
  const d = await s.page.evaluate(() => {
    document.getElementById("pin-gate")?.remove(); const m = document.getElementById("main-app"); if (m) m.style.display = "block";
    go("planung");
    const alle = [...document.querySelectorAll('#main-app [style*="--s-"]')].filter(e => e.offsetParent !== null);
    const groessen = [...new Set(alle.map(e => getComputedStyle(e).fontSize))].sort();
    return { n: alle.length, groessen };
  });
  const fe = s.fehler();
  await s.schliessen();
  const erlaubt = ["11px", "13px", "15px", "18px", "22px"];
  if (!d.n) probleme.push("d) Keine Stufe im gerenderten Trainingsplan gefunden");
  const fremd = d.groessen.filter(g => !erlaubt.includes(g));
  if (fremd.length) probleme.push(`d) Stufen rendern mit ${fremd.join(", ")}`);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`Trainingsplan: ${d.n} Elemente auf Stufen, gerendert ${d.groessen.join(" / ")}`);
  return h.ergebnis("v625 Trainer-Bereich: fünf Schriftstufen, Farbvariablen", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
