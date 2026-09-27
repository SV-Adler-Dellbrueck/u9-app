-- Eingespielt am 27.09.2026 (vor dem Trainermeeting).
-- v636 · team_gallery() nur noch für Trainer.
-- Befund 27.09.: Die Funktion (SECURITY DEFINER, EXECUTE für authenticated) lieferte jeder
-- angemeldeten, nicht-anonymen Sitzung – also auch jedem Elternkonto – Namen, Anwesenheit und die
-- rohen Bewertungswerte (radios) ALLER aktiven Kinder. Der Client ruft sie seit v590 nicht mehr auf
-- (Kinder: team_gallery_kind, Eltern: my_child_card). Vor der ersten echten Spielerbewertung dicht.
create or replace function public.team_gallery()
 returns jsonb
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select case when not public.sitzung_gueltig() or public.ist_anonym() or not public.is_trainer() then '[]'::jsonb
              else coalesce(jsonb_agg(g order by g->>'name'), '[]'::jsonb) end from (
    select jsonb_build_object(
      'spieler_id', k.id, 'name', k.name, 'nr', k.nr, 'tw', k.tw,
      'spitzname', f.spitzname, 'lieblingsverein', f.lieblingsverein, 'lieblingsspieler', f.lieblingsspieler,
      'radios', coalesce((select radios from public.spielerprofile sp where sp.name=k.name order by datum desc nulls last limit 1), '{}'::jsonb),
      'foto_path', case when coalesce(f.gallery_optin,false) or coalesce(k.foto_stadionheft_ok,false)
                        then coalesce(f.foto_path, k.foto_path) else null end,
      'trainings', (select count(*) from public.anwesenheit a where (coalesce(a.data->(k.id::text), a.data->k.name)->>'da')='true')
    ) as g
    from public.kader k left join public.kind_fanfacts f on f.spieler_id=k.id
    where k.aktiv) x;
$function$;
