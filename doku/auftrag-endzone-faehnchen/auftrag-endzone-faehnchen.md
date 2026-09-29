# Auftrag: Übung „Endzone und Fähnchen" und Vorlage L5-7 aufnehmen

Nimm die Übung aus `nachtrag-uebung-endzone-faehnchen.json` in `uebungen/bibliothek.json` auf und die Vorlage aus `nachtrag-vorlage-l5-7.json` in `uebungen/vorlagen.json`. Zieh alles nach, was dazugehört.

## Vorher prüfen und mir melden

- Übung mit `_euPruefung`, Skizze mit `_eiSkizzeFehler`. Was beanstandet wird, sag mir, bevor du etwas schreibst.
- Ob der Name „Endzone und Fähnchen" in der Bibliothek schon vorkommt.
- Ob jedes `uebung_name` in der Vorlage auf eine Übung in der Bibliothek zeigt (`Warm up Adler` und `Endzone und Fähnchen`).

## Was die Skizze zeigt und warum

Querformat. Feld 28 × 24 m als Zone `[40,18,200,144]`, davon zwei Endzonen von je 4 m als Zonen `[40,18,28,144]` und `[212,18,28,144]`. Vier gelbe Hütchen an den Feldecken, vier rote an den Endzonengrenzen (Aufbau, nur im Grundbild).

Vier grüne Kinder (A bis D) gegen vier rote, jeweils dieselben acht Spieler in allen drei Bildern:

1. A spielt auf den freien B, C läuft Richtung Endzone (Laufweg gelb).
2. B spielt in den Lauf von C.
3. C führt den Ball in die Endzone und stoppt ihn: Punkt. Kein Verteidiger steht in der Endzone.

Die Bändchen der Stufe 2 und das breitere Feld der Stufe 3 sind mit den Elementen der App nicht zeichenbar und stehen nur im Text.

Der engste Spielerabstand beträgt 27,5, 26,7 und 25,1 (Mindestwert 24). Erwartete Materialliste: 8 Hütchen, 1 Ball.

## Offen, entscheide du oder frag mich

- `kat`: gewählt ist `wahrnehmung` (Freilaufen und Umschauen). Alternative `passspiel`. Sag mir, wenn dir am Bestand etwas auffällt.
- `ordnung` der Vorlage ist Freitext, „Endzone (4 gegen 4)" ist nur ein Vorschlag.
- Wortlaut der Leitfrage 5 (entschieden 30.09.2026): Es gilt der neue Wortlaut („Wo stehe ich, wenn wir den Ball haben – und wo, wenn nicht?", Beschluss 13.09.2026). Die Vorlagen L5-1 bis L5-6 tragen in `vorlagen.json` noch den alten. Gleich sie in einem eigenen Commit an, und zwar nur das Feld `leitfrage`, sonst nichts. Prüfe vorher in `entscheidungen.md`, dass der Beschluss vom 13.09. nichts anderes vorsieht, und melde eine Abweichung, statt zu ändern.
- Wie Nachtragsdateien in `uebungen/` benannt und zusammengeführt werden: Nimm die bestehende Praxis, ein Name, den es schon gibt, wird übersprungen und nicht überschrieben.

## Nicht Teil dieses Auftrags

Datum und Trainer der Einheit sind bewusst offen. Sie gehören in die Trainingsplanung, nicht in die Vorlage.

## Abnahme

- Kein Kindername, kein Klarname im Repo.
- Neuer Prüffall in `tests/checks/`, benannt nach der Version, aus der er stammt. Er prüft: Skizze ohne Beanstandung, drei Bilder, gleiche Spieler in jedem Bild, Materialliste „8 Hütchen".
- `node tests/run.js` grün, dann `sw.js` hochzählen, Funktionsübersicht und Hilfe nachziehen.
- PR als Entwurf, zusammengeführt wird auf mein Wort.
- Am Ende vermerken, dass die Drive-Fassung im Projektgedächtnis noch nachzuziehen ist.
