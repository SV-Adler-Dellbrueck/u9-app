/* Export der Bilder für die Lehrgangsabgabe 3.1 – sieben Bilder mit Legende und die
   durchlaufende Animation. Der Weg ist derselbe wie im Paket Lehrgangsskizzen, deshalb
   wird das Skript von dort benutzt statt kopiert.

   Die Bilder gehören ins PRIVATE Repo (`Projektgedaechtnis/skizzen/aufgabe-3-1/`), weil
   die Abgabe personenbezogen ist; im öffentlichen Repo bleibt nur die Beschreibung, aus
   der sie jederzeit neu entstehen. Genau dafür gibt es dieses Skript: Bis v598 wurde der
   Aufruf von Hand zusammengesetzt, und als der Ball von Weiß auf Schwarz wechselte, fiel
   erst beim Nachsehen auf, dass die abgelegten Bilder noch den alten trugen.

   Voraussetzung: das private Repo ist nach `.wissen/` geklont (siehe CLAUDE.md).
   Aufruf aus dem Projektordner:
     node doku/auftrag-lehrgang-3-1/export-skizzen.js */
const fs = require("fs"), path = require("path");
const exportSkizzen = require("../auftrag-lehrgangsskizzen/export-skizzen.js");

const AUS = path.join(process.cwd(), ".wissen/Projektgedaechtnis/skizzen/aufgabe-3-1");
const MUSTER = /^Raute mit Torwart – Angriff über den anderen Flügel$/;
const SLUG = "raute-torwart-andere-fluegel";

if (!fs.existsSync(AUS)) {
  console.error("Der Ordner " + AUS + " fehlt.\n"
    + "Das private Repo ist nicht geklont. Aus dem Projektordner:\n"
    + "  git clone https://github.com/SV-Adler-Dellbrueck/adler-u9-wissen.git .wissen");
  process.exit(1);
}

(async () => {
  await exportSkizzen({ aus: AUS, bildEins: true, auswahl: [{ muster: MUSTER, slug: SLUG }] });
  await exportSkizzen.exportAnimation({ aus: AUS, muster: MUSTER, slug: SLUG });
})();
