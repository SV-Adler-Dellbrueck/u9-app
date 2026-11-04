-- v779 · Absage-Grund in rueckmelde_absagen und rueckmelde_termin (nach Attrappe; siehe README)
\set ON_ERROR_STOP 0
create table public.rueckmeldungen (termin_id bigint, spieler_id bigint, status text, kommentar text, created_at timestamptz default now());
create table public.rueckmeldung_log (id bigint generated always as identity primary key, termin_id bigint not null, spieler_id bigint not null, status_alt text, status_neu text, durch_trainer boolean not null default false, geaendert_am timestamptz not null default now());
create or replace function public.saison_beginn(p_datum text) returns text language sql as $$ select '2026-08-01'::text $$;
\i supabase/migrations/20261030_v767_rueckmelde_absagen.sql
\i supabase/migrations/20261031_v769_rueckmelde_termin.sql
\i supabase/migrations/20261104_v779_rueckmelde_grund.sql
insert into profiles values ('00000000-0000-0000-0000-00000000000a','trainer','Anna'),('00000000-0000-0000-0000-00000000000c','parent','Eltern');
insert into kader(id,name,nr,aktiv) values (1,'Kind A',6,true),(2,'Kind B',7,true),(3,'Kind C',8,true);
insert into termine(id,typ,datum,uhrzeit) values (11,'training',to_char((now() at time zone 'Europe/Berlin')::date - 2,'YYYY-MM-DD'),time '17:00');
-- A sagt mit Grund ab, B ohne Grund (leere Zeichenkette), C mit Grund aus Leerzeichen und Text
insert into rueckmeldungen values (11,1,'abgesagt','Schule', now() - interval '3 days'),(11,2,'abgesagt','   ', now() - interval '3 days'),(11,3,'krank','  Fieber ', now() - interval '3 days');
insert into rueckmeldung_log(termin_id,spieler_id,status_alt,status_neu,geaendert_am) values (11,1,null,'abgesagt', now() - interval '3 days'),(11,2,null,'abgesagt', now() - interval '3 days'),(11,3,null,'krank', now() - interval '3 days');
\echo '=== Trainer, rueckmelde_absagen: A Grund Schule, B ohne Grund (leer), C Grund Fieber (ohne Leerzeichen)'
set role authenticated; set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select name, art, grund from rueckmelde_absagen() order by name;
\echo '=== Trainer, rueckmelde_termin: gleiche Gründe je Kind'
select name, status, grund from rueckmelde_termin(11) order by name;
\echo '=== Eltern: 0 Zeilen; anon: kein Zugriff (Fehler gewollt)'
reset role; set role authenticated; set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select count(*) from rueckmelde_absagen();
select count(*) from rueckmelde_termin(11);
reset role; set role anon; select count(*) from rueckmelde_absagen();
reset role;
