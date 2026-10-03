# Rechte-Prüfung gegen ein echtes Postgres

Die Prüfungen in `tests/checks/` ersetzen Supabase durch eine Attrappe – Row-Level-Security lässt sich dort
nicht prüfen. Für Migrationen mit neuen Regeln liegt hier ein Lauf gegen ein lokales Postgres 16:

- `supabase-attrappe.sql` baut das Nötigste nach: Rollen `anon`/`authenticated`, `auth.uid()`/`auth.jwt()` aus
  `request.jwt.claims`, `storage.objects` mit RLS und die Tabellen und Hilfsfunktionen, auf die sich die
  Migration stützt (`is_trainer`, `ist_mitglied`, `sitzung_gueltig`).
- `v733-heft-ausgabe.sql` spielt Trainer, Eltern, Kinder-Konto, fremdes Konto und `anon` durch.

```bash
createdb t && psql -d t -f tests/sql/supabase-attrappe.sql \
  && psql -d t -f supabase/migrations/20261003_v733_adler_nest_ausgaben.sql \
  && psql -d t -f tests/sql/v733-heft-ausgabe.sql
```

Erwartet (Stand v733): Trainer legt zwei Ausgaben an; doppelte Nummer, 7 Fotos, 3 Privatfotos, Privatfoto ohne
Einverständnis und eine Schlagzeile über 40 Zeichen scheitern; Eltern lesen die Tabelle nicht direkt (0 Zeilen),
sehen über `heft_ausgaben_liste` nur Ausgabe 1, `heft_medien(2)` (Entwurf) liefert nichts, im Speicher nur die
Dateien der veröffentlichten Ausgabe; `tag_quellen`, `nummer_grund`, Spitzname und Geburtsdatum fehlen in
`heft_ausgabe_lesen`; das als verletzt gemeldete Kind fehlt in der Teamliste; Schreiben scheitert für Eltern;
das Kinder-Konto liest wie Eltern; fremdes Konto und `anon` bekommen nichts.
