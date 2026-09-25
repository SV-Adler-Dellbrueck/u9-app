/* v625 · Paket C, Teil Farben: feste Farbwerte im Trainer-Bereich (views.js, boot.js, core.js)
   auf die vorhandenen Variablen aus styles.css umstellen – nur, wo es im dunklen Modus
   nicht schlechter werden kann.

   Regeln, je Stilangabe (ein style="…" oder ein cssText-String):
   - Umgestellt wird die Angabe nur als GANZES: Hintergrund und Schrift gemeinsam. Hätte sie
     einen Hintergrund oder eine Schrift, die sich nicht umstellen lässt, bleibt sie unverändert
     – sonst stünde im Dunkeln helle Schrift auf festem Hellgrund oder umgekehrt.
   - Schrift: nur exakte Treffer auf Text- und Statusfarben.
   - Hintergrund: nur die hellen Flächen (-bg, --bg, --surface2) und Flächenfarben, die im
     dunklen Modus gleich bleiben (--blue, --purple, --teal, --orange, --yellow). Grün, Rot und
     Bernstein als Fläche bleiben fest: ihre Variablen werden im Dunkeln hell (Schriftfarben).
   - Weiß bleibt immer fest (Karten zum Drucken, QR, weiße Schrift auf Farbe).
   - Funktionen, die drucken, zeichnen (canvas) oder SVG bauen, bleiben ganz unberührt.
   Aufruf: node tools/farben-variablen.js [--schreiben] */
"use strict";
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
const DATEIEN = ["views.js", "boot.js", "core.js"];
const SCHRIFT = { "#1a1a2e": "--text", "#475569": "--text2", "#5b6b81": "--text3", "#15803d": "--green", "#b91c1c": "--red",
  "#b45309": "--amber", "#1a56db": "--blue-text", "#6d28d9": "--purple", "#0e7490": "--teal", "#c2410c": "--orange", "#854d0e": "--yellow" };
const FLAECHE = { "#eff6ff": "--blue-bg", "#f0fdf4": "--green-bg", "#fffbeb": "--amber-bg", "#fef2f2": "--red-bg", "#f5f3ff": "--purple-bg",
  "#ecfeff": "--teal-bg", "#fff7ed": "--orange-bg", "#fef9c3": "--yellow-bg", "#f8fafc": "--surface2", "#f1f5f9": "--bg",
  "#1a56db": "--blue", "#6d28d9": "--purple", "#0e7490": "--teal", "#c2410c": "--orange", "#854d0e": "--yellow" };
const SPERRE = /window\.print\(|getContext\(|<svg|createElementNS|\.fillStyle|\.strokeStyle/;

/* Grenzen der Funktionen auf oberster Ebene: Zeilen, die mit „function“/„async function“ beginnen. */
function gesperrteZeilen(zeilen) {
  const starts = [];
  zeilen.forEach((z, i) => { if (/^(async\s+)?function\s/.test(z)) starts.push(i); });
  starts.push(zeilen.length);
  const gesperrt = new Set();
  for (let k = 0; k < starts.length - 1; k++) {
    const von = starts[k], bis = starts[k + 1];
    if (zeilen.slice(von, bis).some(z => SPERRE.test(z))) for (let i = von; i < bis; i++) gesperrt.add(i);
  }
  return gesperrt;
}

/* Eine Deklarationsliste „a:b;c:d“ umstellen – ganz oder gar nicht. */
function umstellen(liste) {
  const teile = liste.split(";");
  let geaendert = false, blockiert = false;
  const neu = teile.map(t => {
    const m = /^(\s*)(color|background|background-color)(\s*:\s*)(#[0-9a-fA-F]{3,6})(\s*(?:!important)?\s*)$/.exec(t);
    if (!m) {
      // Hintergrund/Schrift mit einem anderen festen Wert → ganze Angabe bleibt
      if (/^\s*(color|background|background-color)\s*:\s*#[0-9a-fA-F]{3,6}\b/.test(t)) blockiert = true;
      return t;
    }
    const hex = m[4].toLowerCase(), tab = m[2] === "color" ? SCHRIFT : FLAECHE;
    if (!tab[hex]) { blockiert = true; return t; }
    geaendert = true;
    return `${m[1]}${m[2]}${m[3]}var(${tab[hex]})${m[5]}`;
  });
  return (geaendert && !blockiert) ? neu.join(";") : null;
}

let gesamt = 0;
const bericht = [];
for (const datei of DATEIEN) {
  const p = path.join(ROOT, datei);
  const zeilen = fs.readFileSync(p, "utf8").split("\n");
  const gesperrt = gesperrteZeilen(zeilen);
  let n = 0;
  const neu = zeilen.map((z, i) => {
    if (gesperrt.has(i)) return z;
    // style="…" und style='…' sowie cssText="…"
    return z.replace(/(style=\\?["'])([^"'\\]*?)(\\?["'])|(cssText\s*=\s*["'`])([^"'`]*?)(["'`])/g, (all, a1, l1, e1, a2, l2, e2) => {
      const liste = l1 != null ? l1 : l2;
      if (liste == null || /\$\{/.test(liste) && !/#[0-9a-fA-F]/.test(liste)) return all;
      const r = umstellen(liste);
      if (!r) return all;
      n++;
      return l1 != null ? a1 + r + e1 : a2 + r + e2;
    });
  });
  gesamt += n;
  bericht.push(`${datei}: ${n} Stilangaben umgestellt, ${gesperrt.size} Zeilen gesperrt (Druck/Canvas/SVG)`);
  if (process.argv.includes("--schreiben")) fs.writeFileSync(p, neu.join("\n"));
}
console.log(bericht.join("\n") + `\nGesamt: ${gesamt}`);

/* ── Teil 2: Schriftgrößen auf die fünf Stufen (v625, PO-Kachel 11/13/15/18/22) ──
   Gleiche Sperre wie oben (Druck, Canvas, SVG). Anzeigen ab 26 px bleiben. */
function stufe(px) {
  if (px < 12) return "--s-klein";
  if (px < 14) return "--s-text";
  if (px < 17) return "--s-karte";
  if (px < 21) return "--s-teil";
  if (px < 26) return "--s-seite";
  return null;
}
let schrift = 0;
const bericht2 = [];
for (const datei of DATEIEN) {
  const p = path.join(ROOT, datei);
  const zeilen = fs.readFileSync(p, "utf8").split("\n");
  const gesperrt = gesperrteZeilen(zeilen);
  let n = 0;
  const neu = zeilen.map((z, i) => gesperrt.has(i) ? z : z.replace(/font-size:\s*([0-9]+(?:\.[0-9]+)?)px/g, (all, zahl) => {
    const v = stufe(Number(zahl)); if (!v) return all; n++; return `font-size:var(${v})`;
  }));
  schrift += n;
  bericht2.push(`${datei}: ${n} Schriftgrößen auf Stufen`);
  if (process.argv.includes("--schreiben")) fs.writeFileSync(p, neu.join("\n"));
}
console.log(bericht2.join("\n") + `\nSchriftgrößen gesamt: ${schrift}`);
