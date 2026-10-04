# Auftrag: Übung „Eishockey-Reihentausch – 6 gegen 6 in zwei Reihen“

Stand 04.10.2026. Entstanden im Projekt-Chat nach einer Beschreibung von Charles. Abschlussspiel
des Tages (Block „Abschlussturnier“), Kategorie `spass`, Dauer 15 Minuten, Reihentausch alle
60 Sekunden auf Kommando. Zwei Feldvarianten: Jugendtor-Feld mit zwei festen Torhütern
(14 Kinder) oder FUNiño-Feld ohne Torhüter (12 Kinder). Die Skizze zeigt die Jugendtor-Variante.

**Änderung 04.10.2026:** Die Strafbank ist nicht mehr Sache des Trainers. Jedes Kind, das ein
Tor schießt, geht selbstständig 10 Sekunden in eine mit Hütchen markierte Zone an der Seite
des Feldes, zählt dort selbst herunter und kommt wieder ins Spiel. Der Trainer gibt weiter
das Kommando zum Reihentausch und die Provokationsregeln vor.

## Die Übung

```json
{
  "schema": "adler-uebungen/1",
  "uebungen": [{
    "name": "Eishockey-Reihentausch – 6 gegen 6 in zwei Reihen",
    "kat": "spass",
    "kurz": "Abschlussspiel: Zwei Teams mit je zwei festen 3er-Reihen tauschen auf Kommando im laufenden Spiel. Wer ein Tor schießt, geht selbstständig 10 Sekunden auf die Strafbank. Der Trainer gibt Provokationsregeln vor.",
    "spieler": "12-14",
    "feld": "Jugendtor-Feld ca. 25 x 20 m mit zwei Torhütern oder FUNiño-Feld ca. 26 x 20 m ohne Torhüter",
    "dauer": "15",
    "ablauf": "AUFBAU: Zwei Teams zu je 6 Feldspielern, jedes Team teilt sich in zwei feste 3er-Reihen. Variante A: Feld ca. 25 x 20 m, zwei Jugendtore, je Team ein fester Torwart. Variante B: FUNiño-Feld ca. 26 x 20 m, je Seite zwei Minitore, ohne Torhüter. Neben dem Feld warten die Reihen. An der Seite des Feldes ist die Strafbank als Zone mit Hütchen markiert. ABLAUF: Von jedem Team steht eine Reihe auf dem Feld, es wird 3 gegen 3 gespielt. Alle 60 Sekunden gibt der Trainer das Kommando: Beide Reihen tauschen komplett aus, im laufenden Spiel und mit vollem Einsatz. Bei jeder Einwechslung ordnet die Reihe ihre Positionen selbst neu, die Aufstellung muss sich ändern. Jedes Kind, das ein Tor schießt, geht danach selbstständig für 10 Sekunden in die Strafbank-Zone, zählt dort selbst herunter und kommt dann wieder ins Spiel. So spielt sein Team nach jedem Tor kurz in Unterzahl. PROVOKATIONSREGELN: Der Trainer gibt sie während des Spiels vor, zum Beispiel Countdown zum Abschluss oder Tore nach Doppelpass zählen doppelt. Gespielt werden 15 Minuten. TYPISCHE FEHLER: Die Reihe tauscht zu spät oder nur halb. Die neue Reihe startet ohne Absprache. Das Team in Unterzahl verteidigt nicht gemeinsam. Der Torschütze geht nicht von selbst auf die Strafbank oder kommt zu früh zurück. SKALIERUNG: 12 Kinder = FUNiño-Feld ohne Torhüter, 14 Kinder = Jugendtore mit zwei festen Torhütern. BEOBACHTUNG: Welche Reihe ordnet sich beim Tausch von allein neu, welcher Torschütze geht ohne Aufforderung auf die Strafbank?",
    "varianten": "Leichter: Das Kommando kommt seltener, zum Beispiel alle 90 Sekunden. Schwerer: Zwei Provokationsregeln gelten gleichzeitig.",
    "coaching": "In diesem Spielblock nur ermutigen und loben, die Reihen ordnen sich selbst.",
    "diff": 3,
    "skizze": {
      "z": [[20, 28, 240, 117]],
      "li": [[140, 28, 140, 145, "m"]],
      "tor": [[8, 68, "v", 36, "j"], [262, 68, "v", 36, "j"]],
      "h": [[118, 5, "y"], [162, 5, "y"], [118, 24, "y"], [162, 24, "y"]],
      "s": [[36, 86, "g", "T"], [96, 56, "g", "A"], [96, 116, "g", "B"], [140, 86, "g", "C"],
            [70, 158, "g", "D"], [94, 158, "g", "E"], [118, 158, "g", "F"],
            [244, 86, "r", "T"], [184, 56, "r", "G"], [184, 116, "r", "H"], [196, 86, "r", "I"],
            [162, 158, "r", "J"], [186, 158, "r", "K"], [210, 158, "r", "L"]],
      "b": [[148, 93]],
      "tx": [[140, 176, "3 gegen 3, die zweite Reihe wartet"]],
      "schritte": [
        {
          "s": [[36, 86, "g", "T"], [70, 158, "g", "A"], [94, 158, "g", "B"], [118, 158, "g", "C"],
                [124, 50, "g", "D"], [124, 122, "g", "E"], [100, 86, "g", "F"],
                [244, 86, "r", "T"], [162, 158, "r", "G"], [186, 158, "r", "H"], [210, 158, "r", "I"],
                [168, 86, "r", "J"], [192, 50, "r", "K"], [192, 122, "r", "L"]],
          "b": [[108, 93]],
          "tx": [[140, 176, "Alle 60 Sekunden: Reihen tauschen komplett"]]
        },
        {
          "s": [[36, 86, "g", "T"], [70, 158, "g", "A"], [94, 158, "g", "B"], [118, 158, "g", "C"],
                [124, 50, "g", "D"], [124, 122, "g", "E"], [140, 12, "g", "F"],
                [244, 86, "r", "T"], [162, 158, "r", "G"], [186, 158, "r", "H"], [210, 158, "r", "I"],
                [168, 86, "r", "J"], [192, 50, "r", "K"], [192, 122, "r", "L"]],
          "b": [[132, 129]],
          "tx": [[140, 176, "Tor: Schütze 10 Sekunden Strafbank"]]
        }
      ]
    }
  }]
}
```

## Warum die Skizze so aussieht

Quer, Jugendtor-Variante: zwei Torhüter (T), pro Team zwei 3er-Reihen. Oben am Rand die
Strafbank-Zone aus vier Hütchen, von Anfang an sichtbar. Grundbild: Reihe A/B/C (grün) und
G/H/I (rot) spielen 3 gegen 3, die zweiten Reihen warten unten an der Seitenlinie.
Schritt 1: Nach dem Kommando stehen D/E/F und J/K/L auf dem Feld, die Positionen sind
bewusst anders als vorher. Schritt 2: F hat getroffen und steht in der Strafbank-Zone,
grün spielt 2 gegen 3. Die FUNiño-Variante ist im Text beschrieben, nicht gezeichnet. Die
Spielerreihenfolge ist in allen drei Bildern gleich, weil die App Kürzel je Position
vergleicht.

Gegen die echte App geprüft (Playwright, Harness des Repos): `_eiSkizzeFehler` leer,
`_euPruefung` ohne Fehler, engster Spielerabstand 24. Materialliste laut App:
2 Jugendtore · 4 Hütchen · 1 Ball. Torhüter und Spieler zählen nicht als Material.

## Offen, nicht geraten

- **Kategorie** `spass` ist meine Wahl (Eishockey, voller Einsatz); das Schema hat keine
  Kategorie für Abschlussspiele.
- **Dauer „15“:** Charles nannte nur die Zahl, gelesen als 15 Minuten.
- **Positionen:** Welche Positionen die Reihen einnehmen (z. B. Rollen der App), hat Charles
  nicht festgelegt. Der Text sagt nur, dass die Aufstellung sich ändern muss.
- **Strafbank:** Ob der Trainer zusätzlich Kinder auf die Strafbank holt, ist offen. Die
  Fassung vom Mittag sah das vor, die Änderung ersetzt es. Der Text kennt nur noch die
  Strafbank für Torschützen.
- **Ballverhalten beim Tausch und nach einem Tor** (wer nimmt den Ball mit, wer stößt an)
  ist nicht festgelegt.

## Dabei

- Prüfe die Übung **vorher** mit `_euPruefung` und die Skizze mit `_eiSkizzeFehler`, und
  sag mir, was beanstandet wird, bevor du etwas schreibst.
- Aufnahme in `uebungen/bibliothek.json`; ein vorhandener Name wird nie überschrieben.
- Danach Bilder mit dem Bildexport und `exportAnimation` aus
  `doku/auftrag-lehrgangsskizzen/export-skizzen.js` erzeugen (quer, mit Legende) und
  ablegen. Die Skizze hat Grundbild plus zwei Schritte, daher auch das GIF.
- Kein Kindername, kein Klarname im Repo.
- Neuer Prüffall in `tests/checks/`, benannt nach der Version, aus der er stammt.
- `node tests/run.js` grün, dann `sw.js` hochzählen, Funktionsübersicht und Hilfe
  nachziehen.
- PR als Entwurf; zusammengeführt wird auf mein Wort.
