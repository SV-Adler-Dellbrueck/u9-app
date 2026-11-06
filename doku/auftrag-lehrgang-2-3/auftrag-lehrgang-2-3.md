# Auftrag: Übungen „Joker-Duell“ und „Schau-Tore“ sowie Vorlage L5-8 aufnehmen, Skizzenbilder für Lehrgangsaufgabe 2.3 ablegen

Nimm die beiden Übungen aus `nachtrag-uebungen-joker-duell.json` in `uebungen/bibliothek.json` auf und die Vorlage aus `nachtrag-vorlage-l5-8.json` in `uebungen/vorlagen.json`. Zieh alles nach, was dazugehört.

Hintergrund: Die Einheit läuft am Freitag, 06.11.2026, 16:30 Uhr (Käfig, 10 Kinder, zwei Stationen). Sie dient zugleich als Grundlage für die C-Lizenz-Aufgabe 2.3 „Trainingsform erstellen – Individualtaktik“ (Schwerpunkt offensiv: Anbieten und Freilaufen, inklusive Vororientierung; 1 gegen 1 frontal und mit Rücken zum Verteidiger). Der Trainer plant also nicht auf die Aufnahme zu warten, die Einheit steht als Dokument bereit.

## Vorher prüfen und mir melden

- Beide Übungen mit `_euPruefung`, beide Skizzen mit `_eiSkizzeFehler`. Was beanstandet wird, sag mir, bevor du etwas schreibst.
- Ob die Namen „Joker-Duell – anbieten und freilaufen“ und „Schau-Tore – vor dem Ball schauen, dann ins gezeigte Tor“ in der Bibliothek schon vorkommen.
- Ob jedes `uebung_name` in der Vorlage auf eine Übung in der Bibliothek zeigt (`Warm up Adler` und die beiden neuen).
- Ob die Vorlagenprüfung mit den Blöcken vom Typ `spielform` und dem Feld `stationen` wie bei L4-6 und L5-4 zurechtkommt. Netto 34 gegen Haupt- plus Abschlussblöcke 52 Minuten sind 65 Prozent, das liegt im Rahmen von 60 bis 100.

## Was die Skizzen zeigen und warum

**Joker-Duell.** Querformat. Die Zone `[30,20,220,140]` steht schematisch für eine Station von 20 × 24 m, die Meter stehen im Textfeld `feld`. Vier gelbe Hütchen an den Ecken, drei gelbe als Mittelreihe, die zwei Bahnen trennt, ein gelbes Hütchen beim Joker, zwei rote Hütchen als Startpunkte der Verteidiger, zwei Minitore (`v`, Breite 20) an der Stirnseite rechts. Das alles ist Aufbau und steht nur im Grundbild.
Fünf Kinder in allen drei Bildern: Joker `J`, Angreifer `A` und `B` (grün), zwei Verteidiger (rot). Abfolge: 1. Joker spielt den freien Angreifer `A` an, `A` und `B` laufen sich frei (Laufwege gelb). 2. `A` hat den Ball angenommen, der Verteidiger startet. 3. 1 gegen 1, Schuss aufs Minitor.
Engster Spielerabstand: 54,0 / 36,1 / 27,7 (Mindestwert 24). Erwartete Materialliste: 10 Hütchen, 2 Minitore, 1 Ball.
Nicht zeichenbar und deshalb nur im Text: Stufe 3 (Mittelreihe weg, eine Fläche).

**Schau-Tore.** Querformat. Die Zone `[80,25,120,120]` steht für 15 × 15 m. Vier Eckhütchen, vier Minitore mittig an den vier Seiten (zwei `h`, zwei `v`, Breite 20). Der Trainer ist als Gerät `trainer` gesetzt und zählt nicht als Material.
Fünf Kinder in allen drei Bildern: zwei Passgeber `P1`, `P2`, zwei Angreifer `A1`, `A2` (grün), ein Verteidiger (rot, in Stufe 1 passiv). Abfolge: 1. `P1` spielt `A1` an, der Trainer zeigt ein Tor, `A2` läuft sich frei. 2. `A1` schießt ins gezeigte Tor, `A2` läuft an. 3. `P2` spielt `A2` an, der Trainer zeigt das nächste Tor.
Engster Spielerabstand: 34,7 / 34,4 / 34,9. Erwartete Materialliste: 4 Hütchen, 4 Minitore, 1 Ball.
Nicht zeichenbar und deshalb nur im Text: das Armzeichen des Trainers.

## Offen, entscheide du oder frag mich

- `kat`: „Joker-Duell“ steht auf `individual`, „Schau-Tore“ auf `wahrnehmung`. Sag mir, wenn dir am Bestand etwas auffällt.
- `spieler` steht als „4-6“, weil die Stationen je Kinderzahl wechseln. Wenn die Prüfung ein anderes Format erwartet, melde es.
- `ordnung` der Vorlage ist Freitext, „Joker + zwei Duelle (1 gegen 1) | Passgeber + 1 gegen 1“ ist nur ein Vorschlag.
- `skalierung` der Vorlage hat die Schlüssel „8“, „10“, „12“. Die Schlüssel „16“ fehlen bewusst: Der Käfig trägt nur zwei Stationen.
- Wortlaut der Leitfrage 5: Es gilt der neue Wortlaut („Wo stehe ich, wenn wir den Ball haben – und wo, wenn nicht?“, Beschluss 13.09.2026). Die Vorlage trägt ihn schon.
- Nachtragsdateien in `uebungen/`: Nimm die bestehende Praxis. Ein Name, den es schon gibt, wird übersprungen und nicht überschrieben.

## Skizzenbilder für die Lehrgangsaufgabe ablegen

Erzeuge mit dem Exportskript der App (`doku/auftrag-lehrgangsskizzen/export-skizzen.js`) die Bilder beider Skizzen, jeweils die drei Einzelbilder und die Animation als GIF. Lege sie im privaten Repo `adler-u9-wissen` unter `Projektgedaechtnis/skizzen/aufgabe-2-3/` ab, Dateinamen nach den Übungen (`joker-duell-…`, `schau-tore-…`). Der Projekt-Chat kann sie danach für die Abgabe nutzen.

## Nicht Teil dieses Auftrags

Datum, Trainer und Kinderzuteilung der Einheit sind bewusst offen. Sie gehören in die Trainingsplanung, nicht in die Vorlage. Der Blogbeitrag zur Aufgabe 2.3 entsteht im Projekt-Chat.

## Einträge für das Projektgedächtnis (bitte setzen)

In `entscheidungen.md` anhängen, Marke **Beschlossen** (06.11.2026):

- Die Einheit „Anbieten und Freilaufen“ läuft mit zwei Stationen und Gruppenwechsel nach 17 Minuten (zwei Hauptteile), nicht mit einem Aufbau für beide Gruppen. Jede Gruppe durchläuft beide Stationen. Grund: Der Käfig (etwa 40 × 25 m) trägt Warm-up und zwei gleiche Stationen nicht gleichzeitig, und zwei verschiedene Formen wirken weniger monoton.
- Innerhalb jeder Station laufen die drei Stufen frei, eng, offen in 5, 8 und 4 Minuten (Stufe 3 schließt den Wechsel ein). Die Hauptteile nutzen das Vorlagenformat `stationen`.
- Die Lehrgangsaufgabe 2.3 wird an der Leitfrage 5 aufgehängt, die Vororientierung heißt bei den Kindern „Kopf hoch, bevor der Ball kommt“. Der Schwerpunkt ist offensiv (Anbieten und Freilaufen), nicht defensiv.
- Stufe 1 von „Schau-Tore“ besteht aus zwei Passgebern und zwei Angreifern im Wechsel mit passivem Verteidiger. Grund: Die erste Fassung ließ drei Kinder fünf Minuten zusehen und verstieß gegen die Leitplanke „keine Wartereihe über drei Kinder“.
- Der Platz der U9 I ist der Käfig (Kunstrasen, etwa 40 × 25 m, Minitore und Hütchen in ausreichender Zahl, Maße für Übungen frei wählbar). Das Trainerteam heute: zwei Trainer, 10 Kinder angemeldet.

In `stand.md`, Teil B (Trainerkonzept und Lehrgang), Marke **Beschlossen**: Einheit 06.11.2026 geplant und als Auftragspaket abgelegt, Aufnahme in Bibliothek und Vorlagen offen, Blogbeitrag zur Aufgabe 2.3 offen.

## Abnahme

- Kein Kindername, kein Klarname im Repo.
- Neuer Prüffall in `tests/checks/`, benannt nach der Version, aus der er stammt. Er prüft je Übung: Skizze ohne Beanstandung, drei Bilder, gleiche Spieler in jedem Bild, Materialliste (Joker-Duell: 10 Hütchen, 2 Minitore, 1 Ball; Schau-Tore: 4 Hütchen, 4 Minitore, 1 Ball). Dazu für die Vorlage: Jedes `uebung_name` zeigt auf eine Bibliotheksübung.
- `node tests/run.js` grün, dann `sw.js` hochzählen, Funktionsübersicht und Hilfe nachziehen.
- PR als Entwurf, zusammengeführt wird auf mein Wort.
