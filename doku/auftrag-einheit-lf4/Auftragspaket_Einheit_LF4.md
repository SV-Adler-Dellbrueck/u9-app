# Auftragspaket: Einheit „Ball zum Freien" (Leitfrage 4) — Übungen, Vorlage, Skizzen

Repo `SV-Adler-Dellbrueck/u9-app`, Stand 14.09.2026, umgesetzt mit **v554**. Gilt zusammen
mit `CLAUDE.md` und dem Muster aus `doku/auftrag-lehrgangsskizzen/`.

> **Status: umgesetzt.** Die Abnahmekriterien stehen unten mit dem Nachweis je Punkt,
> die Schema-Befunde unter „Was offen bleibt“. Prüffall `tests/checks/v554-einheit-lf4.js`.

## Ausgangslage

Die Einheit vom **Freitag, 18.09.2026, 16:30–18:00 Uhr** steht als Lehrgangsabgabe 2.2
im DFB-Basis-Coach geschrieben (Trainingsphilosophie Deutschland, Muster 15:30:15:30,
auf 75 Minuten heruntergerechnet als 13 : 24 : 13 : 25). Sie ist zugleich eine reale
Einheit der U9 I mit 12 Kindern und 2 Trainern.

Die Skizzen für die Abgabe werden **nicht extern gezeichnet**, sondern entstehen in der
App und werden über den vorhandenen Export ausgegeben — dieselbe Vorgabe wie beim
Paket Lehrgangsskizzen.

**Es wird kein neuer Code gebaut.** Renderer (`_skz` in `data.js`), Tipp-Editor
(`md-skizze.js`), Bild-Export (`skzTeilen`) und der Abgleich beim Öffnen
(`bibliothekAbgleich` in `md-einheit-import.js`) sind vorhanden. Dies ist ein
**Inhalts-Nachtrag** plus ein Exportlauf.

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `uebungen/bibliothek.json` | zwei neue Einträge am Ende des `uebungen`-Arrays, `stand` auf `2026-09-14-2` |
| `uebungen/vorlagen.json` | eine neue Vorlage für die Einheit, `stand` entsprechend hochsetzen |
| `doku/auftrag-einheit-lf4/` | Exportdateien der beiden Skizzen (SVG eingecheckt, PNG erzeugbar) |
| `sw.js` | Version hochzählen |

## Übung 1 — neuer Eintrag in `bibliothek.json`

```json
{
  "name": "3 gegen 3 auf vier Minitore – Pass zählt doppelt",
  "kat": "passspiel",
  "kurz": "Wie die Spieltagsform, aber ein Tor nach Zuspiel zählt doppelt – kein Verbot, nur ein Anreiz.",
  "spieler": "6 je Feld (12 = 2 Felder)",
  "feld": "25 x 20 m, je Grundlinie zwei Minitore weit außen, Schusszone 6 m",
  "dauer": "24",
  "ablauf": "Enge Stufe zur Leitfrage „Wie kriege ich den Ball zu einem, der frei ist?“. Feld und Tore bleiben wie in „3 gegen 3 auf vier Minitore mit Schusszone“ – die Tore stehen weit außen, nie eines in der Mitte.\n\nTeil A, 11 Minuten: freies Spiel ohne Zusatzregel, drei Durchgänge von 3 Minuten mit einer Minute Pause. Der Trainer schaut zu und lobt. Am Ende eine Frage in die Runde: „Wann war ein Tor heute leicht?“\n\nTeil B, 13 Minuten: genau eine Regel kommt dazu – ein Tor zählt doppelt, wenn davor ein Pass gespielt wurde. Verboten ist nichts, wer allein durchgeht, darf das, es zählt nur einfach. Die verteidigende Seite steht damit vor der Aufgabe, Passwege zuzustellen statt dem Ball nachzulaufen.",
  "varianten": "Leichter: Feld auf 30 x 22 m verbreitern, bevor an der Regel geändert wird. Schwerer: zwei Zuspiele vor dem Abschluss, oder Tor zählt doppelt nur nach Seitenwechsel.",
  "coaching": "Wen hast du gesehen, bevor du gepasst hast?\nWohin nimmst du den ersten Kontakt, damit es weitergeht?\nWelchen Weg kannst du zumachen?",
  "spass": 5,
  "diff": 2,
  "skizze": {
    "li": [
      [
        10,
        88,
        270,
        88
      ],
      [
        26,
        54,
        254,
        54,
        "sz"
      ],
      [
        26,
        122,
        254,
        122,
        "sz"
      ]
    ],
    "tor": [
      [
        40,
        6,
        "h",
        24
      ],
      [
        216,
        6,
        "h",
        24
      ],
      [
        40,
        160,
        "h",
        24
      ],
      [
        216,
        160,
        "h",
        24
      ]
    ],
    "p": [
      [
        132,
        131,
        80,
        96,
        "p"
      ],
      [
        80,
        80,
        200,
        52,
        "p"
      ],
      [
        208,
        86,
        210,
        60,
        "l"
      ],
      [
        215,
        34,
        227,
        17,
        "s"
      ]
    ],
    "s": [
      [
        140,
        138,
        "g",
        "S"
      ],
      [
        70,
        88,
        "g",
        "S"
      ],
      [
        212,
        44,
        "g",
        "S"
      ],
      [
        134,
        88,
        "r",
        "O"
      ],
      [
        96,
        36,
        "r",
        "O"
      ],
      [
        176,
        30,
        "r",
        "O"
      ]
    ],
    "b": [
      [
        148,
        146
      ]
    ],
    "tx": [
      [
        140,
        177,
        "25 x 20 m - Tor nach Pass zählt doppelt"
      ]
    ]
  }
}
```

## Übung 2 — neuer Eintrag in `bibliothek.json`

```json
{
  "name": "Dreieckspassen mit Abschluss",
  "kat": "raute",
  "kurz": "Übungsform ohne Gegner: Innenseitenpass im Dreieck, Abschluss von Beginn an, ab Minute 4 mit zweitem Ball.",
  "spieler": "3 je Dreieck (12 = 4 Dreiecke auf zwei Feldern)",
  "feld": "Auf dem Spielfeld, Dreieck mit ca. 8 m Seitenlänge, Positionen mit Hütchen",
  "dauer": "13",
  "ablauf": "Zwischenblock der Einheit und der einzige Teil ohne Gegner – hier wird korrigiert statt gefragt. Start und Stopp sind erlaubt, die Ausgangssituation kehrt wieder. Abgeschlossen wird von der ersten Minute an: neun Minuten nur passen wäre für diese Altersklasse zu lang, und die Kontrollfrage des Konzepts lautet, ob jedes Kind ein Erfolgserlebnis hatte.\n\nMinute 0 bis 4: ein Ball je Dreieck. Innenseitenpass, Ballmitnahme in die offene Seite, nach dem Pass der eigenen Abspielrichtung nachrücken. Nach dem dritten Pass dribbelt das Kind aus dem Dreieck heraus und schließt aus der Schusszone auf ein Minitor ab, danach rückt es auf die freie Position nach.\n\nMinute 4 bis 8: ein zweiter Ball kommt dazu. Jetzt muss vor jedem Pass hingeschaut werden, weil die Zielposition besetzt sein kann. Der Abschluss bleibt.\n\nMinute 8 bis 13: zwei Durchgänge von zwei Minuten gegen das eigene Vorher – wie viele saubere Abschlüsse schafft das Dreieck? Gezählt wird je Dreieck, nie gegen ein anderes.",
  "varianten": "Leichter: Dreieck auf 6 m verkleinern, nur ein Ball, Kontakte frei. Schwerer: Dreieck auf 10 m, Pass in den Lauf, eine Minute je Durchgang mit dem schwächeren Fuß.",
  "coaching": "Standbein neben den Ball, Innenseite.\nKurz hinschauen, bevor du spielst.\nBall dorthin mitnehmen, wo du weiterspielen willst.",
  "spass": 3,
  "diff": 2,
  "skizze": {
    "z": [
      [
        30,
        20,
        220,
        140
      ]
    ],
    "h": [
      [
        70,
        102,
        "r"
      ],
      [
        140,
        38,
        "r"
      ],
      [
        140,
        142,
        "r"
      ]
    ],
    "s": [
      [
        70,
        90,
        "g",
        "A"
      ],
      [
        140,
        50,
        "g",
        "B"
      ],
      [
        140,
        130,
        "g",
        "C"
      ]
    ],
    "b": [
      [
        78,
        98
      ]
    ],
    "p": [
      [
        78,
        84,
        132,
        56,
        "p"
      ],
      [
        140,
        60,
        140,
        120,
        "p"
      ],
      [
        132,
        124,
        78,
        98,
        "p"
      ],
      [
        150,
        132,
        202,
        112,
        "d"
      ],
      [
        212,
        106,
        244,
        92,
        "s"
      ]
    ],
    "li": [
      [
        206,
        20,
        206,
        160,
        "sz"
      ]
    ],
    "tor": [
      [
        251,
        78,
        "v",
        28
      ]
    ],
    "tx": [
      [
        140,
        174,
        "Dreieck ca. 8 m - ab Minute 4 mit zweitem Ball"
      ]
    ]
  }
}
```

## Vorlage — neuer Eintrag in `vorlagen.json`

Die Einheit als Vorlage ohne Datum, im Trainingsplan übernehmbar. Blockfolge:

1. Straßenfußball-Fenster, 10 Minuten (vor der Einheit, kein Trainer auf dem Feld)
2. `Warm up Adler`, 13 Minuten — bestehender Eintrag, nicht duplizieren
3. `3 gegen 3 auf vier Minitore – Pass zählt doppelt`, 24 Minuten (Übung 1)
4. `Dreieckspassen mit Abschluss`, 13 Minuten (Übung 2)
5. `3 gegen 3 auf vier Minitore mit Schusszone`, 25 Minuten — bestehender Eintrag, offene
   Stufe auf 30 x 22 m plus Abschlussturnier über drei Runden zu 4 Minuten
6. Abbauen, 5 Minuten

Weitere Werte aus dem Ausbildungskonzept U9 (Fassung 3):

- Leitfrage: „Wie kriege ich den Ball zu einem, der frei ist?"
- Folge innerhalb der Leitfrage: 2 (von 4)
- Netto-Spielzeit in den Spielformen: 39 Minuten
- Skalierung — 8 Kinder: ein Feld, 4 gegen 4, im Zwischenblock zwei Vierergruppen als
  Raute statt Dreieck · 12 Kinder: zwei Felder, 3 gegen 3, vier Dreiecke · 16 Kinder:
  zwei Felder, 4 gegen 4, vier Vierergruppen als Raute
- Beobachtung: Welches Kind hat sich vor dem Pass umgeschaut, wer ist in die freie Lücke
  gestartet, wer hat den Passweg zugestellt?

**Wichtig — Schema nicht erweitern.** Die Feldnamen kommen ausschließlich aus den
bestehenden Einträgen in `uebungen/vorlagen.json`. Wo es für einen der Werte oben dort
kein Feld gibt, wird **nichts hinzuerfunden**: Dann gehört der Wert in ein vorhandenes
Textfeld, und der Befund wird hier im Paket unter „Was offen bleibt" vermerkt — so wie
im Paket Lehrgangsskizzen mit den drei Schema-Befunden verfahren wurde.

## Bild-Export für die Abgabe

Die beiden Skizzen über den vorhandenen Weg ausgeben, analog
`doku/auftrag-lehrgangsskizzen/export-skizzen.js`: je Übung eine SVG-Datei mit
Legendenstreifen und ein PNG aus genau dieser SVG über den Canvas-Weg von `skzTeilen`.
Ablage in `doku/auftrag-einheit-lf4/`, SVG eingecheckt, PNG erzeugbar.

Die PNG kommen anschließend in die Lehrgangsabgabe `Huetten_Aufgabe_2.2.docx` an die
Stellen „Aufbau" (Übung 1) und „Zwischenblock" (Übung 2).

## Abnahmekriterien

| Kriterium | Prüfung | Nachweis (v554) |
|---|---|---|
| Der Abgleich legt beide Übungen neu an und ändert keinen bestehenden Eintrag | `bibliothekAbgleich` gegen eine Attrappe mit den zwölf vorhandenen Übungen: **2 angelegt, 12 übersprungen**, Skizze bei beiden dabei | Prüffall b): Attrappe mit den zwölf bestehenden Einträgen, der Abgleich beim Öffnen schickt genau zwei `POST` mit den neuen Namen, beide mit `skizze`; kein bestehender Name darunter. Zweiter Lauf: 0 neu, 14 übersprungen |
| `stand` hochgesetzt | `2026-09-14-2` in `bibliothek.json`, sonst holt `_bibHolen` die Datei nicht | Prüffall a): Stand wörtlich `2026-09-14-2`, beide Übungen als letzte zwei Einträge, keine doppelten Namen. `vorlagen.json` auf `2026-09-14-4` |
| Nur vorhandene Elementtypen | Schlüssel jeder Spec gegen `EI_SKZ_LISTEN` (`z, tor, leiter, wand, p, li, h, s, b, tx`), Spielerfarben gegen `g, r, b, y, w`, Pfeiltypen gegen `SKZ_PFEIL` | Prüffall c): Schlüssel, Spieler- und Hütchenfarben, Pfeiltypen – alle drei Listen werden zur Laufzeit aus der App gelesen, nichts abgetippt. Keine Abweichung |
| Skizzen rendern im Detail und im Export identisch | `viewBox` `0 0 280 180`, Export serialisiert dieselbe `_skz`-Ausgabe | Prüffall c)/f): `viewBox` stimmt; die eingecheckte SVG enthält die `_skz`-Ausgabe zeichengleich, sonst wird „Export neu laufen lassen“ gemeldet |
| Lesbar am Handy | kein Spielerkreis näher als 24 px an einem anderen; falls eine Spec das reißt, Position melden statt den Renderer zu ändern | Gemessen: Übung 1 engster Abstand **39 px**, Übung 2 **80 px**. PNG 1120 × 864 px, im Vollbild am Handy ohne Zoomen lesbar (Sichtprüfung beider Bilder). Dieselbe Einschränkung wie im Paket Lehrgangsskizzen: Kürzel 8 px, Beschriftung 9 px im festen Maßstab von `_skz` |
| Vorlage übernehmbar | Vorlage erscheint im Trainingsplan und legt die fünf Blöcke mit den richtigen Übungen an, ohne dass eine Übung doppelt entsteht | Prüffall d)/e): `_evPruefung` ohne Fehler, kein Netto-Hinweis (39 von 49 Minuten brutto = 0,80, im Band 0,6–1,0). Übernahme auf den 18.09. schreibt fünf Phasen; Block 2 und 5 zeigen auf `Warm up Adler` und `3 gegen 3 auf vier Minitore mit Schusszone` aus dem Bestand, Block 3 und 4 auf die neuen. Die Übungstabelle bleibt bei 14 Zeilen, keine gleichnamige Kopie |
| `node tests/run.js` grün, `sw.js` hochgezählt | voller Lauf vor dem Bump | Voller Lauf grün auf v553, danach Bump auf **v554**, Übersicht mitgezogen |
| Keine neuen Programmdateien | `bibliothek.json` und `vorlagen.json` bleiben in der Ausnahmeliste im `fetch`-Handler von `sw.js`, nicht im Precache | Kein neues App-Modul, `PRECACHE` unverändert (54 Einträge), die Regel `/\/uebungen\/[^/]+\.json$/` im `fetch`-Handler greift für beide Dateien. Neu sind nur der Prüffall und das Exportskript in `doku/`, das den Baustein aus `doku/auftrag-lehrgangsskizzen/export-skizzen.js` aufruft statt ihn zu kopieren |

## Testfälle

1. Attrappe mit den zwölf bestehenden Übungen → Abgleich meldet 2 neu, 12 übersprungen. **Grün.**
2. Zweiter Lauf desselben Abgleichs → 0 neu, 14 übersprungen (keine Dubletten). **Grün.**
3. Spec-Prüfung beider Skizzen gegen `EI_SKZ_LISTEN` und den Farbsatz. **Grün.**
4. Vorlage übernehmen und prüfen, dass Block 2 und Block 5 auf die **bestehenden**
   Übungen zeigen und keine gleichnamigen Kopien anlegen. **Grün.**

Alle vier in `tests/checks/v554-einheit-lf4.js`; der Export läuft mit
`node doku/auftrag-einheit-lf4/export-skizzen.js` aus dem Projektordner.

## Was offen bleibt

### Nachträglich geändert — Durchsicht Charles, 15.09.2026

Zwei Befunde aus seiner Durchsicht der Exportbilder. Beide ändern den Wortlaut des
Pakets; deshalb stehen sie hier und nicht still im Code.

- **Übung 1, Abschluss stand außerhalb der Schusszone.** Der abschließende Spieler stand
  auf der Mittellinie (`y 88`) und schoss von dort aufs Tor — die Regel der Einheit lautet
  aber „Tore zählen nur aus der Schusszone“, und die Bildunterschrift der Abgabe nennt
  ausdrücklich den „Abschluss aus der Schusszone“. Korrigiert: der Spieler steht jetzt bei
  `y 44`, also zwischen Grundlinie und Zonenlinie (`y 54`), ein Laufweg zeigt, wie er
  hineingestartet ist, und der Schuss beginnt bei `y 34`. Der zentrale Verteidiger ist auf
  die Mittellinie gerückt (`134, 88`), damit die Verlagerung nicht durch seinen Kreis läuft.
  Übung 2 war schon richtig: dort endet das Dribbling bei `x 202` vor der Zonenlinie
  `x 206`, und der Schuss beginnt bei `x 212` dahinter.
- **Übung 2, neun Minuten ohne Abschluss.** Der Aufbau ließ den Torschuss erst ab Minute 9
  zu — davor wurde nur gepasst. Für diese Altersklasse zu lang, und §10 des
  Ausbildungskonzepts fragt nach jeder Einheit, ob **jedes Kind ein Erfolgserlebnis** hatte.
  Neu: abgeschlossen wird ab der ersten Minute, gesteigert wird über das Material (zweiter
  Ball ab Minute 4) und den Wettbewerb (ab Minute 8 zwei Durchgänge gegen das eigene
  Vorher). Die drei Steuerungsgrößen der Abgabe bleiben damit erhalten, nur ihre
  Reihenfolge ändert sich. `kurz` und die Bildunterschrift der Skizze ziehen mit, ebenso
  das Label des Zwischenblocks in der Vorlage.

**Von Hand nachzuziehen in `Huetten_Aufgabe_2.2.docx`:** die Minutenangaben des
Zwischenblocks (0–4 / 4–8 / 8–13 statt 0–5 / 5–9 / 9–13), die Bildunterschrift zu Skizze 2
(„Ab Minute 9 dribbelt das Kind …“), und beide Exportbilder neu einsetzen. Zusätzlich ein
Widerspruch, der nicht aus diesem Paket stammt: die Materialliste der Abgabe nennt
„12 Bälle Größe 3“, der Bestand der Mannschaft führt seit v552 ausschließlich Größe 4.
Eines von beidem stimmt nicht.


Schema-Befunde – nichts hinzuerfunden, alles über vorhandene Felder:

- **Folge 2 (von 4) war besetzt.** Leitfrage 4 hatte mit v551 bereits die Folgen 1 bis 4
  (`L4-1` bis `L4-4`), darunter `L4-2 Passen – Lehrgangsform 15:30:15:30` als 90-Minuten-Fassung
  derselben Idee. Eine bestehende Einheit umzunummerieren hätte den Bestand angefasst; die
  Einheit hängt deshalb als **`L4-5`, `folge_nr` 5** an. Der Prüffall v551 zählt die zwanzig des
  Konzepts weiter und benennt die Zusatz-Einheit ausdrücklich, statt sie still mitzuzählen.
  Ob sie später `L4-2` ersetzen soll, entscheidet Charles.
- **Kein Blocktyp für „Abbauen“.** `EI_TYPEN` kennt `warmup, main, spielform, uebungsform,
  abschluss, tw, individual`; `abschluss` ist im Trainingsplan freies Spiel und zählt in die
  Spielform-Summe. Ein Abbau-Block als `abschluss` hätte die Netto-Rechnung verfälscht. Die
  fünf Minuten stehen deshalb in keinem Block; `dauer_min` trägt die 90 Minuten des Termins,
  die Blöcke summieren sich auf 85.
- **Zwischenblock als `uebungsform`.** Der einzige Blocktyp, der die Übung ausdrücklich als
  Übungsform führt und nicht in die Spielform-Summe zählt – so bleibt die Netto-Rechnung bei
  39 von 49 Minuten (Spielblock 1 und 2) im Band.
- **Teil A / Teil B von Spielblock 1** haben kein eigenes Feld; sie stehen im `label` des
  Blocks und im `ablauf` der Übung.
- **`ordnung`** ist mit `Dreieck (3 gegen 3)` belegt, dem Wert aus der geschlossenen Liste, der
  der 12-Kinder-Fassung entspricht; die 8- und 16-Kinder-Fassungen (4 gegen 4) stehen in der
  Skalierung.
- Die Übungstexte stammen wörtlich aus dem Paket und wurden nicht fachlich verändert.

## Nachtrag ins Projektgedächtnis

Nach der Umsetzung: Eintrag in `Projektgedaechtnis/entscheidungen.md` im privaten Repo
`adler-u9-wissen` — zwei neue Übungen, eine Vorlage, Skizzen aus der App statt extern.
**Google Drive ist danach von Hand nachzuziehen**, Claude Code hat dort keinen Zugriff.

Erledigt mit v554: `stand.md` (A2, A3, B3) und `entscheidungen.md` (angehängt) im privaten
Repo nachgezogen. Die PNG liegen im Repo unter `doku/auftrag-einheit-lf4/` und müssen von
Hand in `Huetten_Aufgabe_2.2.docx` und in den Drive-Ordner Basis-Coach Lehrgang.
