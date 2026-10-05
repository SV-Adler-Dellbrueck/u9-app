-- v762 (Charles 05.10.: Nest-PDF auch für Eltern – „alle Punkte“): Das Trainerteam gibt je Ausgabe frei, ob Eltern das PDF in der
-- Leseansicht speichern dürfen. Standard: aus (so war es seit v756, nur Trainerbereich). Das Eltern-PDF enthält keinen Hör-Link.
-- Die Leseansicht liest die Spalte über heft_ausgabe_lesen() mit (to_jsonb(a) enthält sie automatisch) – die Funktion bleibt unverändert.
-- Schreiben dürfen nur Trainer (bestehende Policy auf heft_ausgabe, v733).
alter table public.heft_ausgabe add column if not exists pdf_fuer_eltern boolean not null default false;
comment on column public.heft_ausgabe.pdf_fuer_eltern is 'v762: Eltern dürfen das Heft in der Leseansicht als PDF speichern (ohne Hör-Link); Standard aus, nur Trainer setzen';
