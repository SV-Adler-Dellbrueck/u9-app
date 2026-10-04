-- v734 · Spielerkarten mit Zahlen: Zählung der Saison und Sicht auf fremde Karten (nach Attrappe und v734b einspielen)
-- Die Attrappe kennt Bewertungen nicht – staerken_von, spielerprofile und quiz_progress kommen als Platzhalter dazu,
-- bevor die Migration läuft (siehe README).
\set ON_ERROR_STOP 0
insert into profiles values ('00000000-0000-0000-0000-00000000000a','trainer'),('00000000-0000-0000-0000-00000000000b','parent');
insert into eltern_kinder values ('eltern@example.org',1);
insert into kader(id,name,nr,aktiv) values (1,'Kind A',6,true),(2,'Kind B',7,true);
-- Saison ab 1. Juli: zwei echte Trainings, ein Spieltag, eins vor der Saison, eins abgesagt, eins in der Zukunft
insert into termine(id,typ,datum) values (1,'training','2026-09-01'),(2,'training','2026-09-04'),(3,'spiel','2026-09-12'),(4,'training','2026-06-20'),(5,'training','2026-09-08'),(6,'training','2099-01-01');
update termine set platz_status='abgesagt' where id=5;
-- Kind B steht am 01.09. wie im Juli mit Vornamen in der Liste
insert into anwesenheit values ('2026-09-01','{"1":{"da":true},"Kind B":{"da":true}}'),('2026-09-04','{"1":{"da":true},"2":{"da":false}}'),('2026-09-12','{"1":{"da":true}}'),('2026-06-20','{"1":{"da":true}}'),('2026-09-08','{"1":{"da":true}}'),('2099-01-01','{"1":{"da":true}}');
-- Spiele nur aus „__nom“ = dabei, in der Saison, bis heute
insert into nominierungen values ('2026-09-12__nom','{"1":"dabei","2":"nicht"}'),('2026-09-12','{"1":"dabei","2":"dabei"}'),('2099-01-01__nom','{"1":"dabei"}'),('2026-06-01__nom','{"1":"dabei"}');
\echo '=== Zählung (erwartet: A 2 Trainings / 1 Spiel, B 1 / 0)'
select kind_trainings_saison(1,'Kind A') a_tr, kind_spiele_saison(1,'Kind A') a_sp, kind_trainings_saison(2,'Kind B') b_tr, kind_spiele_saison(2,'Kind B') b_sp;
set role authenticated;
\echo '=== Eltern von Kind A: Zahlen auf beiden Karten, Stärken nur auf der eigenen'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000b","email":"eltern@example.org"}';
select g->>'name' name, g->>'trainings' trainings, g->>'spiele' spiele, g->'staerken' is not null and g->>'staerken' <> 'null' staerken_da
  from jsonb_array_elements(team_gallery_kind()) g order by 1;
select (my_child_card(1)->'stats'->>'trainings') eigene_trainings, (my_child_card(1)->'stats'->>'spiele') eigene_spiele, my_child_card(2) is null fremde_karte_gesperrt;
\echo '=== Trainer: dieselbe Zählung'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000a","email":"trainer@example.org"}';
select g->>'name' name, g->>'trainings' trainings, g->>'spiele' spiele from jsonb_array_elements(team_gallery()) g order by 1;
reset role;
\echo '=== Anonym: nichts (Galerie leer, Zählfunktionen gesperrt – muss scheitern)'
set role anon; set request.jwt.claims='{}';
select team_gallery_kind() anon_galerie;
select kind_trainings_saison(1,'Kind A');
reset role;
