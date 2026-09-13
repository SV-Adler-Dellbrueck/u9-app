# Auftragspaket: Vorlagen übernehmen mit Stationen und Gruppen

Repo `SV-Adler-Dellbrueck/u9-app`, Stand 13.09.2026. Gilt zusammen mit `CLAUDE.md`.

## Ausgangslage — was schon da ist

Der Trainingsplan kann bereits mehr, als beim Übernehmen einer Vorlage ankommt. Laut Hilfe und
Code: Stationen je Hauptteil mit je einem Trainer und einer Übung, Gruppen im Ringtausch von
Hauptteil zu Hauptteil („⇄ weiterrücken", „↩ automatisch"), Torwart- und Einzeltraining parallel
zum Hauptteil, Trainer-Chips aus den Rückmeldungen, „Feld weglassen", Stationstimer, und im Kopf
der Seite bereits ein Spielform-Anteil in Prozent.

**Nichts davon wird neu gebaut.** Dieses Paket schließt drei Lücken zwischen Vorlage und Plan.

## Was am 13.09. beim Übernehmen von L4-1 schiefging (Termin Fr 18.09.)

1. Die Übung der Vorlage („4gg2 Ballbesitz") landete in jeder Stufe nur bei der **ersten** Gruppe.
   Die anderen Felder blieben leer („— Übung wählen —").
2. Es erschienen zwei Kadergruppen mit je sieben Kindern plus eine dritte Gruppe, obwohl elf Kinder
   erwartet waren — und die dritte Gruppe stand bei **Markus**, der Organisation und
   Elternkommunikation verantwortet, nicht Felder.
3. Die Vorlage sagt in ihrer Skalierung, wie 8, 12 oder 16 Kinder aufzuteilen sind; der Plan hat
   daraus nichts gemacht.

## Fachliche Entscheidung dahinter (13.09.2026, Charles)

Das Trainerteam arbeitet mit **Stationen**: mehrere Aufbauten vor Beginn, kleine Gruppen von
vier bis sechs Kindern, je Station ein Trainer, die Gruppen rücken zwischen den Stufen weiter.
Bei mehr Trainern mehr Stationen; Finn ergänzt parallel Torwart- und Einzelstationen. Das ist
eine bewusste Weiterentwicklung gegenüber „ein Aufbau, drei Stufen" aus dem Ausbildungskonzept
Fassung 3 — das Konzept wird dazu nachgezogen (Fassung 4). Beide Wege müssen im Plan darstellbar
sein: dieselbe Übung auf allen Feldern **oder** verschiedene Übungen je Station.

---

## Paket A · Übernehmen füllt alle Felder

Beim Übernehmen einer Vorlage bekommt **jede** Station eines Hauptteils die Übung des Blocks —
nicht nur die erste. Hat der Block mehrere Stationen (siehe Paket B), werden sie der Reihe nach
auf die Felder verteilt; gibt es mehr Felder als Stationen, wiederholt sich die Liste.

Abnahmekriterien:

1. L4-1 übernehmen bei zwei Feldern → beide Felder tragen in jeder Stufe „4gg2 Ballbesitz".
2. Bei drei Feldern → alle drei.
3. Ein Feld, das der Trainer danach von Hand ändert, bleibt geändert; „Plan ersetzen" fragt vorher.

## Paket B · Vorlagen mit Stationen

Das Schema `adler-vorlagen/1` bekommt je Block wahlweise **`stationen`** statt `uebung_name`:

```json
{
  "typ": "spielform",
  "label": "Stufe 2 – eng",
  "dauer": 11,
  "stationen": [
    { "uebung_name": "4gg2 Ballbesitz (6–8)" },
    { "uebung_name": "Passtor im Quadrat" },
    { "uebung_name": "Adler TW – Einlaufen", "rolle": "tw" }
  ]
}
```

- `uebung_name` allein bedeutet weiterhin: dieselbe Übung auf allen Feldern (Paket A).
- `stationen` bedeutet: verschiedene Übungen, Gruppen rücken weiter. Eine Station mit
  `rolle: "tw"` läuft parallel und nimmt nicht am Ringtausch teil — genau wie der bestehende
  Torwart-Block.
- Der Import prüft wie bisher, dass jede Übung zur Phase passt (Kategorie), und weist ab, **bevor**
  etwas geschrieben wird. Ein Block mit `uebung_name` **und** `stationen` ist ein Fehler.
- Bestehende Vorlagen (nur `uebung_name`) bleiben unverändert gültig. Schema-Kennung bleibt
  `adler-vorlagen/1`; die Erweiterung ist additiv.

Abnahmekriterien:

4. Eine Vorlage mit drei Stationen und drei anwesenden Feldtrainern → drei Felder, je eine Übung,
   Ringtausch aktiv.
5. Dieselbe Vorlage bei zwei Feldtrainern → zwei Felder, die dritte Station entfällt mit Hinweis
   in der Vorschau („3 Stationen geplant, 2 Felder verfügbar").
6. Eine `tw`-Station erscheint als paralleler Torwart-Block, nicht als Feld.

## Paket C · Gruppen aus den Rückmeldungen

Gruppen entstehen beim Übernehmen **aus den zugesagten Kindern** des Termins (am Tag: aus der
Anwesenheit), nicht aus dem Kader. Zielgröße vier bis sechs. Die Zahl der Gruppen folgt der Zahl
der Felder, die Zahl der Felder der Zahl der **Feldtrainer**.

Feldtrainer sind Trainer mit Platzrolle. **Trainer, deren Rolle Organisation oder
Elternkommunikation ist, bekommen kein Feld** — sie stehen weiterhin in der Trainer-Reihe, aber
nicht in der Feldzuteilung. Dafür braucht der Trainerstab ein Rollenfeld, falls es das nicht schon
gibt; Skill Development Coach zählt als Feldtrainer für Torwart- und Einzelstationen.

Die Gruppen bleiben danach von Hand anpassbar (Kind antippen, verschieben) — das gibt es schon
und bleibt.

Abnahmekriterien:

7. Elf zugesagte Kinder, zwei Feldtrainer → zwei Gruppen zu sechs und fünf.
8. Elf zugesagte Kinder, drei Feldtrainer → drei Gruppen zu vier, vier und drei — mit Hinweis, dass
   drei unter der Zielgröße liegt.
9. Markus (Rolle Organisation) zugesagt → erscheint in der Trainer-Reihe, bekommt kein Feld.
10. Ein Kind sagt am Tag ab → Gruppen rechnen neu, Änderungen von Hand an den übrigen Gruppen
    bleiben erhalten.

## Skalierung aus der Vorlage

Die Skalierungszeile (8/12/16) bleibt Text und wird in der Vorschau angezeigt. Sie wird **nicht**
automatisch angewendet — sie sagt dem Trainer, wie er Felder und Gruppen setzen soll, die
Entscheidung bleibt bei ihm. Abnahme: Die Zeile, die zur erwarteten Kinderzahl passt, ist in der
Vorschau hervorgehoben.

---

## Hinweis zum Paket 3 in `doku/auftrag-adler-luecken/`

Der Trainingsplan zeigt bereits einen **Spielform-Anteil in Prozent**. Bevor Paket 3 dort gebaut
wird, prüfen, wie der berechnet wird — vermutlich aus den Phasentypen `main` und `abschluss`. Die
Blocktypen `spielform`/`uebungsform` aus Paket 3 sollen genau in diese Berechnung einfließen,
nicht daneben eine zweite aufmachen. Der Wochenstand gegen 48 Minuten bleibt neu.

## Pflichten (aus `CLAUDE.md`)

`node --check` über alle Dateien, `node tests/run.js` grün, danach `sw.js` hochzählen. Neue
Prüfdatei in `tests/checks/` mit den zehn Abnahmekriterien als Fälle. Hilfe-Text zum Trainingsplan
und zu „Vorlage übernehmen" nachziehen. Typografische Anführungszeichen, keine Kindernamen.

## Ausdrücklich nicht in diesem Paket

Keine automatische Zuteilung von Torhütern. Keine Bewertung der Gruppenstärke. Kein neues
Phasenraster.
