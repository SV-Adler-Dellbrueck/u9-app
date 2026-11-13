# Auftragspaket: Übung und Skizze zur C-Lizenz-Abgabe 3.1 (Zwei-Seiten-Spiel)

Repo `SV-Adler-Dellbrueck/u9-app`, Stand 13.11.2026. Gilt zusammen mit `CLAUDE.md` und
`Projektgedaechtnis/skizzen-format.md` im privaten Repo.

> **Status: offen.** Nicht zu verwechseln mit `auftrag-lehrgang-3-1/` (Basis-Coach 3.1, erledigt).
> Dies ist Aufgabe 3.1 der C-Lizenz (Profil Jugend), deshalb eigener Ordner.

## Ausgangslage

Aufgabe 3.1 „Trainingsform erstellen" (C-Lizenz, Gruppenarbeit im Zweier-/Dreierteam):
gruppentaktisches Offensivthema und Trainingsziel als Blogbeitrag, dazu eine Spielform von
4 gegen 4 bis 6 gegen 6 als Dokument nach der FVM-Vorlage (Pptx). Die Skizze soll wie bei den
Basis-Coach-Abgaben **in der App entstehen**. Die Form ist für die U9 nicht gedacht, deshalb steht
„Lehrgang" im Namen.

Die Form: **Zwei-Seiten-Spiel**, 4 gegen 4, Thema Spielverlagerung. Feld 36 x 24 m mit längs
durchlaufender Mittellinie, an jeder Grundlinie zwei Minitore im Abstand von etwa 12 m. Geschossen
werden darf erst, wenn der Ball nach Ballgewinn mindestens einmal per Pass die Mittellinie
überquert hat. Kein Torwart, 4 Durchgänge à 3 Minuten.

## Der Nachtrag

`nachtrag.json` in diesem Ordner, Schema `adler-uebungen/1`, eine Übung, Kategorie `passspiel`.
Anhängen an das `uebungen`-Array in `uebungen/bibliothek.json`, `stand` hochsetzen. Übungsart
`spielform` (wie beim Basis-Coach-Paket beschlossen). Keine Vorlage.

## Absicht der Zeichnung

Quer, **ein Bild**, Schrittnummern 1 bis 3 direkt an den Pfeilen.

- **Aufbau:** Feld als Zone, Mittellinie (`li` `m`) längs bei y = 90, vier Minitore (je zwei an
  den Grundlinien, links x = 26, rechts x = 254), sechs Hütchen (vier Ecken, zwei Enden der
  Mittellinie), Trainer-Symbol an der Mittellinie unten außerhalb des Felds. Dass die Tore hochkant
  stehen, kommt aus der Blickrichtung der Grundlinie.
- **Spieler:** Grün (A, B, C, D) greift nach rechts an, Rot (vier Gegner, ohne Kürzel) verteidigt
  die beiden rechten Minitore und überlädt die untere, ballnahe Seite.
- **Ablauf der Pfeile:** 1 Pass A auf B (kurz, unten). 2 Verlagerungspass B auf D diagonal über
  die Mittellinie auf die freie obere Seite. 3 Schuss D aufs obere rechte Minitor.
- **Beschriftung:** „Seitenwechsel Pflicht vor jedem Torschuss" auf der Mittellinie.

## Auftrag

1. `nachtrag.json` **vorher** mit `_euPruefung` und die Skizze mit `_eiSkizzeFehler` prüfen und
   melden, was beanstandet wird, bevor geschrieben wird. Koordinaten dürfen angepasst werden, wenn
   Pfeile, Nummernkreise oder Tore im gerenderten Bild kollidieren. **Besonders prüfen:** ob die
   Minitore bei x = 26/254 am Feldrand richtig sitzen (Tor-Mittelpunkt gegen Zonenkante) und ob der
   Pfeil 2 nicht durch einen Gegnerkreis läuft.
2. Übung anhängen, `stand` hochsetzen, Übungsart `spielform` eintragen.
3. Bild erzeugen über `exportSkizzen` aus `doku/auftrag-lehrgangsskizzen/export-skizzen.js`
   (`bilder:true`): SVG und PNG mit Legende, Slug `zwei-seiten-spiel`. Ablage im privaten Repo
   `adler-u9-wissen` unter `Projektgedaechtnis/skizzen/aufgabe-c-3-1/`. Im öffentlichen Repo bleibt
   nur die Beschreibung.
4. Prüffall in `tests/checks/` mit der Version, aus der er stammt: Abgleich legt die Übung an und
   überspringt den Bestand; Skizze rendert; Spielerabstand mindestens 24; Materialliste nennt
   4 Minitore, 6 Hütchen, 1 Ball, kein Trainer.
5. `node tests/run.js` grün, dann `sw.js` hochzählen, Funktionsübersicht mitziehen, PR als
   Entwurf. Danach `Projektgedaechtnis/stand.md` im privaten Repo nachziehen und vermerken, dass
   das Bild für C-3.1 bereitliegt.

## Entscheidungen

- Thema Spielverlagerung als Zwei-Seiten-Spiel, 4 gegen 4 (Charles, 13.11.2026).
- Name enthält „Lehrgang", weil die Form nicht für die U9 taugt.

## Offen

- Gruppentaktische Prinzipien der DFB-Leitlinien: Quelle liegt im Projekt noch nicht vor, betrifft
  nur den Text der Abgabe, nicht die App.

## Nicht in diesem Paket

Kein neuer App-Code, keine Vorlage, keine Kindernamen.
