# Prüfwerkzeug

Ein Befehl, der die bekannten Fallen prüft — **vor jedem Versionsschritt** (`sw.js`):

```bash
npm install                  # einmalig, holt Playwright + Chromium
node tests/run.js            # oder: npm test
node tests/run.js turnier    # nur Prüfungen, deren Dateiname „turnier" enthält
PARALLEL=1 node tests/run.js # eine Prüfung nach der anderen (der alte Ablauf, rund 35 Minuten)
```

Die Playwright-Fassung steht **genau** in `package.json` (nicht `^`): Jede Fassung bringt ihre
eigene Chromium-Nummer mit, und in einer Cloud-Sitzung liegt der Browser schon fertig im Abbild.
Ein `^` holt beim nächsten `npm install` eine neuere Fassung, die einen Browser sucht, den es
dort nicht gibt — der Lauf bricht dann ab, bevor die erste Prüfung läuft.

Der Lauf hat drei Teile: **Parsen** aller JS-Dateien (ein SyntaxError löst `script.onerror`
nicht aus — der Loader meldet „fertig", die Datei lief nie), die **Ladearchitektur**
(MODUL_WACHE in beiden Einstiegen identisch und vollständig, Wachname ist die letzte Funktion
seiner Datei, jede geladene Datei im PRECACHE, kein globaler Name in Welle 1 *und* 2) und die
**Prüfungen am DOM** in `tests/checks/`. Endet mit Exit-Code 1 bei mindestens einem Befund.

Was geprüft wird, steht in `tests/checks/`. Jede Datei ist eine Gruppe von Prüfungen,
die aus einem echten Fehler entstanden ist — die Versionsnummer im Namen sagt, aus welchem.

## Grundsätze

- **Gemessen wird am gerenderten DOM, nicht am Quelltext.** Eine Textsuche findet, was
  jemand geschrieben hat; die Messung findet, was auf dem Bildschirm steht.
- **Die echten Dateien werden geladen** (`trainer/index.html`, `eltern/index.html`), Supabase
  wird durch eine Attrappe ersetzt, die sich wie die jeweilige Tabelle verhält.
- **Keine Kindernamen.** Das Repo ist öffentlich. Die Attrappe kennt nur „Kind A" bis „Kind O".
- **Ein roter Lauf ist erst ein Befund, wenn die Erwartung selbst geprüft ist.** Bei Zweifel
  denselben Lauf gegen die vorige Fassung stellen (`git archive HEAD~1 | tar -x -C /tmp/alt`,
  dann `REPO=/tmp/alt node tests/run.js`). Umgekehrt gilt dasselbe: eine neue Prüfung muss
  gegen die Fassung *vor* dem Fix rot werden, sonst prüft sie nichts.

## Was der Harness bietet

| Aufruf | Zweck |
|---|---|
| `h.starten({start, supabase, breite, hoehe, scheme, warten, speicherBehalten, jetzt})` | Seite laden; gibt `{page, gesendet, fehler(), schliessen()}`. `jetzt` stellt die Uhr fest (`page.clock.setFixedTime`, Zeitgeber laufen weiter) |
| `h.supabaseAttrappe({tabelle: zeilen \| (url, request) => zeilen})` | Antworten je Tabelle; alles andere `[]` |
| `h.supabaseAttrappe({rpc: {name: antwort \| (url, request) => antwort}})` | Antworten je RPC (`/rest/v1/rpc/<name>`); ohne Eintrag `[]` |
| `h.supabaseAttrappe({auth: {signup: antwort}})` | Antworten der Anmeldung (`/auth/v1/<name>`); ohne Eintrag `{}` |
| `s.gesendet` | Nicht-GET-Anfragen: `{pfad, suche, methode, body}` – `suche` traegt z. B. `on_conflict=…` |
| `s.supabaseRuhig(ruhe, max)` | warten, bis keine Anfrage an die Attrappe offen ist und seit `ruhe` ms (250) keine neue kam; Obergrenze `max` (8000) |
| `h.KINDER`, `h.kaderZeilen({inaktiv})` | 15 neutrale Kinder, als DB-Zeilen |
| `h.terminSetzen(page, datum)` | Terminauswahl des Trainingsplans stellen |
| `h.sichtbarMachen(page, "#id")` | `display:none`-Vorfahren lösen (PIN-Gate) — sonst misst alles 0 |
| `h.kontrastHelfer` | im Browser `eval`en, dann `window.__kontrastVon(el)` nach WCAG |
| `h.heute()`, `h.tagePlus(n)` | Datumsstrings |

`s.gesendet` hält jeden Nicht-GET an „Supabase" mit Pfad, Methode und Body — so lässt sich
prüfen, was die App wirklich speichern **würde**.

## Eigene Prüfung schreiben

```js
// tests/checks/vNNN-was-es-prueft.js
module.exports = async function (h) {          // h = harness
  const s = await h.starten({ start: "/trainer/index.html" });
  const wert = await s.page.evaluate(() => typeof TRAINER);
  await s.schliessen();
  return h.ergebnis("TRAINER ist definiert", wert === "object", [`typeof TRAINER = ${wert}`]);
};
```

## Icon-Zuschnitt und fester Cache (seit v818)

Zwei Prüfungen werden rot, wenn ein Handgriff vergessen wurde – die Abhilfe steht jeweils in der Meldung:

- `v818-icons-zuschnitt.js`: ein Icon steht im Code, aber nicht in der zugeschnittenen Schrift → `node tools/icons-zuschneiden.js --schreiben`
- `v818-fester-cache.js`: eine Datei unter `vendor/` oder ein PNG wurde geändert, der Name des festen Caches aber nicht → `node tools/fest-cache.js --schreiben`

## Knopf-Bauarten (seit v876)

`v876-knopf-bauarten.js` hält die sechs Bauarten aus styles.css (`.btn-p`, `.btn`/`.btn-sm`, `.btn-d`, `.btn-zeile`,
`.btn-link`, `.btn-kopf`) in `md-eltern-portal.js`, `md-adler-rufe.js` und `core.js` fest:

- **Quelltext:** kein `<button>` trägt im `style` eine eigene Fläche, Farbe, Rand, Polster oder Schriftstärke (Platz wie
  `margin`, `width`, `flex` ist erlaubt). Konstanten wie `${EP_KNOPF}` werden eingesetzt. Ausnahmen stehen mit Grund in
  `AUSNAHMEN` im Prüffall – Zustands- und Filterknöpfe (aria-pressed), Antwortknöpfe (v840), Wochenkacheln (v861),
  Emoji-Reaktionen, Vorschaubilder. Eine neue Ausnahme gehört dort hinein, mit Begründung.
- **Gerendert, hell und dunkel:** Anmeldung, Startseite, PWA-Banner, „Mein Konto“, Termin-Detail, Adler-Rufe samt
  Aktionsmenü und die Ja/Nein-Frage – jeder sichtbare Knopf Text ≥ 4,5:1 auf seiner Fläche (`h.kontrastHelfer`),
  ≥ 44 px hoch, runde ≥ 44 × 44, Text-Links unterstrichen, je Ansicht höchstens eine `.btn-p`.

`v877-knopf-bauarten-trainer.js` hält dasselbe für den Trainer-Kernbereich fest (`boot.js`, `md-turnierplan.js`,
`views.js`, `md-tagebuch.js`, `md-matchcard.js`, `md-skizze.js`, `md-nest.js`): Quelltext ohne Knopffarben (auch
`border-radius`; Konstanten über mehrere Zeilen werden eingesetzt), Ausnahmen mit Grund in `AUSNAHMEN` (Zustands- und
Filterknöpfe, Kacheln, Spielfeld und Skizze, Live-Vollbild). Gerendert hell und dunkel: Trainingsplan (gefüllt), Übungen,
Trainingsturnier, Kader, Kinderprofil, Kontakte, Tagebuch, neuer Eintrag, Trainer-Meeting, Nest-Redaktion. Knöpfe auf
einem Farbverlauf sind nicht messbar und werden genannt statt gewertet.

`v878-knopf-bauarten-rest.js` schließt 4.6 ab: `shell.html` und die übrigen Module ohne Knopffarben (Ausnahmen mit Grund),
gerendert hell und dunkel an Kopfzeile, Trainingsplan, Termine, Anwesenheit, KI-Coach, Mannschaftskasse, Feier, Galerie,
Mitfahrt, Kabine-Start und Quiz. Anders als v877 wird auf Farbverläufen gegen jede Farbstufe gemessen (die schlechteste
zählt). Dazu: Auswahl-Chips tragen `aria-pressed`, das beim Tippen wechselt, und ein ✓ – Quelltext und gerendert.

## Golden-Master (Bestandsaufnahme 4.8, Schritt 1)

`v877-trainingsplan-golden.js` schreibt fest, was der Trainingsplan an die Tabelle `trainingsplan` schickt – für zehn
Abläufe (G1 Vorlage laden … G10 Block löschen und Rückgängig), Zeichen für Zeichen. Zweck: Die Umbauschritte 2–8 aus
`doku/bestandsaufnahme-2026-11/plan-zustand.md` lösen den Zustand aus dem DOM und müssen dabei **genau dasselbe**
speichern; dieser Prüffall ist ihre Abnahme.

- **Sollwerte** liegen in `tests/golden/trainingsplan/G*.json` (nicht unter `checks/`, dort wird jede Datei geparst). Je
  Ablauf die Schritte mit allen Nicht-GET an `trainingsplan` (Methode, Abfrage, Körper), wo nötig dazu eine DOM-Aufnahme.
  Verglichen wird als Zeichenkette – die Schlüsselreihenfolge zählt. Normalisiert sind nur `updated_at`, `gespeichert_von`
  und die Werte von `kette` (k1, k2 …). Die Uhr steht fest (`jetzt`), Math.random ist in der Seite geseedet.
- **Fehlt eine Sollwert-Datei, ist der Lauf rot.** Neu schreiben:
  `GOLDEN_SCHREIBEN=1 node tests/run.js v877-trainingsplan` – danach den Unterschied mit `git diff tests/golden` lesen.
- **Wann ein Sollwert sich ändern darf:** in den Schritten 2–8 nie (rot heißt: der Umbau speichert anders als vorher).
  Erst ab Schritt 9, wenn ein Fehlerbild bewusst behoben wird – dann im selben PR mit Begründung, welches Fehlerbild und
  welche Zeilen des Sollwerts sich deshalb ändern. Jedes Szenario nennt in `haelt_fest`, welches Fehlerbild es heute festhält.
- Gewartet wird je Schritt auf die erwartete Zahl an Schreibvorgängen (beim verzögerten Speichern auf genau diesen POST),
  danach auf 1,6 s Ruhe: nur so zeigt sich, dass kein weiterer Schreibvorgang folgt.

## Parallel (seit v782)

Der Lauf startet standardmäßig drei Prüfungen gleichzeitig (`PARALLEL=n` ändert es, `PARALLEL=1` ist der alte Ablauf) und braucht statt rund 35 Minuten etwa 11. Die Ausgabe bleibt in der
Reihenfolge der Dateien; am Ende steht „Vollständig: N von N Prüfungen gemeldet“ – fehlt eine Meldung, ist der Lauf rot. Jede Prüfung hat ein Zeitlimit (`ZEITLIMIT` in Sekunden, Standard 240): eine
hängende Prüfung wird als rot gemeldet, statt den Lauf aufzuhalten.

Was dabei gefunden wurde: (1) v589 ersetzt `console.log`, während es exportiert, und schluckte so die Zeile einer gleichzeitig fertigen Prüfung – der Lauf schreibt deshalb über die beim Start
gesicherte Funktion. (2) v553 wartete mit festen 120 ms auf die Überblendung der Ansicht und wurde unter Last rot – es wartet jetzt, bis die Ansicht 150 ms stillsteht. Wird eine Prüfung nur im
Parallel-Lauf rot, hat sie vermutlich eine feste Wartezeit: erst mit `PARALLEL=1 node tests/run.js <Name>` gegenprüfen, dann die Wartezeit durch Warten auf den Zustand ersetzen – nicht die Prüfung lockern.

## Warten auf Zustand statt fester Zeit (seit v890)

Eine feste Pause vor einer Prüfung (`await w(300)`, `page.waitForTimeout(…)`, `setTimeout` im `evaluate`) misst nur, ob der Rechner
gerade schnell genug war. Unter Doppellast (zwei Prüfreihen gleichzeitig) wurden so Dutzende Fälle rot, die einzeln grün waren.
Gewartet wird deshalb auf **genau den erwarteten Zustand**, mit Obergrenze – tritt er nie ein, läuft die Prüfung danach weiter und
wird rot wie vorher:

```js
const bis = async (f, n) => { for (let i = 0; i < (n || 100) && !f(); i++) await new Promise(x => setTimeout(x, 50)); return f(); };
await bis(() => s.gesendet.some(x => /rufe_senden/.test(x.pfad)));                     // im Prüfprozess
await s.page.waitForFunction(() => !!document.getElementById("frage-modal"), null, { timeout: 5000 }).catch(() => {});
await s.supabaseRuhig();   // bis keine Anfrage an die Attrappe mehr offen ist und 250 ms keine neue kam
```

- **Nach einem Tipp, der speichert:** auf den Schreibvorgang in `s.gesendet` warten, nicht auf die Zeit. Ein gebündeltes Speichern
  (Zeitgeber in der App) sieht `s.supabaseRuhig()` erst, wenn die Anfrage unterwegs ist – dort auf genau diesen Schreibvorgang warten.
- **Nach Laden, Datei-Upload, Neuzeichnen:** auf das Element oder den Text, den die Prüfung danach liest. Wird neu gezeichnet, vorher
  das alte Element markieren und warten, bis es ersetzt ist.
- **Vor dem Messen von Koordinaten (Ziehen mit der Maus):** messen, bis zwei Messungen im Abstand von 100 ms gleich sind.
- **Fest bleiben** nur Pausen, die prüfen, dass **nichts** passiert („Abbrechen schreibt nichts“) – sie tragen den Kommentar
  `bewusst fest` – und die großzügigen Startpausen der Eltern-Seite nach `reload` (3,5–5 s, unter Doppellast nie rot).
- Gegenprobe: `node tests/run.js` zweimal gleichzeitig starten (die Prüfungen schreiben keine Dateien). Beide Läufe müssen grün sein.

## Öffentliche Turnierseite (seit v897)

`tests/turnier-attrappe.js` liefert eine Turnierzeile („Adler-Herbstcup U9“, zwei Gruppen, Finalrunde, fiktive Vereine) und
die feste Uhr `JETZT` (10:28, ein Spiel läuft mit Zwischenstand). Die Prüffälle `v897-…` bis `v899-…` messen damit die echte
Seite `?turnier=…`: Zwischenstand zählt nicht, Regelwerk bleibt offen, Filter zeigt Platzierungsspiele, Wappen mit
Initialen-Ausweichdarstellung, Ergebnis-Modus schreibt den Plan-Index, reduzierte Bewegung, Kontrast bei 390/1280 px.
