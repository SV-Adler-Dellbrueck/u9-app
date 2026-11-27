# Auftragspaket: Vier Übungen und Skizzen zur C-Lizenz-Abgabe 4.2 (defensive Spielformen)

Repo `SV-Adler-Dellbrueck/u9-app`, Stand 27.11.2026. Gilt zusammen mit `CLAUDE.md` und
`Projektgedaechtnis/skizzen-format.md` im privaten Repo.

> **Status: offen.** Aufgabe 4.2 der C-Lizenz (Profil Jugend). Defensives Gegenstück zu
> `auftrag-lehrgang-c-3-1/`.

## Ausgangslage

Aufgabe 4.2 „Trainingsform erstellen“ (C-Lizenz, Gruppenarbeit, Team wie bei 3.1):
gruppentaktisches Defensivthema und Trainingsziel als Blogbeitrag, dazu jeweils eine Spielform zu
einem gruppentaktischen defensiven Schwerpunkt, 4 gegen 4 bis 6 gegen 6, als Dokument nach der
FVM-Vorlage (Pptx). Vier Formen mit vier Schwerpunkten. Die Skizzen entstehen in der App. Die
Formen sind nicht für die U9 gedacht, deshalb steht „Lehrgang“ im Namen.

| Übung | Schwerpunkt | Format | Leitlinien | Datei |
|---|---|---|---|---|
| Lehrgang – Zwei-Seiten-Spiel verteidigen | Verschieben und Verdichten | 4 gegen 4, Minitore | 1, 2, 3 | nachtrag.json |
| Lehrgang – Fünf-Sekunden-Jagd | Gegenpressing nach Ballverlust | 5 gegen 5, Endzonen | 1, 3, 5 | nachtrag.json |
| Lehrgang – Erster attackiert, Zweiter sichert | Anlaufen und Sichern | 4 gegen 4, Dribbeltore | 2, 3, 4 | nachtrag.json |
| Lehrgang – Drei Bahnen, klare Zuständigkeit | Übergeben und Übernehmen | 6 gegen 6, drei Minitore | 1, 2, 4 | nachtrag-4.json |

## Der Nachtrag

`nachtrag.json` (drei Übungen) und `nachtrag-4.json` (eine Übung) in diesem Ordner, Schema
`adler-uebungen/1`, Kategorie jeweils `pressing` (aus `EI_KATS`; andere vorhandene Kategorie nur
nach Rückmeldung). Übungsart `spielform`. Mit `ablauf_lang` (zwölf Überschriften) und `kurz`
unter 80 Zeichen. Keine Vorlage.

## Absicht der Zeichnungen

Alle quer, je **ein Bild**, Schrittnummern an den Laufwegen (`l`). Grün mit Kürzeln, Rot ohne.

**1 Zwei-Seiten-Spiel verteidigen.** Aufbau identisch mit dem Zwei-Seiten-Spiel. Grün greift nach
rechts an, B hat den Ball unten, C und D stehen oben auf der freien Seite. Rot hat zur unteren
Ballseite verschoben. 1 Der nächste Rote läuft B im Bogen von der Mittellinie her an
(Deckungsschatten auf den Pass zu D). 2 Der ballfernste Rote rückt bis an die Mittellinie ein.
3 Ein Roter sichert diagonal hinter dem Anlaufenden. Text „Ballseite zu – Verlagerung verhindern“.

**2 Fünf-Sekunden-Jagd.** Feld mit zwei Endzonen als Zonen, Mittellinie quer (senkrecht im Bild).
Moment direkt nach dem Ballverlust von Grün: Der rote Spieler in der Mitte rechts hat den Ball
gerade erobert. 1 A attackiert ihn sofort. 2 B rückt nach und doppelt von unten. 3 C stellt den
kurzen Rückpass zum rechten Roten zu. E bleibt als Absicherung hinter dem Ball. Text oben über
dem Feld „Ballverlust: 5 Sekunden zurückerobern“.

**3 Erster attackiert, Zweiter sichert.** Vier Dribbeltore (`dtor`) auf Hütchen, je zwei an den
Grundlinien. B dribbelt auf das untere rechte Tor zu. 1 Der erste Rote läuft B an. 2 Der zweite
Rote sichert diagonal dahinter. Text oben „Erster attackiert – Zweiter sichert“.

**4 Drei Bahnen, klare Zuständigkeit.** Zwei Hütchenreihen (keine `li`, weil `m` und `sz` in der
Legende als Mittellinie bzw. Schusszone erscheinen würden) teilen das Feld in drei Bahnen. Drei
Minitore rechts, eins pro Bahn. Rot steht zu zweit in jeder Bahn. D hat den Ball in der Mitte.
1 C läuft aus der mittleren in die untere Bahn. 2 Ein Roter der unteren Bahn übernimmt ihn, der
Rote der Mitte bleibt in seiner Bahn. Text oben „Bahnwechsel: übergeben – übernehmen“.

## Auftrag

1. Beide Nachträge **vorher** mit `_euPruefung` und alle vier Skizzen mit `_eiSkizzeFehler`
   prüfen und melden, was beanstandet wird. Koordinaten dürfen angepasst werden. **Besonders
   prüfen:** Spielerabstände mindestens 24, Sichtbarkeit der Nummernkreise, ob die Texte oben
   bei y = 13 noch auf der Zeichenfläche liegen, ob die `dtor`-Koordinaten bei Übung 3 als
   Mittelpunkt oder Anfang gelesen werden und die Tore an der Grundlinie sitzen, ob sich die
   Endzonen-Zonen bei Übung 2 mit der Feldzone sauber decken, ob bei Übung 4 Pfeil 1 durch das
   Hütchen bei (140, 113) läuft.
2. Übungen anhängen, `stand` hochsetzen, Übungsart `spielform`.
3. Bilder über `exportSkizzen` (`doku/auftrag-lehrgangsskizzen/export-skizzen.js`, `bilder:true`):
   SVG und PNG mit Legende, Slugs `zwei-seiten-spiel-verteidigen`, `fuenf-sekunden-jagd`,
   `erster-attackiert-zweiter-sichert`, `drei-bahnen-klare-zustaendigkeit`. Ablage im privaten
   Repo `adler-u9-wissen` unter `Projektgedaechtnis/skizzen/aufgabe-c-4-2/`.
4. Prüffall in `tests/checks/`.
5. `node tests/run.js` grün, `sw.js` hochzählen, Funktionsübersicht, PR als Entwurf.
6. Im privaten Repo `Projektgedaechtnis/stand.md` (Abschnitt Trainerkonzept) und
   `entscheidungen.md` nachziehen, vermerken, dass Drive noch nachzuziehen ist.

## Entscheidungen

- Vier Formen mit vier defensiven Schwerpunkten (Charles, 27.11.2026).
- Form 1 ist das defensive Gegenstück zum Zwei-Seiten-Spiel, 4 gegen 4, feste Rollen.
- Die gruppentaktischen Prinzipien werden aus den defensiven Leitlinien der DFB-Spielvision
  abgeleitet; zusammen decken die vier Formen alle fünf Leitlinien ab.
- Video 3.2 bleibt bei der Form aus 3.1; Form 1 aus 4.2 kann in derselben Einheit mitgefilmt
  werden, weil der Aufbau gleich ist.

## Nicht in diesem Paket

Kein neuer App-Code, keine Vorlage, keine Kindernamen.
