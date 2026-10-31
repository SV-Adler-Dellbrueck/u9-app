-- v769 · Rückmeldungen je Termin (nach Attrappe; siehe README)
\set ON_ERROR_STOP 0
create table public.rueckmeldungen (termin_id bigint, spieler_id bigint, status text, created_at timestamptz default now());
create table public.rueckmeldung_log (id bigint generated always as identity primary key, termin_id bigint not null, spieler_id bigint not null, status_alt text, status_neu text, durch_trainer boolean not null default false, geaendert_am timestamptz not null default now());
\i supabase/migrations/20261031_v769_rueckmelde_termin.sql
insert into profiles values ('00000000-0000-0000-0000-00000000000a','trainer','Anna'),('00000000-0000-0000-0000-00000000000c','parent','Eltern');
insert into kader(id,name,nr,aktiv) values (1,'Kind A',6,true),(2,'Kind B',7,true),(3,'Kind C',8,true),(4,'Kind D',9,true),(5,'Kind E',10,false);
insert into termine(id,typ,datum,uhrzeit) values (11,'training',to_char((now() at time zone 'Europe/Berlin')::date + 1,'YYYY-MM-DD'),time '16:45');
-- A: zugesagt (Protokoll), B: zugesagt, dann abgesagt (Protokoll, 2 Einträge), C: vom Trainer als krank eingetragen, D: keine Antwort, E inaktiv
insert into rueckmeldungen values (11,1,'zugesagt', now() - interval '2 days'),(11,2,'abgesagt', now() - interval '3 days'),(11,3,'krank', now() - interval '1 day');
insert into rueckmeldung_log(termin_id,spieler_id,status_alt,status_neu,durch_trainer,geaendert_am) values
 (11,1,null,'zugesagt',false, now() - interval '2 days'),
 (11,2,null,'zugesagt',false, now() - interval '3 days'),
 (11,2,'zugesagt','abgesagt',false, now() - interval '3 hours'),
 (11,3,null,'krank',true, now() - interval '1 day');
\echo '=== Trainer: 4 aktive Kinder; A zugesagt (genau), B abgesagt mit Verlauf aus 2 Einträgen, C krank vom Trainer, D ohne Antwort (status leer, genau = f); E fehlt'
set role authenticated; set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select name, status, durch_trainer, jsonb_array_length(verlauf) as verlauf_n, genau, (erste_antwort is null) as ohne_erste from rueckmelde_termin(11);
\echo '=== Termin ohne Rückmeldungen und unbekannter Termin: unbekannt liefert 0 Zeilen'
select count(*) from rueckmelde_termin(999);
\echo '=== Eltern: 0 Zeilen; anon: kein Zugriff (Fehler gewollt)'
reset role; set role authenticated; set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
select count(*) from rueckmelde_termin(11);
reset role; set role anon; select count(*) from rueckmelde_termin(11);
reset role;
