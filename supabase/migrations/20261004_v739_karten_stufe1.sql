-- v739 · Spielerkarten Stufe 1 und Adler Wrapped (PO 04.10.)
-- „Dort dürfen schon die Stärken stehen und sowas wie starker Fuß“ (Kachel: „Karten vollständiger“) und
-- „Die Spielzeiten nicht aus der Live-Aufstellung nehmen, da wir die noch nicht einsetzen – einfach aus den
-- Spieltagen, wo das Kind dabei war.“
--
-- 1. kind_fuss: EIN starker Fuß je Kind. Der Trainer pflegt ihn im Kinderprofil (kader.starker_fuss R/L/B), die Eltern
--    in den Fan-Fakten (rechts/links/beide). Es gilt der Trainerwert, sonst der der Eltern – beide Schreibweisen gehen.
-- 2. team_gallery_kind: Stärken (Abzeichen, keine Zahlen) jetzt auf jeder Karte – hebt die v636-Regel „nur die eigene
--    Karte“ auch für die Stärken auf (für Trainings/Spiele seit v734); dazu Fuß und Lieblingsposition.
-- 3. my_child_card / my_child_card_kind: Fuß über kind_fuss, Zählung wie die Galerie (kind_*_saison).
-- 4. get_child_wrapped: „Spiele bestritten“ und „Minuten Spielzeit“ aus den Spieltagen der Saison mit Nominierung
--    „dabei“; Minuten = Dauer des Termins (Beginn bis Ende, ohne Endzeit 60 Minuten). Live-Einsatzzeiten zählen nicht.

create or replace function public.kind_fuss(p_kader text, p_eltern text) returns text
language sql immutable set search_path to 'public' as $$
  select case
    when upper(coalesce(p_kader,'')) in ('R','L','B') then upper(p_kader)
    when lower(coalesce(p_eltern,'')) in ('r','rechts') then 'R'
    when lower(coalesce(p_eltern,'')) in ('l','links') then 'L'
    when lower(coalesce(p_eltern,'')) in ('b','beide','beidfüßig','beidfuessig') then 'B'
    else null end;
$$;
grant execute on function public.kind_fuss(text, text) to authenticated;

-- Minuten eines Spieltags: Beginn bis Ende, sonst 60
create or replace function public.spieltag_minuten(p_datum text) returns int
language sql stable security definer set search_path to 'public' as $$
  select coalesce((select greatest(0, round(extract(epoch from (t.uhrzeit_ende - t.uhrzeit)) / 60))::int
                     from public.termine t
                    where t.datum = p_datum and t.typ in ('spiel','turnier') and t.uhrzeit is not null and t.uhrzeit_ende is not null
                      and t.uhrzeit_ende > t.uhrzeit
                    order by t.uhrzeit limit 1), 60);
$$;
create or replace function public.kind_spielminuten_saison(p_id bigint, p_name text) returns int
language sql stable security definer set search_path to 'public' as $$
  select coalesce(sum(public.spieltag_minuten(left(n.datum, 10))), 0)::int
    from public.nominierungen n
   where n.datum like '%\_\_nom' and left(n.datum, 10) ~ '^\d{4}-\d{2}-\d{2}$'
     and left(n.datum, 10)::date between public.saison_beginn() and (now() at time zone 'Europe/Berlin')::date
     and coalesce(n.data::jsonb ->> (p_id::text), n.data::jsonb ->> p_name) = 'dabei';
$$;
revoke all on function public.spieltag_minuten(text) from public, anon;
revoke all on function public.kind_spielminuten_saison(bigint, text) from public, anon;
grant execute on function public.spieltag_minuten(text) to authenticated;
grant execute on function public.kind_spielminuten_saison(bigint, text) to authenticated;

-- 2. Team-Galerie: Stärken, Fuß und Position für alle Karten
create or replace function public.team_gallery_kind() returns jsonb
language sql stable security definer set search_path to 'public' as $$
select case when not public.sitzung_gueltig() then '[]'::jsonb
  else coalesce(jsonb_agg(g order by g->>'name'), '[]'::jsonb) end
from ( select jsonb_build_object(
    'spieler_id', k.id, 'name', k.name, 'nr', k.nr, 'tw', k.tw,
    'spitzname', f.spitzname, 'lieblingsverein', f.lieblingsverein, 'lieblingsspieler', f.lieblingsspieler,
    'staerken', public.staerken_von(k.name),
    'fuss', public.kind_fuss(k.starker_fuss, f.starker_fuss),
    'position', nullif(trim(coalesce(k.lieblingsposition,'')), ''),
    'foto_path', case when coalesce(f.gallery_optin,false) or exists(select 1 from public.foto_consent c where c.spieler_id=k.id and c.intern) then coalesce(f.foto_path, k.foto_path) else null end,
    'trainings', public.kind_trainings_saison(k.id, k.name),
    'spiele', public.kind_spiele_saison(k.id, k.name)
  ) as g
  from public.kader k left join public.kind_fanfacts f on f.spieler_id=k.id where k.aktiv) x;
$$;

-- 3. Eigene Karte (Eltern-Portal und Kindergerät): Fuß und Zählung wie die Galerie
create or replace function public.my_child_card(p_spieler bigint) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare v_k record; v_snap record; v_f record; v_name text;
begin
  if not (public.is_trainer() or public.is_parent_of(p_spieler)) then return null; end if;
  select id,name,nr,tw,geb,foto_path,starker_fuss,lieblingsposition into v_k from public.kader where id=p_spieler;
  if v_k.id is null then return null; end if;
  v_name := v_k.name;
  select radios, position as snap_position, prim_rolle, strong_foot, age into v_snap from public.spielerprofile where name=v_name order by datum desc nulls last limit 1;
  select spitzname, lieblingsverein, lieblingsspieler, foto_path, starker_fuss into v_f from public.kind_fanfacts where spieler_id=p_spieler;
  return jsonb_build_object(
    'name', v_k.name, 'nr', v_k.nr, 'tw', v_k.tw, 'geb', v_k.geb, 'foto_path', coalesce(v_f.foto_path, v_k.foto_path),
    'starker_fuss', public.kind_fuss(v_k.starker_fuss, v_f.starker_fuss), 'lieblingsposition', v_k.lieblingsposition,
    'spitzname', v_f.spitzname, 'lieblingsverein', v_f.lieblingsverein, 'lieblingsspieler', v_f.lieblingsspieler,
    'radios', case when public.is_trainer() then coalesce(v_snap.radios, '{}'::jsonb) else null end,
    'staerken', public.staerken_von(v_name),
    'snap_position', v_snap.snap_position, 'prim_rolle', v_snap.prim_rolle, 'strong_foot', v_snap.strong_foot, 'age', v_snap.age,
    'stats', jsonb_build_object(
      'tore', (select count(*) from public.match_actions where spieler=v_name and aktion='tor'),
      'paraden', (select count(*) from public.match_actions where spieler=v_name and aktion='parade'),
      'aktionen', (select count(*) from public.match_actions where spieler=v_name and aktion in ('pass','dribbling','gewinn','parade','aufbau','heraus','tor')),
      'spiele', public.kind_spiele_saison(p_spieler, v_name),
      'trainings', public.kind_trainings_saison(p_spieler, v_name),
      'quizRichtig', coalesce((select sum(score) from public.quiz_progress where player=v_name),0),
      'quizBloecke', (select count(*) from public.quiz_progress where player=v_name)));
end $$;

create or replace function public.my_child_card_kind(p_spieler bigint) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare v_k record; v_snap record; v_f record; v_name text;
begin
  if not (public.is_trainer() or public.is_parent_of(p_spieler) or public.is_kind_selbst(p_spieler)) then return null; end if;
  select id,name,nr,tw,geb,foto_path,starker_fuss,lieblingsposition into v_k from public.kader where id=p_spieler;
  if v_k.id is null then return null; end if;
  v_name := v_k.name;
  select position as snap_position, prim_rolle, strong_foot, age into v_snap from public.spielerprofile where name=v_name order by datum desc nulls last limit 1;
  select spitzname, lieblingsverein, lieblingsspieler, foto_path, starker_fuss into v_f from public.kind_fanfacts where spieler_id=p_spieler;
  return jsonb_build_object(
    'name', v_k.name, 'nr', v_k.nr, 'tw', v_k.tw, 'geb', v_k.geb,
    'foto_path', coalesce(v_f.foto_path, v_k.foto_path),
    'starker_fuss', public.kind_fuss(v_k.starker_fuss, v_f.starker_fuss), 'lieblingsposition', v_k.lieblingsposition,
    'spitzname', v_f.spitzname, 'lieblingsverein', v_f.lieblingsverein, 'lieblingsspieler', v_f.lieblingsspieler,
    'staerken', public.staerken_von(v_name),
    'snap_position', v_snap.snap_position, 'prim_rolle', v_snap.prim_rolle, 'strong_foot', v_snap.strong_foot, 'age', v_snap.age,
    'stats', jsonb_build_object(
      'tore', (select count(*) from public.match_actions where spieler=v_name and aktion='tor'),
      'paraden', (select count(*) from public.match_actions where spieler=v_name and aktion='parade'),
      'aktionen', (select count(*) from public.match_actions where spieler=v_name and aktion in ('pass','dribbling','gewinn','parade','aufbau','heraus','tor')),
      'spiele', public.kind_spiele_saison(p_spieler, v_name),
      'trainings', public.kind_trainings_saison(p_spieler, v_name),
      'quizRichtig', coalesce((select sum(score) from public.quiz_progress where player=v_name),0),
      'quizBloecke', (select count(*) from public.quiz_progress where player=v_name)));
end $$;

-- 4. Adler Wrapped: Spiele und Minuten aus den Spieltagen mit „dabei“
create or replace function public.get_child_wrapped(p_spieler bigint) returns json
language plpgsql security definer set search_path to 'public' as $function$
declare v_name text; v_result json;
begin
  if not (is_trainer() or is_parent_of(p_spieler)) then return json_build_object('ok', false, 'error', 'nicht berechtigt'); end if;
  select name into v_name from kader where id = p_spieler;
  if v_name is null then return json_build_object('ok', false); end if;
  select json_build_object(
    'ok', true,
    'name', v_name,
    'tore', (select count(*) from match_actions where spieler = v_name and aktion = 'tor'),
    'aktionen', (select count(*) from match_actions where spieler = v_name and aktion in ('pass','dribbling','gewinn','parade','aufbau','heraus','tor')),
    'spiele', public.kind_spiele_saison(p_spieler, v_name),
    'einsatz_min', public.kind_spielminuten_saison(p_spieler, v_name),
    'xp', coalesce((select sum(delta) from punkte_log where spieler_id = p_spieler and public.federn_zaehlt(quelle, created_at)), 0)
  ) into v_result;
  return v_result;
end;
$function$;
