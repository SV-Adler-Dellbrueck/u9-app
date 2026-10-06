# Auftragspaket: Adler Nest als PDF im A4-Format

Repo `SV-Adler-Dellbrueck/u9-app`, Stand 05.10.2026. Gilt als Änderung zu `doku/auftrag-adler-nest/Nachtrag_PDF-Export.md` (Abschnitt 9, Aufbau und Format). Alles andere aus dem Nachtrag bleibt: Hinweistext, Hör-Link mit QR-Code, Eltern-Freigabe je Ausgabe, kein Dienst Dritter.

Zusammengeführt wird auf Wort von Charles. Entwurfs-PR, kein Merge.

## Warum

Das PDF aus v756/v762 ist ein schmaler Streifen (390 px Breite). `@page{size:390px …}` wird vom Druckdialog auf Desktop-Browsern nicht übernommen. Das Heft landet deshalb als schmale Spalte mitten auf einer breiten Seite mit viel Weißraum (Probe: `Adler-Nest_Ausgabe-01_1_.pdf`). Das war die Vorgabe des Nachtrags („Handyformat“) und ist ein Fehler der Vorgabe, nicht der Umsetzung. Ein PDF zum Weitergeben muss in jedem Betrachter und im Ausdruck gut aussehen.

## Beschlossen (Charles, 05.10.2026)

20. Das PDF ist DIN A4 im Hochformat und füllt die Seite. Es muss am Handy (Breite angepasst), am Computer und im Ausdruck lesbar sein.

## Was entsteht

### Format

- `@page{size:A4 portrait;margin:0}`, Inhalt in einer festen Satzspalte für den Druck: Seitenränder 14 mm links und rechts, 12 mm oben und unten. Das Deckblatt läuft randlos (Titelbild und Kopfleiste bis an den Rand).
- Das Heft wird im Druck nicht mehr mit `width:390px` ausgegeben. Eigenes Druck-Stylesheet, das die Leseansicht auf die A4-Satzspalte überführt: Schrift Text 10,5 pt, Überschriften entsprechend, Zeilenabstand 1,45.
- Kein `size:390px …`, keine Seitenhöhe aus dem Inhalt. Feste Seitengröße, die Inhalte laufen über Seitenumbrüche.

### Seitenaufbau

1. **Seite 1, Deckblatt:** füllt die ganze Seite. Titelbild oben (etwa 60 % der Höhe), darunter Titelblock, Spieltagsband, Schlagzeile, Datum, Hör-Block mit Link und QR-Code (mindestens 28 mm), drei Zeilen „Im Heft“. Kein leerer dunkler Rest: Der untere Block ist so hoch, wie die Seite es hergibt, mit Inhalt oben bündig und Hintergrund bis zum Rand.
2. **Seite 2 und folgende, Spieltag:** Anpfiff, Spieltagskarte, Bericht mit Zitatkasten, Teams als drei Spalten nebeneinander statt untereinander, Bilderstrecke in drei Spalten (bei 4 Fotos 2 × 2 groß, bei 5 bis 6 Fotos 3 × 2), Eltern-Dank, Sonderzeile.
3. **Porträt:** beginnt auf neuer Seite. Kopf Vereinsblau mit großer Nummer; Steckbrief als Vierer-Raster; Kabinen-Reporter zweispaltig; Privatfotos nebeneinander; Abseits vom Platz; Trainerstimme; Saisonziel.
4. **Rubriken:** Training, An diesem Tag, Wort vom Trainerteam, nächster Spieltag, „Auf geht's, Adler!“. Beginnt auf neuer Seite, wenn das Porträt nicht mehr als eine halbe Seite frei lässt.

### Seitenumbrüche

- Karten, Foto-Reihen, Zitatkästen und Überschriften mit ihrem ersten Absatz nicht trennen (`break-inside:avoid`, `break-after:avoid` bei Überschriften).
- Keine halb leeren Seiten außer der letzten. Keine einzelne Überschrift am Seitenende.
- Fußzeile auf Seiten ab 2 in 8 pt: „Adler Nest · Ausgabe NN · Seite X von Y“; nicht auf dem Deckblatt.

### Fehler aus der Probe, mit beheben

- Spieltagsband auf dem Deckblatt zeigt „KINDERFESTIVAL · KINDERFESTIVAL · FC CHORWEILER U9 · AUSWÄRTS“. Das Format steht doppelt, weil der Gegnername das Format schon enthält. Format nur einmal nennen; wenn der Gegnername mit dem Format beginnt, nicht wiederholen.
- Die Sonderzeile „Gute Besserung, …“ fehlt im Bild am Ende der Spieltagsseite (nur im Textlayer vorhanden). Das A4-Layout muss sie sichtbar zeigen.
- Das Deckblatt war unten zu groß und leer (Seitenhöhe richtete sich nach der längsten Seite).

### Technik

- Weiterhin `window.print()` und „Als PDF sichern“, kein Dienst Dritter. Dateiname unverändert (`Adler-Nest_Ausgabe-NN`).
- Prüfen, ob Safari auf iPhone und iPad den A4-Druck sauber ausgibt und ob Chrome auf Android den Dialog „Als PDF speichern“ zeigt. Wenn ein Betrachter die Seitengröße ignoriert, melden und Charles die Alternative nennen, bevor etwas gebaut wird.
- Schriften weiter lokal, Bilder vor dem Druck abwarten (wie bisher).
- Die Leseansicht in der App bleibt unverändert (Breite 390 px). Nur die Druckausgabe ändert sich.

## Nicht Teil dieses Auftrags

- Keine Änderung am Hör-Link, am QR-Code, an den Rechten oder an der Eltern-Freigabe.
- Kein serverseitiger PDF-Dienst.

## Abnahmekriterien

1. Das PDF aus Ausgabe 1 hat A4-Seiten, der Inhalt füllt die Breite, keine schmale Spalte mit Weißraum, in Chrome (Desktop), Safari (iPhone) und im Vorschaubild des Betriebssystems.
2. Deckblatt füllt Seite 1 ohne leere Fläche; Titelbild, Titel, Hör-Block mit QR-Code und drei Zeilen „Im Heft“ sind sichtbar.
3. Teams stehen nebeneinander; Bilderstrecke in der vorgesehenen Anordnung; keine Karte, kein Foto, kein Zitat wird durch einen Seitenumbruch zerschnitten.
4. Die Sonderzeile ist sichtbar, das Spieltagsband nennt das Format nur einmal.
5. Fußzeile ab Seite 2 mit Seitenzahl, nicht auf dem Deckblatt.
6. Der QR-Code ist im Druck größer als 28 mm und scannt zur Hörseite.
7. Das PDF hat höchstens 5 Seiten bei Ausgabe 1 und bleibt unter 5 MB.
8. `node tests/run.js` grün, Prüffälle für Seitenformat (`@page size A4`), Fußzeile, Format-Doppelung und Sonderzeile. Hilfe im Editor und Funktionsübersicht nachziehen.

## Datenschutz

Unverändert: Der Hinweis „Dieses PDF enthält Fotos und Vornamen. Bitte nur an Familien weitergeben.“ bleibt. Keine Klarnamen von Kindern im Repo, auch nicht in Prüffällen.

## Übergabe zurück

Im PR: Ergebnis der Plattformprüfung (Safari, Chrome, Android), die geprüfte Probe als Bild des fertigen PDFs und dass `entscheidungen.md` in `adler-u9-wissen` um Beschluss 20 zu ergänzen ist.
