/* v796 · Charles 07.11.: „Hier steht in der Übersicht 9 dabei. Es haben aber 12 zugesagt.“
   Der Chip „🧩 N dabei“ in „Diese Woche“ zählt die Einteilung („Teams festlegen“, v486) – nicht die Zusagen.
   a) 12 Zusagen, 9 eingeteilt → „9 dabei“ und daneben „12 zugesagt · 3 noch nicht eingeteilt“
   b) genauso viele Zusagen wie Eingeteilte, oder keine Zusagen → nur „9 dabei“ (wie seit v486; kein zweiter Chip)
   c) mehr Eingeteilte als Zusagen → ebenfalls kein Warn-Chip */
"use strict";
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const spiel = h.tagePlus(2);
  const nomDaten = {}; K.slice(0, 9).forEach(n => { nomDaten[n] = "dabei"; });
  async function lauf(zusagen) {
    const rm = Array.from({ length: zusagen }, (_, i) => ({ termin_id: 1, status: "zugesagt", spieler_id: i + 1 }));
    const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(),
      termine: [{ id: 1, datum: spiel, typ: "turnier", heim: true, titel: "Kinderfestival", uhrzeit: "10:15", trainer_status: {} }],
      nominierungen: u => (u.searchParams.get("datum") || "").includes(spiel + "__nom") ? [{ datum: spiel + "__nom", data: nomDaten }] : [],
      rueckmeldungen: rm, trainingsplan: [], trainingsgruppen: [] }) });
    await h.sichtbarMachen(s.page, "#home-content");
    const z = await s.page.evaluate(async () => {
      const w = ms => new Promise(x => setTimeout(x, ms));
      await loadKader(); document.getElementById("pin-gate")?.remove(); go("home"); await w(900);
      return [...document.querySelectorAll("#home-woche .woche-zeile")].map(x => x.textContent.replace(/\s+/g, " ")).find(x => /Kinderfestival|Turnier/.test(x)) || "";
    });
    const fe = s.fehler(); await s.schliessen();
    return { z, fe };
  }
  const a = await lauf(12), b1 = await lauf(9), b2 = await lauf(0), c = await lauf(7);
  if (!/9 dabei/.test(a.z) || !/12 zugesagt · 3 noch nicht eingeteilt/.test(a.z)) probleme.push("a) " + a.z.slice(0, 160));
  for (const [n, x] of [["9 Zusagen", b1], ["0 Zusagen", b2], ["7 Zusagen", c]])
    if (!/9 dabei/.test(x.z) || /zugesagt|nicht eingeteilt/.test(x.z)) probleme.push(`b/c) ${n}: ${x.z.slice(0, 120)}`);
  const fe = [...a.fe, ...b1.fe, ...b2.fe, ...c.fe]; if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push("12 Zusagen / 9 eingeteilt → „9 dabei“ + „12 zugesagt · 3 noch nicht eingeteilt“; bei 9, 0 und 7 Zusagen bleibt es beim einen Chip");
  return h.ergebnis("v796 Diese Woche: Zusagen und Einteilung nebeneinander", !probleme.length, probleme.length ? probleme : zeilen);
};
