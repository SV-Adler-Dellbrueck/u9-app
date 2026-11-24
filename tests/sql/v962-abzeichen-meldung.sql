-- v962 · „Ich hab's geschafft!“ (nach Attrappe und v962 einspielen; siehe README)
\set ON_ERROR_STOP 0
insert into profiles values ('00000000-0000-0000-0000-00000000000a','trainer'),('00000000-0000-0000-0000-00000000000b','parent'),('00000000-0000-0000-0000-00000000000c','parent');
insert into eltern_kinder values ('eltern-a@example.org',1),('eltern-b@example.org',2);
insert into kader(id,name,nr,aktiv) values (1,'Kind A',6,true),(2,'Kind B',7,true);
insert into kind_konto values ('00000000-0000-0000-0000-0000000000d1',1,true);
set role authenticated;
\echo '=== Kindergerät A: meldet Bronze und Silber für sich selbst (geht)'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000d1","is_anonymous":true}';
insert into abzeichen_meldung(spieler_id,abzeichen,quelle) values (1,'ab_trick','abzeichen'),(1,'ab2_tennis','abzeichen_silber');
\echo '=== Kindergerät A: doppelt, für Kind B, falsche Quelle, fremde Kennung (vier Fehler gewollt)'
insert into abzeichen_meldung(spieler_id,abzeichen,quelle) values (1,'ab_trick','abzeichen');
insert into abzeichen_meldung(spieler_id,abzeichen,quelle) values (2,'ab_trick','abzeichen');
insert into abzeichen_meldung(spieler_id,abzeichen,quelle) values (1,'ab_stoppen','abzeichen_silber');
insert into abzeichen_meldung(spieler_id,abzeichen,quelle) values (1,'<b>x</b>','abzeichen');
\echo '=== Kindergerät A: löschen darf es nicht (0 Zeilen), sieht seine zwei'
delete from abzeichen_meldung where spieler_id=1;
select abzeichen from abzeichen_meldung order by 1;
\echo '=== Kindergerät A ohne Appzeit: melden scheitert (ein Fehler gewollt)'
set test.zeit='nein';
insert into abzeichen_meldung(spieler_id,abzeichen,quelle) values (1,'ab_stoppen','abzeichen');
set test.zeit='ja';
\echo '=== Eltern B: sehen von Kind A nichts (0), dürfen nichts löschen (0), melden für Kind A scheitert (ein Fehler gewollt)'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000c","email":"eltern-b@example.org"}';
select count(*) fremde_sichtbar from abzeichen_meldung;
delete from abzeichen_meldung where spieler_id=1;
insert into abzeichen_meldung(spieler_id,abzeichen,quelle) values (1,'ab_slalom','abzeichen');
\echo '=== Eltern A: sehen zwei, erledigen eine'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000b","email":"eltern-a@example.org"}';
select abzeichen, quelle from abzeichen_meldung order by 1;
delete from abzeichen_meldung where abzeichen='ab_trick';
select count(*) nach_erledigen from abzeichen_meldung;
\echo '=== anon: nichts (Fehler oder 0 gewollt)'
reset role; set role anon; set request.jwt.claims='{}';
select count(*) anon_sichtbar from abzeichen_meldung;
