/* v863 · Vorlage übernehmen: kein zweites Abschlussturnier, Lehrgangsform bleibt (Bestandsaufnahme 1.12, Charles 18.11.).
   a) L4-5 endet im letzten Spielblock schon mit einem Abschlussturnier → keine weitere Phase, der Block behält seine Minuten.
   b) L4-2 (Lehrgangsform 15:30:15:30) → kein Turnier, der 30-Minuten-Spielblock bleibt 30 Minuten.
   c) Eine gewöhnliche Vorlage ohne Abschluss bekommt weiterhin ein Abschlussturnier (v656). */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v863 Vorlage übernehmen: kein zweites Abschlussturnier, Lehrgangsform bleibt";
  const probleme = [], zeilen = [];
  const d = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen", "vorlagen.json"), "utf8"));
  const L = Array.isArray(d) ? d : d.vorlagen;
  const finde = k => L.find(v => String(v.name || "").startsWith(k));
  const l45 = finde("L4-5"), l42 = finde("L4-2");
  // Alle echten Vorlagen außer diesen beiden bringen einen Abschluss mit – für c) eine Kopie von L4-5 ohne Turnier im letzten Block.
  const normal = l45 && Object.assign({}, l45, { name: "Probe ohne Abschluss", bloecke: l45.bloecke.map((x, i, a) => i === a.length - 1 ? Object.assign({}, x, { label: "Spielblock 2 – offene Stufe" }) : x) });
  const s = await h.starten({ start: "/trainer/index.html", angemeldet: true, warten: 2500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await s.page.evaluate(vs => {
    if (typeof vuAbschlussturnierSichern !== "function") return { fehlt: true };
    const lauf = v => { if (!v) return null; const slots = v.bloecke.map(b => ({ label: b.label, dauer: b.dauer, typ: b.typ })); const vor = slots.length, letzte = slots[slots.length - 1].dauer;
      vuAbschlussturnierSichern(slots, v); return { vor, nach: slots.length, letzteVor: letzte, letzteNach: slots[vor - 1].dauer, neu: slots[slots.length - 1].label }; };
    return { l45: lauf(vs[0]), l42: lauf(vs[1]), normal: lauf(vs[2]) };
  }, [l45, l42, normal]).catch(err => ({ fehler: String(err) }));
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) return h.ergebnis(titel, false, ["vuAbschlussturnierSichern fehlt"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  if (!r.l45 || r.l45.nach !== r.l45.vor || r.l45.letzteNach !== r.l45.letzteVor) probleme.push("a) L4-5: " + JSON.stringify(r.l45));
  else zeilen.push(`a) L4-5: ${r.l45.vor} Phasen, letzter Block ${r.l45.letzteNach} Min – kein zweites Turnier`);
  if (!r.l42 || r.l42.nach !== r.l42.vor || r.l42.letzteNach !== 30) probleme.push("b) L4-2: " + JSON.stringify(r.l42));
  else zeilen.push("b) L4-2: Lehrgangsform bleibt, Spielblock 30 Min");
  if (!r.normal || r.normal.nach !== r.normal.vor + 1 || !/Abschlussturnier/.test(r.normal.neu)) probleme.push("c) gewöhnliche Vorlage: " + JSON.stringify(r.normal));
  else zeilen.push("c) gewöhnliche Vorlage ohne Abschluss: Abschlussturnier angehängt");
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
