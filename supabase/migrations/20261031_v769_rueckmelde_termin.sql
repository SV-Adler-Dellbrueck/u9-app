-- v769 (Charles 31.10.): „Ich möchte konkret an einem Termin sehen, wer wann abgesagt oder zugesagt hat.“
-- Je Termin eine Zeile je aktivem Kind: aktueller Status (null = keine Antwort), Zeitpunkt der ersten Antwort (created_at),
-- Zeitpunkt der letzten Änderung und der Verlauf aus dem Protokoll rueckmeldung_log (seit dem 29.09.2026; Zeitpunkt, neuer Status,
-- ob das Trainerteam eingetragen hat). Ohne Protokolleintrag ist nur die erste Antwort bekannt (genau = false). Nur Trainer.
create or replace function public.rueckmelde_termin(p_termin bigint)
returns table(spieler_id bigint, name text, status text, erste_antwort timestamptz, letzte_aenderung timestamptz,
              durch_trainer boolean, verlauf jsonb, beginn timestamptz, genau boolean)
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
         coalesce(l.verlauf, '[]'::jsonb), t.beginn, (l.letzte is not null)
    from kader k
    cross join t
    left join rueckmeldungen rm on rm.termin_id = p_termin and rm.spieler_id = k.id
    left join l on l.spieler_id = k.id
   where public.is_trainer() and coalesce(k.aktiv, true)
   order by k.name;
$$;
revoke all on function public.rueckmelde_termin(bigint) from public, anon;
grant execute on function public.rueckmelde_termin(bigint) to authenticated, service_role;
