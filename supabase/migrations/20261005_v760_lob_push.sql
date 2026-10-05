-- v760 (Charles 04./05.10.: „Die Eltern sollen darüber eine Info erhalten“ – Push war „später“ vorgesehen, jetzt gebaut):
-- Wenn das Trainerteam ein Sprachlob für ein Kind aufnimmt, bekommen die Eltern dieses Kindes eine Benachrichtigung.
-- Wie bei den Porträt-Hinweisen (v734) entscheidet die Datenbank, wer wann eine bekommt, und merkt sich jeden Versand;
-- verschickt wird im vorhandenen 5-Minuten-Lauf rufe-push. Kein neuer Cron-Job, kein Aufruf von Hand.
--   · genau einmal je Lob und Konto (Protokoll lob_push_log)
--   · Ruhezeit je Konto wie v705: ruht das Konto, bleibt das Lob offen und geht nach der Ruhezeit raus
--   · nur Lobs der letzten zwei Tage (danach verfällt der Hinweis)
--   · nur Konten mit Benachrichtigungen an; kein Push an das Kind (Kinder-Geräte haben keinen)
--   · der Text nennt nur den Vornamen des eigenen Kindes
-- Beim Einspielen werden alle schon vorhandenen Lobs als „gemeldet“ vermerkt, damit niemand nachträglich eine Flut bekommt.

create table if not exists public.lob_push_log (
  lob_id bigint not null references public.kabine_lob(id) on delete cascade,
  user_id uuid not null,
  gesendet_am timestamptz not null default now(),
  primary key (lob_id, user_id)
);
comment on table public.lob_push_log is 'v760: welches Sprachlob an welches Elternkonto gemeldet wurde – jedes genau einmal. Nur Server.';
alter table public.lob_push_log enable row level security;
revoke all on public.lob_push_log from anon, authenticated;

-- Altbestand: alles Vorhandene gilt als gemeldet
insert into public.lob_push_log(lob_id, user_id)
select distinct l.id, u.id
  from public.kabine_lob l
  join public.eltern_kinder ek on ek.spieler_id = l.spieler_id
  join auth.users u on lower(u.email) = lower(ek.email)
on conflict do nothing;

create or replace function public.lob_push_faellig(p_jetzt timestamptz default now())
returns table(user_id uuid, titel text, text text, url text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  return query
  with kand as (
    select l.id lob_id, k.name kind, u.id uid
      from kabine_lob l
      join kader k on k.id = l.spieler_id
      join eltern_kinder ek on ek.spieler_id = l.spieler_id
      join auth.users u on lower(u.email) = lower(ek.email)
     where l.created_at >= p_jetzt - interval '2 days'
       and l.created_at <= p_jetzt
  ), bereit as (
    select distinct c.* from kand c
     where exists (select 1 from push_subscriptions ps where ps.user_id = c.uid)
       and not public.push_ruht(c.uid, p_jetzt)
       and not exists (select 1 from lob_push_log g where g.lob_id = c.lob_id and g.user_id = c.uid)
  ), gemerkt as (
    insert into lob_push_log(lob_id, user_id)
    select b.lob_id, b.uid from bereit b
    on conflict do nothing
    returning lob_push_log.lob_id, lob_push_log.user_id
  )
  select b.uid,
         '🎧 Neues Sprachlob für ' || split_part(b.kind, ' ', 1),
         'Der Trainer hat ' || split_part(b.kind, ' ', 1) || ' ein Sprachlob geschickt – zu hören in der Kabine oder hier im Eltern-Bereich.',
         './eltern/?portal'::text
    from bereit b
    join gemerkt g on g.lob_id = b.lob_id and g.user_id = b.uid;
end $$;
revoke all on function public.lob_push_faellig(timestamptz) from public, anon, authenticated;
grant execute on function public.lob_push_faellig(timestamptz) to service_role;
