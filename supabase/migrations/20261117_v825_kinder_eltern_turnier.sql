-- v825 · Kinder-Eltern-Turnier (Charles 10.11.2026)
--
-- 1) Ein Event kann als Kinder-Eltern-Turnier gekennzeichnet werden (Haken beim Anlegen).
-- 2) Eltern tragen ein, wer von den Erwachsenen mitspielt: sich selbst per Tipp (selbst = true,
--    höchstens einmal je Termin und Konto) und weitere Personen per Namen.
--    Lesen: alle angemeldeten Mitglieder (Entscheidung 10.11.: alle Eltern sehen die Liste).
--    Eintragen: nur unter der eigenen Kennung. Löschen: die eigenen Zeilen, der Trainer alle.
--    Ändern gibt es nicht – austragen und neu eintragen.
--    Anonyme Besucher haben keinen Zugriff.

alter table public.termine add column if not exists eltern_turnier boolean not null default false;

create table if not exists public.event_mitspieler (
  id         bigint generated always as identity primary key,
  termin_id  bigint not null references public.termine(id) on delete cascade,
  name       text   not null check (char_length(btrim(name)) between 1 and 40),
  selbst     boolean not null default false,
  created_by uuid   default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists event_mitspieler_termin on public.event_mitspieler (termin_id);
create unique index if not exists event_mitspieler_selbst_einmal
  on public.event_mitspieler (termin_id, created_by) where selbst;

alter table public.event_mitspieler enable row level security;

revoke all on public.event_mitspieler from anon, public;
revoke all on public.event_mitspieler from authenticated;
grant select, insert, delete on public.event_mitspieler to authenticated;

drop policy if exists ems_read   on public.event_mitspieler;
drop policy if exists ems_insert on public.event_mitspieler;
drop policy if exists ems_delete on public.event_mitspieler;
create policy ems_read   on public.event_mitspieler for select to authenticated
  using (public.sitzung_gueltig());
create policy ems_insert on public.event_mitspieler for insert to authenticated
  with check (created_by = (select auth.uid()) and public.sitzung_gueltig());
create policy ems_delete on public.event_mitspieler for delete to authenticated
  using (created_by = (select auth.uid()) or public.is_trainer());
