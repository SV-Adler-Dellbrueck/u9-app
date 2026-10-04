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

## v734 · Porträt-Ablauf

```bash
psql -d t -f tests/sql/supabase-attrappe.sql && psql -d t -f supabase/migrations/20261003_v733_adler_nest_ausgaben.sql \
  && psql -d t -f supabase/migrations/20261004_v734_portraet_ablauf.sql && psql -d t -f tests/sql/v734-portraet-ablauf.sql
```

Erwartet: Fristen für einen Spieltag am Samstag 10.10. auf Mi 07.10. und Fr 09.10., je 20:00; zweites offenes Porträt
desselben Kindes scheitert; Beteiligung „bei jedem Training dabei“ für 6/6 (auch mit Vornamen-Schlüssel), nichts für
5/6 bei 90 %, „fast jedem“ bei 80 %; Benachrichtigungen Montag 10 Uhr: Eltern-Anfrage und zwei Trainer-Hinweise, ein
zweiter Lauf nichts; Mittwoch 20:05 genau eine Eltern-Erinnerung; Freitag 8:30 genau eine Trainer-Erinnerung (nur an
den Trainer ohne Stichpunkte); nach Freitag 20 Uhr nichts. Eltern sehen nur die Einreichung ihres Kindes, keine
Trainerstimmen, können nicht direkt schreiben, laden nur unter `einreichung/<eigene id>/`; drei Fotos und fremde Pfade
scheitern; fremde Eltern bekommen nichts; ein Privatfoto ohne Einreichung lässt sich nicht in eine Ausgabe setzen;
Rückzug liefert beide Pfade und leert Einreichung und Ausgabe; Veröffentlichen setzt die Einreichung auf „übernommen“
(danach für Eltern unsichtbar); ein Trainer ändert keine fremde Stimme; `anon` bekommt nichts. Zehn Fehlermeldungen
im Lauf sind gewollt.

## v734 · Spielerkarten mit Zahlen

```bash
psql -d t -f tests/sql/supabase-attrappe.sql && psql -d t -f supabase/migrations/20261004_v734b_karten_zahlen.sql \
  && psql -d t -f tests/sql/v734-karten-zahlen.sql
```

Erwartet: Kind A 2 Trainings und 1 Spiel (Spieltag, Vorsaison, abgesagtes und künftiges Training zählen nicht,
Spiele nur aus `__nom`), Kind B 1 Training über den Vornamen-Schlüssel und 0 Spiele; Eltern von Kind A sehen auf
beiden Karten der Galerie Zahlen, Stärken nur auf der eigenen; `my_child_card` liefert dieselbe Zählung und bleibt für
fremde Kinder gesperrt; die Trainer-Galerie zählt gleich; `anon` bekommt eine leere Galerie, und die Zählfunktionen
scheitern (eine Fehlermeldung ist gewollt).

## v736 · Adler-Ruf: 5.000 Zeichen und Anhänge

```bash
psql -d t -f tests/sql/supabase-attrappe.sql && psql -d t -f supabase/migrations/20260929_v670_adler_rufe.sql \
  && psql -d t -f supabase/migrations/20260929_v674_rufe_privat_umfrage.sql \
  && psql -d t -f supabase/migrations/20261004_v736_rufe_anhaenge.sql && psql -d t -f tests/sql/v736-rufe-anhaenge.sql
```

Erwartet: Ruf mit 5.000 Zeichen geht, 5.001 nicht (Senden und Bearbeiten); Hochladen in offenen und eigenen privaten
Raum geht; fremder privater Raum, `abc/x.pdf`, Raum 999999, `.docm`/`.exe`/`.svg` und fremder Besitzer scheitern; Ruf nur
mit Anhang trägt „📎 Anhang“; zwei Anhänge gleichen Namens kollidieren nicht; eine nie hochgeladene Datei, fünf
Anhänge, Makro-Mime und 11 MB scheitern ohne halben Ruf; Eltern ändern und löschen keine Anhänge, räumen aber die
eigene verwaiste Datei weg (die vergebene nicht); eine andere Familie sieht weder Zeile noch Datei des privaten Raums;
`anon` bekommt nichts; nach dem Archivieren sieht der Trainer den Anhang, Eltern nicht; Eltern können Anhänge nicht
endgültig löschen, der Trainer schon (Ruf bleibt mit `anhang_entfernt_am`), und er löscht die Dateien; wird ein Kind
gelöscht, fallen privater Raum und Anhangzeilen per CASCADE (die Dateien räumt `kind-loeschen` ab). 15 Fehlermeldungen
im Lauf sind gewollt.
