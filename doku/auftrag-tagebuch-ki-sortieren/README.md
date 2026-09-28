# Auftrag: Tagebuch-Vorschlag sortiert, statt zu schreiben

Stand 28.09.2026. Beschlossen im Projekt-Chat nach Auswertung der Tagebucheinträge vom 25. und
26.09.2026. Baut auf `doku/auftrag-tagebuch-alltag/` auf (Status Keim, Wiedervorlage) —
beides zusammen umsetzen oder dieses Paket so bauen, dass es sich einfügt.

## Warum

Der Trainer spricht nach Einheit oder Festival frei ein, `ki-nachbereitung` (v648) ordnet das
Gesagte zu und liefert auch einen Tagebuch-Vorschlag. Für die Bewertungsfelder funktioniert
das. Beim Tagebuch-Teil entstehen Einträge, die nicht mehr die des Trainers sind:

- Die Beobachtung steht in dritter Person („Der Trainer kam eine halbe Stunde früher …").
  Ursache: `FORM_TAGEBUCH` verlangt die Beobachtung „geordnet und sachlich".
- Das Aha ist eine Formulierung der KI („Ich erkenne auch, dass …") und enthält Inhalte, die in
  der Beobachtung nicht vorkommen. Ursache: `FORM_TAGEBUCH` verlangt „die Erkenntnis in Ich-Form
  aus Sicht des Trainers" — die KI schreibt also eine Erkenntnis, statt eine zu übernehmen.
- Konsequenzen haben kein Datum und keine Obergrenze (am 25.09. waren es fünf).

Das Tagebuch geht in Lehrgangsabgaben. Das Aha-Feld ist dort das einzige, das ausdrücklich dem
Trainer gehört. Grundsatz aus dem Projektgedächtnis: **Die App füllt vor, schreibt aber nicht
selbst.** Für die KI heißt das: sortieren, nicht schreiben.

## Was sich ändert

### 1. Anweisung `FORM_TAGEBUCH` in `ki-nachbereitung`

Ersetzen durch sinngemäß:

```
"tagebuch": {"baustein": "ich"|"spiel_spieler"|"organisation"|"system_fussball",
  "beobachtung": "…", "aha": "…"|null, "konsequenzen": ["…"], "schlagworte": ["…"],
  "rueckfragen": ["…"]}

Tagebuch: Du SORTIERST die Worte des Trainers, du SCHREIBST sie nicht neu.
- Übernimm seine Sätze. Streiche Füllwörter und Versprecher der Spracherkennung, setze
  richtige Satzzeichen – aber tausche keine Wörter aus, glätte nicht, fasse nicht zusammen.
- Ich-Form, wie er gesprochen hat. Niemals „der Trainer".
- beobachtung = was er über den Ablauf und die Kinder gesagt hat, in seiner Reihenfolge.
- aha = NUR Sätze, in denen er selbst sagt, was ihm klar wurde, was er gemerkt, gelernt,
  verstanden hat. Wörtlich übernehmen. Sagt er so etwas nicht: null. Formuliere niemals eine
  Erkenntnis für ihn, auch nicht, wenn sie naheliegt.
- konsequenzen = höchstens ZWEI, die Schritte, die er selbst angekündigt hat. Nennt er mehr,
  nimm die, die er betont oder zuerst nennt, und stelle eine Rückfrage, welche zuerst.
- Nichts, was er nicht gesagt hat: keine Ergänzung, keine Deutung, kein Ratschlag.
- rueckfragen = höchstens zwei kurze Fragen, wo etwas fehlt, statt es zu ergänzen.
  Beispiele: „Was wurde dir dabei klar?" (wenn aha null ist), „Welche Konsequenz zuerst?"
  (wenn er mehr als zwei nennt). KEINE Frage nach einem Datum – das fragt die App.
- schlagworte = 3 bis 5 kurze Themen-Substantive, keine Namen.
```

`sanTagebuch` anpassen: `konsequenzen` als Liste, **hart auf zwei gekürzt**; `rueckfragen` als
Liste, hart auf zwei gekürzt, je höchstens 120 Zeichen. Die übrigen Bewertungsfelder und die
Regel „nur was gesagt ist, sonst null" bleiben unverändert.

### 2. Rückfragen in der App

Kommt der Vorschlag mit Rückfragen zurück, zeigt das Tagebuch-Fenster sie unter dem Vorschlag,
je mit Eingabefeld und Mikrofon. Die Antwort wird **wörtlich** in das passende Feld übernommen
(Aha-Frage → Aha, Reihenfolge-Frage → Konsequenz), nicht noch einmal durch die KI geschickt.
Überspringen ist erlaubt — dann bleibt das Feld leer.

### 3. Datum aus der App, nicht aus der KI

Zu jeder Konsequenz ein Datum. Angeboten werden als Knöpfe die **nächsten drei Termine, an
denen der Autor selbst eingeteilt ist**, dazu „anderes Datum". Ein Tipp genügt.
Grund: Eine Konsequenz braucht einen Termin, an dem der Trainer auch da ist
(Regel aus dem Tagebuch).

Bei zwei Konsequenzen mit unterschiedlichen Daten: Das bestehende Feld `konsequenz_bis` nimmt
das frühere; wenn `konsequenz` künftig mehrere Einträge führt, entscheidet Claude Code die
Speicherform und sagt vorher, welche.

### 4. Wortlaut mitspeichern

Neue Spalte `tagebuch_eintrag.diktat` (Text): die Sprachnotiz, **wie sie aus der
Spracherkennung kam**, nach der Namensersetzung (keine Klarnamen). Sie ist das Original; die
Felder sind ein Vorschlag daraus. Damit lassen sich alte Einträge später neu sortieren, wenn
die Anweisung besser wird, und die Auswertung im Projekt-Chat liest die echten Worte.

RLS wie für die übrigen Spalten der Tabelle, kein anonymer Zugriff.

### 5. Bestätigen statt stillschweigend übernehmen

Neue Spalte `bestaetigt_am` (Zeitstempel). Solange leer, bleibt der Eintrag als KI-Vorschlag
markiert (`ki_vorschlag` bleibt `true`) und zeigt das deutlich. Ein Knopf „Passt so" setzt
`bestaetigt_am` — groß, eine Hauptaktion. Wird ein Feld von Hand geändert, gilt das ebenfalls
als Bestätigung.

In die Lehrgangsausgabe des Exports gehen **nur bestätigte** Einträge.

Ein Eintrag ohne Aha oder ohne Konsequenz mit Datum ist nach dem Speichern ein **Keim**
(siehe Auftrag Tagebuch als Arbeitsmittel), kein unvollständiger Eintrag.

## Prüfen, bevor gebaut wird

- **Kinderbezeichnungen:** Die Auswertung arbeitet mit „Kind 1, Kind 2 …", das Tagebuch mit
  den Aliasen aus `tbAliasMap()` (Buchstaben). Nachweisen, dass die Rückübersetzung beim
  Speichern immer den Alias des richtigen Kindes setzt — auch wenn zwischen Diktat und
  Speichern jemand zum Kader hinzukommt oder die Anwesenheit sich ändert. Wenn es eine Lücke
  gibt: melden, nicht still reparieren.
- Bestehende Einträge **nicht** neu schreiben. Sie behalten `ki_vorschlag = true`,
  `bestaetigt_am` leer — der Trainer bestätigt oder korrigiert sie selbst.

## Abnahmekriterien

1. Eine Sprachnotiz in Ich-Form ergibt eine Beobachtung in Ich-Form, ohne „der Trainer".
2. Eine Notiz ohne erkennbare Erkenntnis ergibt `aha = null` und die Rückfrage
   „Was wurde dir dabei klar?".
3. Eine Notiz mit fünf angekündigten Schritten ergibt höchstens zwei Konsequenzen und eine
   Rückfrage zur Reihenfolge.
4. Das Aha enthält kein Wort, das nicht sinngemäß im Diktat steht (Testfall mit festem Diktat
   und Wortlistenvergleich, soweit prüfbar).
5. Datum per Tipp auf einen der nächsten eigenen Termine.
6. `diktat` ist gespeichert und enthält keinen Klarnamen.
7. „Passt so" setzt `bestaetigt_am`; der Export Lehrgang enthält nur bestätigte Einträge.
8. Die Bewertungsfelder (Sterne, Stufen, Notizen) verhalten sich unverändert.
9. Neue Spalten in der Backup-Funktion; `node tests/run.js` grün; `sw.js` hochgezählt;
   Edge Function neu ausgerollt und Version im Kopfkommentar nachgezogen.

## Testfälle

- Diktat „Ich war eine halbe Stunde früher da, der Aufbau hat trotzdem gedauert." →
  Beobachtung beginnt mit „Ich", nicht mit „Der Trainer".
- Diktat ohne Satz der Art „mir ist klar geworden" → `aha = null`, eine Rückfrage.
- Diktat „Mir ist klar geworden, dass die Pausen der beste Moment zum Coachen sind." → Aha ist
  dieser Satz, nicht umformuliert.
- Diktat mit fünf „ich muss …" → zwei Konsequenzen, eine Rückfrage.
- Rückfrage beantwortet → Antwort steht wörtlich im Feld.
- Alter Eintrag vom 25.09. → unverändert, weiter als Vorschlag markiert.

## Was nicht gebaut wird

- Keine KI, die das Aha formuliert, verbessert oder „zusammenfasst".
- Keine Datumsfrage durch die KI.
- Kein automatisches Bestätigen nach Zeitablauf.
