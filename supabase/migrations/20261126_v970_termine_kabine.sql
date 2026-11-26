-- v970 · Kabine an Heimspielen (Charles 26.11.2026): „ein Infofeld für die Trainer, in welcher Kabine wir an Heimspielen
-- sind. Heim 1, Heim 2, Gast 1, Gast 2.“ Gespeichert als Schlüssel; die App zeigt das Wort (TM_KABINEN in md-gegner.js).
-- Sichtbar nur im Trainerbereich. Keine neue Tabelle – die Sicherung (backupExport) nimmt termine schon ganz mit.
alter table public.termine add column if not exists kabine text;
alter table public.termine drop constraint if exists termine_kabine_check;
alter table public.termine add constraint termine_kabine_check check (kabine is null or kabine in ('heim1','heim2','gast1','gast2'));
comment on column public.termine.kabine is 'v970: Kabine an Heimspielen (heim1, heim2, gast1, gast2) – nur für Trainer angezeigt';
