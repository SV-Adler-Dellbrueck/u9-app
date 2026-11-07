-- v793 · Die Aufstellung am Spieltag (Torwart, Feld, Bank) bleibt stehen, auch wenn die Seite geschlossen wird.
-- Ein Eintrag je Spieltag und Team (Schlüssel wie spieltagKey() in der App: „2026-11-07“ für Adler 1, „2026-11-07__t2“ für Adler 2).
-- Nur das Trainerteam liest und schreibt; Eltern und Kinder sehen die Tabelle nie.
create table if not exists public.spieltag_aufstellung (
  schluessel text primary key check (length(schluessel) between 10 and 20),
  daten      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.spieltag_aufstellung enable row level security;
drop policy if exists "spieltag_aufstellung_trainer_all" on public.spieltag_aufstellung;
create policy "spieltag_aufstellung_trainer_all" on public.spieltag_aufstellung
  for all to authenticated using (is_trainer()) with check (is_trainer());
revoke all on public.spieltag_aufstellung from anon;
comment on table public.spieltag_aufstellung is
  'v793: Aufstellung am Spieltag je Datum und Team: {tw, feld[], bank[], form}. Namen der Kinder – deshalb nur Trainer (is_trainer).';
