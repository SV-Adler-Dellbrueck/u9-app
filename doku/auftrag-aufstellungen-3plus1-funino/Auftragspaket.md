# Auftragspaket: Sechs Einheiten für 3+1 und FUNiño

Repo `SV-Adler-Dellbrueck/u9-app`, Stand 16.09.2026 (App v567). Gilt zusammen mit `CLAUDE.md`.
Beschlüsse dahinter: `entscheidungen.md` im privaten Repo, Einträge vom 16.09.2026
(3+1: Raute ohne Aufpasser · FUNiño: Dreieck ohne Jäger · Rollen wandern mit der Rotation).

## Was geliefert wird

In diesem Ordner liegen zwei Dateien; die lesbare Fassung für das Trainerteam liegt im Drive-Ordner `SV Adler Dellbrück/U9 I`:

| Datei | Inhalt |
|---|---|
| `uebungen-nachtrag.json` | 12 neue Übungen im Schema `adler-uebungen/1`, jede mit Skizze als Elementliste |
| `vorlagen-nachtrag.json` | 6 neue Vorlagen im Schema `adler-vorlagen/1`, alle mit `stationen` |
| (Drive) `Einheiten 3+1 und FUNiño` | Die sechs Einheiten in Trainersprache nach dem festen Schema (Kopf, Blöcke, Skalierung, Netto, Beobachtung, Notiz) |

Die Vorlagen:

| Name | Leitfrage | Ordnung | Hauptteil 1 und 2 (Stationen) | Hauptteil 3 |
|---|---|---|---|---|
| L4-6 3+1 – Adler: breit werden, der Torwart spielt mit | Frage 4 | 3+1 | 3+1 gegen 2 – Adler aus dem Tor · 2 gegen 1 plus Torwart – der Flitzer macht es breit | 3+1 gegen 3+1 – Raute ohne Aufpasser |
| L5-4 3+1 – Raute ohne Aufpasser: wo stehe ich? | Frage 5 | 3+1 | 3 gegen 2 plus Torwart – Jäger und zwei Flitzer · 3+1 gegen 2 – Adler aus dem Tor | wie oben |
| L6-3 3+1 – Igel: die Flitzer schließen die Lücke | Frage 6 | 3+1 | Igel gegen drei – Torwart und zwei Flitzer verteidigen · 2 gegen 2 plus Torwart – Jäger läuft an, Flitzer stellt zu | wie oben |
| L4-7 FUNiño – der Aufpasser verteilt | Frage 4 | FUNiño | FUNiño 3 gegen 3 – Seitenwechsel zählt doppelt · FUNiño 3 gegen 1 – der Mittlere hat den Ball | 3 gegen 3 auf vier Minitore mit Schusszone (vorhanden) |
| L5-5 FUNiño – links, Mitte, rechts | Frage 5 | FUNiño | FUNiño 3 gegen 3 – einer bleibt hinter dem Ball · FUNiño 3 gegen 2 mit Wandspieler – links, Mitte, rechts | wie oben |
| L6-4 FUNiño – einer drängt, zwei schützen | Frage 6 | FUNiño | FUNiño 3 gegen 3 – Mittellinie verteidigen · FUNiño 2 gegen 2 – einer drängt, einer schützt | wie oben |

Aufbau jeder Vorlage (70 Min. in Blöcken, 5 Min. Abbauen ohne Block wie bei L4-5):
Straßenfußball-Fenster 10 · Warm up Adler, kurz 8 · Hauptteil 1 mit zwei Stationen 12 ·
Hauptteil 2 mit denselben zwei Stationen 12 · Hauptteil 3 offen 10 · Abschlussturnier 18.
Netto 38 Min. bei 52 Min. Spielform-Blöcken (73 %, im Band 0,6–1,0).

**Warum Hauptteil 1 und 2 dieselbe Stationsliste tragen:** `tpVersatz` rückt die Gruppen von
Hauptteil zu Hauptteil eine Station weiter. Bei zwei Feldtrainern ist das der Tausch – jede
Gruppe erlebt beide Stationen, ohne dass jemand „⇄ weiterrücken“ drückt. Das ist die Logik aus
v514/v537, nichts Neues.

## Vorab geprüft (in der Cloud-Sitzung des Projekts, gegen den Code von v567)

Beide Dateien sind mit den echten Funktionen `_euPruefung` und `_evPruefung` aus
`md-einheit-import.js` gegen den Bestand geprüft (107 Übungen aus `data.js` plus
`bibliothek.json` plus Nachtrag): **keine Fehler**. `_evNettoHinweis` meldet für keine der sechs
etwas, `_evStationenHinweis(v, 2)` ebenfalls nicht. Voraussetzung dafür war die Erweiterung von
`EI_ORDNUNGEN` (Schritt 2) – ohne sie weist die Prüfung alle sechs ab. Alle zwölf Skizzen sind
mit `_skz` gerendert und angesehen; keine handgeschriebene SVG, die Sperrklinke aus v549 bleibt
unberührt.

**Bitte trotzdem selbst nachprüfen, nicht darauf verlassen** – die Prüfung lief außerhalb des
Browsers mit Attrappen für DOM und Supabase.

## Schritte

1. **Übungen:** Die zwölf Einträge aus `uebungen-nachtrag.json` an `uebungen/bibliothek.json`
   anhängen, `stand` auf `2026-09-16-1`. Keine bestehende Übung ändern.
2. **Ordnung:** `EI_ORDNUNGEN` in `md-einheit-import.js` um `"3+1"` und `"FUNiño"` ergänzen,
   in dieser Reihenfolge hinter `"Raute (4 gegen 4)"`. Keine Migration nötig – die Spalte
   `trainingsvorlagen.ordnung` ist Text ohne Check-Constraint (geprüft in
   `20260914_vorlagen_ordnung.sql`). Den Spaltenkommentar per kleiner Migration nachziehen, damit
   er nicht lügt. Hilfe-Text zur Kachelreihe „Ordnung“ und `v550-vorlagen-ordnung.js` anpassen,
   falls dort die Liste fest steht.
3. **Vorlagen:** Die sechs Einträge aus `vorlagen-nachtrag.json` an `uebungen/vorlagen.json`
   anhängen, `stand` auf `2026-09-16-1`.
4. **Einordnung:** Die zwölf neuen Übungen in `UEBUNG_ART_VORSCHLAG` (data.js) als `"spiel"`
   ergänzen – alle sind Spielformen mit Gegner und laufendem Spielfluss. Der Vorschlag wird wie
   bisher erst auf Tipp geschrieben.
5. **v551:** Die sechs Namen als Zusatz-Einheiten benennen (`ZUSATZ` um `L4-6`, `L5-4`,
   `L6-3`, `L4-7`, `L5-5`, `L6-4` erweitern). Die Prüfung der zwanzig Konzept-Einheiten bleibt,
   wie sie ist. Fälle e) (Skalierung, Rollenbezug) und c) (Prüfung) sollten auch für die
   Zusatz-Einheiten gelten.
6. **Neue Prüfdatei** `tests/checks/v568-aufstellungen-3plus1-funino.js` mit den
   Abnahmekriterien unten.
7. Funktionsübersicht (Stand-Zeile), Hilfe zu „Vorlage übernehmen“ (neue Ordnungen), dann
   `node tests/run.js` grün, dann `sw.js` auf v568.

## Abnahmekriterien

1. Die echten Dateien laufen ohne Fehler durch `_euPruefung` und `_evPruefung`.
2. Der Abgleich legt 12 Übungen und 6 Vorlagen an und rührt den Bestand nicht an.
3. `L4-6` übernehmen bei **zwei** Feldtrainern: zwei Felder. Hauptteil 1: Feld 1 „3+1 gegen 2 –
   Adler aus dem Tor“, Feld 2 „2 gegen 1 plus Torwart …“. Hauptteil 2: dieselben Übungen, die
   **Gruppen getauscht** (Versatz 1). Hauptteil 3: beide Felder „3+1 gegen 3+1 – Raute ohne
   Aufpasser“.
4. Dieselbe Vorlage bei **drei** Feldtrainern: drei Felder. Laut Paket B (Auftrag Stationen)
   wiederholt sich die Stationsliste (Feld 3 = Station 1) – bitte im Code bestätigen, nicht
   annehmen. Kein Hinweis „Stationen entfallen“.
5. Keine der sechs löst einen Netto-Hinweis aus; alle tragen Skalierung 8/12/16 und eine
   Beobachtungsfrage mit Aufpasser, Flitzer oder Jäger.
6. Im Fenster „Vorlage übernehmen“ erscheinen die Kacheln „3+1“ und „FUNiño“, und sie filtern.
7. Die zwölf Skizzen rendern in dunkel und hell; die Sperrklinke aus v549 bleibt bei ihrem Wert.

## Erst prüfen, nicht bauen

- **Hauptteil 3 bei 3+1:** Bei 12 Kindern spielen beide Gruppen auf **einem** Feld (3+1 gegen
  3+1 mit je zwei Rotationsspielern). Das geht heute von Hand über „✕ Feld weglassen“ am
  Hauptteil (`slot.weg`). Die Vorlage kann das nicht vorgeben. Bitte nur prüfen und berichten,
  ob ein optionales Feld je Block (etwa `felder: 1`) additiv ins Schema passt – **nicht bauen**,
  Charles entscheidet.
- **Prüfauftrag aus `entscheidungen.md` vom 16.09.:** Wie sind die Formationen ADLER/IGEL und die
  Zuordnung Position → Rolle abgelegt? Reicht für 3+1 und FUNiño eine reine Datenänderung? Bindet
  die Formation ein Kind fest an eine Position (beim FUNiño wandern die Rollen)? Setzen Szenarien im
  Taktik-Quiz im 3+1 einen Aufpasser oder im FUNiño einen Jäger bzw. Torwart voraus? Ergebnis
  als Notiz ins private Repo, Umbau erst nach Rückmeldung.

## Quellen der Spielformen

- Durchführungsbestimmungen Kinderfußball Kreis Köln (ab 01.08.2026): Spielformen U9, Feldgröße
  ca. 25 x 20 m, Jugendtore auf 1,65 m, Schusszone ca. 6 m vor Minitoren, Treffer auf Jugendtore
  nur aus der gegnerischen Hälfte, Drei-Tore-Regel, Torwart soll mitspielen.
- DFB-Akademie, Trainingspraxis: 3 gegen 3 im Funino-Feld, Mittellinie verteidigen.
- SBFV, Trainingssammlung F-Jugend: 2 gegen 1 mit Torhüter.
- Coachingfragen nach Horst Wein (fussballtraining24.de): 3 gegen 1 auf zwei Tore, der mittlere
  Spieler soll den Ball haben.
- 1x1SPORT zu FUNiño nach Horst Wein: Wandspieler zwischen den Toren.
- fussball-training.org Trainerblog: Das Kind in der Mitte entscheidet, wie das Kind im Tor beim
  4+1.

Die drei Formen aus SBFV, DFB-Akademie und nach Wein sind abgewandelt und tragen deshalb
„angelehnt an“ im Kurztext.

## Pflichten (aus `CLAUDE.md`)

`node --check`, `node tests/run.js` grün, dann `sw.js` hochzählen. Typografische
Anführungszeichen, keine Kindernamen. Entwurfs-PR, zusammengeführt wird auf Charles' Wort.
Zweitschrift der Notiz im privaten Repo.
