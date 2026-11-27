/* Export der vier Bilder für die C-Lizenz-Abgabe 4.2 (defensive Spielformen) als SVG und PNG (1120 px breit)
   mit Legende. Der Weg ist derselbe wie im Paket Lehrgangsskizzen, deshalb wird das Skript von dort benutzt.
   Jede Skizze hat ein Bild, der Dateiname trägt deshalb keinen Zusatz.

   Die Bilder gehören ins PRIVATE Repo (`Projektgedaechtnis/skizzen/aufgabe-c-4-2/`), weil die Abgabe
   personenbezogen ist; im öffentlichen Repo bleibt nur die Beschreibung.

   Voraussetzung: das private Repo ist nach `.wissen/` geklont (siehe CLAUDE.md).
   Aufruf aus dem Projektordner:
     node doku/auftrag-lehrgang-c-4-2/export-skizzen.js */
const fs = require("fs"), path = require("path");
const exportSkizzen = require("../auftrag-lehrgangsskizzen/export-skizzen.js");

const AUS = path.join(process.cwd(), ".wissen/Projektgedaechtnis/skizzen/aufgabe-c-4-2");
const AUSWAHL = [
  { muster: /^Lehrgang – Zwei-Seiten-Spiel verteidigen$/, slug: "zwei-seiten-spiel-verteidigen" },
  { muster: /^Lehrgang – Fünf-Sekunden-Jagd$/, slug: "fuenf-sekunden-jagd" },
  { muster: /^Lehrgang – Erster attackiert, Zweiter sichert$/, slug: "erster-attackiert-zweiter-sichert" },
  { muster: /^Lehrgang – Drei Bahnen, klare Zuständigkeit$/, slug: "drei-bahnen-klare-zustaendigkeit" }
];

if (!fs.existsSync(path.dirname(AUS))) {
  console.error("Der Ordner " + path.dirname(AUS) + " fehlt.\n"
    + "Das private Repo ist nicht geklont. Aus dem Projektordner:\n"
    + "  git clone https://github.com/SV-Adler-Dellbrueck/adler-u9-wissen.git .wissen");
  process.exit(1);
}
fs.mkdirSync(AUS, { recursive: true });

(async () => {
  await exportSkizzen({ aus: AUS, auswahl: AUSWAHL });
})();
