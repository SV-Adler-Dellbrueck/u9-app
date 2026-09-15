-- v566 (15.09.2026)
-- 1. Mitbringliste je Event nur auf Wunsch des Trainers (Standard aus).
alter table public.termine add column if not exists mitbringen boolean not null default false;
comment on column public.termine.mitbringen is 'Event: Eltern sehen die Mitbringliste nur, wenn der Trainer sie hier einschaltet (v566).';

-- 2. In der U9 gibt es keinen Schiedsrichter – die Kinder klären selbst, die Trainer helfen.
--    Die JS-Fallbacks (md-kasse.js FAIRPLAY_REGELN, md-kabine.js KINDER_CODEX) tragen dieselben Sätze.
update public.fairplay_regeln set emoji='⚖️', titel='Die Kinder entscheiden selbst',
  text='In der U9 gibt es keinen Schiri. Aus, Foul, Tor – die Kinder klären das auf dem Platz, die Trainer helfen nur, wenn es hakt. Von außen kommt keine Entscheidung.'
  where titel='Der Schiri hat immer recht';
update public.fairplay_regeln set text='Bleibt hinter der Linie oder Bande. Die Kinder brauchen ihren Raum – und ihre Ruhe.'
  where titel='Abstand zum Spielfeld halten';
update public.kinder_codex set satz='Wir klären es selbst – fair.' where satz='Der Schiri hat recht.';
