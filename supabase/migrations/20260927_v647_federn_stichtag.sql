-- v647 · Neustart der Federn und des Team-Levels (Beschluss Trainerteam 27.09.2026)
--
-- Federn werden in punkte_log GEBUCHT. Jede Buchung ist zugleich die Sperre gegen
-- doppelte Vergabe (xp_award_event prüft quelle + quelle_id). Deshalb wird nichts
-- gelöscht: Ab dem Stichtag team_einstellungen.federn_ab zählen alle Quellen außer Quiz neu,
-- Quiz-Federn (quiz, wissensquiz, fairplay_quiz) zählen weiter ganz. Umkehrbar, indem
-- der Stichtag geleert wird.
--
-- Der Stichtag ist eine Team-Einstellung in der neuen Tabelle team_einstellungen: eine
-- Zeile (id = 1), RLS lesen und schreiben nur is_trainer(), anon entzogen, in der Sicherung
-- (backup_tabellen nimmt jede public-Tabelle; SICHERUNG in views.js ergänzt). team_config
-- wäre falsch: sie ist für jede gültige Sitzung lesbar, also auch für Eltern. Auftrag 3
-- legt das Startdatum der Bewertungsrunden an denselben Ort. Kein Datum im Code – nur
-- hier als Startwert des Beschlusses.

create table if not exists public.team_einstellungen (
  id integer primary key default 1 check (id = 1),
  federn_ab timestamptz,
  updated_at timestamptz not null default now()
);
comment on table public.team_einstellungen is 'Team-Einstellungen nur fürs Trainerteam (lesen und schreiben is_trainer). Eine Zeile, id = 1.';
comment on column public.team_einstellungen.federn_ab is
  'Stichtag: Federn aus allen Quellen außer Quiz zählen erst ab diesem Zeitpunkt (Karten); Team-Level und Meilensteine zählen ab hier alles. Leer = alles zählt.';
alter table public.team_einstellungen enable row level security;
drop policy if exists "te trainer" on public.team_einstellungen;
create policy "te trainer" on public.team_einstellungen for all to authenticated using (public.is_trainer()) with check (public.is_trainer());
revoke all on public.team_einstellungen from anon;
grant select, insert, update on public.team_einstellungen to authenticated;
drop trigger if exists te_updated_at on public.team_einstellungen;
create trigger te_updated_at before update on public.team_einstellungen for each row execute function public.set_updated_at();

insert into public.team_einstellungen(id, federn_ab)
values (1, timestamptz '2026-09-28 00:00:00 Europe/Berlin')
on conflict (id) do update set federn_ab = excluded.federn_ab;

-- Welche Quellen sind Quiz? An einer Stelle, damit Summen und Vergabe dasselbe meinen.
create or replace function public.federn_quiz_quelle(p_quelle text)
returns boolean language sql immutable set search_path to 'pg_catalog' as $$
  select p_quelle in ('quiz','wissensquiz','fairplay_quiz');
$$;

create or replace function public.federn_ab()
returns timestamptz language sql stable security definer set search_path to 'public' as $$
  select federn_ab from public.team_einstellungen where id = 1;
$$;

-- Zählt eine Buchung? Quiz immer, alles andere ab dem Stichtag.
create or replace function public.federn_zaehlt(p_quelle text, p_created_at timestamptz)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select public.federn_quiz_quelle(p_quelle)
      or public.federn_ab() is null
      or p_created_at >= public.federn_ab();
$$;

revoke all on function public.federn_quiz_quelle(text) from public, anon;
revoke all on function public.federn_ab() from public, anon;
revoke all on function public.federn_zaehlt(text, timestamptz) from public, anon;
grant execute on function public.federn_quiz_quelle(text) to authenticated, service_role;
grant execute on function public.federn_ab() to authenticated, service_role;
grant execute on function public.federn_zaehlt(text, timestamptz) to authenticated, service_role;

-- Summen je Kind: Karte, Trainer-Übersicht, Saisonrückblick
create or replace function public.xp_total(p_spieler_id bigint)
returns integer language plpgsql security definer set search_path to 'public' as $function$
begin
  if not (public.is_trainer() or public.is_parent_of(p_spieler_id)) then raise exception 'not authorized'; end if;
  return coalesce((select sum(delta) from public.punkte_log
                    where spieler_id = p_spieler_id and public.federn_zaehlt(quelle, created_at)), 0);
end;
$function$;

create or replace function public.xp_history(p_spieler_id bigint)
returns table(delta integer, grund text, quelle text, created_at timestamptz)
language plpgsql security definer set search_path to 'public' as $function$
begin
  if not (public.is_trainer() or public.is_parent_of(p_spieler_id)) then raise exception 'not authorized'; end if;
  return query select p.delta, p.grund, p.quelle, p.created_at from public.punkte_log p
    where p.spieler_id = p_spieler_id and public.federn_zaehlt(p.quelle, p.created_at)
    order by p.created_at;
end;
$function$;

create or replace function public.xp_team_overview()
returns table(spieler_id bigint, name text, total bigint)
language plpgsql security definer set search_path to 'public' as $function$
begin
  if not public.is_trainer() then raise exception 'trainer only'; end if;
  return query
    select k.id, k.name, coalesce(sum(p.delta) filter (where public.federn_zaehlt(p.quelle, p.created_at)), 0)::bigint
    from public.kader k left join public.punkte_log p on p.spieler_id = k.id
    where k.aktiv is not false
    group by k.id, k.name order by k.name;
end;
$function$;

-- Team-Level (md-kabine.js: Level = Summe / 500 + 1) und Federn-Meilensteine starten
-- ganz neu: ab dem Stichtag zählen dort ALLE Quellen, auch Quiz (Abnahme: „Das
-- Team-Level steht auf dem Startwert und steigt ab dem 28.09. wieder“).
create or replace function public.team_federn_total_roh()
returns integer language sql stable security definer set search_path to 'public' as $$
  select coalesce(sum(delta), 0)::int from punkte_log
   where public.federn_ab() is null or created_at >= public.federn_ab();
$$;

create or replace function public.get_child_wrapped(p_spieler bigint)
returns json language plpgsql security definer set search_path to 'public' as $function$
declare v_name text; v_result json;
begin
  if not (is_trainer() or is_parent_of(p_spieler)) then return json_build_object('ok', false, 'error', 'nicht berechtigt'); end if;
  select name into v_name from kader where id = p_spieler;
  if v_name is null then return json_build_object('ok', false); end if;
  select json_build_object(
    'ok', true,
    'name', v_name,
    'tore', (select count(*) from match_actions where spieler = v_name and aktion = 'tor'),
    'aktionen', (select count(*) from match_actions where spieler = v_name),
    'spiele', (select count(distinct datum) from match_actions where spieler = v_name),
    'einsatz_min', coalesce((select round(sum(feld_sek)/60.0) from einsatzzeiten where spieler = v_name), 0),
    'xp', coalesce((select sum(delta) from punkte_log where spieler_id = p_spieler and public.federn_zaehlt(quelle, created_at)), 0)
  ) into v_result;
  return v_result;
end;
$function$;

-- Team-Meilensteine: der Federn-Zweig zählt mit derselben Summe; die bisher
-- erreichten federn_* werden unten geleert (Zwischenspeicher). Tore und Spiele bleiben.
create or replace function public.team_meilensteine_roh()
returns json language plpgsql security definer set search_path to 'public' as $function$
declare v_tore int; v_spiele int; v_federn int; v_kader int; v_scorer int; s int;
begin
  -- Berechnen + persistieren nur mit Login (Kabine/Eltern/Trainer); Lesen immer.
  if auth.uid() is not null then
    select count(*) into v_tore from match_actions where aktion = 'tor';
    select count(*) into v_spiele from termine
     where typ in ('spiel','turnier') and datum <= to_char(now() at time zone 'Europe/Berlin','YYYY-MM-DD');
    v_federn := public.team_federn_total_roh();

    foreach s in array array[10,25,50,75,100,150,200,300] loop
      if v_tore >= s then
        insert into team_meilensteine(key,label) values ('tore_'||s, '⚽ Das '||s||'. Adler-Tor ist gefallen!')
        on conflict (key) do nothing;
      end if;
    end loop;
    foreach s in array array[5,10,15,20,30,40,50] loop
      if v_spiele >= s then
        insert into team_meilensteine(key,label) values ('spiele_'||s, '🏟️ '||s||' Spiele & Turniere als Team!')
        on conflict (key) do nothing;
      end if;
    end loop;
    foreach s in array array[250,500,1000,1500,2000,3000,5000] loop
      if v_federn >= s then
        insert into team_meilensteine(key,label) values ('federn_'||s, '🪶 '||s||' Team-Federn gesammelt!')
        on conflict (key) do nothing;
      end if;
    end loop;
    select count(*) into v_kader from kader where aktiv is not false;
    select count(distinct ma.spieler) into v_scorer from match_actions ma
      join kader k on k.name = ma.spieler and k.aktiv is not false
     where ma.aktion = 'tor';
    if v_kader > 0 and v_scorer >= v_kader then
      insert into team_meilensteine(key,label) values ('alle_getroffen', '🌟 JEDES Adler-Kind hat schon getroffen!')
      on conflict (key) do nothing;
    end if;
  end if;
  return (select coalesce(json_agg(t order by t.erreicht_am desc, t.key), '[]'::json)
            from (select key, label, erreicht_am from team_meilensteine
                   order by erreicht_am desc, key limit 20) t);
end $function$;

delete from public.team_meilensteine where key like 'federn\_%';

-- Vergabe: ein Anlass aus der Zeit vor dem Stichtag bringt keine Federn mehr.
-- Vor dem Stichtag wird gar nicht gebucht (sonst sperrte eine Buchung vom Sonntag
-- den Anlass am Montag). Datierte Anlässe (Training, Zusage, Packliste) zählen nach
-- ihrem Datum; Serien nur mit so vielen Trainingsbuchungen seit dem Stichtag.
create or replace function public.xp_award_event(p_spieler_id bigint, p_quelle text, p_quelle_id text default null)
returns integer language plpgsql security definer set search_path to 'public' as $function$
declare v_base integer; v_mult integer := 1; v_delta integer; v_ab timestamptz; v_tag text; v_n int;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if not (public.is_trainer() or public.is_parent_of(p_spieler_id)
          or (public.is_kind_selbst(p_spieler_id) and public.kind_zeit_uebrig())) then
    raise exception 'not authorized for this player';
  end if;
  v_base := public.xp_points_for(p_quelle);
  if v_base <= 0 then raise exception 'unknown xp source: %', p_quelle; end if;

  v_ab := public.federn_ab();
  if v_ab is not null and not public.federn_quiz_quelle(p_quelle) then
    if now() < v_ab then return 0; end if;
    v_tag := to_char(v_ab at time zone 'Europe/Berlin', 'YYYY-MM-DD');
    if p_quelle = 'training' and coalesce(p_quelle_id, '') < v_tag then return 0; end if;
    if p_quelle = 'packliste' and coalesce(substr(p_quelle_id, 5), '') < v_tag then return 0; end if;
    if p_quelle = 'rsvp' and exists (select 1 from public.termine t
          where 't' || t.id::text = p_quelle_id and t.datum < v_tag) then return 0; end if;
    if p_quelle = 'streak' then
      select count(*) into v_n from public.punkte_log
       where spieler_id = p_spieler_id and quelle = 'training' and quelle_id >= v_tag;
      if v_n < coalesce(nullif(regexp_replace(coalesce(p_quelle_id, ''), '\D', '', 'g'), '')::int, 0) then return 0; end if;
    end if;
  end if;

  if p_quelle_id is not null then
    if exists (select 1 from public.punkte_log
                where spieler_id=p_spieler_id and quelle=p_quelle and quelle_id=p_quelle_id) then
      return 0;
    end if;
  else
    if exists (select 1 from public.punkte_log
                where spieler_id=p_spieler_id and quelle=p_quelle and quelle_id is null
                  and created_at::date = now()::date) then
      return 0;
    end if;
  end if;
  if exists (select 1 from public.team_config where double_xp_until is not null and now() < double_xp_until) then
    v_mult := 2;
  end if;
  v_delta := v_base * v_mult;
  insert into public.punkte_log(spieler_id, delta, grund, quelle, quelle_id)
  values (p_spieler_id, v_delta, p_quelle || (case when v_mult>1 then ' (2x Booster)' else '' end), p_quelle, p_quelle_id);
  return v_delta;
end; $function$;

-- Team-Missionen: Spieltag vor dem Stichtag bringt nichts.
create or replace function public.xp_award_teamquest(p_spieler_id bigint, p_datum text)
returns integer language plpgsql security definer set search_path to 'public' as $function$
declare v_amt integer; v_mult integer := 1; v_delta integer; v_qid text; v_ab timestamptz;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  -- Team-Belohnung vergibt ausschliesslich das Trainerteam (kein Eltern-Self-Award).
  if not public.is_trainer() then raise exception 'not authorized'; end if;

  v_ab := public.federn_ab();
  if v_ab is not null and (now() < v_ab
       or coalesce(p_datum, '') < to_char(v_ab at time zone 'Europe/Berlin', 'YYYY-MM-DD')) then
    return 0;
  end if;

  v_amt := coalesce((select teamquest_federn from public.team_config where id=1), 20);
  if v_amt <= 0 then return 0; end if;
  if v_amt > 200 then v_amt := 200; end if;   -- Sicherheitsdeckel

  v_qid := 'teamquest:' || coalesce(p_datum,'');
  if exists (select 1 from public.punkte_log
              where spieler_id=p_spieler_id and quelle='teamquest' and quelle_id=v_qid) then
    return 0;   -- schon vergeben (idempotent)
  end if;

  if exists (select 1 from public.team_config
              where double_xp_until is not null and now() < double_xp_until) then
    v_mult := 2;
  end if;
  v_delta := v_amt * v_mult;

  insert into public.punkte_log(spieler_id, delta, grund, quelle, quelle_id)
  values (p_spieler_id, v_delta,
          'Team-Quest geschafft' || (case when v_mult>1 then ' (2x Booster)' else '' end),
          'teamquest', v_qid);
  return v_delta;
end;
$function$;
