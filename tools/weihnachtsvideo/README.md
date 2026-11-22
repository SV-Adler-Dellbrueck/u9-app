# Weihnachtsvideo U9 I

Rendert den Hinrunden-Rückblick für die Weihnachtsfeier (07.12.2026) aus einer HTML-Vorlage: Anflug, eine Karte je Kind,
Pause, Ausblick und Dank. Auftrag: `doku/auftrag-weihnachtsvideo/auftrag.md`, Rahmentexte: `doku/auftrag-weihnachtsvideo/rahmen.md`.

**Datenschutz:** Namen, Fotos, Aufnahmen und fertige Videos liegen nur im Ordner `weihnachtsvideo/` im Wurzelverzeichnis.
Dieser Ordner steht in der `.gitignore` und kommt nie ins öffentliche Repo. Meldungen des Skripts nennen nur Kürzel (A–O).

## Was gebraucht wird

Ffmpeg und Playwright mit Chromium. In der Cloud-Sitzung von Claude Code ist beides vorhanden.

```
weihnachtsvideo/
  kinder.json            Vorlage: tools/weihnachtsvideo/beispiel/kinder.beispiel.json
  fotos/                 die Fotos, Dateinamen wie in kinder.json („foto“)
  audio/                 audio_intro.mp3, audio_A.mp3 … audio_O.mp3, audio_ausblick.mp3, audio_dank.mp3
```

Je Kind in `kinder.json`: `kuerzel` (A–O), `anzeige_name` (Vorname wie im Video), `rolle`, `formation`, `foto`,
`text` (60–75 Wörter, genau der eingesprochene Text), `reihenfolge`, `einverstanden`. Ohne `"einverstanden": true` wird ein
Kind nicht gerendert, auch nicht anonym.

## Schritt für Schritt

1. `node tools/weihnachtsvideo/render.mjs --pruefen` – prüft Eingabe und Aufnahmen, rendert nichts. Meldet Texte außerhalb
   von 60–75 Wörtern, fehlende Fotos und fehlende Aufnahmen.
2. `node tools/weihnachtsvideo/render.mjs` – rendert alles. Etwa doppelt so lange wie das Video selbst (für 15 Kinder rund
   20 Minuten).
3. Ergebnis in `weihnachtsvideo/ausgabe/`: `teil1.mp4`, `teil2.mp4`, `gesamt.mp4` und `bericht.txt` mit allen Hinweisen
   (zum Beispiel eine Karte außerhalb von 25–30 Sekunden).
4. Eine Karte neu: `--nur C`. Ein Teil neu: `--teil 2`. Die anderen Szenen bleiben, wie sie sind; Teile und Gesamtvideo
   werden danach neu zusammengesetzt.
5. Die fertigen Dateien legt Charles selbst in Google Drive ab (SV Adler Dellbrück / U9 I).

Probelauf ohne echte Daten: `node tools/weihnachtsvideo/render.mjs --probe` (Kind A–C, Testton statt Stimme,
Ausgabe in `weihnachtsvideo/probe-ausgabe/`).

## Aufbau

- **Szenen:** Anflug (Adler „fliegt“), Kinderkarten Teil 1, Pause (10 s), Kinderkarten Teil 2, Ausblick (Adler „staunt“),
  Dank (Adler „jubelt-ball“). Teil 1 endet mit der Pause, Teil 2 beginnt mit der ersten Karte der zweiten Hälfte.
- **Kinderkarte:** Foto, Name, Rolle, Formation; der Adler „präsentiert“ unten rechts und wippt mit der Lautstärke der Stimme.
  Ohne Foto zeigt die Karte den winkenden Adler. Dauer = Aufnahme + 1,5 s davor und danach.
- **Optik:** Vereinsblau wie im Adler Nest, Goldakzent `#D4A64A`, Lichterkette oben, höchstens 40 Schneeflocken.
  Schrift mindestens 44 px. Das Vereinswappen (`logo.png`) bleibt unverändert.
- **Technik:** Jedes Bild wird mit Playwright aufgenommen (25 Bilder je Sekunde, alles zeitgesteuert, also bei jedem Lauf
  gleich). Ffmpeg kodiert H.264 (`veryfast`) und gleicht die Lautheit an (−16 LUFS).
- **Nicht automatisch geprüft:** ob Text und Aufnahme Wort für Wort übereinstimmen. Das gehört zum Probelauf am Beamer.
