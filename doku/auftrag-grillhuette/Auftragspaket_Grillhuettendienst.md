# Auftragspaket: Grillhüttendienst — Einteilung reihum

Repo `SV-Adler-Dellbrueck/u9-app`, Stand 22.09.2026. Gilt zusammen mit `CLAUDE.md`.

**Fertig bis Sonntag, 27.09.2026.** Am 28.09. wird die Einteilung beim Elternabend live gezeigt.

## Warum

Der Grillhüttendienst bei Heimspielen ist die einzige Pflicht für Eltern. Der Verein schreibt ihn
vor, und ohne ihn findet unser Heimspieltag nicht statt. Das Trainerkonzept sagt sonst „keine
Schichtpläne, alles ist ein Angebot" — deshalb ist dieser Dienst dort als benannte Ausnahme
geführt, und deshalb läuft er **nicht** über die freiwilligen Helferaufgaben.

Die Helferaufgaben (v428/v429) sind für kurzfristige, freiwillige Zusagen gebaut: Wer am Morgen
merkt, dass er es schafft, trägt sich ein. Für eine Pflicht taugt das nicht. Hier gilt das
Umgekehrte: **Die App teilt ein, jede Familie kommt dran, und wer an seinem Tag nicht kann, sorgt
selbst für Ersatz.**

## Was entsteht

**1. Einteilung.** Im Trainerbereich ein Knopf „Grillhütte einteilen". Er verteilt alle künftigen
Heimtermine ohne Einteilung reihum auf die aktiven Kinder des Kaders. Eingeteilt wird **je Kind**,
nicht je Elternteil — sonst kommen Familien mit zwei hinterlegten Adressen doppelt und Familien
ohne Eltern-Zugang nie dran.

Regeln der Reihenfolge:

- Jedes Kind kommt einmal dran, bevor eines zum zweiten Mal dran ist.
- Ein zweiter Durchlauf setzt dort fort, wo der erste aufgehört hat — nicht wieder vorn.
- Neue Kinder reihen sich hinten ein.
- Eine bestehende Einteilung wird durch erneutes Einteilen nie verschoben.
- Verlässt ein Kind den Kader, werden seine künftigen Dienste **freigegeben** (siehe 2), nicht
  gelöscht.

**2. Tausch in der App.** Die eingeteilte Familie sieht ihren Dienst und kann ihn freigeben
(„Ersatz suchen"). Ein freigegebener Dienst erscheint bei allen Eltern als offen und lässt sich mit
einem Tipp übernehmen. Bis jemand übernimmt, bleibt die Verantwortung bei der eingeteilten Familie
— das sagt die Anzeige auch so.

**3. Tausch außerhalb.** Einigen sich Familien anders, meldet die eingeteilte Familie das dem
Trainerteam. Jeder Trainer kann einen Dienst im Trainerbereich einer anderen Familie zuordnen.

**4. Rückfall.** Im Trainerbereich zeigt eine Liste alle Heimtermine der nächsten Wochen mit dem
Stand des Dienstes. Ist ein Dienst sieben Tage vor dem Termin noch freigegeben oder unbesetzt, steht
er dort oben und markiert — dann teilt das Trainerteam von Hand ein.

## Anzeige für Eltern

- Die **eigene** Einteilung steht im Termin und, sobald der Dienst in den nächsten 14 Tagen liegt,
  als eine Zeile auf der Startseite: „Grillhütte: Ihr seid dran — Heimspiel am …".
- Die Lehre aus v429 gilt umgekehrt: Ob ich eine Viertelstunde früher komme, entscheide ich am
  Morgen; einen Pflichtdienst muss ich Wochen vorher sehen. Deshalb **nicht** nur in der Kachel des
  nächsten Termins.
- Andere Familien sehen je Heimtermin nur, ob der Dienst besetzt, freigegeben oder offen ist, und —
  wenn besetzt — denselben Namen, den die Helferaufgaben heute zeigen. **Kein Kindername** in dieser
  Anzeige.
- Status als Chip mit Text, Farben aus den vorhandenen Statusvariablen; keine neue Farbe, keine
  Emoji-Ampel.
- Genau eine Hauptaktion je Bildschirm bleibt: In der Terminkachel ist das weiter die Rückmeldung.
  „Ersatz suchen" und „Übernehmen" sind normale Knöpfe (48 px), keine zweite Hauptaktion.
- Rückmeldung benutzt das Wort des Knopfes: „Ersatz suchen" → „Ersatz wird gesucht",
  „Übernehmen" → „Übernommen".

## Datenweg

Neue Tabelle `dienst_einteilung`:

| Spalte | Inhalt |
|---|---|
| `id` | Schlüssel |
| `termin_id` | Verweis auf `termine` |
| `dienst` | Text, Standard `grillhuette` — offen für weitere Pflichtdienste, ohne Umbau |
| `kind_id` | Kader-Kennung, dieselbe wie `spieler_id` in `entwicklungsziele` |
| `status` | `eingeteilt` · `freigegeben` · `uebernommen` |
| `uebernommen_von` | wer übernommen hat, sonst leer |
| `geaendert_von`, `created_at`, `updated_at` | Nachvollziehbarkeit |

Eindeutig je `termin_id` + `dienst`.

**RLS Pflicht.** Direkter Zugriff nur für Trainer (`is_trainer()`). Eltern lesen und schreiben
ausschließlich über SECURITY-DEFINER-Funktionen, Muster wie `kann_jetzt_public`:

- `dienste_public(p_tage)` — je Heimtermin im Fenster: Datum, Status, Anzeigename bei Besetzung,
  und ob der Dienst der eigenen Familie gehört. Kein `kind_id`, kein Kindername.
- `dienst_freigeben(p_id)` — nur wenn `is_parent_of(kind_id)`.
- `dienst_uebernehmen(p_id)` — nur für angemeldete Eltern, nur bei Status `freigegeben`, nicht für
  die eigene Freigabe.

Heimtermin heißt: `termine.typ = 'spiel'` mit `heim = true`, dazu Festivals und Turniere, bei denen
wir Gastgeber sind. Wie Letztere im Datenmodell erkennbar sind, **vor dem Bauen im Code nachsehen**
— nicht vermuten.

Migration unter `supabase/migrations/`, neue Tabelle in die Backup-Funktion.

## Abnahmekriterien

1. „Grillhütte einteilen" verteilt fünf Heimtermine auf fünf verschiedene Kinder; ein zweiter Klick
   ändert nichts.
2. Kommen danach drei Heimtermine hinzu, gehen sie an die drei Kinder, die als Nächste dran sind.
3. Ein neues Kind im Kader wird erst eingeteilt, wenn alle bisherigen einmal dran waren.
4. Ein Elternteil sieht den eigenen Dienst im Termin und — innerhalb von 14 Tagen — auf der
   Startseite.
5. „Ersatz suchen" setzt den Status auf `freigegeben`; andere Eltern sehen den Dienst als offen und
   können ihn übernehmen. Danach ist der Name des Übernehmenden sichtbar, die eingeteilte Familie
   ist entlastet.
6. Ein Elternteil kann den Dienst einer anderen Familie weder freigeben noch umbuchen.
7. Ein Trainer kann jeden Dienst einer anderen Familie zuordnen.
8. Sieben Tage vor dem Termin steht ein freigegebener oder unbesetzter Dienst in der Trainerliste
   oben und markiert.
9. Mit dem anonymen Schlüssel ist `dienst_einteilung` weder lesbar noch beschreibbar; die Funktionen
   liefern ohne Anmeldung eine leere Menge.
10. In keiner Antwort an Eltern steht ein Kindername oder eine `kind_id` einer anderen Familie.
11. Verlässt ein Kind den Kader, stehen seine künftigen Dienste als freigegeben da.
12. Bedienung am Handy: alle Knöpfe mindestens 48 px, Statuschip mit Text.

## Testfälle

- 14 Kinder, 5 Heimtermine → 5 verschiedene Kinder; weitere 12 Termine → die übrigen 9, dann
  wieder von vorn in derselben Reihenfolge.
- Freigeben durch die eigene Familie → erlaubt; durch eine fremde Familie → abgewiesen, nichts
  geschrieben.
- Übernehmen eines nicht freigegebenen Dienstes → abgewiesen.
- Übernehmen der eigenen Freigabe → abgewiesen.
- Termin in 6 Tagen mit Status `freigegeben` → oben in der Trainerliste; derselbe in 10 Tagen →
  nicht markiert.
- Anonymer Aufruf aller drei Funktionen → leere Menge bzw. abgewiesen, keine Fehlermeldung, die
  verrät, dass es den Termin gibt.

## Vor dem Bauen klären

- **Gibt es schon einen Büdchen- oder Grillhütten-Dienst als Helferaufgabe?** Das Trainerkonzept
  nennt einen Büdchen-Dienst am Heimspieltag. Falls er im Code existiert, wird er durch diese
  Einteilung **abgelöst**, nicht doppelt geführt — sonst gibt es zwei Wahrheiten darüber, wer
  dran ist.
- **Welcher Name erscheint bei Helferaufgaben?** Derselbe wird hier verwendet.
- **Wie sind Heimturniere und Festivals als Gastgeber-Termine gekennzeichnet?**

## Pflichten (aus `CLAUDE.md`)

- Neue Dateien in `PRECACHE`, beide Loader und `MODUL_WACHE`; neue Tabelle in die Backup-Funktion.
- Editor liest und schreibt **alle** Spalten.
- `node --check` über alle Dateien, `node tests/run.js` grün, danach `sw.js` hochzählen.
- Neue Prüfdatei in `tests/checks/`.
- Hilfe und Rundgang mitziehen: für Eltern „Grillhütte: dran sein, Ersatz suchen, übernehmen", für
  Trainer „einteilen, umbuchen, Rückfall".
- Typografische Anführungszeichen, keine Kindernamen, keine Schlüssel.

## Ausdrücklich nicht in diesem Paket

Keine Push-Benachrichtigung. Keine weiteren Pflichtdienste — die Spalte `dienst` hält die Tür offen,
mehr nicht. Keine Zählung „wie oft hat welche Familie getauscht". Keine Einteilung für
Trainingstermine: Die Trainingsaufsicht bleibt eine freiwillige Helferaufgabe.
