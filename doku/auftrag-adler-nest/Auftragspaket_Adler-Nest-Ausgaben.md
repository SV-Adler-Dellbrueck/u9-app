# Auftragspaket: Adler Nest als regelmäßige Ausgaben

Repo `SV-Adler-Dellbrueck/u9-app`, Stand 03.10.2026. Gilt zusammen mit `CLAUDE.md`. Oberfläche nach Skill `cockpit-ui`.

Zusammengeführt wird auf Wort von Charles. Entwurfs-PR, kein Merge.

## Warum

Das Adler Nest (Stadionheft) soll nach jedem Spieltag erscheinen, auch nach Auswärtsspielen, und von Eltern und Kindern gelesen werden. Heute gibt es genau ein Heft je Team: `stadionheft` wird mit `on_conflict=team` überschrieben, ältere Ausgaben gehen verloren. Das Heft zeigt nur „Nächstes Spiel", nicht den letzten Spieltag, und die Elternfotos aus der Spieltagsgalerie (`termin_media`) kommen darin nicht vor.

Die Inhalte entstehen im Projekt-Chat: Charles spricht den Spieltag ein, der Chat schreibt den Text aus App-Daten und Einsprache. Dieses Paket liefert den Rahmen in der App: Ausgaben speichern, im Login lesen, Fotos auswählen.

## Beschlossen (Charles, 03.10.2026)

- Eine Ausgabe nach jedem Spieltag, auch auswärts.
- Fotos wählt Charles im Editor aus (4 bis 6) aus der Galerie des Spieltags.
- Das Heft mit Elternfotos ist nur hinter dem Login lesbar (Eltern-App). Grund: Die Galeriefotos haben keine Kind-Zuordnung und zeigen auch Gegnerkinder ohne unsere Einwilligung.
- Der Text entsteht im Projekt-Chat; Charles liest im Editor gegen und veröffentlicht.

## Vorab prüfen (erster Schritt, vor jedem Bau)

1. Wie lesen Policies von `termin_media` und der Speicher `termin_media`? Welche Hilfsfunktionen gelten dort (`sitzung_gueltig()`, `is_trainer()`, `is_parent_of()`, `ist_mitglied()`)? Die neue Tabelle folgt demselben Muster.
2. Hat `termine` ein Feld für das Ergebnis, oder liegt es in `match_actions`? Das Heft zeigt Gegner, Uhrzeit, Heim/Auswärts und Ergebnis aus den App-Daten, nicht aus einem zweiten Textfeld.
3. Dürfen Kinder-Konten (Kinder-App) auf `heft_ausgabe` lesen? Wenn nicht, ausweisen und Charles fragen, nicht stillschweigend öffnen.
4. Wer verlinkt auf den alten öffentlichen `?heft`-Link? Bekannt: Matchcard (`md-matchcard.js`), Spielende-Seite, Eltern-Portal (`von=app`).

## Was entsteht

### 1. Tabelle `heft_ausgabe` (Migration, RLS Pflicht)

| Feld | Typ | Bedeutung |
|---|---|---|
| `id` | bigint, identity | |
| `team` | text, Standard `adler1` | |
| `nummer` | int | laufend je Team, eindeutig mit `team` |
| `termin_id` | bigint, Verweis `termine`, darf leer sein | Spieltag; leer bei Sonderausgaben |
| `titel` | text | z. B. „Adler Nest · Ausgabe 3" |
| `einleitung` | text | |
| `spieltag_text` | text | Bericht zum Spieltag, Absätze mit Zeilenumbruch |
| `portraet_spieler_id` | bigint, darf leer sein | Kind im Porträt (v732) |
| `portraet_text` | text | |
| `kommentar` | text | „Ein Wort vom Trainerteam" |
| `foto_ids` | bigint[] | IDs aus `termin_media`, höchstens 6 |
| `status` | text | `entwurf` oder `veroeffentlicht` |
| `veroeffentlicht_am` | timestamptz | |
| `created_at`, `updated_at` | timestamptz | |

RLS:

- Lesen: Trainer alles; eingeloggte Team-Eltern nur `status = 'veroeffentlicht'`. Kinder-Konten nur, wenn Prüfpunkt 3 es hergibt.
- Schreiben: nur Trainer.
- Kein Zugriff für `anon`. Keine Policy ohne ausdrücklichen Zweck.
- Kinder erscheinen im Text mit Vorname und Initiale des Nachnamens, nie mit Geburtsdatum.

### 2. Fotos über Hüllfunktion

Neue Funktion `heft_fotos(p_ausgabe bigint)`, `security definer`, prüft `sitzung_gueltig()` (Muster aus `20261003_v731_rpc_reparatur.sql`), gibt nur die Pfade der Fotos zurück, die in `foto_ids` der veröffentlichten Ausgabe stehen. Trainer sehen sie auch im Entwurf. Die Bilder selbst werden wie in der Spieltagsgalerie über den authentifizierten Speicher geladen (`_galBlob`). Kein neuer öffentlicher Zugang.

### 3. Leseansicht in der Eltern-App

- Eintrag „Adler Nest" unter „Mehr vom Team" öffnet die neueste veröffentlichte Ausgabe, darunter eine Liste älterer Ausgaben (Nummer, Spieltag, Gegner).
- Aufbau: Kopf mit Wappen und Ausgabennummer, Spieltagskarte (Gegner, Datum, Uhrzeit, Heim/Auswärts, Ergebnis aus App-Daten), Fotostrecke mit Großansicht wie in der Spieltagsgalerie, Bericht, „Adler im Porträt", Kabinen-Reporter, Wort vom Trainerteam, Mannschaftsseite.
- Hauptaktion „Zurück zur App" mindestens 44 px, Antippflächen mindestens 48 px.
- Das Eltern-Portal zeigt „Das Adler Nest ist frisch erschienen" anhand der neuesten `veroeffentlicht_am` (heute `cur.nest`).

### 4. Editor (Trainerbereich)

- Auswahl der Ausgabe oder „Neue Ausgabe"; Spieltag aus Terminen der Saison wählbar.
- Felder wie oben; Fotoauswahl als Raster aus dem Album des gewählten Spieltags, Antippen markiert, Zähler „4 von 6", mehr als 6 nicht möglich.
- Vorschau live, Speichern als Entwurf, Veröffentlichen mit Bestätigung. Veröffentlichen schreibt `portraet_verlauf` fort (wie `heftSaveDb` heute).
- Der Porträt-Vorschlag „wer ist dran" und der Porträt-Entwurf (`ki-portraet`) bleiben unverändert.
- Entwürfe, die der Projekt-Chat anlegt, erscheinen hier zum Gegenlesen.

### 5. Alter öffentlicher Link `?heft`

Bleibt für bestehende Links erhalten, zeigt aber keine Ausgaben mehr, sondern den Hinweis „Das Adler Nest lesen Eltern in der App" mit Weg zum Login. Matchcard und Spielende-Seite zeigen den Hinweis, kein totes Ziel. Die Funktion `stadionheft-view` bleibt bestehen, bis Charles sie abschalten lässt. Nicht ohne Wort von Charles löschen.

## Nicht Teil dieses Auftrags

- Kein Druckexport der neuen Ausgaben. Der bestehende Druck bleibt.
- Keine neue KI-Funktion. Der Text kommt aus dem Projekt-Chat.
- Kein Schreibzugriff der Eltern.

## Abnahmekriterien

1. `heft_ausgabe` hat RLS. Ein Elternkonto liest nur veröffentlichte Ausgaben, `anon` nichts, schreiben darf nur der Trainer.
2. Ein Entwurf ist für Eltern unsichtbar, für Trainer sichtbar.
3. `heft_fotos` liefert für eine veröffentlichte Ausgabe nur die gewählten Fotos, für einen Entwurf nur an Trainer, ohne gültige Sitzung nichts.
4. Mehr als 6 Fotos werden im Editor verhindert und serverseitig abgelehnt.
5. Zwei Ausgaben desselben Teams bleiben nebeneinander bestehen; das Veröffentlichen der zweiten ändert die erste nicht. Nummer ist je Team eindeutig.
6. Die Leseansicht zeigt neueste Ausgabe und Archivliste; Spieltagskarte aus App-Daten, nicht aus freiem Text.
7. Namen erscheinen als Vorname und Initiale, ohne Geburtsdatum.
8. Der alte `?heft`-Link zeigt den Hinweis und kein Heft.
9. Hauptaktion 56 px, Bedienelemente mindestens 48 px, genau eine Hauptaktion je Bildschirm.
10. `node tests/run.js` grün, neue Prüffälle unter `tests/checks/`, `sw.js`, Funktionsübersicht und Hilfe im Editor nachgezogen.

## Testfälle

- Elternkonto A öffnet die Leseansicht ohne veröffentlichte Ausgabe: Leerzustand, kein Fehler.
- Ausgabe 1 veröffentlicht, Ausgabe 2 als Entwurf: Elternkonto sieht nur 1.
- Ausgabe 2 veröffentlicht: neueste ist 2, Archiv zeigt 1.
- Sieben Fotos wählen: siebtes wird abgelehnt.
- Foto aus einem anderen Spieltag per `foto_ids` einschleusen: `heft_fotos` liefert es nur, wenn es in `termin_media` existiert und die Ausgabe es nennt. Prüfen, ob dies für den Termin der Ausgabe eingeschränkt werden soll, und Charles das Ergebnis melden.
- Abgemeldeter Aufruf von `heft_fotos`: leer.
- Alter `?heft`-Link ohne Login: Hinweistext.

## Datenschutz

In diesem öffentlichen Repo stehen keine Klarnamen von Kindern oder Eltern, auch nicht in Prüffällen. Prüffälle arbeiten mit Platzhaltern („Kind A"). Die Texte der Ausgaben liegen nur in der Datenbank und als Lesekopie im privaten Repo `adler-u9-wissen`.

## Übergabe zurück

Claude Code vermerkt im PR: Ergebnis der vier Vorab-Prüfungen, offene Punkte, und dass `stand.md` und `entscheidungen.md` im Repo `adler-u9-wissen` für diesen Beschluss nachzuziehen sind (Drive-Kopien sind seit 01.10.2026 stillgelegt).
