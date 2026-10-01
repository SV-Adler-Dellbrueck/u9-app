-- v712 · Trainerkreislauf: Beobachtung → Konsequenz → nächstes Training → Wirkung
-- Eine Konsequenz aus dem Tagebuch (tagebuch_punkt, art 'konsequenz') steht seit v712 im
-- Trainingsplan des nächsten Trainings; nach dem Training fragt „Wie war's?“, ob sie gewirkt hat.
-- Die Antwort steht am Punkt – keine neue Tabelle.
alter table public.tagebuch_punkt add column if not exists wirkung text
  check (wirkung is null or wirkung in ('geklappt','teilweise','noch_nicht'));
alter table public.tagebuch_punkt add column if not exists wirkung_am date;
comment on column public.tagebuch_punkt.wirkung is 'v712: geklappt | teilweise | noch_nicht – Antwort aus „Wie war''s?“ nach dem Training';
