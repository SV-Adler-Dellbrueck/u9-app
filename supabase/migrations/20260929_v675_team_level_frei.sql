-- v675 · Team-Level neu starten (nur das Team) und Federn frei vergeben
-- PO 29.09.: „Setze die Team-Federn nochmal auf Null … Es soll auch möglich sein, als Trainer
-- eine freie Anzahl an Federn dem Team, also jedem Spieler, zu geben und auch einzelnen Kindern.“
-- Kacheln: „Nur Team-Level“ (die Karten der Kinder behalten ihre Federn) und „1 bis 100 je Kind“
-- (mit Pflicht-Grund, nur Pluswerte).
--
-- (1) team_einstellungen.team_ab: eigener Startpunkt nur für Team-Level und Team-Meilensteine.
--     Es zählt der spätere von beiden (federn_ab, team_ab). Die Karten (xp_total) bleiben beim
--     Federn-Stichtag. Nichts wird gelöscht außer den zwischengespeicherten Federn-Meilensteinen.
-- (2) xp_award_frei: das Trainerteam gibt 1–100 Federn an ausgewählte Kinder (oder alle),
--     Quelle 'trainer', mit Grund. Kein Booster – die Zahl ist genau die gewählte.
-- (3) xp_lob: die Vergaben der letzten 14 Tage mit Grund für Kabine und Eltern.

alter table public.team_einstellungen add column if not exists team_ab timestamptz;
comment on column public.team_einstellungen.team_ab is
  'v675: Team-Level und Team-Meilensteine zählen erst ab hier (zusätzlich zu federn_ab – der spätere gilt). Leer = wie federn_ab.';

create or replace function public.team_ab()
returns timestamptz language sql stable security definer set search_path to 'public' as $$
  select greatest(federn_ab, team_ab) from public.team_einstellungen where id = 1;
$$;
revoke all on function public.team_ab() from public, anon;
grant execute on function public.team_ab() to authenticated, service_role;

create or replace function public.team_federn_total_roh()
returns integer language sql stable security definer set search_path to 'public' as $$
  select coalesce(sum(delta), 0)::int from punkte_log
   where public.team_ab() is null or created_at >= public.team_ab();
$$;

-- Neustart jetzt (Beschluss 29.09.): Team-Level auf Null, erreichte Federn-Meilensteine leeren –
-- sie entstehen neu, sobald das Team die Marke wieder erreicht. Tore und Spiele bleiben.
insert into public.team_einstellungen(id, team_ab) values (1, now())
on conflict (id) do update set team_ab = excluded.team_ab;
delete from public.team_meilensteine where key like 'federn\_%';

create or replace function public.xp_award_frei(p_spieler_ids bigint[], p_anzahl integer, p_grund text)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare v_grund text := trim(coalesce(p_grund,'')); v_n int; v_id text;
begin
  if auth.uid() is null or not public.is_trainer() then raise exception 'not authorized'; end if;
  if p_anzahl is null or p_anzahl not between 1 and 100 then raise exception 'anzahl'; end if;
  if length(v_grund) not between 3 and 80 then raise exception 'grund'; end if;
  v_id := 'frei:' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS');
  insert into punkte_log(spieler_id, delta, grund, quelle, quelle_id)
  select k.id, p_anzahl, v_grund, 'trainer', v_id
    from kader k where k.id = any(p_spieler_ids) and k.aktiv is not false;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function public.xp_award_frei(bigint[], integer, text) from public, anon;
grant execute on function public.xp_award_frei(bigint[], integer, text) to authenticated, service_role;

create or replace function public.xp_lob(p_ids bigint[])
returns table(spieler_id bigint, delta integer, grund text, created_at timestamptz)
language sql stable security definer set search_path to 'public' as $$
  select p.spieler_id, p.delta, p.grund, p.created_at from punkte_log p
   where p.spieler_id = any(p_ids) and p.quelle = 'trainer' and p.created_at > now() - interval '14 days'
     and (public.is_trainer() or public.is_parent_of(p.spieler_id) or public.is_kind_selbst(p.spieler_id))
   order by p.created_at desc limit 6;
$$;
revoke all on function public.xp_lob(bigint[]) from public, anon;
grant execute on function public.xp_lob(bigint[]) to authenticated, service_role;
