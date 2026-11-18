# Systemdialoge – Bestandsaufnahme (Punkt 4.5)

Stand: v874 (18.11.2026). Gezählt sind alle Aufrufe von `prompt(`, `confirm(` und `alert(`
(auch `window.…`) in den `*.js`-Dateien der Wurzel, Zeilennummern vor dem Umbau (Stand v873).
Kommentare, die nur „statt confirm()“ erwähnen, zählen nicht. Die HTML-Dateien enthalten keine.

**Pakete:** 1 = Trainingsalltag (Trainingsplan, Anwesenheit, Spieltag/Live, Termine) ·
2 = übriger Trainerbereich · 3 = Eltern/Kinder.

**Ersatz:** `frageJaNein` (core.js) für Ja/Nein, `frageText` (views.js) für Eingaben und Links zum
Kopieren. Seit v874 kennt `frageText` ein einzeiliges Feld (`einzeilig`, Enter übernimmt; `zahl`
öffnet die Zifferntastatur) und löst bei Esc, Klick daneben und Android-Zurück mit `null` auf.

## Übersicht

| Bereich | Paket | Stellen | Stand |
|---|---|---|---|
| Trainer · Trainingsalltag | 1 | 19 | ✅ v874 alle umgestellt |
| Trainer · übrige Bereiche | 2 | 36 | ⬜ |
| Eltern (toter Code, Tabellen gibt es nicht mehr) | 3 | 7 | ⬜ – eher löschen als umbauen |
| Kinder | 3 | 0 | – |
| **Summe** | | **62** | 19 erledigt |

Dazu vier **Rückfallzweige** `typeof frageJaNein==="function" ? … : confirm(…)` (boot.js `_tlFrage`
und `tgRename`, md-kindtraining.js `kindTrainingLoeschen`, views.js `bewRundeStop`): Sie greifen nur,
wenn core.js bzw. views.js fehlen – beide sind Welle 1 und damit immer vor den Aufrufern da.

## Paket 1 · Trainingsalltag (✅ v874)

| Datei:Zeile | Funktion | Art | Bereich | Zweck |
|---|---|---|---|---|
| boot.js:351 | `periodDelete` | confirm | Trainingsplan · Themenplan | Monats-Schwerpunkt löschen |
| boot.js:3235 | `tpRichtwertAendern` | prompt | Trainingsplan · Nettospielzeit | Richtwert Spielform-Minuten je Woche ändern |
| boot.js:4301 | `tpMaterialEigen` | prompt | Trainingsplan · Kopf | Material der Einheit selbst eintragen |
| md-block.js:185 | `blockEinheitUebernehmen` | confirm | Trainingsplan · Block | Vorhandenen Plan durch Block-Einheit ersetzen |
| md-block.js:535 | `blockLoeschen` | confirm | Trainingsplan · Block | Trainingsblock löschen |
| md-gegner.js:1036 | `tmDelete` | confirm | Termine | Termin samt Anwesenheit/Live-Daten löschen |
| md-live-vollbild.js:259 | `blitzDelete` | confirm | Spieltag/Live | Blitz-Bewertung löschen |
| md-live-vollbild.js:381 | `tnDel` | confirm | Spieltag/Live · Team-Notizen | Notiz löschen |
| md-liveticker.js:69 | `tickerShareViewLink` | prompt | Spieltag · Liveticker | Ansehen-Link zum Kopieren (wenn Zwischenablage scheitert) |
| md-liveticker.js:78 | `tickerShareKonfLink` | prompt | Spieltag · Liveticker | Konferenz-Link zum Kopieren |
| md-liveticker.js:107 | `tickerShareDelegateLink` | prompt | Spieltag · Liveticker | Helfer-Link zum Kopieren |
| md-liveticker.js:250 | `tickerDelete` | confirm | Spieltag · Liveticker | Ticker-Eintrag löschen |
| md-matchcard.js:555 | `mdShareLink` | prompt | Spieltag | Eltern-Link zum Kopieren |
| md-matchcard.js:1065 | `rotReset` | confirm | Spieltag · Wechsel-Timer | Timer und erfasste Spielzeiten zurücksetzen |
| md-matchuhr.js:116 | `mcEnd` | confirm | Spieltag · Spieluhr | Abpfeifen bei laufender Uhr |
| md-turnierplan.js:161 | `turnierPlanDelete` | confirm | Spieltag · Turnier | Begegnung aus dem Spielplan entfernen |
| md-turnierplan.js:234 | `turnierDelete` | confirm | Spieltag · Turnier | Erfasstes Turnier-Spiel löschen |
| md-voice.js:169 | `vdDelete` | confirm | Spieltag/Live · Sprachnotizen | Notiz löschen |
| views.js:3967 | `epollDelete` | confirm | Termine · Terminfindung mit Eltern | Terminfindung löschen |

Anwesenheit: keine Systemdialoge mehr (der Terminwechsel fragt seit v836 im eigenen Fenster).

## Paket 2 · übriger Trainerbereich (⬜)

| Datei:Zeile | Funktion | Art | Bereich | Zweck |
|---|---|---|---|---|
| md-fundbuero.js:95 | `fundbueroDelete` | confirm | Fundbüro (nur Trainer) | Fundstück löschen |
| md-gegner.js:187 | `gegnerDelete` | confirm | Gegner | Gegner löschen |
| md-nest.js:1107 | `nestLinkKopieren` | prompt | Adler Nest · Hördatei | Link zum Kopieren |
| md-nest.js:1116 | `nestLinkZurueckziehen` | confirm | Adler Nest · Hördatei | Link zurückziehen |
| md-taktikboard.js:111 | `_sitName` | prompt | Taktikboard | Name der Spielsituation (Rückgabewert, synchron) |
| md-taktikboard.js:189 | `sitUmbenennen` | prompt | Taktikboard | Spielsituation umbenennen |
| md-taktikboard.js:195 | `sitLoeschen` | confirm | Taktikboard | Spielsituation löschen |
| md-turnierplan.js:1088 | `_blzPlanVerwerfen` | confirm | Blitzturnier | Spielplan samt Ergebnissen verwerfen (gibt `false` zurück – Aufrufer prüfen) |
| md-turnierplan.js:1655 | `blzTeamPlus` | prompt | Blitzturnier | Team-Name eingeben |
| md-turnierplan.js:1665 | `blzRename` | prompt | Blitzturnier | Team umbenennen |
| md-turnierplan.js:1670 | `blzStart` | confirm | Blitzturnier | Spielplan neu erzeugen trotz Ergebnissen |
| md-turnierplan.js:1798 | `blzEnde` | confirm | Blitzturnier | Beenden trotz offener Begegnungen |
| md-turnierplan.js:1840 | `blzReset` | confirm | Blitzturnier | Alles verwerfen |
| md-turnierplan.js:2365 | `htRegelnVorlage` | confirm | Heimturnier | Regelwerk durch Vorlage ersetzen |
| md-turnierplan.js:2389 | `htTeamWeg` | confirm | Heimturnier | Team entfernen |
| md-turnierplan.js:2404 | `htGenerieren` | confirm | Heimturnier | Spielplan neu erzeugen trotz Ergebnissen |
| md-turnierplan.js:2425 | `htFinalsFill` | confirm | Heimturnier | Platzhalter füllen trotz offener Gruppenspiele |
| md-turnierplan.js:2459 | `htShare` | prompt | Heimturnier | Spielplan-Link zum Kopieren |
| md-turnierplan.js:2469 | `htShareErgebnis` | prompt | Heimturnier | Ergebnis-Link zum Kopieren |
| md-turnierplan.js:2598 | `htDelete` | confirm | Heimturnier | Turnier samt Spielplan löschen |
| md-turnierplan.js:3007 | `fstPlanErstellen` | confirm | Festival | Spielplan neu erzeugen trotz Toren |
| views.js:1024 | `kaderEditDelete` | confirm | Kader | Spieler endgültig löschen |
| views.js:1162 | `kontakteDelEmail` | confirm | Kader · Kontakte | Login-E-Mail entfernen |
| views.js:1178 | `kontakteDelPhone` | confirm | Kader · Kontakte | Telefonnummer entfernen |
| views.js:1192 | `kindLinkShare` | prompt | Kader | Kinder-Link zum Kopieren |
| views.js:1414 | `zieleDelete` | confirm | Entwicklung | Entwicklungs-Ziel löschen |
| views.js:1893 | `delPlayer` | confirm | Bewertungen | Alle Bewertungen eines Kindes löschen |
| views.js:1908 | `delSnapshot` | confirm | Bewertungen | Eine Bewertung löschen |
| views.js:3396 | `kindVollstaendigLoeschen` | confirm | Datenschutz | Alle Daten eines Kindes löschen |
| views.js:3872 | `tpollDelete` | confirm | Trainer-Meeting | Meeting löschen |
| views.js:4644 | `wahlDelete` | confirm | Wahlen | Wahl samt Stimmen löschen |
| views.js:4981 | `probeDelete` | confirm | Probetraining | Probekind löschen |
| views.js:5592 | `albumFotoDelete` | confirm | Sammelalbum | Foto einer Karte entfernen |
| views.js:5620 | `kabineCodeSave` | confirm | Einstellungen · Kabine | Code gleich Trainer-PIN trotzdem verwenden |
| views.js:6002 | `nutzungAufraeumen` | confirm | Nutzungs-Log | Einträge älter als 90 Tage löschen |
| views.js:7092 | `heftReporterDelete` | confirm | Adler Nest · Reporter | Reporter-Antwort löschen |

## Paket 3 · Eltern/Kinder (⬜)

| Datei:Zeile | Funktion | Art | Bereich | Zweck |
|---|---|---|---|---|
| md-matchcard.js:367 | `edSignup` | alert | Eltern (toter Code) | Name des Kindes fehlt |
| md-matchcard.js:372 | `edSignup` | alert | Eltern (toter Code) | Speichern fehlgeschlagen |
| md-matchcard.js:408 | `fgOffer` | alert | Eltern (toter Code) | Name/Plätze fehlen |
| md-matchcard.js:412 | `fgOffer` | alert | Eltern (toter Code) | Speichern fehlgeschlagen |
| md-matchcard.js:415 | `fgJoin` | prompt | Eltern (toter Code) | Name des mitfahrenden Kindes |
| md-matchcard.js:422 | `fgJoin` | alert | Eltern (toter Code) | Fahrt schon voll |
| md-matchcard.js:426 | `fgJoin` | alert | Eltern (toter Code) | Speichern fehlgeschlagen |

`edLoad`/`fgLoad` sprechen die Tabellen `eltern_dabei` und `fahrgemeinschaft` an, die es nicht
mehr gibt (siehe Hinweis in views.js); die lebende Fahrgemeinschaft steckt in `rueckmeldungen`.
Diese sieben Stellen verschwinden am saubersten mit dem toten Code.
