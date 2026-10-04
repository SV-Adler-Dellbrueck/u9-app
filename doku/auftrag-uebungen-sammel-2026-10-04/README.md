# Sammelauftrag: fünf neue Übungen in die Bibliothek

Stand 04.10.2026. Fünf Übungen aus dem Projekt-Chat, jede mit eigenem Auftragspaket. Dieses
Paket fasst sie zu **einem** Durchlauf zusammen: eine Aufnahme, ein Prüffall, ein PR.
Maßgeblich ist je Übung das JSON in ihrem Einzelpaket, nicht eine Abschrift hier.

## Die fünf Übungen

| # | Name | Kategorie | Dauer | Bilder | Einzelpaket |
|---|------|-----------|-------|--------|-------------|
| 1 | Doppelpass durch die Stangen | technik | 10 | Grundbild + 2 Schritte | `doku/auftrag-uebung-doppelpass-stangen/` |
| 2 | Stangentausch | wahrnehmung | 6 | 1 Bild | `doku/auftrag-uebung-stangentausch/` |
| 3 | Abschlussspiel – 3+1 gegen 3+1 Raute mit Countdown | raute | 8 | 1 Bild | `doku/auftrag-uebung-abschlussspiel-raute-countdown/` |
| 4 | FUNiño 1 gegen 0 bis 4 gegen 4 – der Angreifer wird Verteidiger | pressing | 12 | Grundbild + 2 Schritte | `doku/auftrag-uebung-funino-wachstum/` |
| 5 | Eishockey-Reihentausch – 6 gegen 6 in zwei Reihen | spass | 15 | Grundbild + 2 Schritte | `doku/auftrag-uebung-eishockey-reihentausch/` |

Alle fünf sind im Projekt-Chat gegen die echte App geprüft (`_euPruefung`, `_eiSkizzeFehler`,
Rendern). Bei der Aufnahme prüfst du trotzdem noch einmal selbst.

## Reihenfolge und Zuschnitt

1. Je Einzelpaket das JSON aus dem Abschnitt „Die Übung“ lesen. Das Eishockey-Paket wurde
   am 04.10.2026 nachträglich geändert (Strafbank für Torschützen); es gilt die jüngste Fassung.
2. Alle fünf **vorher** mit `_euPruefung` und `_eiSkizzeFehler` prüfen und mir melden, was
   beanstandet wird, bevor du etwas schreibst.
3. Namen gegen `uebungen/bibliothek.json` abgleichen. Ein vorhandener Name wird nie
   überschrieben. Hier kollidiert nach Stand vom 04.10.2026 keiner; die Abschlussform
   „3+1 gegen 3+1 – Raute ohne Aufpasser“ bleibt unverändert bestehen und ist **keine**
   Vorlage zum Ersetzen.
4. Die fünf Übungen in einem Zug aufnehmen, ein Commit, danach die Bilder.
5. Bilder mit dem Bildexport und `exportAnimation` aus
   `doku/auftrag-lehrgangsskizzen/export-skizzen.js` erzeugen: quer, mit Legende. Für die
   Übungen 1, 4 und 5 (Grundbild plus Schritte) auch das GIF, für 2 und 3 ein Bild.
6. Ein Prüffall für alle fünf in `tests/checks/`, benannt nach der Version, aus der er
   stammt: Eintrag vorhanden, Skizze prüft ohne Fehler, Materialzeile stimmt.
   Erwartete Materialzeilen laut App:
   - 1: 1 Minitor · 2 Hütchen · 4 Stangen · 1 Freistoß-Dummy · 2 Bälle
   - 2: 4 Stangen · 4 Bälle
   - 3: 2 Jugendtore · 1 Ball · 1 Balldepot
   - 4: 4 Minitore · 1 Ball · 2 Balldepots
   - 5: 2 Jugendtore · 4 Hütchen · 1 Ball
7. `node tests/run.js` grün, `sw.js` hochzählen, Funktionsübersicht und Hilfe nachziehen.
8. PR als Entwurf; zusammengeführt wird auf mein Wort.

## Worauf du achten musst

- **Spielerreihenfolge in den Skizzen:** Die App vergleicht Kürzel je Position über alle
  Bilder. Bei den Übungen 1, 4 und 5 darf die Reihenfolge der Spieler im Grundbild und in den
  Schritten nicht umsortiert werden. Beim Eishockey war genau das der erste Prüffehler.
- **Pfeile:** Pfeil 1 und Pfeil 2 bei Übung 2 sind absichtlich versetzt, damit die Nummer
  die Pfeilspitze nicht verdeckt.
- **Strafbank:** Ist in Übung 5 eine Zone aus vier Hütchen, kein Gerät. Die App kennt kein
  „Strafbank“-Gerät.
- **Kinder:** Keine Klarnamen, auch nicht in Prüffällen. Die Kürzel A bis L und T sind
  Platzhalter.
- **Quelle:** Übung 4 nennt in `kurz` die F-Jugend-Sammlung des SBFV als Anlehnung. Der
  Wortlaut der Quelle steht nirgends im Eintrag.

## Offen, nicht geraten (bei Rückfrage an Charles zurückgeben)

- Kategorien 3 bis 5 sind meine Wahl, das Schema hat keine Kategorie für Abschlussspiele
  oder FUNiño-Wachstumsformen.
- Übung 3: Ob „Raute“ mit Aufpasser gemeint ist, ist nicht bestätigt. Gelesen ist: Torwart
  hinten, zwei Flitzer seitlich, Jäger vorn.
- Übung 4: Die Phasenfolge 1:0, 1:1, 2:1, 2:2, 3:2, 3:3, 4:3, 4:4 ist eine Lesart.
- Übung 5: Wer nach einem Tor anstößt und was beim Reihentausch mit dem Ball passiert, ist
  nicht festgelegt.

## Nach der Aufnahme

Du schreibst **nur** die Zweitschrift im Repo `adler-u9-wissen`, Ordner Projektgedaechtnis,
und vermerkst am Ende, dass Drive noch nachzuziehen ist. Der Projekt-Chat führt beide
Fassungen. Nachzutragen sind: fünf neue Übungen aufgenommen (mit Namen), Bilder erzeugt,
PR-Nummer.
