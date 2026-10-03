-- v734 · Porträt-Ablauf: Einreichung, Trainerstimmen, Beteiligung, Benachrichtigungen (nach v733 und v734 einspielen)
\set ON_ERROR_STOP 0
insert into profiles values ('00000000-0000-0000-0000-00000000000a','trainer'),('00000000-0000-0000-0000-00000000000e','trainer'),('00000000-0000-0000-0000-00000000000b','parent'),('00000000-0000-0000-0000-00000000000f','parent');
insert into auth.users values ('00000000-0000-0000-0000-00000000000b','eltern@example.org'),('00000000-0000-0000-0000-00000000000f','andere@example.org'),('00000000-0000-0000-0000-00000000000a','t1@example.org'),('00000000-0000-0000-0000-00000000000e','t2@example.org');
insert into eltern_kinder values ('eltern@example.org',1),('andere@example.org',2);
insert into push_subscriptions values ('p-b','00000000-0000-0000-0000-00000000000b'),('p-a','00000000-0000-0000-0000-00000000000a'),('p-e','00000000-0000-0000-0000-00000000000e');
insert into kader(id,name,nr) values (1,'Kind A',6),(2,'Kind B',7),(3,'Testa',8);
insert into termine(id,typ,datum,titel) values (90,'turnier','2026-10-10','Testturnier'),(91,'spiel','2026-10-17','Testspiel');
-- Trainings der Saison mit Anwesenheit: Kind A 6/6, Kind B 5/6, Testa (Vorname als Schlüssel wie im Juli) 6/6, Training 7 ohne Liste
insert into termine(id,typ,datum) select 100+g, 'training', to_char(date '2026-09-01' + g*3, 'YYYY-MM-DD') from generate_series(1,7) g;
insert into anwesenheit select to_char(date '2026-09-01' + g*3, 'YYYY-MM-DD'),
  jsonb_build_object('1', jsonb_build_object('da', true), '2', jsonb_build_object('da', g <> 3), 'Testa', jsonb_build_object('da', true)) from generate_series(1,6) g;
set role authenticated;
\echo '=== Trainer legt die Einreichung an'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000a"}';
select id, status, to_char(frist_eltern at time zone 'Europe/Berlin','Dy DD.MM. HH24:MI') frist_eltern, to_char(frist_trainer at time zone 'Europe/Berlin','Dy DD.MM. HH24:MI') frist_trainer from portraet_anfragen(1, 90);
\echo '--- zweimal dasselbe Kind (muss scheitern)'
select id from portraet_anfragen(1, 91);
\echo '--- Beteiligung: A jedes, B 5/6 (unter 90 %), Testa über Vornamen, 3 ohne Liste'
select portraet_beteiligung(1) a, portraet_beteiligung(2) b, portraet_beteiligung(3) testa;
update team_config set portraet_schwelle = 80;
select portraet_beteiligung(2) b_bei_80;
update team_config set portraet_schwelle = 90;
reset role;
\echo '=== Benachrichtigungen (als Dienst)'
select art_text from (select titel art_text from portraet_push_faellig(timestamptz '2026-10-05 10:00 Europe/Berlin')) x order by 1;
select count(*) zweiter_lauf_montag from portraet_push_faellig(timestamptz '2026-10-05 10:05 Europe/Berlin');
select titel mittwoch_nach_frist from portraet_push_faellig(timestamptz '2026-10-07 20:05 Europe/Berlin');
select count(*) mittwoch_nochmal from portraet_push_faellig(timestamptz '2026-10-07 20:30 Europe/Berlin');
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000e"}';
insert into portraet_trainerstimme(einreichung_id, stichpunkte) values (1, 'Übersicht, Passspiel');
reset role;
select titel freitag_morgen from portraet_push_faellig(timestamptz '2026-10-09 08:30 Europe/Berlin');
select count(*) nach_frist_trainer from portraet_push_faellig(timestamptz '2026-10-09 20:30 Europe/Berlin');
select art, count(*) from portraet_push_log group by 1 order by 1;
set role authenticated;
\echo '=== Eltern von Kind A'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000b","email":"eltern@example.org"}';
select count(*) eigene_sicht from portraet_einreichung;
select count(*) trainerstimmen_sicht from portraet_trainerstimme;
update portraet_einreichung set status='uebernommen';
insert into portraet_einreichung(spieler_id, frist_eltern, frist_trainer) values (1, now(), now());
insert into storage.objects(bucket_id,name) values ('heft_media','einreichung/1/a.jpg'),('heft_media','einreichung/1/b.jpg');
insert into storage.objects(bucket_id,name) values ('heft_media','einreichung/9/x.jpg');
select name eigene_dateien from storage.objects where bucket_id='heft_media' order by 1;
\echo '--- drei Fotos / fremder Pfad (müssen scheitern)'
select * from portraet_einreichen(1, true, '[{"pfad":"einreichung/1/a.jpg"},{"pfad":"einreichung/1/b.jpg"},{"pfad":"einreichung/1/c.jpg"}]');
select * from portraet_einreichen(1, true, '[{"pfad":"einreichung/2/a.jpg"}]');
\echo '--- einreichen mit Einverständnis'
select count(*) frei_gewordene from portraet_einreichen(1, true, '[{"pfad":"einreichung/1/a.jpg","unterschrift":"Beim Sport"},{"pfad":"einreichung/1/b.jpg","unterschrift":"Im Stadion"}]');
select status, jsonb_array_length(privatfotos) fotos, einverstanden_am is not null einverstanden from portraet_einreichung;
\echo '=== Eltern von Kind B'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000f","email":"andere@example.org"}';
select count(*) fremde_sicht from portraet_einreichung;
select * from portraet_einreichen(1, false);
select count(*) fremde_dateien from storage.objects where name like 'einreichung/1/%';
\echo '=== Trainer übernimmt ein Foto in die Ausgabe'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000a"}';
insert into heft_ausgabe(nummer, termin_id, portraet_spieler_id, portraet_privatfotos) values (1, 90, 1, '[{"pfad":"einreichung/1/a.jpg","unterschrift":"Beim Sport"}]');
\echo '--- Foto ohne Einreichung (muss scheitern)'
insert into heft_ausgabe(nummer, portraet_spieler_id, portraet_privatfotos) values (2, 1, '[{"pfad":"1/frei.jpg","einverstanden":true}]');
\echo '=== Eltern ziehen das Einverständnis zurück'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000b","email":"eltern@example.org"}';
select pfad zu_loeschen from portraet_einreichen(1, false) order by 1;
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000a"}';
select status, jsonb_array_length(privatfotos) einreichung_fotos, (select jsonb_array_length(portraet_privatfotos) from heft_ausgabe where nummer=1) ausgabe_fotos from portraet_einreichung;
\echo '=== Veröffentlichen übernimmt die Einreichung'
update heft_ausgabe set status='veroeffentlicht' where nummer=1;
select status, ausgabe_id from portraet_einreichung;
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000b","email":"eltern@example.org"}';
select count(*) eltern_nach_uebernahme from portraet_einreichung;
\echo '=== Trainer B kann die Stimme von Trainer A nicht ändern'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000a"}';
update portraet_trainerstimme set stichpunkte='überschrieben';
select stichpunkte from portraet_trainerstimme;
reset role; set role anon; set request.jwt.claims='{}';
\echo '=== anon'
select count(*) from portraet_einreichung;
select count(*) from portraet_trainerstimme;
select portraet_beteiligung(1);
