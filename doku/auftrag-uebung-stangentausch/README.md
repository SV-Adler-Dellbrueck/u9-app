# Auftrag: Übung „Stangentausch“ in die Bibliothek

Stand 02.10.2026. Entstanden im Projekt-Chat nach einer Beschreibung von Charles. Eigene
Form für die U9 I, Kategorie `wahrnehmung` (Charles nannte „Wahrnehmung und Spaß“; das
Schema kennt nur eine Kategorie pro Übung). Dauer 6 Minuten, von Charles festgelegt.
Die Form ist für beliebig viele Kinder gedacht (Viereck, Fünfeck, Sechseck …, auch zu
zweit), höchstens 14, weil der Kader nicht mehr hat. Die Skizze zeigt als Grundbild das
Viereck.

## Die Übung

```json
{
  "schema": "adler-uebungen/1",
  "uebungen": [{
    "name": "Stangentausch",
    "kat": "wahrnehmung",
    "kurz": "Die Kinder stehen im Vieleck, jedes hält eine Stange senkrecht. Zwei sprechen sich ab, tauschen die Plätze und fangen dabei die Stange des anderen, bevor sie umfällt.",
    "spieler": "2-14",
    "feld": "Vieleck, Abstand 2 m",
    "dauer": "6",
    "ablauf": "AUFBAU: Die Kinder stehen in einem Vieleck, je 2 m auseinander: zu viert ein Viereck, zu fünft ein Fünfeck, zu sechst ein Sechseck, und so weiter. Auch zu zweit geht die Form. Jedes Kind hält eine Stange senkrecht auf dem Boden. ABLAUF: Zwei Kinder sprechen sich ab, die Plätze zu tauschen. Dann laufen beide los und lassen die Stange los. Die Stange darf nicht umfallen: Jedes Kind fängt die Stange des anderen auf, bevor sie den Boden berührt. Danach sucht sich jedes Kind den nächsten Partner für einen neuen Tausch. PROVOKATION MIT BALL AM FUSS: Jedes Kind führt beim Tausch einen Ball am Fuß mit. Die Bälle liegen zu Beginn neben den Kindern bereit. TYPISCHE FEHLER: Losgelaufen ohne Zeichen, zu früh oder zu spät losgelassen, Stange wird nicht angeschaut. SKALIERUNG: Das Vieleck wächst mit der Zahl der Kinder, von 2 bis 14 Kindern. Bei 8 oder 12 Kindern ein großes Vieleck oder mehrere kleine nebeneinander. BEOBACHTUNG: Welche Kinder sprechen sich vorher ab, welche laufen einfach los?",
    "varianten": "Leichter: Die Kinder stehen näher zusammen. Schwerer: Die Abstände werden größer, oder der Tausch läuft mit Ball am Fuß. Die Zahl der Ecken lässt sich ebenfalls ändern.",
    "coaching": "Woran merkt dein Partner, dass du losläufst? Wann gibst du das Zeichen? Wohin schaust du, wenn du losläufst?",
    "diff": 2,
    "skizze": {
      "z": [[55, 25, 170, 130]],
      "ger": [[95, 46, "stange", "y"], [185, 46, "stange", "y"], [185, 134, "stange", "y"], [95, 134, "stange", "y"]],
      "s": [[105, 55, "g", "A"], [175, 55, "g", "B"], [175, 125, "g", "C"], [105, 125, "g", "D"]],
      "b": [[96, 63], [184, 63], [184, 117], [96, 117]],
      "p": [[120, 70, 160, 110, "l", 1], [172, 98, 132, 58, "l", 2]],
      "tx": [[140, 168, "Absprechen, loslaufen, Stange fangen"]]
    }
  }]
}
```

## Warum die Skizze so aussieht

Quer, Grundbild mit vier Kindern, Seitenlänge im Bild 70 Punkte für 2 m. Jedes Kind hat
seine Stange außen neben sich stehen und seinen Ball daneben liegen (Stufe 1 ohne Ball,
Stufe 2 mit Ball am Fuß). Gezeigt ist ein Tausch: A und C laufen diagonal aneinander
vorbei (Pfeile 1 und 2, Laufwege), B und D halten ihre Stange. Die beiden Pfeile liegen
absichtlich versetzt, damit Nummer und Pfeilspitze sich nicht verdecken. Die Stangen sind
als Gerät gezeichnet, weil die App kein „Stange in der Hand“ kennt. Weitere Eckenzahlen
sind im Text beschrieben, nicht gezeichnet; die Skizze bleibt das Viereck.

Gegen die echte App geprüft (Playwright, Harness des Repos): `_eiSkizzeFehler` leer,
`_euPruefung` ohne Fehler, engster Spielerabstand 70. Materialliste laut App:
4 Stangen · 4 Bälle (Grundbild; mit mehr Kindern entsprechend mehr, bei 14 Kindern also
14 Stangen und 14 Bälle).

## Dabei

- Prüfe die Übung **vorher** mit `_euPruefung` und die Skizze mit `_eiSkizzeFehler`, und
  sag mir, was beanstandet wird, bevor du etwas schreibst.
- Aufnahme in `uebungen/bibliothek.json`; ein vorhandener Name wird nie überschrieben.
- Danach Bilder mit dem Bildexport aus `doku/auftrag-lehrgangsskizzen/export-skizzen.js`
  erzeugen (quer, mit Legende) und ablegen. Kein GIF nötig, die Skizze hat ein Bild.
- Kein Kindername, kein Klarname im Repo.
- Neuer Prüffall in `tests/checks/`, benannt nach der Version, aus der er stammt.
- `node tests/run.js` grün, dann `sw.js` hochzählen, Funktionsübersicht und Hilfe
  nachziehen.
- PR als Entwurf; zusammengeführt wird auf mein Wort.
