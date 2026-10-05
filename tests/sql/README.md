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

## v739 · Spielerkarten Stufe 1 und Adler Wrapped

```bash
psql -d t -f tests/sql/supabase-attrappe.sql && psql -d t -f supabase/migrations/20261004_v734b_karten_zahlen.sql \
  && psql -d t -f supabase/migrations/20261004_v739_karten_stufe1.sql && psql -d t -f tests/sql/v739-karten-stufe1.sql
```

(Für `get_child_wrapped` braucht die Attrappe `kind_fanfacts.starker_fuss`, `punkte_log` und `federn_zaehlt` – siehe
`$SP/pg/lauf739.sh` bzw. die drei Zeilen vor der Migration.) Erwartet: `kind_fuss` nimmt den Trainerwert vor dem der Eltern
und versteht beide Schreibweisen; Spielminuten der Saison 150 (90 + 60 ohne Endzeit), 90 und 60 (Vornamen-Schlüssel),
Vorsaison und Zukunft zählen nicht; Eltern sehen in der Galerie bei allen Karten Stärken, Fuß und Position; die eigene
Karte trägt den Fuß der Eltern, wenn der Trainer keinen eingetragen hat; Wrapped 2 Spiele und 150 Minuten; fremdes Kind
im Wrapped verweigert; `anon` leer bzw. verweigert (eine Fehlermeldung gewollt).
## v740 · Adler-Rufe „Gesehen von …“

```bash
bash lauf740.sh   # Attrappe (+ profiles.anzeigename, eltern_angaben), v670, v673 bis vor den Cron-Teil, v674, v740 zweimal, dann:
psql -d r -f tests/sql/v740-rufe-gesehen.sql
```

Erwartet: Trainer sieht Ruf 1 „1 von 3“ (Elternteil A hat den Raum danach geöffnet, B vorher, B2 nie – der Absender
zählt nicht) und den Privatruf an Familie B „1 von 2“ (nur diese Familie); die Namensliste nennt Kind C als „ohne
Zugang“, im Privatraum nicht. Eltern bekommen aus beiden Funktionen nichts und lesen in `rufe_gelesen` nur die eigene
Zeile; `_rufe_empfaenger` und `anon` scheitern (zwei Fehlermeldungen sind gewollt).

## v743 · Fotoalbum je Kind

```bash
bash lauf743.sh   # Attrappe (+ Fan-Fakten-Fuß, punkte_log), v734b, v739, v743 zweimal, dann:
psql -d k -f tests/sql/v743-kind-fotoalbum.sql
```

Erwartet: Eltern von Kind A legen sechs Fotos an, das siebte scheitert; ein fremdes Kind, ein fremder Pfad, eine
fehlende Datei und das direkte Setzen des Kartenfotos scheitern; über `kind_foto_als_karte` wird ein Kartenfoto
gesetzt und der Zweck geändert. Eltern von Kind B sehen von Kind A nur das Kartenfoto, die Galerie zeigt es, Kind B
ohne Freigabe ohne Foto; ein Album-Foto ist für sie im Speicher nicht sichtbar, und sie dürfen kein Kartenfoto für
Kind A setzen. Die eigene Karte von Kind A zeigt das Kartenfoto; der Trainer sieht alle Fotos, löst das Kartenfoto,
dann zeigt die Galerie wieder das alte Profilfoto. `anon` scheitert. Sieben Fehlermeldungen sind gewollt.

## v744 · Sonderkarten

```bash
bash lauf744.sh   # wie lauf743, dazu v744 zweimal, dann:
psql -d k -f tests/sql/v744-sonderkarten.sql
```

Erwartet für Kind A: Momentkarte 03.10., Kapitän 03.10. (Adler 1, 2. Mal), Spieltag 03.10. (Adler 1, Spielform aus dem
Termin), Kapitän 26.09. (Adler 2, 1. Mal), Spieltag 26.09. (Adler 2, Spielform „funino“ aus `_form`, mit Trainer-Satz);
der Spieltag in der Zukunft fehlt. Fotos nach Zweck (Aktion, Porträt), die Momentkarte fällt mangels Jubelfoto auf das
Profilfoto zurück. Eltern sehen fremde Karten nicht und schreiben keine; das Kindergerät sieht nur die eigenen; Eltern
von Kind B sehen die Tabellenzeilen von Kind A nicht. `anon` scheitert. Zwei Fehlermeldungen sind gewollt.

## v745 · Sonderkarten für alle

```bash
bash lauf745.sh   # wie lauf744, dazu v745, dann:
psql -d k -f tests/sql/v745-sonderkarten-alle.sql
```

Erwartet: wie v744 für das eigene Kind (Fotos nach Zweck aus dem Album). Eltern von Kind A sehen jetzt auch die Karten
von Kind B (Spieltag 26.09., Kapitän 03.10.), ohne Foto, weil Kind B keine Freigabe hat; das Kindergerät von Kind A
sieht 5 eigene und 2 fremde Karten. Eltern von Kind B sehen die Tabelle `sonderkarte` weiter nicht, bekommen aber die
Karten von Kind A samt Trainer-Satz – mit dem Profilfoto statt der Album-Fotos (Kind A hat Freigabe). `anon` scheitert.
Zwei Fehlermeldungen sind gewollt.

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

## v751 · Mein Training (kind_training)

```bash
bash lauf751.sh   # Attrappe (+ kind_zeit_uebrig), v751 zweimal, dann:
psql -d k -f tests/sql/v751-kind-training.sql
```

Erwartet: Das Kindergerät von Kind A schickt ein Training (Übung und eigene Skizze); für Kind B, mit Freitext
statt Übung, mit 31 Minuten und ohne Appzeit scheitert es. Das Kind sieht sein eines Training und kann es nicht als
gesehen markieren. Eltern B sehen nichts von Kind A und schicken für das eigene Kind. Der Trainer sieht beide,
markiert gesehen und Danke, kann die Teile aber nicht ändern. Eltern A sehen das Danke und löschen. Das 21.
ungelesene Training eines Kindes scheitert; `anon` bekommt nichts. Sieben Fehlermeldungen sind gewollt.

## v755 · Sprachlob gehört (kabine_lob.gehoert_am)

```bash
bash lauf755.sh   # Attrappe (+ kabine_lob mit Rechten wie v660), v755 zweimal, dann:
psql -d k -f tests/sql/v755-lob-gehoert.sql
```

Erwartet: Das Kindergerät von Kind A markiert ein eigenes Lob als gehört (1 Zeile), das von Kind B nicht (0 Zeilen);
den Pfad ändern scheitert, löschen findet nichts. Eltern B sehen nur Kind B und markieren dort. Der Trainer sieht alle
drei und kann den Pfad nicht ändern. `anon` sieht und ändert nichts. Drei Fehlermeldungen sind gewollt.

## v757 · Stärken manuell und tw_prio (kader.staerken_manuell)

```bash
bash lauf757.sh   # Attrappe (+ tw_prio, Nachbildung von team_gallery_kind und my_child_card), v757 zweimal, dann:
psql -d k -f tests/sql/v757-staerken-torwart.sql
```

Erwartet: Eine Auswahl geht bei `staerken_von` vor, eine leere Auswahl fällt auf die Berechnung zurück; vier Schlüssel, ein Freitext und ein Nicht-Array scheitern an der Prüfung (drei Fehlermeldungen gewollt). Die umgeschriebenen Karten-Funktionen liefern `tw_prio` (Rang 2, 1, 0 wie gesetzt); ein zweiter Lauf der Migration ändert nichts.

## v760 · Sprachlob-Push (lob_push_faellig, lob_push_log)

```bash
bash lauf760.sh   # Attrappe (+ kabine_lob wie v755), v760 zweimal, dann:
psql -d k -f tests/sql/v760-lob-push.sql
```

Erwartet: Von zwei Lobs (vor 5 Tagen, gestern) wird nur das von gestern an beide Elternkonten von Kind A gemeldet (2 Zeilen, nur der Vorname im Text); ein zweiter Lauf liefert nichts. Ein neues Lob für Kind B bleibt offen, solange dessen Eltern keine Benachrichtigungen haben, und geht beim Einschalten genau einmal raus. Ruht ein Konto (Ruhezeit), bekommen es die anderen sofort und das ruhende nachträglich. Drei Tage später verfällt Offenes. Das Protokoll hat 5 Zeilen. `authenticated` und `anon` dürfen weder Funktion noch Protokoll (vier Fehlermeldungen gewollt).
