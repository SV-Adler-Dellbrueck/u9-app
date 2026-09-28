-- v665 · Betreuung vor Ort: der Name des Elternteils, nicht des Kindes
-- PO 28.09. (Bildschirmfoto „Vor Ort: <Kind>“): „Betreuung vor Ort ist ja nicht das Kind,
-- sondern der Name des Elternteils.“ Bisher stand in betreuung nur das Kind; wer sich gemeldet
-- hat, war nicht festgehalten. Jetzt merkt sich die Zeile das Konto (user_id), und die Liste
-- zeigt dessen Vornamen aus „Meine Angaben“ (eltern_angaben), sonst den Anzeigenamen, sonst
-- „Elternteil von <Kind>“. Nur der Vorname – mehr nicht, und nur für angemeldete Eltern des Teams.
alter table public.betreuung add column if not exists user_id uuid references auth.users(id) on delete set null;
comment on column public.betreuung.user_id is 'v665: Konto, das „ich bleibe vor Ort“ gesetzt hat (für den Namen in der Betreuungsliste).';

create or replace function public.betreuung_wer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.will_stay and auth.uid() is not null then new.user_id := auth.uid(); end if;
  return new;
end
$$;
drop trigger if exists betreuung_wer on public.betreuung;
create trigger betreuung_wer before insert or update on public.betreuung
  for each row execute function public.betreuung_wer();

create or replace function public.betreuung_board(p_termin bigint)
returns table(name text)
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(nullif(trim(ea.vorname), ''), nullif(trim(p.anzeigename), ''), 'Elternteil von ' || k.name)
  from public.betreuung b
  join public.kader k on k.id = b.spieler_id
  left join public.eltern_angaben ea on ea.user_id = b.user_id
  left join public.profiles p on p.id = b.user_id
  where b.termin_id = p_termin and b.will_stay = true
    and (public.is_trainer() or exists(
      select 1 from public.eltern_kinder e
      where lower(e.email) = lower(coalesce(auth.jwt()->>'email',''))))
  order by 1;
$$;
