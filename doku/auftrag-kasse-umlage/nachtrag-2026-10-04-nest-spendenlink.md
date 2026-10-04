# Nachtrag 04.10.2026 zum Auftragspaket „Umlage bearbeiten, PayPal.Me-Link absichern“

Gilt zusammen mit `Auftragspaket_Umlage_bearbeiten_PayPal.md` in diesem Ordner und `CLAUDE.md`
(hat bei Widerspruch Vorrang). Gleicher PR. Keine Datenbankänderung.

## Warum

Die Kassenwärtin legt einen PayPal.Me-Link an und trägt ihn in zwei Orte ein: bei der Umlage
(Beitrag) und als „Adler-Kasse“-Spendenlink. Der Trainer möchte den Spendenlink zusätzlich im
Adler Nest anbieten, für alle, die der Mannschaftskasse freiwillig etwas geben wollen. Heute
erscheint der Spenden-Knopf nur in der Eltern-Startseite (`ak-slot`) und im Liveticker
(`md-matchcard.js`); das Nest (`md-nest.js`) zeigt ihn nicht.

## Was sich ändert

**1. Link-Formen (Ergänzung zu Punkt 1 des Pakets).** PayPal erlaubt hinter dem Namen einen
Betrag, optional mit Währung: `paypal.me/Name/40`, `paypal.me/Name/40EUR`,
`paypal.com/paypalme/Name/40`. Die Bereinigung muss das zulassen, ohne die Host-Prüfung
aufzuweichen: nach dem Namen höchstens **ein** weiteres Pfadstück der Form
`^\d+([.,]\d{1,2})?[A-Za-z]{0,3}$`, sonst nichts. Das Komma im Betrag wird beim Speichern zum
Punkt. Fragmente und Abfragen (`?`, `#`) werden verworfen.

**2. Spenden-Karte im Adler Nest.** In `nestHtml` kommt nach dem Abschnitt „Rubriken“ und vor
`nest-ende` („Auf geht's, Adler!“) ein leerer Platzhalter `<div id="nest-kasse-slot"></div>`.
Nach dem Rendern füllt ihn `nestOpen` wie `nestMedienLaden` asynchron: Link über
`adlerkasseLinkGet()` holen; ist keiner gesetzt oder nicht `https://`, bleibt der Platzhalter
leer, es erscheint nichts. Aufbau im Stil des Hefts (Klassen `nest-abschnitt`, `nest-h2`,
`nest-p`, keine weiße Fremdkarte aus `adlerkasseCardHtml`):

- Überschrift: „Die Mannschaftskasse unterstützen“
- Text: „Wer der Mannschaftskasse etwas geben möchte, kann das hier tun. Jeder Betrag bleibt in
  der Mannschaft: für Turniere, gemeinsame Anschaffungen und kleine Feiern. Freiwillig, ohne
  Erwartung.“
- Knopf: „Per PayPal beitragen“, öffnet den Link in neuem Tab (`target="_blank"`,
  `rel="noopener noreferrer"`), mindestens 48 px hoch, als einzige Hauptaktion des Abschnitts.
- Kleingedrucktes darunter: „Die Zahlung läuft über PayPal. Die App fasst kein Geld an.“
- Neutrale Wörter („Kinder“, „Mannschaft“), nicht „Jungs“.

**3. Nicht in der Kinder-Sicht.** `nestOpen` wird auch aus der Kabine (`md-kabine.js`, Kachel
„Adler Nest – lesen und hören“) aufgerufen. Dort darf die Karte **nie** erscheinen: Die Kabine
hat keine Links nach draußen. `nestOpen` bekommt dafür einen zweiten Parameter
(`nestOpen(ausgabeId, opts)`); der Aufruf aus der Kabine übergibt `{kind:true}`, der aus dem
Eltern-Bereich nichts. Sichtbar nur für Eltern- und Trainerkonten. Wo das Nest sonst noch
geöffnet wird (Benachrichtigung, Vorschau im Editor), im PR auflisten und die Herkunft prüfen.

**4. Druckfassung.** Gibt es eine gedruckte oder exportierte Fassung einer Ausgabe, erscheint
die Karte dort nicht (ein Link auf Papier ist nutzlos).

**5. Hilfe und Funktionsübersicht.** „Adler Nest lesen und hören“ erwähnt die Karte in einem
Satz; „Teamkasse“ nennt, dass der Adler-Kasse-Link jetzt auch im Nest erscheint.

## Nicht ändern

`adlerkasseCardHtml` (Eltern-Startseite, Liveticker) bleibt wie es ist. Keine Änderung an
`adlerkasse_link` oder `kasse_spenden_link_setzen`. Keine neue Tabelle.

## Abnahmekriterien

1. Ist ein Spendenlink gesetzt, zeigt jede Ausgabe im Eltern-Bereich vor „Auf geht's, Adler!“ die
   Karte; ohne Link erscheint nichts und es bleibt keine Lücke.
2. In der Kabine (Kinderzugang) erscheint die Karte in keiner Ausgabe.
3. Der Knopf öffnet den Link in neuem Tab; er hat mindestens 48 px; auf 360 px Breite kein
   seitliches Scrollen; hell und dunkel mit mindestens 4,5:1 Kontrast.
4. `paypal.me/Test/40` und `https://paypal.me/Test/40EUR` werden gespeichert (als `https://…`),
   `paypal.me/Test/40/x`, `paypal.me/Test/abc` und `https://paypal.me.evil.de/Test` nicht.
5. Der bestehende Spenden-Knopf in Startseite und Liveticker ist unverändert.

## Testfälle

- Link `https://paypal.me/Adler` gesetzt → Karte im Eltern-Konto sichtbar, im Kinder-Konto nicht.
- Link leer → keine Karte, kein Leerraum.
- Link `javascript:alert(1)` im Datenbestand → keine Karte.
- Link mit Betrag `https://paypal.me/Adler/40` → Karte zeigt den Knopf, der Link bleibt unverändert.
- Ausgabe aus dem Archiv öffnen → Karte bleibt vorhanden.

## Pflichten (aus `CLAUDE.md`)

`node --check` über alle Dateien, `node tests/run.js` grün, `sw.js` hochzählen, Prüfdatei in
`tests/checks/` (Link-Bereinigung und Sichtbarkeit je Konto), typografische Anführungszeichen,
keine Kindernamen, keine Schlüssel.
