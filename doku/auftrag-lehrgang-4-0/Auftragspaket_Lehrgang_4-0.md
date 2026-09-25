# Auftragspaket – Lehrgangsabgabe 4.0 (Trainingsform Erwachsenenfußball)

Stand 25.09.2026, aus dem Projekt-Chat. Abgabe bis 01.10.2026, 23:59.

## Worum es geht

Aufgabe 4.0 im DFB-Basis-Coach verlangt eine Trainingsform für den Erwachsenenfußball
(1 gegen 1 bis 4 gegen 4, jeweils plus Torhüter) mit Grafik. Charles erstellt Übung und
Skizzen für Lehrgangsabgaben bewusst in der App (wie bei 2.1, 2.2 und 3.1). Die Übung steht
fertig in `nachtrag.json` daneben; die Abgabe (`Hütten_Aufgabe_4.0.pptx`) nutzt bereits die
beiden Bilder, die der Projekt-Chat mit genau diesem Exportweg erzeugt hat.

**Nicht für die U9 gedacht.** Die pausierende dritte Mannschaft wäre bei uns eine
Wartereihe (Ausbildungskonzept Fassung 3). Deshalb trägt der Name das Präfix
„Lehrgang Ü32 –“, und `kurz` sagt es ausdrücklich.

## Was zu tun ist

1. Die Übung aus `nachtrag.json` in `uebungen/bibliothek.json` anhängen, `stand` hochziehen.
   Nachtrag und Bibliothek müssen zeichengleich bleiben (wie v583 für 3.1).
2. In `UEBUNG_ART_VORSCHLAG` als Spielform einordnen (`spiel`).
3. `node doku/auftrag-lehrgang-4-0/export-skizzen.js` ausführen und die fünf Dateien
   (`-bild-1`/`-bild-2` als SVG und PNG, dazu `-animation.gif`) im privaten Repo unter
   `Projektgedaechtnis/skizzen/aufgabe-4-0/` committen.
4. Neuer Prüffall nach der Version, dazu `sw.js` hochzählen, Hilfe und Funktionsübersicht nur,
   falls sie Lehrgangsübungen aufzählen.

## Abnahmekriterien

- `_euPruefung` und `_eiSkizzeFehler` ohne Befund; `skzSpecSaeubern` lässt die Skizze
  unverändert (im Projekt-Chat am 25.09. gegen `main` v618 so gemessen).
- In beiden Bildern kein Spielerkreis näher als 24 Punkte an einem anderen, jeder Pfeil
  beginnt mindestens 20 Punkte neben dem Spielermittelpunkt.
- Materialzeile: 2 Jugendtore, 2 Hütchen, 1 Ball, 2 Balldepots; der Trainer zählt nicht.
- Die exportierten PNG entsprechen den Bildern in der Abgabe (1120 × 896).
- Voller Prüflauf grün. PR als Entwurf, gemergt wird auf Charles' Wort.

## Offen, bewusst nicht entschieden

- Ob Lehrgangsübungen für Erwachsene aus den Vorschlägen des Trainingsplans herausgehalten
  werden sollen (eigene Kennzeichnung statt Namenspräfix). Erst prüfen, ob das Präfix im
  Alltag reicht.
- „Jugendtor“ ist das größte Tor der Skizze; in der Abgabe steht „Großfeldtor“. Ein eigenes
  Symbol lohnt sich für eine einzelne Übung nicht.
