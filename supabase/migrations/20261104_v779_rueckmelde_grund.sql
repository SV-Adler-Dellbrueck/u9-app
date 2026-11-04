-- v779 (Charles 04.11.): Der Grund einer Absage (rueckmeldungen.kommentar, seit v774 bei Absagen unter 24 Stunden Pflicht) soll im Reiter „Absagen“
-- und im Termin-Fenster „Rückmeldungen“ stehen. Beide Funktionen liefern dafür eine zusätzliche Spalte `grund` (leer, wenn kein Grund eingetragen ist).
-- Der Rückgabetyp ändert sich, deshalb erst löschen, dann neu anlegen; Rechte wie bisher: nur Trainer, nicht anon.
drop function if exists public.rueckmelde_absagen(text);
create function public.rueckmelde_absagen(p_ab text default null)
returns table(spieler_id bigint, name text, termin_id bigint, art text, datum text, titel text,
              beginn timestamptz, abgesagt_am timestamptz, vorlauf_std numeric, genau boolean, grund text)
language sql stable security definer set search_path = public as $$
  with t as (
    select te.id, case when te.typ='training' then 'training' else 'spiel' end art, te.datum,
           coalesce(nullif(te.titel,''), nullif(te.gegner,'')) titel,
           (te.datum || ' ' || coalesce(to_char(te.uhrzeit,'HH24:MI'),'10:00'))::timestamp at time zone 'Europe/Berlin' beginn
      from termine te
     where te.typ in ('training','spiel','turnier')
       and te.datum >= coalesce(p_ab, public.saison_beginn(to_char(current_date,'YYYY-MM-DD')))
  ), l as (
    select distinct on (lg.termin_id, lg.spieler_id) lg.termin_id, lg.spieler_id, lg.geaendert_am, lg.durch_trainer
      from rueckmeldung_log lg
     where lg.status_neu in ('abgesagt','krank')
     order by lg.termin_id, lg.spieler_id, lg.geaendert_am desc
  )
  select k.id, k.name, rm.termin_id, t.art, t.datum, t.titel, t.beginn,
         coalesce(l.geaendert_am, rm.created_at),
         round((extract(epoch from (t.beginn - coalesce(l.geaendert_am, rm.created_at)))/3600.0)::numeric, 1),
         (l.geaendert_am is not null),
         nullif(trim(rm.kommentar), '')
    from rueckmeldungen rm
    join t on t.id = rm.termin_id
    join kader k on k.id = rm.spieler_id and coalesce(k.aktiv, true)
    left join l on l.termin_id = rm.termin_id and l.spieler_id = rm.spieler_id
   where public.is_trainer()
     and rm.status in ('abgesagt','krank')
     and coalesce(l.durch_trainer, false) = false
     and coalesce(l.geaendert_am, rm.created_at) is not null
   order by t.beginn desc, k.name;
$$;
revoke all on function public.rueckmelde_absagen(text) from public, anon;
grant execute on function public.rueckmelde_absagen(text) to authenticated, service_role;

drop function if exists public.rueckmelde_termin(bigint);
create function public.rueckmelde_termin(p_termin bigint)
returns table(spieler_id bigint, name text, status text, erste_antwort timestamptz, letzte_aenderung timestamptz,
              durch_trainer boolean, verlauf jsonb, beginn timestamptz, genau boolean, grund text)
language sql stable security definer set search_path = public as $$
  with t as (
    select te.id, (te.datum || ' ' || coalesce(to_char(te.uhrzeit,'HH24:MI'),'10:00'))::timestamp at time zone 'Europe/Berlin' beginn
      from termine te where te.id = p_termin
  ), l as (
    select lg.spieler_id,
           jsonb_agg(jsonb_build_object('status', lg.status_neu, 'am', lg.geaendert_am, 'trainer', lg.durch_trainer) order by lg.geaendert_am, lg.id) verlauf,
           max(lg.geaendert_am) letzte,
           (array_agg(lg.durch_trainer order by lg.geaendert_am desc, lg.id desc))[1] zuletzt_trainer
      from rueckmeldung_log lg
     where lg.termin_id = p_termin
     group by lg.spieler_id
  )
  select k.id, k.name, rm.status, rm.created_at, coalesce(l.letzte, rm.created_at), coalesce(l.zuletzt_trainer, false),
         coalesce(l.verlauf, '[]'::jsonb), t.beginn, (l.letzte is not null),
         nullif(trim(rm.kommentar), '')
    from kader k
    cross join t
    left join rueckmeldungen rm on rm.termin_id = p_termin and rm.spieler_id = k.id
    left join l on l.spieler_id = k.id
   where public.is_trainer() and coalesce(k.aktiv, true)
   order by k.name;
$$;
revoke all on function public.rueckmelde_termin(bigint) from public, anon;
grant execute on function public.rueckmelde_termin(bigint) to authenticated, service_role;
