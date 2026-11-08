-- v804 · Lesender Datenweg für den Claude-Projekt-Chat (Charles 08.11.2026; Plan freigegeben)
-- Ziel: Das Adler-Projekt liest Tagebuch, Einheiten, Bewertungen und Übungen aus der App – nur lesend, mit Aliassen statt Klarnamen.
-- Wege: nächtlicher Export in das PRIVATE Repo adler-u9-wissen (GitHub Action, Skript tools/export-tagebuch.mjs). Der Export verbindet sich
-- als eigene Rolle `adler_export_lese`: nur SELECT, nur auf die Whitelist-Views im Schema `export`, ohne RLS-Umgehung, ohne Schreibrechte,
-- ohne Zugriff auf Tabellen in `public`. Die Views gehören dem Migrationsbesitzer und lesen die Tabellen mit dessen Rechten – das ist das Tor.
-- In den Views gehen nur die in der Whitelist genannten Spalten hinaus. NIE: kader (Name, Geburtstag, Medizinisches, Foto, Token), eltern_*,
-- profiles, push_*, rueckmeldungen (Kommentare = Gründe), kind_*, kabine_*, kasse_*, rufe_*, blitz_ratings, spielerprofile, ki_*, dsgvo_consent,
-- loeschantrag und die Rohdiktate (Spalten diktat, sprachnotiz) – sie enthalten Klarnamen in Schreibweisen, die sich nicht sicher ersetzen lassen.
-- Namen: Freitext läuft durch export.ohne_namen(): Vornamen aus dem Kader und gepflegte Schreibvarianten (export.name_variante, nur in der
-- Datenbank, nie im Repo) werden zu „Kind <Alias>“. Was die Ersetzung nicht findet, meldet export.namen_verdacht (nur Zählung, keine Wörter).
-- Die Rolle hat KEIN Passwort: Charles setzt es im SQL-Editor selbst (alter role adler_export_lese with password '…') – es läuft nie durch Claude.

create schema if not exists extensions;
create extension if not exists fuzzystrmatch with schema extensions;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'adler_export_lese') then
    create role adler_export_lese login nosuperuser nocreatedb nocreaterole noinherit nobypassrls connection limit 3;
  end if;
end $$;
alter role adler_export_lese set default_transaction_read_only = on;
alter role adler_export_lese set statement_timeout = '30s';
alter role adler_export_lese set search_path = export;

create schema if not exists export;
revoke all on schema export from public, anon, authenticated;
grant usage on schema export to adler_export_lese;

-- Pflege-Tabellen: nur der Migrationsbesitzer liest und schreibt sie (RLS an, keine Policy).
create table if not exists export.name_variante (
  variante text primary key check (variante ~ '^[[:alpha:]][[:alpha:] -]*$'),
  alias    text not null check (alias ~ '^[A-Z]$'),
  hinweis  text
);
create table if not exists export.wort_erlaubt (wort text primary key);
alter table export.name_variante enable row level security;
alter table export.wort_erlaubt enable row level security;
revoke all on export.name_variante, export.wort_erlaubt from public, anon, authenticated, adler_export_lese;
insert into export.wort_erlaubt(wort) values ('Matte'), ('Mitte') on conflict do nothing;   -- gewöhnliche Wörter, die Vornamen ähneln

create or replace function export.ohne_namen(t text) returns text
language plpgsql stable security definer set search_path = public, export, extensions as $$
declare r record; s text := t;
begin
  if s is null then return null; end if;
  for r in
    select btrim(k.name) as w, k.alias from public.kader k where btrim(k.name) <> '' and k.alias is not null
    union all select v.variante, v.alias from export.name_variante v
  loop
    if r.w ~ '^[[:alpha:]][[:alpha:] -]*$' then
      s := regexp_replace(s, '\m' || r.w || '(s)?\M', 'Kind ' || r.alias, 'gi');
    end if;
  end loop;
  return s;
end $$;

create or replace function export.kind_alias(p_id bigint) returns text
language sql stable security definer set search_path = public as $$
  select 'Kind ' || k.alias from public.kader k where k.id = p_id and k.alias is not null $$;
revoke all on function export.ohne_namen(text), export.kind_alias(bigint) from public, anon, authenticated, adler_export_lese;

create or replace function export.json_ohne_namen(j jsonb) returns jsonb
language sql stable security definer set search_path = public, export as $$
  select case when j is null then null else export.ohne_namen(j::text)::jsonb end $$;
revoke all on function export.json_ohne_namen(jsonb) from public, anon, authenticated, adler_export_lese;

-- ── Whitelist-Views ──────────────────────────────────────────────────────────────────────────────────────────
create or replace view export.tagebuch_eintrag as
select e.id, e.datum, e.quelle, e.anlass, e.baustein, e.status, e.ki_vorschlag, (e.bestaetigt_am is not null) as bestaetigt, e.autor,
       export.ohne_namen(e.ausloeser) as ausloeser, export.ohne_namen(e.beobachtung) as beobachtung, export.ohne_namen(e.aha) as aha,
       export.ohne_namen(e.konsequenz) as konsequenz, e.konsequenz_bis, e.konsequenz_erledigt_am,
       export.ohne_namen(e.beleg) as beleg, export.ohne_namen(e.anschluss) as anschluss,
       coalesce((select array_agg(export.ohne_namen(s)) from unnest(e.schlagworte) s), '{}'::text[]) as schlagworte,
       export.json_ohne_namen(e.durchgefuehrt) as durchgefuehrt,
       coalesce((select array_agg(export.kind_alias(i) order by export.kind_alias(i)) from unnest(e.anwesend) i), '{}'::text[]) as anwesend_alias,
       e.termin_id, e.created_at, e.updated_at
  from public.tagebuch_eintrag e;

create or replace view export.tagebuch_punkt as
select p.id, p.eintrag_id, p.termin_id, p.datum, p.art, export.ohne_namen(p.text) as text, p.bis, p.zustaendig, p.autor,
       export.ohne_namen(p.herkunft) as herkunft, p.erledigt_am, p.erledigt_von, p.dauerhaft, p.wirkung, p.wirkung_am
  from public.tagebuch_punkt p;

create or replace view export.einheit_bewertung as
select b.datum, b.autor, b.spass, b.umsetzung, b.erfolg, export.ohne_namen(b.notiz) as notiz, b.created_at, b.updated_at
  from public.einheit_bewertung b;

create or replace view export.termine as
select t.id, t.typ, t.datum, export.ohne_namen(t.titel) as titel, export.ohne_namen(t.gegner) as gegner, t.spielform, t.heim, t.ergebnis,
       export.ohne_namen(t.notiz) as notiz, t.saison
  from public.termine t;

create or replace view export.event_bewertung as
select b.termin_id, t.datum, t.typ, export.ohne_namen(t.titel) as titel, b.autor, export.json_ohne_namen(b.teams) as teams,
       export.json_ohne_namen(b.gaeste) as gaeste, export.ohne_namen(b.getragen) as getragen, export.ohne_namen(b.arbeiten) as arbeiten,
       export.json_ohne_namen(b.orga) as orga, b.updated_at
  from public.event_bewertung b left join public.termine t on t.id = b.termin_id;

create or replace view export.trainingsplan as
select p.datum, export.json_ohne_namen(p.plan) as plan, export.json_ohne_namen(p.slots) as slots, export.json_ohne_namen(p.kopf) as kopf, p.updated_at
  from public.trainingsplan p;

create or replace view export.trainings_eval as
select e.datum, export.json_ohne_namen(e.data) as data, e.updated_at from public.trainings_eval e;

create or replace view export.anwesenheit as
select a.datum, a.termin_id, export.json_ohne_namen(a.data) as data, a.updated_at from public.anwesenheit a;

create or replace view export.trainingsformen as
select f.id, export.ohne_namen(f.name) as name, f.kat, export.ohne_namen(f.kurz) as kurz, export.ohne_namen(f.ablauf) as ablauf,
       export.ohne_namen(f.varianten) as varianten, export.ohne_namen(f.coaching) as coaching, f.spieler, f.feld, f.dauer, f.spass, f.diff,
       f.custom, f.focus, f.dims, f.tags, f.spieler_min, f.spieler_max, f.mit_torwart, f.created_at
  from public.trainingsformen f;

create or replace view export.trainingsvorlagen as
select v.id, export.ohne_namen(v.name) as name, export.ohne_namen(v.leitfrage) as leitfrage, v.folge_nr, v.tags, v.dauer_min, v.netto_spielform_min,
       export.json_ohne_namen(v.skalierung) as skalierung, export.ohne_namen(v.beobachtung) as beobachtung, export.json_ohne_namen(v.bloecke) as bloecke,
       v.stand, v.ordnung, v.ziel_kinder, v.created_at
  from public.trainingsvorlagen v;

create or replace view export.trainingsblock as
select b.id, export.ohne_namen(b.leitfrage) as leitfrage, export.ohne_namen(b.ziel) as ziel, b.von, b.bis, export.json_ohne_namen(b.vorlagen) as vorlagen, b.created_at
  from public.trainingsblock b;

-- Prüfung: Wörter, die einem Vornamen aus dem Kader ähneln, aber nicht ersetzt wurden (Schreibvarianten der Spracherkennung).
-- Liefert nur Ort und Zahl – nie das Wort. Pflege: gewöhnliche Wörter in export.wort_erlaubt, Varianten in export.name_variante.
create or replace view export.namen_verdacht as
with q as (
  select 'tagebuch_eintrag'::text as tabelle, e.id::text as id, f.feld, f.t from public.tagebuch_eintrag e
    cross join lateral (values ('ausloeser', e.ausloeser), ('beobachtung', e.beobachtung), ('aha', e.aha), ('konsequenz', e.konsequenz), ('beleg', e.beleg), ('anschluss', e.anschluss)) f(feld, t)
  union all select 'tagebuch_punkt', p.id::text, 'text', p.text from public.tagebuch_punkt p
  union all select 'einheit_bewertung', b.datum::text || '/' || coalesce(b.autor, ''), 'notiz', b.notiz from public.einheit_bewertung b
  union all select 'event_bewertung', b.termin_id::text, f.feld, f.t from public.event_bewertung b
    cross join lateral (values ('getragen', b.getragen), ('arbeiten', b.arbeiten)) f(feld, t)
  union all select 'trainingsplan', p.datum::text, 'kopf', p.kopf::text from public.trainingsplan p
  union all select 'trainingsformen', f.id::text, 'beschreibung', concat_ws(' ', f.kurz, f.ablauf, f.varianten, f.coaching) from public.trainingsformen f
), w as (
  select q.tabelle, q.id, q.feld, m.tok[1] as tok
    from q cross join lateral regexp_matches(export.ohne_namen(q.t), '\m[A-ZÄÖÜ][a-zäöüß]{3,}\M', 'g') as m(tok)
   where q.t is not null
)
select w.tabelle, w.id, w.feld, count(*)::int as anzahl
  from w
 where exists (select 1 from public.kader k
                where k.alias is not null and length(btrim(k.name)) >= 4
                  and lower(w.tok) <> lower(btrim(k.name))
                  and extensions.levenshtein(lower(w.tok), lower(btrim(k.name))) <= case when length(btrim(k.name)) <= 5 then 1 else 2 end)
   and not exists (select 1 from export.wort_erlaubt a where lower(a.wort) = lower(w.tok))
 group by w.tabelle, w.id, w.feld;

-- Rechte: nur die Whitelist-Views, nur lesen
revoke all on all tables in schema export from public, anon, authenticated, adler_export_lese;
grant select on export.tagebuch_eintrag, export.tagebuch_punkt, export.einheit_bewertung, export.termine, export.event_bewertung,
               export.trainingsplan, export.trainings_eval, export.anwesenheit, export.trainingsformen, export.trainingsvorlagen,
               export.trainingsblock, export.namen_verdacht to adler_export_lese;
revoke all on all tables in schema public from adler_export_lese;
