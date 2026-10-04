# Auftragspaket: Adler-Ruf – längere Rufe (5.000 Zeichen) und Anhänge

Repo `SV-Adler-Dellbrueck/u9-app`, Stand 04.10.2026 (nach v733). Gilt zusammen mit `CLAUDE.md`.
Betrifft `md-adler-rufe.js`, eine Migration in `supabase/migrations/`, die Sicherungsliste in
`views.js`, Hilfe und Funktionsübersicht. Eigener PR.

## Warum

Zwei der bisher 21 Rufe sind länger als 1.500 Zeichen, das Limit von 2.000 stößt also schon an.
Außerdem lässt sich in einem Ruf nichts anhängen: Screenshots, Aushänge, Formulare und
Tabellen müssen über WhatsApp laufen, obwohl der Chat genau dafür da ist (Kassenwart, Elternbeirat,
Trainerteam).

## Entscheidungen des Trainers (04.10.2026)

- Zeichenlimit je Ruf von 2.000 auf **5.000**.
- Anhänge: **Bilder, PDF und Office-Dateien**.
- Anhänge sind **überall** erlaubt, also auch in den drei offenen Räumen (Allgemein, App-Ideen &
  Feedback, Infos vom Verein) und in den privaten Familienräumen. Das bleibt so; die App weist in
  offenen Räumen nur darauf hin, dass alle Eltern mitlesen (siehe 3.5).

## Was sich ändert

### 1. Zeichenlimit 5.000

Es steht an vier Stellen und muss an **allen** gleichzeitig steigen:

1. CHECK `rufe_nachricht_text_check` (1 bis 2000 Zeichen nach Trim) → 1 bis 5000.
2. Funktion `rufe_bearbeiten` (`not between 1 and 2000`) → 5000.
3. `maxlength="2000"` am Eingabefeld `rufe-text` und am Bearbeiten-Feld `rufe-edit`.
4. Prüfen, ob `rufe_push_faellig`, die Edge Function `rufe-push` und die Suche den Text kürzen
   oder an einer festen Länge scheitern; wenn ja, anpassen und im PR nennen.

Dazu in der App:

- Ab 4.500 Zeichen steht unter dem Feld ein Zähler „Noch 312 Zeichen“.
- Lange Rufe (über 800 Zeichen) zeigt die Blase auf etwa acht Zeilen gekürzt mit einem Knopf
  „Weiterlesen“ (mindestens 44 px). Ein Tipp klappt sie auf. Suche, Zitat (`rf-zitat`, schon auf
  120 Zeichen gekürzt) und Archiv bleiben unverändert.

### 2. Anhänge – Daten

**Neuer privater Storage-Bucket `rufe-anhang`:** 10 MB je Datei (10485760), erlaubte Typen:
`image/jpeg`, `image/png`, `image/webp`, `image/heic`, `application/pdf`, Word (`.doc`, `.docx`),
Excel (`.xls`, `.xlsx`), PowerPoint (`.ppt`, `.pptx`) mit den üblichen Mime-Typen. **Nicht erlaubt:**
Formate mit Makros (`.docm`, `.xlsm`, `.pptm`), SVG, HTML, ausführbare Dateien, Archive.

**Neue Tabelle `rufe_anhang`:** `id`, `nachricht_id` (Fremdschlüssel auf `rufe_nachricht`, löschen
folgt), `raum_id` (für die Rechteprüfung), `pfad` (eindeutig), `name` (Dateiname, bereinigt,
höchstens 120 Zeichen), `mime`, `groesse`, `created_at`. RLS ist Pflicht, kein Zugriff ohne Policy:

- Lesen: `rufe_raum_sichtbar(raum_id)` **und** der zugehörige Ruf ist nicht archiviert, außer für
  `is_trainer()` – dieselbe Regel wie `rn_lesen`.
- Schreiben: nur der Autor des Rufs (`autor = auth.uid()`) in einem sichtbaren Raum, höchstens vier
  Anhänge je Ruf.
- Ändern: nie. Löschen: nur `is_trainer()` (siehe 5).

**Storage-Policies für `rufe-anhang`:** Dateiname `<raum_id>/<uuid>.<endung>`; die erste
Pfadstufe muss eine Zahl sein und der Raum für den Anfragenden sichtbar (`rufe_raum_sichtbar`).
Hochladen: Mitglieder mit sichtbarem Raum, `owner = auth.uid()`. Lesen: wie die Tabelle (kein Lesen
archivierter Rufe für Eltern). Löschen: Trainer; der Besitzer nur, solange noch keine Zeile in
`rufe_anhang` auf die Datei zeigt (aufräumen nach einem abgebrochenen Senden).

Die Migration kommt als Datei nach `supabase/migrations/` (Muster `20261004_v734_rufe_anhaenge.sql`).
**Sie wird nicht von Claude Code ausgeführt.** Sie liegt im PR; Charles lässt sie vom Projekt-Chat
prüfen und anwenden, bevor der PR gemergt wird.

### 3. Anhänge – Bedienung

1. **Knopf 📎** (mindestens 48 px) links neben 📊 im Eingabebereich; öffnet die Dateiauswahl,
   mehrere Dateien möglich, höchstens vier je Ruf. Über das Limit hinaus: ruhige Meldung statt
   Fehler.
2. **Vorschau vor dem Senden:** Je Datei ein Chip über dem Eingabefeld, Bilder mit Miniatur,
   sonst Symbol, Name und Größe, daneben ein ✕ zum Entfernen (mindestens 44 px).
3. **Bilder verkleinern** mit `fotoCompress(file, 1600)` (längste Kante 1600 px, wie die
   Kassenbelege). Screenshots (PNG) bleiben PNG, wenn sie nach dem Verkleinern höchstens 2 MB groß
   sind; sonst JPEG. HEIC wird unverändert hochgeladen, wenn der Browser es nicht lesen kann.
   Dateien über 10 MB werden vor dem Senden abgelehnt, mit Satz, warum.
4. **Nur Anhang, kein Text:** Das Feld darf leer sein. Die App schreibt dann „📎 Anhang“ als
   Text (der CHECK verlangt mindestens ein Zeichen; Suche und Push bleiben damit lesbar).
5. **Hinweis in offenen Räumen:** Sobald eine Datei gewählt ist und der Raum offen ist
   (`familie_kind` leer), steht unter den Chips: „Offener Raum – alle Eltern lesen mit. Bitte keine
   Fotos anderer Kinder.“ Kein Sperren. In privaten Räumen erscheint nichts.
6. **Senden ist atomar:** Entweder erscheint der Ruf mit allen Anhängen, oder es erscheint nichts.
   Bei einem Fehler bleiben Text und Auswahl im Feld stehen, und der Absender erfährt es mit einem
   Satz. Reihenfolge ist Claude Codes Wahl (zuerst hochladen, dann der Ruf mit Anhängen in einem
   Aufruf, etwa über eine Funktion mit `security invoker`, damit der Trigger `rufe_vor_insert`
   weiter den Autor aus `auth.uid()` setzt). Verwaiste Dateien eines abgebrochenen Sendens räumt
   die App beim Fehler selbst weg.

### 4. Anhänge – Anzeige

- `rufeLaden` holt die Anhänge mit der Nachricht (eingebettete Abfrage auf `rufe_anhang`), nicht
  mit einer zweiten Runde je Ruf. Der 8-Sekunden-Takt bleibt.
- **Bilder** erscheinen als Miniatur in der Blase (höchstens 220 px hoch), erst geladen, wenn sie
  ins Bild kommen; Tipp öffnet die Großansicht wie `galerieGross` (Zoom, Zurück-Taste schließt).
- **PDF** öffnet in neuem Tab; **Office-Dateien** werden heruntergeladen, nie in der App
  gerendert. Der Abruf läuft authentifiziert über `/storage/v1/object/authenticated/rufe-anhang/…`
  mit Blob-Adresse wie bei `kasseBelegZeigen`; Blob-Adressen werden beim Schließen des Fensters
  freigegeben. Die Datei bekommt ihren Originalnamen.
- Je Datei in der Blase: Symbol nach Typ, Name (gekürzt), Größe; Tippfläche mindestens 44 px.
- Kein Vorschaubild für Office und PDF, kein Inline-Rendering von irgendetwas außer Bildern.

### 5. Moderation und Datenschutz

- Archivieren oder Zurückziehen eines Rufs blendet auch seine Anhänge für Eltern aus; das
  Trainerteam sieht sie im Archiv. Es wird nichts gelöscht (wie bisher).
- **Neu für Trainer** im Menü eines Rufs mit Anhängen: „Anhänge endgültig löschen“, mit
  `frageJaNein` (rot), löscht Datei und Zeile. Das ist der Weg für „Daten des Kindes löschen
  lassen“ und für Meldungen. Der Ruf bleibt mit Hinweis „Anhang entfernt“ stehen.
- **Prüfen und im PR beantworten:** Was passiert mit Rufen und Anhängen, wenn ein Elternteil sein
  Konto selbst löscht (v644) oder der Trainer „Daten des Kindes löschen“ ausführt? Gehen die Rufe
  des Kontos mit, müssen auch ihre Anhänge mit. Gehören sie nicht dazu, so festhalten.
- Kinderkonten haben keinen Zugang zu den Rufen und sehen weder Räume noch Anhänge.
- Kein Virenscan möglich. Deshalb: keine Makroformate, Office nur als Download, Hinweis in der
  Hilfe, dass Dateien von anderen vorsichtig geöffnet werden.

### 6. Push, Suche, Sicherung, Hilfe

- Push: Ein Ruf mit Anhang zeigt „📎 Anhang“ oder den Text; bei Rufen nur aus Text ändert sich
  nichts.
- Suche: durchsucht weiter den Text; Dateinamen müssen nicht durchsuchbar sein.
- Sicherung: `rufe_anhang` kommt in die Tabellenliste in `views.js` (Pflicht bei neuer Tabelle).
  Die Dateien selbst stehen **nicht** in der Sicherung; das wird in `SICHERUNG_AUSNAHMEN` mit Grund
  vermerkt (Größe, Datenschutz).
- Hilfe und Funktionsübersicht („Adler-Rufe (Team-Chat)“) nennen 5.000 Zeichen, Anhänge, die
  erlaubten Typen, 10 MB, vier je Ruf und den Hinweis für offene Räume.

## Nicht ändern

Die Regel „Eltern ohne Kinderzugang, nur Eltern mit Kind im Kader und Trainerteam“ (`darf_rufen`),
die Raumsichtbarkeit, das Stummschalten, Reaktionen, Abstimmungen, das Fixieren und die
Ruhezeiten. Kein neuer Raum, keine Umbenennung.

## Abnahmekriterien

1. Ein Ruf mit 5.000 Zeichen wird gesendet, gelesen, bearbeitet und gesucht; mit 5.001 geht es
   nirgends (Feld, Datenbank, Bearbeiten).
2. Ein Ruf mit 900 Zeichen erscheint gekürzt mit „Weiterlesen“; ein Ruf mit 300 nicht.
3. Ein Screenshot (PNG) wird gesendet und erscheint beim Empfänger als Miniatur; Tipp öffnet die
   Großansicht.
4. PDF öffnet in neuem Tab; DOCX und XLSX werden heruntergeladen und tragen den Originalnamen.
5. Ein vierter Anhang geht, ein fünfter nicht; eine Datei über 10 MB wird mit Satz abgelehnt.
6. Eine Datei `.docm`, `.exe` oder `.svg` wird abgelehnt (Bucket und App).
7. Eine Familie sieht Anhänge ihres privaten Raums; eine andere Familie bekommt sie weder über
   die Oberfläche noch über einen erratenen Pfad (Storage antwortet verweigert).
8. Archiviert der Trainer einen Ruf, sehen Eltern ihn samt Anhang nicht mehr; der Trainer schon.
9. „Anhänge endgültig löschen“ entfernt Datei und Zeile; der Ruf bleibt mit „Anhang entfernt“.
10. Schlägt das Hochladen fehl, bleibt Text und Auswahl im Feld, und es erscheint kein halber Ruf.
11. In einem offenen Raum steht der Hinweis zu Fotos anderer Kinder, in einem privaten nicht.
12. Alle neuen Bedienelemente sind mindestens 44 px (📎 und Senden mindestens 48 px); Handy mit
    360 px Breite ohne seitliches Scrollen; hell und dunkel mit mindestens 4,5:1 Kontrast.
13. Trainerteam- und Elternkonten sehen dieselben Anhänge; ein Kinderkonto sieht nichts davon.

## Testfälle

- Eltern-Sitzung A liest Anhang aus privatem Raum von Familie B per direktem Storage-Pfad → verweigert.
- Anonyme Sitzung liest `rufe_anhang` und den Bucket → leer beziehungsweise verweigert.
- Storage-Upload mit Pfad `abc/x.pdf` oder `999999/x.pdf` (nicht sichtbarer Raum) → verweigert.
- Upload mit Mime-Typ `application/vnd.ms-excel.sheet.macroEnabled.12` → verweigert.
- Ruf bearbeiten auf 5.000 Zeichen → geht; auf 5.001 → `text`-Fehler.
- Ruf nur mit Anhang → Text „📎 Anhang“, Suche nach „Anhang“ findet ihn.
- Anhang eines archivierten Rufs: Eltern lesen leer, Trainer sieht ihn.
- Trainer löscht Anhänge → Datei weg, Zeile weg, Ruf bleibt.
- Zwei Anhänge gleichen Namens → beide da, keine Kollision der Pfade.
- Abbruch des Netzes beim Hochladen des zweiten Anhangs → kein Ruf, keine verwaisten Dateien
  (oder eindeutig vermerkt, wo sie liegen).

## Pflichten (aus `CLAUDE.md`)

`node --check` über alle Dateien, `node tests/run.js` grün, `sw.js` hochzählen, neue Prüfdatei in
`tests/checks/` (Typ- und Größenregeln und Namensbereinigung als reine Funktionen testbar halten),
RLS für jede neue Tabelle, neue Tabelle in die Sicherung, Hilfe und Funktionsübersicht nachziehen,
typografische Anführungszeichen, keine Kindernamen, keine Schlüssel. **Im PR nennen:** wie viel
Speicher alle Buckets heute belegen (aus `storage.objects`), und wie stark die neuen Anhänge ihn
wachsen lassen könnten. Die Migration nicht selbst anwenden (siehe 2).
