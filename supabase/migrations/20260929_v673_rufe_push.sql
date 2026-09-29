-- v673 · Adler-Rufe, Stufe 1b: Benachrichtigungen aufs Handy.
-- Beschluss 29.09.: „Nur neue Nachrichten, mit Ruhezeit“ und „Gebündelt, höchstens alle 30 Min.“ –
-- Rufe vom Trainerteam (und @alle der Moderatoren) sofort, alles andere gebündelt, zwischen 21 und
-- 7 Uhr nichts. Wer die App offen hat und liest, bekommt für Gelesenes keinen Push.
-- Die Entscheidung trifft rufe_push_faellig() in der Datenbank (mit Rollback prüfbar, ohne dass
-- eine echte Nachricht rausgeht); die Edge Function rufe-push verschickt nur.

create table if not exists public.rufe_push_stand (
  user_id          uuid primary key,
  bis              timestamptz,          -- Rufe bis zu diesem Zeitpunkt sind gemeldet
  zuletzt_gepusht  timestamptz
);
comment on table public.rufe_push_stand is 'v673: je Konto, bis wann Adler-Rufe per Push gemeldet sind. Nur Server.';
alter table public.rufe_push_stand enable row level security;
revoke all on public.rufe_push_stand from anon, authenticated;

create table if not exists public.rufe_push_aus (
  user_id    uuid primary key default auth.uid(),
  created_at timestamptz not null default now()
);
comment on table public.rufe_push_aus is 'v673: Konten, die keine Push-Nachrichten zu Adler-Rufen wollen. Jeder pflegt nur seine eigene Zeile.';
alter table public.rufe_push_aus enable row level security;
drop policy if exists rpa_eigen on public.rufe_push_aus;
create policy rpa_eigen on public.rufe_push_aus for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.darf_rufen());
revoke all on public.rufe_push_aus from anon;

-- Wer jetzt eine Benachrichtigung bekommt – und merkt es sich (einmal je Ruf).
create or replace function public.rufe_push_faellig(p_jetzt timestamptz default now())
returns table(user_id uuid, trainer boolean, anzahl integer, titel text, text text, url text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare v_std int := extract(hour from (p_jetzt at time zone 'Europe/Berlin'))::int;
begin
  if v_std >= 21 or v_std < 7 then return; end if;   -- Ruhezeit: nichts, der Morgen bündelt
  return query
  with empf as (
    select distinct s.user_id, coalesce(p.role='trainer',false) trainer
      from push_subscriptions s
      join auth.users u on u.id=s.user_id
      left join profiles p on p.id=s.user_id
     where (p.role='trainer' or exists(select 1 from eltern_kinder e where lower(e.email)=lower(u.email)))
       and not exists(select 1 from rufe_push_aus a where a.user_id=s.user_id)
  ), neu as (
    select e.user_id, e.trainer, n.id, n.autor_name, n.autor_rolle, n.an_alle, n.text, n.created_at
      from empf e
      join rufe_nachricht n on n.archiviert_am is null and n.autor<>e.user_id and n.created_at <= p_jetzt
      join rufe_raum r on r.id=n.raum_id and not r.archiviert
      left join rufe_gelesen g on g.user_id=e.user_id and g.raum_id=n.raum_id
      left join rufe_push_stand st on st.user_id=e.user_id
     where n.created_at > greatest(coalesce(g.zuletzt,'-infinity'::timestamptz), coalesce(st.bis,'-infinity'::timestamptz), p_jetzt - interval '2 days')
  ), je as (
    select nu.user_id, bool_or(nu.trainer) trainer, count(*)::int anzahl, max(nu.created_at) bis,
           bool_or(nu.autor_rolle='trainer' or nu.an_alle) sofort,
           (array_agg(nu.autor_name||': '||left(nu.text,110) order by (nu.autor_rolle='trainer' or nu.an_alle) desc, nu.created_at desc))[1] kopf
      from neu nu group by nu.user_id
  ), faellig as (
    select j.* from je j left join rufe_push_stand st on st.user_id=j.user_id
     where j.sofort or st.zuletzt_gepusht is null or st.zuletzt_gepusht < p_jetzt - interval '30 minutes'
  ), gemerkt as (
    insert into rufe_push_stand(user_id, bis, zuletzt_gepusht)
    select f.user_id, f.bis, p_jetzt from faellig f
    on conflict (user_id) do update set bis=excluded.bis, zuletzt_gepusht=excluded.zuletzt_gepusht
    returning rufe_push_stand.user_id
  )
  select f.user_id, f.trainer, f.anzahl, '📣 Adler-Rufe'::text,
         case when f.anzahl=1 then f.kopf
              when f.sofort then f.kopf||' · +'||(f.anzahl-1)||' weitere'
              else f.anzahl||' neue Adler-Rufe' end,
         case when f.trainer then './trainer/?rufe' else './eltern/?rufe' end
    from faellig f where f.user_id in (select g.user_id from gemerkt g);
end $$;
revoke all on function public.rufe_push_faellig(timestamptz) from public, anon, authenticated;
grant execute on function public.rufe_push_faellig(timestamptz) to service_role;

-- Alle 5 Minuten; der Cron-Schlüssel kommt aus dem Vault (wie push-cron, v643).
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname='adler-rufe-push';
  perform cron.schedule('adler-rufe-push', '*/5 * * * *', $cmd$
  select net.http_post(
    url := 'https://wgbcibqcqidudoksfkcv.supabase.co/functions/v1/rufe-push',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey','sb_publishable_Gz7hGb1ecNWkLJZA-neK_w_El3huo41',
      'Authorization','Bearer sb_publishable_Gz7hGb1ecNWkLJZA-neK_w_El3huo41',
      'x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name = 'adler_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
$cmd$);
end $$;
