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
-- PO 03.10.: „Im Laufe der Woche vor dem Spiel kann sich jeder eintragen für den Ticker in der Eltern-App, und
-- in der Trainer-App kann ich dann zuweisen vor dem Spiel.“ Eintragen (event_helfer „📻 Live-Ticker“) heißt
-- also nur: ich würde. Tickern darf, wen der Trainer je Team einteilt (ticker_helfer, genau eine Person je
-- Team). Zurück kommen die Teams, für die das angemeldete Konto eingeteilt ist, samt Helfer-Code.
declare m text := lower(coalesce((select auth.jwt()) ->> 'email', ''));
begin
  if m = '' then return; end if;
  for team in select h.team from ticker_helfer h where h.datum = p_datum and lower(h.email) = m order by h.team loop
    schluessel := case when team > 1 then p_datum::text || '__t' || team else p_datum::text end;
    insert into matchday(datum) values (schluessel) on conflict (datum) do nothing;
    select md.delegate_token, coalesce(md.ticker_open,false) into token, ticker_open from matchday md where md.datum = schluessel;
    return next;
  end loop;
end $$;
revoke all on function public.mein_ticker_helfer(date) from public;
grant execute on function public.mein_ticker_helfer(date) to authenticated;
