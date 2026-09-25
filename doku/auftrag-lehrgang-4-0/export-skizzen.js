/* Export der Bilder für die Lehrgangsabgabe 4.0 (Trainingsform Erwachsenenfußball) –
   zwei Bilder mit Legende und die durchlaufende Animation. Derselbe Weg wie bei 3.1,
   deshalb wird das Skript aus dem Paket Lehrgangsskizzen benutzt statt kopiert.

   Die Bilder gehören ins PRIVATE Repo (`Projektgedaechtnis/skizzen/aufgabe-4-0/`), weil
   die Abgabe personenbezogen ist; im öffentlichen Repo bleibt nur die Beschreibung.

   Voraussetzung: das private Repo ist nach `.wissen/` geklont (siehe CLAUDE.md).
   Aufruf aus dem Projektordner:
     node doku/auftrag-lehrgang-4-0/export-skizzen.js */
const fs = require("fs"), path = require("path");
const exportSkizzen = require("../auftrag-lehrgangsskizzen/export-skizzen.js");

const AUS = path.join(process.cwd(), ".wissen/Projektgedaechtnis/skizzen/aufgabe-4-0");
const MUSTER = /^Lehrgang Ü32 – 4 gegen 4 \+ TW: Umschalten nach Ballgewinn$/;
const SLUG = "ue32-4gegen4-umschalten";

if (!fs.existsSync(AUS)) fs.mkdirSync(AUS, { recursive: true });

(async () => {
  await exportSkizzen({ aus: AUS, bildEins: true, auswahl: [{ muster: MUSTER, slug: SLUG }] });
  await exportSkizzen.exportAnimation({ aus: AUS, muster: MUSTER, slug: SLUG });
})();
