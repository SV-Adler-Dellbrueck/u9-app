-- v949 · Charles 22.11.: Die Kachel „Training automatisch“ baut aus den vorbereiteten Einheiten. Ohne Trainingsblock gilt
-- die Leitfrage des Monats. Der Monatsschwerpunkt (periodisierung) kannte bisher nur Thema und Übungskategorie.
-- Neue Spalte leitfrage (Text der Leitfrage wie in trainingsvorlagen.leitfrage). Lesen alle, schreiben Trainer
-- (bestehende Richtlinien periodisierung_read / periodisierung_trainer_write gelten für die neue Spalte mit).
alter table public.periodisierung add column if not exists leitfrage text;
comment on column public.periodisierung.leitfrage is 'v949: Leitfrage des Monats für „Training automatisch“ (Text wie trainingsvorlagen.leitfrage)';
