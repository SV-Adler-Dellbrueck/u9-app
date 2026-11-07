-- v799 (Charles 07.11.): Sagt eine Familie weniger als 24 Stunden vor Beginn ab (oder meldet krank), bekommt das Trainerteam
-- eine Benachrichtigung. Der Versand läuft über dieselbe Funktion rufe-push (alle 5 Minuten, kein eigener Cron-Job).
-- absage_push_faellig() entscheidet und merkt sich jede Meldung (genau einmal je Absage). Ruhezeit je Konto wie bei allen
-- Trainer-Pushes: Was in die Ruhezeit fällt, wartet in push_warteschlange. Der Text nennt Kind, Termin und Vorlauf –
-- bewusst NICHT den Grund (kann Gesundheitsdaten enthalten und stünde auf dem Sperrbildschirm); den liest das Team im
-- Reiter „Absagen“ bzw. im Termin-Fenster.
create table if not exists public.absage_push_log (
  termin_id   bigint      not null,
  spieler_id  bigint      not null,
  abgesagt_am timestamptz not null,
  gesendet_am timestamptz not null default now(),
  primary key (termin_id, spieler_id, abgesagt_am)
);
comment on table public.absage_push_log is 'v799: welche kurzfristigen Absagen schon an das Trainerteam gemeldet wurden. Nur Server.';
alter table public.absage_push_log enable row level security;
revoke all on public.absage_push_log from anon, authenticated;

create or replace function public.absage_push_faellig(p_jetzt timestamptz default now())
returns table(user_id uuid, titel text, text text, url text, tag text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  return query
  with t as (
    select te.id, te.typ, coalesce(nullif(te.titel,''), nullif(te.gegner,''), case when te.typ='training' then 'Training' else 'Spiel' end) name_termin,
           te.datum, (te.datum || ' ' || coalesce(to_char(te.uhrzeit,'HH24:MI'),'10:00'))::timestamp at time zone 'Europe/Berlin' beginn
      from termine te
     where te.typ in ('training','spiel','turnier')
       and coalesce(te.platz_status,'') <> 'abgesagt'
       and te.datum ~ '^\d{4}-\d{2}-\d{2}$'
       and te.datum::date between (p_jetzt at time zone 'Europe/Berlin')::date - 1 and (p_jetzt at time zone 'Europe/Berlin')::date + 2
  ), l as (
    select distinct on (lg.termin_id, lg.spieler_id) lg.termin_id, lg.spieler_id, lg.geaendert_am, lg.durch_trainer
      from rueckmeldung_log lg
     where lg.status_neu in ('abgesagt','krank')
     order by lg.termin_id, lg.spieler_id, lg.geaendert_am desc
  ), kand as (
    select t.id termin_id, t.name_termin, t.beginn, l.spieler_id, l.geaendert_am, k.name kind
      from l
      join t on t.id = l.termin_id
      join rueckmeldungen rm on rm.termin_id = l.termin_id and rm.spieler_id = l.spieler_id and rm.status in ('abgesagt','krank')
      join kader k on k.id = l.spieler_id and coalesce(k.aktiv, true)
     where not l.durch_trainer
       and l.geaendert_am >= p_jetzt - interval '6 hours'
       and l.geaendert_am <= p_jetzt - interval '1 minute'          -- kurz warten: der Grund wird nach dem Tipp noch eingetragen
       and t.beginn - l.geaendert_am < interval '24 hours'
       and t.beginn > l.geaendert_am - interval '1 hour'             -- Absage nach Spielende zählt nicht
       and not exists (select 1 from absage_push_log g where g.termin_id = l.termin_id and g.spieler_id = l.spieler_id and g.abgesagt_am = l.geaendert_am)
  ), gemerkt as (
    insert into absage_push_log(termin_id, spieler_id, abgesagt_am)
    select termin_id, spieler_id, geaendert_am from kand
    on conflict do nothing
    returning absage_push_log.termin_id, absage_push_log.spieler_id, absage_push_log.abgesagt_am
  ), emp as (
    select kd.*, p.id uid,
           public.push_ruht(p.id, p_jetzt) ruht,
           case when kd.beginn - kd.geaendert_am < interval '1 hour' then 'unter 1 Std.'
                when kd.beginn - kd.geaendert_am < interval '3 hours' then 'unter 3 Std.'
                else 'unter 24 Std.' end vorlauf
      from kand kd
      join gemerkt g on g.termin_id = kd.termin_id and g.spieler_id = kd.spieler_id and g.abgesagt_am = kd.geaendert_am
      join profiles p on p.role = 'trainer'
     where exists (select 1 from push_subscriptions ps where ps.user_id = p.id)
  ), warte as (
    insert into push_warteschlange(user_id, tag, payload)
    select e.uid, 'absage-' || e.termin_id || '-' || e.spieler_id,
           jsonb_build_object('title', '🚫 Kurzfristige Absage',
                              'body', e.kind || ' kann nicht zu „' || e.name_termin || '“ (' || e.vorlauf || ' vorher). Grund steht unter „Absagen“.',
                              'url', './trainer/', 'tag', 'absage-' || e.termin_id || '-' || e.spieler_id)
      from emp e where e.ruht
    on conflict (user_id, tag) do update set payload = excluded.payload, erstellt_am = now()
    returning push_warteschlange.user_id
  )
  select e.uid, '🚫 Kurzfristige Absage',
         e.kind || ' kann nicht zu „' || e.name_termin || '“ (' || e.vorlauf || ' vorher). Grund steht unter „Absagen“.',
         './trainer/', 'absage-' || e.termin_id || '-' || e.spieler_id
    from emp e where not e.ruht;
end $$;
revoke all on function public.absage_push_faellig(timestamptz) from public, anon, authenticated;
grant execute on function public.absage_push_faellig(timestamptz) to service_role;
