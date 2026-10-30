-- v767 · Absagen mit Vorlauf (nach Attrappe; siehe README)
\set ON_ERROR_STOP 0
create table public.rueckmeldungen (termin_id bigint, spieler_id bigint, status text, created_at timestamptz default now());
create table public.rueckmeldung_log (id bigint generated always as identity primary key, termin_id bigint not null, spieler_id bigint not null, status_alt text, status_neu text, durch_trainer boolean not null default false, geaendert_am timestamptz not null default now());
create or replace function public.saison_beginn(p_datum text) returns text language sql as $$ select '2026-08-01'::text $$;
\i supabase/migrations/20261030_v767_rueckmelde_absagen.sql
insert into profiles values ('00000000-0000-0000-0000-00000000000a','trainer','Anna'),('00000000-0000-0000-0000-00000000000c','parent','Eltern');
insert into kader(id,name,nr,aktiv) values (1,'Kind A',6,true),(2,'Kind B',7,true),(3,'Kind C',8,false);
-- Termine: 11 Training vor 2 Tagen 17:00 (Berlin), 12 Spiel vor 5 Tagen 10:00 mit Titel, 13 Training vor 9 Tagen, 14 Training vor 20 Tagen
insert into termine(id,typ,datum,titel,uhrzeit) values
 (11,'training',to_char((now() at time zone 'Europe/Berlin')::date - 2,'YYYY-MM-DD'),null,time '17:00'),
 (12,'spiel',to_char((now() at time zone 'Europe/Berlin')::date - 5,'YYYY-MM-DD'),'Testspiel',time '10:00'),
 (13,'training',to_char((now() at time zone 'Europe/Berlin')::date - 9,'YYYY-MM-DD'),null,time '17:00'),
 (14,'training',to_char((now() at time zone 'Europe/Berlin')::date - 20,'YYYY-MM-DD'),null,time '17:00');
-- Kind A sagt für 11 zu (vor 5 Tagen) und dann vor 20 Std. vor Beginn ab: Protokoll genau
insert into rueckmeldungen values (11,1,'abgesagt', now() - interval '5 days');
insert into rueckmeldung_log(termin_id,spieler_id,status_alt,status_neu,geaendert_am) values
 (11,1,null,'zugesagt', now() - interval '5 days'),
 (11,1,'zugesagt','abgesagt', ((now() at time zone 'Europe/Berlin')::date - 2 + time '17:00') at time zone 'Europe/Berlin' - interval '20 hours');
-- Kind B sagt für 12 direkt vor 4 Tagen ab (erste Antwort, Protokoll vorhanden)
insert into rueckmeldungen values (12,2,'krank', now() - interval '8 days');
insert into rueckmeldung_log(termin_id,spieler_id,status_alt,status_neu,geaendert_am) values (12,2,null,'krank', now() - interval '8 days');
-- Kind A, Termin 13: Altbestand ohne Protokoll, erste Antwort 3 Tage vorher: genau = false
insert into rueckmeldungen values (13,1,'abgesagt', ((now() at time zone 'Europe/Berlin')::date - 9 + time '17:00') at time zone 'Europe/Berlin' - interval '3 days');
-- Kind B, Termin 13: Trainer hat eingetragen (durch_trainer): fehlt
insert into rueckmeldungen values (13,2,'abgesagt', now() - interval '9 days');
insert into rueckmeldung_log(termin_id,spieler_id,status_alt,status_neu,durch_trainer,geaendert_am) values (13,2,null,'abgesagt',true, now() - interval '9 days');
-- Kind B, Termin 14: erst abgesagt, dann wieder zugesagt: fehlt (aktueller Stand zählt)
insert into rueckmeldungen values (14,2,'zugesagt', now() - interval '25 days');
insert into rueckmeldung_log(termin_id,spieler_id,status_alt,status_neu,geaendert_am) values (14,2,null,'abgesagt', now() - interval '25 days'),(14,2,'abgesagt','zugesagt', now() - interval '24 days');
-- Kind C ist nicht mehr aktiv: fehlt
insert into rueckmeldungen values (11,3,'abgesagt', now() - interval '3 days');
\echo '=== Trainer: 3 Zeilen – Kind A/11 (20 Std., genau), Kind B/12 (krank, genau), Kind A/13 (≈ 72 Std., genau=f); sortiert nach Termin absteigend'
set role authenticated; set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select name, termin_id, art, titel, vorlauf_std, genau from rueckmelde_absagen() order by termin_id desc;
\echo '=== Eltern: keine Zeile (0), anon: kein Zugriff (Fehler gewollt)'
reset role; set role authenticated; set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select count(*) from rueckmelde_absagen();
reset role; set role anon; select count(*) from rueckmelde_absagen();
reset role;
