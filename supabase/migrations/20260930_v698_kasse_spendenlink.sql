-- v698: Die Kasse (kasse_team) darf den Fan-Spendenlink pflegen.
-- team_config bleibt für alles andere dem Trainerteam vorbehalten (tc_write); diese Funktion
-- schreibt nur spenden_link und nur einen echten http(s)-Link oder leer.
create or replace function public.kasse_spenden_link_setzen(p_link text)
returns text
language plpgsql
security definer
set search_path to ''
as $$
declare v text := nullif(btrim(coalesce(p_link, '')), '');
begin
  if not public.is_kasse() then raise exception 'Nur die Kasse oder das Trainerteam' using errcode = '42501'; end if;
  if v is not null and (v !~* '^https?://' or length(v) > 300) then
    raise exception 'Bitte einen vollständigen Link mit https:// eingeben' using errcode = '22023';
  end if;
  insert into public.team_config(id, spenden_link, updated_at) values (1, v, now())
  on conflict (id) do update set spenden_link = excluded.spenden_link, updated_at = excluded.updated_at;
  return v;
end $$;
revoke all on function public.kasse_spenden_link_setzen(text) from public, anon;
grant execute on function public.kasse_spenden_link_setzen(text) to authenticated;
