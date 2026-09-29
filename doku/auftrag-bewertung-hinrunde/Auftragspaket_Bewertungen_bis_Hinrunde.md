# Auftragspaket: Einzelbewertung erst ab Ende der Hinrunde, danach alle acht Wochen

Repo `SV-Adler-Dellbrueck/u9-app`, Stand 27.09.2026. Gilt zusammen mit `CLAUDE.md`.

## Warum

Beschluss des Trainermeetings vom 27.09.2026:

- Bis zum Ende der Hinrunde werden **keine einzelnen Spieler bewertet**.
- Am Ende der Hinrunde bewertet das ganze Trainerteam jeden Spieler in der App. Danach wiederholt
  sich das **alle acht Wochen**.
- Die Trainingsbewertung erfasst bis dahin Übungen, Gruppe, allgemeine Erkenntnisse und
  Organisatorisches. Einzelne Kinder kommen nur vor, wenn es ein besonderes Ereignis gab, und dann
  als Text, nicht als Wert.

Die App arbeitet seit v637 anders: Bewertungsrunden im Takt von sechs Wochen, fällig ab 35 Tagen,
mit „Runde fällig“ in den Zählkacheln. Dazu entstehen Einzelwerte an zwei weiteren Stellen: die
Schnell-Sterne für anwesende Kinder in „Einheit bewerten“ und das Blitz-Rating nach dem Spiel. Die
App erinnert damit an genau das, was ausgesetzt ist.

## Was sich ändert

**1. Beginn der Bewertungsrunden als Einstellung.** Das Trainerteam legt ein Datum fest: „Erste
Bewertungsrunde ab …“. Das Datum wird nicht in den Code geschrieben — das Ende der Hinrunde steht
noch nicht fest. Wo die App solche Team-Einstellungen heute speichert, **vor dem Bauen im Code
nachsehen**; gibt es keinen Ort, eine Tabelle mit RLS (lesen und schreiben nur `is_trainer()`),
in die Sicherung aufnehmen.

**2. Vor diesem Datum:**

- Team → Bewerten: Das Formular ist gesperrt. Stattdessen steht dort in einem Satz, warum, und ab
  wann es wieder geht. Bestehende Bewertungen bleiben lesbar.
- „Bewertungsrunde starten“ und „Runde fällig“ erscheinen nirgends, auch nicht in den Zählkacheln.
- Einheit bewerten: Die Schnell-Sterne für anwesende Kinder sind ausgeblendet. Sterne für die
  Einheit, Bewertung und Kommentar je Übung bleiben.
- Blitz-Rating nach dem Spiel: ausgeblendet. Die Nachbereitung auf Mannschaftsebene
  (Ordnung, Passspiel, Zweikämpfe, Spaß) bleibt.
- KI-Auswertung der Sprachnotiz (Training, Spiel, Festival): Sie trägt keine Werte je Kind ein.
  Nennt die Notiz ein Kind wegen eines besonderen Ereignisses, landet das als Text im Kommentar.
  Den Prompt der Edge Function entsprechend anpassen und im PR zitieren.

**3. Ab dem Datum:** Takt **acht Wochen** statt sechs. Fällig ab **49 Tagen** (bisher 35 bei sechs
Wochen, also dieselbe Woche Vorlauf). Das Fenster „alle Bewertungen innerhalb von 21 Tagen gelten
als dieselbe Runde“ bleibt. Die Runde ist eine Runde des ganzen Trainerteams: Die Anzeige über dem
Formular nennt, welche Trainer ein Kind in dieser Runde schon bewertet haben.

**4. Was bleibt, wie es ist:** Rollen-Empfehlung, Aufstellung, Analyse und Förderplan arbeiten
weiter mit den vorhandenen Bewertungen. Spielerkarten zeigen Eltern und Kindern schon heute keine
Werte (v636) — dort nichts ändern, aber im Prüffall festhalten.

## Vorhandene Daten

Laut v637 war am 27.09. die erste Bewertungsrunde. **Vor dem Bauen nachsehen**, ob seit dem
26.09. Einzelbewertungen, Schnell-Sterne oder Blitz-Ratings gespeichert wurden, und im PR mit
Anzahl und Datum nennen — ohne Namen. **Nichts löschen.** Was damit geschieht, entscheidet Charles.

## Abnahmekriterien

1. Ohne gesetztes Datum oder vor dem Datum ist Team → Bewerten gesperrt, mit Satz und Datum; alte
   Bewertungen sind lesbar.
2. Vor dem Datum erscheinen „Bewertungsrunde starten“ und „Runde fällig“ nirgends.
3. Vor dem Datum zeigt „Einheit bewerten“ keine Sterne je Kind; Einheit und Übungen sind
   bewertbar wie bisher.
4. Vor dem Datum ist das Blitz-Rating nicht erreichbar; die Mannschafts-Nachbereitung schon.
5. Eine Sprachnotiz, die ein Kind lobt, erzeugt vor dem Datum keinen Wert je Kind, nur Text.
6. Ab dem Datum ist alles wie bisher erreichbar; fällig ist eine Runde 49 Tage nach der letzten.
7. Das Datum kann nur ein Trainer setzen; Eltern und der anonyme Schlüssel können es weder lesen
   noch schreiben.
8. Eltern und Kinder sehen weiterhin keine Bewertungswerte, auch nicht auf den Spielerkarten.
9. Bedienung am Handy: Knöpfe mindestens 48 px, die Einstellung mit genau einer Hauptaktion.

## Testfälle

- Datum leer → Bewerten gesperrt, Blitz-Rating nicht erreichbar, keine Schnell-Sterne.
- Datum morgen → dasselbe; Datum gestern → alles erreichbar, keine Runde fällig bis Tag 49.
- Letzte Runde vor 48 Tagen → nicht fällig; vor 49 Tagen → fällig.
- Zwei Trainer bewerten dasselbe Kind im Abstand von 10 Tagen → eine Runde.
- KI-Auswertung mit „Kind C hat heute toll gehalten“ vor dem Datum → Text im Kommentar, kein
  Wert.
- Eltern-Sitzung liest die Einstellung → leere Menge bzw. abgewiesen.

## Pflichten (aus `CLAUDE.md`)

- `node --check` über alle Dateien, `node tests/run.js` grün, danach `sw.js` hochzählen.
- Neue Prüfdatei in `tests/checks/`; `v637-nicht-gesehen-runden.js` an den neuen Takt anpassen.
- Hilfe und Funktionsübersicht nachziehen (Team → Bewerten, Einheit bewerten, Blitz-Rating).
- Neue Tabelle oder Spalte in die Sicherung.
- Typografische Anführungszeichen, keine Kindernamen, keine Schlüssel.

## Ausdrücklich nicht in diesem Paket

Kein Löschen alter Bewertungen. Keine Änderung an Rollen-Empfehlung oder Analyse. Kein neues
Bewertungsschema.

## Projektgedächtnis

Damit sind die Prüfpunkte 1 bis 3 aus `Projektgedaechtnis/uebergabe-2026-09-27-trainermeeting.md`
(Repo `adler-u9-wissen`) beantwortet: Einzelwerte entstehen heute in Bewerten, Einheit bewerten
und Blitz-Rating; die Spielerkarten zeigen keine Werte; der Rhythmus war sechs statt acht Wochen.
Beim Einarbeiten der Übergabe so vermerken.
