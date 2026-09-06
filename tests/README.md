# Prüfwerkzeug

Ein Befehl, der die bekannten Fallen prüft — **vor jedem Versionsschritt** (`sw.js`):

```bash
npm install                  # einmalig, holt Playwright + Chromium
node tests/run.js            # oder: npm test
node tests/run.js turnier    # nur Prüfungen, deren Dateiname „turnier" enthält
```

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
| `h.starten({start, supabase, breite, hoehe, scheme, warten, speicherBehalten})` | Seite laden; gibt `{page, gesendet, fehler(), schliessen()}` |
| `h.supabaseAttrappe({tabelle: zeilen \| (url, request) => zeilen})` | Antworten je Tabelle; alles andere `[]` |
| `h.supabaseAttrappe({rpc: {name: antwort \| (url, request) => antwort}})` | Antworten je RPC (`/rest/v1/rpc/<name>`); ohne Eintrag `[]` |
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
