-- v951 · Charles 22.11.: „Die Grillhütte planen wir schon für die ganze Saison durch unter den Eltern. Rückrunde mit dem Hinweis,
-- dass sich wahrscheinlich noch ändern wird. Genaue Uhrzeiten sind ebenfalls nicht klar. Die finale Uhrzeit und ob beide Eltern
-- vor Ort helfen müssen, erhalten wir erst einen Tag vorher.“
--  1. termine.grill_zeit (Text, z. B. „11:15–12:30“; leer = folgt am Vortag) und termine.grill_beide (true/false; leer = offen).
--     Lesen und schreiben wie die übrigen Spalten von termine (bestehende Richtlinien).
--  2. dienst_einteilen teilt bis zum Saisonende (30.06.) ein statt höchstens 42 Tage voraus.
alter table public.termine add column if not exists grill_zeit text;
alter table public.termine add column if not exists grill_beide boolean;
comment on column public.termine.grill_zeit is 'v951: Grillzeit der Grillhütte, z. B. 11:15–12:30 (leer: folgt am Vortag)';
comment on column public.termine.grill_beide is 'v951: Müssen beide eingeteilten Familien vor Ort helfen? (leer: noch offen)';

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
                               or (d.uebernommen_kind is not null and public.rufe_familie(d.uebernommen_kind)=public.rufe_familie(ka.id))))
         -- je Familie nur ein Kind als Kandidat (das mit der kleinsten Kennung)
         and ka.id = public.rufe_familie(ka.id)
       order by (select coalesce(sum(public.dienst_anzahl(k2.id, p_dienst, public.saison_beginn(t.datum))),0)
                   from kader k2 where public.rufe_familie(k2.id)=public.rufe_familie(ka.id)), ka.id
       limit 1;
      exit when k is null;
      insert into dienst_einteilung(termin_id, dienst, kind_id, platz) values (t.id, p_dienst, k, p);
      n := n + 1;
    end loop;
  end loop;
  return n;
end $function$;
