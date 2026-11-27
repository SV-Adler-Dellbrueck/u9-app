# Auftragspaket: Übung und Skizze zur C-Lizenz-Abgabe 3.1 (Zwei-Seiten-Spiel)

Repo `SV-Adler-Dellbrueck/u9-app`, Stand 27.11.2026. Gilt zusammen mit `CLAUDE.md` und
`Projektgedaechtnis/skizzen-format.md` im privaten Repo.

> **Status: Teil 1 erledigt** (Übung in der App, Bild unter `Projektgedaechtnis/skizzen/aufgabe-c-3-1/`,
> App v832). **Nachtrag 3 erledigt** (15.11.2026, v833: die drei Felder direkt in der Datenbank ersetzt, Zeile vorher gesichert; Bibliothek gleichgezogen, Stand 2026-11-15-2). Nachtrag 2 ist darin aufgegangen.
> **Nachtrag 4 erledigt** (27.11.2026) in v988: Weg wie v833 – Zeile 84 gesichert, die sieben Felder und die Skizze in der
> Datenbank ersetzt, `uebungen/bibliothek.json` gleichgezogen (Stand 2026-11-27-2). Die Kurzfassung (`ablauf`, 998 Zeichen)
> hat das Projekt gekürzt und wurde wörtlich übernommen; die Fassung aus Nachtrag 4 steht als `ablauf_lang`. Bild neu exportiert.
> Nicht zu verwechseln mit `auftrag-lehrgang-3-1/` (Basis-Coach 3.1, erledigt).
> Dies ist Aufgabe 3.1 der C-Lizenz (Profil Jugend), deshalb eigener Ordner.

## Nachtrag 4 (27.11.2026): Mittelkorridor, Aus-Regel, Startordnung, Spielerzahl – neue Skizze

Bei der Durchsicht vor der Vorstellung sind Lücken aufgefallen, die Charles schließen will:

- **Schein-Seitenwechsel:** Ein kurzer Pass quer über die Mittellinie zählte nach dem Wortlaut
  als Seitenwechsel, ohne dass verlagert wurde. Jetzt gibt es einen **5 m breiten Korridor**
  längs durch die Mitte. Ein Seitenwechsel gilt nur, wenn der Pass außerhalb des Korridors
  gespielt und auf der anderen Seite außerhalb angenommen wird (Steuerung über Linien).
- **Aus** war nicht geregelt: Der Trainer bringt sofort einen neuen Ball für das Team, das ihn nicht
  zuletzt berührt hat. Der Trainer ruft gültige Seitenwechsel laut („Wechsel!“).
- **Startordnung Raute**, danach freies Spiel.
- **Spielerzahl 7–9:** bei 9 ein Joker, bei 7 ein Team zu dritt.
- **Trainerposition** jetzt hinter einer Grundlinie am Ende des Korridors (zwischen den Toren),
  weil er von dort den Korridor entlang sieht. Die alte Skizze hatte ihn an der Seitenlinie, der
  Text an der „Mittellinie außen“ – das passte nicht zusammen.

**Geändert in `nachtrag.json`:** `kurz`, `spieler`, `feld`, `ablauf`, `varianten`, `coaching`
und die **Skizze** (zweite Zone als Korridor statt `li`, 8 Hütchen, Trainer bei x = 13, Gegner
leicht verschoben, Beschriftung „Korridor 5 m“). Die Skizze ist im Projekt-Chat mit dem
Exportskript gegen die App gerendert und geprüft: `_eiSkizzeFehler` leer, `skzSpecSaeubern`
inhaltlich unverändert (nur Feldreihenfolge), Spielerabstand mindestens 30, Materialliste
4 Minitore · 8 Hütchen · 1 Ball. Wie bei Nachtrag 3 gilt: Der Abgleich überschreibt nie –
derselbe Weg wie v833 (Zeile sichern, Felder in der Datenbank ersetzen, Bibliothek gleichziehen).

## Nachtrag 3 (14.11.2026): ausführlicher Übungstext

Die Abgabe ist ausführlicher geworden, damit auch Externe die Form ohne Erklärung durchführen
können: Ziel nach festem Muster („Ziel ist die Verbesserung von …"), Regeln eindeutig (beide Teams
greifen an und verteidigen, Mittellinie ist nur Markierung, nach Ballgewinn wird sofort
weitergespielt, Seitenwechsel in jedem Ballbesitz neu), Coaching mit typischen Fehlern und
Eingriff, Varianten mit Begründung, Materialliste. Text der Abgabe und Übungstext in der App sind
derselbe Text, deshalb müssen die Felder **`ablauf`, `varianten` und `coaching`** der Übung
„Lehrgang – Zwei-Seiten-Spiel" vollständig durch die Fassung in `nachtrag.json` ersetzt werden.
Alle anderen Felder und die Skizze bleiben unverändert.

**Achtung:** Der Abgleich überspringt Übungen, deren Name schon existiert, und überschreibt nie.
Die Übung steht seit v832 in der App. Ein geänderter Eintrag in `uebungen/bibliothek.json` allein
kommt also nicht an. Claude Code entscheidet, auf welchem Weg der Text in den Bestand gelangt
(Datenweg vor Codeänderung), und meldet das vorher. Abnahme: `export/uebungen.md` im privaten
Repo zeigt nach dem nächsten Nachtlauf die drei Felder wörtlich wie in `nachtrag.json`.

## Ausgangslage

Aufgabe 3.1 „Trainingsform erstellen" (C-Lizenz, Gruppenarbeit im Zweier-/Dreierteam):
gruppentaktisches Offensivthema und Trainingsziel als Blogbeitrag, dazu eine Spielform von
4 gegen 4 bis 6 gegen 6 als Dokument nach der FVM-Vorlage (Pptx). Die Skizze soll wie bei den
Basis-Coach-Abgaben **in der App entstehen**. Die Form ist für die U9 nicht gedacht, deshalb steht
„Lehrgang" im Namen.

Die Form: **Zwei-Seiten-Spiel**, 4 gegen 4, Thema Spielverlagerung. Feld 36 x 24 m mit 5 m breitem
Korridor längs durch die Mitte, an jeder Grundlinie zwei Minitore im Abstand von etwa 12 m.
Geschossen werden darf erst nach einem Seitenwechsel im laufenden Ballbesitz (Pass von außerhalb
des Korridors, Annahme auf der anderen Seite außerhalb). Kein Torwart, 4 Durchgänge à 3 Minuten.

## Der Nachtrag

`nachtrag.json` in diesem Ordner, Schema `adler-uebungen/1`, eine Übung, Kategorie `passspiel`.
Übungsart `spielform` (wie beim Basis-Coach-Paket beschlossen). Keine Vorlage.

## Absicht der Zeichnung (Stand Nachtrag 4)

Quer, **ein Bild**, Schrittnummern 1 bis 3 direkt an den Pfeilen.

- **Aufbau:** Feld als Zone, Korridor als zweite Zone (y 76–104), vier Minitore (je zwei an den
  Grundlinien), acht Hütchen (vier Ecken, vier an den Korridorenden), Trainer-Symbol links hinter
  der Grundlinie am Korridorende.
- **Spieler:** Grün (A, B, C, D) greift nach rechts an, Rot (vier Gegner, ohne Kürzel) verteidigt
  die beiden rechten Minitore und überlädt die untere, ballnahe Seite.
- **Ablauf der Pfeile:** 1 Pass A auf B (kurz, unten). 2 Verlagerungspass B auf D diagonal über
  den Korridor auf die freie obere Seite. 3 Schuss D aufs obere rechte Minitor.
- **Beschriftung:** „Korridor 5 m“ links im Korridor, frei von Pfeil 2.

## Auftrag (Teil 1, erledigt)

1. Prüfung mit `_euPruefung` und `_eiSkizzeFehler`, Koordinaten angepasst.
2. Übung angehängt, `stand` hochgesetzt, Übungsart `spielform`.
3. Bild über `exportSkizzen` erzeugt und unter `Projektgedaechtnis/skizzen/aufgabe-c-3-1/` abgelegt.
4. Prüffall in `tests/checks/`.
5. Tests grün, `sw.js` hochgezählt, Funktionsübersicht, PR.

## Entscheidungen

- Mittelkorridor 5 m, Aus-Regel mit „Wechsel!“-Ruf, Startordnung Raute, Spielerzahl 7–9, Trainer
  am Korridorende (Charles, 27.11.2026).
- Thema Spielverlagerung als Zwei-Seiten-Spiel, 4 gegen 4 (Charles, 13.11.2026).
- Name enthält „Lehrgang", weil die Form nicht für die U9 taugt.
- Die gruppentaktischen Prinzipien werden aus den offensiven Leitlinien 2, 3 und 4 der
  DFB-Spielvision abgeleitet (Charles, 14.11.2026).
- Für Trainingsplanung gilt: Ziel immer als „Ziel ist die Verbesserung von …", Anleitung so
  ausführlich, dass Externe sie verstehen, Coaching mit Korrekturen und Varianten ausführlich
  (Charles, 14.11.2026).

## Nicht in diesem Paket

Kein neuer App-Code, keine Vorlage, keine Kindernamen.
