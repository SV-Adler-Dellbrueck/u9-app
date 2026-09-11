# Auftragspaket: Skizze v2 – Spieltagsfelder, Bild-Export, Lehrgangsübungen

Repo `SV-Adler-Dellbrueck/u9-app`, Stand 11.09.2026. Gilt zusammen mit `CLAUDE.md`.

## Ausgangslage

Renderer (`_skz` in `data.js`), Tipp-Editor (`md-skizze.js`), Übungs- und Vorlagen-Import
über `uebungen/bibliothek.json` und `uebungen/vorlagen.json` (`md-einheit-import.js`,
Abgleich beim Öffnen) existieren bereits. Es wird **nichts davon neu gebaut**.

Was fehlt, damit die Spielformen der F-Jugend nach den Durchführungsbestimmungen des
Kreises Köln 2026/27 korrekt abgebildet werden und eine Skizze an die Co-Trainer
weitergegeben werden kann:

1. Jugendtor als eigener Tortyp (bisher gibt es nur eine Torform)
2. Linien: Mittellinie und Schusszone
3. Vorlagen im Editor für die Spieltagsformen
4. Skizze als PNG teilen oder speichern
5. Vier neue Übungen und eine Vorlage aus der DFB-Lehrgangsarbeit (Anhang)

Alles additiv. Bestehende Skizzen-Beschreibungen bleiben unverändert gültig und sehen
unverändert aus.

## 1 · `data.js` – Renderer `_skz`

**Tor:** fünftes Feld `'j'` = Jugendtor. `[x,y,'h'|'v',breite,'j']`. Ohne fünftes Feld
bleibt die Darstellung exakt wie heute (Minitor). Jugendtor: Tiefe 10 statt 7, Strich 3,
Füllung `rgba(255,255,255,.25)`, drei Netzlinien quer – Größe darf nie der einzige
Unterschied sein. Standardbreite Jugendtor 44.

**Neue Liste `li`:** `[x1,y1,x2,y2,typ]` mit `typ` `'m'` (Mittellinie: durchgezogen,
`rgba(255,255,255,.7)`, Strich 2) oder `'sz'` (Schusszone: gestrichelt `5,4`, `#fbbf24`,
Strich 2). Unterscheidung über Muster **und** Farbe, wie bei den Pfeilen (v512).
Zeichenreihenfolge: nach Zonen, vor Toren.

Referenzimplementierung liegt bei (`skz_neu.js`), darf abweichen, solange die
Abnahmekriterien erfüllt sind.

**`skzLegende`:** zwei Einträge ergänzen – Schusszone (gestrichelt gelb) und
Mittellinie (durchgezogen weiß) – auf demselben Rasen-Stück wie die Pfeile.
Kontrast gegen `#2d6a2d` prüfen (mindestens 3:1), Ergebnis in der Datei kommentieren.

## 2 · `md-skizze.js` – Editor

- `_skzLeer()`: `li:[]` ergänzen. `_skzAnker`, `_skzTreffer`, `_skzVerschieben`: `li`
  wie `p` behandeln (Anker = Anfangspunkt, Verschieben = beide Punkte).
- Neue Werkzeuge in `SKZ_WERK` (Reihenfolge nach „Tor“):
  `{id:"jugendtor",emo:"🥅",lbl:"Jugendtor",feld:"tor",j:true}`,
  `{id:"mittellinie",emo:"┃",lbl:"Mittellinie",feld:"li",zwei:true,typ:"m"}`,
  `{id:"schusszone",emo:"┊",lbl:"Schusszone",feld:"li",zwei:true,typ:"sz"}`.
  Palette bleibt fünf Spalten; Knöpfe mindestens 46 px hoch wie bisher.
- **Tor-Ausrichtung automatisch nach Position:** liegt der Tipp bei `x<50` oder
  `x>230`, wird `'v'` gesetzt, sonst `'h'`; der Ankerpunkt wird so korrigiert, dass das
  Tor bündig am Rand sitzt. Gilt für Minitor und Jugendtor. Bisher stand jedes Tor
  horizontal, was am Handy niemand nachträglich drehen konnte.
- `SKZ_VORLAGEN` um drei Einträge ergänzen (Specs aus `bibliothek-nachtrag.json`
  übernehmen): „Spieltag F: 3 gegen 3, vier Minitore“, „Spieltag F: 2+1, Jugendtore“,
  „Drei gegen einen“. Die zehn bestehenden bleiben.
- Hinweistext (`skz-hinweis`) für die neuen Werkzeuge mitziehen.

## 3 · `md-einheit-import.js` – Validierung

`EI_SKZ_LISTEN` um `"li"` ergänzen, damit der Import die Liste kennt und prüft.
Schema-Kennungen (`adler-uebungen/1`, `adler-vorlagen/1`) bleiben – die Änderung ist
abwärtskompatibel.

## 4 · Skizze als Bild teilen

In der Detailansicht einer Übung (dort, wo `skzLegende()` unter der Skizze steht) ein
Knopf **„Skizze teilen“** (mindestens 44 px). Ablauf: SVG-String → `Blob` → `Image` →
`canvas` 1120 × 720 (Vierfaches der viewBox) → `toBlob('image/png')`. Wenn
`navigator.canShare({files})` wahr ist, `navigator.share({files:[…],title:Übungsname})`;
sonst Download über `<a download="…">`. Dateiname: Übungsname als Slug, `.png`.
Kein Serveraufruf, keine neue Abhängigkeit. Abbruch durch den Nutzer still abfangen,
nur echte Fehler als Toast.

Gehört in ein bestehendes Modul der Welle 2 (`md-skizze.js` bietet sich an); der Aufruf
aus `views.js` mit `typeof`-Schutz, wie in `CLAUDE.md` vorgeschrieben.

## 5 · Inhalte (Anhang)

- `bibliothek-nachtrag.json`: vier Übungen in `uebungen/bibliothek.json` unter
  `uebungen` **anhängen**, `stand` auf `2026-09-12-1` setzen. Die Übung „Chaos-Dribbling
  mit Kommando“ existiert bereits in `data.js` (tf107) und wird nur referenziert.
- `vorlagen-nachtrag.json`: eine Vorlage in `uebungen/vorlagen.json` anhängen, `stand`
  ebenfalls `2026-09-12-1`.
- Der Abgleich legt nur **neue Namen** an; Namen exakt so übernehmen wie in den
  Anhängen, sonst entstehen Dubletten oder die Vorlage findet ihre Übung nicht.
- Reihenfolge im Abgleich ist bereits richtig (Übungen vor Vorlagen).

## Abnahmekriterien

1. Alle bestehenden Übungsskizzen rendern pixelgleich zu vorher (Stichprobe:
   „Warm up Adler“, „Vier-Tore-Spiel“, „Torschuss beidseitig“ – SVG-String vor und nach
   der Änderung vergleichen).
2. Die vier Anhang-Übungen erscheinen nach dem Öffnen der Trainer-App mit Skizze; die
   Darstellung entspricht `vorschau.html` aus dem Anhang.
3. Im Editor: Jugendtor am linken Rand getippt → steht vertikal und bündig; Minitor oben
   getippt → horizontal. Mittellinie und Schusszone lassen sich mit zwei Tipps setzen,
   verschieben und entfernen; Undo greift.
4. Die drei neuen Vorlagen laden per Antippen und lassen sich anschließend bearbeiten.
5. „Skizze teilen“ liefert auf iOS Safari und Android Chrome das Share-Sheet mit einer
   PNG-Datei, am Desktop einen Download. Bild 1120 × 720, Rasen und Elemente
   vollständig, keine abgeschnittene Textzeile.
6. Import-Prüfung: ein JSON mit `li` als Objekt statt Liste wird mit der bekannten
   Fehlermeldung abgewiesen; mit `li` als Liste wird es angenommen.
7. Legende zeigt sechs Einträge, jeder Farbwert mindestens 3:1 gegen den Rasen.

## Testfälle für `tests/`

Neue Datei `tests/checks/v5xx-skizze-v2.js` (Versionsnummer beim Bump einsetzen):

- `_skz` mit `tor:[[20,68,'v',44,'j']]` erzeugt ein `<rect>` mit `stroke-width="3"` und
  drei Netzlinien; mit `tor:[[20,68,'v',44]]` weiterhin `stroke-width="2.5"` ohne Linien.
- `_skz({li:[[0,0,10,10,'sz']]})` enthält `stroke-dasharray`; `typ 'm'` enthält keins.
- Editor: Tipp bei x=20 mit Werkzeug „tor“ erzeugt einen Eintrag mit `'v'`; Tipp bei
  x=140 erzeugt `'h'`.
- `_eiSkizzeOk({li:{}})` ist `false`, `_eiSkizzeOk({li:[]})` ist `true`.
- Das Knopf-Element „Skizze teilen“ hat `offsetHeight >= 44` im gerenderten DOM.
- Die vier Anhang-Übungen bestehen `_euPruefung` ohne Fehler; die Vorlage besteht
  `_evPruefung` und findet alle fünf `uebung_name`.

## Pflichten (aus `CLAUDE.md`)

- `node --check` über alle Dateien; `node tests/run.js` grün; dann `sw.js` hochzählen.
- Keine neue Datei im Ladeweg, also keine Änderung an `PRECACHE`, Loadern oder
  `MODUL_WACHE`.
- `uebungen/*.json` bleiben in der Ausnahmeliste des `fetch`-Handlers.
- Hilfe und Rundgang: den Abschnitt zur Skizze um Jugendtor, Linien und „Skizze teilen“
  ergänzen.
- Typografische Anführungszeichen in allen deutschen Strings.
- Keine Kindernamen, keine Schlüssel – die Anhänge enthalten keine.

## Ausdrücklich nicht in diesem Paket

Gebogene Pfeile, Animation, Übungsbibliothek von außen, Bearbeiten bestehender
Bibliotheksübungen über den Abgleich (der legt weiterhin nur Neues an – bewusst so
belassen).

## Anhang

- `skz_neu.js` – Referenz für Abschnitt 1
- `bibliothek-nachtrag.json`, `vorlagen-nachtrag.json` – Abschnitt 5
- `vorschau.html` – Sollbild der vier Skizzen im App-Stil (Ordner über
  `python -m http.server` öffnen)
