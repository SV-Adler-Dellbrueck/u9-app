# Auftrag: Übung „Doppelpass durch die Stangen“ in die Bibliothek

Stand 02.10.2026. Entstanden im Projekt-Chat nach einer Vorlage von Charles (Bild einer
Übungsform plus Beschreibung). Eigene Technikform für die U9 I, **nicht** Teil des
Dreistufen-Aufbaus. Maße (Stangen 3 m, Dummy 3 m dahinter, Minitor 3 m vor dem Start)
von Charles bestätigt.

## Die Übung

```json
{
  "schema": "adler-uebungen/1",
  "uebungen": [{
    "name": "Doppelpass durch die Stangen",
    "kat": "technik",
    "kurz": "Zwei Kinder spielen Doppelpass über eine Stangenlinie, tauschen oben Ball und Rolle, kommen zurück und schließen aufs Minitor ab.",
    "spieler": "4",
    "feld": "ca. 6 x 20 m je Station",
    "dauer": "10",
    "ablauf": "AUFBAU: Vier Stangen in einer Linie (Abstand ca. 3 m), 3 m hinter der letzten Stange der Dummy. Unten zwei Hütchen als Start, 3 m davor das Minitor. Je ein Kind steht links und rechts der Stangenlinie, zwei weitere warten hinter den Startkindern mit eigenem Ball. ABLAUF: Hin: A und B laufen links und rechts der Stangenlinie nach oben und spielen sich den Ball im Doppelpass durch die Lücken zu. Oben am Dummy übergibt der Ballführer den Ball, beide tauschen Seite und Rolle. Zurück: Doppelpass in die andere Richtung auf den getauschten Seiten. Unten schließt ein Kind aufs Minitor ab. Beide klatschen mit dem nächsten Paar ab, das startet. REGELN: Der Ball bleibt flach. Pass nur durch die Lücke zwischen zwei Stangen. Abschluss erst unten. TYPISCHE FEHLER: Pass zu hart oder zu früh, Partner läuft nicht mit, Ball bleibt bei der Übergabe liegen, Abschluss aus dem Stand ohne Anlauf. SKALIERUNG: 8 Kinder = 2 Stationen, 12 = 3, 16 = 4, immer 4 Kinder je Station, nie mehr als 2 warten. BEOBACHTUNG: Welches Kind sucht die Lücke früh, welches wartet auf den Ball?",
    "varianten": "Leichter: Stangen weiter auseinander, Pass mit der Innenseite aus dem Stand. Schwerer: Das zweite Paar startet schon, wenn das erste oben am Dummy ankommt, oder Doppelpass nur mit dem schwächeren Fuß.",
    "coaching": "Wohin läufst du, nachdem du abgespielt hast? Wie bekommt dein Partner den Ball in den Lauf? Was machst du, bevor du aufs Tor schießt?",
    "diff": 2,
    "skizze": {
      "hoch": true,
      "z": [[18, 24, 144, 232]],
      "tor": [[80, 238, "h", 20]],
      "h": [[80, 212, "y"], [100, 212, "y"]],
      "ger": [[90, 190, "stange", "y"], [90, 165, "stange", "y"], [90, 140, "stange", "y"], [90, 115, "stange", "y"], [90, 64, "dummy", "y"]],
      "s": [[62, 212, "g", "A"], [118, 212, "g", "B"], [48, 238, "g", "C"], [132, 238, "g", "D"]],
      "b": [[70, 219], [56, 245]],
      "p": [[74, 186, 106, 169, "p", 1], [106, 161, 74, 144, "p", 2], [74, 136, 106, 119, "p", 3], [106, 111, 74, 94, "p", 4]],
      "tx": [[90, 268, "Hin: Doppelpass"]],
      "schritte": [
        {
          "s": [[118, 84, "g", "A"], [62, 84, "g", "B"], [48, 238, "g", "C"], [132, 238, "g", "D"]],
          "b": [[70, 91], [56, 245]],
          "p": [[106, 84, 74, 84, "p"]],
          "tx": [[90, 44, "Oben: Rolle tauschen"]]
        },
        {
          "s": [[118, 200, "g", "A"], [62, 176, "g", "B"], [48, 238, "g", "C"], [132, 238, "g", "D"]],
          "b": [[126, 207], [56, 245]],
          "p": [[74, 119, 106, 136, "p"], [106, 144, 74, 161, "p"], [74, 169, 106, 186, "p"], [112, 208, 98, 234, "s"]],
          "tx": [[90, 268, "Zurück + Abschluss"]]
        }
      ]
    }
  }]
}
```

## Warum die Skizze so aussieht

Hochkant, eine Station, vier Kinder, zwei Bälle. Grundbild: A und B stehen unten links und
rechts neben der Stangenlinie, C und D warten mit eigenem Ball hinter ihnen. Die Pfeile 1–4
sind der Doppelpass nach oben, jeweils zwischen zwei Stangen hindurch. Schritt 1: Oben am
Dummy haben A und B die Seite getauscht, B hat den Ball übernommen (Pfeil = Übergabe).
Schritt 2: Zurück im Doppelpass auf den getauschten Seiten, A schließt aufs Minitor ab
(roter Pfeil), C und D warten weiter. Das Abklatschen mit dem nächsten Paar steht im
Ablauf, nicht im Bild.

Gegen die echte App geprüft (Playwright, Harness des Repos): `_eiSkizzeFehler` leer,
`_euPruefung` ohne Fehler, `skzSpecSaeubern` ändert nichts, engster Spielerabstand 30.
Materialliste laut App: 1 Minitor · 2 Hütchen · 4 Stangen · 1 Freistoß-Dummy · 2 Bälle.

## Dabei

- Prüfe die Übung **vorher** mit `_euPruefung` und die Skizze mit `_eiSkizzeFehler`, und
  sag mir, was beanstandet wird, bevor du etwas schreibst.
- Aufnahme in `uebungen/bibliothek.json`; ein vorhandener Name wird nie überschrieben.
- Danach die Bilder mit dem Bildexport und `exportAnimation` aus
  `doku/auftrag-lehrgangsskizzen/export-skizzen.js` erzeugen (hochkant, mit Legende) und
  ablegen. Die Skizze hat Grundbild plus zwei Schritte, daher auch das GIF.
- Kein Kindername, kein Klarname im Repo.
- Neuer Prüffall in `tests/checks/`, benannt nach der Version, aus der er stammt.
- `node tests/run.js` grün, dann `sw.js` hochzählen, Funktionsübersicht und Hilfe
  nachziehen.
- PR als Entwurf; zusammengeführt wird auf mein Wort.
