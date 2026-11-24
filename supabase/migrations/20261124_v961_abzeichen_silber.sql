-- v961 · Charles 24.11.2026: „Wir machen aus der Adler-Schule eine Adler-Akademie und integrieren die Technik-Abzeichen dort mit
-- rein … Dann brauchen wir auch eine nächste Stufe der aktuellen Technik-Abzeichen.“ Freigegeben (Bild): Silber-Stufe mit zehn
-- Übungen für zu Hause, jedes Silber-Abzeichen bringt mehr Federn als Bronze (Bronze 10, Silber 20).
create or replace function public.xp_points_for(p_quelle text)
 returns integer language sql immutable set search_path to 'pg_catalog' as $function$
  select case p_quelle
    when 'quiz' then 10 when 'rsvp' then 5 when 'training' then 15
    when 'challenge' then 20 when 'wissensquiz' then 2 when 'abzeichen' then 10
    when 'abzeichen_silber' then 20
    when 'fairplay_quiz' then 50 when 'waesche' then 100 when 'skillwoche' then 50
    when 'streak' then 25 when 'ziel' then 30 when 'packliste' then 5
    when 'album' then 25
    else 0 end;
$function$;

-- „Das kann … jetzt“ im Eltern-Bereich: auch Silber-Abzeichen (art bleibt 'abzeichen', die Kennung sagt die Stufe)
create or replace function public.kann_jetzt_public(p_kind_id bigint, p_tage integer default 14)
 returns table(art text, text text, wann timestamp with time zone)
 language sql stable security definer set search_path to 'public' as $function$
  with fenster as (
    select now() - make_interval(days => greatest(1, least(coalesce(p_tage, 14), 90))) as ab
  )
  select x.art, x.text, x.wann
    from (
      select 'ziel'::text as art, z.ziel::text as text, z.erreicht_at as wann
        from public.entwicklungsziele z, fenster f
       where z.spieler_id = p_kind_id
         and z.status = 'erreicht'
         and z.erreicht_at is not null
         and z.erreicht_at >= f.ab
         and coalesce(btrim(z.ziel), '') <> ''
      union all
      select 'abzeichen'::text, p.quelle_id::text, p.created_at
        from public.punkte_log p, fenster f
       where p.spieler_id = p_kind_id
         and p.quelle in ('abzeichen', 'abzeichen_silber')
         and p.quelle_id is not null
         and p.created_at >= f.ab
    ) x
   where public.is_trainer() or public.is_parent_of(p_kind_id)
   order by x.wann desc
   limit 3;
$function$;
