-- Kinder-App, Schritt 7 (v594): die Zahl der gekoppelten Kindergeraete fuer den Trainer
--
-- Das Auftragspaket sagt: „Trainer sehen unter Orga → Nutzung, wie viele Kindergeraete
-- gekoppelt sind, ohne Namen." Die Leseregel auf kind_konto laesst einen Trainer heute
-- zwar alle Zeilen sehen - samt spieler_id und damit dem Kind. Fuer eine Zahl in der
-- Nutzungs-Auswertung braucht die App das nicht, und was die App nicht anfragt, kann sie
-- auch nicht anzeigen. Dieser RPC gibt ausschliesslich Summen zurueck.
--
-- Der Zeitbezug ist der Berliner Tag, wie ueberall in der Kinder-App (kind_status,
-- kind_tick, die Edge Function).
create or replace function public.kind_geraete_stat()
returns json language sql stable security definer set search_path to 'public' as $fn$
  select case when not public.is_trainer() then json_build_object('ok', false) else
    (select json_build_object(
       'ok', true,
       'geraete',       count(*) filter (where k.aktiv),
       'kinder',        count(distinct k.spieler_id) filter (where k.aktiv),
       'getrennt',      count(*) filter (where not k.aktiv),
       'heute_aktiv',   count(*) filter (where k.aktiv and coalesce(s.minuten,0) > 0),
       'minuten_heute', coalesce(sum(s.minuten) filter (where k.aktiv), 0),
       'limit_min',     coalesce(min(k.tageslimit_min) filter (where k.aktiv), 0),
       'limit_max',     coalesce(max(k.tageslimit_min) filter (where k.aktiv), 0))
     from public.kind_konto k
     left join public.kind_sitzung s
       on s.uid = k.uid and s.datum = (now() at time zone 'Europe/Berlin')::date)
  end;
$fn$;

grant execute on function public.kind_geraete_stat() to authenticated;
