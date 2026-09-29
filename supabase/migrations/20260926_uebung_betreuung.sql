-- v631 · Läuft die Übung ohne Trainer? PO: „… Trainingsformen, die auch mit einem einzigen
-- Trainer durchführbar sind“. Je Übungsname allein | fuehrt | feld, vom Trainer bestätigt
-- (Vorschlag in data.js UEBUNG_BETREUUNG_VORSCHLAG). Gleiches Muster wie uebung_art (v533).
alter table public.team_config add column if not exists uebung_betreuung jsonb default '{}'::jsonb;
comment on column public.team_config.uebung_betreuung is 'v631: je Übungsname allein | fuehrt | feld – läuft die Übung ohne Trainer? Vom Trainer bestätigt, nie geraten (Vorschlag in data.js UEBUNG_BETREUUNG_VORSCHLAG).';
