-- v756 · Teil-Link für die Hördatei (nach Attrappe und v756 einspielen; siehe README)
\set ON_ERROR_STOP 0
insert into profiles values ('00000000-0000-0000-0000-00000000000a','trainer'),('00000000-0000-0000-0000-00000000000b','parent');
insert into heft_ausgabe(id,nummer,status,audio_pfad,audio_sekunden) values (1,1,'veroeffentlicht','a1.mp3',75),(2,2,'veroeffentlicht','a2.mp3',60),(3,3,'entwurf','a3.mp3',50),(4,4,'veroeffentlicht',null,null);
set role authenticated;
\echo '=== Eltern: kein Link, kein Lesen, keine Funktionen (Fehler gewollt)'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000b","email":"eltern-b@example.org"}';
select count(*) sichtbar from heft_audio_link;
select * from heft_audio_link_neu(1);
select heft_audio_link_zurueckziehen(1);
select * from heft_audio_abrufen(repeat('a',64));
\echo '=== Trainer: neuer Link für Ausgabe 1, zweiter ersetzt den ersten; Ausgabe 4 ohne Hördatei scheitert (Fehler gewollt)'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000a","email":"trainer@example.org"}';
select length(token) laenge, gueltig_bis > now() + interval '29 days' ab_29_tage from heft_audio_link_neu(1);
select length(token) laenge from heft_audio_link_neu(1);
select count(*) filter (where zurueckgezogen_am is null) aktiv, count(*) gesamt from heft_audio_link where ausgabe_id=1;
select * from heft_audio_link_neu(4);
select * from heft_audio_link_neu(2);
select * from heft_audio_link_neu(3);
\echo '=== Token ändern von Hand scheitert nicht an Rechten, aber an der Form (Fehler gewollt)'
update heft_audio_link set token='zu-kurz' where ausgabe_id=2;
-- Tokens als Besitzer holen (service_role liest die Tabelle nicht selbst; die Edge Function kennt den Token aus der Anfrage)
reset role;
select token as t1 from heft_audio_link where ausgabe_id=1 and zurueckgezogen_am is null \gset
select token as t1alt from heft_audio_link where ausgabe_id=1 and zurueckgezogen_am is not null limit 1 \gset
select token as t2 from heft_audio_link where ausgabe_id=2 \gset
select token as t3 from heft_audio_link where ausgabe_id=3 \gset
\echo '=== Edge Function (service_role): gültiger Token liefert genau die Datei seiner Ausgabe'
set role service_role;
select pfad, nummer, sekunden from heft_audio_abrufen(:'t1');
select pfad from heft_audio_abrufen(:'t2');
\echo '=== Entwurf: Token liefert nichts (0 Zeilen); erfundener Token: nichts (0 Zeilen)'
select count(*) entwurf from heft_audio_abrufen(:'t3');
select count(*) erfunden from heft_audio_abrufen(repeat('0',64));
\echo '=== abgelaufen und zurückgezogen: je 0 Zeilen'
reset role;
update heft_audio_link set gueltig_bis = now() - interval '1 minute' where ausgabe_id=2;
update heft_audio_link set zurueckgezogen_am = now() where ausgabe_id=3;
set role service_role;
select count(*) abgelaufen from heft_audio_abrufen(:'t2');
select count(*) zurueckgezogen from heft_audio_abrufen(:'t3');
select count(*) alt_ersetzt from heft_audio_abrufen(:'t1alt');
\echo '=== Trainer zieht zurück: sofort 0 Zeilen'
reset role; set role authenticated;
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000a","email":"trainer@example.org"}';
select heft_audio_link_zurueckziehen(1);
reset role; set role service_role;
select count(*) nach_zurueckziehen from heft_audio_abrufen(:'t1');
\echo '=== anon: nichts (Fehler gewollt)'
reset role; set role anon;
select count(*) from heft_audio_link;
select * from heft_audio_abrufen(repeat('a',64));
