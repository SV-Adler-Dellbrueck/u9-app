-- v934 · „Grillhütte & Helfen“ für Eltern (Charles 21.11.2026: Entwurf freigegeben, „Mit Namen und Zählung“, Migration Ja).
-- Eltern sehen die kommenden Heimspiele mit der eingeteilten Familie und je Familie, wie oft sie in dieser Saison
-- geholfen hat: Grillhütte, Tee, Aufbau (Tore, Aufbau), Abbau, Betreuung (beim Training geblieben bzw. am Spieltag).
-- Familie = Kinder, die sich ein Elternkonto teilen (rufe_familie); genannt wird sie mit den Vornamen der Kinder aus dem
-- Kader – keine Eltern-, Mail- oder Telefondaten. Nur Familien mit Elternzugang. Gezählt wird, was schon war (Termin
-- bis heute) ab Saisonbeginn. Lesen dürfen angemeldete Eltern und das Trainerteam, nicht anonym und nicht Kindergeräte.
create or replace function public.helfer_uebersicht()
returns json
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_ab text := to_char(public.saison_beginn(), 'YYYY-MM-DD');
  v_heute text := to_char(current_date, 'YYYY-MM-DD');
  v_plaetze smallint;
  v_erg json;
begin
  if not public.sitzung_gueltig() or public.ist_anonym() then return null; end if;
  if not (public.is_trainer() or exists(select 1 from eltern_kinder e where lower(e.email)=lower(coalesce(auth.jwt()->>'email','')))) then return null; end if;
  select coalesce(max(dienst_plaetze),2) into v_plaetze from team_config;

  with fam as (   -- Familien mit Elternzugang, je Familie ein Name aus den Vornamen der aktiven Kinder
    select public.rufe_familie(k.id) as fid,
           string_agg(k.name, ' & ' order by k.id) as name,
           bool_or(public.is_parent_of(k.id)) as eigene
      from kader k
     where coalesce(k.aktiv, true) and exists(select 1 from eltern_kinder e where e.spieler_id=k.id)
     group by 1
  ),
  helfer as (     -- Helferlisten je Termin, über die Mail des Kontos der Familie zugeordnet
    select public.rufe_familie(ek.spieler_id) as fid, h.aufgabe, h.termin_id
      from event_helfer h
      join termine te on te.id=h.termin_id and te.datum >= v_ab and te.datum <= v_heute
      join auth.users u on u.id=h.user_id
      join eltern_kinder ek on lower(ek.email)=lower(u.email)
     group by 1, 2, 3
  ),
  betr as (       -- beim Training geblieben (Zusage „ich bleibe“), je Familie und Termin einmal
    select distinct public.rufe_familie(b.spieler_id) as fid, b.termin_id
      from betreuung b join termine te on te.id=b.termin_id
     where b.will_stay and te.datum >= v_ab and te.datum <= v_heute
  ),
  grill as (
    select public.rufe_familie(case when d.status='uebernommen' then d.uebernommen_kind else d.kind_id end) as fid, count(*)::int n
      from dienst_einteilung d join termine te on te.id=d.termin_id
     where d.dienst='grillhuette' and te.datum >= v_ab and te.datum <= v_heute
       and (case when d.status='uebernommen' then d.uebernommen_kind else d.kind_id end) is not null
     group by 1
  ),
  zaehl as (
    select f.name, f.eigene,
           coalesce((select n from grill g where g.fid=f.fid),0) as grill,
           (select count(*)::int from helfer h where h.fid=f.fid and h.aufgabe ilike '%Tee%') as tee,
           (select count(*)::int from helfer h where h.fid=f.fid and (h.aufgabe ilike '%Tore%' or h.aufgabe ilike '%Aufbau%')) as aufbau,
           (select count(*)::int from helfer h where h.fid=f.fid and h.aufgabe ilike '%Abbau%') as abbau,
           (select count(*)::int from betr b where b.fid=f.fid)
             + (select count(*)::int from helfer h where h.fid=f.fid and h.aufgabe ilike '%Betreuung%') as betreuung
      from fam f
  ),
  heim as (
    select te.id, te.datum, te.uhrzeit, coalesce(te.gegner, te.titel) as gegner, coalesce(te.grill_plaetze, v_plaetze) as plaetze,
           (select coalesce(json_agg(json_build_object(
              'dienst_id', d.id, 'platz', coalesce(d.platz,1), 'status', d.status,
              'familie', (select f.name from fam f where f.fid=public.rufe_familie(case when d.status='uebernommen' then d.uebernommen_kind else d.kind_id end)),
              'eigene', coalesce(case when d.status='uebernommen' then d.uebernommen_von=auth.uid() or public.is_parent_of(d.uebernommen_kind)
                                      else public.is_parent_of(d.kind_id) end, false),
              'kann_uebernehmen', coalesce(d.status='freigegeben' and not public.is_parent_of(d.kind_id)
                  and not exists(select 1 from dienst_einteilung d2 where d2.termin_id=te.id and d2.dienst='grillhuette' and d2.id<>d.id
                                   and (public.is_parent_of(d2.kind_id) or d2.uebernommen_von=auth.uid())), false)
            ) order by coalesce(d.platz,1)), '[]'::json)
              from dienst_einteilung d where d.termin_id=te.id and d.dienst='grillhuette') as dienste
      from termine te
     where public.ist_heimtermin(te) and te.datum >= v_heute
       and te.datum <= to_char(current_date + 366, 'YYYY-MM-DD')
       and coalesce(te.platz_status,'') <> 'abgesagt'
     order by te.datum, te.uhrzeit nulls last
  )
  select json_build_object(
    'saison_ab', v_ab,
    'heimspiele', coalesce((select json_agg(json_build_object('termin_id', h.id, 'datum', h.datum, 'uhrzeit', h.uhrzeit, 'gegner', h.gegner, 'plaetze', h.plaetze, 'dienste', h.dienste) order by h.datum, h.uhrzeit) from heim h), '[]'::json),
    'familien', coalesce((select json_agg(json_build_object('familie', z.name, 'eigene', z.eigene, 'grill', z.grill, 'tee', z.tee, 'aufbau', z.aufbau, 'abbau', z.abbau, 'betreuung', z.betreuung) order by z.name) from zaehl z), '[]'::json)
  ) into v_erg;
  return v_erg;
end $$;

revoke all on function public.helfer_uebersicht() from public, anon;
grant execute on function public.helfer_uebersicht() to authenticated;
