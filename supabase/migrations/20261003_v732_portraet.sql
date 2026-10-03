-- v732 (PO 03.10.): „Es gibt ja Fan-Fakten für jeden Spieler. Diese wollen wir pro Woche ins Spielerprofil
-- ins Adler Nest einbauen. Dafür sind es aber nicht genug Infos … Zusätzlich soll der Kabinen-Reporter
-- einige Fragen stellen, um daraus nachher per KI einen tollen Bericht über den Spieler zu verfassen.“
-- Kacheln: alle vorgeschlagenen Felder plus drei weitere; KI-Entwurf, den der Trainer freigibt.
-- 1) Zehn kurze, freiwillige Fan-Fakten (Eltern pflegen sie; RLS von kind_fanfacts gilt unverändert).
alter table public.kind_fanfacts
  add column if not exists adler_seit text,
  add column if not exists nummer_grund text,
  add column if not exists hobby text,
  add column if not exists lieblingsessen text,
  add column if not exists lieblingstier text,
  add column if not exists gross_werden text,
  add column if not exists lieblingsmusik text,
  add column if not exists lieblingsfilm text,
  add column if not exists fussball_erlebnis text,
  add column if not exists kann_gut text;

-- 2) Wer war wann „Adler im Porträt“ – für die Reihum-Vorschläge (jedes Kind einmal, bevor eines
--    zum zweiten Mal dran ist). Nur das Trainerteam liest und schreibt.
create table if not exists public.portraet_verlauf (
  spieler_id bigint not null references public.kader(id) on delete cascade,
  woche date not null,
  erstellt_am timestamptz not null default now(),
  primary key (spieler_id, woche)
);
comment on table public.portraet_verlauf is 'v732: Adler im Porträt – welches Kind in welcher Woche (Montag) im Adler Nest stand';
alter table public.portraet_verlauf enable row level security;
revoke all on public.portraet_verlauf from anon;
drop policy if exists pv_trainer on public.portraet_verlauf;
create policy pv_trainer on public.portraet_verlauf for all to authenticated using (public.is_trainer()) with check (public.is_trainer());
