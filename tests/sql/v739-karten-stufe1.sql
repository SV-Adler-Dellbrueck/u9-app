-- v739 · Spielerkarten Stufe 1 und Adler Wrapped (nach Attrappe, v734b und v739 einspielen)
\set ON_ERROR_STOP 0
alter table kind_fanfacts add column if not exists starker_fuss text;
insert into profiles values ('00000000-0000-0000-0000-00000000000a','trainer'),('00000000-0000-0000-0000-00000000000b','parent');
insert into eltern_kinder values ('eltern@example.org',1);
insert into kader(id,name,nr,aktiv,starker_fuss,lieblingsposition) values (1,'Kind A',6,true,null,'Sturm'),(2,'Kind B',7,true,'L',' '),(3,'Kind C',8,true,null,null);
insert into kind_fanfacts(spieler_id,spitzname,starker_fuss) values (1,'Flitzi','rechts'),(2,null,'rechts'),(3,null,'beide');
-- zwei Spieltage der Saison (60 und 90 Minuten bzw. ohne Ende → 60), einer vor der Saison, einer in der Zukunft
insert into termine(id,typ,datum,uhrzeit,uhrzeit_ende) values (1,'turnier','2026-09-12','10:00','11:30'),(2,'spiel','2026-09-26','10:00',null),(3,'spiel','2026-06-20','10:00','11:00'),(4,'spiel','2099-01-01','10:00','12:00');
insert into nominierungen values ('2026-09-12__nom','{"1":"dabei","2":"dabei","3":"nicht"}'),('2026-09-26__nom','{"1":"dabei","Kind C":"dabei"}'),('2026-06-20__nom','{"1":"dabei"}'),('2099-01-01__nom','{"1":"dabei"}');
\echo '=== Fuß: Trainer vor Eltern, beide Schreibweisen'
select kind_fuss('L','rechts') trainer_vor_eltern, kind_fuss(null,'rechts') eltern, kind_fuss(null,'beide') beide, kind_fuss('x','quatsch') nichts;
\echo '=== Spielminuten der Saison (A: 90+60, C: 60 über Vornamen, B: 90)'
select kind_spielminuten_saison(1,'Kind A') a, kind_spielminuten_saison(2,'Kind B') b, kind_spielminuten_saison(3,'Kind C') c;
set role authenticated;
\echo '=== Eltern von Kind A: Galerie mit Stärken, Fuß und Position auf allen Karten'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000b","email":"eltern@example.org"}';
select g->>'name' name, g->>'fuss' fuss, g->>'position' pos, (g->'staerken') is not null and g->>'staerken'<>'null' staerken, g->>'spiele' spiele from jsonb_array_elements(team_gallery_kind()) g order by 1;
select (my_child_card(1)->>'starker_fuss') eigene_karte_fuss;
select get_child_wrapped(1)->>'spiele' wrapped_spiele, get_child_wrapped(1)->>'einsatz_min' wrapped_minuten;
select get_child_wrapped(2)->>'ok' fremdes_kind_wrapped;
reset role;
set role anon; set request.jwt.claims='{}';
\echo '=== anon (muss scheitern bzw. leer sein)'
select team_gallery_kind() anon_galerie;
select kind_spielminuten_saison(1,'Kind A');
reset role;
