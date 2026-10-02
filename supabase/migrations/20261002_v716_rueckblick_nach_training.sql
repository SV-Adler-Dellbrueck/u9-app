-- v716 (PO 02.10.): „Diese Information bitte immer erst nach dem Training einblenden, weil es ja
-- sein kann, dass wir vor dem Training nochmal Änderungen kurzfristig vornehmen und dann denken die
-- Eltern, dass was anderes gemacht wird, als es dann wirklich passiert.“
-- Adler News („Heute im Training geübt“) lesen training_rueckblick. Der Plan des heutigen Tages
-- zählt jetzt erst, wenn das Training vorbei ist: Endzeit des Trainingstermins, ohne Endzeit Beginn
-- plus 90 Minuten, ohne Termin gar nicht (dann erst am nächsten Tag als „Zuletzt“).
create or replace function public.training_rueckblick_roh()
returns json
language sql
stable security definer
set search_path to 'public'
as $function$
  with jetzt as (
    select (now() at time zone 'Europe/Berlin')::date as heute,
           (now() at time zone 'Europe/Berlin')::time as uhr
  )
  select case when (select auth.uid()) is null then '[]'::json else coalesce((
    select json_agg(json_build_object('datum', x.datum, 'themen', x.themen) order by x.datum desc)
    from (
      select tp.datum,
             (select json_agg(distinct e->>'formName')
                from jsonb_array_elements(tp.plan) e
               where coalesce(e->>'formName','') <> '') as themen
        from trainingsplan tp, jetzt j
       where tp.datum >= (now() - interval '7 days')::date
         and (tp.datum < j.heute
              or (tp.datum = j.heute and j.uhr >= coalesce(
                    (select max(coalesce(t.uhrzeit_ende, (t.uhrzeit + interval '90 minutes')::time))
                       from termine t where t.datum = tp.datum::text and t.typ = 'training'),
                    time '23:59:59')))
       order by tp.datum desc limit 3
    ) x where x.themen is not null), '[]'::json) end;
$function$;
