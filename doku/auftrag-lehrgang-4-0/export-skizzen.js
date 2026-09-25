/* Export der Bilder für die Lehrgangsabgabe 4.0 (Trainingsform für Erwachsene, Ü32) –
   sieben Bilder mit Legende, je Phase eines, und die durchlaufende Animation.
   Derselbe Weg wie bei 3.1, deshalb wird das Skript aus dem Paket Lehrgangsskizzen benutzt.

   Die Animation läuft bewusst LANGSAM (Charles, 25.09.): je Bild 2,5 s Standzeit, Gleiten
   1,8-mal so lang wie in der App, 3,5 s Schlussbild. Dafür braucht exportAnimation die
   Optionen standMs und gleitFaktor (siehe Auftragspaket, Schritt 3). Ohne sie bleibt alles
   wie bisher.

   Die Bilder gehören ins PRIVATE Repo (`Projektgedaechtnis/skizzen/aufgabe-4-0/`).
   Aufruf aus dem Projektordner:
     node doku/auftrag-lehrgang-4-0/export-skizzen.js */
const fs = require("fs"), path = require("path");
const exportSkizzen = require("../auftrag-lehrgangsskizzen/export-skizzen.js");

const AUS = path.join(process.cwd(), ".wissen/Projektgedaechtnis/skizzen/aufgabe-4-0");
const MUSTER = /^Lehrgang Erwachsene \(Ü32\) – 4 gegen 4 \+ Torhüter: Umschalten nach Ballgewinn$/;
const SLUG = "erwachsene-4gegen4-umschalten";

if (!fs.existsSync(AUS)) fs.mkdirSync(AUS, { recursive: true });

(async () => {
  await exportSkizzen({ aus: AUS, bildEins: true, auswahl: [{ muster: MUSTER, slug: SLUG }] });
  await exportSkizzen.exportAnimation({ aus: AUS, muster: MUSTER, slug: SLUG,
    breite: 560, standMs: 2500, gleitFaktor: 1.8, schlussMs: 3500 });
})();
