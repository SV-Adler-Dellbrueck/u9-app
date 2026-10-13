-- v766 · Nachbereitung ablehnen (nach Attrappe und v766-Migration einspielen; siehe README)
\set ON_ERROR_STOP 0
alter table termine add column if not exists trainer_status jsonb;
create table if not exists public.wiewars_push_log (termin_id bigint not null, user_id uuid not null, art text not null, gesendet_am timestamptz not null default now(), primary key (termin_id, user_id, art));
create table if not exists public.einheit_bewertung (id serial primary key, datum date, autor text);
create table if not exists public.event_bewertung (id serial primary key, termin_id bigint, autor text);
create table if not exists public.tagebuch_eintrag (id serial primary key, autor text, termin_id bigint, quelle text, datum date, ki_vorschlag boolean default false, bestaetigt_am timestamptz);
\i supabase/migrations/20261013_v766_nachbereitung_verzicht.sql
insert into profiles values ('00000000-0000-0000-0000-00000000000a','trainer','Anna'),('00000000-0000-0000-0000-00000000000b','trainer','Ben'),('00000000-0000-0000-0000-00000000000c','parent','Eltern');
insert into push_subscriptions values ('p-a','00000000-0000-0000-0000-00000000000a'),('p-b','00000000-0000-0000-0000-00000000000b');
-- Heute (Berlin) vor zwei Stunden zu Ende: ein Spiel (Nr. 1) und ein Training (Nr. 2), beide mit Zusage von Anna und Ben
insert into termine(id,typ,datum,titel,uhrzeit,uhrzeit_ende,trainer_status)
  select 1,'spiel',to_char((now() at time zone 'Europe/Berlin')::date,'YYYY-MM-DD'),'Testspiel',time '00:01',time '00:02','{"Anna":"ja","Ben":"ja"}'::jsonb;
insert into termine(id,typ,datum,titel,uhrzeit,uhrzeit_ende,trainer_status)
  select 2,'training',to_char((now() at time zone 'Europe/Berlin')::date,'YYYY-MM-DD'),null,time '00:01',time '00:02','{"Anna":"ja","Ben":"ja"}'::jsonb;
\echo '=== Ohne Ablehnen: Anna und Ben bekommen je 2 Erinnerungen (Spiel und Training), also 4 Zeilen'
select count(*) from wiewars_push_faellig(((now() at time zone 'Europe/Berlin')::date + time '02:30') at time zone 'Europe/Berlin');
delete from wiewars_push_log;
\echo '=== Anna legt das Spiel ab (t1) und das Training (d<heute>) ab, Ben nichts: nur Ben bekommt 2 Zeilen, Anna keine'
insert into nachbereitung_verzicht(autor,schluessel,datum,art,grund) values ('Anna','t1',current_date,'spiel','nicht_dabei');
insert into nachbereitung_verzicht(autor,schluessel,datum,art,grund,notiz) values ('Anna','d'||to_char((now() at time zone 'Europe/Berlin')::date,'YYYY-MM-DD'),current_date,'training',null,null);
select (select anzeigename from profiles where id = f.user_id) wer, count(*) from wiewars_push_faellig(((now() at time zone 'Europe/Berlin')::date + time '02:30') at time zone 'Europe/Berlin') f group by 1;
\echo '=== Eine Zeile je Trainer und Termin: dasselbe noch einmal scheitert (Fehler gewollt), Grund ohne Wert und mit Wert gehen'
insert into nachbereitung_verzicht(autor,schluessel,datum,art) values ('Anna','t1',current_date,'spiel');
\echo '=== Ungültiger Schlüssel, ungültiger Grund, ungültige Art, Anmerkung über 500 Zeichen scheitern (4 Fehler gewollt)'
insert into nachbereitung_verzicht(autor,schluessel,datum,art) values ('Anna','x7',current_date,'spiel');
insert into nachbereitung_verzicht(autor,schluessel,datum,art,grund) values ('Anna','t9',current_date,'spiel','keine_lust');
insert into nachbereitung_verzicht(autor,schluessel,datum,art) values ('Anna','t9',current_date,'wasserball');
insert into nachbereitung_verzicht(autor,schluessel,datum,art,notiz) values ('Anna','t9',current_date,'spiel',repeat('x',501));
\echo '=== Zugriff: Trainer liest und schreibt; Eltern und anon bekommen nichts (Eltern: 0 Zeilen, Schreiben scheitert; anon: Fehler gewollt)'
set role authenticated; set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select count(*) as trainer_sieht from nachbereitung_verzicht;
insert into nachbereitung_verzicht(autor,schluessel,datum,art) values ('Anna','t3',current_date,'spiel');
delete from nachbereitung_verzicht where schluessel = 't3';
select count(*) as nach_loeschen from nachbereitung_verzicht;
reset role; set role authenticated; set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select count(*) as eltern_sieht from nachbereitung_verzicht;
insert into nachbereitung_verzicht(autor,schluessel,datum,art) values ('Eltern','t4',current_date,'spiel');
reset role; set role anon; select count(*) from nachbereitung_verzicht;
reset role;
