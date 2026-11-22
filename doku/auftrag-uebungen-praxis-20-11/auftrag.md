# Auftrag: zwei Übungen aus der Praxis und ein Grundsatz (Charles, 22.11.2026)

## Teil 1 – Grundsatz
Jede Übungsform wird (a) visualisiert (Skizze), (b) immer im gleichen Schema aufgebaut und (c) bekommt zusätzlich eine
längere Beschreibung zum Nachlesen für Trainer, die die Form nicht kennen. Die lange Beschreibung (`ablauf_lang`, in der App
„📖 Ganze Beschreibung“, im Export `export.trainingsformen.ablauf_lang`) hat immer diese Überschriften in dieser Reihenfolge:
Ziel · Kurzbeschreibung · Aufbau · Ablauf · Regeln · Coaching-Aspekte (höchstens drei Kernpunkte, dazu Korrekturen) ·
Eskalationsstufen (leichter, schwerer) · Zusatzregeln · Vorteile · Nachteile · Typische Fehlerbilder · Worauf achten
(Erfahrungswerte). „Zusatzregel“ heißt in der Oberfläche so, nicht „Provokationsregel“.

Erfahrungswerte: Sterne und Einsätze kommen weiter automatisch aus den Einheiten-Bewertungen, nicht doppelt in den Text.
Besondere Hinweise aus dem Einsatz formuliert Charles im Projekt-Chat; sie kommen als Nachtrag in `uebungen/bibliothek.json`
unter „Worauf achten“. Festgeschrieben in `CLAUDE.md` (Abschnitt „Übungsformen: ein Schema“) und in
`Projektgedaechtnis/entscheidungen.md`.

## Teil 2 – zwei Übungen in `uebungen/bibliothek.json`
Vorher `_euPruefung` und `_eiSkizzeFehler`, Namen gegen die Bibliothek prüfen. Kein „Lehrgang“ im Namen: beide werden in der
U9 ausprobiert. Einordnung (Spielform/Übungsform) bleibt offen, Charles entscheidet sie in der App.

**A „Anbieten und Freilaufen – Einstimmen“** · kat aufwaermen · spieler „8“ · feld „15 × 15 m“ · dauer 10 · diff 1.
Ziel: Verbesserung des Anbietens und Freilaufens im Passspiel. Aufbau: 8 Kinder in zwei Teams (je 4) im Feld, ein Ball je
Team. Ablauf in drei Stufen (Pass auf das Entgegenkommen, Weiterleiten mit Richtungsänderung, Passfolge 1→2, 3→4, 4→1).
Regel: angespielt wird erst, wenn sich der Mitspieler aktiv anbietet. Coaching: Sichtkontakt, Vororientierung, vom Gegner
weg, entgegenkommen, Deckungsschatten verlassen.

**B „Pylonen-Spiel – Läufer gegen Wächter“** · kat spass · spieler „3–5 je Aufbau“ · feld „6 × 6 m je Aufbau“ · dauer 8 ·
diff 1. Ziel: Verbesserung von Schnelligkeit, Wendigkeit und Reaktion. Fünf Pylonen im Abstand von 1–2 m, zwei Wächter im
Pylonenfeld, ein Läufer davor; der Läufer stößt um, die Wächter stellen auf. Schwerer: zwei Läufer, drei Wächter; Rollen
wechseln nach jedem Durchgang. „Wächter“ nur hier, nicht mit Aufpasser/Flitzer/Jäger vermischen.

Skizzen nach den Entwürfen im Auftrag (Farben g/r/y, Pfeile p/l mit Nummer); die Anordnung der Pylonen bei B gegen das
Praxisblatt prüfen.

## Abnahme
Prüffall in `tests/checks/`, `node tests/run.js` grün, `sw.js` hochzählen, Funktionsübersicht und Hilfe nachziehen,
Kurzfassung überall sichtbar und „📖 Ganze Beschreibung“ im Detail. Nach dem nächtlichen Export prüfen, dass beide Übungen
mit `ablauf_lang` in `export/uebungen.md` stehen. PR als Entwurf, zusammengeführt wird auf Charles' Wort.
Drive-Projektgedächtnis noch nachziehen.
