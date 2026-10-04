-- v740 · Adler-Rufe „Gesehen von …“ (nach Attrappe, v670, v673 bis vor den Cron-Teil, v674 und v740 einspielen; siehe README)
\set ON_ERROR_STOP 0
insert into auth.users values ('00000000-0000-0000-0000-00000000000a','trainer@example.org'),('00000000-0000-0000-0000-00000000000b','eltern-a@example.org'),
  ('00000000-0000-0000-0000-00000000000c','eltern-b@example.org'),('00000000-0000-0000-0000-00000000000d','eltern-b2@example.org');
insert into profiles(id,role,anzeigename) values ('00000000-0000-0000-0000-00000000000a','trainer','Testa'),('00000000-0000-0000-0000-00000000000b','parent',null),
  ('00000000-0000-0000-0000-00000000000c','parent',null),('00000000-0000-0000-0000-00000000000d','parent',null);
insert into eltern_angaben values ('00000000-0000-0000-0000-00000000000b','Mama A');
insert into kader(id,name,nr,aktiv) values (1,'Kind A',6,true),(2,'Kind B',7,true),(3,'Kind C',8,true);
-- Kind C: Familie ohne Konto; Kind B: zwei Elternkonten
insert into eltern_kinder values ('eltern-a@example.org',1),('eltern-b@example.org',2),('eltern-b2@example.org',2),('eltern-c@example.org',3);
insert into rufe_raum(id,name,familie_kind) overriding system value values (2,'Privat B',2) on conflict do nothing;
-- der Insert-Trigger setzt Absender und Zeit aus der Sitzung: als Trainer schreiben, Zeit danach festlegen
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000a","email":"trainer@example.org"}';
insert into rufe_nachricht(id,raum_id,text) overriding system value values (1,1,'Training fällt aus'),(2,2,'Privat an B');
update rufe_nachricht set created_at='2026-10-04 10:00+02';
-- Eltern A hat Raum 1 danach geöffnet, Eltern B vorher, B2 nie; Privatraum: B danach
insert into rufe_gelesen values ('00000000-0000-0000-0000-00000000000b',1,'2026-10-04 11:00+02'),('00000000-0000-0000-0000-00000000000c',1,'2026-10-04 09:00+02'),
  ('00000000-0000-0000-0000-00000000000c',2,'2026-10-04 12:00+02');
set role authenticated;
\echo '=== Trainer: Zahlen (erwartet Ruf 1: 1 von 3, Ruf 2: 1 von 2)'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000a","email":"trainer@example.org"}';
select * from rufe_gesehen_zahlen('{1,2}') order by 1;
\echo '=== Trainer: Namen zu Ruf 1 (Mama A gesehen, B und B2 nicht, Kind C ohne Zugang)'
select name, trainer, gesehen, zuletzt is not null zeit, ohne_zugang from rufe_gesehen(1) order by ohne_zugang, gesehen desc, name;
\echo '=== Trainer: Privatraum B – nur die Familie, keine Kinder ohne Zugang'
select name, gesehen, ohne_zugang from rufe_gesehen(2) order by name;
\echo '=== Eltern: leer (keine Lesebestätigung für Eltern)'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000b","email":"eltern-a@example.org"}';
select count(*) eltern_zahlen from rufe_gesehen_zahlen('{1}'); select count(*) eltern_namen from rufe_gesehen(1);
\echo '=== Eltern: die Tabelle zeigt nur die eigene Zeile, die Hilfsfunktion ist gesperrt (muss scheitern)'
select count(*) eigene_zeilen from rufe_gelesen;
select * from _rufe_empfaenger(1);
reset role;
\echo '=== Anonym: gesperrt (muss scheitern)'
set role anon; set request.jwt.claims='{}';
select * from rufe_gesehen(1);
reset role;
