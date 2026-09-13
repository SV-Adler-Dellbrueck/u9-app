# Auftragspaket: Die ADLER-Lücken schließen

Repo `SV-Adler-Dellbrueck/u9-app`, Stand 13.09.2026. Gilt zusammen mit `CLAUDE.md`.

Drei kleine, unabhängige Pakete. Sie kommen nicht aus einem Funktionswunsch, sondern aus einem
Abgleich des Trainerkonzepts und der Trainingsphilosophie Deutschland mit dem, was die App heute
kann. Zwei Buchstaben haben eine Lücke — **E** für die Eltern und **R** für die Kinder —, und die
Nettospielzeit lässt sich bisher nicht prüfen.

Jedes Paket darf einzeln umgesetzt und einzeln ausgeliefert werden.

---

# Paket 1 · „Das kann dein Kind jetzt" (Buchstabe E)

## Warum

Der Rückblick im Eltern-Bereich zeigt nach einem Spiel zwei Wochen lang Einsätze, Rolle und Tore
— also **Ergebnisdaten**. Was das Kind **neu kann**, sieht das Elternhaus nirgends. Das Konzept
sagt aber: „Ihr seht, woran wir arbeiten, nicht nur, wie es ausging." Genau dieser Satz ist
derzeit nicht eingelöst.

## Was entsteht

Eine zusätzliche Karte im Eltern-Bereich, unterhalb des bestehenden Rückblicks, mit der
Überschrift **„Das kann dein Kind jetzt"**. Sie zeigt, was seit dem letzten Blick dazugekommen
ist:

- erreichte Entwicklungsziele (`entwicklungsziele`, `status = erreicht`, nach `erreicht_at`)
- neu vergebene Technik-Abzeichen

Höchstens drei Einträge, neueste zuerst. Gibt es nichts Neues, erscheint die Karte **gar nicht** —
kein „noch nichts erreicht", das wäre das Gegenteil der Absicht.

Jeder Eintrag ist ein Satz in Kabinen-Sprache, kein Fachbegriff: „Nimmt den Ball mit dem ersten
Kontakt mit", nicht „Ballan- und -mitnahme verbessert". Der Text kommt aus dem Ziel, wie der
Trainer es formuliert hat — das ist ohnehin schon kindgerecht, weil es in „Meine Mission"
erscheint.

**Keine Zahlen, keine Sterne, kein Vergleich mit anderen Kindern.** Das ist die harte Grenze
dieses Pakets.

## Datenweg

`entwicklungsziele` ist trainer-only. Der Eltern-Bereich darf nicht direkt darauf zugreifen —
es gibt dafür bereits das Muster der RPC-Funktion, siehe `training_rueckblick` und
`einsatzzeiten_public` in `md-eltern-portal.js` und `md-matchcard.js`.

Also: neue RPC `kann_jetzt_public(p_kind_id)`. Sie gibt nur Text und Datum zurück, **nie**
Bewertungszahlen, **nie** Daten anderer Kinder. Zugriff geprüft wie bei den bestehenden
Public-RPCs. Die Funktion gehört unter `supabase/` als Migration.

## Abnahmekriterien

1. Nach einem Spiel erscheint die Karte nur, wenn seit dem letzten Spiel ein Ziel erreicht oder
   ein Abzeichen vergeben wurde.
2. Ohne Neues erscheint keine Karte und kein Platzhalter.
3. Höchstens drei Einträge, neueste zuerst.
4. Kein Wert, keine Note, kein Name eines anderen Kindes im Ergebnis der RPC — mit dem anonymen
   Schlüssel gegengeprüft.
5. Ein Elternteil sieht ausschließlich die Einträge des eigenen Kindes.
6. Text bricht auf einem schmalen Handy nicht um in unlesbare Zeilen; Karte folgt dem Stil der
   umliegenden Eltern-Karten.

---

# Paket 2 · Codex in Kindersprache (Buchstabe R)

## Warum

Der Fairplay-Codex spricht die Eltern an — elf Punkte, in Erwachsenensprache, im Eltern-Bereich.
Für die Kinder gibt es nichts Vergleichbares. In der Kabine steht nirgends, wofür diese Mannschaft
steht. Ein Achtjähriger, der gefragt wird, was bei den Adlern gilt, hat keine Antwort.

## Was entsteht

Eine neue Kachel in der Kabine, Gruppe **Team & Spaß**, mit der Bezeichnung **„Unsere Regeln"**
(Emoji 🤝). Sie zeigt **höchstens sechs kurze Sätze**, die ein Achtjähriger aufsagen kann. Sie
sind keine Kurzfassung des Elterncodex, sondern dessen Gegenstück aus Kindersicht.

Startinhalt, vom Trainerteam änderbar:

1. Jeder spielt.
2. Wir jubeln für jedes Tor — auch für das vom anderen.
3. Wer verliert, gibt trotzdem die Hand.
4. Erst geht's nicht. Dann geht's.
5. Der Schiri hat recht.
6. Wir räumen gemeinsam auf.

Satz 4 ist der Zuruf aus dem Trainerkonzept. Er gehört hierher, weil die Kinder ihn ohnehin
kennen.

Darstellung wie die übrigen Kabinen-Ansichten: großer Text, viel Luft, ein Satz je Zeile, kein
Fließtext. Keine Verbote in Negativform, wenn eine positive Formulierung möglich ist.

## Datenweg

Neue Tabelle `kinder_codex`: `id`, `nr` (Reihenfolge), `satz`, `aktiv`, `created_at`. **RLS
Pflicht:** Lesen für alle (der Inhalt ist unbedenklich und enthält keine personenbezogenen Daten),
Schreiben nur für angemeldete Trainer. Ein JS-Fallback mit denselben sechs Sätzen sorgt dafür,
dass die Ansicht auch offline steht — Muster wie bei den übrigen trainerpflegbaren Inhalten.

Pflege im Trainerbereich, Kachel **Eltern & Kinder**, direkt neben der Kabinen-Wahl: Liste mit
Sortierung, Satz bearbeiten, aktiv schalten. Der Editor liest und schreibt **alle** Spalten —
sonst ist nach dem Speichern eine Spalte für alle Zeilen leer (bekannte Falle, siehe `CLAUDE.md`).

## Abnahmekriterien

1. Kachel „Unsere Regeln" erscheint in der Kabine in der Gruppe Team & Spaß.
2. Ohne Netz stehen die sechs Sätze trotzdem (JS-Fallback).
3. Der Trainer kann Sätze ändern, umsortieren und deaktivieren; nach dem Speichern ist keine
   Spalte leer.
4. Mit dem anonymen Schlüssel ist die Tabelle lesbar, aber nicht beschreibbar.
5. Höchstens sechs aktive Sätze — mehr lässt der Editor nicht zu, mit Hinweis statt Fehlermeldung.
6. Schriftgröße und Zeilenabstand entsprechen den übrigen Kabinen-Ansichten; lesbar für ein Kind,
   das gerade flüssig lesen lernt.

---

# Paket 3 · Nettospielzeit und Blocktypen

## Warum

Die Trainingsphilosophie Deutschland fordert für Entwicklungsspieler der Jahrgänge U8 bis U16
**mindestens 48 Minuten Nettospielzeit pro Woche**. Ihr Idealraster ist die „Beste
Trainingseinheit" mit 15 Minuten Warm-up, 30 Minuten Spielblock, 15 Minuten Zwischenblock und
30 Minuten Spielblock — also 90 Minuten.

Wir haben keine 90 Minuten. Unsere Einheiten dauern 75 Minuten brutto, montags und freitags von
16:45 bis 18:00 Uhr, und netto bleiben davon 35 bis 40 Minuten. **Das ist kein Widerspruch zur
Trainingsphilosophie, sondern ihre Anwendung auf unsere Platzzeit:** Zwei Einheiten pro Woche
erfüllen die 48 Minuten mit Reserve, eine allein nicht.

Prüfen kann die App das heute nicht. Die Vorlagen tragen zwar ein Feld `netto_spielform_min`,
aber Spielform und Übungsform laufen beide als Blocktyp `main`. Die App weiß also nicht, welcher
Block welcher ist, kann die Nettospielzeit nicht ausrechnen und die Woche nicht gegen die 48
halten.

## Was entsteht

**1. Blocktypen.** `typ` bekommt die Werte `spielform` und `uebungsform`. `main` bleibt gültig und
wird wie `spielform` gewertet — bestehende Vorlagen und Pläne ändern sich dadurch nicht. `warmup`
und die übrigen Typen bleiben, wie sie sind.

**2. Nettospielzeit je Einheit.** Die App summiert die Dauer der Spielform-Blöcke und zeigt die
Zahl im Trainingsplan an: „Spielform: 38 Minuten". Keine Ampel, keine Wertung, keine Sollvorgabe
je Einheit — eine einzelne Einheit muss die 48 nicht erreichen.

**3. Wochenstand.** In der Wochenansicht der Trainingsplanung steht die Summe der
Spielform-Minuten aller Einheiten dieser Woche, daneben der Richtwert. Liegt die Woche darunter,
erscheint eine ruhige Zeile: „Diese Woche 41 von 48 Minuten Spielform." Kein Rot, kein
Ausrufezeichen — es ist eine Erinnerung, keine Warnung. Dasselbe Muster wie der Lückenhinweis im
Tagebuch.

Der Richtwert gehört in die Team-Konfiguration, nicht in den Code: Ab U17 sind es 32, und die
Mannschaft wird älter.

## Was ausdrücklich nicht entsteht

- **Kein neues Phasenraster.** Straßenfußball-Fenster, Warm up Adler, drei Stufen auf einem
  Aufbau, Abschlussturnier, Abbauen — das steht im Ausbildungskonzept und lässt sich mit den
  vorhandenen Blöcken abbilden. Die Trainingsphilosophie schreibt keine Reihenfolge vor, sondern
  Nettominuten und Spielformen.
- **Keine vorgeschriebene Reihenfolge von Übungs- und Spielform.** Dass der Zwischenblock die
  Übungsform ist, steht so nicht im DFB-Blatt; es ist die Auslegung aus dem Lehrgang. Die App
  erlaubt beide Typen an jeder Stelle.
- **Keine Bewertung der Einheit.** Die Zahl steht da, sie urteilt nicht.

## Abnahmekriterien

1. Eine bestehende Vorlage mit Blöcken vom Typ `main` lädt unverändert und wird als Spielform
   gewertet.
2. Eine Vorlage mit `uebungsform` lädt, der Block erscheint im Trainingsplan und ist als
   Übungsform erkennbar — Kennzeichnung nicht allein über Farbe.
3. Die Nettospielzeit einer Einheit entspricht der Summe der Spielform-Blöcke; Übungsform,
   Warm-up und Abschluss zählen nicht hinein.
4. Der Wochenstand summiert alle Einheiten der Kalenderwoche und vergleicht mit dem Wert aus der
   Team-Konfiguration, Standard 48.
5. Liegt die Woche darunter, erscheint der Hinweis; darüber erscheint kein Lob.
6. Der Richtwert lässt sich in der Team-Konfiguration ändern, ohne Codeänderung.
7. Import: Ein JSON mit `typ: "uebungsform"` wird angenommen, eines mit unbekanntem Typ mit der
   bekannten Fehlermeldung abgewiesen — und zwar **bevor** etwas geschrieben wird.

## Testfälle

- `main` und `spielform` ergeben dieselbe Nettozahl.
- Eine Einheit aus Warm-up 15, Übungsform 15, Spielform 30 ergibt 30 Nettominuten, nicht 60.
- Zwei Einheiten mit je 24 Minuten ergeben einen Wochenstand von 48 und keinen Hinweis; zwei mit
  je 20 ergeben 40 und einen Hinweis.
- Ein Richtwert von 32 in der Team-Konfiguration verschiebt die Schwelle entsprechend.

## Vor dem Bauen klären

Kann der Trainingsplan einen zusätzlichen Blocktyp überhaupt anzeigen? Nach der Regel aus
`entscheidungen.md` gilt: Ein geschriebener Datensatz ist erst dann gut, wenn die Ansicht ihn auch
zeigen kann. Wenn die Anzeige es nicht hergibt, gehört ihr Umbau in dieses Paket — oder das Paket
wird zurückgestellt.

---

## Pflichten für alle Pakete (aus `CLAUDE.md`)

- Neue Dateien in `PRECACHE`, beide Loader und `MODUL_WACHE`; neue Tabellen in die
  Backup-Funktion.
- RLS für jede neue Tabelle, Migration unter `supabase/`.
- `node --check` über alle Dateien, `node tests/run.js` grün, danach `sw.js` hochzählen.
- Je Paket eine neue Prüfdatei in `tests/checks/`.
- Hilfe und Rundgang mitziehen — für Eltern die neue Karte, für Trainer die Codex-Pflege und die
  Nettospielzeit.
- Typografische Anführungszeichen, keine Kindernamen, keine Schlüssel.

## Ausdrücklich nicht in diesen Paketen

Keine Bewertungszahlen für Eltern oder Kinder. Keine Ranglisten. Keine Push-Benachrichtigung zur
neuen Karte — sie soll gefunden werden, nicht drängen. Kein freier Text für Kinder. Keine Ampel
und kein Lob bei der Nettospielzeit.
