/* Export des Bildes für die Lehrgangsabgabe 5.2 – „Korb-Chaos-Funino (360°-Variante)“ als SVG
   und PNG (1120 px breit) mit Legende. Der Weg ist derselbe wie im Paket Lehrgangsskizzen,
   deshalb wird das Skript von dort benutzt statt kopiert.

   v700: Die Skizze trägt `wurf:true`. Die Legende heißt deshalb „Zuwurf“ und „Torwurf“ – aus
   der App (skzPfeilName), nicht mehr über eine im Exportlauf überschriebene Konstante.

   Die Bilder gehören ins PRIVATE Repo (`Projektgedaechtnis/skizzen/aufgabe-5-2/`), weil die
   Abgabe personenbezogen ist; im öffentlichen Repo bleibt nur die Beschreibung.

   Voraussetzung: das private Repo ist nach `.wissen/` geklont (siehe CLAUDE.md).
   Aufruf aus dem Projektordner:
     node doku/auftrag-lehrgang-5-2/export-skizzen.js */
const fs = require("fs"), path = require("path");
const exportSkizzen = require("../auftrag-lehrgangsskizzen/export-skizzen.js");

const AUS = path.join(process.cwd(), ".wissen/Projektgedaechtnis/skizzen/aufgabe-5-2");
const MUSTER = /^Korb-Chaos-Funino \(360°-Variante\)$/;
const SLUG = "korb-chaos-funino";

if (!fs.existsSync(path.dirname(AUS))) {
  console.error("Der Ordner " + path.dirname(AUS) + " fehlt.\n"
    + "Das private Repo ist nicht geklont. Aus dem Projektordner:\n"
    + "  git clone https://github.com/SV-Adler-Dellbrueck/adler-u9-wissen.git .wissen");
  process.exit(1);
}
fs.mkdirSync(AUS, { recursive: true });

(async () => {
  await exportSkizzen({ aus: AUS, auswahl: [{ muster: MUSTER, slug: SLUG }] });
})();
