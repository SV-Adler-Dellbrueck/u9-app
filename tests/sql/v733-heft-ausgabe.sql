\set ON_ERROR_STOP 0
insert into profiles values ('00000000-0000-0000-0000-00000000000a','trainer'),('00000000-0000-0000-0000-00000000000b','parent');
insert into eltern_kinder values ('eltern@example.org',1);
insert into kind_konto values ('00000000-0000-0000-0000-00000000000c',1,true);
insert into kader values (1,'Kind A',6,false,'2018-05-01',true,'rechts','flitzer_r','1/a.jpg',true),(2,'Kind B',7,false,'2018-01-01',true,null,null,null,false),(3,'Kind C Zweitname',8,true,null,true,null,null,null,false);
insert into kind_fanfacts(spieler_id,spitzname,lieblingsverein,nummer_grund,gallery_optin,hobby) values (1,'Flitzi','Testverein','geheim',true,'Eishockey');
insert into termine values (72,'turnier','2026-10-03','Kinderfestival','Teststr. 1',null,'funino','Testgegner','10:15','11:30',false,'09:30'),(80,'turnier','2026-10-10','Turnier Zwei',null,null,null,null,'10:00',null,false,'09:30');
insert into nominierungen values ('2026-10-03__nom','{"1":"verletzt","2":"dabei","3":"dabei"}'),('2026-10-03__teams','{"1":"1","2":"1","3":"2","_anzahl":2,"_trainer":{"1":["Trainer X"],"2":["Trainer Y"]}}');
insert into match_actions values (40,'2026-10-03','Kind A','kapitaen'),(41,'2026-10-03__t2','Kind C Zweitname','kapitaen');
insert into turnier_spiele(datum,gegner,tore,gegentore) values ('2026-10-03','Gegner 1',2,1),('2026-10-03__t2','Gegner 2',0,0);
insert into termin_media values (101,72,'72/a.jpg'),(102,72,'72/b.jpg');
insert into kabine_reporter values (1,1,'Frage frei?','Ja',true),(2,1,'Frage nicht frei?','Nein',false);
set role authenticated;
\echo '--- Trainer legt zwei Ausgaben an'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000a","email":"trainer@example.org"}';
insert into heft_ausgabe(nummer,termin_id,schlagzeile,tag_quellen,foto_ids,portraet_spieler_id,status) values (1,72,'Erste','Quelle X','{102,101}',1,'veroeffentlicht');
insert into heft_ausgabe(nummer,termin_id,schlagzeile,status) values (2,72,'Zweite','entwurf');
\echo '--- Nummer doppelt (muss scheitern)'
insert into heft_ausgabe(nummer) values (1);
\echo '--- 7 Fotos (muss scheitern)'
insert into heft_ausgabe(nummer,foto_ids) values (3,'{1,2,3,4,5,6,7}');
\echo '--- 3 Privatfotos (muss scheitern)'
insert into heft_ausgabe(nummer,portraet_privatfotos) values (3,'[{"pfad":"a","einverstanden":true},{"pfad":"b","einverstanden":true},{"pfad":"c","einverstanden":true}]');
\echo '--- Privatfoto ohne Einverständnis (muss scheitern)'
insert into heft_ausgabe(nummer,portraet_privatfotos) values (3,'[{"pfad":"a","unterschrift":"x"}]');
\echo '--- Schlagzeile 41 Zeichen (muss scheitern)'
insert into heft_ausgabe(nummer,schlagzeile) values (3,repeat('x',41));
update heft_ausgabe set titelbild_pfad='1/titel.jpg', audio_pfad='1/audio.mp3', portraet_privatfotos='[{"pfad":"1/p1.jpg","unterschrift":"Beim Sport","einverstanden":true}]' where nummer=1;
update heft_ausgabe set titelbild_pfad='2/titel.jpg' where nummer=2;
select nummer, status, veroeffentlicht_am is not null pub from heft_ausgabe order by 1;
\echo '--- Trainer: Liste / Medien Entwurf'
select count(*) trainer_liste from heft_ausgaben_liste();
select count(*) trainer_medien_entwurf from heft_medien((select id from heft_ausgabe where nummer=2));
reset role; insert into storage.objects(bucket_id,name) values ('heft_media','1/titel.jpg'),('heft_media','2/titel.jpg'),('heft_media','1/p1.jpg'); set role authenticated;
\echo '=== Eltern'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000b","email":"eltern@example.org"}';
select count(*) eltern_tabelle_direkt from heft_ausgabe;
select nummer from heft_ausgaben_liste();
select heft_ausgabe_lesen((select 2)) is null as entwurf_unsichtbar;
select art, bucket, pfad, unterschrift from heft_medien(1);
select count(*) eltern_medien_entwurf from heft_medien(2);
select name from storage.objects where bucket_id='heft_media' order by 1;
select (heft_ausgabe_lesen(1)->'ausgabe') ? 'tag_quellen' as quellen_drin, heft_ausgabe_lesen(1)::text ilike '%Quelle X%' quellen_text, heft_ausgabe_lesen(1)::text ilike '%geheim%' nummer_grund_drin, heft_ausgabe_lesen(1)::text ilike '%Flitzi%' spitzname_drin, heft_ausgabe_lesen(1)::text ilike '%2018-05-01%' geb_drin;
select jsonb_pretty(heft_ausgabe_lesen(1)->'teams') teams;
select heft_ausgabe_lesen(1)->'ergebnisse' erg, heft_ausgabe_lesen(1)->'portraet'->'reporter' rep, heft_ausgabe_lesen(1)->'portraet'->>'jahrgang' jg, heft_ausgabe_lesen(1)->'naechster'->>'datum' nae;
\echo '--- Eltern schreiben (muss scheitern / 0 Zeilen)'
insert into heft_ausgabe(nummer) values (9);
update heft_ausgabe set schlagzeile='x';
insert into storage.objects(bucket_id,name) values ('heft_media','x.jpg');
\echo '=== Kinder-Konto'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000c"}';
select nummer kind_liste from heft_ausgaben_liste();
select count(*) kind_medien from heft_medien(1);
\echo '=== Fremdes Konto (angemeldet, kein Mitglied)'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000d","email":"fremd@example.org"}';
select count(*) fremd_liste from heft_ausgaben_liste(); select count(*) fremd_medien from heft_medien(1); select heft_ausgabe_lesen(1) is null fremd_lesen_null;
select count(*) fremd_storage from storage.objects where bucket_id='heft_media';
reset role; set role anon; set request.jwt.claims='{}';
\echo '=== anon'
select count(*) from heft_ausgabe;
select count(*) from heft_medien(1);
select * from heft_ausgaben_liste();
