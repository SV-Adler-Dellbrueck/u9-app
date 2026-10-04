-- v755 · Sprachlob gehört (nach Attrappe und v755 einspielen; siehe README)
\set ON_ERROR_STOP 0
insert into profiles values ('00000000-0000-0000-0000-00000000000a','trainer'),('00000000-0000-0000-0000-00000000000b','parent'),('00000000-0000-0000-0000-00000000000c','parent');
insert into eltern_kinder values ('eltern-a@example.org',1),('eltern-b@example.org',2);
insert into kader(id,name,nr,aktiv) values (1,'Kind A',6,true),(2,'Kind B',7,true);
insert into kind_konto values ('00000000-0000-0000-0000-0000000000d1',1,true);
insert into kabine_lob(spieler_id,path) values (1,'1/a.webm'),(1,'1/b.webm'),(2,'2/a.webm');
set role authenticated;
\echo '=== Kindergerät A: markiert eigenes Lob als gehört (1 Zeile), fremdes nicht (0 Zeilen)'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000d1","is_anonymous":true}';
update kabine_lob set gehoert_am=now() where spieler_id=1 and path='1/a.webm' and gehoert_am is null;
update kabine_lob set gehoert_am=now() where spieler_id=2;
select count(*) sichtbar, count(*) filter (where gehoert_am is not null) gehoert from kabine_lob;
\echo '=== Kindergerät A: Pfad ändern scheitert (Fehler gewollt), Lob löschen scheitert (0 Zeilen)'
update kabine_lob set path='x' where spieler_id=1;
delete from kabine_lob where spieler_id=1;
select count(*) noch_da from kabine_lob;
\echo '=== Eltern B: sehen nur Kind B, markieren; Kind A bleibt unberührt'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000c","email":"eltern-b@example.org"}';
select count(*) sichtbar_b from kabine_lob;
update kabine_lob set gehoert_am=now() where gehoert_am is null;
select spieler_id, count(*) filter (where gehoert_am is not null) gehoert from kabine_lob group by 1 order by 1;
\echo '=== Trainer: sieht alle 3; Pfad ändern scheitert (Fehler gewollt)'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000a","email":"trainer@example.org"}';
select count(*) alle, count(*) filter (where gehoert_am is not null) gehoert from kabine_lob;
update kabine_lob set path='y';
\echo '=== anon: nichts (Fehler gewollt)'
reset role; set role anon;
select count(*) from kabine_lob;
update kabine_lob set gehoert_am=now();
