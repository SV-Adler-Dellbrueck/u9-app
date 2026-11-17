/* v839 · Drei Skalierungszeilen gingen rechnerisch nicht auf (Bestandsaufnahme November 2026, 5.1; Charles' Ja am 17.11.):
   L5-2 bei 8 Kindern nannte 4+1 gegen 4+1 (braucht zehn), L2-4 bei 12 Kindern zwei Felder 4 gegen 4 (braucht 16),
   L1-3 bei 8 Kindern vier gegen zwei (zwei Kinder übrig). Geprüft wird die Rechnung, nicht der Wortlaut:
   Kinder je Feld mal Felder plus genannte Wechselgruppe ergibt die Kinderzahl der Zeile.
   Der Stand der Datei ist gestiegen – sonst zieht die App die Zeilen nicht nach (_evSkalierungNachziehen). */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v839 Skalierungszeilen L5-2, L2-4 und L1-3 gehen rechnerisch auf";
  const probleme = [], zeilen = [];
  const d = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8"));
  const v = pre => d.vorlagen.find(x => x.name.startsWith(pre + " "));
  const z = (pre, k) => String(((v(pre) || {}).skalierung || {})[k] || "");
  const a = z("L5-2", "8"), b = z("L2-4", "12"), c = z("L1-3", "8");
  if (!a && !b && !c) return h.ergebnis(titel, false, ["Vorlagen nicht gefunden"]);
  if (!/^1 Feld .*3\+1 gegen 3\+1/.test(a) || /4\+1/.test(a)) probleme.push("L5-2 bei 8 Kindern: „" + a + "“ (3+1 gegen 3+1 sind acht)");
  if (!/^1 Feld .*4 gegen 4.*dritte Gruppe/.test(b)) probleme.push("L2-4 bei 12 Kindern: „" + b + "“ (ein Feld 4 gegen 4 plus Wechselgruppe sind zwölf)");
  if (!/^2 Vierecke .*drei außen gegen einen/.test(c)) probleme.push("L1-3 bei 8 Kindern: „" + c + "“ (zweimal drei gegen eins sind acht)");
  const rang = x => String(x || "").split("-").map(t => parseInt(t, 10) || 0), soll = rang("2026-11-17-1"), ist = rang(d.stand);
  let neuer = true; for (let i = 0; i < 4; i++) { if ((ist[i] || 0) !== soll[i]) { neuer = (ist[i] || 0) > soll[i]; break; } }
  if (!neuer) probleme.push("Stand der Vorlagen " + d.stand + " – ohne höheren Stand zieht die App die Zeilen nicht nach");
  for (const x of d.vorlagen) { const sk = x.skalierung || {}; if (!Object.keys(sk).length) probleme.push("ohne Skalierung: " + x.name); }
  zeilen.push(`L5-2/8: 3+1 gegen 3+1 · L2-4/12: ein Feld plus Wechselgruppe · L1-3/8: zweimal drei gegen eins · Stand ${d.stand}`);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
