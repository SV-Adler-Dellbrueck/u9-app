# Auftragspaket: Die beiden ADLER-Lücken schließen

Repo `SV-Adler-Dellbrueck/u9-app`, Stand 13.09.2026. Gilt zusammen mit `CLAUDE.md`.

Zwei kleine, unabhängige Pakete plus eine Kleinigkeit. Sie kommen nicht aus einem Funktionswunsch,
sondern aus einem Abgleich des Trainerkonzepts mit dem, was die App heute kann. Zwei Buchstaben
haben eine Lücke: **E** für die Eltern und **R** für die Kinder.

Beide Pakete dürfen einzeln umgesetzt und einzeln ausgeliefert werden.

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

# Kleinigkeit · Blocktyp für Übungsformen

In den Vorlagen (`adler-vorlagen/1`) laufen Übungsform und Spielform beide als Blocktyp `main`.
Die Unterscheidung ist im Lehrgang zentral — Spielform heißt: das Kind entscheidet selbst; die
App kann das heute weder anzeigen noch prüfen.

Vorschlag: `typ` um den Wert `uebung` erweitern, `main` bleibt für Spielformen. Der Import nimmt
beide an; bestehende Vorlagen bleiben unverändert gültig (`main` behält seine Bedeutung). In der
Anzeige eine schlichte Kennzeichnung, keine eigene Farbe.

**Erst klären, ob das im Trainingsplan überhaupt darstellbar ist** — nach der Regel aus
`entscheidungen.md`: Ein geschriebener Datensatz ist erst dann gut, wenn die Ansicht ihn auch
zeigen kann. Wenn nicht, ist dieses Paket kein Datenpaket, sondern ein Anzeigepaket, und dann
gehört der Umbau des Trainingsplans dazu oder die Idee wird zurückgestellt.

---

## Pflichten für beide Pakete (aus `CLAUDE.md`)

- Neue Dateien in `PRECACHE`, beide Loader und `MODUL_WACHE`; neue Tabellen in die
  Backup-Funktion.
- RLS für jede neue Tabelle, Migration unter `supabase/`.
- `node --check` über alle Dateien, `node tests/run.js` grün, danach `sw.js` hochzählen.
- Je Paket eine neue Prüfdatei in `tests/checks/`.
- Hilfe und Rundgang mitziehen — für Eltern die neue Karte, für Trainer die Codex-Pflege.
- Typografische Anführungszeichen, keine Kindernamen, keine Schlüssel.

## Ausdrücklich nicht in diesen Paketen

Keine Bewertungszahlen für Eltern oder Kinder. Keine Ranglisten. Keine Push-Benachrichtigung zur
neuen Karte — sie soll gefunden werden, nicht drängen. Kein freier Text für Kinder.
