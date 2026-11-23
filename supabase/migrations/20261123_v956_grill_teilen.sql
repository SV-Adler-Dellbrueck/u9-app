-- v956 · Charles 23.11.2026: „Am Samstag haben sich zwei Eltern den Grillhüttendienst geteilt. Beide haben 45 Minuten gemacht. Wie können
-- wir das in der App berücksichtigen? Evtl. auch eine Lösung, wenn nur eine Person an einem Tag tatsächlich benötigt wird.“
-- Freigegeben („Ja, so bauen“): Ein Dienst kann geteilt werden – die zweite Familie steht in dienst_einteilung.geteilt_kind, beide
-- zählen je ½ (Reihum-Einteilung, Auto-Wahl, „Grillhütte & Helfen“). Trainer: „Geteilt mit …“ am Termin, auch nachträglich.
-- Eltern: bei „Nur eine Familie wird gebraucht“ zusätzlich „Wir teilen uns die Zeit“ (grill_wahl p_teilen).
-- Je Termin und Platz bleibt es eine Zeile (dienst_einteilung_platz_eindeutig).

alter table public.dienst_einteilung add column if not exists geteilt_kind bigint references public.kader(id) on delete set null;

-- Anteil einer Familie (über ein Kind) an Diensten ab einem Datum: voll 1, geteilt je ½
create or replace function public.dienst_anteil(p_kind bigint, p_dienst text, p_ab text)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(case when (case when d.status='uebernommen' then d.uebernommen_kind else d.kind_id end) = p_kind
                           then (case when d.geteilt_kind is null then 1.0 else 0.5 end) else 0 end
                    + case when d.geteilt_kind = p_kind then 0.5 else 0 end), 0)
    from dienst_einteilung d join termine te on te.id = d.termin_id
   where d.dienst = p_dienst and te.datum >= p_ab
$$;
revoke execute on function public.dienst_anteil(bigint, text, text) from public, anon;
grant execute on function public.dienst_anteil(bigint, text, text) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.dienst_einteilen(p_dienst text DEFAULT 'grillhuette'::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare t record; k bigint; n integer := 0; v_standard int; v_plaetze int; p int;
begin
  if not public.is_trainer() then raise exception 'not authorized'; end if;
  select coalesce(max(dienst_plaetze),2) into v_standard from team_config;
  for t in select te.id, te.datum, te.grill_plaetze from termine te
           where public.ist_heimtermin(te) and te.datum >= to_char(current_date,'YYYY-MM-DD')
             and te.datum <= (case when extract(month from current_date) >= 7 then extract(year from current_date)::int + 1 else extract(year from current_date)::int end)::text || '-06-30'   -- v951: die ganze Saison (bis 30.06.)
           order by te.datum, te.uhrzeit nulls last, te.id loop
    v_plaetze := coalesce(t.grill_plaetze, v_standard);
    for p in 1..v_plaetze loop
      continue when exists(select 1 from dienst_einteilung d where d.termin_id=t.id and d.dienst=p_dienst and d.platz=p);
      select ka.id into k from kader ka
       where coalesce(ka.aktiv,true)
         and not exists(select 1 from dienst_befreit b where b.kind_id=ka.id and b.dienst=p_dienst)
         and not exists(select 1 from dienst_sperre s where s.kind_id=ka.id and s.datum=t.datum and s.dienst=p_dienst)
         -- keine Familie zweimal am selben Termin (auch nicht über ein Geschwisterkind)
         and not exists(select 1 from dienst_einteilung d where d.termin_id=t.id and d.dienst=p_dienst
                          and (public.rufe_familie(d.kind_id)=public.rufe_familie(ka.id)
                               or (d.uebernommen_kind is not null and public.rufe_familie(d.uebernommen_kind)=public.rufe_familie(ka.id))
                               or (d.geteilt_kind is not null and public.rufe_familie(d.geteilt_kind)=public.rufe_familie(ka.id))))   -- v956
         -- je Familie nur ein Kind als Kandidat (das mit der kleinsten Kennung)
         and ka.id = public.rufe_familie(ka.id)
       order by (select coalesce(sum(public.dienst_anteil(k2.id, p_dienst, public.saison_beginn(t.datum))),0)
                   from kader k2 where public.rufe_familie(k2.id)=public.rufe_familie(ka.id)), ka.id
       limit 1;
      exit when k is null;
      insert into dienst_einteilung(termin_id, dienst, kind_id, platz) values (t.id, p_dienst, k, p);
      n := n + 1;
    end loop;
  end loop;
  return n;
end $function$;

CREATE OR REPLACE FUNCTION public.helfer_uebersicht()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  grill as (      -- v956: ein geteilter Dienst zählt für beide Familien je ½
    select fid, sum(w)::numeric n from (
      select public.rufe_familie(case when d.status='uebernommen' then d.uebernommen_kind else d.kind_id end) as fid,
             case when d.geteilt_kind is null then 1.0 else 0.5 end as w
        from dienst_einteilung d join termine te on te.id=d.termin_id
       where d.dienst='grillhuette' and te.datum >= v_ab and te.datum <= v_heute
         and (case when d.status='uebernommen' then d.uebernommen_kind else d.kind_id end) is not null
      union all
      select public.rufe_familie(d.geteilt_kind), 0.5
        from dienst_einteilung d join termine te on te.id=d.termin_id
       where d.dienst='grillhuette' and te.datum >= v_ab and te.datum <= v_heute and d.geteilt_kind is not null
    ) x group by fid
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
                                      else public.is_parent_of(d.kind_id) end, false) or coalesce(public.is_parent_of(d.geteilt_kind), false),
              'geteilt_mit', (select f.name from fam f where f.fid=public.rufe_familie(d.geteilt_kind)),   -- v956
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
end $function$;

drop function if exists public.dienste_public(integer, text);
CREATE OR REPLACE FUNCTION public.dienste_public(p_tage integer DEFAULT 60, p_dienst text DEFAULT 'grillhuette'::text)
 RETURNS TABLE(termin_id bigint, datum text, uhrzeit time without time zone, gegner text, dienst_id bigint, status text, name text, eigene boolean, kann_uebernehmen boolean, platz smallint, plaetze smallint, geteilt boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_plaetze smallint;
begin
  if not public.sitzung_gueltig() or public.ist_anonym() then return; end if;
  select coalesce(max(dienst_plaetze),2) into v_plaetze from team_config;
  return query
  select te.id, te.datum, te.uhrzeit, coalesce(te.gegner, te.titel),
         d.id,
         coalesce(d.status,'offen'),
         case when d.status='uebernommen' then coalesce(nullif(trim(p.anzeigename),''),'eine andere Familie') end,
         coalesce(case when d.status='uebernommen' then d.uebernommen_von = auth.uid()
                       else (d.kind_id is not null and public.is_parent_of(d.kind_id)) end, false)
           or coalesce(d.geteilt_kind is not null and public.is_parent_of(d.geteilt_kind), false) as eig,   -- v956
         coalesce(d.status='freigegeben' and not (d.kind_id is not null and public.is_parent_of(d.kind_id))
                  and not exists(select 1 from dienst_einteilung d2 where d2.termin_id=te.id and d2.dienst=p_dienst and d2.id<>d.id
                                   and ((d2.kind_id is not null and public.is_parent_of(d2.kind_id)) or d2.uebernommen_von=auth.uid())), false),
         coalesce(d.platz,1::smallint), coalesce(te.grill_plaetze, v_plaetze)::smallint, d.geteilt_kind is not null
  from termine te
  left join dienst_einteilung d on d.termin_id=te.id and d.dienst=p_dienst
  left join profiles p on p.id=d.uebernommen_von
  where public.ist_heimtermin(te)
    and te.datum >= to_char(current_date,'YYYY-MM-DD')
    and te.datum <= to_char(current_date + greatest(0, least(coalesce(p_tage,60), 366)),'YYYY-MM-DD')
  order by te.datum, te.uhrzeit nulls last, 8 desc, d.platz nulls last;
end $function$;
revoke execute on function public.dienste_public(integer, text) from public, anon;
grant execute on function public.dienste_public(integer, text) to authenticated, service_role;

-- Wahl bei „Nur eine Familie wird gebraucht“: dazu „Wir teilen uns die Zeit“ (p_teilen). Die eigene Zeile bleibt, die andere
-- Familie wandert in geteilt_kind, ihre Zeile entfällt (Platz 1 je Termin bleibt eindeutig). grill_wahl hält {geteilt:true}.
drop function if exists public.grill_wahl(bigint, boolean);
create or replace function public.grill_wahl(p_id bigint, p_uebernehmen boolean, p_teilen boolean default false)
returns json
language plpgsql security definer set search_path = public as $$
declare d dienst_einteilung; v_plaetze int; v_n int; v_bleibt bigint; v_weg bigint;
begin
  if not public.sitzung_gueltig() or public.ist_anonym() then raise exception 'not authorized'; end if;
  select * into d from dienst_einteilung where id = p_id and dienst = 'grillhuette' for update;
  if d.id is null then raise exception 'not found'; end if;
  if not (public.is_parent_of(public.grill_kind(d)) or d.uebernommen_von = auth.uid()) then raise exception 'not authorized'; end if;
  select coalesce(te.grill_plaetze, (select coalesce(max(dienst_plaetze), 2) from team_config)) into v_plaetze from termine te where te.id = d.termin_id;
  select count(*) into v_n from dienst_einteilung where termin_id = d.termin_id and dienst = 'grillhuette';
  if v_plaetze <> 1 or v_n < 2 then raise exception 'keine Wahl offen'; end if;
  if now() >= public.grill_frist(d.termin_id) then raise exception 'Frist vorbei'; end if;
  if coalesce(p_teilen, false) then
    select public.grill_kind(x) into v_weg from dienst_einteilung x where x.termin_id = d.termin_id and x.dienst = 'grillhuette' and x.id <> p_id limit 1;
    delete from dienst_einteilung where termin_id = d.termin_id and dienst = 'grillhuette' and id <> p_id;
    update dienst_einteilung set platz = 1, geteilt_kind = v_weg, geaendert_von = auth.uid(), updated_at = now() where id = p_id;
    v_bleibt := public.grill_kind(d);
    update termine set grill_wahl = jsonb_build_object('bleibt', v_bleibt, 'mit', v_weg, 'geteilt', true, 'auto', false, 'wann', now(), 'gemeldet', false)
     where id = d.termin_id;
    return json_build_object('termin_id', d.termin_id, 'bleibt', v_bleibt, 'mit', v_weg, 'geteilt', true);
  end if;
  if p_uebernehmen then
    select public.grill_kind(x) into v_weg from dienst_einteilung x where x.termin_id = d.termin_id and x.dienst = 'grillhuette' and x.id <> p_id limit 1;
    delete from dienst_einteilung where termin_id = d.termin_id and dienst = 'grillhuette' and id <> p_id;
    update dienst_einteilung set platz = 1, geaendert_von = auth.uid(), updated_at = now() where id = p_id;
    v_bleibt := public.grill_kind(d);
  else
    v_weg := public.grill_kind(d);
    delete from dienst_einteilung where id = p_id;
    update dienst_einteilung set platz = 1, updated_at = now() where termin_id = d.termin_id and dienst = 'grillhuette'
      returning public.grill_kind(dienst_einteilung) into v_bleibt;
  end if;
  update termine set grill_wahl = jsonb_build_object('bleibt', v_bleibt, 'weg', v_weg, 'auto', false, 'wann', now(), 'gemeldet', false)
   where id = d.termin_id;
  return json_build_object('termin_id', d.termin_id, 'bleibt', v_bleibt, 'weg', v_weg);
end $$;
revoke execute on function public.grill_wahl(bigint, boolean, boolean) from public, anon;
grant execute on function public.grill_wahl(bigint, boolean, boolean) to authenticated, service_role;

-- Auto-Wahl: „seltener dran“ zählt geteilte Dienste mit ½ (sonst unverändert gegenüber v951).
create or replace function public.grill_wahl_auto()
returns table(termin_id bigint, bleibt bigint, weg bigint)
language plpgsql security definer set search_path = public as $$
declare t record; v_ab text := to_char(public.saison_beginn(), 'YYYY-MM-DD'); v_heute text := to_char(current_date, 'YYYY-MM-DD');
        v_keep bigint; v_bleibt bigint; v_weg bigint;
begin
  for t in
    select te.id from termine te
     where te.datum >= v_heute
       and coalesce(te.grill_plaetze, (select coalesce(max(dienst_plaetze), 2) from team_config)) = 1
       and (select count(*) from dienst_einteilung x where x.termin_id = te.id and x.dienst = 'grillhuette') >= 2
       and now() >= public.grill_frist(te.id)
  loop
    select x.id, public.grill_kind(x) into v_keep, v_bleibt
      from dienst_einteilung x
     where x.termin_id = t.id and x.dienst = 'grillhuette'
     order by (x.status = 'freigegeben'),
              (select coalesce(sum(case when public.rufe_familie(public.grill_kind(y)) = public.rufe_familie(public.grill_kind(x))
                                        then (case when y.geteilt_kind is null then 1.0 else 0.5 end) else 0 end
                                 + case when y.geteilt_kind is not null and public.rufe_familie(y.geteilt_kind) = public.rufe_familie(public.grill_kind(x))
                                        then 0.5 else 0 end), 0)
                 from dienst_einteilung y join termine ty on ty.id = y.termin_id
                where y.dienst = 'grillhuette' and ty.datum >= v_ab and ty.datum < v_heute),
              coalesce(x.platz, 1), x.id
     limit 1;
    select public.grill_kind(x) into v_weg from dienst_einteilung x where x.termin_id = t.id and x.dienst = 'grillhuette' and x.id <> v_keep limit 1;
    delete from dienst_einteilung x where x.termin_id = t.id and x.dienst = 'grillhuette' and x.id <> v_keep;
    update dienst_einteilung x set platz = 1, updated_at = now() where x.id = v_keep;
    update termine set grill_wahl = jsonb_build_object('bleibt', v_bleibt, 'weg', v_weg, 'auto', true, 'wann', now(), 'gemeldet', false) where id = t.id;
    termin_id := t.id; bleibt := v_bleibt; weg := v_weg; return next;
  end loop;
end $$;
