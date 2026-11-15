/* Bild zur Übung „Technik-Parcours – acht Stationen, freie Wahl, Laufzettel“: SVG und PNG mit Legende,
   über den Bildexport aus doku/auftrag-lehrgangsskizzen/ (benutzt, nicht kopiert). Ein Bild, kein GIF –
   die Skizze hat keine Schritte. Ablage hier im Paketordner (keine personenbezogenen Daten im Bild).
   Aufruf aus dem Projektordner:
     node doku/auftrag-uebung-technik-parcours/export-skizzen.js */
const exportSkizzen = require("../auftrag-lehrgangsskizzen/export-skizzen.js");
(async () => {
  await exportSkizzen({ aus: __dirname, auswahl: [{ muster: /^Technik-Parcours – acht Stationen, freie Wahl, Laufzettel$/, slug: "technik-parcours" }] });
})();
