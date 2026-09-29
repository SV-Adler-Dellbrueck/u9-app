-- v668: Grillhütte – zwei Familien je Heimtermin, Sperrtermine je Familie, Zählung je Saison.
-- PO 29.09.: „Da jetzt alle Eltern informiert sind … können wir die Einteilung durch die App
-- vornehmen … immer die Familie einteilen … Trackst das im Hintergrund, dass jeder auch einmal
-- zugewiesen wird.“ Kacheln: zwei Familien je Heimtermin; jetzt nur den nächsten Heimtermin,
-- weitere teilt die App zu, sobald sie im Kalender stehen.
--
-- Familie = das Kind im Kader (kind_id). Alle Eltern, die mit dem Kind verknüpft sind, sehen den
-- Dienst als „eurer“ – eingeteilt wird nie ein einzelnes Elternteil.

-- 1) Zwei Plätze je Termin statt einem
alter table public.dienst_einteilung add column if not exists platz smallint not null default 1;
alter table public.dienst_einteilung drop constraint if exists dienst_einteilung_eindeutig;
alter table public.dienst_einteilung drop constraint if exists dienst_einteilung_platz_eindeutig;
alter table public.dienst_einteilung add constraint dienst_einteilung_platz_eindeutig unique (termin_id, dienst, platz);
alter table public.dienst_einteilung drop constraint if exists dienst_einteilung_platz_check;
alter table public.dienst_einteilung add constraint dienst_einteilung_platz_check check (platz between 1 and 4);
comment on column public.dienst_einteilung.platz is 'v668: laufende Nummer der Familie am Termin (1, 2 …). Wie viele Plätze es gibt, steht in team_config.dienst_plaetze.';

alter table public.team_config add column if not exists dienst_plaetze smallint not null default 2;
comment on column public.team_config.dienst_plaetze is 'v668: Familien je Heimtermin für die Grillhütte (PO 29.09.: zwei).';

-- 2) Sperrtermine: an diesen Tagen wird die Familie nicht eingeteilt (z. B. Elternteil verhindert)
create table if not exists public.dienst_sperre (
  id         bigint generated always as identity primary key,
  kind_id    bigint not null references public.kader(id) on delete cascade,
  datum      text not null check (datum ~ '^\d{4}-\d{2}-\d{2}$'),
  dienst     text not null default 'grillhuette',
  created_at timestamptz not null default now(),
  constraint dienst_sperre_eindeutig unique (kind_id, datum, dienst)
);
comment on table public.dienst_sperre is 'v668: Tage, an denen eine Familie nicht für einen Dienst eingeteilt wird. Nur Trainer.';
alter table public.dienst_sperre enable row level security;
drop policy if exists "ds trainer" on public.dienst_sperre;
create policy "ds trainer" on public.dienst_sperre for all to authenticated
  using (public.is_trainer()) with check (public.is_trainer());
revoke all on public.dienst_sperre from anon;

-- Saisonbeginn (1. Juli) für ein Datum im Format JJJJ-MM-TT
create or replace function public.saison_beginn(p_datum text) returns text
language sql immutable set search_path = public as $$
  select case when substr(p_datum,6,2)::int >= 7 then substr(p_datum,1,4) else (substr(p_datum,1,4)::int - 1)::text end || '-07-01'
$$;

-- 3) Einteilen: jeder künftige Heimtermin bekommt so viele Familien, wie team_config sagt.
--    Reihenfolge: wer in der Saison des Termins am seltensten dran war, zuerst; bei Gleichstand die
--    kleinere Kader-Kennung. Übersprungen wird, wer an dem Tag gesperrt ist oder am selben Termin
--    schon steht. So kommt jede Familie einmal dran, bevor eine zum zweiten Mal dran ist.
create or replace function public.dienst_einteilen(p_dienst text default 'grillhuette')
returns integer
language plpgsql security definer set search_path = public as $$
declare t record; k bigint; n integer := 0; v_plaetze int; p int;
begin
  if not public.is_trainer() then raise exception 'not authorized'; end if;
  select coalesce(max(dienst_plaetze),2) into v_plaetze from team_config;
  for t in select te.id, te.datum from termine te
           where public.ist_heimtermin(te) and te.datum >= to_char(current_date,'YYYY-MM-DD')
           order by te.datum, te.uhrzeit nulls last, te.id loop
    for p in 1..v_plaetze loop
      continue when exists(select 1 from dienst_einteilung d where d.termin_id=t.id and d.dienst=p_dienst and d.platz=p);
      select ka.id into k from kader ka
       where coalesce(ka.aktiv,true)
         and not exists(select 1 from dienst_sperre s where s.kind_id=ka.id and s.datum=t.datum and s.dienst=p_dienst)
         and not exists(select 1 from dienst_einteilung d where d.termin_id=t.id and d.dienst=p_dienst and d.kind_id=ka.id)
       order by (select count(*) from dienst_einteilung d join termine te2 on te2.id=d.termin_id
                  where d.kind_id=ka.id and d.dienst=p_dienst
                    and te2.datum >= public.saison_beginn(t.datum)), ka.id
       limit 1;
      exit when k is null;
      insert into dienst_einteilung(termin_id, dienst, kind_id, platz) values (t.id, p_dienst, k, p);
      n := n + 1;
    end loop;
  end loop;
  return n;
end $$;

-- 4) Für Eltern: je Platz eine Zeile. Die eigene Zeile zuerst, damit der Termin sie findet.
drop function if exists public.dienste_public(integer, text);
create or replace function public.dienste_public(p_tage integer default 60, p_dienst text default 'grillhuette')
returns table(termin_id bigint, datum text, uhrzeit time, gegner text, dienst_id bigint, status text, name text, eigene boolean, kann_uebernehmen boolean, platz smallint, plaetze smallint)
language plpgsql stable security definer set search_path = public as $$
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
         coalesce(d.platz,1::smallint), v_plaetze
  from termine te
  left join dienst_einteilung d on d.termin_id=te.id and d.dienst=p_dienst
  left join profiles p on p.id=d.uebernommen_von
  where public.ist_heimtermin(te)
    and te.datum >= to_char(current_date,'YYYY-MM-DD')
    and te.datum <= to_char(current_date + greatest(0, least(coalesce(p_tage,60), 366)),'YYYY-MM-DD')
  order by te.datum, te.uhrzeit nulls last, 8 desc, d.platz nulls last;
end $$;

-- 5) Übernehmen: nicht, wer am selben Termin schon eingeteilt ist
create or replace function public.dienst_uebernehmen(p_id bigint)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_kind bigint; v_status text; v_termin bigint; v_dienst text;
begin
  if not public.sitzung_gueltig() or public.ist_anonym() then raise exception 'not authorized'; end if;
  if not exists(select 1 from eltern_kinder e where lower(e.email)=lower(coalesce(auth.jwt()->>'email',''))) then raise exception 'not authorized'; end if;
  select kind_id, status, termin_id, dienst into v_kind, v_status, v_termin, v_dienst from dienst_einteilung where id=p_id for update;
  if v_status is distinct from 'freigegeben' or (v_kind is not null and public.is_parent_of(v_kind)) then raise exception 'not authorized'; end if;
  if exists(select 1 from dienst_einteilung d where d.termin_id=v_termin and d.dienst=v_dienst and d.id<>p_id
              and ((d.kind_id is not null and public.is_parent_of(d.kind_id)) or d.uebernommen_von=auth.uid())) then
    raise exception 'not authorized';
  end if;
  update dienst_einteilung set status='uebernommen', uebernommen_von=auth.uid(), geaendert_von=auth.uid() where id=p_id;
  return true;
end $$;

do $$
declare f text;
begin
  foreach f in array array['dienst_einteilen(text)','dienste_public(integer,text)','dienst_uebernehmen(bigint)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
  execute 'revoke execute on function public.saison_beginn(text) from public, anon';
  execute 'grant execute on function public.saison_beginn(text) to authenticated, service_role';
end $$;
