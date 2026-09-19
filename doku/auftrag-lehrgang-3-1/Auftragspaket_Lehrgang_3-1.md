# Auftragspaket: Übung und Skizze zur Lehrgangsabgabe 3.1

Repo `SV-Adler-Dellbrueck/u9-app`, Stand 19.09.2026 (App v582). Gilt zusammen mit `CLAUDE.md`
und `Projektgedaechtnis/skizzen-format.md` im privaten Repo.

> **Status: offen.** Entstanden im Projekt-Chat. Zusammengeführt wird auf Charles' Wort.

## Ausgangslage

Abgabe 3.1 im DFB-Basis-Coach verlangt eine Trainingsform von (TW +) 1 gegen 1 bis
(TW +) 3 gegen 3 mit Grafik. Die Grafik soll wie bei 2.1 und 2.2 **in der App entstehen**, nicht
extern. Die Textfassung der Abgabe ist fertig; dieses Paket liefert Übung, Skizze und Bilder.

Die Form: Raute mit dem Torwart als Aufpasser, Flitzer links und rechts in je einem Korridor,
Jäger vorn, Dummys statt Gegenspieler, Zieltor liegt flach. Leitfrage 4 („Wie kriege ich den Ball
zu einem, der frei ist?“), 30-Minuten-Block, kein ganzes Training — deshalb **keine Vorlage**.

## Der Nachtrag

`nachtrag.json` in diesem Ordner, Schema `adler-uebungen/1`, eine Übung. Anhängen an das
`uebungen`-Array in `uebungen/bibliothek.json`, `stand` hochsetzen (ohne neuen Stand holt der
Abgleich die Datei nicht).

## Absicht der Zeichnung

Hochkant, zwei Bilder, Schrittnummern über beide Bilder fortlaufend.

- **Aufbau (beide Bilder):** Feld als Zone; oben das Zieltor (Jugendtor — dass es flach liegt,
  steht im Text, die Skizze kennt kein liegendes Tor), unten das Starttor. Je fünf Teller an
  beiden Korridorgrenzen (x 47 und x 133) von der Grundlinie bis etwa 8 m vor dem Starttor. Je
  ein Dummy im Korridor rund 3 m vor dem Flitzer. Das Trainer-Symbol steht vor dem Zieltor, weil
  der Trainer dort in Steigerung 3 verteidigt.
- **Spieler:** `A` Aufpasser (vom Torwart gespielt, deshalb vor dem Starttor), `FL` und `FR`
  in ihren Korridoren, `J` vorn in der Mitte. Alle grün — es gibt keine Gegenspieler.
- **Bild 1, Phase 1 (Schritte 1–4):** Pass A auf FL, A schiebt zur Ballseite, Rückpass,
  A dribbelt zurück zum Ausgangspunkt.
- **Bild 2, Phase 2 (Schritte 5–9):** Pass A auf FR (5); **A schiebt auf seiner Linie nach
  rechts** (6), damit er anspielbar bleibt — wie in Phase 1 nach links (Charles, 19.09.2026);
  FR dribbelt außen am Dummy vorbei zur Grundlinie (7). Der Pass auf J und die beiden Laufwege
  — FL im Korridor, A in der Mitte — passieren **gleichzeitig und tragen alle die 8**. Der
  Abschluss des Jägers ist die 9, er folgt dem Pass und bleibt deshalb eine eigene Nummer.
- **Der Ball** liegt in Bild 2 links von A: Rechts verliefe der Schiebeweg über ihn hinweg.

Die Spieler stehen in beiden Bildern gleich — Phase 2 beginnt dort, wo Phase 1 endet. Bewegung
zeigen die Pfeile, nicht das Abspielen.

## Auftrag

1. `nachtrag.json` **vorher** mit `_euPruefung` und die Skizze mit `_eiSkizzeFehler` prüfen und
   melden, was beanstandet wird, bevor geschrieben wird. Koordinaten dürfen angepasst werden,
   wenn Pfeile, Nummernkreise, Teller oder Dummy im gerenderten Bild kollidieren — die Absicht
   oben bleibt.
2. Übung anhängen, `stand` hochsetzen. Übungsart `spielform` in `UEBUNG_ART_VORSCHLAG` eintragen
   (beschlossen, siehe unten).
3. Bilder erzeugen über `export-skizzen.js` mit `bilder:true`: je Bild SVG und PNG mit Legende,
   `raute-torwart-andere-fluegel-bild-1` und `-bild-2`. **Ablage im privaten Repo**
   `adler-u9-wissen` unter `Projektgedaechtnis/skizzen/aufgabe-3-1/` — der Projekt-Chat holt sie
   dort ab und setzt sie in die Abgabe `Huetten_Aufgabe_3.1`. Im öffentlichen Repo bleibt nur die
   Beschreibung; die Bilder sind jederzeit aus ihr neu erzeugbar.
4. Prüffall in `tests/checks/` mit der Version, aus der er stammt: Abgleich legt die Übung an
   und überspringt den Bestand; beide Bilder rendern; Spielerabstand ≥ 24; Materialliste nennt
   2 Jugendtore, 10 Teller, 2 Dummys, 1 Ball, kein Trainer.
5. `node tests/run.js` grün, dann `sw.js` hochzählen, Funktionsübersicht mitziehen, PR als
   Entwurf. Danach `Projektgedaechtnis/stand.md` im privaten Repo nachziehen und dort vermerken,
   dass die Bilder für 3.1 bereitliegen.

## Entscheidungen

- **Übungsart: `spielform`** (Charles, 19.09.2026). Empfohlen war `uebungsform`, weil die Form
  ohne Gegenspieler auskommt und der Trainer erst in Steigerung 3 verteidigt. Charles ordnet sie
  als Spielform ein, wie sie auch in der Abgabe heißt. Nicht erneut vorschlagen.

## Offen

- **Tellerzahl:** Die Skizze zeichnet 10, die Abgabe nennt „etwa 24“ für den echten Aufbau. Die
  Skizze ist schematisch; das bleibt so, außer Charles will die Zahlen gleich.

## Nicht in diesem Paket

Kein neuer App-Code, keine Vorlage, keine Kindernamen, kein liegendes Tor als neues Symbol.
