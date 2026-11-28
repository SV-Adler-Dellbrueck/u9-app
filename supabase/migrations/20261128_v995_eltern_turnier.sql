-- v995 · Charles 28.11.2026 (Bild freigegeben): Kinder-Eltern-Turnier besser finden und vorbereiten.
-- 1) event_mitspieler: Verhältnis zur Familie (Mutter, Vater, Partner(in), Tochter, Sohn, Oma, Opa, Tante, Onkel, Freund(in),
--    Sonstige) und das Kind der Familie (kind_id), damit das Trainerteam die Liste je Familie sieht.
-- 2) Chat-Aufgabe „Mitspielen eintragen“ (aufgabe 'mitspielen', braucht einen Termin).
alter table public.event_mitspieler add column if not exists verhaeltnis text;
alter table public.event_mitspieler drop constraint if exists event_mitspieler_verhaeltnis_check;
alter table public.event_mitspieler add constraint event_mitspieler_verhaeltnis_check
  check (verhaeltnis is null or verhaeltnis in ('Mutter','Vater','Partner(in)','Tochter','Sohn','Oma','Opa','Tante','Onkel','Freund(in)','Sonstige'));
alter table public.event_mitspieler add column if not exists kind_id bigint references public.kader(id) on delete set null;

alter table public.rufe_nachricht drop constraint if exists rufe_nachricht_aufgabe_check;
alter table public.rufe_nachricht add constraint rufe_nachricht_aufgabe_check
  check (aufgabe is null or aufgabe in ('steckbrief','portraet','mitbringen','todo','mitspielen'));

create or replace function public.rufe_geplant_pruefen()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.termin_id is not null and not public.is_trainer() then raise exception 'termin_nur_trainer'; end if;
  if new.aufgabe is not null and not public.is_trainer() then raise exception 'aufgabe_nur_trainer'; end if;   -- v994
  if new.aufgabe in ('mitbringen','mitspielen') and new.termin_id is null then raise exception 'aufgabe_braucht_termin'; end if;   -- v994/v995
  if new.geplant_fuer is not null then
    if new.geplant_fuer < now() + interval '1 minute' then new.geplant_fuer := null;
    elsif new.geplant_fuer > now() + interval '14 days' then raise exception 'geplant_hoechstens_14_tage';
    else new.created_at := new.geplant_fuer; end if;
  end if;
  return new;
end $$;

-- 3) Als Familie nur das eigene Kind (Trainer dürfen alles)
drop policy if exists ems_insert on public.event_mitspieler;
create policy ems_insert on public.event_mitspieler for insert
  with check ((created_by = (select auth.uid())) and public.sitzung_gueltig() and (kind_id is null or public.is_parent_of(kind_id) or public.is_trainer()));
