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
| 3 | Felderzahl und Reihenfolge kommen aus dem Modell statt aus der Seite. – **erledigt v881** | mittel |
| 4 | Die Übungswahl liegt im Zustand; alle Lesestellen werden umgestellt. – **erledigt v883** | hoch |
| 5 | Alle Schreibstellen (Öffnen, Erzeugen, Anpassen, Tauschen, Löschen, Verschieben) laufen über die neuen Funktionen. – **erledigt v884** | hoch |
| 6 | Torwart-Haken und Einzelkind liegen im Zustand. – **erledigt v886** | mittel |
| 7 | Ein Änderungsweg für alles; die Wartezeiten entfallen. – ✅ **erledigt v887** | mittel |
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
3. Felderzahl und Reihenfolge kommen aus dem Modell (eine Funktion für „wie viele Felder hat Block si“), nicht aus `querySelectorAll`. – ✅ **erledigt v881**: drei reine Funktionen ohne DOM in boot.js, die das Zeichnen selbst nutzt: `tpFelderZahl(si)` (0 bei freiem Fenster/Abschluss/Turnier, 1 bei Torwart/Einzel, sonst Trainer/Gruppen/`weg`/gebundene Trainer), `_tpRenderReihe()` (parallele Blöcke unter ihrem Hauptteil), `tpTwAngebot(si)` (Torhüter in der Reihenfolge von `tpTwSortieren`). Trainerauswahl und Gruppenzahl gelten so, wie das Zeichnen sie zuletzt vorgefunden hat (`_tpFelderStand`), vor dem ersten Zeichnen 0 Felder. Umgestellt: `tpFeldWeglassen`, `tpBetreuungHinweis`, `_tpZustandAusDom` (neu `felderZahl`, `tpSlotsAusZustand` nutzt sie), Stationstimer, `tpGenerate`, `tpAnpassenVorschlag`, `_tlSnapshot`, `blockKiNutzlast` (md-block.js, abgesichert). Die Nebenwirkungen des Zeichnens (parallelZu, Dauer, Vorschlags-Trainer) bleiben im Zeichnen. Golden-Master unverändert grün, Prüffall `v881-plan-modell.js`.
4. Die Übungswahl liegt im Zustand; alle Lesestellen oben lesen `wahl` statt `.tp-form-sel`. – ✅ **erledigt v883**: `TP_ZUSTAND.wahl` (Schlüssel `tp-form-<Block>-<Feld>` → `{i, station?, alle?, erbt?}`), `tpWahlIdx(selId)`, `tpWahlSetzen(selId, i, {station, alle, erbt, hand})` (`hand` löscht alle Marken, Regel v608), `tpWahlZulaessig(si, i)` (dieselbe Prüfung wie die `<option>`-Liste aus `tpFilteredOpts`, still verwerfend wie bisher). `tpOnSelectChange` ist die Brücke Auswahlfeld → Zustand; das Zeichnen projiziert Zustand → Auswahlfeld, Picker-Knopf und Marken (`_tpWahlBereinigen`, `_tpKetteNachziehen` im Zustand, `_tpWahlAufSeite`), `merk.sel/mark` entfällt. Übergangsbrücke `_tpDomNachziehen` am Anfang des Zeichnens, in `tpKlappenAnwenden`, im Serialisierer, am Ende des Öffnens und an den Einstiegen per Knopf (Übung ansehen, Stationstimer, Trainingsstart, Training füllen, Plan anpassen) (fällt in Schritt 8 weg). Umgestellte Lesestellen: tpSlotGefuellt/tpSlotKurz/tpKlappenAnwenden, tpFeldBedarfe, tpGruppeHinweis, tpGroesserVorschlaege, tpBetreuungHinweis, tpSpielformQuote, tpKgHintAll, tpShowExFromSel, tpMaterialZaehlen, stTimerStations, tpGenerate, tpAnpassenVorschlag, _tlSnapshot, tpDurchgaengeSetzen (eigene Übung?), tfInPlan (freies Feld?), `_tpZustandAusDom`; md-block.js `blockKiNutzlast` und `_tbKiZeigen` (abgesichert). Der Picker-Knopf folgt dem Zustand über die Projektion; `_tpPickItems` liest das Angebot (Optionen), nicht die Wahl. Golden-Master unverändert grün, Prüffall `v883-plan-wahl.js` (`tpZustandPruefen()` leer nach jedem Zeichnen und Schritt der zehn Abläufe).
5. Alle Schreibstellen laufen über die Setter (Öffnen, Erzeugen, Anpassen, Tauschen, Löschen, Verschieben, Feld weglassen). – ✅ **erledigt v884**: Kein Code außer der Projektion `_tpWahlAufSeite` (und der Brücke) schreibt noch Wert oder Marken ins Auswahlfeld. Neu: `tpWahlWaehlen(selId, i)` – der gemeinsame Weg aller Griffe (wie früher `sel.value=…; tpOnSelectChange(sel)`, „hand“ außer beim Öffnen; danach `_tpWahlFolgen`: Durchgänge erben, Projektion, Hinweise, verzögert speichern); `tpWahlUmbenennen(neuVon)` als Bündel-Setter für neue Blockindizes (zieht `wahl` nach Index nach wie `tpCoaches`); `_tpReihenfolgeAnwenden(reihe)` (Blöcke, Trainer, parallelZu, Wahl – ohne Seite); `_tpDurchgaengeKern(si, n, neuOrdnen)` (Struktur der Durchgänge ohne Zeichnen); `_tpParallelOrdnen()` (eine Rechenstelle mit dem Zeichnen); `_tpAlleFelder()`/`_tpWahlFeldFuer(i, nurFrei)` (erstes passendes Feld aus dem Modell). **Öffnen:** `tpZustandLaden(slots, plan)` ist rein (kein DOM, kein Zeichnen, keine Uhr außer der Kettenkennung): `slots` setzt tpSlots, tpCoaches, ordnet parallele Blöcke und macht alte `durchgaenge` zur Kette (vorher ein setTimeout aus dem Zeichnen, der während des Ladens lief); `plan` setzt `wahl` mit dem bisherigen Algorithmus, Felder über `tpFelderZahl` in Seitenreihenfolge statt über vorhandene Auswahlfelder (leeren ohne die Marken, block/feld → station → alleFelder → erstes freies Feld gleichen Namens, nach jedem Setzen erben die Durchgänge, dann v568-Wiederholung). `_tpPlanRestoreIntern` ruft es zweimal (nach dem Laden der Struktur, dann nach dem Laden des Plans) – das Zeichnen dazwischen bleibt, die Seite folgt über die Projektion; Torwart-Haken und Einzelkind setzt `_tpTwKindAnwenden` nach dem Zeichnen (bis Schritt 6 im DOM). Umgestellt außerdem: tpGenerate (`setze`), tpAnpassenUebernehmen, `_tpKetteNachziehen`/tpDurchgaengeSetzen (erbt), tpWarmMinus, tpRemoveSlot samt Rückgängig (Wahl aus dem Zustand; die Torwart-Haken weiter über `el.value` – Fehlerbild 2 bleibt), tpSlotsNeuOrdnen, tpUebungTausch, tpBetreuungTausch, tpPickerSet, tpAddRecoExercise, Empfehlungsknöpfe im Einzeltraining, tfInPlan, tpOnCatChange, md-block.js `blockUebungenPruefen`. tfInPlan wartet weiter 900 ms: `go("planung")` startet tpPlanRestore, das nach dem Laden alle Felder leert – eine sofort gesetzte Wahl wäre weg (entfällt mit Schritt 7). Die Brücke zählt mit, was sie noch übernimmt (`_tpBrueckeZahl`, in den zehn Golden-Abläufen 0). Fehlerbilder 1, 2, 4, 5 treten unverändert auf. Golden-Master unverändert grün, Prüffall `v884-plan-setter.js`.
6. Torwart-Haken und Einzelkind liegen im Zustand. – ✅ **erledigt v886**: `TP_ZUSTAND.tw` (Blockindex → Liste der angehakten Torhüter-Namen; fehlt der Eintrag, gilt die Vorgabe „alle angebotenen“) und `TP_ZUSTAND.kind` (Blockindex → Name oder ""). Setter `tpTwSetzen(si, name, an)` (name null: zurück zur Vorgabe) und `tpKindSetzen(si, name)`; der Haken ruft `tpTwSetzen` per `onchange`, die Einzelkind-Auswahl `tpKindSetzen` und danach wie bisher `tpIndPlayerChange`. Das Zeichnen projiziert beides auf `.checked` bzw. den Wert (`_tpTwKindAufSeite`, danach Empfehlungen wie früher); der Merk-Weg `merk.tw/ind` ist weg. Öffnen: `tpZustandLaden` setzt tw/kind aus den gespeicherten Slots (`_tpTwKindLaden`, ohne DOM: Haken nur am Torwart-Block, Kind nur am Einzelblock und nur aktiv im Kader – dieselben Bedingungen wie vorher Haken bzw. Optionen; was nicht gespeichert ist, bleibt – Fehlerbild 6). Serialisierer: Haken über `tpTwAn(si)` in der Reihenfolge von `tpTwAngebot(si)`, Kind aus dem Zustand; ebenso Stationstimer und `_tlSnapshot`. `tpSlotsNeuOrdnen` zieht tw/kind nach Index nach (`_tpTwKindUmbenennen`, dort, wo früher Haken und Auswahl umbenannt wurden – nicht in `_tpReihenfolgeAnwenden`, damit das Öffnen alter `durchgaenge` sich wie bisher verhält), `tpRemoveSlot` samt Rückgängig über den Zustand. **Fehlerbild 2 bleibt bewusst:** Rückgängig setzt `tpTwSetzen(n, null)` – die Haken kommen als Vorgabe (alle) zurück, wie früher über `el.value`. Der Präfix-Fehler beim Einzelkind (`tp-ind-player-1` traf auch `-12`) hatte keine Folge (die Ziel-Kennung `tp-ind-player-<n>X` gab es nie) und ist mit dem Umbau entfallen. Brücke: `_tpTwKindNachziehen` (in `_tpDomNachziehen`) übernimmt fremde Eingriffe (`.checked=`/`.value=` ohne Ereignis) und zählt sie getrennt (`_tpBrueckeTwZahl`); in den Golden-Abläufen genau die Eingriffe der Abläufe selbst (G6: 2, G10: 1), die Brücke der Übungswahl bleibt 0. `tpZustandPruefen(opt)` prüft auch Haken und Kind; ein fremder Eingriff vor der Brücke wird nur mit `{fremd:true}` gemeldet. Golden-Master unverändert grün, Prüffall `v886-plan-tw.js` (G6 und G10 mit Ereignissen = Sollwert).
7. Ein Änderungsweg `tpGeaendert()`; `merk` im Zeichnen und die Wartezeiten 0/60 ms entfallen. – ✅ **erledigt v887**: `tpGeaendert({speichern, zeichnen})` in boot.js (nach `tpRenderTimeline`): zeichnet neu (`zeichnen:false` nur, wo bisher auch nicht gezeichnet wurde: Übungswahl mit Projektion, Trainer am Feld außer am parallelen Block, Torwart-Haken, Einzelkind), zieht die Materialzeile sofort nach und speichert nach der Regel, die die Stelle schon hatte (`TP_SPEICHERN`): **verzögert** tpSlotsNeuOrdnen (damit tpRemoveSlot samt Rückgängig, tpSlotVerschieben), tpFeldWeglassen/tpFeldZurueck, tpDurchgaengeSetzen, tpWarmPlus/Minus, tpSetCoach, tpRegelWeg, `_tpWahlFolgen` (damit tpWahlWaehlen und tpOnSelectChange), tpGenerate (Regel), tpAnpassenUebernehmen; **sofort** tpVersatzSetzen/tpVersatzZurueck; **nein** tpSetDauer, tpDoAddSlot, „läuft parallel zu“, Torwart-Haken, Einzelkind, Ziel-Dauer (Fehlerbild 7 bleibt bis Schritt 9). Kein anderer Code ruft noch `tpPlanSaveDebounced`/`tpPlanSave()` für ein automatisches Speichern. Entfallen: 60 ms in tpGenerate und tpAnpassenUebernehmen, `setTimeout(tpMaterialRender,0)` (in `_tpWahlFolgen` und nach dem Öffnen), der Durchgangs-Umbau im Zeichnen (`setTimeout(tpDurchgaengeSetzen,0)` – alte `durchgaenge` gelangen seit v884 nur über das Öffnen, tpZustandLaden, in tpSlots; v621 f) prüft deshalb über diesen Weg). `merk` gab es seit v883/v886 nicht mehr. **Bleiben:** Scroll-Nachziehen 150/450 ms, Fokus (tpSlotVerschieben 0 ms, Kopf 600/900 ms), Warten auf Welle 2 (`_tpAbschlussNachladen`), Speichern verzögert 1,2 s, Gruppen 800 ms und **tfInPlan 900 ms**: `go("planung")` startet tpPlanRestore erst im `onReady` von terminSelectFill (Netz) und gibt kein Versprechen zurück; das Öffnen leert danach alle Felder – ein Warten auf den Zustand bräuchte ein neues Signal „Öffnen fertig“, das ist kein unsichtbarer Umbau (Kandidat für Schritt 8/9). Golden-Master unverändert grün (gleiche Schreibzahl je Schritt), Prüffall `v887-plan-geaendert.js` (Quelltext, `tpGenerate` ohne Warten, Speicherregel je Setter gegen eine Tabelle – an v886 gemessen –, Zustand = Seite in allen Golden-Schritten).
8. Die Brücke (DOM → Zustand) wird entfernt.
9. ff. Fehlerbilder 1–7 einzeln beheben, je eine Version; der betroffene Sollwert ändert sich mit Begründung im PR (Fehlerbild 6: Charles 19.11. – künftig Grundgerüst).
