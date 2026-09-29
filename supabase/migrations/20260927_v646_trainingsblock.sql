-- v646: Trainingsblock – ein Ziel über mehrere Wochen, drei Einheiten im Wechsel.
--
-- Ein Block bindet eine Leitfrage des Ausbildungskonzepts (plus optional einen eigenen
-- Zielsatz) an einen Zeitraum und genau drei Vorlagen. Die App verteilt sie auf die
-- Trainingstermine im Zeitraum im Wechsel A-B-C-A-B-C; gespeichert wird nur der Block,
-- die Zuordnung zu den Terminen rechnet die App (fällt ein Training weg, rückt der Wechsel
-- nach). Vorlagen werden über den Namen referenziert – wie überall, wo Inhalte aus dem
-- Repo kommen; die id ist je Datenbank verschieden.
create table if not exists public.trainingsblock (
  id           bigint generated always as identity primary key,
  leitfrage    text not null,
  ziel         text not null default '',
  von          date not null,
  bis          date not null,
  vorlagen     jsonb not null,
  erstellt_von uuid default auth.uid(),
  created_at   timestamptz not null default now(),
  constraint trainingsblock_zeitraum check (bis >= von),
  constraint trainingsblock_drei check (jsonb_typeof(vorlagen) = 'array' and jsonb_array_length(vorlagen) = 3)
);
comment on table public.trainingsblock is 'v646: Trainingsblock – Leitfrage + Ziel über einen Zeitraum, genau drei Vorlagen (Namen) im Wechsel A-B-C auf die Trainings.';
alter table public.trainingsblock enable row level security;
drop policy if exists "tb trainer" on public.trainingsblock;
create policy "tb trainer" on public.trainingsblock for all to authenticated
  using (public.is_trainer()) with check (public.is_trainer());
revoke all on public.trainingsblock from anon;

-- Skalierung der Vorlagen nachziehen: bisher hatte trainingsvorlagen gar kein UPDATE.
-- Der Abgleich mit uebungen/vorlagen.json darf jetzt genau eine Spalte ändern – die
-- Aufbauten je Kinderzahl –, damit Nachträge für 10 und 14 Kinder bestehende Vorlagen
-- erreichen. Alles andere an einer Vorlage bleibt unveränderlich.
drop policy if exists "tv update skalierung trainer" on public.trainingsvorlagen;
create policy "tv update skalierung trainer" on public.trainingsvorlagen for update to authenticated
  using (public.is_trainer()) with check (public.is_trainer());
revoke update on public.trainingsvorlagen from anon, authenticated;
grant update (skalierung) on public.trainingsvorlagen to authenticated;
