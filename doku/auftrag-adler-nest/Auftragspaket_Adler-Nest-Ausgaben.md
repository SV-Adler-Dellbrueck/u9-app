# Auftragspaket: Adler Nest als regelmäßige Ausgaben

Repo `SV-Adler-Dellbrueck/u9-app`, Stand 03.10.2026 (Endfassung des Tages). Gilt zusammen mit `CLAUDE.md`. Bedienoberflächen nach Skill `cockpit-ui`; für die Leseansicht des Hefts gilt die Ausnahme in Abschnitt 6.

Zusammengeführt wird auf Wort von Charles. Entwurfs-PR, kein Merge.

## Warum

Das Adler Nest soll nach jedem Spieltag als eigene Ausgabe erscheinen und von Eltern und Kindern in der App gelesen und gehört werden. Heute gibt es genau ein Heft je Team: `stadionheft` wird mit `on_conflict=team` überschrieben, ältere Ausgaben gehen verloren. Das Heft zeigt nur „Nächstes Spiel“, nicht den letzten Spieltag, und die Elternfotos aus der Spieltagsgalerie (`termin_media`) kommen nicht vor.

Die Inhalte entstehen im Projekt-Chat: Charles spricht den Spieltag ein, der Chat schreibt Texte und Hördatei aus App-Daten und Einsprache. Dieses Paket liefert den Rahmen in der App: Ausgaben speichern, im Login lesen und hören, Fotos auswählen, Porträt-Angaben einholen.

Ausgabe 1 (Kinderfestival 03.10.2026) ist im Projekt-Chat fertig entworfen und dient als Referenz. Ihre Texte liegen im privaten Repo `adler-u9-wissen` unter `heft/ausgabe-01-2026-10-03.md` (dort mit Kindernamen, deshalb nicht hier). Der Gestaltungsentwurf ist ein privates Canvas von Charles; die Maße unten sind daraus übernommen.

## Beschlossen (Charles, 03.10.2026)

1. Eine Ausgabe nach jedem Spieltag, auch auswärts.
2. Das Heft ist nur hinter dem Login lesbar (Eltern-App, Trainer, Kinder-Konten sofern Prüfpunkt 3 es hergibt). Grund: Galeriefotos haben keine Kind-Zuordnung und zeigen auch Gegnerkinder.
3. Bilderstrecke: Charles wählt im Editor 4 bis 6 Fotos aus der Galerie des Spieltags.
4. Texte entstehen im Projekt-Chat; Charles liest im Editor gegen und veröffentlicht.
5. Vereinsblau `#0044AA` als Heftfarbe, Akzent Gelb `#F5B700`, Dunkelblau `#0A1A3A` – nur in der Leseansicht des Hefts (Ausnahme von der Statusfarbenregel, weil das Heft ein Lesestück ist und keine Bedienoberfläche).
6. Feste Gliederung jede Woche (Abschnitt 4).
7. Titelbild ist ein KI-gezeichnetes Adler-Maskottchen im Comic-Stil, keine erfundenen oder echten Kinder. Standardbild aus Ausgabe 1; je Ausgabe darf ein neues Maskottchen-Motiv oder ein Galeriefoto gesetzt werden.
8. Je Ausgabe eine Hördatei „Adler Nest zum Hören“ (etwa 1 bis 2 Minuten), gesprochen vom Maskottchen, erzeugt mit ElevenLabs im Projekt-Chat.
9. Im Audio wird nur das Porträtkind beim Vornamen genannt und nur mit Charles' Zustimmung; alle anderen Kinder bleiben im Audio ohne Namen.
10. Porträt immer aus Fan-Fakten **und** Kabinen-Reporter des Kindes. Der Kabinen-Reporter ist Teil des Porträts, keine eigene Rubrik mehr. Nur freigegebene Antworten; freigeben darf nur das Trainerteam.
11. Der Grund für die Rückennummer (`nummer_grund`) erscheint nie im Heft.
12. Der Spitzname erscheint nur, wenn Charles ihn ausdrücklich will.
13. „An diesem Tag“ in jeder Ausgabe: ein historisches Ereignis zum Lernen, ein lustiges zum Schmunzeln, beide vom Kalendertag des Spieltags, kindgerecht, an einer Quelle geprüft.
14. Privatfotos im Porträt: bis zu 2, von der Familie geliefert, nur mit deren Einverständnis, mit Bildunterschrift.
15. Porträt-Angaben werden über einen festen Ablauf in der App eingeholt (Abschnitt 8): Eltern bis Mittwoch vor dem Spieltag, Trainer bis Freitag.
16. Trainingsbeteiligung erscheint im Porträt nur, wenn sie hoch ist, und nur aus App-Daten, nie aus der Erinnerung. Niedrige oder mittlere Beteiligung wird nicht erwähnt, auch nicht umschrieben.

## Vorab prüfen (erster Schritt, vor jedem Bau)

1. Policies von `termin_media` und Speicher `termin_media`: Welche Hilfsfunktionen gelten (`sitzung_gueltig()`, `is_trainer()`, `is_parent_of()`, `ist_mitglied()`)? Die neuen Tabellen und Buckets folgen demselben Muster.
2. Ergebnis: `termine.ergebnis` ist am 03.10. leer. Wo trägt die App Turnierergebnisse ein (`turnier_spiele`)? Die Spieltagskarte zeigt ein Ergebnis nur, wenn eines erfasst ist; sonst entfällt die Zeile.
3. Dürfen Kinder-Konten (Kinder-App) auf `heft_ausgabe` und die Hördatei zugreifen? Wenn nicht, ausweisen und Charles fragen.
4. Wer verlinkt auf den alten öffentlichen `?heft`-Link? Bekannt: Matchcard (`md-matchcard.js`), Spielende-Seite, Eltern-Portal (`von=app`).
5. Teams und Kapitäne eines Spieltags liegen in `nominierungen` (`<datum>__teams`, Zuordnung Kind → Team, `_trainer`) und `match_actions` (`aktion = kapitaen`, Team 1 unter `<datum>`, weitere unter `<datum>__t2`, `__t3`). Bestätigen und die Leseansicht daraus speisen.
6. Befund 03.10. (nicht bauen, nur prüfen und melden): Für Team 3 war ein Kapitän eingetragen, der nicht im Team stand (Charles hat korrigiert). Und im Ticker stand eine Aktion für ein als verletzt gemeldetes Kind. Prüfen, ob die App beides verhindern oder warnen sollte, und Charles einen Vorschlag machen.
7. Wo liegt die tatsächliche Trainingsanwesenheit – nur Zusagen in `rueckmeldungen` oder eine Anwesenheitsliste? Die Kennzahl in Abschnitt 8 rechnet nur mit tatsächlicher Anwesenheit; gibt es sie nicht, melden statt Zusagen zu nehmen.

## Was entsteht

### 1. Tabelle `heft_ausgabe` (Migration, RLS Pflicht)

| Feld | Typ | Bedeutung |
|---|---|---|
| `id` | bigint, identity | |
| `team` | text, Standard `adler1` | |
| `nummer` | int | laufend je Team, eindeutig mit `team` |
| `termin_id` | bigint → `termine`, darf leer sein | Spieltag; leer bei Sonderausgaben |
| `schlagzeile` | text | Deckblatt, höchstens 40 Zeichen |
| `teaser_spieltag`, `teaser_portraet`, `teaser_tag` | text | drei Zeilen „Im Heft“ auf dem Deckblatt, je höchstens 45 Zeichen |
| `titelbild_pfad` | text | Bild im Bucket `heft_media`; leer = Standard-Maskottchen |
| `audio_pfad` | text | Hördatei (MP3) im Bucket `heft_media` |
| `audio_sekunden` | int | Anzeige der Dauer |
| `anpfiff` | text | 2–3 Sätze Begrüßung |
| `spieltag_text` | text | Bericht, Absätze mit Zeilenumbruch |
| `zitat` | text | ein hervorgehobener Satz aus dem Bericht |
| `eltern_dank` | text | Kasten „Danke, Eltern-Kurve!“ |
| `sonderzeile` | text, darf leer sein | z. B. „Gute Besserung, …“ – ohne Angaben zur Verletzung |
| `foto_ids` | bigint[] | IDs aus `termin_media`, höchstens 6 |
| `portraet_spieler_id` | bigint, darf leer sein | Kind im Porträt (v732) |
| `portraet_einleitung` | text | 1–2 Sätze |
| `portraet_trainersatz` | text | „Das sagt das Trainerteam“, ohne Vergleich mit anderen |
| `portraet_privatfotos` | jsonb | bis 2 Einträge `{pfad, unterschrift}` im Bucket `heft_media`, übernommen aus der Einreichung (Abschnitt 8) |
| `training_leitfrage` | text | Leitfrage der Woche |
| `training_text` | text | ein Satz für Eltern |
| `tag_lernen`, `tag_lustig` | text | „An diesem Tag“ |
| `tag_quellen` | text | nur für Trainer sichtbar |
| `kommentar` | text | „Ein Wort vom Trainerteam“ |
| `status` | text | `entwurf` oder `veroeffentlicht` |
| `veroeffentlicht_am`, `created_at`, `updated_at` | timestamptz | |

RLS:

- Lesen: Trainer alles; eingeloggte Team-Eltern nur `status = 'veroeffentlicht'`; `tag_quellen` nicht an Eltern ausliefern (Ansicht oder Hüllfunktion). Kinder-Konten nur nach Prüfpunkt 3.
- Schreiben: nur Trainer. Kein Zugriff für `anon`.
- Kinder erscheinen mit Vorname und Initiale des Nachnamens; Jahrgang nur mit Freigabe „öffentlich“ wie heute, nie das Geburtsdatum.

### 2. Bucket `heft_media` (privat)

Für Titelbild, Hördatei und Privatfotos des Porträts. Lesen nur mit gültiger Sitzung und nur für Dateien einer veröffentlichten Ausgabe (Trainer auch im Entwurf, Eltern zusätzlich die Dateien ihrer eigenen Einreichung). Schreiben: Trainer; Eltern nur im Pfad ihrer eigenen Einreichung (Abschnitt 8). Zugriff über Hüllfunktion `heft_medien(p_ausgabe bigint)` nach dem Muster `20261003_v731_rpc_reparatur.sql`, die die Pfade von Titelbild, Audio, Privatfotos und der Galeriefotos aus `foto_ids` liefert. Die Galeriefotos bleiben im Bucket `termin_media`.

Standard-Titelbild: das Maskottchen aus Ausgabe 1 (1170 × 1680, JPG). Charles legt es im Editor als erstes Titelbild hoch; ohne Titelbild zeigt das Deckblatt die große Ausgabenummer auf Dunkelblau.

### 3. Fan-Fakten erweitern (`kind_fanfacts`)

Drei neue Felder, von Eltern in der App ausfüllbar wie die übrigen: `starker_fuss` (links, rechts, beide), `weiterer_sport` (freier Text, z. B. Sportart und wie oft) und `saisonziel` (freier Satz, z. B. was das Kind lernen will). `nummer_grund` bleibt, wird im Heft nie genutzt.

### 4. Leseansicht in der Eltern-App

Eintrag „Adler Nest“ unter „Mehr vom Team“ öffnet die neueste veröffentlichte Ausgabe, darunter das Archiv (Nummer, Datum, Gegner). Ausgabe als vier Abschnitte zum Wischen oder Scrollen, Breite 390 px als Maß:

**a) Deckblatt** (Höhe 960): Kopfleiste Vereinsblau „SV Adler Dellbrück · U9“ / „Ausgabe NN“; Titelbild 390 × 560 oben; Block „ADLER NEST“ in Vereinsblau (Barlow Condensed 800, 76 px, zwei Zeilen) mit gelbem Band „Das Vereinsheft der jungen Adler“; unten Dunkelblau: gelbes Band Spieltag (Format · Gegner · heim/auswärts, aus App-Daten), Schlagzeile (44 px, Großbuchstaben), Datum, Block „Adler Nest zum Hören“ mit Dauer und Abspielknopf (mindestens 48 px hoch, volle Breite), drei Zeilen „Im Heft“ mit gelber Rubrik.

**b) Spieltag**: Anpfiff; Spieltagskarte (Format, Gastgeber, Ort, Zeit, Spielform, Teams, Ergebnis falls vorhanden); „Vom Platz“ mit Zitatkasten; „Unsere Teams“ je Team Nummer, Kinder (Kapitän mit „(C)“), Trainer; Bilderstrecke 2 × 2 bzw. 2 × 3 mit Großansicht wie die Spieltagsgalerie; gelber Kasten Eltern-Dank; Sonderzeile.

**c) Adler im Porträt**: Kopf Vereinsblau mit großer Rückennummer im Hintergrund, Spielerfoto (nur mit Freigabe), Vorname groß, Nummer und Position; Einleitung; Steckbrief-Raster (Position, Adler seit, starker Fuß, Jahrgang, Lieblingsverein, Vorbild, weiterer Sport, Lieblingsteam weiterer Sport); „Kabinen-Reporter: Fragen an …“ mit den freigegebenen Antworten; „Privat“ mit bis zu 2 Fotos und Unterschrift; „Abseits vom Platz“ aus den Fan-Fakten; „Das sagt das Trainerteam“; gelbes Feld Saisonziel. Leere Felder werden ausgelassen, nie als Platzhalter gezeigt.

**d) Rubriken**: Aus dem Training (Leitfrage, Satz für Eltern); An diesem Tag (dunkler Block, „Zum Lernen“ gelb, „Zum Schmunzeln“ weiß, Jahreszahl); Wort vom Trainerteam; Nächster Spieltag aus `termine`; „Auf geht's, Adler!“.

Weitere Vorgaben: Hauptaktion „Zurück zur App“ mindestens 44 px; Eltern-Portal meldet „Das Adler Nest ist frisch erschienen“ anhand der neuesten `veroeffentlicht_am`; Hördatei mit `preload="none"`.

### 5. Editor (Trainerbereich)

- Ausgabe wählen oder „Neue Ausgabe“, Spieltag aus Terminen der Saison.
- Alle Textfelder oben; Fotoauswahl als Raster aus dem Album des Spieltags, Zähler „4 von 6“, mehr als 6 gesperrt.
- Hochladen von Titelbild und Hördatei (MP3). Privatfotos kommen aus der Einreichung der Eltern (Abschnitt 8); der Trainer kann sie übernehmen oder weglassen, aber nicht ohne Einverständnis der Eltern einsetzen.
- Freigabe der Kabinen-Reporter-Antworten des Porträtkinds direkt im Editor.
- Vorschau wie die Leseansicht, Entwurf erfassen, Veröffentlichen mit Bestätigung; Veröffentlichen schreibt `portraet_verlauf` fort.
- Porträt-Vorschlag „wer ist dran“ und `ki-portraet` bleiben unverändert.
- Entwürfe, die der Projekt-Chat anlegt, erscheinen hier zum Gegenlesen.

### 6. Gestaltung der Leseansicht

Schriften Barlow Condensed (600, 800) und Barlow (400, 600, 700), Lizenz SIL OFL. **Selbst im Repo ablegen** und per `@font-face` laden, nicht über Google Fonts – das Nachladen von Google-Servern überträgt die IP-Adresse der Eltern und ist in Deutschland abmahnfähig. Farben als Variablen nur im Heft-Stylesheet (`--heft-blau`, `--heft-gelb`, `--heft-dunkel`), nicht in `ui.css`.

### 7. Alter öffentlicher Link `?heft`

Bleibt für bestehende Links erhalten, zeigt aber keine Ausgabe mehr, sondern „Das Adler Nest lesen Eltern in der App“ mit Weg zum Login. Matchcard und Spielende-Seite zeigen den Hinweis. `stadionheft-view` nicht ohne Wort von Charles löschen.

### 8. Porträt-Ablauf: Angaben von Eltern, Kind und Trainern

Ziel: Jedes Porträt entsteht gleich, ohne dass Charles einzeln nachfragt. Vorlauf eine Woche vor dem Spieltag, an dem die Ausgabe erscheint.

1. **Kind festlegen (direkt nach dem vorigen Spieltag).** Die App schlägt das Kind vor, das laut `portraet_verlauf` am längsten nicht dran war; ein Trainer bestätigt mit einem Tipp. Das legt eine Zeile in `portraet_einreichung` an.
2. **Eltern (bis Mittwoch, 20 Uhr).** Benachrichtigung im Eltern-Portal „Euer Kind ist im nächsten Adler Nest“ mit einem Bogen: Fan-Fakten einschließlich der neuen Felder, bis zu 2 Privatfotos mit Bildunterschrift, Pflichthäkchen „Wir sind einverstanden, dass diese Angaben und Fotos im Adler Nest erscheinen“. Ohne Häkchen keine Fotos. Nach Fristablauf ohne Einreichung einmal erinnern, dann nichts mehr.
3. **Kind (bis Mittwoch).** Hinweis in der Kinder-App auf die Porträtfragen im Kabinen-Reporter (v732).
4. **Trainer (bis Freitag, 20 Uhr).** Jeder Trainer kann beim Kind 2 bis 3 Stichpunkte hinterlegen: was das Kind auszeichnet, woran es arbeitet. Hinweis an alle Trainer am Montag, Erinnerung am Freitagmorgen an die, die noch nichts eingetragen haben.
5. **Freigabe (vor dem Spieltag).** Ein Trainer gibt die Reporter-Antworten frei und sieht im Editor eine Ampel: Bogen der Eltern, Antworten des Kindes, Trainerstimmen – je vorhanden oder fehlt.
6. **Nach dem Spieltag** liest der Projekt-Chat alles und schreibt Porträt und Hördatei.

Neue Tabellen (RLS Pflicht):

| Tabelle | Felder | Zugriff |
|---|---|---|
| `portraet_einreichung` | `id`, `spieler_id`, `ausgabe_id` (darf leer sein bis die Ausgabe angelegt ist), `status` (`angefragt`, `eingereicht`, `uebernommen`), `einverstanden_am`, `einverstanden_von`, `privatfotos` jsonb (bis 2 `{pfad, unterschrift}`), `frist_eltern`, `erinnert_am`, Zeitstempel | Eltern lesen und schreiben nur Zeilen ihres Kindes (`is_parent_of`), solange `status` nicht `uebernommen`; Trainer alles |
| `portraet_trainerstimme` | `id`, `einreichung_id`, `trainer_id`, `stichpunkte` text, Zeitstempel | nur Trainer lesen und schreiben; nie an Eltern ausliefern |

Privatfotos der Eltern liegen in `heft_media` unter einem Pfad je Einreichung; Eltern dürfen dort nur in den Pfad ihrer eigenen Einreichung schreiben. Zieht eine Familie das Einverständnis zurück (Häkchen entfernen), werden die Fotos aus Einreichung und Ausgabe entfernt.

Kennzahl Trainingsbeteiligung: Anteil besuchter Trainings der laufenden Saison aus tatsächlicher Anwesenheit (Prüfpunkt 7). Die App zeigt sie im Editor nur, wenn sie die Schwelle erreicht; die Schwelle ist eine Einstellung im Trainerbereich, Vorschlag 90 %, von Charles zu bestätigen. Kein Wert, keine Rangliste, kein Vergleich mit anderen Kindern im Heft – nur der Satz „bei (fast) jedem Training dabei“.

## Ablauf je Spieltag (zur Einordnung)

1. Charles spricht im Projekt-Chat den Spieltag ein.
2. Der Chat liest Termin, Teams, Kapitäne, Ticker, Fan-Fakten, Reporter-Antworten, Einreichung und Trainerstimmen, recherchiert „An diesem Tag“ und schreibt alle Felder; Hördatei mit ElevenLabs (Stimme „Lennart – Energetic“, Modell `eleven_v4`).
3. Der Chat legt die Ausgabe als Entwurf an (Datenweg, kein Code); Titelbild und Hördatei lädt Charles im Editor hoch.
4. Charles wählt die Fotos, liest gegen, veröffentlicht.

## Nicht Teil dieses Auftrags

- Kein Druck- oder PDF-Export der neuen Ausgaben.
- Keine Anbindung von ElevenLabs oder anderen KI-Diensten in der App.
- Kein Schreibzugriff der Eltern auf Ausgaben (nur auf die eigene Einreichung).

## Abnahmekriterien

1. RLS auf `heft_ausgabe` und `heft_media`: Eltern lesen nur Veröffentlichtes, `anon` nichts, Ausgaben schreiben nur Trainer; `tag_quellen` erreicht keine Eltern.
2. Zwei Ausgaben bestehen nebeneinander; Nummer je Team eindeutig.
3. `heft_medien` liefert ohne Sitzung nichts, für Entwürfe nur an Trainer.
4. Mehr als 6 Galeriefotos und mehr als 2 Privatfotos werden im Editor und serverseitig abgelehnt; Privatfoto ohne Einverständnis der Eltern nicht speicherbar.
5. Eltern können nur die Einreichung ihres eigenen Kindes sehen und ändern; Trainerstimmen sind für Eltern unsichtbar.
6. Benachrichtigungen und Erinnerungen gehen genau einmal zu den Fristen in Abschnitt 8.
7. Trainingsbeteiligung erscheint nur ab der eingestellten Schwelle und nur aus tatsächlicher Anwesenheit.
8. Leseansicht zeigt Deckblatt, Spieltag, Porträt, Rubriken in dieser Reihenfolge; leere Felder ausgelassen.
9. Spieltagskarte, Teams und Kapitäne aus App-Daten, nicht aus Freitext.
10. Namen als Vorname und Initiale; kein Geburtsdatum; `nummer_grund` nirgends im Heft.
11. Hördatei spielbar, Abspielknopf mindestens 48 px, Dauer angezeigt.
12. Schriften lokal geladen; keine Anfrage an `fonts.googleapis.com` oder `fonts.gstatic.com`.
13. Alter `?heft`-Link zeigt den Hinweis.
14. `node tests/run.js` grün, neue Prüffälle unter `tests/checks/`, `sw.js`, Funktionsübersicht und Hilfe im Editor nachgezogen.

## Testfälle

- Elternkonto ohne veröffentlichte Ausgabe: Leerzustand mit einem Satz.
- Ausgabe 1 veröffentlicht, Ausgabe 2 Entwurf: Eltern sehen nur 1.
- Ausgabe 2 veröffentlicht: neueste ist 2, Archiv zeigt 1.
- Siebtes Galeriefoto, drittes Privatfoto: abgelehnt.
- Porträtkind ohne `starker_fuss`: Feld fehlt im Steckbrief, kein Platzhalter.
- Nicht freigegebene Reporter-Antwort: erscheint nicht.
- Elternkonto von Kind A versucht, die Einreichung von Kind B zu lesen: leer.
- Eltern entfernen das Einverständnis nach dem Hochladen: Fotos verschwinden aus Einreichung und Ausgabe.
- Kind mit Beteiligung unter der Schwelle: kein Satz zur Beteiligung, auch kein Hinweis.
- Bis Mittwoch 20 Uhr keine Einreichung: genau eine Erinnerung.
- Abgemeldeter Aufruf von `heft_medien`: leer.
- Netzwerkprotokoll der Leseansicht: keine Google-Fonts-Anfrage.

## Datenschutz

In diesem öffentlichen Repo stehen keine Klarnamen von Kindern oder Eltern, auch nicht in Prüffällen („Kind A“). Inhalte der Ausgaben liegen nur in der Datenbank und als Lesekopie im privaten Repo `adler-u9-wissen`.

## Übergabe zurück

Claude Code vermerkt im PR: Ergebnis der sieben Vorab-Prüfungen, offene Punkte, und dass die Übergabe `Projektgedaechtnis/uebergabe-2026-10-03-adler-nest.md` im Repo `adler-u9-wissen` in `stand.md` und `entscheidungen.md` einzuarbeiten ist.
