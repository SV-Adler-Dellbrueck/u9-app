# Auftrag: Hinrunden-Rückblick als Video für die Weihnachtsfeier U9 I

## Ziel
Ein Video (MP4, 16:9, 1920x1080) für die Weihnachtsfeier am 07.12.2026 im Vereinsheim (Beamer oder TV). Der Comic-Adler mit Weihnachtsmütze führt durch Rückblick, eine Karte je Kind, Ausblick und Dank an die Eltern. Das Video ist für die Feier gedacht, nicht für die Öffentlichkeit.

## Voraussetzungen
- Der Auftrag `doku/auftrag-maskottchen/` ist erledigt, der Ordner `Maskottchen/` liegt im Repo. Verwendet werden ausschließlich diese Bilder: `adler_winkt_`, `adler_praesentiert_`, `adler_fliegt_`, `adler_jubelt-ball_` und `adler_staunt_weihnachtsmuetze`, jeweils `_gross.png` oder `_mittel.png`. Keine eigenen Adler-Bilder erzeugen. `Maskottchen/README.md` zuerst lesen.
- Texte für Anflug, Ausblick und Dank stehen in `doku/auftrag-weihnachtsvideo/rahmen.md` (Entwurf, Charles gibt frei).
- Die Audiodateien entstehen nicht hier, sondern im Projekt-Chat oder in ElevenLabs (Stimme „Lennart“, langsames Tempo wie im Adler Nest). Sie kommen von Charles als `audio_intro.mp3`, `audio_<kuerzel>.mp3`, `audio_ausblick.mp3` und `audio_dank.mp3` in einen lokalen Ordner.

## Vorab prüfen (bevor du baust)
1. Sind Playwright und ffmpeg verfügbar? Wenn nicht, installieren oder melden.
2. Wo liegen die Fotos der Eltern-Galerie, und wie sind sie geschützt? Zugriff nur über den bestehenden Anmeldeweg. Wenn die Fotos nicht ohne Anmeldung erreichbar sind, nicht umgehen, sondern Charles bitten, sie lokal in einen Ordner zu legen.
3. Gibt es Rolle (Aufpasser, Flitzer, Jäger) und Formation je Kind in den App-Daten? Wenn nicht, kommen sie aus der Eingabedatei.
Fehlt etwas, nachfragen statt annehmen.

## Eingabe
Lokale Datei `weihnachtsvideo/kinder.json` (nicht committen) mit je Kind: `kuerzel` (A bis O), `anzeige_name` (Vorname, wie er im Video erscheint), `rolle`, `formation`, `foto` (Dateiname), `text` (60 bis 75 Wörter), `reihenfolge`, `einverstanden` (true/false). Kinder ohne `einverstanden: true` werden nicht gerendert, auch nicht anonym.

## Verhalten
- Szenen: Intro mit Adler `fliegt`, je Kind eine Karte, Pause-Folie, Ausblick, Dank mit Adler `jubelt-ball`. Die Texte der Rahmenszenen stehen in `rahmen.md`.
- Kinderkarte: Foto, Name, Rolle, Formation. Der Adler `praesentiert` unten rechts, wippt leicht im Takt der Stimme (Amplitude aus der Audiodatei). Dauer = Audiolänge + 1,5 s vorher und nachher. Pro Kind dasselbe Layout.
- Das Video wird in zwei Teile geteilt (Schnitt nach Datei) plus ein Gesamtvideo.
- Fehlt ein Foto, zeigt die Karte stattdessen den Adler `winkt`, nichts bricht ab.
- Render mit Playwright und ffmpeg, H.264, `-preset veryfast`. Audio auf einheitliche Lautheit normalisieren.
- Neurendern einzeln: `--nur A` für ein Kind, `--teil 2` für einen Teil.

## Optik
- Vereinsblau als Leitfarbe wie im Adler Nest, kleine weihnachtliche Nuancen: warmer Goldakzent `#D4A64A`, dezenter Schneefall (CSS-Partikel, höchstens 40 Flocken), Lichterkette als oberer Rahmen. Kein Rot-Grün-Kitsch.
- Das Vereinswappen bleibt unverändert, keine Mütze oder Deko darauf.
- Schrift mindestens 44 px bei 1080p, lesbar aus 8 m Entfernung.
- Der interne Codename „Bruce“ taucht nirgends auf. Die App heißt Adler.

## Datenschutz und Ablage
- Fotos, Audio, `kinder.json` und fertige Videos nie ins öffentliche Repo. Ausgabeordner lokal anlegen und per `.gitignore` ausschließen.
- In Logs, Commit-Texten und Kommentaren nur Kürzel, keine Kindernamen.
- Ins Repo kommen nur Vorlage und Skripte, ohne Namen und Fotos.
- Die fertigen Dateien legt Charles selbst in Google Drive ab (Ordner SV Adler Dellbrück / U9 I).

## Abnahmekriterien
1. Jedes Kind mit `einverstanden: true` hat genau eine Karte in der Reihenfolge der Datei.
2. Text und Audio einer Karte stimmen Wort für Wort überein.
3. Eine Karte ohne Foto bricht nicht ab.
4. Neurendern eines Kindes ändert die anderen Dateien nicht.
5. Jede Kinderkarte dauert 25 bis 30 Sekunden, Abweichungen werden gemeldet.
6. Nach dem Lauf enthält das Repo keine Namen, Fotos oder Audiodateien.

## Testfälle
- Kind ohne Einverständnis wird ausgelassen.
- Fehlendes Foto.
- Text über 75 Wörtern wird gemeldet.
- Neurender von Kind C ändert nur dessen Audio und Szene.
- Wiedergabe der MP4 auf einem Fernseher per USB-Stick.

## Arbeitsweise
Zuerst Plan in fünf Sätzen, dann bauen. Am Ende kurz auflisten, was geändert wurde, und vermerken, dass das Projektgedächtnis noch nachzuziehen ist.

## Zeitplan
Donnerstag 26.11. Einsprache durch Charles. Freitag 27.11. Vorlage steht. Mittwoch 02.12. Texte freigegeben. Donnerstag 03.12. Audio und Render. Freitag 04.12. Probelauf am Beamer im Vereinsheim. 05. und 06.12. Puffer.
