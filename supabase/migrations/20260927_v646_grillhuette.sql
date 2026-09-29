-- v646: Grillhüttendienst – Einteilung reihum, „Ersatz suchen“ und „Übernehmen“.
-- Auftrag: doku/auftrag-grillhuette/Auftragspaket_Grillhuettendienst.md + nachtrag-2026-09-27.md
-- (Vorrang: kein Rückfall durch das Trainerteam, Knöpfe „Ersatz suchen“/„Übernehmen“,
-- keine gezielte Anfrage an eine bestimmte Familie).
--
-- Der bisherige Büdchen-Dienst (Tabelle buedchen, zwei Familien je Heimspiel, Einteilung beim
-- Anschauen) meint dasselbe – er wird in der App durch diese Einteilung abgelöst. Die Tabelle
-- buedchen bleibt als Altbestand in der Sicherung, die App liest sie nicht mehr.
-- Heimtermin = termine.typ in ('spiel','turnier') und heim = true (so wie der Büdchen-Dienst
-- und die Trainer-Terminliste es schon lesen; Heimturniere/Festivals tragen typ 'turnier' + heim).

create table if not exists public.dienst_einteilung (
  id               bigint generated always as identity primary key,
  termin_id        bigint not null references public.termine(id) on delete cascade,
  dienst           text not null default 'grillhuette',
  kind_id          bigint references public.kader(id) on delete set null,
  status           text not null default 'eingeteilt' check (status in ('eingeteilt','freigegeben','uebernommen')),
  uebernommen_von  uuid,
  geaendert_von    uuid default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint dienst_einteilung_eindeutig unique (termin_id, dienst)
);
comment on table public.dienst_einteilung is 'v646: Pflichtdienste (Grillhütte) je Heimtermin. Direkt nur Trainer; Eltern über dienste_public/dienst_freigeben/dienst_uebernehmen.';
alter table public.dienst_einteilung enable row level security;
drop policy if exists "de trainer" on public.dienst_einteilung;
create policy "de trainer" on public.dienst_einteilung for all to authenticated
  using (public.is_trainer()) with check (public.is_trainer());
revoke all on public.dienst_einteilung from anon;
drop trigger if exists dienst_einteilung_updated on public.dienst_einteilung;
create trigger dienst_einteilung_updated before update on public.dienst_einteilung
  for each row execute function public.set_updated_at();

-- Heimtermine – eine Stelle für die Definition
create or replace function public.ist_heimtermin(t public.termine) returns boolean
language sql immutable set search_path = public as $$ select t.typ in ('spiel','turnier') and t.heim is true $$;

-- 1) Einteilen (Trainer): künftige Heimtermine ohne Einteilung reihum auf die aktiven Kinder.
--    Reihenfolge: wer am wenigsten eingeteilt war, zuerst; bei Gleichstand die kleinere
--    Kader-Kennung. So kommt jedes Kind einmal dran, bevor eines zum zweiten Mal dran ist,
--    ein zweiter Lauf setzt dort fort, wo der erste aufgehört hat, und neue Kinder (größere
--    Kennung) reihen sich hinter die noch nicht eingeteilten ein. Bestehendes bleibt stehen.
create or replace function public.dienst_einteilen(p_dienst text default 'grillhuette')
returns integer
language plpgsql security definer set search_path = public as $$
declare t record; k bigint; n integer := 0;
begin
  if not public.is_trainer() then raise exception 'not authorized'; end if;
  for t in select te.id from termine te
           where public.ist_heimtermin(te) and te.datum >= to_char(current_date,'YYYY-MM-DD')
             and not exists(select 1 from dienst_einteilung d where d.termin_id=te.id and d.dienst=p_dienst)
           order by te.datum, te.uhrzeit nulls last, te.id loop
    select ka.id into k from kader ka where coalesce(ka.aktiv,true)
      order by (select count(*) from dienst_einteilung d where d.kind_id=ka.id and d.dienst=p_dienst), ka.id limit 1;
    exit when k is null;
    insert into dienst_einteilung(termin_id, dienst, kind_id) values (t.id, p_dienst, k);
    n := n + 1;
  end loop;
  return n;
end $$;

-- 2) Für Eltern: je Heimtermin im Fenster der Stand. Kein kind_id, kein Kindername.
--    Name nur, wenn eine Familie übernommen hat – ihr eigener Anzeigename aus profiles.
create or replace function public.dienste_public(p_tage integer default 60, p_dienst text default 'grillhuette')
returns table(termin_id bigint, datum text, uhrzeit time, gegner text, dienst_id bigint, status text, name text, eigene boolean, kann_uebernehmen boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.sitzung_gueltig() or public.ist_anonym() then return; end if;
  return query
  select te.id, te.datum, te.uhrzeit, coalesce(te.gegner, te.titel),
         d.id,
         coalesce(d.status,'offen'),
         case when d.status='uebernommen' then coalesce(nullif(trim(p.anzeigename),''),'eine andere Familie') end,
         coalesce(case when d.status='uebernommen' then d.uebernommen_von = auth.uid()
                       else (d.kind_id is not null and public.is_parent_of(d.kind_id)) end, false),
         coalesce(d.status='freigegeben' and not (d.kind_id is not null and public.is_parent_of(d.kind_id)), false)
  from termine te
  left join dienst_einteilung d on d.termin_id=te.id and d.dienst=p_dienst
  left join profiles p on p.id=d.uebernommen_von
  where public.ist_heimtermin(te)
    and te.datum >= to_char(current_date,'YYYY-MM-DD')
    and te.datum <= to_char(current_date + greatest(0, least(coalesce(p_tage,60), 366)),'YYYY-MM-DD')
  order by te.datum, te.uhrzeit nulls last;
end $$;

-- 3) „Ersatz suchen“: nur die eingeteilte Familie. Verantwortung bleibt, bis jemand übernimmt.
create or replace function public.dienst_freigeben(p_id bigint)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.sitzung_gueltig() or public.ist_anonym() then raise exception 'not authorized'; end if;
  update dienst_einteilung d set status='freigegeben', geaendert_von=auth.uid()
   where d.id=p_id and d.status='eingeteilt' and d.kind_id is not null and public.is_parent_of(d.kind_id)
     and exists(select 1 from termine te where te.id=d.termin_id and te.datum >= to_char(current_date,'YYYY-MM-DD'));
  if not found then raise exception 'not authorized'; end if;
  return true;
end $$;

-- 4) „Übernehmen“: angemeldete Eltern, nur freigegebene Dienste, nicht die eigene Freigabe.
create or replace function public.dienst_uebernehmen(p_id bigint)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_kind bigint; v_status text;
begin
  if not public.sitzung_gueltig() or public.ist_anonym() then raise exception 'not authorized'; end if;
  if not exists(select 1 from eltern_kinder e where lower(e.email)=lower(coalesce(auth.jwt()->>'email',''))) then raise exception 'not authorized'; end if;
  select kind_id, status into v_kind, v_status from dienst_einteilung where id=p_id for update;
  if v_status is distinct from 'freigegeben' or (v_kind is not null and public.is_parent_of(v_kind)) then raise exception 'not authorized'; end if;
  update dienst_einteilung set status='uebernommen', uebernommen_von=auth.uid(), geaendert_von=auth.uid() where id=p_id;
  return true;
end $$;

-- 5) Kader-Abgang: künftige Dienste des Kindes werden freigegeben, nicht gelöscht.
create or replace function public.dienst_kader_abgang() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op='DELETE' or (coalesce(old.aktiv,true) and new.aktiv is false) then
    update dienst_einteilung d set status='freigegeben'
     where d.kind_id=old.id and d.status='eingeteilt'
       and exists(select 1 from termine te where te.id=d.termin_id and te.datum >= to_char(current_date,'YYYY-MM-DD'));
  end if;
  return case when tg_op='DELETE' then old else new end;
end $$;
drop trigger if exists kader_dienst_abgang on public.kader;
create trigger kader_dienst_abgang before update of aktiv or delete on public.kader
  for each row execute function public.dienst_kader_abgang();

do $$
declare f text;
begin
  foreach f in array array['dienst_einteilen(text)','dienste_public(integer,text)','dienst_freigeben(bigint)','dienst_uebernehmen(bigint)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
  execute 'revoke execute on function public.dienst_kader_abgang() from public, anon, authenticated';
end $$;

-- Der am selben Tag gebaute, nie ausgelieferte Tausch an eine bestimmte Familie (Tabelle
-- buedchen_tausch, leer) widerspricht dem Nachtrag – er verschwindet wieder.
drop function if exists public.buedchen_tausch_kandidaten(bigint,bigint);
drop function if exists public.buedchen_tausch_anfragen(bigint,bigint,bigint,bigint);
drop function if exists public.buedchen_tausch_liste();
drop function if exists public.buedchen_tausch_antworten(bigint,boolean);
drop function if exists public.buedchen_tausch_zurueckziehen(bigint);
drop table if exists public.buedchen_tausch;
