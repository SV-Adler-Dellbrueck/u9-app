# Auftrag: 🌈 Buntes Feld beim Festival (v982)

**Stand:** 27.11.2026 · **Freigabe:** Bilder „Buntes Feld“ und „Feldplan“, Charles 27.11.2026.

## Anlass

Bei sieben Mannschaften hat in jeder Runde ein Team Pause; dazu stehen Auswechselspieler anderer Teams am Rand. Bei Kälte sollen sie
nicht herumstehen.

## Beschluss

- Name: **🌈 Buntes Feld**. Immer ein FUNiño-Feld, im Feldplan **oben links** auf dem freien Platz.
- Offen für alle in der Pause: kicken, warm bleiben, spontan ein Spiel – Kinder aller Vereine gemischt, ohne Ergebnis.
- Ist oben links kein Platz frei (zwei Felder oder ein Jugendtor-Feld oben): **kein Buntes Feld**.
- Der Spielplan ändert sich nicht.

## Umsetzung

- Festival-Fenster: Schalter „Ja, wir bauen eins auf“/„Nein“ (`config.bunt`), ohne Platz gesperrt mit Grund (`md-festival-planer.js`).
- Turnierseite: Karte „🌈 Buntes Feld · oben links“, je Runde „Pause: … → 🌈 Buntes Feld“, Feld im Feldplan (`md-turnierplan.js`,
  `fstBunt`). Größenbudget der Turnierseite danach: rund 0,2 KB frei.
- Festival-Planer: Hinweis in der Pausenspalte, Material 4 Minitore, 6 Hütchen.
- Prüffall `tests/checks/v982-buntes-feld.js`.
