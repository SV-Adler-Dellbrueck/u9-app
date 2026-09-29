-- v630 · Jeder Trainer bewertet eine Trainingseinheit selbst, mit Stempel.
-- PO: „… dass immer auch mit einer Art Stempel ersichtlich ist, wer hat die Bewertung vorgenommen
-- aus dem Trainerteam.“ Kachel: „Je Trainer eigene“.
-- Bis v629 gab es genau eine Bewertung je Tag (PK datum): wer als Zweiter speicherte, überschrieb
-- still die des Ersten, und niemand sah, von wem sie stammte. Jetzt wie event_bewertung: je
-- Trainer eine Zeile. Die Einträge von vor v630 tragen „Trainerteam“ – ihr Name wurde nie erfasst.
alter table public.einheit_bewertung add column if not exists autor text;
update public.einheit_bewertung set autor = 'Trainerteam' where autor is null;
alter table public.einheit_bewertung alter column autor set not null;
alter table public.einheit_bewertung add column if not exists created_at timestamptz default now();
alter table public.einheit_bewertung drop constraint if exists einheit_bewertung_pkey;
alter table public.einheit_bewertung add primary key (datum, autor);
comment on column public.einheit_bewertung.autor is 'v630: Name des Trainers (trainerMe). „Trainerteam“ = vor v630 ohne Namen erfasst.';
