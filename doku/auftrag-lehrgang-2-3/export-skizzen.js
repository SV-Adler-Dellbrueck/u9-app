/* Export der Skizzenbilder für die Lehrgangsaufgabe 2.3 – „Joker-Duell“ und „Schau-Tore“: je drei Einzelbilder (PNG und SVG mit Legende)
   und die Animation als GIF. Derselbe Weg wie bei Lehrgang 4.0: das Skript aus doku/auftrag-lehrgangsskizzen wird benutzt, nicht kopiert.

   Die Bilder gehören ins PRIVATE Repo (`Projektgedaechtnis/skizzen/aufgabe-2-3/`), weil die Abgabe personenbezogen ist; im öffentlichen
   Repo bleibt nur die Beschreibung. Voraussetzung: das private Repo ist nach `.wissen/` geklont (siehe CLAUDE.md) – oder der Ordner steht in
   der Umgebungsvariablen WISSEN.
   Aufruf aus dem Projektordner:
     node doku/auftrag-lehrgang-2-3/export-skizzen.js */
const fs = require("fs"), path = require("path");
const exportSkizzen = require("../auftrag-lehrgangsskizzen/export-skizzen.js");

const WURZEL = process.env.WISSEN || path.join(process.cwd(), ".wissen");
const AUS = path.join(WURZEL, "Projektgedaechtnis/skizzen/aufgabe-2-3");
const UEBUNGEN = [
  { muster: /^Joker-Duell – anbieten und freilaufen$/, slug: "joker-duell" },
  { muster: /^Schau-Tore – vor dem Ball schauen, dann ins gezeigte Tor$/, slug: "schau-tore" }
];

if (!fs.existsSync(path.join(WURZEL, "Projektgedaechtnis"))) {
  console.error("Der Ordner " + path.join(WURZEL, "Projektgedaechtnis") + " fehlt.\n"
    + "Das private Repo ist nicht geklont. Aus dem Projektordner:\n"
    + "  git clone https://github.com/SV-Adler-Dellbrueck/adler-u9-wissen.git .wissen");
  process.exit(1);
}
fs.mkdirSync(AUS, { recursive: true });

(async () => {
  await exportSkizzen({ aus: AUS, bildEins: true, auswahl: UEBUNGEN });
  for (const u of UEBUNGEN)
    await exportSkizzen.exportAnimation({ aus: AUS, muster: u.muster, slug: u.slug, breite: 560, standMs: 2500, gleitFaktor: 1.8, schlussMs: 3500 });
})();
