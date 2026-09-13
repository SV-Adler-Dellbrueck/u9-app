# Auftragspaket: Tagebuch — aus der Nachbereitung in das Trainertagebuch

Repo `SV-Adler-Dellbrueck/u9-app`, Stand 13.09.2026. Gilt zusammen mit `CLAUDE.md`.

> **Umgesetzt mit v526.** Geprüft am 13.09.2026 gegen den Stand v537: Tabelle
> `tagebuch_eintrag` samt RLS und Sicherung, Modul `md-tagebuch.js` mit allen acht
> genannten Funktionen, beide Einstiege, Ansicht mit Lückenhinweis, Deckname und
> Namensprüfung, Einzel- und Monatsexport. Alle zehn Abnahmekriterien erfüllt; die
> Prüffälle stehen in `tests/checks/v526-tagebuch.js`. Der Nachweis je Kriterium steht
> unten unter „Abnahme — Stand der Umsetzung". Dieses Paket ist damit geschlossen;
> Änderungen am Tagebuch laufen künftig über ein neues Paket.

## Wozu

Charles führt für den DFB-Basis-Coach ein Trainertagebuch. Die Rohdaten dafür entstehen
ohnehin in der App: die Nachbereitung einer Trainingseinheit (`einheit_bewertung`) und die
Nachbereitung eines Spiels oder Festivals (`event_bewertung`). Bisher muss er sie
abschreiben — mit Abstand von Tagen, weshalb es in der Praxis nicht passiert.

Das Modul erzeugt aus einer vorhandenen Nachbereitung einen **vorausgefüllten
Tagebucheintrag**. Die Felder, die die App kennt, stehen schon da; die beiden Felder, die
nur der Trainer kennt, tippt er direkt am Platz dazu.

**Ausdrücklich keine Vollautomatik.** Ein Eintrag, der sich vollständig selbst schreibt,
enthält keine Erkenntnis. Die Felder *Aha* und *Konsequenz* bleiben Handarbeit, und ein
Eintrag ohne *Konsequenz* wird nicht gespeichert.

## Das Eintragsraster

Sechs Felder, identisch für jede Quelle:

| Feld | Herkunft |
|---|---|
| `ausloeser` | vorausgefüllt: Datum, Terminart, Titel oder Gegner, Leitfrage der Einheit |
| `beobachtung` | vorausgefüllt: Notiz und Sternwerte der Einheit bzw. „was getragen hat" und „daran arbeiten wir" aus dem Fazit |
| `aha` | Handeingabe, Pflicht |
| `konsequenz` + `konsequenz_bis` | Handeingabe, Pflicht (Datum der ersten Umsetzung) |
| `beleg` | Handeingabe, optional (Foto-Hinweis, Zitat, Quelle) |
| `anschluss` | Handeingabe, optional — Leitfrage, Übungsname oder App-Feld |

Dazu `baustein`: einer von `ich`, `spiel_spieler`, `organisation`, `system_fussball` — die
vier Bausteine des DFB-Entwicklungsmodells. Vorschlag beim Öffnen: `spiel_spieler` bei
einer Einheit, `organisation` bei Festival und Heimspiel; frei änderbar.

## 1 · Datenbank

Neue Tabelle `tagebuch_eintrag`:

```
id             bigint identity primary key
autor          text not null
datum          date not null            -- Tag des Erlebnisses, nicht des Schreibens
quelle         text not null            -- 'einheit' | 'event' | 'frei'
termin_id      bigint null              -- bei quelle='event'
baustein       text not null
ausloeser      text not null
beobachtung    text
aha            text not null
konsequenz     text not null
konsequenz_bis date
beleg          text
anschluss      text
created_at     timestamptz default now()
updated_at     timestamptz default now()
```

**RLS Pflicht.** Lesen und Schreiben nur für angemeldete Trainer, wie bei
`einheit_bewertung`. Kein anonymer Lesezugriff — die Einträge enthalten Beobachtungen über
Personen. Migration unter `supabase/` ablegen, Tabelle in die Backup-Funktion aufnehmen
(Pflicht 3 in `CLAUDE.md`).

## 2 · Neues Modul `md-tagebuch.js` (Welle 2)

Einzutragen in: `PRECACHE` in `sw.js`, den Trainer-Loader und `MODUL_WACHE` mit
`"md-tagebuch.js":"tagebuchModulDa"`. Die Funktion `tagebuchModulDa()` steht als
**letzte** Zeile der Datei. Im Elternbereich wird das Modul nicht geladen.

Funktionen:

- `tagebuchAusEinheit(datum)` — liest `einheit_bewertung` zu diesem Datum und den
  Trainingsplan des Tages, öffnet den Dialog vorausgefüllt.
- `tagebuchAusEvent(terminId)` — liest `event_bewertung` des angemeldeten Trainers und
  den Termin, öffnet den Dialog vorausgefüllt.
- `tagebuchNeu()` — leerer Eintrag, für alles außerhalb der App (Präsenztag, Podcast,
  Gespräch).
- `tagebuchSpeichern()`, `tagebuchSchliessen()`, `tagebuchListe()`, `tagebuchExport(id)`.

## 3 · Einstiege

Genau zwei, beide dort, wo die Nachbereitung endet:

- Im Fazit-Dialog (`md-fazit.js`): nach erfolgreichem `fazitSpeichern()` ein Knopf
  **„Ins Tagebuch"** statt eines weiteren Toasts. Aufruf über `typeof`-Schutz.
- In der Einheits-Nachbereitung (`views.js`, `einheitSave()`): derselbe Knopf.

Zusätzlich eine Ansicht **Tagebuch** im Trainerbereich: Einträge nach Baustein gruppiert,
neueste zuerst. Eine Hauptaktion je Bildschirm — „Neuer Eintrag". Knöpfe nach
`cockpit-ui`: Hauptaktion 56 px, übrige Bedienelemente mindestens 48 px.

**Lückenhinweis:** Zeigt die Liste für einen Baustein seit mehr als 21 Tagen keinen
Eintrag, steht über der Gruppe eine ruhige Zeile: „Seit dem TT.MM. nichts notiert." Keine
Farbe, kein Ausrufezeichen — es ist eine Erinnerung, keine Warnung.

## 4 · Datenschutz bei Namen

Die Tagebuchtexte gehen später in eine Abgabe an den Verband. Kinder dürfen darin nicht
mit Namen stehen.

- Im Dialog gibt es eine Leiste **„Kind einfügen"**: sie zeigt die Kaderkinder mit Namen
  und fügt beim Antippen den Alias ein — `Kind A` bis `Kind O`, vergeben nach der
  Reihenfolge der Kader-IDs, damit derselbe Alias über Monate dasselbe Kind meint.
- Beim Speichern prüft das Modul die freien Textfelder gegen die Vornamen des Kaders.
  Trifft es einen, erscheint ein Hinweis mit dem gefundenen Wort und der Frage, ob ersetzt
  werden soll. **Keine stille Ersetzung** — automatisches Umschreiben fremden Textes
  richtet mehr Schaden an, als es verhindert, und ein Vorname kann auch der eines Trainers
  oder eines Gegners sein.
- Die Aliasvergabe gehört nicht in eine eigene Tabelle; sie wird aus dem Kader abgeleitet.

## 5 · Export

`tagebuchExport(id)` erzeugt den Eintrag als Markdown im Raster des Tagebuchs:

```
### 18.09.2026 — SPIEL & SPIELER

- **Auslöser:** Training U9 I, Leitfrage „Wie kriege ich den Ball zu einem, der frei ist?"
- **Beobachtung:** …
- **Aha:** …
- **Konsequenz:** … (bis 25.09.2026)
- **Beleg:** …
- **Anschluss:** …
```

Zwei Knöpfe: **Kopieren** (Zwischenablage) und **Teilen** (`navigator.share` mit Text,
sonst Download als `.md`). Damit wandert der Eintrag in das Google Doc oder ins Repo.
Kein Serveraufruf, keine Zugangsdaten in der App — der Weg nach Google Drive läuft über
das Teilen-Menü des Geräts, nicht über eine Schnittstelle.

Zusätzlich **Monatsexport**: alle Einträge eines Monats als ein Markdown-Block, nach
Bausteinen sortiert.

## Abnahmekriterien

1. Nach dem Speichern einer Einheits-Nachbereitung führt ein Knopf in den
   Tagebuch-Dialog; Auslöser und Beobachtung sind vorausgefüllt, Aha und Konsequenz leer.
2. Speichern ohne `aha` oder ohne `konsequenz` wird mit einer Meldung abgelehnt, der
   bereits getippte Text bleibt stehen.
3. Derselbe Ablauf aus dem Fazit-Dialog eines Festivals.
4. Ein Eintrag mit `quelle='frei'` lässt sich ohne Termin anlegen.
5. Tippen auf ein Kind in der Einfügeleiste schreibt `Kind C` in das Textfeld, nicht den
   Namen. Zweimal dasselbe Kind ergibt zweimal denselben Alias, auch nach Neuladen.
6. Ein Vorname aus dem Kader im Textfeld löst beim Speichern den Hinweis aus.
7. Export liefert genau das oben gezeigte Markdown; Umlaute und typografische
   Anführungszeichen korrekt.
8. Die Tagebuch-Ansicht gruppiert nach den vier Bausteinen und zeigt den Lückenhinweis,
   wenn der jüngste Eintrag einer Gruppe älter als 21 Tage ist.
9. Ohne Anmeldung ist die Tabelle weder lesbar noch schreibbar (RLS-Gegenprobe mit dem
   anonymen Schlüssel).
10. Alle Knöpfe im Modul mindestens 48 px, die Hauptaktion 56 px.

## Abnahme — Stand der Umsetzung (geprüft 13.09.2026)

| # | Zusage | Wo erfüllt |
|---|---|---|
| 1 | Knopf nach der Einheits-Nachbereitung, vorausgefüllt | `views.js` → `ebWeiterInsTagebuch`, `md-tagebuch.js` → `tagebuchAusEinheit` |
| 2 | Speichern ohne `aha`/`konsequenz` abgelehnt, Text bleibt | `tagebuchSpeichern`, dazu `not null` in der Migration |
| 3 | Derselbe Ablauf aus dem Fazit | `md-fazit.js` → `fzWeiterInsTagebuch`, `tagebuchAusEvent` |
| 4 | Freier Eintrag ohne Termin | `tagebuchNeu` (`quelle:"frei"`) |
| 5 | Deckname statt Name, stabil über die Kader-IDs | `tbAliasMap`, `tbAlias`, `tbKindEinfuegen` |
| 6 | Hinweis bei einem Kader-Vornamen, keine stille Ersetzung | `tbNamensfund`, `tbNamensHinweis`, `tbNamenErsetzen` |
| 7 | Export im festgelegten Raster | `tbMarkdown`, `tagebuchExport` |
| 8 | Gruppierung nach Baustein, Lückenhinweis ab 21 Tagen | `tbListeRender`, `TB_LUECKE_TAGE` |
| 9 | Ohne Anmeldung weder lesbar noch schreibbar | Regel `tagebuch_trainer_all` in der Migration, direkt auf der Datenbank gegengeprüft |
| 10 | Hauptaktion 56 px, übrige Bedienelemente ab 48 px | am gerenderten DOM gemessen in `tests/checks/v526-tagebuch.js` |

Zusätzlich erfüllt: Eintrag in `PRECACHE`, Trainer-Loader und `MODUL_WACHE`
(`md-tagebuch.js` → `tagebuchModulDa`), kein Laden im Elternbereich, Tabelle in der
Sicherung (`views.js`, Tabellenliste), Hilfe-Eintrag und Rundgang.

## Testfälle für `tests/`

Neue Datei `tests/checks/v5xx-tagebuch.js`:

- `tagebuchModulDa` existiert nach dem Laden (MODUL_WACHE greift).
- Vorbefüllung: Attrappe liefert eine `einheit_bewertung` mit Notiz und Sternen →
  `ausloeser` und `beobachtung` sind nicht leer, `aha` ist leer.
- Pflichtfelder: Speichern ohne `aha` erzeugt keine Anfrage an Supabase.
- Alias: zwei Kinder, IDs 4 und 9 → Alias `Kind A` und `Kind B`, stabil über zwei
  Aufrufe.
- Namensprüfung: Text mit einem Kader-Vornamen setzt den Hinweis, Text ohne nicht.
- Export: erzeugter String enthält alle sechs Feldnamen in der festgelegten Reihenfolge.
- Knopfhöhen im gerenderten DOM.

## Pflichten (aus `CLAUDE.md`)

- Neue Datei in `PRECACHE`, Trainer-Loader und `MODUL_WACHE` eintragen.
- Neue Tabelle in die Backup-Funktion.
- `node --check` über alle Dateien, `node tests/run.js` grün, danach `sw.js` hochzählen.
- Hilfe und Rundgang um die Tagebuch-Ansicht ergänzen.
- Typografische Anführungszeichen in allen deutschen Strings.
- Keine Kindernamen und keine Schlüssel im Repo.

## Ausdrücklich nicht in diesem Paket

Automatischer Versand nach Google Drive oder GitHub, Erzeugung von Text durch ein
Sprachmodell, Auswertung der Einträge über Kinder hinweg, Freigabe an Eltern. Das Tagebuch
ist Charles' persönliche Unterlage und bleibt im Trainerbereich.
