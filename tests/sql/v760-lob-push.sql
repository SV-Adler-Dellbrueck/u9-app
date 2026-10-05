-- v760 · Sprachlob-Push (nach Attrappe, v755 und v760 einspielen; siehe README)
\set ON_ERROR_STOP 0
insert into profiles values ('00000000-0000-0000-0000-00000000000a','trainer'),('00000000-0000-0000-0000-00000000000b','parent'),('00000000-0000-0000-0000-00000000000c','parent'),('00000000-0000-0000-0000-00000000000d','parent');
insert into auth.users values ('00000000-0000-0000-0000-00000000000b','eltern-a@example.org'),('00000000-0000-0000-0000-00000000000c','eltern-b@example.org'),('00000000-0000-0000-0000-00000000000d','eltern-a2@example.org');
insert into eltern_kinder values ('eltern-a@example.org',1),('eltern-a2@example.org',1),('eltern-b@example.org',2);
insert into kader(id,name,nr,aktiv) values (1,'Kind A Beispiel',6,true),(2,'Kind B Beispiel',7,true);
-- B und A2 haben Benachrichtigungen an, C (Eltern von Kind B) nicht
insert into push_subscriptions values ('p-b','00000000-0000-0000-0000-00000000000b'),('p-d','00000000-0000-0000-0000-00000000000d');
\echo '=== Ein altes Lob (vor 5 Tagen) und eines von gestern liegen schon in der Tabelle'
insert into kabine_lob(spieler_id,path,created_at) values (1,'1/alt.webm',now()-interval '5 days'),(1,'1/gestern.webm',now()-interval '1 day');
\echo '=== Lauf 1: nur das Lob von gestern, an beide Elternkonten von Kind A (2 Zeilen), Vorname statt Klarname'
select user_id::text, titel, text, url from lob_push_faellig() order by 1;
\echo '=== Lauf 2 direkt danach: nichts mehr (0 Zeilen)'
select count(*) from lob_push_faellig();
\echo '=== Neues Lob für Kind B: Eltern von B haben keine Benachrichtigungen – 0 Zeilen, aber nicht verbraucht'
insert into kabine_lob(spieler_id,path) values (2,'2/neu.webm');
select count(*) from lob_push_faellig();
\echo '=== Danach schaltet B Benachrichtigungen ein: genau 1 Zeile (Nachholen), danach 0'
insert into push_subscriptions values ('p-c','00000000-0000-0000-0000-00000000000c');
select titel from lob_push_faellig();
select count(*) from lob_push_faellig();
\echo '=== Ruhezeit: neues Lob für Kind A, Konto D ruht – nur B bekommt es (1 Zeile); später ruht D nicht mehr – D bekommt es nachträglich (1 Zeile)'
create or replace function public.push_ruht(p_user uuid, p_jetzt timestamptz) returns boolean language sql stable as $$ select p_user = '00000000-0000-0000-0000-00000000000d' $$;
insert into kabine_lob(spieler_id,path) values (1,'1/ruhe.webm');
select user_id::text from lob_push_faellig();
create or replace function public.push_ruht(p_user uuid, p_jetzt timestamptz) returns boolean language sql stable as $$ select false $$;
select user_id::text from lob_push_faellig();
\echo '=== Zwei Tage später verfällt, was noch offen ist (0 Zeilen)'
select count(*) from lob_push_faellig(now() + interval '3 days');
\echo '=== Protokoll: 2 (gestern A) + 1 (neu B) + 2 (ruhe A: B, dann D) = 5 neue + Altbestand der Migration'
select count(*) from lob_push_log;
\echo '=== Zugriff: authenticated und anon dürfen weder Funktion noch Protokoll (Fehler gewollt)'
set role authenticated; select * from lob_push_faellig(); select * from lob_push_log;
reset role; set role anon; select * from lob_push_faellig(); select * from lob_push_log;
reset role;
