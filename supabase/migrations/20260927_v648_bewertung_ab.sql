-- v648 · Einzelbewertung erst ab Ende der Hinrunde (Trainermeeting 27.09.2026,
-- doku/auftrag-bewertung-hinrunde/). Das Startdatum der Bewertungsrunden liegt am selben Ort
-- wie der Federn-Stichtag aus v647: team_einstellungen (RLS lesen und schreiben nur
-- is_trainer(), anon entzogen, in der Sicherung). Leer = gesperrt; das Trainerteam setzt es in
-- Team → Bewerten. Kein Datum im Code. Die Edge Function ki-nachbereitung liest es mit dem
-- Service-Schlüssel und gibt davor keine Werte je Kind aus.
alter table public.team_einstellungen add column if not exists bewertung_ab date;
comment on column public.team_einstellungen.bewertung_ab is
  'Erste Bewertungsrunde ab (Ende Hinrunde). Davor: keine Einzelbewertung, keine Schnell-Sterne je Kind, kein Blitz-Rating, keine Werte je Kind aus der KI-Auswertung. Leer = gesperrt.';
