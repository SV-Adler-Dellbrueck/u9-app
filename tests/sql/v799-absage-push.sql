-- v799 · Push an das Trainerteam bei Absage unter 24 Std. (nach Attrappe + rueckmeldungen/rueckmeldung_log/push_warteschlange)
\set ON_ERROR_STOP 0
create table if not exists public.rueckmeldungen (termin_id bigint, spieler_id bigint, status text, kommentar text, created_at timestamptz default now());
create table if not exists public.rueckmeldung_log (id bigint generated always as identity primary key, termin_id bigint not null, spieler_id bigint not null, status_alt text, status_neu text, durch_trainer boolean not null default false, geaendert_am timestamptz not null default now());
create table if not exists public.push_warteschlange (user_id uuid not null, tag text not null, payload jsonb not null, erstellt_am timestamptz not null default now(), primary key (user_id, tag));
\i supabase/migrations/20261108_v799_absage_push.sql
\i supabase/migrations/20261109_v802_absage_push_link.sql   -- v802: Ziel ./trainer/?absagen
insert into profiles values ('00000000-0000-0000-0000-00000000000a','trainer','Anna'),('00000000-0000-0000-0000-00000000000b','trainer','Ben'),('00000000-0000-0000-0000-00000000000c','parent','Eltern');
insert into push_subscriptions values ('e1','00000000-0000-0000-0000-00000000000a'),('e2','00000000-0000-0000-0000-00000000000b'),('e3','00000000-0000-0000-0000-00000000000c');
insert into kader(id,name,nr,aktiv) values (1,'Kind A',6,true),(2,'Kind B',7,true),(3,'Kind C',8,true),(4,'Kind D',9,true);
-- v802: die Zeile trägt als Ziel ./trainer/?absagen
-- Training heute 18:00; „jetzt“ = heute 15:00 Berlin
create temp table z as select (date_trunc('day', now() at time zone 'Europe/Berlin') + time '15:00') at time zone 'Europe/Berlin' as jetzt, (now() at time zone 'Europe/Berlin')::date::text as heute;
insert into termine(id,typ,datum,uhrzeit) select 11,'training',heute,time '18:00' from z;
insert into termine(id,typ,datum,uhrzeit) select 12,'training',((heute::date)+5)::text,time '18:00' from z;
insert into rueckmeldungen(termin_id,spieler_id,status) values (11,1,'abgesagt'),(11,2,'krank'),(11,3,'zugesagt'),(11,4,'abgesagt'),(12,1,'abgesagt');
-- A: 2 Std. vorher (13:50 = 4 Std? nein: 18:00-13:50 = 4h10 → „unter 24“); B krank 17:05 (unter 1 Std. ist 55 Min.), C hat zugesagt, D vom Trainer abgesagt, Termin 12 in 5 Tagen
insert into rueckmeldung_log(termin_id,spieler_id,status_neu,durch_trainer,geaendert_am) select 11,1,'abgesagt',false,jetzt - interval '30 minutes' from z;
insert into rueckmeldung_log(termin_id,spieler_id,status_neu,durch_trainer,geaendert_am) select 11,2,'krank',false,jetzt - interval '10 minutes' from z;
insert into rueckmeldung_log(termin_id,spieler_id,status_neu,durch_trainer,geaendert_am) select 11,3,'abgesagt',false,jetzt - interval '20 minutes' from z;
insert into rueckmeldung_log(termin_id,spieler_id,status_neu,durch_trainer,geaendert_am) select 11,4,'abgesagt',true,jetzt - interval '20 minutes' from z;
insert into rueckmeldung_log(termin_id,spieler_id,status_neu,durch_trainer,geaendert_am) select 12,1,'abgesagt',false,jetzt - interval '20 minutes' from z;
\echo '=== Erwartet: 4 Zeilen (Kind A und Kind B je an Anna und Ben); nicht C (zugesagt), nicht D (Trainer), nicht Termin 12 (5 Tage); Eltern nie'
select u.anzeigename, f.text, f.url from z, absage_push_faellig((select jetzt from z)) f join profiles u on u.id=f.user_id order by f.tag, u.anzeigename;
\echo '=== Zweiter Aufruf: 0 Zeilen (einmal je Absage)'
select count(*) from z, absage_push_faellig((select jetzt from z));
\echo '=== Zu frisch (unter 1 Minute): neue Absage von A für Termin 11 erst nach einer Minute'
insert into rueckmeldung_log(termin_id,spieler_id,status_neu,durch_trainer,geaendert_am) select 11,1,'abgesagt',false,jetzt - interval '20 seconds' from z;
select count(*) as zu_frisch_0 from z, absage_push_faellig((select jetzt from z));
\echo '=== Ruhezeit: Anna ruht -> Warteschlange statt Push'
create or replace function public.push_ruht(p_user uuid, p_jetzt timestamptz) returns boolean language sql stable as $$ select p_user = '00000000-0000-0000-0000-00000000000a'::uuid $$;
insert into rueckmeldung_log(termin_id,spieler_id,status_neu,durch_trainer,geaendert_am) select 11,2,'abgesagt',false,jetzt - interval '5 minutes' from z;
select u.anzeigename as direkt from z, absage_push_faellig((select jetzt from z) + interval '1 minute') f join profiles u on u.id=f.user_id;
select user_id::text like '%a' as anna, payload->>'body' from push_warteschlange;
\echo '=== Rechte: authenticated darf nicht aufrufen (muss scheitern)'
set role authenticated; select * from absage_push_faellig(); reset role;
