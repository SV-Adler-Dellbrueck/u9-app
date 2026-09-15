/* Export der beiden Skizzen fuer die Lehrgangsabgabe 2.2 – SVG mit Legende und PNG
   aus genau dieser SVG. Der Weg ist derselbe wie im Paket Lehrgangsskizzen, deshalb
   wird das Skript von dort benutzt statt kopiert. Aufruf aus dem Projektordner:
     node doku/auftrag-einheit-lf4/export-skizzen.js */
const path=require("path");
require("../auftrag-lehrgangsskizzen/export-skizzen.js")({
  aus:__dirname,
  auswahl:[
    {muster:/^3 gegen 3 auf vier Minitore – Pass zählt doppelt$/,slug:"uebung-1-3-gegen-3-pass-zaehlt-doppelt"},
    {muster:/^Dreieckspassen mit Abschluss$/,slug:"uebung-2-dreieckspassen-mit-abschluss"}
  ]
});
