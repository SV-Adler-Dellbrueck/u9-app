-- v789 · Anhänge am Termin (nach Attrappe und Migration 20261105_v789_termin_anhang.sql einspielen)
\set ON_ERROR_STOP 0
insert into profiles values ('00000000-0000-0000-0000-00000000000a','trainer','Trainer X'),('00000000-0000-0000-0000-00000000000b','parent',null);
insert into termine(id,typ,datum,titel) values (1,'spiel','2026-11-14','Spilldaach'),(2,'trainermeeting','2026-11-10','Meeting');
-- wie in Produktion: Trainermeetings sieht nur das Trainerteam
alter table termine enable row level security;
create policy termine_read on termine for select using (typ <> 'trainermeeting' or is_trainer());
\echo '=== Trainer'
set role authenticated;
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000a","email":"t@example.org"}';
\echo '--- hochladen: PNG und PDF gehen'
insert into storage.objects(bucket_id,name,owner,owner_id) values
 ('termin-anhang','1/11111111-1111-4111-8111-111111111111.png','00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000a'),
 ('termin-anhang','1/22222222-2222-4222-8222-222222222222.pdf','00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000a');
\echo '--- docx, svg, falscher Pfad, unbekannter Termin (müssen scheitern)'
insert into storage.objects(bucket_id,name,owner,owner_id) values ('termin-anhang','1/33333333-3333-4333-8333-333333333333.docx','00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000a');
insert into storage.objects(bucket_id,name,owner,owner_id) values ('termin-anhang','1/33333333-3333-4333-8333-333333333333.svg','00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000a');
insert into storage.objects(bucket_id,name,owner,owner_id) values ('termin-anhang','abc/x.pdf','00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000a');
insert into storage.objects(bucket_id,name,owner,owner_id) values ('termin-anhang','999/44444444-4444-4444-8444-444444444444.pdf','00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000a');
\echo '--- Zeilen anlegen: zwei gehen'
insert into termin_anhang(termin_id,pfad,titel,name,mime,groesse) values
 (1,'1/11111111-1111-4111-8111-111111111111.png','Spielplan der Gastgeber','spielplan.png','image/png',1234),
 (1,'1/22222222-2222-4222-8222-222222222222.pdf','Anfahrt','anfahrt.pdf','application/pdf',2345);
\echo '--- Zeile ohne hochgeladene Datei (muss scheitern)'
insert into termin_anhang(termin_id,pfad,titel,name,mime,groesse) values (1,'1/55555555-5555-4555-8555-555555555555.png','x','x.png','image/png',10);
\echo '--- Pfad passt nicht zum Termin (muss scheitern)'
insert into termin_anhang(termin_id,pfad,titel,name,mime,groesse) values (2,'1/11111111-1111-4111-8111-111111111111.png','x','x.png','image/png',10);
\echo '--- dritter geht, vierter nicht'
insert into storage.objects(bucket_id,name,owner,owner_id) values ('termin-anhang','1/66666666-6666-4666-8666-666666666666.jpg','00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000a'),('termin-anhang','1/77777777-7777-4777-8777-777777777777.jpg','00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000a');
insert into termin_anhang(termin_id,pfad,titel,name,mime,groesse) values (1,'1/66666666-6666-4666-8666-666666666666.jpg','Dritter','c.jpg','image/jpeg',10);
insert into termin_anhang(termin_id,pfad,titel,name,mime,groesse) values (1,'1/77777777-7777-4777-8777-777777777777.jpg','Vierter','d.jpg','image/jpeg',10);
\echo '--- Trainer liest 3 Zeilen und 4 Dateien'
select count(*) as zeilen from termin_anhang;
select count(*) as dateien from storage.objects where bucket_id='termin-anhang';
reset role;
\echo '=== Eltern'
set role authenticated;
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000b","email":"eltern@example.org"}';
\echo '--- liest 3 Zeilen und die drei vergebenen Dateien (nicht die vierte, nie vergebene)'
select count(*) as zeilen from termin_anhang;
select count(*) as dateien from storage.objects where bucket_id='termin-anhang';
\echo '--- schreiben, hochladen, löschen (müssen scheitern / 0 Zeilen)'
insert into termin_anhang(termin_id,pfad,titel,name,mime,groesse) values (1,'1/77777777-7777-4777-8777-777777777777.jpg','Eltern','e.jpg','image/jpeg',10);
insert into storage.objects(bucket_id,name,owner,owner_id) values ('termin-anhang','1/88888888-8888-4888-8888-888888888888.pdf','00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000b');
delete from termin_anhang;
delete from storage.objects where bucket_id='termin-anhang';
reset role;
select count(*) as zeilen_unveraendert from termin_anhang;
\echo '=== anon liest nichts'
set role anon;
select count(*) from termin_anhang;
select count(*) from storage.objects where bucket_id='termin-anhang';
reset role;
\echo '=== Trainermeeting-Termin: Anhang dort sehen Eltern nicht'
insert into storage.objects(bucket_id,name,owner,owner_id) values ('termin-anhang','2/99999999-9999-4999-8999-999999999999.pdf','00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000a');
insert into termin_anhang(termin_id,pfad,titel,name,mime,groesse) values (2,'2/99999999-9999-4999-8999-999999999999.pdf','Intern','i.pdf','application/pdf',10);
set role authenticated;
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000b","email":"eltern@example.org"}';
select count(*) as eltern_sehen_meeting_anhang from termin_anhang where termin_id=2;
select count(*) as eltern_sehen_meeting_datei from storage.objects where name like '2/%';
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000a","email":"t@example.org"}';
select count(*) as trainer_sehen_meeting_anhang from termin_anhang where termin_id=2;
reset role;
\echo '=== Trainer löscht: Zeile und Datei'
set role authenticated;
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000a","email":"t@example.org"}';
delete from termin_anhang where titel='Dritter';
delete from storage.objects where name='1/66666666-6666-4666-8666-666666666666.jpg';
select count(*) as zeilen_nach_loeschen from termin_anhang where termin_id=1;
