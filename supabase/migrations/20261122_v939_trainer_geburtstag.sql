-- v939 · Geburtstage der Trainer (Charles 22.11.2026: „Geburtstage ganz unten. Von Eltern, Kindern und Trainern.“)
-- Eine Spalte im Profil. Lesen dürfen sie alle Trainer (bestehende Regel profiles_select_self_or_trainer).
-- Schreiben nur über die Funktion unten und nur den EIGENEN Geburtstag – die Update-Regel auf profiles erlaubt
-- Trainern sonst jedes Profil.
alter table public.profiles add column if not exists geburtstag date;

create or replace function public.trainer_geburtstag_setzen(p_geb date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_trainer() then
    raise exception 'Nur für Trainer';
  end if;
  if p_geb is not null and (p_geb > current_date or p_geb < date '1930-01-01') then
    raise exception 'Datum ungültig';
  end if;
  update public.profiles set geburtstag = p_geb where id = auth.uid();
end;
$$;

revoke all on function public.trainer_geburtstag_setzen(date) from public, anon;
grant execute on function public.trainer_geburtstag_setzen(date) to authenticated;
