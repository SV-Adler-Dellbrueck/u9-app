-- Hotfix 24.11. (vor v964): Abstimmungen zählen je Kind einmal.
-- Charles: „Beide Eltern … haben abgestimmt. Dann zählt es doppelt … Beide Eltern können zwar abstimmen, aber sollte nur
-- einmal gezählt werden pro Kind.“
-- Zähleinheit einer Stimme: jedes Kind, mit dem das Konto verknüpft ist (eltern_kinder über die E-Mail – auch bei Trainern,
-- die zugleich Eltern sind); ein Konto ohne Kind zählt für sich selbst. Namen bleiben vollständig (beide Elternteile sichtbar),
-- nur „anzahl“ und „teilnehmer“ zählen Einheiten statt Konten.
create or replace function public.rufe_umfrage_stand(p_ids bigint[])
returns table(umfrage_id bigint, option integer, anzahl integer, namen text[], ich boolean, teilnehmer integer)
 language sql stable security definer set search_path to 'public' as $$
  with f as (
    select u.id, u.anonym
      from rufe_umfrage u join rufe_nachricht n on n.id=u.nachricht_id
     where u.id = any(p_ids) and public.rufe_raum_sichtbar(n.raum_id)
       and (n.archiviert_am is null or public.rufe_darf_archiv(n.raum_id))
  ),
  einheit as (
    select s.umfrage_id, s.option, coalesce('k'||e.spieler_id, 'u'||s.user_id) einheit
      from rufe_stimme s join f on f.id=s.umfrage_id
      left join auth.users au on au.id=s.user_id
      left join eltern_kinder e on lower(e.email)=lower(au.email)
  )
  select s.umfrage_id, s.option::int,
         (select count(distinct x.einheit)::int from einheit x where x.umfrage_id=s.umfrage_id and x.option=s.option),
         case when f.anonym then null else array_agg(coalesce(s.name,'?') order by s.created_at) end,
         bool_or(s.user_id=auth.uid()),
         (select count(distinct x.einheit)::int from einheit x where x.umfrage_id=s.umfrage_id)
    from rufe_stimme s join f on f.id=s.umfrage_id
   group by s.umfrage_id, s.option, f.anonym;
$$;
revoke all on function public.rufe_umfrage_stand(bigint[]) from public, anon;
grant execute on function public.rufe_umfrage_stand(bigint[]) to authenticated;
