/* Export des Bilds für die C-Lizenz-Abgabe 3.1 (Zwei-Seiten-Spiel): SVG und PNG mit Legende.
   Derselbe Weg wie bei den Basis-Coach-Abgaben – das Skript aus dem Paket Lehrgangsskizzen wird
   benutzt, nicht kopiert. Ein Bild, deshalb ohne Animation und ohne „-bild-1“.

   Das Bild gehört ins PRIVATE Repo (`Projektgedaechtnis/skizzen/aufgabe-c-3-1/`), weil die Abgabe
   personenbezogen ist; im öffentlichen Repo bleibt nur die Beschreibung, aus der es jederzeit neu
   entsteht.

   Voraussetzung: das private Repo ist nach `.wissen/` geklont (siehe CLAUDE.md).
   Aufruf aus dem Projektordner:
     node doku/auftrag-lehrgang-c-3-1/export-skizzen.js */
const fs = require("fs"), path = require("path");
const exportSkizzen = require("../auftrag-lehrgangsskizzen/export-skizzen.js");

const AUS = path.join(process.cwd(), ".wissen/Projektgedaechtnis/skizzen/aufgabe-c-3-1");
const MUSTER = /^Lehrgang – Zwei-Seiten-Spiel$/;
const SLUG = "zwei-seiten-spiel";

if (!fs.existsSync(path.join(process.cwd(), ".wissen/Projektgedaechtnis"))) {
  console.error("Das private Repo ist nicht geklont. Aus dem Projektordner:\n"
    + "  git clone https://github.com/SV-Adler-Dellbrueck/adler-u9-wissen.git .wissen");
  process.exit(1);
}
fs.mkdirSync(AUS, { recursive: true });

(async () => {
  await exportSkizzen({ aus: AUS, auswahl: [{ muster: MUSTER, slug: SLUG }] });
})();
