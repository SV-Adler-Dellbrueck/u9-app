# Auftrag: Maskottchen-Ordner anlegen

## Ziel
Der Comic-Adler (Beschluss 21.11.2026) liegt dauerhaft im Repo unter `Maskottchen/`, damit jede Claude-Code-Sitzung ihn findet. Er dient App, Adler Nest, Festen und allen weiteren Projekten.

## Ausgangslage
Auf diesem Branch liegen bereits `Maskottchen/README.md` (Regeln, Charakterbeschreibung, Freigabe-Checkliste) und `Maskottchen/werkzeuge/freistellen.py`. Die Bilder fehlen noch: Der GitHub-Konnektor kann keine Binärdateien schreiben. Sie liegen in der Datei `Maskottchen_Adler_2026-11-22.zip`, die Charles an die Sitzung anhängt.

## Aufgaben
1. ZIP entpacken. Es enthält den Ordner `Maskottchen/` mit `master/`, `varianten/`, `quellen/` und `werkzeuge/`.
2. Den Inhalt von `master/`, `varianten/` und `quellen/` nach `Maskottchen/` auf diesem Branch kopieren. `README.md` und `werkzeuge/freistellen.py` bleiben, wie sie im Branch stehen.
3. Prüfen: 6 Bilder mit je `_gross.png`, `_mittel.png`, `_mittel.webp`, `_klein.png`, `_klein.webp` und 6 Quelldateien in `quellen/`. Alle PNG haben einen Alphakanal.
4. In `CLAUDE.md` unter „Aufbau der Dateien“ eine Zeile ergänzen: `Maskottchen/  Der Comic-Adler (Master, Varianten, Regeln) – vor jeder Verwendung README.md lesen`.
5. `node tests/run.js` laufen lassen. Erst wenn er grün ist, committen und Pull Request öffnen.

## Nicht tun
- Die Bilder nicht in `PRECACHE`, `FEST_CACHE` oder einen Loader eintragen: Die App lädt sie noch nicht. Dann ist auch kein `sw.js`-Bump nötig. Wer sie später einbaut, folgt den Pflichten in `CLAUDE.md`.
- Keine Kindernamen, Fotos oder Personendaten in den Ordner legen. Das Repo ist öffentlich.
- Das Bild `master/` nicht verändern und keine Variante aus einer anderen Variante ableiten.

## Abnahmekriterien
1. `Maskottchen/README.md` liegt im Repo und verweist nur auf vorhandene Dateien.
2. Alle 6 Posen sind in den vier Größen vorhanden und öffnen sich mit transparentem Hintergrund.
3. `CLAUDE.md` nennt den Ordner.
4. `node tests/run.js` ist grün, `sw.js` ist unverändert.

## Am Ende
Vermerken, dass das Projektgedächtnis (Drive und `adler-u9-wissen`) noch nachzuziehen ist.
