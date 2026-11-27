# Auftragspaket: Übung und Skizze zur C-Lizenz-Abgabe 4.2 (Zwei-Seiten-Spiel verteidigen)

Repo `SV-Adler-Dellbrueck/u9-app`, Stand 27.11.2026. Gilt zusammen mit `CLAUDE.md` und
`Projektgedaechtnis/skizzen-format.md` im privaten Repo.

> **Status: offen.** Aufgabe 4.2 der C-Lizenz (Profil Jugend). Defensives Gegenstück zu
> `auftrag-lehrgang-c-3-1/`.

## Ausgangslage

Aufgabe 4.2 „Trainingsform erstellen“ (C-Lizenz, Gruppenarbeit, Team wie bei 3.1):
gruppentaktisches Defensivthema und Trainingsziel als Blogbeitrag, dazu je eine Spielform zu einem
gruppentaktischen defensiven Schwerpunkt von 4 gegen 4 bis 6 gegen 6 als Dokument nach der
FVM-Vorlage (Pptx). Die Skizze entsteht in der App. Die Form ist nicht für die U9 gedacht,
deshalb steht „Lehrgang“ im Namen.

Die Form: **Zwei-Seiten-Spiel verteidigen**, 4 gegen 4, Thema ballorientiertes Verschieben.
Gleicher Aufbau wie das Zwei-Seiten-Spiel (36 x 24 m, Mittellinie längs, vier Minitore), aber
feste Rollen: Grün greift an und bekommt für ein Tor nach Seitenwechsel 2 Punkte, Rot verteidigt
und punktet mit Ballgewinn und Konter.

## Der Nachtrag

`nachtrag.json` in diesem Ordner, Schema `adler-uebungen/1`, eine Übung, Kategorie `pressing`
(aus `EI_KATS`; wenn Claude Code eine andere vorhandene Kategorie für passender hält, vorher
melden). Übungsart `spielform`. Mit `ablauf_lang` (zwölf Überschriften) und `kurz` unter
80 Zeichen. Keine Vorlage.

## Absicht der Zeichnung

Quer, **ein Bild**, Schrittnummern 1 bis 3 an den Laufwegen. Aufbau identisch mit dem
Zwei-Seiten-Spiel, damit beide Bilder in der Abgabe nebeneinander lesbar sind.

- **Spieler:** Grün (A, B, C, D) greift nach rechts an, B hat den Ball unten links der Mitte.
  C und D stehen oben auf der freien Seite. Rot (vier Gegner, ohne Kürzel) hat zur unteren
  Ballseite verschoben.
- **Laufwege (`l`):** 1 Der nächste Rote läuft B im Bogen von der Mittellinie her an
  (Deckungsschatten auf den Pass zu D). 2 Der ballfernste Rote rückt von oben bis an die
  Mittellinie ein. 3 Ein Roter sichert diagonal hinter dem Anlaufenden.
- **Beschriftung:** „Ballseite zu – Verlagerung verhindern“ auf der Mittellinie links.

## Auftrag

1. `nachtrag.json` **vorher** mit `_euPruefung` und die Skizze mit `_eiSkizzeFehler` prüfen und
   melden, was beanstandet wird. Koordinaten dürfen angepasst werden. **Besonders prüfen:**
   Spielerabstand mindestens 24 (D zum oberen Roten, B zum Endpunkt von Pfeil 1), ob die
   Nummernkreise sichtbar sind und ob die Beschriftung den Spieler C berührt.
2. Übung anhängen, `stand` hochsetzen, Übungsart `spielform`.
3. Bild über `exportSkizzen` (`doku/auftrag-lehrgangsskizzen/export-skizzen.js`, `bilder:true`):
   SVG und PNG mit Legende, Slug `zwei-seiten-spiel-verteidigen`. Ablage im privaten Repo
   `adler-u9-wissen` unter `Projektgedaechtnis/skizzen/aufgabe-c-4-2/`.
4. Prüffall in `tests/checks/`.
5. `node tests/run.js` grün, `sw.js` hochzählen, Funktionsübersicht, PR als Entwurf.
6. Im privaten Repo `Projektgedaechtnis/stand.md` (Abschnitt Trainerkonzept) und
   `entscheidungen.md` nachziehen, vermerken, dass Drive noch nachzuziehen ist.

## Entscheidungen

- Thema ballorientiertes Verschieben als defensives Gegenstück zum Zwei-Seiten-Spiel,
  4 gegen 4, feste Rollen (Charles, 27.11.2026).
- Die gruppentaktischen Prinzipien werden aus den defensiven Leitlinien 1, 2 und 3 der
  DFB-Spielvision abgeleitet.
- Zwei weitere Themen für die Teamkollegen: Gegenpressing nach Ballverlust (Leitlinien 3 und 5)
  und Tor verteidigen nah am Gegenspieler (Leitlinie 4). Deren Formen kommen bei Bedarf als
  eigener Nachtrag in diesen Ordner.

## Nicht in diesem Paket

Kein neuer App-Code, keine Vorlage, keine Kindernamen.
