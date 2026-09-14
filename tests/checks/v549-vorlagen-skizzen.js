/* v549 – Die Skizzen der Übungen, die in den Vorlagen stecken.

   Befund vom 14.09. (PO): „die Zeichnungen sind bei einigen nicht sauber, teilweise gar
   nicht nachvollziehbar oder sogar leer, die Legenden fehlen."

   Nachgesehen statt geraten. Von den dreizehn Übungen, die die sieben Vorlagen nennen,
   waren fünf von Hand als SVG geschrieben – aus den Anfangstagen, lange vor der
   Pfeil-Legende (v512) und vor den Linien (v517). Drei Fehler, bei allen fünf gleich:

   1. Der ÜBUNGSNAME stand als halbdurchsichtiger Text IM Feld. rgba(255,255,255,.5)
      kommt auf dem Rasen #2d6a2d auf 2,9:1 – unter den 4,5:1 aus CLAUDE.md. Und er
      stand doppelt, denn die Überschrift steht direkt darüber.
   2. Die Pfeile trugen keine der vier Legendenfarben. Die Legende unter der Skizze
      beschrieb damit eine Zeichnung, die es so nicht gab – genau das „Legenden fehlen".
   3. „4gg2 Ballbesitz" enthielt ZWEI <svg>-Elemente, das erste ein leeres Feld. Das ist
      die Skizze, die im Übungsdetail leer aussah.

   Alle fünf sind jetzt Specs in TF_SKIZZEN; aus _skz gezeichnet stimmen Legende,
   Kontrast, Bildexport und Handy-Maßstab von selbst.

   Fälle:
   a) Jede Übung, die eine Vorlage nennt, hat überhaupt eine Zeichnung.
   b) Keine davon enthält mehr als ein <svg>.
   c) Keine davon trägt den Übungsnamen im Bild.
   d) Keine davon schreibt Text halbdurchsichtig.
   e) Wo Pfeile sind, tragen sie die Farben der Legende.
   f) Sperrklinke für den Rest des Bestands: die Zahl der noch betroffenen
      handgezeichneten Skizzen darf nicht wachsen. */
/* Stand 14.09.2026: von ursprünglich 52 handgezeichneten Skizzen sind fünf gezogen,
   siebenundvierzig tragen das Muster noch. Die Zahl darf nur sinken. */
const REST_HOECHSTENS = 47;

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");

  // Welche Übungen nennen die Vorlagen? Aus der Datei, nicht aus der Datenbank.
  const vor = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8"));
  const namen = [...new Set((vor.vorlagen || []).flatMap(v => (v.bloecke || []).flatMap(b =>
    [b.uebung_name].concat((b.stationen || []).map(s => s && s.uebung_name)))).filter(Boolean))];
  if (namen.length < 5) return h.ergebnis("Vorlagen-Skizzen", false, [`Nur ${namen.length} Übungsnamen in vorlagen.json gefunden`]);

  /* Sechs der dreizehn Übungen stehen nicht in data.js, sondern kommen über den Abgleich
     aus `uebungen/bibliothek.json` in die Datenbank. Im Prüflauf ist die Datenbank leer –
     ihre Zeichnung wird deshalb aus der Datei gelesen und wie in der App mit _skz gebaut. */
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const ausDatei = Object.fromEntries((bib.uebungen || []).filter(u => u.skizze).map(u => [u.name, u.skizze]));

  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await s.page.evaluate(({ namen, ausDatei }) => {
    const farben = Object.values(SKZ_PFEIL);
    const pruefe = svg => {
      const texte = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m => m[1]);
      return {
        laenge: svg.length,
        svgs: (svg.match(/<svg/g) || []).length,
        texte,
        halb: /fill="rgba\(255,255,255,\.[1-5]\)"/.test(svg),
        linien: (svg.match(/<line/g) || []).length,
        legendenfarbe: farben.some(c => svg.includes(c))
      };
    };
    const alle = tpAllForms();
    const aus = namen.map(n => {
      const f = alle.find(x => x.name === n);
      if (f) return { name: n, ausSpec: !!TF_SKIZZEN[f.id], quelle: "data.js", ...pruefe(f.svg || "") };
      if (ausDatei[n]) return { name: n, ausSpec: true, quelle: "bibliothek.json", ...pruefe(_skz(ausDatei[n])) };
      return { name: n, fehlt: true };
    });
    // f) Wie viele handgezeichnete Skizzen tragen im Bestand noch einen der Fehler?
    let rest = 0;
    TRAININGSFORMEN.forEach(f => {
      if (!f.svg || TF_SKIZZEN[f.id]) return;
      const p = pruefe(f.svg);
      const name = p.texte.some(t => t && (f.name.startsWith(t.slice(0, 12)) || t.startsWith(f.name.slice(0, 12))));
      if (name || p.svgs > 1 || p.halb || (p.linien && !p.legendenfarbe)) rest++;
    });
    return { aus, rest, gesamt: TRAININGSFORMEN.length };
  }, { namen, ausDatei });

  const fehlt = r.aus.filter(x => x.fehlt).map(x => x.name);
  if (fehlt.length) probleme.push("Nicht in der Übungsdatenbank: " + fehlt.join(", "));

  const da = r.aus.filter(x => !x.fehlt);
  const ohne = da.filter(x => !x.laenge).map(x => x.name);
  if (ohne.length) probleme.push("Ohne jede Zeichnung: " + ohne.join(", "));

  const doppelt = da.filter(x => x.svgs > 1).map(x => `${x.name} (${x.svgs})`);
  if (doppelt.length) probleme.push("Mehr als ein <svg> in einer Skizze: " + doppelt.join(", "));

  const mitName = da.filter(x => x.texte.some(t => t && (x.name.startsWith(t.slice(0, 12)) || t.startsWith(x.name.slice(0, 12))))).map(x => x.name);
  if (mitName.length) probleme.push("Der Übungsname steht im Bild (er steht schon als Überschrift darüber): " + mitName.join(", "));

  const halb = da.filter(x => x.halb).map(x => x.name);
  if (halb.length) probleme.push("Halbdurchsichtiger Text auf dem Rasen (2,9:1 statt 4,5:1): " + halb.join(", "));

  const stumm = da.filter(x => x.linien && !x.legendenfarbe).map(x => x.name);
  if (stumm.length) probleme.push("Pfeile ohne Legendenfarbe – die Legende darunter beschreibt dann etwas anderes: " + stumm.join(", "));

  if (!probleme.length) {
    const specs = da.filter(x => x.ausSpec).length;
    const ausBib = da.filter(x => x.quelle === "bibliothek.json").length;
    zeilen.push(`${da.length} Übungen aus den Vorlagen: alle mit Zeichnung, ${specs} aus einer Spec (${ausBib} davon über bibliothek.json)`);
    zeilen.push("Kein Name im Bild, kein halbdurchsichtiger Text, kein zweites <svg>, Pfeile in den Legendenfarben");
  }

  /* f) Sperrklinke. Der Altbestand ist bekannt und wird nach und nach gezogen –
     rot wird die Prüfung erst, wenn die Zahl wieder STEIGT. */
  if (r.rest > REST_HOECHSTENS)
    probleme.push(`${r.rest} handgezeichnete Skizzen im Bestand tragen noch einen der Fehler, erlaubt sind höchstens ${REST_HOECHSTENS}`);
  else
    zeilen.push(`Altbestand: noch ${r.rest} von ${r.gesamt} handgezeichnete Skizzen mit demselben Muster (Grenze ${REST_HOECHSTENS}, darf nur sinken)`);

  const f = s.fehler();
  if (f.length) probleme.push("Konsole: " + f[0]);
  await s.schliessen();

  return h.ergebnis("Vorlagen-Übungen: Skizzen sauber und zur Legende passend", !probleme.length, zeilen.concat(probleme));
};
