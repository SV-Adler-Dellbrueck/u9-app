# Auftragspaket – Lehrgangsabgabe 4.0 (Trainingsform für Erwachsene, Ü32)

Stand 25.09.2026, aus dem Projekt-Chat, zweite Fassung. Abgabe bis 01.10.2026, 23:59.

## Worum es geht

Aufgabe 4.0 im DFB-Basis-Coach verlangt eine Trainingsform für den Erwachsenenfußball
(1 gegen 1 bis 4 gegen 4, jeweils plus Torhüter) mit Grafik. Charles erstellt Übung und
Skizzen für Lehrgangsabgaben in der App. Die Übung steht fertig in `nachtrag.json`; die
Abgabe (`Hütten_Aufgabe_4.0.pptx`) nutzt bereits die sieben Bilder, die der Projekt-Chat mit
genau diesem Exportweg erzeugt hat.

**Eine Übung für Erwachsene, nicht für Kinder.** Das steht im Namen („Lehrgang Erwachsene
(Ü32) –“), am Anfang von `kurz` und von `ablauf` sowie in `spieler`. In der U9 wäre die
pausierende dritte Mannschaft eine Wartereihe (Ausbildungskonzept Fassung 3).

**Sieben Bilder, eine Aktion je Übergang** (Regel v589): 1 Team B greift an, B1 dribbelt ·
2 A1 läuft den Ballführenden an · 3 Ballgewinn (ohne Pfeil) · 4 A4 startet in die Tiefe, A2
rückt nach (beide Läufe tragen die 3, weil gleichzeitig) · 5 Pass in die Tiefe, A4 steht ·
6 Abschluss · 7 Tor. Jedes Bild trägt oben seine Phase als Beschriftung.

## Was zu tun ist

1. Die Übung aus `nachtrag.json` unverändert in `uebungen/bibliothek.json` anhängen, `stand`
   hochziehen. Nachtrag und Bibliothek bleiben zeichengleich (wie v583 für 3.1).
2. In `UEBUNG_ART_VORSCHLAG` als Spielform einordnen (`spiel`).
3. **Langsame Animation:** `exportAnimation` in
   `doku/auftrag-lehrgangsskizzen/export-skizzen.js` um zwei Optionen erweitern:
   `standMs` (Standzeit je Bild, ersetzt `SKZ_STAND`, Vorgabe unverändert) und
   `gleitFaktor` (multipliziert `_skzGleitDauer`, Vorgabe 1). Ohne Angabe muss das GIF
   bildgleich mit heute bleiben – v589-animation-gif rechnet die Bildzahl nach und muss grün
   bleiben. Im Projekt-Chat mit genau dieser Änderung erzeugt: 333 Bilder, 560 × 448, 33 s.
4. `node doku/auftrag-lehrgang-4-0/export-skizzen.js` ausführen und die fünfzehn Dateien
   (`-bild-1` bis `-bild-7` als SVG und PNG, dazu `-animation.gif`) im privaten Repo unter
   `Projektgedaechtnis/skizzen/aufgabe-4-0/` committen.
5. Neuer Prüffall nach der Version, `sw.js` hochzählen; Hilfe und Funktionsübersicht nur,
   falls sie Lehrgangsübungen aufzählen.

## Abnahmekriterien

- `_euPruefung` und `_eiSkizzeFehler` ohne Befund; `skzSpecSaeubern` lässt die Skizze
  unverändert (im Projekt-Chat am 25.09. gegen `main` v618 so gemessen).
- Sieben Bilder; in keinem ein Spielerkreis näher als 24 Punkte an einem anderen.
- v589 (eine Aktion je Übergang) und v584 (jeder Übergang bewegt etwas) melden die Übung
  nicht – im Projekt-Chat gemessen: 6→7 Spieler 9 · Ball 49, alle Übergänge bewegt.
- Name, `kurz`, `spieler` und `ablauf` nennen Erwachsene bzw. Ü32 ausdrücklich.
- Materialzeile: 2 Jugendtore, 2 Hütchen, 1 Ball, 2 Balldepots; der Trainer zählt nicht.
- Die exportierten PNG entsprechen den Bildern in der Abgabe (1120 × 896).
- Voller Prüflauf grün. PR als Entwurf, gemergt wird auf Charles' Wort.

## Offen, bewusst nicht entschieden

- Das Abspielen **in der App** bleibt beim gemeinsamen Tempo aller Übungen. Ein Tempo je
  Übung wäre ein neues Feld in der Skizze und ist nicht beauftragt; langsam ist das GIF.
- Ob Lehrgangsübungen für Erwachsene aus den Vorschlägen des Trainingsplans herausgehalten
  werden sollen (eigene Kennzeichnung statt Namenspräfix).
- „Jugendtor“ ist das größte Tor der Skizze; in der Abgabe steht „Großfeldtor“.
