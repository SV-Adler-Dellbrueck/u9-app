# Auftrag für Claude Code: Festival-Planer für Heimspieltage (Kinderfestival U9)

Ablage: `doku/auftrag-kinderfestival-planer/auftrag.md` im Repo `SV-Adler-Dellbrueck/u9-app`.
Stand der Regeln: Durchführungsbestimmungen Kinderfußball, Fußballkreis Köln, gültig ab 01.08.2026 (Saison 2026/27). Lies vor dem Bauen Abschnitte 1 bis 7 selbst im PDF (liegt im Claude-Projekt „Adler U9I“ und in `adler-u9-wissen`) und gleiche jede Zahl unten damit ab. Weicht das PDF ab, gilt das PDF, und du meldest die Abweichung.

## Ziel

In der App gibt es bereits die Spieltagsplanung mit Link-Erzeugung. Sie soll für Heimfestivals um einen Planer erweitert werden. Eingabe: Kinderzahl je Verein (und optional die von den Gästen gemeldete Teamzahl), Anzahl der Felder und Tortyp je Feld. Ausgabe: ein fertiger Spielplan mit Teams je Verein, Feldzuordnung, Runden, Wechselhinweisen und Aufbauplan, abrufbar über den bestehenden Link.

Anlass: Festival am Heimplatz mit Adler Dellbrück U9 I, Bäng, Boom, Bäng Ballfieber U9 und Schlebusch U9 I. Kinder- und Teamzahlen liefert Charles erst am Tag davor. Der Planer muss deshalb in einer Minute am Handy bedienbar sein.

Leitgedanke: Bei Kälte sollen die Kinder möglichst viel spielen und möglichst wenig stehen.

**Der Planer ist eine Option, kein Ersatz.** Die bestehende Spieltagsplanung und ihr Link bleiben unverändert und bleiben der Standardweg. Der Festival-Planer ist ein zusätzlicher, bewusst gewählter Einstieg (eigene Schaltfläche oder eigener Reiter). Wer ihn nicht öffnet, merkt von der Erweiterung nichts. Bestehende Spieltage dürfen durch den Umbau weder verändert noch verschlechtert werden.

Rahmen für das erste Festival: bis zu 5 Felder sind aufbaubar.

## Vorab prüfen (vor jeder Zeile Code)

1. Lies `CLAUDE.md`, den Export `export/app-stand.md` (in `adler-u9-wissen`) und finde die bestehende Spieltagsplanung samt Link-Mechanismus. Nutze genau diesen Mechanismus weiter, erfinde keinen zweiten.
2. Prüfe, ob der Wunsch ohne neue Tabelle geht: Der Plan ist eine reine Funktion `planFestival(eingabe) → plan`. Ergebnis als JSON im vorhandenen Spieltag-Datensatz ablegen, sofern dort ein passendes Feld existiert. Eine neue Tabelle nur, wenn es nicht anders geht, dann mit RLS und Policy von Anfang an.
3. Melde mir zuerst kurz, was du vorgefunden hast und ob der Weg über Daten statt Code reicht. Dann erst bauen.

## Regeln, die der Planer hart einhält (Quelle: Durchführungsbestimmungen)

- Altersklasse U9. Spielform auf Minitore: 3 gegen 3. Spielform auf Jugendtore: 3+1 gegen 3+1. 4 gegen 4 und 4+1 sind laut Durchführungsbestimmungen erst ab U10 vorgesehen.
- **Ausnahme 4+1:** Wenn sich die Trainer einig sind, kann 4+1 auf Jugendtoren sinnvoll sein, damit keine Kinder in der Kälte stehen. Das ist die Ausnahme und kein Standard. Der Planer bietet es deshalb nur über einen bewusst zu setzenden Schalter „4+1 nach Absprache der Trainer“ an (Standard aus, gilt je Feld mit Jugendtoren). Ist der Schalter an, erscheint im Plan und im Link der feste Hinweis „Abweichung von den Durchführungsbestimmungen, nach Absprache der Trainer“. 4 gegen 4 auf Minitoren wird nicht angeboten. Die Teamgröße für 4+1 (Feldspieler, Torhüter, Rotation) legst du als eigene Konstanten an und weist sie als Annahme aus; sie stehen nicht in der Tabelle für U9.
- Teamgröße laut Tabelle in Abschnitt 3: 3 Feldspieler plus 1 bis 2 Rotationsspieler, insgesamt 4 bis 5. Bei Jugendtoren ergänzt ein Torhüter das Team (Abschnitt 3 Absatz 1). Lies die Zahlen für Jugendtore dort selbst nach und lege sie als Konstanten an einer Stelle ab.
- Teams werden je Verein gebildet. Teams, die „möglichst gleichstark“ sind, spielen am selben Spielort, bei Bedarf in zwei Gruppen. Im Plan und im Link erscheinen keine Begriffe wie stark oder schwach, nur neutrale Teamnamen (Verein plus Nummer) und Farben.
- Feldgröße ca. 25 x 20 m. Minitore haben eine Schusszone etwa 6 m vor dem Tor, Treffer nur aus der Zone. Jugendtore sind auf 1,65 m Höhe reduziert, dort nur Mittellinie, Treffer nur aus der gegnerischen Hälfte.
- Empfohlen sind 6 Spiele à 7 Minuten je Team. Ein Spieltag soll in 60 Minuten durchgeführt werden. Die Pausen finden am jeweils nächsten Spielfeld statt.
- Wechsel der Rotationsspieler nach jedem Tor bei beiden Teams, spätestens nach 1 bis 2 Minuten.
- Höchstens so viele Betreuer auf dem Platz, wie Teams gemeldet sind. Der Plan zeigt diese Zahl an.
- Modus: Variante 1 Jeder gegen Jeden, Variante 2 Champions-League-Modus. Bei Champions-League-Modus müssen Jugendtore auf zwei Feldern stehen (Feld 1 und 3).

## Gewünschtes Verhalten

**Eingabe (ein Bildschirm, mobil):**
- Je Verein: Name und Kinderzahl. Optional: vom Gast gemeldete Teamzahl. Der Heimverein ist vorbelegt (Adler Dellbrück U9 I).
- Anzahl Felder (Stepper, bis 5). Je Feld: Minitore oder Jugendtore, bei Jugendtoren optional der Schalter „4+1 nach Absprache der Trainer“.
- Spielzeit je Spiel (Standard 7 Min), Wechselzeit zwischen den Runden (Standard 1 Min), Zeitfenster (Standard 60 Min).
- Modus: Jeder gegen Jeden (Standard). Champions-League-Modus erst als zweite Ausbaustufe, weil er Ergebnisse live braucht und sich nicht vorab planen lässt.
- Eine Hauptaktion: „Plan erzeugen“.

**Teambildung je Verein:**
- Ohne gemeldete Teamzahl: kleinste Teamzahl, bei der kein Team mehr als 5 Kinder hat; Kinder möglichst gleichmäßig verteilen (9 Kinder werden 5+4, nicht 6+3).
- Mit gemeldeter Teamzahl: übernehmen und prüfen, ob die Teamgrößen 4 bis 5 einhalten.
- Liegt ein Team unter 4 oder über 5, wird der Plan trotzdem erzeugt und die Abweichung als Hinweis ausgewiesen (die Tabelle ist eine Empfehlung, kein Zwang). Bei Teams mit 3 Kindern den Hinweis, dass die Rotation entfällt.

**Felder auslasten (das ist der eigentliche Hebel):**
Die gesamte Spielzeit aller Kinder ergibt sich aus Feldern mal Runden mal Spielzeit. Ein Feld ohne Spiel ist verlorene Spielzeit. Der Planer soll daher:
- die Zahl der gleichzeitig bespielten Felder so wählen, dass jede Runde alle genutzten Felder belegt sind (Teamzahl mindestens 2 mal Felder), und freie Felder ausweisen statt sie halbleer zu planen;
- bei geradem Teamzahl-Überhang vermeiden, dass dasselbe Team zweimal hintereinander pausiert;
- einen Variantenvergleich zeigen statt nur einen Plan: z. B. große Teams (4 bis 5 Kinder, weniger Felder voll) gegen kleine Teams (3 bis 4 Kinder, mehr Felder voll, dafür unter der Empfehlung der Tabelle), jeweils mit Netto-Minuten je Kind. Die Variante mit den meisten Spielminuten für das am wenigsten bespielte Kind wird zuerst gezeigt, aber nicht automatisch gewählt; die Trainer entscheiden. Nur gerechnete Werte ausgeben, keine Schätzungen.

**Spielplan:**
- Jeder gegen Jeden nach dem Kreisverfahren, bei ungerader Teamzahl mit spielfreiem Team je Runde. Begegnungen zwischen Teams desselben Vereins so spät wie möglich legen.
- Rundenzahl so, dass jedes Team die empfohlenen 6 Spiele bekommt, wenn Zeitfenster und Teamzahl es zulassen. Bei weniger Gegnern als 6 optional eine Wiederholungsrunde anbieten, nicht stillschweigend einbauen.
- Feldzuordnung so, dass Jugendtor-Felder gleichmäßig genutzt werden und kein Team dauerhaft auf demselben Feld bleibt.
- Gesamtdauer = Runden mal (Spielzeit plus Wechselzeit). Liegt sie über dem Zeitfenster, Warnung mit dem Vorschlag, Rundenzahl oder Spielzeit zu senken. Nicht von selbst kürzen.

**Kennzahlen im Ergebnis (müssen aus dem Plan gerechnet sein):**
- Netto-Spielminuten je Team, Durchschnitt je Kind (Feldspieler durch Kader), Anzahl Pausen je Team.
- Gesamtdauer, benötigte Minitore, Hütchen für Schusszonen und Mittellinien, Anzahl Betreuer.

**Ausgabe im Link (mobil, Hauptansicht):**
- Rundenplan als Tabelle Runde mal Feld, Teams mit Farbe, Pausenteams je Runde.
- Feldübersicht: Feldnummer, Tortyp, Spielform (3 gegen 3 oder 3+1), Maße, Schusszone ja/nein.
- Wechselregel in einem Satz.
- Keine Kindernamen. Eigene Kinder höchstens als „Kind A“ bis „Kind O“. Gästekinder nie einzeln.
- Öffentlich lesbar nur, was der bestehende Link ohnehin zeigt. Prüfe die Policy, bevor du etwas Neues freigibst.

## Oberfläche

Verbindlich nach Skill `cockpit-ui`: Hauptaktion 56 px, Bedienelemente mindestens 48 px, genau eine Hauptaktion je Bildschirm, Statusfarben und Abstandsraster aus dem Skill. Bedienung am Spielfeldrand mit kalten Fingern.

## Abnahmekriterien

1. `planFestival` ist eine reine Funktion mit Unit-Tests (alle Testfälle unten grün), ohne Netzwerkzugriff.
2. Kein 4 gegen 4 in irgendeiner Ausgabe. 4+1 erscheint nur bei gesetztem Schalter und immer mit Abweichungshinweis.
3. Jede Zahl in den Kennzahlen lässt sich aus dem Plan nachrechnen; ein Test rechnet sie unabhängig nach.
4. Kein Kindername im Link. RLS ist unverändert oder für neue Tabellen vollständig gesetzt.
5. Abweichungen von der Empfehlung (Teamgröße, Dauer über 60 Minuten, weniger als 6 Spiele) erscheinen als Hinweis, nie als stille Korrektur.
6. Neue Regelkonstanten stehen an einer Stelle mit Verweis auf Abschnitt und Saison der Durchführungsbestimmungen.

## Testfälle (Erwartung vorher von dir nachrechnen und mir melden, falls sie nicht stimmen)

1. Drei Vereine mit je 8 Kindern, 3 Felder Minitore, 7 Min, 1 Min Wechsel. Erwartet: 6 Teams à 4, alle Felder in jeder Runde belegt, 5 Runden Jeder gegen Jeden, 35 Netto-Minuten je Team, im Schnitt 26,25 Minuten je Kind.
2. Adler 11, Ballfieber 9, Schlebusch 7, 3 Felder. Erwartet: Hinweise zu Teams mit 3 Kindern (11 und 7 lassen sich nicht in 4er- bis 5er-Teams teilen), 7 Teams, je Runde ein spielfreies Team, 7 Runden, jedes Team 6 Spiele, Gesamtdauer 55 Minuten bei 1 Min Wechsel.
3. Gast meldet 2 Teams mit zusammen 6 Kindern. Erwartet: Plan wird erzeugt, Hinweis auf Teams mit 3 Kindern ohne Rotation.
4. Ein Feld, zwei Teams. Erwartet: nur eine Begegnung je Runde, Hinweis, dass Rundenzahl durch das Zeitfenster begrenzt ist, kein Absturz.
5. Zeitfenster 60 Min, Konfiguration ergibt 66 Min. Erwartet: Warnung mit Vorschlag, keine automatische Kürzung.
6. Gemischte Felder (2 Minitor, 2 Jugendtor) im Jeder-gegen-Jeden-Modus. Erwartet: Spielform je Feld korrekt (3 gegen 3 bzw. 3+1), Jugendtor-Felder gleichmäßig verteilt.
7. Drei Vereine mit je 10 Kindern, 5 Felder Minitore, 7 Min, 6 Runden. Erwartet im Variantenvergleich: (a) 6 Teams à 5, nur 3 Felder belegt, je Kind im Schnitt 25,2 Minuten; (b) 10 Teams à 3, alle 5 Felder belegt, keine Rotation, je Kind 42 Minuten, Hinweis „unter der Teamgröße-Empfehlung“. Bei 10 Teams spielt nicht jeder gegen jeden (9 mögliche Gegner, 6 Runden): Hinweis ausgeben.
8. Schalter „4+1 nach Absprache“ aus: keine 4+1-Ausgabe. Schalter an: Abweichungshinweis im Plan und im Link, Spielform des betroffenen Feldes 4+1, Teamgrößen als ausgewiesene Annahme.
9. Der Planer wird nicht geöffnet: bestehende Spieltagsplanung und bestehender Link verhalten sich exakt wie vorher (Regressionstest mit einem vorhandenen Spieltag).

## Nicht Teil dieses Auftrags

Champions-League-Modus (Ausbaustufe 2), Ergebniserfassung, Einsatzplanung der eigenen Kinder nach Positionen, DFBnet-Anbindung.

## Rückmeldung am Ende

- Was gebaut wurde, welche Tests laufen, welche Abweichungen von diesem Auftrag und warum.
- Wo im Repo die Regelkonstanten stehen.
- Vermerk, dass Drive und das Projektgedächtnis (stand.md, entscheidungen.md) noch nachzuziehen sind. Du schreibst nur die Zweitschrift im Repo `adler-u9-wissen`.
