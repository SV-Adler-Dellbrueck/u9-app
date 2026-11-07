-- v803 · Nachricht an die Kinder eines Spieltags (Reihenfolge: Attrappe, v803-kabine-lob-vorher.sql, Migrationen v755, v760, v803, dann diese Datei)
\set ON_ERROR_STOP 0
insert into profiles values ('00000000-0000-0000-0000-00000000000a','trainer'),('00000000-0000-0000-0000-00000000000b','parent'),('00000000-0000-0000-0000-00000000000c','parent');
insert into auth.users values ('00000000-0000-0000-0000-00000000000b','eltern-a@example.org'),('00000000-0000-0000-0000-00000000000c','eltern-b@example.org');
insert into eltern_kinder values ('eltern-a@example.org',1),('eltern-b@example.org',2);
insert into kader(id,name,nr,aktiv) values (1,'Kind A Beispiel',6,true),(2,'Kind B Beispiel',7,true);
insert into push_subscriptions values ('p-b','00000000-0000-0000-0000-00000000000b'),('p-c','00000000-0000-0000-0000-00000000000c');
\echo '=== Prüfregeln: Text ohne Datei geht; weder Text noch Datei, Text über 600 Zeichen und unbekannte Art scheitern (3 Fehler)'
insert into kabine_lob(spieler_id,path,art,nachricht,betreff,termin_id,gruppe) values (1,null,'spieltag','Ihr wart stark!','Nach dem Turnier „Festival“ · 07.11.',77,'11111111-1111-1111-1111-111111111111');
insert into kabine_lob(spieler_id,path,art,nachricht) values (1,null,'spieltag','   ');
insert into kabine_lob(spieler_id,path,art,nachricht) values (1,null,'spieltag',repeat('x',601));
insert into kabine_lob(spieler_id,path,art) values (1,'1/x.webm','irgendwas');
\echo '=== Sprachnachricht mit Datei und Text für Kind B in derselben Gruppe, dazu ein gewöhnliches Sprachlob (art lob) für Kind A'
insert into kabine_lob(spieler_id,path,art,nachricht,gruppe) values (2,'2/x-sp.webm','spieltag','Danke!','11111111-1111-1111-1111-111111111111');
insert into kabine_lob(spieler_id,path) values (1,'1/lob.webm');
select spieler_id, art, path is not null as datei, nachricht is not null as text from kabine_lob order by id;
\echo '=== Push: 3 Zeilen (2× Nachricht für A und B, 1× Sprachlob für A), Vorname statt Klarname, Text je nach Art'
select titel, left(text, 70) as text from lob_push_faellig() order by titel, text;
\echo '=== Zweiter Aufruf: 0 Zeilen'
select count(*) from lob_push_faellig();
\echo '=== Rechte: Eltern von A sehen ihre 2 Zeilen (Nachricht und Sprachlob), nicht die von B; Eltern dürfen nichts einfügen und nichts löschen'
set role authenticated;
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000b","email":"eltern-a@example.org"}';
select count(*) as sichtbar from kabine_lob;
insert into kabine_lob(spieler_id,path,art,nachricht) values (1,null,'spieltag','Von den Eltern');
delete from kabine_lob;
reset role;
select count(*) as unveraendert from kabine_lob;
