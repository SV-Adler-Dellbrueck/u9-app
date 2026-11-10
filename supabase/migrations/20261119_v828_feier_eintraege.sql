-- v828 · Beitragsliste für Feiern (Auftrag Charles 10.11.2026, erste Feier: Weihnachtsfeier U9 I)
--
-- Eltern tragen ein, was sie zu einer Feier mitbringen: feste Plätze (die Liste steht als
-- Konfiguration im Code, md-feier.js) plus bis zu drei eigene Beiträge je Familie.
--
--   Lesen:       Eltern und Trainer (Kinder-Sitzungen und anonyme Besucher nicht).
--   Eintragen:   nur unter der eigenen Kennung.
--   Ändern:      nur die eigene Salatsorte (Spaltenrecht auf `auswahl`), nur eigene Zeilen.
--   Löschen:     eigene Zeilen; der Trainer jede.
--   Doppelbelegung: verhindert der Unique-Constraint (Platz = feier_key + slot_key + slot_nr).
--   Freitext:    1 bis 80 Zeichen, höchstens drei je Familie und Feier (Trigger, weil ein
--                Constraint keine Zeilen zählen kann).
--   Keine Kinder-Klarnamen: `anzeige_name` ist ein frei gewähltes Familienkürzel (Hinweis in der App).
--
-- Die Plätze selbst (Namen, Anzahl, Salatsorten) prüft die Datenbank nicht: Sie stehen im Code,
-- damit sie nächstes Jahr ohne Umbau änderbar sind. Unbekannte Plätze zeigt die App nicht an.
-- Neue Sorten mit `auswahl` außerhalb von Salat brauchen eine Anpassung des Constraints unten.

-- Wer darf? Eltern (angemeldet, mit Kind im Kader) und Trainer. Anders als sitzung_gueltig()
-- ohne gekoppelte Kinder-Geräte.
create or replace function public.ist_eltern_oder_trainer()
returns boolean language sql stable security definer set search_path to 'public' as $fn$
  select (select auth.uid()) is not null
     and ( public.is_trainer()
           or ( not public.ist_anonym()
                and exists (select 1 from public.eltern_kinder e
                            where lower(e.email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))) ) );
$fn$;
revoke all on function public.ist_eltern_oder_trainer() from public, anon;
grant execute on function public.ist_eltern_oder_trainer() to authenticated;

create table if not exists public.feier_eintraege (
  id           bigint generated always as identity primary key,
  feier_key    text   not null check (feier_key ~ '^[a-z0-9-]{1,40}$'),
  slot_key     text   check (slot_key is null or slot_key ~ '^[a-z0-9-]{1,40}$'),
  slot_nr      smallint check (slot_nr is null or slot_nr between 1 and 20),
  auswahl      text,
  freitext     text   check (freitext is null or char_length(btrim(freitext)) between 1 and 80),
  anzeige_name text   not null check (char_length(btrim(anzeige_name)) between 1 and 40),
  erstellt_von uuid   not null default auth.uid(),
  erstellt_am  timestamptz not null default now(),
  -- entweder ein fester Platz oder ein Freitext, nie beides, nie keins
  constraint feier_platz_oder_freitext check (
       (slot_key is not null and slot_nr is not null and freitext is null)
    or (slot_key is null and slot_nr is null and freitext is not null and auswahl is null)),
  -- Sorte gibt es nur beim Salat und nur aus diesen drei Werten
  constraint feier_auswahl_nur_salat check (
       auswahl is null
    or (slot_key = 'salat' and auswahl in ('Nudelsalat', 'Kartoffelsalat', 'Überraschung'))),
  -- Ein Platz einmal je Feier. Freitext-Zeilen haben slot_key NULL und fallen von selbst heraus.
  constraint feier_platz_einmal unique (feier_key, slot_key, slot_nr)
);
create index if not exists feier_eintraege_feier on public.feier_eintraege (feier_key);
create index if not exists feier_eintraege_von   on public.feier_eintraege (erstellt_von);

-- Namen und Freitext getrimmt speichern; höchstens drei Freitexte je Familie und Feier.
-- Die Sperre (advisory lock) verhindert, dass zwei gleichzeitige Anfragen derselben Familie
-- beide „noch Platz“ sehen.
create or replace function public.feier_vor_eintrag()
returns trigger language plpgsql set search_path to '' as $fn$
begin
  new.anzeige_name := btrim(new.anzeige_name);
  if new.freitext is not null then
    new.freitext := btrim(new.freitext);
    perform pg_advisory_xact_lock(hashtext('feier:' || new.feier_key || ':' || new.erstellt_von::text));
    if (select count(*) from public.feier_eintraege
         where feier_key = new.feier_key and erstellt_von = new.erstellt_von and freitext is not null) >= 3 then
      raise exception 'feier_freitext_limit' using errcode = '23514',
        hint = 'Höchstens drei eigene Beiträge je Familie.';
    end if;
  end if;
  return new;
end;
$fn$;
revoke all on function public.feier_vor_eintrag() from public, anon, authenticated;

drop trigger if exists feier_vor_eintrag on public.feier_eintraege;
create trigger feier_vor_eintrag before insert on public.feier_eintraege
  for each row execute function public.feier_vor_eintrag();

alter table public.feier_eintraege enable row level security;

revoke all on public.feier_eintraege from anon, public;
revoke all on public.feier_eintraege from authenticated;
grant select, insert, delete on public.feier_eintraege to authenticated;
grant update (auswahl) on public.feier_eintraege to authenticated;

drop policy if exists feier_lesen    on public.feier_eintraege;
drop policy if exists feier_anlegen  on public.feier_eintraege;
drop policy if exists feier_aendern  on public.feier_eintraege;
drop policy if exists feier_loeschen on public.feier_eintraege;

create policy feier_lesen on public.feier_eintraege for select to authenticated
  using (public.ist_eltern_oder_trainer());
create policy feier_anlegen on public.feier_eintraege for insert to authenticated
  with check (erstellt_von = (select auth.uid()) and public.ist_eltern_oder_trainer());
create policy feier_aendern on public.feier_eintraege for update to authenticated
  using (erstellt_von = (select auth.uid()) and public.ist_eltern_oder_trainer())
  with check (erstellt_von = (select auth.uid()) and public.ist_eltern_oder_trainer());
create policy feier_loeschen on public.feier_eintraege for delete to authenticated
  using (erstellt_von = (select auth.uid()) or public.is_trainer());
