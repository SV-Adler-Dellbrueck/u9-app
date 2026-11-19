# Plan 4.8 · Trainingsplan: Zustand aus dem DOM lösen

Stand 19.11.2026 (App v876). Nur gelesen, nichts umgebaut.

## Worum es geht

Welche Übung in welchem Feld steht, welche Torhüter angehakt sind und welches Kind im Einzeltraining ist, steht heute **nur in den Auswahlfeldern der Seite**. Beim Speichern liest die App diese Felder aus. Bei jedem Neuzeichnen merkt sie sich die Werte, zeichnet und setzt sie wieder ein. Daran hängen mehrere Wartezeiten (60 bis 900 ms) und einige Fehler, bei denen Seite und gespeicherter Plan auseinanderlaufen.

## Gefundene Fehlerbilder

| Nr. | Was passiert | geprüft |
|---|---|---|
| 1 | **Feld weglassen** (mittleres von drei): Die Trainer rücken nach, die Übungen nicht. Trainer und Übung passen danach nicht mehr zusammen. | Code gelesen; **bestätigt** im Golden-Master G9 |
| 2 | **Block löschen → Rückgängig:** Die Torwart-Haken kommen nicht zurück, es sind wieder alle angehakt. | Code gelesen; **bestätigt** G10 (`tw` danach `[1,2]` statt `[1]`) |
| 3 | **Klappzustand** wandert beim Verschieben oder Löschen nicht mit: Ein anderer Block ist auf- bzw. zugeklappt. | Code gelesen; **bestätigt** G3 (DOM-Aufnahme) |
| 4 | **Getauschte Übung außerhalb des Blocktyps** verschwindet beim nächsten Neuzeichnen und dann beim Speichern. Betrifft auch den KI-Tausch. | **bestätigt** G2 |
| 5 | **Gespeicherte Übung, die nicht (mehr) passt** (Dublette, falscher Typ), wird beim Öffnen still verworfen. Bei der nächsten Änderung ist sie auch in der Datenbank weg. | **teils bestätigt** G5: falscher Typ fällt weg; die Dublette fällt nicht weg, sondern rutscht ins nächste freie Feld desselben Blocks |
| 6 | **Termin ohne gespeicherten Plan** übernimmt die Struktur des zuvor geöffneten Termins und speichert sie bei der ersten Änderung. | **bestätigt** G5 (samt Trainern, Haken und Kind des vorigen Termins); Charles 19.11.: künftig Grundgerüst |
| 7 | **Ohne automatisches Speichern** gehen Dauer, neuer Block, „läuft parallel zu“, Torwart-Haken und Einzelkind verloren, wenn danach nichts mehr passiert. | Code gelesen; **bestätigt** G6, G8 (kein Schreibvorgang) |

## Zielbild

Ein Zustandsobjekt im Code führt, die Seite wird daraus gezeichnet. Geändert wird nur über wenige Funktionen. Das **Speicherformat bleibt Zeichen für Zeichen gleich**, alte Pläne lesen sich wie bisher. IDs und Aufbau der Seite bleiben, damit Prüffälle und Bedienung unverändert sind.

## Schritte (je eine eigene Version mit eigenem Prüffall)

| Schritt | Inhalt | Risiko |
|---|---|---|
| 1 | **Ist-Zustand festschreiben:** Für zehn Abläufe (Vorlage laden, Übung tauschen, Einklappen, Weiterrücken, Öffnen aus der Datenbank, Torwart-Block, Material, Puffer, Feld weglassen, Löschen mit Rückgängig) wird der gespeicherte Inhalt als Sollwert abgelegt. Ändert sich ein Zeichen, wird die Prüfung rot. Nur Tests. | keins |
| 2 | Speichern rechnet aus einem Zustand statt aus der Seite. – **erledigt v879** | niedrig |
| 3 | Felderzahl und Reihenfolge kommen aus dem Modell statt aus der Seite. | mittel |
| 4 | Die Übungswahl liegt im Zustand; alle Lesestellen werden umgestellt. | hoch |
| 5 | Alle Schreibstellen (Öffnen, Erzeugen, Anpassen, Tauschen, Löschen, Verschieben) laufen über die neuen Funktionen. | hoch |
| 6 | Torwart-Haken und Einzelkind liegen im Zustand. | mittel |
| 7 | Ein Änderungsweg für alles; die Wartezeiten entfallen. | mittel |
| 8 | Die Übergangsbrücke wird entfernt. | mittel |
| 9 ff. | Die Fehlerbilder 1–7 werden einzeln behoben, jedes als eigene Version. | niedrig bis mittel |

In den Schritten 2 bis 8 bleibt der gespeicherte Inhalt bei jedem der zehn Abläufe **gleich**; das ist die Abnahme. Fehler werden erst ab Schritt 9 behoben, jeder sichtbar und begründet. Umfang: rund 500 Zeilen Bewegung in boot.js (netto etwa gleich viel), rund 600 Zeilen Tests.

## Bewusst nicht

Speicherformat, Konflikt-Abgleich zwischen Trainern, Fokus/Material/Kopfzeile (eigener Weg, schon sauber), Trainerauswahl und Trainingsgruppen, Import aus Vorlagen. Keine neue Datei, kein Teilzeichnen.

## Offen für Charles (erst bei Schritt 9 nötig)

- Fehlerbild 6: Soll ein Termin ohne Plan die Struktur des zuletzt geöffneten Termins übernehmen oder mit dem Grundgerüst starten?
- Fehlerbild 7: Soll nach jeder dieser Änderungen automatisch gespeichert werden?

## Technischer Anhang

Abgeleitet aus boot.js (v876): Zeitleiste rund Z. 2325–3062, Speichern rund 3941–4120, Öffnen rund 4328–4487.

### Was heute nur im DOM steht

| Daten | Wo | Wird gespeichert als |
|---|---|---|
| Übung je Feld | `select.tp-form-sel#tp-form-<Block>-<Feld>` (Wert = Index in `tpAllForms()`) | `plan[]` (tpPlanEntries) |
| Vorlagen-Marken | `data-station`, `data-alle` am Auswahlfeld | `plan[].station`, `plan[].alleFelder` |
| Geerbte Übung im Durchgang | `data-erbt="1"` am Auswahlfeld | nicht gespeichert (gleicher Wert wie der Kopf gilt als geerbt) |
| Zahl der Felder eines Blocks | Anzahl der Auswahlfelder `tp-form-<Block>-*` (Ergebnis des Zeichnens aus Trainern, Gruppen, `weg`, parallelen Blöcken) | Länge von `slots[].coaches` |
| Torwart-Haken | `input.tp-tw-player[data-slot]` `.checked` | `slots[].tw` (kader.id) |
| Kind im Einzeltraining | `select#tp-ind-player-<Block>` | `slots[].kind` (kader.id) |
| Zieldauer | `select#tp-dauer` | nicht gespeichert (Termin-Länge `TP_TERMIN_MIN` als Vorgabe) |

Schon im Code (nicht im DOM): `tpSlots` (Struktur), `tpCoaches` (Trainer je Feld, Schlüssel ist die **Element-ID** `tp-form-<Block>-<Feld>`), `_tpOffen` (Klappzustand, Schlüssel ist der **Blockindex**).

### Lesestellen (Werte aus dem DOM)

- **Speichern:** `tpPlanEntries` (Übung, Marken, Feld), `tpSlotsMitZuordnung` (Haken, Kind, Felderzahl für `coaches`), `tpPlanSave`.
- **Zeichnen:** `_tpRenderTimelineIntern` merkt sich vor dem Neuzeichnen `merk.sel/mark/tw/ind` und setzt sie danach wieder ein – nur, wenn die Option im neuen Auswahlfeld noch existiert (daher Fehlerbild 4); `tpFeldBedarfe` (Bedarf der Übung je Feld), `_tpKetteNachziehen`.
- **Anzeige:** `tpSlotGefuellt`, `tpSlotKurz`, `tpKlappenAnwenden`, `tpMaterialZaehlen`, `tpSpielformQuote`, `tpKgHintAll`, `tpBetreuungHinweis`, `tpGroesserVorschlaege`, `tfInPlan`.
- **Planen:** `tpGenerate` (`wert(si,p)`, Felderzahl), `tpDurchgaengeSetzen` (eigene Übung im Durchgang?), `tpFeldWeglassen` (Felderzahl), `tpAnpassenVorschlag`, `tpAnpassenUebernehmen`.
- **Training:** `_tlSnapshot`, `stTimerStations`; `blockKiNutzlast` (md-block.js).

### Schreibstellen (Werte ins DOM)

- **Öffnen:** `_tpPlanRestoreIntern` – leert alle Felder, setzt je Eintrag über `block/feld`, sonst `station`, sonst `alleFelder`, sonst das erste freie Feld mit gleichem `slotLabel`; danach Stationen-Wiederholung (v568); Haken und Kind nach dem Zeichnen.
- **Erzeugen/Anpassen:** `tpGenerate` (`setze`), `tpAnpassenUebernehmen`, `tpAddRecoExercise`, `tpUebungKiAnpassen`.
- **Hand:** `tpPickerSet`, `tpUebungTausch` (fügt eine fremde Option hinzu), `tpOnSelectChange` (löscht Marken, `data-erbt`), Empfehlungsknöpfe in `tpIndPlayerChange`.
- **Struktur:** `tpSlotsNeuOrdnen` (benennt IDs und `data-slot` um, zieht `tpCoaches` und `parallelZu` nach – nicht `_tpOffen`, daher Fehlerbild 3), `tpRemoveSlot` samt Rückgängig (setzt Haken über `el.value`, daher Fehlerbild 2), `tpFeldWeglassen` (verschiebt `tpCoaches`, nicht die Übungen, daher Fehlerbild 1), `tpWarmPlus`/`tpWarmMinus`, `tpDoAddSlot`, `tpSetDauer`.
- **Wartezeiten:** `tpPlanSaveDebounced` 1200 ms, `tpGenerate`/`tpAnpassen` 60 ms nach dem Zeichnen, `setTimeout(tpDurchgaengeSetzen,0)` für alte `durchgaenge`, Materialzeile 0 ms, Scrollen 150/450 ms, Fokus 600/900 ms, Gruppen 800 ms.

### Zielbild

- Ein Zustandsobjekt je Termin: `tpSlots` bleibt die Struktur; dazu je Block `wahl[feld]` (Übungsname/-index samt Marken `station`/`alleFelder`/`erbt`), `tw` (Menge der angehakten Torhüter), `kind`; Trainer bleiben in `tpCoaches`, aber an Block/Feld statt an der Element-ID; der Klappzustand hängt am Block, nicht am Index.
- Geändert wird nur über Setter (`tpWahlSetzen(si,p,…)`, `tpTwSetzen`, `tpKindSetzen`, Struktur-Setter für Einfügen/Löschen/Verschieben/Feld weglassen), die am Ende `tpGeaendert()` rufen: einmal zeichnen, einmal (verzögert) speichern.
- Reine Serialisierer: `tpPlanAusZustand(zustand)` und `tpSlotsAusZustand(zustand)` – ohne DOM, ohne Zeit.
- **Byte-Gleichheit:** Die Schlüsselreihenfolge der Plan-Einträge bleibt `{formIdx, formName, trainer, slotLabel, key, block, feld[, station][, alleFelder]}`; Slots bleiben `{...slot}` ohne `coaches/trainer/tw/kind`, dann `trainer`/`tw` bzw. `kind` (parallele Blöcke) oder `coaches` (Hauptteile) in dieser Reihenfolge; der POST-Körper bleibt `{datum, plan, slots, gespeichert_von, updated_at}`. Abnahme: der Golden-Master (`tests/checks/v877-trainingsplan-golden.js`, Sollwerte in `tests/golden/trainingsplan/`).

### Schritte

1. Golden-Master (nur Tests) – **erledigt**: zehn Abläufe G1–G10, Fehlerbilder 1–6 am erfassten Verhalten bestätigt.
2. `tpPlanSave` rechnet über `tpPlanAusZustand`/`tpSlotsAusZustand`; der Zustand wird vorerst aus dem DOM gelesen (Brücke). – **erledigt v879**: beide rein (kein DOM), `_tpZustandAusDom()` liest einmalig `.tp-form-sel` (ID, Wert, `data-station`, `data-alle`, Dokumentreihenfolge), Torwart-Haken, Einzelkind, gewählte Trainer; `tpPlanEntries`/`tpSlotsMitZuordnung` sind Zweizeiler. Golden-Master unverändert grün, Prüffall `v879-plan-serialisierer.js`.
3. Felderzahl und Reihenfolge kommen aus dem Modell (eine Funktion für „wie viele Felder hat Block si“), nicht aus `querySelectorAll`.
4. Die Übungswahl liegt im Zustand; alle Lesestellen oben lesen `wahl` statt `.tp-form-sel`.
5. Alle Schreibstellen laufen über die Setter (Öffnen, Erzeugen, Anpassen, Tauschen, Löschen, Verschieben, Feld weglassen).
6. Torwart-Haken und Einzelkind liegen im Zustand.
7. Ein Änderungsweg `tpGeaendert()`; `merk` im Zeichnen und die Wartezeiten 0/60 ms entfallen.
8. Die Brücke (DOM → Zustand) wird entfernt.
9. ff. Fehlerbilder 1–7 einzeln beheben, je eine Version; der betroffene Sollwert ändert sich mit Begründung im PR (Fehlerbild 6: Charles 19.11. – künftig Grundgerüst).
