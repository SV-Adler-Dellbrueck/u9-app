# Auftragspaket: Aufbauten für 10 und 14 Kinder

Repo `SV-Adler-Dellbrueck/u9-app`, Stand 27.09.2026 (App v650). Gilt zusammen mit `CLAUDE.md`.
Beschluss dahinter: `entscheidungen.md` im privaten Repo, Eintrag vom 27.09.2026 (Trainingsblock).

## Worum es geht

Seit v650 gibt es den **Trainingsblock**: eine Leitfrage über zwei bis vier Wochen, genau drei
Vorlagen im Wechsel A-B-C. Im Trainingsplan zeigt die App den Aufbau, der zur Zahl der Kinder
passt – genommen wird der größte Aufbau, der nicht mehr Kinder braucht, als da sind.

Der Kader hat höchstens 14 Kinder; zum Training kommen erfahrungsgemäß 8 bis 14. Neun Vorlagen
tragen schon 8 / 10 / 12 / 14. Die 21 übrigen tragen 8 / 12 / 16 – bei 10 Kindern zeigt die
App dort den Aufbau für 8 mit „+2 Kinder“, bei 14 den für 12 mit „+2 Kinder“. Das trägt, ist
aber nicht das, was ein Trainer am Platz braucht.

## Was geliefert wird

Eine neue Fassung von `uebungen/vorlagen.json`, in der bei den 21 Vorlagen unten das Feld
`skalierung` genau die Schlüssel **"8", "10", "12", "14"** trägt. „16“ entfällt (die Datei
gewinnt: was dort nicht mehr steht, verschwindet beim Abgleich auch aus der Datenbank).
Das Feld `stand` oben in der Datei wird hochgesetzt – sonst gleicht die App nicht ab.

**Nur `skalierung` ändern.** Seit v650 zieht der Abgleich genau diese eine Spalte bei bestehenden
Vorlagen nach; jede andere Änderung an einer bestehenden Vorlage käme nie an und sähe im Repo
trotzdem so aus, als gelte sie.

## Form eines Aufbaus

Ein Satz wie bei den neun fertigen, zum Beispiel „L4-6 3+1 – Adler: breit werden, der Torwart spielt mit“:

- 8: Ein Feld, zwei Teams zu je 4 (3+1), keine Rotation; in den Hauptteilen 1 und 2 zwei Gruppen zu 4 mit den leichteren Varianten (3+1 gegen 1 bzw. ohne Wartende).
- 10: Hauptteile 1 und 2: zwei Gruppen zu 5, an jeder Station rotiert ein Kind nach jedem Durchgang ein. Hauptteil 3 und Turnier: 3+1 gegen 3+1 mit je einem Wechsler – im Plan Feld 2 weglassen.
- 12: Hauptteile 1 und 2: zwei Gruppen zu 6, je Halbfeld eine Station (ist nur ein Jugendtor frei, spielt Station 2 auf zwei Minitore mit Torwart ohne Hände). Hauptteil 3 und Turnier: ein Feld, zwei Teams zu 6 (3+1 plus 2 Rotation) – im Plan Feld 2 weglassen.
- 14: Hauptteile 1 und 2: zwei Gruppen zu 7, an jeder Station rotieren zwei Kinder ein. Hauptteil 3 und Turnier: zwei Felder, 3+1 gegen 3+1 mit Wechslern; fehlt für das zweite Feld das Jugendtor, ersetzen es zwei Minitore mit Torwart ohne Hände in der Schusszone.

Feldzahl, Feldgröße in Metern, Gruppen und was die Wartenden tun. Keine Kindernamen.
Bei ungerader Kinderzahl rechnet die App selbst („+1 Kind: Joker in der Überzahl-Mannschaft“),
dafür braucht es keinen eigenen Satz.

## Die 21 Vorlagen

| Vorlage | Ordnung | heute 8 | heute 12 |
|---|---|---|---|
| L1-1 Ball behalten – Duell um zwei Tore | 1 gegen 1 | 1 Feld 20 x 25 m, zwei Gruppen à 4, ein Duell läuft, eins wartet am Rand | 2 Felder 20 x 25 m, vier Gruppen à 3 |
| L1-2 Ball behalten – König auf dem Feld | 1 gegen 1 | 2 Felder 12 x 10 m, ein Duell je Feld, Aufsteiger wechselt nach oben | 3 Felder 12 x 10 m, ein Duell je Feld, oberstes ist das Königsfeld |
| L1-3 Ball behalten in Überzahl – der Diamant dreht | Überzahl | 1 Viereck 12 x 12 m, vier außen gegen zwei in der Mitte, zweite Gruppe wartet nicht – zweites Viereck daneben | 2 Vierecke 12 x 12 m, je vier außen gegen zwei in der Mitte |
| L1-4 Ball behalten – die erste Berührung nach vorn | ohne Gegner | 1 Station, zwei Reihen à 4, Trainer spielt zu – keine Wartereihe über drei | 2 Stationen, je zwei Reihen à 3, ein Trainer je Station |
| L2-1 Vorbeikommen – Mut zum ersten Schritt | 1 gegen 1 | 1 Feld 18 x 22 m, zwei Wartende je Seite – keine Reihe über drei Kinder | 2 Felder 18 x 22 m |
| L2-2 Vorbeikommen – drei Finten, ein Duell | 1 gegen 1 | 1 Feld 20 x 15 m, zwei Gruppen à 4, zwei Duelle gleichzeitig | 2 Felder 20 x 15 m, vier Gruppen à 3 |
| L2-3 Vorbeikommen – erst der Parcours, dann der Gegner | ohne Gegner | 1 Parcours doppelt aufgebaut, zwei Reihen à 4 | 2 Parcours, je zwei Reihen à 3 |
| L2-4 Vorbeikommen – und dann in die Breite | Raute (4 gegen 4) | 1 Feld 30 x 20 m, 4 gegen 4, je zwei Minitore außen an der Grundlinie | 2 Felder 30 x 20 m, 4 gegen 4, dritte Gruppe wechselt nach je vier Minuten ein |
| L3-1 Tore machen – kurz und mit beiden Füßen | ohne Gegner | 1 Tor mit Torhüter, zwei Anspielstationen, Abschluss aus 6–8 m | 2 Tore, zwei Torhüter im Wechsel, je zwei Anspielstationen |
| L3-2 Tore machen – der letzte Pass geht quer | Dreieck (3 gegen 3) | 1 Feld 25 x 20 m, 3 gegen 3 auf vier Minitore, zwei warten am Rand und wechseln nach zwei Minuten | 2 Felder 25 x 20 m, je 3 gegen 3 auf vier Minitore |
| L3-3 Tore machen – Mut zählt doppelt | Dreieck (3 gegen 3) | 1 Feld 25 x 20 m, 3 gegen 3 auf Minitore, zwei wechseln laufend ein | 2 Felder 25 x 20 m, je 3 gegen 3 auf Minitore |
| L4-1 Passen – den freien Mitspieler finden | Überzahl | 1 Feld 20 x 20 m, 4 gegen 2, zwei Kinder wechseln nach jeder Eroberung | 2 Felder 20 x 20 m |
| L4-2 Passen – Lehrgangsform 15:30:15:30 | Dreieck (3 gegen 3) | Aufwärmen 2 Felder 3 gegen 1; Spielblock 1 ein Feld 4 gegen 4; Zwischenblock 2 Quadrate; Spielblock 2 ein Feld 3+1 gegen 3+1 | Aufwärmen 3 Felder 3 gegen 1; Spielblock 1 zwei Felder 3 gegen 3; Zwischenblock 3 Quadrate; Spielblock 2 Feld A 3 gegen 3, Feld B 2+1 gegen 2+1, Wechsel nach 14 Min |
| L4-3 Passen – jeder muss einmal | Dreieck (3 gegen 3) | 1 Feld 25 x 20 m, 3 gegen 3 auf vier Minitore, zwei wechseln nach zwei Minuten | 2 Felder 25 x 20 m, je 3 gegen 3 auf vier Minitore |
| L4-4 Passen – das Dreieck dreht sich | Dreieck (3 gegen 3) | 2 Dreiecke à 3 Spieler, 8–10 m Abstand, zwei sehen zu und wechseln nach zwei Minuten | 4 Dreiecke à 3 Spieler, 8–10 m Abstand |
| L5-1 Anbieten – wo kriege ich den Ball? | Dreieck (3 gegen 3) | 1 Funino-Feld, 3 gegen 3, ein Kind wechselt rollierend | 2 Funino-Felder, 3 gegen 3 |
| L5-2 Anbieten – die Raute lebt | Raute (4 gegen 4) | 1 Feld 35 x 25 m, 4+1 gegen 4+1 ohne Wechsel – Torhüter rotieren nach je vier Minuten | 1 Feld 35 x 25 m, 4+1 gegen 4+1, dritte Gruppe wechselt komplett ein |
| L5-3 Anbieten – jeder hält seinen Korridor | Dreieck (3 gegen 3) | 1 Feld 25 x 20 m in drei Längskorridoren, 3 gegen 3, zwei wechseln nach zwei Minuten | 2 Felder 25 x 20 m in drei Korridoren, je 3 gegen 3 |
| L6-1 Zurückholen – sofort nach dem Verlust | 2 gegen 2 | 1 Feld 20 x 25 m, 2 gegen 2 mit zwei Wartenden je Seite | 2 Felder 20 x 25 m, 2 gegen 2, ein Kind wartet je Feld |
| L6-2 Zurückholen – Igel, und sofort wieder Adler | Dreieck (3 gegen 3) | 1 Feld 25 x 20 m, 3 gegen 3 auf Minitore, zwei wechseln nach zwei Minuten | 2 Felder 25 x 20 m, je 3 gegen 3 auf Minitore |
| L4-5 Passen – Ball zum Freien, Tor nach Pass zählt doppelt | Dreieck (3 gegen 3) | Ein Feld, 4 gegen 4; im Zwischenblock zwei Vierergruppen als Raute statt Dreieck | Zwei Felder, 3 gegen 3; im Zwischenblock vier Dreiecke |

## Abnahme

1. `node tests/run.js` grün, insbesondere die Vorlagen-Prüfungen (Schema `adler-vorlagen/1`).
2. Jede der 21 Vorlagen trägt genau 8 / 10 / 12 / 14, jeder Text ist nicht leer.
3. Außer `skalierung` und `stand` ist die Datei byte-gleich (Diff prüfen).
4. Nach dem Merge und dem Öffnen der App als Trainer meldet der Abgleich „21 mit neuen Aufbauten“.
