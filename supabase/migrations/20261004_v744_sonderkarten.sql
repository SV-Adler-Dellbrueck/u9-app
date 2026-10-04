-- v744 · Spielerkarten Stufe 3: Sonderkarten (PO 04.10., Entwurf A/B/C freigegeben, „Kabine und Eltern-Portal“)
-- A Spieltagskarte – automatisch für jedes Kind mit Nominierung „dabei“ an einem Spieltag der Saison (bis heute):
--   Termin (Titel, Ort, heim/auswärts), Team aus <datum>__teams, Spielform des Teams (_form, sonst Termin), dazu ein
--   freiwilliger Trainer-Satz. Kein Ergebnis, keine Tore.
-- B Kapitänskarte – automatisch für das Kind mit der Binde (match_actions aktion='kapitaen', Schlüssel <datum>,
--   <datum>__t2 …); „1. Mal Kapitän“ zählt in der Saison, keine Rangliste.
-- C Momentkarte – vergibt der Trainer von Hand (Titel, Datum, Satz).
-- Sehen: das Kind selbst (Kindergerät), seine Eltern und das Trainerteam – andere Familien nie.
-- Foto: aus dem Album (v743) nach Zweck – Spieltag „aktion“, Kapitän „portraet“, Moment „jubel“ –, sonst das
-- Kartenfoto, sonst das bisherige Profilfoto.

create table if not exists public.sonderkarte (
  id         bigint generated always as identity primary key,
  spieler_id bigint not null references public.kader(id) on delete cascade,
  art        text not null check (art in ('spieltag','moment')),
  datum      date not null,
  titel      text check (titel is null or length(trim(titel)) between 1 and 60),
  satz       text check (satz is null or length(trim(satz)) between 1 and 140),
  von        uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  check (art <> 'moment' or titel is not null)
);
comment on table public.sonderkarte is 'v744: Trainer-Satz zur Spieltagskarte (je Kind und Tag einer) und vergebene Momentkarten. Lesen: Kind, Eltern, Trainer.';
create unique index if not exists sonderkarte_spieltag_einmal on public.sonderkarte(spieler_id, datum) where art='spieltag';
create index if not exists sonderkarte_kind on public.sonderkarte(spieler_id);
alter table public.sonderkarte enable row level security;
drop policy if exists sk_lesen on public.sonderkarte;
create policy sk_lesen on public.sonderkarte for select to authenticated
  using (public.is_trainer() or public.is_parent_of(spieler_id) or public.is_kind_selbst(spieler_id));
drop policy if exists sk_trainer on public.sonderkarte;
create policy sk_trainer on public.sonderkarte for all to authenticated
  using (public.is_trainer()) with check (public.is_trainer());
revoke all on public.sonderkarte from anon;

-- Foto je Zweck: Album (neuestes dieses Zwecks), sonst Kartenfoto, sonst Profilfoto
create or replace function public.kind_foto_fuer(p_spieler bigint, p_zweck text) returns text
language sql stable security definer set search_path to 'public' as $$
  select coalesce(
    (select pfad from public.kind_foto where spieler_id=p_spieler and zweck=p_zweck order by created_at desc limit 1),
    public.kind_kartenfoto(p_spieler),
    (select f.foto_path from public.kind_fanfacts f where f.spieler_id=p_spieler),
    (select k.foto_path from public.kader k where k.id=p_spieler));
$$;
revoke all on function public.kind_foto_fuer(bigint,text) from public, anon;
grant execute on function public.kind_foto_fuer(bigint,text) to authenticated;

create or replace function public.sonderkarten_kind(p_spieler bigint) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare v_name text; v_nr int; v_res jsonb;
begin
  if not (public.is_trainer() or public.is_parent_of(p_spieler) or public.is_kind_selbst(p_spieler)) then return '[]'::jsonb; end if;
  select name, nr into v_name, v_nr from public.kader where id=p_spieler;
  if v_name is null then return '[]'::jsonb; end if;
  with tage as (
    select left(n.datum,10) d
      from public.nominierungen n
     where n.datum like '%\_\_nom' and left(n.datum,10) ~ '^\d{4}-\d{2}-\d{2}$'
       and left(n.datum,10)::date between public.saison_beginn() and (now() at time zone 'Europe/Berlin')::date
       and coalesce(n.data::jsonb ->> (p_spieler::text), n.data::jsonb ->> v_name) = 'dabei'
  ), spieltag as (
    select jsonb_build_object(
      'art','spieltag', 'datum', t.d,
      'titel', coalesce(nullif(trim(tm.titel),''), nullif(trim(tm.gegner),''), case when tm.typ='turnier' then 'Turnier' else 'Spieltag' end),
      'ort', nullif(trim(coalesce(tm.ort,'')),''), 'heim', tm.heim,
      'team', (select (tt.data::jsonb ->> (p_spieler::text))::int from public.nominierungen tt where tt.datum = t.d || '__teams'
                 and jsonb_typeof(tt.data::jsonb -> (p_spieler::text)) = 'number'),
      'spielform', coalesce(
         (select tt.data::jsonb -> '_form' ->> (tt.data::jsonb ->> (p_spieler::text)) from public.nominierungen tt where tt.datum = t.d || '__teams'
            and jsonb_typeof(tt.data::jsonb -> (p_spieler::text)) = 'number'),
         tm.spielform),
      'satz', (select s.satz from public.sonderkarte s where s.spieler_id=p_spieler and s.art='spieltag' and s.datum=t.d::date),
      'foto_path', public.kind_foto_fuer(p_spieler,'aktion')) k
    from tage t
    left join lateral (select * from public.termine x where x.datum=t.d and x.typ in ('spiel','turnier') order by x.uhrzeit nulls last limit 1) tm on true
  ), kapitaen as (
    select jsonb_build_object(
      'art','kapitaen', 'datum', left(m.datum,10),
      'team', case when m.datum ~ '__t\d+$' then substring(m.datum from '__t(\d+)$')::int else 1 end,
      'mal', row_number() over (order by left(m.datum,10), m.datum),
      'foto_path', public.kind_foto_fuer(p_spieler,'portraet')) k
    from public.match_actions m
    where m.aktion='kapitaen' and m.spieler=v_name and left(m.datum,10) ~ '^\d{4}-\d{2}-\d{2}$'
      and left(m.datum,10)::date between public.saison_beginn() and (now() at time zone 'Europe/Berlin')::date
  ), moment as (
    select jsonb_build_object('art','moment','id',s.id,'datum',s.datum::text,'titel',s.titel,'satz',s.satz,
      'foto_path', public.kind_foto_fuer(p_spieler,'jubel')) k
    from public.sonderkarte s where s.spieler_id=p_spieler and s.art='moment'
  )
  select coalesce(jsonb_agg(x.k || jsonb_build_object('nr',v_nr,'name',v_name) order by x.k->>'datum' desc, x.k->>'art'), '[]'::jsonb)
    into v_res
    from (select k from spieltag union all select k from kapitaen union all select k from moment) x;
  return v_res;
end $$;
revoke all on function public.sonderkarten_kind(bigint) from public, anon;
grant execute on function public.sonderkarten_kind(bigint) to authenticated;

-- Das Kindergerät darf die Album-Fotos des eigenen Kindes laden (für seine Sonderkarten)
drop policy if exists "spielerfotos kind album lesen" on storage.objects;
create policy "spielerfotos kind album lesen" on storage.objects for select to authenticated
  using (bucket_id = 'spielerfotos' and name ~ '^[0-9]+/album/' and public.is_kind_selbst((split_part(name, '/', 1))::bigint));
