-- v736 · Adler-Ruf: 5.000 Zeichen und Anhänge (nach Attrappe, v670, v674 und v736 einspielen)
\set ON_ERROR_STOP 0
insert into profiles values ('00000000-0000-0000-0000-00000000000a','trainer','Trainer X'),('00000000-0000-0000-0000-00000000000b','parent',null),('00000000-0000-0000-0000-00000000000f','parent',null);
insert into eltern_kinder values ('eltern@example.org',1),('andere@example.org',2);
insert into kader(id,name,nr) values (1,'Kind A',6),(2,'Kind B',7);
insert into rufe_raum(id,name,emoji,sort) overriding system value values (1,'Allgemein','📣',0) on conflict (id) do nothing;
-- private Räume der beiden Familien (wie rufe_privat_raum)
insert into rufe_raum(id,name,emoji,sort,familie_kind) overriding system value values (11,'Trainerteam','🔒',1000,1),(12,'Trainerteam','🔒',1000,2);
set role authenticated;
\echo '=== Familie A (Kind A)'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000b","email":"eltern@example.org"}';
\echo '--- 5.000 Zeichen gehen, 5.001 nicht'
select rufe_senden(1, repeat('x',5000)) is not null as ruf_5000;
select rufe_senden(1, repeat('x',5001));
\echo '--- Hochladen: offener Raum und eigener privater Raum gehen'
insert into storage.objects(bucket_id,name,owner,owner_id) values
  ('rufe-anhang','1/11111111-1111-4111-8111-111111111111.png','00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000b'),
  ('rufe-anhang','11/22222222-2222-4222-8222-222222222222.pdf','00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000b'),
  ('rufe-anhang','11/33333333-3333-4333-8333-333333333333.docx','00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000b');
\echo '--- Hochladen in den Raum der anderen Familie (muss scheitern)'
insert into storage.objects(bucket_id,name,owner,owner_id) values ('rufe-anhang','12/44444444-4444-4444-8444-444444444444.pdf','00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000b');
\echo '--- Pfad abc/x.pdf (muss scheitern)'
insert into storage.objects(bucket_id,name,owner,owner_id) values ('rufe-anhang','abc/x.pdf','00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000b');
\echo '--- Raum 999999 (muss scheitern)'
insert into storage.objects(bucket_id,name,owner,owner_id) values ('rufe-anhang','999999/55555555-5555-4555-8555-555555555555.pdf','00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000b');
\echo '--- .docm, .exe, .svg (müssen scheitern)'
insert into storage.objects(bucket_id,name,owner,owner_id) values ('rufe-anhang','1/66666666-6666-4666-8666-666666666666.docm','00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000b');
insert into storage.objects(bucket_id,name,owner,owner_id) values ('rufe-anhang','1/66666666-6666-4666-8666-666666666666.exe','00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000b');
insert into storage.objects(bucket_id,name,owner,owner_id) values ('rufe-anhang','1/66666666-6666-4666-8666-666666666666.svg','00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000b');
\echo '--- fremder Besitzer im Pfad (muss scheitern)'
insert into storage.objects(bucket_id,name,owner,owner_id) values ('rufe-anhang','1/77777777-7777-4777-8777-777777777777.pdf','00000000-0000-0000-0000-00000000000f','00000000-0000-0000-0000-00000000000f');
\echo '--- Ruf nur mit Anhang (Text „📎 Anhang“), offener Raum'
select rufe_senden(1, '', null, false, '[{"pfad":"1/11111111-1111-4111-8111-111111111111.png","name":"Bildschirmfoto.png","mime":"image/png","groesse":20480}]') as ruf_bild;
select left(text,20) text from rufe_nachricht where id=(select max(id) from rufe_nachricht);
\echo '--- privater Raum: PDF und DOCX mit gleichem Namen'
select rufe_senden(11, 'Formular', null, false, '[{"pfad":"11/22222222-2222-4222-8222-222222222222.pdf","name":"Anmeldung.pdf","mime":"application/pdf","groesse":1000},{"pfad":"11/33333333-3333-4333-8333-333333333333.docx","name":"Anmeldung.pdf","mime":"application/vnd.openxmlformats-officedocument.wordprocessingml.document","groesse":2000}]') as ruf_privat;
\echo '--- Senden mit einer Datei, die nie hochgeladen wurde (muss scheitern, kein halber Ruf)'
select count(*) rufe_vorher from rufe_nachricht;
select rufe_senden(1, 'halb', null, false, '[{"pfad":"1/88888888-8888-4888-8888-888888888888.pdf","name":"fehlt.pdf","mime":"application/pdf","groesse":10}]');
select count(*) rufe_nachher from rufe_nachricht;
\echo '--- fünf Anhänge (muss scheitern)'
select rufe_senden(1, 'fünf', null, false, (select jsonb_agg(jsonb_build_object('pfad','1/1111111'||g||'-1111-4111-8111-111111111111.png','name','a','mime','image/png','groesse',1)) from generate_series(1,5) g));
\echo '--- Makro-Mime in der Tabelle (muss scheitern)'
insert into storage.objects(bucket_id,name,owner,owner_id) values ('rufe-anhang','1/99999999-9999-4999-8999-999999999999.xlsx','00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000b');
select rufe_senden(1, 'makro', null, false, '[{"pfad":"1/99999999-9999-4999-8999-999999999999.xlsx","name":"t.xlsm","mime":"application/vnd.ms-excel.sheet.macroEnabled.12","groesse":10}]');
\echo '--- 11 MB (muss scheitern)'
select rufe_senden(1, 'gross', null, false, '[{"pfad":"1/99999999-9999-4999-8999-999999999999.xlsx","name":"t.xlsx","mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","groesse":11534336}]');
select count(*) eigene_anhaenge, count(distinct pfad) pfade from rufe_anhang;
\echo '--- Bearbeiten auf 5.000 geht, auf 5.001 nicht'
select rufe_bearbeiten((select min(id) from rufe_nachricht), repeat('y',5000)) as bearbeiten_5000;
select rufe_bearbeiten((select min(id) from rufe_nachricht), repeat('y',5001));
\echo '--- Anhang ändern (0 Zeilen) und löschen als Elternteil (0 Zeilen)'
update rufe_anhang set name='x';
delete from rufe_anhang;
select count(*) noch_da from rufe_anhang;
\echo '--- eigene verwaiste Datei wegräumen geht, vergebene nicht'
delete from storage.objects where name='1/99999999-9999-4999-8999-999999999999.xlsx' returning name as verwaist_weg;
delete from storage.objects where name='11/22222222-2222-4222-8222-222222222222.pdf' returning name as vergeben_weg;
\echo '=== Familie B (Kind B): fremder privater Raum'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000f","email":"andere@example.org"}';
select count(*) fremde_privat_anhaenge from rufe_anhang where raum_id=11;
select count(*) fremde_privat_dateien from storage.objects where bucket_id='rufe-anhang' and name like '11/%';
select count(*) offene_anhaenge from rufe_anhang where raum_id=1;
select count(*) offene_dateien from storage.objects where bucket_id='rufe-anhang' and name like '1/%';
reset role;
\echo '=== anon'
set role anon; set request.jwt.claims='{}';
select count(*) anon_tabelle from rufe_anhang;
select count(*) anon_dateien from storage.objects where bucket_id='rufe-anhang';
reset role; set role authenticated;
\echo '=== Trainer archiviert den Bild-Ruf'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000a","email":"t@example.org"}';
select rufe_archivieren((select nachricht_id from rufe_anhang where raum_id=1));
select count(*) trainer_sieht_archiv_anhang from rufe_anhang where raum_id=1;
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000b","email":"eltern@example.org"}';
select count(*) eltern_sieht_archiv_anhang from rufe_anhang where raum_id=1;
select count(*) eltern_sieht_archiv_datei from storage.objects where bucket_id='rufe-anhang' and name like '1/%';
\echo '--- Eltern löschen Anhänge (muss scheitern)'
select rufe_anhaenge_loeschen((select max(id) from rufe_nachricht where raum_id=11));
\echo '=== Trainer löscht Anhänge des privaten Rufs endgültig'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000a","email":"t@example.org"}';
select rufe_anhaenge_loeschen((select nachricht_id from rufe_anhang where raum_id=11 limit 1)) as pfade;
select count(*) anhaenge_privat_danach from rufe_anhang where raum_id=11;
select text, anhang_entfernt_am is not null entfernt from rufe_nachricht where raum_id=11;
delete from storage.objects where bucket_id='rufe-anhang' and name like '11/%' returning name as trainer_loescht_datei;
reset role;
\echo '=== Kind gelöscht: privater Raum fällt samt Anhangzeilen per CASCADE (Dateien räumt kind-loeschen ab)'
insert into storage.objects(bucket_id,name,owner_id) values ('rufe-anhang','11/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.pdf','00000000-0000-0000-0000-00000000000b');
insert into rufe_anhang(nachricht_id,raum_id,pfad,name,mime,groesse) select max(id),11,'11/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.pdf','x.pdf','application/pdf',1 from rufe_nachricht where raum_id=11;
delete from kader where id=1;
select count(*) anhaenge_raum_11 from rufe_anhang where raum_id=11;
