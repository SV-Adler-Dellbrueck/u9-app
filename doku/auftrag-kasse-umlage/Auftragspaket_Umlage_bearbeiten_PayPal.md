# Auftragspaket: Umlage bearbeiten, PayPal.Me-Link absichern, Hinweis gegen Doppelzählung

Repo `SV-Adler-Dellbrueck/u9-app`, Stand 04.10.2026 (nach v733). Gilt zusammen mit `CLAUDE.md`.
Betrifft nur `md-teamkasse.js` (Kachel „Kasse führen“) und die Hilfe. Keine Datenbankänderung:
`kasse_umlagen.paypal_link` gibt es, RLS erlaubt der Kasse (`is_kasse()`) und dem Trainerteam
bereits alles.

## Warum

Die neue Kassenwärtin richtet heute die erste Umlage ein (Mannschaftskasse 40 €) und hakt die
Kinder ab. Beim Lesen des Codes sind drei Stolperstellen aufgefallen, die danach nicht mehr
korrigierbar wären:

1. **Der PayPal.Me-Link wird ungeprüft gespeichert**, den Eltern aber nur gezeigt, wenn er mit
   `http://` oder `https://` beginnt (Zeile um 377). PayPal zeigt den Link selbst als
   `paypal.me/Name` ohne `https://`. Wer ihn so einfügt, speichert ihn, und bei den Eltern
   erscheint kein Knopf, ohne jede Fehlermeldung.
2. **Eine Umlage lässt sich nicht bearbeiten.** Es gibt nur das Auge (aktivieren/deaktivieren)
   und den Papierkorb. Der Papierkorb ist gesperrt, sobald Häkchen gesetzt sind (v699, gewollt).
   Ein Tippfehler bei Betrag, Titel oder Link bleibt also nach dem Abhaken stehen.
3. **Doppelzählung:** Der Kassenstand ist Summe der Buchungen plus abgehakter Beiträge
   (`kasse_summary_roh`). Wer Beiträge als Buchung der Kategorie „Beiträge“ erfasst und
   zusätzlich abhakt, zählt sie zweimal. Die Kategorie ist erlaubt (Prüfregel in der DB) und
   bleibt es; es fehlt nur ein Hinweis.

## Was sich ändert

**1. PayPal.Me-Link beim Speichern bereinigen** (`kasseAddUmlage` und die neue Bearbeiten-Funktion):

- Eingabe trimmen. Leer → `null`.
- Beginnt sie mit `paypal.me/`, `www.paypal.me/` oder `paypal.com/paypalme/`, wird `https://` davorgesetzt.
- Danach muss der Link mit `https://` beginnen und als Host `paypal.me`, `www.paypal.me` oder
  `www.paypal.com` mit Pfad `/paypalme/` haben. Sonst Hinweis „Bitte den PayPal.Me-Link
  einfügen, zum Beispiel paypal.me/DeinName“ und **nicht speichern**.
- Der Fan-Spenden-Link („Adler-Kasse“, `adlerkasse_save`) bekommt nur dasselbe Voranstellen von
  `https://` bei `paypal.me/…`; andere Hosts bleiben dort wie bisher erlaubt.
- Darunter im Formular ein Satz Hilfetext: „PayPal-App → Einstellungen → PayPal.Me. Der Link
  darf mit oder ohne https:// eingefügt werden.“

**2. Umlage bearbeiten.** Je Umlage-Zeile neben Auge und Papierkorb ein Knopf ✏️ „Bearbeiten“
(mindestens 44 px, `aria-label`). Er füllt die vorhandenen Felder (Titel, Betrag, fällig, PayPal.Me)
wie bei den Buchungen (`kasseBuchungBearbeiten`): Überschrift „Umlage ändern“, Knopf „Änderung
speichern“, „Abbrechen“. Gespeichert wird per PATCH auf `kasse_umlagen?id=eq.<id>`.
Ändert sich der **Betrag** und es gibt Häkchen, vorher `frageJaNein` mit dem Wortlaut: „Der Betrag
ändert sich von 40,00 € auf 45,00 €. Bei 8 abgehakten Familien ändert sich der Kassenstand um
+40,00 €. Ändern?“ (Zahlen aus `_kasseUebersicht` und `_kasseDaten`, nichts erraten).

**3. Hinweis gegen Doppelzählung.** Im Formular „Bewegung erfassen“: wählt jemand die Kategorie
„Beiträge“ und gibt es mindestens eine aktive Umlage, erscheint unter dem Feld in `--s-klein`
der Satz: „Beiträge bitte unter „Wer hat bezahlt“ abhaken. Eine zusätzliche Buchung zählt sie
im Kassenstand doppelt.“ Kein Sperren, nur der Hinweis.

## Nicht ändern

- Keine Buchung, keine Umlage und kein Häkchen in den Daten anfassen. Die Kasse hat bereits
  Buchungen (Übertrag und zwei Posten „Beiträge“); die korrigiert die Kassenwärtin selbst.
- Die Sperre „Umlage mit Zahlungen nicht löschen“ bleibt.
- Die Eltern-Anzeige (Zeile um 377) bleibt wie sie ist; sie zeigt den Knopf nur bei `https://`.

## Abnahmekriterien

1. Eingabe `paypal.me/Test` in der Umlage speichert `https://paypal.me/Test`; die Eltern sehen
   den Knopf „PayPal“.
2. Eingabe `https://example.com/x` wird nicht gespeichert, es erscheint der Hinweis.
3. Leeres Feld speichert `null`; es erscheint kein Knopf.
4. Jede Umlage-Zeile hat ✏️; Ändern von Titel, fällig und Link speichert ohne Rückfrage.
5. Betragsänderung bei 0 Häkchen speichert ohne Rückfrage; bei Häkchen kommt die Rückfrage mit
   den richtigen Zahlen, „Abbrechen“ ändert nichts.
6. Der Kassenstand nach einer Betragsänderung stimmt mit `kasse_summary` überein.
7. Kategorie „Beiträge“ im Formular zeigt den Hinweis nur, wenn eine aktive Umlage existiert.
8. Alle neuen Bedienelemente sind mindestens 44 px hoch; Handy mit 360 px Breite ohne
   seitliches Scrollen.

## Testfälle

- Link-Bereinigung: `paypal.me/A`, `www.paypal.me/A`, `https://paypal.me/A`,
  `paypal.com/paypalme/A`, `  paypal.me/A  `, `http://paypal.me/A`, `javascript:alert(1)`,
  `https://paypal.me.evil.de/A`, leer. Die letzten drei dürfen nicht gespeichert werden
  (Letzteres: Host muss genau passen, nicht nur beginnen).
- Umlage mit 8 Häkchen: Betrag 40 → 45 zeigt „+40,00 €“.
- Umlage ohne Häkchen: Betrag ändern ohne Rückfrage.
- Eltern-Sitzung liest weiter nur eigene Häkchen (RLS unverändert).

## Pflichten (aus `CLAUDE.md`)

`node --check` über alle Dateien, `node tests/run.js` grün, `sw.js` hochzählen, neue Prüfdatei in
`tests/checks/` (Link-Bereinigung als reine Funktion testbar halten), Hilfe und
Funktionsübersicht („Teamkasse“, „Kassenwart-Kasse“) nachziehen, typografische Anführungszeichen,
keine Kindernamen, keine Schlüssel. Ein PR.
