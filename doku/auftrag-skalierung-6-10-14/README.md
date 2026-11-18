# Auftragspaket: Skalierungszeilen für 6, 10 und 14 Kinder

**Status:** Eingebaut in v870 (Charles 18.11.): Zehn Kinder im 3 gegen 3 auf zwei Feldern (Frage 1, wie v864), Sechser-Felder rund 15 % kleiner außer L1-3, L5-2 ohne Sechser-Zeile (Fragen 2 und 3). Die Tabellen unten sind der ursprüngliche Entwurf; was gilt, steht in `uebungen/vorlagen.json`.
Auftrag Charles, 17.11.2026 (Bestandsaufnahme November 2026, Punkt 5.7).

## Worum es geht

20 Vorlagen tragen nur Zeilen für 8, 12 und 16 Kinder. Der Kader hat höchstens 14 Kinder, und an
einem normalen Trainingstag sind es oft 10. Die App nimmt dann die nächstkleinere Zeile und hängt
einen Standardsatz an („+2 Kinder mehr: als Joker oder in die kleinste Gruppe“, `blockRestText` in
`md-block.js`). Für ein 1 gegen 1 oder ein 4 gegen 2 hilft dieser Satz nicht. Bei sechs Kindern
heißt es nur „Gruppen um je ein Kind verkleinern“.

Dieses Paket schlägt je Vorlage drei zusätzliche Zeilen vor. Die Zeile für 16 Kinder kann bleiben;
sie stört nicht.

## Regeln, nach denen die Entwürfe gebaut sind

1. **Die Rechnung geht auf.** Kinder je Feld mal Felder, plus genannte Wechsler, ergibt die Zahl der Zeile.
2. **Keine neuen Feldmaße.** Jedes Maß steht schon in einer Zeile derselben Vorlage. Wo ein Feld
   für weniger Kinder kleiner sein sollte, steht das als offene Frage unten und nicht in der Zeile.
3. **Niemand steht länger als nötig.** Lieber ein Feld mehr als eine Wartereihe; höchstens zwei
   Wechsler je Feld (Konzept §11: keine Wartereihe über drei Kinder).
4. **Unter acht Kindern ein Feld bzw. eine Gruppe** – so bildet die App seit v835 auch die Gruppen.
5. **Die Form bleibt.** Es wird nur die Aufteilung geändert, nicht die Übung.

Was die Entwürfe **nicht** sind: fachlich abgenommen. Sie sind aus den vorhandenen Zeilen und den
Angaben der Übungen (Spielerzahl, Feld) abgeleitet. Ob ein 3 gegen 2 statt 3 gegen 3 in einer
bestimmten Einheit trägt, entscheidet ein Trainer.

## Entwürfe

Das Maß in Klammern nennt die Zeile, aus der es übernommen ist.

### Leitfrage 1 · Ball behalten

| Vorlage | 6 Kinder | 10 Kinder | 14 Kinder |
|---|---|---|---|
| L1-1 Duell um zwei Tore | 1 Feld 20 x 25 m, drei Paare: zwei Duelle nebeneinander, das dritte Paar wechselt nach jedem Tor ein | 2 Felder 20 x 25 m, je zwei Duelle nebeneinander, ein Paar wechselt feldweise ein | 2 Felder 25 x 30 m, je drei Duelle nebeneinander, ein Paar wechselt ein |
| L1-2 König auf dem Feld | 2 Felder 12 x 10 m, ein Duell je Feld, ein Paar wartet am unteren Feld und steigt nach jedem Duell ein | 3 Felder 12 x 10 m, ein Duell je Feld, zwei Paare warten unten und steigen im Wechsel ein | 4 Felder 12 x 10 m, ein Duell je Feld, drei Paare steigen unten im Wechsel ein |
| L1-3 Der Diamant dreht | 1 Viereck 12 x 12 m, vier außen gegen zwei in der Mitte | 2 Vierecke 12 x 12 m: eines vier gegen zwei, eines drei gegen eins | 2 Vierecke 15 x 15 m: eines fünf gegen drei, eines vier gegen zwei |
| L1-4 Die erste Berührung | 1 Station, zwei Reihen à 3, Trainer spielt zu | 2 Stationen: eine mit zwei Reihen à 3, eine mit zwei Reihen à 2, ein Trainer je Station | 2 Stationen, je zwei Reihen (4 und 3), zweiter Ball im Umlauf |

### Leitfrage 2 · Vorbeikommen

| Vorlage | 6 Kinder | 10 Kinder | 14 Kinder |
|---|---|---|---|
| L2-1 Mut zum ersten Schritt | 1 Feld 18 x 22 m, drei Paare, ein Paar wartet je Duell | 2 Felder 18 x 22 m: drei Paare an einem, zwei Paare am anderen | 2 Felder 22 x 28 m, je zwei Duelle nebeneinander, drei Paare wechseln ein |
| L2-2 Drei Finten, ein Duell | 1 Feld 20 x 15 m, zwei Gruppen à 3, zwei Duelle gleichzeitig, ein Paar wechselt ein | 2 Felder 20 x 15 m: Gruppen 3, 3, 2, 2 | 2 Felder 25 x 18 m: Gruppen 4, 4, 3, 3, zwei Duelle je Feld |
| L2-3 Erst der Parcours | 1 Parcours doppelt aufgebaut, zwei Reihen à 3 | 2 Parcours: zwei Reihen à 3 und zwei Reihen à 2 | 2 Parcours plus ein drittes Feld für das Duell, Gruppen 5, 5, 4 rotieren |
| L2-4 Und dann in die Breite | 1 Feld 30 x 20 m, 3 gegen 3, je zwei Minitore außen an der Grundlinie | 1 Feld 30 x 20 m, 4 gegen 4, je ein Wechsler pro Team wechselt nach zwei Minuten | 2 Felder 30 x 20 m: 4 gegen 4 und 3 gegen 3, nach dem Hauptteil 1 tauschen die Gruppen das Feld |

### Leitfrage 3 · Tore machen

| Vorlage | 6 Kinder | 10 Kinder | 14 Kinder |
|---|---|---|---|
| L3-1 Kurz und mit beiden Füßen | 1 Tor mit Torhüter im Wechsel, zwei Anspielstationen, Abschluss aus 6–8 m | 2 Tore, zwei Torhüter im Wechsel, je zwei Anspielstationen, Gruppen à 5 | 2 Tore plus ein Minitor-Feld für die dritte Gruppe, Gruppen 5, 5, 4 rotieren |
| L3-2 Der letzte Pass geht quer | 1 Feld 25 x 20 m, 3 gegen 3 auf vier Minitore | 1 Feld 25 x 20 m, 3 gegen 3 auf vier Minitore, zwei Wechsler je Team wechseln nach zwei Minuten | 2 Felder 25 x 20 m, je 3 gegen 3 auf vier Minitore, je ein Wechsler pro Feld |
| L3-3 Mut zählt doppelt | 1 Feld 25 x 20 m, 3 gegen 3 auf Minitore | 1 Feld 25 x 20 m, 3 gegen 3 auf Minitore, zwei Wechsler je Team wechseln laufend ein | 2 Felder 25 x 20 m, je 3 gegen 3 auf Minitore, je ein Wechsler pro Feld |

### Leitfrage 4 · Passen

| Vorlage | 6 Kinder | 10 Kinder | 14 Kinder |
|---|---|---|---|
| L4-1 Den freien Mitspieler finden | 1 Feld 20 x 20 m, 4 gegen 2 | 2 Felder 20 x 20 m: 4 gegen 2 und 3 gegen 1 | 2 Felder 24 x 24 m: 5 gegen 3 und 4 gegen 2 |
| L4-3 Jeder muss einmal | 1 Feld 25 x 20 m, 3 gegen 3 auf vier Minitore | 1 Feld 25 x 20 m, 3 gegen 3 auf vier Minitore, zwei Wechsler je Team wechseln nach zwei Minuten | 2 Felder 25 x 20 m, je 3 gegen 3 auf vier Minitore, je ein Wechsler pro Feld |
| L4-4 Das Dreieck dreht sich | 2 Dreiecke à 3 Spieler, 8–10 m Abstand | 2 Dreiecke à 3 Spieler und ein Viereck à 4 Spieler, 8–10 m Abstand | 2 Dreiecke à 3 Spieler und 2 Vierecke à 4 Spieler, 10 m Abstand |

### Leitfrage 5 · Anbieten

| Vorlage | 6 Kinder | 10 Kinder | 14 Kinder |
|---|---|---|---|
| L5-1 Wo kriege ich den Ball? | 1 Funino-Feld, 3 gegen 3 | 1 Funino-Feld, 3 gegen 3, zwei Wechsler je Team wechseln rollierend | 2 Funino-Felder, je 3 gegen 3, ein Kind je Feld wechselt rollierend |
| L5-2 Die Raute lebt | 1 Feld 30 x 22 m, 3 gegen 3 ohne festen Torhüter – der Letzte sichert | 1 Feld 35 x 25 m, 4+1 gegen 4+1 ohne Wechsel – Torhüter rotieren nach je vier Minuten | 1 Feld 35 x 25 m, 4+1 gegen 4+1, zwei Wechsler je Team wechseln nach je vier Minuten |
| L5-3 Jeder hält seinen Korridor | 1 Feld 25 x 20 m in drei Längskorridoren, 3 gegen 3 | 1 Feld 25 x 20 m in drei Längskorridoren, 3 gegen 3, zwei Wechsler je Team wechseln nach zwei Minuten | 2 Felder 25 x 20 m in drei Korridoren, je 3 gegen 3, je ein Wechsler pro Feld |
| L5-8 Joker-Duell und Schau-Tore | 1 Station, 6 Kinder, Joker-Duell mit einer Bahn | (vorhanden) | 2 Stationen, je 7 Kinder, Joker-Duell mit zwei Bahnen, der siebte holt Bälle und rückt ein |

### Leitfrage 6 · Zurückholen

| Vorlage | 6 Kinder | 10 Kinder | 14 Kinder |
|---|---|---|---|
| L6-1 Sofort nach dem Verlust | 1 Feld 20 x 25 m, 2 gegen 2, ein Kind wartet je Seite | 2 Felder 20 x 25 m: 3 gegen 3 und 2 gegen 2 | 2 Felder 25 x 30 m, je 3 gegen 3, ein Kind wartet je Feld |
| L6-2 Igel, und sofort wieder Adler | 1 Feld 25 x 20 m, 3 gegen 3 auf Minitore | 1 Feld 25 x 20 m, 3 gegen 3 auf Minitore, zwei Wechsler je Team wechseln nach zwei Minuten | 2 Felder 25 x 20 m, je 3 gegen 3 auf Minitore, je ein Wechsler pro Feld |

### Nicht ergänzt

L4-2 und L4-5 sind Lehrgangsformen über 90 Minuten mit eigener Blockfolge. Für sie gibt es hier
keinen Entwurf.

## Offene Fragen an die fachliche Prüfung

1. **Zehn Kinder im 3 gegen 3** (L3-2, L3-3, L4-3, L5-1, L5-3, L6-2): Der Entwurf lässt vier Kinder
   wechseln, damit kein zweiter Trainer nötig ist. Die Alternative sind zwei Felder mit 3 gegen 2
   bzw. 2 gegen 2 plus Joker – mehr Ballkontakte, aber ungleiche Teams und ein Feld ohne Trainer.
   Welche Fassung soll gelten?
2. **Sechs Kinder, Feldgröße:** Die Zeilen übernehmen das Maß der Achter-Zeile. Soll das Feld für
   sechs Kinder kleiner sein, und wenn ja, mit welchem Maß?
3. **L5-2 bei sechs Kindern:** 3 gegen 3 ohne Torhüter verlässt die Raute 4+1 als Form. Ist die
   Einheit bei sechs Kindern überhaupt sinnvoll, oder soll die App dann eine andere vorschlagen?
4. **L1-4, L2-3, L3-1** sind Übungsformen mit Reihen. Die Zeilen halten die Reihen kurz, ändern
   aber nichts daran, dass der Spielanteil dieser Einheiten bei 40 Prozent liegt (Punkt 5.3 der
   Bestandsaufnahme).
5. **L2-1 Mut-Leiter:** Die Übung selbst beschreibt drei Level-Felder, die Vorlage skaliert mit
   ein bis zwei Feldern. Der Entwurf folgt der Vorlage.

## Einbau nach der Prüfung

Die geprüften Zeilen kommen als zusätzliche Schlüssel `"6"`, `"10"`, `"14"` in das Feld
`skalierung` der Vorlage in `uebungen/vorlagen.json`; der Stand der Datei steigt. Die App zieht
geänderte Skalierungszeilen beim nächsten Öffnen selbst nach (`_evSkalierungNachziehen`), ein
Schreiben in die Datenbank von außen ist nicht nötig. `_evPruefung` nimmt die neuen Schlüssel an,
weil die Skalierung datengetrieben ist (v569).
