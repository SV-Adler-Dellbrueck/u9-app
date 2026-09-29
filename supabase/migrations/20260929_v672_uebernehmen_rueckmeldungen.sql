-- v672: (1) Wer einen Grillhütten-Dienst übernimmt, dem wird er angerechnet.
--        (2) Rückmelde-Verhalten je Kind – Vorlauf der ersten Antwort, kurzfristige Antworten,
--            Umentscheidungen. Nur für Trainer.
-- PO 29.09., Kacheln: „Der übernehmenden Familie“ und „Bauen, nur Trainer“ – Eltern sehen nichts
-- davon, keine Rangliste. Gezählt je Kind: beide Elternteile schreiben in dieselbe Zeile.

-- (1) Übernehmende Familie festhalten (Kind des übernehmenden Kontos)
alter table public.dienst_einteilung add column if not exists uebernommen_kind bigint references public.kader(id) on delete set null;
comment on column public.dienst_einteilung.uebernommen_kind is 'v672: Familie (Kind), die den Dienst übernommen hat – ihr wird er angerechnet.';

create or replace function public.dienst_uebernehmen(p_id bigint)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_kind bigint; v_status text; v_termin bigint; v_dienst text; v_neu bigint;
begin
  if not public.sitzung_gueltig() or public.ist_anonym() then raise exception 'not authorized'; end if;
  select e.spieler_id into v_neu from eltern_kinder e
   where lower(e.email)=lower(coalesce(auth.jwt()->>'email','')) order by e.spieler_id limit 1;
  if v_neu is null then raise exception 'not authorized'; end if;
  select kind_id, status, termin_id, dienst into v_kind, v_status, v_termin, v_dienst from dienst_einteilung where id=p_id for update;
  if v_status is distinct from 'freigegeben' or (v_kind is not null and public.is_parent_of(v_kind)) then raise exception 'not authorized'; end if;
  if exists(select 1 from dienst_einteilung d where d.termin_id=v_termin and d.dienst=v_dienst and d.id<>p_id
              and ((d.kind_id is not null and public.is_parent_of(d.kind_id)) or d.uebernommen_von=auth.uid())) then
    raise exception 'not authorized';
  end if;
  update dienst_einteilung set status='uebernommen', uebernommen_von=auth.uid(), uebernommen_kind=v_neu, geaendert_von=auth.uid() where id=p_id;
  return true;
end $$;

-- Wie oft eine Familie in der Saison schon Dienst hatte: eingeteilt und nicht abgegeben,
-- oder übernommen. Eine Stelle für die Zählung.
create or replace function public.dienst_anzahl(p_kind bigint, p_dienst text, p_ab text) returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::int from dienst_einteilung d join termine te on te.id=d.termin_id
   where d.dienst=p_dienst and te.datum >= p_ab
     and ((d.kind_id=p_kind and d.status<>'uebernommen') or (d.status='uebernommen' and d.uebernommen_kind=p_kind));
$$;
revoke all on function public.dienst_anzahl(bigint,text,text) from public, anon;
grant execute on function public.dienst_anzahl(bigint,text,text) to authenticated, service_role;

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
         and not exists(select 1 from dienst_befreit b where b.kind_id=ka.id and b.dienst=p_dienst)
         and not exists(select 1 from dienst_sperre s where s.kind_id=ka.id and s.datum=t.datum and s.dienst=p_dienst)
         and not exists(select 1 from dienst_einteilung d where d.termin_id=t.id and d.dienst=p_dienst and (d.kind_id=ka.id or d.uebernommen_kind=ka.id))
       order by public.dienst_anzahl(ka.id, p_dienst, public.saison_beginn(t.datum)), ka.id
       limit 1;
      exit when k is null;
      insert into dienst_einteilung(termin_id, dienst, kind_id, platz) values (t.id, p_dienst, k, p);
      n := n + 1;
    end loop;
  end loop;
  return n;
end $$;
revoke execute on function public.dienst_einteilen(text) from public, anon;
grant execute on function public.dienst_einteilen(text) to authenticated, service_role;

-- (2) Protokoll jeder Änderung einer Rückmeldung (ab v672; frühere Wechsel sind nicht gespeichert)
create table if not exists public.rueckmeldung_log (
  id          bigint generated always as identity primary key,
  termin_id   bigint not null,
  spieler_id  bigint not null,
  status_alt  text,
  status_neu  text,
  durch_trainer boolean not null default false,
  geaendert_am timestamptz not null default now()
);
create index if not exists rueckmeldung_log_kind on public.rueckmeldung_log(spieler_id, termin_id);
comment on table public.rueckmeldung_log is 'v672: jede Änderung einer Rückmeldung (Zeitpunkt, alter/neuer Status, ob vom Trainerteam). Nur Trainer lesen.';
alter table public.rueckmeldung_log enable row level security;
drop policy if exists rl_trainer on public.rueckmeldung_log;
create policy rl_trainer on public.rueckmeldung_log for select to authenticated using (public.is_trainer());
revoke all on public.rueckmeldung_log from anon;
revoke insert, update, delete on public.rueckmeldung_log from authenticated;

create or replace function public.rueckmeldung_protokoll() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op='INSERT' or new.status is distinct from old.status then
    insert into rueckmeldung_log(termin_id, spieler_id, status_alt, status_neu, durch_trainer)
    values (new.termin_id, new.spieler_id, case when tg_op='UPDATE' then old.status end, new.status, coalesce(public.is_trainer(),false));
  end if;
  return new;
end $$;
revoke all on function public.rueckmeldung_protokoll() from public, anon, authenticated;
drop trigger if exists rueckmeldung_protokoll on public.rueckmeldungen;
create trigger rueckmeldung_protokoll after insert or update of status on public.rueckmeldungen
  for each row execute function public.rueckmeldung_protokoll();

-- Auswertung je Kind (nur Trainer). art: 'training' oder 'spiel' (Spiel, Turnier, Festival).
-- Vorlauf = Termin-Beginn minus erste Antwort (created_at) – aus allen Rückmeldungen.
-- Umentscheidungen und „zu- dann abgesagt“ – aus dem Protokoll, also erst ab v672.
create or replace function public.rueckmelde_statistik(p_ab text default null)
returns table(spieler_id bigint, name text, art text, antworten integer, vorlauf_std numeric,
              kurzfristig integer, umentschieden integer, zu_dann_ab integer, ohne_antwort integer)
language sql stable security definer set search_path = public as $$
  with t as (
    select te.id, case when te.typ='training' then 'training' else 'spiel' end art,
           (te.datum || ' ' || coalesce(to_char(te.uhrzeit,'HH24:MI'),'10:00'))::timestamp at time zone 'Europe/Berlin' beginn
      from termine te
     where te.typ in ('training','spiel','turnier') and te.datum >= coalesce(p_ab, public.saison_beginn(to_char(current_date,'YYYY-MM-DD')))
       and te.datum <= to_char(current_date,'YYYY-MM-DD')
  ), k as (select ka.id, ka.name from kader ka where coalesce(ka.aktiv,true)),
  r as (
    select rm.spieler_id, t.art, t.id termin, extract(epoch from (t.beginn - rm.created_at))/3600.0 std
      from rueckmeldungen rm join t on t.id=rm.termin_id
     where rm.created_at is not null
  ), l as (
    select lg.spieler_id, t.art,
           count(*) filter (where lg.status_alt is not null and not lg.durch_trainer) um,
           count(*) filter (where lg.status_alt='zugesagt' and lg.status_neu in ('abgesagt','krank') and not lg.durch_trainer) zab
      from rueckmeldung_log lg join t on t.id=lg.termin_id group by lg.spieler_id, t.art
  )
  select k.id, k.name, a.art,
         (select count(*) from r where r.spieler_id=k.id and r.art=a.art)::int,
         round((select avg(greatest(std,0)) from r where r.spieler_id=k.id and r.art=a.art)::numeric, 1),
         (select count(*) from r where r.spieler_id=k.id and r.art=a.art and r.std < 24)::int,
         coalesce((select um from l where l.spieler_id=k.id and l.art=a.art),0)::int,
         coalesce((select zab from l where l.spieler_id=k.id and l.art=a.art),0)::int,
         case when a.art='spiel' then (select count(*) from t where t.art='spiel'
                and not exists(select 1 from rueckmeldungen x where x.termin_id=t.id and x.spieler_id=k.id))::int else null end
    from k cross join (values ('training'),('spiel')) a(art)
   where public.is_trainer()
   order by k.name, a.art;
$$;
revoke all on function public.rueckmelde_statistik(text) from public, anon;
grant execute on function public.rueckmelde_statistik(text) to authenticated, service_role;
