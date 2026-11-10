-- v831 · Elternrunde: auch die Elternkonten von Trainern bleiben draußen (Charles 10.11.2026)
--
-- v829 schloss Konten mit Trainerrolle aus. Zwei Trainer sind zusätzlich mit einem eigenen Elternkonto
-- (andere E-Mail-Adresse) angemeldet – für die Datenbank sind das gewöhnliche Eltern, sie sahen die
-- Elternrunde. Entscheidung (Kachel): genau diese Konten sperren, Partner derselben Familien bleiben drin.
-- Die Sperrliste gilt nur für die Elternrunde; im Rest der App ändert sich für diese Konten nichts.

create table if not exists public.rufe_eltern_ausschluss (
  user_id    uuid primary key,
  created_at timestamptz not null default now()
);
comment on table public.rufe_eltern_ausschluss is 'v831: Elternkonten von Trainern, die die Elternrunde nicht sehen. Nur Trainer pflegen; jeder sieht die eigene Zeile.';
alter table public.rufe_eltern_ausschluss enable row level security;
revoke all on public.rufe_eltern_ausschluss from anon, public;
revoke all on public.rufe_eltern_ausschluss from authenticated;
grant select, insert, delete on public.rufe_eltern_ausschluss to authenticated;
drop policy if exists rea_trainer on public.rufe_eltern_ausschluss;
create policy rea_trainer on public.rufe_eltern_ausschluss for all to authenticated
  using (public.is_trainer()) with check (public.is_trainer());
drop policy if exists rea_selbst on public.rufe_eltern_ausschluss;
create policy rea_selbst on public.rufe_eltern_ausschluss for select to authenticated
  using (user_id = (select auth.uid()));

-- „Gehört zum Trainerteam“ – Trainerrolle oder gesperrtes Elternkonto eines Trainers
create or replace function public.rufe_trainerperson() returns boolean
 language sql stable security definer set search_path to 'public' as $fn$
  select public.is_trainer()
      or exists(select 1 from public.rufe_eltern_ausschluss x where x.user_id = (select auth.uid()));
$fn$;
revoke all on function public.rufe_trainerperson() from public, anon;
grant execute on function public.rufe_trainerperson() to authenticated;

create or replace function public.rufe_raum_sichtbar(p_raum bigint) returns boolean
 language sql stable security definer set search_path to 'public' as $fn$
  select public.darf_rufen() and exists(
    select 1 from rufe_raum r where r.id = p_raum
      and case when r.nur_eltern then not public.rufe_trainerperson()
               else (r.familie_kind is null or public.is_trainer() or public.is_parent_of(r.familie_kind)) end);
$fn$;

drop policy if exists rr_lesen on public.rufe_raum;
create policy rr_lesen on public.rufe_raum for select to authenticated
  using (public.darf_rufen() and case when nur_eltern then not public.rufe_trainerperson()
                                      else (familie_kind is null or public.is_trainer() or public.is_parent_of(familie_kind)) end);
drop policy if exists rr_mod on public.rufe_raum;
create policy rr_mod on public.rufe_raum for all to authenticated
  using (public.is_rufe_mod() and familie_kind is null and (not nur_eltern or not public.rufe_trainerperson()))
  with check (public.is_rufe_mod() and familie_kind is null and (not nur_eltern or not public.rufe_trainerperson()));

drop policy if exists rme_mod on public.rufe_meldung;
create policy rme_mod on public.rufe_meldung for select to authenticated
  using (public.is_rufe_mod() and not (public.rufe_nachricht_nur_eltern(nachricht_id) and public.rufe_trainerperson()));
drop policy if exists rme_erledigt on public.rufe_meldung;
create policy rme_erledigt on public.rufe_meldung for update to authenticated
  using (public.is_rufe_mod() and not (public.rufe_nachricht_nur_eltern(nachricht_id) and public.rufe_trainerperson()))
  with check (public.is_rufe_mod() and not (public.rufe_nachricht_nur_eltern(nachricht_id) and public.rufe_trainerperson()));

-- Push: gesperrte Elternkonten bekommen zur Elternrunde keine Benachrichtigung
CREATE OR REPLACE FUNCTION public.rufe_push_faellig(p_jetzt timestamp with time zone DEFAULT now())
 RETURNS TABLE(user_id uuid, trainer boolean, anzahl integer, titel text, text text, url text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
begin
  return query
  with empf as (
    select distinct s.user_id, coalesce(p.role='trainer',false) trainer, lower(u.email) mail
      from push_subscriptions s
      join auth.users u on u.id=s.user_id
      left join profiles p on p.id=s.user_id
     where (p.role='trainer' or exists(select 1 from eltern_kinder e where lower(e.email)=lower(u.email)))
       and not public.push_ruht(s.user_id, p_jetzt)
       and not exists(select 1 from rufe_push_aus a where a.user_id=s.user_id)
  ), neu as (
    select e.user_id, e.trainer, n.id, n.raum_id, n.autor_name, n.autor_rolle, n.an_alle, n.text, n.created_at,
           r.familie_kind is not null privat
      from empf e
      join rufe_nachricht n on n.archiviert_am is null and n.autor<>e.user_id and n.created_at <= p_jetzt
      join rufe_raum r on r.id=n.raum_id and not r.archiviert
      left join rufe_gelesen g on g.user_id=e.user_id and g.raum_id=n.raum_id
      left join rufe_push_stand st on st.user_id=e.user_id
     where n.created_at > greatest(coalesce(g.zuletzt,'-infinity'::timestamptz), coalesce(st.bis,'-infinity'::timestamptz), p_jetzt - interval '2 days')
       and not (r.nur_eltern and (e.trainer or exists(select 1 from rufe_eltern_ausschluss x where x.user_id=e.user_id)))
 and (r.familie_kind is null or e.trainer
            or exists(select 1 from eltern_kinder ek where lower(ek.email)=e.mail and ek.spieler_id=r.familie_kind))
  ), je as (
    select nu.user_id, bool_or(nu.trainer) trainer, count(*)::int anzahl, max(nu.created_at) bis,
           bool_or(nu.autor_rolle='trainer' or nu.an_alle) sofort,
           (array_agg(case when nu.privat then '🔒 ' else '' end||nu.autor_name||': '||left(nu.text,110)
                      order by (nu.autor_rolle='trainer' or nu.an_alle) desc, nu.created_at desc))[1] kopf,
           (array_agg(nu.raum_id order by (nu.autor_rolle='trainer' or nu.an_alle) desc, nu.created_at desc))[1] raum
      from neu nu group by nu.user_id
  ), faellig as (
    select j.* from je j left join rufe_push_stand st on st.user_id=j.user_id
     where j.sofort or st.zuletzt_gepusht is null or st.zuletzt_gepusht < p_jetzt - interval '30 minutes'
  ), gemerkt as (
    insert into rufe_push_stand(user_id, bis, zuletzt_gepusht)
    select f.user_id, f.bis, p_jetzt from faellig f
    on conflict (user_id) do update set bis=excluded.bis, zuletzt_gepusht=excluded.zuletzt_gepusht
    returning rufe_push_stand.user_id
  )
  select f.user_id, f.trainer, f.anzahl, '📣 Adler-Rufe'::text,
         case when f.anzahl=1 then f.kopf
              when f.sofort then f.kopf||' · +'||(f.anzahl-1)||' weitere'
              else f.anzahl||' neue Adler-Rufe' end,
         case when f.trainer then './trainer/?rufe=' else './eltern/?rufe=' end || f.raum
    from faellig f where f.user_id in (select g.user_id from gemerkt g);
end $function$;

-- Die Konten selbst werden nicht hier eingetragen (das Repo ist öffentlich): Eintrag über die
-- Datenbank, ausgewählt nach Vorname und Kind, ohne Adresse.
