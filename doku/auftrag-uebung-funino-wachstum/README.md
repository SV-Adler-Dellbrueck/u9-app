# Auftrag: Übung „FUNiño 1 gegen 0 bis 4 gegen 4 – der Angreifer wird Verteidiger“

Stand 04.10.2026. Entstanden im Projekt-Chat nach einer Beschreibung von Charles. Kategorie
`pressing` (Verteidigen und Umschalten, wie „FUNiño 3 gegen 3 – Mittellinie verteidigen“),
Dauer 12 Minuten, Feld ca. 26 x 20 m wie in der SBFV-Sammlung, Endstufe 4 gegen 4, danach
beginnt die Runde von vorn mit 1 gegen 0.

Verwandte Form im Netz: „Funino vom 1 gegen 1 zum 3 gegen 3“, F-Jugend-Trainingssammlung
des SBFV (Phase 3, Spielform 2), mit der Über- und Unterzahl-Reihe 2:1, 2:2, 3:2, 3:3.
Neu an der Adler-Fassung: Start mit 1 gegen 0, Rollenwechsel (der Angreifer der Vorphase
verteidigt in der nächsten) und die wartenden Kinder mit Ballkorb hinter den Toren.
Die Quelle wird in `kurz` genannt, aber nicht kopiert.

## Die Übung

```json
{
  "schema": "adler-uebungen/1",
  "uebungen": [{
    "name": "FUNiño 1 gegen 0 bis 4 gegen 4 – der Angreifer wird Verteidiger",
    "kat": "pressing",
    "kurz": "Angelehnt an „Funino vom 1 gegen 1 zum 3 gegen 3“ aus der F-Jugend-Sammlung des SBFV: Die Form wächst von 1 gegen 0 bis 4 gegen 4, der Angreifer der Vorphase verteidigt in der nächsten.",
    "spieler": "6-8",
    "feld": "FUNiño-Feld ca. 26 x 20 m, je Grundlinie zwei Minitore",
    "dauer": "12",
    "ablauf": "AUFBAU: Feld ca. 26 x 20 m. An jeder Grundlinie stehen zwei Minitore. Hinter jeder Torlinie, zwischen den beiden Toren, stehen 3 bis 4 Kinder mit einem Ballkorb. ABLAUF: Das erste Kind der einen Seite läuft los und spielt 1 gegen 0 auf die Tore der anderen Seite. Es sucht den Abschluss. Danach startet das erste Kind der anderen Seite, der Angreifer der ersten Phase wird zum Verteidiger: 1 gegen 1. So geht es weiter, die Seiten starten abwechselnd und in jeder Phase kommt ein Kind dazu, bis 4 gegen 4 erreicht ist. Nach 4 gegen 4 beginnt die Runde von vorn mit 1 gegen 0. TYPISCHE FEHLER: Der Verteidiger bleibt stehen, statt sofort zu verteidigen. Der Angreifer schaut nur auf den Ball und nicht aufs freie Tor. Der Wechsel von Angriff auf Verteidigung kommt zu spät. SKALIERUNG: 6 Kinder = 3 pro Seite, Endstufe 3 gegen 3. 8 Kinder = 4 pro Seite, Endstufe 4 gegen 4. BEOBACHTUNG: Welches Kind schaltet nach dem eigenen Abschluss sofort um?",
    "varianten": "Leichter: Endstufe schon bei 3 gegen 3, oder die Tore stehen breiter. Schwerer: Endstufe 4 gegen 4, oder die Phasen laufen ohne Pause ineinander.",
    "coaching": "Wohin willst du jetzt, wenn du Verteidiger bist? Wo ist das freie Tor? Wer ist jetzt in Überzahl?",
    "diff": 3,
    "skizze": {
      "z": [[48, 15, 184, 150]],
      "tor": [[38, 38, "v", 20], [38, 112, "v", 20], [234, 38, "v", 20], [234, 112, "v", 20]],
      "ger": [[12, 90, "depot", "y"], [272, 90, "depot", "y"]],
      "s": [[130, 90, "g", "A"], [24, 90, "g", "B"], [24, 114, "g", "C"],
            [258, 66, "r", "D"], [258, 90, "r", "E"], [258, 114, "r", "F"]],
      "b": [[138, 97]],
      "p": [[152, 84, 196, 68, "d", 1], [200, 62, 236, 50, "s", 2]],
      "tx": [[140, 176, "1 gegen 0: Angreifer sucht den Abschluss"]],
      "schritte": [
        {
          "s": [[80, 80, "g", "A"], [24, 90, "g", "B"], [24, 114, "g", "C"],
                [150, 95, "r", "D"], [258, 90, "r", "E"], [258, 114, "r", "F"]],
          "b": [[157, 102]],
          "p": [[132, 96, 106, 100, "d", 1], [100, 104, 40, 122, "s", 2]],
          "tx": [[140, 176, "1 gegen 1: Angreifer wird Verteidiger"]]
        },
        {
          "s": [[110, 60, "g", "A"], [70, 95, "g", "B"], [24, 114, "g", "C"],
                [190, 90, "r", "D"], [258, 90, "r", "E"], [258, 114, "r", "F"]],
          "b": [[78, 102]],
          "p": [[90, 86, 106, 70, "p", 1], [128, 56, 236, 48, "s", 2]],
          "tx": [[140, 176, "2 gegen 1, dann weiter bis 4 gegen 4"]]
        }
      ]
    }
  }]
}
```

## Warum die Skizze so aussieht

Quer, vier Minitore (je zwei links und rechts), die Wartenden stehen zwischen den Toren
hinter der Torlinie, daneben das Balldepot als Ballkorb. Grundbild: A spielt 1 gegen 0 auf
die rechten Tore (Pfeil 1 Dribbling, Pfeil 2 Abschluss). Schritt 1: D startet von rechts,
A ist Verteidiger an den linken Toren, 1 gegen 1. Schritt 2: B startet von links, A greift
jetzt mit an, D verteidigt, 2 gegen 1. Weitere Phasen (2:2, 3:2, 3:3, 4:3, 4:4) sind im Text
beschrieben, nicht gezeichnet. Die Skizze zeigt je Seite drei Kinder; bei acht Kindern steht
ein viertes dahinter.

Gegen die echte App geprüft (Playwright, Harness des Repos): `_eiSkizzeFehler` leer,
`_euPruefung` ohne Fehler, engster Spielerabstand 24. Materialliste laut App:
4 Minitore · 1 Ball · 2 Balldepots.

## Offen, nicht geraten

- **Phasenfolge:** Dass in jeder Phase ein Kind dazukommt und die Seiten abwechselnd starten
  (1:0, 1:1, 2:1, 2:2, 3:2, 3:3, 4:3, 4:4), ist die Lesart der Beschreibung von Charles.
  Er nannte nur den Anfang bis 1 gegen 1 und „so geht es weiter bis 3 gegen 3 oder 4 gegen 4“.
- **Kategorie** `pressing` ist meine Wahl; das Schema kennt keine Kategorie „funino“.
- **Nicht festgelegt:** Schusszone, Wertung, Torwart (es gibt keinen), was mit dem Ball bei
  Aus oder Tor geschieht. Der Text sagt dazu nichts, die Form läuft über Abschluss und
  Startkind.

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
