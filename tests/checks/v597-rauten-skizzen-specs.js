/* v597 · Die elf Rauten-Übungen aus dem Altbestand sind jetzt Specs

   Befund vom 14.09. (PO): „die Zeichnungen sind bei einigen nicht sauber … die Legenden
   fehlen." Fünf Übungen wurden damals gezogen (v549), zehn weitere mit v551. Siebenund-
   dreißig trugen das Muster weiter; hier fallen elf davon — die Rauten-Gruppe tf003 bis
   tf012 und tf051 „Adler vs. Igel".

   Gemessen wird nicht, dass eine Spec existiert, sondern dass die Zeichnung daraus die
   drei alten Fehler nicht mehr hat und dass nichts verloren ging:

   a) Keine der elf trägt den Übungsnamen im Bild, keinen halbdurchsichtigen Text und
      kein zweites <svg>; wo Pfeile sind, tragen sie eine Legendenfarbe.
   b) Sie sind vollständig: jede zeichnet mindestens so viele Spieler wie vorher, und
      Tore, Zonen und Beschriftungen sind mitgekommen.
   c) Alles bleibt im Bild — kein Element ragt über den Rand (die alte Fassung von
      „Mini-Turnier Raute" schrieb C1 bis C3 auf y=186 bei 180 Höhe).
   d) Die Sperrklinke steht auf sechsundzwanzig: die Zahl der noch betroffenen
      handgezeichneten Skizzen ist von 37 auf 26 gefallen. */
"use strict";

const GEZOGEN = ["tf003", "tf004", "tf005", "tf006", "tf007", "tf008", "tf009", "tf010",
                 "tf011", "tf012", "tf051"];

/* Wie viele Spieler die handgezeichnete Fassung zeigte (Kreise mit r 8 oder 9, ohne Ball).
   Aus data.js vor dem Zug ausgezählt — die Spec darf nicht weniger zeigen. */
const VORHER_SPIELER = { tf003: 5, tf004: 2, tf005: 5, tf006: 4, tf007: 5, tf008: 6,
                         tf009: 4, tf010: 7, tf011: 4, tf012: 9, tf051: 8 };

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });

  const r = await s.page.evaluate(({ GEZOGEN, VORHER_SPIELER }) => {
    const farben = Object.values(SKZ_PFEIL);
    const nameImBild = (name, texte) => texte.some(t =>
      t && t.length >= 6 && (name.startsWith(t.slice(0, 12)) || t.startsWith(name.slice(0, 12))));

    const aus = GEZOGEN.map(id => {
      const f = TRAININGSFORMEN.find(x => x.id === id);
      const spec = TF_SKIZZEN[id];
      if (!f || !spec) return { id, fehlt: true, ohneSpec: !spec, ohneUebung: !f };
      const svg = _skz(spec);
      const texte = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m => m[1]);

      /* c) Ragt etwas über den Rand? Geprüft werden die Mittelpunkte der Spieler und
         Bälle mit ihrem Radius und die Grundlinie der Beschriftungen. */
      const raus = [];
      (spec.s || []).forEach(p => { if (p[0] - 8 < 0 || p[0] + 8 > SKZ_QUER_B || p[1] - 8 < 0 || p[1] + 8 > SKZ_QUER_H) raus.push("Spieler " + p[0] + "/" + p[1]); });
      (spec.b || []).forEach(p => { if (p[0] - 4 < 0 || p[0] + 4 > SKZ_QUER_B || p[1] - 4 < 0 || p[1] + 4 > SKZ_QUER_H) raus.push("Ball " + p[0] + "/" + p[1]); });
      (spec.tx || []).forEach(t => { if (t[1] < 8 || t[1] > SKZ_QUER_H - 2) raus.push("Text „" + t[2] + "“ auf y=" + t[1]); });

      return {
        id, name: f.name,
        /* Beim Laden füllt data.js leere Zeichnungen aus der Spec – gemessen wird
           deshalb nicht, ob f.svg leer ist, sondern ob es Zeichen für Zeichen das ist,
           was die Spec ergibt. Bliebe das alte handgezeichnete SVG stehen, wäre es das
           nicht. */
        ausSpec: (f.svg || "") === svg,
        nameImBild: nameImBild(f.name, texte),
        halb: /fill="rgba\(255,255,255,\.[1-5]\)"/.test(svg),
        svgs: (svg.match(/<svg/g) || []).length,
        pfeile: (spec.p || []).length,
        legendenfarbe: farben.some(c => svg.includes(c)),
        spieler: (spec.s || []).length,
        soll: VORHER_SPIELER[id],
        tore: (spec.tor || []).length,
        texte: texte.length,
        raus
      };
    });

    // d) Sperrklinke: wie viele handgezeichnete Skizzen tragen das Muster noch?
    let rest = 0;
    TRAININGSFORMEN.forEach(f => {
      if (!f.svg || TF_SKIZZEN[f.id]) return;
      const texte = [...f.svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m => m[1]);
      const linien = (f.svg.match(/<line/g) || []).length;
      const lf = farben.some(c => f.svg.includes(c));
      if (nameImBild(f.name, texte) || (f.svg.match(/<svg/g) || []).length > 1
          || /fill="rgba\(255,255,255,\.[1-5]\)"/.test(f.svg) || (linien && !lf)) rest++;
    });
    return { aus, rest, gesamt: TRAININGSFORMEN.length, breite: SKZ_QUER_B, hoehe: SKZ_QUER_H };
  }, { GEZOGEN, VORHER_SPIELER });

  const fehlt = r.aus.filter(x => x.fehlt);
  if (fehlt.length) probleme.push("Ohne Spec oder ohne Übung: " + fehlt.map(x => x.id).join(", "));
  const da = r.aus.filter(x => !x.fehlt);

  // a) die drei alten Fehler
  const alt = da.filter(x => !x.ausSpec).map(x => x.id);
  if (alt.length) probleme.push("Die Zeichnung stammt nicht aus der Spec: " + alt.join(", "));

  const mitName = da.filter(x => x.nameImBild).map(x => x.name);
  if (mitName.length) probleme.push("Der Übungsname steht im Bild (er steht schon als Überschrift darüber): " + mitName.join(", "));

  const halb = da.filter(x => x.halb).map(x => x.name);
  if (halb.length) probleme.push("Halbdurchsichtiger Text auf dem Rasen (2,9:1 statt 4,5:1): " + halb.join(", "));

  const doppelt = da.filter(x => x.svgs !== 1).map(x => `${x.name} (${x.svgs})`);
  if (doppelt.length) probleme.push("Nicht genau ein <svg>: " + doppelt.join(", "));

  const stumm = da.filter(x => x.pfeile && !x.legendenfarbe).map(x => x.name);
  if (stumm.length) probleme.push("Pfeile ohne Legendenfarbe – die Legende darunter beschreibt dann etwas anderes: " + stumm.join(", "));

  // b) nichts verloren
  const duenn = da.filter(x => x.spieler < x.soll).map(x => `${x.name} (${x.spieler} statt ${x.soll})`);
  if (duenn.length) probleme.push("Zeigt weniger Spieler als die handgezeichnete Fassung: " + duenn.join(", "));

  const ohneText = da.filter(x => !x.texte).map(x => x.name);
  if (ohneText.length) probleme.push("Ohne jede Beschriftung: " + ohneText.join(", "));

  // c) alles im Bild
  const ueber = da.filter(x => x.raus.length).map(x => `${x.name}: ${x.raus.join(" · ")}`);
  if (ueber.length) probleme.push("Ragt über den Bildrand: " + ueber.join(" | "));

  // d) Sperrklinke
  if (r.rest > 26) probleme.push(`Altbestand wieder gewachsen: ${r.rest} handgezeichnete Skizzen mit dem Muster, erlaubt sind 26`);

  if (!probleme.length) {
    const pfeile = da.reduce((n, x) => n + x.pfeile, 0);
    const tore = da.reduce((n, x) => n + x.tore, 0);
    zeilen.push(`a) ${da.length} Übungen aus Specs: kein Name im Bild, kein halbdurchsichtiger Text, genau ein <svg>, ${pfeile} Pfeile in den Legendenfarben`);
    zeilen.push(`b) Spieler vollzählig (${da.map(x => x.spieler).join("·")} gegen vorher ${da.map(x => x.soll).join("·")}), ${tore} Tore, ${da.reduce((n, x) => n + x.texte, 0)} Beschriftungen`);
    zeilen.push(`c) Nichts ragt über den Rand (${r.breite} × ${r.hoehe})`);
    zeilen.push(`d) Altbestand: noch ${r.rest} von ${r.gesamt} handgezeichnet mit dem Muster (vorher 37, Grenze 26)`);
  }

  const f = s.fehler();
  if (f.length) probleme.push("Konsole: " + f.join(" | "));
  await s.schliessen();
  return h.ergebnis("Rauten-Skizzen als Spec", !probleme.length, probleme.length ? probleme : zeilen);
};
