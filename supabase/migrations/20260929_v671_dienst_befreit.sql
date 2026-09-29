-- v671: Familien, die vom Grillhütten-Dienst befreit sind (Trainerfamilien).
-- PO 29.09.: „Bei den Grillhüttendiensten die Eltern rausnehmen, die selber Trainer sind.“
-- Gepflegt vom Trainerteam im Grillhütten-Fenster. dienst_einteilen überspringt sie; eine schon
-- stehende Einteilung bleibt und wird bei Bedarf umgebucht.
create table if not exists public.dienst_befreit (
  kind_id    bigint not null references public.kader(id) on delete cascade,
  dienst     text not null default 'grillhuette',
  grund      text not null default 'Trainerfamilie',
  created_at timestamptz not null default now(),
  primary key (kind_id, dienst)
);
comment on table public.dienst_befreit is 'v671: vom Dienst befreite Familien (z. B. Trainerfamilien). Nur Trainer.';
alter table public.dienst_befreit enable row level security;
drop policy if exists "db trainer" on public.dienst_befreit;
create policy "db trainer" on public.dienst_befreit for all to authenticated
  using (public.is_trainer()) with check (public.is_trainer());
revoke all on public.dienst_befreit from anon;

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
revoke execute on function public.dienst_einteilen(text) from public, anon;
grant execute on function public.dienst_einteilen(text) to authenticated, service_role;
