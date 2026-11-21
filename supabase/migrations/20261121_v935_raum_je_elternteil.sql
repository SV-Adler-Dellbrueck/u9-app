-- v935 · Privater Raum je Elternteil (Charles 21.11.2026: „Zusätzlich Raum je Elternteil“, Bild freigegeben, Migration Ja).
-- Bisher hatte jede Familie genau einen privaten Raum mit dem Trainerteam; alle Elternkonten lasen mit. Jetzt kann ein
-- Raum zusätzlich einem einzelnen Elternkonto gehören (eltern_email): Lesen, Schreiben, Ungelesen, Empfänger und Push
-- gelten dann nur für dieses Konto und das Trainerteam. Der Familienraum bleibt, wie er ist.

alter table public.rufe_raum add column if not exists eltern_email text;
drop index if exists public.rufe_raum_familie;
create unique index if not exists rufe_raum_familie on public.rufe_raum (familie_kind) where familie_kind is not null and eltern_email is null;
create unique index if not exists rufe_raum_einzeln on public.rufe_raum (familie_kind, eltern_email) where eltern_email is not null;

-- Sichtbarkeit: Einzelraum nur für das eigene Konto (und das Trainerteam)
create or replace function public.rufe_raum_sichtbar(p_raum bigint)
 returns boolean language sql stable security definer set search_path to 'public'
as $$
  select public.darf_rufen() and exists(
    select 1 from rufe_raum r where r.id = p_raum
      and case when r.nur_eltern then not public.rufe_trainerperson()
               else (r.familie_kind is null or public.is_trainer()
                     or (public.is_parent_of(r.familie_kind)
                         and (r.eltern_email is null or r.eltern_email = lower(coalesce((select auth.jwt())->>'email',''))))) end);
$$;

drop policy if exists rr_lesen on public.rufe_raum;
create policy rr_lesen on public.rufe_raum for select to authenticated using (
  darf_rufen() and case when nur_eltern then not rufe_trainerperson()
    else (familie_kind is null or is_trainer()
          or (is_parent_of(familie_kind) and (eltern_email is null or eltern_email = lower(coalesce((select auth.jwt())->>'email','')))))
  end);

-- Raum öffnen bzw. anlegen. Trainer: p_kind (Familie) und optional p_email (ein Elternkonto dieser Familie).
-- Eltern: p_nur_ich = true öffnet den eigenen Einzelraum.
drop function if exists public.rufe_privat_raum(bigint);
create or replace function public.rufe_privat_raum(p_kind bigint default null, p_email text default null, p_nur_ich boolean default false)
 returns bigint language plpgsql security definer set search_path to 'public'
as $$
declare v_kind bigint; v_id bigint; v_mail text := null; v_ich text := lower(coalesce(auth.jwt()->>'email',''));
begin
  if not public.darf_rufen() then raise exception 'not authorized'; end if;
  if public.is_trainer() then
    if p_kind is null or not exists(select 1 from eltern_kinder e where e.spieler_id=p_kind) then raise exception 'kein Elternzugang'; end if;
    v_kind := public.rufe_familie(p_kind);
    if p_email is not null then
      v_mail := lower(trim(p_email));
      if not exists(select 1 from eltern_kinder e where lower(e.email)=v_mail and public.rufe_familie(e.spieler_id)=v_kind) then
        raise exception 'kein Elternkonto dieser Familie';
      end if;
    end if;
  else
    if p_kind is null then
      select min(e.spieler_id) into v_kind from eltern_kinder e where lower(e.email)=v_ich;
    elsif public.is_parent_of(p_kind) then v_kind := p_kind;
    end if;
    if v_kind is null then raise exception 'not authorized'; end if;
    v_kind := public.rufe_familie(v_kind);
    if p_nur_ich then v_mail := v_ich; end if;
  end if;
  if v_mail is null then
    select id into v_id from rufe_raum where familie_kind=v_kind and eltern_email is null;
    if v_id is null then
      insert into rufe_raum(name, emoji, sort, familie_kind) values ('Trainerteam', '🔒', 1000, v_kind)
      on conflict (familie_kind) where familie_kind is not null and eltern_email is null do nothing returning id into v_id;
      if v_id is null then select id into v_id from rufe_raum where familie_kind=v_kind and eltern_email is null; end if;
    end if;
  else
    select id into v_id from rufe_raum where familie_kind=v_kind and eltern_email=v_mail;
    if v_id is null then
      insert into rufe_raum(name, emoji, sort, familie_kind, eltern_email) values ('Trainerteam', '🔒', 1001, v_kind, v_mail)
      on conflict (familie_kind, eltern_email) where eltern_email is not null do nothing returning id into v_id;
      if v_id is null then select id into v_id from rufe_raum where familie_kind=v_kind and eltern_email=v_mail; end if;
    end if;
  end if;
  return v_id;
end $$;
revoke all on function public.rufe_privat_raum(bigint, text, boolean) from public, anon;
grant execute on function public.rufe_privat_raum(bigint, text, boolean) to authenticated;

-- Name eines Elternkontos: Vorname aus „Meine Angaben“, sonst die Bezeichnung der Einladung (außer „Einladungskarte“),
-- sonst „Elternteil n“ in der Reihenfolge der Zugänge der Familie.
create or replace function public._rufe_elternname(p_mail text, p_fam bigint)
 returns text language sql stable security definer set search_path to 'public'
as $$
  select coalesce(
    (select nullif(trim(a.vorname),'') from auth.users u join eltern_angaben a on a.user_id=u.id where lower(u.email)=lower(p_mail) limit 1),
    (select nullif(trim(e.label),'') from eltern_kinder e where lower(e.email)=lower(p_mail) and coalesce(e.label,'') not ilike 'Einladung%' order by e.id limit 1),
    'Elternteil ' || (select count(distinct lower(e2.email)) from eltern_kinder e2
                       where public.rufe_familie(e2.spieler_id)=p_fam
                         and (select min(e3.id) from eltern_kinder e3 where lower(e3.email)=lower(e2.email))
                             <= (select min(e4.id) from eltern_kinder e4 where lower(e4.email)=lower(p_mail))));
$$;
revoke all on function public._rufe_elternname(text, bigint) from public, anon, authenticated;

-- Trainer: Elternkonten je Familie (für „Nur …“) – Mail nur fürs Trainerteam
create or replace function public.rufe_elternkonten()
 returns table(familie_kind bigint, mail text, name text)
 language sql stable security definer set search_path to 'public'
as $$
  select f.fid, f.mail, public._rufe_elternname(f.mail, f.fid)
    from (select distinct public.rufe_familie(e.spieler_id) fid, lower(e.email) mail from eltern_kinder e) f
   where public.is_trainer()
   order by 1, 3;
$$;
revoke all on function public.rufe_elternkonten() from public, anon;
grant execute on function public.rufe_elternkonten() to authenticated;

-- Wer liest in einem privaten Raum mit (Elternteile, ohne Mail) – für die Kopfzeile
create or replace function public.rufe_mitleser(p_raum bigint)
 returns table(name text, ich boolean)
 language sql stable security definer set search_path to 'public'
as $$
  select public._rufe_elternname(f.mail, r.familie_kind), f.mail = lower(coalesce(auth.jwt()->>'email',''))
    from rufe_raum r
    join (select distinct public.rufe_familie(e.spieler_id) fid, lower(e.email) mail from eltern_kinder e) f
      on f.fid = r.familie_kind and (r.eltern_email is null or f.mail = r.eltern_email)
   where r.id = p_raum and r.familie_kind is not null and public.rufe_raum_sichtbar(p_raum)
   order by 1;
$$;
revoke all on function public.rufe_mitleser(bigint) from public, anon;
grant execute on function public.rufe_mitleser(bigint) to authenticated;

-- Empfänger („Wer hat ihn gesehen?“): im Einzelraum nur dieses Konto
create or replace function public._rufe_empfaenger(p_nachricht bigint)
 returns table(user_id uuid, name text, trainer boolean, zuletzt timestamp with time zone, gesehen boolean)
 language sql stable security definer set search_path to 'public'
as $$
  with n as (
    select n.id, n.raum_id, n.autor, n.created_at, r.familie_kind, r.eltern_email
      from rufe_nachricht n join rufe_raum r on r.id=n.raum_id where n.id=p_nachricht
  ), konten as (
    select u.id, lower(u.email) mail, coalesce(p.role='trainer',false) trainer
      from auth.users u left join profiles p on p.id=u.id, n
     where u.id<>n.autor
       and (p.role='trainer'
            or (exists(select 1 from eltern_kinder e where lower(e.email)=lower(u.email)
                        and (n.familie_kind is null or public.rufe_familie(e.spieler_id)=n.familie_kind))
                and (n.eltern_email is null or lower(u.email)=n.eltern_email)))
  )
  select k.id,
         case when k.trainer then coalesce((select nullif(trim(p.anzeigename),'') from profiles p where p.id=k.id),'Trainer')
              else coalesce((select nullif(trim(a.vorname),'') from eltern_angaben a where a.user_id=k.id),
                            (select nullif(trim(p.anzeigename),'') from profiles p where p.id=k.id),'Elternteil')
                   || coalesce(' ('||(select string_agg(kd.name, ', ' order by kd.name) from eltern_kinder e join kader kd on kd.id=e.spieler_id
                                      where lower(e.email)=k.mail)||')','') end,
         k.trainer, g.zuletzt, coalesce(g.zuletzt >= n.created_at, false)
    from konten k cross join n
    left join rufe_gelesen g on g.user_id=k.id and g.raum_id=n.raum_id;
$$;

-- Push: im Einzelraum nur an dieses Konto (sonst unverändert gegenüber der bisherigen Fassung)
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
            or (exists(select 1 from eltern_kinder ek where lower(ek.email)=e.mail and ek.spieler_id=r.familie_kind)
                and (r.eltern_email is null or e.mail=r.eltern_email)))
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
