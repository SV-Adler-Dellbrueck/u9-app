# Auftrag: Übung „Eishockey-Reihentausch – 6 gegen 6 in zwei Reihen“

Stand 04.10.2026. Entstanden im Projekt-Chat nach einer Beschreibung von Charles. Abschlussspiel
des Tages (Block „Abschlussturnier“), Kategorie `spass`, Dauer 15 Minuten, Reihentausch alle
60 Sekunden auf Kommando. Wie lange ein Kind auf der Strafbank sitzt, entscheidet der Trainer
frei. Zwei Feldvarianten: Jugendtor-Feld mit zwei festen Torhütern (14 Kinder) oder
FUNiño-Feld ohne Torhüter (12 Kinder). Die Skizze zeigt die Jugendtor-Variante.

## Die Übung

```json
{
  "schema": "adler-uebungen/1",
  "uebungen": [{
    "name": "Eishockey-Reihentausch – 6 gegen 6 in zwei Reihen",
    "kat": "spass",
    "kurz": "Abschlussspiel: Zwei Teams mit je zwei festen 3er-Reihen tauschen auf Kommando im laufenden Spiel, der Trainer schickt Kinder auf die Strafbank und gibt Provokationsregeln vor.",
    "spieler": "12-14",
    "feld": "Jugendtor-Feld ca. 25 x 20 m mit zwei Torhütern oder FUNiño-Feld ca. 26 x 20 m ohne Torhüter",
    "dauer": "15",
    "ablauf": "AUFBAU: Zwei Teams zu je 6 Feldspielern, jedes Team teilt sich in zwei feste 3er-Reihen. Variante A: Feld ca. 25 x 20 m, zwei Jugendtore, je Team ein fester Torwart. Variante B: FUNiño-Feld ca. 26 x 20 m, je Seite zwei Minitore, ohne Torhüter. Neben dem Feld warten die Reihen und steht die Strafbank. ABLAUF: Von jedem Team steht eine Reihe auf dem Feld, es wird 3 gegen 3 gespielt. Alle 60 Sekunden gibt der Trainer das Kommando: Beide Reihen tauschen komplett aus, im laufenden Spiel und mit vollem Einsatz. Bei jeder Einwechslung ordnet die Reihe ihre Positionen selbst neu, die Aufstellung muss sich ändern. Der Trainer holt immer wieder ein aktives Kind auf die Strafbank, damit Über- und Unterzahl gespielt wird. Wie lange das Kind dort sitzt, entscheidet er. PROVOKATIONSREGELN: Der Trainer gibt sie während des Spiels vor, zum Beispiel Countdown zum Abschluss oder Tore nach Doppelpass zählen doppelt. Gespielt werden 15 Minuten. TYPISCHE FEHLER: Die Reihe tauscht zu spät oder nur halb. Die neue Reihe startet ohne Absprache. Das Team in Unterzahl verteidigt nicht gemeinsam. SKALIERUNG: 12 Kinder = FUNiño-Feld ohne Torhüter, 14 Kinder = Jugendtore mit zwei festen Torhütern. BEOBACHTUNG: Welche Reihe ordnet sich beim Tausch von allein neu, welche wartet auf den Trainer?",
    "varianten": "Leichter: Das Kommando kommt seltener, zum Beispiel alle 90 Sekunden. Schwerer: Zwei Provokationsregeln gelten gleichzeitig.",
    "coaching": "In diesem Spielblock nur ermutigen und loben, die Reihen ordnen sich selbst.",
    "diff": 3,
    "skizze": {
      "z": [[20, 28, 240, 117]],
      "li": [[140, 28, 140, 145, "m"]],
      "tor": [[8, 68, "v", 36, "j"], [262, 68, "v", 36, "j"]],
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
          "tx": [[140, 176, "Strafbank: 2 gegen 3 in Unterzahl"]]
        }
      ]
    }
  }]
}
```

## Warum die Skizze so aussieht

Quer, Jugendtor-Variante: zwei Torhüter (T), pro Team zwei 3er-Reihen. Grundbild: Reihe A/B/C
(grün) und G/H/I (rot) spielen 3 gegen 3, die zweiten Reihen warten unten an der Seitenlinie.
Schritt 1: Nach dem Kommando stehen D/E/F und J/K/L auf dem Feld, die Positionen sind
bewusst anders als vorher (die Reihen ordnen sich selbst neu). Schritt 2: F sitzt auf der
Strafbank oben am Rand, grün spielt 2 gegen 3 in Unterzahl. Die Strafbank ist nur ein
Spielerpunkt, die App kennt kein Gerät dafür. Die FUNiño-Variante ist im Text beschrieben,
nicht gezeichnet. Die Spielerreihenfolge ist in allen drei Bildern gleich, weil die App
Kürzel je Position vergleicht.

Gegen die echte App geprüft (Playwright, Harness des Repos): `_eiSkizzeFehler` leer,
`_euPruefung` ohne Fehler, engster Spielerabstand 24. Materialliste laut App:
2 Jugendtore · 1 Ball. Torhüter und Spieler zählen nicht als Material.

## Offen, nicht geraten

- **Kategorie** `spass` ist meine Wahl (Eishockey, voller Einsatz); das Schema hat keine
  Kategorie für Abschlussspiele.
- **Dauer „15“:** Charles nannte nur die Zahl, gelesen als 15 Minuten.
- **Positionen:** Welche Positionen die Reihen einnehmen (z. B. Rollen der App), hat Charles
  nicht festgelegt. Der Text sagt nur, dass die Aufstellung sich ändern muss.
- **Strafbank:** Dauer entscheidet der Trainer frei, das ist so gewollt und steht im Text.
- **Ballverhalten beim Tausch** (wer nimmt den Ball mit, ob das Spiel weiterläuft) ist nicht
  festgelegt; im Text steht nur „im laufenden Spiel“.

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
