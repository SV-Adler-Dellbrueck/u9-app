-- v527 · Trainermeeting als eigene Terminart
--
-- 1) Die Leseregel auf `termine` lautete schlicht `using (true)`: JEDER darf alle Termine
--    lesen, auch ohne Anmeldung. Davon leben Turnierseite, Stadionheft und Liveticker.
--    Ein Trainermeeting als gewoehnlicher Termin waere damit oeffentlich - Titel, Zeit,
--    Ort, Notiz. Genau deshalb stand in der Hilfe bisher, ein Meeting lande "bewusst NICHT
--    bei den Terminen".
--    Die neue Regel nimmt genau diese eine Terminart aus. Trainer sehen weiterhin alles,
--    denn die zweite Policy `termine auth` (for all using is_trainer()) gilt daneben und
--    permissive Policies verodern sich. Die oeffentlichen Seiten fragen nur nach Spiel und
--    Turnier - dort aendert sich nichts.
drop policy if exists "termine_read" on public.termine;
create policy "termine_read" on public.termine
  for select using (typ <> 'trainermeeting' or is_trainer());

-- 2) Die Terminfindung haengt bisher frei in der Luft (trainer_poll ohne Bezug). Ab jetzt
--    gehoert sie zu einem Termin: eine Abstimmung je Meeting-Termin, und mit dem Termin
--    verschwindet sie auch wieder.
alter table public.trainer_poll
  add column if not exists termin_id bigint references public.termine(id) on delete cascade;
create index if not exists trainer_poll_termin_idx on public.trainer_poll (termin_id);

-- 3) Ein Haken sagt "erledigt", aber nicht WAS entschieden wurde. Eine Woche spaeter weiss
--    das niemand mehr - der haeufigste Grund, warum dasselbe Thema im uebernaechsten
--    Meeting wieder auftaucht. Der Beschluss ist optional, aber er ist der Punkt.
alter table public.trainer_poll_thema
  add column if not exists beschluss text;
