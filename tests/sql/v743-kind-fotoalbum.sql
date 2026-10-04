-- v743 · Fotoalbum je Kind (nach Attrappe, v734b, v739 und v743 einspielen; siehe README)
\set ON_ERROR_STOP 0
insert into profiles values ('00000000-0000-0000-0000-00000000000a','trainer'),('00000000-0000-0000-0000-00000000000b','parent'),('00000000-0000-0000-0000-00000000000c','parent');
insert into eltern_kinder values ('eltern-a@example.org',1),('eltern-b@example.org',2);
insert into kader(id,name,nr,aktiv,foto_path) values (1,'Kind A',6,true,'1/alt.jpg'),(2,'Kind B',7,true,null);
insert into foto_consent values (1,true),(2,false);
insert into storage.objects(bucket_id,name) select 'spielerfotos', '1/album/f'||g||'.jpg' from generate_series(1,7) g;
insert into storage.objects(bucket_id,name) values ('spielerfotos','2/album/b1.jpg');
set role authenticated;
\echo '=== Eltern A: sechs Fotos ihres Kindes gehen, das siebte nicht (eine Fehlermeldung gewollt)'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000b","email":"eltern-a@example.org"}';
insert into kind_foto(spieler_id,pfad,zweck) select 1,'1/album/f'||g||'.jpg', case when g=1 then 'portraet' else 'aktion' end from generate_series(1,6) g;
insert into kind_foto(spieler_id,pfad) values (1,'1/album/f7.jpg');
\echo '=== Eltern A: fremdes Kind, fremder Pfad, Datei fehlt, Karte direkt setzen – scheitert (vier Fehlermeldungen gewollt)'
insert into kind_foto(spieler_id,pfad) values (2,'2/album/b1.jpg');
delete from kind_foto where pfad='1/album/f6.jpg';
insert into kind_foto(spieler_id,pfad) values (1,'2/album/b1.jpg');
insert into kind_foto(spieler_id,pfad) values (1,'1/album/fehlt.jpg');
update kind_foto set karte=true where pfad='1/album/f1.jpg';
\echo '=== Eltern A: Kartenfoto über die Funktion, Zweck ändern'
select kind_foto_als_karte(1,(select id from kind_foto where pfad='1/album/f1.jpg')) karte_gesetzt;
update kind_foto set zweck='jubel' where pfad='1/album/f2.jpg';
select pfad, zweck, karte from kind_foto order by pfad;
\echo '=== Eltern B (anderes Kind): sieht von Kind A nur das Kartenfoto; Galerie zeigt es, Kind B ohne Freigabe ohne Foto'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000c","email":"eltern-b@example.org"}';
select pfad, karte from kind_foto order by pfad;
select g->>'name' name, g->>'foto_path' foto from jsonb_array_elements(team_gallery_kind()) g order by 1;
select spielerfoto_team_sichtbar('1/album/f1.jpg') karte_sichtbar, spielerfoto_team_sichtbar('1/album/f2.jpg') album_sichtbar;
select kind_foto_als_karte(1,null);
\echo '=== Eltern A: eigene Karte mit Kartenfoto'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000b","email":"eltern-a@example.org"}';
select my_child_card(1)->>'foto_path' eigene_karte;
\echo '=== Trainer: sieht alles, löst das Kartenfoto, dann zeigt die Galerie wieder das alte Foto'
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000a","email":"trainer@example.org"}';
select count(*) trainer_sieht from kind_foto;
select kind_foto_als_karte(1,null);
select g->>'foto_path' foto from jsonb_array_elements(team_gallery_kind()) g where g->>'name'='Kind A';
reset role;
\echo '=== Anonym: nichts (eine Fehlermeldung gewollt)'
set role anon; set request.jwt.claims='{}';
select * from kind_foto;
reset role;
