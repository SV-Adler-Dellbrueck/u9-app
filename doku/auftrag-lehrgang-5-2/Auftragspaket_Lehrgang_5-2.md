# Auftragspaket: Übung und Skizze zur Lehrgangsabgabe 5.2

Repo `SV-Adler-Dellbrueck/u9-app`, Stand 30.09.2026 (App v655). Gilt zusammen mit `CLAUDE.md`
und `Projektgedaechtnis/skizzen-format.md` im privaten Repo.

> **Status: umgesetzt in v700** (Entwurfs-PR, zusammengeführt auf Charles' Wort). Zeile 64 wird nach dem Merge als Import gekennzeichnet; Wurfspiele über das Skizzen-Merkmal `wurf`.

## Ausgangslage

Abgabe 5.2 im DFB-Basis-Coach (Trainingsdurchführung mit der eigenen Mannschaft) verlangt eine
Trainingsform aus dem Hauptteil mit Grafik, gefilmt in der Einheit vom **28.09.2026**. Gewählt hat
Charles die eigene Übung **„Korb-Chaos-Funino (360°-Variante)"** — ein Wurfspiel, bewusst so
(der Hinweis, dass der Lehrgang eine Fußball-Spielform erwarten könnte, ist gegeben und
abgewogen). Die Abgabe `Huetten_Aufgabe_5.2` ist fertig; Text und Bild dort sind die Fassung
aus `nachtrag.json` (Stand 30.09., auf den gefilmten Ablauf mit zwei Runden angepasst).

**Besonderheit:** Die Übung gibt es bisher nur als **eigene Übung in der Datenbank**
(`trainingsformen.id = 64`, `tags = 'Eigene Übung'`, angelegt 27.09.), nicht in der Bibliothek.
Ihre gespeicherte Skizze trägt vier Kreiszonen (`skzSpecSaeubern` kappt auf drei, das Mitteltor
hatte keine), und Kind E lag auf Ball und Mitteltor.

## Der Nachtrag

`nachtrag.json` in diesem Ordner, Schema `adler-uebungen/1`, eine Übung, **gleicher Name** wie
Zeile 64. Die Skizze wurde im Projekt-Chat mit `_eiSkizzeFehler` (ohne Befund) geprüft und mit
`doku/auftrag-lehrgangsskizzen/export-skizzen.js` gerendert und angesehen; engster
Spielerabstand 32,4; Materialzeile „5 Minitore · 20 Hütchen · 1 Ball · Balldepot".

## Absicht der Zeichnung

Quer, ein Bild, zwei Schrittnummern.

- **Aufbau:** Feld als Zone `[50,10,210,160]` — bewusst fast die ganze Zeichenfläche (Charles,
  30.09.: mehr Fläche); das Feld ist 15 × 15 m, die Zeichnung schematisch. Fünf Minitore quer —
  vier in den Ecken, eins in der Mitte; dass sie auf dem Rücken liegen, steht im Text. Die
  Sicherheitszonen sind je **vier Hütchen diagonal** um jedes Tor (Abstand 12/12), weil die App
  höchstens drei `kr` zeichnet und fünf gebraucht werden. Trainer und Balldepot links außerhalb.
- **Spieler:** Grün A, B, C; Rot D, E, F. A hält den Ball (Ball links unten neben A, damit der
  Pfeilanfang frei bleibt).
- **Schritt 1:** Zuwurf A → B, der sich oben freigelaufen hat. **Schritt 2:** Torwurf B ins
  Mitteltor.
- **Beschriftung** oben im Feld: „außen 1 · Mitte 3 Punkte".

## Wurf statt Pass und Schuss — die Legende

Charles am 30.09.: „Schuss ist ja ein Wurf." Die App kennt nur die Wegarten Pass, Laufweg,
Schuss und Dribbling. Für die Abgabe wurde das Bild deshalb mit **überschriebener Legende**
erzeugt (`SKZ_PFEIL_NAME.p = "Zuwurf"`, `SKZ_PFEIL_NAME.s = "Torwurf"`, nur im Exportlauf).
Das Bild in der Abgabe weicht damit in der Legende von dem ab, was die App heute zeigt.

**Entscheiden und vorschlagen, bevor gebaut wird:** Wie bekommen Wurfspiele in der App die
richtige Bezeichnung? Zwei Wege liegen nahe — eigene Wegarten für Zuwurf und Torwurf (neue
Kürzel, Legende, Skizzeneditor, Prüfung) oder eine Bezeichnung, die aus der Übung kommt
(z. B. ein Feld in der Skizze, das die Legende für Pass und Schuss umbenennt). Maßstab: kleinster
Eingriff, der im Editor, in der Legende der App und im Export dasselbe Wort zeigt.

## Auftrag

1. **Entscheiden und melden, bevor geschrieben wird:** Wie kommt die Übung in die Bibliothek,
   ohne dass es zwei gleichnamige Zeilen gibt? Pläne und Bewertungen lösen seit v586 über den
   **Namen** auf. Naheliegend: in `bibliothek.json` aufnehmen und Zeile 64 so behandeln, dass der
   Abgleich sie nicht als Dublette neben der Import-Kopie stehen lässt (z. B. Zeile 64 auf den
   Stand des Nachtrags bringen und als Import kennzeichnen, oder die Import-Kopie gewinnen
   lassen). Nichts löschen, was in `trainingsplan` referenziert ist — vorher zählen.
2. Den Weg für die Wurf-Legende vorschlagen (Abschnitt oben) und nach Freigabe umsetzen.
3. `nachtrag.json` mit `_euPruefung` und `_eiSkizzeFehler` prüfen, anhängen, `stand` hochsetzen.
   Übungsart: `spiel` (Spielform) in `UEBUNG_ART_VORSCHLAG`; Betreuung: „Trainer am Feld"
   (er wirft nach jedem Treffer ein).
4. Bild über ein Aufrufskript `doku/auftrag-lehrgang-5-2/export-skizzen.js` nach dem Muster von
   3.1 erzeugen: `korb-chaos-funino.svg` und `.png` (1120 × 832, mit Legende „Zuwurf" und
   „Torwurf"). **Ablage im privaten Repo** unter `Projektgedaechtnis/skizzen/aufgabe-5-2/`. Im
   öffentlichen Repo bleibt nur die Beschreibung.
5. Prüffall in `tests/checks/` (Version, aus der er stammt): Übung vorhanden, genau eine Zeile je
   Name nach dem Abgleich, Nachtrag und Bibliothek zeichengleich wie bei v583, Legende der Übung
   zeigt „Zuwurf" und „Torwurf".
6. `node tests/run.js` grün, `sw.js` hochzählen, Funktionsübersicht nachziehen. PR als Entwurf.
7. Im privaten Repo `stand.md` (B3) und `entscheidungen.md` nach
   `Projektgedaechtnis/uebergabe-2026-09-28-aufgabe-5-2.md` nachziehen und vermerken, dass Drive
   noch nachzuziehen ist.

## Was offen bleibt

- Drive: `Huetten_Aufgabe_5.2` (pptx, pdf) legt Charles selbst in den Ordner Basis-Coach Lehrgang.
