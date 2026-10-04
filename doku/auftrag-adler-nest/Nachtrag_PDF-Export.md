# Nachtrag zum Auftragspaket Adler Nest: PDF-Export mit Audio-Link

Gilt zusammen mit `Auftragspaket_Adler-Nest-Ausgaben.md` im selben Ordner (Stand 03.10.2026). Nachtrag vom 04.10.2026, beschlossen von Charles im Projekt-Chat. Wo dieser Nachtrag dem Hauptpaket widerspricht, gilt der Nachtrag.

## Warum

Eltern sollen eine Ausgabe als PDF an andere Familien weitergeben können. Charles hat entschieden, dass dieses PDF alle Fotos enthält und zum persönlichen Teilen unter Eltern gedacht ist. Eine eingebettete Hördatei spielt in PDF-Ansichten auf Handys (iOS, Android, WhatsApp, Browser) nicht; sie funktioniert nur im Adobe Acrobat am Computer. Deshalb trägt das PDF einen antippbaren Link zur Hördatei.

## Beschlossen (Charles, 04.10.2026)

17. Aus jeder veröffentlichten Ausgabe kann ein PDF erzeugt werden, vollständig mit Titelbild, Galeriefotos und Privatfotos. Es ist zum persönlichen Teilen unter Eltern gedacht.
18. Das PDF enthält keine eingebettete Hördatei, sondern einen Link zur Hördatei. Der Link ist ein Teil-Link nur für das Audio: ohne Login abspielbar, 30 Tage gültig, von Trainern vorher zurückziehbar.
19. Der Beschluss 2 des Hauptpakets (Heft nur hinter dem Login) wird für zwei Dinge bewusst gelockert: das PDF verlässt den Login, sobald Eltern es weitergeben, und der Audio-Link ist ohne Login abspielbar. Die App selbst bleibt hinter dem Login. Vorab-Hinweis für Trainer: Für die Bilderstrecke nur Fotos ohne erkennbare Gegnerkinder wählen.

## Was entsteht

### 9. PDF-Export

- Im Editor je veröffentlichter Ausgabe ein großer Knopf „PDF herunterladen“ (mindestens 48 px). Eltern können es in der Leseansicht ebenfalls herunterladen; Trainer legen fest, ob der Knopf für Eltern sichtbar ist (Einstellung je Ausgabe, Standard an).
- Aufbau: eine Datei, vier Seiten im Handyformat (Breite 390 px, Höhe je nach Inhalt): Deckblatt, Spieltag, Porträt, Rubriken. Gleiche Gestaltung wie die Leseansicht (Abschnitt 4 und 6 des Hauptpakets). Leere Felder entfallen, keine Platzhalter im PDF.
- Erzeugung: serverseitig oder im Browser aus der Leseansicht, zum Beispiel per Druck-Stylesheet und Seitenhöhe; Schriften lokal. Kein Dienst Dritter, kein Hochladen des Heftinhalts an externe Server.
- Auf der Deckblattseite steht anstelle des Players der Block „Adler Nest zum Hören“ mit einem antippbaren Link und einem QR-Code (für den Ausdruck) auf die Hörseite. Ohne Hördatei entfällt der Block.
- Dateiname: `Adler-Nest_Ausgabe-NN.pdf`. Metadaten: Titel „Adler Nest – Ausgabe NN“, Autor „SV Adler Dellbrück U9“.
- Das PDF wird bei jedem Abruf frisch erzeugt und nicht dauerhaft gespeichert.

### 10. Teil-Link für die Hördatei

Neue Tabelle `heft_audio_link` (RLS Pflicht): `id`, `ausgabe_id`, `token` (zufällig, mindestens 128 Bit, nicht erratbar), `gueltig_bis` (Standard Erstellung plus 30 Tage), `zurueckgezogen_am`, Zeitstempel. Schreiben und Lesen nur Trainer; öffentlich ist allein die Abfrage über die Funktion unten.

Neue Funktion `heft_audio_abrufen(p_token text)` (Edge Function oder `security definer`, wie in `stadionheft-view`): liefert bei gültigem, nicht abgelaufenem und nicht zurückgezogenem Token genau die Hördatei dieser Ausgabe, sonst eine freundliche Seite „Dieser Link ist abgelaufen. Das Adler Nest gibt es in der Adler-App.“ Es werden keine weiteren Inhalte der Ausgabe geliefert.

Hörseite (`?hoeren=<token>`): schlichte Seite im Heftdesign mit Maskottchen, Ausgabenummer, großem Abspielknopf (mindestens 56 px), ohne Login und ohne Namen außer dem, was im Audio selbst gesprochen wird. `preload="none"`. Kein Tracking, keine Cookies, keine externen Schriften oder Skripte.

Editor: pro Ausgabe Anzeige des Links mit Ablaufdatum, Knopf „Link erneuern (30 Tage)“ und Knopf „Link zurückziehen“. Beim Erzeugen des PDFs wird der Link der Ausgabe verwendet; ist keiner vorhanden oder er ist abgelaufen, wird ein neuer erzeugt. Mehr als ein aktiver Link je Ausgabe ist nicht nötig.

## Vorab prüfen (zusätzlich zu den sieben im Hauptpaket)

8. Gibt es in der App schon eine Funktion, die Seiten zu PDF druckt (z. B. Spielerkarte, Elternbrief)? Wenn ja, deren Weg wiederverwenden. Wenn nicht, den einfachsten Weg ohne neuen Drittdienst vorschlagen und Charles den Aufwand nennen, bevor gebaut wird.
9. Wie wird der Speicherzugriff für die Hördatei bei einem Teil-Link ohne Login technisch gelöst (kurzlebige signierte Adresse durch die Funktion)? Sicherstellen, dass das Zurückziehen des Links auch bereits ausgegebene Adressen zeitnah ungültig macht (Laufzeit der signierten Adresse höchstens 10 Minuten).

## Abnahmekriterien (zusätzlich)

15. PDF aus einer veröffentlichten Ausgabe: vier Seiten, Gestaltung wie die Leseansicht, Schriften eingebettet, kein Platzhaltertext.
16. Aus einem Entwurf lässt sich nur durch Trainer ein PDF erzeugen, mit sichtbarem Vermerk „Entwurf“.
17. Link im PDF ist auf dem Handy antippbar; QR-Code führt auf dieselbe Hörseite.
18. `heft_audio_abrufen`: gültiger Token spielt die Hördatei ab; abgelaufener, zurückgezogener oder erfundener Token zeigt die Hinweisseite und liefert keine Datei.
19. Ein Token einer Ausgabe liefert nie Dateien einer anderen Ausgabe.
20. Nach „Link zurückziehen“ ist die Hördatei spätestens nach 10 Minuten nicht mehr abrufbar.
21. Die Hörseite lädt keine Dateien von fremden Servern.
22. Trainer sehen im Editor Link, Ablaufdatum und können erneuern und zurückziehen.

## Testfälle (zusätzlich)

- PDF einer Ausgabe ohne Hördatei: kein Hörblock, keine leere Zeile.
- Token nach 30 Tagen: Hinweisseite.
- Token zurückgezogen, danach Abruf: Hinweisseite.
- Zehn zufällige Tokens: kein Treffer.
- PDF-Export im Entwurf als Elternkonto: nicht möglich.
- Netzwerkprotokoll der Hörseite: nur eigene Adressen.

## Datenschutz

Das PDF enthält Vornamen und Fotos von Kindern und verlässt damit den Login. Das ist von Charles ausdrücklich so gewollt und bleibt auf Familien beschränkt, die das PDF von Eltern erhalten. Im Editor steht beim PDF-Knopf der Hinweis: „Dieses PDF enthält Fotos und Vornamen. Bitte nur an Familien weitergeben.“ Im Repo weiterhin keine Klarnamen von Kindern, auch nicht in Prüffällen.

## Übergabe zurück

Im PR zusätzlich: Ergebnis der Vorab-Prüfungen 8 und 9 und `stand.md` und `entscheidungen.md` in `adler-u9-wissen` um die Beschlüsse 17 bis 19 ergänzen (Quelle: `Projektgedaechtnis/uebergabe-2026-10-04-adler-nest-pdf.md`).
