# Auftragspaket: Kinderfragen nach Leitfragen – „Adler-Schule“, Leitfragen 1–6

Repo `SV-Adler-Dellbrueck/u9-app`, Stand 21.11.2026. Gilt zusammen mit `CLAUDE.md` und dem
Paket `doku/auftrag-taktikquiz-3plus1-funino` (Feld je Spielform, Schritt 1, wird hier
mitbenutzt).

Charles 21.11.: Neben dem Taktik-Quiz sollen die Kinder auch Grundsätzliches üben – wie
stelle ich mich als Verteidiger, wie komme ich an einem vorbei. Ausgewählt (Kachel): zuerst
Leitfrage 6 „Wie hole ich mir den Ball zurück?“ und Leitfrage 2 „Wie komme ich an einem
vorbei?“ aus dem Ausbildungskonzept U9 Fassung 3, je 10 Fragen, dazu zwei neue Fragearten.
Nachtrag 21.11. (Charles: „Weiter geht's. Passt so“): Leitfragen 1, 3, 4 und 5 mit je 10 Fragen
ergänzt – zusammen **60 Fragen**. Kachelname **„Adler-Schule“** bestätigt, `lf2-07` bestätigt.

## Warum neue Fragearten

Das Taktik-Quiz kennt nur „Steine schieben“. Damit lässt sich zeigen, wo die Mannschaft steht,
aber nicht Abstand, Stellung zum Gegner oder der richtige Moment. Drei Arten decken das ab:

| `typ` | Was das Kind tut | Wofür |
|---|---|---|
| `tippen` | tippt eine Stelle auf dem Feld an (Raum, Tor, Seite) | freie Seite, freies Tor, wohin lenken |
| `ab` | wählt zwischen zwei Mini-Feldern A und B | Abstand, Stellung, Laufweg, Haken |
| `szene` | sieht eine kurze Animation, wählt aus drei Antworten | richtiger Moment, Entscheidung |

## Was geliefert wird

`kinderfragen-nachtrag.json`, Schema `adler-kinderfragen/1`, Stand `2026-11-21-2`, 60 Fragen (`lf1-01` … `lf6-10`,
je Leitfrage 10, alle drei Fragearten gemischt). Gemeinsame Felder: `id` (stabil, nie umbenennen – Fortschritt und Federn
hängen daran), `leitfrage` (1–6), `stufe` (`U8` | `U9` | `U10`), `typ`, `feld`
(`3+1` | `funino` | `4+1`, Zeichnung wie im Quiz-Paket), `frage`, `erklaerung.richtig`,
`erklaerung.falsch`, `quelle` (Liste, nur für Trainer sichtbar).

- `ab`: `bilder` (genau 2), je `spieler` (`seite: "wir" | "gegner"`, `x`, `y`, optional
  `rolle`), `ball`, optional `pfeile` (`art: "dribbel" | "lauf" | "pass"`, `von`, `nach`,
  optional `ueber` als Knickpunkt; `art: "blick"` = kurzer Blickpfeil am Stein für die
  Körperstellung, siehe `lf5-06`) und `ausschnitt` (`x`, `y`, `w`, `h` in Feldprozent –
  vergrößerter Ausschnitt fürs 1 gegen 1); `richtig` 0 oder 1.
- `tippen`: `spieler`, `ball` und **entweder** `ziele` (Kreise `x`, `y`, `r`; Treffer = Tipp in
  einem der Kreise) **oder** `ziel_spieler` (Index in `spieler`; Treffer = Tipp auf diesen
  Stein, Trefferfläche mindestens 48 px).
- `szene`: `spieler`, `ball`, `anim` (`ball.nach`, `gegner[i].nach`, optional `wir[i].nach`),
  `optionen` (genau 3), `richtig` (Index).

Koordinaten wie im Taktik-Quiz: x 0–100, y 0–100, eigenes Tor unten. Alle 20 Bilder sind als
Vorschau gerendert und angesehen; die Darstellung im echten Bau bitte selbst prüfen.

Fachliche Grundlage je Frage steht in `quelle` (DFB-Trainingseinheiten, Ausbildungskonzept,
Beschlüsse vom 16.09.). `lf2-07` (Zeitpunkt des Hakens) beruht auf Trainerwissen ohne
Primärquelle und ist von Charles bestätigt.

## Schritte

1. **Daten.** Die Fragen kommen in eine eigene Liste (`KF_FRAGEN` o. ä.) neben
   `TQ_SCENARIOS`, nicht in die Taktik-Szenarien. Prüfen, ob eine Datei unter `uebungen/`
   mit Abgleich beim Öffnen der bessere Ort ist (spätere Nachträge ohne Codeänderung) – dann
   so bauen und begründen.
2. **Zeichnen.** Feld und Steine über dasselbe Zeichenwerkzeug wie die Übungsskizzen (`_skz`),
   damit dieselben Bilder auch in Übungen und am Platz gezeigt werden können. Pfeile:
   Dribbeln durchgezogen, Laufen gestrichelt, Pass wie in den Skizzen. `ausschnitt` als
   `viewBox`-Zuschnitt.
3. **Fragearten.** `tippen`: Tipp aufs Feld, Markierung, „Prüfen“, danach Lösungskreis.
   `ab`: zwei Felder untereinander (Handy) bzw. nebeneinander (breit), je eine große
   Wahlfläche „A“ / „B“ (mind. 56 px hoch), danach richtiges Bild mit ✓ und Rahmen – nicht nur
   Farbe. `szene`: Animation mit der vorhandenen Technik des Quiz (Ball und Steine gleiten),
   „Nochmal ansehen“, dann drei große Antwortknöpfe; Reihenfolge der Antworten gemischt.
   Feedback, Vibration, Konfetti und Ergebnisbildschirm wie im Taktik-Quiz (dort nach Paket
   Taktik-Quiz Schritt 5 schon anteilig und mit Blocknamen).
4. **Einstieg in der Kabine.** Neue Kachel „Adler-Schule“ neben „Taktik-Quiz“
   (Name mit Charles klären, Kachel-Frage im Chat). Darin Blöcke je Leitfrage mit der Frage
   als Überschrift („Wie hole ich mir den Ball zurück?“). Liegt für die aktuelle Woche eine
   Trainingsvorlage mit Leitfrage im Plan, steht dieser Block oben. `stufe` steuert nur die
   Reihenfolge (U8 zuerst), wird dem Kind **nie** angezeigt – kein Niveau-Etikett.
5. **Fortschritt und Federn** über die `id` wie im Wissens-Quiz (je Frage einmal gutgeschrieben,
   idempotent), Fortschritt lokal und – wo vorhanden – im bestehenden Quiz-Fortschritt. Keine
   neue Tabelle, wenn es ohne geht; sonst RLS und Backup nach `CLAUDE.md`.
6. **Vorlesen.** Ohne Aufnahmen (Beschluss 21.11.: erst Inhalte fertig, dann alles mit der
   Maskottchen-Stimme „Lennart“ vertonen). Bis dahin Gerätestimme; Sprechtext = `frage`, bei
   `szene` zusätzlich die drei Antworten.
7. **Prüffall** `tests/checks/v9xx-kinderfragen.js`: Schema je Typ (2 Bilder, 3 Optionen,
   `richtig` im Bereich, Ziele im Feld, kein Stein im Zielkreis, `ziel_spieler` zeigt auf einen eigenen Stein), keine geraden Anführungszeichen,
   keine Großfeld-Wörter (Strafraum, Pfosten, Flanke, Einwurf, Eckstoß, Schiri), `id` eindeutig,
   `stufe` nirgends in der Kinderoberfläche sichtbar.
8. Hilfe, Rundgang der Kabine, Funktionsübersicht; `node tests/run.js` grün; `sw.js` hoch.
   Eltern sehen eine Neuerung → Adlerschmiede-Zeile erst nach Charles' Freigabe.

## Merkkarten (Charles 21.11.: „Ja, ins Paket“)

Neben dem Quiz Karten zum Anschauen, je Leitfrage vier, zusammen 24, im selben JSON unter
`merkkarten`: `id`, `leitfrage`, `bild_aus` (Frage-ID, deren Bild die Karte zeigt – bei `ab`
das richtige Bild über `bild_index`, bei `tippen` mit Lösungskreis bzw. markiertem Stein, bei
`szene` das Endbild der Animation), `merksatz` (ein Satz, kindgerecht) und `adler_pose`
(Beschreibung für ein späteres Bild des Comic-Adlers; bis dahin bleibt der Platz leer bzw.
zeigt das Standardbild des Maskottchens – kein Platzhaltertext).

Einsatz: (a) in jedem Block der Adler-Schule oben „Anschauen“ vor „Los geht's“ – die vier
Karten zum Wischen; (b) nach einer falschen Antwort „Zeig's mir“, wenn eine Karte dieselbe
Frage als `bild_aus` hat, sonst die erste Karte der Leitfrage; (c) für Trainer: Karte als Bild
teilen bzw. im Live-Vollbild am Platz zeigen (vorhandene Wege prüfen, nichts Neues bauen,
wenn es nicht passt – dann im PR sagen). Ins Adler Nest kommt eine Karte über den Projekt-Chat,
nicht automatisch. Merkkarten geben keine Federn. Vorlesen später mit Lennart (Merksatz).

Abnahme: Block „Wie hole ich mir den Ball zurück?“ zeigt „Anschauen“ mit vier Karten; `mk6-1`
zeigt das richtige Bild B aus `lf6-01` und den Merksatz; nach falscher Antwort auf `lf6-01`
öffnet „Zeig's mir“ genau diese Karte. Prüffall: jede `bild_aus` verweist auf eine vorhandene
Frage derselben Leitfrage, `bild_index` passt zu `richtig`.

## Abnahmekriterien

1. In der Kabine öffnet „Adler-Schule“ sechs Blöcke, je Leitfrage einer mit 10 Fragen und der
   Leitfrage als Überschrift.
2. `lf6-01` zeigt zwei vergrößerte 1-gegen-1-Bilder; „B“ ist richtig und wird nach dem Tippen
   mit ✓ und Rahmen markiert.
3. `lf6-03`: Tipp links außen = richtig, Tipp in die Mitte = falsch mit Lösungskreis.
4. `lf6-04`: die Szene spielt den zu weit springenden Ball ab, „Nochmal ansehen“ wiederholt sie,
   danach drei Antworten in wechselnder Reihenfolge.
5. `lf4-01`: Tipp auf den freien Mitspieler rechts = richtig, auf den gedeckten = falsch.
6. Alle drei Fragearten sind bei 360 px Breite ohne Scrollen innerhalb einer Frage bedienbar,
   Antwortflächen ≥ 56 px, Schrift ≥ 11,5 px, hell und dunkel.
7. Eine bereits richtig beantwortete Frage bringt beim zweiten Mal keine weiteren Federn.
8. Ganze Prüfreihe grün.
