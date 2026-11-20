-- v912 · Grillhütte: Zahl der Familien je Heimtermin, Einteilung je Familie
-- PO 20.11.2026: „An manchen Heimspielen brauchen wir 1 Helfer, an manchen 2. Das sollte einstellbar sein.“
-- Kachel: je Termin im Grillhütte-Fenster, Standard 2 (team_config.dienst_plaetze).
-- Dazu „Familie bleibt die Einheit“: Geschwister (rufe_familie) zählen zusammen und stehen nie
-- zweimal am selben Termin. Bisher zählte dienst_einteilen je Kind (derzeit gibt es keine Geschwister).

alter table public.termine add column if not exists grill_plaetze smallint;
alter table public.termine drop constraint if exists termine_grill_plaetze_check;
alter table public.termine add constraint termine_grill_plaetze_check check (grill_plaetze is null or grill_plaetze between 1 and 4);
comment on column public.termine.grill_plaetze is 'v912: Familien für die Grillhütte an diesem Heimtermin; leer = team_config.dienst_plaetze';

create or replace function public.dienst_einteilen(p_dienst text default 'grillhuette'::text)
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

create or replace function public.dienste_public(p_tage integer default 60, p_dienst text default 'grillhuette'::text)
 returns table(termin_id bigint, datum text, uhrzeit time without time zone, gegner text, dienst_id bigint, status text, name text, eigene boolean, kann_uebernehmen boolean, platz smallint, plaetze smallint)
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
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
                       else (d.kind_id is not null and public.is_parent_of(d.kind_id)) end, false) as eig,
         coalesce(d.status='freigegeben' and not (d.kind_id is not null and public.is_parent_of(d.kind_id))
                  and not exists(select 1 from dienst_einteilung d2 where d2.termin_id=te.id and d2.dienst=p_dienst and d2.id<>d.id
                                   and ((d2.kind_id is not null and public.is_parent_of(d2.kind_id)) or d2.uebernommen_von=auth.uid())), false),
         coalesce(d.platz,1::smallint), coalesce(te.grill_plaetze, v_plaetze)::smallint
  from termine te
  left join dienst_einteilung d on d.termin_id=te.id and d.dienst=p_dienst
  left join profiles p on p.id=d.uebernommen_von
  where public.ist_heimtermin(te)
    and te.datum >= to_char(current_date,'YYYY-MM-DD')
    and te.datum <= to_char(current_date + greatest(0, least(coalesce(p_tage,60), 366)),'YYYY-MM-DD')
  order by te.datum, te.uhrzeit nulls last, 8 desc, d.platz nulls last;
end $function$;
