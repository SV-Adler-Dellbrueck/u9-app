-- v711 · Wer bekommt Benachrichtigungen? (nur Trainerteam)
-- Je aktivem Kind: wie viele Elternkonten verknüpft sind und wie viele davon Benachrichtigungen
-- auf mindestens einem Gerät eingeschaltet haben. Am 01.10.2026 waren es 6 von 14 Familien –
-- Erinnerungen, Rufe, Nominierung und Kasse erreichten damit weniger als die Hälfte.
-- Liefert keine Adressen und keine Geräte, nur Zahlen je Kind.
create or replace function public.push_abdeckung()
returns table(spieler_id bigint, name text, konten int, mit_push int)
language sql stable security definer set search_path = public as $$
  select k.id, k.name,
    (select count(distinct lower(ek.email))::int from eltern_kinder ek where ek.spieler_id = k.id),
    (select count(distinct lower(ek.email))::int from eltern_kinder ek
       join auth.users u on lower(u.email) = lower(ek.email)
       where ek.spieler_id = k.id and exists (select 1 from push_subscriptions p where p.user_id = u.id))
  from kader k
  where k.aktiv is not false and public.is_trainer()
  order by k.name;
$$;
revoke all on function public.push_abdeckung() from public, anon;
grant execute on function public.push_abdeckung() to authenticated;
