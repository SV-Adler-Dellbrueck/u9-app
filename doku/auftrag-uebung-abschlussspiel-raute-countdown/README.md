# Auftrag: Übung „Abschlussspiel – 3+1 gegen 3+1 Raute mit Countdown“ in die Bibliothek

Stand 02.10.2026. Entstanden im Projekt-Chat nach einer Beschreibung von Charles. Das
Abschlussspiel des Tages (Block „Abschlussturnier“ im 75-Minuten-Rahmen), Kategorie
`raute`, Dauer 8 Minuten, Feld 25 x 20 m wie bei „3+1 gegen 3+1 – Raute ohne Aufpasser“.
Die vorhandene Übung bleibt unverändert; diese hier ist die Fassung mit
Provokationsregeln. Sie ist **nicht** ihre Variante, weil Countdown, Punktwertung und
Raute-Bedingung den Spielcharakter ändern.

## Die Übung

```json
{
  "schema": "adler-uebungen/1",
  "uebungen": [{
    "name": "Abschlussspiel – 3+1 gegen 3+1 Raute mit Countdown",
    "kat": "raute",
    "kurz": "Das Abschlussspiel des Tages: zwei Teams in der Raute, der Trainer zählt im Angriff einen Countdown, ein Tor nach direktem Pass bringt zwei Punkte.",
    "spieler": "8",
    "feld": "Kreis-Feld ca. 25 x 20 m, zwei Jugendtore (Ersatz: auf jeder Seite zwei Minitore)",
    "dauer": "8",
    "ablauf": "AUFBAU: Feld ca. 25 x 20 m, Mittellinie markiert, an jeder Seite ein Jugendtor mit Torwart. Ist das zweite Jugendtor nicht verfügbar, stehen auf jeder Seite zwei Minitore statt des Jugendtors. Zwei Teams zu je vier Kindern (Torwart und drei Feldspieler) in Leibchen. Der Trainer steht mit dem Balldepot an der Seitenlinie. ABLAUF: 3+1 gegen 3+1 in der Raute: Torwart hinten, zwei Flitzer seitlich, Jäger vorn. Verliert ein Team den Ball, geht er ins Aus oder fällt ein Tor, bringt der Trainer sofort einen neuen Ball aus dem Balldepot ins Spiel. Gespielt wird acht Minuten. PROVOKATIONSREGELN, nacheinander zuschalten: 1) Countdown: Im Angriff zählt der Trainer laut herunter, die Länge legt er selbst fest. Läuft der Countdown ab, wird der Angriff abgebrochen und der Trainer bringt einen neuen Ball. 2) Ein normales Tor zählt einen Punkt, ein Tor nach direktem vorherigem Pass zwei Punkte. 3) Tore zählen nur, wenn die Grundordnung der Raute bei Torerfolg sichtbar war. 4) Steigerung: Tore zählen nur nach vorherigem Pass. TYPISCHE FEHLER: Alle laufen zum Ball, die Raute fällt nach dem Ballgewinn auseinander, der Torwart bleibt auf der Linie, Schuss ohne Blick nach dem Mitspieler. SKALIERUNG: 8 Kinder = ein Spiel, 12 Kinder = ein Spiel mit je zwei Wechslern pro Team, 16 Kinder = zwei Felder. BEOBACHTUNG: Wer von Torwart, Flitzern und Jäger fehlt in der Raute, wenn ein Tor nicht zählt?",
    "varianten": "Leichter: Der Countdown ist länger, es gelten nur die Regeln 1 und 2. Schwerer: Der Countdown ist kürzer, oder die Regeln 3 und 4 gelten zusammen.",
    "coaching": "In diesem Spielblock nur ermutigen und loben, wenn die Raute steht.",
    "diff": 3,
    "skizze": {
      "z": [[20, 28, 240, 130]],
      "li": [[140, 28, 140, 158, "m"]],
      "tor": [[8, 75, "v", 36, "j"], [262, 75, "v", 36, "j"]],
      "ger": [[140, 167, "trainer", "w"], [162, 167, "depot", "y"]],
      "s": [[34, 93, "g", "T"], [88, 50, "g", "F"], [88, 136, "g", "F"], [146, 93, "g", "J"],
            [248, 93, "r", "T"], [210, 72, "r", "F"], [210, 114, "r", "F"], [172, 60, "r", "J"]],
      "b": [[96, 143]],
      "p": [[104, 122, 136, 102, "p", 1], [166, 96, 258, 108, "s", 2]],
      "tx": [[140, 18, "Pass, dann Tor: 2 Punkte"]]
    }
  }]
}
```

## Warum die Skizze so aussieht

Quer, ein Feld, Angriff nach rechts. Grün steht in der Raute: Torwart hinten (T), zwei
Flitzer breit (F), Jäger vorn (J). Rot steht tiefer und enger vor dem eigenen Tor. Pfeil 1
ist der Pass vom Flitzer zum Jäger, Pfeil 2 der Schuss aus dem Pass: genau der Fall, der
zwei Punkte zählt. Der Trainer steht unten an der Seitenlinie, daneben das Balldepot.
Der Text am Rand nennt die Punktregel; die übrigen Provokationsregeln stehen im Ablauf.
Die Ersatzaufstellung mit Minitoren ist nur im Text beschrieben, nicht gezeichnet.

Gegen die echte App geprüft (Playwright, Harness des Repos): `_eiSkizzeFehler` leer,
`_euPruefung` ohne Fehler, engster Spielerabstand 40. Materialliste laut App:
2 Jugendtore · 1 Ball · 1 Balldepot. Der Trainer zählt nicht als Material.

## Offen, nicht geraten

- **Raute-Aufstellung:** Torwart hinten, Flitzer seitlich, Jäger vorn, wie in der
  vorhandenen Übung „Raute ohne Aufpasser“. Falls mit „Grundordnung der Raute“ eine
  Aufstellung mit Aufpasser gemeint ist, muss der Ablauf angepasst werden.
- **Countdown:** Länge bewusst nicht festgelegt, der Trainer entscheidet.
- **Skalierung 12 und 16** ist ein Vorschlag, von Charles nicht vorgegeben.

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
