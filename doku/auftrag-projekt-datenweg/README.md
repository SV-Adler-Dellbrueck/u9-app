# Auftrag: Datenweg zwischen App und Claude-Projekt-Chat (v804)

Stand 08.11.2026. Beschlossen von Charles am 08.11.2026 (Plan freigegeben). Ziel: Das Adler-Projekt auf claude.ai liest Tagebuch,
Einheiten, Bewertungen und Übungen aus der App – ohne Handarbeit, nur lesend – und kann Entwürfe zurückgeben.

## Hinweg: App → Projekt (nur lesend)

- **Rolle `adler_export_lese`** (Migration `supabase/migrations/20261111_v804_export_lese.sql`): LOGIN, nur SELECT, nur auf die Views im Schema
  `export`, ohne RLS-Umgehung, ohne Schreibrechte, kein Zugriff auf Tabellen in `public`, kein Zugriff auf die Funktionen und Pflege-Tabellen.
  **Kein Passwort in der Migration:** Charles setzt es selbst im SQL-Editor (`alter role adler_export_lese with password '…';`).
- **Whitelist-Views** (`export.*`): tagebuch_eintrag, tagebuch_punkt, einheit_bewertung, termine, event_bewertung, trainingsplan, trainings_eval,
  anwesenheit, trainingsformen, trainingsvorlagen, trainingsblock. Freitext läuft durch `export.ohne_namen()`: Vornamen aus dem Kader und die
  gepflegten Schreibvarianten (`export.name_variante`, nur in der Datenbank, nie im Repo) werden zu „Kind <Alias>“; Anwesende stehen als Alias.
- **Nie** in die Whitelist: `kader` (Name, Geburtstag, Medizinisches, Foto, Token), `eltern_*`, `profiles`, `push_*`, `rueckmeldungen`
  (Kommentare enthalten Gründe), `kind_*`, `kabine_*`, `kasse_*`, `rufe_*`, `blitz_ratings`, `spielerprofile`, `ki_*`, `dsgvo_consent`,
  `loeschantrag` und die Rohdiktate (`diktat`, `sprachnotiz`, `rueckfragen`).
- **Namensprüfung:** `export.namen_verdacht` zählt Wörter, die einem Kader-Vornamen ähneln und nicht ersetzt wurden (Ort und Zahl, nie das Wort).
  Gewöhnliche Wörter kommen in `export.wort_erlaubt`, Schreibvarianten der Spracherkennung in `export.name_variante`. Der Export markiert betroffene
  Einträge mit „⚠ Prüfen“ und führt die Treffer in `stand.json`. Eine unscharfe Ersetzung ist KEIN Beweis für Namensfreiheit (Stichprobe am
  08.11.: 7 Stellen mit abweichender Schreibweise in 3 Einträgen).
- **Skript** `tools/export-tagebuch.mjs` (dieses Repo, ohne Daten) mit fester Spalten-Whitelist, und **GitHub Action** `export.yml` im privaten Repo
  `adler-u9-wissen` (Vorlage: `doku/auftrag-projekt-datenweg/export.yml`): täglich 03:17 UTC und per Knopf. Ausgabe nach `export/`:
  `tagebuch.md`, `einheiten.md`, `uebungen.md`, `plaene.md`, `stand.json` (Zeitstempel, Zeilenzahlen, Namens-Verdacht, App-Version), dazu aus `tools/export-appstand.mjs`: `app-stand.md` (Kopie der Funktionsübersicht), `aenderungen.md` (Titel der zusammengeführten Änderungen, neueste zuerst). Secret: `EXPORT_DB_URL`
  (Verbindungsadresse der Rolle, nur im privaten Repo).

## Rückweg: Projekt → App (kein Schreibrecht für das Projekt)

- Das Projekt legt Entwürfe als Datei unter `eingang/tagebuch/` im privaten Repo ab. Format: `eingang/tagebuch/README.md` dort.
- `tools/tagebuch-eingang.mjs pruefen <datei>` prüft Format und Aliase (A bis O), lehnt Bewertungszahlen je Kind, Links, Adressen und falsche
  Autoren ab; `… sql <datei>` erzeugt die INSERT-Anweisung.
- **Eingelesen wird nur auf ausdrücklichen Auftrag von Charles** in einer Sitzung mit Claude Code, als Entwurf (`status 'keim'`, `ki_vorschlag`,
  nicht bestätigt), Quelle `frei`. Aliase werden in der Datenbank zu Vornamen (die App zeigt dem Trainerteam Vornamen). Charles bestätigt den
  Entwurf in der App unter „Noch zu bestätigen“. Es gibt keinen Dauerzugang zum Schreiben.

## Abnahme (Checkliste für Charles)

1. Migration einspielen (SQL-Editor), danach Passwort der Rolle setzen.
2. In Supabase die Verbindungsadresse der Rolle zusammensetzen (Pooler, Benutzer `adler_export_lese.<Projekt-Referenz>`) und als Secret
   `EXPORT_DB_URL` im privaten Repo anlegen. Nie in einen Chat oder eine Datei schreiben.
3. In `adler-u9-wissen` die Action einspielen (Datei `.github/workflows/export.yml`), einmal von Hand starten, `export/stand.json` prüfen
   (Zeilenzahlen, `namens_verdacht`).
4. Im Projekt-Chat: den Ordner `export/` lesen (GitHub-Anbindung des Projekts) und `export/stand.json` als Zeitstempel nehmen.

## Risiken, die bleiben

- Freitext kann Namen in Schreibweisen enthalten, die keine Ersetzung sicher findet. Die Prüfung warnt, sie garantiert nichts.
- Das Secret gibt Lesezugriff auf Alias-Daten; es liegt nur im privaten Repo. Bei Verdacht: Passwort der Rolle ändern.
- Wird der Tagebuch-Bestand größer, wächst der Export; bei Bedarf Zeitraum begrenzen (`export.*` filtert nicht nach Datum).
- Die Whitelist (SQL-Views und Skript) muss bei neuen Spalten bewusst erweitert werden; neue Spalten gehen sonst NICHT hinaus.

## Dateien

`supabase/migrations/20261111_v804_export_lese.sql`, `tools/export-tagebuch.mjs`, `tools/tagebuch-eingang.mjs`,
`doku/auftrag-projekt-datenweg/export.yml`, Tests `tests/checks/v804-datenweg.js` und `tests/sql/v804-export-*.sql`.
