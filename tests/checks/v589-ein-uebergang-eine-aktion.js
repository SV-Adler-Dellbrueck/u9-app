/* v589 – Ein Übergang zeigt eine Aktion: den Pass ODER den Weg des Empfängers, nie beides.

   Charles am 20.09., nach v588 am Handy: „Phase 3 zeigt einen Steilpass auf den rechten
   Flitzer vom Aufpasser. Der Aufpasser spielt aber auf den rechten Flitzer kurz, und dieser
   dribbelt dann am Dummy vorbei nach vorne rechts."

   Das Abspielen kennt nur Stellungen und gleitet geradlinig dazwischen. Steckten in einem
   Übergang zwei Aktionen – der Pass zu FR UND sein Dribbling ans Korridorende –, dann flog
   der Ball vom Aufpasser direkt dorthin, wo FR erst nach dem Dribbling steht: ein Steilpass,
   den es in der Übung nicht gibt. Die Pfeile sagten das Richtige, die Bewegung folgte den
   Stellungen. Seit v589 hat das Dribbling ein eigenes Bild (sieben statt sechs).

   Die Regel, dauerhaft für die ganze Bibliothek: Wechselt der Ball in einem Übergang zu
   einem anderen Spieler (Pass), dann steht dieser Empfänger in beiden Bildern an
   derselben Stelle – höchstens einen Schritt entgegen (unter 24 Punkten, das ist kein
   zweiter Weg). Bleibt der Ball beim selben Spieler und der bewegt sich, ist es ein
   Dribbling: erlaubt. Landet der Ball bei niemandem (Tor), gibt es keinen Empfänger.

   a) Die Lehrgangsübung hält die Regel in jedem Übergang.
   b) Der Altbestand wird gemessen und gemeldet, aber nicht rot: eine Skizze aus einem
      früheren Paket ist kein Fehler dieses Pakets (so hält es v557 mit den Abständen).
   c) Gegenprobe: eine Skizze, die Pass und Empfängerweg mischt, MUSS auffallen. */
const fs = require("fs"), path = require("path");
const SCHRITT = 24;   // darunter geht der Empfänger dem Ball nur entgegen
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const NAME = "Raute mit Torwart – Angriff über den anderen Flügel";
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await s.page.evaluate(({ uebungen, SCHRITT }) => {
    const fehlt = ["skzBildZahl", "_skzBild"].filter(n => typeof window[n] !== "function");
    if (fehlt.length) return { fehlt };
    const naechster = (b, ball) => { let best = -1, d = 1e9; (b.s || []).forEach((sp, i) => { const x = Math.hypot(sp[0] - ball[0], sp[1] - ball[1]); if (x < d) { d = x; best = i; } }); return d <= 15 ? best : -1; };
    const pruefe = u => {
      const spec = u.skizze, n = skzBildZahl(spec), aus = [];
      for (let i = 0; i < n - 1; i++) {
        const a = _skzBild(spec, i), b = _skzBild(spec, i + 1);
        (b.b || []).forEach((ball, k) => {
          const vorher = (a.b || [])[k]; if (!vorher) return;
          if (Math.hypot(ball[0] - vorher[0], ball[1] - vorher[1]) < 20) return;
          const von = naechster(a, vorher), zu = naechster(b, ball);
          if (zu < 0 || von === zu) return;                            // Tor oder Dribbling
          const p = (a.s || [])[zu], q = (b.s || [])[zu];
          const weg = (p && q) ? Math.hypot(p[0] - q[0], p[1] - q[1]) : 0;
          if (weg >= SCHRITT) aus.push({ von: i + 1, nach: i + 2, wer: (q || [])[3] || String(zu), weg: Math.round(weg) });
        });
      }
      return { name: u.name, bilder: n, verstoesse: aus };
    };
    const alle = uebungen.filter(u => u.skizze && skzBildZahl(u.skizze) > 1).map(pruefe);
    const blind = pruefe({ name: "(Gegenprobe)", skizze: {
      s: [[90, 236, "g", "A"], [148, 176, "g", "FR"]], b: [[100, 242]],
      schritte: [{ s: [[90, 236, "g", "A"], [153, 86, "g", "FR"]], b: [[146, 94]] }] } });
    return { alle, blind };
  }, { uebungen: bib.uebungen, SCHRITT });
  const fehler = s.fehler();
  await s.schliessen();
  if (r.fehlt) return h.ergebnis("Abspielen: ein Übergang, eine Aktion", false, [r.fehlt.join(", ") + " fehlt"]);

  const raute = r.alle.find(x => x.name === NAME);
  if (!raute) probleme.push("Die Lehrgangsübung fehlt oder hat nur ein Bild");
  else {
    if (raute.bilder !== 7) probleme.push(`Die Lehrgangsübung hat ${raute.bilder} Bilder statt sieben`);
    raute.verstoesse.forEach(v => probleme.push(`Lehrgangsübung Bild ${v.von}→${v.nach}: der Ball wechselt zu ${v.wer}, und ${v.wer} legt dabei ${v.weg} Punkte zurück – Pass und Weg gehören in zwei Bilder`));
  }
  const alt = r.alle.filter(x => x.name !== NAME && x.verstoesse.length);
  const g = r.blind.verstoesse;
  if (!g.length) probleme.push("Die Gegenprobe (Pass zu FR, der dabei 90 Punkte läuft) fällt nicht auf – dann prüft diese Datei nichts");
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);

  if (!probleme.length) {
    zeilen.push(`Lehrgangsübung: ${raute.bilder} Bilder, ${raute.bilder - 1} Übergänge, kein Pass mit laufendem Empfänger (Schwelle ${SCHRITT})`);
    zeilen.push(`Gegenprobe: Pass zu ${g[0].wer}, der ${g[0].weg} Punkte läuft, fällt auf, wie er soll`);
    if (alt.length) zeilen.push("Befund am Altbestand, nicht aus diesem Paket: " + alt.map(x => `„${x.name}“ ` + x.verstoesse.map(v => `Bild ${v.von}→${v.nach} (${v.wer}, ${v.weg} Punkte)`).join(", ")).join(" · "));
    else zeilen.push(`Alle ${r.alle.length} Skizzen mit mehreren Bildern halten die Regel`);
  }
  return h.ergebnis("Abspielen: ein Übergang, eine Aktion", !probleme.length, zeilen.concat(probleme));
};
