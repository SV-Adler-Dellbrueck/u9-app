-- v924 · Grillhütte erst 6 Wochen vorher einteilen (Charles 21.11.: Anlegen der Rückrunde hätte sonst sofort alle
-- Heimspieltage bis Mai eingeteilt und die Familien per Push benachrichtigt). Gleiche Funktion wie v912, nur die
-- Bedingung „datum <= heute + 42 Tage“ ist neu. Die App hat dieselbe Grenze (GH_AUTO_TAGE in md-kasse.js); hier
-- steht sie, damit auch ein Gerät mit altem App-Stand nicht weiter vorausplant.
create or replace function public.dienst_einteilen(p_dienst text default 'grillhuette')
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare t record; k bigint; n integer := 0; v_standard int; v_plaetze int; p int;
begin
  if not public.is_trainer() then raise exception 'not authorized'; end if;
  select coalesce(max(dienst_plaetze),2) into v_standard from team_config;
  for t in select te.id, te.datum, te.grill_plaetze from termine te
           where public.ist_heimtermin(te) and te.datum >= to_char(current_date,'YYYY-MM-DD')
             and te.datum <= to_char(current_date + 42,'YYYY-MM-DD')   -- v924: höchstens 6 Wochen voraus
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
