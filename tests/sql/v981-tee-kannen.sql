-- v981 · Tee-Kannen (nach Attrappe, v981-vorher und v981 einspielen; siehe README)
\set ON_ERROR_STOP 0
insert into profiles values ('00000000-0000-0000-0000-00000000000a','trainer'),('00000000-0000-0000-0000-00000000000b','parent'),('00000000-0000-0000-0000-00000000000c','parent'),('00000000-0000-0000-0000-00000000000e','parent');
insert into eltern_kinder values ('eltern-a@example.org',1),('eltern-b@example.org',2),('eltern-c@example.org',3);
-- 10: Training heute, hat vor einer Stunde begonnen · 11: Training übermorgen · 12: Spiel in 4 Tagen · 13: Training morgen, fällt aus
insert into termine(id,typ,datum,uhrzeit,platz_status) values
 (10,'training',to_char(now() at time zone 'Europe/Berlin','YYYY-MM-DD'),((now() at time zone 'Europe/Berlin') - interval '1 hour')::time,null),
 (11,'training',to_char((now() at time zone 'Europe/Berlin') + interval '2 days','YYYY-MM-DD'),'17:00',null),
 (12,'spiel',to_char((now() at time zone 'Europe/Berlin') + interval '4 days','YYYY-MM-DD'),'10:00',null),
 (13,'training',to_char((now() at time zone 'Europe/Berlin') + interval '1 day','YYYY-MM-DD'),'17:00','abgesagt');
-- Kind B hat für heute abgesagt; Kind A ohne Rückmeldung (Training gilt als zugesagt); fürs Spiel hat nur Kind A zugesagt
insert into rueckmeldungen(termin_id,spieler_id,status) values (10,2,'abgesagt'),(12,1,'zugesagt'),(12,3,'unsicher');
set role authenticated;

\echo '=== anon: Stand leer'
set request.jwt.claims='{}';
select count(*) anon_stand from tee_kanne_stand();

\echo '=== Eltern A: lesen die Tabelle nicht direkt (0), Stand zeigt zwei freie Kannen'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000b","email":"eltern-a@example.org"}';
select count(*) direkt from tee_kanne;
select nr, frei, mein from tee_kanne_stand();
\echo '=== Eltern A: nehmen Kanne 1 am heutigen Training (true); zweite Kanne scheitert (ein Fehler gewollt)'
select tee_kanne_nehmen(1, 10, 'Kind As Familie');
select tee_kanne_nehmen(2, 10, 'Kind As Familie');
\echo '=== Eltern A: mitnehmen am Training übermorgen scheitert (erst am Termin; ein Fehler gewollt)'
select tee_kanne_nehmen(2, 11, 'x');

\echo '=== Eltern B: Kind hat abgesagt – nehmen scheitert (ein Fehler gewollt); Stand: 1 unterwegs ohne Namen, 2 frei'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000c","email":"eltern-b@example.org"}';
select tee_kanne_nehmen(2, 10, 'Kind Bs Familie');
select nr, frei, mein, seit is null ohne_seit, name is null ohne_name from tee_kanne_stand();
\echo '=== Eltern B: bringen fremde Kanne 1 scheitert (ein Fehler gewollt), austragen fremd: false'
select tee_kanne_bringen(1, 11);
select tee_kanne_nicht_bringen(1);

\echo '=== Eltern C: nehmen Kanne 1 (schon weg): false; Kanne 2: true'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000e","email":"eltern-c@example.org"}';
select tee_kanne_nehmen(1, 10, 'Kind Cs Familie');
select tee_kanne_nehmen(2, 10, 'Kind Cs Familie');
\echo '=== Eltern C: bringen zum Spiel scheitert (nur „unsicher“; ein Fehler gewollt), zum ausfallenden Training scheitert (ein Fehler gewollt)'
select tee_kanne_bringen(2, 12);
select tee_kanne_bringen(2, 13);

\echo '=== Eltern A: bringen Kanne 1 zum Training übermorgen (true), zweimal → ein Tee-Eintrag'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000b","email":"eltern-a@example.org"}';
select tee_kanne_bringen(1, 11);
select tee_kanne_bringen(1, 11);
select count(*) tee_eintraege from event_helfer where termin_id=11 and aufgabe='🫖 Tee mitbringen';
select nr, mein, tee_termin_id from tee_kanne_stand() where nr=1;
\echo '=== Eltern A: austragen (true, Eintrag weg), wieder eintragen fürs Spiel (true)'
select tee_kanne_nicht_bringen(1);
select count(*) tee_eintraege_nach_austragen from event_helfer where termin_id=11;
select tee_kanne_bringen(1, 12);
\echo '=== Eltern A: direkt schreiben scheitert (ein Fehler gewollt)'
update tee_kanne set user_id=null where nr=1;

\echo '=== Trainer: sieht Namen und Termine; Kanne 2 ist zurück; Eltern dürfen das nicht (ein Fehler gewollt)'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000a"}';
select nr, frei, name, tee_termin_id from tee_kanne_stand();
select tee_kanne_zurueck(2);
select nr, frei from tee_kanne_stand();
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000b","email":"eltern-a@example.org"}';
select tee_kanne_zurueck(1);

\echo '=== Spiel hat begonnen: Kanne 1 ist wieder frei, für Eltern A nicht mehr „mein“'
reset role;
update termine set datum=to_char(now() at time zone 'Europe/Berlin','YYYY-MM-DD'), uhrzeit=((now() at time zone 'Europe/Berlin') - interval '5 minutes')::time where id=12;
set role authenticated;
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000b","email":"eltern-a@example.org"}';
select nr, frei, mein from tee_kanne_stand();
