-- v734 (PO 04.10., Bildschirmfoto Team-Galerie): „Bei fast keinem ist die Anzahl der Trainings aufgeführt, bis auf
-- Mika. Die Anzahl der Spiele ist gar nicht aufgeführt.“ Kachel: „Alle Karten mit Zahlen“ – hebt die Regel aus v636
-- auf, nach der Trainingszahlen nur auf der eigenen Karte standen.
-- Dazu zählen Trainings und Spiele jetzt einheitlich für die laufende Saison (ab 1. Juli): Trainings nur an echten
-- Trainingsterminen (nicht abgesagt, bis heute) mit „da“ in der Anwesenheitsliste, Spiele aus der Nominierung
-- („<datum>__nom“ = dabei) bis heute. Vorher zählten Spieltage und Einträge vor der Saison als Training mit.

create or replace function public.saison_beginn() returns date
language sql stable set search_path to 'public' as $$
  select make_date(case when extract(month from (now() at time zone 'Europe/Berlin')) >= 7
                        then extract(year from (now() at time zone 'Europe/Berlin'))::int
                        else extract(year from (now() at time zone 'Europe/Berlin'))::int - 1 end, 7, 1);
$$;

create or replace function public.kind_trainings_saison(p_id bigint, p_name text) returns int
language sql stable security definer set search_path to 'public' as $$
  select count(*)::int from public.anwesenheit a
   where a.datum ~ '^\d{4}-\d{2}-\d{2}$'
     and a.datum::date between public.saison_beginn() and (now() at time zone 'Europe/Berlin')::date
     and exists (select 1 from public.termine t where t.datum = a.datum and t.typ = 'training' and coalesce(t.platz_status,'') <> 'abgesagt')
     and (coalesce(a.data -> (p_id::text), a.data -> p_name) ->> 'da') = 'true';
$$;
create or replace function public.kind_spiele_saison(p_id bigint, p_name text) returns int
language sql stable security definer set search_path to 'public' as $$
  select count(*)::int from public.nominierungen n
   where n.datum like '%\_\_nom' and left(n.datum, 10) ~ '^\d{4}-\d{2}-\d{2}$'
     and left(n.datum, 10)::date between public.saison_beginn() and (now() at time zone 'Europe/Berlin')::date
     and coalesce(n.data::jsonb ->> (p_id::text), n.data::jsonb ->> p_name) = 'dabei';
$$;
revoke all on function public.kind_trainings_saison(bigint, text) from public, anon;
revoke all on function public.kind_spiele_saison(bigint, text) from public, anon;
grant execute on function public.kind_trainings_saison(bigint, text) to authenticated;
grant execute on function public.kind_spiele_saison(bigint, text) to authenticated;

-- Team-Galerie (Kabine, Eltern): Trainings und Spiele für alle Karten; Stärken weiter nur für das eigene Kind.
create or replace function public.team_gallery_kind() returns jsonb
language sql stable security definer set search_path to 'public' as $$
select case when not public.sitzung_gueltig() then '[]'::jsonb
  else coalesce(jsonb_agg(g order by g->>'name'), '[]'::jsonb) end
from ( select jsonb_build_object(
    'spieler_id', k.id, 'name', k.name, 'nr', k.nr, 'tw', k.tw,
    'spitzname', f.spitzname, 'lieblingsverein', f.lieblingsverein, 'lieblingsspieler', f.lieblingsspieler,
    'staerken', case when public.is_trainer() or public.is_parent_of(k.id) or public.is_kind_selbst(k.id) then public.staerken_von(k.name) else null end,
    'foto_path', case when coalesce(f.gallery_optin,false) or exists(select 1 from public.foto_consent c where c.spieler_id=k.id and c.intern) then coalesce(f.foto_path, k.foto_path) else null end,
    'trainings', public.kind_trainings_saison(k.id, k.name),
    'spiele', public.kind_spiele_saison(k.id, k.name)
  ) as g
  from public.kader k left join public.kind_fanfacts f on f.spieler_id=k.id where k.aktiv) x;
$$;

-- Trainer-Galerie: dieselbe Zählung
create or replace function public.team_gallery() returns jsonb
language sql stable security definer set search_path to 'public' as $$
select case when not public.sitzung_gueltig() or public.ist_anonym() or not public.is_trainer() then '[]'::jsonb
  else coalesce(jsonb_agg(g order by g->>'name'), '[]'::jsonb) end
from ( select jsonb_build_object(
    'spieler_id', k.id, 'name', k.name, 'nr', k.nr, 'tw', k.tw,
    'spitzname', f.spitzname, 'lieblingsverein', f.lieblingsverein, 'lieblingsspieler', f.lieblingsspieler,
    'radios', coalesce((select radios from public.spielerprofile sp where sp.name=k.name order by datum desc nulls last limit 1), '{}'::jsonb),
    'foto_path', case when coalesce(f.gallery_optin,false) or coalesce(k.foto_stadionheft_ok,false) then coalesce(f.foto_path, k.foto_path) else null end,
    'trainings', public.kind_trainings_saison(k.id, k.name),
    'spiele', public.kind_spiele_saison(k.id, k.name)
  ) as g
  from public.kader k left join public.kind_fanfacts f on f.spieler_id=k.id where k.aktiv) x;
$$;

-- Eigene Karte (Eltern-Portal): dieselbe Zählung für Spiele und Trainings, sonst unverändert
create or replace function public.my_child_card(p_spieler bigint) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare v_k record; v_snap record; v_f record; v_name text; v_id text;
begin
  if not (public.is_trainer() or public.is_parent_of(p_spieler)) then return null; end if;
  select id,name,nr,tw,geb,foto_path,starker_fuss,lieblingsposition into v_k from public.kader where id=p_spieler;
  if v_k.id is null then return null; end if;
  v_name := v_k.name; v_id := p_spieler::text;
  select radios, position as snap_position, prim_rolle, strong_foot, age into v_snap from public.spielerprofile where name=v_name order by datum desc nulls last limit 1;
  select spitzname, lieblingsverein, lieblingsspieler, foto_path into v_f from public.kind_fanfacts where spieler_id=p_spieler;
  return jsonb_build_object(
    'name', v_k.name, 'nr', v_k.nr, 'tw', v_k.tw, 'geb', v_k.geb, 'foto_path', coalesce(v_f.foto_path, v_k.foto_path),
    'starker_fuss', v_k.starker_fuss, 'lieblingsposition', v_k.lieblingsposition,
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
