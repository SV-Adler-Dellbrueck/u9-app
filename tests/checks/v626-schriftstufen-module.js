/* v626 · Paket C, Rest der Schriftstufen. PO-Kachel „Alles außer Kinder & Anzeigen“.

   a) Die Module (außer Kabine, Quiz, Live-Vollbild, Skizzen-Editor) und styles.css tragen keine
      feste Schriftgröße unter 26 px mehr – das Werkzeug findet nichts (Prüffall v625 c).
   b) Die Ausnahmen sind unangetastet: Kabine, Quiz, Live-Vollbild und Skizze haben weiter ihre
      eigenen Größen, die Regeln des Taktik-Quiz in styles.css ebenso.
   c) Am echten DOM (Eltern-Anmeldung): was eine Stufe trägt, rendert mit 11/13/15/18/22 px. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const lies = f => fs.readFileSync(path.join(h.REPO, f), "utf8");
  const fest = t => (t.match(/font-size:\s*[0-9.]+px/g) || []).filter(x => parseFloat(x.split(":")[1]) < 26).length;
  for (const f of ["md-kabine.js", "quiz.js", "md-live-vollbild.js", "md-skizze.js"]) {
    const n = fest(lies(f)); if (n < 5) probleme.push(`b) ${f} hat nur noch ${n} eigene Größen – die Ausnahme wurde umgestellt`);
    zeilen.push(`${f}: ${n} eigene Größen`);
  }
  const tq = (lies("styles.css").match(/\.tq-[^{]*\{[^}]*font-size:\s*[0-9.]+px/g) || []).length;
  if (!tq) probleme.push("b) Die Taktik-Quiz-Regeln in styles.css wurden umgestellt");
  const werkzeug = require("child_process").execFileSync("node", [path.join(h.REPO, "tools", "farben-variablen.js")], { encoding: "utf8" });
  if (!/Schriftgrößen gesamt: 0/.test(werkzeug)) probleme.push("a) Das Werkzeug fände noch Größen: " + werkzeug.split("\n").filter(z => /Schrift/.test(z)).join(" · "));
  const s = await h.starten({ start: "/eltern/index.html", warten: 2500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const d = await s.page.evaluate(() => {
    const alle = [...document.querySelectorAll('[style*="--s-"]')].filter(e => e.offsetParent !== null);
    return { n: alle.length, g: [...new Set(alle.map(e => getComputedStyle(e).fontSize))].sort() };
  });
  const fe = s.fehler();
  await s.schliessen();
  const erlaubt = ["11px", "13px", "15px", "18px", "22px"];
  if (!d.n) probleme.push("c) Keine Stufe auf der Eltern-Anmeldung gerendert");
  const fremd = d.g.filter(x => !erlaubt.includes(x));
  if (fremd.length) probleme.push("c) Stufen rendern mit " + fremd.join(", "));
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`Eltern-Anmeldung: ${d.n} Elemente auf Stufen (${d.g.join(" / ")}) · Taktik-Quiz-Regeln fest: ${tq}`);
  return h.ergebnis("v626 Schriftstufen in Modulen und styles.css, Kinder und Anzeigen ausgenommen", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
