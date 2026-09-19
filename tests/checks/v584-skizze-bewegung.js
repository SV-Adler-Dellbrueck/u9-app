/* v584 – Eine Abfolge, in der sich nichts bewegt.

   Charles am 19.09., nach dem Öffnen der Lehrgangsübung am Handy: „Die Animation läuft nur
   1 Sekunde an und stoppt dann. Eigentlich sollte sie beide Bilder durch animieren."

   Gemessen am gerenderten DOM lief das Abspielen genau so, wie es gebaut ist: 600 ms
   Standzeit, 800 ms Überblendung, dann das nächste Bild. Es hatte nur nichts zu zeigen.
   Die Skizze der Übung trug in ihrem Schritt `b`, `p` und `tx`, aber kein `s` — kein
   einziger Spieler stand in Bild 2 an einer anderen Stelle als in Bild 1. Übrig blieb ein
   Ball, der 16 von 180 Punkten Feldbreite rutschte; am Handy sind das wenige Millimeter.

   Das ist die stille Sorte Fehler, die dieses Repo schon einmal teuer bezahlt hat: Nichts
   war rot. `_euPruefung` war zufrieden, `_eiSkizzeFehler` auch, die Bilder rendern sauber,
   das Blättern stimmt. Nur der Knopf, für den die Bilder gedacht sind, zeigt Stillstand.

   Deshalb prüft diese Datei nicht die eine Übung, sondern JEDE Skizze der Bibliothek, die
   mehr als ein Bild hat — heute wie in Zukunft:

   a) Eine Abfolge muss sich bewegen. Als Bewegung zählt, wenn ein Spieler oder der Ball
      mindestens 20 Punkte zurücklegt: gut ein Zehntel der langen Feldseite, am Handy etwa
      ein Zentimeter. Darunter sieht ein Kind an der Linie nichts.
   b) Ein EINZELNER stiller Übergang ist erlaubt — aber nur einer, und nie zwei
      hintereinander. Das ist kein Schlupfloch, sondern ein anderes Muster: Manche Skizzen
      beginnen mit einem Übersichtsbild, das alle Wege auf einmal zeigt, und wechseln dann
      in dieselbe Stellung mit weniger Wegen („Dreieckspassen mit Abschluss" macht das).
      Das ist gewollt. Dass der Bildschirm dabei nicht steht, regelt seit v584 das Abspielen
      selbst: Ein Übergang ohne Bewegung wird kurz durchgeschaltet statt überblendet.
      Zwei stille Übergänge hintereinander sind dagegen nie Absicht.
   c) Bewegt sich ausschließlich der Ball, während alle Kinder stehen bleiben, muss er weit
      laufen (mindestens 60 Punkte) — dann ist es ein Pass oder ein Torschuss. Rutscht er
      nur ein Stück, fehlen im Schritt die Spielerpositionen; genau das war der Fall.
   d) Und die Gegenprobe, damit diese Prüfung nicht selbst stillschweigend nichts tut: Eine
      künstliche Skizze mit unbewegten Spielern MUSS hier auffallen. Fällt sie nicht auf,
      ist die Prüfung kaputt, nicht die Bibliothek. */
const fs = require("fs"), path = require("path");
const SCHWELLE = 20;       // Punkte, ab denen eine Bewegung am Handy sichtbar ist
const NUR_BALL_AB = 60;    // wandert allein der Ball, muss er weit laufen (Torschuss)

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));

  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });

  const r = await s.page.evaluate(({ uebungen, SCHWELLE, NUR_BALL_AB }) => {
    const fehlt = ["skzBildZahl", "_skzBild", "_skzZwischen"].filter(n => typeof window[n] !== "function");
    if (fehlt.length) return { fehlt };

    /* Die weiteste Strecke, die ein Eintrag der Liste zurücklegt. Verglichen wird nach
       Index — genau so mischt `_skzZwischen` beim Abspielen, und genau so wandern die
       Kreise auf dem Bildschirm. */
    const weiteste = (a, b) => (a || []).reduce((max, e, i) => {
      const z = (b || [])[i];
      if (!z || !Array.isArray(e)) return max;
      return Math.max(max, Math.hypot(e[0] - z[0], e[1] - z[1]));
    }, 0);

    const pruefe = u => {
      const spec = u.skizze;
      const n = skzBildZahl(spec);
      if (n < 2) return null;
      const uebergaenge = [];
      for (let i = 0; i < n - 1; i++) {
        const a = _skzBild(spec, i), b = _skzBild(spec, i + 1);
        uebergaenge.push({
          von: i + 1, nach: i + 2,
          spieler: Math.round(weiteste(a.s, b.s) * 10) / 10,
          ball: Math.round(weiteste(a.b, b.b) * 10) / 10
        });
      }
      return { name: u.name, bilder: n, uebergaenge };
    };

    const aus = uebungen.map(pruefe).filter(Boolean);

    /* c) Gegenprobe: dieselbe Rechnung an einer Skizze, in der die Spieler stehen bleiben
       und nur der Ball ein Stück rutscht — so wie die Lehrgangsübung bis v583. */
    const blind = pruefe({
      name: "(Gegenprobe)",
      skizze: { s: [[40, 40, "g", "A"]], b: [[98, 243]], p: [[10, 10, 20, 20, "p"]],
                schritte: [{ b: [[82, 243]] }] }
    });

    return { aus, blind, SCHWELLE, NUR_BALL_AB };
  }, { uebungen: bib.uebungen.filter(u => u && u.skizze), SCHWELLE, NUR_BALL_AB });

  const fehler = s.fehler();
  await s.schliessen();
  if (r.fehlt) return h.ergebnis("Skizze: Abfolgen bewegen sich", false, [r.fehlt.join(", ") + " fehlt"]);

  // a) bis c) über die ganze Bibliothek
  let uebergaenge = 0, stille = 0;
  (r.aus || []).forEach(u => {
    let still = 0, vorherStill = false;
    u.uebergaenge.forEach(g => {
      uebergaenge++;
      const bestes = Math.max(g.spieler, g.ball);
      if (bestes < SCHWELLE) {
        still++; stille++;
        if (vorherStill) probleme.push(`„${u.name}“: Bild ${g.von - 1}→${g.von}→${g.nach} stehen `
          + `beide still – zwei stille Übergänge hintereinander sind keine Absicht`);
        vorherStill = true;
      } else {
        vorherStill = false;
        if (g.spieler < 1 && g.ball < NUR_BALL_AB)
          probleme.push(`„${u.name}“ Bild ${g.von}→${g.nach}: kein Kind bewegt sich, nur der Ball `
            + `(${g.ball} Punkte) – als reiner Ballweg zu kurz, als Abfolge fehlen die Spielerpositionen im Schritt`);
      }
    });
    if (still > 1) probleme.push(`„${u.name}“: ${still} von ${u.uebergaenge.length} Übergängen ohne `
      + `sichtbare Bewegung – höchstens einer darf still sein (das Übersichtsbild am Anfang)`);
    if (still === u.uebergaenge.length) probleme.push(`„${u.name}“: KEIN Übergang bewegt etwas – `
      + `das Abspielen zeigt Stillstand. Fehlen den Schritten die Spielerpositionen (\`s\`)?`);
  });

  // c) Die Gegenprobe MUSS auffallen
  const g0 = r.blind && r.blind.uebergaenge && r.blind.uebergaenge[0];
  if (!g0) probleme.push("Die Gegenprobe liefert gar keinen Übergang – dann prüft diese Datei nichts");
  else if (Math.max(g0.spieler, g0.ball) >= SCHWELLE)
    probleme.push(`Die Gegenprobe (Spieler ${g0.spieler}, Ball ${g0.ball}) gilt als Bewegung – die Schwelle greift nicht`);

  if (fehler.length) probleme.push("Konsole: " + fehler[0]);

  if (!probleme.length) {
    zeilen.push(`${(r.aus || []).length} Skizzen mit mehreren Bildern, ${uebergaenge} Übergänge, davon `
      + `${stille} ohne Bewegung (erlaubt: höchstens einer je Skizze, nie zwei hintereinander)`);
    (r.aus || []).forEach(u => zeilen.push(`  „${u.name}“ (${u.bilder} Bilder): `
      + u.uebergaenge.map(g => `${g.von}→${g.nach} Spieler ${g.spieler} · Ball ${g.ball}`).join(" | ")));
    zeilen.push(`Gegenprobe: unbewegte Spieler + ${g0.ball} Punkte Ball fallen auf, wie sie sollen`);
  }
  return h.ergebnis("Skizze: Abfolgen bewegen sich", !probleme.length, zeilen.concat(probleme));
};
