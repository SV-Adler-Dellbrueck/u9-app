-- v728 (PO 03.10.): „den Elternteil direkt aus der Trainer-App benennen … bekommt dann eine Nachricht in der
-- Eltern-App und den Zugang zum Ticker. Dann ersparen wir uns den Umweg über WhatsApp.“ Kachel: Ansehen und
-- selbst tickern. Ein Trainer schaltet ein Elternkonto (E-Mail aus eltern_kinder) für EINEN Spieltag und ein
-- Team frei; das Konto sieht in der Eltern-App „Ticker bedienen“ (Helfer-Code des Spieltags) und den Ticker.
create table if not exists public.ticker_helfer (
  datum date not null,
  team int not null default 1 check (team between 1 and 6),
  email text not null,
  erstellt_von uuid default auth.uid(),
  erstellt_am timestamptz not null default now(),
  primary key (datum, team)   -- PO 03.10.: „Es darf immer nur einen geben pro Team, der den Ticker bedient.“
);
comment on table public.ticker_helfer is 'v728: Elternkonten, die an einem Spieltag (und Team) den Liveticker bedienen dürfen';
alter table public.ticker_helfer enable row level security;
revoke all on public.ticker_helfer from anon;
drop policy if exists th_trainer on public.ticker_helfer;
create policy th_trainer on public.ticker_helfer for all to authenticated using (public.is_trainer()) with check (public.is_trainer());
drop policy if exists th_selbst on public.ticker_helfer;
create policy th_selbst on public.ticker_helfer for select to authenticated
  using (lower(email) = lower(coalesce((select auth.jwt()) ->> 'email', '')));

-- Liefert dem angemeldeten Elternteil die Teams, die es heute tickert, samt Helfer-Code. Legt die
-- Spieltagszeile an, falls der Trainer den Ticker noch nie geöffnet hat (der Code entsteht per Default).
create or replace function public.mein_ticker_helfer(p_datum date)
 returns table(team int, schluessel text, token uuid, ticker_open boolean)
 language plpgsql security definer set search_path to 'public' as $$
-- Je Team genau EIN Ticker-Helfer (PO 03.10.). Kandidaten:
--   1. vom Trainer benannt (ticker_helfer) – hat immer Vorrang
--   2. selbst unter „Wer hilft mit?“ für „📻 Live-Ticker“ eingetragen: tickert das Team des eigenen Kindes
--      laut Team-Einteilung (nominierungen <datum>__teams); steht die noch nicht, gilt die Reihenfolge der
--      Eintragung (Erste/r = Adler 1 …). Melden sich mehrere für dasselbe Team, gilt die frühere Eintragung.
-- Zurück kommen nur die Teams, für die das angemeldete Konto der Sieger ist.
declare m text := lower(coalesce((select auth.jwt()) ->> 'email', '')); v_teams jsonb;
begin
  if m = '' then return; end if;
  select data into v_teams from nominierungen where datum = p_datum::text || '__teams' limit 1;
  for team in
    with su as (
      select lower(p.email) as mail, e.created_at as zeit,
             least(6, row_number() over (partition by e.termin_id order by e.created_at, e.id))::int as rang, e.user_id
        from event_helfer e join termine tm on tm.id = e.termin_id join profiles p on p.id = e.user_id
       where tm.datum = p_datum and tm.typ in ('spiel','turnier') and e.aufgabe = '📻 Live-Ticker'
    ), su_team as (
      select su.mail, su.zeit, coalesce(k.t, su.rang) as t from su
      left join lateral (
        select nullif(coalesce(v_teams->>(ek.spieler_id::text), v_teams->>kd.name),'')::int as t
          from eltern_kinder ek join kader kd on kd.id = ek.spieler_id
         where lower(ek.email) = su.mail
      ) k on k.t is not null
    ), kand as (
      select h.team as t, lower(h.email) as mail, 0 as prio, h.erstellt_am as zeit from ticker_helfer h where h.datum = p_datum
      union all
      select st.t, st.mail, 1, st.zeit from su_team st
    ), sieger as (
      select distinct on (kand.t) kand.t, kand.mail from kand where kand.t between 1 and 6 order by kand.t, kand.prio, kand.zeit
    )
    select sieger.t from sieger where sieger.mail = m order by sieger.t
  loop
    schluessel := case when team > 1 then p_datum::text || '__t' || team else p_datum::text end;
    insert into matchday(datum) values (schluessel) on conflict (datum) do nothing;
    select md.delegate_token, coalesce(md.ticker_open,false) into token, ticker_open from matchday md where md.datum = schluessel;
    return next;
  end loop;
end $$;
revoke all on function public.mein_ticker_helfer(date) from public;
grant execute on function public.mein_ticker_helfer(date) to authenticated;
