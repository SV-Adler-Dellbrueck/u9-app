-- v745 · Sonderkarten für alle (nach Attrappe, v734b, v739, v743, v744 und v745 einspielen; siehe README)
\set ON_ERROR_STOP 0
insert into profiles values ('00000000-0000-0000-0000-00000000000a','trainer'),('00000000-0000-0000-0000-00000000000b','parent'),('00000000-0000-0000-0000-00000000000c','parent');
insert into eltern_kinder values ('eltern-a@example.org',1),('eltern-b@example.org',2);
insert into kader(id,name,nr,aktiv,foto_path) values (1,'Kind A',6,true,'1/alt.jpg'),(2,'Kind B',7,true,null);
insert into kind_konto values ('00000000-0000-0000-0000-0000000000d1',1,true);
insert into foto_consent values (1,true),(2,false);
insert into termine(id,typ,datum,titel,ort,heim,spielform,uhrzeit) values (1,'turnier','2026-09-26','Kinderfestival','Thurner Kamp',true,'4+1','10:15'),(2,'turnier','2026-10-03','Turnier in Rath',null,false,'funino,3+1','10:15'),(3,'spiel','2099-01-01','Zukunft',null,true,'4+1','10:00');
insert into nominierungen values ('2026-09-26__nom','{"1":"dabei","2":"dabei"}'),('2026-10-03__nom','{"1":"dabei","2":"nicht"}'),('2099-01-01__nom','{"1":"dabei"}'),
  ('2026-09-26__teams','{"1":2,"2":1,"_form":{"1":"4+1","2":"funino"}}'),('2026-10-03__teams','{"1":1}');
insert into match_actions(id,datum,spieler,aktion) values (1,'2026-09-26__t2','Kind A','kapitaen'),(2,'2026-10-03','Kind A','kapitaen'),(3,'2026-10-03__t2','Kind B','kapitaen');
insert into storage.objects(bucket_id,name) values ('spielerfotos','1/album/akt.jpg'),('spielerfotos','1/album/por.jpg');
set role authenticated;
\echo '=== Trainer: Satz zum Spieltag 26.09. und eine Momentkarte'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000a","email":"trainer@example.org"}';
insert into kind_foto(spieler_id,pfad,zweck) values (1,'1/album/akt.jpg','aktion'),(1,'1/album/por.jpg','portraet');
insert into sonderkarte(spieler_id,art,datum,satz) values (1,'spieltag','2026-09-26','Hat in jeder Runde den Kopf gehoben.');
insert into sonderkarte(spieler_id,art,datum,titel) values (1,'moment','2026-10-03','Erster Spieltag im Adler-Trikot');
\echo '=== Eltern A: Karten von Kind A (erwartet: Moment 03.10., Kapitän 03.10. Team 1 2. Mal, Spieltag 03.10. Team 1 funino,3+1, Kapitän 26.09. Team 2 1. Mal, Spieltag 26.09. Team 2 funino mit Satz; keine Zukunft)'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000b","email":"eltern-a@example.org"}';
select k->>'art' art, k->>'datum' datum, k->>'team' team, k->>'mal' mal, k->>'spielform' form, k->>'titel' titel, k->>'satz' satz, k->>'foto_path' foto
  from jsonb_array_elements(sonderkarten_kind(1)) k;
\echo '=== Eltern A: fremdes Kind B jetzt sichtbar (1 Spieltag, 1 Kapitän), ohne Foto (Kind B ohne Freigabe); Schreiben scheitert (eine Fehlermeldung gewollt)'
select k->>'art' art, k->>'datum' datum, k->>'foto_path' foto from jsonb_array_elements(sonderkarten_kind(2)) k;
insert into sonderkarte(spieler_id,art,datum,titel) values (1,'moment','2026-10-03','selbst');
\echo '=== Kindergerät von Kind A: eigene Karten ja, fremde nein'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000d1","is_anonymous":true}';
select jsonb_array_length(sonderkarten_kind(1)) eigene, jsonb_array_length(sonderkarten_kind(2)) fremde_jetzt_sichtbar;
\echo '=== Eltern B: Tabelle bleibt zu, aber die Karten von Kind A kommen – mit dem Profilfoto statt der Album-Fotos (Kind A hat Freigabe)'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000c","email":"eltern-b@example.org"}';
select count(*) sichtbar from sonderkarte;
select k->>'art' art, k->>'datum' datum, k->>'satz' satz, k->>'foto_path' foto from jsonb_array_elements(sonderkarten_kind(1)) k;
reset role;
\echo '=== Anonym: gesperrt (eine Fehlermeldung gewollt)'
set role anon; set request.jwt.claims='{}';
select sonderkarten_kind(1);
reset role;
