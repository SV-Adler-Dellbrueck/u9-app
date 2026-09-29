# Auftrag: Übung „Frei für den Wurf" in die Bibliothek

Stand 28.09.2026. Entstanden im Projekt-Chat aus dem Praxisteil des 3. Präsenztags
(DFB-Basis-Coach, 25.09.2026): ein Aufwärmspiel mit Werfen und Fangen in drei
Provokationsstufen. Für die U9 I bewusst **nicht** als Aufwärmen, sondern als Hauptteil —
Ziel ist das Bewegen ohne Ball. Beim Werfen fällt die Ballbehandlung als Ausrede weg: Wer
nicht frei steht, bekommt den Ball nicht, und das sieht jedes Kind. Bezug: Leitfrage 5,
„Wo stehe ich, wenn wir den Ball haben — und wo, wenn nicht?"

Erster Einsatz im Training am 28.09.2026. Nachbereitung dieser Einheit abwarten, bevor
Varianten oder Dauer nachgeschärft werden.

## Die Übung

```json
{
  "schema": "adler-uebungen/1",
  "uebungen": [{
    "name": "Frei für den Wurf",
    "kat": "wahrnehmung",
    "kurz": "Werfen und Fangen statt Passen — wer den Ball hat, bleibt stehen, alle anderen machen sich anspielbar.",
    "spieler": "6-14",
    "feld": "20 x 20 m",
    "dauer": "12",
    "ablauf": "AUFBAU: Feld 20 x 20 m mit vier Hütchen, zwei Teams mit Leibchen, ein Ball je Feld. Bei mehr als acht Kindern ein zweites Feld. ABLAUF: 3 gegen 3, der Ball wird geworfen und gefangen. Wer den Ball in der Hand hat, bleibt stehen. Die Gegner dürfen Würfe abfangen, aber den Ball nicht aus der Hand nehmen. Stufe 1: Fünf Würfe in Folge im eigenen Team sind ein Punkt. Stufe 2: Ein Punkt zählt, wenn der Ball hinter der gegnerischen Grundlinie gefangen wird. Stufe 3: Dieselbe Regel mit dem Fuß — flach passen statt werfen, wer den Ball hat, darf wieder dribbeln.",
    "varianten": "Leichter: Ein Joker spielt immer beim Team mit Ball mit (3+1 gegen 3), oder das Feld wird größer. Schwerer: Höchstens drei Sekunden mit dem Ball in der Hand, oder 3+3 gegen 3 — zwei Teams gegen eines, und wer den Ball erobert, muss ihn fünf Würfe halten.",
    "coaching": "Kann dich dein Mitspieler sehen? Wohin läufst du, wenn er den Ball hat? Wer steht gerade frei — und warum?",
    "diff": 1,
    "skizze": {
      "z": [[40, 25, 200, 130]],
      "h": [[40, 25, "y"], [240, 25, "y"], [40, 155, "y"], [240, 155, "y"]],
      "ger": [[262, 90, "trainer", "w"]],
      "s": [[80, 90, "g", "A"], [150, 55, "g", "B"], [140, 125, "g", "C"],
            [115, 85, "r"], [185, 70, "r"], [100, 125, "r"]],
      "b": [[88, 97]],
      "p": [[98, 80, 138, 60, "p", 1], [158, 124, 205, 116, "l", 2]],
      "tx": [[140, 170, "Mit Ball stehen, ohne Ball freilaufen"]]
    }
  }]
}
```

## Warum die Skizze so aussieht

Quer, ein Feld, 3 gegen 3. A (grün) hat den Ball und steht — deshalb kein Laufweg bei A.
Pfeil 1 ist der Wurf zu B, der sich zwischen zwei roten Gegnern frei gelaufen hat. Pfeil 2
ist der Laufweg von C in den freien Raum rechts unten: Er zeigt, was die Übung lehren soll —
der nächste Anspielbare bewegt sich schon, während der Wurf noch unterwegs ist.

Die Wurfbahn ist mit der Art `p` gezeichnet (Pass), weil es für Werfen keine eigene Wegart
gibt; der Text am Rand stellt klar, dass geworfen wird.

Gegen `skizzen-format.md` geprüft: nur erlaubte Felder, Farben aus dem Satz, alle
Koordinaten im Feld, engster Spielerabstand 35 (A zum roten Gegner rechts von ihm), Pfeile
beginnen neben den Spielern, Nummernkreise liegen außerhalb der Kreise, Text 37 Zeichen.
Erwartete Materialliste: 4 Hütchen, 1 Ball.

## Dabei

- Prüfe die Übung **vorher** mit `_euPruefung` und die Skizze mit `_eiSkizzeFehler`, und
  sag mir, was beanstandet wird, bevor du etwas schreibst.
- Leibchen fehlen in der Materialliste, weil sie nicht gezeichnet werden. Wenn es dafür
  einen vorgesehenen Weg gibt, nimm ihn; sonst so lassen.
- Kategorie `wahrnehmung` ist bewusst gewählt, nicht `aufwaermen`. Wenn die Bibliothek eine
  Stufe oder einen Blocktyp am Eintrag führt, gehört diese Übung in den Hauptteil.
- Kein Kindername, kein Klarname im Repo.
- Neuer Prüffall in `tests/checks/`, benannt nach der Version, aus der er stammt.
- `node tests/run.js` grün, dann `sw.js` hochzählen, Funktionsübersicht und Hilfe
  nachziehen.
- PR als Entwurf; zusammengeführt wird auf mein Wort.
