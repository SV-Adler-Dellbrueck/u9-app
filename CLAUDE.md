# SV Adler Dellbrück U9 — Team-App

Progressive Web App für eine Fußball-Jugendmannschaft. **Vanilla JavaScript, kein Build-Schritt, kein Modulsystem** — alle Dateien werden als klassische `<script src>` geladen und teilen sich den globalen Scope. Backend: Supabase (Postgres 17, Region eu-central-1). Gehostet über GitHub Pages.

> Dieses Repo ist **öffentlich**. Niemals Zugangsdaten, private E-Mail-Adressen, Kindernamen oder Schlüssel hier ablegen — auch nicht in Kommentaren oder Beispieldaten.

Ergänzend gibt es ein **privates Repo mit dem Projektgedächtnis** (`adler-u9-wissen`): Vorgeschichte einzelner Entscheidungen, verworfene Ansätze, Kontaktwege. Es enthält personenbezogene Daten und bleibt deshalb getrennt. In einer Cloud-Sitzung lässt es sich dazuholen:

```bash
git clone https://github.com/SV-Adler-Dellbrueck/adler-u9-wissen.git .wissen
```

`.wissen/` steht in der `.gitignore` — Inhalte von dort niemals in dieses Repo übernehmen. Widersprechen sich beide, gilt diese Datei hier.

## Drei Zugänge, ein Codebestand

| Wer | Einstieg | Anmeldung |
|---|---|---|
| **Trainer** | `trainer/` | PIN-Gate, danach Supabase-Passwort-Login |
| **Eltern** | `eltern/` | Einmal-Code per E-Mail (OTP), kein Passwort |
| **Kinder** | „Kabine" im Eltern-Bereich | Eigener Ausgangs-Code, 60-Minuten-Limit |

`index.html` im Wurzelverzeichnis ist nur eine Weiche: alles in `elternRouten` geht nach `eltern/`, der Rest nach `trainer/`. **Neue Sonderrouten dort eintragen**, sonst landen sie im Trainer-Ordner und finden ihre Render-Funktion nicht.

## Leitgedanken des Produkts

Fairness vor Ergebnis, kindgerecht, Datenschutz von Anfang an. Kinder sehen nie Bewertungszahlen. In öffentlichen Ansichten (Liveticker, Turnierseiten, Stadionheft) sind Kindernamen maskiert.

Bewusste Entscheidungen des Auftraggebers — **nicht erneut vorschlagen**:

- Kein Geld in der App (keine Zahlungen, keine Kontodaten)
- Keine LLM-generierten SQL-Abfragen, kein AR, kein Scraping fremder Seiten per Iframe
  – **gemeint ist die Laufzeit:** die App führt keine von einem Sprachmodell erzeugten
  Datenbankbefehle aus. Fertige Inhalte in einem geprüften Schema sind davon nicht
  berührt: `uebungen/bibliothek.json` wird wie eine Eingabe des Trainers geprüft und über
  dieselben Wege geschrieben. Direkter Schreibzugriff auf Supabase von außerhalb der App
  bleibt ausgeschlossen.
- Kein Trainings-Opt-out für Eltern („gilt als zugesagt")
- Keine A/B-Niveau-Labels bei Kindern — fachlich widerlegt, Tagesgruppen sind der richtige Ort
- Mehrsprachigkeit ist zurückgestellt

## Ladearchitektur: zwei Wellen

Beide Einstiege laden in zwei Wellen, damit der erste Bildschirm schnell steht:

- **Welle 1** — `data.js`, `core.js`, `engine.js`, `views.js`, `boot.js`
- **Welle 2** — `quiz.js` und alle `md-*.js` (Feature-Module)

`eltern/index.html` teilt nur im Dashboard-Fall; Sonderrouten (`?quiz`, `?ticker`, `?heft`, `?turnier`, `?handover`, `?kind`, `?delegate`, `?match`) laden alles in einer Welle.

**Die wichtigste Regel:** Welle-1-Code darf eine Welle-2-Funktion niemals ungeprüft aufrufen.

```js
if (typeof gegnerContactInto === "function") gegnerContactInto(...)
```

Ohne diesen Schutz reißt ein fehlendes Modul den umgebenden `try`-Block mit — das Symptom taucht dann an völlig anderer Stelle auf. Für Render-Funktionen von Sonderrouten gibt es `routeRender(name, arg)` in `boot.js`, das kurz auf die Funktion wartet, statt weiß zu bleiben.

Ein globaler Name darf **nicht** in Welle 1 *und* Welle 2 definiert werden.

## Fallen, die schon Schaden angerichtet haben

**Ein SyntaxError löst `script.onerror` nicht aus.** Der Loader meldet „fertig", während die Datei nie ausgeführt wurde. So blieb ein Modul zehn Versionen lang tot, ohne dass etwas Rotes erschien. Deshalb:

- Nach **jedem** Patch alle Dateien parsen, nicht nur die geänderte:
  ```bash
  for f in *.js; do node --check "$f" || echo "FEHLER: $f"; done
  ```
- Die `MODUL_WACHE` in beiden `index.html` prüft nach dem Laden je Modul einen Namen, der **ganz unten** in der Datei steht (stirbt sie mittendrin, fehlt genau der). **Neue Module dort eintragen**, sonst sind sie ungeprüft.

**Gerade Anführungszeichen in doppelt gequoteten JS-Strings** brechen die Datei. In deutschen Texten immer typografische Zeichen verwenden: `„…"` statt `"…"`.

**Der Service Worker cached mit `ignoreSearch`.** Ein `?cb=…` an der URL hilft beim Testen *nicht*. Vor jeder Prüfung im Browser:

```js
navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
caches.keys().then(ks => ks.forEach(k => caches.delete(k)));
```

**`const` auf oberster Ebene hat eine temporale Todeszone.** Bricht eine Datei vorher ab, sind die Konstanten unbenutzbar — auch für Code, der später läuft.

## Pflichten bei jeder Änderung

1. **`sw.js` hochzählen** — `const CACHE="u9i-adler-vNNN"`. Ohne Bump sehen Nutzer die alte Version.
2. **Neue Dateien** in `PRECACHE` (`sw.js`) *und* in beide Loader eintragen. Ausnahme:
   Dateien, die immer frisch sein müssen, gehören **nicht** in den Precache, sondern in die
   Ausnahmeliste ganz oben im `fetch`-Handler — so wie `uebungen/bibliothek.json`, die
   Quelle für den Übungs-Abgleich beim Öffnen. Aus dem Cache gelesen stünde sie für immer
   auf dem Stand der Installation, und `ignoreSearch` macht jedes `?cb=…` wirkungslos.
3. **Neue Tabellen** in die Backup-Funktion aufnehmen, sonst fehlen sie in der Sicherung.
4. **Offline-Fallbacks synchron halten.** Inhaltslisten (Vereinbarung, Fairplay-Regeln) leben in der Datenbank *und* als JS-Array. Supabase-URLs sind vom SW-Cache ausgenommen — offline greift immer der Fallback. Eine Änderung ohne die andere führt dazu, dass Eltern ohne Netz eine veraltete Liste sehen.
5. **Hilfe und Rundgang mitziehen**, wenn Funktionen umziehen oder neu dazukommen.
6. **`node tests/run.js` vor dem Bump.** Ein Lauf parst alle Dateien, prüft die Ladearchitektur (MODUL_WACHE, Loader, PRECACHE, Wellen) und spielt die bekannten Fallen am echten DOM durch. Erst wenn er grün ist, wird `sw.js` hochgezählt. Ein neuer Fehler bekommt eine neue Datei in `tests/checks/` — mit der Versionsnummer, aus der er stammt.

## Datenbank

Supabase mit durchgängiger Row-Level-Security. Muster für trainer-pflegbare Inhalte: Tabelle + JS-Fallback + Overlay-Ansicht + Editor, der die komplette Liste ersetzt (löschen und neu einfügen).

**Vorsicht bei diesem Muster:** Der Editor muss *alle* Spalten lesen und zurückschreiben. Fehlt eine im `INSERT`, ist sie nach dem Speichern für alle Zeilen leer — ohne Fehlermeldung.

Schlüssel und Geheimnisse (Push-Zertifikate, Cron-Token) leben ausschließlich in den Edge Functions, nie im Repo. Die Push-Cron-Funktion nie manuell mit echtem Token aufrufen — das verdoppelt Benachrichtigungen an Eltern.

## Oberfläche

- Aktions-Buttons mindestens 44 px hoch (globale CSS-Regel; runde Icon-Buttons und transparente Inline-Links ausgenommen)
- Sichtbarkeit für Kinder und Eltern nie über `nth-child` auf geteilte Container steuern — es gibt eine Positivliste, die bei neuen Elementen automatisch dicht bleibt
- Dialoge tragen `role="dialog" aria-modal="true"`; ein zentraler Fokus-Trap in `core.js` hält den Fokus darin und setzt ihn beim Öffnen hinein
- Systemdialoge (`prompt`, `confirm`) im Eltern- und Kinderbereich vermeiden — eigene Overlays nutzen
- Farbe darf nie der einzige Bedeutungsträger sein
- Kontrast: Text mindestens 4.5:1, Bedienelemente 3:1 — auch im Aus-Zustand und im dunklen Modus

## Aufbau der Dateien

```
index.html          Weiche zwischen trainer/ und eltern/
trainer/, eltern/   Je ein Loader mit Wellen-Logik und MODUL_WACHE
shell.html          Statisches Grundgerüst der Trainer-Oberfläche
core.js             Anmeldung, Supabase-Hilfen, Meldungen, Fokus-Trap
data.js             Übungsdatenbank und Formationen
engine.js           Bewertungslogik, Entwicklungstempo
views.js            Ansichten, Navigation, Hilfe
boot.js             Start, Routing der Sonderrouten
md-*.js             Feature-Module (Welle 2)
sw.js               Service Worker samt Precache-Liste
supabase/functions/ Edge Functions (weitere sind nur deployed)
```

## Testen ohne Anmeldedaten

PIN und Passwörter niemals selbst ausfüllen. Prüfbar ist trotzdem viel: Dateien parsen, im Browser die Konsole lesen, per JavaScript prüfen ob erwartete Funktionen existieren, anonym lesbare Ansichten aufrufen (`?turnier=…`, `?heft`, `?quiz`).

Das Prüfwerkzeug in `tests/` macht genau das reproduzierbar: es lädt die echten `trainer/index.html` und `eltern/index.html` in einem Playwright-Chromium, ersetzt Supabase durch eine Attrappe je Prüfung und misst am gerenderten DOM. Kindernamen kennt es nicht — nur „Kind A" bis „Kind O". `npm install` einmalig, dann `node tests/run.js` (Filter als Argument: `node tests/run.js turnier`). Gegenprobe gegen eine alte Fassung: `REPO=/pfad/zur/alten/fassung node tests/run.js`. Näheres in `tests/README.md`.
