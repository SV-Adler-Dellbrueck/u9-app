-- v793 · Aufstellung am Spieltag (nach Attrappe und Migration 20261106_v793_spieltag_aufstellung.sql einspielen)
\set ON_ERROR_STOP 0
insert into profiles values ('00000000-0000-0000-0000-00000000000a','trainer','Trainer X'),('00000000-0000-0000-0000-00000000000b','parent',null);
\echo '=== Trainer: anlegen, überschreiben, lesen'
set role authenticated;
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000a","email":"t@example.org"}';
insert into spieltag_aufstellung(schluessel,daten) values ('2026-11-07','{"tw":"Kind A","feld":["Kind B"],"bank":["Kind C"],"form":"4+1"}');
insert into spieltag_aufstellung(schluessel,daten) values ('2026-11-07__t2','{"tw":null,"feld":[],"bank":["Kind D"],"form":"funino"}');
insert into spieltag_aufstellung(schluessel,daten) values ('2026-11-07','{"x":1}') on conflict (schluessel) do update set daten=excluded.daten, updated_at=now();
select schluessel, daten->>'x' as x from spieltag_aufstellung order by 1;
\echo '--- zu kurzer Schlüssel (muss scheitern)'
insert into spieltag_aufstellung(schluessel,daten) values ('x','{}');
reset role;
\echo '=== Eltern: sieht nichts, schreibt nichts'
set role authenticated;
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000b","email":"eltern@example.org"}';
select count(*) as zeilen_eltern from spieltag_aufstellung;
insert into spieltag_aufstellung(schluessel,daten) values ('2026-11-09','{}');
delete from spieltag_aufstellung;
reset role;
select count(*) as zeilen_nach_eltern_delete from spieltag_aufstellung;
\echo '=== anon: kein Zugriff'
set role anon;
select count(*) from spieltag_aufstellung;
reset role;
