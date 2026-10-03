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
  primary key (datum, team, email)
);
comment on table public.ticker_helfer is 'v728: Elternkonten, die an einem Spieltag (und Team) den Liveticker bedienen dürfen';
alter table public.ticker_helfer enable row level security;
revoke all on public.ticker_helfer from anon;
drop policy if exists th_trainer on public.ticker_helfer;
create policy th_trainer on public.ticker_helfer for all to authenticated using (public.is_trainer()) with check (public.is_trainer());
drop policy if exists th_selbst on public.ticker_helfer;
create policy th_selbst on public.ticker_helfer for select to authenticated
  using (lower(email) = lower(coalesce((select auth.jwt()) ->> 'email', '')));

-- Liefert dem angemeldeten Elternteil seine Freischaltungen für einen Tag samt Helfer-Code: direkt vom
-- Trainer benannt (ticker_helfer) ODER selbst unter „Wer hilft mit?“ für „📻 Live-Ticker“ eingetragen
-- (event_helfer am Spiel/Turnier dieses Tages, gilt für Adler 1). Legt die
-- Spieltagszeile an, falls der Trainer den Ticker noch nie geöffnet hat (der Code entsteht per Default).
create or replace function public.mein_ticker_helfer(p_datum date)
 returns table(team int, schluessel text, token uuid, ticker_open boolean)
 language plpgsql security definer set search_path to 'public' as $$
declare m text := lower(coalesce((select auth.jwt()) ->> 'email', ''));
begin
  if m = '' then return; end if;
  for team in
    select x.t from (
      select h.team as t from ticker_helfer h where h.datum = p_datum and lower(h.email) = m
      union
      select 1 from event_helfer e join termine tm on tm.id = e.termin_id
       where tm.datum = p_datum and tm.typ in ('spiel','turnier') and e.aufgabe = '📻 Live-Ticker' and e.user_id = auth.uid()
    ) x order by x.t loop
    schluessel := case when team > 1 then p_datum::text || '__t' || team else p_datum::text end;
    insert into matchday(datum) values (schluessel) on conflict (datum) do nothing;
    select md.delegate_token, coalesce(md.ticker_open,false) into token, ticker_open from matchday md where md.datum = schluessel;
    return next;
  end loop;
end $$;
revoke all on function public.mein_ticker_helfer(date) from public;
grant execute on function public.mein_ticker_helfer(date) to authenticated;
