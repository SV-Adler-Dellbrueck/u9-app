-- v751 · Mein Training (nach Attrappe und v751 einspielen; siehe README)
\set ON_ERROR_STOP 0
create or replace function public.kind_zeit_uebrig() returns boolean language sql stable security definer set search_path to 'public' as $$ select coalesce((select aktiv from public.kind_konto where uid=auth.uid() limit 1),false) and coalesce(current_setting('test.zeit',true),'ja')='ja' $$;
insert into profiles values ('00000000-0000-0000-0000-00000000000a','trainer'),('00000000-0000-0000-0000-00000000000b','parent'),('00000000-0000-0000-0000-00000000000c','parent');
insert into eltern_kinder values ('eltern-a@example.org',1),('eltern-b@example.org',2);
insert into kader(id,name,nr,aktiv) values (1,'Kind A',6,true),(2,'Kind B',7,true);
insert into kind_konto values ('00000000-0000-0000-0000-0000000000d1',1,true);
set role authenticated;
\echo '=== Kindergerät A: eigenes Training geht (Übung + eigene Skizze)'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000d1","is_anonymous":true}';
insert into kind_training(spieler_id,teile) values (1,'[{"art":"aufwaermen","uebung":"Warm up Adler","minuten":10},{"art":"abschluss","brett":{"form":"leer","toks":[{"t":"wir","x":45,"y":100,"n":"Kind"}],"striche":[]},"minuten":15}]');
\echo '=== Kindergerät A: für Kind B (Fehler gewollt), Freitext-Feld statt Übung (Fehler gewollt), 31 Minuten (Fehler gewollt)'
insert into kind_training(spieler_id,teile) values (2,'[{"art":"uebung","uebung":"x","minuten":5}]');
insert into kind_training(spieler_id,teile) values (1,'[{"art":"uebung","text":"hallo","minuten":5}]');
insert into kind_training(spieler_id,teile) values (1,'[{"art":"uebung","uebung":"x","minuten":31}]');
\echo '=== Kindergerät A ohne Appzeit (Fehler gewollt)'
set test.zeit='nein';
insert into kind_training(spieler_id,teile) values (1,'[{"art":"uebung","uebung":"x","minuten":5}]');
set test.zeit='ja';
\echo '=== Kindergerät A: sieht 1, kann nicht als gesehen markieren (0 Zeilen)'
select count(*) eigene from kind_training;
update kind_training set gesehen_am=now();
select count(*) gesehen from kind_training where gesehen_am is not null;
\echo '=== Eltern B: sieht nichts von Kind A, schreibt für eigenes Kind'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000c","email":"eltern-b@example.org"}';
select count(*) sichtbar from kind_training;
insert into kind_training(spieler_id,teile) values (2,'[{"art":"uebung","uebung":"Stangentausch","minuten":5}]');
\echo '=== Trainer: sieht 2, markiert gesehen und Danke; ändern der Teile scheitert (Fehler gewollt)'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000a","email":"trainer@example.org"}';
select spieler_id, jsonb_array_length(teile) teile from kind_training order by spieler_id;
update kind_training set gesehen_am=now(), danke_am=now() where spieler_id=1;
update kind_training set teile='[{"art":"uebung","uebung":"y","minuten":5}]' where spieler_id=1;
\echo '=== Eltern A: sieht Danke beim eigenen Kind, löscht es'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000b","email":"eltern-a@example.org"}';
select spieler_id, danke_am is not null danke from kind_training;
delete from kind_training where spieler_id=1;
select count(*) nach_loeschen from kind_training;
\echo '=== Limit: 20 offene je Kind, das 21. scheitert (Fehler gewollt)'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000c","email":"eltern-b@example.org"}';
insert into kind_training(spieler_id,teile) select 2,'[{"art":"uebung","uebung":"x","minuten":5}]' from generate_series(1,19);
insert into kind_training(spieler_id,teile) values (2,'[{"art":"uebung","uebung":"x","minuten":5}]');
select count(*) offen_b from kind_training where spieler_id=2;
\echo '=== anon: nichts (Fehler gewollt)'
reset role; set role anon;
select count(*) from kind_training;
