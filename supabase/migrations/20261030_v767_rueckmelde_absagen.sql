-- v767 (Charles 30.10.): „Wann haben Eltern ein Training oder Spiel abgesagt – wie viele Tage oder Stunden vorher?“
-- Die Auswertung „Rückmelde-Verhalten“ (v672) misst die erste Antwort. Hier kommt die einzelne Absage dazu: je Termin und Kind
-- der Zeitpunkt der Absage und der Vorlauf bis Terminbeginn. Nur Trainer (is_trainer). Zeitpunkt:
--   · seit dem 29.09.2026 aus dem Protokoll rueckmeldung_log (letzter Wechsel auf „abgesagt“ oder „krank“, nicht vom Trainerteam) – genau = true
--   · davor oder ohne Protokoll: der Zeitpunkt der ersten Antwort (created_at) – genau = false, denn ein früherer Wechsel von Zu- auf Absage ist dort nicht festgehalten
-- Von Trainern eingetragene Absagen (letzter Protokolleintrag durch_trainer) fehlen: sie sind keine Entscheidung der Familie.
-- Gezählt wird der aktuelle Stand: wer erst abgesagt und dann wieder zugesagt hat, steht nicht darin.
create or replace function public.rueckmelde_absagen(p_ab text default null)
returns table(spieler_id bigint, name text, termin_id bigint, art text, datum text, titel text,
              beginn timestamptz, abgesagt_am timestamptz, vorlauf_std numeric, genau boolean)
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
         (l.geaendert_am is not null)
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
