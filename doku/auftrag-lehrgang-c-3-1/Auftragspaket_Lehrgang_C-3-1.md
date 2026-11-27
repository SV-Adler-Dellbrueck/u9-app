# Auftragspaket: Übung und Skizze zur C-Lizenz-Abgabe 3.1 (Zwei-Seiten-Spiel)

Repo `SV-Adler-Dellbrueck/u9-app`, Stand 27.11.2026. Gilt zusammen mit `CLAUDE.md` und
`Projektgedaechtnis/skizzen-format.md` im privaten Repo.

> **Status: Teil 1 erledigt** (Übung in der App, Bild unter `Projektgedaechtnis/skizzen/aufgabe-c-3-1/`,
> App v832). **Nachtrag 3 erledigt** (15.11.2026, v833: die drei Felder direkt in der Datenbank ersetzt, Zeile vorher gesichert; Bibliothek gleichgezogen, Stand 2026-11-15-2). Nachtrag 2 ist darin aufgegangen.
> **Nachtrag 4 erledigt** (27.11.2026) in v988: Weg wie v833 – Zeile 84 gesichert, die sieben Felder und die Skizze in der
> Datenbank ersetzt, `uebungen/bibliothek.json` gleichgezogen (Stand 2026-11-27-2). Die Kurzfassung (`ablauf`, 998 Zeichen)
> hat das Projekt gekürzt und wurde wörtlich übernommen; die Fassung aus Nachtrag 4 steht als `ablauf_lang`. Bild neu exportiert.
> **Nachtrag 5 offen** (27.11.2026), siehe unten.
> Nicht zu verwechseln mit `auftrag-lehrgang-3-1/` (Basis-Coach 3.1, erledigt).
> Dies ist Aufgabe 3.1 der C-Lizenz (Profil Jugend), deshalb eigener Ordner.

## Nachtrag 5 (27.11.2026): Bezug zu den DFB-Leitlinien, Markierungsscheiben am Korridor

Zwei neue Grundsätze von Charles (27.11.2026) werden auf 3.1 angewandt:

- **DFB-Leitlinien immer berücksichtigen**, im Wortlaut des Lehrgangs-Handouts (übergeordnet, offensiv, defensiv).
  Das Coaching trägt jetzt einen Block „Bezug zu den DFB-Leitlinien“ (offensiv 1–4, übergeordnet: aktiv gestalten,
  antizipieren statt spekulieren, gegenseitig coachen, unter Zeit-/Raum-/Gegnerdruck die beste Lösung finden). Die
  Abschnitte „Gruppentaktische Prinzipien“ und „Übertragung ins Spiel“ sind darin aufgegangen. Neuer Coachingpunkt
  „Gegenseitig coachen: Der freie Spieler fordert den Ball laut an („Hier!“)“.
- **Korridore und Markierungen im Feld mit Markierungsscheiben**, Hütchen nur an den Ecken (wie v989 bei „Drei Bahnen“).
  Skizze: 4 Hütchen an den Ecken, 8 Teller auf den Korridorlinien (x 30/95/185/250, Lücke in der Mitte wegen Pfeil 2).

**Geändert in `nachtrag.json`:** `ablauf` (Kurzfassung, „Hütchenlinien“ → „Scheibenlinien“, „laut“ gestrichen; **994
Zeichen**), `ablauf_lang`, `varianten` (leichter gekürzt), `coaching`, `skizze`. `kurz`, `feld`, `spieler` bleiben.
Im Projekt-Chat mit dem Exportskript gerendert und geprüft: `_eiSkizzeFehler` leer, Materialliste 4 Minitore ·
4 Hütchen · 8 Markierungsteller · 1 Ball. Weg wie v833/v988 (Zeile sichern, Felder und Skizze in der Datenbank
ersetzen, Bibliothek gleichziehen).

**Fehler im Exportskript gefunden:** In der Legende wird „Markierungsteller“ rechts abgeschnitten (Bild 1120 px breit,
dritte Spalte der ersten Zeile). Betrifft vermutlich auch die Bilder zu 4.2. Bitte im Export beheben (Umbruch oder
andere Spaltenaufteilung), dann die betroffenen Bilder neu erzeugen.

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
  weil er von dort den Korridor entlang sieht.

## Nachtrag 3 (14.11.2026): ausführlicher Übungstext

Ziel nach festem Muster („Ziel ist die Verbesserung von …"), Regeln eindeutig, Coaching mit typischen Fehlern und
Eingriff, Varianten mit Begründung, Materialliste. Der Abgleich überspringt Übungen, deren Name schon existiert, und
überschreibt nie – deshalb der Weg über die Datenbank (v833).

## Ausgangslage

Aufgabe 3.1 „Trainingsform erstellen" (C-Lizenz, Gruppenarbeit im Zweier-/Dreierteam):
gruppentaktisches Offensivthema und Trainingsziel als Blogbeitrag, dazu eine Spielform von
4 gegen 4 bis 6 gegen 6 als Dokument nach der FVM-Vorlage (Pptx). Die Skizze entsteht **in der App**.
Die Form ist für die U9 nicht gedacht, deshalb steht „Lehrgang" im Namen.

Die Form: **Zwei-Seiten-Spiel**, 4 gegen 4, Thema Spielverlagerung. Feld 36 × 24 m mit 5 m breitem
Korridor längs durch die Mitte (Markierungsscheiben), an jeder Grundlinie zwei Minitore im Abstand von
etwa 12 m. Geschossen werden darf erst nach einem Seitenwechsel im laufenden Ballbesitz. Kein Torwart,
4 Durchgänge à 3 Minuten.

## Der Nachtrag

`nachtrag.json` in diesem Ordner, Schema `adler-uebungen/1`, eine Übung, Kategorie `passspiel`.
Übungsart `spielform`. Keine Vorlage.

## Absicht der Zeichnung (Stand Nachtrag 5)

Quer, **ein Bild**, Schrittnummern 1 bis 3 direkt an den Pfeilen.

- **Aufbau:** Feld als Zone, Korridor als zweite Zone (y 76–104), vier Minitore (je zwei an den
  Grundlinien), vier Hütchen an den Ecken, acht Markierungsteller auf den Korridorlinien, Trainer-Symbol
  links hinter der Grundlinie am Korridorende.
- **Spieler:** Grün (A, B, C, D) greift nach rechts an, Rot (vier Gegner, ohne Kürzel) verteidigt
  die beiden rechten Minitore und überlädt die untere, ballnahe Seite.
- **Ablauf der Pfeile:** 1 Pass A auf B (kurz, unten). 2 Verlagerungspass B auf D diagonal über
  den Korridor auf die freie obere Seite. 3 Schuss D aufs obere rechte Minitor.
- **Beschriftung:** „Korridor 5 m“ links im Korridor, frei von Pfeil 2.

## Entscheidungen

- Bezug zu den DFB-Leitlinien (übergeordnet und offensiv) im Coaching, Korridor mit Markierungsscheiben,
  Hütchen nur an den Ecken (Charles, 27.11.2026).
- Mittelkorridor 5 m, Aus-Regel mit „Wechsel!“-Ruf, Startordnung Raute, Spielerzahl 7–9, Trainer
  am Korridorende (Charles, 27.11.2026).
- Thema Spielverlagerung als Zwei-Seiten-Spiel, 4 gegen 4 (Charles, 13.11.2026).
- Name enthält „Lehrgang", weil die Form nicht für die U9 taugt.
- Für Trainingsplanung gilt: Ziel immer als „Ziel ist die Verbesserung von …", Anleitung so
  ausführlich, dass Externe sie verstehen, Coaching mit Korrekturen und Varianten ausführlich
  (Charles, 14.11.2026).

## Nicht in diesem Paket

Kein neuer App-Code außer der Legendenkorrektur im Export, keine Vorlage, keine Kindernamen.
