-- v656: Ziel für die Kinder je Vorlage.
--
-- Ein Satz, den ein Achtjähriger versteht („Heute schaust du vor dem Pass, wer frei ist.“).
-- Er steht in uebungen/vorlagen.json und kommt über den Abgleich in die Tabelle. Später
-- zeigen ihn Eltern- und Kinder-App; deshalb eine eigene Spalte statt eines Textes in
-- „beobachtung“, die für Trainer gedacht ist.
--
-- Bisher durfte der Abgleich an einer bestehenden Vorlage nur `skalierung` ändern
-- (20260927_v646_trainingsblock.sql). Jetzt zusätzlich `ziel_kinder` – sonst erreichte der
-- Satz nur Vorlagen, die neu angelegt werden, und alle dreißig bestehenden blieben leer.
alter table public.trainingsvorlagen add column if not exists ziel_kinder text;
alter table public.trainingsvorlagen drop constraint if exists trainingsvorlagen_ziel_kinder_laenge;
alter table public.trainingsvorlagen add constraint trainingsvorlagen_ziel_kinder_laenge
  check (ziel_kinder is null or char_length(ziel_kinder) <= 160);
comment on column public.trainingsvorlagen.ziel_kinder is
  'v656: Ziel der Einheit in Kindersprache, ein Satz (höchstens 160 Zeichen). Quelle: uebungen/vorlagen.json.';
grant update (ziel_kinder) on public.trainingsvorlagen to authenticated;
