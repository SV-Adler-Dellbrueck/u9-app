-- v994 · Charles 28.11.2026 (Bild freigegeben): Aufgaben im Chat. Neben Terminen hängen Trainer eine Aufgabe an einen Ruf:
-- Steckbrief ausfüllen, Porträtfragen Adler Nest, Mitbringliste (mit Termin) oder alle offenen To-dos. Eltern sehen einen
-- Sprungknopf zur richtigen Stelle, Trainer den Stand. Nur eine Spalte; gezählt wird mit den vorhandenen Leserechten.
alter table public.rufe_nachricht add column if not exists aufgabe text;
alter table public.rufe_nachricht drop constraint if exists rufe_nachricht_aufgabe_check;
alter table public.rufe_nachricht add constraint rufe_nachricht_aufgabe_check
  check (aufgabe is null or aufgabe in ('steckbrief','portraet','mitbringen','todo'));

create or replace function public.rufe_geplant_pruefen()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.termin_id is not null and not public.is_trainer() then raise exception 'termin_nur_trainer'; end if;
  if new.aufgabe is not null and not public.is_trainer() then raise exception 'aufgabe_nur_trainer'; end if;   -- v994
  if new.aufgabe = 'mitbringen' and new.termin_id is null then raise exception 'mitbringen_braucht_termin'; end if;   -- v994
  if new.geplant_fuer is not null then
    if new.geplant_fuer < now() + interval '1 minute' then new.geplant_fuer := null;
    elsif new.geplant_fuer > now() + interval '14 days' then raise exception 'geplant_hoechstens_14_tage';
    else new.created_at := new.geplant_fuer; end if;
  end if;
  return new;
end $$;
