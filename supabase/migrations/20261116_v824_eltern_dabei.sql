-- v824 · „Wie war das Training?“ nur für Familien, deren Kind dabei war (Charles 10.11.2026)
--
-- Die Anwesenheit führen die Trainer (Tabelle anwesenheit, je Termin ein JSON: Kader-ID → {da: true|false}).
-- Eltern lesen diese Tabelle nicht (Regel: nur Trainer). Die Funktion sagt einem angemeldeten Elternteil
-- je Termin nur EINES: war mindestens eines der eigenen Kinder als „da“ eingetragen – ja oder nein.
-- Keine Namen, keine anderen Kinder, keine Zahlen. Ist für einen Termin keine Anwesenheit erfasst
-- (kein Kind als „da“ eingetragen), kommt für ihn keine Zeile zurück; die App nimmt dann die Rückmeldung.

create or replace function public.eltern_dabei(p_termine bigint[])
returns table(termin_id bigint, dabei boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select a.termin_id,
         bool_or(coalesce((a.data -> (ek.spieler_id::text) ->> 'da')::boolean, false)) as dabei
    from public.anwesenheit a
    join public.eltern_kinder ek
      on lower(ek.email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
   where a.termin_id = any(p_termine)
     and public.sitzung_gueltig()
     and exists (select 1 from jsonb_each(a.data) e
                  where e.key ~ '^[0-9]+$' and (e.value ->> 'da')::boolean)
   group by a.termin_id;
$$;

revoke execute on function public.eltern_dabei(bigint[]) from public, anon;
grant execute on function public.eltern_dabei(bigint[]) to authenticated;
