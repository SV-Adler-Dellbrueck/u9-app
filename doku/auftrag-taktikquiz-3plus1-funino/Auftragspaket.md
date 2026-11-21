# Auftragspaket: Taktik-Quiz – 3+1 und FUNiño, Korrekturen am Bestand

Repo `SV-Adler-Dellbrueck/u9-app`, Stand 21.11.2026. Gilt zusammen mit `CLAUDE.md`.
Fachliche Grundlage: `entscheidungen.md` (privates Repo), Einträge vom 16.09.2026
(„3+1: Raute ohne Aufpasser“, „FUNiño: Dreieck ohne Jäger, Rollen wandern“) und der
Beschluss „Quiz-Inhalte werden gegen die eigenen Regelkarten geprüft“ (v566).
Regelquelle: Durchführungsbestimmungen Kinderfußball Kreis Köln, gültig ab 01.08.2026.

## Befund (geprüft im Projekt-Chat gegen `data.js` und `quiz.js` von heute)

1. **Kein Szenario für die Spielformen der U9.** Alle 100 Szenarien in `TQ_SCENARIOS` sind
   4+1 (Torwart plus Aufpasser, zwei Flitzer, Jäger), Szenario 60 als Unterzahl mit drei
   Feldspielern. Kein einziges ist 3+1 oder FUNiño. Die U9 spielt laut Kreis nur 3 gegen 3
   auf Minitore und 3+1 gegen 3+1; 4+1 ist die Spielform der E-Jugend.
2. **Das Quiz-Feld ist ein Großfeld.** `shell.html` (`#taktik-field`) zeichnet Strafraum,
   Torraum und Mittelkreis, aber keine Tore. Felder mit Jugendtoren haben laut Kreis nur eine
   Mittellinie (2.5), Minitor-Felder eine Schusszone von etwa sechs Metern (2.4).
3. **Mechanik.** Szenario 55: der Jäger startet schon im Ziel (Abstand 1, Radius 9) – Punkt
   ohne Zug. Szenario 79: das Ziel liegt 3,6 neben dem Gegner statt zwischen Ball und Gegner.
   Szenarien 16, 59, 73, 88, 96: Ziel liegt (fast) genau auf einem Gegnerstein; Stein und
   Lösungskreis verdecken den Gegner.
4. **Sprache vom Großfeld**, die der Prüffall aus v566 nicht abdeckt: Strafraum, Pfosten,
   Flanke in 7, 12, 13, 19, 20, 42, 43, 52, 54, 63, 89; in 68 „hohe Flanke … bevor der Gegner
   köpfen kann“ (Kopfball wird bis U11 nicht geübt). 57 „Führung verteidigen, noch 3 Minuten“
   widerspricht 4.11 (keine Ergebnisse) und 4.10 (Trainer coacht kaum). 59/60 erklären
   Über-/Unterzahl mit einer Verletzung statt mit der Drei-Tore-Regel (4.8). 38: Rückpass
   ohne den Hinweis, dass der Torwart ihn mit dem Fuß nimmt (4.12).
5. **Ergebnisanzeige.** `tqShowResult` schreibt immer „versteht die Raute“. Medaille
   (`tqScore>=9/7/5`) und Sticker (`score>=7`) zählen absolut, nicht im Verhältnis zur
   Blockgröße. Die Beschriftung der Lösungskreise in `tqShowSolution` hat 7 px Schrift –
   unter der Untergrenze aus v683 (11,5 px) und am Spielfeldrand nicht lesbar.
6. **Kopplung Block ↔ Index.** `tqStartBlock` schneidet `block*10 … +10`. Fortschritt
   (`adler_quiz_progress`, `quiz_progress`) hängt am Blockindex.

## Was geliefert wird

| Datei | Inhalt |
|---|---|
| `szenarien-nachtrag.json` | 2 neue Blöcke mit je 10 Szenarien, Schema wie `TQ_SCENARIOS` plus `feld` |
| `korrekturen.json` | 22 Korrekturen am Bestand, je mit Nummer, altem Titel, Grund, neuen Werten |

Die 20 neuen Szenarien sind mit einem Skript geprüft: kein Ziel schon am Start erreicht,
kein Ziel auf gesperrtem Stein, Radius ≥ 12, kein Ziel näher als 7 an einem Gegner, keine
Großfeld-Wörter, im 3+1 kein Aufpasser und im FUNiño weder Torwart noch Jäger – außer in den
Szenarien zur Drei-Tore-Regel, in denen genau diese Rolle dazukommt. Bilder aller 20
Stellungen sind angesehen. **Bitte im echten Prüfstand wiederholen, nicht darauf verlassen.**

Inhalt der neuen Blöcke:

- **3+1 – Raute ohne Aufpasser** (`feld: "3+1"`): Toraus des Gegners, Torwart eröffnet flach,
  Adler mit herauskommendem Torwart, Igel mit tiefen Flitzern, Igel zur Ballseite, Umschalten
  nach Ballverlust, Torwart als Anspielstation (Fuß, nicht Hand), Tor nur aus der gegnerischen
  Hälfte, Drei-Tore-Regel mit Aufpasser, Dreieck mit dem Torwart.
- **FUNiño – Dreieck ohne Jäger** (`feld: "funino"`): raus aus der Schusszone beim Toraus,
  Flitzer greifen die Tore außen an, Aufpasser rückt hinter dem Ball mit, links oder rechts,
  „einer drängt, zwei schützen die Tore“ (beide Seiten), Ballgewinn, Tor nur aus der
  Schusszone, Drei-Tore-Regel mit Jäger, Einwechseln übernimmt die freie Rolle.

Koordinaten wie im Bestand: x 0–100 links→rechts, y 0–100, eigenes Tor unten. FUNiño-Annahmen:
Minitore bei x 28 und 72, Schusszonen bis y 24 (Gegner) und ab y 76 (eigene).

## Schritte

1. **Feld je Szenario.** Neues optionales Feld `feld` an Szenario bzw. Block: `"4+1"`
   (Vorgabe, wenn leer), `"3+1"`, `"funino"`. Das SVG in `#taktik-field` wird beim Laden eines
   Szenarios danach gezeichnet und bei `tqStop` auf den Stand des Taktikboards zurückgesetzt:
   - `4+1` und `3+1`: Außenlinie, Mittellinie, je ein Jugendtor oben und unten (Breite 25 %
     der Feldbreite). Kein Strafraum, kein Torraum, kein Mittelkreis.
   - `funino`: Außenlinie, Mittellinie, je zwei Minitore oben und unten (Mitte x 28 und 72),
     Schusszonen gestrichelt bei y 24 und y 76.
   Prüfen, ob `_skz` (wie in `md-brett.js` `_brFeld`) das liefern kann – dann dasselbe
   Zeichenwerkzeug nehmen statt eines zweiten SVG von Hand. Das Taktikboard selbst bleibt,
   wie es ist.
2. **Blöcke mit eigener Szenarienliste.** `TQ_BLOCKS[i]` bekommt `von`/`bis` (oder eine eigene
   Liste) statt der Rechnung `block*10`. Die zehn bestehenden Blöcke behalten Index 0–9 und
   ihre Szenarien 1–100; die neuen werden als Index 10 und 11 **angehängt**, damit kein
   gespeicherter Fortschritt auf einen anderen Block rutscht. In der Blockübersicht stehen
   die beiden neuen oben unter „So spielen wir“, die zehn alten darunter unter
   „4+1 – mit Aufpasser und Jäger“. Reihenfolge der Anzeige ≠ Index.
3. **Nachtrag einspielen.** Die 20 Szenarien aus `szenarien-nachtrag.json` an
   `TQ_SCENARIOS` anhängen (101–120), Blöcke wie geliefert an `TQ_BLOCKS`. Kein bestehendes
   Szenario ändern außer nach Schritt 4.
4. **Korrekturen.** `korrekturen.json` per Skript anwenden, Zuordnung über `nr` **und** alten
   `title`; passt einer nicht, abbrechen statt raten.
5. **Ergebnisanzeige.** Untertitel in `tqShowResult` aus dem Block statt „versteht die
   Raute“ (z. B. „… versteht das 3+1“, „… versteht FUNiño“, „… versteht die Raute“ für 4+1).
   Medaille und Sticker im Verhältnis zu `tqTotal` bzw. Blockgröße (≥ 90 / 70 / 50 %, Sticker
   ab 70 %). Beschriftung der Lösungskreise mindestens 11,5 px, notfalls Kurzform der Rolle
   (TW, Auf, FL, FR, Jä) statt Verkleinerung.
6. **Ohne Aufnahmen (Charles 21.11.).** Für die neuen und die geänderten Sprechtexte werden
   vorerst **keine** Aufnahmen gemacht; es zählt nur der Text in der App. Betroffen sind die
   20 neuen Szenarien und die Korrekturen mit `aufnahme: true` (19, 42, 43, 54, 57, 59, 60,
   63, 68, 89). Der Vorlese-Knopf fällt dort wie vorgesehen auf die Gerätestimme zurück. Die
   alten MP3 dieser zehn Szenarien werden gelöscht (ihr Name passt nicht mehr). Die
   Aufnahmepflicht in `v567-quiz-audio.js` bekommt eine ausdrückliche, kommentierte
   Ausnahmeliste für genau diese 30 Szenarien (über den Titel, nicht über die Nummer), damit
   jedes weitere Szenario ohne Aufnahme weiter rot wird.
   **Stimme (Beschluss 21.11.):** Die App spricht mit der Maskottchen-Stimme „Lennart –
   Energetic“ (ElevenLabs, eleven_v4), soweit nicht anders festgelegt. Keine Nachaufnahmen mit
   „Ava“. Wenn die Inhalte fertig sind, wird das ganze Quiz (120 Szenarien) in einem Durchgang
   mit Lennart neu vertont; dann entfällt die Ausnahmeliste wieder.
7. **Prüffälle.** `v566-eltern-durchsicht.js` um diese Invarianten über **alle** Szenarien
   erweitern: kein Ziel ist am Start (nach `anim`) schon erreicht; kein Wort Strafraum,
   Pfosten, Flanke, köpf; im `feld: "3+1"` kein Aufpasser und im `feld: "funino"` kein
   Torwart und kein Jäger, außer der Titel nennt „Drei Tore“. Anzahl 120 statt 100 nachziehen
   (`v566`, `v567`, `v650`, `v651` prüfen, wo 100 fest steht).
8. Hilfe-Eintrag zum Taktik-Quiz und Funktionsübersicht nachziehen, `node tests/run.js` grün,
   `sw.js` hochzählen.

9. **3+1 im Taktikbrett und Mini-Feld (Charles 21.11.: mit ins Paket).** `FORMATIONS['3+1']`
   in `data.js` steht noch auf dem am 16.09. verworfenen 1-2 (Aufpasser plus zwei Flitzer).
   Neu laut Beschluss: Torwart, Flitzer L, Flitzer R, Jäger – Vorschlag `TW 50/92`,
   `Flitzer L 20/52`, `Flitzer R 80/52`, `Jäger 50/30` (Klassen und `rk` wie im 4+1). Vorher
   alle Leser von `FORMATIONS` und `rk` suchen (Taktikbrett `md-brett.js`, Mini-Feld am
   Spieltag, Rollen-Erfahrung/„Vorschlag“, Rollen-Matrix, `kind_rolle_heute`) und im PR
   aufführen, was sich dadurch ändert – insbesondere, ob gespeicherte 3+1-Aufstellungen mit
   Slot „Aufpasser“ danach falsch gezählt oder angezeigt werden. Bestehende Daten nicht
   umschreiben; wenn alte Aufstellungen betroffen sind, erst Charles fragen. Die FUNiño-Formation
   bleibt in diesem Paket unverändert.

## Abnahmekriterien

1. In der Kabine zeigt „Taktik-Quiz“ oben die Blöcke „3+1 – Raute ohne Aufpasser“ und
   „FUNiño – Dreieck ohne Jäger“, darunter die zehn 4+1-Blöcke.
2. Ein 3+1-Szenario zeigt Jugendtore und nur die Mittellinie, ein FUNiño-Szenario vier
   Minitore und zwei gestrichelte Schusszonen, ein 4+1-Szenario Jugendtore ohne Strafraum.
   Nach „Beenden“ sieht das Taktikboard aus wie vorher.
3. Ein vorhandener Fortschritt für Block 0–9 (localStorage und `quiz_progress`) zeigt nach
   dem Update denselben Stand am selben Block.
4. Alle 20 neuen Szenarien lassen sich lösen: Steine auf die Zielmitten legen → „Richtig“;
   ohne Zug „Prüfen“ → 0 Treffer.
5. Szenario 55 gibt ohne Zug keinen Treffer; Szenario 79 legt das Ziel zwischen Ball und
   Gegner.
6. Ergebnisbildschirm nach einem 3+1-Block nennt das 3+1, nicht die Raute; 7 von 10 ergibt
   dieselbe Medaille wie bisher.
7. Lösungskreise sind bei 360 px Breite lesbar (Schrift ≥ 11,5 px), hell und dunkel.
8. Taktikbrett „3+1“ zeigt Torwart, zwei Flitzer und Jäger, keinen Aufpasser; ein gespeichertes
   3+1-Brett auf dem Gerät öffnet ohne Fehler.
9. Ganze Prüfreihe grün.

## Testfälle

- Kind mit gespeichertem Fortschritt „Grundlagen der Raute 8/10“ öffnet nach dem Update die
  Blockübersicht → Sticker für „Grundlagen der Raute“ bleibt.
- FUNiño-Block durchspielen, alle überspringen → Ergebnis 0 von 10, keine Medaille, kein
  Absturz, Feld danach wieder 4+1-Board.
- Szenario „FUNiño – Eingewechselt“: Flitzer R startet am Rand (x 96) und lässt sich ins Feld
  ziehen; Ablegen bei x > 97 wird wie bisher auf 97 begrenzt.
- Szenario „3+1 – Drei Tore hinten“: der Aufpasser startet an der Mittellinie außen und ist
  der einzige Aufpasser-Stein im 3+1-Block.
- Vorlesen-Knopf bei Szenario 101 und bei Szenario 43 ohne Aufnahme → Gerätestimme, kein Fehler.
