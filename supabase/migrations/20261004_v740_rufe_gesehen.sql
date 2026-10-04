-- v740 · Adler-Rufe: „Gesehen von …“ – nur für das Trainerteam (PO 04.10., Kachel „Nur Trainer“).
-- Grundlage ist rufe_gelesen (seit v670): je Konto und Raum, bis wann gelesen wurde. Ein Ruf gilt als
-- gesehen, wenn das Konto den Raum nach dem Ruf geöffnet hat. Die Tabelle bleibt „nur die eigene Zeile“;
-- gelesen wird ausschließlich über die beiden Funktionen, und die antworten nur Trainern. Eltern sehen
-- keine Lesebestätigung, weder eigene noch fremde.
-- Empfänger eines Rufs: alle Konten, die den Raum sehen dürfen (Trainer; Eltern mit Kind – im privaten
-- Raum nur die Familie), ohne den Absender. Familien ohne Konto stehen in der Liste als „ohne Zugang“.

create or replace function public._rufe_empfaenger(p_nachricht bigint)
returns table(user_id uuid, name text, trainer boolean, zuletzt timestamptz, gesehen boolean)
language sql stable security definer set search_path to 'public' as $$
  with n as (
    select n.id, n.raum_id, n.autor, n.created_at, r.familie_kind
      from rufe_nachricht n join rufe_raum r on r.id=n.raum_id where n.id=p_nachricht
  ), konten as (
    select u.id, lower(u.email) mail, coalesce(p.role='trainer',false) trainer
      from auth.users u left join profiles p on p.id=u.id, n
     where u.id<>n.autor
       and (p.role='trainer'
            or exists(select 1 from eltern_kinder e where lower(e.email)=lower(u.email)
                       and (n.familie_kind is null or public.rufe_familie(e.spieler_id)=n.familie_kind)))
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
revoke all on function public._rufe_empfaenger(bigint) from public, anon, authenticated;

-- Zahlen für die Liste: je Ruf gesehen / Empfänger
create or replace function public.rufe_gesehen_zahlen(p_ids bigint[])
returns table(nachricht_id bigint, gesehen integer, empfaenger integer)
language sql stable security definer set search_path to 'public' as $$
  select i, count(*) filter (where e.gesehen)::int, count(*)::int
    from unnest(p_ids[1:200]) i, public._rufe_empfaenger(i) e
   where public.is_trainer()
   group by i;
$$;

-- Namen für einen Ruf; dazu aktive Kinder ohne Elternkonto (nur in offenen Räumen)
create or replace function public.rufe_gesehen(p_nachricht bigint)
returns table(name text, trainer boolean, gesehen boolean, zuletzt timestamptz, ohne_zugang boolean)
language sql stable security definer set search_path to 'public' as $$
  select e.name, e.trainer, e.gesehen, case when e.gesehen then e.zuletzt end, false
    from public._rufe_empfaenger(p_nachricht) e where public.is_trainer()
  union all
  select k.name, false, false, null, true
    from kader k
   where public.is_trainer() and k.aktiv
     and exists(select 1 from rufe_nachricht n join rufe_raum r on r.id=n.raum_id where n.id=p_nachricht and r.familie_kind is null)
     and not exists(select 1 from eltern_kinder e join auth.users u on lower(u.email)=lower(e.email) where e.spieler_id=k.id);
$$;

revoke all on function public.rufe_gesehen_zahlen(bigint[]) from public, anon;
revoke all on function public.rufe_gesehen(bigint) from public, anon;
grant execute on function public.rufe_gesehen_zahlen(bigint[]) to authenticated;
grant execute on function public.rufe_gesehen(bigint) to authenticated;
