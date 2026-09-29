-- v679 · Tagebuch als Arbeitsmittel + Vorschlag sortiert statt geschrieben
-- Aufträge: doku/auftrag-tagebuch-alltag/README.md, doku/auftrag-tagebuch-ki-sortieren/
-- (README, nachtrag-2026-09-28 – geht vor –, prozess-nacherfassung, fehlerbild-abgeschnitten).
-- PO 29.09.2026: „ja baue das alles“ – einschließlich der drei vorher genannten Speicherformen:
--   1. Konsequenzen und To-dos als Liste mit Datum je Punkt (tagebuch_punkt); konsequenz_bis
--      am Eintrag trägt das früheste Datum.
--   2. Vergebene Buchstaben in einer eigenen Tabelle (kader_alias_vergeben), nicht als Sequenz.
--   3. Zwei Trainer, ein Termin: die Bewertung zeigt eine Spanne, keinen Mittelwert (nur Anzeige).
-- Bestehende Einträge werden nicht umgeschrieben: status 'fertig', anlass aus dem Termin-Bezug,
-- ki_vorschlag und alle Texte bleiben, bestaetigt_am bleibt leer.

-- ── 1. tagebuch_eintrag ────────────────────────────────────────────────────────────
alter table public.tagebuch_eintrag
  add column if not exists anlass text,
  add column if not exists status text not null default 'fertig',
  add column if not exists konsequenz_erledigt_am date,
  add column if not exists diktat text,
  add column if not exists bestaetigt_am timestamptz,
  add column if not exists rueckfragen jsonb not null default '[]'::jsonb;

alter table public.tagebuch_eintrag drop constraint if exists tagebuch_eintrag_anlass_check;
alter table public.tagebuch_eintrag add constraint tagebuch_eintrag_anlass_check
  check (anlass is null or anlass in ('einheit','spieltag','lehrgang','gedanke'));
alter table public.tagebuch_eintrag drop constraint if exists tagebuch_eintrag_status_check;
alter table public.tagebuch_eintrag add constraint tagebuch_eintrag_status_check
  check (status in ('keim','fertig'));

-- Ein Keim braucht nur Text. Die Pflicht für Baustein, Auslöser, Aha und Konsequenz gilt weiter –
-- aber nur für fertige Einträge. Die Regel bleibt damit in der Tabelle, nicht nur im Client.
alter table public.tagebuch_eintrag alter column baustein  drop not null;
alter table public.tagebuch_eintrag alter column ausloeser drop not null;
alter table public.tagebuch_eintrag alter column aha        drop not null;
alter table public.tagebuch_eintrag alter column konsequenz drop not null;
alter table public.tagebuch_eintrag drop constraint if exists tagebuch_eintrag_fertig_check;
alter table public.tagebuch_eintrag add constraint tagebuch_eintrag_fertig_check
  check (status = 'keim' or (baustein is not null and ausloeser is not null
                             and aha is not null and konsequenz is not null));
alter table public.tagebuch_eintrag drop constraint if exists tagebuch_eintrag_keim_text_check;
alter table public.tagebuch_eintrag add constraint tagebuch_eintrag_keim_text_check
  check (status = 'fertig' or coalesce(nullif(btrim(beobachtung),''), nullif(btrim(aha),''),
                                       nullif(btrim(konsequenz),''), nullif(btrim(diktat),'')) is not null);

update public.tagebuch_eintrag
   set anlass = case quelle when 'einheit' then 'einheit' when 'event' then 'spieltag' end
 where anlass is null and quelle in ('einheit','event');

comment on column public.tagebuch_eintrag.diktat is
  'v679: Sprachnotiz, wie sie aus der Spracherkennung kam – mit Vornamen (Nachtrag 28.09.). Jeder Export ersetzt sie durch den festen Buchstaben.';
comment on column public.tagebuch_eintrag.bestaetigt_am is
  'v679: „Passt so“ oder eine Änderung von Hand. Die Lehrgangsausgabe nimmt nur bestätigte Einträge (oder solche, die nie ein KI-Vorschlag waren).';

-- ── 2. Konsequenzen und To-dos: ein Punkt je Zeile, Datum je Punkt ─────────────────
create table if not exists public.tagebuch_punkt (
  id           bigint generated always as identity primary key,
  eintrag_id   bigint references public.tagebuch_eintrag(id) on delete cascade,
  termin_id    bigint references public.termine(id) on delete set null,
  datum        date,
  art          text not null check (art in ('konsequenz','todo')),
  text         text not null check (length(btrim(text)) between 1 and 2000),
  bis          date,
  zustaendig   text check (zustaendig is null or zustaendig in ('feldtrainer','skill','organisation')),
  autor        text not null,
  herkunft     text,
  erledigt_am  date,
  erledigt_von text,
  created_at   timestamptz not null default now()
);
alter table public.tagebuch_punkt enable row level security;
drop policy if exists "tagebuch_punkt_trainer_all" on public.tagebuch_punkt;
create policy "tagebuch_punkt_trainer_all" on public.tagebuch_punkt
  for all to authenticated using (is_trainer()) with check (is_trainer());
create index if not exists tagebuch_punkt_offen_idx on public.tagebuch_punkt (bis) where erledigt_am is null;
create index if not exists tagebuch_punkt_eintrag_idx on public.tagebuch_punkt (eintrag_id);

-- Bestand: jede vorhandene Konsequenz wird ein Punkt – der Eintrag selbst bleibt unverändert.
insert into public.tagebuch_punkt (eintrag_id, termin_id, datum, art, text, bis, autor, created_at)
select e.id, e.termin_id, e.datum, 'konsequenz', e.konsequenz, e.konsequenz_bis, e.autor, e.created_at
  from public.tagebuch_eintrag e
 where nullif(btrim(e.konsequenz),'') is not null
   and not exists (select 1 from public.tagebuch_punkt p where p.eintrag_id = e.id);

-- ── 3. Kinder je Eintrag ───────────────────────────────────────────────────────────
create table if not exists public.tagebuch_kind (
  eintrag_id bigint not null references public.tagebuch_eintrag(id) on delete cascade,
  kader_id   bigint not null references public.kader(id) on delete cascade,
  primary key (eintrag_id, kader_id)
);
alter table public.tagebuch_kind enable row level security;
drop policy if exists "tagebuch_kind_trainer_all" on public.tagebuch_kind;
create policy "tagebuch_kind_trainer_all" on public.tagebuch_kind
  for all to authenticated using (is_trainer()) with check (is_trainer());
create index if not exists tagebuch_kind_kader_idx on public.tagebuch_kind (kader_id);

-- ── 4. Feste Buchstaben je Kind ────────────────────────────────────────────────────
-- Bisher: Rang aller Kader-Zeilen nach id (tbAliasMap). Löschen eines Kindes schob alle
-- folgenden Buchstaben nach. Jetzt: einmal vergeben, nie wieder vergeben, nie geändert.
create or replace function public.tb_alias_buchstabe(rang integer) returns text
  language sql immutable as $$
  select case when rang < 26 then chr(65 + rang)
              else chr(65 + rang / 26 - 1) || chr(65 + rang % 26) end $$;

create table if not exists public.kader_alias_vergeben (
  alias       text primary key,
  kader_id    bigint,          -- bleibt stehen, wenn das Kind gelöscht wird
  vergeben_am timestamptz not null default now()
);
alter table public.kader_alias_vergeben enable row level security;
drop policy if exists "kader_alias_trainer_lesen" on public.kader_alias_vergeben;
create policy "kader_alias_trainer_lesen" on public.kader_alias_vergeben
  for select to authenticated using (is_trainer());
revoke insert, update, delete on public.kader_alias_vergeben from anon, authenticated;

alter table public.kader add column if not exists alias text;
alter table public.kader drop constraint if exists kader_alias_key;
alter table public.kader add constraint kader_alias_key unique (alias);

-- Genau der Buchstabe, den tbAliasMap() heute liefert: Rang über alle Zeilen nach id.
with r as (select id, (row_number() over (order by id) - 1)::int as rang from public.kader)
update public.kader k set alias = public.tb_alias_buchstabe(r.rang)
  from r where r.id = k.id and k.alias is null;
insert into public.kader_alias_vergeben (alias, kader_id)
select alias, id from public.kader where alias is not null
on conflict (alias) do nothing;

create or replace function public.kader_alias_setzen() returns trigger
  language plpgsql security definer set search_path = public as $$
declare n integer; a text;
begin
  if tg_op = 'UPDATE' and old.alias is not null then
    new.alias := old.alias;              -- unveränderlich
    return new;
  end if;
  -- Hatte diese Kennung schon einen Buchstaben (Zeile gelöscht und mit derselben id neu), bleibt er.
  select v.alias into a from public.kader_alias_vergeben v where v.kader_id = new.id limit 1;
  if a is null then
    select count(*) into n from public.kader_alias_vergeben;
    loop
      a := public.tb_alias_buchstabe(n);
      exit when not exists (select 1 from public.kader_alias_vergeben v where v.alias = a);
      n := n + 1;
    end loop;
    insert into public.kader_alias_vergeben (alias, kader_id) values (a, new.id);
  end if;
  new.alias := a;
  return new;
end $$;
revoke execute on function public.kader_alias_setzen() from public, anon, authenticated;

drop trigger if exists kader_alias_t on public.kader;
create trigger kader_alias_t before insert or update of alias on public.kader
  for each row execute function public.kader_alias_setzen();

-- ── 5. KI: ein Termin zählt einmal ─────────────────────────────────────────────────
-- ki-nachbereitung merkt sich je Trainer, Tag und Termin („d2026-09-28“, „t123“), ob der Termin
-- heute schon gezählt wurde. Korrekturen zum selben Termin zählen nicht erneut ins Tageslimit;
-- höchstens sechs Auswertungen je Termin und Tag, damit das kein Umweg um das Limit wird.
create table if not exists public.ki_nachbereitung_lauf (
  uid    uuid not null,
  fuer   text not null check (length(fuer) between 2 and 40),
  tag    date not null default current_date,
  anzahl integer not null default 0,
  primary key (uid, fuer, tag)
);
alter table public.ki_nachbereitung_lauf enable row level security;   -- keine Policy: nur service_role
revoke all on public.ki_nachbereitung_lauf from anon, authenticated;
