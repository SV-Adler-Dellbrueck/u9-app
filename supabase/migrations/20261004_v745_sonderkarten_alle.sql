-- v745 · Sonderkarten für alle (PO 04.10.: „Die Sonderkarten sollen für alle Kinder sichtbar sein“, Kachel „So bauen“)
-- sonderkarten_kind liefert jetzt jedem angemeldeten Team-Konto (sitzung_gueltig: Trainer, Eltern, Kindergeräte) die
-- Karten jedes aktiven Kindes – Spieltag, Kapitän, Moment samt Trainer-Satz. Fotos: das eigene Kind wie bisher nach Zweck
-- aus dem Album; fremde Kinder nur mit Freigabe „Team intern“ (oder Galerie-Opt-in) und nur das Bild, das auch die
-- Spielerkarte zeigt (Kartenfoto, sonst Profilfoto) – das übrige Album bleibt bei der Familie (Beschluss v743).
-- Die Tabelle sonderkarte bleibt beim Lesen auf Kind, Eltern und Trainer beschränkt; nach außen geht nur, was diese
-- Funktion zusammenstellt.

create or replace function public.sk_foto(p_spieler bigint, p_zweck text, p_eigen boolean) returns text
language sql stable security definer set search_path to 'public' as $$
  select case when p_eigen then public.kind_foto_fuer(p_spieler, p_zweck)
              when public.kind_foto_team_frei(p_spieler) then coalesce(public.kind_kartenfoto(p_spieler),
                   (select f.foto_path from public.kind_fanfacts f where f.spieler_id=p_spieler),
                   (select k.foto_path from public.kader k where k.id=p_spieler))
         end;
$$;
revoke all on function public.sk_foto(bigint,text,boolean) from public, anon;
grant execute on function public.sk_foto(bigint,text,boolean) to authenticated;

create or replace function public.sonderkarten_kind(p_spieler bigint) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare v_name text; v_nr int; v_res jsonb; v_eigen boolean;
begin
  v_eigen := public.is_trainer() or public.is_parent_of(p_spieler) or public.is_kind_selbst(p_spieler);
  if not v_eigen and not public.sitzung_gueltig() then return '[]'::jsonb; end if;
  select name, nr into v_name, v_nr from public.kader where id=p_spieler and (v_eigen or aktiv);
  if v_name is null then return '[]'::jsonb; end if;
  with tage as (
    select left(n.datum,10) d
      from public.nominierungen n
     where n.datum like '%\_\_nom' and left(n.datum,10) ~ '^\d{4}-\d{2}-\d{2}$'
       and left(n.datum,10)::date between public.saison_beginn() and (now() at time zone 'Europe/Berlin')::date
       and coalesce(n.data::jsonb ->> (p_spieler::text), n.data::jsonb ->> v_name) = 'dabei'
  ), spieltag as (
    select jsonb_build_object(
      'art','spieltag', 'datum', t.d,
      'titel', coalesce(nullif(trim(tm.titel),''), nullif(trim(tm.gegner),''), case when tm.typ='turnier' then 'Turnier' else 'Spieltag' end),
      'ort', nullif(trim(coalesce(tm.ort,'')),''), 'heim', tm.heim,
      'team', (select (tt.data::jsonb ->> (p_spieler::text))::int from public.nominierungen tt where tt.datum = t.d || '__teams'
                 and jsonb_typeof(tt.data::jsonb -> (p_spieler::text)) = 'number'),
      'spielform', coalesce(
         (select tt.data::jsonb -> '_form' ->> (tt.data::jsonb ->> (p_spieler::text)) from public.nominierungen tt where tt.datum = t.d || '__teams'
            and jsonb_typeof(tt.data::jsonb -> (p_spieler::text)) = 'number'),
         tm.spielform),
      'satz', (select s.satz from public.sonderkarte s where s.spieler_id=p_spieler and s.art='spieltag' and s.datum=t.d::date),
      'foto_path', public.sk_foto(p_spieler,'aktion',v_eigen)) k
    from tage t
    left join lateral (select * from public.termine x where x.datum=t.d and x.typ in ('spiel','turnier') order by x.uhrzeit nulls last limit 1) tm on true
  ), kapitaen as (
    select jsonb_build_object(
      'art','kapitaen', 'datum', left(m.datum,10),
      'team', case when m.datum ~ '__t\d+$' then substring(m.datum from '__t(\d+)$')::int else 1 end,
      'mal', row_number() over (order by left(m.datum,10), m.datum),
      'foto_path', public.sk_foto(p_spieler,'portraet',v_eigen)) k
    from public.match_actions m
    where m.aktion='kapitaen' and m.spieler=v_name and left(m.datum,10) ~ '^\d{4}-\d{2}-\d{2}$'
      and left(m.datum,10)::date between public.saison_beginn() and (now() at time zone 'Europe/Berlin')::date
  ), moment as (
    select jsonb_build_object('art','moment','id',s.id,'datum',s.datum::text,'titel',s.titel,'satz',s.satz,
      'foto_path', public.sk_foto(p_spieler,'jubel',v_eigen)) k
    from public.sonderkarte s where s.spieler_id=p_spieler and s.art='moment'
  )
  select coalesce(jsonb_agg(x.k || jsonb_build_object('nr',v_nr,'name',v_name) order by x.k->>'datum' desc, x.k->>'art'), '[]'::jsonb)
    into v_res
    from (select k from spieltag union all select k from kapitaen union all select k from moment) x;
  return v_res;
end $$;
revoke all on function public.sonderkarten_kind(bigint) from public, anon;
grant execute on function public.sonderkarten_kind(bigint) to authenticated;
