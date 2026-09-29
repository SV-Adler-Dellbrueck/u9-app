-- v628 · PO: „Wird der Text, den ich einspreche, eins zu eins übernommen oder … überarbeitet,
-- strukturiert und auch analysiert, um nachher die Einträge ins Tagebuch gut aufgearbeitet
-- wiederzufinden und auswerten zu können.“ Kachel: „Ja, und auch Aha/Konsequenz vorschlagen“.
--
-- sprachnotiz: der gesprochene Rohtext bleibt bei der Nachbereitung erhalten (vorher ging er
--   beim Schließen verloren). Nur Trainer lesen die Tabellen (bestehende RLS unverändert).
-- schlagworte: 3–5 Themen je Tagebucheintrag, zum Wiederfinden und Auswerten.
-- ki_vorschlag: der Eintrag entstand aus einem KI-Vorschlag, den der Trainer geprüft hat.
alter table public.einheit_bewertung add column if not exists sprachnotiz text;
alter table public.event_bewertung   add column if not exists sprachnotiz text;
alter table public.tagebuch_eintrag  add column if not exists schlagworte text[] not null default '{}';
alter table public.tagebuch_eintrag  add column if not exists ki_vorschlag boolean not null default false;
comment on column public.einheit_bewertung.sprachnotiz is 'v628: gesprochener Rohtext der Nachbereitung (enthält ggf. Kindernamen, nur Trainer)';
comment on column public.event_bewertung.sprachnotiz   is 'v628: gesprochener Rohtext der Nachbereitung (enthält ggf. Kindernamen, nur Trainer)';
comment on column public.tagebuch_eintrag.schlagworte  is 'v628: Themen zum Wiederfinden und Auswerten';
comment on column public.tagebuch_eintrag.ki_vorschlag is 'v628: Eintrag entstand aus einem geprüften KI-Vorschlag';
