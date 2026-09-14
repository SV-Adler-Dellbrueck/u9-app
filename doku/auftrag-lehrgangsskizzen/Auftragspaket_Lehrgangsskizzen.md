# Auftragspaket: Skizzen zur Lehrgangsübung „Orientierung in Dreieck und Raute"

Repo `SV-Adler-Dellbrueck/u9-app`, Stand 14.09.2026, umgesetzt mit **v547**.
Gilt zusammen mit `CLAUDE.md`.

> **Status: umgesetzt.** Die Abnahmekriterien stehen unten mit dem Nachweis je Punkt.

## Ausgangslage

Die Skizzen gehören zur Abgabe 2.1 im DFB-Basis-Coach (Arbeitsblatt Trainingsphilosophie
Deutschland). Auftrag war ausdrücklich, sie **nicht extern zu zeichnen**, sondern in der
App entstehen zu lassen, damit Trainingskonzeption, App und Lehrgangsunterlagen aus einer
Quelle kommen.

Gebaut wurde nichts Neues: Renderer (`_skz` in `data.js`), Tipp-Editor (`md-skizze.js`),
Bild-Export (`skzTeilen` in `md-skizze.js`) und der Abgleich beim Öffnen
(`bibliothekAbgleich` in `md-einheit-import.js`) gab es bereits. Dieses Paket ist ein
**Inhalts-Nachtrag** in `uebungen/bibliothek.json` plus die Bilddateien für die Abgabe.

## Drei Befunde aus dem Schema — und was daraus folgte

Der Auftrag enthielt drei Vorgaben, die das bestehende Schema nicht hergibt. Erweitert
wurde es nicht; stattdessen wurde jedes Mal der vorhandene Weg genommen.

### 1 · An einer Übung ist genau **eine** Skizze vorgesehen

`trainingsformen.skizze` ist eine einzelne `jsonb`-Spalte, `boot.js` macht daraus genau
ein `f.svg` (`f.svg=(f.skizze&&typeof f.skizze==="object")?_skz(f.skizze):""`), und der
Import bildet ein einziges `skizze`-Feld ab (`md-einheit-import.js`, `_eiUebungAnlegen`).
Ein zweites Feld bekäme niemand zu sehen.

**Folge:** zwei Einträge statt eines — „3 gegen 3 – Dreieck (Grundform)" und
„4+1 gegen 4+1 – Raute (Steigerung)". Das entspricht zugleich dem Muster, das die App mit
`UEB_REIHEN` (v518) schon für eine Übung in mehreren Stufen kennt.

### 2 · Eine „Nachtragsdatei" in `uebungen/` würde nie gelesen

Der Abgleich holt zwei fest verdrahtete Pfade:

```js
const BIB_DATEI="uebungen/bibliothek.json";
const VOR_DATEI="uebungen/vorlagen.json";
```

Ein dritter Dateiname käme bei keinem Trainer an. **Folge:** der Nachtrag steht am Ende
des `uebungen`-Arrays in `bibliothek.json`, und `stand` ist auf `2026-09-14-1` gesetzt —
ohne neuen Stand holt `_bibHolen` die Datei gar nicht erst.

### 3 · Es gibt weder Schwarz noch Orange, und Beschriftungen sind nicht blau

`_skz` kennt fünf Spielerfarben: `g` grün, `r` rot, `b` blau, `y` gelb, `w` weiß. Jeder
`tx` wird fest in `rgba(255,255,255,.85)` geschrieben.

**Folge:** die App-Konvention — grün für das eigene Team, rot für den Gegner — und die
Zugehörigkeit zusätzlich als Kürzel im Kreis (`S`, `O`, `TW`), damit die Farbe nicht der
einzige Bedeutungsträger ist. Die Beschriftung bleibt weiß: Blau (`#60a5fa`) käme auf dem
Rasen `#2d6a2d` auf etwa 2,6:1 und läge damit unter den 4,5:1 aus `CLAUDE.md`.

Dazu kam ein vierter, kleinerer Punkt: einen **neutralen Verbindungsstrich** gibt es
nicht, `li` kennt nur Mittellinie und Schusszone. Die Verbindungen im Dreieck und in der
Raute sind deshalb **Pass-Pfeile** (`p` mit Typ `p`) — der vorhandene Typ, er steht in der
Legende, und er trägt genau die Bedeutung, um die es beim Spiel im Ballbesitz geht.

## Der Nachtrag

Beide Einträge in `uebungen/bibliothek.json`, Kategorie `raute`:

| Name | Feld | Spieler | Skizze |
|---|---|---|---|
| 3 gegen 3 – Dreieck (Grundform) | 25 x 20 m, vier Minitore, zwei Schusszonen | 6 | Dreieck: einer tief, zwei breit auf Mittellinienhöhe; drei Gegenspieler gegenüber, einer davon im Passweg |
| 4+1 gegen 4+1 – Raute (Steigerung) | 30 x 22 m, zwei Jugendtore mit Torhütern | 8+2 | Raute: hinten, zwei breit, vorne; vier Gegenspieler, zwei davon in den Räumen zwischen den Rauten-Spielern |

## Bild-Export für die Abgabe

`export-skizzen.js` erzeugt je Übung eine **PNG-** und eine **SVG-Datei mit Legende**.
Die Zeichnung selbst kommt unverändert aus `_skz` — dieselbe wie im Übungsdetail. Der
Legendenstreifen darunter liest Farben und Namen aus `SKZ_PFEIL` und `SKZ_PFEIL_NAME`,
statt sie abzutippen. Das PNG entsteht aus **genau diesem** SVG über denselben
Canvas-Weg wie „Skizze teilen"; PNG und SVG können deshalb nicht auseinanderlaufen.

Aufruf aus dem Repo-Wurzelverzeichnis (braucht `npm install` wie das Prüfwerkzeug):

```bash
node doku/auftrag-lehrgangsskizzen/export-skizzen.js
```

Im Paket liegen die beiden SVG; die PNG sind daraus jederzeit neu erzeugbar und deshalb
nicht mit eingecheckt.

## Abnahme — Stand der Umsetzung (geprüft 14.09.2026)

| Kriterium | Nachweis |
|---|---|
| Import über den Abgleich legt neu an und ändert nichts Bestehendes | `tests/checks/v547-lehrgangsuebung.js` fährt den echten `bibliothekAbgleich` gegen eine Attrappe, in der die zehn älteren Übungen schon stehen: **2 angelegt, 10 übersprungen**, Skizze bei beiden dabei |
| Beide Skizzen rendern im Detail und im Export identisch | Der Export serialisiert dieselbe `_skz`-Ausgabe, die das Detail zeigt; die Prüfung kontrolliert die `viewBox` `0 0 280 180`, nach der `skzTeilen` sucht |
| Nur vorhandene Elementtypen | Die Prüfung vergleicht die Schlüssel jeder Spec gegen `EI_SKZ_LISTEN` (`z, tor, leiter, wand, p, li, h, s, b, tx`) und die Spielerfarben gegen den Farbsatz |
| Lesbar am Handy ohne Zoomen | Gemessen: Skizze 280 px breit, Spielerkreis 16 px, kein Kreis näher als 24 px an einem anderen (Grundform 57 px). **Einschränkung, gemeldet statt behoben:** die Kürzel im Kreis stehen mit 8 px, die Beschriftung mit 9 px — das ist der feste Maßstab, mit dem `_skz` jede Skizze zeichnet; größer ginge nur durch eine Änderung am Renderer, die alle bestehenden Skizzen mit trifft |
| `node tests/run.js` grün, `sw.js` hochgezählt | v547, voller Lauf grün |
| Neue Dateien in Precache, Loader, MODUL_WACHE | **Keine neuen Programmdateien.** `uebungen/bibliothek.json` steht bewusst **nicht** im Precache, sondern in der Ausnahmeliste im `fetch`-Handler von `sw.js` — aus dem Cache gelesen stünde sie für immer auf dem Stand der Installation |

## Was offen bleibt

Die Übungstexte (Ablauf, Varianten, Coaching-Fragen) sind ein erster Entwurf aus der
Skizze heraus. Sie gehören vor der Abgabe einmal fachlich durchgesehen — insbesondere, ob
die Leitfragen zum Ausbildungskonzept U9 (Fassung 3) passen.
