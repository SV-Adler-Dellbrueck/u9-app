-- v804 · Vorbereitung: die Tabellen, die die Export-Views lesen (Spalten wie in der Datenbank, soweit die Views sie brauchen)
alter table public.kader add column if not exists alias text;
create table public.tagebuch_eintrag (id bigint generated always as identity primary key, autor text, datum date, quelle text, termin_id bigint, baustein text, ausloeser text, beobachtung text, aha text, konsequenz text, konsequenz_bis date, beleg text, anschluss text, created_at timestamptz default now(), updated_at timestamptz default now(), schlagworte text[], ki_vorschlag boolean, anlass text, status text, konsequenz_erledigt_am date, diktat text, bestaetigt_am timestamptz, rueckfragen jsonb, durchgefuehrt jsonb not null default '[]', anwesend bigint[] not null default '{}');
create table public.tagebuch_punkt (id bigint generated always as identity primary key, eintrag_id bigint, termin_id bigint, datum date, art text, text text, bis date, zustaendig text, autor text, herkunft text, erledigt_am date, erledigt_von text, created_at timestamptz default now(), dauerhaft boolean, wirkung text, wirkung_am date);
create table public.einheit_bewertung (datum date, spass int, umsetzung int, erfolg int, notiz text, updated_at timestamptz default now(), sprachnotiz text, autor text, created_at timestamptz default now());
create table public.event_bewertung (termin_id bigint, autor text, teams jsonb, gaeste jsonb, getragen text, arbeiten text, orga jsonb, updated_at timestamptz default now(), sprachnotiz text);
create table public.trainingsplan (datum date, plan jsonb, updated_at timestamptz default now(), slots jsonb, kopf jsonb, gespeichert_von text);
create table public.trainings_eval (datum text, data jsonb, updated_at timestamptz default now());
alter table public.anwesenheit add column if not exists termin_id bigint;
alter table public.anwesenheit add column if not exists updated_at timestamptz default now();
alter table public.termine add column if not exists notiz text;
alter table public.termine add column if not exists saison text;
alter table public.kader add column if not exists medical text;
create table public.trainingsformen (id bigint generated always as identity primary key, name text, kat text, kurz text, ablauf text, varianten text, coaching text, spieler text, feld text, dauer text, spass int, diff int, custom boolean, focus boolean, dims text, tags text, created_at timestamptz default now(), skizze jsonb, spieler_min int, spieler_max int, mit_torwart boolean);
create table public.trainingsvorlagen (id bigint generated always as identity primary key, name text, leitfrage text, folge_nr int, tags text[], dauer_min int, netto_spielform_min int, skalierung jsonb, beobachtung text, bloecke jsonb, stand text, created_at timestamptz default now(), ordnung text, ziel_kinder text);
create table public.trainingsblock (id bigint generated always as identity primary key, leitfrage text, ziel text, von date, bis date, vorlagen jsonb, erstellt_von uuid, created_at timestamptz default now());
