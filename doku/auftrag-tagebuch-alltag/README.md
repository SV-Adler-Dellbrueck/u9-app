# Auftragspaket: Tagebuch als Arbeitsmittel

Stand 24.09.2026. Beschlossen im Projekt-Chat. Grundsatz: **Der Bestand ist das Original,
jede Abgabe ist ein Auszug daraus.** Bisher war das Lehrgangsdokument das Original und
alles andere Abschrift; das dreht sich um. Die vier Bausteine bleiben die Ordnung — die
neuen Sichten liegen darüber, sie ersetzen nichts.

Begründung steht im Tagebuch selbst, Eintrag „Wofür ich dieses Tagebuch eigentlich führe"
(24.09.2026, Baustein ICH).

## Warum

Drei Fragen stellt Charles im Alltag, die das Abgaberaster nicht beantwortet:

1. **Was ist fällig?** Konsequenzen tragen ein Datum, stehen aber verstreut über die
   Bausteine. Zwei Fristen sind bereits ohne Abschluss verstrichen (Trikotgrößen 18.09.,
   Rückmeldung zum Rollenwechsel).
2. **Wie entwickelt sich ein Kind?** Über einzelne Kinder stehen inzwischen mehrere
   Absätze an mehreren Stellen.
3. **Wo habe ich darüber schon geschrieben?** Positionen, Eltern, Konzentration, Material
   ziehen sich quer durch die Bausteine.

Dazu: Gedanken entstehen zwischen den Terminen und gehen verloren, weil das Erfassen heute
eine Nachbereitung voraussetzt.

## Was gebaut wird

### 1. Gedanke erfassen — ein Feld, ein Knopf

Neuer Einstieg im Tagebuch-Modul: **„Gedanke"**. Ein einziges mehrzeiliges Textfeld,
Speichern. Sonst nichts — keine Bausteinwahl, keine Kategorie, keine Pflichtfelder. Die
Diktierfunktion der Gerätetastatur reicht; **keine eigene Spracherkennung**, kein
Mikrofon-Zugriff, keine Audio-Speicherung.

Der Eintrag entsteht mit `anlass = 'gedanke'` und `status = 'keim'`, Baustein leer.

Der Knopf gehört auf die Kachel Orga neben den bestehenden Tagebuch-Einstieg und ist nach
dem UI-Grundsatz groß genug für die Bedienung am Spielfeldrand (mindestens 48 px, eine
Hauptaktion je Bildschirm).

### 2. Status „Keim"

Bisher gilt: ein Eintrag ohne Konsequenz ist unvollständig. Das stimmt für ausgearbeitete
Einträge und ist falsch für einen Gedanken auf dem Parkplatz.

- `status`: `keim` | `fertig` (Vorgabe `fertig` für alle bestehenden Einträge)
- Ein Keim braucht nur Text. Aha und Konsequenz bleiben leer, ohne Warnung.
- Der Lückenhinweis nach 21 Tagen und die Vollständigkeitsprüfung ignorieren Keime.
- Stattdessen eine eigene Zeile in der Übersicht: „4 Gedanken warten auf eine Konsequenz."
- Aus einem Keim wird ein fertiger Eintrag, indem Baustein, Aha und Konsequenz ergänzt
  werden; dann `status = 'fertig'`.

### 3. Wiedervorlage

Neue Ansicht im Tagebuch-Modul: alle Einträge mit Konsequenz und Frist, nach Datum
sortiert, in drei Gruppen — überfällig, diese Woche, später. Je Zeile: Frist, Baustein,
erster Satz der Konsequenz, Sprung zum Eintrag.

Eine Konsequenz gilt als erledigt, wenn sie ausdrücklich abgehakt wird (neues Feld
`konsequenz_erledigt_am`). **Nicht** automatisch beim Verstreichen der Frist — verstrichen
und erledigt sind zwei verschiedene Dinge, und genau daran ist im September etwas liegen
geblieben.

### 4. Sicht je Kind

Alle Einträge, in denen ein Kind vorkommt, gebündelt je Kind, chronologisch.

- In der App mit Klarnamen (Trainerbereich, angemeldet).
- Neue Tabelle `tagebuch_kind` (Zuordnung Eintrag ↔ Kader-Zeile, mehrere je Eintrag),
  gesetzt beim Ausarbeiten, nicht automatisch geraten.
- **Im Export ausschließlich Aliase** (`tbAliasMap()`), wie bisher. Kein Klarname verlässt
  die App — das gilt für Markdown-Export, Monatsexport und jede neue Ausgabe.

### 5. Schlagworte

Freies Feld `tags` (Text-Array) je Eintrag, Vorschläge aus den bereits vergebenen. Filter
in der Übersicht. Keine feste Liste — die Bausteine sind die Ordnung, Schlagworte sind das
Wiederfinden.

### 6. Ausgaben trennen

Der Export bekommt eine Auswahl, welche Ausgabe erzeugt wird:

- **Lehrgang (Basis-Coach):** die sechs Felder in Alltagssprache, ohne Status, ohne Tags,
  ohne Wiedervorlage, Kinder als Aliase. Das ist der heutige Export.
- **Arbeitsfassung:** alles, inklusive Keime, Tags, Fristen, Kinder als Aliase.
- Platzhalter für **C-Lizenz** vorsehen, Format steht noch nicht fest.

Keime erscheinen **nie** in der Lehrgangsausgabe.

## Datenbank

Tabelle `tagebuch_eintrag` erweitern:

| Feld | Typ | Bemerkung |
|---|---|---|
| `anlass` | text | `einheit` \| `spieltag` \| `lehrgang` \| `gedanke`; abgeleitet, wenn ein Termin hängt |
| `status` | text | `keim` \| `fertig`, Vorgabe `fertig` |
| `tags` | text[] | leer erlaubt |
| `konsequenz_erledigt_am` | date | null, solange offen |

Neue Tabelle `tagebuch_kind` (`eintrag_id`, `kader_id`), beide Fremdschlüssel.

**RLS ist für beide Pflicht**, kein anonymer Zugriff — das Tagebuch ist eine persönliche
Unterlage und enthält Beobachtungen zu Kindern. Bestehende Einträge bekommen per Migration
`status = 'fertig'` und `anlass` aus dem vorhandenen Termin-Bezug.

## Abnahmekriterien

1. Ein Gedanke lässt sich in unter zehn Sekunden erfassen: Knopf, diktieren, speichern.
2. Ein Keim erzeugt keine Unvollständigkeits-Warnung und keinen Lückenhinweis.
3. Die Übersicht zeigt die Zahl offener Keime.
4. Die Wiedervorlage zeigt überfällige Konsequenzen; eine abgehakte verschwindet, eine
   verstrichene nicht.
5. Die Sicht je Kind zeigt in der App Klarnamen und im Export ausnahmslos Aliase.
6. Die Lehrgangsausgabe enthält keine Keime, keine Tags, keinen Status.
7. Bestehende Einträge sehen nach der Migration unverändert aus.
8. Alle neuen Tabellen und Spalten stehen in der Backup-Funktion.
9. `node tests/run.js` grün, `sw.js` hochgezählt, neue Dateien in Precache, beiden Loadern
   und der MODUL_WACHE.

## Testfälle

- Gedanke speichern → `anlass = 'gedanke'`, `status = 'keim'`, Baustein leer.
- Keim ausarbeiten → Baustein, Aha, Konsequenz gesetzt, `status = 'fertig'`.
- Konsequenz mit Frist gestern, nicht abgehakt → erscheint unter „überfällig".
- Dieselbe Konsequenz abgehakt → verschwindet aus der Wiedervorlage, bleibt im Eintrag.
- Eintrag mit zwei zugeordneten Kindern → erscheint in beiden Kind-Sichten.
- Export Lehrgang → kein Keim, kein Tag, kein Klarname.
- Export Arbeitsfassung → Keime enthalten, Kinder als Aliase.
- Migration auf Bestand → alle Einträge `fertig`, keine Warnung, Zählung unverändert.

## Was nicht gebaut wird

- Keine automatische Auswertung oder Einordnung der Gedanken in der App. Aha und
  Konsequenz sind die beiden Felder, die ein Tagebuch von einem Datenabzug unterscheiden;
  sie entstehen im Gespräch, nicht per Automatik. Das ist ein bestehender Beschluss.
- Keine eigene Spracherkennung, keine Audiodateien.
- Keine feste Kategorienliste neben den vier Bausteinen.
